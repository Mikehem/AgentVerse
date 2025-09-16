/**
 * Agent Lens SDK Data Types
 * 
 * These types correspond to the data structures from the Agent Lens Python SDK
 * and are used throughout the conversation components.
 */

export enum ConversationStatus {
  SUCCESS = "success",
  ERROR = "error",
  TIMEOUT = "timeout",
}

export enum RunStatus {
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

export interface ConversationData {
  id: string;
  input: string;
  output: string;
  response_time: number; // milliseconds
  status: ConversationStatus;
  token_usage: number;
  cost: number;
  feedback?: string;
  thread_id?: string;
  conversation_index?: number;
  parent_conversation_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MetricData {
  id: string;
  metric_type: string;
  value: number;
  unit?: string;
  aggregation_type: string;
  evaluation_model?: string;
  reference_value?: string;
  threshold?: number;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SpanData {
  id: string;
  name: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  input?: Record<string, any>;
  output?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  parent_id?: string;
  trace_id?: string;
  thread_id?: string;
  error_info?: Record<string, any>;
  duration?: number; // calculated field in milliseconds
  status: "success" | "error" | "pending";
}

export interface TraceData {
  id: string;
  name: string;
  start_time: string; // ISO timestamp
  end_time?: string; // ISO timestamp
  input?: Record<string, any>;
  output?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  thread_id?: string;
  feedback_scores?: Array<{
    name: string;
    value: number;
    reason?: string;
  }>;
  spans: SpanData[];
  duration?: number; // calculated field in milliseconds
  status: "success" | "error" | "pending";
}

// Thread represents a multi-turn conversation
export interface ConversationThread {
  id: string;
  thread_id: string;
  name?: string;
  conversations: ConversationData[];
  traces: TraceData[];
  agent_id: string;
  agent_name: string;
  project_id: string;
  created_at: string;
  updated_at: string;
  status: "active" | "completed" | "failed";
  total_turns: number;
  total_response_time: number;
  average_response_time: number;
  total_tokens: number;
  total_cost: number;
  tags?: string[];
  metadata: Record<string, any>;
}

// Search and filtering types
export interface ConversationFilter {
  search?: string;
  status?: ConversationStatus[];
  agent_ids?: string[];
  thread_types?: ("single" | "multi-turn" | "long")[];
  date_range?: {
    start: string;
    end: string;
  };
  response_time_range?: {
    min: number;
    max: number;
  };
  token_range?: {
    min: number;
    max: number;
  };
  tags?: string[];
}

export interface ConversationSearchResult {
  conversations: ConversationData[];
  threads: ConversationThread[];
  total_count: number;
  search_time_ms: number;
  filters_applied: ConversationFilter;
}

// Dashboard metrics
export interface ConversationMetrics {
  total_conversations: number;
  total_threads: number;
  average_response_time: number;
  success_rate: number;
  total_tokens: number;
  total_cost: number;
  active_threads: number;
  error_count: number;
  conversations_today: number;
  conversations_this_week: number;
  period_comparison: {
    conversations_change: number;
    response_time_change: number;
    success_rate_change: number;
    token_usage_change: number;
  };
}

// Agent information
export interface Agent {
  id: string;
  name: string;
  type: string;
  description?: string;
  project_id: string;
  status: "active" | "inactive" | "error";
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

// Project information
export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  agents: Agent[];
  metadata: Record<string, any>;
}

// Pagination
export interface PaginationInfo {
  page: number;
  per_page: number;
  total_pages: number;
  total_count: number;
  has_next: boolean;
  has_prev: boolean;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  pagination?: PaginationInfo;
  success: boolean;
  message?: string;
  error?: string;
}

// Waterfall chart data for spans visualization
export interface WaterfallSpan {
  id: string;
  name: string;
  start_offset: number; // milliseconds from trace start
  duration: number; // milliseconds
  depth: number; // nesting level
  status: "success" | "error" | "warning";
  type: "llm-call" | "database" | "processing" | "api-call" | "error";
  parent_id?: string;
  children: WaterfallSpan[];
  metadata: Record<string, any>;
}

// Real-time updates
export interface ConversationUpdate {
  type: "new_conversation" | "conversation_updated" | "thread_updated" | "metrics_updated";
  data: ConversationData | ConversationThread | ConversationMetrics;
  timestamp: string;
}

// Export utility types
export type ConversationTableRow = ConversationData & {
  agent_name: string;
  turn_count: number;
  is_thread: boolean;
}

export type SpanTreeNode = SpanData & {
  children: SpanTreeNode[];
  depth: number;
  isExpanded: boolean;
}