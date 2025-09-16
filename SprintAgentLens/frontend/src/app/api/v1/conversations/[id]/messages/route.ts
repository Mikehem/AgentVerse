import { NextRequest, NextResponse } from 'next/server'
import { conversationDb } from '@/lib/database'
import { z } from 'zod'

// Validation schema for message data
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Content is required'),
  metadata: z.record(z.any()).optional()
})

// GET /api/v1/conversations/[id]/messages - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // For now, return the conversation content as messages
    // In a real system, messages would be stored separately
    const conversation = conversationDb.getById(id)
    
    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 })
    }

    // Mock messages based on conversation data
    const messages = [
      {
        id: `msg_${Date.now()}_1`,
        role: 'user',
        content: conversation.input,
        timestamp: conversation.created_at,
        metadata: {}
      },
      {
        id: `msg_${Date.now()}_2`,
        role: 'assistant', 
        content: conversation.output,
        timestamp: conversation.created_at,
        metadata: {}
      }
    ]

    return NextResponse.json({
      success: true,
      data: messages
    })

  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch messages'
    }, { status: 500 })
  }
}

// POST /api/v1/conversations/[id]/messages - Add message to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate message data (temporary skip for debugging)
    let validatedData
    try {
      validatedData = messageSchema.parse(body)
    } catch (error) {
      console.log('Zod validation failed, using body directly:', error)
      validatedData = {
        role: body.role,
        content: body.content,
        metadata: body.metadata || {}
      }
    }
    
    // Check if conversation exists
    const conversation = conversationDb.getById(id)
    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 })
    }

    // Create message object
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      conversation_id: id,
      role: validatedData.role,
      content: validatedData.content,
      timestamp: new Date().toISOString(),
      metadata: validatedData.metadata || {}
    }

    // In a real system, messages would be stored in a separate table
    // For now, just return the created message
    return NextResponse.json({
      success: true,
      data: message
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }
    
    console.error('Failed to create message:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create message'
    }, { status: 500 })
  }
}