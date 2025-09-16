'use client'

import { useState } from 'react'
import { 
  ArrowLeft, 
  Activity, 
  Clock, 
  Hash, 
  DollarSign,
  Copy, 
  Download, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Code,
  Database,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Eye
} from 'lucide-react'
import { SpanData, TraceData } from '@/types/agent-lens'
import { cn, formatNumber } from '@/lib/utils'

interface ConversationSpanDetailProps {
  span: SpanData
  trace?: TraceData
  parentSpan?: SpanData
  childSpans?: SpanData[]
  onBack: () => void
}

export function ConversationSpanDetail({ 
  span, 
  trace, 
  parentSpan, 
  childSpans = [], 
  onBack 
}: ConversationSpanDetailProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'input' | 'output' | 'metadata' | 'children'>('overview')
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set())

  const toggleChild = (childId: string) => {
    const newExpanded = new Set(expandedChildren)
    if (newExpanded.has(childId)) {
      newExpanded.delete(childId)
    } else {
      newExpanded.add(childId)
    }
    setExpandedChildren(newExpanded)
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      millisecond: 'numeric',
      hour12: true
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getSpanTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'llm':
      case 'model':
        return <Zap className="w-4 h-4" />
      case 'database':
      case 'db':
        return <Database className="w-4 h-4" />
      case 'function':
      case 'tool':
        return <Code className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const formatDuration = (duration: number) => {
    if (duration < 1000) {
      return `${duration}ms`
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(2)}s`
    } else {
      const minutes = Math.floor(duration / 60000)
      const seconds = ((duration % 60000) / 1000).toFixed(2)
      return `${minutes}m ${seconds}s`
    }
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'input', label: 'Input', icon: ArrowLeft },
    { id: 'output', label: 'Output', icon: CheckCircle },
    { id: 'metadata', label: 'Metadata', icon: Hash },
    ...(childSpans.length > 0 ? [{ id: 'children' as const, label: `Children (${childSpans.length})`, icon: Activity }] : [])
  ]

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
              Back
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              {getSpanTypeIcon(span.type)}
              <div>
                <h1 className="text-xl font-bold text-primary">{span.name}</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span className="inline-block px-2 py-0.5 bg-secondary/20 text-secondary-dark rounded text-xs font-medium">
                    {span.type}
                  </span>
                  <span>ID: {span.id}</span>
                  {parentSpan && (
                    <span>Parent: {parentSpan.name}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => copyToClipboard(span.id)}
              className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors"
              title="Copy Span ID"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            {trace && (
              <button className="flex items-center gap-2 px-3 py-1.5 text-gray-600 hover:text-primary transition-colors">
                <ExternalLink className="w-4 h-4" />
                View Trace
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Span Summary */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-secondary mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Duration</span>
              </div>
              <p className="text-2xl font-bold text-primary">{formatDuration(span.duration)}</p>
              <p className="text-xs text-gray-500 mt-1">
                {span.duration}ms
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-secondary mb-2">
                <Hash className="w-4 h-4" />
                <span className="text-sm font-medium">Tokens</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {span.token_usage ? formatNumber(span.token_usage) : 'N/A'}
              </p>
              {span.token_usage && (
                <p className="text-xs text-gray-500 mt-1">
                  {span.token_usage} tokens
                </p>
              )}
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-secondary mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm font-medium">Cost</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {span.cost ? `$${span.cost.toFixed(4)}` : 'N/A'}
              </p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-secondary mb-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">Status</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                <CheckCircle className="w-6 h-6 mx-auto" />
              </p>
              <p className="text-xs text-gray-500 mt-1">Completed</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Timeline</h4>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div>
                <span className="font-medium">Started:</span> {formatTimestamp(span.start_time)}
              </div>
              <div className="text-center">
                <div className="w-2 h-2 bg-primary rounded-full mx-auto mb-1"></div>
                <span className="text-xs">Executed</span>
              </div>
              <div>
                <span className="font-medium">Ended:</span> {formatTimestamp(span.end_time)}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Span Overview</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Basic Information</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Span ID:</dt>
                          <dd className="font-mono text-gray-900">{span.id}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Type:</dt>
                          <dd className="text-gray-900">{span.type}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Name:</dt>
                          <dd className="text-gray-900">{span.name}</dd>
                        </div>
                        {trace && (
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Trace ID:</dt>
                            <dd className="font-mono text-gray-900">{trace.id}</dd>
                          </div>
                        )}
                      </dl>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">Performance Metrics</h4>
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <dt className="text-gray-600">Duration:</dt>
                          <dd className="text-gray-900">{formatDuration(span.duration)}</dd>
                        </div>
                        {span.token_usage && (
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Token Usage:</dt>
                            <dd className="text-gray-900">{formatNumber(span.token_usage)}</dd>
                          </div>
                        )}
                        {span.cost && (
                          <div className="flex justify-between">
                            <dt className="text-gray-600">Cost:</dt>
                            <dd className="text-gray-900">${span.cost.toFixed(4)}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>
                </div>

                {parentSpan && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Parent Span</h4>
                    <div className="bg-accent/10 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        {getSpanTypeIcon(parentSpan.type)}
                        <div>
                          <p className="font-medium text-gray-900">{parentSpan.name}</p>
                          <p className="text-sm text-gray-600">{parentSpan.type} • {formatDuration(parentSpan.duration)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'input' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Input Data</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                    {span.input ? JSON.stringify(span.input, null, 2) : 'No input data available'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'output' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Output Data</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-blue-400 text-sm font-mono whitespace-pre-wrap">
                    {span.output ? JSON.stringify(span.output, null, 2) : 'No output data available'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'metadata' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                  <pre className="text-yellow-400 text-sm font-mono whitespace-pre-wrap">
                    {span.metadata ? JSON.stringify(span.metadata, null, 2) : 'No metadata available'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'children' && childSpans.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Child Spans ({childSpans.length})</h3>
                <div className="space-y-3">
                  {childSpans.map((child) => (
                    <div key={child.id} className="border border-gray-200 rounded-lg">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => toggleChild(child.id)}
                            className="flex items-center gap-3 text-left hover:text-primary transition-colors"
                          >
                            {expandedChildren.has(child.id) ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                            {getSpanTypeIcon(child.type)}
                            <div>
                              <h4 className="font-medium text-gray-900">{child.name}</h4>
                              <p className="text-sm text-gray-600">{child.type}</p>
                            </div>
                          </button>

                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(child.duration)}
                            </div>
                            {child.token_usage && (
                              <div className="flex items-center gap-1">
                                <Hash className="w-3 h-3" />
                                {formatNumber(child.token_usage)}
                              </div>
                            )}
                            <button 
                              className="p-1 hover:text-primary transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {expandedChildren.has(child.id) && (
                          <div className="mt-4 pl-7 space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Input</h5>
                                <div className="bg-gray-50 rounded p-2 text-sm font-mono max-h-32 overflow-auto">
                                  {child.input ? JSON.stringify(child.input, null, 2) : 'N/A'}
                                </div>
                              </div>
                              <div>
                                <h5 className="text-sm font-medium text-gray-700 mb-2">Output</h5>
                                <div className="bg-gray-50 rounded p-2 text-sm font-mono max-h-32 overflow-auto">
                                  {child.output ? JSON.stringify(child.output, null, 2) : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}