'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Code, Globe, Key, Webhook, GitBranch, Play, Settings, Eye, Copy, Download, Plus, RefreshCw, CheckCircle, AlertTriangle, Clock, Activity, BarChart3, Shield, ExternalLink, Terminal, Database } from 'lucide-react'

interface APIEndpoint {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string
  description: string
  status: 'active' | 'deprecated' | 'beta'
  version: string
  rateLimit: number
  usage: number
  lastUsed: Date
}

interface Webhook {
  id: string
  name: string
  url: string
  events: string[]
  status: 'active' | 'inactive' | 'error'
  lastTriggered: Date
  deliveryRate: number
  retryCount: number
}

interface Integration {
  id: string
  name: string
  type: 'oauth' | 'api_key' | 'webhook' | 'sdk'
  status: 'connected' | 'disconnected' | 'error'
  provider: string
  lastSync: Date
  requestsToday: number
}

interface CodeSample {
  id: string
  title: string
  language: string
  code: string
  description: string
  tags: string[]
}

const DeveloperToolsPage = () => {
  const [activeTab, setActiveTab] = useState('api')
  const [apiEndpoints, setApiEndpoints] = useState<APIEndpoint[]>([])
  const [webhooks, setWebhooks] = useState<Webhook[]>([])
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [codeSamples, setCodeSamples] = useState<CodeSample[]>([])
  const [showCreateAPI, setShowCreateAPI] = useState(false)
  const [showCreateWebhook, setShowCreateWebhook] = useState(false)

  useEffect(() => {
    loadDeveloperData()
  }, [])

  const loadDeveloperData = async () => {
    // Mock data for demonstration
    const mockAPIEndpoints: APIEndpoint[] = [
      {
        id: 'api-001',
        name: 'Get Agent Performance',
        method: 'GET',
        path: '/api/v1/agents/{id}/performance',
        description: 'Retrieve performance metrics for a specific agent',
        status: 'active',
        version: 'v1',
        rateLimit: 1000,
        usage: 847,
        lastUsed: new Date()
      },
      {
        id: 'api-002',
        name: 'Create Dataset',
        method: 'POST',
        path: '/api/v1/datasets',
        description: 'Create a new dataset for analysis',
        status: 'active',
        version: 'v1',
        rateLimit: 100,
        usage: 234,
        lastUsed: new Date(Date.now() - 3600000)
      },
      {
        id: 'api-003',
        name: 'Update Agent Config',
        method: 'PUT',
        path: '/api/v1/agents/{id}/config',
        description: 'Update agent configuration settings',
        status: 'beta',
        version: 'v2',
        rateLimit: 500,
        usage: 156,
        lastUsed: new Date(Date.now() - 7200000)
      }
    ]

    const mockWebhooks: Webhook[] = [
      {
        id: 'webhook-001',
        name: 'Agent Status Updates',
        url: 'https://api.example.com/webhooks/agent-status',
        events: ['agent.started', 'agent.stopped', 'agent.error'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 1800000),
        deliveryRate: 98.5,
        retryCount: 2
      },
      {
        id: 'webhook-002',
        name: 'Data Processing Events',
        url: 'https://api.example.com/webhooks/data-events',
        events: ['data.processed', 'data.failed'],
        status: 'active',
        lastTriggered: new Date(Date.now() - 3600000),
        deliveryRate: 95.2,
        retryCount: 1
      }
    ]

    const mockIntegrations: Integration[] = [
      {
        id: 'int-001',
        name: 'Slack Notifications',
        type: 'webhook',
        status: 'connected',
        provider: 'Slack',
        lastSync: new Date(),
        requestsToday: 45
      },
      {
        id: 'int-002',
        name: 'GitHub Actions',
        type: 'oauth',
        status: 'connected',
        provider: 'GitHub',
        lastSync: new Date(Date.now() - 3600000),
        requestsToday: 23
      },
      {
        id: 'int-003',
        name: 'AWS S3 Storage',
        type: 'api_key',
        status: 'connected',
        provider: 'AWS',
        lastSync: new Date(Date.now() - 1800000),
        requestsToday: 156
      }
    ]

    const mockCodeSamples: CodeSample[] = [
      {
        id: 'code-001',
        title: 'Python SDK Initialization',
        language: 'python',
        code: `from agentlens import AgentLens

# Initialize the client
client = AgentLens(
    api_key="your_api_key",
    project_id="your_project_id"
)

# Create an agent
agent = client.agents.create(
    name="My Agent",
    model="gpt-4",
    temperature=0.7
)`,
        description: 'Initialize the AgentLens Python SDK and create your first agent',
        tags: ['python', 'sdk', 'initialization']
      },
      {
        id: 'code-002',
        title: 'JavaScript API Request',
        language: 'javascript',
        code: `const response = await fetch('/api/v1/agents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'My Agent',
    model: 'gpt-4',
    temperature: 0.7
  })
});

const agent = await response.json();
console.log('Created agent:', agent);`,
        description: 'Create an agent using the REST API with JavaScript',
        tags: ['javascript', 'api', 'rest']
      }
    ]

    setApiEndpoints(mockAPIEndpoints)
    setWebhooks(mockWebhooks)
    setIntegrations(mockIntegrations)
    setCodeSamples(mockCodeSamples)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'deprecated': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'beta': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'connected': return 'bg-green-100 text-green-800 border-green-200'
      case 'disconnected': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'POST': return 'bg-green-100 text-green-800 border-green-200'
      case 'PUT': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200'
      case 'PATCH': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Tools</h1>
          <p className="text-gray-600">APIs, integrations, and development resources</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            SDK Downloads
          </Button>
          <Button className="gap-2">
            <Code className="w-4 h-4" />
            API Documentation
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{apiEndpoints.length}</p>
                <p className="text-xs text-gray-500">API Endpoints</p>
              </div>
              <Globe className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {apiEndpoints.filter(api => api.status === 'active').length} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">12.5K</p>
                <p className="text-xs text-gray-500">API Requests</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Today
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{webhooks.length}</p>
                <p className="text-xs text-gray-500">Webhooks</p>
              </div>
              <Webhook className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {webhooks.filter(w => w.status === 'active').length} active
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{integrations.length}</p>
                <p className="text-xs text-gray-500">Integrations</p>
              </div>
              <GitBranch className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {integrations.filter(i => i.status === 'connected').length} connected
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="api" className="gap-2">
            <Globe className="w-4 h-4" />
            API Explorer
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="w-4 h-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="sdk" className="gap-2">
            <Code className="w-4 h-4" />
            SDKs & Code
          </TabsTrigger>
          <TabsTrigger value="testing" className="gap-2">
            <Play className="w-4 h-4" />
            API Testing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">API Endpoints</h3>
            <Button onClick={() => setShowCreateAPI(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Endpoint
            </Button>
          </div>

          <div className="grid gap-4">
            {apiEndpoints.map((endpoint) => (
              <Card key={endpoint.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Badge className={getMethodColor(endpoint.method)}>
                          {endpoint.method}
                        </Badge>
                        {endpoint.name}
                      </CardTitle>
                      <CardDescription className="font-mono text-sm mt-1">
                        {endpoint.path}
                      </CardDescription>
                      <p className="text-sm text-gray-600 mt-2">{endpoint.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">v{endpoint.version}</Badge>
                      <Badge className={getStatusColor(endpoint.status)}>
                        {endpoint.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{endpoint.usage}</div>
                      <div className="text-xs text-gray-500">Requests Today</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{endpoint.rateLimit}</div>
                      <div className="text-xs text-gray-500">Rate Limit/hr</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Math.round((endpoint.usage / endpoint.rateLimit) * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">Usage</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    Last used: {endpoint.lastUsed.toLocaleString()}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Play className="w-3 h-3" />
                      Try It
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Documentation
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-1"
                      onClick={() => copyToClipboard(endpoint.path)}
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Webhook Endpoints</h3>
            <Button onClick={() => setShowCreateWebhook(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Webhook
            </Button>
          </div>

          <div className="grid gap-4">
            {webhooks.map((webhook) => (
              <Card key={webhook.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                      <CardDescription className="font-mono text-sm mt-1">
                        {webhook.url}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(webhook.status)}>
                      {webhook.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Events</Label>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{webhook.deliveryRate}%</div>
                      <div className="text-xs text-gray-500">Delivery Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">{webhook.retryCount}</div>
                      <div className="text-xs text-gray-500">Retry Count</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        Last: {webhook.lastTriggered.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Triggered</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Play className="w-3 h-3" />
                      Test
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Activity className="w-3 h-3" />
                      Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription>Provider: {integration.provider}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{integration.type}</Badge>
                      <Badge className={getStatusColor(integration.status)}>
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{integration.requestsToday}</div>
                      <div className="text-xs text-gray-500">Requests Today</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">
                        {integration.lastSync.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">Last Sync</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Sync Now
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sdk" className="space-y-6">
          <div className="grid gap-4">
            {codeSamples.map((sample) => (
              <Card key={sample.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{sample.title}</CardTitle>
                      <CardDescription>{sample.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{sample.language}</Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="gap-1"
                        onClick={() => copyToClipboard(sample.code)}
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-sm text-gray-300">
                      <code>{sample.code}</code>
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {sample.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <div className="text-center py-12">
            <Terminal className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">API Testing Console</h3>
            <p className="text-gray-600 mb-4">Interactive API testing and debugging tools</p>
            <Button>Open API Console</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create API Dialog */}
      <Dialog open={showCreateAPI} onOpenChange={setShowCreateAPI}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create API Endpoint</DialogTitle>
            <DialogDescription>
              Define a new API endpoint for your application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Endpoint Name</Label>
                <Input placeholder="Enter endpoint name..." />
              </div>
              <div className="space-y-2">
                <Label>HTTP Method</Label>
                <select className="w-full p-2 border rounded-md">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Path</Label>
              <Input placeholder="/api/v1/your-endpoint" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe what this endpoint does..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateAPI(false)}>
                Cancel
              </Button>
              <Button>Create Endpoint</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Set up a new webhook endpoint for event notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Webhook Name</Label>
              <Input placeholder="Enter webhook name..." />
            </div>
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input placeholder="https://your-app.com/webhooks/agentlens" />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {['agent.started', 'agent.stopped', 'agent.error', 'data.processed', 'data.failed'].map((event) => (
                  <label key={event} className="flex items-center space-x-2">
                    <input type="checkbox" />
                    <span className="text-sm">{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateWebhook(false)}>
                Cancel
              </Button>
              <Button>Create Webhook</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DeveloperToolsPage