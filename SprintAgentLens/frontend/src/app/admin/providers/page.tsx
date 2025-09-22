'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Settings, Key, CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react'

interface LLMProvider {
  id: string
  name: string
  type: string
  display_name: string
  description?: string
  config: any
  status: 'active' | 'inactive'
  health_status: 'healthy' | 'unhealthy' | 'unknown'
  last_health_check?: string
  usage_limits?: any
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    fetchProviders()
  }, [])

  const fetchProviders = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/v1/llm-providers')
      const data = await response.json()
      
      if (data.success) {
        setProviders(data.providers)
      } else {
        console.error('Failed to fetch providers:', data.error)
      }
    } catch (error) {
      console.error('Error fetching providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const [testingProviders, setTestingProviders] = useState<Set<string>>(new Set())
  
  const handleHealthCheck = async (providerId: string) => {
    setTestingProviders(prev => new Set(prev).add(providerId))
    
    try {
      const response = await fetch(`/api/v1/llm-providers/${providerId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: null }) // Test with default model
      })
      
      const data = await response.json()
      
      if (data.success && data.testResult) {
        const { success, response: testResponse, error, latency } = data.testResult
        
        if (success) {
          alert(`✅ Connection Test Successful!\n\nResponse: ${testResponse}\nLatency: ${latency}ms`)
        } else {
          alert(`❌ Connection Test Failed!\n\nError: ${error}\nLatency: ${latency}ms`)
        }
        
        // Refresh to update health status
        fetchProviders()
      } else {
        alert('❌ Failed to run connection test')
      }
    } catch (error) {
      console.error('Error testing provider:', error)
      alert('❌ Failed to run connection test')
    } finally {
      setTestingProviders(prev => {
        const newSet = new Set(prev)
        newSet.delete(providerId)
        return newSet
      })
    }
  }

  const handleToggleStatus = async (providerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    
    try {
      const response = await fetch(`/api/v1/llm-providers/${providerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (response.ok) {
        fetchProviders()
      }
    } catch (error) {
      console.error('Error updating provider status:', error)
    }
  }

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this provider?')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/llm-providers/${providerId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        fetchProviders()
      }
    } catch (error) {
      console.error('Error deleting provider:', error)
    }
  }

  const filteredProviders = providers.filter(provider => {
    const matchesSearch = provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         provider.type.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || provider.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'unhealthy': return <XCircle className="w-4 h-4 text-red-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading providers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-primary">LLM Providers</h1>
              <p className="text-muted mt-1">
                Manage LLM provider configurations and credentials
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Provider
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="flex gap-4 items-center mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
            <input
              type="text"
              placeholder="Search providers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent">
            <Filter className="w-4 h-4" />
            More Filters
          </button>
        </div>

        {/* Providers Table */}
        {filteredProviders.length === 0 ? (
          <div className="bg-white rounded-lg border border-border p-12 text-center">
            <Settings className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No providers found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 'No providers match your search criteria.' : 'Get started by adding your first LLM provider.'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors mx-auto"
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-accent border-b border-border">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-primary">Provider</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-primary">Type</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-primary">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-primary">Health</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-primary">Last Updated</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="border-b border-border hover:bg-accent/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-primary">{provider.display_name}</div>
                          <div className="text-sm text-muted">{provider.name}</div>
                          {provider.description && (
                            <div className="text-sm text-muted mt-1">{provider.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {provider.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(provider.status)}
                          <span className="text-sm capitalize">{provider.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getHealthIcon(provider.health_status)}
                          <span className="text-sm capitalize">{provider.health_status}</span>
                          {provider.last_health_check && (
                            <span className="text-xs text-muted">
                              ({new Date(provider.last_health_check).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {new Date(provider.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleHealthCheck(provider.id)}
                            disabled={testingProviders.has(provider.id)}
                            className="p-1 hover:bg-accent rounded disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Test connection"
                          >
                            <RefreshCw className={`w-4 h-4 ${testingProviders.has(provider.id) ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProvider(provider)
                              setShowEditModal(true)
                            }}
                            className="p-1 hover:bg-accent rounded"
                            title="Edit provider"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(provider.id, provider.status)}
                            className="p-1 hover:bg-accent rounded"
                            title={provider.status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {provider.status === 'active' ? 
                              <XCircle className="w-4 h-4 text-red-500" /> : 
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            }
                          </button>
                          <button
                            onClick={() => handleDeleteProvider(provider.id)}
                            className="p-1 hover:bg-accent rounded"
                            title="Delete provider"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Provider Modal */}
      {showCreateModal && (
        <CreateProviderModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            fetchProviders()
          }}
        />
      )}

      {/* Edit Provider Modal */}
      {showEditModal && selectedProvider && (
        <EditProviderModal
          provider={selectedProvider}
          onClose={() => {
            setShowEditModal(false)
            setSelectedProvider(null)
          }}
          onUpdated={() => {
            setShowEditModal(false)
            setSelectedProvider(null)
            fetchProviders()
          }}
        />
      )}
    </div>
  )
}

function CreateProviderModal({ onClose, onCreated }: any) {
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    description: '',
    config: {},
    credentials: {},
    usage_limits: {
      requests_per_minute: 60,
      tokens_per_minute: 40000,
      requests_per_day: 1000
    }
  })
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const providerTypes = [
    {
      id: 'openai',
      name: 'OpenAI',
      description: 'OpenAI GPT models (GPT-4, GPT-3.5, etc.)',
      icon: '🤖',
      fields: {
        config: [],
        credentials: [
          { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' }
        ]
      },
      defaultConfig: {},
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    {
      id: 'azure_openai',
      name: 'Azure OpenAI',
      description: 'Microsoft Azure OpenAI Service',
      icon: '☁️',
      fields: {
        config: [
          { key: 'endpoint', label: 'Endpoint', type: 'url', required: true, placeholder: 'https://your-resource.openai.azure.com/' },
          { key: 'deployment_name', label: 'Deployment Name', type: 'text', required: true, placeholder: 'gpt-4' },
          { key: 'api_version', label: 'API Version', type: 'text', required: false, placeholder: '2023-07-01-preview' }
        ],
        credentials: [
          { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your Azure OpenAI API key' }
        ]
      },
      defaultConfig: {
        api_version: '2023-07-01-preview',
        api_type: 'azure'
      },
      models: ['gpt-4o', 'gpt-4', 'gpt-35-turbo', 'gpt-4-32k']
    },
    {
      id: 'anthropic',
      name: 'Anthropic Claude',
      description: 'Anthropic Claude models',
      icon: '🧠',
      fields: {
        config: [],
        credentials: [
          { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'sk-ant-...' }
        ]
      },
      defaultConfig: {},
      models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    },
    {
      id: 'xai',
      name: 'xAI Grok',
      description: 'xAI Grok models',
      icon: '🚀',
      fields: {
        config: [
          { key: 'base_url', label: 'Base URL', type: 'url', required: false, placeholder: 'https://api.x.ai/v1' }
        ],
        credentials: [
          { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'xai-...' }
        ]
      },
      defaultConfig: {
        base_url: 'https://api.x.ai/v1'
      },
      models: ['grok-beta', 'grok-vision-beta']
    },
    {
      id: 'google',
      name: 'Google Gemini',
      description: 'Google Gemini models',
      icon: '🔍',
      fields: {
        config: [],
        credentials: [
          { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'AIza...' }
        ]
      },
      defaultConfig: {},
      models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash']
    },
    {
      id: 'mistral',
      name: 'Mistral AI',
      description: 'Mistral AI models',
      icon: '🌬️',
      fields: {
        config: [],
        credentials: [
          { key: 'api_key', label: 'API Key', type: 'password', required: true, placeholder: 'Your Mistral API key' }
        ]
      },
      defaultConfig: {},
      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-7b']
    }
  ]

  const selectedProviderType = providerTypes.find(p => p.id === selectedType)

  const handleTypeSelect = (type: string) => {
    setSelectedType(type)
    const providerType = providerTypes.find(p => p.id === type)
    if (providerType) {
      setFormData(prev => ({
        ...prev,
        name: '',
        display_name: '',
        config: { ...providerType.defaultConfig }
      }))
    }
    setStep(2)
  }

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  const generateSuggestedName = () => {
    if (selectedProviderType && formData.display_name) {
      const baseName = formData.display_name.toLowerCase().replace(/[^a-z0-9]/g, '_')
      updateFormData('name', baseName)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/v1/llm-providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: selectedType,
          displayName: formData.display_name,
          description: formData.description,
          config: formData.config,
          credentials: formData.credentials,
          usageLimits: formData.usage_limits,
          status: 'active',
          createdBy: 'admin'
        }),
      })

      if (response.ok) {
        onCreated()
      } else {
        const errorData = await response.json()
        alert(`Failed to create provider: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating provider:', error)
      alert('Failed to create provider')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    
    try {
      // Create a temporary provider for testing
      const testData = {
        type: selectedType,
        config: formData.config,
        credentials: formData.credentials
      }

      // For testing, we'll use a simplified approach
      // In a real implementation, you might want a separate test endpoint
      const response = await fetch('/api/v1/llm-providers/test-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Connection Test Successful!\n\nProvider: ${selectedProviderType?.name}\nResponse: ${data.response || 'Connection verified'}\nLatency: ${data.latency || 'N/A'}ms`)
      } else {
        alert(`❌ Connection Test Failed!\n\nError: ${data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      alert('❌ Failed to run connection test')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-medium">Create LLM Provider</h3>
            <p className="text-sm text-gray-500 mt-1">Step {step} of 2</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {step === 1 && (
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Select Provider Type</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerTypes.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleTypeSelect(provider.id)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <h5 className="font-medium text-gray-900">{provider.name}</h5>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">{provider.description}</p>
                  <div className="mt-2">
                    <span className="text-xs text-blue-600">
                      {provider.models.slice(0, 2).join(', ')} 
                      {provider.models.length > 2 && ` +${provider.models.length - 2} more`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedProviderType && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
            >
              ← Back to provider types
            </button>

            {/* Provider Type Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedProviderType.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{selectedProviderType.name}</h4>
                  <p className="text-sm text-gray-600">{selectedProviderType.description}</p>
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => {
                      updateFormData('display_name', e.target.value)
                      if (!formData.name) generateSuggestedName()
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`My ${selectedProviderType.name} Instance`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Internal Name * 
                    <span className="text-xs text-gray-500">(unique identifier)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateFormData('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="my_openai_instance"
                      pattern="[a-z0-9_]+"
                      required
                    />
                    <button
                      type="button"
                      onClick={generateSuggestedName}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                      title="Generate from display name"
                    >
                      ↻
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={`${selectedProviderType.name} instance for...`}
                />
              </div>
            </div>

            {/* Configuration */}
            {selectedProviderType.fields.config.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedProviderType.fields.config.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      <input
                        type={field.type}
                        value={formData.config[field.key] || ''}
                        onChange={(e) => updateFormData(`config.${field.key}`, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={field.placeholder}
                        required={field.required}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Credentials */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Credentials</h4>
              <div className="grid grid-cols-1 gap-4">
                {selectedProviderType.fields.credentials.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label} {field.required && '*'}
                    </label>
                    <input
                      type={field.type}
                      value={formData.credentials[field.key] || ''}
                      onChange={(e) => updateFormData(`credentials.${field.key}`, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={field.placeholder}
                      required={field.required}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Usage Limits */}
            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Usage Limits</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requests per Minute
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limits.requests_per_minute}
                    onChange={(e) => updateFormData('usage_limits.requests_per_minute', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tokens per Minute
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limits.tokens_per_minute}
                    onChange={(e) => updateFormData('usage_limits.tokens_per_minute', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Requests per Day
                  </label>
                  <input
                    type="number"
                    value={formData.usage_limits.requests_per_day}
                    onChange={(e) => updateFormData('usage_limits.requests_per_day', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>
              </div>
            </div>

            {/* Available Models Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h5 className="text-sm font-medium text-blue-900 mb-2">Available Models</h5>
              <div className="flex flex-wrap gap-2">
                {selectedProviderType.models.map((model) => (
                  <span key={model} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {model}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || !formData.credentials.api_key}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                {testing ? 'Testing...' : 'Test Connection'}
              </button>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Creating...' : 'Create Provider'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function EditProviderModal({ provider, onClose, onUpdated }: any) {
  const [formData, setFormData] = useState({
    display_name: provider.display_name || '',
    description: provider.description || '',
    config: {
      endpoint: provider.config?.endpoint || '',
      deployment_name: provider.config?.deployment_name || '',
      api_version: provider.config?.api_version || '',
      model: provider.config?.model || ''
    },
    credentials: {
      api_key: ''  // Don't pre-fill for security
    },
    usage_limits: {
      requests_per_minute: provider.usage_limits?.requests_per_minute || 60,
      tokens_per_minute: provider.usage_limits?.tokens_per_minute || 40000,
      requests_per_day: provider.usage_limits?.requests_per_day || 1000
    },
    status: provider.status || 'active'
  })
  
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/v1/llm-providers/${provider.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          displayName: formData.display_name,
          description: formData.description,
          config: formData.config,
          credentials: formData.credentials.api_key ? formData.credentials : undefined,
          usageLimits: formData.usage_limits,
          status: formData.status,
          updatedBy: 'admin'
        }),
      })

      if (response.ok) {
        onUpdated()
      } else {
        const errorData = await response.json()
        alert(`Failed to update provider: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error updating provider:', error)
      alert('Failed to update provider')
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    
    try {
      const response = await fetch(`/api/v1/llm-providers/${provider.id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: formData.config.deployment_name || formData.config.model })
      })
      
      const data = await response.json()
      
      if (data.success && data.testResult) {
        const { success, response: testResponse, error, latency } = data.testResult
        
        if (success) {
          alert(`✅ Connection Test Successful!\n\nResponse: ${testResponse}\nLatency: ${latency}ms`)
        } else {
          alert(`❌ Connection Test Failed!\n\nError: ${error}\nLatency: ${latency}ms`)
        }
      } else {
        alert('❌ Failed to run connection test')
      }
    } catch (error) {
      console.error('Error testing provider:', error)
      alert('❌ Failed to run connection test')
    } finally {
      setTesting(false)
    }
  }

  const updateFormData = (path: string, value: any) => {
    setFormData(prev => {
      const keys = path.split('.')
      const newData = { ...prev }
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        current[keys[i]] = { ...current[keys[i]] }
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Edit Provider: {provider.display_name}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => updateFormData('display_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateFormData('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Configuration */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Configuration</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {provider.type === 'azure_openai' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint *
                    </label>
                    <input
                      type="url"
                      value={formData.config.endpoint}
                      onChange={(e) => updateFormData('config.endpoint', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://your-resource.openai.azure.com/"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deployment Name *
                    </label>
                    <input
                      type="text"
                      value={formData.config.deployment_name}
                      onChange={(e) => updateFormData('config.deployment_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="msgen4o"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Version
                    </label>
                    <input
                      type="text"
                      value={formData.config.api_version}
                      onChange={(e) => updateFormData('config.api_version', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="2023-07-01-preview"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Credentials */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Credentials</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={formData.credentials.api_key}
                onChange={(e) => updateFormData('credentials.api_key', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave empty to keep current key"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to keep the current API key. Enter a new key to update it.
              </p>
            </div>
          </div>

          {/* Usage Limits */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">Usage Limits</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requests per Minute
                </label>
                <input
                  type="number"
                  value={formData.usage_limits.requests_per_minute}
                  onChange={(e) => updateFormData('usage_limits.requests_per_minute', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tokens per Minute
                </label>
                <input
                  type="number"
                  value={formData.usage_limits.tokens_per_minute}
                  onChange={(e) => updateFormData('usage_limits.tokens_per_minute', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requests per Day
                </label>
                <input
                  type="number"
                  value={formData.usage_limits.requests_per_day}
                  onChange={(e) => updateFormData('usage_limits.requests_per_day', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}