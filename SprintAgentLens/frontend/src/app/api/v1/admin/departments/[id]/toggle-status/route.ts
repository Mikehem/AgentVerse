import { NextRequest, NextResponse } from 'next/server'
import { departmentDb } from '@/lib/database'

interface RouteParams {
  params: {
    id: string
  }
}

// PATCH /api/v1/admin/departments/[id]/toggle-status - Toggle department status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const department = departmentDb.toggleStatus(id)
    
    if (!department) {
      return NextResponse.json(
        {
          success: false,
          error: 'Department not found'
        },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: department
    })
    
  } catch (error) {
    console.error('Failed to toggle department status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle department status'
      },
      { status: 500 }
    )
  }
}