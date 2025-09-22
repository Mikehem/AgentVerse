// Utility functions for metrics calculations and data processing

import { 
  PromptExecutionMetrics, 
  PromptVersionMetricsSummary, 
  MetricTimeSeries, 
  VersionComparison,
  TrendDirection,
  MetricInsight,
  TimeRange,
  TimeGranularity,
  MetricType
} from '@/lib/types/metrics'

// Counter for unique insight IDs
let insightIdCounter = 0

// Generate unique insight ID with random component
const generateInsightId = (type: string): string => {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const counter = ++insightIdCounter
  return `${type}-insight-${timestamp}-${random}-${counter}`
}

// Time range utilities
export const createTimeRange = (preset: string): TimeRange => {
  const now = new Date()
  const start = new Date()
  
  switch (preset) {
    case 'last24h':
      start.setHours(now.getHours() - 24)
      return { start, end: now, preset: 'last24h' }
    case 'last7d':
      start.setDate(now.getDate() - 7)
      return { start, end: now, preset: 'last7d' }
    case 'last30d':
      start.setDate(now.getDate() - 30)
      return { start, end: now, preset: 'last30d' }
    case 'last90d':
      start.setDate(now.getDate() - 90)
      return { start, end: now, preset: 'last90d' }
    default:
      start.setDate(now.getDate() - 7)
      return { start, end: now, preset: 'last7d' }
  }
}

export const formatTimeRange = (timeRange: TimeRange): string => {
  if (timeRange.preset) {
    switch (timeRange.preset) {
      case 'last24h': return 'Last 24 hours'
      case 'last7d': return 'Last 7 days'
      case 'last30d': return 'Last 30 days'
      case 'last90d': return 'Last 90 days'
    }
  }
  
  const formatDate = (date: Date) => date.toLocaleDateString()
  return `${formatDate(timeRange.start)} - ${formatDate(timeRange.end)}`
}

// Aggregation functions
export const aggregateExecutionMetrics = (
  executions: PromptExecutionMetrics[]
): PromptVersionMetricsSummary => {
  if (executions.length === 0) {
    return createEmptyMetricsSummary()
  }
  
  const successful = executions.filter(e => e.success)
  const failed = executions.filter(e => !e.success)
  
  // Cost calculations
  const costs = executions.map(e => e.totalCost)
  const totalCost = costs.reduce((sum, cost) => sum + cost, 0)
  const avgCostPerRequest = totalCost / executions.length
  
  // Performance calculations
  const latencies = executions.map(e => e.latencyMs)
  const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length
  const sortedLatencies = [...latencies].sort((a, b) => a - b)
  const medianLatency = sortedLatencies[Math.floor(sortedLatencies.length / 2)]
  const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)]
  const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)]
  
  // Token calculations
  const totalInputTokens = executions.reduce((sum, e) => sum + e.inputTokens, 0)
  const totalOutputTokens = executions.reduce((sum, e) => sum + e.outputTokens, 0)
  const totalTokens = totalInputTokens + totalOutputTokens
  const avgTokensPerRequest = totalTokens / executions.length
  
  return {
    promptVersionId: executions[0].promptVersionId,
    timeRange: {
      start: new Date(Math.min(...executions.map(e => e.executedAt.getTime()))),
      end: new Date(Math.max(...executions.map(e => e.executedAt.getTime())))
    },
    totalRequests: executions.length,
    successfulRequests: successful.length,
    failedRequests: failed.length,
    successRate: successful.length / executions.length,
    totalCost,
    avgCostPerRequest,
    minCost: Math.min(...costs),
    maxCost: Math.max(...costs),
    costEfficiency: executions.length / totalCost,
    avgLatencyMs: avgLatency,
    medianLatencyMs: medianLatency,
    p95LatencyMs: p95Latency,
    p99LatencyMs: p99Latency,
    avgProcessingTimeMs: executions.reduce((sum, e) => sum + e.processingTimeMs, 0) / executions.length,
    totalInputTokens,
    totalOutputTokens,
    totalTokens,
    avgTokensPerRequest,
    tokenEfficiency: successful.length / totalTokens,
    avgRating: 0, // Will be calculated separately from feedback
    totalFeedbackCount: 0,
    positiveFeedbackCount: 0,
    negativeFeedbackCount: 0,
    feedbackRate: 0,
    errorRate: failed.length / executions.length,
    timeoutRate: failed.filter(e => e.errorType === 'timeout').length / executions.length,
    retryRate: 0 // Would need additional data to calculate
  }
}

