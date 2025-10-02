import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'
import { llmEvaluationService } from '../../../../../../lib/services/llmEvaluationService'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const batchEvaluateSchema = z.object({
  metricTypes: z.array(z.enum(['hallucination', 'relevance', 'moderation', 'usefulness', 'coherence'])).min(1),
  datasetId: z.string().optional(),
  batchSize: z.number().min(1).max(100).default(10),
  async: z.boolean().default(true),
  model: z.object({
    name: z.string(),
    provider: z.enum(['openai', 'anthropic', 'azure', 'custom']),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional()
  }).optional()
})

// POST /api/v1/experiments/{experimentId}/evaluate - Start batch evaluation
export async function POST(
  request: NextRequest,
  { params }: { params: { experimentId: string } }
) {
  try {
    const { experimentId } = params
    const body = await request.json()
    const validatedData = batchEvaluateSchema.parse(body)

    console.log(`📊 Starting batch evaluation for experiment: ${experimentId}`)

    // Get experiment details
    const experiment = db.prepare(`
      SELECT e.*, p.name as project_name
      FROM experiments e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ?
    `).get(experimentId) as any

    if (!experiment) {
      return NextResponse.json({
        success: false,
        error: 'Experiment not found'
      }, { status: 404 })
    }

    // Get evaluation data - either from dataset or traces
    let evaluationItems: Array<{input: string; output: string; context?: string[]}> = []

    if (validatedData.datasetId) {
      // Get items from dataset
      evaluationItems = await getDatasetItems(validatedData.datasetId)
    } else {
      // Get items from experiment traces
      evaluationItems = await getExperimentTraces(experimentId)
    }

    if (evaluationItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No evaluation data found'
      }, { status: 400 })
    }

    console.log(`📋 Found ${evaluationItems.length} items for evaluation`)

    // Start batch evaluation
    const job = await llmEvaluationService.startBatchEvaluation(
      experimentId,
      evaluationItems,
      validatedData.metricTypes,
      validatedData.model
    )

    console.log(`✅ Started evaluation job: ${job.id}`)

    if (validatedData.async) {
      return NextResponse.json({
        success: true,
        data: {
          jobId: job.id,
          status: job.status,
          totalItems: job.totalItems,
          experimentId,
          estimatedDuration: Math.ceil(job.totalItems / validatedData.batchSize) * 2 // seconds
        }
      }, { status: 202 })
    } else {
      // Wait for completion (for small datasets)
      const completedJob = await waitForJobCompletion(job.id, 300) // 5 minutes max
      
      return NextResponse.json({
        success: true,
        data: completedJob
      })
    }

  } catch (error) {
    console.error('Error starting batch evaluation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to start batch evaluation'
    }, { status: 500 })
  }
}

// GET /api/v1/experiments/{experimentId}/evaluate - Get evaluation status
export async function GET(
  request: NextRequest,
  { params }: { params: { experimentId: string } }
) {
  try {
    const { experimentId } = params
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('jobId')

    if (jobId) {
      // Get specific job status
      const job = await llmEvaluationService.getEvaluationJob(jobId)
      
      if (!job) {
        return NextResponse.json({
          success: false,
          error: 'Evaluation job not found'
        }, { status: 404 })
      }

      return NextResponse.json({
        success: true,
        data: job
      })
    } else {
      // Get all evaluation jobs for experiment
      const jobs = db.prepare(`
        SELECT * FROM evaluation_jobs 
        WHERE experiment_id = ?
        ORDER BY created_at DESC
        LIMIT 10
      `).all(experimentId) as any[]

      const transformedJobs = jobs.map(job => ({
        id: job.id,
        experimentId: job.experiment_id,
        status: job.status,
        totalItems: job.total_items,
        processedItems: job.processed_items,
        results: job.results ? JSON.parse(job.results) : [],
        errorMessage: job.error_message,
        createdAt: job.created_at,
        completedAt: job.completed_at
      }))

      return NextResponse.json({
        success: true,
        data: transformedJobs
      })
    }

  } catch (error) {
    console.error('Error getting evaluation status:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get evaluation status'
    }, { status: 500 })
  }
}

// Helper function to get dataset items
async function getDatasetItems(datasetId: string): Promise<Array<{input: string; output: string; context?: string[]}>> {
  const items = db.prepare(`
    SELECT * FROM dataset_items 
    WHERE dataset_id = ?
    ORDER BY created_at
    LIMIT 1000
  `).all(datasetId) as any[]

  return items.map(item => {
    try {
      const data = JSON.parse(item.data)
      return {
        input: data.input || data.prompt || '',
        output: data.output || data.response || data.expected || '',
        context: data.context ? (Array.isArray(data.context) ? data.context : [data.context]) : undefined
      }
    } catch (error) {
      console.warn(`Failed to parse dataset item ${item.id}:`, error)
      return {
        input: '',
        output: '',
        context: undefined
      }
    }
  }).filter(item => item.input && item.output)
}

// Helper function to get experiment traces
async function getExperimentTraces(experimentId: string): Promise<Array<{input: string; output: string; context?: string[]}>> {
  const traces = db.prepare(`
    SELECT t.*, c.user_message, c.assistant_message
    FROM traces t
    LEFT JOIN conversations c ON t.conversation_id = c.id
    WHERE t.experiment_id = ?
    ORDER BY t.start_time DESC
    LIMIT 1000
  `).all(experimentId) as any[]

  return traces.map(trace => {
    try {
      const inputData = trace.input_data ? JSON.parse(trace.input_data) : {}
      const outputData = trace.output_data ? JSON.parse(trace.output_data) : {}
      
      return {
        input: inputData.prompt || inputData.input || trace.user_message || '',
        output: outputData.response || outputData.output || trace.assistant_message || '',
        context: inputData.context ? (Array.isArray(inputData.context) ? inputData.context : [inputData.context]) : undefined
      }
    } catch (error) {
      console.warn(`Failed to parse trace ${trace.id}:`, error)
      return {
        input: '',
        output: '',
        context: undefined
      }
    }
  }).filter(item => item.input && item.output)
}

// Helper function to wait for job completion
async function waitForJobCompletion(jobId: string, timeoutSeconds: number): Promise<any> {
  const startTime = Date.now()
  const timeout = timeoutSeconds * 1000

  while (Date.now() - startTime < timeout) {
    const job = await llmEvaluationService.getEvaluationJob(jobId)
    
    if (!job) {
      throw new Error('Job not found')
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return job
    }

    // Wait 2 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  throw new Error('Evaluation timeout')
}