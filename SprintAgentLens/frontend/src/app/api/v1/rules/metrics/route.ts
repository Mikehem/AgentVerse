import { NextRequest, NextResponse } from 'next/server'

interface RuleMetricsQuery {
  projectId: string
  ruleId?: string
  timeframe: '1h' | '24h' | '7d' | '30d'
  metricType?: 'performance' | 'cost' | 'distribution' | 'trends'
}

// Generate mock time-series data
function generateTimeSeriesData(timeframe: string, dataPoints: number = 24) {
  const now = new Date()
  const data = []
  
  const intervals = {
    '1h': 60 * 1000, // 1 minute intervals
    '24h': 60 * 60 * 1000, // 1 hour intervals  
    '7d': 24 * 60 * 60 * 1000, // 1 day intervals
    '30d': 24 * 60 * 60 * 1000 // 1 day intervals
  }
  
  const interval = intervals[timeframe as keyof typeof intervals] || intervals['24h']
  
  for (let i = dataPoints - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * interval))
    data.push({
      timestamp: timestamp.toISOString(),
      executions: Math.floor(Math.random() * 50) + 10,
      average_score: Math.random() * 0.8 + 0.1,
      cost: Math.random() * 0.05 + 0.01,
      success_rate: Math.random() * 0.2 + 0.8
    })
  }
  
  return data
}

// Get rule performance metrics
function getRulePerformanceMetrics(ruleId?: string) {
  const rules = {
    'rule_hallucination_001': {
      total_executions: 1247,
      successful_executions: 1198,
      failed_executions: 49,
      success_rate: 0.961,
      average_execution_time: 1250,
      average_score: 0.12,
      total_cost: 2.34,
      cost_per_execution: 0.00188,
      last_execution: new Date(Date.now() - 3600000).toISOString()
    },
    'rule_moderation_001': {
      total_executions: 2156,
      successful_executions: 2145,
      failed_executions: 11,
      success_rate: 0.995,
      average_execution_time: 890,
      average_score: 0.95,
      total_cost: 8.67,
      cost_per_execution: 0.00402,
      last_execution: new Date(Date.now() - 1800000).toISOString()
    },
    'rule_relevance_001': {
      total_executions: 567,
      successful_executions: 562,
      failed_executions: 5,
      success_rate: 0.991,
      average_execution_time: 1100,
      average_score: 4.2,
      total_cost: 1.89,
      cost_per_execution: 0.00333,
      last_execution: new Date(Date.now() - 86400000 * 2).toISOString()
    }
  }
  
  if (ruleId) {
    return rules[ruleId as keyof typeof rules] || null
  }
  
  // Return aggregated metrics for all rules
  const allRules = Object.values(rules)
  return {
    total_executions: allRules.reduce((sum, rule) => sum + rule.total_executions, 0),
    successful_executions: allRules.reduce((sum, rule) => sum + rule.successful_executions, 0),
    failed_executions: allRules.reduce((sum, rule) => sum + rule.failed_executions, 0),
    success_rate: allRules.reduce((sum, rule) => sum + rule.success_rate, 0) / allRules.length,
    average_execution_time: allRules.reduce((sum, rule) => sum + rule.average_execution_time, 0) / allRules.length,
    total_cost: allRules.reduce((sum, rule) => sum + rule.total_cost, 0),
    cost_per_execution: allRules.reduce((sum, rule) => sum + rule.cost_per_execution, 0) / allRules.length
  }
}

// Get score distribution data
function getScoreDistribution(ruleId: string) {
  const distributions = {
    'rule_hallucination_001': {
      type: 'binary',
      distribution: {
        '0 (No Hallucination)': 88,
        '1 (Hallucination Detected)': 12
      }
    },
    'rule_moderation_001': {
      type: 'categorical',
      distribution: {
        'safe': 85,
        'mild_concern': 10,
        'moderate_risk': 4,
        'high_risk': 1
      }
    },
    'rule_relevance_001': {
      type: 'scale',
      distribution: {
        '1': 2,
        '2': 8,
        '3': 15,
        '4': 35,
        '5': 40
      }
    }
  }
  
  return distributions[ruleId as keyof typeof distributions] || {
    type: 'binary',
    distribution: { '0': 70, '1': 30 }
  }
}