const createEmptyMetricsSummary = (): PromptVersionMetricsSummary => ({
  promptVersionId: '',
  timeRange: { start: new Date(), end: new Date() },
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  successRate: 0,
  totalCost: 0,
  avgCostPerRequest: 0,
  minCost: 0,
  maxCost: 0,
  costEfficiency: 0,
  avgLatencyMs: 0,
  medianLatencyMs: 0,
  p95LatencyMs: 0,
  p99LatencyMs: 0,
  avgProcessingTimeMs: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  avgTokensPerRequest: 0,
  tokenEfficiency: 0,
  avgRating: 0,
  totalFeedbackCount: 0,
  positiveFeedbackCount: 0,
  negativeFeedbackCount: 0,
  feedbackRate: 0,
  errorRate: 0,
  timeoutRate: 0,
  retryRate: 0
})

// Time series generation
export const generateTimeSeries = (
  executions: PromptExecutionMetrics[],
  metricType: MetricType,
  granularity: TimeGranularity
): MetricTimeSeries[] => {
  const grouped = groupExecutionsByTime(executions, granularity)
  
  return Object.entries(grouped).map(([timestamp, groupedExecutions]) => {
    const value = calculateMetricValue(groupedExecutions, metricType)
    return {
      timestamp: new Date(timestamp),
      value,
      count: groupedExecutions.length,
      metadata: { executions: groupedExecutions.length }
    }
  }).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
}

const groupExecutionsByTime = (
  executions: PromptExecutionMetrics[],
  granularity: TimeGranularity
): Record<string, PromptExecutionMetrics[]> => {
  const grouped: Record<string, PromptExecutionMetrics[]> = {}
  
  executions.forEach(execution => {
    const timeKey = getTimeKey(execution.executedAt, granularity)
    if (!grouped[timeKey]) {
      grouped[timeKey] = []
    }
    grouped[timeKey].push(execution)
  })
  
  return grouped
}

const getTimeKey = (date: Date, granularity: TimeGranularity): string => {
  const d = new Date(date)
  
  switch (granularity) {
    case 'hour':
      d.setMinutes(0, 0, 0)
      break
    case 'day':
      d.setHours(0, 0, 0, 0)
      break
    case 'week':
      const dayOfWeek = d.getDay()
      d.setDate(d.getDate() - dayOfWeek)
      d.setHours(0, 0, 0, 0)
      break
    case 'month':
      d.setDate(1)
      d.setHours(0, 0, 0, 0)
      break
  }
  
  return d.toISOString()
}

const calculateMetricValue = (
  executions: PromptExecutionMetrics[],
  metricType: MetricType
): number => {
  if (executions.length === 0) return 0
  
  switch (metricType) {
    case 'cost':
      return executions.reduce((sum, e) => sum + e.totalCost, 0) / executions.length
    case 'performance':
      return executions.reduce((sum, e) => sum + e.latencyMs, 0) / executions.length
    case 'tokens':
      return executions.reduce((sum, e) => sum + e.totalTokens, 0) / executions.length
    case 'volume':
      return executions.length
    case 'reliability':
      return executions.filter(e => e.success).length / executions.length * 100
    case 'efficiency':
      const totalCost = executions.reduce((sum, e) => sum + e.totalCost, 0)
      const successfulRequests = executions.filter(e => e.success).length
      return totalCost > 0 ? successfulRequests / totalCost : 0
    default:
      return 0
  }
}

