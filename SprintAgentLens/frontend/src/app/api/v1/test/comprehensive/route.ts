import { NextRequest, NextResponse } from 'next/server'
import { runComprehensiveTests } from '@/lib/sdk/examples/comprehensive-test'

// POST /api/v1/test/comprehensive - Run comprehensive test suite
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Starting comprehensive test suite...')
    
    const startTime = Date.now()
    const results = await runComprehensiveTests()
    const duration = Date.now() - startTime
    
    return NextResponse.json({
      success: true,
      data: {
        results,
        duration,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Comprehensive test suite failed:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Test suite execution failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET /api/v1/test/comprehensive - Get test status/info
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      available: true,
      description: 'Comprehensive Agent Lens test suite',
      tests: [
        'Basic SDK Operations',
        'Trace Operations', 
        'Attachment Operations',
        'Decorated Functions',
        'AI Agent Workflow',
        'Dataset Operations',
        'Evaluation Operations',
        'Error Handling'
      ],
      estimatedDuration: '30-60 seconds'
    }
  })
}