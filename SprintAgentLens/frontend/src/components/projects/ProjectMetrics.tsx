'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  TrendingUp, BarChart3, DollarSign, Calculator, Activity, Users, 
  Download, Search, CheckCircle, XCircle, AlertCircle, Clock,
  Check, Copy, Code, Database, Target, Brain, Eye, Shield,
  Settings, Play, RefreshCw, Plus, Edit, Trash2, FileText,
  Zap, TrendingDown, Gauge, Beaker
} from 'lucide-react'
import { Project } from '@/lib/types'

interface ProjectMetricsProps {
  project: Project
}

interface MetricsConfig {
  id: string
  name: string
  type: 'hallucination' | 'relevance' | 'coherence' | 'moderation' | 'usefulness' | 'g_eval'
  model: {
    name: string
    provider: string
    apiKey?: string
    temperature?: number
    maxTokens?: number
  }
  threshold?: number
  customPrompt?: string
  // G-Eval specific fields
  taskIntroduction?: string
  evaluationCriteria?: string
  evaluationSteps?: string[]
  enabled: boolean
  costOptimization: boolean
}

interface BatchEvaluationJob {
  id: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  metricsTypes: string[]
  datasetSize: number
  completedItems: number
  estimatedTimeRemaining?: number
  cost: number
  createdAt: string
}

interface MasterTrace {
  id: string
  name: string
  startTime: string
  endTime?: string
  duration?: number
  status: 'running' | 'success' | 'error' | 'timeout'
  metadata?: Record<string, any>
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  tags?: string[]
}

function MetadataEditor({ trace, onUpdate }: { trace: MasterTrace; onUpdate: (metadata: Record<string, any>) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMetadata, setEditedMetadata] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    setEditedMetadata(JSON.stringify(trace.metadata || {}, null, 2))
  }, [trace.metadata])

  const validateJSON = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString)
      setValidationError(null)
      return true
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Invalid JSON')
      return false
    }
  }

  const handleSave = async () => {
    if (!validateJSON(editedMetadata)) return

    try {
      const parsedMetadata = JSON.parse(editedMetadata)
      
      // Here you would typically make an API call to update the trace metadata
      // For now, we'll just update the local state
      onUpdate(parsedMetadata)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save metadata:', error)
    }
  }

  const toggleKeyExpansion = (key: string) => {
    const newExpanded = new Set(expandedKeys)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedKeys(newExpanded)
  }

  const renderValue = (value: any, depth: number = 0): React.ReactNode => {
    if (value === null) return <span className="text-gray-400">null</span>
    if (value === undefined) return <span className="text-gray-400">undefined</span>
    
    if (typeof value === 'boolean') {
      return <span className="text-blue-600 font-medium">{value.toString()}</span>
    }
    
    if (typeof value === 'number') {
      return <span className="text-green-600 font-medium">{value}</span>
    }
    
    if (typeof value === 'string') {
      if (value.length > 100) {
        return (
          <span className="text-orange-600">
            "{value.substring(0, 100)}..."
            <button className="text-blue-500 hover:underline ml-1">expand</button>
          </span>
        )
      }
      return <span className="text-orange-600">"{value}"</span>
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-500">[]</span>
      return (
        <div className="ml-4">
          <span className="text-gray-600">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              <span className="text-gray-500">{index}:</span> {renderValue(item, depth + 1)}
            </div>
          ))}
          <span className="text-gray-600">]</span>
        </div>
      )
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) return <span className="text-gray-500">{}</span>
      
      return (
        <div className="ml-4">
          <span className="text-gray-600">{'{'}</span>
          {keys.map((key) => (
            <div key={key} className="ml-4 py-1">
              <span className="text-purple-600 font-medium">"{key}"</span>
              <span className="text-gray-500">: </span>
              {renderValue(value[key], depth + 1)}
            </div>
          ))}
          <span className="text-gray-600">{'}'}</span>
        </div>
      )
    }
    
    return <span>{String(value)}</span>
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Edit Metadata</h4>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!!validationError}
              className="btn btn-sm btn-primary disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setValidationError(null)
                setEditedMetadata(JSON.stringify(trace.metadata || {}, null, 2))
              }}
              className="btn btn-sm btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>

        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 text-sm font-medium">JSON Validation Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{validationError}</p>
          </div>
        )}

        <div className="relative">
          <textarea
            value={editedMetadata}
            onChange={(e) => {
              setEditedMetadata(e.target.value)
              validateJSON(e.target.value)
            }}
            className={`w-full h-64 px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 ${
              validationError 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-primary'
            }`}
            placeholder="Enter JSON metadata..."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Metadata</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-sm btn-secondary"
          >
            <Code className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(trace.metadata, null, 2))
            }}
            className="btn btn-sm btn-secondary"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>

      {!trace.metadata || Object.keys(trace.metadata).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-8 h-8 mx-auto mb-2" />
          <p>No metadata available</p>
          <p className="text-sm">Click Edit to add metadata to this trace</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="font-mono text-sm">
            {renderValue(trace.metadata)}
          </div>
        </div>
      )}
    </div>
  )
}

