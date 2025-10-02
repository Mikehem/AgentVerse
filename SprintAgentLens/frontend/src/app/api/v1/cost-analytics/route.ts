import { NextRequest, NextResponse } from 'next/server'
import { tracesDb, spansDb, conversationDb } from '@/lib/database'
import { calculateCost, aggregateCosts, type TokenUsage, type CostAggregation } from '@/lib/costCalculation'

// Cost analytics API following Master cost tracking specifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const runId = searchParams.get('runId')
    const provider = searchParams.get('provider')
    const model = searchParams.get('model')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const granularity = searchParams.get('granularity') || 'day' // day, hour, minute
    const level = searchParams.get('level') || 'project' // project, trace, span, conversation
    const includeBreakdown = searchParams.get('includeBreakdown') === 'true'

    // Build base query
    let query = ''
    let params: any[] = []

    if (level === 'trace') {
      query = `
        SELECT 
          id, project_id, agent_id, runId, operation_name, start_time, end_time,
          total_cost, input_cost, output_cost, prompt_tokens, completion_tokens, total_tokens,
          provider, model_name, cost_calculation_metadata
        FROM traces WHERE 1=1
      `
    } else if (level === 'span') {
      query = `
        SELECT 
          id, trace_id, span_id, span_name, span_type, start_time, end_time,
          total_cost, input_cost, output_cost, prompt_tokens, completion_tokens, total_tokens,
          provider, model_name, cost_calculation_metadata
        FROM spans WHERE 1=1
      `
    } else if (level === 'conversation') {
      query = `
        SELECT 
          id, project_id, agent_id, runId, input, output, created_at as start_time,
          cost as total_cost, 0 as input_cost, 0 as output_cost, 
          token_usage as total_tokens, 0 as prompt_tokens, 0 as completion_tokens,
          JSON_EXTRACT(metadata, '$.provider') as provider,
          JSON_EXTRACT(metadata, '$.model') as model_name
        FROM conversations WHERE 1=1
      `
    } else {
      // Project level - aggregate from both traces and conversations
      // First get traces data
      const tracesQuery = `
        SELECT 
          project_id, 
          COUNT(*) as item_count,
          SUM(total_cost) as total_cost,
          SUM(input_cost) as total_input_cost,
          SUM(output_cost) as total_output_cost,
          SUM(prompt_tokens) as total_prompt_tokens,
          SUM(completion_tokens) as total_completion_tokens,
          SUM(total_tokens) as total_tokens,
          provider,
          model_name,
          DATE(start_time) as date,
          'trace' as source_type
        FROM traces WHERE 1=1
      `
      
      // Then get conversations data
      const conversationsQuery = `
        SELECT 
          project_id, 
          COUNT(*) as item_count,
          SUM(cost) as total_cost,
          0 as total_input_cost,
          0 as total_output_cost,
          0 as total_prompt_tokens,
          0 as total_completion_tokens,
          SUM(token_usage) as total_tokens,
          JSON_EXTRACT(metadata, '$.provider') as provider,
          JSON_EXTRACT(metadata, '$.model') as model_name,
          DATE(created_at) as date,
          'conversation' as source_type
        FROM conversations WHERE 1=1
      `
      
      // For now, let's focus on conversations since they have the actual cost data
      query = conversationsQuery
    }

    // Add filters
    if (projectId) {
      query += ' AND project_id = ?'
      params.push(projectId)
    }

    if (agentId && (level === 'trace' || level === 'conversation' || level === 'project')) {
      query += ' AND agent_id = ?'
      params.push(agentId)
    }

    if (runId && (level === 'trace' || level === 'conversation' || level === 'project')) {
      query += ' AND runId = ?'
      params.push(runId)
    }

    if (provider) {
      if (level === 'conversation' || level === 'project') {
        query += ' AND JSON_EXTRACT(metadata, "$.provider") = ?'
      } else {
        query += ' AND provider = ?'
      }
      params.push(provider)
    }

    if (model) {
      if (level === 'conversation' || level === 'project') {
        query += ' AND JSON_EXTRACT(metadata, "$.model") = ?'
      } else {
        query += ' AND model_name = ?'
      }
      params.push(model)
    }

    if (startDate) {
      if (level === 'conversation' || level === 'project') {
        query += ' AND created_at >= ?'
      } else {
        query += ' AND start_time >= ?'
      }
      params.push(startDate)
    }

    if (endDate) {
      if (level === 'conversation' || level === 'project') {
        query += ' AND created_at <= ?'
      } else {
        query += ' AND start_time <= ?'
      }
      params.push(endDate)
    }

    // Add grouping for project level
    if (level === 'project') {
      query += ' GROUP BY project_id, provider, model_name, DATE(created_at)'
      query += ' ORDER BY date DESC'
    } else if (level === 'conversation') {
      query += ' ORDER BY created_at DESC'
    } else {
      query += ' ORDER BY start_time DESC'
    }

    // Execute query based on level
    let db
    if (level === 'span') {
      db = spansDb
    } else if (level === 'conversation' || level === 'project') {
      db = conversationDb  // Use conversations for project level and conversation level
    } else {
      db = tracesDb
    }
    
    const results = db.getAll(query, params)

    // Calculate detailed analytics
    let analytics: any = {
      level,
      granularity,
      filters: {
        projectId,
        agentId,
        runId,
        provider,
        model,
        startDate,
        endDate
      },
      data: results,
      summary: calculateSummaryStats(results, level)
    }

    // Add time-series breakdown if requested
    if (includeBreakdown) {
      analytics.breakdown = generateTimeSeriesBreakdown(results, granularity, level)
    }

    return NextResponse.json({
      success: true,
      analytics
    })

  } catch (error) {
    console.error('Failed to fetch cost analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cost analytics'
      },
      { status: 500 }
    )
  }
}

