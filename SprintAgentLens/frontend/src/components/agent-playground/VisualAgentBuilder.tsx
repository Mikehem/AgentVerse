'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Bot, 
  MessageSquare, 
  Database, 
  Calculator, 
  Globe, 
  Mail, 
  Calendar, 
  FileText,
  Code,
  Settings,
  Plus,
  Trash2,
  ArrowRight,
  ArrowDown,
  Zap,
  Network,
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Save,
  Edit
} from 'lucide-react'

interface Node {
  id: string
  type: 'agent' | 'tool' | 'chain' | 'condition' | 'output'
  label: string
  position: { x: number; y: number }
  data: any
  connections: string[]
}

interface Connection {
  id: string
  source: string
  target: string
  type: 'data' | 'control' | 'message'
}

interface VisualAgentBuilderProps {
  agent: any
  onAgentUpdate: (updates: any) => void
}

const nodeTypes = [
  { 
    type: 'agent', 
    label: 'Agent', 
    icon: Bot, 
    color: 'bg-blue-100 border-blue-300 text-blue-700',
    description: 'AI Agent Node'
  },
  { 
    type: 'tool', 
    label: 'Tool', 
    icon: Settings, 
    color: 'bg-green-100 border-green-300 text-green-700',
    description: 'Tool or Function'
  },
  { 
    type: 'chain', 
    label: 'Chain', 
    icon: GitBranch, 
    color: 'bg-purple-100 border-purple-300 text-purple-700',
    description: 'Processing Chain'
  },
  { 
    type: 'condition', 
    label: 'Condition', 
    icon: ArrowRight, 
    color: 'bg-orange-100 border-orange-300 text-orange-700',
    description: 'Conditional Logic'
  },
  { 
    type: 'output', 
    label: 'Output', 
    icon: MessageSquare, 
    color: 'bg-gray-100 border-gray-300 text-gray-700',
    description: 'Output Node'
  }
]

const toolOptions = [
  { value: 'web-search', label: 'Web Search', icon: Globe },
  { value: 'calculator', label: 'Calculator', icon: Calculator },
  { value: 'code-exec', label: 'Code Execution', icon: Code },
  { value: 'database', label: 'Database', icon: Database },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'file-ops', label: 'File Operations', icon: FileText },
]

