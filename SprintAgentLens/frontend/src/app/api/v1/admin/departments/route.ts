import { NextRequest, NextResponse } from 'next/server'
import { departmentDb } from '@/lib/database'
import { departmentSchema } from '@/lib/validationSchemas'
import { z } from 'zod'

// GET /api/v1/admin/departments - Get all departments
export async function GET() {
  try {
    const departments = departmentDb.getAll()
    return NextResponse.json({
      success: true,
      data: departments
    })
  } catch (error) {
    console.error('Failed to fetch departments:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch departments'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/admin/departments - Create new department
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = departmentSchema.parse(body)
    
    // Create department
    const department = departmentDb.create(validatedData)
    
    return NextResponse.json({
      success: true,
      data: department
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
      if (error.message.includes('departments.code')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Department code already exists. Please choose a different code.'
          },
          { status: 400 }
        )
      }
      if (error.message.includes('departments.name')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Department name already exists. Please choose a different name.'
          },
          { status: 400 }
        )
      }
      return NextResponse.json(
        {
          success: false,
          error: 'A department with this information already exists.'
        },
        { status: 400 }
      )
    }
    
    console.error('Failed to create department:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create department'
      },
      { status: 500 }
    )
  }
}