// POST endpoint for calculating costs for specific data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { spans, traces, calculateMissing = false } = body

    let results: any = {
      success: true,
      calculations: []
    }

    // Calculate costs for spans if provided
    if (spans && Array.isArray(spans)) {
      const spanCalculations = spans.map((span: any) => {
        const tokenUsage: TokenUsage = {
          promptTokens: span.prompt_tokens || 0,
          completionTokens: span.completion_tokens || 0,
          totalTokens: span.total_tokens || 0
        }

        const costResult = calculateCost(
          span.model_name || span.model || 'unknown',
          tokenUsage,
          span.provider
        )

        return {
          id: span.id || span.span_id,
          type: 'span',
          originalCost: span.total_cost || 0,
          calculatedCost: costResult.totalCost,
          breakdown: costResult,
          tokenUsage
        }
      })

      results.calculations.push(...spanCalculations)
    }

    // Calculate costs for traces if provided
    if (traces && Array.isArray(traces)) {
      const traceCalculations = traces.map((trace: any) => {
        const tokenUsage: TokenUsage = {
          promptTokens: trace.prompt_tokens || 0,
          completionTokens: trace.completion_tokens || 0,
          totalTokens: trace.total_tokens || 0
        }

        const costResult = calculateCost(
          trace.model_name || trace.model || 'unknown',
          tokenUsage,
          trace.provider
        )

        return {
          id: trace.id,
          type: 'trace',
          originalCost: trace.total_cost || 0,
          calculatedCost: costResult.totalCost,
          breakdown: costResult,
          tokenUsage
        }
      })

      results.calculations.push(...traceCalculations)
    }

    // Add aggregated summary
    if (results.calculations.length > 0) {
      results.summary = {
        totalItems: results.calculations.length,
        totalOriginalCost: results.calculations.reduce((sum: number, calc: any) => sum + calc.originalCost, 0),
        totalCalculatedCost: results.calculations.reduce((sum: number, calc: any) => sum + calc.calculatedCost, 0),
        avgCostPerItem: results.calculations.reduce((sum: number, calc: any) => sum + calc.calculatedCost, 0) / results.calculations.length
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Failed to calculate costs:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to calculate costs'
      },
      { status: 500 }
    )
  }
}

