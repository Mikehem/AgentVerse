'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  GitCompare, 
  Copy, 
  Check, 
  Eye, 
  BarChart3, 
  ChevronDown, 
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Activity,
  Star,
  Download,
  RotateCcw,
  Filter
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

interface PromptVersion {
  id: string
  version: string
  template: string
  variables: string[]
  variable_definitions: any[]
  is_active: boolean
  status: string
  comments?: string
  changelog?: string
  created_at: string
  created_by?: string
}

interface VersionMetrics {
  versionId: string
  version: string
  totalExecutions: number
  successRate: number
  avgResponseTime: number
  totalCost: number
  avgTokensUsed: number
  popularityScore: number
  lastUsed: string
  trends: {
    executions: number
    successRate: number
    responseTime: number
    cost: number
  }
}

interface PromptVersionComparisonProps {
  promptId: string
  promptName: string
  onClose?: () => void
  onViewMetrics?: (versionId: string) => void
  isInline?: boolean
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged'
  content: string
  lineNumber?: number
}

export function PromptVersionComparison({ 
  promptId, 
  promptName, 
  onClose, 
  onViewMetrics,
  isInline = false
}: PromptVersionComparisonProps) {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [versionsMetrics, setVersionsMetrics] = useState<VersionMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [activeView, setActiveView] = useState<'analytics' | 'diff' | 'side-by-side'>('analytics')
  const [chartType, setChartType] = useState<'cost' | 'performance' | 'usage'>('cost')
  const [viewType, setViewType] = useState<'line' | 'bar' | 'area'>('line')
  const [chartData, setChartData] = useState<any[]>([])
  const [diffLines, setDiffLines] = useState<DiffLine[]>([])

  useEffect(() => {
    fetchVersions()
  }, [promptId])

  useEffect(() => {
    if (selectedVersions.length >= 2 && activeView === 'diff') {
      generateDiff()
    }
  }, [selectedVersions, versions, activeView])

  useEffect(() => {
    if (selectedVersions.length > 0) {
      fetchVersionsMetrics()
    }
  }, [selectedVersions])

  const fetchVersions = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/prompts/${promptId}/versions`)
      const data = await response.json()
      
      if (data.success) {
        const sortedVersions = data.versions.sort((a: PromptVersion, b: PromptVersion) => 
          parseFloat(b.version) - parseFloat(a.version)
        )
        setVersions(sortedVersions)
        
        // Auto-select the two most recent versions for comparison
        if (sortedVersions.length >= 2) {
          setSelectedVersions([sortedVersions[0].id, sortedVersions[1].id])
        } else if (sortedVersions.length === 1) {
          setSelectedVersions([sortedVersions[0].id])
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVersionsMetrics = async () => {
    try {
      setMetricsLoading(true)
      
      // Mock data for demonstration - replace with real metrics
      const mockMetrics: VersionMetrics[] = selectedVersions.map((versionId, index) => {
        const version = versions.find(v => v.id === versionId)
        return {
          versionId,
          version: version?.version || `${index + 1}.0.0`,
          totalExecutions: Math.floor(Math.random() * 1000) + 100,
          successRate: 85 + Math.random() * 15,
          avgResponseTime: 800 + Math.random() * 500,
          totalCost: Math.random() * 50 + 10,
          avgTokensUsed: Math.floor(Math.random() * 2000) + 500,
          popularityScore: Math.random() * 100,
          lastUsed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
          trends: {
            executions: (Math.random() - 0.5) * 20,
            successRate: (Math.random() - 0.5) * 10,
            responseTime: (Math.random() - 0.5) * 200,
            cost: (Math.random() - 0.5) * 5
          }
        }
      })
      
      setVersionsMetrics(mockMetrics)
      
      // Generate time series data for charts
      const generateTimeSeriesData = () => {
        const days = 30
        const data = []
        for (let i = 0; i < days; i++) {
          const date = new Date()
          date.setDate(date.getDate() - (days - i))
          
          const dayData: any = {
            date: date.toLocaleDateString(),
            timestamp: date.toISOString()
          }
          
          selectedVersions.forEach((versionId, index) => {
            const version = versions.find(v => v.id === versionId)
            const baseMetric = mockMetrics[index]
            
            // Add some randomness for realistic variation
            const variation = 0.8 + Math.random() * 0.4
            
            dayData[`cost_v${version?.version}`] = (baseMetric.totalCost / 30) * variation
            dayData[`responseTime_v${version?.version}`] = baseMetric.avgResponseTime * variation
            dayData[`successRate_v${version?.version}`] = Math.max(70, baseMetric.successRate * variation)
            dayData[`executions_v${version?.version}`] = Math.floor((baseMetric.totalExecutions / 30) * variation)
            dayData[`tokens_v${version?.version}`] = Math.floor((baseMetric.avgTokensUsed / 30) * variation)
          })
          
          data.push(dayData)
        }
        return data
      }
      
      setChartData(generateTimeSeriesData())
    } catch (error) {
      console.error('Error fetching version metrics:', error)
    } finally {
      setMetricsLoading(false)
    }
  }

  const generateDiff = () => {
    if (selectedVersions.length < 2) return
    
    const version1 = versions.find(v => v.id === selectedVersions[0])
    const version2 = versions.find(v => v.id === selectedVersions[1])
    
    if (!version1 || !version2) return

    const lines1 = version1.template.split('\n')
    const lines2 = version2.template.split('\n')
    
    // Simple diff algorithm
    const diff: DiffLine[] = []
    const maxLines = Math.max(lines1.length, lines2.length)
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || ''
      const line2 = lines2[i] || ''
      
      if (line1 === line2) {
        diff.push({ type: 'unchanged', content: line1, lineNumber: i + 1 })
      } else {
        if (line1) {
          diff.push({ type: 'removed', content: line1, lineNumber: i + 1 })
        }
        if (line2) {
          diff.push({ type: 'added', content: line2, lineNumber: i + 1 })
        }
      }
    }
    
    setDiffLines(diff)
  }

  const handleVersionToggle = (versionId: string) => {
    setSelectedVersions(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId)
      } else {
        return [...prev, versionId]
      }
    })
  }

  const getVersionStatusColor = (status: string) => {
    switch (status) {
      case 'current': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'testing': return 'bg-blue-100 text-blue-800'
      case 'archived': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const copyTemplate = (template: string) => {
    navigator.clipboard.writeText(template)
  }

  const getSelectedVersion = (versionId: string): PromptVersion | null => {
    return versions.find(v => v.id === versionId) || null
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <div className="w-4 h-4" />
  }

  // Chart helper functions
  const formatCost = (value: number) => `$${value.toFixed(3)}`
  const formatTime = (value: number) => `${Math.round(value)}ms`
  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  
  const getVersionColors = () => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
    return selectedVersions.map((_, index) => colors[index % colors.length])
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {
                chartType === 'cost' ? formatCost(entry.value) :
                chartType === 'performance' ? (entry.dataKey.includes('responseTime') ? formatTime(entry.value) : formatPercent(entry.value)) :
                entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    if (!chartData || chartData.length === 0) return null
    
    const colors = getVersionColors()
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    const getDataKeys = () => {
      if (chartType === 'cost') {
        return selectedVersions.map(versionId => {
          const version = versions.find(v => v.id === versionId)
          return `cost_v${version?.version}`
        })
      } else if (chartType === 'performance') {
        return selectedVersions.map(versionId => {
          const version = versions.find(v => v.id === versionId)
          return `responseTime_v${version?.version}`
        })
      } else {
        return selectedVersions.map(versionId => {
          const version = versions.find(v => v.id === versionId)
          return `executions_v${version?.version}`
        })
      }
    }

    const dataKeys = getDataKeys()

    if (viewType === 'line') {
      return (
        <LineChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-muted-foreground" />
          <YAxis 
            tickFormatter={chartType === 'cost' ? formatCost : chartType === 'performance' ? formatTime : undefined}
            className="text-muted-foreground" 
          />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.map((key, index) => {
            const version = versions.find(v => v.id === selectedVersions[index])
            return (
              <Line 
                key={key}
                type="monotone" 
                dataKey={key} 
                stroke={colors[index]} 
                strokeWidth={2} 
                dot={{ r: 4 }}
                name={`v${version?.version}`}
              />
            )
          })}
        </LineChart>
      )
    } else if (viewType === 'bar') {
      return (
        <BarChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-muted-foreground" />
          <YAxis 
            tickFormatter={chartType === 'cost' ? formatCost : chartType === 'performance' ? formatTime : undefined}
            className="text-muted-foreground" 
          />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.map((key, index) => {
            const version = versions.find(v => v.id === selectedVersions[index])
            return (
              <Bar 
                key={key}
                dataKey={key} 
                fill={colors[index]}
                name={`v${version?.version}`}
              />
            )
          })}
        </BarChart>
      )
    } else {
      return (
        <AreaChart {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-muted-foreground" />
          <YAxis 
            tickFormatter={chartType === 'cost' ? formatCost : chartType === 'performance' ? formatTime : undefined}
            className="text-muted-foreground" 
          />
          <Tooltip content={<CustomTooltip />} />
          {dataKeys.map((key, index) => {
            const version = versions.find(v => v.id === selectedVersions[index])
            return (
              <Area 
                key={key}
                type="monotone" 
                dataKey={key} 
                stackId="1" 
                stroke={colors[index]} 
                fill={colors[index]} 
                fillOpacity={0.6}
                name={`v${version?.version}`}
              />
            )
          })}
        </AreaChart>
      )
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Loading versions...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">Version Analytics & Comparison</h2>
            <p className="text-sm text-gray-600">{promptName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchVersionsMetrics()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh metrics"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 bg-white rounded-lg p-1 border">
            <button
              onClick={() => setActiveView('analytics')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeView === 'analytics' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-1" />
              Analytics
            </button>
            <button
              onClick={() => setActiveView('diff')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeView === 'diff' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <GitCompare className="w-4 h-4 inline mr-1" />
              Diff
            </button>
            <button
              onClick={() => setActiveView('side-by-side')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeView === 'side-by-side' 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              Side-by-Side
            </button>
          </div>
          
          {activeView === 'analytics' && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Metric:</label>
                <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="usage">Usage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">View:</label>
                <Select value={viewType} onValueChange={(value: any) => setViewType(value)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="area">Area</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Version Selector */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="mb-3">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Select Versions to Compare ({selectedVersions.length} selected)
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
          {versions.map((version) => (
            <label key={version.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedVersions.includes(version.id)}
                onChange={() => handleVersionToggle(version.id)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium">v{version.version}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getVersionStatusColor(version.status)}`}>
                  {version.status}
                </span>
                {version.is_active && (
                  <span className="w-2 h-2 bg-green-500 rounded-full" title="Active Version" />
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Content */}
      {selectedVersions.length === 0 ? (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select Versions to Compare</h3>
          <p className="text-gray-600">
            Choose one or more versions from above to see their analytics and comparisons
          </p>
        </div>
      ) : activeView === 'analytics' ? (
        /* Analytics View */
        <div className="space-y-6">
          {metricsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading analytics...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-lg font-bold">{formatCost(versionsMetrics.reduce((sum, v) => sum + v.totalCost, 0))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-blue-600" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Total Executions</p>
                        <p className="text-lg font-bold">{versionsMetrics.reduce((sum, v) => sum + v.totalExecutions, 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-600" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Avg Response Time</p>
                        <p className="text-lg font-bold">
                          {versionsMetrics.length > 0 ? 
                            formatTime(versionsMetrics.reduce((sum, v) => sum + v.avgResponseTime, 0) / versionsMetrics.length)
                            : '0ms'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-purple-600" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Avg Success Rate</p>
                        <p className="text-lg font-bold">
                          {versionsMetrics.length > 0 ? 
                            formatPercent(versionsMetrics.reduce((sum, v) => sum + v.successRate, 0) / versionsMetrics.length)
                            : '0%'
                          }
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-2 flex-wrap">
                {selectedVersions.map((versionId, index) => {
                  const version = versions.find(v => v.id === versionId)
                  const colors = getVersionColors()
                  return (
                    <Badge key={versionId} variant="outline" className="bg-white">
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: colors[index] }}
                      />
                      v{version?.version}
                    </Badge>
                  )
                })}
              </div>

              {/* Chart */}
              <div className="h-80 bg-white rounded-lg border p-4">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      ) : activeView === 'diff' && selectedVersions.length >= 2 ? (
        /* Diff View */
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Template Changes</h3>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-200 rounded"></div>
                  <span>Removed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 rounded"></div>
                  <span>Added</span>
                </div>
              </div>
            </div>
          </div>
          <div className="max-h-96 overflow-auto">
            {diffLines.map((line, index) => (
              <div
                key={index}
                className={`px-4 py-1 text-sm font-mono border-l-4 ${
                  line.type === 'added' 
                    ? 'bg-green-50 border-green-500 text-green-800'
                    : line.type === 'removed'
                    ? 'bg-red-50 border-red-500 text-red-800'
                    : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                <span className="text-gray-400 mr-4 select-none">{line.lineNumber}</span>
                <span className={`mr-2 ${
                  line.type === 'added' ? 'text-green-600' : 
                  line.type === 'removed' ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                </span>
                {line.content}
              </div>
            ))}
          </div>
        </div>
      ) : activeView === 'side-by-side' && selectedVersions.length > 0 ? (
        /* Side-by-Side View */
        <div className={`grid gap-4 ${
          selectedVersions.length === 1 ? 'grid-cols-1' : 
          selectedVersions.length === 2 ? 'grid-cols-2' : 
          selectedVersions.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
        }`}>
          {selectedVersions.slice(0, 4).map((versionId) => {
            const version = getSelectedVersion(versionId)
            return (
              <div key={versionId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Version Header */}
                <div className="p-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        Version {version?.version}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getVersionStatusColor(version?.status || '')}`}>
                          {version?.status}
                        </span>
                        {version?.is_active && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => version && copyTemplate(version.template)}
                        className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                        title="Copy template"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {version?.changelog && (
                    <p className="text-sm text-gray-600 mt-2">{version.changelog}</p>
                  )}
                </div>

                {/* Template Content */}
                <div className="p-4 max-h-96 overflow-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {version?.template || 'No template available'}
                  </pre>
                </div>

                {/* Version Metadata */}
                {version && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <div className="space-y-2 text-xs text-gray-600">
                      <div>Created: {new Date(version.created_at).toLocaleString()}</div>
                      {version.created_by && <div>By: {version.created_by}</div>}
                      {version.variables?.length > 0 && (
                        <div>Variables: {version.variables.join(', ')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* No valid view */
        <div className="text-center py-12">
          <GitCompare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Select More Versions</h3>
          <p className="text-gray-600">
            {activeView === 'diff' 
              ? 'Select at least 2 versions to see the differences'
              : 'Select versions to compare side by side'
            }
          </p>
        </div>
      )}
    </div>
  )
}