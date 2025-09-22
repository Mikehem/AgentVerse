// Mock data generators for metrics testing and development

import { 
  PromptExecutionMetrics, 
  PromptVersionMetricsSummary, 
  PromptOverviewMetrics,
  MetricInsight,
  VersionComparisonMatrix,
  RealtimeMetrics,
  PromptFeedback,
  MetricTimeSeries,
  ScatterPlotData,
  TimeRange
} from '@/lib/types/metrics'
import { createTimeRange, aggregateExecutionMetrics } from './metricsUtils'

// Counter for unique mock insight IDs
let mockInsightIdCounter = 0

// Generate unique mock insight ID
const generateMockInsightId = (type: string): string => {
  return `${type}-insight-${Date.now()}-${++mockInsightIdCounter}`
}

// Mock prompt execution data
export const generateMockExecutions = (
  count: number,
  promptVersionId: string,
  timeRange: TimeRange,
  config?: {
    successRate?: number
    avgLatency?: number
    avgCost?: number
    avgTokens?: number
  }
): PromptExecutionMetrics[] => {
  const executions: PromptExecutionMetrics[] = []
  const { successRate = 0.95, avgLatency = 1500, avgCost = 0.025, avgTokens = 800 } = config || {}
  
  const timeSpan = timeRange.end.getTime() - timeRange.start.getTime()
  
  for (let i = 0; i < count; i++) {
    const executedAt = new Date(timeRange.start.getTime() + (timeSpan * Math.random()))
    const success = Math.random() < successRate
    
    // Generate realistic variations
    const latencyVariation = 0.3 // 30% variation
    const costVariation = 0.25 // 25% variation
    const tokenVariation = 0.4 // 40% variation
    
    const latency = avgLatency * (1 + (Math.random() - 0.5) * latencyVariation)
    const cost = avgCost * (1 + (Math.random() - 0.5) * costVariation)
    const tokens = avgTokens * (1 + (Math.random() - 0.5) * tokenVariation)
    
    const inputTokens = Math.floor(tokens * 0.3) // 30% input, 70% output typically
    const outputTokens = Math.floor(tokens * 0.7)
    
    executions.push({
      id: `exec-${i}-${promptVersionId}`,
      promptVersionId,
      conversationId: `conv-${Math.floor(Math.random() * 1000)}`,
      agentId: `agent-${Math.floor(Math.random() * 10)}`,
      projectId: 'project-test',
      executedAt,
      executionDurationMs: Math.floor(latency + Math.random() * 200),
      latencyMs: Math.floor(latency),
      processingTimeMs: Math.floor(latency * 0.8),
      success,
      errorMessage: success ? undefined : getRandomErrorMessage(),
      errorType: success ? undefined : getRandomErrorType(),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      inputCost: cost * 0.3,
      outputCost: cost * 0.7,
      totalCost: cost,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      userAgent: 'SprintAgentLens/1.0',
      requestSource: 'web',
      sessionId: `session-${Math.floor(Math.random() * 100)}`
    })
  }
  
  return executions.sort((a, b) => a.executedAt.getTime() - b.executedAt.getTime())
}

const getRandomErrorMessage = (): string => {
  const errors = [
    'Request timeout after 30 seconds',
    'Rate limit exceeded',
    'Model temporarily unavailable',
    'Invalid input format',
    'Token limit exceeded'
  ]
  return errors[Math.floor(Math.random() * errors.length)]
}

const getRandomErrorType = (): 'timeout' | 'rate_limit' | 'model_error' | 'validation_error' => {
  const types: ('timeout' | 'rate_limit' | 'model_error' | 'validation_error')[] = [
    'timeout', 'rate_limit', 'model_error', 'validation_error'
  ]
  return types[Math.floor(Math.random() * types.length)]
}

