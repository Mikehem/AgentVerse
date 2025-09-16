import { z } from 'zod'

export const projectCreationSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Project name is required').min(3, 'Project name must be at least 3 characters'),
  code: z.string().min(1, 'Project code is required'), // Auto-generated, required for metrics
  description: z.string().min(1, 'Description is required').min(10, 'Description must be at least 10 characters'),
  department: z.string().optional(),
  priority: z.string().min(1, 'Business priority is required'),
  tags: z.array(z.string()).default([]),
  
  // Project Template
  template: z.enum(['blank', 'simple', 'autonomous'], {
    required_error: 'Please select a project template'
  }),
  
  // Security & Access
  securityLevel: z.enum(['basic', 'standard', 'enterprise'], {
    required_error: 'Security level is required'
  }),
  dataRetention: z.enum(['30', '90', '180', '365', 'unlimited']),
  defaultAccess: z.enum(['read', 'collaborate', 'admin']),
  piiHandling: z.boolean().default(false),
  complianceMode: z.boolean().default(false),
  
  // Team settings (for future implementation)
  teamMembers: z.array(z.string()).default([]),
  visibility: z.enum(['private', 'public']).default('private')
})

export type ProjectCreationFormData = z.infer<typeof projectCreationSchema>

// Department Management Schema
export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').min(2, 'Department name must be at least 2 characters'),
  description: z.string().optional(),
  code: z.string().min(1, 'Department code is required').regex(/^[A-Z0-9_-]+$/, 'Code must contain only uppercase letters, numbers, hyphens, and underscores'),
  isActive: z.boolean().default(true)
})

export type DepartmentFormData = z.infer<typeof departmentSchema>

// Business Priority Management Schema
export const businessPrioritySchema = z.object({
  name: z.string().min(1, 'Priority name is required').min(2, 'Priority name must be at least 2 characters'),
  description: z.string().min(1, 'Description is required').min(5, 'Description must be at least 5 characters'),
  level: z.number().min(1, 'Level must be between 1-4').max(4, 'Level must be between 1-4'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g., #FF0000)'),
  isActive: z.boolean().default(true)
})

export type BusinessPriorityFormData = z.infer<typeof businessPrioritySchema>

// Agent Management Schema
export const agentCreationSchema = z.object({
  // Basic Information
  name: z.string().min(1, 'Agent name is required').min(2, 'Agent name must be at least 2 characters'),
  description: z.string().min(1, 'Description is required').min(10, 'Description must be at least 10 characters'),
  projectId: z.string().min(1, 'Project ID is required'),
  
  // Agent Configuration
  type: z.enum(['general', 'specialist', 'orchestrator'], {
    required_error: 'Agent type is required'
  }),
  role: z.string().min(1, 'Role is required'),
  capabilities: z.array(z.string()).min(1, 'At least one capability is required'),
  
  // AI Model Configuration
  model: z.enum(['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'], {
    required_error: 'AI model is required'
  }),
  temperature: z.number().min(0, 'Temperature must be between 0-1').max(1, 'Temperature must be between 0-1').default(0.7),
  maxTokens: z.number().min(100, 'Max tokens must be at least 100').max(8000, 'Max tokens cannot exceed 8000').default(2000),
  systemPrompt: z.string().optional(),
  
  // Performance Configuration
  config: z.object({
    timeout: z.number().min(1000, 'Timeout must be at least 1000ms').max(300000, 'Timeout cannot exceed 300000ms').default(30000),
    retries: z.number().min(0, 'Retries must be at least 0').max(5, 'Retries cannot exceed 5').default(2),
    rateLimitPerMinute: z.number().min(1, 'Rate limit must be at least 1').max(1000, 'Rate limit cannot exceed 1000').default(60),
    priority: z.number().min(1, 'Priority must be between 1-10').max(10, 'Priority must be between 1-10').default(5)
  }),
  
  // Metadata
  tags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true)
})

export type AgentCreationFormData = z.infer<typeof agentCreationSchema>