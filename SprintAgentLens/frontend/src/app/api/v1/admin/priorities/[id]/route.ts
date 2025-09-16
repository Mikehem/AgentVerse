import { NextRequest, NextResponse } from 'next/server'
import { businessPriorityDb } from '@/lib/database'
import { businessPrioritySchema } from '@/lib/validationSchemas'
import { z } from 'zod'

interface RouteParams {
  params: {
    id: string
  }
}

// GET /api/v1/admin/priorities/[id] - Get priority by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const priority = businessPriorityDb.getById(id)
    
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
    console.error('Failed to fetch priority:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch priority'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/admin/priorities/[id] - Update priority
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate input
    const validatedData = businessPrioritySchema.partial().parse(body)
    
    // Update priority
    const priority = businessPriorityDb.update(id, validatedData)
    
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
    
    console.error('Failed to update priority:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update priority'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/admin/priorities/[id] - Delete priority
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const success = businessPriorityDb.delete(id)
    
    if (!success) {
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
      message: 'Priority deleted successfully'
    })
    
  } catch (error) {
    console.error('Failed to delete priority:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete priority'
      },
      { status: 500 }
    )
  }
}