'use client'

import { useState, useEffect } from 'react'
import { 
  MapPin, 
  Radar, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Navigation, 
  Layers,
  Activity,
  Zap,
  Globe,
  Crosshair,
  RotateCcw,
  Maximize2,
  Minimize2,
  Filter,
  Settings,
  Download,
  RefreshCw,
  Search,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  Radio,
  Satellite,
  Map as MapIcon,
  Route,
  Compass,
  Gauge,
  Network,
  Database,
  Cloud,
  Server,
  Cpu,
  Eye,
  EyeOff,
  Grid3X3,
  List
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, ScatterPlot, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Treemap, ComposedChart, Area } from 'recharts'

interface GeospatialPosition {
  agent_id: string
  agent_name: string
  coordinates: { lat: number; lng: number }
  region: string
  zone: string
  datacenter: string
  coverage_radius: number
  optimal_position: { lat: number; lng: number }
  position_score: number
  distance_from_optimal: number
}

interface CoverageArea {
  region_id: string
  region_name: string
  boundaries: { lat: number; lng: number }[]
  coverage_percentage: number
  response_time_avg: number
  demand_density: number
  agent_count: number
  uncovered_areas: { lat: number; lng: number; severity: number }[]
}

interface PositionMetrics {
  agent_id: string
  agent_name: string
  positioning_efficiency: number
  load_distribution_score: number
  response_coverage_score: number
  redundancy_score: number
  collaboration_score: number
  strategic_value: number
  optimization_potential: number
  recommended_actions: string[]
}

interface TrafficFlow {
  from_region: string
  to_region: string
  request_volume: number
  avg_latency: number
  peak_hours: number[]
  flow_intensity: 'low' | 'medium' | 'high' | 'critical'
}

interface OptimizationRecommendation {
  type: 'relocation' | 'scaling' | 'load_balancing' | 'new_deployment'
  priority: 'low' | 'medium' | 'high' | 'critical'
  agent_id?: string
  current_position?: { lat: number; lng: number }
  recommended_position?: { lat: number; lng: number }
  expected_improvement: number
  implementation_cost: number
  description: string
  impact_analysis: {
    performance_gain: number
    cost_reduction: number
    coverage_improvement: number
    risk_level: number
  }
}

interface AgentPositionAnalyticsProps {
  projectId: string
  agents: any[]
}

