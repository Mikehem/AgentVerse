import { NextRequest, NextResponse } from 'next/server'
import { createSeedData, clearSeedData } from '@/lib/seedData'

// POST /api/v1/seed - Create seed data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, agentId, action } = body

    if (!projectId || !agentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'projectId and agentId are required'
        },
        { status: 400 }
      )
    }

    if (action === 'clear') {
      await clearSeedData(projectId)
      return NextResponse.json({
        success: true,
        message: 'Seed data cleared successfully'
      })
    } else {
      const stats = await createSeedData(projectId, agentId)
      return NextResponse.json({
        success: true,
        message: 'Seed data created successfully',
        data: stats
      })
    }

  } catch (error) {
    console.error('Failed to manage seed data:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to manage seed data'
      },
      { status: 500 }
    )
  }
}