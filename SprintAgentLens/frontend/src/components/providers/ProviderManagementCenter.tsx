'use client'

import { useState, useEffect } from 'react'
import { 
  Cpu, 
  DollarSign, 
  Activity, 
  BarChart3, 
  Shield, 
  Zap, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  Gauge,
  Route,
  Target
} from 'lucide-react'

interface LLMProvider {
  id: string
  name: string
  type: 'openai' | 'anthropic' | 'azure' | 'google' | 'custom'
  display_name: string
  status: 'active' | 'inactive' | 'maintenance'
  health_status: 'healthy' | 'degraded' | 'unhealthy'
  models: Model[]
  usage_stats: UsageStats
  cost_metrics: CostMetrics
  performance_metrics: PerformanceMetrics
  rate_limits: RateLimits
  configuration: ProviderConfig
}

interface Model {
  id: string
  name: string
  type: 'text' | 'chat' | 'embedding' | 'image'
  context_length: number
  cost_per_1k_tokens: {
    input: number
    output: number
  }
  capabilities: string[]
  performance_tier: 'basic' | 'standard' | 'premium'
}

interface UsageStats {
  requests_24h: number
  tokens_24h: number
  success_rate: number
  avg_response_time: number
  peak_rps: number
  current_rps: number
}

interface CostMetrics {
  cost_24h: number
  cost_30d: number
  cost_per_request: number
  token_efficiency: number
  cost_trend: 'up' | 'down' | 'stable'
}

interface PerformanceMetrics {
  avg_latency: number
  p95_latency: number
  error_rate: number
  availability: number
  quality_score: number
}

interface RateLimits {
  requests_per_minute: number
  tokens_per_minute: number
  concurrent_requests: number
  current_usage: {
    requests: number
    tokens: number
    concurrent: number
  }
}

interface ProviderConfig {
  failover_enabled: boolean
  priority: number
  retry_attempts: number
  timeout_ms: number
  load_balancing_weight: number
}

