import { NextRequest, NextResponse } from 'next/server'
import { conversationDb } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const status = searchParams.get('status')

    // Build WHERE clause for filtering
    const whereConditions = ['thread_id IS NOT NULL']
    const params: any[] = []

    if (projectId) {
      whereConditions.push('project_id = ?')
      params.push(projectId)
    }

    if (agentId) {
      whereConditions.push('agent_id = ?')
      params.push(agentId)
    }

    if (status) {
      whereConditions.push('status = ?')
      params.push(status)
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : ''

    // Get threads with conversation counts and latest conversation data
    const threadsQuery = `
      SELECT 
        thread_id,
        COUNT(*) as conversation_count,
        MAX(created_at) as latest_created_at,
        MIN(created_at) as first_created_at,
        SUM(turn_count) as total_turns,
        AVG(response_time) as avg_response_time,
        SUM(token_usage) as total_tokens,
        SUM(cost) as total_cost,
        -- Get the latest conversation data
        (SELECT id FROM conversations c2 WHERE c2.thread_id = c1.thread_id ORDER BY c2.created_at DESC LIMIT 1) as latest_conversation_id,
        (SELECT agent_name FROM conversations c3 WHERE c3.thread_id = c1.thread_id ORDER BY c3.created_at DESC LIMIT 1) as agent_name,
        (SELECT input FROM conversations c4 WHERE c4.thread_id = c1.thread_id ORDER BY c4.created_at ASC LIMIT 1) as first_input,
        (SELECT output FROM conversations c5 WHERE c5.thread_id = c1.thread_id ORDER BY c5.created_at DESC LIMIT 1) as latest_output,
        (SELECT status FROM conversations c6 WHERE c6.thread_id = c1.thread_id ORDER BY c6.created_at DESC LIMIT 1) as latest_status,
        (SELECT feedback FROM conversations c7 WHERE c7.thread_id = c1.thread_id AND feedback IS NOT NULL ORDER BY c7.created_at DESC LIMIT 1) as latest_feedback
      FROM conversations c1 
      ${whereClause}
      GROUP BY thread_id 
      ORDER BY latest_created_at DESC 
      LIMIT ? OFFSET ?
    `

    const threads = conversationDb.getAll(threadsQuery, [...params, limit, offset])

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT thread_id) as total 
      FROM conversations 
      ${whereClause}
    `
    const countResult = conversationDb.getAll(countQuery, params) as { total: number }[]
    const total = countResult[0]?.total || 0

    // Transform threads data
    const transformedThreads = threads.map((thread: any) => ({
      thread_id: thread.thread_id,
      conversation_count: thread.conversation_count,
      total_turns: thread.total_turns,
      first_created_at: thread.first_created_at,
      latest_created_at: thread.latest_created_at,
      avg_response_time: Math.round(thread.avg_response_time || 0),
      total_tokens: thread.total_tokens || 0,
      total_cost: thread.total_cost || 0,
      latest_conversation_id: thread.latest_conversation_id,
      agent_name: thread.agent_name,
      first_input: thread.first_input,
      latest_output: thread.latest_output,
      latest_status: thread.latest_status,
      latest_feedback: thread.latest_feedback ? JSON.parse(thread.latest_feedback) : null
    }))

    return NextResponse.json({
      success: true,
      data: transformedThreads,
      pagination: {
        limit,
        offset,
        total,
        hasNext: offset + limit < total,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Error fetching threads:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch threads'
    }, { status: 500 })
  }
}