import { NextRequest, NextResponse } from 'next/server'
import { spansDb } from '@/lib/database'
import { calculateCost, type TokenUsage } from '@/lib/costCalculation'
import { generateSpanId } from '@/lib/idGenerator'
import { z } from 'zod'

// Validation schema for span data
const spanSchema = z.object({
  traceId: z.string().min(1, 'Trace ID is required'),
  parentSpanId: z.string().optional(),
  spanId: z.string().min(1, 'Span ID is required'),
  spanName: z.string().min(1, 'Span name is required'),
  spanType: z.enum(['llm', 'preprocessing', 'postprocessing', 'custom', 'tool', 'retrieval']),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  duration: z.number().min(0).optional(),
  status: z.enum(['running', 'success', 'error', 'timeout']).default('running'),
  errorMessage: z.string().optional(),
  inputData: z.record(z.any()).optional(),
  outputData: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
  tags: z.record(z.string()).optional(),
  model: z.string().optional(),
  provider: z.string().optional(),
  tokenUsage: z.object({
    promptTokens: z.number().optional(),
    completionTokens: z.number().optional(),
    totalTokens: z.number().optional()
  }).optional(),
  cost: z.number().optional()
})

// GET /api/v1/spans - Get spans with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const parentSpanId = searchParams.get('parentSpanId')
    const spanType = searchParams.get('spanType')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query based on filters
    let query = 'SELECT * FROM spans WHERE 1=1'
    const params: any[] = []

    if (traceId) {
      query += ' AND trace_id = ?'
      params.push(traceId)
    }

    if (parentSpanId) {
      query += ' AND parent_span_id = ?'
      params.push(parentSpanId)
    }

    if (spanType) {
      query += ' AND span_type = ?'
      params.push(spanType)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY start_time ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const spans = spansDb.getAll(query, params)

    // Transform the spans to parse JSON fields
    const transformedSpans = spans.map(span => ({
      ...span,
      inputData: span.input_data ? JSON.parse(span.input_data) : null,
      outputData: span.output_data ? JSON.parse(span.output_data) : null,
      metadata: span.metadata ? JSON.parse(span.metadata) : null,
      tags: span.tags ? JSON.parse(span.tags) : null,
      tokenUsage: span.token_usage ? JSON.parse(span.token_usage) : null,
      // Parse conversation context JSON field
      conversation_context: span.conversation_context ? JSON.parse(span.conversation_context) : null,
      // Map snake_case to camelCase for frontend compatibility
      traceId: span.trace_id,
      parentSpanId: span.parent_span_id,
      spanId: span.span_id,
      spanName: span.span_name,
      spanType: span.span_type,
      startTime: span.start_time,
      endTime: span.end_time,
      errorMessage: span.error_message,
      createdAt: span.created_at,
      updatedAt: span.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedSpans,
      pagination: {
        limit,
        offset,
        total: spans.length
      }
    })

  } catch (error) {
    console.error('Failed to fetch spans:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch spans'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/spans - Create new span(s)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Spans POST - received body:', JSON.stringify(body, null, 2))
    
    // Handle batch spans upload
    if (Array.isArray(body)) {
      const validatedSpans = body.map(span => ({
        ...spanSchema.parse(span),
        startTime: span.startTime || new Date().toISOString(),
        createdAt: new Date().toISOString()
      }))

      // Validate that all referenced traces exist before creating spans
      const { tracesDb } = await import('@/lib/database')
      const missingTraces: string[] = []
      
      for (const span of validatedSpans) {
        if (span.traceId) {
          const existingTrace = tracesDb.getById(span.traceId)
          if (!existingTrace) {
            missingTraces.push(span.traceId)
          }
        }
      }
      
      if (missingTraces.length > 0) {
        console.error(`Traces not found: ${missingTraces.join(', ')}`)
        return NextResponse.json({
          success: false,
          error: `Referenced traces do not exist: ${missingTraces.join(', ')}. Please ensure traces are created before creating spans.`
        }, { status: 400 })
      }

      const spans = validatedSpans.map(span => spansDb.create({
        trace_id: span.traceId,
        parent_span_id: span.parentSpanId || null,
        name: span.spanName,
        type: span.spanType,
        start_time: span.startTime,
        end_time: span.endTime || null,
        duration: span.duration || null,
        status: span.status,
        input: span.inputData ? JSON.stringify(span.inputData) : null,
        output: span.outputData ? JSON.stringify(span.outputData) : null,
        metadata: span.metadata ? JSON.stringify(span.metadata) : null,
        token_usage: span.tokenUsage?.totalTokens || 0,
        cost: span.cost || 0,
        created_at: new Date().toISOString()
      }))

      return NextResponse.json({
        success: true,
        data: spans,
        count: spans.length
      }, { status: 201 })
    }

    // Single span - handle both camelCase and snake_case formats
    console.log('Processing single span, received body:', JSON.stringify(body, null, 2))
    
    // Handle Python client format directly (bypass Zod validation)
    const validatedData = {
      traceId: body.trace_id || body.traceId,
      parentSpanId: body.parent_span_id || body.parentSpanId,
      spanId: body.id || body.span_id || body.spanId || generateSpanId(),
      spanName: body.name || body.span_name || body.spanName,
      spanType: body.type || body.span_type || body.spanType || 'custom',
      startTime: body.start_time || body.startTime,
      endTime: body.end_time || body.endTime,
      duration: body.duration,
      status: body.status || 'running',
      errorMessage: body.error_message || body.errorMessage,
      inputData: body.input || body.input_data || body.inputData,
      outputData: body.output || body.output_data || body.outputData,
      metadata: body.metadata || {},
      tags: body.tags || {},
      tokenUsage: body.token_usage || body.tokenUsage,
      cost: body.cost
    }

    // Validate that the trace exists before creating the span
    if (validatedData.traceId) {
      const { tracesDb, projectDb, agentDb } = await import('@/lib/database')
      const existingTrace = tracesDb.getById(validatedData.traceId)
      if (!existingTrace) {
        console.error(`Trace not found: ${validatedData.traceId}`)
        return NextResponse.json({
          success: false,
          error: `Referenced trace ${validatedData.traceId} does not exist. Please ensure the trace is created before creating spans.`
        }, { status: 400 })
      }
      
      // If project_id is provided, validate it exists and matches trace
      if (body.project_id) {
        const existingProject = projectDb.getById(body.project_id)
        if (!existingProject) {
          return NextResponse.json({
            success: false,
            error: `Project with ID '${body.project_id}' does not exist.`
          }, { status: 400 })
        }
        
        // Ensure project matches trace's project
        if (existingTrace.project_id !== body.project_id) {
          return NextResponse.json({
            success: false,
            error: `Span project_id '${body.project_id}' does not match trace project_id '${existingTrace.project_id}'.`
          }, { status: 400 })
        }
      }
      
      // If agent_id is provided, validate it exists and belongs to project
      if (body.agent_id && body.agent_id !== 'sdk-agent') {
        const existingAgent = agentDb.getById(body.agent_id)
        if (!existingAgent) {
          return NextResponse.json({
            success: false,
            error: `Agent with ID '${body.agent_id}' does not exist.`
          }, { status: 400 })
        }
        
        const projectId = body.project_id || existingTrace.project_id
        if (existingAgent.project_id !== projectId) {
          return NextResponse.json({
            success: false,
            error: `Agent '${body.agent_id}' does not belong to project '${projectId}'. Agent belongs to project '${existingAgent.project_id}'.`
          }, { status: 400 })
        }
      }
    }

    // Calculate costs automatically if token usage is provided
    let costCalculation = null
    let finalCost = validatedData.cost || 0
    let inputCost = 0
    let outputCost = 0

    if (validatedData.tokenUsage || (body.token_usage && typeof body.token_usage === 'object')) {
      const tokenUsage: TokenUsage = validatedData.tokenUsage || body.token_usage || {}
      const model = body.model || body.model_name || validatedData.metadata?.model || 'unknown'
      const provider = body.provider || validatedData.metadata?.provider || 'unknown'

      if (tokenUsage.promptTokens || tokenUsage.completionTokens || tokenUsage.totalTokens) {
        costCalculation = calculateCost(model, tokenUsage, provider)
        finalCost = costCalculation.totalCost
        inputCost = costCalculation.inputCost
        outputCost = costCalculation.outputCost
        
        console.log(`💰 Calculated cost for span ${validatedData.spanId}: $${finalCost} (${tokenUsage.promptTokens || 0} prompt + ${tokenUsage.completionTokens || 0} completion tokens)`)
      }
    }
    
    const span = spansDb.create({
      trace_id: validatedData.traceId,
      parent_span_id: validatedData.parentSpanId || null,
      span_id: validatedData.spanId,
      span_name: validatedData.spanName,
      span_type: validatedData.spanType,
      start_time: validatedData.startTime || new Date().toISOString(),
      end_time: validatedData.endTime || null,
      duration: validatedData.duration || null,
      status: validatedData.status,
      error_message: validatedData.errorMessage || null,
      input_data: validatedData.inputData ? JSON.stringify(validatedData.inputData) : null,
      output_data: validatedData.outputData ? JSON.stringify(validatedData.outputData) : null,
      metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
      usage: validatedData.tokenUsage ? JSON.stringify(validatedData.tokenUsage) : null,
      // Enhanced cost tracking fields
      total_cost: finalCost,
      input_cost: inputCost,
      output_cost: outputCost,
      prompt_tokens: validatedData.tokenUsage?.promptTokens || 0,
      completion_tokens: validatedData.tokenUsage?.completionTokens || 0,
      total_tokens: validatedData.tokenUsage?.totalTokens || 0,
      provider: body.provider || validatedData.metadata?.provider || null,
      model_name: body.model || body.model_name || validatedData.metadata?.model || null,
      cost_calculation_metadata: costCalculation ? JSON.stringify(costCalculation) : null,
      // Conversation-specific fields
      conversation_session_id: body.conversation_session_id || null,
      conversation_turn: body.conversation_turn || null,
      conversation_role: body.conversation_role || null,
      conversation_context: body.conversation_context ? JSON.stringify(body.conversation_context) : null,
      // Add direct project+agent linkage for better querying
      project_id: body.project_id || validatedData.projectId || null,
      agent_id: body.agent_id || validatedData.agentId || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: span
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
    
    console.error('Failed to create span:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create span'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/spans - Update existing span
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { spanId, endTime, duration, status, errorMessage, outputData, metadata, tags, tokenUsage, cost } = body

    if (!spanId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Span ID is required for updates'
        },
        { status: 400 }
      )
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    
    if (endTime) updateData.end_time = endTime
    if (duration !== undefined) updateData.duration = duration
    if (status) updateData.status = status
    if (errorMessage) updateData.error_message = errorMessage
    if (outputData) updateData.output_data = JSON.stringify(outputData)
    if (metadata) updateData.metadata = JSON.stringify(metadata)
    if (tags) updateData.tags = JSON.stringify(tags)
    if (tokenUsage) updateData.token_usage = JSON.stringify(tokenUsage)
    if (cost !== undefined) updateData.cost = cost

    const updatedSpan = spansDb.updateBySpanId(spanId, updateData)

    if (!updatedSpan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Span not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedSpan
    })
    
  } catch (error) {
    console.error('Failed to update span:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update span'
      },
      { status: 500 }
    )
  }
}