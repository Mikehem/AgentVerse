import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const datasetItemSchema = z.object({
  input_data: z.record(z.any()),
  expected_output: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/v1/datasets/[datasetId]/items - Get dataset items
export async function GET(
  request: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if dataset exists
    const dataset = db.prepare('SELECT id FROM datasets WHERE id = ?').get(datasetId)
    if (!dataset) {
      return NextResponse.json({
        success: false,
        error: 'Dataset not found'
      }, { status: 404 })
    }

    const items = db.prepare(`
      SELECT * FROM dataset_items 
      WHERE dataset_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(datasetId, limit, offset)

    const total = db.prepare('SELECT COUNT(*) as count FROM dataset_items WHERE dataset_id = ?').get(datasetId) as { count: number }

    const transformedItems = items.map((item: any) => ({
      ...item,
      input_data: JSON.parse(item.input_data),
      expected_output: item.expected_output ? JSON.parse(item.expected_output) : null,
      metadata: item.metadata ? JSON.parse(item.metadata) : null
    }))

    return NextResponse.json({
      success: true,
      data: transformedItems,
      pagination: {
        limit,
        offset,
        total: total.count,
        hasNext: offset + limit < total.count,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Error fetching dataset items:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dataset items'
    }, { status: 500 })
  }
}

// POST /api/v1/datasets/[datasetId]/items - Add dataset item
export async function POST(
  request: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params
    const body = await request.json()
    
    // Handle both single item and batch operations
    const isArray = Array.isArray(body)
    const items = isArray ? body : [body]

    // Check if dataset exists
    const dataset = db.prepare('SELECT id FROM datasets WHERE id = ?').get(datasetId)
    if (!dataset) {
      return NextResponse.json({
        success: false,
        error: 'Dataset not found'
      }, { status: 404 })
    }

    const results = []
    const now = new Date().toISOString()

    const insertStmt = db.prepare(`
      INSERT INTO dataset_items (id, dataset_id, input_data, expected_output, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    for (const itemData of items) {
      const validatedData = datasetItemSchema.parse(itemData)
      const id = `item_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

      insertStmt.run(
        id,
        datasetId,
        JSON.stringify(validatedData.input_data),
        validatedData.expected_output ? JSON.stringify(validatedData.expected_output) : null,
        validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
        now,
        now
      )

      const item = db.prepare('SELECT * FROM dataset_items WHERE id = ?').get(id)
      results.push({
        ...item,
        input_data: JSON.parse(item.input_data),
        expected_output: item.expected_output ? JSON.parse(item.expected_output) : null,
        metadata: item.metadata ? JSON.parse(item.metadata) : null
      })
    }

    return NextResponse.json({
      success: true,
      data: isArray ? results : results[0],
      count: results.length
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error adding dataset items:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to add dataset items'
    }, { status: 500 })
  }
}

// DELETE /api/v1/datasets/[datasetId]/items - Delete all items or specific items
export async function DELETE(
  request: NextRequest,
  { params }: { params: { datasetId: string } }
) {
  try {
    const { datasetId } = params
    const { searchParams } = new URL(request.url)
    const itemIds = searchParams.getAll('itemId')

    // Check if dataset exists
    const dataset = db.prepare('SELECT id FROM datasets WHERE id = ?').get(datasetId)
    if (!dataset) {
      return NextResponse.json({
        success: false,
        error: 'Dataset not found'
      }, { status: 404 })
    }

    let deletedCount = 0

    if (itemIds.length > 0) {
      // Delete specific items
      const placeholders = itemIds.map(() => '?').join(',')
      const stmt = db.prepare(`DELETE FROM dataset_items WHERE dataset_id = ? AND id IN (${placeholders})`)
      const result = stmt.run(datasetId, ...itemIds)
      deletedCount = result.changes
    } else {
      // Delete all items in dataset
      const stmt = db.prepare('DELETE FROM dataset_items WHERE dataset_id = ?')
      const result = stmt.run(datasetId)
      deletedCount = result.changes
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} items`,
      deletedCount
    })

  } catch (error) {
    console.error('Error deleting dataset items:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete dataset items'
    }, { status: 500 })
  }
}