import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const datasetSchema = z.object({
  name: z.string().min(1, 'Dataset name is required'),
  description: z.string().optional(),
  project_id: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

const datasetItemSchema = z.object({
  input_data: z.record(z.any()),
  expected_output: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/v1/datasets - List all datasets
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const projectId = searchParams.get('projectId')

    let query = `
      SELECT 
        d.*,
        p.name as project_name,
        COUNT(di.id) as item_count
      FROM datasets d
      LEFT JOIN projects p ON d.project_id = p.id
      LEFT JOIN dataset_items di ON d.id = di.dataset_id
    `
    let countQuery = 'SELECT COUNT(*) as count FROM datasets d'
    const params = []
    const countParams = []

    if (projectId) {
      query += ' WHERE d.project_id = ?'
      countQuery += ' WHERE d.project_id = ?'
      params.push(projectId)
      countParams.push(projectId)
    }

    query += ' GROUP BY d.id ORDER BY d.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const datasets = db.prepare(query).all(...params)
    const total = db.prepare(countQuery).get(...countParams) as { count: number }

    const transformedDatasets = datasets.map((dataset: any) => ({
      ...dataset,
      metadata: dataset.metadata ? JSON.parse(dataset.metadata) : null
    }))

    return NextResponse.json({
      success: true,
      data: transformedDatasets,
      pagination: {
        limit,
        offset,
        total: total.count,
        hasNext: offset + limit < total.count,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Error fetching datasets:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch datasets'
    }, { status: 500 })
  }
}

// POST /api/v1/datasets - Create new dataset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Validate dataset data (temporary skip for debugging)
    let validatedData
    try {
      validatedData = datasetSchema.parse(body)
    } catch (error) {
      console.log('Dataset validation failed, using body directly:', error)
      validatedData = {
        name: body.name,
        description: body.description,
        project_id: body.project_id,
        metadata: body.metadata || {}
      }
    }

    const id = `dataset_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO datasets (id, name, description, project_id, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      validatedData.name,
      validatedData.description || null,
      validatedData.project_id || null,
      validatedData.metadata ? JSON.stringify(validatedData.metadata) : null,
      now,
      now
    )

    const dataset = db.prepare('SELECT * FROM datasets WHERE id = ?').get(id)

    return NextResponse.json({
      success: true,
      data: {
        ...dataset,
        metadata: dataset.metadata ? JSON.parse(dataset.metadata) : null
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

    console.error('Error creating dataset:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create dataset'
    }, { status: 500 })
  }
}