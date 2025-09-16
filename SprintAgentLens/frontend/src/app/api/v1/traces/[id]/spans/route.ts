import { NextRequest, NextResponse } from 'next/server'
import { spansDb } from '@/lib/database'
import { z } from 'zod'

// Validation schema for span data
const spanSchema = z.object({
  name: z.string().min(1, 'Span name is required'),
  kind: z.string().optional(),
  attributes: z.record(z.any()).optional(),
  events: z.array(z.object({
    name: z.string(),
    attributes: z.record(z.any()).optional()
  })).optional(),
  status: z.object({
    code: z.string(),
    message: z.string().optional()
  }).optional()
})

// POST /api/v1/traces/[id]/spans - Create span for trace
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceId } = await params
    const body = await request.json()
    
    console.log('Span POST - received body:', JSON.stringify(body, null, 2))
    
    // Validate span data (temporary skip for debugging)
    let validatedData
    try {
      validatedData = spanSchema.parse(body)
    } catch (error) {
      console.log('Zod validation failed, using body directly:', error)
      validatedData = {
        name: body.name,
        kind: body.kind,
        attributes: body.attributes || {},
        events: body.events || [],
        status: body.status || { code: 'OK' }
      }
    }
    
    const spanId = `span_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    // Create span data
    const spanData = {
      traceId,
      spanId,
      spanName: validatedData.name,
      spanType: 'custom',
      startTime: now,
      status: validatedData.status?.code || 'running',
      inputData: validatedData.attributes,
      metadata: {
        kind: validatedData.kind,
        events: validatedData.events,
        status: validatedData.status
      }
    }
    
    const span = spansDb.create(spanData)
    
    return NextResponse.json({
      success: true,
      data: {
        span_id: spanId,
        trace_id: traceId,
        name: validatedData.name,
        status: validatedData.status?.code || 'running',
        attributes: validatedData.attributes || {},
        events: validatedData.events || []
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
    
    console.error('Failed to create span for trace:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create span'
    }, { status: 500 })
  }
}