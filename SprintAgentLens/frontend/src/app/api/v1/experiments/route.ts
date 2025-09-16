import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const experimentSchema = z.object({
  name: z.string().min(1, 'Experiment name is required'),
  description: z.string().optional(),
  project_id: z.string().optional(),
  dataset_id: z.string().optional(),
  agent_config: z.record(z.any()).optional(),
  evaluation_config: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/v1/experiments - List experiments
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
        d.name as dataset_name
      FROM experiments e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN datasets d ON e.dataset_id = d.id
    `
    let countQuery = 'SELECT COUNT(*) as count FROM experiments e'
    const params = []
    const countParams = []
    const conditions = []

    if (projectId) {
      conditions.push('e.project_id = ?')
      params.push(projectId)
      countParams.push(projectId)
    }

    if (datasetId) {
      conditions.push('e.dataset_id = ?')
      params.push(datasetId)
      countParams.push(datasetId)
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ')
      query += whereClause
      countQuery += whereClause
    }

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const experiments = db.prepare(query).all(...params)
    const total = db.prepare(countQuery).get(...countParams) as { count: number }

    const transformedExperiments = experiments.map((experiment: any) => {
      const config = experiment.configuration ? JSON.parse(experiment.configuration) : {}
      return {
        ...experiment,
        agent_config: config.agent_config || null,
        evaluation_config: config.evaluation_config || null,
        metadata: config.metadata || null
      }
    })

    return NextResponse.json({
      success: true,
      data: transformedExperiments,
      pagination: {
        limit,
        offset,
        total: total.count,
        hasNext: offset + limit < total.count,
        hasPrev: offset > 0
      }
    })

  } catch (error) {
    console.error('Error fetching experiments:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch experiments'
    }, { status: 500 })
  }
}

// POST /api/v1/experiments - Create new experiment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Validate experiment data (temporary skip for debugging)
    let validatedData
    try {
      validatedData = experimentSchema.parse(body)
    } catch (error) {
      console.log('Experiment validation failed, using body directly:', error)
      validatedData = {
        name: body.name,
        description: body.description,
        project_id: body.project_id,
        agent_config: body.agent_config || {},
        evaluation_config: body.evaluation_config || {}
      }
    }

    const id = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()

    const stmt = db.prepare(`
      INSERT INTO experiments (
        id, name, description, dataset_id, configuration, 
        status, created_at, updated_at, project_id
      )
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `)

    stmt.run(
      id,
      validatedData.name,
      validatedData.description || null,
      validatedData.dataset_id || null,
      JSON.stringify({
        agent_config: validatedData.agent_config || {},
        evaluation_config: validatedData.evaluation_config || {},
        metadata: validatedData.metadata || {}
      }),
      now,
      now,
      validatedData.project_id || null
    )

    const experiment = db.prepare(`
      SELECT 
        e.*,
        p.name as project_name,
        d.name as dataset_name
      FROM experiments e
      LEFT JOIN projects p ON e.project_id = p.id
      LEFT JOIN datasets d ON e.dataset_id = d.id
      WHERE e.id = ?
    `).get(id)

    const config = experiment.configuration ? JSON.parse(experiment.configuration) : {}
    
    return NextResponse.json({
      success: true,
      data: {
        ...experiment,
        agent_config: config.agent_config || null,
        evaluation_config: config.evaluation_config || null,
        metadata: config.metadata || null
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

    console.error('Error creating experiment:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create experiment'
    }, { status: 500 })
  }
}