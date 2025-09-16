'use client'

import React, { useCallback, useState } from 'react'
import { MessageCircleMore, Clock, Hash, MoreHorizontal, Share, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import ConversationMessage, { ConversationMessage } from './conversation-message'
import { cn } from '@/lib/utils'

export interface ConversationThread {
  id: string
  threadId?: string
  status: 'active' | 'inactive'
  messages: ConversationMessage[]
  totalMessages: number
  startTime: string
  endTime?: string
  duration?: number
  avgResponseTime: number
  totalCost: number
  totalTokens: number
  metadata?: Record<string, any>
}

interface ConversationThreadProps {
  thread: ConversationThread
  selectedMessageId?: string
  onMessageFeedback?: (messageId: string, feedback: 'like' | 'dislike') => void
  onViewTrace?: (messageId: string) => void
  onViewDetails?: (messageId: string) => void
  onSelectMessage?: (messageId: string) => void
  className?: string
  compact?: boolean
}

const ConversationThread: React.FC<ConversationThreadProps> = ({
  thread,
  selectedMessageId,
  onMessageFeedback,
  onViewTrace,
  onViewDetails,
  onSelectMessage,
  className,
  compact = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true)

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '—'
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const formatCost = (cost: number) => {
    if (cost < 0.001) return `$${(cost * 1000).toFixed(2)}k`
    return `$${cost.toFixed(4)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'inactive':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const scrollToMessage = useCallback((messageId: string) => {
    const element = document.querySelector(`[data-message-id="${messageId}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [])

  if (compact) {
    return (
      <Card 
        className={cn("cursor-pointer hover:shadow-md transition-shadow", className)}
        onClick={() => onSelectMessage?.(thread.messages[0]?.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircleMore className="w-4 h-4 text-muted-foreground" />
                <Badge variant="outline" className={getStatusColor(thread.status)}>
                  {thread.status}
                </Badge>
                <Badge variant="outline">
                  {thread.totalMessages} message{thread.totalMessages !== 1 ? 's' : ''}
                </Badge>
                {thread.threadId && (
                  <Badge variant="outline" className="text-xs">
                    #{thread.threadId.slice(-6)}
                  </Badge>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground mb-2 truncate">
                <span className="font-medium">User:</span> {thread.messages[0]?.input}
              </div>
              
              <div className="text-sm text-muted-foreground truncate">
                <span className="font-medium">Assistant:</span> {thread.messages[0]?.output}
              </div>
            </div>
            
            <div className="text-right text-xs text-muted-foreground">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3" />
                {formatTime(thread.startTime)}
              </div>
              <div>{formatCost(thread.totalCost)}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("relative", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <MessageCircleMore className="w-5 h-5 text-muted-foreground" />
            <Badge variant="outline" className={getStatusColor(thread.status)}>
              {thread.status}
            </Badge>
            <Badge variant="outline">
              {thread.totalMessages} message{thread.totalMessages !== 1 ? 's' : ''}
            </Badge>
            {thread.threadId && (
              <Badge variant="outline" className="font-mono text-xs">
                #{thread.threadId.slice(-6)}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(thread.startTime)}
                </span>
                <span>Duration: {formatDuration(thread.duration)}</span>
                <span>Cost: {formatCost(thread.totalCost)}</span>
                <span>Tokens: {thread.totalTokens}</span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Share className="w-4 h-4 mr-2" />
                  Share thread
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Hash className="w-4 h-4 mr-2" />
                  Copy thread ID
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-0">
            {thread.messages.map((message, index) => (
              <ConversationMessage
                key={message.id}
                message={message}
                onFeedback={onMessageFeedback}
                onViewTrace={onViewTrace}
                onViewDetails={onViewDetails}
                className={cn(
                  selectedMessageId === message.id && "bg-blue-50 dark:bg-blue-950 rounded-lg px-3 -mx-3"
                )}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default ConversationThread