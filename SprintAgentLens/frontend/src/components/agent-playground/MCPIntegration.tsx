"use client"

import React, { useState, useEffect } from 'react'
import { 
  Shield, 
  Key, 
  Link, 
  Unlink, 
  Settings, 
  Monitor, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Activity,
  Database,
  Zap,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { MCPAgentRegistry, AgentDefinition, AgentInstance } from '@/lib/mcp/MCPAgentRegistry'
import { MCPSecurityManager, MCPCredential, SecurityAuditLog } from '@/lib/mcp/MCPSecurityManager'
import { MCPRegistryBrowser } from '@/components/mcp/MCPRegistryBrowser'
import { MCPConnectionManager } from '@/components/mcp/MCPConnectionManager'

interface MCPIntegrationProps {
  onAgentConnect?: (agent: AgentDefinition) => void
  onToolCall?: (agentId: string, tool: string, result: any) => void
}

export function MCPIntegration({ onAgentConnect, onToolCall }: MCPIntegrationProps) {
  const [registry] = useState(() => new MCPAgentRegistry())
  const [securityManager] = useState(() => new MCPSecurityManager())
  const [agents, setAgents] = useState<AgentDefinition[]>([])
  const [instances, setInstances] = useState<AgentInstance[]>([])
  const [credentials, setCredentials] = useState<MCPCredential[]>([])
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null)
  const [showCredentialDialog, setShowCredentialDialog] = useState(false)
  const [showPasswordField, setShowPasswordField] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form states
  const [newCredential, setNewCredential] = useState({
    name: '',
    type: 'apikey' as const,
    serverId: '',
    value: '',
    description: '',
    tags: ''
  })

  useEffect(() => {
    loadData()
    
    // Set up event listeners
    registry.on('agent:registered', () => loadData())
    registry.on('instance:deployed', () => loadData())
    registry.on('instance:stopped', () => loadData())

    return () => {
      // Cleanup listeners
      registry.off('agent:registered', () => {})
      registry.off('instance:deployed', () => {})
      registry.off('instance:stopped', () => {})
    }
  }, [])

  const loadData = async () => {
    try {
      const [agentsResult, instancesResult, credentialsResult, auditResult] = await Promise.all([
        registry.searchAgents({}),
        registry.getAgentInstances(),
        securityManager.listCredentials(),
        securityManager.getSecurityAuditLogs({ limit: 50 })
      ])

      setAgents(agentsResult.agents)
      setInstances(instancesResult)
      setCredentials(credentialsResult)
      setAuditLogs(auditResult.logs)
    } catch (error) {
      console.error('Failed to load MCP data:', error)
    }
  }

  const handleDeployAgent = async (agent: AgentDefinition) => {
    setLoading(true)
    try {
      await registry.deployAgent(agent.id, {
        environment: 'development',
        scaling: {
          minInstances: 1,
          maxInstances: 3,
          targetCPU: 70,
          targetMemory: 80
        },
        networking: {
          port: 8000 + Math.floor(Math.random() * 1000),
          protocol: 'http',
          ssl: false
        },
        monitoring: {
          healthCheck: '/health',
          metricsEndpoint: '/metrics',
          logsLevel: 'info'
        }
      })
      
      await loadData()
      onAgentConnect?.(agent)
    } catch (error) {
      console.error('Failed to deploy agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStopAgent = async (instance: AgentInstance) => {
    setLoading(true)
    try {
      await registry.stopAgentInstance(instance.id)
      await loadData()
    } catch (error) {
      console.error('Failed to stop agent:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToolCall = async (instance: AgentInstance, toolName: string) => {
    try {
      const result = await registry.callAgentTool(instance.id, toolName, {})
      onToolCall?.(instance.agentId, toolName, result)
    } catch (error) {
      console.error('Tool call failed:', error)
    }
  }

  const handleCreateCredential = async () => {
    try {
      const credentialData = {
        name: newCredential.name,
        type: newCredential.type,
        serverId: newCredential.serverId,
        value: newCredential.value,
        metadata: {
          description: newCredential.description,
          tags: newCredential.tags.split(',').map(t => t.trim()).filter(Boolean),
          scope: []
        }
      }

      await securityManager.createCredential(credentialData)
      setShowCredentialDialog(false)
      setNewCredential({
        name: '',
        type: 'apikey',
        serverId: '',
        value: '',
        description: '',
        tags: ''
      })
      await loadData()
    } catch (error) {
      console.error('Failed to create credential:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800'
      case 'starting': return 'bg-blue-100 text-blue-800'
      case 'stopping': return 'bg-yellow-100 text-yellow-800'
      case 'stopped': return 'bg-gray-100 text-gray-800'
      case 'error': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'degraded': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'unhealthy': return <AlertTriangle className="w-4 h-4 text-red-600" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const registryStats = registry.getRegistryStats()
  const securityMetrics = securityManager.getSecurityMetrics()

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Agents</p>
                <p className="text-2xl font-bold">{registryStats.totalAgents}</p>
              </div>
              <Database className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Running Instances</p>
                <p className="text-2xl font-bold">{registryStats.runningInstances}</p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                <p className="text-2xl font-bold">{securityMetrics.activeConnections}</p>
              </div>
              <Link className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Events</p>
                <p className="text-2xl font-bold">{securityMetrics.recentEvents.length}</p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="agents" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="instances">Instances</TabsTrigger>
          <TabsTrigger value="registry">Registry</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Available Agents</h3>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Register Agent
            </Button>
          </div>
          
          <div className="grid gap-4">
            {agents.map(agent => (
              <Card key={agent.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription>{agent.description}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAgent(agent)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeployAgent(agent)}
                        disabled={loading}
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Deploy
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {agent.capabilities.frameworks.map(framework => (
                      <Badge key={framework} variant="secondary">
                        {framework}
                      </Badge>
                    ))}
                    {agent.capabilities.patterns.map(pattern => (
                      <Badge key={pattern} variant="outline">
                        {pattern}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <span>v{agent.version}</span> • <span>{agent.author}</span> • 
                    <span className="ml-1">{agent.deployment.status}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="instances" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Agent Instances</h3>
            <Badge variant="outline">
              {instances.filter(i => i.status === 'running').length} running
            </Badge>
          </div>
          
          <div className="grid gap-4">
            {instances.map(instance => {
              const agent = agents.find(a => a.id === instance.agentId)
              return (
                <Card key={instance.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {getHealthIcon(instance.metrics.uptime > 0 ? 'healthy' : 'unknown')}
                          {instance.name}
                        </CardTitle>
                        <CardDescription>
                          {agent?.name} • {instance.environment}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(instance.status)}>
                          {instance.status}
                        </Badge>
                        {instance.status === 'running' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStopAgent(instance)}
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => agent && handleDeployAgent(agent)}
                          >
                            <Link className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Requests:</span>
                        <span className="ml-1">{instance.metrics.requests}</span>
                      </div>
                      <div>
                        <span className="font-medium">Errors:</span>
                        <span className="ml-1">{instance.metrics.errors}</span>
                      </div>
                      <div>
                        <span className="font-medium">Avg Response:</span>
                        <span className="ml-1">{instance.metrics.avgResponseTime}ms</span>
                      </div>
                      <div>
                        <span className="font-medium">Uptime:</span>
                        <span className="ml-1">{Math.floor(instance.metrics.uptime / 1000)}s</span>
                      </div>
                    </div>
                    
                    {agent?.capabilities.tools && agent.capabilities.tools.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Available Tools:</p>
                        <div className="flex flex-wrap gap-2">
                          {agent.capabilities.tools.slice(0, 3).map(tool => (
                            <Button
                              key={tool}
                              size="sm"
                              variant="outline"
                              onClick={() => handleToolCall(instance, tool)}
                              disabled={instance.status !== 'running'}
                            >
                              {tool}
                            </Button>
                          ))}
                          {agent.capabilities.tools.length > 3 && (
                            <Button size="sm" variant="ghost">
                              +{agent.capabilities.tools.length - 3} more
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="registry" className="space-y-4">
          <MCPRegistryBrowser
            onServerConnect={(server) => console.log('Connect to server:', server)}
            onServerSelect={(server) => console.log('Selected server:', server)}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Security & Credentials</h3>
            <Dialog open={showCredentialDialog} onOpenChange={setShowCredentialDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Credential
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Credential</DialogTitle>
                  <DialogDescription>
                    Add authentication credentials for MCP servers
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cred-name">Name</Label>
                      <Input
                        id="cred-name"
                        value={newCredential.name}
                        onChange={(e) => setNewCredential(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="My API Key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cred-type">Type</Label>
                      <Select 
                        value={newCredential.type} 
                        onValueChange={(value: any) => setNewCredential(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apikey">API Key</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="oauth2">OAuth2</SelectItem>
                          <SelectItem value="jwt">JWT Token</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="cred-server">Server ID</Label>
                    <Input
                      id="cred-server"
                      value={newCredential.serverId}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, serverId: e.target.value }))}
                      placeholder="server-id"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cred-value">Credential Value</Label>
                    <div className="relative">
                      <Input
                        id="cred-value"
                        type={showPasswordField ? 'text' : 'password'}
                        value={newCredential.value}
                        onChange={(e) => setNewCredential(prev => ({ ...prev, value: e.target.value }))}
                        placeholder="Enter credential value"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPasswordField(!showPasswordField)}
                      >
                        {showPasswordField ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="cred-description">Description</Label>
                    <Input
                      id="cred-description"
                      value={newCredential.description}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="cred-tags">Tags</Label>
                    <Input
                      id="cred-tags"
                      value={newCredential.tags}
                      onChange={(e) => setNewCredential(prev => ({ ...prev, tags: e.target.value }))}
                      placeholder="production, api, external"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2 mt-6">
                  <Button className="flex-1" onClick={handleCreateCredential}>
                    Create Credential
                  </Button>
                  <Button variant="outline" onClick={() => setShowCredentialDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid gap-4">
            {credentials.map(credential => (
              <Card key={credential.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        {credential.name}
                      </CardTitle>
                      <CardDescription>
                        {credential.type} • {credential.serverId}
                      </CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1 mb-2">
                    {credential.metadata.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created: {credential.created.toLocaleDateString()}
                    {credential.lastUsed && (
                      <span> • Last used: {credential.lastUsed.toLocaleDateString()}</span>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <h3 className="text-lg font-semibold">Security Audit Log</h3>
          
          <div className="space-y-2">
            {auditLogs.slice(0, 10).map(log => (
              <Card key={log.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={
                          log.severity === 'critical' ? 'bg-red-100 text-red-800' :
                          log.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                          log.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {log.event}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {log.timestamp.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm">
                        Server: {log.serverId} • User: {log.userId}
                      </p>
                      {log.details.error && (
                        <p className="text-sm text-red-600 mt-1">{log.details.error}</p>
                      )}
                    </div>
                    <Badge variant="outline" className={
                      log.severity === 'critical' ? 'border-red-500' :
                      log.severity === 'high' ? 'border-orange-500' :
                      log.severity === 'medium' ? 'border-yellow-500' :
                      'border-blue-500'
                    }>
                      {log.severity}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Agent Details Dialog */}
      <Dialog open={!!selectedAgent} onOpenChange={() => setSelectedAgent(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAgent.name}</DialogTitle>
                <DialogDescription>{selectedAgent.description}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Agent Information</h4>
                    <div className="space-y-1 text-sm">
                      <div><strong>Version:</strong> {selectedAgent.version}</div>
                      <div><strong>Author:</strong> {selectedAgent.author}</div>
                      <div><strong>Category:</strong> {selectedAgent.category}</div>
                      <div><strong>Runtime:</strong> {selectedAgent.configuration.runtime}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Capabilities</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium">Frameworks:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAgent.capabilities.frameworks.map(fw => (
                            <Badge key={fw} variant="secondary">{fw}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Patterns:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedAgent.capabilities.patterns.map(pattern => (
                            <Badge key={pattern} variant="outline">{pattern}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedAgent.capabilities.tools.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Available Tools</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedAgent.capabilities.tools.map(tool => (
                        <Card key={tool}>
                          <CardContent className="p-3">
                            <div className="font-medium text-sm">{tool}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    handleDeployAgent(selectedAgent)
                    setSelectedAgent(null)
                  }}
                >
                  Deploy Agent
                </Button>
                <Button variant="outline" onClick={() => setSelectedAgent(null)}>
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}