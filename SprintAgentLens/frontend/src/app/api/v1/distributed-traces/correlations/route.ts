import { NextRequest, NextResponse } from 'next/server'
import { distributedSpansDb, a2aCommunicationsDb } from '@/lib/database'
import { TraceCorrelationEngine } from '@/lib/distributed-tracing'

// GET /api/v1/distributed-traces/correlations - Get trace correlations and analysis
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const analysisType = searchParams.get('analysisType') || 'all'
    const sourceAgentId = searchParams.get('sourceAgentId')
    const targetAgentId = searchParams.get('targetAgentId')

    if (!traceId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trace ID is required'
        },
        { status: 400 }
      )
    }

    // Get all spans for the trace
    const spans = distributedSpansDb.getAll(
      'SELECT * FROM distributed_spans WHERE trace_id = ? ORDER BY start_time ASC',
      [traceId]
    )

    if (spans.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No spans found for trace'
        },
        { status: 404 }
      )
    }

    // Get all A2A communications for the trace
    const a2aCommunications = a2aCommunicationsDb.getAll(
      'SELECT * FROM a2a_communications WHERE trace_id = ? ORDER BY start_time ASC',
      [traceId]
    )

    // Transform spans to include parsed JSON fields
    const enrichedSpans = spans.map((span: any) => ({
      ...span,
      tags: span.tags ? JSON.parse(span.tags) : {},
      logs: span.logs ? JSON.parse(span.logs) : []
    }))

    // Transform A2A communications to include parsed JSON fields
    const enrichedA2ACommunications = a2aCommunications.map((comm: any) => ({
      ...comm,
      payload: comm.payload ? JSON.parse(comm.payload) : {},
      response: comm.response ? JSON.parse(comm.response) : {}
    }))

    // Build trace tree
    const traceTree = TraceCorrelationEngine.buildTraceTree(
      enrichedSpans,
      enrichedA2ACommunications
    )

    let result: any = {
      success: true,
      traceId,
      traceTree
    }

    // Perform specific analysis based on type
    if (analysisType === 'all' || analysisType === 'paths') {
      // Find agent paths if source and target specified
      if (sourceAgentId && targetAgentId) {
        result.agentPaths = TraceCorrelationEngine.findAgentPaths(
          traceTree,
          sourceAgentId,
          targetAgentId
        )
      }
    }

    if (analysisType === 'all' || analysisType === 'patterns') {
      // Analyze cross-agent communication patterns
      result.patterns = TraceCorrelationEngine.analyzeCrossAgentPatterns(traceTree)
    }

    if (analysisType === 'all' || analysisType === 'bottlenecks') {
      // Detect bottlenecks and performance issues
      result.bottlenecks = TraceCorrelationEngine.detectBottlenecks(traceTree)
    }

    if (analysisType === 'all' || analysisType === 'dependencies') {
      // Build service dependency graph
      result.serviceDependencies = TraceCorrelationEngine.buildServiceDependencyGraph(traceTree)
    }

    // Calculate overall trace metrics
    const totalSpans = enrichedSpans.length
    const rootSpans = traceTree.length
    const totalA2ACommunications = enrichedA2ACommunications.length
    const totalDuration = Math.max(...traceTree.map(node => node.metrics.totalDuration))
    const totalCost = traceTree.reduce((sum, node) => sum + node.metrics.totalCost, 0)
    const totalTokens = traceTree.reduce((sum, node) => sum + node.metrics.totalTokens, 0)
    const errorCount = traceTree.reduce((sum, node) => sum + node.metrics.errorCount, 0)
    const successRate = totalSpans > 0 ? ((totalSpans - errorCount) / totalSpans) * 100 : 100

    const uniqueAgents = new Set(enrichedSpans.map(s => s.agent_id).filter(Boolean))
    const uniqueServices = new Set(enrichedSpans.map(s => s.service_name))
    const uniqueContainers = new Set(enrichedSpans.map(s => s.container_id).filter(Boolean))

    result.metrics = {
      totalSpans,
      rootSpans,
      totalA2ACommunications,
      totalDuration,
      totalCost,
      totalTokens,
      errorCount,
      successRate,
      uniqueAgents: uniqueAgents.size,
      uniqueServices: uniqueServices.size,
      uniqueContainers: uniqueContainers.size,
      avgSpanDuration: totalSpans > 0 ? enrichedSpans.reduce((sum, s) => sum + (s.duration || 0), 0) / totalSpans : 0,
      traceDepth: Math.max(...traceTree.map(node => this.getMaxDepth(node)))
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Failed to analyze trace correlations:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze trace correlations'
      },
      { status: 500 }
    )
  }
}

