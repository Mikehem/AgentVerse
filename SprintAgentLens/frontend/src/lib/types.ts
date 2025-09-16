export interface Project {
  id: string
  name: string
  description: string
  icon: string
  color: string
  template: 'blank' | 'simple' | 'autonomous'
  department?: string
  priority: string
  tags: string[]
  securityLevel: 'basic' | 'standard' | 'enterprise'
  dataRetention: '30' | '90' | '180' | '365' | 'unlimited'
  defaultAccess: 'read' | 'collaborate' | 'admin'
  piiHandling: boolean
  complianceMode: boolean
  teamMembers: string[]
  visibility: 'private' | 'public'
  status: 'active' | 'warning' | 'inactive'
  agents: number
  conversations: number
  successRate: number
  createdAt: string
  updatedAt: string
  // Computed properties for backward compatibility
  stats: {
    agents: number
    conversations: number
    successRate: number
  }
  lastUpdated: string
}

export interface OverviewStats {
  activeProjects: number
  totalAgents: number
  totalConversations: number
  avgSuccessRate: number
  trends: {
    projects: string
    agents: string
    conversations: string
    successRate: string
  }
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  color: string
}

export interface Department {
  id: string
  name: string
  description?: string
  code: string // Unique identifier for backend tracking
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BusinessPriority {
  id: string
  name: string
  description: string
  level: number // 1 = Critical, 2 = High, 3 = Medium, 4 = Low
  color: string // Color code for UI display
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Run {
  id: string
  projectId: string
  agentId: string
  name: string
  description?: string
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  startTime: string
  endTime?: string
  duration?: number // milliseconds
  totalConversations: number
  totalMetrics: number
  totalTraces: number
  avgResponseTime?: number // average response time in ms
  totalTokenUsage?: number
  totalCost?: number
  successRate?: number // percentage
  errorMessage?: string
  tags: string[]
  metadata: Record<string, any>
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Agent {
  id: string
  projectId: string
  name: string
  description: string
  type: 'general' | 'specialist' | 'orchestrator'
  role: string // e.g., 'Primary Assistant', 'Data Analyzer', 'Task Coordinator'
  capabilities: string[] // Array of capabilities/skills
  systemPrompt?: string
  model: string // AI model being used
  temperature: number // Model temperature (0-1)
  maxTokens: number // Maximum tokens for responses
  status: 'active' | 'inactive' | 'training' | 'error'
  isActive: boolean
  version: string
  // Performance metrics
  conversations: number
  successRate: number
  avgResponseTime: number // in milliseconds
  lastActiveAt?: string
  // Configuration
  config: {
    timeout: number // Request timeout in ms
    retries: number // Number of retries on failure
    rateLimitPerMinute: number
    priority: number // Execution priority (1-10)
  }
  // Metadata
  tags: string[]
  createdAt: string
  updatedAt: string
  createdBy: string // User ID who created the agent
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  message?: string
  error?: string
}