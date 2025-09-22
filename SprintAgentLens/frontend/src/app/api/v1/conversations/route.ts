import { NextRequest, NextResponse } from 'next/server'
import { conversationDb } from '@/lib/database'
import { z } from 'zod'

// Validation schema for conversation data with support for multiturn conversations
const conversationSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  agentId: z.string().min(1, 'Agent ID is required'),
  runId: z.string().min(1, 'Run ID is required'), // Now required for proper session tracking
  userId: z.string().optional(),
  sessionId: z.string().optional(), // Legacy field, kept for backwards compatibility
  threadId: z.string().optional(), // For multiturn conversation tracking
  conversationIndex: z.number().min(0).optional(), // Position in multiturn conversation
  parentConversationId: z.string().optional(), // Reference to previous conversation in thread
  input: z.string().min(1, 'Input is required'),
  output: z.string().min(1, 'Output is required'),
  status: z.enum(['success', 'error', 'timeout']).default('success'),
  responseTime: z.number().min(0, 'Response time must be positive'),
  tokenUsage: z.number().min(0).optional(),
  cost: z.number().min(0).optional(),
  feedback: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

// GET /api/v1/conversations - Get conversations with filtering, search, and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const runId = searchParams.get('runId')
    const threadId = searchParams.get('threadId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeThread = searchParams.get('includeThread') === 'true' // Include full thread context

    // Build base query for counting total records with agent information
    let countQuery = 'SELECT COUNT(*) as total FROM conversations c WHERE 1=1'
    let dataQuery = `
      SELECT c.*, 
             a.name as agent_name,
             p.name as project_name
      FROM conversations c 
      LEFT JOIN agents a ON c.agent_id = a.id 
      LEFT JOIN projects p ON c.project_id = p.id 
      WHERE 1=1`
    const params: any[] = []
    const countParams: any[] = []

    if (projectId) {
      countQuery += ' AND c.project_id = ?'
      dataQuery += ' AND c.project_id = ?'
      params.push(projectId)
      countParams.push(projectId)
    }

    if (agentId) {
      countQuery += ' AND c.agent_id = ?'
      dataQuery += ' AND c.agent_id = ?'
      params.push(agentId)
      countParams.push(agentId)
    }

    if (runId) {
      countQuery += ' AND c.runId = ?'
      dataQuery += ' AND c.runId = ?'
      params.push(runId)
      countParams.push(runId)
    }

    if (threadId) {
      // Search in metadata JSON field for threadId
      const threadCondition = ' AND (JSON_EXTRACT(c.metadata, "$.threadId") = ? OR JSON_EXTRACT(c.metadata, "$.thread_id") = ?)'
      countQuery += threadCondition
      dataQuery += threadCondition
      params.push(threadId, threadId)
      countParams.push(threadId, threadId)
    }

    if (status) {
      countQuery += ' AND c.status = ?'
      dataQuery += ' AND c.status = ?'
      params.push(status)
      countParams.push(status)
    }

    if (search && search.trim()) {
      const searchCondition = ' AND (c.input LIKE ? OR c.output LIKE ? OR c.id LIKE ?)'
      const searchTerm = `%${search.trim()}%`
      countQuery += searchCondition
      dataQuery += searchCondition
      params.push(searchTerm, searchTerm, searchTerm)
      countParams.push(searchTerm, searchTerm, searchTerm)
    }

    // Get total count for pagination
    const countResults = conversationDb.getAll(countQuery, countParams) as { total: number }[]
    const totalCount = countResults.length > 0 ? countResults[0].total : 0

    // Get paginated data
    dataQuery += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    let conversations = conversationDb.getAll(dataQuery, params)

    // If includeThread is true, enrich conversations with thread context
    if (includeThread && conversations.length > 0) {
      conversations = conversations.map(conv => {
        const metadata = conv.metadata ? JSON.parse(conv.metadata) : {}
        const threadId = metadata.threadId || metadata.thread_id
        
        if (threadId) {
          // Get all conversations in this thread
          const threadConversations = conversationDb.getAll(
            `SELECT c.*, a.name as agent_name, p.name as project_name 
             FROM conversations c
             LEFT JOIN agents a ON c.agent_id = a.id 
             LEFT JOIN projects p ON c.project_id = p.id 
             WHERE (JSON_EXTRACT(c.metadata, "$.threadId") = ? OR JSON_EXTRACT(c.metadata, "$.thread_id") = ?) 
             AND c.project_id = ? 
             ORDER BY c.created_at ASC`,
            [threadId, threadId, conv.project_id]
          )
          
          return {
            ...conv,
            threadConversations: threadConversations,
            isMultiturn: threadConversations.length > 1,
            threadPosition: threadConversations.findIndex(tc => tc.id === conv.id) + 1,
            threadTotal: threadConversations.length
          }
        }
        
        return {
          ...conv,
          isMultiturn: false,
          threadPosition: 1,
          threadTotal: 1
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: conversations,
      meta: {
        total: totalCount,
        limit,
        offset,
        currentPage: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: offset + limit < totalCount,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conversations'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/conversations - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Enhanced validation with thread support - handle both camelCase and snake_case
    const validatedData = {
      projectId: body.projectId || body.project_id,
      agentId: body.agentId || body.agent_id,
      runId: body.runId, // Now required
      userId: body.userId || null,
      sessionId: body.sessionId || null, // Legacy field
      threadId: body.threadId || null,
      conversationIndex: body.conversationIndex || 0,
      parentConversationId: body.parentConversationId || null,
      input: body.input,
      output: body.output,
      status: body.status || 'success',
      responseTime: body.responseTime,
      tokenUsage: body.tokenUsage || 0,
      cost: body.cost || 0.0,
      feedback: body.feedback || null,
      metadata: {
        ...(body.metadata || {}),
        // Ensure thread info is in metadata for easier querying
        ...(body.threadId && { threadId: body.threadId }),
        ...(body.conversationIndex !== undefined && { conversationIndex: body.conversationIndex }),
        ...(body.parentConversationId && { parentConversationId: body.parentConversationId })
      }
    }
    
    // Create conversation
    const conversation = conversationDb.create({
      ...validatedData,
      metadata: validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      createdAt: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: conversation
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
    
    console.error('Failed to create conversation:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create conversation'
      },
      { status: 500 }
    )
  }
}