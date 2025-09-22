'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Network, 
  Activity, 
  AlertTriangle, 
  Clock, 
  Zap,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react'

interface ServiceNode {
  id: string
  label: string
  spanCount: number
  avgDuration: number
  errorRate: number
}

interface ServiceEdge {
  source: string
  target: string
  weight: number
  communicationType: string
}

interface ServiceDependencyGraphProps {
  nodes: ServiceNode[]
  edges: ServiceEdge[]
  onNodeClick?: (nodeId: string) => void
  onEdgeClick?: (edge: ServiceEdge) => void
}

interface Position {
  x: number
  y: number
}

interface GraphNode extends ServiceNode {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface GraphEdge extends ServiceEdge {
  sourceNode: GraphNode
  targetNode: GraphNode
}

const ServiceDependencyGraph: React.FC<ServiceDependencyGraphProps> = ({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([])
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<ServiceEdge | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>()

  const width = 800
  const height = 600
  const centerX = width / 2
  const centerY = height / 2

  // Initialize graph layout
  useEffect(() => {
    if (nodes.length === 0) return

    // Create graph nodes with initial positions
    const initialNodes: GraphNode[] = nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      const radius = Math.min(width, height) * 0.3
      
      return {
        ...node,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: Math.max(20, Math.min(50, Math.sqrt(node.spanCount) * 5))
      }
    })

    setGraphNodes(initialNodes)

    // Create graph edges
    const nodeMap = new Map(initialNodes.map(n => [n.id, n]))
    const initialEdges: GraphEdge[] = edges.map(edge => ({
      ...edge,
      sourceNode: nodeMap.get(edge.source)!,
      targetNode: nodeMap.get(edge.target)!
    })).filter(edge => edge.sourceNode && edge.targetNode)

    setGraphEdges(initialEdges)

    // Start force simulation
    startForceSimulation(initialNodes, initialEdges)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [nodes, edges])

  const startForceSimulation = (simNodes: GraphNode[], simEdges: GraphEdge[]) => {
    const simulation = () => {
      // Apply forces
      simNodes.forEach(node => {
        // Center force
        const centerForce = 0.01
        node.vx += (centerX - node.x) * centerForce
        node.vy += (centerY - node.y) * centerForce

        // Collision force
        simNodes.forEach(other => {
          if (node === other) return
          const dx = other.x - node.x
          const dy = other.y - node.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          const minDistance = node.radius + other.radius + 10
          
          if (distance < minDistance && distance > 0) {
            const force = (minDistance - distance) / distance * 0.1
            node.vx -= dx * force
            node.vy -= dy * force
          }
        })

        // Link force
        simEdges.forEach(edge => {
          if (edge.sourceNode === node) {
            const dx = edge.targetNode.x - node.x
            const dy = edge.targetNode.y - node.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const idealDistance = 100
            const force = (distance - idealDistance) / distance * 0.05
            
            node.vx += dx * force
            node.vy += dy * force
          }
          if (edge.targetNode === node) {
            const dx = edge.sourceNode.x - node.x
            const dy = edge.sourceNode.y - node.y
            const distance = Math.sqrt(dx * dx + dy * dy)
            const idealDistance = 100
            const force = (distance - idealDistance) / distance * 0.05
            
            node.vx += dx * force
            node.vy += dy * force
          }
        })

        // Apply friction
        node.vx *= 0.9
        node.vy *= 0.9

        // Update position
        node.x += node.vx
        node.y += node.vy

        // Keep within bounds
        const margin = node.radius
        node.x = Math.max(margin, Math.min(width - margin, node.x))
        node.y = Math.max(margin, Math.min(height - margin, node.y))
      })

      setGraphNodes([...simNodes])

      // Continue simulation
      animationFrameRef.current = requestAnimationFrame(simulation)
    }

    animationFrameRef.current = requestAnimationFrame(simulation)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleZoomIn = () => setZoom(Math.min(3, zoom * 1.2))
  const handleZoomOut = () => setZoom(Math.max(0.3, zoom / 1.2))
  const handleReset = () => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
    setSelectedNode(null)
    setSelectedEdge(null)
  }

  const getNodeColor = (node: GraphNode) => {
    if (node.errorRate > 10) return '#ef4444' // red
    if (node.errorRate > 5) return '#f97316' // orange
    if (node.avgDuration > 1000) return '#eab308' // yellow
    return '#10b981' // green
  }

  const getEdgeColor = (edge: GraphEdge) => {
    switch (edge.communicationType) {
      case 'http': return '#3b82f6'
      case 'grpc': return '#8b5cf6'
      case 'message_queue': return '#f59e0b'
      case 'websocket': return '#06b6d4'
      default: return '#6b7280'
    }
  }

  const getEdgeWidth = (weight: number) => {
    return Math.max(1, Math.min(8, weight / 2))
  }

  const handleNodeClick = (node: GraphNode, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedNode(selectedNode === node.id ? null : node.id)
    setSelectedEdge(null)
    onNodeClick?.(node.id)
  }

  const handleEdgeClick = (edge: GraphEdge, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEdge(selectedEdge === edge ? null : edge)
    setSelectedNode(null)
    onEdgeClick?.(edge)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            Service Dependency Graph
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{nodes.length} services</span>
          <span>{edges.length} connections</span>
        </div>
      </CardHeader>

      <CardContent>
        <div className="relative border rounded-lg overflow-hidden bg-gray-50">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {graphEdges.map((edge, index) => (
                <g key={index}>
                  <line
                    x1={edge.sourceNode.x}
                    y1={edge.sourceNode.y}
                    x2={edge.targetNode.x}
                    y2={edge.targetNode.y}
                    stroke={getEdgeColor(edge)}
                    strokeWidth={getEdgeWidth(edge.weight)}
                    opacity={selectedEdge === edge ? 1 : 0.6}
                    className="cursor-pointer hover:opacity-100"
                    onClick={(e) => handleEdgeClick(edge, e)}
                  />
                  
                  {/* Edge label */}
                  <text
                    x={(edge.sourceNode.x + edge.targetNode.x) / 2}
                    y={(edge.sourceNode.y + edge.targetNode.y) / 2}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 pointer-events-none"
                    dy="4"
                  >
                    {edge.weight}
                  </text>
                </g>
              ))}

              {/* Nodes */}
              {graphNodes.map((node) => (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.radius}
                    fill={getNodeColor(node)}
                    stroke={selectedNode === node.id ? '#1f2937' : '#ffffff'}
                    strokeWidth={selectedNode === node.id ? 3 : 2}
                    className="cursor-pointer hover:opacity-90"
                    onClick={(e) => handleNodeClick(node, e)}
                  />
                  
                  {/* Node label */}
                  <text
                    x={node.x}
                    y={node.y}
                    textAnchor="middle"
                    className="text-xs font-medium fill-white pointer-events-none"
                    dy="4"
                  >
                    {node.label.replace('agent_', '')}
                  </text>
                </g>
              ))}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border">
            <div className="text-sm font-medium mb-2">Legend</div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>Healthy (&lt;5% errors)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Slow (&gt;1s avg)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span>Warning (5-10% errors)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Critical (&gt;10% errors)</span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t">
              <div className="text-xs text-gray-600">
                Communication Types:
              </div>
              <div className="space-y-1 text-xs mt-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-blue-500" />
                  <span>HTTP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-purple-500" />
                  <span>gRPC</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-yellow-500" />
                  <span>Message Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-cyan-500" />
                  <span>WebSocket</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Node details panel */}
        {selectedNode && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            {(() => {
              const node = graphNodes.find(n => n.id === selectedNode)
              if (!node) return null
              
              return (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    {node.label}
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Spans:</span>
                      <div className="font-medium">{node.spanCount}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Avg Duration:</span>
                      <div className="font-medium">
                        {node.avgDuration < 1000 
                          ? `${node.avgDuration.toFixed(0)}ms`
                          : `${(node.avgDuration / 1000).toFixed(2)}s`
                        }
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">Error Rate:</span>
                      <div className={`font-medium ${
                        node.errorRate > 10 ? 'text-red-600' :
                        node.errorRate > 5 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {node.errorRate.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Edge details panel */}
        {selectedEdge && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Network className="w-4 h-4" />
              Connection Details
            </h4>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">From:</span>
                <div className="font-medium">{selectedEdge.source}</div>
              </div>
              <div>
                <span className="text-gray-600">To:</span>
                <div className="font-medium">{selectedEdge.target}</div>
              </div>
              <div>
                <span className="text-gray-600">Type:</span>
                <Badge variant="outline" className="ml-1">
                  {selectedEdge.communicationType}
                </Badge>
              </div>
            </div>
            
            <div className="mt-2">
              <span className="text-gray-600 text-sm">Communication Count:</span>
              <div className="font-medium">{selectedEdge.weight}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ServiceDependencyGraph