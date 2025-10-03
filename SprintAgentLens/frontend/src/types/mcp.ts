// MCP Protocol Types
export type MCPProtocol = 'stdio' | 'sse' | 'websocket' | 'http'

export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params: any
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPNotification {
  jsonrpc: '2.0'
  method: string
  params?: any
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

// Authentication Configuration
export type AuthType = 'none' | 'apikey' | 'basic' | 'oauth2' | 'certificate' | 'jwt'

export interface AuthConfig {
  type: AuthType
  config?: {
    header?: string
    query?: string
    authorizationUrl?: string
    tokenUrl?: string
    certPath?: string
    secret?: string
  }
}

// Server Capabilities
export interface Tool {
  name: string
  description: string
  inputSchema: any
  outputSchema?: any
}

export interface Resource {
  uri: string
  name: string
  description: string
  mimeType: string
}

export interface Prompt {
  name: string
  description: string
  arguments?: any
}

export interface ServerCapabilities {
  tools?: Tool[]
  resources?: Resource[]
  prompts?: Prompt[]
}

// Health and Status
export type HealthStatus = {
  status: 'healthy' | 'unhealthy' | 'unknown'
  lastChecked: Date
  responseTime?: number
  issues: Array<{
    code: string
    message: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    timestamp: Date
  }>
}

export interface UsageStats {
  totalConnections: number
  activeConnections: number
  totalRequests: number
  averageResponseTime: number
  errorRate: number
  lastUsed: Date
}

// Server Definition
export interface MCPServerDefinition {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  tags: string[]
  endpoint: string
  protocol: MCPProtocol
  authentication: AuthConfig
  capabilities: ServerCapabilities
  documentation?: string
  repository?: string
  license?: string
  icon?: string
  screenshots?: string[]
  created: Date
  updated: Date
  status: 'active' | 'inactive' | 'deprecated'
  health?: HealthStatus
  stats?: UsageStats
}

// Connection Management
export interface MCPConnection {
  id: string
  serverId: string
  userId: string
  status: 'connected' | 'disconnected' | 'error'
  connectedAt: Date
  lastActiveAt: Date
  configuration?: any
}

// Registry Operations
export interface ServerRegistration {
  serverId: string
  registrationToken: string
  expiresAt: Date
}

export interface ServerUpdate {
  name?: string
  description?: string
  version?: string
  endpoint?: string
  capabilities?: ServerCapabilities
  documentation?: string
  repository?: string
  tags?: string[]
}

export interface SearchQuery {
  text?: string
  category?: string
  tags?: string[]
  author?: string
  status?: string[]
  sortBy?: 'name' | 'popularity' | 'updated' | 'created'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface SearchResult {
  servers: MCPServerDefinition[]
  total: number
  facets: {
    categories: Record<string, number>
    tags: Record<string, number>
    authors: Record<string, number>
    status: Record<string, number>
  }
}

// Protocol Messages
export interface InitializeParams {
  protocolVersion: string
  capabilities: {
    roots?: { listChanged: boolean }
    sampling?: any
  }
  clientInfo: {
    name: string
    version: string
  }
}

export interface InitializeResult {
  protocolVersion: string
  capabilities: any
  serverInfo: {
    name: string
    version: string
  }
}

export interface CallToolParams {
  name: string
  arguments?: Record<string, any>
}

export interface CallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

export interface ReadResourceParams {
  uri: string
}

export interface ReadResourceResult {
  contents: Array<{
    uri: string
    mimeType: string
    text?: string
    blob?: string
  }>
}

export interface GetPromptParams {
  name: string
  arguments?: Record<string, any>
}

export interface GetPromptResult {
  description?: string
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: {
      type: 'text' | 'image'
      text?: string
      data?: string
      mimeType?: string
    }
  }>
}