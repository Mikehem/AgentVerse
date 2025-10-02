'use client'

import { useState, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Settings, 
  Activity, 
  Cpu, 
  Memory, 
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Server,
  GitCommit
} from 'lucide-react'

interface Agent {
  id: string
  name: string
  version: string
  status: 'running' | 'paused' | 'stopped' | 'deploying' | 'error'
  deployment_status: 'deployed' | 'pending' | 'failed' | 'stopping'
  health_status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
  performance: {
    cpu_usage: number
    memory_usage: number
    response_time: number
    success_rate: number
    requests_per_minute: number
  }
  resource_limits: {
    max_cpu: number
    max_memory: number
    max_requests: number
  }
  deployment_config: {
    environment: string
    replicas: number
    auto_scaling: boolean
    health_check_url: string
  }
  last_deployed: string
  uptime: number
}

interface AgentDeploymentPanelProps {
  agent: Agent
  onStatusChange: (agentId: string, status: string) => void
  onConfigUpdate: (agentId: string, config: any) => void
}

export function AgentDeploymentPanel({ agent, onStatusChange, onConfigUpdate }: AgentDeploymentPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [metrics, setMetrics] = useState(agent.performance)
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([])

  // Real-time metrics updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/v1/agents/${agent.id}/metrics`)
        const data = await response.json()
        if (data.success) {
          setMetrics(data.metrics)
        }
      } catch (error) {
        console.error('Failed to fetch agent metrics:', error)
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [agent.id])

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/agents/${agent.id}/${newStatus}`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        onStatusChange(agent.id, newStatus)
        // Fetch deployment logs
        if (newStatus === 'deploy') {
          fetchDeploymentLogs()
        }
      } else {
        console.error('Failed to change agent status:', data.error)
      }
    } catch (error) {
      console.error('Error changing agent status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchDeploymentLogs = async () => {
    try {
      const response = await fetch(`/api/v1/agents/${agent.id}/deployment-logs`)
      const data = await response.json()
      if (data.success) {
        setDeploymentLogs(data.logs)
      }
    } catch (error) {
      console.error('Failed to fetch deployment logs:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'paused':
        return <Pause className="w-5 h-5 text-yellow-600" />
      case 'stopped':
        return <Square className="w-5 h-5 text-gray-600" />
      case 'deploying':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'unhealthy': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  const formatUptime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  return (
    <div className="space-y-6">
      {/* Agent Status Header */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {getStatusIcon(agent.status)}
            <div>
              <h3 className="text-lg font-semibold text-primary">{agent.name}</h3>
              <p className="text-sm text-muted">Version {agent.version} • Uptime: {formatUptime(agent.uptime)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              agent.health_status === 'healthy' 
                ? 'bg-green-100 text-green-700'
                : agent.health_status === 'degraded'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {agent.health_status}
            </span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-3">
          {agent.status === 'running' ? (
            <button
              onClick={() => handleStatusChange('pause')}
              disabled={isLoading}
              className="btn btn-outline"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange('deploy')}
              disabled={isLoading}
              className="btn btn-primary"
            >
              <Play className="w-4 h-4" />
              {agent.status === 'stopped' ? 'Start' : 'Resume'}
            </button>
          )}
          
          <button
            onClick={() => handleStatusChange('stop')}
            disabled={isLoading}
            className="btn btn-outline text-red-600 hover:bg-red-50"
          >
            <Square className="w-4 h-4" />
            Stop
          </button>
          
          <button
            onClick={() => handleStatusChange('restart')}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn btn-outline"
          >
            <Settings className="w-4 h-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cpu className="w-5 h-5 text-blue-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.cpu_usage > 80 ? 'text-red-600' : 
              metrics.cpu_usage > 60 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.cpu_usage}%
            </span>
          </div>
          <h4 className="font-semibold text-primary">CPU Usage</h4>
          <p className="text-sm text-muted">Limit: {agent.resource_limits.max_cpu}%</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Memory className="w-5 h-5 text-purple-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.memory_usage > 80 ? 'text-red-600' : 
              metrics.memory_usage > 60 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.memory_usage}%
            </span>
          </div>
          <h4 className="font-semibold text-primary">Memory Usage</h4>
          <p className="text-sm text-muted">Limit: {agent.resource_limits.max_memory}MB</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.response_time > 2000 ? 'text-red-600' : 
              metrics.response_time > 1000 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.response_time}ms
            </span>
          </div>
          <h4 className="font-semibold text-primary">Response Time</h4>
          <p className="text-sm text-muted">Avg last hour</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className={`text-sm font-medium ${
              metrics.success_rate < 95 ? 'text-red-600' : 
              metrics.success_rate < 98 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {metrics.success_rate}%
            </span>
          </div>
          <h4 className="font-semibold text-primary">Success Rate</h4>
          <p className="text-sm text-muted">{metrics.requests_per_minute} req/min</p>
        </div>
      </div>

      {/* Deployment Configuration */}
      {showConfig && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Deployment Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Environment</label>
              <select className="w-full px-3 py-2 border border-border rounded-md">
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Replicas</label>
              <input 
                type="number" 
                min="1" 
                max="10" 
                defaultValue={agent.deployment_config.replicas}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Max CPU (%)</label>
              <input 
                type="number" 
                min="10" 
                max="100" 
                defaultValue={agent.resource_limits.max_cpu}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Max Memory (MB)</label>
              <input 
                type="number" 
                min="512" 
                max="8192" 
                defaultValue={agent.resource_limits.max_memory}
                className="w-full px-3 py-2 border border-border rounded-md"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  defaultChecked={agent.deployment_config.auto_scaling}
                  className="rounded border-border"
                />
                <span className="text-sm font-medium text-primary">Enable Auto-scaling</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button className="btn btn-outline">
              Cancel
            </button>
            <button className="btn btn-primary">
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* Deployment Logs */}
      {deploymentLogs.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-primary mb-4">Deployment Logs</h3>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
            {deploymentLogs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}