// Comparison functions
export const compareVersions = (
  versionA: PromptVersionMetricsSummary,
  versionB: PromptVersionMetricsSummary,
  metricType: MetricType
): VersionComparison => {
  const valueA = getMetricValue(versionA, metricType)
  const valueB = getMetricValue(versionB, metricType)
  
  const difference = valueB - valueA
  const percentageChange = valueA !== 0 ? (difference / valueA) * 100 : 0
  
  // Simple significance test (would use proper statistical tests in production)
  const isSignificant = Math.abs(percentageChange) > 5 // 5% threshold
  const confidenceLevel = Math.min(95, Math.abs(percentageChange) * 2) // Simplified
  
  let interpretation: 'improvement' | 'regression' | 'no_change'
  if (!isSignificant) {
    interpretation = 'no_change'
  } else if (isMetricBetter(metricType, valueB, valueA)) {
    interpretation = 'improvement'
  } else {
    interpretation = 'regression'
  }
  
  const severity = Math.abs(percentageChange) > 20 ? 'major' : 
                  Math.abs(percentageChange) > 10 ? 'moderate' : 'minor'
  
  return {
    versionA: versionA.promptVersionId,
    versionB: versionB.promptVersionId,
    metricType,
    valueA,
    valueB,
    difference,
    percentageChange,
    isSignificant,
    confidenceLevel,
    interpretation,
    severity
  }
}

const getMetricValue = (summary: PromptVersionMetricsSummary, metricType: MetricType): number => {
  switch (metricType) {
    case 'cost': return summary.avgCostPerRequest
    case 'performance': return summary.avgLatencyMs
    case 'quality': return summary.avgRating
    case 'tokens': return summary.avgTokensPerRequest
    case 'volume': return summary.totalRequests
    case 'efficiency': return summary.costEfficiency
    case 'reliability': return summary.successRate * 100
    default: return 0
  }
}

const isMetricBetter = (metricType: MetricType, newValue: number, oldValue: number): boolean => {
  // For some metrics, lower is better (cost, latency)
  // For others, higher is better (quality, efficiency)
  switch (metricType) {
    case 'cost':
    case 'performance':
      return newValue < oldValue
    case 'quality':
    case 'efficiency':
    case 'reliability':
    case 'volume':
      return newValue > oldValue
    case 'tokens':
      return newValue < oldValue // Assuming fewer tokens for same result is better
    default:
      return newValue > oldValue
  }
}

// Trend analysis
export const calculateTrend = (
  timeSeries: MetricTimeSeries[],
  lookbackPeriods: number = 7
): TrendDirection => {
  if (timeSeries.length < 2) return 'stable'
  
  const recent = timeSeries.slice(-lookbackPeriods)
  const older = timeSeries.slice(-lookbackPeriods * 2, -lookbackPeriods)
  
  if (recent.length === 0 || older.length === 0) return 'stable'
  
  const recentAvg = recent.reduce((sum, point) => sum + point.value, 0) / recent.length
  const olderAvg = older.reduce((sum, point) => sum + point.value, 0) / older.length
  
  const changePercent = ((recentAvg - olderAvg) / olderAvg) * 100
  
  if (Math.abs(changePercent) < 5) return 'stable'
  return changePercent > 0 ? 'up' : 'down'
}

// Insight generation
export const generateCostInsight = (
  current: PromptVersionMetricsSummary,
  previous: PromptVersionMetricsSummary
): MetricInsight | null => {
  const costChange = ((current.avgCostPerRequest - previous.avgCostPerRequest) / previous.avgCostPerRequest) * 100
  
  if (Math.abs(costChange) < 10) return null // Not significant enough
  
  const isIncrease = costChange > 0
  const severity = Math.abs(costChange) > 25 ? 'critical' : 
                  Math.abs(costChange) > 15 ? 'warning' : 'info'
  
  const estimatedImpact = {
    costSavings: isIncrease ? 0 : Math.abs(costChange) * current.totalRequests * current.avgCostPerRequest / 100
  }
  
  return {
    id: generateInsightId('cost'),
    type: 'trend',
    severity,
    title: `Cost ${isIncrease ? 'Increase' : 'Decrease'} Detected`,
    description: `Average cost per request has ${isIncrease ? 'increased' : 'decreased'} by ${Math.abs(costChange).toFixed(1)}%`,
    promptId: '', // Would be filled by calling code
    versionIds: [current.promptVersionId],
    metricTypes: ['cost'],
    timeRange: current.timeRange,
    evidence: {
      currentValue: current.avgCostPerRequest,
      previousValue: previous.avgCostPerRequest,
      trend: isIncrease ? 'up' : 'down'
    },
    actionable: true,
    recommendations: isIncrease ? [
      'Review recent prompt template changes',
      'Check if token usage has increased',
      'Consider optimizing prompt length'
    ] : [
      'Document optimization for future reference',
      'Consider applying changes to other prompts'
    ],
    estimatedImpact,
    confidence: Math.min(0.95, Math.abs(costChange) / 100),
    createdAt: new Date()
  }
}

