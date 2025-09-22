import { NextRequest, NextResponse } from 'next/server'
import { 
  PromptOverviewMetrics, 
  PromptVersionMetricsSummary,
  MetricsFilter,
  MetricsAPIResponse,
  TimeRange
} from '@/lib/types/metrics'
import { 
  createTimeRange,
  aggregateExecutionMetrics,
  generateCostInsight,
  generatePerformanceInsight
} from '@/lib/utils/metricsUtils'
import { 
  generateMockPromptOverview,
  generateMockVersionSummaries,
  generateMockExecutions
} from '@/lib/utils/mockMetricsData'

// GET /api/v1/prompts/[promptId]/metrics
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const { id: promptId } = resolvedParams
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const timeRangePreset = searchParams.get('timeRange') || 'last7d'
    const granularity = searchParams.get('granularity') || 'day'
    const metricTypes = searchParams.get('metrics')?.split(',') || ['cost', 'performance', 'quality', 'volume']
    const includeInsights = searchParams.get('includeInsights') !== 'false'
    const includeComparisons = searchParams.get('includeComparisons') !== 'false'
    
    // Create time range
    const timeRange = createTimeRange(timeRangePreset)
    
    // For now, use mock data - in production, this would query the database
    const overview = generateMockPromptOverview(promptId)
    
    // Add generated insights if requested
    if (includeInsights) {
      const versionSummaries = overview.versions.map(v => v.summary)
      
      // Generate insights from current vs previous period
      const insights = []
      for (let i = 1; i < versionSummaries.length; i++) {
        const costInsight = generateCostInsight(versionSummaries[i], versionSummaries[i-1])
        const perfInsight = generatePerformanceInsight(versionSummaries[i], versionSummaries[i-1])
        
        if (costInsight) insights.push(costInsight)
        if (perfInsight) insights.push(perfInsight)
      }
      
      overview.insights.push(...insights)
    }
    
    const response: MetricsAPIResponse<PromptOverviewMetrics> = {
      data: overview,
      meta: {
        generatedAt: new Date(),
        cacheHit: false
      },
      insights: overview.insights,
      warnings: []
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching prompt metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch prompt metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/[promptId]/metrics
// For recording new execution metrics
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const { id: promptId } = resolvedParams
    const executionMetrics = await request.json()
    
    // Validate the execution metrics structure
    if (!executionMetrics.promptVersionId || !executionMetrics.conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields: promptVersionId and conversationId' },
        { status: 400 }
      )
    }
    
    // In production, this would:
    // 1. Store the execution metrics in the database
    // 2. Update real-time aggregations
    // 3. Check for alert conditions
    // 4. Trigger webhooks if needed
    
    // For now, simulate storing the data
    console.log('Recording execution metrics:', {
      promptId,
      versionId: executionMetrics.promptVersionId,
      cost: executionMetrics.totalCost,
      latency: executionMetrics.latencyMs,
      success: executionMetrics.success
    })
    
    // Return success response
    return NextResponse.json({
      success: true,
      id: `exec-${Date.now()}`,
      message: 'Execution metrics recorded successfully'
    })
    
  } catch (error) {
    console.error('Error recording execution metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to record execution metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}