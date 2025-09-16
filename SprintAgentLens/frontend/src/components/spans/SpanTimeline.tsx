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
  DollarSign
} from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'

interface SpanData {
  id: string
  traceId: string
  parentSpanId?: string
  name: string
  type: string
  startTime: string
  endTime?: string
  duration?: number
  input?: any
  output?: any
  metadata?: any
  tokenUsage?: number
  cost?: number
  status: string
  createdAt: string
}

interface SpanTimelineProps {
  traceId: string
  spans?: SpanData[]
  loading?: boolean
  className?: string
}

export function SpanTimeline({ traceId, spans: initialSpans, loading: initialLoading, className }: SpanTimelineProps) {
  const [spans, setSpans] = useState<SpanData[]>(initialSpans || [])
  const [loading, setLoading] = useState(initialLoading || false)
  const [expandedSpans, setExpandedSpans] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!initialSpans && traceId) {
      fetchSpans()
    }
  }, [traceId, initialSpans])

  const fetchSpans = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/spans?traceId=${encodeURIComponent(traceId)}&limit=100`)
      const result = await response.json()
      
      if (result.success) {
        setSpans(result.data || [])
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
    switch (type.toLowerCase()) {
      case 'llm':
        return <Brain className="w-4 h-4 text-purple-600" />
      case 'analysis':
        return <Settings className="w-4 h-4 text-blue-600" />
      case 'retrieval':
        return <Database className="w-4 h-4 text-green-600" />
      case 'validation':
        return <CheckCircle className="w-4 h-4 text-orange-600" />
      default:
        return <Layers className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
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
    <div className={cn("bg-white rounded-lg border border-gray-200", className)}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-primary">Span Timeline</h3>
            <span className="text-sm text-gray-500">({spans.length} spans)</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Total: {formatDuration(totalDuration)}
            </div>
            <button 
              onClick={fetchSpans}
              className="px-2 py-1 text-primary hover:bg-primary-light rounded text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Timeline visualization */}
        <div className="mb-6">
          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
            {sortedSpans.map((span) => {
              const position = getSpanPosition(span)
              return (
                <div
                  key={span.id}
                  className={cn(
                    "absolute top-1 h-6 rounded-sm opacity-80 hover:opacity-100 transition-opacity cursor-pointer",
                    span.type === 'llm' && "bg-purple-500",
                    span.type === 'analysis' && "bg-blue-500",
                    span.type === 'retrieval' && "bg-green-500",
                    span.type === 'validation' && "bg-orange-500",
                    !['llm', 'analysis', 'retrieval', 'validation'].includes(span.type) && "bg-gray-500"
                  )}
                  style={position}
                  title={`${span.name} (${formatDuration(span.duration)})`}
                  onClick={() => toggleSpanExpansion(span.id)}
                />
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(sortedSpans[0]?.startTime)}</span>
            <span>+{formatDuration(totalDuration)}</span>
          </div>
        </div>

        {/* Span details list */}
        <div className="space-y-2">
          {sortedSpans.map((span) => {
            const isExpanded = expandedSpans.has(span.id)
            
            return (
              <div key={span.id} className="border border-gray-200 rounded-lg">
                <div 
                  className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSpanExpansion(span.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                        {getSpanIcon(span.type)}
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{span.name}</span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {span.type}
                          </span>
                          {getStatusIcon(span.status)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatTime(span.startTime)} • {formatDuration(span.duration)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {span.tokenUsage && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {formatNumber(span.tokenUsage)}
                        </div>
                      )}
                      {span.cost && (
                        <div className="flex items-center gap-1">
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
  )
}