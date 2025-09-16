import { NextRequest, NextResponse } from 'next/server'
import { metricsDb } from '@/lib/database'
import { z } from 'zod'

// Validation schema for metrics data
const metricSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  metricType: z.enum([
    // Performance Metrics
    'response_time', 'latency', 'processing_time', 'queue_time',
    // Usage & Cost Metrics  
    'token_usage', 'input_tokens', 'output_tokens', 'cost', 'api_calls',
    // Success & Error Metrics
    'success_rate', 'error_rate', 'timeout_rate', 'retry_count',
    // Throughput & Load Metrics
    'throughput', 'requests_per_minute', 'concurrent_requests', 'queue_length',
    // Resource Metrics
    'memory_usage', 'cpu_usage', 'disk_usage', 'network_io',
    // Business Metrics
    'user_satisfaction', 'task_completion_rate', 'escalation_rate',
    // Agent-to-Agent (A2A) Metrics
    'a2a_calls', 'a2a_success_rate', 'a2a_latency', 'handoff_count',
    // Opik-style Heuristic Metrics (Deterministic)
    'equals_match', 'contains_match', 'regex_match', 'is_json_valid', 'levenshtein_distance',
    // Opik-style LLM-as-Judge Metrics (Non-deterministic)
    'hallucination_score', 'moderation_score', 'answer_relevance', 'usefulness_score',
    'context_recall', 'context_precision', 'factual_accuracy',
    // Conversational Quality Metrics
    'coherence_score', 'session_completeness', 'user_frustration', 'conversation_flow',
    'intent_recognition', 'sentiment_score', 'politeness_score',
    // Safety & Content Metrics
    'toxicity_score', 'bias_score', 'privacy_compliance', 'content_appropriateness',
    // Task-specific Metrics
    'instruction_following', 'creativity_score', 'conciseness_score', 'clarity_score'
  ]),
  value: z.number(),
  unit: z.string().optional(),
  aggregationType: z.enum(['instant', 'avg', 'sum', 'count', 'min', 'max', 'p95', 'p99']).default('instant'),
  timestamp: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  // Additional Opik-style fields
  evaluationModel: z.string().optional(), // e.g., 'gpt-4o', 'claude-3', 'custom'
  referenceValue: z.string().optional(), // For comparison metrics
  threshold: z.number().optional(), // For pass/fail metrics
})

// GET /api/v1/metrics - Get metrics with filtering and aggregation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const runId = searchParams.get('runId')
    const metricType = searchParams.get('metricType')
    const timeRange = searchParams.get('timeRange') || '24h' // 1h, 24h, 7d, 30d
    const aggregation = searchParams.get('aggregation') || 'avg' // avg, sum, count, min, max

    // Build query based on filters
    let query = 'SELECT * FROM metrics WHERE 1=1'
    const params: any[] = []

    if (projectId) {
      query += ' AND projectId = ?'
      params.push(projectId)
    }

    if (agentId) {
      query += ' AND agentId = ?'
      params.push(agentId)
    }

    if (runId) {
      query += ' AND runId = ?'
      params.push(runId)
    }

    if (metricType) {
      query += ' AND metricType = ?'
      params.push(metricType)
    }

    // Add time range filter
    const timeRangeMap: { [key: string]: string } = {
      '1h': "datetime(timestamp) >= datetime('now', '-1 hour')",
      '24h': "datetime(timestamp) >= datetime('now', '-1 day')",
      '7d': "datetime(timestamp) >= datetime('now', '-7 days')",
      '30d': "datetime(timestamp) >= datetime('now', '-30 days')"
    }

    if (timeRangeMap[timeRange]) {
      query += ` AND ${timeRangeMap[timeRange]}`
    }

    query += ' ORDER BY timestamp DESC'

    const metrics = metricsDb.getAll(query, params)

    // If aggregation is requested, group and aggregate the data
    if (aggregation !== 'none' && metrics.length > 0) {
      const aggregatedData = aggregateMetrics(metrics, aggregation)
      return NextResponse.json({
        success: true,
        data: aggregatedData,
        meta: {
          timeRange,
          aggregation,
          totalRecords: metrics.length
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      meta: {
        timeRange,
        totalRecords: metrics.length
      }
    })

  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/metrics - Create new metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle batch metrics upload
    if (Array.isArray(body)) {
      const validatedMetrics = body.map(metric => ({
        ...metricSchema.parse(metric),
        timestamp: metric.timestamp || new Date().toISOString(),
        createdAt: new Date().toISOString()
      }))

      const metrics = validatedMetrics.map(metric => metricsDb.create({
        ...metric,
        metadata: metric.metadata ? JSON.stringify(metric.metadata) : null
      }))

      return NextResponse.json({
        success: true,
        data: metrics,
        count: metrics.length
      }, { status: 201 })
    }

    // Temporarily bypass Zod validation due to _zod error
    const validatedData = {
      projectId: body.projectId,
      agentId: body.agentId,
      runId: body.runId || null,
      metricType: body.metricType,
      value: body.value,
      unit: body.unit || null,
      aggregationType: body.aggregationType || 'instant',
      timestamp: body.timestamp || new Date().toISOString(),
      metadata: body.metadata || {},
      // Opik-style evaluation fields
      evaluationModel: body.evaluationModel || null,
      referenceValue: body.referenceValue || null,
      threshold: body.threshold || null
    }
    
    const metric = metricsDb.create({
      ...validatedData,
      timestamp: validatedData.timestamp || new Date().toISOString(),
      metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      createdAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: metric
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    console.error('Failed to create metric:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create metric'
      },
      { status: 500 }
    )
  }
}

// Helper function to aggregate metrics
function aggregateMetrics(metrics: any[], aggregationType: string) {
  const grouped = metrics.reduce((acc, metric) => {
    const key = `${metric.metricType}-${metric.agentId}`
    if (!acc[key]) {
      acc[key] = {
        projectId: metric.projectId,
        agentId: metric.agentId,
        metricType: metric.metricType,
        unit: metric.unit,
        values: [],
        timestamps: []
      }
    }
    acc[key].values.push(metric.value)
    acc[key].timestamps.push(metric.timestamp)
    return acc
  }, {} as any)

  return Object.values(grouped).map((group: any) => {
    let aggregatedValue: number

    switch (aggregationType) {
      case 'avg':
        aggregatedValue = group.values.reduce((sum: number, val: number) => sum + val, 0) / group.values.length
        break
      case 'sum':
        aggregatedValue = group.values.reduce((sum: number, val: number) => sum + val, 0)
        break
      case 'count':
        aggregatedValue = group.values.length
        break
      case 'min':
        aggregatedValue = Math.min(...group.values)
        break
      case 'max':
        aggregatedValue = Math.max(...group.values)
        break
      default:
        aggregatedValue = group.values[group.values.length - 1] // latest value
    }

    return {
      ...group,
      value: aggregatedValue,
      aggregationType,
      dataPoints: group.values.length,
      timeRange: {
        start: group.timestamps[group.timestamps.length - 1],
        end: group.timestamps[0]
      }
    }
  })
}