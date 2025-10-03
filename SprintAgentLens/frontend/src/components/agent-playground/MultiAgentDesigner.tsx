'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Users, 
  Network, 
  MessageSquare, 
  ArrowRight, 
  ArrowLeftRight,
  Radio,
  Share2,
  GitBranch,
  Settings,
  Plus,
  Trash2,
  Edit,
  Play,
  Stop,
  Pause,
  RotateCcw,
  Save,
  Download,
  Upload,
  Bot,
  Crown,
  Target,
  Zap,
  Globe,
  Database,
  Mail,
  Calendar,
  FileText,
  Code,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity
} from 'lucide-react'

interface MultiAgent {
  id: string
  name: string
  role: string
  type: 'manager' | 'worker' | 'coordinator' | 'specialist'
  position: { x: number; y: number }
  config: {
    systemPrompt: string
    temperature: number
    maxTokens: number
    model: string
    llmProvider: string
  }
  tools: string[]
  capabilities: string[]
  status: 'idle' | 'active' | 'busy' | 'error'
  memory: AgentMemory
}

interface AgentMemory {
  type: 'individual' | 'shared' | 'hierarchical'
  scope: string[]
  persistence: boolean
}

interface AgentCommunication {
  id: string
  sourceAgentId: string
  targetAgentId: string
  type: 'message' | 'event' | 'state' | 'broadcast' | 'request'
  protocol: 'direct' | 'queue' | 'pub_sub' | 'rpc'
  format: 'json' | 'text' | 'binary'
  priority: 'low' | 'medium' | 'high' | 'critical'
  async: boolean
}

interface WorkflowPattern {
  id: string
  name: string
  type: 'hierarchical' | 'peer_to_peer' | 'pipeline' | 'broadcast' | 'competitive'
  description: string
  agents: string[]
  communications: string[]
  executionOrder: string[]
}

interface SystemState {
  globalVariables: Record<string, any>
  sharedMemory: Record<string, any>
  messageQueue: CommunicationMessage[]
  activeWorkflows: string[]
}

interface CommunicationMessage {
  id: string
  from: string
  to: string
  type: string
  content: any
  timestamp: Date
  status: 'pending' | 'delivered' | 'failed'
}

const agentRoles = [
  { value: 'manager', label: 'Manager', icon: Crown, description: 'Coordinates and manages other agents' },
  { value: 'worker', label: 'Worker', icon: Bot, description: 'Executes specific tasks and operations' },
  { value: 'coordinator', label: 'Coordinator', icon: Network, description: 'Facilitates communication between agents' },
  { value: 'specialist', label: 'Specialist', icon: Target, description: 'Handles specialized domain tasks' }
]

const communicationTypes = [
  { value: 'message', label: 'Message', description: 'Direct message passing' },
  { value: 'event', label: 'Event', description: 'Event-driven communication' },
  { value: 'state', label: 'State', description: 'Shared state updates' },
  { value: 'broadcast', label: 'Broadcast', description: 'One-to-many communication' },
  { value: 'request', label: 'Request', description: 'Request-response pattern' }
]

const workflowPatterns = [
  {
    id: 'hierarchical',
    name: 'Hierarchical',
    type: 'hierarchical' as const,
    description: 'Manager-worker pattern with clear hierarchy',
    icon: Crown
  },
  {
    id: 'peer_to_peer',
    name: 'Peer-to-Peer',
    type: 'peer_to_peer' as const,
    description: 'Equal agents collaborating together',
    icon: Users
  },
  {
    id: 'pipeline',
    name: 'Pipeline',
    type: 'pipeline' as const,
    description: 'Sequential processing pipeline',
    icon: ArrowRight
  },
  {
    id: 'broadcast',
    name: 'Broadcast',
    type: 'broadcast' as const,
    description: 'One agent broadcasting to many',
    icon: Radio
  },
  {
    id: 'competitive',
    name: 'Competitive',
    type: 'competitive' as const,
    description: 'Multiple agents competing for best solution',
    icon: Zap
  }
]

