'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  DollarSign, 
  Clock, 
  Brain, 
  Split,
  RefreshCw,
  Star,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TestTube,
  Lightbulb,
  Award
} from 'lucide-react'

interface PromptAnalytics {
  prompt_id: string
  prompt_name: string
  version: string
  performance_metrics: {
    success_rate: number
    avg_response_time: number
    token_efficiency: number
    quality_score: number
    user_satisfaction: number
    cost_per_request: number
  }
  usage_stats: {
    total_requests: number
    requests_24h: number
    unique_users: number
    peak_rps: number
  }
  effectiveness_analysis: {
    clarity_score: number
    specificity_score: number
    completeness_score: number
    optimization_potential: number
  }
  comparison_data: {
    vs_previous_version: {
      success_rate_change: number
      response_time_change: number
      cost_change: number
      quality_change: number
    }
    vs_baseline: {
      performance_improvement: number
      cost_efficiency: number
    }
  }
  optimization_recommendations: Recommendation[]
  ab_test_results?: ABTestResult[]
}

interface Recommendation {
  id: string
  type: 'performance' | 'cost' | 'quality' | 'clarity'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  expected_improvement: string
  effort_required: 'low' | 'medium' | 'high'
  implementation_guide: string
}

interface ABTestResult {
  test_id: string
  variant_a: string
  variant_b: string
  winner: 'a' | 'b' | 'inconclusive'
  confidence_level: number
  metrics: {
    success_rate_a: number
    success_rate_b: number
    response_time_a: number
    response_time_b: number
    quality_score_a: number
    quality_score_b: number
    cost_a: number
    cost_b: number
  }
  sample_size: number
  duration_days: number
  status: 'running' | 'completed' | 'paused'
}

interface PromptAnalyticsCenterProps {
  projectId: string
}

