'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Settings, Activity, List, BarChart3, Clock, CheckCircle, XCircle, AlertCircle, GitBranch, Download, TrendingUp, DollarSign, Zap, Filter } from 'lucide-react'
import { Project } from '@/lib/types'
import { CostAnalyticsChart } from '@/components/traces/CostAnalyticsChart'
import { TraceFeedback } from '@/components/traces/TraceFeedback'
import { SpanTimeline } from '@/components/spans/SpanTimeline'

interface ProjectTracesProps {
  project: Project
}

interface MasterTrace {
  id: string
  name: string
  operationName?: string
  startTime: string
  endTime?: string
  duration?: number
  status: 'running' | 'success' | 'error' | 'timeout'
  metadata?: Record<string, any>
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  tags?: string[]
  total_cost?: number
  total_tokens?: number
  spans?: any[]
}

// Placeholder components for missing dependencies
function TraceAnalyticsDashboard({ traces }: { traces: MasterTrace[] }) {
  return (
    <div className="bg-white p-6 rounded-lg border">
      <h4 className="text-lg font-semibold mb-4">Trace Analytics</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{traces.length}</div>
          <div className="text-sm text-muted">Total Traces</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {traces.filter(t => t.status === 'success').length}
          </div>
          <div className="text-sm text-muted">Successful</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {traces.filter(t => t.status === 'error').length}
          </div>
          <div className="text-sm text-muted">Failed</div>
        </div>
      </div>
    </div>
  )
}

