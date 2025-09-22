import { NextRequest, NextResponse } from 'next/server'
import { distributedTracesDb, distributedSpansDb } from '@/lib/database'
import { getDistributedTracer } from '@/lib/distributed-tracing'

// GET /api/v1/distributed-traces - Get distributed traces with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const serviceName = searchParams.get('serviceName')
    const agentId = searchParams.get('agentId')
    const agentType = searchParams.get('agentType')
    const status = searchParams.get('status')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const minDuration = searchParams.get('minDuration')
    const maxDuration = searchParams.get('maxDuration')
    const hasErrors = searchParams.get('hasErrors') === 'true'
    const communicationType = searchParams.get('communicationType')
    const containerId = searchParams.get('containerId')
    const namespace = searchParams.get('namespace')
    const includeSpans = searchParams.get('includeSpans') === 'true'
    const includeMetrics = searchParams.get('includeMetrics') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for distributed traces
    let query = 'SELECT * FROM distributed_traces WHERE 1=1'
    const params: any[] = []

    if (traceId) {
      query += ' AND id = ?'
      params.push(traceId)
    }

    if (serviceName) {
      query += ' AND service_name = ?'
      params.push(serviceName)
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

    if (hasErrors) {
      query += ' AND error_count > 0'
    }

    query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const traces = distributedTracesDb.getAll(query, params)

    // Transform and enrich traces
    const enrichedTraces = await Promise.all(traces.map(async (trace: any) => {
      const enrichedTrace = {
        ...trace,
        metadata: trace.metadata ? JSON.parse(trace.metadata) : {}
      }

      // Include spans if requested
      if (includeSpans) {
        let spansQuery = 'SELECT * FROM distributed_spans WHERE trace_id = ?'
        const spansParams = [trace.id]

        // Add span-level filters
        if (agentId) {
          spansQuery += ' AND agent_id = ?'
          spansParams.push(agentId)
        }

        if (agentType) {
          spansQuery += ' AND agent_type = ?'
          spansParams.push(agentType)
        }

        if (communicationType) {
          spansQuery += ' AND communication_type = ?'
          spansParams.push(communicationType)
        }

        if (containerId) {
          spansQuery += ' AND container_id = ?'
          spansParams.push(containerId)
        }

        if (namespace) {
          spansQuery += ' AND namespace = ?'
          spansParams.push(namespace)
        }

        spansQuery += ' ORDER BY start_time ASC'

        const spans = distributedSpansDb.getAll(spansQuery, spansParams)
        enrichedTrace.spans = spans.map((span: any) => ({
          ...span,
          tags: span.tags ? JSON.parse(span.tags) : {},
          logs: span.logs ? JSON.parse(span.logs) : []
        }))
      }

      return enrichedTrace
    }))

    // Calculate metrics if requested
    let metrics = null
    if (includeMetrics) {
      const totalTraces = enrichedTraces.length
      const completedTraces = enrichedTraces.filter(t => t.status === 'success')
      const errorTraces = enrichedTraces.filter(t => t.status === 'error')
      const totalSpans = enrichedTraces.reduce((sum, t) => sum + (t.spans?.length || 0), 0)

      const totalCost = enrichedTraces.reduce((sum, t) => sum + (t.total_cost || 0), 0)
      const totalTokens = enrichedTraces.reduce((sum, t) => sum + (t.total_tokens || 0), 0)
      const totalDuration = enrichedTraces.reduce((sum, t) => sum + (t.duration || 0), 0)

      metrics = {
        totalTraces,
        totalSpans,
        totalAgents: [...new Set(enrichedTraces.flatMap(t => t.spans?.map((s: any) => s.agent_id).filter(Boolean) || []))].length,
        totalServices: [...new Set(enrichedTraces.map(t => t.service_name))].length,
        totalContainers: [...new Set(enrichedTraces.flatMap(t => t.spans?.map((s: any) => s.container_id).filter(Boolean) || []))].length,
        successRate: totalTraces > 0 ? (completedTraces.length / totalTraces) * 100 : 0,
        errorRate: totalTraces > 0 ? (errorTraces.length / totalTraces) * 100 : 0,
        avgDuration: totalTraces > 0 ? totalDuration / totalTraces : 0,
        avgSpansPerTrace: totalTraces > 0 ? totalSpans / totalTraces : 0,
        totalCost,
        totalTokens,
        avgCostPerTrace: totalTraces > 0 ? totalCost / totalTraces : 0
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedTraces,
      metrics,
      pagination: {
        limit,
        offset,
        total: traces.length,
        hasNext: traces.length === limit,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Failed to fetch distributed traces:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch distributed traces'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/distributed-traces - Create new distributed trace
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract trace context from headers if available
    const tracer = getDistributedTracer()
    const context = tracer.extractTraceContext({ headers: Object.fromEntries(request.headers.entries()) })

    let traceData
    if (context) {
      // Continue existing trace
      traceData = {
        id: context.traceId,
        root_span_id: body.rootSpanId || context.spanId,
        service_name: body.serviceName || 'unknown',
        start_time: body.startTime || new Date().toISOString(),
        status: body.status || 'running',
        agent_count: body.agentCount || 0,
        service_count: body.serviceCount || 1,
        container_count: body.containerCount || 0,
        metadata: body.metadata || {}
      }
    } else {
      // Create new trace
      traceData = {
        root_span_id: body.rootSpanId,
        service_name: body.serviceName || 'unknown',
        start_time: body.startTime || new Date().toISOString(),
        status: body.status || 'running',
        agent_count: body.agentCount || 0,
        service_count: body.serviceCount || 1,
        container_count: body.containerCount || 0,
        metadata: body.metadata || {}
      }
    }

    const trace = distributedTracesDb.create(traceData)

    return NextResponse.json({
      success: true,
      data: {
        ...trace,
        metadata: trace.metadata ? JSON.parse(trace.metadata) : {}
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create distributed trace:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create distributed trace'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/distributed-traces - Update distributed trace
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trace ID is required for updates'
        },
        { status: 400 }
      )
    }

    const updatedTrace = distributedTracesDb.update(id, updateData)

    if (!updatedTrace) {
      return NextResponse.json(
        {
          success: false,
          error: 'Distributed trace not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...updatedTrace,
        metadata: updatedTrace.metadata ? JSON.parse(updatedTrace.metadata) : {}
      }
    })

  } catch (error) {
    console.error('Failed to update distributed trace:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update distributed trace'
      },
      { status: 500 }
    )
  }
}