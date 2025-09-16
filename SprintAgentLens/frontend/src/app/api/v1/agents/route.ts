import { NextRequest, NextResponse } from 'next/server'
import { agentDb } from '@/lib/database'
import { agentCreationSchema } from '@/lib/validationSchemas'
import { z } from 'zod'

// GET /api/v1/agents - Get all agents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    let agents
    if (projectId) {
      agents = agentDb.getByProjectId(projectId)
    } else {
      agents = agentDb.getAll()
    }

    return NextResponse.json({
      success: true,
      data: agents
    })
    
  } catch (error) {
    console.error('Failed to fetch agents:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agents'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/agents - Create new agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = agentCreationSchema.parse(body)
    
    // Create agent
    const agent = agentDb.create({
      ...validatedData,
      status: 'active',
      version: '1.0.0',
      createdBy: 'user' // TODO: Replace with actual user ID from authentication
    })

    return NextResponse.json({
      success: true,
      data: agent
    }, { status: 201 })
    
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
    
    console.error('Failed to create agent:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create agent'
      },
      { status: 500 }
    )
  }
}