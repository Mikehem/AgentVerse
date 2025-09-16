import { NextRequest, NextResponse } from 'next/server'
import { departmentDb } from '@/lib/database'
import { departmentSchema } from '@/lib/validationSchemas'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/v1/admin/departments/[id] - Get department by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const department = departmentDb.getById(id)
    
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
    console.error('Failed to fetch department:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch department'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/admin/departments/[id] - Update department
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate input
    const validatedData = departmentSchema.partial().parse(body)
    
    // Update department
    const department = departmentDb.update(id, validatedData)
    
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    console.error('Failed to update department:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update department'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/admin/departments/[id] - Delete department
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const success = departmentDb.delete(id)
    
    if (!success) {
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
      message: 'Department deleted successfully'
    })
    
  } catch (error) {
    console.error('Failed to delete department:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete department'
      },
      { status: 500 }
    )
  }
}