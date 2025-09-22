// Core metrics data types for prompt version analytics

export type MetricType = 
  | 'cost' 
  | 'performance' 
  | 'quality' 
  | 'tokens' 
  | 'volume'
  | 'efficiency'
  | 'reliability'

export type TimeGranularity = 'hour' | 'day' | 'week' | 'month'
export type MetricFocus = 'cost' | 'performance' | 'quality' | 'all'
export type TrendDirection = 'up' | 'down' | 'stable'
export type AlertSeverity = 'info' | 'warning' | 'critical'

// Time range utilities
export interface TimeRange {
  start: Date
  end: Date
  preset?: 'last24h' | 'last7d' | 'last30d' | 'last90d' | 'custom'
}

// Core execution metrics - captured for each prompt execution
export interface PromptExecutionMetrics {
  id: string
  promptVersionId: string
  conversationId: string
  agentId: string
  projectId: string
  
  // Timing
  executedAt: Date
  executionDurationMs: number
  latencyMs: number
  processingTimeMs: number
  
  // Success/Failure
  success: boolean
  errorMessage?: string
  errorType?: 'timeout' | 'rate_limit' | 'model_error' | 'validation_error'
  
  // Token metrics
  inputTokens: number
  outputTokens: number
  totalTokens: number
  
  // Cost metrics
  inputCost: number
  outputCost: number
  totalCost: number
  
  // Model configuration
  modelName: string
  temperature?: number
  maxTokens?: number
  
  // Additional metadata
  userAgent?: string
  requestSource?: string
  sessionId?: string
}

// User feedback for quality metrics
export interface PromptFeedback {
  id: string
  promptExecutionId: string
  conversationId: string
  
  // Feedback content
  rating: number // 1-5 scale
  feedbackText?: string
  feedbackType: 'explicit' | 'implicit' | 'thumbs_up' | 'thumbs_down' | 'rating'
  
  // Context
  userId?: string
  createdAt: Date
  
  // Categorization
  categories?: string[] // e.g., ['accuracy', 'helpfulness', 'relevance']
  sentiment?: 'positive' | 'negative' | 'neutral'
}

// Aggregated metrics for performance
export interface PromptVersionMetricsSummary {
  promptVersionId: string
  timeRange: TimeRange
  
  // Volume metrics
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  successRate: number
  
  // Cost metrics
  totalCost: number
  avgCostPerRequest: number
  minCost: number
  maxCost: number
  costEfficiency: number // requests per dollar
  
  // Performance metrics
  avgLatencyMs: number
  medianLatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  avgProcessingTimeMs: number
  
  // Token metrics
  totalInputTokens: number
  totalOutputTokens: number
  totalTokens: number
  avgTokensPerRequest: number
  tokenEfficiency: number // successful responses per token
  
  // Quality metrics
  avgRating: number
  totalFeedbackCount: number
  positiveFeedbackCount: number
  negativeFeedbackCount: number
  feedbackRate: number // percentage of executions with feedback
  
  // Reliability metrics
  errorRate: number
  timeoutRate: number
  retryRate: number
}

// Time series data for trend analysis
export interface MetricTimeSeries {
  timestamp: Date
  value: number
  count?: number // for averaging
  metadata?: Record<string, any>
}

export interface VersionTimeSeriesData {
  promptVersionId: string
  metricType: MetricType
  granularity: TimeGranularity
  timeRange: TimeRange
  data: MetricTimeSeries[]
}

// Version comparison data structures
export interface VersionComparison {
  versionA: string
  versionB: string
  metricType: MetricType
  
  valueA: number
  valueB: number
  difference: number
  percentageChange: number
  
  isSignificant: boolean
  confidenceLevel: number
  pValue?: number
  
  interpretation: 'improvement' | 'regression' | 'no_change'
  severity: 'minor' | 'moderate' | 'major'
}

export interface VersionComparisonMatrix {
  versions: string[]
  metrics: MetricType[]
  comparisons: VersionComparison[]
  
  // Statistical tests
  anovaResults?: {
    fStatistic: number
    pValue: number
    isSignificant: boolean
  }
  
  // Rankings
  rankings: {
    [metricType in MetricType]?: {
      versionId: string
      rank: number
      value: number
    }[]
  }
}

// Insights and recommendations
export interface MetricInsight {
  id: string
  type: 'trend' | 'anomaly' | 'comparison' | 'recommendation' | 'alert'
  severity: AlertSeverity
  
  title: string
  description: string
  
  // Context
  promptId: string
  versionIds: string[]
  metricTypes: MetricType[]
  timeRange: TimeRange
  
  // Data supporting the insight
  evidence: {
    currentValue: number
    previousValue?: number
    threshold?: number
    trend?: TrendDirection
  }
  
  // Actionability
  actionable: boolean
  recommendations?: string[]
  estimatedImpact?: {
    costSavings?: number
    performanceImprovement?: number
    qualityImprovement?: number
  }
  
