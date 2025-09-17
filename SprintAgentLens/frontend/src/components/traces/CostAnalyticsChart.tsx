'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, AreaChart } from 'recharts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, BarChart3, Activity, DollarSign } from 'lucide-react'

interface CostAnalyticsChartProps {
  data: Array<{
    timestamp: string
    totalCost: number
    inputCost: number
    outputCost: number
    totalTokens: number
    count: number
    costByProvider?: Record<string, number>
    costByModel?: Record<string, number>
  }>
}

export function CostAnalyticsChart({ data }: CostAnalyticsChartProps) {
  const [chartType, setChartType] = useState<'cost' | 'tokens' | 'usage'>('cost')
  const [viewType, setViewType] = useState<'line' | 'bar' | 'area'>('area')

  // Format data for chart display
  const chartData = data.map(item => ({
    date: new Date(item.timestamp).toLocaleDateString(),
    fullDate: item.timestamp,
    totalCost: Number((item.totalCost || 0).toFixed(6)),
    inputCost: Number((item.inputCost || 0).toFixed(6)),
    outputCost: Number((item.outputCost || 0).toFixed(6)),
    totalTokens: item.totalTokens || 0,
    count: item.count || 0,
    avgCostPerTrace: Number(((item.totalCost || 0) / Math.max(item.count || 1, 1)).toFixed(6))
  }))

  // Calculate summary stats
  const totalCost = chartData.reduce((sum, item) => sum + item.totalCost, 0)
  const totalTokens = chartData.reduce((sum, item) => sum + item.totalTokens, 0)
  const totalTraces = chartData.reduce((sum, item) => sum + item.count, 0)
  const avgCostPerDay = totalCost / Math.max(chartData.length, 1)

  const formatCost = (value: number) => `$${value.toFixed(6)}`
  const formatTokens = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {chartType === 'cost' && (
            <>
              <p className="text-sm text-blue-600">Total Cost: {formatCost(data.totalCost)}</p>
              <p className="text-sm text-green-600">Input Cost: {formatCost(data.inputCost)}</p>
              <p className="text-sm text-orange-600">Output Cost: {formatCost(data.outputCost)}</p>
              <p className="text-sm text-purple-600">Avg/Trace: {formatCost(data.avgCostPerTrace)}</p>
            </>
          )}
          {chartType === 'tokens' && (
            <>
              <p className="text-sm text-blue-600">Total Tokens: {formatTokens(data.totalTokens)}</p>
              <p className="text-sm text-green-600">Traces: {data.count}</p>
            </>
          )}
          {chartType === 'usage' && (
            <>
              <p className="text-sm text-blue-600">Traces: {data.count}</p>
              <p className="text-sm text-green-600">Total Cost: {formatCost(data.totalCost)}</p>
              <p className="text-sm text-orange-600">Tokens: {formatTokens(data.totalTokens)}</p>
            </>
          )}
        </div>
      )
    }
    return null
  }

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    }

    if (chartType === 'cost') {
      if (viewType === 'line') {
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis tickFormatter={formatCost} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="totalCost" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="inputCost" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="outputCost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )
      } else if (viewType === 'bar') {
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis tickFormatter={formatCost} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="inputCost" stackId="cost" fill="#10b981" />
            <Bar dataKey="outputCost" stackId="cost" fill="#f59e0b" />
          </ComposedChart>
        )
      } else {
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis tickFormatter={formatCost} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="totalCost" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
          </AreaChart>
        )
      }
    } else if (chartType === 'tokens') {
      if (viewType === 'line') {
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis tickFormatter={formatTokens} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="totalTokens" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        )
      } else if (viewType === 'bar') {
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis tickFormatter={formatTokens} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="totalTokens" fill="#8b5cf6" />
          </BarChart>
        )
      } else {
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis tickFormatter={formatTokens} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="totalTokens" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
          </AreaChart>
        )
      }
    } else {
      if (viewType === 'line') {
        return (
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis yAxisId="left" className="text-muted-foreground" />
            <YAxis yAxisId="right" orientation="right" tickFormatter={formatCost} className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="left" dataKey="count" fill="#06b6d4" />
            <Line yAxisId="right" type="monotone" dataKey="totalCost" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
          </ComposedChart>
        )
      } else if (viewType === 'bar') {
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" fill="#06b6d4" />
          </BarChart>
        )
      } else {
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-muted-foreground" />
            <YAxis className="text-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="count" stackId="1" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.6} />
          </AreaChart>
        )
      }
    }
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No cost analytics data available</p>
          <p className="text-sm">Generate some traces to see cost analytics here</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">{formatCost(totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-lg font-bold">{formatTokens(totalTokens)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Traces</p>
                <p className="text-lg font-bold">{totalTraces}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-600" />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg/Day</p>
                <p className="text-lg font-bold">{formatCost(avgCostPerDay)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Metric:</label>
            <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="tokens">Tokens</SelectItem>
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
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="line">Line</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {chartType === 'cost' && (
            <>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Total Cost
              </Badge>
              {viewType === 'line' && (
                <>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Input Cost
                  </Badge>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    Output Cost
                  </Badge>
                </>
              )}
            </>
          )}
          {chartType === 'tokens' && (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Total Tokens
            </Badge>
          )}
          {chartType === 'usage' && (
            <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
              Trace Count
            </Badge>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  )
}