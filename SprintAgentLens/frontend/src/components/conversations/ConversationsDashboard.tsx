'use client'

import { useState } from 'react'
import { 
  MessageCircle, 
  Zap, 
  CheckCircle, 
  Layers, 
  Download, 
  RefreshCw,
  ChevronRight,
  Eye,
  Activity,
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react'
import { ConversationMetrics, ConversationTableRow, ConversationFilter, ConversationStatus } from '@/types/agent-lens'
import { cn, formatNumber } from '@/lib/utils'
import { ConversationFilters } from './ConversationFilters'
import { ConversationTable } from './ConversationTable'

interface ConversationsDashboardProps {
  metrics: ConversationMetrics
  conversations: ConversationTableRow[]
  loading: boolean
  filters: ConversationFilter
  onFiltersChange: (filters: ConversationFilter) => void
  onRefresh: () => void
  onExport: () => void
  onConversationSelect?: (conversation: ConversationTableRow) => void
  projectAgents?: { id: string; name: string }[]
}

export function ConversationsDashboard({
  metrics,
  conversations,
  loading,
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  onConversationSelect,
  projectAgents
}: ConversationsDashboardProps) {
  const [showFilters, setShowFilters] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Conversations</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Conversations Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor and analyze agent conversations, traces, and performance metrics</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button 
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Metrics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Total Conversations"
            value={formatNumber(metrics.total_conversations)}
            change={`+${metrics.period_comparison.conversations_change}% from last week`}
            changeType="positive"
            icon={MessageCircle}
            iconColor="bg-primary"
          />
          
          <MetricCard
            title="Avg Response Time"
            value={`${metrics.average_response_time}ms`}
            change={`${metrics.period_comparison.response_time_change}ms from last week`}
            changeType="positive"
            icon={Zap}
            iconColor="bg-secondary"
          />
          
          <MetricCard
            title="Success Rate"
            value={`${metrics.success_rate.toFixed(1)}%`}
            change={`+${metrics.period_comparison.success_rate_change}% from last week`}
            changeType="positive"
            icon={CheckCircle}
            iconColor="bg-green-500"
          />
          
          <MetricCard
            title="Active Threads"
            value={metrics.active_threads.toString()}
            change="5 require attention"
            changeType="warning"
            icon={Layers}
            iconColor="bg-accent"
          />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Filter Conversations</h3>
              <button 
                onClick={() => onFiltersChange({})}
                className="text-sm text-gray-500 hover:text-primary"
              >
                Clear all filters
              </button>
            </div>
            
            <ConversationFilters
              filters={filters}
              onFiltersChange={onFiltersChange}
              showAdvanced={showFilters}
              onToggleAdvanced={() => setShowFilters(!showFilters)}
              projectAgents={projectAgents}
            />
          </div>
        </div>

        {/* Conversations Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Recent Conversations</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Showing {conversations.length} of {formatNumber(metrics.total_conversations)} conversations</span>
              <div className="flex items-center gap-1">
                <button className="p-1 text-gray-400 hover:text-primary">
                  <ChevronRight className="w-4 h-4 rotate-180" />
                </button>
                <button className="p-1 text-gray-400 hover:text-primary">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          <ConversationTable 
            conversations={conversations}
            loading={loading}
            onConversationSelect={onConversationSelect}
          />
          
          {/* Load More */}
          <div className="p-4 text-center border-t border-gray-200">
            <button className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors">
              Load More Conversations
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string
  change: string
  changeType: 'positive' | 'negative' | 'warning'
  icon: React.ComponentType<any>
  iconColor: string
}

function MetricCard({ title, value, change, changeType, icon: Icon, iconColor }: MetricCardProps) {
  const changeColorClass = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    warning: 'text-yellow-600'
  }[changeType]

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-primary">{value}</p>
          <p className={cn("text-sm", changeColorClass)}>{change}</p>
        </div>
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconColor)}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  )
}