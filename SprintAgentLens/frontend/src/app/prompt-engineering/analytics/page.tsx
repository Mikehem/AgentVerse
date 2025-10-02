'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Target,
  DollarSign,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Settings,
  Eye,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Minus,
  Users,
  FileText,
  Cpu,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Interface definitions
interface PerformanceMetric {
  id: string
  name: string
  value: number
  previous_value: number
  change_percentage: number
  trend: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
  unit: string
  category: 'performance' | 'cost' | 'quality' | 'usage'
}

interface PromptPerformance {
  id: string
  name: string
  version: string
  usage_count: number
  avg_response_time: number
  avg_score: number
  total_cost: number
  success_rate: number
  last_updated: string
  trend: 'improving' | 'declining' | 'stable'
  issues: number
}

interface TimeSeriesData {
  timestamp: string
  response_time: number
  quality_score: number
  cost: number
  usage: number
}

interface CostBreakdown {
  category: string
  amount: number
  percentage: number
  trend: 'up' | 'down' | 'stable'
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'performance' | 'costs' | 'quality'>('overview')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d' | '90d'>('24h')
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [promptPerformance, setPromptPerformance] = useState<PromptPerformance[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPrompt, setSelectedPrompt] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [activeTab, timeRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      setMetrics([
        {
          id: '1',
          name: 'Avg Response Time',
          value: 1250,
          previous_value: 1380,
          change_percentage: -9.4,
          trend: 'down',
          status: 'good',
          unit: 'ms',
          category: 'performance'
        },
        {
          id: '2',
          name: 'Quality Score',
          value: 8.7,
          previous_value: 8.4,
          change_percentage: 3.6,
          trend: 'up',
          status: 'good',
          unit: '/10',
          category: 'quality'
        },
        {
          id: '3',
          name: 'Total Cost',
          value: 247.83,
          previous_value: 189.21,
          change_percentage: 31.0,
          trend: 'up',
          status: 'warning',
          unit: '$',
          category: 'cost'
        },
        {
          id: '4',
          name: 'Success Rate',
          value: 94.2,
          previous_value: 91.8,
          change_percentage: 2.6,
          trend: 'up',
          status: 'good',
          unit: '%',
          category: 'quality'
        },
        {
          id: '5',
          name: 'Daily Usage',
          value: 12847,
          previous_value: 11234,
          change_percentage: 14.4,
          trend: 'up',
          status: 'good',
          unit: 'requests',
          category: 'usage'
        },
        {
          id: '6',
          name: 'Cost per Request',
          value: 0.0193,
          previous_value: 0.0168,
          change_percentage: 14.9,
          trend: 'up',
          status: 'warning',
          unit: '$',
          category: 'cost'
        }
      ])

      setPromptPerformance([
        {
          id: '1',
          name: 'Customer Support Base',
          version: 'v3.2',
          usage_count: 4521,
          avg_response_time: 1150,
          avg_score: 9.1,
          total_cost: 87.34,
          success_rate: 96.8,
          last_updated: '2024-01-20T14:30:00Z',
          trend: 'improving',
          issues: 0
        },
        {
          id: '2',
          name: 'Product Recommendations',
          version: 'v2.8',
          usage_count: 3247,
          avg_response_time: 1420,
          avg_score: 8.4,
          total_cost: 62.19,
          success_rate: 92.3,
          last_updated: '2024-01-20T12:15:00Z',
          trend: 'stable',
          issues: 1
        },
        {
          id: '3',
          name: 'Content Generation',
          version: 'v1.9',
          usage_count: 2198,
          avg_response_time: 2340,
          avg_score: 7.8,
          total_cost: 98.30,
          success_rate: 87.5,
          last_updated: '2024-01-20T09:45:00Z',
          trend: 'declining',
          issues: 3
        }
      ])

      setCostBreakdown([
        {
          category: 'Model Usage',
          amount: 156.43,
          percentage: 63.2,
          trend: 'up'
        },
        {
          category: 'Input Processing',
          amount: 45.67,
          percentage: 18.4,
          trend: 'stable'
        },
        {
          category: 'Output Generation',
          amount: 32.18,
          percentage: 13.0,
          trend: 'up'
        },
        {
          category: 'Quality Evaluation',
          amount: 13.55,
          percentage: 5.4,
          trend: 'down'
        }
      ])

      // Generate mock time series data
      const now = new Date()
      const timeSeriesData: TimeSeriesData[] = []
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString()
        timeSeriesData.push({
          timestamp,
          response_time: Math.floor(Math.random() * 500) + 1000,
          quality_score: Math.random() * 2 + 7,
          cost: Math.random() * 20 + 5,
          usage: Math.floor(Math.random() * 200) + 400
        })
      }
      setTimeSeriesData(timeSeriesData)
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500'
      case 'warning': return 'text-yellow-500'
      case 'critical': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getMetricStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <XCircle className="w-4 h-4" />
      default: return <Minus className="w-4 h-4" />
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />
      default: return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const getPromptTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'declining': return 'text-red-600'
      case 'stable': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <a href="/prompt-engineering" className="hover:text-primary">Prompt Engineering</a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Performance Analytics</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Prompt Performance Analytics</h1>
            <p className="text-gray-600 mt-1">
              Advanced analytics and optimization platform for prompt performance insights
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={fetchData}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {metrics.map((metric) => (
            <div key={metric.id} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-600">{metric.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-bold text-primary">
                      {metric.unit === '$' && metric.unit}
                      {metric.value.toLocaleString()}
                      {metric.unit !== '$' && metric.unit}
                    </span>
                    <div className={cn("flex items-center gap-1", getMetricStatusColor(metric.status))}>
                      {getMetricStatusIcon(metric.status)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 mb-1">
                    {getTrendIcon(metric.trend)}
                    <span className={cn("text-sm font-medium",
                      metric.change_percentage > 0 ? "text-green-600" :
                      metric.change_percentage < 0 ? "text-red-600" : "text-gray-600"
                    )}>
                      {metric.change_percentage > 0 ? '+' : ''}{metric.change_percentage.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">vs previous period</span>
                </div>
              </div>
              
              {/* Mini trend chart placeholder */}
              <div className="h-12 bg-gray-50 rounded flex items-end justify-between px-1">
                {Array.from({length: 12}, (_, i) => (
                  <div 
                    key={i} 
                    className="w-1 bg-primary rounded-t"
                    style={{height: `${Math.random() * 40 + 20}%`}}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'overview'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'performance'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('costs')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'costs'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Cost Analysis
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'quality'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Quality Metrics
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Time Series Chart Placeholder */}
                <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-primary">Performance Trends</h3>
                    <div className="flex items-center gap-2">
                      <button className="text-sm text-gray-500 hover:text-primary">Response Time</button>
                      <button className="text-sm text-gray-500 hover:text-primary">Quality Score</button>
                      <button className="text-sm text-gray-500 hover:text-primary">Usage</button>
                    </div>
                  </div>
                  <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2" />
                      <p>Interactive performance chart would be displayed here</p>
                      <p className="text-sm mt-1">Showing trends for {timeRange}</p>
                    </div>
                  </div>
                </div>

                {/* Prompt Performance Table */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-primary">Prompt Performance</h3>
                    <p className="text-sm text-gray-500 mt-1">Individual prompt metrics and trends</p>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {promptPerformance.map((prompt) => (
                      <div key={prompt.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <FileText className="w-5 h-5 text-primary" />
                              <span className="font-medium text-gray-900">{prompt.name}</span>
                              <span className="text-sm text-gray-500">{prompt.version}</span>
                              <span className={cn("text-sm font-medium", getPromptTrendColor(prompt.trend))}>
                                {prompt.trend}
                              </span>
                              {prompt.issues > 0 && (
                                <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                  {prompt.issues} issues
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Usage:</span>
                                <span className="font-medium ml-1">{prompt.usage_count.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg Time:</span>
                                <span className="font-medium ml-1">{prompt.avg_response_time}ms</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Score:</span>
                                <span className="font-medium ml-1">{prompt.avg_score}/10</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Success:</span>
                                <span className="font-medium ml-1">{prompt.success_rate}%</span>
                              </div>
                              <div>
                                <span className="text-gray-500">Cost:</span>
                                <span className="font-medium ml-1">{formatCurrency(prompt.total_cost)}</span>
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 mt-2">
                              Last updated: {formatDate(prompt.last_updated)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                              <Settings className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'performance' || activeTab === 'costs' || activeTab === 'quality') && (
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {activeTab === 'performance' && 'Performance Analysis'}
                    {activeTab === 'costs' && 'Cost Analysis'}
                    {activeTab === 'quality' && 'Quality Metrics'}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Detailed {activeTab} insights would be displayed here
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    {activeTab === 'performance' && (
                      <>
                        <p>• Response time trends and optimization suggestions</p>
                        <p>• Throughput analysis and bottleneck identification</p>
                        <p>• Resource utilization metrics</p>
                        <p>• Performance comparison across prompts</p>
                      </>
                    )}
                    {activeTab === 'costs' && (
                      <>
                        <p>• Cost breakdown by prompt and usage</p>
                        <p>• Optimization recommendations</p>
                        <p>• Budget tracking and forecasting</p>
                        <p>• Cost per transaction analysis</p>
                      </>
                    )}
                    {activeTab === 'quality' && (
                      <>
                        <p>• Quality score trends and analysis</p>
                        <p>• Error rate monitoring</p>
                        <p>• User satisfaction metrics</p>
                        <p>• Quality improvement suggestions</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Cost Breakdown */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-primary mb-4">Cost Breakdown</h3>
              <div className="space-y-4">
                {costBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{item.category}</span>
                        <span className="text-sm text-gray-600">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full" 
                          style={{width: `${item.percentage}%`}}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-500">{item.percentage}%</span>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(item.trend)}
                          <span className="text-xs text-gray-500">{item.trend}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-primary mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Settings className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Optimize Costs</div>
                    <div className="text-xs text-gray-500">Get cost reduction suggestions</div>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Target className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Quality Report</div>
                    <div className="text-xs text-gray-500">Generate quality analysis</div>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <Download className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Export Data</div>
                    <div className="text-xs text-gray-500">Download analytics report</div>
                  </div>
                </button>
                
                <button className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-md hover:bg-gray-50 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">Set Alerts</div>
                    <div className="text-xs text-gray-500">Configure performance alerts</div>
                  </div>
                </button>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-primary mb-4">System Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Health</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-600">Healthy</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-600">Online</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Processing Queue</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    <span className="text-sm font-medium text-yellow-600">Busy</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cache</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-600">94% Hit Rate</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}