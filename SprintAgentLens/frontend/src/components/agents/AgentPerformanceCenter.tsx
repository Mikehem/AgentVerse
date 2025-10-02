'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Zap,
  Brain,
  Users,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Star,
  RefreshCw,
  Eye,
  Settings,
  Award,
  Cpu,
  Heart,
  ArrowRight
} from 'lucide-react'

interface AgentPerformance {
  agent_id: string
  agent_name: string
  version: string
  status: 'active' | 'inactive' | 'maintenance'
  health_score: number
  performance_metrics: {
    response_time: {
      average: number
      p95: number
      p99: number
      trend: 'up' | 'down' | 'stable'
    }
    success_rate: {
      current: number
      target: number
      trend: 'up' | 'down' | 'stable'
    }
    throughput: {
      requests_per_hour: number
      peak_rps: number
      current_rps: number
    }
    quality_metrics: {
      user_satisfaction: number
      accuracy_score: number
      helpfulness_rating: number
      coherence_score: number
    }
    error_analysis: {
      total_errors: number
      error_rate: number
      common_errors: ErrorType[]
    }
  }
  usage_analytics: {
    total_conversations: number
    unique_users: number
    conversation_length_avg: number
    peak_usage_hour: string
    geographic_distribution: LocationMetric[]
  }
  comparative_analysis: {
    rank_among_agents: number
    total_agents: number
    performance_percentile: number
    improvement_vs_baseline: number
  }
  optimization_insights: OptimizationInsight[]
  alerts: PerformanceAlert[]
}

interface ErrorType {
  type: string
  count: number
  percentage: number
  example: string
  impact: 'low' | 'medium' | 'high'
}

interface LocationMetric {
  region: string
  requests: number
  avg_response_time: number
  satisfaction_score: number
}

interface OptimizationInsight {
  category: 'performance' | 'quality' | 'cost' | 'user_experience'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  potential_improvement: string
  recommended_actions: string[]
  complexity: 'simple' | 'moderate' | 'complex'
}

interface PerformanceAlert {
  id: string
  type: 'performance_degradation' | 'error_spike' | 'low_satisfaction' | 'capacity_limit'
  severity: 'info' | 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  duration: string
}

interface AgentPerformanceCenterProps {
  projectId: string
}

