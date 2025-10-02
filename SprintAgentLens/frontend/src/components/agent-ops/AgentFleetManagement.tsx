'use client'

import { useState, useEffect } from 'react'
import { 
  Truck, 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Play,
  Pause,
  Square,
  RotateCcw,
  Plus,
  Minus,
  Settings,
  Shield,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Upload,
  Save,
  Edit3,
  Copy,
  Trash2,
  Filter,
  Search,
  Eye,
  EyeOff,
  Calendar,
  Timer,
  Database,
  Cloud,
  Server,
  Cpu,
  Memory,
  HardDrive,
  Wifi,
  Network,
  Globe,
  Map,
  Navigation,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Grid3X3,
  List,
  Maximize2,
  Minimize2,
  GitBranch,
  GitMerge,
  Workflow,
  Command,
  Radio,
  Radar,
  Crosshair,
  Gauge,
  Battery,
  Fuel,
  Thermometer,
  Wind,
  Sun,
  Moon,
  MapPin,
  Route,
  Compass
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, ComposedChart, Area, Scatter, ScatterChart, Treemap } from 'recharts'

interface AgentFleet {
  fleet_id: string
  fleet_name: string
  fleet_type: 'production' | 'staging' | 'development' | 'emergency' | 'specialized'
  total_agents: number
  active_agents: number
  idle_agents: number
  maintenance_agents: number
  deployment_regions: string[]
  fleet_status: 'healthy' | 'warning' | 'critical' | 'maintenance'
  performance_metrics: {
    avg_response_time: number
    total_throughput: number
    success_rate: number
    error_rate: number
    availability: number
    resource_utilization: number
  }
  capacity_metrics: {
    current_capacity: number
    max_capacity: number
    utilization_percentage: number
    scaling_threshold: number
    autoscaling_enabled: boolean
  }
  cost_metrics: {
    daily_cost: number
    monthly_cost: number
    cost_per_request: number
    resource_cost_breakdown: Record<string, number>
  }
  health_checks: {
    last_check: string
    check_frequency: number
    failed_checks: number
    response_time_sla: number
    uptime_sla: number
  }
}

interface AgentInstance {
  instance_id: string
  instance_name: string
  fleet_id: string
  agent_type: string
  status: 'running' | 'starting' | 'stopping' | 'stopped' | 'error' | 'maintenance'
  deployment_info: {
    region: string
    zone: string
    instance_type: string
    image_version: string
    deployed_at: string
    last_updated: string
  }
  resource_usage: {
    cpu_usage: number
    memory_usage: number
    storage_usage: number
    network_io: number
    gpu_usage?: number
  }
  performance_metrics: {
    requests_per_minute: number
    response_time_p50: number
    response_time_p95: number
    success_rate: number
    error_count: number
  }
  health_status: {
    health_score: number
    last_health_check: string
    health_issues: string[]
    uptime_hours: number
  }
  scaling_config: {
    min_instances: number
    max_instances: number
    target_utilization: number
    scale_up_threshold: number
    scale_down_threshold: number
  }
}

interface FleetOperation {
  operation_id: string
  operation_type: 'deployment' | 'scaling' | 'update' | 'rollback' | 'maintenance' | 'migration'
  fleet_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  progress: number
  started_at: string
  estimated_completion: string
  affected_instances: number
  operation_details: {
    description: string
    parameters: Record<string, any>
    rollback_plan: string
    risk_level: 'low' | 'medium' | 'high' | 'critical'
  }
  logs: string[]
}

interface FleetTemplate {
  template_id: string
  template_name: string
  template_type: 'microservice' | 'batch_processing' | 'real_time' | 'analytics' | 'ml_inference'
  configuration: {
    agent_type: string
    instance_type: string
    scaling_policy: Record<string, any>
    resource_limits: Record<string, number>
    environment_variables: Record<string, string>
    health_check_config: Record<string, any>
  }
  deployment_strategy: {
    strategy_type: 'rolling' | 'blue_green' | 'canary' | 'recreate'
    rollout_config: Record<string, any>
    rollback_triggers: string[]
  }
  monitoring_config: {
    metrics_collection: boolean
    log_aggregation: boolean
    alerting_rules: string[]
    dashboard_config: Record<string, any>
  }
}

interface AgentFleetManagementProps {
  projectId: string
}

