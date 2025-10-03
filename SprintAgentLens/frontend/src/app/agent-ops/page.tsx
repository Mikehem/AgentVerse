'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Activity, AlertTriangle, CheckCircle, Clock, Globe, Cpu, HardDrive, Network, Zap, Users, MapPin, BarChart3, Settings, RefreshCw, Play, Pause, Square, Layers, Shield, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'

interface Agent {
  id: string
  name: string
  status: 'active' | 'inactive' | 'error' | 'maintenance'
  location: {
    region: string
    coordinates: [number, number]
  }
  performance: {
    uptime: number
    responseTime: number
    requestsHandled: number
    errorRate: number
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
  }
  version: string
  lastSeen: Date
  capabilities: string[]
}

interface Fleet {
  id: string
  name: string
  agents: Agent[]
  status: 'healthy' | 'degraded' | 'critical'
  totalCapacity: number
  currentLoad: number
  region: string
}

const AgentOperationsPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [agents, setAgents] = useState<Agent[]>([])
  const [fleets, setFleets] = useState<Fleet[]>([])
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAgentData()
    const interval = setInterval(loadAgentData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const loadAgentData = async () => {
    setIsLoading(true)
    try {
      // Simulate API calls
      const mockAgents: Agent[] = [
        {
          id: 'agent-001',
          name: 'Production Agent Alpha',
          status: 'active',
          location: { region: 'us-east-1', coordinates: [-74.0, 40.7] },
          performance: {
            uptime: 99.8,
            responseTime: 145,
            requestsHandled: 12547,
            errorRate: 0.2,
            cpuUsage: 45,
            memoryUsage: 68,
            diskUsage: 32
          },
          version: '2.1.4',
          lastSeen: new Date(),
          capabilities: ['nlp', 'vision', 'reasoning']
        },
        {
          id: 'agent-002',
          name: 'Analytics Agent Beta',
          status: 'active',
          location: { region: 'eu-west-1', coordinates: [0.1, 51.5] },
          performance: {
            uptime: 99.5,
            responseTime: 178,
            requestsHandled: 8923,
            errorRate: 0.5,
            cpuUsage: 62,
            memoryUsage: 74,
            diskUsage: 28
          },
          version: '2.1.3',
          lastSeen: new Date(Date.now() - 120000),
          capabilities: ['analytics', 'ml', 'data-processing']
        }
      ]

      const mockFleets: Fleet[] = [
        {
          id: 'fleet-001',
          name: 'Production Fleet',
          agents: mockAgents,
          status: 'healthy',
          totalCapacity: 1000,
          currentLoad: 650,
          region: 'us-east-1'
        }
      ]

      setAgents(mockAgents)
      setFleets(mockFleets)
    } catch (error) {
      console.error('Failed to load agent data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive': return <Clock className="w-4 h-4 text-gray-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'maintenance': return <Settings className="w-4 h-4 text-yellow-500" />
      default: return <AlertCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredAgents = agents.filter(agent => {
    const matchesRegion = selectedRegion === 'all' || agent.location.region === selectedRegion
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.id.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesRegion && matchesSearch
  })

  const totalAgents = agents.length
  const activeAgents = agents.filter(a => a.status === 'active').length
  const totalRequests = agents.reduce((sum, a) => sum + a.performance.requestsHandled, 0)
  const avgResponseTime = agents.reduce((sum, a) => sum + a.performance.responseTime, 0) / agents.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Operations</h1>
          <p className="text-gray-600">Monitor and manage your AI agent fleet</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadAgentData}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button className="gap-2">
            <Play className="w-4 h-4" />
            Deploy Agent
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalAgents}</p>
                <p className="text-xs text-gray-500">Total Agents</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">{activeAgents}</p>
                <p className="text-xs text-gray-500">Active Agents</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">{Math.round((activeAgents / totalAgents) * 100)}% uptime</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{totalRequests.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Requests Handled</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+8.2% from yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{Math.round(avgResponseTime)}ms</p>
                <p className="text-xs text-gray-500">Avg Response Time</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">-5ms from last hour</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-2">
            <Users className="w-4 h-4" />
            Agents
          </TabsTrigger>
          <TabsTrigger value="fleets" className="gap-2">
            <Layers className="w-4 h-4" />
            Fleets
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="deployment" className="gap-2">
            <Globe className="w-4 h-4" />
            Deployment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Fleet Status Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Fleet Health Status</CardTitle>
                <CardDescription>Real-time status of all agent fleets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fleets.map((fleet) => (
                  <div key={fleet.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${
                        fleet.status === 'healthy' ? 'bg-green-500' :
                        fleet.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <h4 className="font-medium">{fleet.name}</h4>
                        <p className="text-sm text-gray-600">{fleet.agents.length} agents • {fleet.region}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{Math.round((fleet.currentLoad / fleet.totalCapacity) * 100)}% load</div>
                      <Progress value={(fleet.currentLoad / fleet.totalCapacity) * 100} className="w-20 h-2" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resource Utilization</CardTitle>
                <CardDescription>System resource usage across all agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-blue-500" />
                      <span className="text-sm">CPU Usage</span>
                    </div>
                    <span className="text-sm font-medium">53%</span>
                  </div>
                  <Progress value={53} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Memory Usage</span>
                    </div>
                    <span className="text-sm font-medium">71%</span>
                  </div>
                  <Progress value={71} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HardDrive className="w-4 h-4 text-purple-500" />
                      <span className="text-sm">Disk Usage</span>
                    </div>
                    <span className="text-sm font-medium">30%</span>
                  </div>
                  <Progress value={30} className="h-2" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Network className="w-4 h-4 text-orange-500" />
                      <span className="text-sm">Network I/O</span>
                    </div>
                    <span className="text-sm font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest events and agent actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '2 minutes ago', event: 'Agent Alpha scaled up to handle increased load', type: 'info' },
                  { time: '15 minutes ago', event: 'Fleet deployment completed in eu-west-1', type: 'success' },
                  { time: '1 hour ago', event: 'Agent Beta experienced temporary connectivity issues', type: 'warning' },
                  { time: '2 hours ago', event: 'Scheduled maintenance completed for Production Fleet', type: 'info' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' :
                      activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm">{activity.event}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                <SelectItem value="us-west-1">US West (California)</SelectItem>
                <SelectItem value="eu-west-1">EU West (Ireland)</SelectItem>
                <SelectItem value="ap-south-1">Asia Pacific (Mumbai)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Agents Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredAgents.map((agent) => (
              <Card key={agent.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{agent.name}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        {agent.location.region} • Version {agent.version}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(agent.status)}
                      <Badge className={getStatusColor(agent.status)}>
                        {agent.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{agent.performance.uptime}%</div>
                      <div className="text-xs text-gray-500">Uptime</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{agent.performance.responseTime}ms</div>
                      <div className="text-xs text-gray-500">Response Time</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{agent.performance.requestsHandled.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Requests</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-600">{agent.performance.errorRate}%</div>
                      <div className="text-xs text-gray-500">Error Rate</div>
                    </div>
                  </div>

                  {/* Resource Usage */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>CPU</span>
                      <span>{agent.performance.cpuUsage}%</span>
                    </div>
                    <Progress value={agent.performance.cpuUsage} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Memory</span>
                      <span>{agent.performance.memoryUsage}%</span>
                    </div>
                    <Progress value={agent.performance.memoryUsage} className="h-2" />
                  </div>

                  {/* Capabilities */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Capabilities</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.map((capability) => (
                        <Badge key={capability} variant="outline" className="text-xs">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Pause className="w-3 h-3" />
                      Pause
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Square className="w-3 h-3" />
                      Stop
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fleets" className="space-y-6">
          <div className="text-center py-12">
            <Layers className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Fleet Management</h3>
            <p className="text-gray-600 mb-4">Organize and manage agent fleets by region and purpose</p>
            <Button>Create Fleet</Button>
          </div>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <div className="text-center py-12">
            <BarChart3 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Advanced Monitoring</h3>
            <p className="text-gray-600 mb-4">Real-time performance metrics and alerting</p>
            <Button>Configure Monitoring</Button>
          </div>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-6">
          <div className="text-center py-12">
            <Globe className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Deployment Strategy</h3>
            <p className="text-gray-600 mb-4">Plan and execute agent deployments across regions</p>
            <Button>Plan Deployment</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AgentOperationsPage