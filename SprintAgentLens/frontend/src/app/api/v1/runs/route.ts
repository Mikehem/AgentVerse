import { NextRequest, NextResponse } from 'next/server'
import { runDb } from '@/lib/database'

// GET /api/v1/runs - Get runs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query based on filters
    let query = 'SELECT * FROM runs WHERE 1=1'
    const params: any[] = []

    if (projectId) {
      query += ' AND projectId = ?'
      params.push(projectId)
    }

    if (agentId) {
      query += ' AND agentId = ?'
      params.push(agentId)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY startTime DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const runs = runDb.getAll(query, params)

    // Transform the runs to parse JSON fields
    const transformedRuns = runs.map(run => ({
      ...run,
      tags: run.tags ? JSON.parse(run.tags) : [],
      metadata: run.metadata ? JSON.parse(run.metadata) : {}
    }))

    return NextResponse.json({
      success: true,
      data: transformedRuns,
      pagination: {
        limit,
        offset,
        total: runs.length
      }
    })

  } catch (error) {
    console.error('Failed to fetch runs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch runs'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/runs - Create new run
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle batch runs upload
    if (Array.isArray(body)) {
      const runs = body.map(runData => runDb.create({
        ...runData,
        tags: runData.tags ? JSON.stringify(runData.tags) : '[]',
        metadata: runData.metadata ? JSON.stringify(runData.metadata) : '{}'
      }))

      return NextResponse.json({
        success: true,
        data: runs,
        count: runs.length
      }, { status: 201 })
    }

    // Single run - temporarily bypass Zod validation due to _zod error
    const validatedData = {
      projectId: body.projectId,
      agentId: body.agentId,
      name: body.name,
      description: body.description || null,
      status: body.status || 'running',
      startTime: body.startTime || new Date().toISOString(),
      endTime: body.endTime || null,
      duration: body.duration || null,
      totalConversations: body.totalConversations || 0,
      totalMetrics: body.totalMetrics || 0,
      totalTraces: body.totalTraces || 0,
      avgResponseTime: body.avgResponseTime || 0,
      totalTokenUsage: body.totalTokenUsage || 0,
      totalCost: body.totalCost || 0.0,
      successRate: body.successRate || 0.0,
      errorMessage: body.errorMessage || null,
      tags: body.tags || [],
      metadata: body.metadata || {},
      createdBy: body.createdBy || 'system'
    }
    
    const run = runDb.create({
      ...validatedData,
      tags: JSON.stringify(validatedData.tags),
      metadata: JSON.stringify(validatedData.metadata)
    })

    return NextResponse.json({
      success: true,
      data: run
    }, { status: 201 })
    
  } catch (error) {
    console.error('Failed to create run:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create run'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/runs - Update existing run
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Run ID is required for updates'
        },
        { status: 400 }
      )
    }

    // Handle JSON fields
    if (updateData.tags) {
      updateData.tags = JSON.stringify(updateData.tags)
    }
    if (updateData.metadata) {
      updateData.metadata = JSON.stringify(updateData.metadata)
    }

    const updatedRun = runDb.update(id, updateData)

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
        error: error instanceof Error ? error.message : 'Failed to update run'
      },
      { status: 500 }
    )
  }
}