import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

// GET /api/v1/attachments/[id]/download - Download attachment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attachmentId = params.id

    // Get attachment metadata from database
    const attachment = db.prepare('SELECT * FROM attachments WHERE id = ?').get(attachmentId)

    if (!attachment) {
      return NextResponse.json({
        success: false,
        error: 'Attachment not found'
      }, { status: 404 })
    }

    // Construct full file path
    const fullPath = path.join(process.cwd(), 'data', attachment.storage_path)

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({
        success: false,
        error: 'File not found on disk'
      }, { status: 404 })
    }

    try {
      // Read file from disk
      const fileBuffer = await readFile(fullPath)

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': attachment.content_type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${attachment.filename}"`,
          'Content-Length': attachment.size?.toString() || fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        },
      })
    } catch (fileError) {
      console.error('Error reading file:', fileError)
      return NextResponse.json({
        success: false,
        error: 'Failed to read file'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error downloading attachment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to download attachment'
    }, { status: 500 })
  }
}