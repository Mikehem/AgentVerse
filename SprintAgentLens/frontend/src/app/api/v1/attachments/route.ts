import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

// For now, we'll use local file storage instead of MinIO for simplicity
// In production, this would use MinIO client
const STORAGE_PATH = path.join(process.cwd(), 'data', 'attachments')

const attachmentSchema = z.object({
  conversation_id: z.string().optional(),
  trace_id: z.string().optional(),
  span_id: z.string().optional(),
  filename: z.string().min(1, 'Filename is required'),
  content_type: z.string().min(1, 'Content type is required'),
  metadata: z.record(z.any()).optional()
})

// Ensure storage directory exists
async function ensureStorageDir() {
  if (!existsSync(STORAGE_PATH)) {
    await mkdir(STORAGE_PATH, { recursive: true })
  }
}

// GET /api/v1/attachments - List attachments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const conversationId = searchParams.get('conversationId')
    const traceId = searchParams.get('traceId')
    const spanId = searchParams.get('spanId')

    let query = `
      SELECT 
        a.*,
        c.name as conversation_name,
        t.name as trace_name
      FROM attachments a
      LEFT JOIN conversations c ON a.conversation_id = c.id
      LEFT JOIN traces t ON a.trace_id = t.id
    `
    let countQuery = 'SELECT COUNT(*) as count FROM attachments a'
    const params = []
    const countParams = []
    const conditions = []

    if (conversationId) {
      conditions.push('a.conversation_id = ?')
      params.push(conversationId)
      countParams.push(conversationId)
    }

    if (traceId) {
      conditions.push('a.trace_id = ?')
      params.push(traceId)
      countParams.push(traceId)
    }

    if (spanId) {
      conditions.push('a.span_id = ?')
      params.push(spanId)
      countParams.push(spanId)
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ')
      query += whereClause
      countQuery += whereClause
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const attachments = db.prepare(query).all(...params)
    const total = db.prepare(countQuery).get(...countParams) as { count: number }

    const transformedAttachments = attachments.map((attachment: any) => ({
      ...attachment,
      metadata: attachment.metadata ? JSON.parse(attachment.metadata) : null,
      download_url: `/api/v1/attachments/${attachment.id}/download`
    }))

    return NextResponse.json({
      success: true,
      data: transformedAttachments,
      pagination: {
        limit,
        offset,
        total: total.count,
        hasNext: offset + limit < total.count,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Error fetching attachments:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch attachments'
    }, { status: 500 })
  }
}

// POST /api/v1/attachments - Upload attachment
export async function POST(request: NextRequest) {
  try {
    await ensureStorageDir()

    const formData = await request.formData()
    const file = formData.get('file') as File
    const conversationId = formData.get('conversation_id') as string
    const traceId = formData.get('trace_id') as string
    const spanId = formData.get('span_id') as string
    const metadataStr = formData.get('metadata') as string

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No file provided'
      }, { status: 400 })
    }

    // Validate required fields
    const validatedData = attachmentSchema.parse({
      conversation_id: conversationId || undefined,
      trace_id: traceId || undefined,
      span_id: spanId || undefined,
      filename: file.name,
      content_type: file.type,
      metadata: metadataStr ? JSON.parse(metadataStr) : undefined
    })

    const id = `attachment_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    // Generate storage path
    const fileExtension = path.extname(file.name)
    const storagePath = path.join(STORAGE_PATH, `${id}${fileExtension}`)
    const relativeStoragePath = `attachments/${id}${fileExtension}`

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(storagePath, buffer)

    // Save to database
    const stmt = db.prepare(`
      INSERT INTO attachments (
        id, conversation_id, trace_id, span_id, filename, 
        content_type, size, storage_path, metadata, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      validatedData.conversation_id || null,
      validatedData.trace_id || null,
      validatedData.span_id || null,
      validatedData.filename,
      validatedData.content_type,
      file.size,
      relativeStoragePath,
      validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      now
    )

    const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(id)

    return NextResponse.json({
      success: true,
      data: {
        ...attachment,
        metadata: attachment.metadata ? JSON.parse(attachment.metadata) : null,
        download_url: `/api/v1/attachments/${id}/download`
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error uploading attachment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload attachment'
    }, { status: 500 })
  }
}