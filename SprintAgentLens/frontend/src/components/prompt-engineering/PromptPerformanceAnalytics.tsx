'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, ScatterPlot, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts'
import { TrendingUp, TrendingDown, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Target, Zap, Clock, DollarSign, Users, Globe, Cpu, Memory, AlertTriangle, CheckCircle, Download, Share, Filter, Calendar as CalendarIcon, RefreshCw, Settings, Lightbulb, Award, Eye, ThumbsUp, MessageSquare, Star, Activity, Layers, GitBranch, Gauge } from 'lucide-react'

interface PerformanceMetric {
  id: string
  name: string
  value: number
  trend: number
  category: 'quality' | 'performance' | 'cost' | 'usage'
  unit: string
  description: string
  threshold?: {
    warning: number
    critical: number
  }
}

interface PerformanceData {
  timestamp: Date
  promptId: string
  promptVersion: string
  metrics: {
    accuracy: number
    relevance: number
    coherence: number
    fluency: number
    safety: number
    creativity: number
    factuality: number
    latency: number
    tokenUsage: number
    cost: number
    throughput: number
    errorRate: number
    userSatisfaction: number
  }
  context: {
    model: string
    temperature: number
    maxTokens: number
    userId?: string
    sessionId?: string
    geography: string
    deviceType: string
  }
}

interface OptimizationRecommendation {
  id: string
  type: 'performance' | 'cost' | 'quality' | 'safety'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  impact: {
    metric: string
    expectedChange: number
    confidence: number
  }
  implementation: {
    effort: 'low' | 'medium' | 'high'
    timeframe: string
    steps: string[]
  }
  evidence: {
    dataPoints: number
    correlations: Array<{
      metric: string
      correlation: number
    }>
  }
}

interface ComparisonAnalysis {
  id: string
  name: string
  prompts: Array<{
    id: string
    version: string
    name: string
    performance: {
      [metric: string]: number
    }
  }>
  winner?: {
    promptId: string
    metric: string
    confidence: number
  }
  insights: string[]
}

