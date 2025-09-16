import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { feedbackScoresDb } from '@/lib/database'

// Feedback Score Schema based on Opik backend structure
const feedbackScoreSchema = z.object({
  id: z.string().optional(),
  traceId: z.string(),
  name: z.string().min(1, "Score name is required"),
  categoryName: z.string().optional(),
  value: z.number().min(0).max(10, "Score must be between 0 and 10"),
  reason: z.string().optional(),
  source: z.enum(['ui', 'sdk', 'online_scoring']).default('ui'),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  lastUpdatedAt: z.string().optional()
})

const feedbackScoreBatchSchema = z.array(feedbackScoreSchema)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceId = searchParams.get('traceId')
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let scores = []

    if (traceId) {
      // Get scores for specific trace
      scores = feedbackScoresDb.findMany({
        where: { trace_id: traceId },
        limit,
        offset
      })
    } else if (projectId) {
      // Get scores for project (join with traces table)
      scores = feedbackScoresDb.query(`
        SELECT fs.*, t.project_id 
        FROM feedback_scores fs
        JOIN traces t ON fs.trace_id = t.id
        WHERE t.project_id = ?
        ORDER BY fs.created_at DESC
        LIMIT ? OFFSET ?
      `, [projectId, limit, offset])
    } else {
      // Get all scores
      scores = feedbackScoresDb.findMany({
        limit,
        offset,
        orderBy: { created_at: 'desc' }
      })
    }

    // Transform to match frontend expectations
    const transformedScores = scores.map(score => ({
      id: score.id,
      traceId: score.trace_id,
      name: score.name,
      categoryName: score.category_name,
      value: score.value,
      reason: score.reason,
      source: score.source,
      createdBy: score.created_by,
      createdAt: score.created_at,
      lastUpdatedAt: score.last_updated_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedScores,
      total: transformedScores.length,
      page: Math.floor(offset / limit) + 1,
      limit
    })

  } catch (error) {
    console.error('Failed to fetch feedback scores:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch feedback scores'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Feedback Scores POST - received body:', JSON.stringify(body, null, 2))

    // Handle both single score and batch
    const isArray = Array.isArray(body)
    const scores = isArray ? body : [body]

    // Validate scores
    const validatedScores = feedbackScoreBatchSchema.parse(scores)

    // Process scores
    const createdScores = validatedScores.map(score => {
      const scoreData = {
        id: score.id || `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        trace_id: score.traceId,
        name: score.name,
        category_name: score.categoryName || null,
        value: score.value,
        reason: score.reason || null,
        source: score.source,
        created_by: score.createdBy || 'system',
        created_at: score.createdAt || new Date().toISOString(),
        last_updated_at: score.lastUpdatedAt || new Date().toISOString()
      }

      return feedbackScoresDb.create(scoreData)
    })

    // Transform response
    const transformedScores = createdScores.map(score => ({
      id: score.id,
      traceId: score.trace_id,
      name: score.name,
      categoryName: score.category_name,
      value: score.value,
      reason: score.reason,
      source: score.source,
      createdBy: score.created_by,
      createdAt: score.created_at,
      lastUpdatedAt: score.last_updated_at
    }))

    return NextResponse.json({
      success: true,
      data: isArray ? transformedScores : transformedScores[0],
      message: `Successfully created ${transformedScores.length} feedback score(s)`
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create feedback scores:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create feedback scores'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Score ID is required for updates'
      }, { status: 400 })
    }

    const updatedScore = feedbackScoresDb.update(id, {
      ...updateData,
      last_updated_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: updatedScore,
      message: 'Feedback score updated successfully'
    })

  } catch (error) {
    console.error('Failed to update feedback score:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update feedback score'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Score ID is required for deletion'
      }, { status: 400 })
    }

    feedbackScoresDb.delete(id)

    return NextResponse.json({
      success: true,
      message: 'Feedback score deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete feedback score:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete feedback score'
    }, { status: 500 })
  }
}