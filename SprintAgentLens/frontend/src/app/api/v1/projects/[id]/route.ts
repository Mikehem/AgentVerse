import { NextRequest, NextResponse } from 'next/server'
import { projectDb } from '@/lib/database'
import { projectCreationSchema } from '@/lib/validationSchemas'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/projects/[id] - Get project by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const project = projectDb.getById(id)
    
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: project
    })
    
  } catch (error) {
    console.error('Failed to fetch project:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch project'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/projects/[id] - Update project
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate input
    const validatedData = projectCreationSchema.partial().parse(body)
    
    // Update project
    const project = projectDb.update(id, validatedData)
    
    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: project
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
    
    console.error('Failed to update project:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update project'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/projects/[id] - Delete project
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const success = projectDb.delete(id)
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Project not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })
    
  } catch (error) {
    console.error('Failed to delete project:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete project'
      },
      { status: 500 }
    )
  }
}