'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { ConversationFilter, ConversationStatus } from '@/types/agent-lens'
import { cn } from '@/lib/utils'

interface ConversationFiltersProps {
  filters: ConversationFilter
  onFiltersChange: (filters: ConversationFilter) => void
  showAdvanced?: boolean
  onToggleAdvanced?: () => void
  projectAgents?: { id: string; name: string }[]
}

export function ConversationFilters({ 
  filters, 
  onFiltersChange, 
  showAdvanced = false, 
  onToggleAdvanced,
  projectAgents = []
}: ConversationFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search || '')

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFiltersChange({ ...filters, search: localSearch })
  }

  const handleQuickFilter = (filterName: string, value: any) => {
    onFiltersChange({ ...filters, [filterName]: value })
  }

  const quickFilters = [
    { 
      label: 'Last 24h', 
      isActive: filters.date_range?.start === new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      onClick: () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const today = new Date().toISOString().split('T')[0]
        handleQuickFilter('date_range', { start: yesterday, end: today })
      }
    },
    { 
      label: 'This week', 
      isActive: false,
      onClick: () => {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        const today = new Date().toISOString().split('T')[0]
        handleQuickFilter('date_range', { start: weekAgo, end: today })
      }
    },
    { 
      label: 'Errors only', 
      isActive: filters.status?.includes(ConversationStatus.ERROR),
      onClick: () => handleQuickFilter('status', [ConversationStatus.ERROR])
    },
    { 
      label: 'Long response time', 
      isActive: filters.response_time_range?.min === 1000,
      onClick: () => handleQuickFilter('response_time_range', { min: 1000, max: 999999 })
    },
    { 
      label: 'Multi-turn threads', 
      isActive: filters.thread_types?.includes('multi-turn'),
      onClick: () => handleQuickFilter('thread_types', ['multi-turn'])
    },
  ]

  return (
    <div>
      {/* Main Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Search */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </form>
        </div>
        
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
          <select 
            value={filters.status?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value
              if (value) {
                handleQuickFilter('status', [value as ConversationStatus])
              } else {
                handleQuickFilter('status', undefined)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All statuses</option>
            <option value={ConversationStatus.SUCCESS}>Success</option>
            <option value={ConversationStatus.ERROR}>Error</option>
            <option value={ConversationStatus.TIMEOUT}>Timeout</option>
          </select>
        </div>
        
        {/* Agent Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Agent</label>
          <select 
            value={filters.agent_ids?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value
              if (value) {
                handleQuickFilter('agent_ids', [value])
              } else {
                handleQuickFilter('agent_ids', undefined)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All agents</option>
            {projectAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
            {projectAgents.length === 0 && (
              <>
                <option value="project-assistant">Project Assistant</option>
                <option value="devops-agent">DevOps Agent</option>
                <option value="technical-helper">Technical Helper</option>
              </>
            )}
          </select>
        </div>
        
        {/* Thread Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Thread Type</label>
          <select 
            value={filters.thread_types?.[0] || ''}
            onChange={(e) => {
              const value = e.target.value as 'single' | 'multi-turn' | 'long' | ''
              if (value) {
                handleQuickFilter('thread_types', [value])
              } else {
                handleQuickFilter('thread_types', undefined)
              }
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="">All threads</option>
            <option value="single">Single conversation</option>
            <option value="multi-turn">Multi-turn thread</option>
            <option value="long">Long conversation (10+ turns)</option>
          </select>
        </div>
      </div>
      
      {/* Quick Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-600">Quick filters:</span>
        {quickFilters.map((filter, index) => (
          <button
            key={index}
            onClick={filter.onClick}
            className={cn(
              "px-3 py-1 text-sm rounded-full border transition-colors",
              filter.isActive
                ? "bg-primary text-white border-primary"
                : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>
      
      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-md font-semibold text-gray-800 mb-4">Advanced Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.date_range?.start || ''}
                  onChange={(e) => {
                    const newRange = { 
                      start: e.target.value, 
                      end: filters.date_range?.end || '' 
                    }
                    handleQuickFilter('date_range', newRange)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="date"
                  value={filters.date_range?.end || ''}
                  onChange={(e) => {
                    const newRange = { 
                      start: filters.date_range?.start || '', 
                      end: e.target.value 
                    }
                    handleQuickFilter('date_range', newRange)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            {/* Response Time Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Response Time (ms)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.response_time_range?.min || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined
                    handleQuickFilter('response_time_range', {
                      min: value,
                      max: filters.response_time_range?.max
                    })
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.response_time_range?.max || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined
                    handleQuickFilter('response_time_range', {
                      min: filters.response_time_range?.min,
                      max: value
                    })
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            
            {/* Token Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Token Count</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.token_range?.min || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined
                    handleQuickFilter('token_range', {
                      min: value,
                      max: filters.token_range?.max
                    })
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
                <span className="text-gray-500 self-center">to</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.token_range?.max || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined
                    handleQuickFilter('token_range', {
                      min: filters.token_range?.min,
                      max: value
                    })
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}