// Helper function to calculate maximum depth in trace tree
function getMaxDepth(node: any): number {
  if (node.children.length === 0) {
    return node.depth
  }
  return Math.max(...node.children.map((child: any) => getMaxDepth(child)))
}

// POST /api/v1/distributed-traces/correlations - Create trace correlation analysis job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { traceIds, analysisTypes = ['all'], filters = {} } = body

    if (!traceIds || !Array.isArray(traceIds) || traceIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Trace IDs array is required'
        },
        { status: 400 }
      )
    }

    const results = []

    for (const traceId of traceIds) {
      try {
        // Get spans and communications for this trace
        let spanQuery = 'SELECT * FROM distributed_spans WHERE trace_id = ?'
        const spanParams = [traceId]

        // Apply filters
        if (filters.agentId) {
          spanQuery += ' AND agent_id = ?'
          spanParams.push(filters.agentId)
        }

        if (filters.serviceName) {
          spanQuery += ' AND service_name = ?'
          spanParams.push(filters.serviceName)
        }

        if (filters.status) {
          spanQuery += ' AND status = ?'
          spanParams.push(filters.status)
        }

        if (filters.startTime) {
          spanQuery += ' AND start_time >= ?'
          spanParams.push(filters.startTime)
        }

        if (filters.endTime) {
          spanQuery += ' AND start_time <= ?'
          spanParams.push(filters.endTime)
        }

        spanQuery += ' ORDER BY start_time ASC'

        const spans = distributedSpansDb.getAll(spanQuery, spanParams)
        const a2aCommunications = a2aCommunicationsDb.getAll(
          'SELECT * FROM a2a_communications WHERE trace_id = ? ORDER BY start_time ASC',
          [traceId]
        )

        if (spans.length === 0) {
          continue
        }

        // Transform data
        const enrichedSpans = spans.map((span: any) => ({
          ...span,
          tags: span.tags ? JSON.parse(span.tags) : {},
          logs: span.logs ? JSON.parse(span.logs) : []
        }))

        const enrichedA2ACommunications = a2aCommunications.map((comm: any) => ({
          ...comm,
          payload: comm.payload ? JSON.parse(comm.payload) : {},
          response: comm.response ? JSON.parse(comm.response) : {}
        }))

        // Build trace tree
        const traceTree = TraceCorrelationEngine.buildTraceTree(
          enrichedSpans,
          enrichedA2ACommunications
        )

        const traceResult: any = {
          traceId,
          spanCount: enrichedSpans.length,
          a2aCount: enrichedA2ACommunications.length
        }

        // Perform requested analyses
        for (const analysisType of analysisTypes) {
          switch (analysisType) {
            case 'patterns':
              traceResult.patterns = TraceCorrelationEngine.analyzeCrossAgentPatterns(traceTree)
              break
            case 'bottlenecks':
              traceResult.bottlenecks = TraceCorrelationEngine.detectBottlenecks(traceTree)
              break
            case 'dependencies':
              traceResult.serviceDependencies = TraceCorrelationEngine.buildServiceDependencyGraph(traceTree)
              break
            case 'all':
              traceResult.patterns = TraceCorrelationEngine.analyzeCrossAgentPatterns(traceTree)
              traceResult.bottlenecks = TraceCorrelationEngine.detectBottlenecks(traceTree)
              traceResult.serviceDependencies = TraceCorrelationEngine.buildServiceDependencyGraph(traceTree)
              break
          }
        }

        results.push(traceResult)

      } catch (traceError) {
        console.error(`Failed to analyze trace ${traceId}:`, traceError)
        results.push({
          traceId,
          error: `Failed to analyze trace: ${traceError instanceof Error ? traceError.message : 'Unknown error'}`
        })
      }
    }

    // Calculate aggregate metrics across all traces
    const aggregateMetrics = {
      totalTraces: results.length,
      totalSpans: results.reduce((sum, r) => sum + (r.spanCount || 0), 0),
      totalA2ACommunications: results.reduce((sum, r) => sum + (r.a2aCount || 0), 0),
      uniqueAgents: new Set(results.flatMap(r => 
        r.patterns?.agentInteractions ? Array.from(r.patterns.agentInteractions.keys()) : []
      )).size,
      crossContainerCommunications: results.reduce((sum, r) => 
        sum + (r.patterns?.crossContainerCommunications?.length || 0), 0
      ),
      totalBottlenecks: results.reduce((sum, r) => 
        sum + (r.bottlenecks?.slowestSpans?.length || 0) + 
            (r.bottlenecks?.highCostSpans?.length || 0) + 
            (r.bottlenecks?.errorPaths?.length || 0), 0
      )
    }

    return NextResponse.json({
      success: true,
      results,
      aggregateMetrics,
      analysisTypes,
      filters
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create correlation analysis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create correlation analysis'
      },
      { status: 500 }
    )
  }
}