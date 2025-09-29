import { NextRequest, NextResponse } from 'next/server'
import { conversationSessionsDb, spansDb } from '@/lib/database'

// GET /api/v1/conversation-sessions/[sessionId] - Get specific conversation session with spans
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const { searchParams } = new URL(request.url)
    const includeSpans = searchParams.get('includeSpans') === 'true'

    // Get the conversation session
    const session = conversationSessionsDb.getById(sessionId)
    
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation session not found'
        },
        { status: 404 }
      )
    }

    let enrichedSession = {
      ...session,
      metadata: session.metadata ? JSON.parse(session.metadata) : {},
      tags: session.tags ? JSON.parse(session.tags) : []
    }

    // Include conversation spans if requested
    if (includeSpans) {
      const conversationSpans = conversationSessionsDb.getConversationSpans(sessionId)
      
      const formattedSpans = conversationSpans.map(span => ({
        ...span,
        input_data: span.input_data ? JSON.parse(span.input_data) : null,
        output_data: span.output_data ? JSON.parse(span.output_data) : null,
        metadata: span.metadata ? JSON.parse(span.metadata) : {},
        tags: span.tags ? JSON.parse(span.tags) : [],
        conversation_context: span.conversation_context ? JSON.parse(span.conversation_context) : {}
      }))

      enrichedSession = {
        ...enrichedSession,
        conversation_spans: formattedSpans,
        total_conversation_spans: formattedSpans.length
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedSession
    })

  } catch (error) {
    console.error('Failed to fetch conversation session:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conversation session'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/conversation-sessions/[sessionId] - Update conversation session
export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const body = await request.json()

    // Prepare update data
    const updateData = {
      session_name: body.session_name,
      status: body.status,
      total_turns: body.total_turns,
      total_cost: body.total_cost,
      total_tokens: body.total_tokens,
      last_activity_at: body.last_activity_at,
      metadata: body.metadata ? JSON.stringify(body.metadata) : null,
      tags: body.tags ? JSON.stringify(body.tags) : null
    }

    // Update the session
    const success = conversationSessionsDb.update(sessionId, updateData)
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation session not found or update failed'
        },
        { status: 404 }
      )
    }

    // Return updated session
    const updatedSession = conversationSessionsDb.getById(sessionId)
    const responseSession = {
      ...updatedSession,
      metadata: updatedSession.metadata ? JSON.parse(updatedSession.metadata) : {},
      tags: updatedSession.tags ? JSON.parse(updatedSession.tags) : []
    }

    return NextResponse.json({
      success: true,
      data: responseSession
    })

  } catch (error) {
    console.error('Failed to update conversation session:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update conversation session'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/conversation-sessions/[sessionId] - Delete conversation session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    
    // Delete the session (conversation spans will be handled by foreign key constraints)
    const success = conversationSessionsDb.delete(sessionId)
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation session not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation session deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete conversation session:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete conversation session'
      },
      { status: 500 }
    )
  }
}

// PATCH /api/v1/conversation-sessions/[sessionId]/metrics - Increment session metrics
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const body = await request.json()

    const turnIncrement = body.turnIncrement || 1
    const costIncrement = body.costIncrement || 0
    const tokenIncrement = body.tokenIncrement || 0

    // Increment the metrics
    const success = conversationSessionsDb.incrementMetrics(
      sessionId,
      turnIncrement,
      costIncrement,
      tokenIncrement
    )
    
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation session not found'
        },
        { status: 404 }
      )
    }

    // Return updated session
    const updatedSession = conversationSessionsDb.getById(sessionId)
    const responseSession = {
      ...updatedSession,
      metadata: updatedSession.metadata ? JSON.parse(updatedSession.metadata) : {},
      tags: updatedSession.tags ? JSON.parse(updatedSession.tags) : []
    }

    return NextResponse.json({
      success: true,
      data: responseSession
    })

  } catch (error) {
    console.error('Failed to increment session metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to increment session metrics'
      },
      { status: 500 }
    )
  }
}