// Get cost breakdown analytics
function getCostBreakdown(timeframe: string) {
  return {
    total_cost: 12.90,
    cost_by_model: {
      'gpt-4o': 6.45,
      'gpt-4o-mini': 6.45
    },
    cost_by_rule_type: {
      'hallucination': 2.34,
      'moderation': 8.67,
      'relevance': 1.89
    },
    cost_trends: generateTimeSeriesData(timeframe).map(point => ({
      timestamp: point.timestamp,
      cost: point.cost,
      executions: point.executions
    })),
    projected_monthly_cost: 387.00 // Based on current usage patterns
  }
}

// Get rule comparison analytics
function getRuleComparison(projectId: string) {
  return [
    {
      rule_id: 'rule_hallucination_001',
      name: 'Hallucination Detection',
      executions: 1247,
      success_rate: 0.961,
      average_score: 0.12,
      cost_efficiency: 0.00188, // cost per execution
      detection_rate: 0.12, // percentage of positive detections
      performance_grade: 'A-'
    },
    {
      rule_id: 'rule_moderation_001', 
      name: 'Content Moderation',
      executions: 2156,
      success_rate: 0.995,
      average_score: 0.95,
      cost_efficiency: 0.00402,
      detection_rate: 0.15, // percentage of concerning content
      performance_grade: 'A+'
    },
    {
      rule_id: 'rule_relevance_001',
      name: 'Answer Relevance',
      executions: 567,
      success_rate: 0.991,
      average_score: 4.2,
      cost_efficiency: 0.00333,
      detection_rate: 0.05, // percentage of low relevance
      performance_grade: 'A'
    }
  ]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const ruleId = searchParams.get('ruleId')
    const timeframe = searchParams.get('timeframe') || '24h'
    const metricType = searchParams.get('metricType') || 'performance'
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 })
    }
    
    let responseData: any = {}
    
    switch (metricType) {
      case 'performance':
        const performanceMetrics = getRulePerformanceMetrics(ruleId || undefined)
        responseData = {
          ...performanceMetrics,
          timeframe,
          rule_id: ruleId || 'all'
        }
        break
        
      case 'cost':
        responseData = getCostBreakdown(timeframe)
        break
        
      case 'distribution':
        if (!ruleId) {
          return NextResponse.json({
            success: false,
            error: 'Rule ID is required for distribution metrics'
          }, { status: 400 })
        }
        responseData = getScoreDistribution(ruleId)
        break
        
      case 'trends':
        responseData = {
          timeframe,
          data: generateTimeSeriesData(timeframe),
          rule_id: ruleId || 'all'
        }
        break
        
      default:
        // Return comprehensive metrics overview
        responseData = {
          performance: getRulePerformanceMetrics(),
          cost_summary: getCostBreakdown(timeframe),
          rule_comparison: getRuleComparison(projectId),
          trends: generateTimeSeriesData(timeframe),
          timeframe
        }
    }
    
    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        project_id: projectId,
        rule_id: ruleId,
        timeframe,
        metric_type: metricType,
        generated_at: new Date().toISOString()
      }
    })
    
  } catch (error: any) {
    console.error('Rule metrics API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

// POST endpoint for custom metric calculations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, rule_ids, custom_timeframe, calculation_type } = body
    
    if (!project_id) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 })
    }
    
    // Handle custom metric calculations
    const customMetrics = {
      calculation_type,
      timeframe: custom_timeframe,
      rules_analyzed: rule_ids?.length || 0,
      computed_at: new Date().toISOString(),
      results: {
        // Custom calculation results would go here
        total_value: Math.random() * 1000,
        confidence_score: Math.random() * 0.3 + 0.7,
        trend_direction: Math.random() > 0.5 ? 'increasing' : 'decreasing'
      }
    }
    
    return NextResponse.json({
      success: true,
      data: customMetrics
    })
    
  } catch (error: any) {
    console.error('Custom rule metrics calculation error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}