import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { heuristicMetricsDb } from '@/lib/database'

const createMetricSchema = z.object({
  name: z.string().min(1, 'Metric name is required'),
  description: z.string().optional(),
  type: z.enum(['contains', 'equals', 'regex', 'is_json', 'levenshtein']),
  config: z.record(z.any())
})

const updateMetricSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  config: z.record(z.any()).optional(),
  is_active: z.number().min(0).max(1).optional()
})

// GET /api/v1/heuristic-metrics - List all metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'
    const type = searchParams.get('type')
    
    let metrics
    if (activeOnly) {
      metrics = heuristicMetricsDb.getActive()
    } else {
      metrics = heuristicMetricsDb.getAll()
    }
    
    if (type) {
      metrics = metrics.filter(m => m.type === type)
    }
    
    // Parse config JSON for each metric
    const transformedMetrics = metrics.map(metric => ({
      ...metric,
      config: metric.config ? JSON.parse(metric.config) : {}
    }))
    
    return NextResponse.json({
      success: true,
      data: transformedMetrics
    })
    
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch metrics'
    }, { status: 500 })
  }
}

// POST /api/v1/heuristic-metrics - Create new metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createMetricSchema.parse(body)
    
    // Validate metric type
    const supportedTypes = ['contains', 'equals', 'regex', 'is_json', 'levenshtein']
    if (!supportedTypes.includes(validatedData.type)) {
      return NextResponse.json({
        success: false,
        error: `Unsupported metric type: ${validatedData.type}`,
        details: { supportedTypes }
      }, { status: 400 })
    }
    
    // Create metric in database
    const metric = heuristicMetricsDb.create({
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      config: JSON.stringify(validatedData.config)
    })
    
    if (!metric) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create metric'
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...metric,
        config: JSON.parse(metric.config)
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
    
    console.error('Error creating metric:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create metric'
    }, { status: 500 })
  }
}