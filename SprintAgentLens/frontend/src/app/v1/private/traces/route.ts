import { NextRequest, NextResponse } from 'next/server'
import { tracesDb, spansDb, projectDb, agentDb } from '@/lib/database'
import { calculateCost, type TokenUsage } from '@/lib/costCalculation'
import { generateSpanId } from '@/lib/idGenerator'

// POST /v1/private/traces - Handle SDK trace submissions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Private Traces POST - received body:', JSON.stringify(body, null, 2))
    
    // Extract trace data from SDK format
    const traceData = body
    
    // Map SDK format to our database schema
    // Handle project name to project ID mapping for distributed tracing demos
    let projectId = traceData.project_id || traceData.projectId
    if (!projectId && traceData.project_name === 'ecommerce_distributed_processing_v3') {
      projectId = 'project-1758269313646' // Map the distributed tracing demo project
    }
    projectId = projectId || 'proj_production_demo_001'
    
    // Extract agent_id from tags if not directly available
    const traceTags = traceData.tags || {}
    const agentId = traceData.agent_id || traceData.agentId || traceTags.agent_id

    // Validate project exists
    if (projectId && projectId !== 'proj_production_demo_001') {
      const existingProject = projectDb.getById(projectId)
      if (!existingProject) {
        return NextResponse.json({
          success: false,
          error: `Project with ID '${projectId}' does not exist. Please ensure the project is created before submitting traces.`
        }, { status: 400 })
      }
    }
    
    // Validate agent exists (if specified and not default)
    if (agentId && agentId !== 'sdk-agent') {
      const existingAgent = agentDb.getById(agentId)
      if (!existingAgent) {
        return NextResponse.json({
          success: false,
          error: `Agent with ID '${agentId}' does not exist. Please ensure the agent is created before submitting traces.`
        }, { status: 400 })
      }
      
      // Validate agent belongs to the project
      if (existingAgent.project_id !== projectId) {
        return NextResponse.json({
          success: false,
          error: `Agent '${agentId}' does not belong to project '${projectId}'. Agent belongs to project '${existingAgent.project_id}'.`
        }, { status: 400 })
      }
    }

    // Use validated agentId or fallback to sdk-agent
    const validatedAgentId = agentId || 'sdk-agent'
    
    const mappedTrace = {
      projectId: projectId,
      agentId: validatedAgentId,
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
      inputData: traceData.inputData || traceData.input?.data || traceData.input || {},
      outputData: traceData.outputData || traceData.output?.data || traceData.output || {},
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
      operation_name: mappedTrace.operationName,
      start_time: mappedTrace.startTime,
      end_time: mappedTrace.endTime,
      duration: mappedTrace.duration,
      status: mappedTrace.status,
      error_message: mappedTrace.errorMessage,
      input_data: mappedTrace.inputData ? JSON.stringify(mappedTrace.inputData) : null,
      output_data: mappedTrace.outputData ? JSON.stringify(mappedTrace.outputData) : null,
      spans: null, // Remove JSON storage, spans will be in separate table
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

    // Create separate span records in the spans table
    const createdSpans = []
    if (mappedTrace.spans && Array.isArray(mappedTrace.spans)) {
      for (const spanData of mappedTrace.spans) {
        try {
          // Check if this is a conversation span (contains conversation-specific fields)
          const isConversationSpan = !!(
            spanData.conversation_session_id ||
            spanData.conversation_turn !== undefined ||
            spanData.conversation_role ||
            spanData.conversation_context ||
            (spanData.metadata && (
              spanData.metadata.conversation_session_id ||
              spanData.metadata.conversation_turn !== undefined ||
              spanData.metadata.conversation_role
            ))
          )

          // Extract conversation fields from span data or metadata
          const conversationSessionId = spanData.conversation_session_id || 
            spanData.metadata?.conversation_session_id || null
          const conversationTurn = spanData.conversation_turn !== undefined 
            ? spanData.conversation_turn 
            : spanData.metadata?.conversation_turn || null
          const conversationRole = spanData.conversation_role || 
            spanData.metadata?.conversation_role || null
          const conversationContext = spanData.conversation_context || 
            spanData.metadata?.conversation_context || null

          // Map span field names from SDK format to database format
          const span = spansDb.create({
            trace_id: trace.id,
            parent_span_id: spanData.parent_id || spanData.parent_span_id || null,
            span_id: spanData.id || spanData.span_id || generateSpanId(),
            span_name: spanData.name || 'Unnamed Span',
            span_type: spanData.span_type || spanData.type || (isConversationSpan ? 'conversation' : 'custom'),
            start_time: spanData.start_time || spanData.startTime || new Date().toISOString(),
            end_time: spanData.end_time || spanData.endTime || null,
            duration: spanData.duration_ms || spanData.duration || null,
            status: spanData.status || 'completed',
            error_message: spanData.error?.message || spanData.error_message || null,
            input_data: spanData.input?.data ? JSON.stringify(spanData.input.data) : 
                       (spanData.input ? JSON.stringify(spanData.input) : null),
            output_data: spanData.output?.data ? JSON.stringify(spanData.output.data) : 
                        (spanData.output ? JSON.stringify(spanData.output) : null),
            metadata: spanData.metadata ? JSON.stringify(spanData.metadata) : null,
            tags: spanData.tags ? JSON.stringify(spanData.tags) : null,
            usage: spanData.tokens_usage ? JSON.stringify(spanData.tokens_usage) : null,
            model_name: spanData.model || null,
            provider: spanData.provider || null,
            total_cost: spanData.cost || 0,
            prompt_tokens: spanData.tokens_usage?.prompt_tokens || 0,
            completion_tokens: spanData.tokens_usage?.completion_tokens || 0,
            total_tokens: spanData.tokens_usage?.total_tokens || 0,
            // Conversation-specific fields
            conversation_session_id: conversationSessionId,
            conversation_turn: conversationTurn,
            conversation_role: conversationRole,
            conversation_context: conversationContext ? JSON.stringify(conversationContext) : null,
            // Add direct project+agent linkage for better querying
            project_id: mappedTrace.projectId,
            agent_id: mappedTrace.agentId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          createdSpans.push(span)
          
          if (isConversationSpan) {
            console.log(`✅ Created conversation span: ${span.span_name} (turn ${conversationTurn}, role: ${conversationRole}) for trace ${trace.id}`)
          } else {
            console.log(`✅ Created span: ${span.span_name} for trace ${trace.id}`)
          }
        } catch (spanError) {
          console.error(`❌ Failed to create span for trace ${trace.id}:`, spanError)
        }
      }
    }

    console.log(`✅ SDK trace saved with ID: ${trace.id}, cost: $${finalCost}, spans: ${createdSpans.length}`)

    // Return success response in format expected by SDK
    return NextResponse.json({
      success: true,
      data: {
        id: trace.id,
        spans_created: createdSpans.length,
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