export function ProviderManagementCenter() {
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'performance' | 'costs' | 'configuration'>('overview')
  const [loading, setLoading] = useState(true)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])

  useEffect(() => {
    fetchProviders()
    // Set up real-time updates
    const interval = setInterval(fetchProviders, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/v1/providers/detailed')
      const data = await response.json()
      if (data.success) {
        setProviders(data.providers)
        if (!selectedProvider && data.providers.length > 0) {
          setSelectedProvider(data.providers[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'unhealthy':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'openai': return '🤖'
      case 'anthropic': return '🧠'
      case 'azure': return '☁️'
      case 'google': return '🟡'
      default: return '⚙️'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Provider Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {providers.map(provider => (
          <div 
            key={provider.id}
            className={`card p-4 cursor-pointer transition-all ${
              selectedProvider?.id === provider.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedProvider(provider)}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getProviderIcon(provider.type)}</span>
                <span className="font-medium text-primary">{provider.display_name}</span>
              </div>
              {getHealthIcon(provider.health_status)}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Success Rate</span>
                <span className={`font-medium ${
                  provider.usage_stats.success_rate >= 99 ? 'text-green-600' :
                  provider.usage_stats.success_rate >= 95 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {provider.usage_stats.success_rate}%
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted">Avg Latency</span>
                <span className="font-medium">{provider.performance_metrics.avg_latency}ms</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Cost</span>
                <span className="font-medium">{formatCurrency(provider.cost_metrics.cost_24h)}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted">Requests</span>
                <span className="font-medium">{formatNumber(provider.usage_stats.requests_24h)}</span>
              </div>
            </div>

            {/* Rate Limit Indicator */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex justify-between text-xs text-muted mb-1">
                <span>Rate Limit Usage</span>
                <span>
                  {Math.round((provider.rate_limits.current_usage.requests / provider.rate_limits.requests_per_minute) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    (provider.rate_limits.current_usage.requests / provider.rate_limits.requests_per_minute) > 0.8 
                      ? 'bg-red-500' 
                      : (provider.rate_limits.current_usage.requests / provider.rate_limits.requests_per_minute) > 0.6
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min((provider.rate_limits.current_usage.requests / provider.rate_limits.requests_per_minute) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Provider View */}
      {selectedProvider && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getProviderIcon(selectedProvider.type)}</span>
              <div>
                <h2 className="text-xl font-bold text-primary">{selectedProvider.display_name}</h2>
                <p className="text-muted">{selectedProvider.models.length} models available</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setComparisonMode(!comparisonMode)}
                className="btn btn-outline"
              >
                <BarChart3 className="w-4 h-4" />
                Compare
              </button>
              <button className="btn btn-outline">
                <Settings className="w-4 h-4" />
                Configure
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b border-border">
            {[
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'models', label: 'Models', icon: Cpu },
              { id: 'performance', label: 'Performance', icon: Gauge },
              { id: 'costs', label: 'Costs', icon: DollarSign },
              { id: 'configuration', label: 'Configuration', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'text-primary border-b-2 border-primary bg-primary/5'
                    : 'text-muted hover:text-primary'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Real-time Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedProvider.usage_stats.current_rps}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Current RPS</h4>
                  <p className="text-sm text-muted">Peak: {selectedProvider.usage_stats.peak_rps}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {selectedProvider.usage_stats.success_rate}%
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Success Rate</h4>
                  <p className="text-sm text-muted">24h average</p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-6 h-6 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-600">
                      {selectedProvider.performance_metrics.avg_latency}ms
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Avg Latency</h4>
                  <p className="text-sm text-muted">P95: {selectedProvider.performance_metrics.p95_latency}ms</p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-600">
                      {formatCurrency(selectedProvider.cost_metrics.cost_24h)}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">24h Cost</h4>
                  <p className="text-sm text-muted">
                    {selectedProvider.cost_metrics.cost_trend === 'up' ? '↗' : 
                     selectedProvider.cost_metrics.cost_trend === 'down' ? '↘' : '→'} 
                    vs yesterday
                  </p>
                </div>
              </div>

              {/* Rate Limits Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-primary mb-3">Requests per Minute</h4>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{selectedProvider.rate_limits.current_usage.requests}</span>
                    <span>{selectedProvider.rate_limits.requests_per_minute} limit</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-blue-500 rounded-full"
                      style={{ 
                        width: `${Math.min((selectedProvider.rate_limits.current_usage.requests / selectedProvider.rate_limits.requests_per_minute) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-primary mb-3">Tokens per Minute</h4>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{formatNumber(selectedProvider.rate_limits.current_usage.tokens)}</span>
                    <span>{formatNumber(selectedProvider.rate_limits.tokens_per_minute)} limit</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-purple-500 rounded-full"
                      style={{ 
                        width: `${Math.min((selectedProvider.rate_limits.current_usage.tokens / selectedProvider.rate_limits.tokens_per_minute) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-primary mb-3">Concurrent Requests</h4>
                  <div className="flex justify-between text-sm mb-2">
                    <span>{selectedProvider.rate_limits.current_usage.concurrent}</span>
                    <span>{selectedProvider.rate_limits.concurrent_requests} limit</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="h-2 bg-green-500 rounded-full"
                      style={{ 
                        width: `${Math.min((selectedProvider.rate_limits.current_usage.concurrent / selectedProvider.rate_limits.concurrent_requests) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'models' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-2 font-medium text-muted">Model</th>
                      <th className="text-left py-3 px-2 font-medium text-muted">Type</th>
                      <th className="text-right py-3 px-2 font-medium text-muted">Context</th>
                      <th className="text-right py-3 px-2 font-medium text-muted">Input Cost</th>
                      <th className="text-right py-3 px-2 font-medium text-muted">Output Cost</th>
                      <th className="text-center py-3 px-2 font-medium text-muted">Tier</th>
                      <th className="text-center py-3 px-2 font-medium text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProvider.models.map(model => (
                      <tr key={model.id} className="border-b border-border hover:bg-gray-50">
                        <td className="py-4 px-2">
                          <div>
                            <p className="font-medium text-primary">{model.name}</p>
                            <p className="text-sm text-muted">{model.capabilities.join(', ')}</p>
                          </div>
                        </td>
                        <td className="py-4 px-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            model.type === 'chat' ? 'bg-blue-100 text-blue-700' :
                            model.type === 'text' ? 'bg-green-100 text-green-700' :
                            model.type === 'embedding' ? 'bg-purple-100 text-purple-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {model.type}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-right font-mono text-sm">
                          {formatNumber(model.context_length)}
                        </td>
                        <td className="py-4 px-2 text-right font-mono text-sm">
                          ${model.cost_per_1k_tokens.input}
                        </td>
                        <td className="py-4 px-2 text-right font-mono text-sm">
                          ${model.cost_per_1k_tokens.output}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            model.performance_tier === 'premium' ? 'bg-gold-100 text-gold-700' :
                            model.performance_tier === 'standard' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {model.performance_tier}
                          </span>
                        </td>
                        <td className="py-4 px-2 text-center">
                          <button className="btn btn-sm btn-outline">
                            <ExternalLink className="w-3 h-3" />
                            Test
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Performance Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold text-primary">
                      {selectedProvider.performance_metrics.availability}%
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Availability</h4>
                  <p className="text-sm text-muted">30-day SLA: 99.9%</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Gauge className="w-6 h-6 text-green-600" />
                    <span className="text-2xl font-bold text-primary">
                      {selectedProvider.performance_metrics.quality_score}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Quality Score</h4>
                  <p className="text-sm text-muted">Based on user feedback</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                    <span className="text-2xl font-bold text-primary">
                      {selectedProvider.performance_metrics.error_rate}%
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Error Rate</h4>
                  <p className="text-sm text-muted">24h rolling average</p>
                </div>
              </div>

              {/* Performance Charts Placeholder */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Performance Trends</h3>
                <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-muted mx-auto mb-2" />
                    <p className="text-muted">Performance charts would be displayed here</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'costs' && (
            <div className="space-y-6">
              {/* Cost Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-2">24h Cost</h4>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedProvider.cost_metrics.cost_24h)}
                  </p>
                  <p className="text-sm text-muted">
                    {formatCurrency(selectedProvider.cost_metrics.cost_per_request)} per request
                  </p>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-2">30d Cost</h4>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(selectedProvider.cost_metrics.cost_30d)}
                  </p>
                  <p className="text-sm text-muted">
                    Projected monthly: {formatCurrency(selectedProvider.cost_metrics.cost_30d * 1.03)}
                  </p>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-2">Token Efficiency</h4>
                  <p className="text-2xl font-bold text-primary">
                    {selectedProvider.cost_metrics.token_efficiency}
                  </p>
                  <p className="text-sm text-muted">Cost per useful token</p>
                </div>
              </div>

              {/* Cost Breakdown by Model */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Cost Breakdown by Model</h3>
                <div className="space-y-3">
                  {selectedProvider.models.map(model => (
                    <div key={model.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-primary">{model.name}</p>
                        <p className="text-sm text-muted">
                          Input: ${model.cost_per_1k_tokens.input}/1k • Output: ${model.cost_per_1k_tokens.output}/1k
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {formatCurrency(Math.random() * 100 + 50)}
                        </p>
                        <p className="text-sm text-muted">24h usage</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-3">Failover Configuration</h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        defaultChecked={selectedProvider.configuration.failover_enabled}
                        className="rounded border-border"
                      />
                      <span className="text-sm">Enable automatic failover</span>
                    </label>
                    
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Priority</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option value="1">Primary</option>
                        <option value="2">Secondary</option>
                        <option value="3">Tertiary</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Retry Attempts</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5" 
                        defaultValue={selectedProvider.configuration.retry_attempts}
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-3">Performance Settings</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Timeout (ms)</label>
                      <input 
                        type="number" 
                        min="1000" 
                        max="30000" 
                        defaultValue={selectedProvider.configuration.timeout_ms}
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-primary mb-1">Load Balancing Weight</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        defaultValue={selectedProvider.configuration.load_balancing_weight}
                        className="w-full"
                      />
                      <div className="flex justify-between text-sm text-muted">
                        <span>0%</span>
                        <span>{selectedProvider.configuration.load_balancing_weight}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button className="btn btn-outline">Reset to Defaults</button>
                <button className="btn btn-primary">Save Configuration</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}