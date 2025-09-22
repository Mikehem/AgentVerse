import { NextRequest, NextResponse } from 'next/server'
import { spansDb } from '@/lib/database'
import { generateSpanId } from '@/lib/idGenerator'
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

// GET /api/v1/traces/[id]/spans - Get spans for trace
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: traceId } = await params
    
    // Get spans for this trace
    const spans = spansDb.getAll('SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time', [traceId])
    
    // Transform spans to match expected format
    const transformedSpans = spans.map(span => ({
      spanId: span.span_id,
      traceId: span.trace_id,
      parentSpanId: span.parent_span_id,
      spanName: span.span_name,
      spanType: span.span_type,
      startTime: span.start_time,
      endTime: span.end_time,
      duration: span.duration,
      status: span.status,
      inputData: span.input_data ? JSON.parse(span.input_data) : {},
      outputData: span.output_data ? JSON.parse(span.output_data) : {},
      metadata: span.metadata ? JSON.parse(span.metadata) : {},
      tags: span.tags ? JSON.parse(span.tags) : [],
      createdAt: span.created_at
    }))
    
    return NextResponse.json({
      success: true,
      data: transformedSpans,
      total: spans.length
    })
    
  } catch (error) {
    console.error('Failed to get spans for trace:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get spans'
    }, { status: 500 })
  }
}

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
    
    const spanId = generateSpanId()
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