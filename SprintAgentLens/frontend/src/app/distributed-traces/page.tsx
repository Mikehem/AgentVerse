'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Activity, 
  Network, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  Zap,
  TrendingUp,
  Eye
} from 'lucide-react'
import TraceTreeVisualization from '@/components/distributed-traces/TraceTreeVisualization'
import ServiceDependencyGraph from '@/components/distributed-traces/ServiceDependencyGraph'

interface DistributedTrace {
  id: string
  service_name: string
  start_time: string
  end_time?: string
  duration?: number
  status: 'running' | 'success' | 'error' | 'timeout'
  agent_count: number
  service_count: number
  container_count: number
  total_cost?: number
  total_tokens?: number
  error_count: number
}

interface TraceCorrelationData {
  traceId: string
  traceTree: any[]
  patterns?: any
  bottlenecks?: any
  serviceDependencies?: any
  metrics?: any
}

const DistributedTracesPage = () => {
  const [traces, setTraces] = useState<DistributedTrace[]>([])
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null)
  const [correlationData, setCorrelationData] = useState<TraceCorrelationData | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load distributed traces
  const loadTraces = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/distributed-traces?includeMetrics=true&limit=50')
      const data = await response.json()
      
      if (data.success) {
        setTraces(data.data)
      } else {
        setError(data.error || 'Failed to load traces')
      }
    } catch (err) {
      setError('Failed to fetch traces')
      console.error('Error loading traces:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load trace correlation data
  const loadTraceCorrelation = async (traceId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/v1/distributed-traces/correlations?traceId=${traceId}&analysisType=all`)
      const data = await response.json()
      
      if (data.success) {
        setCorrelationData(data)
      } else {
        setError(data.error || 'Failed to load trace correlation')
      }
    } catch (err) {
      setError('Failed to fetch trace correlation')
      console.error('Error loading trace correlation:', err)
    } finally {
      setLoading(false)
    }
  }

  // Load traces on component mount
  useEffect(() => {
    loadTraces()
  }, [])

  // Load correlation data when trace is selected
  useEffect(() => {
    if (selectedTrace) {
      loadTraceCorrelation(selectedTrace)
    }
  }, [selectedTrace])

  const filteredTraces = traces.filter(trace =>
    trace.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trace.service_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatDuration = (ms?: number) => {
    if (!ms) return '0ms'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const formatCost = (cost?: number) => {
    if (!cost) return '$0.00'
    return `$${cost.toFixed(4)}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'timeout': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleSpanClick = (spanId: string) => {
    console.log('Span clicked:', spanId)
    // TODO: Show span details modal
  }

  const handleA2AClick = (communicationId: string) => {
    console.log('A2A communication clicked:', communicationId)
    // TODO: Show A2A communication details modal
  }

  const handleNodeClick = (nodeId: string) => {
    console.log('Service node clicked:', nodeId)
    // TODO: Filter traces by service
  }

  const handleEdgeClick = (edge: any) => {
    console.log('Service edge clicked:', edge)
    // TODO: Show communication details
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Distributed Traces</h1>
          <p className="text-gray-600 mt-1">
            Monitor and analyze multi-agent communication patterns
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button onClick={loadTraces} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search traces by ID or service name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traces list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Traces ({filteredTraces.length})
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              {filteredTraces.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {loading ? 'Loading traces...' : 'No traces found'}
                </div>
              ) : (
                filteredTraces.map((trace) => (
                  <div
                    key={trace.id}
                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                      selectedTrace === trace.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => setSelectedTrace(trace.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-900 truncate">
                        {trace.id}
                      </span>
                      <Badge className={getStatusColor(trace.status)}>
                        {trace.status}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Service: {trace.service_name}</div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(trace.duration)}
                        </span>
                        
                        {trace.total_cost && trace.total_cost > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            {formatCost(trace.total_cost)}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <span>{trace.agent_count} agents</span>
                        <span>{trace.service_count} services</span>
                        {trace.container_count > 0 && (
                          <span>{trace.container_count} containers</span>
                        )}
                      </div>
                      
                      {trace.error_count > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          {trace.error_count} errors
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trace visualization */}
        <div className="lg:col-span-2">
          {selectedTrace && correlationData ? (
            <Tabs defaultValue="tree" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="tree">Trace Tree</TabsTrigger>
                <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
                <TabsTrigger value="patterns">Patterns</TabsTrigger>
                <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
              </TabsList>

              <TabsContent value="tree" className="space-y-4">
                <TraceTreeVisualization
                  traceTree={correlationData.traceTree}
                  traceId={correlationData.traceId}
                  onSpanClick={handleSpanClick}
                  onA2AClick={handleA2AClick}
                />
              </TabsContent>

              <TabsContent value="dependencies" className="space-y-4">
                {correlationData.serviceDependencies && (
                  <ServiceDependencyGraph
                    nodes={correlationData.serviceDependencies.nodes}
                    edges={correlationData.serviceDependencies.edges}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                  />
                )}
              </TabsContent>

              <TabsContent value="patterns" className="space-y-4">
                {correlationData.patterns && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Network className="w-5 h-5" />
                          Agent Interactions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Array.from(correlationData.patterns.agentInteractions.entries()).map(([source, targets]) => (
                            <div key={source} className="text-sm">
                              <span className="font-medium">{source}</span>
                              <div className="ml-4 text-gray-600">
                                → {Array.from(targets).join(', ')}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5" />
                          Communication Types
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {Array.from(correlationData.patterns.communicationTypes.entries()).map(([type, count]) => (
                            <div key={type} className="flex justify-between text-sm">
                              <span className="capitalize">{type}</span>
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="bottlenecks" className="space-y-4">
                {correlationData.bottlenecks && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Slowest Spans
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {correlationData.bottlenecks.slowestSpans.slice(0, 5).map((item: any, index: number) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{item.span.operationName}</div>
                              <div className="text-gray-600 flex justify-between">
                                <span>{formatDuration(item.duration)}</span>
                                <span className="text-xs">{item.path.join(' → ')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Highest Cost Spans
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {correlationData.bottlenecks.highCostSpans.slice(0, 5).map((item: any, index: number) => (
                            <div key={index} className="text-sm">
                              <div className="font-medium">{item.span.operationName}</div>
                              <div className="text-gray-600 flex justify-between">
                                <span>{formatCost(item.cost)}</span>
                                <span className="text-xs">{item.path.join(' → ')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : selectedTrace ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-gray-600">Loading trace analysis...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Select a trace to view details</h3>
                <p>Choose a trace from the list to see its tree structure, dependencies, and analysis.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default DistributedTracesPage