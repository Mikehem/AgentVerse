"use client"

import React, { useState, useEffect } from 'react'
import { 
  Wifi, 
  WifiOff, 
  Settings, 
  Play, 
  Square, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Trash2,
  Edit,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { MCPClient, MCPServerConnection } from '@/lib/mcp/MCPClient'
import { MCPServerDefinition } from '@/types/mcp'

interface MCPConnectionStatus {
  id: string
  server: MCPServerDefinition
  connection?: MCPServerConnection
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastConnected?: Date
  error?: string
  autoReconnect: boolean
  retryCount: number
  responseTime?: number
}

interface MCPConnectionManagerProps {
  onConnectionChange?: (connections: MCPConnectionStatus[]) => void
  onToolCall?: (serverId: string, toolName: string, args: any) => void
}

export function MCPConnectionManager({ 
  onConnectionChange,
  onToolCall 
}: MCPConnectionManagerProps) {
  const [connections, setConnections] = useState<MCPConnectionStatus[]>([])
  const [mcpClient] = useState(() => new MCPClient())
  const [selectedConnection, setSelectedConnection] = useState<MCPConnectionStatus | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [testingConnection, setTestingConnection] = useState<string | null>(null)

  // Form state for adding new connections
  const [newConnection, setNewConnection] = useState({
    name: '',
    endpoint: '',
    protocol: 'http' as const,
    authType: 'none' as const,
    apiKey: '',
    autoReconnect: true
  })

  useEffect(() => {
    onConnectionChange?.(connections)
  }, [connections, onConnectionChange])

  const addConnection = async (server: MCPServerDefinition) => {
    const connectionStatus: MCPConnectionStatus = {
      id: server.id,
      server,
      status: 'connecting',
      autoReconnect: true,
      retryCount: 0
    }

    setConnections(prev => [...prev, connectionStatus])

    try {
      const connection = await mcpClient.connect(server)
      
      setConnections(prev => prev.map(conn => 
        conn.id === server.id 
          ? { 
              ...conn, 
              connection, 
              status: 'connected', 
              lastConnected: new Date(),
              error: undefined,
              retryCount: 0
            }
          : conn
      ))
    } catch (error) {
      setConnections(prev => prev.map(conn => 
        conn.id === server.id 
          ? { 
              ...conn, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Connection failed',
              retryCount: conn.retryCount + 1
            }
          : conn
      ))
    }
  }

  const disconnectConnection = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (connection?.connection) {
      await connection.connection.disconnect()
    }
    
    setConnections(prev => prev.map(conn => 
      conn.id === connectionId 
        ? { ...conn, status: 'disconnected', connection: undefined }
        : conn
    ))
  }

  const reconnectConnection = async (connectionId: string) => {
    const connectionStatus = connections.find(c => c.id === connectionId)
    if (!connectionStatus) return

    setConnections(prev => prev.map(conn => 
      conn.id === connectionId 
        ? { ...conn, status: 'connecting', error: undefined }
        : conn
    ))

    try {
      const connection = await mcpClient.connect(connectionStatus.server)
      
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { 
              ...conn, 
              connection, 
              status: 'connected', 
              lastConnected: new Date(),
              error: undefined,
              retryCount: 0
            }
          : conn
      ))
    } catch (error) {
      setConnections(prev => prev.map(conn => 
        conn.id === connectionId 
          ? { 
              ...conn, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Connection failed',
              retryCount: conn.retryCount + 1
            }
          : conn
      ))
    }
  }

  const removeConnection = async (connectionId: string) => {
    await disconnectConnection(connectionId)
    setConnections(prev => prev.filter(conn => conn.id !== connectionId))
  }

  const testConnection = async (connection: MCPConnectionStatus) => {
    if (!connection.connection) return

    setTestingConnection(connection.id)
    
    try {
      const startTime = Date.now()
      await connection.connection.ping()
      const responseTime = Date.now() - startTime
      
      setConnections(prev => prev.map(conn => 
        conn.id === connection.id 
          ? { ...conn, responseTime }
          : conn
      ))
    } catch (error) {
      console.error('Connection test failed:', error)
    } finally {
      setTestingConnection(null)
    }
  }

  const callTool = async (connection: MCPConnectionStatus, toolName: string, args: any = {}) => {
    if (!connection.connection) return

    try {
      const result = await connection.connection.callTool(toolName, args)
      onToolCall?.(connection.id, toolName, result)
      return result
    } catch (error) {
      console.error('Tool call failed:', error)
      throw error
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'connecting':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'disconnected':
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800'
      case 'connecting': return 'bg-blue-100 text-blue-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'disconnected':
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Active MCP Connections</h3>
          <p className="text-sm text-muted-foreground">
            Manage your Model Context Protocol server connections
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowTestDialog(true)}
            disabled={connections.length === 0}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Test All
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Wifi className="w-4 h-4 mr-2" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add MCP Connection</DialogTitle>
                <DialogDescription>
                  Connect to a Model Context Protocol server manually
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Server Name</Label>
                  <Input
                    id="name"
                    value={newConnection.name}
                    onChange={(e) => setNewConnection(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="My MCP Server"
                  />
                </div>
                
                <div>
                  <Label htmlFor="endpoint">Endpoint URL</Label>
                  <Input
                    id="endpoint"
                    value={newConnection.endpoint}
                    onChange={(e) => setNewConnection(prev => ({ ...prev, endpoint: e.target.value }))}
                    placeholder="https://api.example.com/mcp"
                  />
                </div>
                
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select 
                    value={newConnection.protocol} 
                    onValueChange={(value: any) => setNewConnection(prev => ({ ...prev, protocol: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP</SelectItem>
                      <SelectItem value="websocket">WebSocket</SelectItem>
                      <SelectItem value="sse">Server-Sent Events</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="authType">Authentication</Label>
                  <Select 
                    value={newConnection.authType} 
                    onValueChange={(value: any) => setNewConnection(prev => ({ ...prev, authType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="apikey">API Key</SelectItem>
                      <SelectItem value="basic">Basic Auth</SelectItem>
                      <SelectItem value="jwt">JWT Token</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {newConnection.authType === 'apikey' && (
                  <div>
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={newConnection.apiKey}
                      onChange={(e) => setNewConnection(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter your API key"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="autoReconnect"
                    checked={newConnection.autoReconnect}
                    onCheckedChange={(checked) => setNewConnection(prev => ({ ...prev, autoReconnect: checked }))}
                  />
                  <Label htmlFor="autoReconnect">Auto-reconnect on failure</Label>
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button 
                  className="flex-1"
                  onClick={async () => {
                    const server: MCPServerDefinition = {
                      id: `custom-${Date.now()}`,
                      name: newConnection.name,
                      description: `Custom MCP server at ${newConnection.endpoint}`,
                      endpoint: newConnection.endpoint,
                      protocol: newConnection.protocol,
                      authentication: {
                        type: newConnection.authType,
                        config: newConnection.authType === 'apikey' ? { header: 'Authorization' } : undefined
                      },
                      capabilities: { tools: [], resources: [], prompts: [] },
                      version: '1.0.0',
                      author: 'Custom',
                      category: 'custom',
                      tags: ['custom'],
                      created: new Date(),
                      updated: new Date(),
                      status: 'active'
                    }
                    
                    await addConnection(server)
                    setShowAddDialog(false)
                    setNewConnection({
                      name: '',
                      endpoint: '',
                      protocol: 'http',
                      authType: 'none',
                      apiKey: '',
                      autoReconnect: true
                    })
                  }}
                  disabled={!newConnection.name || !newConnection.endpoint}
                >
                  Connect
                </Button>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Connections List */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No MCP Connections</h3>
            <p className="text-muted-foreground mb-4">
              Connect to MCP servers to extend your agent capabilities
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              Add First Connection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {connections.map(connection => (
            <Card key={connection.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getStatusIcon(connection.status)}
                      {connection.server.name}
                      <Badge className={getStatusColor(connection.status)}>
                        {connection.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {connection.server.endpoint} • {connection.server.protocol}
                      {connection.responseTime && (
                        <span className="ml-2">• {connection.responseTime}ms</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => testConnection(connection)}
                      disabled={connection.status !== 'connected' || testingConnection === connection.id}
                    >
                      {testingConnection === connection.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedConnection(connection)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeConnection(connection.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {connection.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-3">
                    <div className="flex items-center gap-2 text-red-800 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {connection.error}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {connection.server.capabilities.tools?.slice(0, 3).map(tool => (
                    <Badge key={tool.name} variant="outline" className="text-xs">
                      {tool.name}
                    </Badge>
                  ))}
                  {(connection.server.capabilities.tools?.length || 0) > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{(connection.server.capabilities.tools?.length || 0) - 3} more
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {connection.status === 'connected' ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => disconnectConnection(connection.id)}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Disconnect
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => reconnectConnection(connection.id)}
                      disabled={connection.status === 'connecting'}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      {connection.status === 'connecting' ? 'Connecting...' : 'Connect'}
                    </Button>
                  )}
                  
                  {connection.lastConnected && (
                    <div className="flex items-center text-xs text-muted-foreground ml-auto">
                      <Clock className="w-3 h-3 mr-1" />
                      Last: {connection.lastConnected.toLocaleTimeString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connection Details Dialog */}
      <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
        <DialogContent className="max-w-2xl">
          {selectedConnection && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getStatusIcon(selectedConnection.status)}
                  {selectedConnection.server.name}
                </DialogTitle>
                <DialogDescription>
                  Connection details and available capabilities
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Status:</strong> {selectedConnection.status}
                  </div>
                  <div>
                    <strong>Protocol:</strong> {selectedConnection.server.protocol}
                  </div>
                  <div>
                    <strong>Endpoint:</strong> {selectedConnection.server.endpoint}
                  </div>
                  <div>
                    <strong>Auto-reconnect:</strong> {selectedConnection.autoReconnect ? 'Yes' : 'No'}
                  </div>
                </div>

                {selectedConnection.server.capabilities.tools && selectedConnection.server.capabilities.tools.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Available Tools</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedConnection.server.capabilities.tools.map(tool => (
                        <div key={tool.name} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <div className="font-medium text-sm">{tool.name}</div>
                            <div className="text-xs text-muted-foreground">{tool.description}</div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => callTool(selectedConnection, tool.name)}
                            disabled={selectedConnection.status !== 'connected'}
                          >
                            Call
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setSelectedConnection(null)}>
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