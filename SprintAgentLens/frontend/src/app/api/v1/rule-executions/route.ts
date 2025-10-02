import { NextRequest, NextResponse } from 'next/server'
import { RuleExecution } from '@/types/rules'

// Mock data for rule executions
const mockExecutions: RuleExecution[] = [
  {
    id: 'exec_001',
    rule_id: 'rule_hallucination_001',
    trace_id: 'trace_12345',
    status: 'completed',
    score: 0,
    reasoning: 'Response appears factually accurate and well-grounded in the provided context.',
    execution_time: 1250,
    cost: 0.0023,
    model_used: 'gpt-4o-mini',
    created_at: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'exec_002',
    rule_id: 'rule_moderation_001',
    trace_id: 'trace_12346',
    status: 'completed',
    score: 'safe',
    reasoning: 'Content is appropriate and safe for all audiences.',
    execution_time: 890,
    cost: 0.0034,
    model_used: 'gpt-4o',
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'exec_003',
    rule_id: 'rule_hallucination_001',
    trace_id: 'trace_12347',
    status: 'completed',
    score: 1,
    reasoning: 'Detected potential hallucination: Response mentions specific statistics that are not supported by the provided context.',
    execution_time: 1420,
    cost: 0.0025,
    model_used: 'gpt-4o-mini',
    created_at: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'exec_004',
    rule_id: 'rule_relevance_001',
    trace_id: 'trace_12348',
    status: 'completed',
    score: 4,
    reasoning: 'Response is highly relevant and directly addresses the user\'s question with helpful information.',
    execution_time: 1100,
    cost: 0.0019,
    model_used: 'gpt-4o-mini',
    created_at: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 'exec_005',
    rule_id: 'rule_moderation_001',
    trace_id: 'trace_12349',
    status: 'failed',
    execution_time: 0,
    cost: 0,
    model_used: 'gpt-4o',
    error: 'API timeout - request exceeded maximum duration',
    created_at: new Date(Date.now() - 14400000).toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const ruleId = searchParams.get('ruleId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status')
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 })
    }

    // Filter executions
    let filteredExecutions = mockExecutions

    if (ruleId) {
      filteredExecutions = filteredExecutions.filter(exec => exec.rule_id === ruleId)
    }

    if (status) {
      filteredExecutions = filteredExecutions.filter(exec => exec.status === status)
    }

    // Sort by creation date (newest first) and limit
    const sortedExecutions = filteredExecutions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)

    return NextResponse.json({
      success: true,
      data: sortedExecutions,
      meta: {
        total: filteredExecutions.length,
        limit,
        has_more: filteredExecutions.length > limit
      }
    })
  } catch (error: any) {
    console.error('Rule executions API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { rule_id, trace_id } = body
    if (!rule_id || !trace_id) {
      return NextResponse.json({
        success: false,
        error: 'Rule ID and trace ID are required'
      }, { status: 400 })
    }

    // Create new execution
    const newExecution: RuleExecution = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rule_id,
      trace_id,
      thread_id: body.thread_id,
      status: 'pending',
      execution_time: 0,
      cost: 0,
      model_used: body.model_used || 'gpt-4o-mini',
      created_at: new Date().toISOString()
    }

    // In a real implementation, save to database and trigger async execution
    mockExecutions.push(newExecution)

    // Simulate async execution
    setTimeout(() => {
      const execution = mockExecutions.find(e => e.id === newExecution.id)
      if (execution) {
        execution.status = 'completed'
        execution.score = Math.random() > 0.8 ? 1 : 0 // 20% positive rate
        execution.reasoning = 'Automated evaluation completed successfully.'
        execution.execution_time = Math.floor(Math.random() * 2000) + 500
        execution.cost = Math.random() * 0.005 + 0.001
      }
    }, 2000)

    return NextResponse.json({
      success: true,
      data: newExecution
    })
  } catch (error: any) {
    console.error('Create rule execution error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}