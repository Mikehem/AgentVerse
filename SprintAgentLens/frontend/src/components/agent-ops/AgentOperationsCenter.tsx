'use client'

import { useState, useEffect } from 'react'
import { 
  Command, 
  MapPin, 
  Radar, 
  Activity, 
  Users, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Target,
  Layers,
  GitBranch,
  Network,
  Globe,
  Server,
  Cpu,
  Memory,
  HardDrive,
  Wifi,
  Shield,
  Eye,
  Settings,
  RefreshCw,
  Filter,
  Search,
  Download,
  Play,
  Pause,
  Square,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Map,
  Navigation,
  Crosshair,
  Radio,
  Satellite,
  Calendar,
  Timer,
  Database,
  Cloud,
  MonitorSpeaker
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, ScatterPlot, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, ComposedChart, Area, AreaChart } from 'recharts'

interface AgentPosition {
  agent_id: string
  agent_name: string
  agent_type: 'customer_support' | 'research' | 'analysis' | 'sales' | 'content' | 'monitoring'
  status: 'active' | 'idle' | 'busy' | 'error' | 'offline' | 'deploying'
  location: {
    region: string
    zone: string
    datacenter: string
    coordinates: { lat: number; lng: number }
  }
  position_metrics: {
    workload_distribution: number
    response_coverage: number
    geographical_reach: number
    specialization_score: number
    efficiency_rating: number
    collaboration_index: number
  }
  operational_status: {
    uptime_percentage: number
    requests_handled_24h: number
    average_response_time: number
    success_rate: number
    error_count: number
    queue_depth: number
  }
  resources: {
    cpu_usage: number
    memory_usage: number
    network_latency: number
    storage_usage: number
    concurrent_sessions: number
    max_capacity: number
  }
  positioning_strategy: {
    primary_role: string
    backup_agents: string[]
    escalation_path: string[]
    load_balancing_weight: number
    priority_level: number
    service_tier: string
  }
  performance_trends: {
    hourly_requests: number[]
    response_times: number[]
    success_rates: number[]
    error_rates: number[]
  }
  last_updated: string
}

interface AgentCluster {
  cluster_id: string
  cluster_name: string
  cluster_type: 'regional' | 'functional' | 'workload' | 'tier'
  agents: AgentPosition[]
  cluster_metrics: {
    total_capacity: number
    utilization_rate: number
    avg_response_time: number
    total_requests_24h: number
    success_rate: number
    redundancy_level: number
  }
  coordination: {
    load_balancing_active: boolean
    failover_configured: boolean
    auto_scaling_enabled: boolean
    cross_cluster_communication: boolean
  }
}

interface AgentOperationsCenterProps {
  projectId: string
}

