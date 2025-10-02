'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Cpu, 
  Memory, 
  HardDrive, 
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  PieChart,
  Calendar,
  Coins,
  Activity,
  Settings,
  RefreshCw,
  Download,
  Bell,
  Shield,
  Gauge
} from 'lucide-react'

interface ResourceMetrics {
  usage_stats: {
    cpu_utilization: number
    memory_utilization: number
    storage_utilization: number
    network_bandwidth: number
    active_connections: number
    peak_concurrent_users: number
  }
  cost_breakdown: {
    compute_costs: CostItem[]
    storage_costs: CostItem[]
    network_costs: CostItem[]
    llm_api_costs: CostItem[]
    total_cost_24h: number
    total_cost_30d: number
    projected_monthly: number
  }
  efficiency_metrics: {
    cost_per_request: number
    cost_per_user: number
    resource_efficiency: number
    utilization_score: number
    waste_percentage: number
  }
  forecasting: {
    predicted_cost_7d: number
    predicted_cost_30d: number
    growth_rate: number
    capacity_recommendations: CapacityRecommendation[]
  }
  alerts: Alert[]
  budgets: Budget[]
}

interface CostItem {
  category: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
  details: {
    provider?: string
    resource_type?: string
    quantity?: number
    unit_cost?: number
  }
}

interface CapacityRecommendation {
  type: 'scale_up' | 'scale_down' | 'optimize' | 'migrate'
  resource: string
  current_state: string
  recommended_state: string
  estimated_savings: number
  impact: 'low' | 'medium' | 'high'
  urgency: 'low' | 'medium' | 'high'
}

interface Alert {
  id: string
  type: 'budget' | 'usage' | 'efficiency' | 'anomaly'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  threshold: number
  current_value: number
  created_at: string
}

interface Budget {
  id: string
  name: string
  category: 'total' | 'compute' | 'storage' | 'llm_api'
  amount: number
  period: 'daily' | 'weekly' | 'monthly'
  spent: number
  remaining: number
  alert_threshold: number
  status: 'on_track' | 'warning' | 'exceeded'
}

