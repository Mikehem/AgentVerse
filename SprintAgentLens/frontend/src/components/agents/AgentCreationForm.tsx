'use client'

import { useState } from 'react'
import { agentCreationSchema, AgentCreationFormData } from '@/lib/validationSchemas'
import { agentApi } from '@/lib/api'
import { Agent } from '@/lib/types'
import { X, Plus, Minus, Brain, Settings, Code, Zap } from 'lucide-react'

interface AgentCreationFormProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: (agent: Agent) => void
}

export function AgentCreationForm({ projectId, isOpen, onClose, onSuccess }: AgentCreationFormProps) {
  const [formData, setFormData] = useState<AgentCreationFormData>({
    projectId,
    name: '',
    description: '',
    type: 'general',
    role: '',
    capabilities: ['Natural Language Processing'],
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    systemPrompt: '',
    config: {
      timeout: 30000,
      retries: 2,
      rateLimitPerMinute: 60,
      priority: 5
    },
    tags: [],
    isActive: true
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrors({})

    try {
      console.log('Starting agent creation with form data:', formData)
      
      // Clean up capabilities - remove empty strings
      const cleanFormData = {
        ...formData,
        capabilities: formData.capabilities.filter(cap => cap.trim() !== '')
      }
      
      console.log('Cleaned form data:', cleanFormData)

      // Validate the form data
      const validatedData = agentCreationSchema.parse(cleanFormData)
      console.log('Validated data:', validatedData)

      // Submit the form
      console.log('Submitting to API...')
      const response = await agentApi.create(validatedData)
      console.log('API response:', response)
      
      if (response.success && response.data) {
        onSuccess(response.data)
        onClose()
        // Reset form
        setFormData({
          projectId,
          name: '',
          description: '',
          type: 'general',
          role: '',
          capabilities: ['Natural Language Processing'],
          model: 'gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: '',
          config: {
            timeout: 30000,
            retries: 2,
            rateLimitPerMinute: 60,
            priority: 5
          },
          tags: [],
          isActive: true
        })
      } else {
        setErrors({ submit: response.error || 'Failed to create agent' })
      }
    } catch (error: any) {
      console.error('Agent creation error:', error)
      
      // Check if it's a Zod validation error
      if (error.name === 'ZodError' || error.issues) {
        // Zod validation errors
        const fieldErrors: Record<string, string> = {}
        const issues = error.issues || error.errors || []
        issues.forEach((issue: any) => {
          const field = issue.path.join('.')
          fieldErrors[field] = issue.message
        })
        setErrors(fieldErrors)
        console.log('Validation errors set:', fieldErrors)
      } else {
        // Log the full error for debugging
        console.error('Unexpected error details:', {
          message: error.message,
          stack: error.stack,
          error
        })
        setErrors({ submit: `An unexpected error occurred: ${error.message || 'Unknown error'}` })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const addCapability = () => {
    setFormData(prev => ({
      ...prev,
      capabilities: [...prev.capabilities, '']
    }))
  }

  const removeCapability = (index: number) => {
    setFormData(prev => {
      const newCapabilities = prev.capabilities.filter((_, i) => i !== index)
      // Ensure at least one capability remains
      if (newCapabilities.length === 0) {
        return prev // Don't remove if it would leave no capabilities
      }
      return {
        ...prev,
        capabilities: newCapabilities
      }
    })
  }

  const updateCapability = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      capabilities: prev.capabilities.map((cap, i) => i === index ? value : cap)
    }))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general': return <Brain className="w-4 h-4" />
      case 'specialist': return <Settings className="w-4 h-4" />
      case 'orchestrator': return <Code className="w-4 h-4" />
      default: return <Zap className="w-4 h-4" />
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-light rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-light">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-primary">Create New Agent</h2>
              <p className="text-sm text-muted">Configure your AI agent. The generated ID will be used by runtime systems for metrics.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent-alpha rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-error/10 border border-error/20 rounded-lg p-3">
              <p className="text-sm text-error">{errors.submit}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`input w-full ${errors.name ? 'border-error' : ''}`}
                  placeholder="e.g., Customer Support Assistant"
                />
                {errors.name && <p className="text-xs text-error mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Role *
                </label>
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                  className={`input w-full ${errors.role ? 'border-error' : ''}`}
                  placeholder="e.g., Primary Assistant"
                />
                {errors.role && <p className="text-xs text-error mt-1">{errors.role}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className={`input w-full h-24 resize-none ${errors.description ? 'border-error' : ''}`}
                placeholder="Describe what this agent does and its primary responsibilities..."
              />
              {errors.description && <p className="text-xs text-error mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Agent Type *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['general', 'specialist', 'orchestrator'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type }))}
                    className={`p-3 rounded-lg border transition-all ${
                      formData.type === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-light hover:border-muted text-muted hover:text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {getTypeIcon(type)}
                      <span className="capitalize font-medium">{type}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">Capabilities</h3>
            
            <div className="space-y-3">
              {formData.capabilities.map((capability, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={capability}
                    onChange={(e) => updateCapability(index, e.target.value)}
                    className="input flex-1"
                    placeholder="e.g., Natural Language Processing, Data Analysis"
                  />
                  {formData.capabilities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeCapability(index)}
                      className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                      title="Remove capability"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              
              <button
                type="button"
                onClick={addCapability}
                className="flex items-center gap-2 text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Capability
              </button>
              {errors.capabilities && <p className="text-xs text-error">{errors.capabilities}</p>}
            </div>
          </div>

          {/* AI Model Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">AI Model Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  AI Model *
                </label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value as any }))}
                  className="input w-full"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-haiku">Claude 3 Haiku</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Max Tokens: {formData.maxTokens}
                </label>
                <input
                  type="range"
                  min={100}
                  max={8000}
                  step={100}
                  value={formData.maxTokens}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                  className="w-full"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-primary mb-2">
                  Temperature: {formData.temperature}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={formData.temperature}
                  onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Conservative</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                System Prompt (Optional)
              </label>
              <textarea
                value={formData.systemPrompt || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
                className="input w-full h-32 resize-none"
                placeholder="Enter system instructions for this agent..."
              />
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-primary">Advanced Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Timeout (ms)
                </label>
                <input
                  type="number"
                  min={1000}
                  max={300000}
                  value={formData.config.timeout}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, timeout: parseInt(e.target.value) }
                  }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Retries
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  value={formData.config.retries}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, retries: parseInt(e.target.value) }
                  }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Rate Limit (per minute)
                </label>
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.config.rateLimitPerMinute}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, rateLimitPerMinute: parseInt(e.target.value) }
                  }))}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Priority (1-10)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.config.priority}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    config: { ...prev.config, priority: parseInt(e.target.value) }
                  }))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-light">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}