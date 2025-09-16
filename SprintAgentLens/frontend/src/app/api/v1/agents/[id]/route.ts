import { NextRequest, NextResponse } from 'next/server'
import { agentDb } from '@/lib/database'
import { agentCreationSchema } from '@/lib/validationSchemas'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/agents/[id] - Get agent by ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const agent = agentDb.getById(id)
    
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: agent
    })
    
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agent'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/agents/[id] - Update agent
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate input using partial schema
    const validatedData = agentCreationSchema.partial().parse(body)
    
    // Update agent
    const agent = agentDb.update(id, validatedData)
    
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: agent
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
    
    console.error('Failed to update agent:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update agent'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/agents/[id] - Delete agent
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    
    const success = agentDb.delete(id)
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Agent deleted successfully'
    })
    
  } catch (error) {
    console.error('Failed to delete agent:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete agent'
      },
      { status: 500 }
    )
  }
}