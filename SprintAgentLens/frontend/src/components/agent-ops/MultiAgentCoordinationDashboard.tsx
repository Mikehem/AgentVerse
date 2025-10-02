'use client'

import { useState, useEffect } from 'react'
import { 
  GitBranch, 
  Network, 
  Users, 
  Zap, 
  Activity,
  ArrowRightLeft,
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Play,
  Pause,
  Square,
  RotateCcw,
  Shuffle,
  Link,
  Unlink,
  Workflow,
  GitMerge,
  Share2,
  MessageSquare,
  Bell,
  Eye,
  EyeOff,
  Filter,
  Search,
  Download,
  Upload,
  Save,
  Edit3,
  Plus,
  Minus,
  Copy,
  Trash2,
  Calendar,
  Timer,
  Database,
  Cloud,
  Server,
  Cpu,
  Memory,
  HardDrive,
  Wifi,
  Radio,
  Radar,
  Crosshair,
  Navigation,
  Map,
  Globe,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Sankey, Treemap, Network as NetworkChart } from 'recharts'

interface AgentCoordination {
  agent_id: string
  agent_name: string
  agent_type: string
  coordination_role: 'leader' | 'follower' | 'peer' | 'standalone'
  coordination_groups: string[]
  communication_channels: string[]
  task_delegation: {
    can_delegate: boolean
    delegation_targets: string[]
    delegation_rules: Record<string, any>
  }
  collaboration_metrics: {
    coordination_efficiency: number
    communication_latency: number
    task_handoff_success_rate: number
    conflict_resolution_time: number
    consensus_participation: number
  }
  workload_sharing: {
    shared_tasks: number
    load_balancing_weight: number
    capacity_utilization: number
    overflow_handling: boolean
  }
  dependencies: {
    upstream_agents: string[]
    downstream_agents: string[]
    critical_dependencies: string[]
    backup_options: string[]
  }
}

interface CoordinationGroup {
  group_id: string
  group_name: string
  group_type: 'hierarchical' | 'peer_to_peer' | 'hybrid' | 'swarm'
  members: AgentCoordination[]
  coordination_strategy: {
    load_balancing: boolean
    task_distribution: 'round_robin' | 'weighted' | 'capability_based' | 'dynamic'
    failure_handling: 'failover' | 'redundancy' | 'graceful_degradation'
    consensus_mechanism: 'majority' | 'unanimous' | 'leader_decides' | 'weighted_voting'
  }
  performance_metrics: {
    group_efficiency: number
    communication_overhead: number
    coordination_latency: number
    conflict_count: number
    throughput: number
  }
  policies: {
    auto_scaling: boolean
    resource_sharing: boolean
    priority_inheritance: boolean
    deadlock_prevention: boolean
  }
}

interface CoordinationFlow {
  flow_id: string
  source_agent: string
  target_agent: string
  flow_type: 'task_delegation' | 'data_sharing' | 'resource_request' | 'status_update' | 'coordination_signal'
  volume: number
  latency: number
  success_rate: number
  priority_level: number
  bandwidth_usage: number
}

interface ConflictResolution {
  conflict_id: string
  involved_agents: string[]
  conflict_type: 'resource_contention' | 'priority_clash' | 'task_overlap' | 'communication_failure'
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolution_strategy: string
  resolution_time: number
  auto_resolved: boolean
  impact_score: number
}

interface MultiAgentCoordinationDashboardProps {
  projectId: string
  agents: any[]
}

