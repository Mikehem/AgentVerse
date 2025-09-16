'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Search, 
  Filter, 
  Clock, 
  User, 
  Hash, 
  MessageCircle,
  ChevronDown,
  X,
  Calendar,
  DollarSign,
  Activity,
  Zap
} from 'lucide-react'
import { ConversationTableRow, ConversationFilter, ConversationStatus } from '@/types/agent-lens'
import { cn, formatNumber } from '@/lib/utils'

interface ConversationSearchProps {
  onSearch: (query: string, filters: ConversationFilter) => void
  onResultSelect: (conversation: ConversationTableRow) => void
  suggestions?: ConversationTableRow[]
  loading?: boolean
}

export function ConversationSearch({ 
  onSearch, 
  onResultSelect, 
  suggestions = [], 
  loading = false 
}: ConversationSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<ConversationFilter>({})
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'error responses',
    'timeout issues',
    'customer support',
    'long response time',
    'multi-turn conversations'
  ])

  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      onSearch(searchQuery, filters)
      setIsOpen(false)
      
      // Add to recent searches
      setRecentSearches(prev => {
        const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)]
        return updated.slice(0, 5)
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleFilterChange = (key: keyof ConversationFilter, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
  }

  const getActiveFiltersCount = () => {
    return Object.values(filters).filter(value => 
      value !== undefined && value !== null && 
      (Array.isArray(value) ? value.length > 0 : true)
    ).length
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>')
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search conversations, agents, or responses..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary text-sm placeholder-gray-500"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
                getActiveFiltersCount() > 0
                  ? "bg-primary text-white"
                  : "text-gray-500 hover:text-primary hover:bg-gray-100"
              )}
            >
              <Filter className="w-3 h-3" />
              {getActiveFiltersCount() > 0 && (
                <span className="bg-white text-primary rounded-full w-4 h-4 flex items-center justify-center text-xs font-medium">
                  {getActiveFiltersCount()}
                </span>
              )}
            </button>
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setIsOpen(false)
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filters Bar */}
        {showFilters && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg p-4 shadow-lg z-20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700">Quick Filters</h4>
              {getActiveFiltersCount() > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={filters.status?.[0] || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : undefined)}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value="">All</option>
                  <option value={ConversationStatus.SUCCESS}>Success</option>
                  <option value={ConversationStatus.ERROR}>Error</option>
                  <option value={ConversationStatus.TIMEOUT}>Timeout</option>
                </select>
              </div>

              {/* Agent Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Agent</label>
                <select
                  value={filters.agent_ids?.[0] || ''}
                  onChange={(e) => handleFilterChange('agent_ids', e.target.value ? [e.target.value] : undefined)}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value="">All agents</option>
                  <option value="customer-support">Customer Support</option>
                  <option value="sales-assistant">Sales Assistant</option>
                  <option value="technical-helper">Technical Helper</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time Range</label>
                <select
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === 'today') {
                      const today = new Date().toISOString().split('T')[0]
                      handleFilterChange('date_range', { start: today, end: today })
                    } else if (value === 'week') {
                      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                      const today = new Date().toISOString().split('T')[0]
                      handleFilterChange('date_range', { start: weekAgo, end: today })
                    } else {
                      handleFilterChange('date_range', undefined)
                    }
                  }}
                  className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                >
                  <option value="">All time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-hidden">
          {loading && (
            <div className="p-4 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                Searching...
              </div>
            </div>
          )}

          {!loading && query && suggestions.length > 0 && (
            <div>
              <div className="px-3 py-2 border-b border-gray-100">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Search Results ({suggestions.length})
                </h4>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {suggestions.slice(0, 5).map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => onResultSelect(conversation)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-50 last:border-b-0"
                  >
                    <div className="flex items-start gap-3">
                      <MessageCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {conversation.agent_name}
                          </span>
                          <span className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            conversation.status === ConversationStatus.SUCCESS ? "bg-green-500" :
                            conversation.status === ConversationStatus.ERROR ? "bg-red-500" : "bg-yellow-500"
                          )}></span>
                          <span className="text-xs text-gray-500">
                            {formatTimestamp(conversation.created_at)}
                          </span>
                        </div>
                        <p 
                          className="text-sm text-gray-700 line-clamp-2"
                          dangerouslySetInnerHTML={{ 
                            __html: highlightMatch(conversation.input, query) 
                          }}
                        />
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {conversation.response_time}ms
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {formatNumber(conversation.token_usage)}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ${conversation.cost.toFixed(3)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && query && suggestions.length === 0 && (
            <div className="p-4 text-center">
              <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No conversations found</p>
              <p className="text-xs text-gray-400 mt-1">Try adjusting your search terms or filters</p>
            </div>
          )}

          {!loading && !query && recentSearches.length > 0 && (
            <div>
              <div className="px-3 py-2 border-b border-gray-100">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recent Searches
                </h4>
              </div>
              <div className="py-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setQuery(search)
                      handleSearch(search)
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm text-gray-600 flex items-center gap-2"
                  >
                    <Clock className="w-3 h-3 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && !query && (
            <div className="p-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                Search Tips
              </h4>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Search className="w-3 h-3" />
                  <span>Search by conversation content, agent name, or response</span>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-3 h-3" />
                  <span>Use filters to narrow down by status, agent, or time</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3" />
                  <span>Click on results to view detailed conversation threads</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}