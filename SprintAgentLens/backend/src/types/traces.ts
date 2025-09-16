/**
 * Traces and Spans type definitions for observability with enterprise authentication
 * All operations include workspace isolation and distributed tracing support
 */

import type { AuthenticatedUser } from './auth';

// Core Trace Types
export interface CreateTraceRequest {
  name: string;
  projectId: string;
  workspaceId: string;
  agentId?: string;
  experimentId?: string;
  datasetId?: string;
  sessionId?: string;
  userId?: string;
  tags?: Record<string, string>;
  metadata?: TraceMetadata;
  startTime?: Date;
  endTime?: Date;
}

export interface UpdateTraceRequest {
  name?: string;
  tags?: Record<string, string>;
  metadata?: Partial<TraceMetadata>;
  endTime?: Date;
  status?: TraceStatus;
}

export interface TraceMetadata {
  userAgent?: string;
  ipAddress?: string;
  environment: 'development' | 'staging' | 'production';
  version?: string;
  source: 'api' | 'sdk' | 'ui' | 'automation';
  model?: string;
  provider?: string;
  costTracking: {
    enabled: boolean;
    inputTokens?: number;
    outputTokens?: number;
    totalCost?: number;
    currency?: string;
  };
  performance: {
    expectedDuration?: number; // milliseconds
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
  business: {
    feature?: string;
    team?: string;
    department?: string;
    customFields?: Record<string, any>;
  };
}

export interface TraceResponse {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  workspaceName: string;
  experimentId?: string;
  experimentName?: string;
  datasetId?: string;
  datasetName?: string;
  sessionId?: string;
  userId?: string;
  userName?: string;
  tags: Record<string, string>;
  metadata: TraceMetadata;
  status: TraceStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  // Span information
  rootSpanId?: string;
  spanCount: number;
  errorCount: number;
  warningCount: number;
  // Performance metrics
  totalTokens?: number;
  totalCost?: number;
  averageLatency?: number;
  // Feedback scores
  feedbackScores?: TraceScore[];
  averageScore?: number;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  // Permissions
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canAddSpans: boolean;
  canAddFeedback: boolean;
  canExport: boolean;
}

export type TraceStatus = 
  | 'running'     // Trace is actively being recorded
  | 'completed'   // Trace finished successfully
  | 'error'       // Trace ended with error
  | 'timeout'     // Trace exceeded time limit
  | 'cancelled';  // Trace was manually cancelled

// Span Types
export interface CreateSpanRequest {
  traceId: string;
  parentSpanId?: string;
  agentId?: string;
  name: string;
  type: SpanType;
  input?: Record<string, any>;
  output?: Record<string, any>;
  metadata?: SpanMetadata;
  tags?: Record<string, string>;
  startTime?: Date;
  endTime?: Date;
}

export interface UpdateSpanRequest {
  name?: string;
  input?: Record<string, any>;
  output?: Record<string, any>;
  metadata?: Partial<SpanMetadata>;
  tags?: Record<string, string>;
  endTime?: Date;
  status?: SpanStatus;
}

export type SpanType = 
  | 'llm'           // LLM call span
  | 'retrieval'     // Vector/document retrieval
  | 'embedding'     // Text embedding generation
  | 'preprocessing' // Data preprocessing
  | 'postprocessing'// Response postprocessing
  | 'validation'    // Input/output validation
  | 'function'      // Function execution
  | 'http'          // HTTP request
  | 'database'      // Database query
  | 'custom';       // Custom span type

export interface SpanMetadata {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  latency?: number;
  retryCount?: number;
  cached?: boolean;
  error?: SpanError;
  httpStatus?: number;
  endpoint?: string;
  sqlQuery?: string;
  customMetrics?: Record<string, number>;
}

export interface SpanError {
  type: string;
  message: string;
  stackTrace?: string;
  code?: string;
  retryable: boolean;
  timestamp: Date;
}

export interface SpanResponse {
  id: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  type: SpanType;
  input?: Record<string, any>;
  output?: Record<string, any>;
  metadata: SpanMetadata;
  tags: Record<string, string>;
  status: SpanStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  // Child span information
  childSpans?: SpanResponse[];
  childSpanCount: number;
  // Feedback
  feedbackScores?: SpanScore[];
  averageScore?: number;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export type SpanStatus = 
  | 'running'     // Span is active
  | 'completed'   // Span completed successfully
  | 'error'       // Span ended with error
  | 'timeout'     // Span exceeded time limit
  | 'cancelled';  // Span was cancelled

// Feedback and Scoring
export interface TraceScore {
  id: string;
  name: string;
  value: number;
  reason?: string;
  source: 'human' | 'llm' | 'automatic';
  createdBy?: string;
  createdAt: Date;
}

export interface SpanScore {
  id: string;
  name: string;
  value: number;
  reason?: string;
  source: 'human' | 'llm' | 'automatic';
  createdBy?: string;
  createdAt: Date;
}

export interface CreateFeedbackRequest {
  traceId?: string;
  spanId?: string;
  name: string;
  value: number;
  reason?: string;
  source: 'human' | 'llm' | 'automatic';
}

// Search and Filtering
export interface TraceListRequest {
  projectId?: string;
  workspaceId?: string;
  experimentId?: string;
  datasetId?: string;
  sessionId?: string;
  userId?: string;
  status?: TraceStatus[];
  tags?: Record<string, string>;
  search?: string; // Search in trace/span names and content
  timeRange?: {
    start: Date;
    end: Date;
  };
  duration?: {
    min?: number;
    max?: number;
  };
  cost?: {
    min?: number;
    max?: number;
  };
  hasErrors?: boolean;
  hasFeedback?: boolean;
  sortBy?: 'start_time' | 'duration' | 'cost' | 'tokens' | 'score' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TraceListResponse {
  traces: TraceResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    projectId?: string;
    workspaceId?: string;
    status?: TraceStatus[];
    timeRange?: { start: Date; end: Date };
  };
  sorting: {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  };
  aggregations: {
    statusCounts: Record<TraceStatus, number>;
    totalDuration: number;
    totalCost: number;
    averageScore: number;
    errorRate: number;
  };
}

export interface SpanListRequest {
  traceId?: string;
  parentSpanId?: string;
  type?: SpanType[];
  status?: SpanStatus[];
  hasErrors?: boolean;
  timeRange?: {
    start: Date;
    end: Date;
  };
  duration?: {
    min?: number;
    max?: number;
  };
  sortBy?: 'start_time' | 'duration' | 'type' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SpanListResponse {
  spans: SpanResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  traceInfo?: {
    id: string;
    name: string;
    status: TraceStatus;
  };
}

// Analytics and Metrics
export interface TraceAnalyticsRequest {
  projectId?: string;
  workspaceId?: string;
  experimentId?: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  granularity: 'hour' | 'day' | 'week' | 'month';
  metrics: string[];
  groupBy?: ('project' | 'experiment' | 'model' | 'provider' | 'user')[];
}

export interface TraceAnalyticsResponse {
  timeRange: { start: Date; end: Date };
  granularity: string;
  metrics: Array<{
    name: string;
    data: Array<{
      timestamp: Date;
      value: number;
      breakdown?: Record<string, number>;
    }>;
    aggregation: {
      min: number;
      max: number;
      avg: number;
      total: number;
      trend: 'up' | 'down' | 'stable';
    };
  }>;
  groupBy?: Array<{
    group: string;
    values: Record<string, number>;
  }>;
}

export interface TraceSummaryRequest {
  traceId: string;
  includeSpans?: boolean;
  includeMetrics?: boolean;
  includeFeedback?: boolean;
}

export interface TraceSummaryResponse {
  trace: TraceResponse;
  spans?: SpanResponse[];
  metrics?: {
    totalDuration: number;
    spanCount: number;
    errorCount: number;
    warningCount: number;
    totalCost: number;
    totalTokens: number;
    averageLatency: number;
  };
  feedback?: {
    scores: TraceScore[];
    averageScore: number;
    scoreDistribution: Record<string, number>;
  };
  timeline?: Array<{
    timestamp: Date;
    event: string;
    spanId?: string;
    spanName?: string;
    details: Record<string, any>;
  }>;
}

// Export and Search
export interface TraceExportRequest {
  traceIds?: string[];
  filters?: TraceListRequest;
  format: 'json' | 'csv' | 'parquet' | 'otlp';
  includeSpans: boolean;
  includeFeedback?: boolean;
  includeMetrics?: boolean;
}

export interface TraceExportResponse {
  exportId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  format: string;
  recordCount: number;
  fileSizeBytes?: number;
}

export interface TraceSearchRequest {
  query: string; // Natural language or structured query
  projectId?: string;
  workspaceId?: string;
  timeRange?: { start: Date; end: Date };
  limit?: number;
}

export interface TraceSearchResponse {
  traces: TraceResponse[];
  spans: SpanResponse[];
  totalMatches: number;
  searchTime: number; // milliseconds
  query: {
    original: string;
    processed: string;
    filters: Record<string, any>;
  };
}

// Permission checking functions
export interface TracePermissionChecker {
  canCreateTrace(user: AuthenticatedUser, projectId: string): boolean;
  canReadTrace(user: AuthenticatedUser, trace: any): boolean;
  canEditTrace(user: AuthenticatedUser, trace: any): boolean;
  canDeleteTrace(user: AuthenticatedUser, trace: any): boolean;
  canAddSpans(user: AuthenticatedUser, trace: any): boolean;
  canAddFeedback(user: AuthenticatedUser, trace: any): boolean;
  canExportTraces(user: AuthenticatedUser, workspaceId: string): boolean;
}

// Error types
export class TraceNotFoundError extends Error {
  constructor(traceId: string) {
    super(`Trace not found: ${traceId}`);
    this.name = 'TraceNotFoundError';
  }
}

export class SpanNotFoundError extends Error {
  constructor(spanId: string) {
    super(`Span not found: ${spanId}`);
    this.name = 'SpanNotFoundError';
  }
}

export class TracePermissionError extends Error {
  constructor(action: string, traceId: string) {
    super(`Permission denied: ${action} on trace ${traceId}`);
    this.name = 'TracePermissionError';
  }
}

export class TraceValidationError extends Error {
  constructor(field: string, message: string) {
    super(`Validation error on ${field}: ${message}`);
    this.name = 'TraceValidationError';
  }
}

export class TraceStatusError extends Error {
  constructor(currentStatus: TraceStatus, requiredStatus: TraceStatus) {
    super(`Invalid trace status: expected ${requiredStatus}, got ${currentStatus}`);
    this.name = 'TraceStatusError';
  }
}

export class SpanHierarchyError extends Error {
  constructor(message: string) {
    super(`Span hierarchy error: ${message}`);
    this.name = 'SpanHierarchyError';
  }
}

// Default configurations and limits
export const DEFAULT_TRACE_METADATA: Partial<TraceMetadata> = {
  environment: 'development',
  source: 'api',
  costTracking: {
    enabled: false,
    currency: 'USD',
  },
  performance: {
    priority: 'medium',
  },
  business: {},
};

export const TRACE_LIMITS = {
  maxSpansPerTrace: 10000,
  maxTraceDepth: 50,
  maxTraceDuration: 24 * 60 * 60 * 1000, // 24 hours in ms
  maxSpanDuration: 60 * 60 * 1000, // 1 hour in ms
  maxTagKeyLength: 100,
  maxTagValueLength: 1000,
  maxTagsPerTrace: 50,
  maxTagsPerSpan: 30,
  maxInputOutputSize: 1024 * 1024, // 1MB
} as const;

export const TRACE_VALIDATION_RULES = {
  name: {
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z0-9\s\-_\.\/:]+$/,
  },
  tags: {
    maxCount: 50,
    maxKeyLength: 100,
    maxValueLength: 1000,
  },
  metadata: {
    maxSizeBytes: 64 * 1024, // 64KB
  },
} as const;

// OpenTelemetry compatibility types
export interface OTLPTraceExportRequest {
  resourceSpans: OTLPResourceSpan[];
}

export interface OTLPResourceSpan {
  resource: OTLPResource;
  scopeSpans: OTLPScopeSpan[];
}

export interface OTLPResource {
  attributes: OTLPAttribute[];
}

export interface OTLPScopeSpan {
  scope: OTLPInstrumentationScope;
  spans: OTLPSpan[];
}

export interface OTLPInstrumentationScope {
  name: string;
  version?: string;
}

export interface OTLPSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OTLPAttribute[];
  status: OTLPStatus;
}

export interface OTLPAttribute {
  key: string;
  value: OTLPAttributeValue;
}

export interface OTLPAttributeValue {
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
}

export interface OTLPStatus {
  code: number; // 0=Unset, 1=Ok, 2=Error
  message?: string;
}