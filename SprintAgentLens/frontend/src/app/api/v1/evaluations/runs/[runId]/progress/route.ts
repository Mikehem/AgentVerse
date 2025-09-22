import { NextRequest, NextResponse } from 'next/server'
import { evaluationEngine } from '@/lib/evaluation/engine'

// GET /api/v1/evaluations/runs/[runId]/progress - Get real-time progress
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    const { runId } = await params
    
    const progress = await evaluationEngine.getProgress(runId)
    
    if (!progress) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation run not found'
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      data: progress
    })
    
  } catch (error) {
    console.error('Error fetching evaluation progress:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch evaluation progress'
    }, { status: 500 })
  }
}