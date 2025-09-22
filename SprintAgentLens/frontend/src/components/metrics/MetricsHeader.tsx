'use client'

import { useState } from 'react'
import { 
  Calendar, 
  Download, 
  RotateCcw, 
  Settings,
  ChevronDown,
  TrendingUp,
  DollarSign,
  Clock,
  Star,
  Activity
} from 'lucide-react'
import { 
  TimeRange,
  MetricFocus
} from '@/lib/types/metrics'
import { formatTimeRange, createTimeRange } from '@/lib/utils/metricsUtils'

interface MetricsHeaderProps {
  promptName: string
  timeRange: TimeRange
  metricFocus: MetricFocus
  refreshing: boolean
  onTimeRangeChange: (timeRange: TimeRange) => void
  onMetricFocusChange: (focus: MetricFocus) => void
  onRefresh: () => void
  onExport: () => void
}

const TIME_RANGE_OPTIONS = [
  { value: 'last24h', label: 'Last 24 hours' },
  { value: 'last7d', label: 'Last 7 days' },
  { value: 'last30d', label: 'Last 30 days' },
  { value: 'last90d', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' }
]

const METRIC_FOCUS_OPTIONS = [
  { value: 'all' as MetricFocus, label: 'All metrics', icon: Activity, color: 'text-gray-600' },
  { value: 'cost' as MetricFocus, label: 'Cost focus', icon: DollarSign, color: 'text-green-600' },
  { value: 'performance' as MetricFocus, label: 'Performance focus', icon: Clock, color: 'text-blue-600' },
  { value: 'quality' as MetricFocus, label: 'Quality focus', icon: Star, color: 'text-yellow-600' }
]

export function MetricsHeader({
  promptName,
  timeRange,
  metricFocus,
  refreshing,
  onTimeRangeChange,
  onMetricFocusChange,
  onRefresh,
  onExport
}: MetricsHeaderProps) {
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false)
  const [showMetricFocusDropdown, setShowMetricFocusDropdown] = useState(false)
  const [showCustomRange, setShowCustomRange] = useState(false)
  
  const handleTimeRangeSelect = (preset: string) => {
    if (preset === 'custom') {
      setShowCustomRange(true)
    } else {
      const newTimeRange = createTimeRange(preset)
      onTimeRangeChange(newTimeRange)
    }
    setShowTimeRangeDropdown(false)
  }
  
  const handleCustomRangeSubmit = (start: Date, end: Date) => {
    const customRange: TimeRange = { start, end, preset: 'custom' }
    onTimeRangeChange(customRange)
    setShowCustomRange(false)
  }
  
  const currentTimeRangeOption = TIME_RANGE_OPTIONS.find(
    option => option.value === timeRange.preset
  ) || { value: 'custom', label: 'Custom range' }
  
  const currentMetricFocusOption = METRIC_FOCUS_OPTIONS.find(
    option => option.value === metricFocus
  )!
  
  const MetricFocusIcon = currentMetricFocusOption.icon
  
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      {/* Title and description */}
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-primary">
              {promptName} Analytics
            </h1>
            <p className="text-muted text-sm mt-1">
              Performance metrics and insights • {formatTimeRange(timeRange)}
            </p>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Metric Focus Selector */}
        <div className="relative">
          <button
            onClick={() => setShowMetricFocusDropdown(!showMetricFocusDropdown)}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <MetricFocusIcon className={`w-4 h-4 ${currentMetricFocusOption.color}`} />
            <span>{currentMetricFocusOption.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showMetricFocusDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-lg shadow-lg z-10">
              <div className="p-1">
                {METRIC_FOCUS_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        onMetricFocusChange(option.value)
                        setShowMetricFocusDropdown(false)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent rounded transition-colors text-sm ${
                        option.value === metricFocus ? 'bg-accent' : ''
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${option.color}`} />
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Time Range Selector */}
        <div className="relative">
          <button
            onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span>{currentTimeRangeOption.label}</span>
            <ChevronDown className="w-3 h-3" />
          </button>
          
          {showTimeRangeDropdown && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border rounded-lg shadow-lg z-10">
              <div className="p-1">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleTimeRangeSelect(option.value)}
                    className={`w-full px-3 py-2 text-left hover:bg-accent rounded transition-colors text-sm ${
                      option.value === timeRange.preset ? 'bg-accent' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        
        {/* Export Button */}
        <button
          onClick={onExport}
          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
      
      {/* Custom Date Range Modal */}
      {showCustomRange && (
        <CustomDateRangeModal
          initialStart={timeRange.start}
          initialEnd={timeRange.end}
          onSubmit={handleCustomRangeSubmit}
          onCancel={() => setShowCustomRange(false)}
        />
      )}
    </div>
  )
}

// Custom Date Range Modal Component
function CustomDateRangeModal({
  initialStart,
  initialEnd,
  onSubmit,
  onCancel
}: {
  initialStart: Date
  initialEnd: Date
  onSubmit: (start: Date, end: Date) => void
  onCancel: () => void
}) {
  const [startDate, setStartDate] = useState(initialStart.toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(initialEnd.toISOString().split('T')[0])
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start <= end && start <= new Date()) {
      onSubmit(start, end)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-medium mb-4">Custom Date Range</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}