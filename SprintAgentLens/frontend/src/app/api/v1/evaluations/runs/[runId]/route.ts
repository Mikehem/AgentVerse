import { NextRequest, NextResponse } from 'next/server'
import { evaluationEngine } from '@/lib/evaluation/engine'
import { evaluationRunsDb } from '@/lib/database'

// GET /api/v1/evaluations/runs/[runId] - Get evaluation run details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    
    const run = evaluationRunsDb.getById(runId)
    if (!run) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation run not found'
      }, { status: 404 })
    }
    
    // Get current progress
    const progress = await evaluationEngine.getProgress(runId)
    
    // Get summary if completed
    let summary = null
    if (run.status === 'completed') {
      summary = await evaluationEngine.getEvaluationSummary(runId)
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...run,
        progress: progress || {
          status: run.status,
          totalItems: run.total_items,
          processedItems: run.processed_items
        },
        summary
      }
    })
    
  } catch (error) {
    console.error('Error fetching evaluation run:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch evaluation run'
    }, { status: 500 })
  }
}

// DELETE /api/v1/evaluations/runs/[runId] - Stop/cancel evaluation run
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    
    const run = evaluationRunsDb.getById(runId)
    if (!run) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation run not found'
      }, { status: 404 })
    }
    
    if (run.status === 'completed' || run.status === 'failed') {
      return NextResponse.json({
        success: false,
        error: 'Cannot cancel completed or failed evaluation run'
      }, { status: 400 })
    }
    
    const stopped = await evaluationEngine.stopEvaluation(runId)
    
    if (stopped) {
      return NextResponse.json({
        success: true,
        message: 'Evaluation run stopped successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to stop evaluation run'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error stopping evaluation run:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to stop evaluation run'
    }, { status: 500 })
  }
}