function MetadataEditor({ trace, onUpdate }: { trace: MasterTrace; onUpdate: (metadata: Record<string, any>) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMetadata, setEditedMetadata] = useState<string>('')

  useEffect(() => {
    setEditedMetadata(JSON.stringify(trace.metadata || {}, null, 2))
  }, [trace.metadata])

  const handleSave = () => {
    try {
      const parsedMetadata = JSON.parse(editedMetadata)
      onUpdate(parsedMetadata)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save metadata:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Metadata</h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isEditing ? 'Cancel' : 'Edit'}
        </button>
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editedMetadata}
            onChange={(e) => setEditedMetadata(e.target.value)}
            className="w-full h-64 p-3 border rounded-md font-mono text-sm"
          />
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
            {JSON.stringify(trace.metadata || {}, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export function ProjectTraces({ project }: ProjectTracesProps) {
  const [selectedTrace, setSelectedTrace] = useState<MasterTrace | null>(null)
  const [traces, setTraces] = useState<MasterTrace[]>([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('input-output')
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [durationFilter, setDurationFilter] = useState({ min: '', max: '' })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [tagsFilter, setTagsFilter] = useState('')
  const [sortBy, setSortBy] = useState('startTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    projectId: project.id,
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    provider: '',
    model: ''
  })

  // Load real traces and cost analytics from API
  useEffect(() => {
    loadTraces()
    fetchCostAnalytics()
  }, [project.id, filters, statusFilter, dateRange, durationFilter, tagsFilter])

  const loadTraces = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        projectId: project.id,
        limit: '50'
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/v1/private/traces?${params}`)
      const data = await response.json()

      if (data.success) {
        setTraces(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load traces:', error)
      setTraces([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCostAnalytics = async () => {
    try {
      const params = new URLSearchParams()
      
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.provider) params.append('provider', filters.provider)
      if (filters.model) params.append('model', filters.model)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      params.append('level', 'trace')
      params.append('includeBreakdown', 'true')
      params.append('granularity', 'day')

      const response = await fetch(`/api/v1/cost-analytics?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch cost analytics:', error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    loadTraces()
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const exportCostData = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const response = await fetch(`/api/v1/cost-analytics?${params}&level=trace&includeBreakdown=true`)
      const data = await response.json()
      
      if (data.success) {
        const csvContent = convertToCsv(data.analytics)
        downloadCsv(csvContent, 'cost-analytics.csv')
      }
    } catch (error) {
      console.error('Failed to export cost data:', error)
    }
  }

  const convertToCsv = (analytics: any) => {
    const headers = ['Date', 'Total Cost', 'Input Cost', 'Output Cost', 'Total Tokens', 'Traces Count']
    const rows = analytics.breakdown?.map((item: any) => [
      new Date(item.timestamp).toISOString().split('T')[0],
      item.totalCost.toFixed(6),
      item.inputCost.toFixed(6),
      item.outputCost.toFixed(6),
      item.totalTokens,
      item.count
    ]) || []
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCost = (cost: number) => {
    if (cost === 0 || cost === null || cost === undefined) return '$0.000000'
    return `$${Number(cost).toFixed(6)}`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens?.toString() || '0'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'timeout': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTraces = useMemo(() => {
    let filtered = traces.filter(trace => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = (
          trace.name.toLowerCase().includes(query) ||
          trace.id.toLowerCase().includes(query) ||
          JSON.stringify(trace.inputData || {}).toLowerCase().includes(query) ||
          JSON.stringify(trace.outputData || {}).toLowerCase().includes(query) ||
          JSON.stringify(trace.metadata || {}).toLowerCase().includes(query)
        )
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && trace.status !== statusFilter) {
        return false
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const traceDate = new Date(trace.startTime)
        if (dateRange.start && traceDate < new Date(dateRange.start)) return false
        if (dateRange.end && traceDate > new Date(dateRange.end)) return false
      }

      // Duration filter
      if (durationFilter.min || durationFilter.max) {
        const duration = trace.duration || 0
        if (durationFilter.min && duration < parseFloat(durationFilter.min)) return false
        if (durationFilter.max && duration > parseFloat(durationFilter.max)) return false
      }

      // Tags filter
      if (tagsFilter.trim()) {
        const tags = tagsFilter.toLowerCase().split(',').map(t => t.trim()).filter(Boolean)
        const traceTags = (trace.tags || []).map(t => t.toLowerCase())
        if (!tags.some(tag => traceTags.some(traceTag => traceTag.includes(tag)))) {
          return false
        }
      }

      return true
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || ''
          bValue = b.name || ''
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'duration':
          aValue = a.duration || 0
          bValue = b.duration || 0
          break
        case 'startTime':
        default:
          aValue = new Date(a.startTime).getTime()
          bValue = new Date(b.startTime).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [traces, searchQuery, statusFilter, dateRange, durationFilter, tagsFilter, sortBy, sortOrder])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />
      case 'error': return <XCircle className="w-4 h-4 text-error" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />
      default: return <Clock className="w-4 h-4 text-muted" />
    }
  }

  const formatDuration = (duration: number | undefined) => {
    if (!duration) return 'N/A'
    if (duration < 1000) return `${duration.toFixed(0)}ms`
    return `${(duration / 1000).toFixed(2)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getInputPreview = (inputData: Record<string, any> | undefined) => {
    if (!inputData) return 'No input data'
    const text = JSON.stringify(inputData)
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  const getOutputPreview = (outputData: Record<string, any> | undefined) => {
    if (!outputData) return 'No output data'
    const text = JSON.stringify(outputData)
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Traces</h2>
            <p className="text-muted">A trace is a step-by-step record of how your LLM application processes a single input, including LLM calls and other operations.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <List className="w-4 h-4 inline mr-2" />
                List
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'analytics'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Analytics
              </button>
            </div>
            <button 
              onClick={loadTraces}
              className="btn btn-outline"
            >
              <Activity className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and filter bar */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search traces by ID, name, input, output, or metadata..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 input text-sm"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="running">Running</option>
              <option value="timeout">Timeout</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input text-sm"
            >
              <option value="startTime">Sort by Start Time</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="duration">Sort by Duration</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-outline text-sm"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`btn text-sm ${showAdvancedFilters ? 'btn-primary' : 'btn-outline'}`}
            >
              <Settings className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Advanced Filters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
                
                {/* Duration Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Duration (ms)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={durationFilter.min}
                    onChange={(e) => setDurationFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Duration (ms)</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={durationFilter.max}
                    onChange={(e) => setDurationFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., production, user-input, llm-call"
                  value={tagsFilter}
                  onChange={(e) => setTagsFilter(e.target.value)}
                  className="w-full input text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDateRange({ start: '', end: '' })
                    setDurationFilter({ min: '', max: '' })
                    setTagsFilter('')
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="btn btn-outline text-sm"
                >
                  Clear All Filters
                </button>
                
                <div className="text-sm text-gray-600">
                  {filteredTraces.length} of {traces.length} traces shown
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-primary" />
                Traces & Cost Analytics
              </h3>
              <p className="text-muted-foreground">
                Monitor trace execution and analyze cost patterns across your AI agents
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={exportCostData} 
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button 
                onClick={() => { loadTraces(); fetchCostAnalytics(); }} 
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <TrendingUp className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Cost Summary Cards */}
          {analytics?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Total Cost</h4>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatCost(analytics.summary.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    Input: {formatCost(analytics.summary.totalInputCost)} | Output: {formatCost(analytics.summary.totalOutputCost)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Total Tokens</h4>
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatTokens(analytics.summary.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    Prompt: {formatTokens(analytics.summary.totalPromptTokens)} | Completion: {formatTokens(analytics.summary.totalCompletionTokens)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Avg Cost/Trace</h4>
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatCost(analytics.summary.avgCostPerItem)}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {analytics.summary.count} traces
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Active Traces</h4>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.summary.count}</div>
                  <p className="text-xs text-muted-foreground">
                    Total traces analyzed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cost Analytics Chart */}
          {analytics?.breakdown && (
            <div className="bg-white p-6 rounded-lg border">
              <div className="mb-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Cost Analytics Over Time
                </h4>
              </div>
              <CostAnalyticsChart data={analytics.breakdown} />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="mb-4">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search traces..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <input
                  type="text"
                  placeholder="Provider"
                  value={filters.provider}
                  onChange={(e) => handleFilterChange('provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <input
                  type="text"
                  placeholder="Model"
                  value={filters.model}
                  onChange={(e) => handleFilterChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Legacy Analytics Dashboard for traces count etc */}
          <TraceAnalyticsDashboard traces={filteredTraces} />
        </div>
      )}

      {/* Traces table */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-700">ID</th>
                  <th className="text-left p-4 font-medium text-gray-700">Operation</th>
                  <th className="text-left p-4 font-medium text-gray-700">Status</th>
                  <th className="text-left p-4 font-medium text-gray-700">Start Time</th>
                  <th className="text-left p-4 font-medium text-gray-700">Duration</th>
                  <th className="text-left p-4 font-medium text-gray-700">Cost</th>
                  <th className="text-left p-4 font-medium text-gray-700">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                      Loading traces...
                    </td>
                  </tr>
                ) : filteredTraces.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-500">
                      No traces found
                    </td>
                  </tr>
                ) : (
                  filteredTraces.map((trace) => (
                    <tr 
                      key={trace.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTrace(trace)}
                    >
                      <td className="p-4">
                        <div className="font-mono text-xs">{trace.id?.slice(0, 12)}...</div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{trace.operationName || trace.name || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{project.id}</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trace.status)}`}>
                          {trace.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-xs">
                          {trace.startTime ? new Date(trace.startTime).toLocaleString() : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {trace.duration ? `${trace.duration}ms` : 'N/A'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono text-xs">
                          {formatCost(trace.total_cost || 0)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs">
                          {formatTokens(trace.total_tokens || 0)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          {filteredTraces.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
              <div className="text-sm text-gray-700">
                Showing 1-{Math.min(filteredTraces.length, 50)} of {filteredTraces.length}
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Previous</button>
                <button className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trace detail modal */}
      {selectedTrace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{selectedTrace.name || 'Trace Details'}</h3>
                <span className="text-sm text-gray-500">⏱️ {formatDuration(selectedTrace.duration)}</span>
                <span className="text-sm text-gray-500"># {selectedTrace.id}</span>
                <span className="text-sm text-gray-500">{getStatusIcon(selectedTrace.status)}</span>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tab navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button 
                  onClick={() => setActiveTab('input-output')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'input-output' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Input/Output
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'timeline' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Timeline
                </button>
                <button 
                  onClick={() => setActiveTab('feedback')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'feedback' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Feedback scores
                </button>
                <button 
                  onClick={() => setActiveTab('metadata')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'metadata' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Metadata
                </button>
              </nav>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              {/* Input/Output Tab */}
              {activeTab === 'input-output' && (
                <>
                  {/* Input section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Input <span className="text-xs text-gray-500">▲</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {selectedTrace.inputData ? JSON.stringify(selectedTrace.inputData, null, 2) : 'No input data available'}
                      </pre>
                    </div>
                  </div>

                  {/* Output section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Output <span className="text-xs text-gray-500">▲</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {selectedTrace.outputData ? JSON.stringify(selectedTrace.outputData, null, 2) : 'No output data available'}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              {/* Timeline Tab - Distributed Spans View */}
              {activeTab === 'timeline' && (
                <div>
                  <SpanTimeline 
                    traceId={selectedTrace.id} 
                    spans={selectedTrace.spans}
                    className="mt-4"
                  />
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <TraceFeedback 
                  traceId={selectedTrace.id}
                  projectId={project?.id}
                  onScoresChange={(scores) => {
                    console.log('Feedback scores updated:', scores)
                  }}
                />
              )}

              {/* Metadata Tab */}
              {activeTab === 'metadata' && (
                <MetadataEditor 
                  trace={selectedTrace} 
                  onUpdate={(metadata) => {
                    setSelectedTrace(prev => prev ? { ...prev, metadata } : null)
                  }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}