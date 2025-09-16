'use client'

import { 
  Eye, 
  MessageCircle, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ExternalLink,
  Hash,
  User
} from 'lucide-react'
import { ConversationTableRow, ConversationStatus } from '@/types/agent-lens'
import { cn, formatNumber } from '@/lib/utils'
import { ConversationFeedback } from './ConversationFeedback'

interface ConversationTableProps {
  conversations: ConversationTableRow[]
  loading: boolean
  onConversationSelect?: (conversation: ConversationTableRow) => void
}

export function ConversationTable({ conversations, loading, onConversationSelect }: ConversationTableProps) {
  const getStatusIcon = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.SUCCESS:
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case ConversationStatus.ERROR:
        return <XCircle className="w-4 h-4 text-red-600" />
      case ConversationStatus.TIMEOUT:
        return <AlertCircle className="w-4 h-4 text-yellow-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: ConversationStatus) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
    
    switch (status) {
      case ConversationStatus.SUCCESS:
        return `${baseClasses} bg-green-100 text-green-800`
      case ConversationStatus.ERROR:
        return `${baseClasses} bg-red-100 text-red-800`
      case ConversationStatus.TIMEOUT:
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-flex items-center gap-2 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Loading conversations...
        </div>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="p-8 text-center">
        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-500 mb-2">No conversations found</h3>
        <p className="text-gray-400">Try adjusting your filters or check back later.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Conversation
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Agent
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thread
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Response Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tokens
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Feedback
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {conversations.map((conversation) => (
            <tr key={conversation.id} className="hover:bg-gray-50 transition-colors">
              {/* Conversation Column */}
              <td className="px-4 py-4 max-w-md">
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 leading-tight">
                        {truncateText(conversation.input)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 leading-tight">
                        {truncateText(conversation.output)}
                      </p>
                    </div>
                  </div>
                </div>
              </td>

              {/* Agent Column */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-secondary" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {conversation.agent_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {conversation.metadata?.function_name || 'N/A'}
                    </div>
                  </div>
                </div>
              </td>

              {/* Status Column */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(conversation.status)}
                  <span className={getStatusBadge(conversation.status)}>
                    {conversation.status}
                  </span>
                </div>
              </td>

              {/* Thread Column */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-accent" />
                  <div>
                    <div className="text-sm text-gray-900">
                      {conversation.is_thread ? 'Multi-turn' : 'Single'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {conversation.turn_count} turn{conversation.turn_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </td>

              {/* Response Time Column */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-secondary" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {conversation.response_time}ms
                    </div>
                    <div className={cn(
                      "text-xs",
                      conversation.response_time > 1000 ? "text-red-500" : 
                      conversation.response_time > 500 ? "text-yellow-500" : "text-green-500"
                    )}>
                      {conversation.response_time > 1000 ? 'Slow' : 
                       conversation.response_time > 500 ? 'Medium' : 'Fast'}
                    </div>
                  </div>
                </div>
              </td>

              {/* Tokens Column */}
              <td className="px-4 py-4">
                <div className="text-sm font-medium text-gray-900">
                  {formatNumber(conversation.token_usage)}
                </div>
                <div className="text-xs text-gray-500">
                  tokens
                </div>
              </td>

              {/* Cost Column */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-green-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      ${conversation.cost.toFixed(3)}
                    </div>
                  </div>
                </div>
              </td>

              {/* Time Column */}
              <td className="px-4 py-4">
                <div className="text-sm text-gray-900">
                  {formatTimestamp(conversation.created_at)}
                </div>
              </td>

              {/* Feedback Column */}
              <td className="px-4 py-4">
                <ConversationFeedback
                  conversationId={conversation.id}
                  initialFeedback={conversation.feedback ? (() => {
                    try {
                      return JSON.parse(conversation.feedback)
                    } catch {
                      return null
                    }
                  })() : null}
                  compact={true}
                />
              </td>

              {/* Actions Column */}
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => onConversationSelect?.(conversation)}
                    className="p-1 text-gray-400 hover:text-primary transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onConversationSelect?.(conversation)}
                    className="p-1 text-gray-400 hover:text-primary transition-colors"
                    title="Open Thread"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}