export const generatePerformanceInsight = (
  current: PromptVersionMetricsSummary,
  previous: PromptVersionMetricsSummary
): MetricInsight | null => {
  const latencyChange = ((current.avgLatencyMs - previous.avgLatencyMs) / previous.avgLatencyMs) * 100
  
  if (Math.abs(latencyChange) < 15) return null
  
  const isSlower = latencyChange > 0
  const severity = Math.abs(latencyChange) > 50 ? 'critical' : 
                  Math.abs(latencyChange) > 25 ? 'warning' : 'info'
  
  return {
    id: generateInsightId('performance'),
    type: 'trend',
    severity,
    title: `Performance ${isSlower ? 'Degradation' : 'Improvement'} Detected`,
    description: `Response time has ${isSlower ? 'increased' : 'decreased'} by ${Math.abs(latencyChange).toFixed(1)}%`,
    promptId: '',
    versionIds: [current.promptVersionId],
    metricTypes: ['performance'],
    timeRange: current.timeRange,
    evidence: {
      currentValue: current.avgLatencyMs,
      previousValue: previous.avgLatencyMs,
      trend: isSlower ? 'up' : 'down'
    },
    actionable: true,
    recommendations: isSlower ? [
      'Check system resource utilization',
      'Review prompt complexity',
      'Monitor model provider status'
    ] : [
      'Document optimization techniques',
      'Monitor for sustained improvement'
    ],
    confidence: Math.min(0.95, Math.abs(latencyChange) / 100),
    createdAt: new Date()
  }
}

// Formatting utilities
export const formatMetricValue = (value: number, metricType: MetricType): string => {
  switch (metricType) {
    case 'cost':
      return `$${value.toFixed(4)}`
    case 'performance':
      return `${value.toFixed(0)}ms`
    case 'quality':
      return `${value.toFixed(1)}/5.0`
    case 'tokens':
      return value.toLocaleString()
    case 'volume':
      return value.toLocaleString()
    case 'efficiency':
      return `${value.toFixed(2)}`
    case 'reliability':
      return `${value.toFixed(1)}%`
    default:
      return value.toFixed(2)
  }
}

export const formatPercentageChange = (change: number): string => {
  const sign = change > 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}%`
}

export const getMetricColor = (metricType: MetricType, value: number, isGood: boolean): string => {
  if (isGood) {
    return 'text-green-600'
  } else {
    return 'text-red-600'
  }
}

export const getTrendIcon = (trend: TrendDirection): string => {
  switch (trend) {
    case 'up': return '📈'
    case 'down': return '📉'
    case 'stable': return '📊'
  }
}

// Statistical utilities
export const calculateStatisticalSignificance = (
  sampleA: number[],
  sampleB: number[]
): { isSignificant: boolean; pValue: number; confidenceLevel: number } => {
  // Simplified t-test implementation
  // In production, would use a proper statistical library
  
  const meanA = sampleA.reduce((sum, val) => sum + val, 0) / sampleA.length
  const meanB = sampleB.reduce((sum, val) => sum + val, 0) / sampleB.length
  
  const varianceA = sampleA.reduce((sum, val) => sum + Math.pow(val - meanA, 2), 0) / (sampleA.length - 1)
  const varianceB = sampleB.reduce((sum, val) => sum + Math.pow(val - meanB, 2), 0) / (sampleB.length - 1)
  
  const pooledStd = Math.sqrt(((sampleA.length - 1) * varianceA + (sampleB.length - 1) * varianceB) / 
                             (sampleA.length + sampleB.length - 2))
  
  const tStat = Math.abs(meanA - meanB) / (pooledStd * Math.sqrt(1/sampleA.length + 1/sampleB.length))
  
  // Simplified p-value calculation
  const pValue = 2 * (1 - normalCDF(Math.abs(tStat)))
  const isSignificant = pValue < 0.05
  const confidenceLevel = (1 - pValue) * 100
  
  return { isSignificant, pValue, confidenceLevel }
}

// Simplified normal CDF for statistical calculations
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp(-x * x / 2)
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  if (x > 0) prob = 1 - prob
  return prob
}