// Generate mock feedback data
export const generateMockFeedback = (
  executions: PromptExecutionMetrics[],
  feedbackRate: number = 0.15
): PromptFeedback[] => {
  const feedback: PromptFeedback[] = []
  
  const executionsWithFeedback = executions
    .filter(e => e.success) // Only successful executions get feedback
    .filter(() => Math.random() < feedbackRate)
  
  executionsWithFeedback.forEach((execution, index) => {
    // Generate realistic rating distribution (slightly skewed positive)
    const rating = Math.random() < 0.7 ? 
      Math.ceil(Math.random() * 2) + 3 : // 4-5 stars (70% chance)
      Math.ceil(Math.random() * 3) + 1   // 1-3 stars (30% chance)
    
    const feedbackTypes: ('explicit' | 'implicit' | 'thumbs_up' | 'thumbs_down' | 'rating')[] = [
      'explicit', 'rating', 'thumbs_up', 'thumbs_down'
    ]
    
    feedback.push({
      id: `feedback-${index}-${execution.id}`,
      promptExecutionId: execution.id,
      conversationId: execution.conversationId,
      rating,
      feedbackText: rating >= 4 ? getPositiveFeedback() : getNegativeFeedback(),
      feedbackType: feedbackTypes[Math.floor(Math.random() * feedbackTypes.length)],
      userId: `user-${Math.floor(Math.random() * 50)}`,
      createdAt: new Date(execution.executedAt.getTime() + Math.random() * 60000), // Within 1 minute
      categories: rating >= 4 ? ['helpfulness', 'accuracy'] : ['clarity', 'relevance'],
      sentiment: rating >= 4 ? 'positive' : rating >= 3 ? 'neutral' : 'negative'
    })
  })
  
  return feedback
}

const getPositiveFeedback = (): string => {
  const positive = [
    'Very helpful response, exactly what I needed!',
    'Clear and accurate information',
    'Great explanation, easy to understand',
    'Perfect response time and quality',
    'Solved my problem quickly'
  ]
  return positive[Math.floor(Math.random() * positive.length)]
}

const getNegativeFeedback = (): string => {
  const negative = [
    'Response was too slow',
    'Not quite what I was looking for',
    'Could be more detailed',
    'Partially correct but missing context',
    'Response was confusing'
  ]
  return negative[Math.floor(Math.random() * negative.length)]
}

// Generate mock version data
export const generateMockVersionSummaries = (
  promptId: string,
  versionCount: number = 4
): PromptVersionMetricsSummary[] => {
  const timeRange = createTimeRange('last7d')
  const summaries: PromptVersionMetricsSummary[] = []
  
  for (let i = 0; i < versionCount; i++) {
    const versionId = `${promptId}-v${i + 1}`
    const versionNumber = i + 1
    
    // Create different performance profiles for each version
    const profiles = [
      { requests: 1200, cost: 0.025, latency: 1800, rating: 4.1 }, // Version 1: High volume, avg performance
      { requests: 800, cost: 0.022, latency: 1500, rating: 4.3 },  // Version 2: Lower cost, better rating
      { requests: 200, cost: 0.030, latency: 1200, rating: 4.7 },  // Version 3: Fast but expensive
      { requests: 50, cost: 0.028, latency: 1600, rating: 4.0 }    // Version 4: New/testing
    ]
    
    const profile = profiles[i] || profiles[0]
    const executions = generateMockExecutions(profile.requests, versionId, timeRange, {
      avgCost: profile.cost,
      avgLatency: profile.latency,
      successRate: 0.92 + Math.random() * 0.08 // 92-100% success rate
    })
    
    const feedback = generateMockFeedback(executions)
    let summary = aggregateExecutionMetrics(executions)
    
    // Add feedback metrics
    summary.avgRating = profile.rating
    summary.totalFeedbackCount = feedback.length
    summary.positiveFeedbackCount = feedback.filter(f => f.rating >= 4).length
    summary.negativeFeedbackCount = feedback.filter(f => f.rating <= 2).length
    summary.feedbackRate = feedback.length / executions.length
    
    summaries.push(summary)
  }
  
  return summaries
}

