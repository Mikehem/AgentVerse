import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { llmEvaluationService } from '../../../../../lib/services/llmEvaluationService'

const evaluateRequestSchema = z.object({
  input: z.string().min(1, 'Input is required'),
  output: z.string().min(1, 'Output is required'),
  context: z.array(z.string()).optional(),
  reference: z.string().optional(),
  metricType: z.enum(['hallucination', 'relevance', 'moderation', 'usefulness', 'coherence']),
  model: z.object({
    name: z.string(),
    provider: z.enum(['openai', 'anthropic', 'azure', 'custom']),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional()
  }).optional(),
  customPrompt: z.string().optional(),
  traceId: z.string().optional(),
  experimentId: z.string().optional()
})

// POST /api/v1/metrics/evaluate - Evaluate single response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = evaluateRequestSchema.parse(body)

    console.log(`📊 Starting ${validatedData.metricType} evaluation...`)
    
    const result = await llmEvaluationService.evaluateResponse({
      input: validatedData.input,
      output: validatedData.output,
      context: validatedData.context,
      reference: validatedData.reference,
      metricType: validatedData.metricType,
      model: validatedData.model,
      customPrompt: validatedData.customPrompt
    })

    console.log(`✅ Evaluation completed in ${result.latency}ms with score: ${result.score}`)
    
    // Store result in metrics table if trace/experiment provided
    if (validatedData.traceId || validatedData.experimentId) {
      await storeMetricResult(result, validatedData.traceId, validatedData.experimentId)
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Error in metrics evaluation:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to evaluate metrics'
    }, { status: 500 })
  }
}

// Store metric result in database
async function storeMetricResult(
  result: any,
  traceId?: string,
  experimentId?: string
): Promise<void> {
  const Database = (await import('../../../../../lib/database')).default
  const { generateMetricId } = await import('../../../../../lib/idGenerator')
  
  const metricId = generateMetricId()
  const now = new Date().toISOString()
  
  const stmt = Database.prepare(`
    INSERT INTO metrics (
      id, name, value, trace_id, experiment_id, metric_type,
      reasoning, confidence_score, evaluation_cost, evaluation_latency,
      evaluationModel, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  
  stmt.run(
    metricId,
    result.metricType,
    result.score,
    traceId || null,
    experimentId || null,
    result.metricType,
    result.reasoning,
    result.confidence,
    result.cost,
    result.latency,
    result.model,
    now,
    now
  )
}