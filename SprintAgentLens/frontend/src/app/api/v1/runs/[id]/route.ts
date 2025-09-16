import { NextRequest, NextResponse } from 'next/server'
import { runDb } from '@/lib/database'

// GET /api/v1/runs/[id] - Get single run
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const run = runDb.getById(params.id)

    if (!run) {
      return NextResponse.json(
        {
          success: false,
          error: 'Run not found'
        },
        { status: 404 }
      )
    }

    // Transform to parse JSON fields
    const transformedRun = {
      ...run,
      tags: run.tags ? JSON.parse(run.tags) : [],
      metadata: run.metadata ? JSON.parse(run.metadata) : {}
    }

    return NextResponse.json({
      success: true,
      data: transformedRun
    })

  } catch (error) {
    console.error('Failed to fetch run:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch run'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/runs/[id] - Delete run
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const success = runDb.delete(params.id)

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Run not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Run deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete run:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete run'
      },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/runs/[id]/complete - Complete a run
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, ...data } = body

    let updatedRun;

    switch (action) {
      case 'complete':
        updatedRun = runDb.complete(params.id, data)
        break
      case 'fail':
        updatedRun = runDb.fail(params.id, data.errorMessage || 'Run failed')
        break
      default:
        // Regular update
        updatedRun = runDb.update(params.id, data)
    }

    if (!updatedRun) {
      return NextResponse.json(
        {
          success: false,
          error: 'Run not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: updatedRun
    })

  } catch (error) {
    console.error('Failed to update run:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update run'
      },
      { status: 500 }
    )
  }
}