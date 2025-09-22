import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { evaluationEngine } from '@/lib/evaluation/engine'
import { heuristicMetricsDb, evaluationRunsDb } from '@/lib/database'

const createRunSchema = z.object({
  metricIds: z.array(z.string()).min(1, 'At least one metric is required'),
  datasetId: z.string().optional(),
  datasetItems: z.array(z.object({
    id: z.string(),
    input_data: z.any(),
    expected_output: z.any().optional(),
    metadata: z.any().optional()
  })).optional(),
  options: z.object({
    parallel: z.boolean().optional(),
    maxConcurrency: z.number().min(1).max(20).optional(),
    stopOnFirstFailure: z.boolean().optional(),
    timeout: z.number().min(1000).max(300000).optional()
  }).optional()
})

// POST /api/v1/evaluations/[evaluationId]/runs - Start new evaluation run
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ evaluationId: string }> }
) {
  try {
    const { evaluationId } = await params
    const body = await request.json()
    
    const validatedData = createRunSchema.parse(body)
    
    // Validate that all metrics exist and are active
    const invalidMetrics = []
    for (const metricId of validatedData.metricIds) {
      const metric = heuristicMetricsDb.getById(metricId)
      if (!metric || !metric.is_active) {
        invalidMetrics.push(metricId)
      }
    }
    
    if (invalidMetrics.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid or inactive metrics',
        details: { invalidMetrics }
      }, { status: 400 })
    }
    
    // Validate dataset or dataset items
    if (!validatedData.datasetId && !validatedData.datasetItems) {
      return NextResponse.json({
        success: false,
        error: 'Either datasetId or datasetItems is required'
      }, { status: 400 })
    }
    
    if (validatedData.datasetItems && validatedData.datasetItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'datasetItems cannot be empty'
      }, { status: 400 })
    }
    
    // Start evaluation run
    const runId = await evaluationEngine.startEvaluationRun({
      evaluationId,
      ...validatedData
    })
    
    return NextResponse.json({
      success: true,
      data: { runId }
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    console.error('Error starting evaluation run:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start evaluation run',
      details: error.message
    }, { status: 500 })
  }
}

// GET /api/v1/evaluations/[evaluationId]/runs - List evaluation runs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ evaluationId: string }> }
) {
  try {
    const { evaluationId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const runs = evaluationRunsDb.getByEvaluationId(evaluationId)
    
    // Apply pagination
    const paginatedRuns = runs.slice(offset, offset + limit)
    
    // Add progress information for active runs
    const runsWithProgress = await Promise.all(
      paginatedRuns.map(async (run) => {
        const progress = await evaluationEngine.getProgress(run.id)
        return {
          ...run,
          progress: progress || {
            status: run.status,
            totalItems: run.total_items,
            processedItems: run.processed_items
          }
        }
      })
    )
    
    return NextResponse.json({
      success: true,
      data: runsWithProgress,
      pagination: {
        limit,
        offset,
        total: runs.length,
        hasNext: offset + limit < runs.length,
        hasPrev: offset > 0
      }
    })
    
  } catch (error) {
    console.error('Error fetching evaluation runs:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch evaluation runs'
    }, { status: 500 })
  }
}