export function MultiAgentCoordinationDashboard({ projectId, agents }: MultiAgentCoordinationDashboardProps) {
  const [agentCoordinations, setAgentCoordinations] = useState<AgentCoordination[]>([])
  const [coordinationGroups, setCoordinationGroups] = useState<CoordinationGroup[]>([])
  const [coordinationFlows, setCoordinationFlows] = useState<CoordinationFlow[]>([])
  const [conflicts, setConflicts] = useState<ConflictResolution[]>([])
  
  const [viewMode, setViewMode] = useState<'network' | 'groups' | 'flows' | 'conflicts' | 'policies'>('network')
  const [selectedGroup, setSelectedGroup] = useState<CoordinationGroup | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<AgentCoordination | null>(null)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [realTimeUpdates, setRealTimeUpdates] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    fetchCoordinationData()
    
    if (realTimeUpdates) {
      const interval = setInterval(fetchCoordinationData, 10000) // Update every 10 seconds
      return () => clearInterval(interval)
    }
  }, [projectId, timeRange, realTimeUpdates])

  const fetchCoordinationData = async () => {
    setIsLoading(true)
    try {
      const [coordinationsRes, groupsRes, flowsRes, conflictsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/agent-ops/coordinations?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/coordination-groups?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/coordination-flows?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/conflicts?timeRange=${timeRange}`)
      ])

      const [coordinationsData, groupsData, flowsData, conflictsData] = await Promise.all([
        coordinationsRes.json(),
        groupsRes.json(),
        flowsRes.json(),
        conflictsRes.json()
      ])

      if (coordinationsData.success) setAgentCoordinations(coordinationsData.coordinations)
      if (groupsData.success) setCoordinationGroups(groupsData.groups)
      if (flowsData.success) setCoordinationFlows(flowsData.flows)
      if (conflictsData.success) setConflicts(conflictsData.conflicts)
    } catch (error) {
      console.error('Failed to fetch coordination data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeCoordinationAction = async (action: string, targetId: string, params?: any) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/coordination-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetId, params })
      })
      const data = await response.json()
      if (data.success) {
        fetchCoordinationData()
      }
    } catch (error) {
      console.error('Failed to execute coordination action:', error)
    }
  }

  const optimizeCoordination = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/optimize-coordination`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchCoordinationData()
      }
    } catch (error) {
      console.error('Failed to optimize coordination:', error)
    }
  }

  const createCoordinationGroup = async (groupConfig: any) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/coordination-groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupConfig)
      })
      const data = await response.json()
      if (data.success) {
        fetchCoordinationData()
      }
    } catch (error) {
      console.error('Failed to create coordination group:', error)
    }
  }

  const resolveConflict = async (conflictId: string, resolutionStrategy: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/conflicts/${conflictId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: resolutionStrategy })
      })
      const data = await response.json()
      if (data.success) {
        fetchCoordinationData()
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'leader': return <Target className="w-4 h-4 text-purple-600" />
      case 'follower': return <Users className="w-4 h-4 text-blue-600" />
      case 'peer': return <Network className="w-4 h-4 text-green-600" />
      case 'standalone': return <Activity className="w-4 h-4 text-gray-600" />
      default: return <Users className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'leader': return 'text-purple-600 bg-purple-100'
      case 'follower': return 'text-blue-600 bg-blue-100'
      case 'peer': return 'text-green-600 bg-green-100'
      case 'standalone': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'hierarchical': return <GitBranch className="w-4 h-4" />
      case 'peer_to_peer': return <Network className="w-4 h-4" />
      case 'hybrid': return <GitMerge className="w-4 h-4" />
      case 'swarm': return <Radar className="w-4 h-4" />
      default: return <Network className="w-4 h-4" />
    }
  }

  const getConflictSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const filteredAgents = agentCoordinations.filter(agent => {
    const typeMatch = filterType === 'all' || agent.agent_type === filterType
    const roleMatch = filterRole === 'all' || agent.coordination_role === filterRole
    const searchMatch = searchTerm === '' || 
      agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agent_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return typeMatch && roleMatch && searchMatch
  })

  const globalMetrics = {
    totalAgents: agentCoordinations.length,
    activeGroups: coordinationGroups.length,
    totalFlows: coordinationFlows.length,
    activeConflicts: conflicts.filter(c => c.auto_resolved === false).length,
    avgEfficiency: Math.round(agentCoordinations.reduce((sum, a) => sum + a.collaboration_metrics.coordination_efficiency, 0) / agentCoordinations.length),
    avgLatency: Math.round(coordinationFlows.reduce((sum, f) => sum + f.latency, 0) / coordinationFlows.length)
  }

  const coordinationEfficiencyData = agentCoordinations.map(agent => ({
    name: agent.agent_name,
    efficiency: agent.collaboration_metrics.coordination_efficiency,
    communication: 100 - agent.collaboration_metrics.communication_latency,
    consensus: agent.collaboration_metrics.consensus_participation,
    handoff_success: agent.collaboration_metrics.task_handoff_success_rate
  }))

  const flowVolumeData = coordinationFlows.reduce((acc, flow) => {
    const existing = acc.find(item => item.type === flow.flow_type)
    if (existing) {
      existing.volume += flow.volume
      existing.count += 1
    } else {
      acc.push({ type: flow.flow_type, volume: flow.volume, count: 1 })
    }
    return acc
  }, [] as any[])

  const conflictTrendData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    conflicts: Math.floor(Math.random() * 10),
    resolved: Math.floor(Math.random() * 8),
    auto_resolved: Math.floor(Math.random() * 6)
  }))

  const groupPerformanceData = coordinationGroups.map(group => ({
    name: group.group_name,
    efficiency: group.performance_metrics.group_efficiency,
    latency: group.performance_metrics.coordination_latency,
    throughput: group.performance_metrics.throughput,
    conflicts: group.performance_metrics.conflict_count
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Network className="w-6 h-6" />
            Multi-Agent Coordination Dashboard
          </h2>
          <p className="text-muted mt-1">Monitor and manage agent coordination, communication, and collaboration</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={optimizeCoordination}
            className="btn btn-primary"
          >
            <Zap className="w-4 h-4" />
            Optimize Coordination
          </button>
          
          <button
            onClick={() => setRealTimeUpdates(!realTimeUpdates)}
            className={`btn ${realTimeUpdates ? 'btn-primary' : 'btn-outline'}`}
          >
            <Radio className={`w-4 h-4 ${realTimeUpdates ? 'animate-pulse' : ''}`} />
            Real-time
          </button>
          
          <button
            onClick={fetchCoordinationData}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalAgents}</span>
          </div>
          <h4 className="font-semibold text-primary">Coordinated Agents</h4>
          <p className="text-sm text-muted">Active in coordination</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Network className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.activeGroups}</span>
          </div>
          <h4 className="font-semibold text-primary">Active Groups</h4>
          <p className="text-sm text-muted">Coordination groups</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalFlows}</span>
          </div>
          <h4 className="font-semibold text-primary">Active Flows</h4>
          <p className="text-sm text-muted">Communication flows</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.activeConflicts}</span>
          </div>
          <h4 className="font-semibold text-primary">Active Conflicts</h4>
          <p className="text-sm text-muted">Unresolved conflicts</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.avgEfficiency}%</span>
          </div>
          <h4 className="font-semibold text-primary">Avg Efficiency</h4>
          <p className="text-sm text-muted">Coordination efficiency</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.avgLatency}ms</span>
          </div>
          <h4 className="font-semibold text-primary">Avg Latency</h4>
          <p className="text-sm text-muted">Communication latency</p>
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
                { key: 'network', label: 'Network', icon: Network },
                { key: 'groups', label: 'Groups', icon: Users },
                { key: 'flows', label: 'Flows', icon: ArrowRightLeft },
                { key: 'conflicts', label: 'Conflicts', icon: AlertTriangle },
                { key: 'policies', label: 'Policies', icon: Settings }
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
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
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
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              <option value="all">All Roles</option>
              <option value="leader">Leader</option>
              <option value="follower">Follower</option>
              <option value="peer">Peer</option>
              <option value="standalone">Standalone</option>
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
          </select>
        </div>
      </div>

      {/* Network View */}
      {viewMode === 'network' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Agent Coordination Network</h3>
            
            {/* Simulated Network Visualization */}
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg h-96 overflow-hidden">
              {/* Network Nodes (Agents) */}
              {filteredAgents.slice(0, 12).map((agent, index) => (
                <div
                  key={agent.agent_id}
                  className="absolute group cursor-pointer"
                  style={{
                    left: `${15 + (index % 4) * 20}%`,
                    top: `${20 + Math.floor(index / 4) * 25}%`
                  }}
                  onClick={() => setSelectedAgent(agent)}
                >
                  {/* Agent Node */}
                  <div className={`w-12 h-12 rounded-full border-4 border-white shadow-lg flex items-center justify-center ${
                    agent.coordination_role === 'leader' ? 'bg-purple-500' :
                    agent.coordination_role === 'peer' ? 'bg-green-500' :
                    agent.coordination_role === 'follower' ? 'bg-blue-500' : 'bg-gray-500'
                  }`}>
                    {getRoleIcon(agent.coordination_role)}
                  </div>
                  
                  {/* Connection Lines */}
                  <svg className="absolute inset-0 pointer-events-none" style={{ width: '400px', height: '400px', left: '-200px', top: '-200px' }}>
                    {agent.dependencies.downstream_agents.slice(0, 2).map((_, connIndex) => (
                      <line
                        key={connIndex}
                        x1="200"
                        y1="200"
                        x2={200 + (connIndex * 100) - 50}
                        y2={200 + (connIndex * 80) - 40}
                        stroke="#3b82f6"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.6"
                      />
                    ))}
                  </svg>

                  {/* Agent Info on Hover */}
                  <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="text-sm space-y-1">
                      <div className="font-semibold text-primary">{agent.agent_name}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Role:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(agent.coordination_role)}`}>
                          {agent.coordination_role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Efficiency:</span>
                        <span className="font-medium text-primary">{agent.collaboration_metrics.coordination_efficiency}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Groups:</span>
                        <span className="font-medium text-primary">{agent.coordination_groups.length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Network Legend */}
              <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg p-3">
                <h4 className="font-semibold text-primary mb-2">Coordination Roles</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span>Leader</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Peer</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span>Follower</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span>Standalone</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Coordination Efficiency Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Coordination Efficiency</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={coordinationEfficiencyData.slice(0, 6)}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Tooltip />
                    <RechartsRadar name="Efficiency" dataKey="efficiency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                    <RechartsRadar name="Communication" dataKey="communication" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Communication Flow Types</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={flowVolumeData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="volume"
                      label={({ type, volume }) => `${type}: ${volume}`}
                    >
                      {flowVolumeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Groups View */}
      {viewMode === 'groups' && (
        <div className="space-y-6">
          {coordinationGroups.map(group => (
            <div key={group.group_id} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getGroupTypeIcon(group.group_type)}
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{group.group_name}</h3>
                    <p className="text-sm text-muted">{group.group_type} • {group.members.length} members</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    group.performance_metrics.group_efficiency >= 85 ? 'text-green-600 bg-green-100' :
                    group.performance_metrics.group_efficiency >= 70 ? 'text-yellow-600 bg-yellow-100' :
                    'text-red-600 bg-red-100'
                  }`}>
                    {group.performance_metrics.group_efficiency}% efficient
                  </span>
                  
                  <button
                    onClick={() => setSelectedGroup(group)}
                    className="btn btn-outline btn-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Details
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Throughput</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{group.performance_metrics.throughput}</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Latency</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{group.performance_metrics.coordination_latency}ms</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Conflicts</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{group.performance_metrics.conflict_count}</p>
                </div>

                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Network className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-primary">Communication</span>
                  </div>
                  <p className="text-xl font-bold text-primary">{Math.round(100 - group.performance_metrics.communication_overhead)}%</p>
                </div>
              </div>

              {/* Group Members */}
              <div>
                <h4 className="font-semibold text-primary mb-3">Group Members</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.members.map(member => (
                    <div key={member.agent_id} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(member.coordination_role)}
                          <span className="font-medium text-primary">{member.agent_name}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.coordination_role)}`}>
                          {member.coordination_role}
                        </span>
                      </div>
                      
                      <div className="text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Efficiency:</span>
                          <span className="font-medium text-primary">{member.collaboration_metrics.coordination_efficiency}%</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Utilization:</span>
                          <span className="font-medium text-primary">{member.workload_sharing.capacity_utilization}%</span>
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

      {/* Flows View */}
      {viewMode === 'flows' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Communication Flows</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-semibold text-primary">Source → Target</th>
                    <th className="text-left p-3 font-semibold text-primary">Flow Type</th>
                    <th className="text-left p-3 font-semibold text-primary">Volume</th>
                    <th className="text-left p-3 font-semibold text-primary">Latency</th>
                    <th className="text-left p-3 font-semibold text-primary">Success Rate</th>
                    <th className="text-left p-3 font-semibold text-primary">Priority</th>
                    <th className="text-left p-3 font-semibold text-primary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinationFlows.slice(0, 10).map(flow => (
                    <tr key={flow.flow_id} className="border-b border-border hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-primary">{flow.source_agent}</span>
                          <ArrowRightLeft className="w-4 h-4 text-muted" />
                          <span className="font-medium text-primary">{flow.target_agent}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                          {flow.flow_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-primary">{flow.volume}</span>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${
                          flow.latency < 100 ? 'text-green-600' :
                          flow.latency < 300 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {flow.latency}ms
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${
                          flow.success_rate >= 95 ? 'text-green-600' :
                          flow.success_rate >= 85 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {flow.success_rate}%
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          {Array.from({ length: flow.priority_level }, (_, i) => (
                            <div key={i} className="w-2 h-2 bg-orange-400 rounded-full mr-1" />
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button className="btn btn-outline btn-xs">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button className="btn btn-outline btn-xs">
                            <Settings className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Flow Performance Metrics</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" fill="#3b82f6" name="Volume" />
                  <Bar dataKey="count" fill="#10b981" name="Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Conflicts View */}
      {viewMode === 'conflicts' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Active Conflicts</h3>
            
            <div className="space-y-4">
              {conflicts.filter(c => !c.auto_resolved).map(conflict => (
                <div key={conflict.conflict_id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className={`w-5 h-5 ${
                        conflict.severity === 'critical' ? 'text-red-600' :
                        conflict.severity === 'high' ? 'text-orange-600' :
                        conflict.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                      }`} />
                      <div>
                        <h4 className="font-semibold text-primary capitalize">
                          {conflict.conflict_type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-muted">
                          Agents: {conflict.involved_agents.join(', ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConflictSeverityColor(conflict.severity)}`}>
                        {conflict.severity}
                      </span>
                      
                      <button
                        onClick={() => resolveConflict(conflict.conflict_id, 'auto_resolve')}
                        className="btn btn-primary btn-sm"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-sm text-muted">Impact Score</span>
                      <p className="font-semibold text-primary">{conflict.impact_score}/10</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted">Duration</span>
                      <p className="font-semibold text-primary">{conflict.resolution_time}min</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted">Strategy</span>
                      <p className="font-semibold text-primary">{conflict.resolution_strategy}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted">Auto-resolvable</span>
                      <p className="font-semibold text-primary">{conflict.auto_resolved ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Conflict Resolution Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={conflictTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="conflicts" stroke="#ef4444" name="New Conflicts" />
                  <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" />
                  <Line type="monotone" dataKey="auto_resolved" stroke="#3b82f6" name="Auto-resolved" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Policies View */}
      {viewMode === 'policies' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Coordination Policies</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {coordinationGroups.map(group => (
                <div key={group.group_id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {getGroupTypeIcon(group.group_type)}
                    <h4 className="font-semibold text-primary">{group.group_name}</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h5 className="font-medium text-primary mb-2">Strategy Configuration</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Load Balancing:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.coordination_strategy.load_balancing ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            {group.coordination_strategy.load_balancing ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Task Distribution:</span>
                          <span className="font-medium text-primary">{group.coordination_strategy.task_distribution}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Failure Handling:</span>
                          <span className="font-medium text-primary">{group.coordination_strategy.failure_handling}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Consensus:</span>
                          <span className="font-medium text-primary">{group.coordination_strategy.consensus_mechanism}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium text-primary mb-2">Policies</h5>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Auto-scaling:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.policies.auto_scaling ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            {group.policies.auto_scaling ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Resource Sharing:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.policies.resource_sharing ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            {group.policies.resource_sharing ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Priority Inheritance:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.policies.priority_inheritance ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            {group.policies.priority_inheritance ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted">Deadlock Prevention:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            group.policies.deadlock_prevention ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                          }`}>
                            {group.policies.deadlock_prevention ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <button className="btn btn-outline btn-sm">
                      <Edit3 className="w-3 h-3" />
                      Edit
                    </button>
                    <button className="btn btn-outline btn-sm">
                      <Copy className="w-3 h-3" />
                      Clone
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Group Performance Comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="efficiency" fill="#10b981" name="Efficiency %" />
                  <Bar dataKey="throughput" fill="#3b82f6" name="Throughput" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Selected Agent Details Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {getRoleIcon(selectedAgent.coordination_role)}
                <div>
                  <h3 className="text-xl font-bold text-primary">{selectedAgent.agent_name}</h3>
                  <p className="text-muted">{selectedAgent.agent_type} • {selectedAgent.coordination_role}</p>
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
              {/* Coordination Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(selectedAgent.collaboration_metrics).map(([key, value]) => (
                  <div key={key} className="card p-3">
                    <div className="text-sm text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                    <div className="text-lg font-bold text-primary">{typeof value === 'number' ? value : String(value)}</div>
                  </div>
                ))}
              </div>

              {/* Dependencies */}
              <div>
                <h4 className="font-semibold text-primary mb-3">Dependencies</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted mb-2">Upstream Agents</div>
                    <div className="space-y-1">
                      {selectedAgent.dependencies.upstream_agents.map(agent => (
                        <div key={agent} className="text-sm font-medium text-primary">{agent}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted mb-2">Downstream Agents</div>
                    <div className="space-y-1">
                      {selectedAgent.dependencies.downstream_agents.map(agent => (
                        <div key={agent} className="text-sm font-medium text-primary">{agent}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <button className="btn btn-primary">
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
                <button className="btn btn-outline">
                  <Link className="w-4 h-4" />
                  Add Connection
                </button>
                <button className="btn btn-outline">
                  <Unlink className="w-4 h-4" />
                  Remove Connection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}