export function PromptAnalyticsCenter({ projectId }: PromptAnalyticsCenterProps) {
  const [analytics, setAnalytics] = useState<PromptAnalytics[]>([])
  const [selectedPrompt, setSelectedPrompt] = useState<PromptAnalytics | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'effectiveness' | 'optimization' | 'testing'>('overview')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')

  useEffect(() => {
    fetchPromptAnalytics()
    const interval = setInterval(fetchPromptAnalytics, 30000)
    return () => clearInterval(interval)
  }, [projectId, timeRange])

  const fetchPromptAnalytics = async () => {
    try {
      const response = await fetch(`/api/v1/prompts/analytics?projectId=${projectId}&timeRange=${timeRange}`)
      const data = await response.json()
      if (data.success) {
        setAnalytics(data.analytics)
        if (!selectedPrompt && data.analytics.length > 0) {
          setSelectedPrompt(data.analytics[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch prompt analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const startABTest = async (promptId: string, variantConfig: any) => {
    try {
      const response = await fetch(`/api/v1/prompts/${promptId}/ab-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(variantConfig)
      })
      const data = await response.json()
      if (data.success) {
        await fetchPromptAnalytics() // Refresh data
      }
    } catch (error) {
      console.error('Failed to start A/B test:', error)
    }
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatCurrency = (value: number) => `$${value.toFixed(4)}`
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />
    return <ArrowRight className="w-4 h-4 text-gray-400" />
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-primary">Prompt Performance Analytics</h2>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Prompt Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {analytics.map(prompt => (
          <div 
            key={prompt.prompt_id}
            className={`card p-4 cursor-pointer transition-all ${
              selectedPrompt?.prompt_id === prompt.prompt_id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedPrompt(prompt)}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-primary">{prompt.prompt_name}</h3>
                <p className="text-sm text-muted">v{prompt.version}</p>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`w-4 h-4 ${
                      i < Math.round(prompt.performance_metrics.quality_score * 5) 
                        ? 'text-yellow-400 fill-current' 
                        : 'text-gray-300'
                    }`} 
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Success Rate</span>
                <span className={`font-medium ${getScoreColor(prompt.performance_metrics.success_rate)}`}>
                  {formatPercentage(prompt.performance_metrics.success_rate)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted">Quality Score</span>
                <span className={`font-medium ${getScoreColor(prompt.performance_metrics.quality_score)}`}>
                  {(prompt.performance_metrics.quality_score * 100).toFixed(0)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted">Avg Response</span>
                <span className="font-medium">{prompt.performance_metrics.avg_response_time}ms</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-muted">Cost/Request</span>
                <span className="font-medium">{formatCurrency(prompt.performance_metrics.cost_per_request)}</span>
              </div>
            </div>

            {/* Quick Performance Indicators */}
            <div className="mt-3 pt-3 border-t border-border flex justify-between">
              <div className="flex items-center gap-1">
                {getChangeIcon(prompt.comparison_data.vs_previous_version.success_rate_change)}
                <span className="text-xs text-muted">vs prev</span>
              </div>
              <div className="text-xs text-muted">
                {formatNumber(prompt.usage_stats.requests_24h)} requests
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Analytics */}
      {selectedPrompt && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-primary">{selectedPrompt.prompt_name}</h3>
              <p className="text-muted">Version {selectedPrompt.version} • {formatNumber(selectedPrompt.usage_stats.total_requests)} total requests</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {/* Start A/B test modal */}}
                className="btn btn-outline"
              >
                <TestTube className="w-4 h-4" />
                A/B Test
              </button>
              <button className="btn btn-primary">
                <Lightbulb className="w-4 h-4" />
                Optimize
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b border-border">
            {[
              { id: 'overview', label: 'Performance Overview', icon: BarChart3 },
              { id: 'effectiveness', label: 'Effectiveness Analysis', icon: Target },
              { id: 'optimization', label: 'Optimization', icon: Lightbulb },
              { id: 'testing', label: 'A/B Testing', icon: TestTube }
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

          {/* Performance Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {formatPercentage(selectedPrompt.performance_metrics.success_rate)}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Success Rate</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {getChangeIcon(selectedPrompt.comparison_data.vs_previous_version.success_rate_change)}
                    <span className="text-sm text-muted">
                      {Math.abs(selectedPrompt.comparison_data.vs_previous_version.success_rate_change * 100).toFixed(1)}% vs prev
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedPrompt.performance_metrics.avg_response_time}ms
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Avg Response Time</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {getChangeIcon(-selectedPrompt.comparison_data.vs_previous_version.response_time_change)}
                    <span className="text-sm text-muted">
                      {Math.abs(selectedPrompt.comparison_data.vs_previous_version.response_time_change).toFixed(0)}ms vs prev
                    </span>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Brain className="w-6 h-6 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-600">
                      {(selectedPrompt.performance_metrics.quality_score * 100).toFixed(0)}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Quality Score</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {getChangeIcon(selectedPrompt.comparison_data.vs_previous_version.quality_change)}
                    <span className="text-sm text-muted">
                      {Math.abs(selectedPrompt.comparison_data.vs_previous_version.quality_change * 100).toFixed(1)} vs prev
                    </span>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <DollarSign className="w-6 h-6 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-600">
                      {formatCurrency(selectedPrompt.performance_metrics.cost_per_request)}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Cost per Request</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {getChangeIcon(-selectedPrompt.comparison_data.vs_previous_version.cost_change)}
                    <span className="text-sm text-muted">
                      {formatCurrency(Math.abs(selectedPrompt.comparison_data.vs_previous_version.cost_change))} vs prev
                    </span>
                  </div>
                </div>
              </div>

              {/* Usage Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-2">Usage Volume</h4>
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(selectedPrompt.usage_stats.requests_24h)}
                  </p>
                  <p className="text-sm text-muted">
                    requests in last {timeRange}
                  </p>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-2">Unique Users</h4>
                  <p className="text-2xl font-bold text-primary">
                    {formatNumber(selectedPrompt.usage_stats.unique_users)}
                  </p>
                  <p className="text-sm text-muted">
                    active users
                  </p>
                </div>

                <div className="card p-4">
                  <h4 className="font-medium text-primary mb-2">Peak RPS</h4>
                  <p className="text-2xl font-bold text-primary">
                    {selectedPrompt.usage_stats.peak_rps}
                  </p>
                  <p className="text-sm text-muted">
                    requests per second
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Effectiveness Analysis Tab */}
          {activeTab === 'effectiveness' && (
            <div className="space-y-6">
              {/* Effectiveness Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Clarity', score: selectedPrompt.effectiveness_analysis.clarity_score, icon: Brain },
                  { label: 'Specificity', score: selectedPrompt.effectiveness_analysis.specificity_score, icon: Target },
                  { label: 'Completeness', score: selectedPrompt.effectiveness_analysis.completeness_score, icon: CheckCircle },
                  { label: 'Optimization Potential', score: selectedPrompt.effectiveness_analysis.optimization_potential, icon: TrendingUp }
                ].map((metric, index) => (
                  <div key={index} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <metric.icon className="w-6 h-6 text-blue-600" />
                      <span className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                        {(metric.score * 100).toFixed(0)}
                      </span>
                    </div>
                    <h4 className="font-medium text-primary">{metric.label}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.score >= 0.8 ? 'bg-green-500' :
                          metric.score >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${metric.score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Analysis */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Effectiveness Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-primary">Strengths</h4>
                      <p className="text-sm text-muted">
                        High clarity score indicates clear and unambiguous instructions. 
                        Users understand the prompt requirements well.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-primary">Areas for Improvement</h4>
                      <p className="text-sm text-muted">
                        Specificity could be enhanced with more detailed context and examples. 
                        Consider adding constraints or format specifications.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium text-primary">Optimization Opportunity</h4>
                      <p className="text-sm text-muted">
                        {(selectedPrompt.effectiveness_analysis.optimization_potential * 100).toFixed(0)}% potential improvement identified. 
                        Focus on token efficiency and response structure.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === 'optimization' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Optimization Recommendations</h3>
                <div className="space-y-4">
                  {selectedPrompt.optimization_recommendations.map(rec => (
                    <div key={rec.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            rec.priority === 'high' ? 'bg-red-500' :
                            rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <h4 className="font-medium text-primary">{rec.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                            rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {rec.priority} priority
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rec.effort_required === 'low' ? 'bg-green-100 text-green-700' :
                            rec.effort_required === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {rec.effort_required} effort
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted mb-2">{rec.description}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">
                            Expected: {rec.expected_improvement}
                          </span>
                        </div>
                        <button className="btn btn-sm btn-outline">
                          Apply Suggestion
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* A/B Testing Tab */}
          {activeTab === 'testing' && (
            <div className="space-y-6">
              {selectedPrompt.ab_test_results && selectedPrompt.ab_test_results.length > 0 ? (
                <div className="space-y-4">
                  {selectedPrompt.ab_test_results.map(test => (
                    <div key={test.test_id} className="card p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold text-primary">
                            {test.variant_a} vs {test.variant_b}
                          </h4>
                          <p className="text-sm text-muted">
                            {test.duration_days} days • {formatNumber(test.sample_size)} samples
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            test.status === 'completed' ? 'bg-green-100 text-green-700' :
                            test.status === 'running' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {test.status}
                          </span>
                          {test.winner !== 'inconclusive' && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                              Winner: Variant {test.winner.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Success Rate', a: test.metrics.success_rate_a, b: test.metrics.success_rate_b, format: formatPercentage },
                          { label: 'Response Time', a: test.metrics.response_time_a, b: test.metrics.response_time_b, format: (v: number) => `${v}ms` },
                          { label: 'Quality Score', a: test.metrics.quality_score_a, b: test.metrics.quality_score_b, format: (v: number) => v.toFixed(2) },
                          { label: 'Cost', a: test.metrics.cost_a, b: test.metrics.cost_b, format: formatCurrency }
                        ].map((metric, index) => (
                          <div key={index} className="bg-gray-50 p-3 rounded-lg">
                            <h5 className="text-sm font-medium text-primary mb-2">{metric.label}</h5>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>Variant A:</span>
                                <span className="font-medium">{metric.format(metric.a)}</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span>Variant B:</span>
                                <span className="font-medium">{metric.format(metric.b)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                        <span className="text-sm text-muted">
                          Confidence: {(test.confidence_level * 100).toFixed(1)}%
                        </span>
                        <div className="flex gap-2">
                          {test.status === 'running' && (
                            <button className="btn btn-sm btn-outline">
                              Pause Test
                            </button>
                          )}
                          <button className="btn btn-sm btn-primary">
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <TestTube className="w-16 h-16 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-primary mb-2">No A/B Tests Yet</h3>
                  <p className="text-muted mb-6">
                    Start testing different prompt variations to optimize performance
                  </p>
                  <button className="btn btn-primary">
                    <Split className="w-4 h-4" />
                    Create A/B Test
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}