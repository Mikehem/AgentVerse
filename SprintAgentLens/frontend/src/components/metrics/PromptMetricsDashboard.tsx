'use client'

import { useState, useEffect } from 'react'
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  Star, 
  Activity,
  AlertTriangle,
  Download,
  Refresh,
  Settings
} from 'lucide-react'
import { 
  PromptOverviewMetrics,
  MetricFocus,
  TimeRange,
  MetricInsight
} from '@/lib/types/metrics'
import { formatTimeRange, createTimeRange } from '@/lib/utils/metricsUtils'
import { MetricsHeader } from './MetricsHeader'
import { QuickMetricsCards } from './QuickMetricsCards'
import { OverviewCharts } from './OverviewCharts'
import { VersionComparison } from './VersionComparison'
import { InsightsPanel } from './InsightsPanel'

interface PromptMetricsDashboardProps {
  promptId: string
  promptName: string
  className?: string
}

export function PromptMetricsDashboard({ 
  promptId, 
  promptName,
  className = ''
}: PromptMetricsDashboardProps) {
  const [overview, setOverview] = useState<PromptOverviewMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState<TimeRange>(createTimeRange('last7d'))
  const [metricFocus, setMetricFocus] = useState<MetricFocus>('all')
  const [refreshing, setRefreshing] = useState(false)
  
  // Fetch metrics data
  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        timeRange: timeRange.preset || 'last7d',
        includeInsights: 'true',
        includeComparisons: 'true'
      })
      
      const response = await fetch(`/api/v1/prompts/${promptId}/metrics?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`)
      }
      
      const data = await response.json()
      setOverview(data.data)
      
    } catch (err) {
      console.error('Error fetching prompt metrics:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  // Initial data load
  useEffect(() => {
    fetchMetrics()
  }, [promptId, timeRange])
  
  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMetrics()
    setRefreshing(false)
  }
  
  // Handle time range change
  const handleTimeRangeChange = (newTimeRange: TimeRange) => {
    setTimeRange(newTimeRange)
  }
  
  // Handle metric focus change
  const handleMetricFocusChange = (focus: MetricFocus) => {
    setMetricFocus(focus)
  }
  
  // Handle export
  const handleExport = async () => {
    try {
      // In production, this would generate and download a report
      const exportData = {
        promptId,
        promptName,
        timeRange: formatTimeRange(timeRange),
        overview,
        exportedAt: new Date().toISOString()
      }
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${promptName}-metrics-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }
  
  if (loading && !overview) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading metrics...</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <div>
            <h3 className="text-red-800 font-medium">Failed to load metrics</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (!overview) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Activity className="w-12 h-12 text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-primary mb-2">No metrics available</h3>
        <p className="text-muted">
          No execution data found for the selected time range.
        </p>
      </div>
    )
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with controls */}
      <MetricsHeader
        promptName={promptName}
        timeRange={timeRange}
        metricFocus={metricFocus}
        refreshing={refreshing}
        onTimeRangeChange={handleTimeRangeChange}
        onMetricFocusChange={handleMetricFocusChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />
      
      {/* Quick insights */}
      <QuickMetricsCards
        overview={overview}
        metricFocus={metricFocus}
      />
      
      {/* Alerts and insights */}
      {(overview.alerts.length > 0 || overview.insights.length > 0) && (
        <InsightsPanel
          insights={overview.insights}
          alerts={overview.alerts}
        />
      )}
      
      {/* Overview charts */}
      <OverviewCharts
        overview={overview}
        metricFocus={metricFocus}
        timeRange={timeRange}
      />
      
      {/* Version comparison */}
      <VersionComparison
        promptId={promptId}
        versions={overview.versions}
        bestPerforming={overview.bestPerforming}
        metricFocus={metricFocus}
      />
    </div>
  )
}

// Loading skeleton component
export function PromptMetricsDashboardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 animate-pulse ${className}`}>
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
          <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      
      {/* Quick metrics cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-border p-6">
            <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </div>
        ))}
      </div>
      
      {/* Charts skeleton */}
      <div className="bg-white rounded-lg border border-border p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-6"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
      
      {/* Table skeleton */}
      <div className="bg-white rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="h-6 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
              <div className="h-4 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}