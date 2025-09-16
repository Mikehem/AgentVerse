'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, Clock, DollarSign, Hash, Tag, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TraceSearchFilters {
  textSearch?: string
  timeRange?: {
    start: Date
    end: Date
  }
  durationRange?: {
    min: number // milliseconds
    max: number
  }
  status?: ('success' | 'error' | 'pending' | 'timeout')[]
  tags?: string[]
  spanTypes?: string[]
  costRange?: {
    min: number
    max: number
  }
  tokenRange?: {
    min: number
    max: number
  }
  projects?: string[]
  agents?: string[]
  llmProviders?: string[]
  llmModels?: string[]
  hasErrors?: boolean
  isSlowQuery?: boolean
  minSpanCount?: number
  maxSpanCount?: number
}

interface AdvancedTraceSearchProps {
  onFiltersChange: (filters: TraceSearchFilters) => void
  availableProjects?: Array<{ id: string; name: string }>
  availableAgents?: Array<{ id: string; name: string }>
  availableTags?: string[]
  className?: string
}

export function AdvancedTraceSearch({
  onFiltersChange,
  availableProjects = [],
  availableAgents = [],
  availableTags = [],
  className
}: AdvancedTraceSearchProps) {
  const [filters, setFilters] = useState<TraceSearchFilters>({})
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  // Pre-defined quick filters
  const quickFilters = [
    { label: 'Last Hour', timeRange: { start: new Date(Date.now() - 60 * 60 * 1000), end: new Date() } },
    { label: 'Last 24h', timeRange: { start: new Date(Date.now() - 24 * 60 * 60 * 1000), end: new Date() } },
    { label: 'Last Week', timeRange: { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date() } },
    { label: 'Errors Only', status: ['error' as const] },
    { label: 'Slow Queries', isSlowQuery: true },
    { label: 'LLM Calls', spanTypes: ['llm'] }
  ]

  useEffect(() => {
    // Count active filters
    const count = Object.values(filters).filter(value => {
      if (Array.isArray(value)) return value.length > 0
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0
      return value !== undefined && value !== ''
    }).length
    setActiveFilterCount(count)

    onFiltersChange(filters)
  }, [filters, onFiltersChange])

  const updateFilter = <K extends keyof TraceSearchFilters>(
    key: K,
    value: TraceSearchFilters[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const removeFilter = (key: keyof TraceSearchFilters) => {
    setFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  const clearAllFilters = () => {
    setFilters({})
  }

  const applyQuickFilter = (quickFilter: Partial<TraceSearchFilters>) => {
    setFilters(prev => ({ ...prev, ...quickFilter }))
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search traces by name, span content, or metadata..."
          value={filters.textSearch || ''}
          onChange={(e) => updateFilter('textSearch', e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((quickFilter, index) => (
          <button
            key={index}
            onClick={() => applyQuickFilter(quickFilter)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
          >
            {quickFilter.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
          <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          {/* Time Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Calendar className="inline w-4 h-4 mr-1" />
              Time Range
            </label>
            <div className="space-y-2">
              <input
                type="datetime-local"
                value={filters.timeRange?.start ? new Date(filters.timeRange.start.getTime() - filters.timeRange.start.getTimezoneOffset() * 60000).toISOString().slice(0, -1) : ''}
                onChange={(e) => updateFilter('timeRange', {
                  ...filters.timeRange,
                  start: new Date(e.target.value),
                  end: filters.timeRange?.end || new Date()
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
              <input
                type="datetime-local"
                value={filters.timeRange?.end ? new Date(filters.timeRange.end.getTime() - filters.timeRange.end.getTimezoneOffset() * 60000).toISOString().slice(0, -1) : ''}
                onChange={(e) => updateFilter('timeRange', {
                  start: filters.timeRange?.start || new Date(Date.now() - 24 * 60 * 60 * 1000),
                  end: new Date(e.target.value)
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Duration Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Clock className="inline w-4 h-4 mr-1" />
              Duration (ms)
            </label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min duration"
                value={filters.durationRange?.min || ''}
                onChange={(e) => updateFilter('durationRange', {
                  ...filters.durationRange,
                  min: parseInt(e.target.value) || 0,
                  max: filters.durationRange?.max || 10000
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
              <input
                type="number"
                placeholder="Max duration"
                value={filters.durationRange?.max || ''}
                onChange={(e) => updateFilter('durationRange', {
                  min: filters.durationRange?.min || 0,
                  max: parseInt(e.target.value) || 10000
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <div className="space-y-1">
              {['success', 'error', 'pending', 'timeout'].map((status) => (
                <label key={status} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status as any) || false}
                    onChange={(e) => {
                      const currentStatus = filters.status || []
                      if (e.target.checked) {
                        updateFilter('status', [...currentStatus, status as any])
                      } else {
                        updateFilter('status', currentStatus.filter(s => s !== status))
                      }
                    }}
                    className="mr-2 h-4 w-4 text-primary border-gray-300 rounded"
                  />
                  <span className="text-sm capitalize">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Cost Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <DollarSign className="inline w-4 h-4 mr-1" />
              Cost Range ($)
            </label>
            <div className="space-y-2">
              <input
                type="number"
                step="0.01"
                placeholder="Min cost"
                value={filters.costRange?.min || ''}
                onChange={(e) => updateFilter('costRange', {
                  ...filters.costRange,
                  min: parseFloat(e.target.value) || 0,
                  max: filters.costRange?.max || 1
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Max cost"
                value={filters.costRange?.max || ''}
                onChange={(e) => updateFilter('costRange', {
                  min: filters.costRange?.min || 0,
                  max: parseFloat(e.target.value) || 1
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Token Range */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Hash className="inline w-4 h-4 mr-1" />
              Token Count
            </label>
            <div className="space-y-2">
              <input
                type="number"
                placeholder="Min tokens"
                value={filters.tokenRange?.min || ''}
                onChange={(e) => updateFilter('tokenRange', {
                  ...filters.tokenRange,
                  min: parseInt(e.target.value) || 0,
                  max: filters.tokenRange?.max || 10000
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
              <input
                type="number"
                placeholder="Max tokens"
                value={filters.tokenRange?.max || ''}
                onChange={(e) => updateFilter('tokenRange', {
                  min: filters.tokenRange?.min || 0,
                  max: parseInt(e.target.value) || 10000
                })}
                className="w-full p-2 text-sm border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Tag className="inline w-4 h-4 mr-1" />
              Tags
            </label>
            <select
              multiple
              value={filters.tags || []}
              onChange={(e) => updateFilter('tags', Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full p-2 text-sm border border-gray-300 rounded-md"
              size={4}
            >
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>

          {/* Projects */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Projects</label>
            <select
              multiple
              value={filters.projects || []}
              onChange={(e) => updateFilter('projects', Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full p-2 text-sm border border-gray-300 rounded-md"
              size={4}
            >
              {availableProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </div>

          {/* Agents */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Agents</label>
            <select
              multiple
              value={filters.agents || []}
              onChange={(e) => updateFilter('agents', Array.from(e.target.selectedOptions, option => option.value))}
              className="w-full p-2 text-sm border border-gray-300 rounded-md"
              size={4}
            >
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          </div>

          {/* Special Filters */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Special Filters</label>
            <div className="space-y-1">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.hasErrors || false}
                  onChange={(e) => updateFilter('hasErrors', e.target.checked || undefined)}
                  className="mr-2 h-4 w-4 text-primary border-gray-300 rounded"
                />
                <span className="text-sm">Has Errors</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.isSlowQuery || false}
                  onChange={(e) => updateFilter('isSlowQuery', e.target.checked || undefined)}
                  className="mr-2 h-4 w-4 text-primary border-gray-300 rounded"
                />
                <span className="text-sm">Slow Query (&gt; 1s)</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null
            
            let displayValue = ''
            if (Array.isArray(value)) {
              displayValue = value.join(', ')
            } else if (typeof value === 'object' && 'start' in value) {
              displayValue = `${new Date(value.start).toLocaleDateString()} - ${new Date(value.end).toLocaleDateString()}`
            } else if (typeof value === 'object' && 'min' in value) {
              displayValue = `${value.min} - ${value.max}`
            } else {
              displayValue = String(value)
            }

            return (
              <div
                key={key}
                className="flex items-center gap-1 px-2 py-1 bg-primary-alpha text-primary text-sm rounded-full"
              >
                <span className="font-medium">{key}:</span>
                <span>{displayValue}</span>
                <button
                  onClick={() => removeFilter(key as keyof TraceSearchFilters)}
                  className="p-0.5 hover:bg-primary hover:text-white rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}