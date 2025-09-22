import { NextRequest, NextResponse } from 'next/server'
import { 
  RealtimeMetrics,
  MetricsAPIResponse
} from '@/lib/types/metrics'
import { generateMockRealtimeMetrics } from '@/lib/utils/mockMetricsData'

// GET /api/v1/prompts/[promptId]/realtime
export async function GET(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params
    const { searchParams } = new URL(request.url)
    
    const versionId = searchParams.get('versionId')
    const includeHistory = searchParams.get('includeHistory') !== 'false'
    
    // For now, use mock data - in production, this would query real-time data
    const realtimeMetrics = generateMockRealtimeMetrics(promptId)
    
    // If specific version requested, filter data
    if (versionId) {
      realtimeMetrics.versionId = versionId
      // Filter recent executions for this version only
      realtimeMetrics.recentExecutions = realtimeMetrics.recentExecutions.filter(
        execution => execution.executionId.includes(versionId)
      )
    }
    
    const response: MetricsAPIResponse<RealtimeMetrics> = {
      data: realtimeMetrics,
      meta: {
        generatedAt: new Date(),
        cacheHit: false
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching real-time metrics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch real-time metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/[promptId]/realtime
// For real-time metrics updates (webhook endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: { promptId: string } }
) {
  try {
    const { promptId } = params
    const body = await request.json()
    
    const { type, data, timestamp } = body
    
    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type and data' },
        { status: 400 }
      )
    }
    
    // Handle different types of real-time updates
    switch (type) {
      case 'execution_completed':
        await handleExecutionUpdate(promptId, data)
        break
      case 'feedback_received':
        await handleFeedbackUpdate(promptId, data)
        break
      case 'alert_triggered':
        await handleAlertUpdate(promptId, data)
        break
      default:
        console.warn('Unknown real-time update type:', type)
    }
    
    // In production, this would:
    // 1. Update real-time aggregations
    // 2. Broadcast to connected WebSocket clients
    // 3. Check alert conditions
    // 4. Update dashboards
    
    return NextResponse.json({
      success: true,
      message: 'Real-time update processed',
      type,
      promptId,
      processedAt: new Date()
    })
    
  } catch (error) {
    console.error('Error processing real-time update:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process real-time update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Helper functions for processing different update types
async function handleExecutionUpdate(promptId: string, executionData: any) {
  console.log('Processing execution update:', {
    promptId,
    executionId: executionData.id,
    success: executionData.success,
    latency: executionData.latencyMs,
    cost: executionData.totalCost
  })
  
  // In production, this would:
  // 1. Update real-time metrics aggregations
  // 2. Check if this execution triggers any alerts
  // 3. Update the recent executions buffer
  // 4. Broadcast to WebSocket subscribers
}

async function handleFeedbackUpdate(promptId: string, feedbackData: any) {
  console.log('Processing feedback update:', {
    promptId,
    feedbackId: feedbackData.id,
    rating: feedbackData.rating,
    executionId: feedbackData.promptExecutionId
  })
  
  // In production, this would:
  // 1. Update quality metrics
  // 2. Recalculate average ratings
  // 3. Check for quality alerts
  // 4. Update sentiment analysis
}

async function handleAlertUpdate(promptId: string, alertData: any) {
  console.log('Processing alert update:', {
    promptId,
    alertType: alertData.type,
    severity: alertData.severity,
    message: alertData.message
  })
  
  // In production, this would:
  // 1. Store the alert
  // 2. Send notifications
  // 3. Update alert status
  // 4. Broadcast to monitoring dashboards
}