export function VisualAgentBuilder({ agent, onAgentUpdate }: VisualAgentBuilderProps) {
  const [nodes, setNodes] = useState<Node[]>([
    {
      id: 'start',
      type: 'agent',
      label: 'Main Agent',
      position: { x: 100, y: 100 },
      data: { framework: agent?.framework || 'langchain' },
      connections: []
    }
  ])
  const [connections, setConnections] = useState<Connection[]>([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isConnecting, setIsConnecting] = useState<string | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  const addNode = useCallback((type: string, position?: { x: number; y: number }) => {
    const nodeType = nodeTypes.find(nt => nt.type === type)
    if (!nodeType) return

    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: type as any,
      label: `New ${nodeType.label}`,
      position: position || { x: 200, y: 200 },
      data: {},
      connections: []
    }

    setNodes(prev => [...prev, newNode])
  }, [])

  const updateNode = useCallback((nodeId: string, updates: Partial<Node>) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, ...updates } : node
    ))
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(node => node.id !== nodeId))
    setConnections(prev => prev.filter(conn => 
      conn.source !== nodeId && conn.target !== nodeId
    ))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
    }
  }, [selectedNode])

  const connectNodes = useCallback((sourceId: string, targetId: string) => {
    const newConnection: Connection = {
      id: `conn-${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: 'data'
    }
    setConnections(prev => [...prev, newConnection])
    setIsConnecting(null)
  }, [])

  const handleNodeMouseDown = useCallback((node: Node, event: React.MouseEvent) => {
    if (isConnecting) {
      connectNodes(isConnecting, node.id)
      return
    }

    setSelectedNode(node)
    setIsDragging(true)
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setDragOffset({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
  }, [isConnecting, connectNodes])

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !selectedNode || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const newPosition = {
      x: event.clientX - canvasRect.left - dragOffset.x,
      y: event.clientY - canvasRect.top - dragOffset.y
    }

    updateNode(selectedNode.id, { position: newPosition })
  }, [isDragging, selectedNode, dragOffset, updateNode])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const getNodeIcon = (type: string) => {
    const nodeType = nodeTypes.find(nt => nt.type === type)
    return nodeType?.icon || Settings
  }

  const getNodeColor = (type: string) => {
    const nodeType = nodeTypes.find(nt => nt.type === type)
    return nodeType?.color || 'bg-gray-100 border-gray-300 text-gray-700'
  }

  const renderConnection = (connection: Connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    if (!sourceNode || !targetNode) return null

    const x1 = sourceNode.position.x + 60
    const y1 = sourceNode.position.y + 20
    const x2 = targetNode.position.x
    const y2 = targetNode.position.y + 20

    return (
      <line
        key={connection.id}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#6b7280"
        strokeWidth="2"
        markerEnd="url(#arrowhead)"
      />
    )
  }

  return (
    <div className="h-full flex">
      {/* Tool Palette */}
      <div className="w-64 border-r border-gray-200 p-4 bg-gray-50">
        <h3 className="font-medium text-sm text-gray-900 mb-4">Node Types</h3>
        <div className="space-y-2">
          {nodeTypes.map((nodeType) => {
            const Icon = nodeType.icon
            return (
              <div
                key={nodeType.type}
                className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${nodeType.color}`}
                onClick={() => addNode(nodeType.type)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{nodeType.label}</span>
                </div>
                <p className="text-xs opacity-80">{nodeType.description}</p>
              </div>
            )
          })}
        </div>

        <div className="mt-6">
          <h3 className="font-medium text-sm text-gray-900 mb-4">Actions</h3>
          <div className="space-y-2">
            <Button size="sm" variant="outline" className="w-full justify-start">
              <Save className="w-4 h-4 mr-2" />
              Save Canvas
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start">
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start">
              <Play className="w-4 h-4 mr-2" />
              Run Flow
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <div 
          ref={canvasRef}
          className="w-full h-full relative bg-white overflow-hidden"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {/* SVG for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6b7280"
                />
              </marker>
            </defs>
            {connections.map(renderConnection)}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = getNodeIcon(node.type)
            const colorClass = getNodeColor(node.type)
            
            return (
              <div
                key={node.id}
                className={`absolute w-32 h-16 rounded-lg border-2 cursor-move transition-all hover:shadow-md ${colorClass} ${
                  selectedNode?.id === node.id ? 'ring-2 ring-sage-500' : ''
                }`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  zIndex: selectedNode?.id === node.id ? 10 : 1
                }}
                onMouseDown={(e) => handleNodeMouseDown(node, e)}
              >
                <div className="p-2 h-full flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium truncate">{node.label}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      className="w-4 h-4 bg-green-500 rounded-full hover:bg-green-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsConnecting(isConnecting === node.id ? null : node.id)
                      }}
                      title="Connect to another node"
                    />
                    <button
                      className="w-4 h-4 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteNode(node.id)
                      }}
                      title="Delete node"
                    />
                  </div>
                </div>
              </div>
            )
          })}

          {/* Connection Mode Indicator */}
          {isConnecting && (
            <div className="absolute top-4 left-4 bg-blue-100 border border-blue-300 text-blue-700 px-3 py-1 rounded-md text-sm">
              Click another node to connect
            </div>
          )}
        </div>
      </div>

      {/* Properties Panel */}
      <div className="w-80 border-l border-gray-200 p-4 bg-gray-50">
        {selectedNode ? (
          <div>
            <h3 className="font-medium text-sm text-gray-900 mb-4">Node Properties</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="node-label">Label</Label>
                <Input
                  id="node-label"
                  value={selectedNode.label}
                  onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                  placeholder="Node label"
                />
              </div>

              {selectedNode.type === 'agent' && (
                <div>
                  <Label htmlFor="agent-framework">Framework</Label>
                  <Select 
                    value={selectedNode.data.framework || 'langchain'}
                    onValueChange={(value) => updateNode(selectedNode.id, { 
                      data: { ...selectedNode.data, framework: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="langchain">LangChain</SelectItem>
                      <SelectItem value="langgraph">LangGraph</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedNode.type === 'tool' && (
                <div>
                  <Label htmlFor="tool-type">Tool Type</Label>
                  <Select 
                    value={selectedNode.data.toolType || ''}
                    onValueChange={(value) => updateNode(selectedNode.id, { 
                      data: { ...selectedNode.data, toolType: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tool type" />
                    </SelectTrigger>
                    <SelectContent>
                      {toolOptions.map(tool => (
                        <SelectItem key={tool.value} value={tool.value}>
                          {tool.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedNode.type === 'chain' && (
                <div>
                  <Label htmlFor="chain-type">Chain Type</Label>
                  <Select 
                    value={selectedNode.data.chainType || ''}
                    onValueChange={(value) => updateNode(selectedNode.id, { 
                      data: { ...selectedNode.data, chainType: value }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chain type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sequential">Sequential</SelectItem>
                      <SelectItem value="router">Router</SelectItem>
                      <SelectItem value="conversation">Conversation</SelectItem>
                      <SelectItem value="retrieval">Retrieval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="node-description">Description</Label>
                <Input
                  id="node-description"
                  value={selectedNode.data.description || ''}
                  onChange={(e) => updateNode(selectedNode.id, { 
                    data: { ...selectedNode.data, description: e.target.value }
                  })}
                  placeholder="Node description"
                />
              </div>
            </div>

            <div className="mt-6">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Connections</h4>
              <div className="space-y-2">
                {connections
                  .filter(conn => conn.source === selectedNode.id || conn.target === selectedNode.id)
                  .map(conn => (
                    <div key={conn.id} className="text-sm text-gray-600 bg-white p-2 rounded border">
                      {conn.source === selectedNode.id ? (
                        <span>→ {nodes.find(n => n.id === conn.target)?.label}</span>
                      ) : (
                        <span>← {nodes.find(n => n.id === conn.source)?.label}</span>
                      )}
                    </div>
                  ))}
                {connections.filter(conn => 
                  conn.source === selectedNode.id || conn.target === selectedNode.id
                ).length === 0 && (
                  <p className="text-sm text-gray-500">No connections</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-1">No Node Selected</h3>
            <p className="text-sm text-gray-600">
              Click on a node to view and edit its properties
            </p>
          </div>
        )}
      </div>
    </div>
  )
}