export function AgentPositionAnalytics({ projectId, agents }: AgentPositionAnalyticsProps) {
  const [positions, setPositions] = useState<GeospatialPosition[]>([])
  const [coverageAreas, setCoverageAreas] = useState<CoverageArea[]>([])
  const [positionMetrics, setPositionMetrics] = useState<PositionMetrics[]>([])
  const [trafficFlows, setTrafficFlows] = useState<TrafficFlow[]>([])
  const [optimizationRecommendations, setOptimizationRecommendations] = useState<OptimizationRecommendation[]>([])
  
  const [viewMode, setViewMode] = useState<'heatmap' | 'coverage' | 'flows' | 'metrics' | 'optimization'>('heatmap')
  const [mapStyle, setMapStyle] = useState<'satellite' | 'terrain' | 'hybrid'>('hybrid')
  const [timeRange, setTimeRange] = useState('24h')
  const [selectedRegion, setSelectedRegion] = useState('all')
  const [showOptimalPositions, setShowOptimalPositions] = useState(true)
  const [showCoverageGaps, setShowCoverageGaps] = useState(true)
  const [showTrafficFlows, setShowTrafficFlows] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fullscreenMap, setFullscreenMap] = useState(false)

  useEffect(() => {
    fetchPositionData()
  }, [projectId, timeRange])

  const fetchPositionData = async () => {
    setIsLoading(true)
    try {
      const [positionsRes, coverageRes, metricsRes, flowsRes, recommendationsRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/agent-ops/positions/geospatial?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/coverage-analysis?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/position-metrics?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/traffic-flows?timeRange=${timeRange}`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/optimization-recommendations`)
      ])

      const [positionsData, coverageData, metricsData, flowsData, recommendationsData] = await Promise.all([
        positionsRes.json(),
        coverageRes.json(),
        metricsRes.json(),
        flowsRes.json(),
        recommendationsRes.json()
      ])

      if (positionsData.success) setPositions(positionsData.positions)
      if (coverageData.success) setCoverageAreas(coverageData.coverage_areas)
      if (metricsData.success) setPositionMetrics(metricsData.metrics)
      if (flowsData.success) setTrafficFlows(flowsData.flows)
      if (recommendationsData.success) setOptimizationRecommendations(recommendationsData.recommendations)
    } catch (error) {
      console.error('Failed to fetch position data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const optimizePositions = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/optimize-positions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeRange, optimization_type: 'global' })
      })
      const data = await response.json()
      if (data.success) {
        fetchPositionData()
      }
    } catch (error) {
      console.error('Failed to optimize positions:', error)
    }
  }

  const implementRecommendation = async (recommendationId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/recommendations/${recommendationId}/implement`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchPositionData()
      }
    } catch (error) {
      console.error('Failed to implement recommendation:', error)
    }
  }

  const exportAnalysis = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/position-analysis/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          timeRange,
          include_maps: true,
          include_recommendations: true,
          format: 'pdf'
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agent-position-analysis-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to export analysis:', error)
    }
  }

  const getPositionScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const getCoverageColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-green-500'
    if (percentage >= 85) return 'bg-yellow-500'
    if (percentage >= 70) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getFlowIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low': return 'stroke-green-400'
      case 'medium': return 'stroke-yellow-400'
      case 'high': return 'stroke-orange-400'
      case 'critical': return 'stroke-red-400'
      default: return 'stroke-gray-400'
    }
  }

  const filteredPositions = selectedRegion === 'all' 
    ? positions 
    : positions.filter(p => p.region === selectedRegion)

  const globalMetrics = {
    avgPositionScore: Math.round(positions.reduce((sum, p) => sum + p.position_score, 0) / positions.length),
    totalCoverage: Math.round(coverageAreas.reduce((sum, c) => sum + c.coverage_percentage, 0) / coverageAreas.length),
    optimalPositions: positions.filter(p => p.distance_from_optimal < 10).length,
    criticalGaps: coverageAreas.reduce((sum, c) => sum + c.uncovered_areas.filter(u => u.severity > 0.8).length, 0)
  }

  const positionEfficiencyData = positionMetrics.map(metric => ({
    name: metric.agent_name,
    efficiency: metric.positioning_efficiency,
    coverage: metric.response_coverage_score,
    collaboration: metric.collaboration_score,
    strategic_value: metric.strategic_value
  }))

  const coverageAnalysisData = coverageAreas.map(area => ({
    region: area.region_name,
    coverage: area.coverage_percentage,
    agents: area.agent_count,
    response_time: area.response_time_avg,
    demand: area.demand_density
  }))

  const optimizationImpactData = optimizationRecommendations.map(rec => ({
    type: rec.type,
    priority: rec.priority,
    improvement: rec.expected_improvement,
    cost: rec.implementation_cost,
    performance_gain: rec.impact_analysis.performance_gain,
    cost_reduction: rec.impact_analysis.cost_reduction
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className={`space-y-6 ${fullscreenMap ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <MapPin className="w-6 h-6" />
            Agent Position Analytics & Mapping
          </h2>
          <p className="text-muted mt-1">Geospatial analysis and optimization of agent positioning</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={optimizePositions}
            className="btn btn-primary"
          >
            <Target className="w-4 h-4" />
            Optimize Positions
          </button>
          
          <button
            onClick={exportAnalysis}
            className="btn btn-outline"
          >
            <Download className="w-4 h-4" />
            Export Analysis
          </button>
          
          <button
            onClick={() => setFullscreenMap(!fullscreenMap)}
            className="btn btn-outline"
          >
            {fullscreenMap ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {fullscreenMap ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
          
          <button
            onClick={fetchPositionData}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <span className={`text-2xl font-bold ${getPositionScoreColor(globalMetrics.avgPositionScore)}`}>
              {globalMetrics.avgPositionScore}
            </span>
          </div>
          <h4 className="font-semibold text-primary">Avg Position Score</h4>
          <p className="text-sm text-muted">Overall positioning efficiency</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Radar className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.totalCoverage}%</span>
          </div>
          <h4 className="font-semibold text-primary">Total Coverage</h4>
          <p className="text-sm text-muted">Geographic coverage</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.optimalPositions}</span>
          </div>
          <h4 className="font-semibold text-primary">Optimal Positions</h4>
          <p className="text-sm text-muted">Agents in ideal locations</p>
        </div>

        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-bold text-primary">{globalMetrics.criticalGaps}</span>
          </div>
          <h4 className="font-semibold text-primary">Critical Gaps</h4>
          <p className="text-sm text-muted">High-severity coverage gaps</p>
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
                { key: 'heatmap', label: 'Heatmap', icon: Gauge },
                { key: 'coverage', label: 'Coverage', icon: Radar },
                { key: 'flows', label: 'Traffic Flows', icon: Route },
                { key: 'metrics', label: 'Metrics', icon: BarChart3 },
                { key: 'optimization', label: 'Optimization', icon: Target }
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

          {/* Map Style */}
          <div className="flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-muted" />
            <select
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as any)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              <option value="satellite">Satellite</option>
              <option value="terrain">Terrain</option>
              <option value="hybrid">Hybrid</option>
            </select>
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
              <option value="30d">Last 30 Days</option>
            </select>
          </div>

          {/* Region Filter */}
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted" />
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              <option value="all">All Regions</option>
              {Array.from(new Set(positions.map(p => p.region))).map(region => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </div>

          {/* Display Options */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowOptimalPositions(!showOptimalPositions)}
              className={`btn btn-sm ${showOptimalPositions ? 'btn-primary' : 'btn-outline'}`}
            >
              <Target className="w-3 h-3" />
              Optimal
            </button>
            
            <button
              onClick={() => setShowCoverageGaps(!showCoverageGaps)}
              className={`btn btn-sm ${showCoverageGaps ? 'btn-primary' : 'btn-outline'}`}
            >
              <AlertTriangle className="w-3 h-3" />
              Gaps
            </button>
            
            <button
              onClick={() => setShowTrafficFlows(!showTrafficFlows)}
              className={`btn btn-sm ${showTrafficFlows ? 'btn-primary' : 'btn-outline'}`}
            >
              <Route className="w-3 h-3" />
              Flows
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Interactive Map */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-primary">
              {viewMode === 'heatmap' && 'Position Efficiency Heatmap'}
              {viewMode === 'coverage' && 'Coverage Analysis Map'}
              {viewMode === 'flows' && 'Traffic Flow Visualization'}
              {viewMode === 'metrics' && 'Performance Metrics Map'}
              {viewMode === 'optimization' && 'Optimization Opportunities'}
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Style:</span>
              <span className="text-sm font-medium text-primary capitalize">{mapStyle}</span>
            </div>
          </div>

          {/* Simulated Interactive Map */}
          <div className={`relative rounded-lg overflow-hidden ${fullscreenMap ? 'h-[calc(100vh-300px)]' : 'h-96'}`} 
               style={{
                 background: mapStyle === 'satellite' 
                   ? 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #60a5fa 100%)'
                   : mapStyle === 'terrain'
                   ? 'linear-gradient(135deg, #065f46 0%, #10b981 30%, #84cc16 60%, #fbbf24 100%)'
                   : 'linear-gradient(135deg, #374151 0%, #6b7280 30%, #10b981 60%, #3b82f6 100%)'
               }}>
            
            {/* Map Grid */}
            <div className="absolute inset-0 opacity-10">
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Agent Positions */}
            {filteredPositions.map((position, index) => (
              <div key={position.agent_id} className="absolute group">
                {/* Agent Marker */}
                <div
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer`}
                  style={{
                    left: `${20 + (index % 8) * 10}%`,
                    top: `${20 + Math.floor(index / 8) * 15}%`
                  }}
                >
                  <div className={`w-4 h-4 rounded-full border-2 border-white shadow-lg ${
                    position.position_score >= 90 ? 'bg-green-500' :
                    position.position_score >= 75 ? 'bg-yellow-500' :
                    position.position_score >= 60 ? 'bg-orange-500' : 'bg-red-500'
                  } animate-pulse`}>
                  </div>
                  
                  {/* Coverage Radius */}
                  {viewMode === 'coverage' && (
                    <div 
                      className="absolute border border-white border-opacity-30 rounded-full"
                      style={{
                        width: `${position.coverage_radius}px`,
                        height: `${position.coverage_radius}px`,
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: getCoverageColor(position.position_score).replace('bg-', 'rgba(').replace('-500', ', 0.1)')
                      }}
                    />
                  )}

                  {/* Optimal Position Indicator */}
                  {showOptimalPositions && position.distance_from_optimal > 10 && (
                    <div
                      className="absolute w-3 h-3 border-2 border-dashed border-green-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${Math.random() * 20 - 10}px`,
                        top: `${Math.random() * 20 - 10}px`
                      }}
                    />
                  )}

                  {/* Agent Info Tooltip */}
                  <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-56 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                    <div className="text-sm space-y-1">
                      <div className="font-semibold text-primary">{position.agent_name}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Position Score:</span>
                        <span className={`font-medium ${getPositionScoreColor(position.position_score)}`}>
                          {position.position_score}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Region:</span>
                        <span className="font-medium text-primary">{position.region}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Coverage:</span>
                        <span className="font-medium text-primary">{position.coverage_radius}km</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Distance from Optimal:</span>
                        <span className="font-medium text-primary">{position.distance_from_optimal}km</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Coverage Gaps */}
            {showCoverageGaps && viewMode === 'coverage' && coverageAreas.map((area, areaIndex) => 
              area.uncovered_areas.map((gap, gapIndex) => (
                <div
                  key={`${areaIndex}-${gapIndex}`}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${30 + (gapIndex % 6) * 12}%`,
                    top: `${40 + Math.floor(gapIndex / 6) * 20}%`
                  }}
                >
                  <div className={`w-3 h-3 rounded-full ${
                    gap.severity > 0.8 ? 'bg-red-400' :
                    gap.severity > 0.6 ? 'bg-orange-400' :
                    gap.severity > 0.4 ? 'bg-yellow-400' : 'bg-gray-400'
                  } animate-pulse opacity-70`} />
                </div>
              ))
            )}

            {/* Traffic Flows */}
            {showTrafficFlows && viewMode === 'flows' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {trafficFlows.slice(0, 8).map((flow, index) => (
                  <g key={index}>
                    <path
                      d={`M ${20 + (index % 4) * 20}% ${30 + Math.floor(index / 4) * 30}% Q ${50}% ${20}% ${80 - (index % 4) * 15}% ${60 - Math.floor(index / 4) * 20}%`}
                      stroke={getFlowIntensityColor(flow.flow_intensity).replace('stroke-', '')}
                      strokeWidth={flow.flow_intensity === 'critical' ? 4 : flow.flow_intensity === 'high' ? 3 : 2}
                      fill="none"
                      strokeDasharray={flow.flow_intensity === 'low' ? "5,5" : "none"}
                      opacity={0.7}
                    />
                    <circle
                      cx={`${20 + (index % 4) * 20}%`}
                      cy={`${30 + Math.floor(index / 4) * 30}%`}
                      r="3"
                      fill={getFlowIntensityColor(flow.flow_intensity).replace('stroke-', '')}
                    />
                  </g>
                ))}
              </svg>
            )}

            {/* Map Legend */}
            <div className="absolute top-4 left-4 bg-white bg-opacity-95 rounded-lg p-3">
              <h4 className="font-semibold text-primary mb-2">Legend</h4>
              <div className="space-y-1 text-xs">
                {viewMode === 'heatmap' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span>Excellent (90%+)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span>Good (75-89%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                      <span>Fair (60-74%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span>Poor (<60%)</span>
                    </div>
                  </>
                )}
                
                {viewMode === 'coverage' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>Agent Position</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-dashed border-green-400 rounded-full"></div>
                      <span>Optimal Position</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                      <span>Coverage Gap</span>
                    </div>
                  </>
                )}
                
                {viewMode === 'flows' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-green-400"></div>
                      <span>Low Traffic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1 bg-yellow-400"></div>
                      <span>Medium Traffic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-1.5 bg-orange-400"></div>
                      <span>High Traffic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-2 bg-red-400"></div>
                      <span>Critical Traffic</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 space-y-2">
              <button className="btn btn-outline btn-sm bg-white">
                <Plus className="w-4 h-4" />
              </button>
              <button className="btn btn-outline btn-sm bg-white">
                <Minus className="w-4 h-4" />
              </button>
              <button className="btn btn-outline btn-sm bg-white">
                <Compass className="w-4 h-4" />
              </button>
              <button className="btn btn-outline btn-sm bg-white">
                <Navigation className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Analytics Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position Efficiency Chart */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Position Efficiency Analysis</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterPlot data={positionEfficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="efficiency" name="Position Efficiency" unit="%" />
                  <YAxis dataKey="coverage" name="Coverage Score" unit="%" />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
                            <p className="font-semibold">{data.name}</p>
                            <p className="text-sm">Efficiency: {data.efficiency}%</p>
                            <p className="text-sm">Coverage: {data.coverage}%</p>
                            <p className="text-sm">Strategic Value: {data.strategic_value}%</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter dataKey="coverage" fill="#3b82f6" />
                </ScatterPlot>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Coverage Analysis */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Regional Coverage Analysis</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageAnalysisData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="region" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="coverage" fill="#10b981" name="Coverage %" />
                  <Bar dataKey="agents" fill="#3b82f6" name="Agent Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Optimization Recommendations */}
        {viewMode === 'optimization' && (
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Optimization Recommendations</h3>
            
            <div className="space-y-4">
              {optimizationRecommendations.slice(0, 6).map((recommendation, index) => (
                <div key={index} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        recommendation.priority === 'critical' ? 'bg-red-100' :
                        recommendation.priority === 'high' ? 'bg-orange-100' :
                        recommendation.priority === 'medium' ? 'bg-yellow-100' : 'bg-blue-100'
                      }`}>
                        {recommendation.type === 'relocation' && <Navigation className="w-4 h-4 text-primary" />}
                        {recommendation.type === 'scaling' && <Zap className="w-4 h-4 text-primary" />}
                        {recommendation.type === 'load_balancing' && <Network className="w-4 h-4 text-primary" />}
                        {recommendation.type === 'new_deployment' && <Plus className="w-4 h-4 text-primary" />}
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-primary capitalize">
                          {recommendation.type.replace('_', ' ')}
                        </h4>
                        <p className="text-sm text-muted">{recommendation.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        recommendation.priority === 'critical' ? 'text-red-600 bg-red-100' :
                        recommendation.priority === 'high' ? 'text-orange-600 bg-orange-100' :
                        recommendation.priority === 'medium' ? 'text-yellow-600 bg-yellow-100' :
                        'text-blue-600 bg-blue-100'
                      }`}>
                        {recommendation.priority} priority
                      </span>
                      
                      <button
                        onClick={() => implementRecommendation(`rec_${index}`)}
                        className="btn btn-primary btn-sm"
                      >
                        Implement
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">+{recommendation.impact_analysis.performance_gain}%</div>
                      <div className="text-sm text-muted">Performance</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">-{recommendation.impact_analysis.cost_reduction}%</div>
                      <div className="text-sm text-muted">Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">+{recommendation.impact_analysis.coverage_improvement}%</div>
                      <div className="text-sm text-muted">Coverage</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        recommendation.impact_analysis.risk_level < 30 ? 'text-green-600' :
                        recommendation.impact_analysis.risk_level < 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {recommendation.impact_analysis.risk_level}%
                      </div>
                      <div className="text-sm text-muted">Risk</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Metrics Mode - Detailed Position Metrics */}
        {viewMode === 'metrics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Position Metrics Distribution</h3>
              <div className="space-y-4">
                {positionMetrics.slice(0, 8).map(metric => (
                  <div key={metric.agent_id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-primary">{metric.agent_name}</span>
                      <span className={`text-sm font-medium ${getPositionScoreColor(metric.positioning_efficiency)}`}>
                        {metric.positioning_efficiency}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-muted">Load Distribution</div>
                        <div className="font-medium text-primary">{metric.load_distribution_score}%</div>
                      </div>
                      <div>
                        <div className="text-muted">Collaboration</div>
                        <div className="font-medium text-primary">{metric.collaboration_score}%</div>
                      </div>
                      <div>
                        <div className="text-muted">Strategic Value</div>
                        <div className="font-medium text-primary">{metric.strategic_value}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Optimization Impact Analysis</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={optimizationImpactData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="improvement" fill="#10b981" name="Expected Improvement %" />
                    <Line type="monotone" dataKey="cost" stroke="#ef4444" name="Implementation Cost" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}