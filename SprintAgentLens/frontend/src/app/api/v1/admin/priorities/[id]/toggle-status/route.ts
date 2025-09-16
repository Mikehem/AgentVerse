import { NextRequest, NextResponse } from 'next/server'
import { businessPriorityDb } from '@/lib/database'

interface RouteParams {
  params: {
    id: string
  }
}

// PATCH /api/v1/admin/priorities/[id]/toggle-status - Toggle priority status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const priority = businessPriorityDb.toggleStatus(id)
    
    if (!priority) {
      return NextResponse.json(
        {
          success: false,
          error: 'Priority not found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: priority
    })
    
  } catch (error) {
    console.error('Failed to toggle priority status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle priority status'
      },
      { status: 500 }
    )
  }
}