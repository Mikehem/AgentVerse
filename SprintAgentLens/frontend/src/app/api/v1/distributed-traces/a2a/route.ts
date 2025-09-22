import { NextRequest, NextResponse } from 'next/server'
import { a2aCommunicationsDb, distributedSpansDb } from '@/lib/database'
import { getDistributedTracer } from '@/lib/distributed-tracing'

// GET /api/v1/distributed-traces/a2a - Get A2A communications with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const sourceAgentId = searchParams.get('sourceAgentId')
    const targetAgentId = searchParams.get('targetAgentId')
    const communicationType = searchParams.get('communicationType')
    const protocol = searchParams.get('protocol')
    const status = searchParams.get('status')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const minDuration = searchParams.get('minDuration')
    const maxDuration = searchParams.get('maxDuration')
    const includePayload = searchParams.get('includePayload') === 'true'
    const includeResponse = searchParams.get('includeResponse') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for A2A communications
    let query = 'SELECT * FROM a2a_communications WHERE 1=1'
    const params: any[] = []

    if (traceId) {
      query += ' AND trace_id = ?'
      params.push(traceId)
    }

    if (sourceAgentId) {
      query += ' AND source_agent_id = ?'
      params.push(sourceAgentId)
    }

    if (targetAgentId) {
      query += ' AND target_agent_id = ?'
      params.push(targetAgentId)
    }

    if (communicationType) {
      query += ' AND communication_type = ?'
      params.push(communicationType)
    }

    if (protocol) {
      query += ' AND protocol = ?'
      params.push(protocol)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (startTime) {
      query += ' AND start_time >= ?'
      params.push(startTime)
    }

    if (endTime) {
      query += ' AND start_time <= ?'
      params.push(endTime)
    }

    if (minDuration) {
      query += ' AND duration >= ?'
      params.push(parseInt(minDuration))
    }

    if (maxDuration) {
      query += ' AND duration <= ?'
      params.push(parseInt(maxDuration))
    }

    query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const communications = a2aCommunicationsDb.getAll(query, params)

    // Transform communications and optionally exclude large payloads
    const enrichedCommunications = communications.map((comm: any) => {
      const enrichedComm = { ...comm }

      // Parse JSON fields
      if (includePayload && comm.payload) {
        try {
          enrichedComm.payload = JSON.parse(comm.payload)
        } catch (e) {
          enrichedComm.payload = comm.payload
        }
      } else {
        delete enrichedComm.payload
      }

      if (includeResponse && comm.response) {
        try {
          enrichedComm.response = JSON.parse(comm.response)
        } catch (e) {
          enrichedComm.response = comm.response
        }
      } else {
        delete enrichedComm.response
      }

      return enrichedComm
    })

    // Calculate communication metrics
    const metrics = {
      totalCommunications: communications.length,
      communicationTypes: [...new Set(communications.map(c => c.communication_type))],
      protocols: [...new Set(communications.map(c => c.protocol).filter(Boolean))],
      uniqueAgentPairs: [...new Set(communications.map(c => `${c.source_agent_id}->${c.target_agent_id}`))].length,
      avgDuration: communications.length > 0 
        ? communications.reduce((sum, c) => sum + (c.duration || 0), 0) / communications.length 
        : 0,
      successRate: communications.length > 0 
        ? (communications.filter(c => c.status === 'success').length / communications.length) * 100 
        : 0,
      errorRate: communications.length > 0 
        ? (communications.filter(c => c.status === 'error').length / communications.length) * 100 
        : 0
    }

    return NextResponse.json({
      success: true,
      data: enrichedCommunications,
      metrics,
      pagination: {
        limit,
        offset,
        total: communications.length,
        hasNext: communications.length === limit,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Failed to fetch A2A communications:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch A2A communications'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/distributed-traces/a2a - Create new A2A communication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract trace context from headers
    const tracer = getDistributedTracer()
    const context = tracer.extractTraceContext({ headers: Object.fromEntries(request.headers.entries()) })

    let a2aData = { ...body }
    
    // Use trace context if available
    if (context && !a2aData.trace_id && !a2aData.traceId) {
      a2aData.trace_id = context.traceId
      
      // If source span not provided, use current span from context
      if (!a2aData.source_span_id && !a2aData.sourceSpanId) {
        a2aData.source_span_id = context.spanId
      }
    }

    // Validate required fields
    if (!a2aData.source_agent_id && !a2aData.sourceAgentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source agent ID is required'
        },
        { status: 400 }
      )
    }

    if (!a2aData.target_agent_id && !a2aData.targetAgentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Target agent ID is required'
        },
        { status: 400 }
      )
    }

    if (!a2aData.communication_type && !a2aData.communicationType) {
      return NextResponse.json(
        {
          success: false,
          error: 'Communication type is required'
        },
        { status: 400 }
      )
    }

    // Create target span if not provided
    if (!a2aData.target_span_id && !a2aData.targetSpanId) {
      const targetSpan = distributedSpansDb.create({
        trace_id: a2aData.trace_id || a2aData.traceId,
        parent_span_id: a2aData.source_span_id || a2aData.sourceSpanId,
        operation_name: `receive_${a2aData.communication_type || a2aData.communicationType}`,
        service_name: `agent_${a2aData.target_agent_id || a2aData.targetAgentId}`,
        start_time: new Date().toISOString(),
        status: 'running',
        agent_id: a2aData.target_agent_id || a2aData.targetAgentId,
        communication_type: a2aData.communication_type || a2aData.communicationType,
        target_agent_id: a2aData.target_agent_id || a2aData.targetAgentId,
        source_agent_id: a2aData.source_agent_id || a2aData.sourceAgentId
      })
      
      a2aData.target_span_id = targetSpan.id
    }

    const communication = a2aCommunicationsDb.create(a2aData)

    return NextResponse.json({
      success: true,
      data: {
        ...communication,
        payload: communication.payload ? JSON.parse(communication.payload) : {},
        response: communication.response ? JSON.parse(communication.response) : {}
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create A2A communication:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create A2A communication'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/distributed-traces/a2a - Update A2A communication
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'A2A communication ID is required for updates'
        },
        { status: 400 }
      )
    }

    // If updating to completed status, also update the target span
    if (updateData.status === 'success' || updateData.status === 'error') {
      const communication = a2aCommunicationsDb.getById(id)
      if (communication && communication.target_span_id) {
        const spanUpdateData: any = {
          status: updateData.status,
          end_time: updateData.end_time || updateData.endTime || new Date().toISOString()
        }

        if (updateData.duration) {
          spanUpdateData.duration = updateData.duration
        }

        if (updateData.error_message || updateData.errorMessage) {
          const errorLog = {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: updateData.error_message || updateData.errorMessage
          }
          
          const existingSpan = distributedSpansDb.getById(communication.target_span_id)
          const existingLogs = existingSpan?.logs ? JSON.parse(existingSpan.logs) : []
          spanUpdateData.logs = JSON.stringify([...existingLogs, errorLog])
        }

        distributedSpansDb.update(communication.target_span_id, spanUpdateData)
      }
    }

    const updatedCommunication = a2aCommunicationsDb.update(id, updateData)

    if (!updatedCommunication) {
      return NextResponse.json(
        {
          success: false,
          error: 'A2A communication not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedCommunication,
        payload: updatedCommunication.payload ? JSON.parse(updatedCommunication.payload) : {},
        response: updatedCommunication.response ? JSON.parse(updatedCommunication.response) : {}
      }
    })

  } catch (error) {
    console.error('Failed to update A2A communication:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update A2A communication'
      },
      { status: 500 }
    )
  }
}