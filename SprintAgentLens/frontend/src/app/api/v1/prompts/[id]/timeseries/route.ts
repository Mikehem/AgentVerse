import { NextRequest, NextResponse } from 'next/server'
import { 
  VersionTimeSeriesData,
  MetricTimeSeries,
  MetricsAPIResponse,
  MetricType,
  TimeGranularity
} from '@/lib/types/metrics'
import { 
  createTimeRange,
  generateTimeSeries,
  calculateTrend
} from '@/lib/utils/metricsUtils'
import { 
  generateMockExecutions,
  generateMockTimeSeries
} from '@/lib/utils/mockMetricsData'

// GET /api/v1/prompts/[promptId]/timeseries
export async function GET(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const versionId = searchParams.get('versionId')
    const metricType = (searchParams.get('metric') || 'cost') as MetricType
    const granularity = (searchParams.get('granularity') || 'day') as TimeGranularity
    const timeRangePreset = searchParams.get('timeRange') || 'last7d'
    const includeTrends = searchParams.get('includeTrends') !== 'false'
    const includeAnnotations = searchParams.get('includeAnnotations') !== 'false'
    
    // Create time range
    const timeRange = createTimeRange(timeRangePreset)
    
    // If specific version requested, return single version data
    if (versionId) {
      // For now, use mock data - in production, this would query the database
      const executions = generateMockExecutions(1000, versionId, timeRange)
      const timeSeries = generateTimeSeries(executions, metricType, granularity)
      
      const versionTimeSeriesData: VersionTimeSeriesData = {
        promptVersionId: versionId,
        metricType,
        granularity,
        timeRange,
        data: timeSeries
      }
      
      // Calculate trend if requested
      let trend = null
      if (includeTrends) {
        trend = calculateTrend(timeSeries)
      }
      
      // Generate annotations for significant events
      const annotations = []
      if (includeAnnotations) {
        // Find significant changes in the data
        for (let i = 1; i < timeSeries.length; i++) {
          const current = timeSeries[i]
          const previous = timeSeries[i - 1]
          const changePercent = ((current.value - previous.value) / previous.value) * 100
          
          if (Math.abs(changePercent) > 20) {
            annotations.push({
              timestamp: current.timestamp,
              type: changePercent > 0 ? 'spike' : 'drop',
              severity: Math.abs(changePercent) > 50 ? 'critical' : 'warning',
              message: `${Math.abs(changePercent).toFixed(1)}% ${changePercent > 0 ? 'increase' : 'decrease'} detected`,
              value: current.value
            })
          }
        }
      }
      
      const response: MetricsAPIResponse<VersionTimeSeriesData & { trend?: string; annotations?: any[] }> = {
        data: {
          ...versionTimeSeriesData,
          trend,
          annotations
        },
        meta: {
          total: timeSeries.length,
          generatedAt: new Date(),
          cacheHit: false
        }
      }
      
      return NextResponse.json(response)
    }
    
    // If no specific version, return data for all versions
    const versionIds = [
      `${promptId}-v1`,
      `${promptId}-v2`,
      `${promptId}-v3`,
      `${promptId}-v4`
    ]
    
    const allVersionsData = versionIds.map(vId => {
      const timeSeries = generateMockTimeSeries(vId, metricType, 7)
      return {
        promptVersionId: vId,
        metricType,
        granularity,
        timeRange,
        data: timeSeries,
        trend: includeTrends ? calculateTrend(timeSeries) : undefined
      }
    })
    
    const response: MetricsAPIResponse<VersionTimeSeriesData[]> = {
      data: allVersionsData,
      meta: {
        total: allVersionsData.reduce((sum, v) => sum + v.data.length, 0),
        generatedAt: new Date(),
        cacheHit: false
      },
      insights: [
        {
          id: `timeseries-insight-${Date.now()}`,
          type: 'trend',
          severity: 'info',
          title: 'Time Series Analysis',
          description: `Generated ${metricType} trends for ${allVersionsData.length} versions over ${timeRangePreset}`,
          promptId,
          versionIds,
          metricTypes: [metricType],
          timeRange,
          evidence: {
            currentValue: allVersionsData.length,
            trend: 'stable'
          },
          actionable: false,
          confidence: 0.9,
          createdAt: new Date()
        }
      ]
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching time series data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch time series data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/[promptId]/timeseries
// For bulk uploading historical metrics data
export async function POST(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params
    const body = await request.json()
    
    const { versionId, metricType, dataPoints, granularity = 'hour' } = body
    
    if (!versionId || !metricType || !Array.isArray(dataPoints)) {
      return NextResponse.json(
        { error: 'Missing required fields: versionId, metricType, dataPoints' },
        { status: 400 }
      )
    }
    
    // Validate data points structure
    const validDataPoints = dataPoints.every(point => 
      point.timestamp && typeof point.value === 'number'
    )
    
    if (!validDataPoints) {
      return NextResponse.json(
        { error: 'Invalid data points format. Each point must have timestamp and value' },
        { status: 400 }
      )
    }
    
    // In production, this would:
    // 1. Validate and sanitize the data
    // 2. Store in the time series database
    // 3. Update aggregated metrics
    // 4. Trigger alerts if thresholds are crossed
    // 5. Invalidate relevant caches
    
    console.log('Storing time series data:', {
      promptId,
      versionId,
      metricType,
      pointCount: dataPoints.length,
      granularity
    })
    
    // Simulate processing and return success
    const processedPoints = dataPoints.map((point, index) => ({
      id: `point-${Date.now()}-${index}`,
      timestamp: new Date(point.timestamp),
      value: point.value,
      metricType,
      versionId
    }))
    
    return NextResponse.json({
      success: true,
      message: 'Time series data uploaded successfully',
      processed: processedPoints.length,
      summary: {
        avgValue: processedPoints.reduce((sum, p) => sum + p.value, 0) / processedPoints.length,
        minValue: Math.min(...processedPoints.map(p => p.value)),
        maxValue: Math.max(...processedPoints.map(p => p.value)),
        timeSpan: {
          start: processedPoints[0]?.timestamp,
          end: processedPoints[processedPoints.length - 1]?.timestamp
        }
      }
    })
    
  } catch (error) {
    console.error('Error uploading time series data:', error)
    return NextResponse.json(
      { 
        error: 'Failed to upload time series data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}