function TraceAnalyticsDashboard({ traces }: { traces: MasterTrace[] }) {
  const analytics = useMemo(() => {
    const total = traces.length
    const successful = traces.filter(t => t.status === 'success').length
    const failed = traces.filter(t => t.status === 'error').length
    const running = traces.filter(t => t.status === 'running').length
    const timeout = traces.filter(t => t.status === 'timeout').length
    
    const durations = traces.filter(t => t.duration).map(t => t.duration!)
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0
    
    // Performance percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0
    const p90 = sortedDurations[Math.floor(sortedDurations.length * 0.9)] || 0
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0
    
    // Recent activity (last 24 hours simulation)
    const now = new Date()
    const recentTraces = traces.filter(t => {
      const traceTime = new Date(t.startTime)
      return (now.getTime() - traceTime.getTime()) < 24 * 60 * 60 * 1000
    })
    
    return {
      total,
      successful,
      failed,
      running,
      timeout,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration,
      maxDuration,
      minDuration,
      p50,
      p90,
      p99,
      recentCount: recentTraces.length
    }
  }, [traces])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Traces</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.total}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-green-600">{analytics.successRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-2xl font-semibold text-blue-600">{formatDuration(analytics.avgDuration)}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent (24h)</p>
              <p className="text-2xl font-semibold text-purple-600">{analytics.recentCount}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Success</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.successful}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-green-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.successful / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Error</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.failed}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-red-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.failed / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Running</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.running}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.running / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Timeout</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.timeout}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-yellow-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.timeout / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Percentiles</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P50 (Median)</span>
              <span className="text-sm font-medium">{formatDuration(analytics.p50)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P90</span>
              <span className="text-sm font-medium">{formatDuration(analytics.p90)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P99</span>
              <span className="text-sm font-medium">{formatDuration(analytics.p99)}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Min Duration</span>
                <span className="text-sm font-medium">{formatDuration(analytics.minDuration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max Duration</span>
                <span className="text-sm font-medium">{formatDuration(analytics.maxDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">High Success Rate</p>
              <p className="text-xs text-gray-600">
                {analytics.successRate > 90 ? 'Excellent performance' : 
                 analytics.successRate > 70 ? 'Good performance' : 'Needs attention'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Response Time</p>
              <p className="text-xs text-gray-600">
                {analytics.avgDuration < 1000 ? 'Very fast' : 
                 analytics.avgDuration < 5000 ? 'Good' : 'Consider optimization'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Activity Level</p>
              <p className="text-xs text-gray-600">
                {analytics.recentCount > 10 ? 'High activity' : 
                 analytics.recentCount > 3 ? 'Moderate activity' : 'Low activity'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricsConfigurationModal({ 
  isOpen, 
  onClose, 
  project,
  onSave 
}: { 
  isOpen: boolean
  onClose: () => void
  project: Project
  onSave: (config: MetricsConfig[]) => void 
}) {
  const [metricsConfigs, setMetricsConfigs] = useState<MetricsConfig[]>([
    {
      id: '1',
      name: 'Hallucination Detection',
      type: 'hallucination',
      model: {
        name: 'gpt-4o',
        provider: 'openai',
        temperature: 0.0,
        maxTokens: 1000
      },
      threshold: 0.8,
      enabled: true,
      costOptimization: true
    },
    {
      id: '2',
      name: 'Relevance Assessment',
      type: 'relevance',
      model: {
        name: 'claude-3.5-sonnet',
        provider: 'anthropic',
        temperature: 0.0,
        maxTokens: 1000
      },
      threshold: 0.7,
      enabled: true,
      costOptimization: true
    }
  ])

  const [editingConfig, setEditingConfig] = useState<MetricsConfig | null>(null)

  const handleSave = () => {
    onSave(metricsConfigs)
    onClose()
  }

  const handleAddConfig = () => {
    const newConfig: MetricsConfig = {
      id: Date.now().toString(),
      name: 'New Metric',
      type: 'hallucination',
      model: {
        name: 'gpt-4o',
        provider: 'openai',
        temperature: 0.0,
        maxTokens: 1000
      },
      threshold: 0.8,
      enabled: true,
      costOptimization: true
    }
    setMetricsConfigs([...metricsConfigs, newConfig])
    setEditingConfig(newConfig)
  }

  const handleDeleteConfig = (id: string) => {
    setMetricsConfigs(metricsConfigs.filter(config => config.id !== id))
  }

  const handleUpdateConfig = (updatedConfig: MetricsConfig) => {
    setMetricsConfigs(metricsConfigs.map(config => 
      config.id === updatedConfig.id ? updatedConfig : config
    ))
    setEditingConfig(null)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">Configure LLM Evaluation Metrics</h2>
            <p className="text-sm text-muted">Set up advanced metrics and evaluation models</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Current Configurations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-primary">Active Metrics</h3>
              <button onClick={handleAddConfig} className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                Add Metric
              </button>
            </div>

            <div className="space-y-4">
              {metricsConfigs.map((config) => (
                <div key={config.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <h4 className="font-medium text-primary">{config.name}</h4>
                        <p className="text-sm text-muted capitalize">{config.type} evaluation</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setEditingConfig(config)}
                        className="btn btn-outline btn-sm"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteConfig(config.id)}
                        className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted">Model:</span>
                      <p className="font-medium">{config.model.name}</p>
                    </div>
                    <div>
                      <span className="text-muted">Provider:</span>
                      <p className="font-medium capitalize">{config.model.provider}</p>
                    </div>
                    <div>
                      <span className="text-muted">Threshold:</span>
                      <p className="font-medium">{config.threshold || 'Auto'}</p>
                    </div>
                    <div>
                      <span className="text-muted">Cost Opt:</span>
                      <p className="font-medium">{config.costOptimization ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Configuration Modal */}
          {editingConfig && (
            <MetricConfigurationForm
              config={editingConfig}
              onSave={handleUpdateConfig}
              onCancel={() => setEditingConfig(null)}
            />
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button onClick={onClose} className="btn btn-outline">
            Cancel
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}

function MetricConfigurationForm({
  config,
  onSave,
  onCancel
}: {
  config: MetricsConfig
  onSave: (config: MetricsConfig) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState(config)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
      <h4 className="font-medium text-primary mb-4">Edit Metric Configuration</h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="input w-full"
            >
              <option value="hallucination">Hallucination</option>
              <option value="relevance">Relevance</option>
              <option value="coherence">Coherence</option>
              <option value="moderation">Moderation</option>
              <option value="usefulness">Usefulness</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Model</label>
            <select
              value={formData.model.name}
              onChange={(e) => {
                const provider = e.target.value.includes('gpt') ? 'openai' :
                                e.target.value.includes('claude') ? 'anthropic' : 'openai'
                setFormData({
                  ...formData,
                  model: { ...formData.model, name: e.target.value, provider }
                })
              }}
              className="input w-full"
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Threshold</label>
            <input
              type="number"
              min="0"
              max="1"
              step="0.1"
              value={formData.threshold || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                threshold: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              className="input w-full"
              placeholder="Auto"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Temperature</label>
            <input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.model.temperature || ''}
              onChange={(e) => setFormData({
                ...formData,
                model: { 
                  ...formData.model, 
                  temperature: e.target.value ? parseFloat(e.target.value) : undefined 
                }
              })}
              className="input w-full"
              placeholder="0.0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-1">Max Tokens</label>
            <input
              type="number"
              min="100"
              max="4000"
              value={formData.model.maxTokens || ''}
              onChange={(e) => setFormData({
                ...formData,
                model: { 
                  ...formData.model, 
                  maxTokens: e.target.value ? parseInt(e.target.value) : undefined 
                }
              })}
              className="input w-full"
              placeholder="1000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted mb-1">Custom Prompt (Optional)</label>
          <textarea
            value={formData.customPrompt || ''}
            onChange={(e) => setFormData({ ...formData, customPrompt: e.target.value })}
            className="input w-full h-24"
            placeholder="Enter a custom evaluation prompt..."
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Enabled</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.costOptimization}
              onChange={(e) => setFormData({ ...formData, costOptimization: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">Cost Optimization</span>
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </div>
  )
}

function BatchEvaluationModal({
  isOpen,
  onClose,
  project,
  onStartJob
}: {
  isOpen: boolean
  onClose: () => void
  project: Project
  onStartJob: (job: Partial<BatchEvaluationJob>) => void
}) {
  const [formData, setFormData] = useState({
    name: '',
    metricsTypes: ['hallucination'] as string[],
    datasetId: '',
    batchSize: 50,
    model: 'gpt-4o',
    provider: 'openai'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onStartJob({
      name: formData.name,
      metricsTypes: formData.metricsTypes,
      datasetSize: formData.batchSize,
      status: 'pending',
      progress: 0,
      completedItems: 0,
      cost: 0,
      createdAt: new Date().toISOString()
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-primary">Start Batch Evaluation</h2>
            <p className="text-sm text-muted">Configure and launch large-scale evaluation job</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-primary">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Job Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="e.g., Production Hallucination Check"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">Metrics to Evaluate</label>
            <div className="grid grid-cols-2 gap-3">
              {['hallucination', 'relevance', 'coherence', 'moderation', 'g_eval'].map((metric) => (
                <label key={metric} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.metricsTypes.includes(metric)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          metricsTypes: [...formData.metricsTypes, metric]
                        })
                      } else {
                        setFormData({
                          ...formData,
                          metricsTypes: formData.metricsTypes.filter(m => m !== metric)
                        })
                      }
                    }}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{metric === 'g_eval' ? 'G-Eval' : metric}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted mb-1">Dataset</label>
              <select
                value={formData.datasetId}
                onChange={(e) => setFormData({ ...formData, datasetId: e.target.value })}
                className="input w-full"
                required
              >
                <option value="">Select Dataset</option>
                <option value="dataset_1">Production Conversations (1,234 items)</option>
                <option value="dataset_2">Test Dataset (567 items)</option>
                <option value="dataset_3">Customer Support (890 items)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted mb-1">Batch Size</label>
              <select
                value={formData.batchSize}
                onChange={(e) => setFormData({ ...formData, batchSize: parseInt(e.target.value) })}
                className="input w-full"
              >
                <option value={10}>10 items per batch</option>
                <option value={25}>25 items per batch</option>
                <option value={50}>50 items per batch</option>
                <option value={100}>100 items per batch</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Estimated Cost</h4>
            <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <p>Selected metrics: {formData.metricsTypes.length}</p>
              <p>Items to evaluate: {formData.datasetId ? '1,234' : '0'}</p>
              <p>Estimated cost: <span className="font-bold">$12.45</span></p>
              <p>Estimated time: <span className="font-bold">~15 minutes</span></p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Beaker className="w-4 h-4" />
              Start Evaluation
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ProjectMetrics({ project }: ProjectMetricsProps) {
  const [costAnalytics, setCostAnalytics] = useState<any>(null)
  const [tracesData, setTracesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [metricsConfigs, setMetricsConfigs] = useState<MetricsConfig[]>([])
  const [batchJobs, setBatchJobs] = useState<BatchEvaluationJob[]>([])
  const [evaluationStatus, setEvaluationStatus] = useState({
    running: 2,
    completed: 24,
    averageTime: '8.5m'
  })
  
  // Filter states
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [searchTraceId, setSearchTraceId] = useState('')

  // Handler functions for modals
  const handleConfigSave = (configs: MetricsConfig[]) => {
    setMetricsConfigs(configs)
    // Here you would typically make an API call to save the configuration
    console.log('Saving metrics configuration:', configs)
  }

  const handleStartBatchJob = (job: Partial<BatchEvaluationJob>) => {
    const newJob: BatchEvaluationJob = {
      id: Date.now().toString(),
      ...job
    } as BatchEvaluationJob
    
    setBatchJobs([...batchJobs, newJob])
    setEvaluationStatus(prev => ({
      ...prev,
      running: prev.running + 1
    }))
    
    // Here you would typically make an API call to start the batch job
    console.log('Starting batch evaluation job:', newJob)
    
    // Simulate job completion after 5 seconds for demo
    setTimeout(() => {
      setBatchJobs(prev => prev.map(j => 
        j.id === newJob.id 
          ? { ...j, status: 'completed', progress: 100 }
          : j
      ))
      setEvaluationStatus(prev => ({
        ...prev,
        running: Math.max(0, prev.running - 1),
        completed: prev.completed + 1
      }))
    }, 5000)
  }

  const handleRunEvaluation = () => {
    // Quick evaluation trigger
    console.log('Running quick evaluation for project:', project.id)
    // Here you would make an API call to trigger evaluation
  }

  // Fetch cost analytics data
  useEffect(() => {
    const fetchCostAnalytics = async () => {
      try {
        setLoading(true)
        
        // Build query parameters based on filters
        const params = new URLSearchParams({
          projectId: project.id,
          includeAnalytics: 'true',
          limit: '1000'
        })
        
        // Time range filtering
        if (timeRange !== 'all') {
          const now = new Date()
          let startTime = new Date()
          switch (timeRange) {
            case '1h':
              startTime.setHours(now.getHours() - 1)
              break
            case '24h':
              startTime.setDate(now.getDate() - 1)
              break
            case '7d':
              startTime.setDate(now.getDate() - 7)
              break
            case '30d':
              startTime.setDate(now.getDate() - 30)
              break
          }
          params.append('startTime', startTime.toISOString())
        }
        
        // Agent filtering
        if (selectedAgent) {
          params.append('agentId', selectedAgent)
        }
        
        // Status filtering
        if (selectedStatus) {
          params.append('status', selectedStatus)
        }
        
        // Trace ID search
        if (searchTraceId) {
          params.append('search', searchTraceId)
        }
        
        // Fetch cost analytics from the dedicated endpoint
        const costParams = new URLSearchParams({
          projectId: project.id,
          level: 'trace',
          includeBreakdown: 'true'
        })
        
        // Add time filtering for cost analytics
        if (timeRange !== 'all') {
          const now = new Date()
          let startDate = new Date()
          switch (timeRange) {
            case '1h':
              startDate.setHours(now.getHours() - 1)
              break
            case '24h':
              startDate.setDate(now.getDate() - 1)
              break
            case '7d':
              startDate.setDate(now.getDate() - 7)
              break
            case '30d':
              startDate.setDate(now.getDate() - 30)
              break
          }
          costParams.append('startDate', startDate.toISOString())
        }
        
        if (selectedAgent) {
          costParams.append('agentId', selectedAgent)
        }
        
        if (selectedStatus) {
          costParams.append('status', selectedStatus)
        }

        const costResponse = await fetch(`/api/v1/cost-analytics?${costParams}`)
        const costData = await costResponse.json()
        
        // Also fetch traces for additional data
        const tracesResponse = await fetch(`/v1/private/traces?${params}`)
        const tracesData = await tracesResponse.json()
        
        if (costData.success) {
          setCostAnalytics(costData.analytics?.summary)
          setTracesData(costData.analytics?.data || [])
        } else if (tracesData.success) {
          // Fallback to traces data if cost analytics fails
          setCostAnalytics(tracesData.analytics?.costAnalytics)
          setTracesData(tracesData.data)
        }
      } catch (error) {
        console.error('Failed to fetch cost analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCostAnalytics()
  }, [project.id, timeRange, selectedAgent, selectedStatus, searchTraceId])

  // Generate mock time-series data for charts
  const generateTimeSeriesData = (baseValue: number, points: number = 30) => {
    return Array.from({ length: points }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (points - i - 1))
      return {
        date: date.toISOString().split('T')[0],
        value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3)
      }
    })
  }

  const conversationsData = generateTimeSeriesData(project.conversations / 30, 30)
  const successRateData = generateTimeSeriesData(project.successRate, 30)
  
  // Generate cost trend data (mock for now, can be enhanced with real time-series data)
  const costTrendData = generateTimeSeriesData((costAnalytics?.totalCost || 0.05) / 30, 30)
  const tokenUsageData = generateTimeSeriesData((costAnalytics?.totalTokens || 1000) / 30, 30)
  
  // Generate agent-specific metrics
  const agentMetrics = project.template === 'Autonomous' ? [
    { name: 'Task Coordinator', conversations: Math.floor(project.conversations * 0.4), successRate: project.successRate + 2, responseTime: 1.2 },
    { name: 'Data Analyzer', conversations: Math.floor(project.conversations * 0.35), successRate: project.successRate - 1, responseTime: 2.1 },
    { name: 'Response Generator', conversations: Math.floor(project.conversations * 0.25), successRate: project.successRate + 1, responseTime: 0.8 }
  ] : project.template === 'Simple' ? [
    { name: 'Primary Assistant', conversations: project.conversations, successRate: project.successRate, responseTime: 1.5 }
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Metrics & Analytics</h2>
            <p className="text-muted">Performance insights and key metrics</p>
          </div>
          <button className="btn btn-outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
        
        {/* Enhanced Filtering Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-background/50 rounded-lg border">
          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Time Range</label>
            <select 
              className="input text-sm w-full"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Agent</label>
            <select 
              className="input text-sm w-full"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="">All agents</option>
              <option value="agent_analytics_specialist">Analytics Specialist</option>
              <option value="agent_performance_optimizer">Performance Optimizer</option>
              <option value="agent_customer_support">Customer Support</option>
              <option value="agent_debug_assistant">Debug Assistant</option>
              <option value="agent_strategic_planner">Strategic Planner</option>
              <option value="agent_security_auditor">Security Auditor</option>
              <option value="agent_data_scientist">Data Scientist</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Status</label>
            <select 
              className="input text-sm w-full"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="running">Running</option>
              <option value="error">Error</option>
              <option value="timeout">Timeout</option>
            </select>
          </div>

          {/* Trace ID Search */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Trace ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search trace ID..."
                className="input text-sm w-full pl-10"
                value={searchTraceId}
                onChange={(e) => setSearchTraceId(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Total Conversations</h3>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-primary">{project.conversations.toLocaleString()}</p>
          <p className="text-sm text-success">+12.5% vs last month</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Success Rate</h3>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{project.successRate.toFixed(1)}%</p>
          <p className="text-sm text-success">+2.3% vs last month</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Total Cost</h3>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            ${loading ? '...' : (costAnalytics?.totalCost?.toFixed(4) || '0.0000')}
          </p>
          <p className="text-sm text-muted">
            {costAnalytics?.totalTokens?.toLocaleString() || '0'} total tokens
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Avg Cost/Trace</h3>
            <Calculator className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            ${loading ? '...' : (costAnalytics?.averageCostPerTrace?.toFixed(6) || '0.000000')}
          </p>
          <p className="text-sm text-muted">
            {costAnalytics?.averageTokensPerTrace || 0} avg tokens
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Avg Response Time</h3>
            <Activity className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-primary">1.2s</p>
          <p className="text-sm text-success">-0.3s vs last month</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Active Agents</h3>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-primary">{project.agents}</p>
          <p className="text-sm text-muted">No change</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Conversations Over Time */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Conversations Over Time</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {conversationsData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-primary/20 hover:bg-primary/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / Math.max(...conversationsData.map(d => d.value))) * 160)}px` }}
                  title={`${point.date}: ${Math.round(point.value)} conversations`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Rate Trend */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Success Rate Trend</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {successRateData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-success/20 hover:bg-success/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / 100) * 160)}px` }}
                  title={`${point.date}: ${point.value.toFixed(1)}% success rate`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Trend */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Cost Trend (USD)</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {costTrendData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-green-500/20 hover:bg-green-500/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / Math.max(...costTrendData.map(d => d.value), 0.001)) * 160)}px` }}
                  title={`${point.date}: $${point.value.toFixed(6)} cost`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Token Usage Trend */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Token Usage Trend</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {tokenUsageData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-blue-500/20 hover:bg-blue-500/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / Math.max(...tokenUsageData.map(d => d.value), 1)) * 160)}px` }}
                  title={`${point.date}: ${Math.round(point.value)} tokens`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance Breakdown */}
      {agentMetrics.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Agent Performance Breakdown</h3>
          <div className="space-y-4">
            {agentMetrics.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                    <Users className={`w-4 h-4 text-${project.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-primary">{agent.name}</h4>
                    <p className="text-sm text-muted">{agent.conversations.toLocaleString()} conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-success">{agent.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted">Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-secondary">{agent.responseTime}s</p>
                    <p className="text-xs text-muted">Avg Response</p>
                  </div>
                  <div className="w-24 bg-background rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${agent.successRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success">Improved Response Time</p>
                <p className="text-xs text-muted">Average response time decreased by 0.3s this month</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">High Success Rate</p>
                <p className="text-xs text-muted">Consistently maintaining above 85% success rate</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
              <Activity className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Peak Usage Hours</p>
                <p className="text-xs text-muted">Highest activity between 2-4 PM daily</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Resource Utilization</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">CPU Usage</span>
                <span className="text-primary">68%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Memory Usage</span>
                <span className="text-secondary">45%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="h-full bg-secondary rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Network I/O</span>
                <span className="text-accent">32%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="h-full bg-accent rounded-full" style={{ width: '32%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Evaluation Metrics Section */}
      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-primary">LLM Evaluation Metrics</h3>
              <p className="text-sm text-muted">Advanced metrics powered by LLM-as-Judge evaluation</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowConfigModal(true)}
                className="btn btn-outline btn-sm"
              >
                <Settings className="w-4 h-4" />
                Configure
              </button>
              <button 
                onClick={handleRunEvaluation}
                className="btn btn-primary btn-sm"
              >
                <Play className="w-4 h-4" />
                Run Evaluation
              </button>
            </div>
          </div>

          {/* Key LLM Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-red-600" />
                <h4 className="font-medium text-red-800 dark:text-red-200">Hallucination Score</h4>
              </div>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100">8.2%</p>
              <p className="text-sm text-red-700 dark:text-red-300">↓ 2.1% vs last week</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-800 dark:text-green-200">Relevance Score</h4>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">92.5%</p>
              <p className="text-sm text-green-700 dark:text-green-300">↑ 3.2% vs last week</p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-800 dark:text-blue-200">Coherence Score</h4>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">89.7%</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">↑ 1.8% vs last week</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium text-purple-800 dark:text-purple-200">Safety Score</h4>
              </div>
              <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">98.1%</p>
              <p className="text-sm text-purple-700 dark:text-purple-300">↑ 0.5% vs last week</p>
            </div>
          </div>

          {/* LLM Metrics Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <h4 className="font-medium text-primary mb-3">Evaluation Trends (7 days)</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Hallucination Detection</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-red-500 rounded-full" style={{ width: '18%' }}></div>
                    </div>
                    <span className="text-sm font-medium">8.2%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Relevance Assessment</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: '92.5%' }}></div>
                    </div>
                    <span className="text-sm font-medium">92.5%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Coherence Check</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: '89.7%' }}></div>
                    </div>
                    <span className="text-sm font-medium">89.7%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Safety Moderation</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-purple-500 rounded-full" style={{ width: '98.1%' }}></div>
                    </div>
                    <span className="text-sm font-medium">98.1%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <h4 className="font-medium text-primary mb-3">Evaluation Models Used</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium">GPT-4o</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">856 evaluations</span>
                    <span className="text-sm font-medium">72%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium">Claude-3.5-Sonnet</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">234 evaluations</span>
                    <span className="text-sm font-medium">20%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="text-sm font-medium">GPT-4o-mini</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">95 evaluations</span>
                    <span className="text-sm font-medium">8%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Evaluation Status */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-primary">Batch Evaluation Jobs</h4>
                <p className="text-sm text-muted">Monitor large-scale evaluation progress</p>
              </div>
              <button 
                onClick={() => setShowBatchModal(true)}
                className="btn btn-outline btn-sm"
              >
                <Beaker className="w-4 h-4" />
                Start Batch Job
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Running Jobs</span>
                </div>
                <p className="text-xl font-bold text-primary">{evaluationStatus.running}</p>
                <p className="text-xs text-muted">Est. 15 min remaining</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Completed</span>
                </div>
                <p className="text-xl font-bold text-primary">{evaluationStatus.completed}</p>
                <p className="text-xs text-muted">Last 24 hours</p>
              </div>
              
              <div className="bg-white dark:bg-gray-800 p-3 rounded border">
                <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Avg. Processing Time</span>
                </div>
                <p className="text-xl font-bold text-primary">{evaluationStatus.averageTime}</p>
                <p className="text-xs text-muted">Per 100 evaluations</p>
              </div>
            </div>
          </div>

          {/* Evaluation Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <h4 className="font-medium text-primary mb-3">Quality Insights</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">Improved Relevance</p>
                    <p className="text-xs text-muted">Relevance scores increased by 3.2% this week</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <Brain className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Reduced Hallucinations</p>
                    <p className="text-xs text-muted">Hallucination rate dropped by 2.1% since last week</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-purple-700 dark:text-purple-300">High Safety Score</p>
                    <p className="text-xs text-muted">Consistently maintaining 98%+ safety compliance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
              <h4 className="font-medium text-primary mb-3">Evaluation Cost Optimization</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Total Evaluation Cost</span>
                  <span className="text-sm font-medium text-primary">$12.34</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Cost per Evaluation</span>
                  <span className="text-sm font-medium text-primary">$0.0104</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Monthly Projection</span>
                  <span className="text-sm font-medium text-primary">$156.78</span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <TrendingDown className="w-4 h-4" />
                    <span>15% cost reduction vs last month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Analytics Section */}
      {costAnalytics && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">Cost Analytics & Token Usage</h3>
            
            {/* Provider and Model Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Provider Distribution */}
              <div>
                <h4 className="font-medium text-primary mb-3">Provider Distribution</h4>
                {costAnalytics.providerDistribution?.length > 0 ? (
                  <div className="space-y-2">
                    {costAnalytics.providerDistribution.map((provider: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="text-sm font-medium">{provider.provider || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">{provider.count} traces</span>
                          <span className="text-sm font-medium">{provider.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No provider data available</p>
                )}
              </div>

              {/* Model Distribution */}
              <div>
                <h4 className="font-medium text-primary mb-3">Model Distribution</h4>
                {costAnalytics.modelDistribution?.length > 0 ? (
                  <div className="space-y-2">
                    {costAnalytics.modelDistribution.map((model: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="text-sm font-medium">{model.model || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">{model.count} traces</span>
                          <span className="text-sm font-medium">{model.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No model data available</p>
                )}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-800 dark:text-green-200">Total Cost</h4>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${costAnalytics.totalCost?.toFixed(4) || '0.0000'}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  ${costAnalytics.averageCostPerTrace?.toFixed(6) || '0.000000'} avg per trace
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Token Usage</h4>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {costAnalytics.totalTokens?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {costAnalytics.averageTokensPerTrace || 0} avg per trace
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-800 dark:text-purple-200">Cost Efficiency</h4>
                </div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  ${costAnalytics.costPerToken?.toFixed(8) || '0.00000000'}
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">per token</p>
              </div>
            </div>

            {/* Token Breakdown */}
            <div className="mt-6">
              <h4 className="font-medium text-primary mb-3">Token Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <span className="text-sm font-medium">Prompt Tokens</span>
                  <span className="text-sm text-primary font-bold">
                    {costAnalytics.totalPromptTokens?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <span className="text-sm font-medium">Completion Tokens</span>
                  <span className="text-sm text-primary font-bold">
                    {costAnalytics.totalCompletionTokens?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <MetricsConfigurationModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        project={project}
        onSave={handleConfigSave}
      />

      <BatchEvaluationModal
        isOpen={showBatchModal}
        onClose={() => setShowBatchModal(false)}
        project={project}
        onStartJob={handleStartBatchJob}
      />
    </div>
  )
}