export function ResourceManagementCenter() {
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'costs' | 'efficiency' | 'forecasting' | 'budgets'>('overview')
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')
  const [selectedCostCategory, setSelectedCostCategory] = useState<string>('all')

  useEffect(() => {
    fetchResourceMetrics()
    const interval = setInterval(fetchResourceMetrics, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [timeRange])

  const fetchResourceMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/resources/metrics?timeRange=${timeRange}`)
      const data = await response.json()
      if (data.success) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Failed to fetch resource metrics:', error)
    } finally {
      setLoading(false)
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

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 0.9) return 'text-red-600'
    if (utilization >= 0.7) return 'text-yellow-600'
    return 'text-green-600'
  }

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />
    }
  }

  const getBudgetStatus = (budget: Budget) => {
    const utilization = budget.spent / budget.amount
    if (utilization >= 1) return { color: 'bg-red-500', status: 'Exceeded' }
    if (utilization >= budget.alert_threshold) return { color: 'bg-yellow-500', status: 'Warning' }
    return { color: 'bg-green-500', status: 'On Track' }
  }

  if (loading || !metrics) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-primary">Resource Management Center</h2>
          <p className="text-muted">Monitor usage, costs, and optimize resource allocation</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-border rounded-md"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          <button className="btn btn-outline">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="btn btn-outline">
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(metrics.cost_breakdown.total_cost_24h)}
            </span>
          </div>
          <h4 className="font-medium text-primary">24h Cost</h4>
          <p className="text-sm text-muted">
            Projected monthly: {formatCurrency(metrics.cost_breakdown.projected_monthly)}
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Gauge className="w-5 h-5 text-blue-600" />
            </div>
            <span className={`text-2xl font-bold ${getUtilizationColor(metrics.efficiency_metrics.utilization_score)}`}>
              {formatPercentage(metrics.efficiency_metrics.utilization_score)}
            </span>
          </div>
          <h4 className="font-medium text-primary">Utilization Score</h4>
          <p className="text-sm text-muted">
            {formatPercentage(metrics.efficiency_metrics.waste_percentage)} waste detected
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-primary">
              {metrics.usage_stats.peak_concurrent_users}
            </span>
          </div>
          <h4 className="font-medium text-primary">Peak Users</h4>
          <p className="text-sm text-muted">
            {metrics.usage_stats.active_connections} currently active
          </p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Target className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(metrics.efficiency_metrics.cost_per_request)}
            </span>
          </div>
          <h4 className="font-medium text-primary">Cost per Request</h4>
          <p className="text-sm text-muted">
            {formatCurrency(metrics.efficiency_metrics.cost_per_user)} per user
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {metrics.alerts.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">Active Alerts</h3>
            <button className="btn btn-sm btn-outline">
              <Bell className="w-4 h-4" />
              Configure Alerts
            </button>
          </div>
          <div className="space-y-3">
            {metrics.alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className={`border-l-4 p-3 rounded-r-lg ${
                alert.severity === 'critical' ? 'border-red-500 bg-red-50' :
                alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <h4 className="font-medium text-primary">{alert.title}</h4>
                    <p className="text-sm text-muted">{alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                      <span>Threshold: {alert.threshold}</span>
                      <span>Current: {alert.current_value}</span>
                      <span>{new Date(alert.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <button className="btn btn-sm btn-outline">
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b border-border">
        {[
          { id: 'overview', label: 'Resource Overview', icon: Activity },
          { id: 'costs', label: 'Cost Analysis', icon: DollarSign },
          { id: 'efficiency', label: 'Efficiency', icon: Gauge },
          { id: 'forecasting', label: 'Forecasting', icon: TrendingUp },
          { id: 'budgets', label: 'Budgets', icon: Coins }
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
          {/* Resource Utilization */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Cpu className="w-5 h-5 text-blue-600" />
                </div>
                <span className={`text-lg font-bold ${getUtilizationColor(metrics.usage_stats.cpu_utilization)}`}>
                  {formatPercentage(metrics.usage_stats.cpu_utilization)}
                </span>
              </div>
              <h4 className="font-medium text-primary">CPU Utilization</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.usage_stats.cpu_utilization >= 0.9 ? 'bg-red-500' :
                    metrics.usage_stats.cpu_utilization >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.usage_stats.cpu_utilization * 100}%` }}
                />
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Memory className="w-5 h-5 text-purple-600" />
                </div>
                <span className={`text-lg font-bold ${getUtilizationColor(metrics.usage_stats.memory_utilization)}`}>
                  {formatPercentage(metrics.usage_stats.memory_utilization)}
                </span>
              </div>
              <h4 className="font-medium text-primary">Memory Utilization</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.usage_stats.memory_utilization >= 0.9 ? 'bg-red-500' :
                    metrics.usage_stats.memory_utilization >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.usage_stats.memory_utilization * 100}%` }}
                />
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <HardDrive className="w-5 h-5 text-green-600" />
                </div>
                <span className={`text-lg font-bold ${getUtilizationColor(metrics.usage_stats.storage_utilization)}`}>
                  {formatPercentage(metrics.usage_stats.storage_utilization)}
                </span>
              </div>
              <h4 className="font-medium text-primary">Storage Utilization</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.usage_stats.storage_utilization >= 0.9 ? 'bg-red-500' :
                    metrics.usage_stats.storage_utilization >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.usage_stats.storage_utilization * 100}%` }}
                />
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Network className="w-5 h-5 text-orange-600" />
                </div>
                <span className={`text-lg font-bold ${getUtilizationColor(metrics.usage_stats.network_bandwidth)}`}>
                  {formatPercentage(metrics.usage_stats.network_bandwidth)}
                </span>
              </div>
              <h4 className="font-medium text-primary">Network Bandwidth</h4>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${
                    metrics.usage_stats.network_bandwidth >= 0.9 ? 'bg-red-500' :
                    metrics.usage_stats.network_bandwidth >= 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.usage_stats.network_bandwidth * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Capacity Recommendations */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Capacity Recommendations</h3>
            <div className="space-y-4">
              {metrics.forecasting.capacity_recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    rec.type === 'scale_up' ? 'bg-blue-100' :
                    rec.type === 'scale_down' ? 'bg-green-100' :
                    rec.type === 'optimize' ? 'bg-purple-100' : 'bg-orange-100'
                  }`}>
                    {rec.type === 'scale_up' ? <TrendingUp className="w-5 h-5 text-blue-600" /> :
                     rec.type === 'scale_down' ? <TrendingDown className="w-5 h-5 text-green-600" /> :
                     rec.type === 'optimize' ? <Target className="w-5 h-5 text-purple-600" /> :
                     <RefreshCw className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-primary capitalize">{rec.type.replace('_', ' ')} {rec.resource}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rec.urgency === 'high' ? 'bg-red-100 text-red-700' :
                        rec.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {rec.urgency} priority
                      </span>
                    </div>
                    <p className="text-sm text-muted mb-2">
                      Current: {rec.current_state} → Recommended: {rec.recommended_state}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">
                        Estimated savings: {formatCurrency(rec.estimated_savings)}/month
                      </span>
                      <button className="btn btn-sm btn-primary">
                        Apply Recommendation
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="space-y-6">
          {/* Cost Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Cost Distribution</h3>
              <div className="space-y-4">
                {[
                  ...metrics.cost_breakdown.compute_costs,
                  ...metrics.cost_breakdown.storage_costs,
                  ...metrics.cost_breakdown.network_costs,
                  ...metrics.cost_breakdown.llm_api_costs
                ].sort((a, b) => b.amount - a.amount).slice(0, 6).map((cost, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full bg-blue-${500 + index * 100}`} />
                      <div>
                        <p className="font-medium text-primary">{cost.category}</p>
                        <p className="text-sm text-muted">{cost.details.provider || 'Internal'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(cost.amount)}</p>
                      <div className="flex items-center gap-1">
                        {cost.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3 text-red-500" />
                        ) : cost.trend === 'down' ? (
                          <TrendingDown className="w-3 h-3 text-green-500" />
                        ) : (
                          <div className="w-3 h-3" />
                        )}
                        <span className="text-xs text-muted">{formatPercentage(cost.percentage / 100)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Cost Trends</h3>
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-muted mx-auto mb-2" />
                  <p className="text-muted">Cost trend charts would be displayed here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Cost Breakdown by Category */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Detailed Cost Analysis</h3>
              <select 
                value={selectedCostCategory}
                onChange={(e) => setSelectedCostCategory(e.target.value)}
                className="px-3 py-2 border border-border rounded-md"
              >
                <option value="all">All Categories</option>
                <option value="compute">Compute</option>
                <option value="storage">Storage</option>
                <option value="network">Network</option>
                <option value="llm_api">LLM API</option>
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted">Service</th>
                    <th className="text-left py-3 px-2 font-medium text-muted">Provider</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Usage</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Unit Cost</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Total Cost</th>
                    <th className="text-center py-3 px-2 font-medium text-muted">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...metrics.cost_breakdown.compute_costs,
                    ...metrics.cost_breakdown.storage_costs,
                    ...metrics.cost_breakdown.network_costs,
                    ...metrics.cost_breakdown.llm_api_costs
                  ].map((cost, index) => (
                    <tr key={index} className="border-b border-border hover:bg-gray-50">
                      <td className="py-4 px-2 font-medium text-primary">{cost.category}</td>
                      <td className="py-4 px-2 text-muted">{cost.details.provider || 'Internal'}</td>
                      <td className="py-4 px-2 text-right">{cost.details.quantity || 'N/A'}</td>
                      <td className="py-4 px-2 text-right font-mono text-sm">
                        {cost.details.unit_cost ? formatCurrency(cost.details.unit_cost) : 'N/A'}
                      </td>
                      <td className="py-4 px-2 text-right font-medium">{formatCurrency(cost.amount)}</td>
                      <td className="py-4 px-2 text-center">
                        {cost.trend === 'up' ? (
                          <TrendingUp className="w-4 h-4 text-red-500 mx-auto" />
                        ) : cost.trend === 'down' ? (
                          <TrendingDown className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <div className="w-4 h-4 bg-gray-300 rounded-full mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'budgets' && (
        <div className="space-y-6">
          {/* Budget Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metrics.budgets.map(budget => {
              const status = getBudgetStatus(budget)
              const utilization = budget.spent / budget.amount

              return (
                <div key={budget.id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-primary">{budget.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status.status === 'Exceeded' ? 'bg-red-100 text-red-700' :
                      status.status === 'Warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {status.status}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Spent</span>
                      <span className="font-medium">{formatCurrency(budget.spent)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Budget</span>
                      <span className="font-medium">{formatCurrency(budget.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted">Remaining</span>
                      <span className={`font-medium ${budget.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(budget.remaining)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted">
                      <span>Utilization</span>
                      <span>{formatPercentage(utilization)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${status.color}`}
                        style={{ width: `${Math.min(utilization * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted">
                      {budget.period} budget • Alert at {formatPercentage(budget.alert_threshold)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Create Budget Button */}
          <div className="card p-8 text-center">
            <Coins className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">Need More Budget Control?</h3>
            <p className="text-muted mb-6">
              Set up additional budgets for better cost management and alerts
            </p>
            <button className="btn btn-primary">
              <Coins className="w-4 h-4" />
              Create New Budget
            </button>
          </div>
        </div>
      )}
    </div>
  )
}