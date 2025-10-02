import { NextRequest, NextResponse } from 'next/server'
import { Rule } from '@/types/rules'

// Mock data for rules
const mockRules: Rule[] = [
  {
    id: 'rule_hallucination_001',
    name: 'Hallucination Detection',
    description: 'Automatically detect potential hallucinations in AI responses',
    project_id: 'project-1',
    type: 'llm_judge',
    status: 'active',
    sampling_rate: 25,
    model: 'gpt-4o-mini',
    metric_type: 'hallucination',
    config: {
      prompt: 'Analyze the AI response for any false, unsupported, or fabricated information. Consider the context and expected knowledge. Rate as 1 for hallucination detected, 0 for no hallucination.',
      variables: ['input', 'output', 'context'],
      score_definition: {
        type: 'binary'
      },
      conditions: {
        trace_filters: {
          min_tokens: 50
        }
      }
    },
    stats: {
      total_executions: 1247,
      successful_executions: 1198,
      failed_executions: 49,
      last_execution: new Date(Date.now() - 3600000).toISOString(),
      average_score: 0.12,
      execution_cost: 2.34
    },
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    created_by: 'user_001'
  },
  {
    id: 'rule_moderation_001',
    name: 'Content Moderation',
    description: 'Flag inappropriate or harmful content in conversations',
    project_id: 'project-1',
    type: 'llm_judge',
    status: 'active',
    sampling_rate: 100,
    model: 'gpt-4o',
    metric_type: 'moderation',
    config: {
      prompt: 'Evaluate if the content contains harmful, inappropriate, toxic, or unsafe material. Categorize as: safe, mild_concern, moderate_risk, or high_risk.',
      variables: ['input', 'output'],
      score_definition: {
        type: 'categorical',
        categories: ['safe', 'mild_concern', 'moderate_risk', 'high_risk']
      }
    },
    stats: {
      total_executions: 2156,
      successful_executions: 2145,
      failed_executions: 11,
      last_execution: new Date(Date.now() - 1800000).toISOString(),
      average_score: 0.95, // Percentage safe
      execution_cost: 8.67
    },
    created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
    created_by: 'user_001'
  },
  {
    id: 'rule_relevance_001',
    name: 'Answer Relevance Scoring',
    description: 'Measure how relevant AI responses are to user questions',
    project_id: 'project-1',
    type: 'llm_judge',
    status: 'inactive',
    sampling_rate: 15,
    model: 'gpt-4o-mini',
    metric_type: 'relevance',
    config: {
      prompt: 'Rate how relevant and helpful this response is to the user\'s question or request on a scale of 1-5.',
      variables: ['input', 'output'],
      score_definition: {
        type: 'scale',
        scale: { min: 1, max: 5 }
      }
    },
    stats: {
      total_executions: 567,
      successful_executions: 562,
      failed_executions: 5,
      last_execution: new Date(Date.now() - 86400000 * 2).toISOString(),
      average_score: 4.2,
      execution_cost: 1.89
    },
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    created_by: 'user_002'
  }
]

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

    // Filter rules by project
    const projectRules = mockRules.filter(rule => rule.project_id === projectId)

    return NextResponse.json({
      success: true,
      data: projectRules
    })
  } catch (error: any) {
    console.error('Rules API error:', error)
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
    const { name, project_id, type, metric_type, config } = body
    if (!name || !project_id || !type || !metric_type || !config) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Create new rule
    const newRule: Rule = {
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: body.description || '',
      project_id,
      type,
      status: body.status || 'draft',
      sampling_rate: body.sampling_rate || 10,
      model: body.model || 'gpt-4o-mini',
      metric_type,
      config: {
        prompt: config.prompt || '',
        variables: config.variables || [],
        score_definition: config.score_definition || { type: 'binary' },
        conditions: config.conditions || {}
      },
      stats: {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        execution_cost: 0
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: 'current_user' // In real app, get from auth
    }

    // In a real implementation, save to database
    mockRules.push(newRule)

    return NextResponse.json({
      success: true,
      data: newRule
    })
  } catch (error: any) {
    console.error('Create rule error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}