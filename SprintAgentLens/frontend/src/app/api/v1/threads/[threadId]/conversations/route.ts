import { NextRequest, NextResponse } from 'next/server'
import { conversationDb } from '@/lib/database'

export async function GET(request: NextRequest, { params }: { params: { threadId: string } }) {
  try {
    const { threadId } = params
    
    // Get all conversations for this thread, ordered chronologically
    const query = `
      SELECT 
        id, project_id, agent_id, agent_name, input, output, status, 
        response_time, token_usage, cost, thread_id, conversation_index,
        turn_count, is_thread, metadata, feedback, created_at, updated_at
      FROM conversations 
      WHERE thread_id = ? 
      ORDER BY conversation_index ASC, created_at ASC
    `
    const conversations = conversationDb.getAll(query, [threadId])

    if (conversations.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Thread not found'
      }, { status: 404 })
    }

    // Transform conversations
    const transformedConversations = conversations.map((conv: any) => ({
      ...conv,
      metadata: conv.metadata ? JSON.parse(conv.metadata) : null,
      feedback: conv.feedback ? JSON.parse(conv.feedback) : null,
      is_thread: Boolean(conv.is_thread)
    }))

    // Calculate thread summary
    const threadSummary = {
      thread_id: threadId,
      conversation_count: conversations.length,
      total_turns: conversations.reduce((sum: number, conv: any) => sum + (conv.turn_count || 1), 0),
      total_tokens: conversations.reduce((sum: number, conv: any) => sum + (conv.token_usage || 0), 0),
      total_cost: conversations.reduce((sum: number, conv: any) => sum + (conv.cost || 0), 0),
      avg_response_time: conversations.reduce((sum: number, conv: any) => sum + (conv.response_time || 0), 0) / conversations.length,
      first_created_at: conversations[0]?.created_at,
      latest_created_at: conversations[conversations.length - 1]?.created_at,
      agent_name: conversations[0]?.agent_name,
      latest_status: conversations[conversations.length - 1]?.status
    }

    return NextResponse.json({
      success: true,
      data: {
        thread: threadSummary,
        conversations: transformedConversations
      }
    })

  } catch (error) {
    console.error('Error fetching thread conversations:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch thread conversations'
    }, { status: 500 })
  }
}