function calculateSummaryStats(results: any[], level: string) {
  if (results.length === 0) {
    return {
      totalCost: 0,
      totalInputCost: 0,
      totalOutputCost: 0,
      totalTokens: 0,
      avgCostPerItem: 0,
      costByProvider: {},
      costByModel: {},
      count: 0
    }
  }

  const summary = {
    totalCost: 0,
    totalInputCost: 0,
    totalOutputCost: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    avgCostPerItem: 0,
    costByProvider: {} as Record<string, number>,
    costByModel: {} as Record<string, number>,
    count: results.length
  }

  results.forEach(item => {
    const cost = item.total_cost || 0
    const inputCost = item.total_input_cost || item.input_cost || 0
    const outputCost = item.total_output_cost || item.output_cost || 0
    const tokens = item.total_tokens || 0
    const promptTokens = item.total_prompt_tokens || item.prompt_tokens || 0
    const completionTokens = item.total_completion_tokens || item.completion_tokens || 0
    const provider = item.provider || 'unknown'
    const model = item.model_name || 'unknown'

    summary.totalCost += cost
    summary.totalInputCost += inputCost
    summary.totalOutputCost += outputCost
    summary.totalTokens += tokens
    summary.totalPromptTokens += promptTokens
    summary.totalCompletionTokens += completionTokens

    // Aggregate by provider
    if (!summary.costByProvider[provider]) {
      summary.costByProvider[provider] = 0
    }
    summary.costByProvider[provider] += cost

    // Aggregate by model
    if (!summary.costByModel[model]) {
      summary.costByModel[model] = 0
    }
    summary.costByModel[model] += cost
  })

  summary.avgCostPerItem = summary.totalCost / summary.count
  
  // Round values
  summary.totalCost = Number(summary.totalCost.toFixed(6))
  summary.totalInputCost = Number(summary.totalInputCost.toFixed(6))
  summary.totalOutputCost = Number(summary.totalOutputCost.toFixed(6))
  summary.avgCostPerItem = Number(summary.avgCostPerItem.toFixed(6))

  return summary
}

function generateTimeSeriesBreakdown(results: any[], granularity: string, level: string) {
  const breakdown: Record<string, any> = {}

  results.forEach(item => {
    // More robust date parsing
    let startTime: Date
    const timeValue = item.start_time || item.created_at
    
    if (!timeValue) {
      return // Skip items without timestamp
    }
    
    // Try parsing the date value
    if (typeof timeValue === 'string') {
      startTime = new Date(timeValue)
    } else if (typeof timeValue === 'number') {
      startTime = new Date(timeValue)
    } else {
      return // Skip invalid time values
    }
    
    // Skip invalid dates
    if (isNaN(startTime.getTime())) {
      console.warn('Invalid date found:', timeValue)
      return
    }
    
    let timeKey: string

    try {
      switch (granularity) {
        case 'hour':
          timeKey = startTime.toISOString().substring(0, 13) + ':00:00.000Z'
          break
        case 'minute':
          timeKey = startTime.toISOString().substring(0, 16) + ':00.000Z'
          break
        default: // day
          timeKey = startTime.toISOString().substring(0, 10) + 'T00:00:00.000Z'
      }
    } catch (error) {
      console.warn('Error creating time key for date:', startTime, error)
      return
    }

    if (!breakdown[timeKey]) {
      breakdown[timeKey] = {
        timestamp: timeKey,
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        totalTokens: 0,
        count: 0,
        costByProvider: {},
        costByModel: {}
      }
    }

    const cost = item.total_cost || 0
    const inputCost = item.total_input_cost || item.input_cost || 0
    const outputCost = item.total_output_cost || item.output_cost || 0
    const tokens = item.total_tokens || 0
    const provider = item.provider || 'unknown'
    const model = item.model_name || 'unknown'

    breakdown[timeKey].totalCost += cost
    breakdown[timeKey].inputCost += inputCost
    breakdown[timeKey].outputCost += outputCost
    breakdown[timeKey].totalTokens += tokens
    breakdown[timeKey].count += 1

    // Provider breakdown
    if (!breakdown[timeKey].costByProvider[provider]) {
      breakdown[timeKey].costByProvider[provider] = 0
    }
    breakdown[timeKey].costByProvider[provider] += cost

    // Model breakdown
    if (!breakdown[timeKey].costByModel[model]) {
      breakdown[timeKey].costByModel[model] = 0
    }
    breakdown[timeKey].costByModel[model] += cost
  })

  // Convert to array and sort by timestamp
  return Object.values(breakdown).sort((a: any, b: any) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
}