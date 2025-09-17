import { NextRequest, NextResponse } from 'next/server'
import { tracesDb } from '@/lib/database'
import { calculateCost, type TokenUsage } from '@/lib/costCalculation'

// POST /v1/private/traces - Handle SDK trace submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Private Traces POST - received body:', JSON.stringify(body, null, 2))
    
    // Extract trace data from SDK format
    const traceData = body
    
    // Map SDK format to our database schema
    const mappedTrace = {
      projectId: traceData.project_id || traceData.projectId || 'proj_production_demo_001',
      agentId: traceData.agent_id || traceData.agentId || 'sdk-agent',
      runId: traceData.id || null,
      conversationId: traceData.conversation_id || traceData.conversationId || null,
      parentTraceId: traceData.parent_id || traceData.parentId || null,
      traceType: traceData.type || 'llm_chain',
      operationName: traceData.name || 'SDK Trace',
      startTime: traceData.start_time || traceData.startTime || new Date().toISOString(),
      endTime: traceData.end_time || traceData.endTime || null,
      duration: traceData.duration_ms || traceData.duration || null,
      status: mapStatus(traceData.status),
      errorMessage: traceData.error?.message || null,
      inputData: traceData.input?.data || traceData.input || {},
      outputData: traceData.output?.data || traceData.output || {},
      spans: traceData.spans || [],
      metadata: traceData.metadata || {},
      tags: traceData.tags || []
    }
    
    // Calculate costs automatically if usage information is provided
    let costCalculation = null
    let finalCost = 0
    let inputCost = 0
    let outputCost = 0
    let promptTokens = 0
    let completionTokens = 0
    let totalTokens = 0

    // Look for token usage in various locations (SDK can send it in different formats)
    const usage = traceData.tokens_usage || traceData.token_usage || traceData.usage || {}
    const model = traceData.model || traceData.model_name || 'unknown'
    const provider = traceData.provider || 'unknown'

    if (usage && (usage.prompt_tokens || usage.completion_tokens || usage.total_tokens)) {
      const tokenUsage: TokenUsage = {
        promptTokens: usage.prompt_tokens || usage.promptTokens || 0,
        completionTokens: usage.completion_tokens || usage.completionTokens || 0,
        totalTokens: usage.total_tokens || usage.totalTokens || 0
      }

      if (tokenUsage.promptTokens || tokenUsage.completionTokens || tokenUsage.totalTokens) {
        try {
          costCalculation = calculateCost(model, tokenUsage, provider)
          finalCost = costCalculation.totalCost
          inputCost = costCalculation.inputCost
          outputCost = costCalculation.outputCost
          promptTokens = tokenUsage.promptTokens || 0
          completionTokens = tokenUsage.completionTokens || 0
          totalTokens = tokenUsage.totalTokens || (promptTokens + completionTokens)
          
          console.log(`💰 Calculated cost for SDK trace ${traceData.id}: $${finalCost} (${promptTokens} prompt + ${completionTokens} completion tokens, model: ${model})`)
        } catch (error) {
          console.warn('Cost calculation failed:', error)
        }
      }
    }

    // Create the trace in database
    const trace = tracesDb.create({
      project_id: mappedTrace.projectId,
      agent_id: mappedTrace.agentId,
      runId: mappedTrace.runId,
      conversation_id: mappedTrace.conversationId,
      name: mappedTrace.operationName,
      start_time: mappedTrace.startTime,
      end_time: mappedTrace.endTime,
      duration: mappedTrace.duration,
      status: mappedTrace.status,
      metadata: JSON.stringify(mappedTrace.metadata),
      tags: JSON.stringify(mappedTrace.tags),
      // Enhanced cost tracking fields
      total_cost: finalCost,
      input_cost: inputCost,
      output_cost: outputCost,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      provider: provider !== 'unknown' ? provider : null,
      model_name: model !== 'unknown' ? model : null,
      cost_calculation_metadata: costCalculation ? JSON.stringify(costCalculation) : null
    })

    console.log(`✅ SDK trace saved with ID: ${trace.id}, cost: $${finalCost}`)

    // Return success response in format expected by SDK
    return NextResponse.json({
      success: true,
      data: {
        id: trace.id,
        ...mappedTrace
      }
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to process SDK trace:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process trace'
      },
      { status: 500 }
    )
  }
}

// Helper function to map SDK status to our status enum
function mapStatus(sdkStatus: string): string {
  switch (sdkStatus?.toLowerCase()) {
    case 'completed':
    case 'success':
      return 'success'
    case 'error':
    case 'failed':
      return 'error'
    case 'cancelled':
      return 'timeout'
    case 'running':
    default:
      return 'running'
  }
}

// GET /v1/private/traces - Get traces (for SDK compatibility)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id') || searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = 'SELECT * FROM traces WHERE 1=1'
    const params: any[] = []

    if (projectId) {
      query += ' AND project_id = ?'
      params.push(projectId)
    }

    query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const traces = tracesDb.getAll(query, params)

    // Transform traces to SDK format
    const sdkTraces = traces.map(trace => ({
      id: trace.id,
      project_id: trace.project_id,
      name: trace.name,
      start_time: trace.start_time,
      end_time: trace.end_time,
      duration_ms: trace.duration,
      status: trace.status,
      metadata: trace.metadata ? JSON.parse(trace.metadata) : {},
      tags: trace.tags ? JSON.parse(trace.tags) : [],
      tokens_usage: {
        prompt_tokens: trace.prompt_tokens || 0,
        completion_tokens: trace.completion_tokens || 0,
        total_tokens: trace.total_tokens || 0
      },
      cost: trace.total_cost || 0,
      provider: trace.provider,
      model: trace.model_name
    }))

    return NextResponse.json({
      success: true,
      data: sdkTraces,
      pagination: {
        limit,
        offset,
        total: traces.length
      }
    })

  } catch (error) {
    console.error('Failed to fetch SDK traces:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch traces'
      },
      { status: 500 }
    )
  }
}