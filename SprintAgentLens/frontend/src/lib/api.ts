import { Department, BusinessPriority, Project, Agent, Run, ApiResponse } from './types'
import { DepartmentFormData, BusinessPriorityFormData, ProjectCreationFormData, AgentCreationFormData } from './validationSchemas'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || ''

// Generic API helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    // Add cache-busting for GET requests to ensure fresh data
    let url = `${API_BASE_URL}${endpoint}`
    if (options.method === 'GET' || !options.method) {
      const separator = endpoint.includes('?') ? '&' : '?'
      url = `${url}${separator}_t=${Date.now()}`
    }
      
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: data.error || data.message || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    return {
      success: true,
      data: data.data || data,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// Department API
export const departmentApi = {
  // Get all departments
  getAll: () => apiRequest<Department[]>('/api/v1/admin/departments'),

  // Get department by ID
  getById: (id: string) => apiRequest<Department>(`/api/v1/admin/departments/${id}`),

  // Create new department
  create: (data: DepartmentFormData) =>
    apiRequest<Department>('/api/v1/admin/departments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update department
  update: (id: string, data: DepartmentFormData) =>
    apiRequest<Department>(`/api/v1/admin/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete department
  delete: (id: string) =>
    apiRequest<void>(`/api/v1/admin/departments/${id}`, {
      method: 'DELETE',
    }),

  // Toggle department status
  toggleStatus: (id: string) =>
    apiRequest<Department>(`/api/v1/admin/departments/${id}/toggle-status`, {
      method: 'PATCH',
    }),
}

// Business Priority API
export const businessPriorityApi = {
  // Get all priorities
  getAll: () => apiRequest<BusinessPriority[]>('/api/v1/admin/priorities'),

  // Get priority by ID
  getById: (id: string) => apiRequest<BusinessPriority>(`/api/v1/admin/priorities/${id}`),

  // Create new priority
  create: (data: BusinessPriorityFormData) =>
    apiRequest<BusinessPriority>('/api/v1/admin/priorities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update priority
  update: (id: string, data: BusinessPriorityFormData) =>
    apiRequest<BusinessPriority>(`/api/v1/admin/priorities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete priority
  delete: (id: string) =>
    apiRequest<void>(`/api/v1/admin/priorities/${id}`, {
      method: 'DELETE',
    }),

  // Toggle priority status
  toggleStatus: (id: string) =>
    apiRequest<BusinessPriority>(`/api/v1/admin/priorities/${id}/toggle-status`, {
      method: 'PATCH',
    }),
}

// Project API
export const projectApi = {
  // Get all projects
  getAll: () => apiRequest<Project[]>('/api/v1/projects'),

  // Get project by ID
  getById: (id: string) => apiRequest<Project>(`/api/v1/projects/${id}`),

  // Create new project
  create: (data: ProjectCreationFormData) =>
    apiRequest<Project>('/api/v1/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update project
  update: (id: string, data: Partial<ProjectCreationFormData>) =>
    apiRequest<Project>(`/api/v1/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete project
  delete: (id: string) =>
    apiRequest<void>(`/api/v1/projects/${id}`, {
      method: 'DELETE',
    }),
}

// Agent API
export const agentApi = {
  // Get all agents or agents by project ID
  getAll: (projectId?: string) => {
    const url = projectId ? `/api/v1/agents?projectId=${projectId}` : '/api/v1/agents'
    return apiRequest<Agent[]>(url)
  },

  // Get agent by ID
  getById: (id: string) => apiRequest<Agent>(`/api/v1/agents/${id}`),

  // Create new agent
  create: (data: AgentCreationFormData) =>
    apiRequest<Agent>('/api/v1/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update agent
  update: (id: string, data: Partial<AgentCreationFormData>) =>
    apiRequest<Agent>(`/api/v1/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Delete agent
  delete: (id: string) =>
    apiRequest<void>(`/api/v1/agents/${id}`, {
      method: 'DELETE',
    }),

  // Toggle agent status
  toggleStatus: (id: string, isActive: boolean) =>
    apiRequest<Agent>(`/api/v1/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    }),
}

// Run API
export const runApi = {
  // Get all runs with optional filtering
  getAll: (params?: {
    projectId?: string
    agentId?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.agentId) searchParams.set('agentId', params.agentId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    
    const queryString = searchParams.toString()
    const url = `/api/v1/runs${queryString ? `?${queryString}` : ''}`
    return apiRequest<Run[]>(url)
  },

  // Get run by ID
  getById: (id: string) => apiRequest<Run>(`/api/v1/runs/${id}`),

  // Create new run
  create: (data: {
    projectId: string
    agentId: string
    name: string
    description?: string
    tags?: string[]
    metadata?: Record<string, any>
  }) =>
    apiRequest<Run>('/api/v1/runs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update run
  update: (id: string, data: Partial<{
    name: string
    description: string
    tags: string[]
    metadata: Record<string, any>
  }>) =>
    apiRequest<Run>(`/api/v1/runs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Complete run
  complete: (id: string, stats?: {
    totalConversations?: number
    totalMetrics?: number
    totalTraces?: number
    successRate?: number
  }) =>
    apiRequest<Run>(`/api/v1/runs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'complete', ...stats }),
    }),

  // Fail run
  fail: (id: string, errorMessage: string) =>
    apiRequest<Run>(`/api/v1/runs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'fail', errorMessage }),
    }),

  // Delete run
  delete: (id: string) =>
    apiRequest<void>(`/api/v1/runs/${id}`, {
      method: 'DELETE',
    }),
}

// Conversations API
export const conversationApi = {
  // Get all conversations with optional filtering
  getAll: (params?: {
    projectId?: string
    agentId?: string
    status?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.projectId) searchParams.set('projectId', params.projectId)
    if (params?.agentId) searchParams.set('agentId', params.agentId)
    if (params?.status) searchParams.set('status', params.status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())
    
    const queryString = searchParams.toString()
    const url = `/api/v1/conversations${queryString ? `?${queryString}` : ''}`
    return apiRequest<any[]>(url)
  },

  // Get conversation by ID
  getById: (id: string) => apiRequest<any>(`/api/v1/conversations/${id}`),
}