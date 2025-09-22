'use client'

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Zap,
  Network
} from 'lucide-react'
import { TraceTreeNode } from '@/lib/distributed-tracing'

interface TraceTreeVisualizationProps {
  traceTree: TraceTreeNode[]
  traceId: string
  onSpanClick?: (spanId: string) => void
  onA2AClick?: (communicationId: string) => void
}

interface TraceNodeProps {
  node: TraceTreeNode
  onSpanClick?: (spanId: string) => void
  onA2AClick?: (communicationId: string) => void
}

const TraceNode: React.FC<TraceNodeProps> = ({ node, onSpanClick, onA2AClick }) => {
  const [isExpanded, setIsExpanded] = useState(true)
  
  const { span, children, depth, a2aCommunications, metrics } = node
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600'
      case 'error': return 'text-red-600'
      case 'running': return 'text-blue-600'
      case 'timeout': return 'text-orange-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'error': return <XCircle className="w-4 h-4" />
      case 'running': return <Activity className="w-4 h-4 animate-pulse" />
      case 'timeout': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return '0ms'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatCost = (cost?: number) => {
    if (!cost) return '$0.00'
    return `$${cost.toFixed(4)}`
  }

  const formatTokens = (tokens?: number) => {
    if (!tokens) return '0'
    return tokens.toLocaleString()
  }

  const indentLevel = depth * 24

  return (
    <div className="relative">
      {/* Indentation line */}
      {depth > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 w-px bg-gray-200"
          style={{ left: `${indentLevel - 12}px` }}
        />
      )}
      
      <div 
        className="flex items-start gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
        style={{ paddingLeft: `${indentLevel}px` }}
        onClick={() => onSpanClick?.(span.id)}
      >
        {/* Expand/Collapse button */}
        {children.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-6 h-6 p-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </Button>
        )}
        
        {children.length === 0 && <div className="w-6" />}

        {/* Status icon */}
        <div className={`${getStatusColor(span.status)} flex-shrink-0`}>
          {getStatusIcon(span.status)}
        </div>

        {/* Span details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-gray-900 truncate">
              {span.operationName}
            </span>
            
            {span.agentId && (
              <Badge variant="outline" className="text-xs">
                {span.agentId}
              </Badge>
            )}
            
            {span.communicationType && span.communicationType !== 'direct' && (
              <Badge variant="secondary" className="text-xs">
                {span.communicationType}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(span.duration)}
            </div>
            
            {span.totalCost && span.totalCost > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCost(span.totalCost)}
              </div>
            )}
            
            {span.totalTokens && span.totalTokens > 0 && (
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                {formatTokens(span.totalTokens)}
              </div>
            )}

            {metrics.childSpanCount > 0 && (
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {metrics.childSpanCount + 1} spans
              </div>
            )}
          </div>

          {span.serviceName && (
            <div className="text-xs text-gray-500 mt-1">
              Service: {span.serviceName}
            </div>
          )}
        </div>

        {/* A2A Communications */}
        {a2aCommunications.length > 0 && (
          <div className="flex items-center gap-1">
            <Network className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-blue-600">{a2aCommunications.length}</span>
          </div>
        )}
      </div>

      {/* A2A Communications details */}
      {isExpanded && a2aCommunications.length > 0 && (
        <div className="ml-8 border-l border-gray-200">
          {a2aCommunications.map((comm) => (
            <div
              key={comm.id}
              className="p-3 border-b border-gray-100 bg-blue-50 hover:bg-blue-100 cursor-pointer"
              onClick={() => onA2AClick?.(comm.id)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Network className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">
                  {comm.sourceAgentId} → {comm.targetAgentId}
                </span>
                <Badge variant="outline" className="text-xs">
                  {comm.communicationType}
                </Badge>
                <div className={`${getStatusColor(comm.status)}`}>
                  {getStatusIcon(comm.status)}
                </div>
              </div>
              
              <div className="text-xs text-gray-600 ml-6">
                {comm.protocol && `Protocol: ${comm.protocol}`}
                {comm.endpoint && ` | Endpoint: ${comm.endpoint}`}
                {comm.duration && ` | Duration: ${formatDuration(comm.duration)}`}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Child spans */}
      {isExpanded && children.map((child) => (
        <TraceNode
          key={child.span.id}
          node={child}
          onSpanClick={onSpanClick}
          onA2AClick={onA2AClick}
        />
      ))}
    </div>
  )
}

const TraceTreeVisualization: React.FC<TraceTreeVisualizationProps> = ({
  traceTree,
  traceId,
  onSpanClick,
  onA2AClick
}) => {
  const totalSpans = traceTree.reduce((sum, node) => sum + node.metrics.childSpanCount + 1, 0)
  const totalDuration = Math.max(...traceTree.map(node => node.metrics.totalDuration))
  const totalCost = traceTree.reduce((sum, node) => sum + node.metrics.totalCost, 0)
  const totalErrors = traceTree.reduce((sum, node) => sum + node.metrics.errorCount, 0)
  const successRate = traceTree.reduce((sum, node) => sum + node.metrics.successRate, 0) / traceTree.length

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Trace Tree Visualization
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>Trace ID: {traceId}</span>
          <span>{totalSpans} spans</span>
          <span>{formatDuration(totalDuration)}</span>
          {totalCost > 0 && <span>${totalCost.toFixed(4)}</span>}
          <span className={totalErrors > 0 ? 'text-red-600' : 'text-green-600'}>
            {successRate.toFixed(1)}% success
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-96 overflow-y-auto">
          {traceTree.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No spans found in this trace
            </div>
          ) : (
            traceTree.map((rootNode) => (
              <TraceNode
                key={rootNode.span.id}
                node={rootNode}
                onSpanClick={onSpanClick}
                onA2AClick={onA2AClick}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default TraceTreeVisualization