interface MultiAgentDesignerProps {
  onSystemUpdate: (system: any) => void
}

export function MultiAgentDesigner({ onSystemUpdate }: MultiAgentDesignerProps) {
  const [agents, setAgents] = useState<MultiAgent[]>([])
  const [communications, setCommunications] = useState<AgentCommunication[]>([])
  const [workflows, setWorkflows] = useState<WorkflowPattern[]>([])
  const [selectedAgent, setSelectedAgent] = useState<MultiAgent | null>(null)
  const [selectedCommunication, setSelectedCommunication] = useState<AgentCommunication | null>(null)
  const [systemState, setSystemState] = useState<SystemState>({
    globalVariables: {},
    sharedMemory: {},
    messageQueue: [],
    activeWorkflows: []
  })
  const [isSimulating, setIsSimulating] = useState(false)
  const [activeTab, setActiveTab] = useState('design')
  const canvasRef = useRef<HTMLDivElement>(null)

  const createAgent = useCallback((type: MultiAgent['type'], position?: { x: number; y: number }) => {
    const roleInfo = agentRoles.find(r => r.value === type)
    const newAgent: MultiAgent = {
      id: `agent-${Date.now()}`,
      name: `${roleInfo?.label || 'Agent'} ${agents.length + 1}`,
      role: roleInfo?.label || 'Agent',
      type,
      position: position || { x: 200 + agents.length * 150, y: 200 },
      config: {
        systemPrompt: `You are a ${roleInfo?.label?.toLowerCase()} agent responsible for ${roleInfo?.description?.toLowerCase()}.`,
        temperature: 0.7,
        maxTokens: 1000,
        model: 'gpt-4',
        llmProvider: 'openai'
      },
      tools: [],
      capabilities: [],
      status: 'idle',
      memory: {
        type: 'individual',
        scope: [],
        persistence: true
      }
    }

    setAgents(prev => [...prev, newAgent])
    setSelectedAgent(newAgent)
  }, [agents.length])

  const updateAgent = useCallback((agentId: string, updates: Partial<MultiAgent>) => {
    setAgents(prev => prev.map(agent => 
      agent.id === agentId ? { ...agent, ...updates } : agent
    ))
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(prev => prev ? { ...prev, ...updates } : null)
    }
  }, [selectedAgent])

  const deleteAgent = useCallback((agentId: string) => {
    setAgents(prev => prev.filter(agent => agent.id !== agentId))
    setCommunications(prev => prev.filter(comm => 
      comm.sourceAgentId !== agentId && comm.targetAgentId !== agentId
    ))
    if (selectedAgent?.id === agentId) {
      setSelectedAgent(null)
    }
  }, [selectedAgent])

  const createCommunication = useCallback((sourceId: string, targetId: string) => {
    const newCommunication: AgentCommunication = {
      id: `comm-${Date.now()}`,
      sourceAgentId: sourceId,
      targetAgentId: targetId,
      type: 'message',
      protocol: 'direct',
      format: 'json',
      priority: 'medium',
      async: true
    }

    setCommunications(prev => [...prev, newCommunication])
  }, [])

  const createWorkflow = useCallback((pattern: typeof workflowPatterns[0]) => {
    const newWorkflow: WorkflowPattern = {
      id: `workflow-${Date.now()}`,
      name: `${pattern.name} Workflow`,
      type: pattern.type,
      description: pattern.description,
      agents: [],
      communications: [],
      executionOrder: []
    }

    setWorkflows(prev => [...prev, newWorkflow])
  }, [])

  const simulateSystem = useCallback(async () => {
    setIsSimulating(true)
    
    // Simulate agent interactions
    const messages: CommunicationMessage[] = []
    
    for (const comm of communications) {
      const sourceAgent = agents.find(a => a.id === comm.sourceAgentId)
      const targetAgent = agents.find(a => a.id === comm.targetAgentId)
      
      if (sourceAgent && targetAgent) {
        const message: CommunicationMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          from: sourceAgent.name,
          to: targetAgent.name,
          type: comm.type,
          content: `Simulated ${comm.type} from ${sourceAgent.name} to ${targetAgent.name}`,
          timestamp: new Date(),
          status: 'pending'
        }
        
        messages.push(message)
        
        // Update agent statuses
        updateAgent(sourceAgent.id, { status: 'active' })
        updateAgent(targetAgent.id, { status: 'busy' })
        
        // Simulate processing delay
        setTimeout(() => {
          message.status = 'delivered'
          updateAgent(targetAgent.id, { status: 'active' })
        }, Math.random() * 2000 + 500)
      }
    }

    setSystemState(prev => ({
      ...prev,
      messageQueue: [...prev.messageQueue, ...messages].slice(-50) // Keep last 50 messages
    }))

    setTimeout(() => {
      setIsSimulating(false)
      agents.forEach(agent => {
        updateAgent(agent.id, { status: 'idle' })
      })
    }, 5000)
  }, [agents, communications, updateAgent])

  const getAgentIcon = (type: MultiAgent['type']) => {
    const roleInfo = agentRoles.find(r => r.value === type)
    return roleInfo?.icon || Bot
  }

  const getStatusColor = (status: MultiAgent['status']) => {
    switch (status) {
      case 'idle': return 'bg-gray-100 text-gray-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'busy': return 'bg-yellow-100 text-yellow-800'
      case 'error': return 'bg-red-100 text-red-800'
    }
  }

  const renderCommunicationLine = (comm: AgentCommunication) => {
    const sourceAgent = agents.find(a => a.id === comm.sourceAgentId)
    const targetAgent = agents.find(a => a.id === comm.targetAgentId)
    
    if (!sourceAgent || !targetAgent) return null

    const x1 = sourceAgent.position.x + 75
    const y1 = sourceAgent.position.y + 40
    const x2 = targetAgent.position.x + 75
    const y2 = targetAgent.position.y + 40

    const strokeColor = comm.type === 'message' ? '#3b82f6' :
                       comm.type === 'event' ? '#10b981' :
                       comm.type === 'state' ? '#8b5cf6' :
                       comm.type === 'broadcast' ? '#f59e0b' : '#ef4444'

    return (
      <g key={comm.id}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth="2"
          markerEnd="url(#arrowhead)"
          className="cursor-pointer hover:stroke-width-3"
          onClick={() => setSelectedCommunication(comm)}
        />
        <text
          x={(x1 + x2) / 2}
          y={(y1 + y2) / 2 - 10}
          textAnchor="middle"
          className="text-xs fill-gray-600 pointer-events-none"
        >
          {comm.type}
        </text>
      </g>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Multi-Agent System Designer</h2>
          <p className="text-gray-600">Design and coordinate multiple agents with A2A communication</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={simulateSystem}
            disabled={isSimulating || agents.length < 2}
            className="bg-sage-600 hover:bg-sage-700"
          >
            {isSimulating ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isSimulating ? 'Simulating...' : 'Run Simulation'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export System
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="design">System Design</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="design" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Agent Palette */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agent Types</CardTitle>
                  <CardDescription>
                    Drag agents onto the canvas
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {agentRoles.map((role) => {
                    const Icon = role.icon
                    return (
                      <div
                        key={role.value}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => createAgent(role.value as MultiAgent['type'])}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-5 h-5 text-sage-600" />
                          <span className="font-medium text-sm">{role.label}</span>
                        </div>
                        <p className="text-xs text-gray-600">{role.description}</p>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Workflow Patterns */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-lg">Workflow Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {workflowPatterns.map((pattern) => {
                    const Icon = pattern.icon
                    return (
                      <Button
                        key={pattern.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => createWorkflow(pattern)}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {pattern.name}
                      </Button>
                    )
                  })}
                </CardContent>
              </Card>
            </div>

            {/* Canvas */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>System Canvas</CardTitle>
                  <CardDescription>
                    {agents.length} agent{agents.length !== 1 ? 's' : ''}, {communications.length} connection{communications.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div 
                    ref={canvasRef}
                    className="relative w-full h-96 bg-gray-50 overflow-hidden"
                    style={{ 
                      backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', 
                      backgroundSize: '20px 20px' 
                    }}
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
                      {communications.map(renderCommunicationLine)}
                    </svg>

                    {/* Agents */}
                    {agents.map((agent) => {
                      const Icon = getAgentIcon(agent.type)
                      return (
                        <div
                          key={agent.id}
                          className={`absolute w-32 h-20 bg-white border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                            selectedAgent?.id === agent.id ? 'ring-2 ring-sage-500' : 'border-gray-300'
                          }`}
                          style={{
                            left: agent.position.x,
                            top: agent.position.y,
                            zIndex: selectedAgent?.id === agent.id ? 10 : 1
                          }}
                          onClick={() => setSelectedAgent(agent)}
                        >
                          <div className="p-2 h-full flex flex-col">
                            <div className="flex items-center justify-between mb-1">
                              <Icon className="w-4 h-4 text-sage-600" />
                              <Badge className={`text-xs ${getStatusColor(agent.status)}`}>
                                {agent.status}
                              </Badge>
                            </div>
                            <h4 className="font-medium text-xs truncate">{agent.name}</h4>
                            <p className="text-xs text-gray-500 truncate">{agent.role}</p>
                            <div className="flex gap-1 mt-1">
                              <button
                                className="w-3 h-3 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  // Start connection mode
                                }}
                                title="Create connection"
                              />
                              <button
                                className="w-3 h-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteAgent(agent.id)
                                }}
                                title="Delete agent"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {agents.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>Add agents to start designing your system</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Properties Panel */}
            <div className="lg:col-span-1">
              {selectedAgent ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Agent Properties</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="agent-name">Name</Label>
                      <Input
                        id="agent-name"
                        value={selectedAgent.name}
                        onChange={(e) => updateAgent(selectedAgent.id, { name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent-role">Role</Label>
                      <Input
                        id="agent-role"
                        value={selectedAgent.role}
                        onChange={(e) => updateAgent(selectedAgent.id, { role: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="agent-type">Type</Label>
                      <Select 
                        value={selectedAgent.type}
                        onValueChange={(value: MultiAgent['type']) => 
                          updateAgent(selectedAgent.id, { type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {agentRoles.map(role => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="system-prompt">System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        value={selectedAgent.config.systemPrompt}
                        onChange={(e) => updateAgent(selectedAgent.id, {
                          config: { ...selectedAgent.config, systemPrompt: e.target.value }
                        })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="memory-type">Memory Type</Label>
                      <Select 
                        value={selectedAgent.memory.type}
                        onValueChange={(value: AgentMemory['type']) => 
                          updateAgent(selectedAgent.id, {
                            memory: { ...selectedAgent.memory, type: value }
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="individual">Individual</SelectItem>
                          <SelectItem value="shared">Shared</SelectItem>
                          <SelectItem value="hierarchical">Hierarchical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="memory-persistence">Persistent Memory</Label>
                      <Switch
                        id="memory-persistence"
                        checked={selectedAgent.memory.persistence}
                        onCheckedChange={(checked) => updateAgent(selectedAgent.id, {
                          memory: { ...selectedAgent.memory, persistence: checked }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Bot className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <h3 className="font-medium text-gray-900 mb-1">No Agent Selected</h3>
                    <p className="text-sm text-gray-600">
                      Click on an agent to configure its properties
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="communication" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Communication Channels</CardTitle>
                <CardDescription>
                  Configure how agents communicate with each other
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {communications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No communication channels configured</p>
                      <p className="text-sm">Create connections between agents to enable communication</p>
                    </div>
                  ) : (
                    communications.map((comm) => {
                      const sourceAgent = agents.find(a => a.id === comm.sourceAgentId)
                      const targetAgent = agents.find(a => a.id === comm.targetAgentId)
                      
                      return (
                        <Card 
                          key={comm.id}
                          className={`cursor-pointer transition-colors ${
                            selectedCommunication?.id === comm.id 
                              ? 'ring-2 ring-sage-500 bg-sage-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedCommunication(comm)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <ArrowRight className="w-4 h-4 text-gray-400" />
                                <span className="font-medium text-sm">
                                  {sourceAgent?.name} → {targetAgent?.name}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {comm.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-600">
                              <span>Protocol: {comm.protocol}</span>
                              <span>Priority: {comm.priority}</span>
                              <span>{comm.async ? 'Async' : 'Sync'}</span>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Communication Settings</CardTitle>
                <CardDescription>
                  Configure the selected communication channel
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedCommunication ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="comm-type">Communication Type</Label>
                      <Select 
                        value={selectedCommunication.type}
                        onValueChange={(value) => {
                          const updated = { ...selectedCommunication, type: value as any }
                          setCommunications(prev => prev.map(c => 
                            c.id === selectedCommunication.id ? updated : c
                          ))
                          setSelectedCommunication(updated)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {communicationTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="comm-protocol">Protocol</Label>
                      <Select 
                        value={selectedCommunication.protocol}
                        onValueChange={(value) => {
                          const updated = { ...selectedCommunication, protocol: value as any }
                          setCommunications(prev => prev.map(c => 
                            c.id === selectedCommunication.id ? updated : c
                          ))
                          setSelectedCommunication(updated)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="direct">Direct</SelectItem>
                          <SelectItem value="queue">Message Queue</SelectItem>
                          <SelectItem value="pub_sub">Pub/Sub</SelectItem>
                          <SelectItem value="rpc">RPC</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="comm-priority">Priority</Label>
                      <Select 
                        value={selectedCommunication.priority}
                        onValueChange={(value) => {
                          const updated = { ...selectedCommunication, priority: value as any }
                          setCommunications(prev => prev.map(c => 
                            c.id === selectedCommunication.id ? updated : c
                          ))
                          setSelectedCommunication(updated)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="comm-async">Asynchronous</Label>
                      <Switch
                        id="comm-async"
                        checked={selectedCommunication.async}
                        onCheckedChange={(checked) => {
                          const updated = { ...selectedCommunication, async: checked }
                          setCommunications(prev => prev.map(c => 
                            c.id === selectedCommunication.id ? updated : c
                          ))
                          setSelectedCommunication(updated)
                        }}
                      />
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 hover:text-red-700"
                      onClick={() => {
                        setCommunications(prev => prev.filter(c => c.id !== selectedCommunication.id))
                        setSelectedCommunication(null)
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Channel
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No channel selected</p>
                    <p className="text-sm">Select a communication channel to configure</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Orchestration</CardTitle>
              <CardDescription>
                Define execution patterns and coordination strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{workflow.name}</h4>
                        <Badge variant="outline">{workflow.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{workflow.description}</p>
                      <div className="text-xs text-gray-500">
                        {workflow.agents.length} agents, {workflow.communications.length} channels
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {workflows.length === 0 && (
                  <div className="col-span-full text-center py-8 text-gray-500">
                    <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No workflows configured</p>
                    <p className="text-sm">Create workflow patterns for your multi-agent system</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>
                  Real-time status of all agents in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {agents.map((agent) => {
                    const Icon = getAgentIcon(agent.type)
                    return (
                      <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-sage-600" />
                          <div>
                            <h4 className="font-medium text-sm">{agent.name}</h4>
                            <p className="text-xs text-gray-600">{agent.role}</p>
                          </div>
                        </div>
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                      </div>
                    )
                  })}
                  {agents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No agents to monitor</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Message Queue</CardTitle>
                <CardDescription>
                  Recent communication messages between agents
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {systemState.messageQueue.slice(-10).reverse().map((message) => (
                    <div key={message.id} className="p-3 bg-gray-50 rounded text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{message.from} → {message.to}</span>
                        <Badge 
                          variant={message.status === 'delivered' ? 'default' : 
                                  message.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{message.content}</p>
                      <p className="text-xs text-gray-500">
                        {message.timestamp.toLocaleTimeString()} - {message.type}
                      </p>
                    </div>
                  ))}
                  {systemState.messageQueue.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No messages yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}