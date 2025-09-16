'use client'

import { useState } from 'react'
import { 
  ArrowLeft, 
  MessageCircle, 
  User, 
  Bot,
  Clock,
  DollarSign,
  Hash,
  Activity,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Copy,
  Download,
  Eye
} from 'lucide-react'
import { ConversationTableRow, SpanData, ConversationStatus } from '@/types/agent-lens'
import { cn, formatNumber } from '@/lib/utils'
import { ConversationFeedback } from './ConversationFeedback'
import { SpanTimeline } from '../spans/SpanTimeline'

interface ConversationThreadProps {
  conversation: ConversationTableRow
  onBack: () => void
}

export function ConversationThread({ conversation, onBack }: ConversationThreadProps) {

  const getStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case ConversationStatus.SUCCESS:
        return 'text-green-600 bg-green-100'
      case ConversationStatus.ERROR:
        return 'text-red-600 bg-red-100'
      case ConversationStatus.TIMEOUT:
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Conversations
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-primary flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Conversation Thread
              </h1>
              <p className="text-sm text-gray-600">
                {conversation.thread_id} • {conversation.turn_count} turn{conversation.turn_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => copyToClipboard(conversation.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors"
              title="Copy Conversation ID"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors">
              <ExternalLink className="w-4 h-4" />
              Open in Traces
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Conversation Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Conversation Details */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  getStatusColor(conversation.status)
                )}>
                  {conversation.status}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <User className="w-4 h-4" />
                  {conversation.agent_name}
                </div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  {formatTimestamp(conversation.created_at)}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">User Input</h3>
                  <div className="bg-gray-50 rounded-md p-3">
                    <p className="text-sm text-gray-900">{conversation.input}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Agent Response</h3>
                  <div className="bg-primary/5 rounded-md p-3">
                    <p className="text-sm text-gray-900">{conversation.output}</p>
                  </div>
                </div>

                {/* Feedback Section */}
                <div>
                  <ConversationFeedback
                    conversationId={conversation.id}
                    initialFeedback={conversation.feedback ? (() => {
                      try {
                        return JSON.parse(conversation.feedback)
                      } catch {
                        return null
                      }
                    })() : null}
                    compact={false}
                    showHistory={true}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Metrics */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 text-secondary mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Response Time</span>
                  </div>
                  <p className="text-lg font-semibold text-primary">{conversation.response_time}ms</p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 text-secondary mb-1">
                    <Hash className="w-4 h-4" />
                    <span className="text-xs font-medium">Tokens</span>
                  </div>
                  <p className="text-lg font-semibold text-primary">{formatNumber(conversation.token_usage)}</p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 text-secondary mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs font-medium">Cost</span>
                  </div>
                  <p className="text-lg font-semibold text-primary">${conversation.cost.toFixed(3)}</p>
                </div>

                <div className="bg-gray-50 rounded-md p-3">
                  <div className="flex items-center gap-2 text-secondary mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-medium">Spans</span>
                  </div>
                  <p className="text-lg font-semibold text-primary">Loading...</p>
                </div>
              </div>

              {/* Metadata */}
              {conversation.metadata && (
                <div className="bg-gray-50 rounded-md p-3">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Metadata</h4>
                  <div className="space-y-1">
                    {conversation.metadata.function_name && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Function:</span>
                        <span className="text-gray-900 font-mono">{conversation.metadata.function_name}</span>
                      </div>
                    )}
                    {conversation.metadata.auto_logged && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Auto-logged:</span>
                        <span className="text-green-600">✓</span>
                      </div>
                    )}
                    {conversation.metadata.tags && (
                      <div>
                        <span className="text-xs text-gray-600">Tags:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {conversation.metadata.tags.map((tag) => (
                            <span key={tag} className="inline-block px-2 py-0.5 bg-accent/20 text-accent-dark text-xs rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Spans Timeline */}
        <SpanTimeline 
          traceId={`trace_${conversation.id}`} // Use proper trace ID format
          loading={false}
          className="mb-6"
        />

      </div>
    </div>
  )
}