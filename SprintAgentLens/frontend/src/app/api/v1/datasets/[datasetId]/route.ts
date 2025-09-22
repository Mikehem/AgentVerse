import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'
import { z } from 'zod'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

const datasetUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// GET /api/v1/datasets/[datasetId] - Get specific dataset
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params

    const dataset = db.prepare(`
      SELECT d.*, p.name as project_name
      FROM datasets d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.id = ?
    `).get(datasetId)

    if (!dataset) {
      return NextResponse.json({
        success: false,
        error: 'Dataset not found'
      }, { status: 404 })
    }

    // Get item count
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM dataset_items WHERE dataset_id = ?').get(datasetId) as { count: number }

    const transformedDataset = {
      ...dataset,
      metadata: dataset.metadata ? JSON.parse(dataset.metadata) : null,
      item_count: itemCount.count
    }

    return NextResponse.json({
      success: true,
      data: transformedDataset
    })

  } catch (error) {
    console.error('Error fetching dataset:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dataset'
    }, { status: 500 })
  }
}

// PUT /api/v1/datasets/[datasetId] - Update dataset
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params
    const body = await request.json()
    
    const validatedData = datasetUpdateSchema.parse(body)
    
    // Check if dataset exists
    const existingDataset = db.prepare('SELECT id FROM datasets WHERE id = ?').get(datasetId)
    if (!existingDataset) {
      return NextResponse.json({
        success: false,
        error: 'Dataset not found'
      }, { status: 404 })
    }

    // Build update query dynamically
    const updateFields = []
    const updateValues = []
    
    if (validatedData.name !== undefined) {
      updateFields.push('name = ?')
      updateValues.push(validatedData.name)
    }
    
    if (validatedData.description !== undefined) {
      updateFields.push('description = ?')
      updateValues.push(validatedData.description)
    }
    
    if (validatedData.metadata !== undefined) {
      updateFields.push('metadata = ?')
      updateValues.push(JSON.stringify(validatedData.metadata))
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      }, { status: 400 })
    }

    updateFields.push('updated_at = ?')
    updateValues.push(new Date().toISOString())
    updateValues.push(datasetId)

    const updateQuery = `UPDATE datasets SET ${updateFields.join(', ')} WHERE id = ?`
    db.prepare(updateQuery).run(...updateValues)

    // Fetch updated dataset
    const dataset = db.prepare(`
      SELECT d.*, p.name as project_name
      FROM datasets d
      LEFT JOIN projects p ON d.project_id = p.id
      WHERE d.id = ?
    `).get(datasetId)

    // Get item count
    const itemCount = db.prepare('SELECT COUNT(*) as count FROM dataset_items WHERE dataset_id = ?').get(datasetId) as { count: number }

    const transformedDataset = {
      ...dataset,
      metadata: dataset.metadata ? JSON.parse(dataset.metadata) : null,
      item_count: itemCount.count
    }

    return NextResponse.json({
      success: true,
      data: transformedDataset
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 })
    }

    console.error('Error updating dataset:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update dataset'
    }, { status: 500 })
  }
}

// DELETE /api/v1/datasets/[datasetId] - Delete dataset
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ datasetId: string }> }
) {
  try {
    const { datasetId } = await params

    // Check if dataset exists
    const existingDataset = db.prepare('SELECT id FROM datasets WHERE id = ?').get(datasetId)
    if (!existingDataset) {
      return NextResponse.json({
        success: false,
        error: 'Dataset not found'
      }, { status: 404 })
    }

    // Delete all dataset items first
    db.prepare('DELETE FROM dataset_items WHERE dataset_id = ?').run(datasetId)
    
    // Delete the dataset
    db.prepare('DELETE FROM datasets WHERE id = ?').run(datasetId)

    return NextResponse.json({
      success: true,
      message: 'Dataset deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting dataset:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete dataset'
    }, { status: 500 })
  }
}