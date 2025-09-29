import { NextRequest, NextResponse } from 'next/server'
import { conversationSessionsDb, spansDb } from '@/lib/database'
import { z } from 'zod'

// Validation schema for conversation session creation
const conversationSessionSchema = z.object({
  project_id: z.string().min(1, 'Project ID is required'),
  agent_id: z.string().min(1, 'Agent ID is required'),
  session_id: z.string().min(1, 'Session ID is required'),
  thread_id: z.string().optional(),
  user_id: z.string().optional(),
  session_name: z.string().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).default('active'),
  metadata: z.record(z.any()).optional(),
  tags: z.array(z.string()).optional(),
})

// GET /api/v1/conversation-sessions - Get conversation sessions with conversation spans
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId') || searchParams.get('project_id')
    const agentId = searchParams.get('agentId') || searchParams.get('agent_id')
    const sessionId = searchParams.get('sessionId') || searchParams.get('session_id')
    const threadId = searchParams.get('threadId') || searchParams.get('thread_id')
    const status = searchParams.get('status')
    const includeSpans = searchParams.get('includeSpans') === 'true'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query for conversation sessions
    let query = 'SELECT * FROM conversation_sessions WHERE 1=1'
    const params: any[] = []

    if (projectId) {
      query += ' AND project_id = ?'
      params.push(projectId)
    }

    if (agentId) {
      query += ' AND agent_id = ?'
      params.push(agentId)
    }

    if (sessionId) {
      query += ' AND session_id = ?'
      params.push(sessionId)
    }

    if (threadId) {
      query += ' AND thread_id = ?'
      params.push(threadId)
    }

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const sessions = conversationSessionsDb.getAll(query, params)

    // If includeSpans is true, enrich with conversation spans
    let enrichedSessions = sessions
    if (includeSpans && sessions.length > 0) {
      enrichedSessions = sessions.map(session => {
        const conversationSpans = conversationSessionsDb.getConversationSpans(session.id)
        
        // Transform spans to include proper conversation context
        const formattedSpans = conversationSpans.map(span => ({
          ...span,
          input_data: span.input_data ? JSON.parse(span.input_data) : null,
          output_data: span.output_data ? JSON.parse(span.output_data) : null,
          metadata: span.metadata ? JSON.parse(span.metadata) : {},
          tags: span.tags ? JSON.parse(span.tags) : [],
          conversation_context: span.conversation_context ? JSON.parse(span.conversation_context) : {}
        }))

        return {
          ...session,
          conversation_spans: formattedSpans,
          total_conversation_spans: formattedSpans.length,
          metadata: session.metadata ? JSON.parse(session.metadata) : {},
          tags: session.tags ? JSON.parse(session.tags) : []
        }
      })
    } else {
      // Parse JSON fields for sessions without spans
      enrichedSessions = sessions.map(session => ({
        ...session,
        metadata: session.metadata ? JSON.parse(session.metadata) : {},
        tags: session.tags ? JSON.parse(session.tags) : []
      }))
    }

    return NextResponse.json({
      success: true,
      data: enrichedSessions,
      meta: {
        total: sessions.length,
        limit,
        offset,
        includeSpans
      }
    })

  } catch (error) {
    console.error('Failed to fetch conversation sessions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conversation sessions'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/conversation-sessions - Create new conversation session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Creating conversation session:', JSON.stringify(body, null, 2))
    
    // Validate the session data
    const validatedData = conversationSessionSchema.parse(body)
    
    // Create the conversation session
    const session = conversationSessionsDb.create({
      ...validatedData,
      tags: validatedData.tags ? JSON.stringify(validatedData.tags) : null,
      metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null
    })

    // Parse JSON fields for response
    const responseSession = {
      ...session,
      metadata: session.metadata ? JSON.parse(session.metadata) : {},
      tags: session.tags ? JSON.parse(session.tags) : []
    }

    console.log(`✅ Conversation session created: ${session.id}`)

    return NextResponse.json({
      success: true,
      data: responseSession
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
    
    console.error('Failed to create conversation session:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create conversation session'
      },
      { status: 500 }
    )
  }
}