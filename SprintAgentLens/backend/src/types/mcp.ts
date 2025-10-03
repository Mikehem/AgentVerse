import { JSONSchema7 } from 'json-schema'

// Core MCP Protocol Types
export interface MCPServerDefinition {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: ServerCategory
  tags: string[]
  
  // Connection Configuration
  endpoint: string
  protocol: MCPProtocol
  authentication: AuthConfig
  
  // Server Capabilities
  capabilities: ServerCapabilities
  
  // Metadata
  documentation?: string
  repository?: string
  license?: string
  icon?: string
  screenshots?: string[]
  
  // Registry Metadata
  created: Date
  updated: Date
  status: ServerStatus
  health: HealthStatus
  
  // Usage Statistics
  stats: UsageStats
}

export interface ServerCapabilities {
  tools: ToolDefinition[]
  resources: ResourceDefinition[]
  prompts: PromptDefinition[]
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: JSONSchema7
  outputSchema?: JSONSchema7
  examples?: ToolExample[]
  deprecated?: boolean
  rateLimits?: RateLimit
}

export interface ResourceDefinition {
  uri: string
  name: string
  description: string
  mimeType: string
  template?: string
  annotations?: Record<string, any>
}

export interface PromptDefinition {
  name: string
  description: string
  arguments?: PromptArgument[]
  template?: string
  examples?: PromptExample[]
}

export interface PromptArgument {
  name: string
  description: string
  required: boolean
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  default?: any
}

export interface ToolExample {
  name: string
  description: string
  input: any
  output: any
}

export interface PromptExample {
  name: string
  description: string
  arguments: Record<string, any>
  result: string
}

// Authentication & Security
export interface AuthConfig {
  type: AuthType
  config: any
}

export type AuthType = 
  | 'none'
  | 'apikey'
  | 'oauth2'
  | 'basic'
  | 'certificate'
  | 'jwt'

export interface APIKeyAuth {
  type: 'apikey'
  config: {
    header?: string
    query?: string
    scheme?: string
  }
}

export interface OAuth2Auth {
  type: 'oauth2'
  config: {
    authorizationUrl: string
    tokenUrl: string
    scopes: string[]
    clientId: string
  }
}

// Connection & Communication
export type MCPProtocol = 'stdio' | 'sse' | 'websocket' | 'http'

export interface MCPConnection {
  id: string
  serverId: string
  agentId: string
  protocol: MCPProtocol
  endpoint: string
  status: ConnectionStatus
  connectedAt: Date
  lastActivity: Date
  errorCount: number
  latency: number
}

export type ConnectionStatus = 
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'timeout'

// Server Categories and Status
export type ServerCategory = 
  | 'productivity'
  | 'development'
  | 'data'
  | 'communication'
  | 'automation'
  | 'ai'
  | 'business'
  | 'custom'

export type ServerStatus = 
  | 'active'
  | 'deprecated'
  | 'maintenance'
  | 'beta'
  | 'alpha'

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  lastChecked: Date
  responseTime?: number
  uptime?: number
  issues?: HealthIssue[]
}

export interface HealthIssue {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
}

// Usage Analytics
export interface UsageStats {
  totalConnections: number
  activeConnections: number
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  lastUsed: Date
}

export interface MCPUsageEvent {
  id: string
  serverId: string
  agentId: string
  operationType: OperationType
  operationName: string
  duration: number
  success: boolean
  timestamp: Date
  metadata?: Record<string, any>
}

export type OperationType = 
  | 'tool_call'
  | 'resource_read'
  | 'prompt_use'
  | 'connection'
  | 'heartbeat'

// Rate Limiting
export interface RateLimit {
  requests: number
  window: number // seconds
  burst?: number
}

// Search and Discovery
export interface SearchQuery {
  text?: string
  category?: ServerCategory
  capabilities?: string[]
  tags?: string[]
  author?: string
  status?: ServerStatus[]
  limit?: number
  offset?: number
  sortBy?: SortField
  sortOrder?: 'asc' | 'desc'
}

export type SortField = 
  | 'name'
  | 'created'
  | 'updated'
  | 'popularity'
  | 'rating'

export interface SearchResult {
  servers: MCPServerDefinition[]
  total: number
  facets: SearchFacets
}

export interface SearchFacets {
  categories: { [key in ServerCategory]?: number }
  tags: { [tag: string]: number }
  authors: { [author: string]: number }
  status: { [key in ServerStatus]?: number }
}

// Registry Management
export interface ServerRegistration {
  serverId: string
  registrationToken: string
  expiresAt: Date
}

export interface ServerUpdate {
  version?: string
  description?: string
  capabilities?: Partial<ServerCapabilities>
  status?: ServerStatus
  documentation?: string
  tags?: string[]
}

// MCP Message Protocol (JSON-RPC based)
export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

export interface MCPNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

// Standard MCP Method Types
export interface InitializeParams {
  protocolVersion: string
  capabilities: ClientCapabilities
  clientInfo: {
    name: string
    version: string
  }
}

export interface ClientCapabilities {
  roots?: {
    listChanged?: boolean
  }
  sampling?: {}
}

export interface InitializeResult {
  protocolVersion: string
  capabilities: ServerCapabilities
  serverInfo: {
    name: string
    version: string
  }
}

// Tool calling
export interface CallToolParams {
  name: string
  arguments?: Record<string, any>
}

export interface CallToolResult {
  content: Content[]
  isError?: boolean
}

export interface Content {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

// Resource access
export interface ReadResourceParams {
  uri: string
}

export interface ReadResourceResult {
  contents: ResourceContent[]
}

export interface ResourceContent {
  uri: string
  mimeType: string
  text?: string
  blob?: string
}

// Prompt usage
export interface GetPromptParams {
  name: string
  arguments?: Record<string, any>
}

export interface GetPromptResult {
  description?: string
  messages: PromptMessage[]
}

export interface PromptMessage {
  role: 'user' | 'assistant' | 'system'
  content: Content
}