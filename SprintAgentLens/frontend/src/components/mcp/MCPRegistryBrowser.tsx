"use client"

import React, { useState, useEffect } from 'react'
import { Search, Filter, RefreshCw, Plus, Globe, Zap, Shield, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

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

interface MCPRegistryBrowserProps {
  onServerSelect?: (server: MCPServer) => void
  onServerConnect?: (server: MCPServer) => void
  selectedServers?: string[]
}

export function MCPRegistryBrowser({
  onServerSelect,
  onServerConnect,
  selectedServers = []
}: MCPRegistryBrowserProps) {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedProtocol, setSelectedProtocol] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('popularity')
  const [selectedServer, setSelectedServer] = useState<MCPServer | null>(null)

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'ai', label: 'AI & ML' },
    { value: 'data', label: 'Data Processing' },
    { value: 'api', label: 'API Integration' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'custom', label: 'Custom' }
  ]

  const protocols = [
    { value: 'all', label: 'All Protocols' },
    { value: 'http', label: 'HTTP' },
    { value: 'websocket', label: 'WebSocket' },
    { value: 'sse', label: 'Server-Sent Events' },
    { value: 'stdio', label: 'Standard I/O' }
  ]

  const mockServers: MCPServer[] = [
    {
      id: 'openai-tools',
      name: 'OpenAI Tools Server',
      description: 'Comprehensive OpenAI API integration with GPT models, embeddings, and function calling',
      version: '2.1.0',
      author: 'OpenAI',
      category: 'ai',
      tags: ['openai', 'gpt', 'embeddings', 'chat'],
      endpoint: 'https://api.openai.com/mcp',
      protocol: 'http',
      capabilities: {
        tools: [
          { name: 'chat_completion', description: 'Generate chat completions using GPT models' },
          { name: 'create_embedding', description: 'Create embeddings for text' },
          { name: 'list_models', description: 'List available OpenAI models' }
        ],
        resources: [
          { name: 'model_info', description: 'Information about available models' }
        ]
      },
      health: {
        status: 'healthy',
        responseTime: 120,
        lastChecked: '2024-01-15T10:00:00Z'
      },
      stats: {
        totalConnections: 1542,
        averageResponseTime: 110,
        errorRate: 0.02
      },
      documentation: 'https://docs.openai.com/mcp',
      repository: 'https://github.com/openai/mcp-server'
    },
    {
      id: 'web-scraper',
      name: 'Web Scraper MCP',
      description: 'Intelligent web scraping with support for JavaScript rendering and content extraction',
      version: '1.5.2',
      author: 'ScrapeCorp',
      category: 'data',
      tags: ['scraping', 'web', 'extraction', 'data'],
      endpoint: 'wss://scraper.example.com/mcp',
      protocol: 'websocket',
      capabilities: {
        tools: [
          { name: 'scrape_url', description: 'Scrape content from a URL' },
          { name: 'extract_data', description: 'Extract structured data from HTML' },
          { name: 'render_javascript', description: 'Render JavaScript-heavy pages' }
        ],
        resources: [
          { name: 'scraping_templates', description: 'Pre-built scraping templates' }
        ]
      },
      health: {
        status: 'healthy',
        responseTime: 250,
        lastChecked: '2024-01-15T09:45:00Z'
      },
      stats: {
        totalConnections: 892,
        averageResponseTime: 280,
        errorRate: 0.05
      }
    },
    {
      id: 'database-connector',
      name: 'Universal Database Connector',
      description: 'Connect to multiple database types with SQL query execution and schema introspection',
      version: '3.0.1',
      author: 'DataTools Inc',
      category: 'data',
      tags: ['database', 'sql', 'postgresql', 'mysql', 'mongodb'],
      endpoint: 'https://db-mcp.datatools.com/events',
      protocol: 'sse',
      capabilities: {
        tools: [
          { name: 'execute_query', description: 'Execute SQL queries safely' },
          { name: 'get_schema', description: 'Get database schema information' },
          { name: 'backup_data', description: 'Create database backups' }
        ],
        resources: [
          { name: 'connection_templates', description: 'Database connection templates' }
        ]
      },
      health: {
        status: 'healthy',
        responseTime: 95,
        lastChecked: '2024-01-15T10:15:00Z'
      },
      stats: {
        totalConnections: 2103,
        averageResponseTime: 85,
        errorRate: 0.01
      }
    }
  ]

  useEffect(() => {
    const fetchServers = async () => {
      setLoading(true)
      try {
        // In a real implementation, this would fetch from the MCP registry API
        await new Promise(resolve => setTimeout(resolve, 1000))
        setServers(mockServers)
      } catch (error) {
        console.error('Failed to fetch MCP servers:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchServers()
  }, [])

  const filteredServers = servers.filter(server => {
    const matchesSearch = searchQuery === '' || 
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || server.category === selectedCategory
    const matchesProtocol = selectedProtocol === 'all' || server.protocol === selectedProtocol

    return matchesSearch && matchesCategory && matchesProtocol
  })

  const sortedServers = [...filteredServers].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'popularity':
        return (b.stats?.totalConnections || 0) - (a.stats?.totalConnections || 0)
      case 'performance':
        return (a.stats?.averageResponseTime || 0) - (b.stats?.averageResponseTime || 0)
      case 'updated':
        return new Date(b.health?.lastChecked || 0).getTime() - new Date(a.health?.lastChecked || 0).getTime()
      default:
        return 0
    }
  })

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-500'
    }
  }

  const getProtocolIcon = (protocol: string) => {
    switch (protocol) {
      case 'http': return <Globe className="w-4 h-4" />
      case 'websocket': return <Zap className="w-4 h-4" />
      case 'sse': return <RefreshCw className="w-4 h-4" />
      default: return <Info className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">MCP Registry</h2>
          <p className="text-muted-foreground">
            Discover and connect to Model Context Protocol servers
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Register Server
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search servers, capabilities, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category.value} value={category.value}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Protocol" />
            </SelectTrigger>
            <SelectContent>
              {protocols.map(protocol => (
                <SelectItem key={protocol.value} value={protocol.value}>
                  {protocol.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popularity">Popularity</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
              <SelectItem value="updated">Updated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-4/5"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedServers.map(server => (
            <Card 
              key={server.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedServers.includes(server.id) ? 'ring-2 ring-blue-500' : ''
              }`}
              onClick={() => setSelectedServer(server)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getProtocolIcon(server.protocol)}
                      {server.name}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      v{server.version} by {server.author}
                    </CardDescription>
                  </div>
                  <div className={`text-xs ${getHealthColor(server.health?.status || 'unknown')}`}>
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${
                        server.health?.status === 'healthy' ? 'bg-green-500' : 
                        server.health?.status === 'unhealthy' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></div>
                      {server.health?.responseTime ? `${server.health.responseTime}ms` : 'Unknown'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {server.description}
                </p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {server.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {server.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{server.tags.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {server.capabilities.tools && (
                    <div>Tools: {server.capabilities.tools.length}</div>
                  )}
                  {server.capabilities.resources && (
                    <div>Resources: {server.capabilities.resources.length}</div>
                  )}
                  {server.stats && (
                    <div>Connections: {server.stats.totalConnections.toLocaleString()}</div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onServerSelect?.(server)
                    }}
                  >
                    Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation()
                      onServerConnect?.(server)
                    }}
                  >
                    Connect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Server Details Dialog */}
      <Dialog open={!!selectedServer} onOpenChange={() => setSelectedServer(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedServer && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getProtocolIcon(selectedServer.protocol)}
                  {selectedServer.name}
                  <Badge variant="outline">v{selectedServer.version}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {selectedServer.description}
                </DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
                  <TabsTrigger value="health">Health & Stats</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Server Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Author:</strong> {selectedServer.author}</div>
                        <div><strong>Category:</strong> {selectedServer.category}</div>
                        <div><strong>Protocol:</strong> {selectedServer.protocol}</div>
                        <div><strong>Endpoint:</strong> {selectedServer.endpoint}</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Tags</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedServer.tags.map(tag => (
                          <Badge key={tag} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {(selectedServer.documentation || selectedServer.repository) && (
                    <div>
                      <h4 className="font-medium mb-2">Links</h4>
                      <div className="flex gap-2">
                        {selectedServer.documentation && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedServer.documentation} target="_blank" rel="noopener noreferrer">
                              Documentation
                            </a>
                          </Button>
                        )}
                        {selectedServer.repository && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={selectedServer.repository} target="_blank" rel="noopener noreferrer">
                              Repository
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="capabilities" className="space-y-4">
                  {selectedServer.capabilities.tools && (
                    <div>
                      <h4 className="font-medium mb-2">Tools ({selectedServer.capabilities.tools.length})</h4>
                      <div className="space-y-2">
                        {selectedServer.capabilities.tools.map(tool => (
                          <Card key={tool.name}>
                            <CardContent className="p-3">
                              <div className="font-medium">{tool.name}</div>
                              <div className="text-sm text-muted-foreground">{tool.description}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedServer.capabilities.resources && (
                    <div>
                      <h4 className="font-medium mb-2">Resources ({selectedServer.capabilities.resources.length})</h4>
                      <div className="space-y-2">
                        {selectedServer.capabilities.resources.map(resource => (
                          <Card key={resource.name}>
                            <CardContent className="p-3">
                              <div className="font-medium">{resource.name}</div>
                              <div className="text-sm text-muted-foreground">{resource.description}</div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Health Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className={`text-lg font-medium ${getHealthColor(selectedServer.health?.status || 'unknown')}`}>
                          {selectedServer.health?.status || 'Unknown'}
                        </div>
                        {selectedServer.health?.responseTime && (
                          <div className="text-sm text-muted-foreground">
                            Response time: {selectedServer.health.responseTime}ms
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {selectedServer.stats && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Usage Statistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Total Connections</span>
                              <span>{selectedServer.stats.totalConnections.toLocaleString()}</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Avg Response Time</span>
                              <span>{selectedServer.stats.averageResponseTime}ms</span>
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Error Rate</span>
                              <span>{(selectedServer.stats.errorRate * 100).toFixed(2)}%</span>
                            </div>
                            <Progress value={(1 - selectedServer.stats.errorRate) * 100} className="mt-1" />
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 mt-6">
                <Button 
                  className="flex-1"
                  onClick={() => {
                    onServerConnect?.(selectedServer)
                    setSelectedServer(null)
                  }}
                >
                  Connect to Agent Playground
                </Button>
                <Button variant="outline" onClick={() => setSelectedServer(null)}>
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