const PromptPerformanceAnalytics = ({ projectId }: { projectId: string }) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('7d')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['accuracy', 'latency', 'cost'])
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [recommendations, setRecommendations] = useState<OptimizationRecommendation[]>([])
  const [comparisons, setComparisons] = useState<ComparisonAnalysis[]>([])
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line')
  const [groupBy, setGroupBy] = useState<'hour' | 'day' | 'week'>('day')
  const [filterModel, setFilterModel] = useState<string>('all')
  const [filterGeography, setFilterGeography] = useState<string>('all')
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalyticsData()
    if (realTimeEnabled) {
      const interval = setInterval(loadAnalyticsData, 30000)
      return () => clearInterval(interval)
    }
  }, [projectId, timeRange, selectedPrompts, filterModel, filterGeography])

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        timeRange,
        prompts: selectedPrompts.join(','),
        model: filterModel,
        geography: filterGeography,
        groupBy
      })

      const [performanceRes, metricsRes, recommendationsRes, comparisonsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/prompt-analytics/performance?${params}`),
        fetch(`/api/v1/projects/${projectId}/prompt-analytics/metrics?${params}`),
        fetch(`/api/v1/projects/${projectId}/prompt-analytics/recommendations?${params}`),
        fetch(`/api/v1/projects/${projectId}/prompt-analytics/comparisons?${params}`)
      ])

      setPerformanceData(await performanceRes.json())
      setMetrics(await metricsRes.json())
      setRecommendations(await recommendationsRes.json())
      setComparisons(await comparisonsRes.json())
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const chartData = useMemo(() => {
    return performanceData.reduce((acc, data) => {
      const key = data.timestamp.toISOString().split('T')[0]
      const existing = acc.find(item => item.date === key)
      
      if (existing) {
        selectedMetrics.forEach(metric => {
          existing[metric] = (existing[metric] + data.metrics[metric as keyof typeof data.metrics]) / 2
        })
        existing.count += 1
      } else {
        const newItem: any = { date: key, count: 1 }
        selectedMetrics.forEach(metric => {
          newItem[metric] = data.metrics[metric as keyof typeof data.metrics]
        })
        acc.push(newItem)
      }
      
      return acc
    }, [] as any[])
  }, [performanceData, selectedMetrics])

  const getMetricColor = (metric: string) => {
    const colors = {
      accuracy: '#10b981',
      relevance: '#3b82f6',
      coherence: '#8b5cf6',
      fluency: '#f59e0b',
      safety: '#ef4444',
      creativity: '#ec4899',
      factuality: '#06b6d4',
      latency: '#6366f1',
      tokenUsage: '#84cc16',
      cost: '#f97316',
      throughput: '#14b8a6',
      errorRate: '#dc2626',
      userSatisfaction: '#059669'
    }
    return colors[metric as keyof typeof colors] || '#6b7280'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <Zap className="w-4 h-4" />
      case 'cost': return <DollarSign className="w-4 h-4" />
      case 'quality': return <Award className="w-4 h-4" />
      case 'safety': return <AlertTriangle className="w-4 h-4" />
      default: return <Lightbulb className="w-4 h-4" />
    }
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedMetrics.map((metric, index) => (
              <Area
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={getMetricColor(metric)}
                fill={getMetricColor(metric)}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        )
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedMetrics.map((metric, index) => (
              <Bar
                key={metric}
                dataKey={metric}
                fill={getMetricColor(metric)}
              />
            ))}
          </BarChart>
        )
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {selectedMetrics.map((metric, index) => (
              <Line
                key={metric}
                type="monotone"
                dataKey={metric}
                stroke={getMetricColor(metric)}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        )
    }
  }

  const distributionData = useMemo(() => {
    const distribution = performanceData.reduce((acc, data) => {
      const model = data.context.model
      if (!acc[model]) {
        acc[model] = { name: model, value: 0, color: getMetricColor(model) }
      }
      acc[model].value += 1
      return acc
    }, {} as Record<string, any>)
    return Object.values(distribution)
  }, [performanceData])

  const radarData = useMemo(() => {
    if (selectedMetrics.length === 0) return []
    
    const avgMetrics = selectedMetrics.map(metric => {
      const values = performanceData.map(d => d.metrics[metric as keyof typeof d.metrics])
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length
      return {
        metric: metric.charAt(0).toUpperCase() + metric.slice(1),
        value: Math.round(avg * 100) / 100,
        fullMark: 1
      }
    })
    
    return avgMetrics
  }, [performanceData, selectedMetrics])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompt Performance Analytics</h2>
          <p className="text-gray-600">Comprehensive analysis and optimization insights</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={realTimeEnabled}
              onCheckedChange={setRealTimeEnabled}
            />
            <Label className="text-sm">Real-time</Label>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={loadAnalyticsData}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <Gauge className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="optimization" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Optimization
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Comparison
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Eye className="w-4 h-4" />
            Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.slice(0, 8).map((metric) => (
              <Card key={metric.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{metric.value.toFixed(2)}{metric.unit}</p>
                      <p className="text-xs text-gray-500">{metric.name}</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${metric.trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {metric.trend > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className="text-sm">{Math.abs(metric.trend).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Performance Trends
                  <div className="flex items-center gap-2">
                    <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="line">Line</SelectItem>
                        <SelectItem value="area">Area</SelectItem>
                        <SelectItem value="bar">Bar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  {renderChart()}
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Model Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Optimization Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recommendations.slice(0, 3).map((rec) => (
                  <div key={rec.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="mt-1">
                      {getTypeIcon(rec.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{rec.title}</h4>
                        <Badge className={getSeverityColor(rec.severity)}>
                          {rec.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Impact: {rec.impact.expectedChange > 0 ? '+' : ''}{rec.impact.expectedChange}% {rec.impact.metric}</span>
                        <span>Confidence: {Math.round(rec.impact.confidence * 100)}%</span>
                        <span>Effort: {rec.implementation.effort}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={groupBy} onValueChange={(value: any) => setGroupBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hour">Hourly</SelectItem>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterModel} onValueChange={setFilterModel}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Models</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                  <SelectItem value="claude">Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Metrics:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="w-4 h-4" />
                    {selectedMetrics.length} selected
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56">
                  <div className="space-y-2">
                    {['accuracy', 'relevance', 'coherence', 'fluency', 'safety', 'creativity', 'factuality', 'latency', 'tokenUsage', 'cost'].map((metric) => (
                      <div key={metric} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={metric}
                          checked={selectedMetrics.includes(metric)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMetrics([...selectedMetrics, metric])
                            } else {
                              setSelectedMetrics(selectedMetrics.filter(m => m !== metric))
                            }
                          }}
                        />
                        <label htmlFor={metric} className="text-sm capitalize">
                          {metric}
                        </label>
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                {renderChart()}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={30} domain={[0, 1]} />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedMetrics.slice(0, 5).map((metric) => {
                    const values = performanceData.map(d => d.metrics[metric as keyof typeof d.metrics])
                    const avg = values.reduce((sum, val) => sum + val, 0) / values.length
                    const max = Math.max(...values)
                    const min = Math.min(...values)
                    
                    return (
                      <div key={metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{metric}</span>
                          <span className="text-sm text-gray-500">
                            Avg: {avg.toFixed(2)} | Range: {min.toFixed(2)} - {max.toFixed(2)}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${(avg / max) * 100}%`,
                              backgroundColor: getMetricColor(metric)
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          <div className="grid gap-4">
            {recommendations.map((rec) => (
              <Card key={rec.id} className="transition-all hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getTypeIcon(rec.type)}
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {rec.title}
                          <Badge className={getSeverityColor(rec.severity)}>
                            {rec.severity}
                          </Badge>
                        </CardTitle>
                        <CardDescription>{rec.description}</CardDescription>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Implement
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {rec.impact.expectedChange > 0 ? '+' : ''}{rec.impact.expectedChange}%
                      </div>
                      <div className="text-xs text-gray-500">Expected Impact</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(rec.impact.confidence * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 capitalize">
                        {rec.implementation.effort}
                      </div>
                      <div className="text-xs text-gray-500">Effort Level</div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Implementation Steps</h4>
                    <ol className="space-y-2">
                      {rec.implementation.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Evidence strength: {rec.evidence.dataPoints} data points</span>
                      <span>Timeframe: {rec.implementation.timeframe}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <div className="grid gap-4">
            {comparisons.map((comparison) => (
              <Card key={comparison.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {comparison.name}
                    {comparison.winner && (
                      <Badge variant="default" className="gap-1">
                        <Award className="w-3 h-3" />
                        Winner: {comparison.prompts.find(p => p.id === comparison.winner?.promptId)?.name}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {comparison.prompts.map((prompt, index) => (
                      <div key={prompt.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={prompt.id === comparison.winner?.promptId ? 'default' : 'outline'}>
                              {prompt.name} v{prompt.version}
                            </Badge>
                            {prompt.id === comparison.winner?.promptId && (
                              <Award className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-4">
                          {Object.entries(prompt.performance).map(([metric, value]) => (
                            <div key={metric} className="text-center">
                              <div className="text-lg font-semibold">
                                {typeof value === 'number' ? value.toFixed(2) : value}
                              </div>
                              <div className="text-xs text-gray-500 capitalize">{metric}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Key Insights</h4>
                    <ul className="space-y-1">
                      {comparison.insights.map((insight, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Correlations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="font-medium">Token Usage ↔ Cost</span>
                    <Badge className="bg-green-100 text-green-800">+0.94 correlation</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="font-medium">Latency ↔ Accuracy</span>
                    <Badge className="bg-blue-100 text-blue-800">-0.23 correlation</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="font-medium">Temperature ↔ Creativity</span>
                    <Badge className="bg-purple-100 text-purple-800">+0.67 correlation</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Peak Hours</span>
                    <span className="font-medium">2 PM - 4 PM UTC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Most Active Geography</span>
                    <span className="font-medium">North America (67%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Common Device Type</span>
                    <span className="font-medium">Desktop (84%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Average Session Length</span>
                    <span className="font-medium">23 minutes</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Safety Score Trend</span>
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>+2.3% this week</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>User Satisfaction</span>
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>+5.1% this month</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Error Rate</span>
                    <div className="flex items-center gap-2 text-green-600">
                      <TrendingDown className="w-4 h-4" />
                      <span>-1.2% this week</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Total Spend</span>
                    <span className="font-medium">$234.56 this month</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cost per Request</span>
                    <span className="font-medium">$0.023 average</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Potential Savings</span>
                    <span className="font-medium text-green-600">$45.67 (19%)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Most Expensive Model</span>
                    <span className="font-medium">GPT-4 ($0.045/req)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PromptPerformanceAnalytics