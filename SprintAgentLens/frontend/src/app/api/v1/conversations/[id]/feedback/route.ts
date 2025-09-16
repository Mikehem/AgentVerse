import { NextRequest, NextResponse } from 'next/server'
import { conversationDb } from '@/lib/database'
import { z } from 'zod'

// Validation schema for feedback data
const feedbackSchema = z.object({
  score: z.enum(['thumbs_up', 'thumbs_down', '1', '2', '3', '4', '5']),
  comment: z.string().optional(),
  category: z.string().optional(), // e.g., 'accuracy', 'helpfulness', 'relevance'
  timestamp: z.string().optional()
})

// POST /api/v1/conversations/[id]/feedback - Add feedback to conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const body = await request.json()
    
    // Validate the feedback data (temporary skip for debugging)
    let validatedFeedback
    try {
      validatedFeedback = feedbackSchema.parse(body)
    } catch (error) {
      console.log('Feedback validation failed, using body directly:', error)
      validatedFeedback = {
        score: body.value || body.score || 'thumbs_up',
        comment: body.comment,
        category: body.source || body.category,
        timestamp: body.timestamp
      }
    }
    
    // Get existing conversation to check if it exists
    const conversation = conversationDb.getById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found'
        },
        { status: 404 }
      )
    }
    
    // Parse existing feedback or create new feedback object
    let existingFeedback = {}
    if (conversation.feedback) {
      try {
        existingFeedback = JSON.parse(conversation.feedback)
      } catch (e) {
        console.warn('Failed to parse existing feedback, creating new feedback object')
      }
    }
    
    // Create the new feedback entry with timestamp
    const newFeedbackEntry = {
      ...validatedFeedback,
      timestamp: validatedFeedback.timestamp || new Date().toISOString(),
      userId: body.userId || 'anonymous' // Could be enhanced with auth
    }
    
    // Merge with existing feedback (supporting multiple feedback entries)
    const updatedFeedback = {
      ...existingFeedback,
      latest: newFeedbackEntry,
      history: [
        ...(existingFeedback.history || []),
        newFeedbackEntry
      ]
    }
    
    // Update the conversation with the new feedback
    const updatedConversation = conversationDb.update(conversationId, {
      feedback: JSON.stringify(updatedFeedback)
    })
    
    if (!updatedConversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update conversation with feedback'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        feedback: updatedFeedback
      }
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid feedback data',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    console.error('Failed to add feedback:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add feedback'
      },
      { status: 500 }
    )
  }
}

// GET /api/v1/conversations/[id]/feedback - Get feedback for conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    
    // Get the conversation
    const conversation = conversationDb.getById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found'
        },
        { status: 404 }
      )
    }
    
    // Parse feedback data
    let feedback = null
    if (conversation.feedback) {
      try {
        feedback = JSON.parse(conversation.feedback)
      } catch (e) {
        console.warn('Failed to parse feedback data')
        feedback = { error: 'Invalid feedback data format' }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        feedback
      }
    })
    
  } catch (error) {
    console.error('Failed to get feedback:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get feedback'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/conversations/[id]/feedback - Remove feedback from conversation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    
    // Get existing conversation to check if it exists
    const conversation = conversationDb.getById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Conversation not found'
        },
        { status: 404 }
      )
    }
    
    // Clear the feedback
    const updatedConversation = conversationDb.update(conversationId, {
      feedback: null
    })
    
    if (!updatedConversation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to remove feedback from conversation'
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      data: {
        conversationId,
        message: 'Feedback removed successfully'
      }
    })
    
  } catch (error) {
    console.error('Failed to remove feedback:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove feedback'
      },
      { status: 500 }
    )
  }
}