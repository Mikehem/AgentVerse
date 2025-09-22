'use client'

import { useState, useEffect } from 'react'
import { ConversationsDashboard } from '@/components/conversations/ConversationsDashboard'
import { ConversationThread } from '@/components/conversations/ConversationThread'
import { ConversationSpanDetail } from '@/components/conversations/ConversationSpanDetail'
import { ConversationSearch } from '@/components/conversations/ConversationSearch'
import { ConversationMetrics, ConversationTableRow, ConversationFilter, SpanData, TraceData } from '@/types/agent-lens'


type ViewMode = 'dashboard' | 'thread' | 'span' | 'search'

export default function ConversationsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [selectedConversation, setSelectedConversation] = useState<ConversationTableRow | null>(null)
  const [selectedSpan, setSelectedSpan] = useState<SpanData | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceData | null>(null)
  
  const [metrics, setMetrics] = useState<ConversationMetrics | null>(null)
  const [conversations, setConversations] = useState<ConversationTableRow[]>([])
  const [spans, setSpans] = useState<SpanData[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ConversationFilter>({})

  // Fetch real data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Build query parameters for conversations API
        const queryParams = new URLSearchParams()
        if (filters.project_ids?.length) {
          filters.project_ids.forEach(id => queryParams.append('projectId', id))
        }
        if (filters.agent_ids?.length) {
          filters.agent_ids.forEach(id => queryParams.append('agentId', id))
        }
        if (filters.status) {
          queryParams.append('status', filters.status)
        }
        if (filters.search) {
          queryParams.append('search', filters.search)
        }
        queryParams.append('limit', '100') // Get more conversations for overview

        // Fetch conversations from API
        const conversationsResponse = await fetch('/api/v1/conversations?' + queryParams.toString())
        const conversationsData = await conversationsResponse.json()
        
        if (conversationsData.success) {
          const rawConvs = conversationsData.data || []
          // Transform API data to match ConversationTableRow interface
          const convs = rawConvs.map((conv: any) => ({
            ...conv,
            // Ensure proper timestamp handling
            created_at: conv.created_at,
            // Add missing required fields for ConversationTableRow
            agent_name: conv.agent_name || 'Unknown Agent',
            turn_count: 1, // Default to 1 for now
            is_thread: false, // Default to false for now
            // Normalize field names if needed
            response_time: conv.response_time || 0,
            token_usage: conv.token_usage || 0,
            cost: conv.cost || 0
          }))
          setConversations(convs)
          
          // Calculate metrics from conversations data
          const totalConversations = conversationsData.meta?.total || convs.length
          const successfulConvs = convs.filter((c: any) => c.status === 'success')
          const totalTokens = convs.reduce((sum: number, c: any) => sum + (c.token_usage || 0), 0)
          const totalCost = convs.reduce((sum: number, c: any) => sum + (c.cost || 0), 0)
          const avgResponseTime = convs.length > 0 
            ? convs.reduce((sum: number, c: any) => sum + (c.response_time || 0), 0) / convs.length
            : 0

          setMetrics({
            total_conversations: totalConversations,
            total_threads: Math.ceil(totalConversations * 0.8), // Estimate
            average_response_time: Math.round(avgResponseTime),
            success_rate: convs.length > 0 ? (successfulConvs.length / convs.length) : 0,
            total_tokens: totalTokens,
            total_cost: totalCost,
            active_threads: Math.ceil(totalConversations * 0.1), // Estimate  
            error_count: convs.filter((c: any) => c.status === 'error').length,
            conversations_today: convs.filter((c: any) => {
              const today = new Date().toDateString()
              return new Date(c.created_at).toDateString() === today
            }).length,
            conversations_this_week: convs.filter((c: any) => {
              const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              return new Date(c.created_at) >= weekAgo
            }).length,
            period_comparison: {
              conversations_change: 12.5, // Mock comparison data
              response_time_change: -5.2,
              success_rate_change: 2.1,
              token_usage_change: 8.7,
            },
          })
        } else {
          console.error('Failed to fetch conversations:', conversationsData.error)
          setConversations([])
          setMetrics({
            total_conversations: 0,
            total_threads: 0,
            average_response_time: 0,
            success_rate: 0,
            total_tokens: 0,
            total_cost: 0,
            active_threads: 0,
            error_count: 0,
            conversations_today: 0,
            conversations_this_week: 0,
            period_comparison: {
              conversations_change: 0,
              response_time_change: 0,
              success_rate_change: 0,
              token_usage_change: 0,
            },
          })
        }
        
        // For now, keep spans empty as we don't have span data
        setSpans([])
      } catch (error) {
        console.error('Failed to fetch conversations:', error)
        setConversations([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [filters])

  const handleFiltersChange = (newFilters: ConversationFilter) => {
    setFilters(newFilters)
  }

  const handleRefresh = () => {
    // Trigger data refresh
    setFilters({ ...filters })
  }

  const handleExport = async () => {
    try {
      if (conversations.length === 0) {
        console.log('No conversations to export')
        return
      }
      
      const dataStr = JSON.stringify(conversations, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `conversations-export-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Navigation handlers
  const handleConversationSelect = (conversation: ConversationTableRow) => {
    setSelectedConversation(conversation)
    setViewMode('thread')
  }

  const handleSpanSelect = (span: SpanData) => {
    setSelectedSpan(span)
    setViewMode('span')
  }

  const handleBackToDashboard = () => {
    setViewMode('dashboard')
    setSelectedConversation(null)
    setSelectedSpan(null)
  }

  const handleBackToThread = () => {
    setViewMode('thread')
    setSelectedSpan(null)
  }

  const handleSearch = (query: string, searchFilters: ConversationFilter) => {
    // In real app: perform search API call
    console.log('Search:', query, searchFilters)
    setFilters({ ...filters, ...searchFilters, search: query })
  }

  // Render based on view mode
  if (viewMode === 'thread' && selectedConversation) {
    return (
      <ConversationThread
        conversation={selectedConversation}
        onBack={handleBackToDashboard}
      />
    )
  }

  if (viewMode === 'span' && selectedSpan) {
    return (
      <ConversationSpanDetail
        span={selectedSpan}
        trace={selectedTrace || undefined}
        childSpans={spans.filter(s => s.id !== selectedSpan.id)}
        onBack={handleBackToThread}
      />
    )
  }

  return (
    <>
      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <ConversationSearch
          onSearch={handleSearch}
          onResultSelect={handleConversationSelect}
          suggestions={conversations.filter(c => 
            filters.search ? c.input.toLowerCase().includes(filters.search.toLowerCase()) : false
          )}
          loading={loading}
        />
      </div>

      {/* Dashboard */}
      {metrics && (
        <ConversationsDashboard
          metrics={metrics}
          conversations={conversations}
          loading={loading}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
          onExport={handleExport}
          onConversationSelect={handleConversationSelect}
        />
      )}
    </>
  )
}