export function AgentFleetManagement({ projectId }: AgentFleetManagementProps) {
  const [fleets, setFleets] = useState<AgentFleet[]>([])
  const [instances, setInstances] = useState<AgentInstance[]>([])
  const [operations, setOperations] = useState<FleetOperation[]>([])
  const [templates, setTemplates] = useState<FleetTemplate[]>([])
  
  const [selectedFleet, setSelectedFleet] = useState<AgentFleet | null>(null)
  const [selectedInstance, setSelectedInstance] = useState<AgentInstance | null>(null)
  const [viewMode, setViewMode] = useState<'overview' | 'fleets' | 'instances' | 'operations' | 'templates'>('overview')
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRegion, setFilterRegion] = useState('all')
  const [filterFleetType, setFilterFleetType] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showOperationLogs, setShowOperationLogs] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [timeRange, setTimeRange] = useState('24h')

  useEffect(() => {
    fetchFleetData()
    
    if (autoRefresh) {
      const interval = setInterval(fetchFleetData, 15000) // Refresh every 15 seconds
      return () => clearInterval(interval)
    }
  }, [projectId, timeRange, autoRefresh])

  const fetchFleetData = async () => {
    setIsLoading(true)
    try {
      const [fleetsRes, instancesRes, operationsRes, templatesRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/agent-ops/fleets?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/instances?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/operations?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/fleet-templates`)
      ])

      const [fleetsData, instancesData, operationsData, templatesData] = await Promise.all([
        fleetsRes.json(),
        instancesRes.json(),
        operationsRes.json(),
        templatesRes.json()
      ])

      if (fleetsData.success) setFleets(fleetsData.fleets)
      if (instancesData.success) setInstances(instancesData.instances)
      if (operationsData.success) setOperations(operationsData.operations)
      if (templatesData.success) setTemplates(templatesData.templates)
    } catch (error) {
      console.error('Failed to fetch fleet data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const executeFleetOperation = async (operation: string, fleetId: string, params?: any) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/fleets/${fleetId}/operations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, params })
      })
      const data = await response.json()
      if (data.success) {
        fetchFleetData()
      }
    } catch (error) {
      console.error('Failed to execute fleet operation:', error)
    }
  }

  const scaleFleet = async (fleetId: string, scaleDirection: 'up' | 'down', targetCount?: number) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/fleets/${fleetId}/scale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction: scaleDirection, target_count: targetCount })
      })
      const data = await response.json()
      if (data.success) {
        fetchFleetData()
      }
    } catch (error) {
      console.error('Failed to scale fleet:', error)
    }
  }

  const deployFleetFromTemplate = async (templateId: string, deploymentConfig: any) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/fleets/deploy-from-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, config: deploymentConfig })
      })
      const data = await response.json()
      if (data.success) {
        fetchFleetData()
      }
    } catch (error) {
      console.error('Failed to deploy fleet from template:', error)
    }
  }

  const executeInstanceAction = async (instanceId: string, action: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/instances/${instanceId}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await response.json()
      if (data.success) {
        fetchFleetData()
      }
    } catch (error) {
      console.error('Failed to execute instance action:', error)
    }
  }

  const getFleetStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'maintenance':
        return <Settings className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getFleetStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      case 'maintenance': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getInstanceStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-4 h-4 text-green-600" />
      case 'starting':
        return <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
      case 'stopping':
        return <RefreshCw className="w-4 h-4 text-orange-600 animate-spin" />
      case 'stopped':
        return <Square className="w-4 h-4 text-gray-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'maintenance':
        return <Settings className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getInstanceStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100'
      case 'starting': return 'text-blue-600 bg-blue-100'
      case 'stopping': return 'text-orange-600 bg-orange-100'
      case 'stopped': return 'text-gray-600 bg-gray-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'maintenance': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getFleetTypeIcon = (type: string) => {
    switch (type) {
      case 'production': return <Server className="w-4 h-4 text-purple-600" />
      case 'staging': return <Database className="w-4 h-4 text-blue-600" />
      case 'development': return <Code className="w-4 h-4 text-green-600" />
      case 'emergency': return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'specialized': return <Target className="w-4 h-4 text-orange-600" />
      default: return <Truck className="w-4 h-4 text-gray-600" />
    }
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600'
    if (utilization >= 75) return 'text-orange-600'
    if (utilization >= 50) return 'text-yellow-600'
    return 'text-green-600'
  }

  const filteredFleets = fleets.filter(fleet => {
    const statusMatch = filterStatus === 'all' || fleet.fleet_status === filterStatus
    const typeMatch = filterFleetType === 'all' || fleet.fleet_type === filterFleetType
    const regionMatch = filterRegion === 'all' || fleet.deployment_regions.includes(filterRegion)
    const searchMatch = searchTerm === '' || 
      fleet.fleet_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fleet.fleet_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return statusMatch && typeMatch && regionMatch && searchMatch
  })

  const filteredInstances = instances.filter(instance => {
    const statusMatch = filterStatus === 'all' || instance.status === filterStatus
    const regionMatch = filterRegion === 'all' || instance.deployment_info.region === filterRegion
    const searchMatch = searchTerm === '' || 
      instance.instance_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      instance.agent_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return statusMatch && regionMatch && searchMatch
  })

  const globalMetrics = {
    totalFleets: fleets.length,
    totalInstances: instances.length,
    runningInstances: instances.filter(i => i.status === 'running').length,
    activeOperations: operations.filter(o => o.status === 'in_progress').length,
    avgCpuUtilization: Math.round(instances.reduce((sum, i) => sum + i.resource_usage.cpu_usage, 0) / instances.length),
    totalDailyCost: fleets.reduce((sum, f) => sum + f.cost_metrics.daily_cost, 0)
  }

  const fleetPerformanceData = fleets.map(fleet => ({
    name: fleet.fleet_name,
    throughput: fleet.performance_metrics.total_throughput,
    response_time: fleet.performance_metrics.avg_response_time,
    success_rate: fleet.performance_metrics.success_rate,
    utilization: fleet.capacity_metrics.utilization_percentage
  }))

  const costBreakdownData = fleets.map(fleet => ({
    name: fleet.fleet_name,
    cost: fleet.cost_metrics.daily_cost,
    instances: fleet.total_agents
  }))

  const resourceUtilizationData = instances.map(instance => ({
    name: instance.instance_name,
    cpu: instance.resource_usage.cpu_usage,
    memory: instance.resource_usage.memory_usage,
    storage: instance.resource_usage.storage_usage,
    network: instance.resource_usage.network_io
  }))

  const operationStatusData = operations.reduce((acc, op) => {
    acc[op.status] = (acc[op.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const operationChartData = Object.entries(operationStatusData).map(([status, count]) => ({
    status,
    count
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Truck className="w-6 h-6" />
            Agent Fleet Management
          </h2>
          <p className="text-muted mt-1">Deploy, scale, and manage agent fleets across environments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn ${autoRefresh ? 'btn-primary' : 'btn-outline'}`}
          >
            <Radio className={`w-4 h-4 ${autoRefresh ? 'animate-pulse' : ''}`} />
            Auto-refresh
          </button>
          
          <button
            onClick={fetchFleetData}
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
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalFleets}</span>
          </div>
          <h4 className="font-semibold text-primary">Active Fleets</h4>
          <p className="text-sm text-muted">Deployed fleets</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Server className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalInstances}</span>
          </div>
          <h4 className="font-semibold text-primary">Total Instances</h4>
          <p className="text-sm text-muted">{globalMetrics.runningInstances} running</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.activeOperations}</span>
          </div>
          <h4 className="font-semibold text-primary">Active Operations</h4>
          <p className="text-sm text-muted">In progress</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Cpu className="w-5 h-5 text-orange-600" />
            </div>
            <span className={`text-2xl font-bold ${getUtilizationColor(globalMetrics.avgCpuUtilization)}`}>
              {globalMetrics.avgCpuUtilization}%
            </span>
          </div>
          <h4 className="font-semibold text-primary">Avg CPU Usage</h4>
          <p className="text-sm text-muted">Fleet average</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-teal-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-2xl font-bold text-primary">
              {Math.round(fleets.reduce((sum, f) => sum + f.performance_metrics.total_throughput, 0))}
            </span>
          </div>
          <h4 className="font-semibold text-primary">Total Throughput</h4>
          <p className="text-sm text-muted">Requests/min</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-2xl font-bold text-primary">${globalMetrics.totalDailyCost.toFixed(0)}</span>
          </div>
          <h4 className="font-semibold text-primary">Daily Cost</h4>
          <p className="text-sm text-muted">All fleets</p>
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
                { key: 'overview', label: 'Overview', icon: BarChart3 },
                { key: 'fleets', label: 'Fleets', icon: Truck },
                { key: 'instances', label: 'Instances', icon: Server },
                { key: 'operations', label: 'Operations', icon: Activity },
                { key: 'templates', label: 'Templates', icon: Copy }
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

          {/* Display Mode */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDisplayMode('grid')}
              className={`btn btn-sm ${displayMode === 'grid' ? 'btn-primary' : 'btn-outline'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('list')}
              className={`btn btn-sm ${displayMode === 'list' ? 'btn-primary' : 'btn-outline'}`}
            >
              <List className="w-4 h-4" />
            </button>
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
              placeholder="Search fleets/instances..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm w-56"
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
              <option value="healthy">Healthy</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <select
            value={filterFleetType}
            onChange={(e) => setFilterFleetType(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-md text-sm"
          >
            <option value="all">All Types</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
            <option value="emergency">Emergency</option>
            <option value="specialized">Specialized</option>
          </select>

          <select
            value={filterRegion}
            onChange={(e) => setFilterRegion(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-md text-sm"
          >
            <option value="all">All Regions</option>
            <option value="us-east-1">US East 1</option>
            <option value="us-west-2">US West 2</option>
            <option value="eu-west-1">EU West 1</option>
            <option value="ap-southeast-1">AP Southeast 1</option>
          </select>
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Fleet Performance Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Fleet Performance Overview</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={fleetPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="throughput" fill="#10b981" name="Throughput" />
                  <Line yAxisId="right" type="monotone" dataKey="success_rate" stroke="#3b82f6" name="Success Rate %" />
                  <Line yAxisId="right" type="monotone" dataKey="utilization" stroke="#ef4444" name="Utilization %" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cost Breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Daily Cost Breakdown</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costBreakdownData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="cost"
                      label={({ name, cost }) => `${name}: $${cost.toFixed(0)}`}
                    >
                      {costBreakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Resource Utilization */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Resource Utilization Heatmap</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={resourceUtilizationData.slice(0, 20)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cpu" name="CPU Usage" unit="%" />
                    <YAxis dataKey="memory" name="Memory Usage" unit="%" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm">CPU: {data.cpu}%</p>
                              <p className="text-sm">Memory: {data.memory}%</p>
                              <p className="text-sm">Storage: {data.storage}%</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter dataKey="memory" fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fleets View */}
      {viewMode === 'fleets' && (
        <div className="space-y-6">
          {displayMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredFleets.map(fleet => (
                <div key={fleet.fleet_id} className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getFleetTypeIcon(fleet.fleet_type)}
                      <div>
                        <h3 className="font-semibold text-primary">{fleet.fleet_name}</h3>
                        <p className="text-sm text-muted">{fleet.fleet_type}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getFleetStatusIcon(fleet.fleet_status)}
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getFleetStatusColor(fleet.fleet_status)}`}>
                        {fleet.fleet_status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{fleet.active_agents}</div>
                      <div className="text-sm text-muted">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{fleet.total_agents}</div>
                      <div className="text-sm text-muted">Total</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getUtilizationColor(fleet.capacity_metrics.utilization_percentage)}`}>
                        {fleet.capacity_metrics.utilization_percentage}%
                      </div>
                      <div className="text-sm text-muted">Utilization</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">${fleet.cost_metrics.daily_cost.toFixed(0)}</div>
                      <div className="text-sm text-muted">Daily Cost</div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Success Rate:</span>
                      <span className="font-medium text-primary">{fleet.performance_metrics.success_rate}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Avg Response:</span>
                      <span className="font-medium text-primary">{fleet.performance_metrics.avg_response_time}ms</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Throughput:</span>
                      <span className="font-medium text-primary">{fleet.performance_metrics.total_throughput} req/min</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedFleet(fleet)}
                      className="btn btn-outline btn-sm flex-1"
                    >
                      <Eye className="w-3 h-3" />
                      Details
                    </button>
                    
                    <button
                      onClick={() => scaleFleet(fleet.fleet_id, 'up')}
                      className="btn btn-outline btn-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => scaleFleet(fleet.fleet_id, 'down')}
                      className="btn btn-outline btn-sm"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    
                    <button
                      onClick={() => executeFleetOperation('restart', fleet.fleet_id)}
                      className="btn btn-outline btn-sm"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 font-semibold text-primary">Fleet</th>
                      <th className="text-left p-4 font-semibold text-primary">Type</th>
                      <th className="text-left p-4 font-semibold text-primary">Status</th>
                      <th className="text-left p-4 font-semibold text-primary">Instances</th>
                      <th className="text-left p-4 font-semibold text-primary">Utilization</th>
                      <th className="text-left p-4 font-semibold text-primary">Performance</th>
                      <th className="text-left p-4 font-semibold text-primary">Cost</th>
                      <th className="text-left p-4 font-semibold text-primary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFleets.map(fleet => (
                      <tr key={fleet.fleet_id} className="border-b border-border hover:bg-gray-50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {getFleetTypeIcon(fleet.fleet_type)}
                            <div>
                              <div className="font-semibold text-primary">{fleet.fleet_name}</div>
                              <div className="text-sm text-muted">{fleet.deployment_regions.join(', ')}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {fleet.fleet_type}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getFleetStatusColor(fleet.fleet_status)}`}>
                            {fleet.fleet_status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium text-primary">{fleet.active_agents} / {fleet.total_agents}</div>
                            <div className="text-muted">{fleet.idle_agents} idle</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`font-medium ${getUtilizationColor(fleet.capacity_metrics.utilization_percentage)}`}>
                            {fleet.capacity_metrics.utilization_percentage}%
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium text-primary">{fleet.performance_metrics.success_rate}% success</div>
                            <div className="text-muted">{fleet.performance_metrics.avg_response_time}ms avg</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div className="font-medium text-primary">${fleet.cost_metrics.daily_cost.toFixed(0)}/day</div>
                            <div className="text-muted">${fleet.cost_metrics.cost_per_request.toFixed(4)}/req</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedFleet(fleet)}
                              className="btn btn-outline btn-xs"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => scaleFleet(fleet.fleet_id, 'up')}
                              className="btn btn-outline btn-xs"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => scaleFleet(fleet.fleet_id, 'down')}
                              className="btn btn-outline btn-xs"
                            >
                              <Minus className="w-3 h-3" />
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
          )}
        </div>
      )}

      {/* Instances View */}
      {viewMode === 'instances' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInstances.map(instance => (
              <div key={instance.instance_id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" />
                    <span className="font-medium text-primary text-sm">{instance.instance_name}</span>
                  </div>
                  {getInstanceStatusIcon(instance.status)}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Region:</span>
                    <span className="font-medium text-primary">{instance.deployment_info.region}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Type:</span>
                    <span className="font-medium text-primary">{instance.deployment_info.instance_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Health:</span>
                    <span className={`font-medium ${instance.health_status.health_score >= 80 ? 'text-green-600' : instance.health_status.health_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {instance.health_status.health_score}%
                    </span>
                  </div>
                </div>

                {/* Resource Usage Bars */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">CPU</span>
                      <span className="text-primary">{instance.resource_usage.cpu_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${getUtilizationColor(instance.resource_usage.cpu_usage)} bg-current`}
                        style={{ width: `${instance.resource_usage.cpu_usage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted">Memory</span>
                      <span className="text-primary">{instance.resource_usage.memory_usage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${getUtilizationColor(instance.resource_usage.memory_usage)} bg-current`}
                        style={{ width: `${instance.resource_usage.memory_usage}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedInstance(instance)}
                    className="btn btn-outline btn-xs flex-1"
                  >
                    <Eye className="w-3 h-3" />
                    Details
                  </button>
                  
                  {instance.status === 'running' ? (
                    <button
                      onClick={() => executeInstanceAction(instance.instance_id, 'stop')}
                      className="btn btn-outline btn-xs"
                    >
                      <Square className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => executeInstanceAction(instance.instance_id, 'start')}
                      className="btn btn-primary btn-xs"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => executeInstanceAction(instance.instance_id, 'restart')}
                    className="btn btn-outline btn-xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operations View */}
      {viewMode === 'operations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Active Operations</h3>
                <div className="space-y-4">
                  {operations.filter(op => op.status === 'in_progress' || op.status === 'pending').map(operation => (
                    <div key={operation.operation_id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Activity className="w-5 h-5 text-primary" />
                          <div>
                            <h4 className="font-semibold text-primary">{operation.operation_type}</h4>
                            <p className="text-sm text-muted">{operation.operation_details.description}</p>
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          operation.status === 'in_progress' ? 'text-blue-600 bg-blue-100' :
                          operation.status === 'pending' ? 'text-yellow-600 bg-yellow-100' :
                          operation.status === 'completed' ? 'text-green-600 bg-green-100' :
                          'text-red-600 bg-red-100'
                        }`}>
                          {operation.status}
                        </span>
                      </div>

                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted">Progress</span>
                          <span className="text-sm font-medium text-primary">{operation.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${operation.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted">Started:</span>
                          <p className="font-medium text-primary">{new Date(operation.started_at).toLocaleTimeString()}</p>
                        </div>
                        <div>
                          <span className="text-muted">ETA:</span>
                          <p className="font-medium text-primary">{operation.estimated_completion}</p>
                        </div>
                        <div>
                          <span className="text-muted">Affected:</span>
                          <p className="font-medium text-primary">{operation.affected_instances} instances</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Operation Status</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={operationChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        label={({ status, count }) => `${status}: ${count}`}
                      >
                        {operationChartData.map((entry, index) => (
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
        </div>
      )}

      {/* Templates View */}
      {viewMode === 'templates' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Fleet Templates</h3>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map(template => (
              <div key={template.template_id} className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Copy className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-primary">{template.template_name}</h4>
                    <p className="text-sm text-muted">{template.template_type}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Agent Type:</span>
                    <span className="font-medium text-primary">{template.configuration.agent_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Instance Type:</span>
                    <span className="font-medium text-primary">{template.configuration.instance_type}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Strategy:</span>
                    <span className="font-medium text-primary">{template.deployment_strategy.strategy_type}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deployFleetFromTemplate(template.template_id, {})}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    <Zap className="w-3 h-3" />
                    Deploy
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Fleet Details Modal */}
      {selectedFleet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {getFleetTypeIcon(selectedFleet.fleet_type)}
                <div>
                  <h3 className="text-xl font-bold text-primary">{selectedFleet.fleet_name}</h3>
                  <p className="text-muted">{selectedFleet.fleet_type} fleet</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedFleet(null)}
                className="text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Fleet Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Performance</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedFleet.performance_metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                        <span className="font-medium text-primary">{typeof value === 'number' ? value : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Capacity</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedFleet.capacity_metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                        <span className="font-medium text-primary">{typeof value === 'number' ? value : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Cost</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedFleet.cost_metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                        <span className="font-medium text-primary">{typeof value === 'number' && key.includes('cost') ? `$${value.toFixed(2)}` : String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fleet Actions */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => scaleFleet(selectedFleet.fleet_id, 'up')}
                  className="btn btn-primary"
                >
                  <Plus className="w-4 h-4" />
                  Scale Up
                </button>
                <button
                  onClick={() => scaleFleet(selectedFleet.fleet_id, 'down')}
                  className="btn btn-outline"
                >
                  <Minus className="w-4 h-4" />
                  Scale Down
                </button>
                <button
                  onClick={() => executeFleetOperation('restart', selectedFleet.fleet_id)}
                  className="btn btn-outline"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restart Fleet
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

      {/* Selected Instance Details Modal */}
      {selectedInstance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <Server className="w-6 h-6 text-primary" />
                <div>
                  <h3 className="text-xl font-bold text-primary">{selectedInstance.instance_name}</h3>
                  <p className="text-muted">{selectedInstance.agent_type}</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedInstance(null)}
                className="text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Instance Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Deployment Info</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedInstance.deployment_info).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                        <span className="font-medium text-primary">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Resource Usage</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedInstance.resource_usage).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          <span className="text-primary">{value}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getUtilizationColor(value as number)} bg-current`}
                            style={{ width: `${Math.min(value as number, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Instance Actions */}
              <div className="flex items-center gap-3">
                {selectedInstance.status === 'running' ? (
                  <button
                    onClick={() => {
                      executeInstanceAction(selectedInstance.instance_id, 'stop')
                      setSelectedInstance(null)
                    }}
                    className="btn btn-outline"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      executeInstanceAction(selectedInstance.instance_id, 'start')
                      setSelectedInstance(null)
                    }}
                    className="btn btn-primary"
                  >
                    <Play className="w-4 h-4" />
                    Start
                  </button>
                )}
                
                <button
                  onClick={() => {
                    executeInstanceAction(selectedInstance.instance_id, 'restart')
                    setSelectedInstance(null)
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