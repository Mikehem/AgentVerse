import { AgentStatus } from '@prisma/client';

// Agent Types and Interfaces

export interface CreateAgentRequest {
  name: string;
  description?: string;
  projectId: string;
  agentType: string;
  version?: string;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface UpdateAgentRequest {
  name?: string;
  description?: string;
  agentType?: string;
  version?: string;
  status?: AgentStatus;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface AgentResponse {
  id: string;
  name: string;
  description?: string;
  projectId: string;
  workspaceId: string;
  agentType: string;
  version?: string;
  status: AgentStatus;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  tags?: string[];
  totalTraces: number;
  totalSpans: number;
  lastUsedAt?: Date;
  createdAt: Date;
  createdBy: string;
  lastUpdatedAt: Date;
  lastUpdatedBy?: string;
  canEdit: boolean;
  canDelete: boolean;
  canCreateTraces: boolean;
}

export interface AgentListResponse {
  agents: AgentResponse[];
  pagination: PaginationInfo;
  filters?: AgentFilters;
}

export interface AgentFilters {
  name?: string;
  projectId?: string;
  agentType?: string;
  status?: AgentStatus;
  createdBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  lastUsedAfter?: Date;
  lastUsedBefore?: Date;
}

export interface AgentSortOptions {
  field: 'name' | 'agentType' | 'status' | 'createdAt' | 'lastUsedAt' | 'totalTraces' | 'totalSpans';
  order: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface AgentStatsResponse {
  totalAgents: number;
  activeAgents: number;
  inactiveAgents: number;
  agentsByType: Record<string, number>;
  agentsByProject: Record<string, number>;
  totalTraces: number;
  totalSpans: number;
}

export interface AgentUsageResponse {
  agentId: string;
  agentName: string;
  totalTraces: number;
  totalSpans: number;
  lastUsedAt?: Date;
  avgTraceDuration?: number;
  avgSpansPerTrace?: number;
  errorRate?: number;
}

export interface AgentPermissions {
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreateTraces: boolean;
  canViewMetrics: boolean;
  canManageConfiguration: boolean;
  isOwner: boolean;
}

export interface BulkDeleteRequest {
  agentIds: string[];
}

export interface BulkDeleteResponse {
  deleted: number;
  failed: number;
  errors: Array<{
    agentId: string;
    error: string;
  }>;
}

// Agent Audit Actions
export enum AgentAuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  DELETED = 'deleted',
  STATUS_CHANGED = 'status_changed',
  CONFIGURATION_UPDATED = 'configuration_updated',
  VIEWED = 'viewed',
  TRACE_CREATED = 'trace_created',
  PERMISSION_DENIED = 'permission_denied',
  USAGE_RECORDED = 'usage_recorded'
}

// Error Classes
export class AgentNotFoundError extends Error {
  constructor(agentId: string) {
    super(`Agent not found: ${agentId}`);
    this.name = 'AgentNotFoundError';
  }
}

export class AgentPermissionError extends Error {
  constructor(action: string, agentId: string) {
    super(`Permission denied: Cannot ${action} agent ${agentId}`);
    this.name = 'AgentPermissionError';
  }
}

export class AgentValidationError extends Error {
  constructor(field: string, message: string) {
    super(`Validation error in ${field}: ${message}`);
    this.name = 'AgentValidationError';
  }
}

export class AgentDependencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AgentDependencyError';
  }
}

// Agent Type Constants
export const AGENT_TYPES = {
  LLM: 'llm',
  SEARCH: 'search',
  TOOL: 'tool',
  RETRIEVAL: 'retrieval',
  EMBEDDING: 'embedding',
  CHAIN: 'chain',
  CUSTOM: 'custom'
} as const;

export type AgentType = typeof AGENT_TYPES[keyof typeof AGENT_TYPES];

// Agent Configuration Schemas (for common agent types)
export interface LLMAgentConfiguration {
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[];
}

export interface SearchAgentConfiguration {
  searchEngine: string;
  apiKey?: string;
  maxResults?: number;
  includeMetadata?: boolean;
}

export interface ToolAgentConfiguration {
  toolName: string;
  toolVersion?: string;
  parameters?: Record<string, any>;
  timeout?: number;
}

export interface RetrievalAgentConfiguration {
  vectorStore: string;
  embeddingModel: string;
  topK?: number;
  similarityThreshold?: number;
  indexName?: string;
}

export type AgentConfiguration = 
  | LLMAgentConfiguration 
  | SearchAgentConfiguration 
  | ToolAgentConfiguration 
  | RetrievalAgentConfiguration 
  | Record<string, any>;