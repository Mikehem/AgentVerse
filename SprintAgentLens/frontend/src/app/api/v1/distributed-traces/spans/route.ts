import { NextRequest, NextResponse } from 'next/server'
import { distributedSpansDb, a2aCommunicationsDb } from '@/lib/database'
import { getDistributedTracer } from '@/lib/distributed-tracing'

// GET /api/v1/distributed-traces/spans - Get distributed spans with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const spanId = searchParams.get('spanId')
    const parentSpanId = searchParams.get('parentSpanId')
    const operationName = searchParams.get('operationName')
    const serviceName = searchParams.get('serviceName')
    const agentId = searchParams.get('agentId')
    const agentType = searchParams.get('agentType')
    const status = searchParams.get('status')
    const communicationType = searchParams.get('communicationType')
    const containerId = searchParams.get('containerId')
    const namespace = searchParams.get('namespace')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const minDuration = searchParams.get('minDuration')
    const maxDuration = searchParams.get('maxDuration')
    const includeA2A = searchParams.get('includeA2A') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for distributed spans
    let query = 'SELECT * FROM distributed_spans WHERE 1=1'
    const params: any[] = []

    if (traceId) {
      query += ' AND trace_id = ?'
      params.push(traceId)
    }

    if (spanId) {
      query += ' AND id = ?'
      params.push(spanId)
    }

    if (parentSpanId) {
      query += ' AND parent_span_id = ?'
      params.push(parentSpanId)
    }

    if (operationName) {
      query += ' AND operation_name LIKE ?'
      params.push(`%${operationName}%`)
    }

    if (serviceName) {
      query += ' AND service_name = ?'
      params.push(serviceName)
    }

    if (agentId) {
      query += ' AND agent_id = ?'
      params.push(agentId)
    }

    if (agentType) {
      query += ' AND agent_type = ?'
      params.push(agentType)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (communicationType) {
      query += ' AND communication_type = ?'
      params.push(communicationType)
    }

    if (containerId) {
      query += ' AND container_id = ?'
      params.push(containerId)
    }

    if (namespace) {
      query += ' AND namespace = ?'
      params.push(namespace)
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

    query += ' ORDER BY start_time ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const spans = distributedSpansDb.getAll(query, params)

    // Transform spans and include A2A communications if requested
    const enrichedSpans = await Promise.all(spans.map(async (span: any) => {
      const enrichedSpan = {
        ...span,
        tags: span.tags ? JSON.parse(span.tags) : {},
        logs: span.logs ? JSON.parse(span.logs) : []
      }

      // Include A2A communications if requested
      if (includeA2A) {
        const a2aQuery = `
          SELECT * FROM a2a_communications 
          WHERE source_span_id = ? OR target_span_id = ?
          ORDER BY start_time ASC
        `
        const a2aCommunications = a2aCommunicationsDb.getAll(a2aQuery, [span.id, span.id])
        
        enrichedSpan.a2aCommunications = a2aCommunications.map((comm: any) => ({
          ...comm,
          payload: comm.payload ? JSON.parse(comm.payload) : {},
          response: comm.response ? JSON.parse(comm.response) : {}
        }))
      }

      return enrichedSpan
    }))

    return NextResponse.json({
      success: true,
      data: enrichedSpans,
      pagination: {
        limit,
        offset,
        total: spans.length,
        hasNext: spans.length === limit,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Failed to fetch distributed spans:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch distributed spans'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/distributed-traces/spans - Create new distributed span or batch of spans
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract trace context from headers
    const tracer = getDistributedTracer()
    const context = tracer.extractTraceContext({ headers: Object.fromEntries(request.headers.entries()) })

    // Handle batch span creation
    if (Array.isArray(body.spans)) {
      const spans = body.spans.map((spanData: any) => {
        // Use trace context if available
        if (context && !spanData.trace_id && !spanData.traceId) {
          spanData.trace_id = context.traceId
        }
        
        return distributedSpansDb.create(spanData)
      })

      return NextResponse.json({
        success: true,
        data: spans.map(span => ({
          ...span,
          tags: span.tags ? JSON.parse(span.tags) : {},
          logs: span.logs ? JSON.parse(span.logs) : []
        })),
        count: spans.length
      }, { status: 201 })
    }

    // Single span creation
    let spanData = { ...body }
    
    // Use trace context if available
    if (context && !spanData.trace_id && !spanData.traceId) {
      spanData.trace_id = context.traceId
      if (!spanData.parent_span_id && !spanData.parentSpanId) {
        spanData.parent_span_id = context.spanId
      }
    }

    const span = distributedSpansDb.create(spanData)

    return NextResponse.json({
      success: true,
      data: {
        ...span,
        tags: span.tags ? JSON.parse(span.tags) : {},
        logs: span.logs ? JSON.parse(span.logs) : []
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create distributed span:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create distributed span'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/distributed-traces/spans - Update distributed span
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Span ID is required for updates'
        },
        { status: 400 }
      )
    }

    const updatedSpan = distributedSpansDb.update(id, updateData)

    if (!updatedSpan) {
      return NextResponse.json(
        {
          success: false,
          error: 'Distributed span not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedSpan,
        tags: updatedSpan.tags ? JSON.parse(updatedSpan.tags) : {},
        logs: updatedSpan.logs ? JSON.parse(updatedSpan.logs) : []
      }
    })

  } catch (error) {
    console.error('Failed to update distributed span:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update distributed span'
      },
      { status: 500 }
    )
  }
}