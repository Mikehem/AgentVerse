import { NextRequest, NextResponse } from 'next/server'

interface TriggerRulesRequest {
  project_id: string
  trace_id: string
  thread_id?: string
  event_type: 'trace_created' | 'trace_completed' | 'thread_completed'
}

// Get active rules for a project
async function getActiveProjectRules(projectId: string) {
  // In real implementation, fetch from database
  // For now, return mock active rules
  return [
    {
      id: 'rule_hallucination_001',
      name: 'Hallucination Detection',
      project_id: projectId,
      status: 'active',
      sampling_rate: 25,
      type: 'llm_judge',
      metric_type: 'hallucination',
      config: {
        conditions: {
          trace_filters: {
            min_tokens: 50
          }
        }
      }
    },
    {
      id: 'rule_moderation_001',
      name: 'Content Moderation',
      project_id: projectId,
      status: 'active',
      sampling_rate: 100,
      type: 'llm_judge',
      metric_type: 'moderation'
    }
  ]
}

// Check if rule should be sampled based on sampling rate
function shouldSampleRule(samplingRate: number): boolean {
  return Math.random() * 100 < samplingRate
}

// Execute rule asynchronously
async function executeRuleAsync(ruleId: string, traceId: string, threadId?: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v1/rules/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rule_id: ruleId,
        trace_id: traceId,
        thread_id: threadId
      })
    })
    
    const result = await response.json()
    console.log(`Rule ${ruleId} executed for trace ${traceId}:`, result)
    
    return result
  } catch (error) {
    console.error(`Failed to execute rule ${ruleId} for trace ${traceId}:`, error)
    return { success: false, error: error.message }
  }
}

// Log rule trigger event
function logRuleTriggerEvent(projectId: string, traceId: string, triggeredRules: string[]) {
  console.log(`Rule trigger event for project ${projectId}, trace ${traceId}:`, {
    triggered_rules: triggeredRules,
    timestamp: new Date().toISOString()
  })
  
  // In real implementation, store trigger events for analytics
}

export async function POST(request: NextRequest) {
  try {
    const body: TriggerRulesRequest = await request.json()
    const { project_id, trace_id, thread_id, event_type } = body
    
    if (!project_id || !trace_id || !event_type) {
      return NextResponse.json({
        success: false,
        error: 'Project ID, trace ID, and event type are required'
      }, { status: 400 })
    }
    
    // Get active rules for the project
    const activeRules = await getActiveProjectRules(project_id)
    
    if (activeRules.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active rules found for project',
        data: {
          triggered_rules: 0,
          skipped_rules: 0
        }
      })
    }
    
    const triggeredRules: string[] = []
    const skippedRules: string[] = []
    const executionPromises: Promise<any>[] = []
    
    // Process each active rule
    for (const rule of activeRules) {
      // Check if rule should be sampled
      if (!shouldSampleRule(rule.sampling_rate)) {
        skippedRules.push(rule.id)
        continue
      }
      
      // Filter rules based on event type
      if (rule.type === 'trace_evaluation' && event_type !== 'trace_completed') {
        skippedRules.push(rule.id)
        continue
      }
      
      if (rule.type === 'thread_evaluation' && event_type !== 'thread_completed') {
        skippedRules.push(rule.id)
        continue
      }
      
      // Trigger rule execution
      triggeredRules.push(rule.id)
      executionPromises.push(executeRuleAsync(rule.id, trace_id, thread_id))
    }
    
    // Log trigger event
    logRuleTriggerEvent(project_id, trace_id, triggeredRules)
    
    // Execute rules in parallel (fire and forget for performance)
    if (executionPromises.length > 0) {
      Promise.allSettled(executionPromises).then(results => {
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
        const failCount = results.length - successCount
        
        console.log(`Rule execution summary for trace ${trace_id}:`, {
          total_triggered: triggeredRules.length,
          successful: successCount,
          failed: failCount
        })
      })
    }
    
    return NextResponse.json({
      success: true,
      message: `Triggered ${triggeredRules.length} rules for evaluation`,
      data: {
        triggered_rules: triggeredRules.length,
        skipped_rules: skippedRules.length,
        rule_ids: triggeredRules,
        event_type,
        trace_id,
        project_id
      }
    })
    
  } catch (error: any) {
    console.error('Rule trigger API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

// GET endpoint to retrieve trigger statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const timeframe = searchParams.get('timeframe') || '24h'
    
    if (!projectId) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 })
    }
    
    // Mock trigger statistics
    const stats = {
      timeframe,
      total_triggers: 1247,
      successful_triggers: 1198,
      failed_triggers: 49,
      rules_triggered: {
        'rule_hallucination_001': 312,
        'rule_moderation_001': 1247,
        'rule_relevance_001': 187
      },
      sampling_stats: {
        total_eligible: 4988,
        sampled: 1247,
        sampling_rate_average: 25
      },
      performance: {
        average_trigger_latency: 45, // ms
        average_execution_time: 1250 // ms
      }
    }
    
    return NextResponse.json({
      success: true,
      data: stats
    })
    
  } catch (error: any) {
    console.error('Rule trigger stats API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}