import { NextRequest, NextResponse } from 'next/server'
import { tracesDb } from '@/lib/database'

// GET /api/v1/traces - Get traces for public API access
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = 'SELECT * FROM traces WHERE 1=1'
    const params: any[] = []

    if (projectId) {
      query += ' AND project_id = ?'
      params.push(projectId)
    }

    query += ' ORDER BY start_time DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const traces = tracesDb.getAll(query, params)

    // Transform traces for API response
    const transformedTraces = traces.map(trace => ({
      id: trace.id,
      project_id: trace.project_id,
      agent_id: trace.agent_id,
      name: trace.operation_name || trace.name,
      start_time: trace.start_time,
      end_time: trace.end_time,
      duration: trace.duration,
      status: trace.status,
      error_message: trace.error_message,
      input_data: trace.input_data ? JSON.parse(trace.input_data) : null,
      output_data: trace.output_data ? JSON.parse(trace.output_data) : null,
      metadata: trace.metadata ? JSON.parse(trace.metadata) : {},
      tags: trace.tags ? JSON.parse(trace.tags) : {},
      total_cost: trace.total_cost || 0,
      total_tokens: trace.total_tokens || 0,
      prompt_tokens: trace.prompt_tokens || 0,
      completion_tokens: trace.completion_tokens || 0,
      model_name: trace.model_name,
      provider: trace.provider,
      created_at: trace.created_at,
      updated_at: trace.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedTraces,
      pagination: {
        limit,
        offset,
        total: traces.length
      }
    })

  } catch (error) {
    console.error('Failed to fetch traces:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch traces'
      },
      { status: 500 }
    )
  }
}