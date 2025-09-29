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
  User,
  Database,
  Plus
} from 'lucide-react'
import { ConversationTableRow, ConversationStatus } from '@/types/agent-lens'
import { safeFormatDateTime } from '@/lib/dateUtils'
import { cn, formatNumber } from '@/lib/utils'
import { ConversationFeedback } from './ConversationFeedback'
import { AddToDatasetModal } from '@/components/datasets/AddToDatasetModal'

interface ConversationTableProps {
  conversations: ConversationTableRow[]
  loading: boolean
  onConversationSelect?: (conversation: ConversationTableRow) => void
  projectId?: string
  projectName?: string
  selectedConversations?: Set<string>
  onConversationSelectionChange?: (selectedIds: Set<string>) => void
  onAddToDataset?: (conversations: ConversationTableRow[]) => void
}

export function ConversationTable({ 
  conversations, 
  loading, 
  onConversationSelect,
  projectId,
  projectName,
  selectedConversations = new Set(),
  onConversationSelectionChange,
  onAddToDataset
}: ConversationTableProps) {
  const [showAddToDatasetModal, setShowAddToDatasetModal] = useState(false)
  const [pendingConversations, setPendingConversations] = useState<ConversationTableRow[]>([])
  const handleSelectAll = (checked: boolean) => {
    if (!onConversationSelectionChange) return
    
    if (checked) {
      const allIds = new Set(conversations.map(conv => conv.id))
      onConversationSelectionChange(allIds)
    } else {
      onConversationSelectionChange(new Set())
    }
  }

  const handleSelectConversation = (conversationId: string, checked: boolean) => {
    if (!onConversationSelectionChange) return
    
    const newSelection = new Set(selectedConversations)
    if (checked) {
      newSelection.add(conversationId)
    } else {
      newSelection.delete(conversationId)
    }
    onConversationSelectionChange(newSelection)
  }

  const handleAddToDataset = (conversationsToAdd?: ConversationTableRow[]) => {
    let dataToAdd: ConversationTableRow[]
    
    if (conversationsToAdd) {
      // Single conversation from action button
      dataToAdd = conversationsToAdd
    } else {
      // Bulk selection
      if (selectedConversations.size === 0) return
      dataToAdd = conversations.filter(conv => selectedConversations.has(conv.id))
    }
    
    setPendingConversations(dataToAdd)
    setShowAddToDatasetModal(true)
  }
  
  const handleDatasetModalSuccess = () => {
    setShowAddToDatasetModal(false)
    setPendingConversations([])
    // Clear selection after successful addition
    onConversationSelectionChange?.(new Set())
  }

  const isAllSelected = conversations.length > 0 && selectedConversations.size === conversations.length
  const isPartiallySelected = selectedConversations.size > 0 && selectedConversations.size < conversations.length
  const showSelectionControls = onConversationSelectionChange && onAddToDataset

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
      {/* Bulk Actions Bar */}
      {showSelectionControls && selectedConversations.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                {selectedConversations.size} conversation{selectedConversations.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddToDataset}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add to Dataset
              </button>
              <button
                onClick={() => onConversationSelectionChange?.(new Set())}
                className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {showSelectionControls && (
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = isPartiallySelected
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
              </th>
            )}
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
              {/* Selection Column */}
              {showSelectionControls && (
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedConversations.has(conversation.id)}
                    onChange={(e) => handleSelectConversation(conversation.id, e.target.checked)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                </td>
              )}
              
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
                  {safeFormatDateTime(conversation.created_at)}
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
                  {projectId && (
                    <button 
                      onClick={() => handleAddToDataset([conversation])}
                      className="p-1 text-gray-400 hover:text-primary transition-colors"
                      title="Add to Dataset"
                    >
                      <Database className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
      
      {/* Add to Dataset Modal */}
      {projectId && (
        <AddToDatasetModal
          isOpen={showAddToDatasetModal}
          onClose={() => setShowAddToDatasetModal(false)}
          onSuccess={handleDatasetModalSuccess}
          projectId={projectId}
          conversationData={pendingConversations.map(conv => ({
            id: conv.id,
            input: conv.input,
            output: conv.output,
            agent_name: conv.agent_name,
            metadata: {
              status: conv.status,
              response_time: conv.response_time,
              token_usage: conv.token_usage,
              cost: conv.cost,
              created_at: conv.created_at,
              thread_id: conv.thread_id,
              turn_count: conv.turn_count
            }
          }))}
          dataType="conversation"
        />
      )}
    </div>
  )
}