export function AgentOperationsCenter({ projectId }: AgentOperationsCenterProps) {
  const [agents, setAgents] = useState<AgentPosition[]>([])
  const [clusters, setClusters] = useState<AgentCluster[]>([])
  const [selectedAgent, setSelectedAgent] = useState<AgentPosition | null>(null)
  const [selectedCluster, setSelectedCluster] = useState<AgentCluster | null>(null)
  const [viewMode, setViewMode] = useState<'map' | 'grid' | 'clusters' | 'analytics' | 'coordination'>('map')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterRegion, setFilterRegion] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [realTimeMode, setRealTimeMode] = useState(true)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')

  useEffect(() => {
    fetchAgentPositions()
    fetchAgentClusters()
    
    if (realTimeMode) {
      const interval = setInterval(() => {
        fetchAgentPositions()
        fetchAgentClusters()
      }, 5000) // Update every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [projectId, realTimeMode])

  const fetchAgentPositions = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/positions?timeRange=${selectedTimeRange}`)
      const data = await response.json()
      if (data.success) {
        setAgents(data.agents)
      }
    } catch (error) {
      console.error('Failed to fetch agent positions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAgentClusters = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/clusters`)
      const data = await response.json()
      if (data.success) {
        setClusters(data.clusters)
      }
    } catch (error) {
      console.error('Failed to fetch agent clusters:', error)
    }
  }

  const executeAgentAction = async (agentId: string, action: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/agents/${agentId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await response.json()
      if (data.success) {
        fetchAgentPositions()
      }
    } catch (error) {
      console.error('Failed to execute agent action:', error)
    }
  }

  const optimizeAgentPositioning = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/optimize-positioning`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchAgentPositions()
        fetchAgentClusters()
      }
    } catch (error) {
      console.error('Failed to optimize positioning:', error)
    }
  }

  const rebalanceCluster = async (clusterId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/clusters/${clusterId}/rebalance`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchAgentClusters()
      }
    } catch (error) {
      console.error('Failed to rebalance cluster:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'idle':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'busy':
        return <Activity className="w-4 h-4 text-orange-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'offline':
        return <Minus className="w-4 h-4 text-gray-600" />
      case 'deploying':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'idle': return 'text-blue-600 bg-blue-100'
      case 'busy': return 'text-orange-600 bg-orange-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'offline': return 'text-gray-600 bg-gray-100'
      case 'deploying': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getAgentTypeIcon = (type: string) => {
    switch (type) {
      case 'customer_support': return <Users className="w-4 h-4" />
      case 'research': return <Search className="w-4 h-4" />
      case 'analysis': return <BarChart3 className="w-4 h-4" />
      case 'sales': return <Target className="w-4 h-4" />
      case 'content': return <PieChartIcon className="w-4 h-4" />
      case 'monitoring': return <MonitorSpeaker className="w-4 h-4" />
      default: return <Command className="w-4 h-4" />
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600'
    if (utilization >= 75) return 'text-orange-600'
    if (utilization >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const filteredAgents = agents.filter(agent => {
    const statusMatch = filterStatus === 'all' || agent.status === filterStatus
    const typeMatch = filterType === 'all' || agent.agent_type === filterType
    const regionMatch = filterRegion === 'all' || agent.location.region === filterRegion
    const searchMatch = searchTerm === '' || 
      agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agent_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.location.region.toLowerCase().includes(searchTerm.toLowerCase())
    
    return statusMatch && typeMatch && regionMatch && searchMatch
  })

  const globalMetrics = {
    totalAgents: agents.length,
    activeAgents: agents.filter(a => a.status === 'active').length,
    totalRequests24h: agents.reduce((sum, a) => sum + a.operational_status.requests_handled_24h, 0),
    avgResponseTime: Math.round(agents.reduce((sum, a) => sum + a.operational_status.average_response_time, 0) / agents.length),
    avgSuccessRate: Math.round(agents.reduce((sum, a) => sum + a.operational_status.success_rate, 0) / agents.length),
    totalErrors: agents.reduce((sum, a) => sum + a.operational_status.error_count, 0)
  }

  const regionDistribution = agents.reduce((acc, agent) => {
    const region = agent.location.region
    acc[region] = (acc[region] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const regionData = Object.entries(regionDistribution).map(([region, count]) => ({
    region,
    count,
    percentage: Math.round((count / agents.length) * 100)
  }))

  const workloadData = agents.map(agent => ({
    name: agent.agent_name,
    workload: agent.position_metrics.workload_distribution,
    efficiency: agent.position_metrics.efficiency_rating,
    capacity: agent.resources.max_capacity
  }))

  const performanceTrendData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    requests: Math.round(agents.reduce((sum, agent) => sum + (agent.performance_trends.hourly_requests[i] || 0), 0)),
    responseTime: Math.round(agents.reduce((sum, agent) => sum + (agent.performance_trends.response_times[i] || 0), 0) / agents.length),
    successRate: Math.round(agents.reduce((sum, agent) => sum + (agent.performance_trends.success_rates[i] || 0), 0) / agents.length)
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Command className="w-6 h-6" />
            Agent Operations Command Center
          </h2>
          <p className="text-muted mt-1">Monitor, analyze, and coordinate agent positions across your infrastructure</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={optimizeAgentPositioning}
            className="btn btn-primary"
          >
            <Target className="w-4 h-4" />
            Optimize Positioning
          </button>
          
          <button
            onClick={() => setRealTimeMode(!realTimeMode)}
            className={`btn ${realTimeMode ? 'btn-primary' : 'btn-outline'}`}
          >
            <Radio className={`w-4 h-4 ${realTimeMode ? 'animate-pulse' : ''}`} />
            Real-time
          </button>
          
          <button
            onClick={fetchAgentPositions}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Metrics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Command className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalAgents}</span>
          </div>
          <h4 className="font-semibold text-primary">Total Agents</h4>
          <p className="text-sm text-muted">{globalMetrics.activeAgents} active</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalRequests24h.toLocaleString()}</span>
          </div>
          <h4 className="font-semibold text-primary">Requests (24h)</h4>
          <p className="text-sm text-muted">Across all agents</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.avgResponseTime}ms</span>
          </div>
          <h4 className="font-semibold text-primary">Avg Response</h4>
          <p className="text-sm text-muted">Fleet average</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.avgSuccessRate}%</span>
          </div>
          <h4 className="font-semibold text-primary">Success Rate</h4>
          <p className="text-sm text-muted">Fleet average</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalErrors}</span>
          </div>
          <h4 className="font-semibold text-primary">Total Errors</h4>
          <p className="text-sm text-muted">Last 24 hours</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Globe className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{Object.keys(regionDistribution).length}</span>
          </div>
          <h4 className="font-semibold text-primary">Regions</h4>
          <p className="text-sm text-muted">Global coverage</p>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">View:</span>
            <div className="flex rounded-lg border border-border">
              {[
                { key: 'map', label: 'Map', icon: Map },
                { key: 'grid', label: 'Grid', icon: BarChart3 },
                { key: 'clusters', label: 'Clusters', icon: Network },
                { key: 'analytics', label: 'Analytics', icon: LineChartIcon },
                { key: 'coordination', label: 'Coordination', icon: GitBranch }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`px-3 py-1.5 text-sm font-medium flex items-center gap-1 ${
                    viewMode === key
                      ? 'bg-primary text-white'
                      : 'text-muted hover:text-primary'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time Range */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted" />
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              <option value="1h">Last Hour</option>
              <option value="6h">Last 6 Hours</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm w-48"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="busy">Busy</option>
              <option value="error">Error</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="customer_support">Customer Support</option>
            <option value="research">Research</option>
            <option value="analysis">Analysis</option>
            <option value="sales">Sales</option>
            <option value="content">Content</option>
            <option value="monitoring">Monitoring</option>
          </select>

          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-md text-sm"
          >
            <option value="all">All Regions</option>
            {Object.keys(regionDistribution).map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Map View */}
      {viewMode === 'map' && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Global Agent Positioning Map</h3>
              <div className="flex items-center gap-2">
                <button className="btn btn-outline btn-sm">
                  <Navigation className="w-4 h-4" />
                  Optimize Routes
                </button>
                <button className="btn btn-outline btn-sm">
                  <Satellite className="w-4 h-4" />
                  Satellite View
                </button>
              </div>
            </div>

            {/* Simulated Map View */}
            <div className="relative bg-gradient-to-br from-blue-50 to-green-50 rounded-lg h-96 overflow-hidden">
              {/* World Map Background */}
              <div className="absolute inset-0 bg-gray-100 opacity-20"></div>
              
              {/* Agent Positions */}
              {filteredAgents.map((agent, index) => (
                <div
                  key={agent.agent_id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{
                    left: `${20 + (index % 5) * 15}%`,
                    top: `${20 + Math.floor(index / 5) * 15}%`
                  }}
                  onClick={() => setSelectedAgent(agent)}
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                    agent.status === 'active' ? 'bg-green-500' :
                    agent.status === 'busy' ? 'bg-orange-500' :
                    agent.status === 'error' ? 'bg-red-500' :
                    agent.status === 'idle' ? 'bg-blue-500' : 'bg-gray-500'
                  } ${agent.status === 'active' ? 'animate-pulse' : ''}`}>
                  </div>
                  
                  {/* Agent Info Tooltip */}
                  <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="flex items-center gap-2 mb-2">
                      {getAgentTypeIcon(agent.agent_type)}
                      <span className="font-semibold text-primary">{agent.agent_name}</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                          {agent.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Region:</span>
                        <span className="font-medium text-primary">{agent.location.region}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Workload:</span>
                        <span className="font-medium text-primary">{agent.position_metrics.workload_distribution}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Response Time:</span>
                        <span className="font-medium text-primary">{agent.operational_status.average_response_time}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Region Labels */}
              <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg p-2">
                <h4 className="font-semibold text-primary mb-2">Legend</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span>Busy</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Idle</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span>Error</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Regional Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Regional Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={regionData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ region, percentage }) => `${region}: ${percentage}%`}
                    >
                      {regionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Workload Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="workload" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.map(agent => (
              <div key={agent.agent_id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getAgentTypeIcon(agent.agent_type)}
                    <span className="font-semibold text-primary">{agent.agent_name}</span>
                  </div>
                  {getStatusIcon(agent.status)}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Region:</span>
                    <span className="font-medium text-primary">{agent.location.region}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Workload:</span>
                    <span className={`font-medium ${getUtilizationColor(agent.position_metrics.workload_distribution)}`}>
                      {agent.position_metrics.workload_distribution}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Efficiency:</span>
                    <span className="font-medium text-primary">{agent.position_metrics.efficiency_rating}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Response:</span>
                    <span className="font-medium text-primary">{agent.operational_status.average_response_time}ms</span>
                  </div>
                </div>

                {/* Resource Usage Bars */}
                <div className="space-y-2 mb-4">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">CPU</span>
                      <span className="text-primary">{agent.resources.cpu_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${getUtilizationColor(agent.resources.cpu_usage)} bg-current`}
                        style={{ width: `${agent.resources.cpu_usage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">Memory</span>
                      <span className="text-primary">{agent.resources.memory_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${getUtilizationColor(agent.resources.memory_usage)} bg-current`}
                        style={{ width: `${agent.resources.memory_usage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedAgent(agent)}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    <Eye className="w-3 h-3" />
                    Details
                  </button>
                  
                  {agent.status === 'active' ? (
                    <button
                      onClick={() => executeAgentAction(agent.agent_id, 'pause')}
                      className="btn btn-outline btn-sm"
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => executeAgentAction(agent.agent_id, 'start')}
                      className="btn btn-primary btn-sm"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => executeAgentAction(agent.agent_id, 'restart')}
                    className="btn btn-outline btn-sm"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clusters View */}
      {viewMode === 'clusters' && (
        <div className="space-y-6">
          {clusters.map(cluster => (
            <div key={cluster.cluster_id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Network className="w-6 h-6 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{cluster.cluster_name}</h3>
                    <p className="text-sm text-muted">{cluster.cluster_type} cluster • {cluster.agents.length} agents</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    cluster.cluster_metrics.utilization_rate < 70 ? 'text-green-600 bg-green-100' :
                    cluster.cluster_metrics.utilization_rate < 85 ? 'text-yellow-600 bg-yellow-100' :
                    'text-red-600 bg-red-100'
                  }`}>
                    {cluster.cluster_metrics.utilization_rate}% utilized
                  </span>
                  
                  <button
                    onClick={() => rebalanceCluster(cluster.cluster_id)}
                    className="btn btn-outline btn-sm"
                  >
                    <GitBranch className="w-4 h-4" />
                    Rebalance
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Capacity</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{cluster.cluster_metrics.total_capacity}</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Response Time</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{cluster.cluster_metrics.avg_response_time}ms</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Requests (24h)</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{cluster.cluster_metrics.total_requests_24h.toLocaleString()}</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Success Rate</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{cluster.cluster_metrics.success_rate}%</p>
                </div>
              </div>

              {/* Cluster Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-semibold text-primary mb-3">Coordination Settings</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Load Balancing</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cluster.coordination.load_balancing_active ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {cluster.coordination.load_balancing_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Auto-scaling</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cluster.coordination.auto_scaling_enabled ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {cluster.coordination.auto_scaling_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Failover</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        cluster.coordination.failover_configured ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {cluster.coordination.failover_configured ? 'Configured' : 'Not configured'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-primary mb-3">Redundancy Level</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary">{cluster.cluster_metrics.redundancy_level}x Redundancy</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full" 
                      style={{ width: `${Math.min(cluster.cluster_metrics.redundancy_level * 25, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Agent Grid in Cluster */}
              <div>
                <h4 className="font-semibold text-primary mb-3">Cluster Agents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {cluster.agents.map(agent => (
                    <div key={agent.agent_id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getAgentTypeIcon(agent.agent_type)}
                          <span className="font-medium text-primary text-sm">{agent.agent_name}</span>
                        </div>
                        {getStatusIcon(agent.status)}
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Workload:</span>
                          <span className={`font-medium ${getUtilizationColor(agent.position_metrics.workload_distribution)}`}>
                            {agent.position_metrics.workload_distribution}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Priority:</span>
                          <span className="font-medium text-primary">{agent.positioning_strategy.priority_level}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Performance Trends (24h)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="requests" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" />
                  <Line yAxisId="right" type="monotone" dataKey="responseTime" stroke="#ef4444" />
                  <Line yAxisId="right" type="monotone" dataKey="successRate" stroke="#10b981" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Agent Type Performance</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={Object.entries(
                    agents.reduce((acc, agent) => {
                      const type = agent.agent_type
                      if (!acc[type]) {
                        acc[type] = { type, efficiency: 0, count: 0 }
                      }
                      acc[type].efficiency += agent.position_metrics.efficiency_rating
                      acc[type].count += 1
                      return acc
                    }, {} as Record<string, any>)
                  ).map(([type, data]) => ({
                    type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    efficiency: Math.round(data.efficiency / data.count)
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Resource Utilization</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    {
                      metric: 'CPU',
                      value: Math.round(agents.reduce((sum, agent) => sum + agent.resources.cpu_usage, 0) / agents.length)
                    },
                    {
                      metric: 'Memory',
                      value: Math.round(agents.reduce((sum, agent) => sum + agent.resources.memory_usage, 0) / agents.length)
                    },
                    {
                      metric: 'Network',
                      value: Math.round(agents.reduce((sum, agent) => sum + (agent.resources.network_latency / 10), 0) / agents.length)
                    },
                    {
                      metric: 'Storage',
                      value: Math.round(agents.reduce((sum, agent) => sum + agent.resources.storage_usage, 0) / agents.length)
                    },
                    {
                      metric: 'Sessions',
                      value: Math.round(agents.reduce((sum, agent) => sum + (agent.resources.concurrent_sessions / agent.resources.max_capacity * 100), 0) / agents.length)
                    }
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <RechartsRadar name="Utilization %" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coordination View */}
      {viewMode === 'coordination' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Inter-Agent Coordination Matrix</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="space-y-4">
                  {agents.slice(0, 6).map(agent => (
                    <div key={agent.agent_id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {getAgentTypeIcon(agent.agent_type)}
                          <div>
                            <h4 className="font-semibold text-primary">{agent.agent_name}</h4>
                            <p className="text-sm text-muted">{agent.positioning_strategy.primary_role}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">Weight:</span>
                          <span className="font-medium text-primary">{agent.positioning_strategy.load_balancing_weight}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="font-medium text-primary mb-2">Backup Agents</h5>
                          <div className="space-y-1">
                            {agent.positioning_strategy.backup_agents.map((backupId, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <GitBranch className="w-3 h-3 text-muted" />
                                <span className="text-primary">{backupId}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-primary mb-2">Escalation Path</h5>
                          <div className="space-y-1">
                            {agent.positioning_strategy.escalation_path.map((escalationId, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <ArrowUpRight className="w-3 h-3 text-muted" />
                                <span className="text-primary">{escalationId}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Coordination Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Active Clusters</span>
                      <span className="font-medium text-primary">{clusters.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Load Balanced</span>
                      <span className="font-medium text-primary">
                        {clusters.filter(c => c.coordination.load_balancing_active).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Auto-scaling</span>
                      <span className="font-medium text-primary">
                        {clusters.filter(c => c.coordination.auto_scaling_enabled).length}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted">Failover Ready</span>
                      <span className="font-medium text-primary">
                        {clusters.filter(c => c.coordination.failover_configured).length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="btn btn-outline w-full">
                      <Target className="w-4 h-4" />
                      Optimize All Positions
                    </button>
                    <button className="btn btn-outline w-full">
                      <GitBranch className="w-4 h-4" />
                      Rebalance Clusters
                    </button>
                    <button className="btn btn-outline w-full">
                      <Shield className="w-4 h-4" />
                      Test Failover
                    </button>
                    <button className="btn btn-outline w-full">
                      <Download className="w-4 h-4" />
                      Export Configuration
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Selected Agent Details Modal/Panel */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {getAgentTypeIcon(selectedAgent.agent_type)}
                <div>
                  <h3 className="text-xl font-bold text-primary">{selectedAgent.agent_name}</h3>
                  <p className="text-muted">{selectedAgent.positioning_strategy.primary_role}</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Status & Location</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAgent.status)}`}>
                        {selectedAgent.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Region</span>
                      <span className="font-medium text-primary">{selectedAgent.location.region}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Zone</span>
                      <span className="font-medium text-primary">{selectedAgent.location.zone}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Datacenter</span>
                      <span className="font-medium text-primary">{selectedAgent.location.datacenter}</span>
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Operational Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Uptime</span>
                      <span className="font-medium text-primary">{selectedAgent.operational_status.uptime_percentage}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Requests (24h)</span>
                      <span className="font-medium text-primary">{selectedAgent.operational_status.requests_handled_24h.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Response Time</span>
                      <span className="font-medium text-primary">{selectedAgent.operational_status.average_response_time}ms</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Success Rate</span>
                      <span className="font-medium text-primary">{selectedAgent.operational_status.success_rate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Position Metrics */}
              <div className="card p-4">
                <h4 className="font-semibold text-primary mb-3">Position Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(selectedAgent.position_metrics).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-2xl font-bold text-primary">{value}%</div>
                      <div className="text-sm text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource Usage */}
              <div className="card p-4">
                <h4 className="font-semibold text-primary mb-3">Resource Usage</h4>
                <div className="space-y-3">
                  {Object.entries(selectedAgent.resources).map(([key, value]) => {
                    if (key === 'max_capacity') return null
                    const percentage = key === 'concurrent_sessions' 
                      ? (value / selectedAgent.resources.max_capacity) * 100 
                      : typeof value === 'number' ? value : 0
                    
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span className="text-primary">{typeof value === 'number' ? value : value}{key.includes('usage') ? '%' : key === 'concurrent_sessions' ? `/${selectedAgent.resources.max_capacity}` : key === 'network_latency' ? 'ms' : ''}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getUtilizationColor(percentage)} bg-current`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {selectedAgent.status === 'active' ? (
                  <button
                    onClick={() => {
                      executeAgentAction(selectedAgent.agent_id, 'pause')
                      setSelectedAgent(null)
                    }}
                    className="btn btn-outline"
                  >
                    <Pause className="w-4 h-4" />
                    Pause Agent
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      executeAgentAction(selectedAgent.agent_id, 'start')
                      setSelectedAgent(null)
                    }}
                    className="btn btn-primary"
                  >
                    <Play className="w-4 h-4" />
                    Start Agent
                  </button>
                )}
                
                <button
                  onClick={() => {
                    executeAgentAction(selectedAgent.agent_id, 'restart')
                    setSelectedAgent(null)
                  }}
                  className="btn btn-outline"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart
                </button>
                
                <button className="btn btn-outline">
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}