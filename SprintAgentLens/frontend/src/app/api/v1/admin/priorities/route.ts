import { NextRequest, NextResponse } from 'next/server'
import { businessPriorityDb } from '@/lib/database'
import { businessPrioritySchema } from '@/lib/validationSchemas'
import { z } from 'zod'

// GET /api/v1/admin/priorities - Get all business priorities
export async function GET() {
  try {
    const priorities = businessPriorityDb.getAll()
    return NextResponse.json({
      success: true,
      data: priorities
    })
  } catch (error) {
    console.error('Failed to fetch priorities:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch priorities'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/admin/priorities - Create new business priority
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = businessPrioritySchema.parse(body)
    
    // Create priority
    const priority = businessPriorityDb.create(validatedData)
    
    return NextResponse.json({
      success: true,
      data: priority
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
    
    // Handle SQLite constraint errors
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('business_priorities.level')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Priority level already exists. Please choose a different level (1-4).'
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: 'A priority with this information already exists.'
        },
        { status: 400 }
      )
    }
    
    console.error('Failed to create priority:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create priority'
      },
      { status: 500 }
    )
  }
}