// Generate mock overview metrics
export const generateMockPromptOverview = (promptId: string): PromptOverviewMetrics => {
  const timeRange = createTimeRange('last7d')
  const versionSummaries = generateMockVersionSummaries(promptId, 4)
  
  // Calculate totals
  const totalRequests = versionSummaries.reduce((sum, v) => sum + v.totalRequests, 0)
  const totalCost = versionSummaries.reduce((sum, v) => sum + v.totalCost, 0)
  const avgResponseTime = versionSummaries.reduce((sum, v) => sum + v.avgLatencyMs * v.totalRequests, 0) / totalRequests
  const avgRating = versionSummaries.reduce((sum, v) => sum + v.avgRating * v.totalFeedbackCount, 0) / 
                   versionSummaries.reduce((sum, v) => sum + v.totalFeedbackCount, 0)
  
  // Determine best performing versions
  const bestCost = versionSummaries.reduce((best, current) => 
    current.avgCostPerRequest < best.avgCostPerRequest ? current : best
  )
  const bestSpeed = versionSummaries.reduce((best, current) => 
    current.avgLatencyMs < best.avgLatencyMs ? current : best
  )
  const bestQuality = versionSummaries.reduce((best, current) => 
    current.avgRating > best.avgRating ? current : best
  )
  
  return {
    promptId,
    promptName: 'Customer Support Assistant',
    timeRange,
    summary: {
      totalRequests,
      totalCost,
      avgResponseTime,
      avgRating,
      activeVersions: versionSummaries.filter(v => v.totalRequests > 100).length
    },
    versions: versionSummaries.map((summary, index) => ({
      versionId: summary.promptVersionId,
      versionNumber: index + 1,
      status: index === 0 ? 'active' : index === versionSummaries.length - 1 ? 'testing' : 'draft',
      summary,
      trend: index % 3 === 0 ? 'up' : index % 3 === 1 ? 'stable' : 'down',
      isRecommended: summary.promptVersionId === bestQuality.promptVersionId
    })),
    bestPerforming: {
      cost: bestCost.promptVersionId,
      speed: bestSpeed.promptVersionId,
      quality: bestQuality.promptVersionId,
      overall: bestQuality.promptVersionId
    },
    insights: generateMockInsights(promptId, versionSummaries),
    alerts: generateMockAlerts(promptId, versionSummaries),
    trends: {
      cost: 'down',
      performance: 'up',
      quality: 'up',
      volume: 'up'
    }
  }
}

// Generate mock insights
export const generateMockInsights = (
  promptId: string,
  versions: PromptVersionMetricsSummary[]
): MetricInsight[] => {
  const insights: MetricInsight[] = []
  const timeRange = createTimeRange('last7d')
  
  // Cost optimization insight
  const bestCost = Math.min(...versions.map(v => v.avgCostPerRequest))
  const worstCost = Math.max(...versions.map(v => v.avgCostPerRequest))
  const costSavings = (worstCost - bestCost) * versions[0].totalRequests
  
  insights.push({
    id: `${generateMockInsightId('cost')}`,
    type: 'recommendation',
    severity: 'info',
    title: 'Cost Optimization Opportunity',
    description: `Switching to the most cost-efficient version could save $${costSavings.toFixed(2)} per week`,
    promptId,
    versionIds: [versions.find(v => v.avgCostPerRequest === bestCost)?.promptVersionId || ''],
    metricTypes: ['cost'],
    timeRange,
    evidence: {
      currentValue: worstCost,
      previousValue: bestCost,
      trend: 'down'
    },
    actionable: true,
    recommendations: [
      'Review template efficiency in the cost-optimal version',
      'Consider gradual rollout to validate quality',
      'Monitor user satisfaction during transition'
    ],
    estimatedImpact: {
      costSavings: costSavings * 4 // Monthly savings
    },
    confidence: 0.85,
    createdAt: new Date()
  })
  
  // Performance insight
  const avgLatency = versions.reduce((sum, v) => sum + v.avgLatencyMs, 0) / versions.length
  insights.push({
    id: `${generateMockInsightId('performance')}`,
    type: 'trend',
    severity: 'warning',
    title: 'Response Time Variation',
    description: `Response times vary significantly across versions (${Math.min(...versions.map(v => v.avgLatencyMs))}ms to ${Math.max(...versions.map(v => v.avgLatencyMs))}ms)`,
    promptId,
    versionIds: versions.map(v => v.promptVersionId),
    metricTypes: ['performance'],
    timeRange,
    evidence: {
      currentValue: avgLatency,
      trend: 'stable'
    },
    actionable: true,
    recommendations: [
      'Investigate why some versions are slower',
      'Consider template complexity optimization',
      'Monitor infrastructure performance'
    ],
    confidence: 0.78,
    createdAt: new Date()
  })
  
  return insights
}

// Generate mock alerts
export const generateMockAlerts = (
  promptId: string,
  versions: PromptVersionMetricsSummary[]
): MetricInsight[] => {
  const alerts: MetricInsight[] = []
  const timeRange = createTimeRange('last24h')
  
  // Check for any version with low success rate
  const lowPerformingVersion = versions.find(v => v.successRate < 0.95)
  if (lowPerformingVersion) {
    alerts.push({
      id: `alert-reliability-${Date.now()}`,
      type: 'alert',
      severity: 'critical',
      title: 'High Error Rate Detected',
      description: `Version ${lowPerformingVersion.promptVersionId} has a ${((1 - lowPerformingVersion.successRate) * 100).toFixed(1)}% error rate`,
      promptId,
      versionIds: [lowPerformingVersion.promptVersionId],
      metricTypes: ['reliability'],
      timeRange,
      evidence: {
        currentValue: lowPerformingVersion.successRate * 100,
        threshold: 95,
        trend: 'down'
      },
      actionable: true,
      recommendations: [
        'Investigate recent changes to this version',
        'Check model provider status',
        'Consider rolling back to previous stable version'
      ],
      confidence: 0.95,
      createdAt: new Date()
    })
  }
  
  return alerts
}