  // Metadata
  confidence: number // 0-1
  createdAt: Date
  dismissed?: boolean
}

// Dashboard overview data
export interface PromptOverviewMetrics {
  promptId: string
  promptName: string
  timeRange: TimeRange
  
  // High-level summary
  summary: {
    totalRequests: number
    totalCost: number
    avgResponseTime: number
    avgRating: number
    activeVersions: number
  }
  
  // Version summaries
  versions: {
    versionId: string
    versionNumber: number
    status: 'active' | 'testing' | 'draft' | 'archived'
    summary: PromptVersionMetricsSummary
    trend: TrendDirection
    isRecommended: boolean
  }[]
  
  // Best performing versions
  bestPerforming: {
    cost: string // versionId
    speed: string
    quality: string
    overall: string
  }
  
  // Insights and alerts
  insights: MetricInsight[]
  alerts: MetricInsight[]
  
  // Trends
  trends: {
    cost: TrendDirection
    performance: TrendDirection
    quality: TrendDirection
    volume: TrendDirection
  }
}

// Real-time metrics for live updates
export interface RealtimeMetrics {
  promptId: string
  versionId?: string
  timestamp: Date
  
  // Current metrics (last 5 minutes)
  current: {
    requestsPerMinute: number
    avgLatency: number
    errorRate: number
    avgCost: number
  }
  
  // Live feed of recent executions
  recentExecutions: {
    executionId: string
    success: boolean
    latencyMs: number
    cost: number
    timestamp: Date
  }[]
  
  // Alerts
  activeAlerts: MetricInsight[]
}

// Chart data structures
export interface ChartDataPoint {
  x: number | Date | string
  y: number
  label?: string
  color?: string
  metadata?: Record<string, any>
}

export interface ScatterPlotData {
  versionId: string
  versionName: string
  x: number // e.g., cost
  y: number // e.g., rating
  size?: number // e.g., volume
  color: string
  status: 'active' | 'testing' | 'draft' | 'archived'
  metadata: PromptVersionMetricsSummary
}

export interface HeatmapData {
  versions: string[]
  metrics: MetricType[]
  data: number[][] // [versionIndex][metricIndex]
  colorScale: 'sequential' | 'diverging'
  annotations?: {
    version: string
    metric: MetricType
    text: string
  }[]
}

// Filter and query interfaces
export interface MetricsFilter {
  timeRange: TimeRange
  versions?: string[]
  metricTypes?: MetricType[]
  granularity: TimeGranularity
  includeArchived: boolean
  
  // Performance filters
  minSuccessRate?: number
  maxLatency?: number
  maxCost?: number
  minRating?: number
  
  // Segmentation
  segmentBy?: 'agent' | 'user_type' | 'time_of_day' | 'day_of_week'
}

export interface MetricsQuery {
  promptId: string
  filters: MetricsFilter
  aggregation: 'avg' | 'sum' | 'min' | 'max' | 'median' | 'p95' | 'p99'
  groupBy?: 'version' | 'time' | 'agent'
  limit?: number
  offset?: number
}

// Export and reporting
export interface MetricsReport {
  id: string
  title: string
  description?: string
  
  // Configuration
  promptId: string
  timeRange: TimeRange
  includedMetrics: MetricType[]
  includedVersions: string[]
  
  // Generated data
  summary: PromptOverviewMetrics
  detailedMetrics: PromptVersionMetricsSummary[]
  comparisons: VersionComparisonMatrix
  insights: MetricInsight[]
  
  // Metadata
  generatedAt: Date
  generatedBy: string
  format: 'pdf' | 'excel' | 'json' | 'csv'
}

// Notification and alerting
export interface MetricAlert {
  id: string
  name: string
  description: string
  
  // Trigger conditions
  promptId: string
  versionId?: string
  metricType: MetricType
  
  // Thresholds
  condition: 'greater_than' | 'less_than' | 'percentage_change' | 'anomaly'
  threshold: number
  timeWindow: number // minutes
  
  // Actions
  notificationChannels: ('email' | 'slack' | 'webhook')[]
  severity: AlertSeverity
  
  // State
  isActive: boolean
  lastTriggered?: Date
  triggerCount: number
  
  createdAt: Date
  updatedAt: Date
}

// API response wrappers
export interface MetricsAPIResponse<T> {
  data: T
  meta: {
    total?: number
    page?: number
    limit?: number
    hasMore?: boolean
    generatedAt: Date
    cacheHit?: boolean
  }
  insights?: MetricInsight[]
  warnings?: string[]
}

// WebSocket message types for real-time updates
export interface MetricsWebSocketMessage {
  type: 'metrics_update' | 'alert' | 'insight' | 'heartbeat'
  promptId: string
  versionId?: string
  data: RealtimeMetrics | MetricInsight | Record<string, any>
  timestamp: Date
}