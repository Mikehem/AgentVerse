'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  Layers, 
  Zap, 
  Database, 
  Brain, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Tag,
  Activity,
  Server,
  Cpu,
  Network
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

interface SpanData {
  id: string
  traceId: string
  parentSpanId?: string
  name?: string
  type?: string
  startTime: string
  endTime?: string
  duration?: number
  input?: any
  output?: any
  metadata?: any
  tokenUsage?: number
  cost?: number
  status?: string
  createdAt: string
  // Additional fields from API response
  spanName?: string
  spanType?: string
  spanId?: string
}

interface SpanTimelineProps {
  traceId: string
  spans?: SpanData[]
  loading?: boolean
  className?: string
}

interface TooltipProps {
  span: SpanData
  visible: boolean
  position: { x: number; y: number }
}

// Helper functions for tooltip
const formatDurationTooltip = (duration?: number) => {
  if (!duration) return 'N/A'
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

const formatTimeTooltip = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  })
}

function SpanTooltip({ span, visible, position }: TooltipProps) {
  if (!visible) return null

  return (
    <div 
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 max-w-xs"
      style={{ 
        left: `${Math.min(position.x, window.innerWidth - 300)}px`, 
        top: `${Math.max(position.y - 120, 10)}px` 
      }}
    >
      <div className="space-y-2">
        <div className="font-semibold text-gray-900 text-sm">
          {span.name || span.spanName || 'Unnamed Span'}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Type:</span>
            <div className="font-medium">{span.type || span.spanType || 'unknown'}</div>
          </div>
          <div>
            <span className="text-gray-500">Status:</span>
            <div className="font-medium capitalize">{span.status || 'unknown'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Duration:</span>
            <div className="font-medium">{formatDurationTooltip(span.duration)}</div>
          </div>
          <div>
            <span className="text-gray-500">Start:</span>
            <div className="font-medium">{formatTimeTooltip(span.startTime)}</div>
          </div>
        </div>

        {(span.tokenUsage || span.cost) && (
          <div className="border-t border-gray-100 pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {span.tokenUsage && (
                <div>
                  <span className="text-gray-500">Tokens:</span>
                  <div className="font-medium flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {formatNumber(span.tokenUsage)}
                  </div>
                </div>
              )}
              {span.cost && (
                <div>
                  <span className="text-gray-500">Cost:</span>
                  <div className="font-medium flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${span.cost.toFixed(4)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {span.metadata && Object.keys(span.metadata).length > 0 && (
          <div className="border-t border-gray-100 pt-2">
            <span className="text-gray-500 text-xs">Tags:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {Object.entries(span.metadata).slice(0, 3).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                >
                  <Tag className="w-2 h-2" />
                  {key}: {String(value).slice(0, 10)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function SpanTimeline({ traceId, spans: initialSpans, loading: initialLoading, className }: SpanTimelineProps) {
  const [spans, setSpans] = useState<SpanData[]>(initialSpans || [])
  const [loading, setLoading] = useState(initialLoading || false)
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{
    span: SpanData | null
    visible: boolean
    position: { x: number; y: number }
  }>({
    span: null,
    visible: false,
    position: { x: 0, y: 0 }
  })

  useEffect(() => {
    if (traceId) {
      fetchSpans() // Always fetch spans from API to ensure correct data structure
    }
  }, [traceId])

  const fetchSpans = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/spans?traceId=${encodeURIComponent(traceId)}&limit=100`)
      const result = await response.json()
      
      if (result.success) {
        // Map the API response to match component expectations
        const mappedSpans = (result.data || []).map((span: any) => ({
          id: span.id || span.spanId,
          traceId: span.traceId || span.trace_id,
          parentSpanId: span.parentSpanId || span.parent_span_id,
          name: span.spanName || span.name,
          type: span.spanType || span.type,
          startTime: span.startTime || span.start_time,
          endTime: span.endTime || span.end_time,
          duration: span.duration,
          input: span.inputData || span.input,
          output: span.outputData || span.output,
          metadata: span.metadata,
          tokenUsage: span.tokenUsage || span.token_usage,
          cost: span.cost,
          status: span.status,
          createdAt: span.createdAt || span.created_at,
          // Additional fields from API response
          spanName: span.spanName,
          spanType: span.spanType,
          spanId: span.spanId
        }))
        setSpans(mappedSpans)
      } else {
        setError(result.error || 'Failed to fetch spans')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch spans')
    } finally {
      setLoading(false)
    }
  }

  const toggleSpanExpansion = (spanId: string) => {
    const newExpanded = new Set(expandedSpans)
    if (newExpanded.has(spanId)) {
      newExpanded.delete(spanId)
    } else {
      newExpanded.add(spanId)
    }
    setExpandedSpans(newExpanded)
  }

  const getSpanIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'llm':
        return <Brain className="w-4 h-4 text-purple-600" />
      case 'agent':
        return <Cpu className="w-4 h-4 text-blue-600" />
      case 'analysis':
        return <Settings className="w-4 h-4 text-emerald-600" />
      case 'retrieval':
        return <Database className="w-4 h-4 text-green-600" />
      case 'validation':
        return <CheckCircle className="w-4 h-4 text-orange-600" />
      case 'processing':
        return <Activity className="w-4 h-4 text-indigo-600" />
      case 'network':
        return <Network className="w-4 h-4 text-cyan-600" />
      case 'server':
        return <Server className="w-4 h-4 text-rose-600" />
      default:
        return <Layers className="w-4 h-4 text-gray-600" />
    }
  }

  const getSpanColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'llm':
        return {
          bg: 'bg-purple-500',
          hover: 'hover:bg-purple-600',
          light: 'bg-purple-100',
          text: 'text-purple-700',
          border: 'border-purple-200'
        }
      case 'agent':
        return {
          bg: 'bg-blue-500',
          hover: 'hover:bg-blue-600',
          light: 'bg-blue-100',
          text: 'text-blue-700',
          border: 'border-blue-200'
        }
      case 'analysis':
        return {
          bg: 'bg-emerald-500',
          hover: 'hover:bg-emerald-600',
          light: 'bg-emerald-100',
          text: 'text-emerald-700',
          border: 'border-emerald-200'
        }
      case 'retrieval':
        return {
          bg: 'bg-green-500',
          hover: 'hover:bg-green-600',
          light: 'bg-green-100',
          text: 'text-green-700',
          border: 'border-green-200'
        }
      case 'validation':
        return {
          bg: 'bg-orange-500',
          hover: 'hover:bg-orange-600',
          light: 'bg-orange-100',
          text: 'text-orange-700',
          border: 'border-orange-200'
        }
      case 'processing':
        return {
          bg: 'bg-indigo-500',
          hover: 'hover:bg-indigo-600',
          light: 'bg-indigo-100',
          text: 'text-indigo-700',
          border: 'border-indigo-200'
        }
      case 'network':
        return {
          bg: 'bg-cyan-500',
          hover: 'hover:bg-cyan-600',
          light: 'bg-cyan-100',
          text: 'text-cyan-700',
          border: 'border-cyan-200'
        }
      case 'server':
        return {
          bg: 'bg-rose-500',
          hover: 'hover:bg-rose-600',
          light: 'bg-rose-100',
          text: 'text-rose-700',
          border: 'border-rose-200'
        }
      default:
        return {
          bg: 'bg-gray-500',
          hover: 'hover:bg-gray-600',
          light: 'bg-gray-100',
          text: 'text-gray-700',
          border: 'border-gray-200'
        }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-600" />
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />
      case 'running':
        return <AlertCircle className="w-3 h-3 text-yellow-600" />
      default:
        return <AlertCircle className="w-3 h-3 text-gray-400" />
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(2)}s`
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  // Calculate timeline visualization
  const sortedSpans = [...spans].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  const traceStartTime = sortedSpans.length > 0 
    ? new Date(sortedSpans[0].startTime).getTime() 
    : Date.now()
  
  const traceEndTime = sortedSpans.length > 0
    ? Math.max(...sortedSpans.map(span => 
        span.endTime ? new Date(span.endTime).getTime() : new Date(span.startTime).getTime()
      ))
    : Date.now()
  
  const totalDuration = traceEndTime - traceStartTime

  const getSpanPosition = (span: SpanData) => {
    const startOffset = new Date(span.startTime).getTime() - traceStartTime
    const duration = span.duration || 0
    const left = totalDuration > 0 ? (startOffset / totalDuration) * 100 : 0
    const width = totalDuration > 0 ? (duration / totalDuration) * 100 : 2
    return { left: `${left}%`, width: `${Math.max(width, 2)}%` }
  }

  if (loading) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          Loading spans...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("p-4", className)}>
        <div className="flex items-center gap-2 text-red-600">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      </div>
    )
  }

  if (spans.length === 0) {
    return (
      <div className={cn("p-4 text-center", className)}>
        <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No spans found for this trace</p>
      </div>
    )
  }

  return (
    <div className="relative">
      <div className={cn("bg-white rounded-lg border border-gray-200 shadow-sm", className)}>
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Distributed Span Timeline</h3>
                <p className="text-sm text-gray-600">{spans.length} spans • Agent-to-Agent execution flow</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 bg-white px-3 py-1 rounded-lg border">
                <Clock className="w-4 h-4" />
                <span className="font-medium">{formatDuration(totalDuration)}</span>
              </div>
              <button 
                onClick={fetchSpans}
                className="flex items-center gap-1 px-3 py-1 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
              >
                <Activity className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          {/* Enhanced Timeline visualization */}
          <div className="mb-8">
            <div className="relative h-12 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg overflow-hidden border border-gray-200">
              {/* Timeline grid lines */}
              <div className="absolute inset-0 flex">
                {[0, 25, 50, 75, 100].map((percent) => (
                  <div
                    key={percent}
                    className="absolute top-0 bottom-0 w-px bg-gray-200 opacity-50"
                    style={{ left: `${percent}%` }}
                  />
                ))}
              </div>
              
              {sortedSpans.map((span, index) => {
                const position = getSpanPosition(span)
                const colors = getSpanColor(span.type || span.spanType || 'unknown')
                const spanKey = span.id || span.spanId || `span-${index}`
                
                return (
                  <div
                    key={spanKey}
                    className={cn(
                      "absolute top-2 h-8 rounded-md shadow-sm transition-all duration-200 cursor-pointer group",
                      colors.bg,
                      colors.hover,
                      "hover:shadow-md hover:scale-105 hover:z-10"
                    )}
                    style={position}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect()
                      setTooltip({
                        span,
                        visible: true,
                        position: {
                          x: rect.left + rect.width / 2,
                          y: rect.top
                        }
                      })
                    }}
                    onMouseLeave={() => {
                      setTooltip(prev => ({ ...prev, visible: false }))
                    }}
                    onClick={() => toggleSpanExpansion(spanKey)}
                  >
                    {/* Span content */}
                    <div className="px-2 py-1 h-full flex items-center justify-between text-white text-xs font-medium">
                      <div className="flex items-center gap-1 truncate">
                        {getSpanIcon(span.type || span.spanType || 'unknown')}
                        <span className="truncate">
                          {span.name || span.spanName || 'Unnamed'}
                        </span>
                      </div>
                      {span.cost && (
                        <span className="text-xs opacity-80">
                          ${span.cost.toFixed(3)}
                        </span>
                      )}
                    </div>
                    
                    {/* Status indicator */}
                    <div className="absolute top-0 right-1 w-2 h-2 rounded-full bg-white opacity-90">
                      <div className={cn(
                        "w-full h-full rounded-full",
                        span.status === 'success' && "bg-green-400",
                        span.status === 'error' && "bg-red-400",
                        span.status === 'running' && "bg-yellow-400",
                        !span.status && "bg-gray-400"
                      )} />
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Timeline labels */}
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(sortedSpans[0]?.startTime)}
              </span>
              <span className="text-gray-400">Duration: {formatDuration(totalDuration)}</span>
              <span>+{formatDuration(totalDuration)}</span>
            </div>
            
            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-3 text-xs">
              {Array.from(new Set(sortedSpans.map(s => s.type || s.spanType).filter(Boolean))).map(type => {
                const colors = getSpanColor(type!)
                return (
                  <div key={type} className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 rounded", colors.bg)} />
                    <span className="text-gray-600 capitalize">{type}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Enhanced Span details list */}
          <div className="space-y-3">
            {sortedSpans.map((span, index) => {
              const isExpanded = expandedSpans.has(span.id || span.spanId || `span-${index}`)
              const colors = getSpanColor(span.type || span.spanType || 'unknown')
              const spanKey = span.id || span.spanId || `span-${index}`
              
              return (
                <div key={spanKey} className={cn("border rounded-lg overflow-hidden", colors.border)}>
                  <div 
                    className={cn(
                      "p-4 cursor-pointer transition-all duration-200",
                      colors.light,
                      "hover:shadow-sm"
                    )}
                    onClick={() => toggleSpanExpansion(spanKey)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                          <div className={cn("p-1 rounded", colors.light)}>
                            {getSpanIcon(span.type || span.spanType || 'unknown')}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={cn("font-semibold", colors.text)}>
                              {span.name || span.spanName || 'Unnamed Span'}
                            </span>
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-full font-medium",
                              colors.light,
                              colors.text
                            )}>
                              {span.type || span.spanType || 'unknown'}
                            </span>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(span.status || 'unknown')}
                              <span className="text-xs text-gray-500 capitalize">
                                {span.status || 'unknown'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(span.startTime)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {formatDuration(span.duration)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {span.tokenUsage && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            <Zap className="w-3 h-3" />
                            {formatNumber(span.tokenUsage)}
                          </div>
                        )}
                        {span.cost && (
                          <div className="flex items-center gap-1 text-xs text-gray-600 bg-green-100 text-green-700 px-2 py-1 rounded">
                            <DollarSign className="w-3 h-3" />
                            ${span.cost.toFixed(4)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
                      {span.input && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Input</div>
                          <pre className="text-xs bg-gray-50 p-2 rounded text-gray-600 overflow-x-auto">
                            {typeof span.input === 'string' ? span.input : JSON.stringify(span.input, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {span.output && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Output</div>
                          <pre className="text-xs bg-gray-50 p-2 rounded text-gray-600 overflow-x-auto">
                            {typeof span.output === 'string' ? span.output : JSON.stringify(span.output, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {span.metadata && Object.keys(span.metadata).length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-gray-700 mb-1">Metadata</div>
                          <pre className="text-xs bg-gray-50 p-2 rounded text-gray-600 overflow-x-auto">
                            {JSON.stringify(span.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Interactive Tooltip */}
      {tooltip.span && (
        <SpanTooltip
          span={tooltip.span}
          visible={tooltip.visible}
          position={tooltip.position}
        />
      )}
    </div>
  )
}