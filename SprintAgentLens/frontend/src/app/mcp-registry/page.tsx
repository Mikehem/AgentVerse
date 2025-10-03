"use client"

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MCPRegistryBrowser } from '@/components/mcp/MCPRegistryBrowser'
import { MCPConnectionManager } from '@/components/mcp/MCPConnectionManager'

interface MCPServer {
  id: string
  name: string
  description: string
  version: string
  author: string
  category: string
  tags: string[]
  endpoint: string
  protocol: 'http' | 'websocket' | 'sse' | 'stdio'
  capabilities: {
    tools?: Array<{ name: string; description: string }>
    resources?: Array<{ name: string; description: string }>
    prompts?: Array<{ name: string; description: string }>
  }
  health?: {
    status: 'healthy' | 'unhealthy' | 'unknown'
    responseTime?: number
    lastChecked: string
  }
  stats?: {
    totalConnections: number
    averageResponseTime: number
    errorRate: number
  }
  documentation?: string
  repository?: string
  icon?: string
}

export default function MCPRegistryPage() {
  const [selectedServers, setSelectedServers] = useState<string[]>([])
  const [connections, setConnections] = useState([])

  const handleServerSelect = (server: MCPServer) => {
    console.log('Selected server:', server)
  }

  const handleServerConnect = async (server: MCPServer) => {
    console.log('Connecting to server:', server)
    // The MCPConnectionManager will handle the actual connection
  }

  const handleConnectionChange = (newConnections: any[]) => {
    setConnections(newConnections)
  }

  const handleToolCall = (serverId: string, toolName: string, result: any) => {
    console.log('Tool called:', { serverId, toolName, result })
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">MCP Registry</h1>
        <p className="text-muted-foreground">
          Discover, connect, and manage Model Context Protocol servers to extend your agent capabilities
        </p>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse">Browse Registry</TabsTrigger>
          <TabsTrigger value="connections">
            My Connections
            {connections.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-blue-600 rounded-full">
                {connections.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <MCPRegistryBrowser
            onServerSelect={handleServerSelect}
            onServerConnect={handleServerConnect}
            selectedServers={selectedServers}
          />
        </TabsContent>

        <TabsContent value="connections" className="space-y-6">
          <MCPConnectionManager
            onConnectionChange={handleConnectionChange}
            onToolCall={handleToolCall}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}