export function AgentPerformanceCenter({ projectId }: AgentPerformanceCenterProps) {
  const [agents, setAgents] = useState<AgentPerformance[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentPerformance | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'quality' | 'insights' | 'comparison'>('overview')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [showComparison, setShowComparison] = useState(false)

  useEffect(() => {
    fetchAgentPerformance()
    const interval = setInterval(fetchAgentPerformance, 30000)
    return () => clearInterval(interval)
  }, [projectId, timeRange])

  const fetchAgentPerformance = async () => {
    try {
      const response = await fetch(`/api/v1/agents/performance?projectId=${projectId}&timeRange=${timeRange}`)
      const data = await response.json()
      if (data.success) {
        setAgents(data.agents)
        if (!selectedAgent && data.agents.length > 0) {
          setSelectedAgent(data.agents[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch agent performance:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  
  const getHealthColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600'
    if (score >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <ArrowRight className="w-4 h-4 text-gray-400" />
    }
  }

  const getPerformanceGrade = (percentile: number) => {
    if (percentile >= 90) return { grade: 'A+', color: 'text-green-600' }
    if (percentile >= 80) return { grade: 'A', color: 'text-green-600' }
    if (percentile >= 70) return { grade: 'B+', color: 'text-blue-600' }
    if (percentile >= 60) return { grade: 'B', color: 'text-blue-600' }
    if (percentile >= 50) return { grade: 'C', color: 'text-yellow-600' }
    return { grade: 'D', color: 'text-red-600' }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Agent Performance Center</h2>
          <p className="text-muted">Monitor and optimize AI agent performance across all metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md"
          >
            <option value="1h">Last hour</option>
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button 
            onClick={() => setShowComparison(!showComparison)}
            className="btn btn-outline"
          >
            <BarChart3 className="w-4 h-4" />
            Compare
          </button>
        </div>
      </div>

      {/* Agent Performance Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agents.map(agent => {
          const grade = getPerformanceGrade(agent.comparative_analysis.performance_percentile)
          
          return (
            <div 
              key={agent.agent_id}
              className={`card p-4 cursor-pointer transition-all ${
                selectedAgent?.agent_id === agent.agent_id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'active' ? 'bg-green-500' :
                    agent.status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`} />
                  <h3 className="font-semibold text-primary">{agent.agent_name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Heart className={`w-4 h-4 ${getHealthColor(agent.health_score)}`} />
                  <span className={`text-sm font-medium ${getHealthColor(agent.health_score)}`}>
                    {(agent.health_score * 100).toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Success Rate</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{formatPercentage(agent.performance_metrics.success_rate.current)}</span>
                    {getTrendIcon(agent.performance_metrics.success_rate.trend)}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Avg Response</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{agent.performance_metrics.response_time.average}ms</span>
                    {getTrendIcon(agent.performance_metrics.response_time.trend)}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Satisfaction</span>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`w-3 h-3 ${
                          i < Math.round(agent.performance_metrics.quality_metrics.user_satisfaction * 5) 
                            ? 'text-yellow-400 fill-current' 
                            : 'text-gray-300'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Conversations</span>
                  <span className="font-medium">{formatNumber(agent.usage_analytics.total_conversations)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1">
                  <Award className={`w-4 h-4 ${grade.color}`} />
                  <span className={`text-sm font-medium ${grade.color}`}>
                    Grade {grade.grade}
                  </span>
                </div>
                <span className="text-xs text-muted">
                  Rank #{agent.comparative_analysis.rank_among_agents} of {agent.comparative_analysis.total_agents}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Detailed Agent Analysis */}
      {selectedAgent && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-4 h-4 rounded-full ${
                selectedAgent.status === 'active' ? 'bg-green-500' :
                selectedAgent.status === 'maintenance' ? 'bg-yellow-500' : 'bg-gray-500'
              }`} />
              <div>
                <h3 className="text-xl font-bold text-primary">{selectedAgent.agent_name}</h3>
                <p className="text-muted">
                  Version {selectedAgent.version} • Health Score: {(selectedAgent.health_score * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-outline">
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button className="btn btn-outline">
                <Settings className="w-4 h-4" />
                Configure
              </button>
            </div>
          </div>

          {/* Performance Alerts */}
          {selectedAgent.alerts.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-primary mb-3">Active Alerts</h4>
              <div className="space-y-2">
                {selectedAgent.alerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg ${
                    alert.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                    alert.severity === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-blue-50 border border-blue-200'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">{alert.message}</p>
                      <p className="text-xs text-muted">
                        Current: {alert.value} | Threshold: {alert.threshold} | Duration: {alert.duration}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b border-border">
            {[
              { id: 'overview', label: 'Performance Overview', icon: Activity },
              { id: 'performance', label: 'Technical Metrics', icon: Cpu },
              { id: 'quality', label: 'Quality Metrics', icon: Star },
              { id: 'insights', label: 'Optimization', icon: Brain },
              { id: 'comparison', label: 'Benchmarking', icon: BarChart3 }
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
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      {formatPercentage(selectedAgent.performance_metrics.success_rate.current)}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Success Rate</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(selectedAgent.performance_metrics.success_rate.trend)}
                    <span className="text-sm text-muted">
                      Target: {formatPercentage(selectedAgent.performance_metrics.success_rate.target)}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="w-6 h-6 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      {selectedAgent.performance_metrics.response_time.average}ms
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Avg Response Time</h4>
                  <div className="flex items-center gap-1 mt-1">
                    {getTrendIcon(selectedAgent.performance_metrics.response_time.trend)}
                    <span className="text-sm text-muted">
                      P95: {selectedAgent.performance_metrics.response_time.p95}ms
                    </span>
                  </div>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="w-6 h-6 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-600">
                      {selectedAgent.performance_metrics.throughput.current_rps}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Current RPS</h4>
                  <p className="text-sm text-muted">
                    Peak: {selectedAgent.performance_metrics.throughput.peak_rps} RPS
                  </p>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-6 h-6 text-orange-600" />
                    <span className="text-2xl font-bold text-orange-600">
                      {formatNumber(selectedAgent.usage_analytics.unique_users)}
                    </span>
                  </div>
                  <h4 className="font-medium text-primary">Unique Users</h4>
                  <p className="text-sm text-muted">
                    {formatNumber(selectedAgent.usage_analytics.total_conversations)} conversations
                  </p>
                </div>
              </div>

              {/* Quality Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'User Satisfaction', value: selectedAgent.performance_metrics.quality_metrics.user_satisfaction, icon: ThumbsUp },
                  { label: 'Accuracy Score', value: selectedAgent.performance_metrics.quality_metrics.accuracy_score, icon: Target },
                  { label: 'Helpfulness', value: selectedAgent.performance_metrics.quality_metrics.helpfulness_rating, icon: Heart },
                  { label: 'Coherence', value: selectedAgent.performance_metrics.quality_metrics.coherence_score, icon: MessageSquare }
                ].map((metric, index) => (
                  <div key={index} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <metric.icon className="w-5 h-5 text-blue-600" />
                      <span className={`text-lg font-bold ${getHealthColor(metric.value)}`}>
                        {(metric.value * 100).toFixed(0)}
                      </span>
                    </div>
                    <h4 className="font-medium text-primary">{metric.label}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.value >= 0.8 ? 'bg-green-500' :
                          metric.value >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${metric.value * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical Performance Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              {/* Error Analysis */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Error Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {selectedAgent.performance_metrics.error_analysis.total_errors}
                    </p>
                    <p className="text-sm text-muted">Total Errors</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">
                      {formatPercentage(selectedAgent.performance_metrics.error_analysis.error_rate)}
                    </p>
                    <p className="text-sm text-muted">Error Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">
                      {selectedAgent.performance_metrics.error_analysis.common_errors.length}
                    </p>
                    <p className="text-sm text-muted">Error Types</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {selectedAgent.performance_metrics.error_analysis.common_errors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-primary">{error.type}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            error.impact === 'high' ? 'bg-red-100 text-red-700' :
                            error.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {error.impact} impact
                          </span>
                        </div>
                        <p className="text-sm text-muted">{error.example}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{error.count}</p>
                        <p className="text-sm text-muted">{formatPercentage(error.percentage / 100)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Geographic Performance */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Geographic Performance</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted">Region</th>
                        <th className="text-right py-3 px-2 font-medium text-muted">Requests</th>
                        <th className="text-right py-3 px-2 font-medium text-muted">Avg Response Time</th>
                        <th className="text-right py-3 px-2 font-medium text-muted">Satisfaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAgent.usage_analytics.geographic_distribution.map((location, index) => (
                        <tr key={index} className="border-b border-border hover:bg-gray-50">
                          <td className="py-4 px-2 font-medium text-primary">{location.region}</td>
                          <td className="py-4 px-2 text-right">{formatNumber(location.requests)}</td>
                          <td className="py-4 px-2 text-right">{location.avg_response_time}ms</td>
                          <td className="py-4 px-2 text-right">
                            <span className={getHealthColor(location.satisfaction_score)}>
                              {(location.satisfaction_score * 100).toFixed(0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Optimization Insights Tab */}
          {activeTab === 'insights' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Optimization Recommendations</h3>
                <div className="space-y-4">
                  {selectedAgent.optimization_insights.map((insight, index) => (
                    <div key={index} className="border border-border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            insight.priority === 'high' ? 'bg-red-500' :
                            insight.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <h4 className="font-medium text-primary">{insight.title}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insight.priority === 'high' ? 'bg-red-100 text-red-700' :
                            insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {insight.priority} priority
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            insight.complexity === 'simple' ? 'bg-green-100 text-green-700' :
                            insight.complexity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {insight.complexity}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted mb-3">{insight.description}</p>
                      
                      <div className="bg-blue-50 p-3 rounded-lg mb-3">
                        <p className="text-sm font-medium text-blue-800">
                          Expected Improvement: {insight.potential_improvement}
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-primary">Recommended Actions:</h5>
                        <ul className="text-sm text-muted space-y-1">
                          {insight.recommended_actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="flex items-start gap-2">
                              <div className="w-1 h-1 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="flex justify-end mt-4">
                        <button className="btn btn-sm btn-primary">
                          Apply Optimization
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}