'use client'

import React, { useMemo } from 'react'
import { ThumbsUp, ThumbsDown, MessageSquare, Clock, Zap, DollarSign, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import MarkdownPreview from '@/components/ui/markdown-preview'
import { cn } from '@/lib/utils'

export interface ConversationMessage {
  id: string
  input: string
  output: string
  status: 'success' | 'error' | 'timeout'
  responseTime: number
  tokenUsage: number
  cost: number
  feedback?: string
  createdAt: string
  metadata?: Record<string, any>
}

interface ConversationMessageProps {
  message: ConversationMessage
  onFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void
  onViewTrace?: (messageId: string) => void
  onViewDetails?: (messageId: string) => void
  className?: string
}

const ConversationMessage: React.FC<ConversationMessageProps> = ({
  message,
  onFeedback,
  onViewTrace,
  onViewDetails,
  className
}) => {
  const currentFeedback = useMemo(() => {
    return message.feedback
  }, [message.feedback])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatCost = (cost: number) => {
    if (cost < 0.001) return `$${(cost * 1000).toFixed(3)}k`
    return `$${cost.toFixed(4)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'timeout':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div 
      className={cn("border-b pt-6 first:pt-4 pb-4", className)}
      data-message-id={message.id}
    >
      {/* User Input */}
      <div className="mb-4 flex justify-end">
        <div className="relative min-w-[20%] max-w-[85%] rounded-t-xl rounded-bl-xl bg-blue-50 dark:bg-blue-950 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">User</span>
            <Badge variant="outline" className={getStatusColor(message.status)}>
              {message.status}
            </Badge>
          </div>
          <MarkdownPreview className="text-blue-900 dark:text-blue-100">
            {message.input}
          </MarkdownPreview>
        </div>
      </div>

      {/* Agent Response */}
      <div className="flex justify-start">
        <div className="relative min-w-[20%] max-w-[85%] rounded-t-xl rounded-br-xl bg-gray-50 dark:bg-gray-900 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Assistant</span>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDuration(message.responseTime)}
              <Zap className="w-3 h-3" />
              {message.tokenUsage}
              <DollarSign className="w-3 h-3" />
              {formatCost(message.cost)}
            </div>
          </div>
          <MarkdownPreview className="text-gray-900 dark:text-gray-100">
            {message.output}
          </MarkdownPreview>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mt-3 flex items-center gap-1 px-2">
        {/* Feedback Buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFeedback?.(message.id, 'like')}
          className={cn(
            "h-8 px-2",
            currentFeedback === 'like' && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
          )}
        >
          <ThumbsUp className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFeedback?.(message.id, 'dislike')}
          className={cn(
            "h-8 px-2",
            currentFeedback === 'dislike' && "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          )}
        >
          <ThumbsDown className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="mx-2 h-5" />

        {/* Action Buttons */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewTrace?.(message.id)}
          className="h-8 px-2 text-xs"
        >
          <BarChart3 className="w-4 h-4 mr-1" />
          View trace
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewDetails?.(message.id)}
          className="h-8 px-2 text-xs"
        >
          View details
        </Button>

        {/* Metadata */}
        {message.metadata?.threadId && (
          <>
            <Separator orientation="vertical" className="mx-2 h-5" />
            <Badge variant="outline" className="text-xs">
              Thread: {message.metadata.threadId.slice(-6)}
            </Badge>
          </>
        )}
        {message.metadata?.conversationIndex !== undefined && (
          <Badge variant="outline" className="text-xs">
            Turn {message.metadata.conversationIndex + 1}
          </Badge>
        )}
      </div>
    </div>
  )
}

export default ConversationMessage