// Generate mock time series data
export const generateMockTimeSeries = (
  promptVersionId: string,
  metricType: 'cost' | 'performance' | 'quality' | 'volume',
  days: number = 7
): MetricTimeSeries[] => {
  const data: MetricTimeSeries[] = []
  const now = new Date()
  
  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    
    let value: number
    let trend = 0
    
    switch (metricType) {
      case 'cost':
        value = 0.025 + Math.random() * 0.01 - 0.005 // $0.020 - $0.030
        trend = -0.001 // Slight downward trend
        break
      case 'performance':
        value = 1500 + Math.random() * 600 - 300 // 1200ms - 1800ms
        trend = -20 // Slight improvement
        break
      case 'quality':
        value = 4.2 + Math.random() * 0.6 - 0.3 // 3.9 - 4.8
        trend = 0.02 // Slight improvement
        break
      case 'volume':
        value = 150 + Math.random() * 100 - 50 // 100 - 200 requests
        trend = 5 // Growing volume
        break
      default:
        value = Math.random() * 100
    }
    
    // Apply trend
    value += trend * (days - i)
    
    data.push({
      timestamp,
      value,
      count: Math.floor(100 + Math.random() * 100),
      metadata: {
        promptVersionId,
        metricType,
        dayOfWeek: timestamp.getDay()
      }
    })
  }
  
  return data
}

// Generate scatter plot data for cost vs performance comparison
export const generateMockScatterData = (
  versions: PromptVersionMetricsSummary[]
): ScatterPlotData[] => {
  return versions.map((version, index) => ({
    versionId: version.promptVersionId,
    versionName: `v${index + 1}`,
    x: version.avgCostPerRequest * 1000, // Convert to cents for better visualization
    y: version.avgRating,
    size: Math.log(version.totalRequests) * 10, // Size based on volume
    color: getVersionColor(index),
    status: index === 0 ? 'active' : index === versions.length - 1 ? 'testing' : 'draft',
    metadata: version
  }))
}

const getVersionColor = (index: number): string => {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444']
  return colors[index % colors.length]
}

// Generate mock real-time metrics
export const generateMockRealtimeMetrics = (promptId: string): RealtimeMetrics => {
  const recentExecutions = Array.from({ length: 10 }, (_, i) => ({
    executionId: `exec-realtime-${i}`,
    success: Math.random() > 0.1,
    latencyMs: Math.floor(1200 + Math.random() * 800),
    cost: 0.02 + Math.random() * 0.02,
    timestamp: new Date(Date.now() - i * 30000) // Last 5 minutes
  }))
  
  return {
    promptId,
    timestamp: new Date(),
    current: {
      requestsPerMinute: 12 + Math.floor(Math.random() * 8),
      avgLatency: 1450 + Math.floor(Math.random() * 300),
      errorRate: Math.random() * 0.05, // 0-5%
      avgCost: 0.025 + Math.random() * 0.01
    },
    recentExecutions,
    activeAlerts: []
  }
}

// Generate comparison matrix
export const generateMockComparisonMatrix = (
  versions: PromptVersionMetricsSummary[]
): VersionComparisonMatrix => {
  const versionIds = versions.map(v => v.promptVersionId)
  const metrics: ('cost' | 'performance' | 'quality' | 'efficiency')[] = ['cost', 'performance', 'quality', 'efficiency']
  
  return {
    versions: versionIds,
    metrics,
    comparisons: [], // Would be populated with actual comparisons
    rankings: {
      cost: versions
        .map((v, i) => ({ versionId: v.promptVersionId, rank: i + 1, value: v.avgCostPerRequest }))
        .sort((a, b) => a.value - b.value)
        .map((item, index) => ({ ...item, rank: index + 1 })),
      performance: versions
        .map((v, i) => ({ versionId: v.promptVersionId, rank: i + 1, value: v.avgLatencyMs }))
        .sort((a, b) => a.value - b.value)
        .map((item, index) => ({ ...item, rank: index + 1 })),
      quality: versions
        .map((v, i) => ({ versionId: v.promptVersionId, rank: i + 1, value: v.avgRating }))
        .sort((a, b) => b.value - a.value)
        .map((item, index) => ({ ...item, rank: index + 1 }))
    }
  }
}