import { NextRequest, NextResponse } from 'next/server'
import { 
  VersionComparisonMatrix,
  VersionComparison,
  MetricsAPIResponse,
  MetricType
} from '@/lib/types/metrics'
import { 
  compareVersions,
  createTimeRange,
  calculateStatisticalSignificance
} from '@/lib/utils/metricsUtils'
import { 
  generateMockVersionSummaries,
  generateMockComparisonMatrix,
  generateMockExecutions
} from '@/lib/utils/mockMetricsData'

// GET /api/v1/prompts/[promptId]/versions/compare
export async function GET(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const versionIds = searchParams.get('versions')?.split(',') || []
    const metrics = (searchParams.get('metrics')?.split(',') || ['cost', 'performance', 'quality']) as MetricType[]
    const timeRangePreset = searchParams.get('timeRange') || 'last7d'
    const includeStatistics = searchParams.get('includeStatistics') !== 'false'
    
    if (versionIds.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 version IDs are required for comparison' },
        { status: 400 }
      )
    }
    
    // Create time range
    const timeRange = createTimeRange(timeRangePreset)
    
    // For now, use mock data - in production, this would query the database
    const versionSummaries = generateMockVersionSummaries(promptId, versionIds.length)
    
    // Generate pairwise comparisons
    const comparisons: VersionComparison[] = []
    
    for (let i = 0; i < versionSummaries.length; i++) {
      for (let j = i + 1; j < versionSummaries.length; j++) {
        for (const metricType of metrics) {
          const comparison = compareVersions(
            versionSummaries[i],
            versionSummaries[j],
            metricType
          )
          comparisons.push(comparison)
        }
      }
    }
    
    // Generate statistical analysis if requested
    let anovaResults
    if (includeStatistics && metrics.includes('cost')) {
      // Mock ANOVA results for cost comparison
      anovaResults = {
        fStatistic: 2.85,
        pValue: 0.045,
        isSignificant: true
      }
    }
    
    // Create rankings for each metric
    const rankings: VersionComparisonMatrix['rankings'] = {}
    
    for (const metricType of metrics) {
      rankings[metricType] = versionSummaries
        .map((summary, index) => {
          let value: number
          switch (metricType) {
            case 'cost': value = summary.avgCostPerRequest; break
            case 'performance': value = summary.avgLatencyMs; break
            case 'quality': value = summary.avgRating; break
            case 'efficiency': value = summary.costEfficiency; break
            case 'reliability': value = summary.successRate; break
            case 'volume': value = summary.totalRequests; break
            case 'tokens': value = summary.avgTokensPerRequest; break
            default: value = 0
          }
          
          return {
            versionId: summary.promptVersionId,
            rank: 0, // Will be set after sorting
            value
          }
        })
        .sort((a, b) => {
          // For most metrics, lower values are better (cost, latency)
          // For some metrics, higher values are better (quality, efficiency)
          const isLowerBetter = ['cost', 'performance', 'tokens'].includes(metricType)
          return isLowerBetter ? a.value - b.value : b.value - a.value
        })
        .map((item, index) => ({
          ...item,
          rank: index + 1
        }))
    }
    
    const comparisonMatrix: VersionComparisonMatrix = {
      versions: versionIds,
      metrics,
      comparisons,
      anovaResults,
      rankings
    }
    
    // Identify best performing version for each metric
    const bestPerforming: Record<string, string> = {}
    for (const metricType of metrics) {
      const ranking = rankings[metricType]
      if (ranking && ranking.length > 0) {
        bestPerforming[metricType] = ranking[0].versionId
      }
    }
    
    const response: MetricsAPIResponse<VersionComparisonMatrix> = {
      data: comparisonMatrix,
      meta: {
        total: comparisons.length,
        generatedAt: new Date(),
        cacheHit: false
      },
      insights: [
        {
          id: `comparison-insight-${Date.now()}`,
          type: 'comparison',
          severity: 'info',
          title: 'Version Performance Analysis',
          description: `Compared ${versionIds.length} versions across ${metrics.length} metrics`,
          promptId,
          versionIds,
          metricTypes: metrics,
          timeRange,
          evidence: {
            currentValue: comparisons.filter(c => c.isSignificant).length,
            trend: 'stable'
          },
          actionable: true,
          recommendations: [
            'Focus on the best-performing version for each metric',
            'Consider A/B testing the top 2 versions',
            'Monitor performance consistency over time'
          ],
          confidence: 0.85,
          createdAt: new Date()
        }
      ]
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error comparing versions:', error)
    return NextResponse.json(
      { 
        error: 'Failed to compare versions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/[promptId]/versions/compare
// For running statistical A/B test comparisons
export async function POST(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params
    const body = await request.json()
    
    const { versionA, versionB, metricType, testDuration, significanceLevel = 0.05 } = body
    
    if (!versionA || !versionB || !metricType) {
      return NextResponse.json(
        { error: 'Missing required fields: versionA, versionB, metricType' },
        { status: 400 }
      )
    }
    
    // In production, this would:
    // 1. Set up an A/B test configuration
    // 2. Track test progress and collect data
    // 3. Perform statistical analysis when test is complete
    // 4. Generate recommendations based on results
    
    const timeRange = createTimeRange('last7d')
    
    // Generate mock execution data for both versions
    const executionsA = generateMockExecutions(500, versionA, timeRange)
    const executionsB = generateMockExecutions(500, versionB, timeRange)
    
    // Extract metric values for statistical testing
    const getMetricValues = (executions: any[], metric: string) => {
      switch (metric) {
        case 'cost': return executions.map(e => e.totalCost)
        case 'performance': return executions.map(e => e.latencyMs)
        case 'reliability': return executions.map(e => e.success ? 1 : 0)
        default: return executions.map(e => e.totalCost)
      }
    }
    
    const samplesA = getMetricValues(executionsA, metricType)
    const samplesB = getMetricValues(executionsB, metricType)
    
    // Perform statistical test
    const statisticalTest = calculateStatisticalSignificance(samplesA, samplesB)
    
    const meanA = samplesA.reduce((sum, val) => sum + val, 0) / samplesA.length
    const meanB = samplesB.reduce((sum, val) => sum + val, 0) / samplesB.length
    const improvement = ((meanB - meanA) / meanA) * 100
    
    // Determine winner and recommendation
    let winner: 'A' | 'B' | 'inconclusive'
    let recommendation: string
    
    if (!statisticalTest.isSignificant) {
      winner = 'inconclusive'
      recommendation = 'Continue testing - no statistically significant difference detected'
    } else {
      const isBIsWinner = (['cost', 'performance'].includes(metricType) && meanB < meanA) ||
                         (['quality', 'reliability'].includes(metricType) && meanB > meanA)
      winner = isBIsWinner ? 'B' : 'A'
      recommendation = `Version ${winner} shows statistically significant improvement of ${Math.abs(improvement).toFixed(2)}%`
    }
    
    const abTestResult = {
      testId: `test-${Date.now()}`,
      promptId,
      versionA,
      versionB,
      metricType,
      duration: testDuration,
      status: 'completed',
      results: {
        sampleSizeA: samplesA.length,
        sampleSizeB: samplesB.length,
        meanA,
        meanB,
        improvement,
        pValue: statisticalTest.pValue,
        isSignificant: statisticalTest.isSignificant,
        confidenceLevel: statisticalTest.confidenceLevel,
        winner,
        recommendation
      },
      createdAt: new Date(),
      completedAt: new Date()
    }
    
    return NextResponse.json({
      success: true,
      data: abTestResult
    })
    
  } catch (error) {
    console.error('Error running A/B test comparison:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run A/B test comparison',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}