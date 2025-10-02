import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'
import crypto from 'crypto'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const metricConfigSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  metricConfigs: z.array(z.object({
    metricType: z.enum(['hallucination', 'relevance', 'moderation', 'usefulness', 'coherence']),
    modelName: z.string().min(1, 'Model name is required'),
    apiKey: z.string().optional(),
    customPrompt: z.string().optional(),
    threshold: z.number().min(0).max(1).optional(),
    enabled: z.boolean().default(true)
  })).min(1, 'At least one metric configuration is required')
})

const updateConfigSchema = z.object({
  metricType: z.enum(['hallucination', 'relevance', 'moderation', 'usefulness', 'coherence']),
  modelName: z.string().min(1, 'Model name is required'),
  apiKey: z.string().optional(),
  customPrompt: z.string().optional(),
  threshold: z.number().min(0).max(1).optional(),
  enabled: z.boolean().default(true)
})

// Simple encryption for API keys (in production, use proper key management)
function encryptApiKey(apiKey: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(algorithm, key)
  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

function decryptApiKey(encryptedApiKey: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32)
    const [ivHex, encrypted] = encryptedApiKey.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Failed to decrypt API key:', error)
    return ''
  }
}

// GET /api/v1/metrics/config - Get metrics configuration for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 })
    }

    const configs = db.prepare(`
      SELECT * FROM metrics_configs 
      WHERE project_id = ?
      ORDER BY metric_type, created_at DESC
    `).all(projectId) as any[]

    const transformedConfigs = configs.map(config => ({
      id: config.id,
      projectId: config.project_id,
      metricType: config.metric_type,
      modelName: config.model_name,
      hasApiKey: !!config.api_key_encrypted,
      customPrompt: config.custom_prompt,
      threshold: config.threshold,
      enabled: !!config.enabled,
      createdAt: config.created_at,
      updatedAt: config.updated_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedConfigs
    })

  } catch (error) {
    console.error('Error fetching metrics config:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch metrics configuration'
    }, { status: 500 })
  }
}

// POST /api/v1/metrics/config - Configure metrics for a project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = metricConfigSchema.parse(body)

    console.log(`📊 Configuring metrics for project: ${validatedData.projectId}`)

    // Begin transaction
    db.exec('BEGIN TRANSACTION')

    try {
      // Delete existing configurations for this project
      db.prepare('DELETE FROM metrics_configs WHERE project_id = ?')
        .run(validatedData.projectId)

      // Insert new configurations
      const insertStmt = db.prepare(`
        INSERT INTO metrics_configs (
          id, project_id, metric_type, model_name, api_key_encrypted,
          custom_prompt, threshold, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      const configIds: string[] = []

      for (const config of validatedData.metricConfigs) {
        const configId = `cfg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const encryptedApiKey = config.apiKey ? encryptApiKey(config.apiKey) : null

        insertStmt.run(
          configId,
          validatedData.projectId,
          config.metricType,
          config.modelName,
          encryptedApiKey,
          config.customPrompt || null,
          config.threshold || null,
          config.enabled ? 1 : 0,
          now,
          now
        )

        configIds.push(configId)
      }

      db.exec('COMMIT')

      console.log(`✅ Configured ${configIds.length} metrics for project ${validatedData.projectId}`)

      return NextResponse.json({
        success: true,
        data: {
          projectId: validatedData.projectId,
          configuredMetrics: configIds.length,
          configIds
        }
      }, { status: 201 })

    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error configuring metrics:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to configure metrics'
    }, { status: 500 })
  }
}

// PUT /api/v1/metrics/config - Update specific metric configuration
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('configId')
    
    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Config ID is required'
      }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = updateConfigSchema.parse(body)

    const encryptedApiKey = validatedData.apiKey ? encryptApiKey(validatedData.apiKey) : null
    const now = new Date().toISOString()

    const updateStmt = db.prepare(`
      UPDATE metrics_configs 
      SET metric_type = ?, model_name = ?, api_key_encrypted = ?,
          custom_prompt = ?, threshold = ?, enabled = ?, updated_at = ?
      WHERE id = ?
    `)

    const result = updateStmt.run(
      validatedData.metricType,
      validatedData.modelName,
      encryptedApiKey,
      validatedData.customPrompt || null,
      validatedData.threshold || null,
      validatedData.enabled ? 1 : 0,
      now,
      configId
    )

    if (result.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 })
    }

    console.log(`✅ Updated metrics configuration: ${configId}`)

    return NextResponse.json({
      success: true,
      data: {
        configId,
        updated: true
      }
    })

  } catch (error) {
    console.error('Error updating metrics config:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update metrics configuration'
    }, { status: 500 })
  }
}

// DELETE /api/v1/metrics/config - Delete metric configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const configId = searchParams.get('configId')
    
    if (!configId) {
      return NextResponse.json({
        success: false,
        error: 'Config ID is required'
      }, { status: 400 })
    }

    const deleteStmt = db.prepare('DELETE FROM metrics_configs WHERE id = ?')
    const result = deleteStmt.run(configId)

    if (result.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 })
    }

    console.log(`✅ Deleted metrics configuration: ${configId}`)

    return NextResponse.json({
      success: true,
      data: {
        configId,
        deleted: true
      }
    })

  } catch (error) {
    console.error('Error deleting metrics config:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete metrics configuration'
    }, { status: 500 })
  }
}

export { encryptApiKey, decryptApiKey }