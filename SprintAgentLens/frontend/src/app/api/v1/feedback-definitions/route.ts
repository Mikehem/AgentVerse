import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { feedbackDefinitionsDb } from '@/lib/database'

// Feedback Definition Schema
const numericalDetailsSchema = z.object({
  min: z.number(),
  max: z.number()
})

const categoricalDetailsSchema = z.object({
  categories: z.record(z.string(), z.number()).refine(
    (categories) => Object.keys(categories).length >= 2,
    { message: "At least 2 categories are required" }
  )
})

const feedbackDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(['numerical', 'categorical']),
  details: z.union([numericalDetailsSchema, categoricalDetailsSchema]),
  createdBy: z.string().optional(),
  createdAt: z.string().optional(),
  lastUpdatedAt: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type')

    let definitions = []

    if (type) {
      // Filter by type
      definitions = feedbackDefinitionsDb.findMany({
        where: { type },
        limit,
        offset,
        orderBy: { created_at: 'desc' }
      })
    } else {
      // Get all definitions
      definitions = feedbackDefinitionsDb.findMany({
        limit,
        offset,
        orderBy: { created_at: 'desc' }
      })
    }

    // Transform to match frontend expectations
    const transformedDefinitions = definitions.map(def => ({
      id: def.id,
      name: def.name,
      description: def.description,
      type: def.type,
      details: JSON.parse(def.details),
      createdBy: def.created_by,
      createdAt: def.created_at,
      lastUpdatedAt: def.last_updated_at
    }))

    return NextResponse.json({
      success: true,
      data: transformedDefinitions,
      total: transformedDefinitions.length,
      page: Math.floor(offset / limit) + 1,
      limit
    })

  } catch (error) {
    console.error('Failed to fetch feedback definitions:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch feedback definitions'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Feedback Definitions POST - received body:', JSON.stringify(body, null, 2))

    // Validate the definition
    const validatedDefinition = feedbackDefinitionSchema.parse(body)

    // Create the definition
    const definitionData = {
      id: validatedDefinition.id || `def_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: validatedDefinition.name,
      description: validatedDefinition.description || null,
      type: validatedDefinition.type,
      details: JSON.stringify(validatedDefinition.details),
      created_by: validatedDefinition.createdBy || 'system',
      created_at: validatedDefinition.createdAt || new Date().toISOString(),
      last_updated_at: validatedDefinition.lastUpdatedAt || new Date().toISOString()
    }

    const createdDefinition = feedbackDefinitionsDb.create(definitionData)

    // Transform response
    const transformedDefinition = {
      id: createdDefinition.id,
      name: createdDefinition.name,
      description: createdDefinition.description,
      type: createdDefinition.type,
      details: JSON.parse(createdDefinition.details),
      createdBy: createdDefinition.created_by,
      createdAt: createdDefinition.created_at,
      lastUpdatedAt: createdDefinition.last_updated_at
    }

    return NextResponse.json({
      success: true,
      data: transformedDefinition,
      message: 'Feedback definition created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create feedback definition:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create feedback definition'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Definition ID is required for updates'
      }, { status: 400 })
    }

    // Validate the update data
    const validatedData = feedbackDefinitionSchema.partial().parse(updateData)

    const updateFields: any = {
      last_updated_at: new Date().toISOString()
    }

    if (validatedData.name) updateFields.name = validatedData.name
    if (validatedData.description !== undefined) updateFields.description = validatedData.description
    if (validatedData.type) updateFields.type = validatedData.type
    if (validatedData.details) updateFields.details = JSON.stringify(validatedData.details)

    const updatedDefinition = feedbackDefinitionsDb.update(id, updateFields)

    if (!updatedDefinition) {
      return NextResponse.json({
        success: false,
        error: 'Feedback definition not found'
      }, { status: 404 })
    }

    // Transform response
    const transformedDefinition = {
      id: updatedDefinition.id,
      name: updatedDefinition.name,
      description: updatedDefinition.description,
      type: updatedDefinition.type,
      details: JSON.parse(updatedDefinition.details),
      createdBy: updatedDefinition.created_by,
      createdAt: updatedDefinition.created_at,
      lastUpdatedAt: updatedDefinition.last_updated_at
    }

    return NextResponse.json({
      success: true,
      data: transformedDefinition,
      message: 'Feedback definition updated successfully'
    })

  } catch (error) {
    console.error('Failed to update feedback definition:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to update feedback definition'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Definition ID is required for deletion'
      }, { status: 400 })
    }

    feedbackDefinitionsDb.delete(id)

    return NextResponse.json({
      success: true,
      message: 'Feedback definition deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete feedback definition:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete feedback definition'
    }, { status: 500 })
  }
}