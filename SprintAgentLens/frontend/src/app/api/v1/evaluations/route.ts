import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const evaluationSchema = z.object({
  name: z.string().min(1, 'Evaluation name is required'),
  description: z.string().optional(),
  type: z.string().optional(),
  project_id: z.string().optional(),
  dataset_id: z.string().optional(),
  configuration: z.union([z.string(), z.record(z.any())]).optional(),
  status: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/v1/evaluations - List evaluations
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const projectId = searchParams.get('projectId')
    const datasetId = searchParams.get('datasetId')

    let query = `
      SELECT 
        e.*,
        p.name as project_name,
        0 as result_count
      FROM evaluations e
      LEFT JOIN projects p ON e.project_id = p.id
    `
    let countQuery = 'SELECT COUNT(*) as count FROM evaluations e'
    const params = []
    const countParams = []
    const conditions = []

    if (projectId) {
      conditions.push('e.project_id = ?')
      params.push(projectId)
      countParams.push(projectId)
    }

    // Note: dataset_id column removed from evaluations table schema
    // if (datasetId) {
    //   conditions.push('e.dataset_id = ?')
    //   params.push(datasetId)
    //   countParams.push(datasetId)
    // }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ')
      query += whereClause
      countQuery += whereClause
    }

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const evaluations = db.prepare(query).all(...params)
    const total = db.prepare(countQuery).get(...countParams) as { count: number }

    const transformedEvaluations = evaluations.map((evaluation: any) => ({
      ...evaluation,
      config: evaluation.config ? JSON.parse(evaluation.config) : null,
      metadata: evaluation.metadata ? JSON.parse(evaluation.metadata) : null
    }))

    return NextResponse.json({
      success: true,
      data: transformedEvaluations,
      pagination: {
        limit,
        offset,
        total: total.count,
        hasNext: offset + limit < total.count,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Error fetching evaluations:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch evaluations'
    }, { status: 500 })
  }
}

// POST /api/v1/evaluations - Create new evaluation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received evaluation creation request:', body)
    
    // Validate with proper error handling
    let validatedData
    try {
      validatedData = evaluationSchema.parse(body)
    } catch (error) {
      console.error('Validation error:', error)
      // Use body data directly for now with defaults
      validatedData = {
        name: body.name || 'Unnamed Evaluation',
        type: body.type || 'heuristic',
        project_id: body.project_id,
        dataset_id: body.dataset_id,
        configuration: body.configuration,
        status: body.status || 'pending',
        metadata: body.metadata || {}
      }
    }

    const id = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO evaluations (id, name, type, configuration, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const configToStore = typeof validatedData.configuration === 'string' 
      ? validatedData.configuration 
      : JSON.stringify(validatedData.configuration || { metrics: [] })

    stmt.run(
      id,
      validatedData.name,
      validatedData.type || 'heuristic',
      configToStore,
      validatedData.project_id,
      now,
      now
    )

    const evaluation = db.prepare(`
      SELECT 
        e.*,
        p.name as project_name
      FROM evaluations e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ?
    `).get(id)

    return NextResponse.json({
      success: true,
      data: {
        ...evaluation,
        config: evaluation.config ? JSON.parse(evaluation.config) : null,
        metadata: evaluation.metadata ? JSON.parse(evaluation.metadata) : null
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

    console.error('Error creating evaluation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create evaluation'
    }, { status: 500 })
  }
}

// PUT /api/v1/evaluations - Update evaluation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Received evaluation update request:', body)
    
    const { id, status, results, ...updateData } = body
    
    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation ID is required for update'
      }, { status: 400 })
    }

    const now = new Date().toISOString()
    
    // Prepare update fields
    const updateFields = []
    const updateValues = []
    
    if (status) {
      updateFields.push('status = ?')
      updateValues.push(status)
    }
    
    if (results) {
      updateFields.push('results = ?')
      updateValues.push(JSON.stringify(results))
    }
    
    // Add updated_at
    updateFields.push('updated_at = ?')
    updateValues.push(now)
    
    // Add the ID for WHERE clause
    updateValues.push(id)
    
    const stmt = db.prepare(`
      UPDATE evaluations 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `)
    
    const result = stmt.run(...updateValues)
    
    if (result.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'Evaluation not found'
      }, { status: 404 })
    }
    
    // Fetch updated evaluation
    const evaluation = db.prepare(`
      SELECT 
        e.*,
        p.name as project_name
      FROM evaluations e
      LEFT JOIN projects p ON e.project_id = p.id
      WHERE e.id = ?
    `).get(id)
    
    return NextResponse.json({
      success: true,
      data: {
        ...evaluation,
        config: evaluation.config ? JSON.parse(evaluation.config) : null,
        metadata: evaluation.metadata ? JSON.parse(evaluation.metadata) : null,
        results: evaluation.results ? JSON.parse(evaluation.results) : null
      }
    })
    
  } catch (error) {
    console.error('Error updating evaluation:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update evaluation'
    }, { status: 500 })
  }
}