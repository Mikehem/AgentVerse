export interface Rule {
  id: string
  name: string
  description?: string
  project_id: string
  type: 'llm_judge' | 'trace_evaluation' | 'thread_evaluation'
  status: 'active' | 'inactive' | 'draft'
  sampling_rate: number // 0-100 percentage
  model: 'gpt-4o' | 'gpt-4o-mini'
  metric_type: 'hallucination' | 'moderation' | 'relevance' | 'coherence' | 'frustration' | 'custom'
  
  // Rule configuration
  config: {
    prompt: string
    variables: string[] // Variables to extract from traces
    score_definition: {
      type: 'binary' | 'scale' | 'categorical'
      scale?: { min: number; max: number }
      categories?: string[]
    }
    conditions?: {
      trace_filters?: {
        agent_id?: string[]
        status?: string[]
        min_tokens?: number
        max_tokens?: number
      }
      thread_filters?: {
        min_messages?: number
        max_messages?: number
        inactive_duration?: number // minutes
      }
    }
  }
  
  // Execution stats
  stats: {
    total_executions: number
    successful_executions: number
    failed_executions: number
    last_execution?: string
    average_score?: number
    execution_cost: number
  }
  
  created_at: string
  updated_at: string
  created_by: string
}

export interface RuleExecution {
  id: string
  rule_id: string
  trace_id: string
  thread_id?: string
  status: 'pending' | 'completed' | 'failed'
  score?: number | string
  reasoning?: string
  execution_time: number
  cost: number
  model_used: string
  created_at: string
  error?: string
}

export interface RuleTemplate {
  id: string
  name: string
  description: string
  type: Rule['type']
  metric_type: Rule['metric_type']
  config: Partial<Rule['config']>
  is_built_in: boolean
}

export interface RuleMetrics {
  rule_id: string
  project_id: string
  time_period: '24h' | '7d' | '30d'
  total_executions: number
  success_rate: number
  average_score: number
  score_distribution: { [key: string]: number }
  cost_breakdown: {
    total_cost: number
    cost_per_execution: number
  }
  performance_trends: {
    date: string
    executions: number
    average_score: number
    cost: number
  }[]
}