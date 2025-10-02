'use client'

import { useState, useEffect } from 'react'
import { 
  Target,
  Strategy,
  MapPin,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Settings,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Download,
  Save,
  Edit3,
  Plus,
  Minus,
  Copy,
  Filter,
  Search,
  Eye,
  Calendar,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Globe,
  Network,
  Users,
  Activity,
  Layers,
  GitBranch,
  Route,
  Compass,
  Navigation,
  Map,
  Crosshair,
  Radar,
  Radio,
  Gauge,
  Database,
  Cloud,
  Server,
  Cpu,
  Memory,
  HardDrive,
  Wifi,
  Wind,
  Sun,
  Moon,
  Star,
  Workflow,
  GitMerge,
  Command,
  Maximize2,
  Calculator,
  Brain,
  Lightbulb,
  Puzzle,
  Layers3,
  TreePine
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, ComposedChart, Area, Scatter, ScatterChart, Treemap, Sankey } from 'recharts'

interface DeploymentStrategy {
  strategy_id: string
  strategy_name: string
  strategy_type: 'regional' | 'workload_based' | 'cost_optimized' | 'performance_focused' | 'hybrid' | 'disaster_recovery'
  description: string
  target_metrics: {
    availability_target: number
    latency_target: number
    cost_target: number
    throughput_target: number
    efficiency_target: number
  }
  deployment_configuration: {
    regions: string[]
    instance_types: string[]
    scaling_policies: Record<string, any>
    load_balancing: Record<string, any>
    failover_strategy: Record<string, any>
  }
  resource_allocation: {
    min_agents: number
    max_agents: number
    initial_deployment: number
    scaling_thresholds: Record<string, number>
    resource_limits: Record<string, number>
  }
  cost_analysis: {
    estimated_monthly_cost: number
    cost_breakdown: Record<string, number>
    cost_optimization_recommendations: string[]
  }
  risk_assessment: {
    risk_level: 'low' | 'medium' | 'high' | 'critical'
    risk_factors: string[]
    mitigation_strategies: string[]
    compliance_requirements: string[]
  }
  performance_predictions: {
    expected_latency: number
    expected_throughput: number
    expected_availability: number
    bottleneck_analysis: string[]
  }
  status: 'draft' | 'approved' | 'deployed' | 'active' | 'deprecated'
  created_at: string
  last_updated: string
}

interface DeploymentScenario {
  scenario_id: string
  scenario_name: string
  scenario_type: 'what_if' | 'stress_test' | 'disaster_simulation' | 'capacity_planning'
  parameters: {
    traffic_multiplier: number
    failure_simulation: string[]
    resource_constraints: Record<string, number>
    external_factors: Record<string, any>
  }
  results: {
    projected_performance: Record<string, number>
    cost_impact: number
    resource_utilization: Record<string, number>
    failure_points: string[]
    recommendations: string[]
  }
  confidence_level: number
  last_run: string
}

interface RegionAnalysis {
  region_id: string
  region_name: string
  geographical_data: {
    continent: string
    country: string
    timezone: string
    coordinates: { lat: number; lng: number }
  }
  market_analysis: {
    user_density: number
    demand_patterns: Record<string, number>
    growth_projections: Record<string, number>
    competition_analysis: Record<string, any>
  }
  infrastructure_analysis: {
    available_instance_types: string[]
    network_connectivity: Record<string, number>
    reliability_metrics: Record<string, number>
    cost_factors: Record<string, number>
  }
  compliance_requirements: {
    data_residency: boolean
    regulatory_frameworks: string[]
    security_requirements: string[]
    audit_requirements: string[]
  }
  deployment_recommendation: {
    suitability_score: number
    recommended_deployment_size: number
    priority_level: number
    estimated_impact: Record<string, number>
  }
}

interface DeploymentTemplate {
  template_id: string
  template_name: string
  template_category: 'enterprise' | 'startup' | 'government' | 'healthcare' | 'financial' | 'retail'
  use_case: string
  architecture_pattern: 'microservices' | 'monolithic' | 'serverless' | 'hybrid' | 'edge_computing'
  configuration: {
    recommended_regions: string[]
    instance_configurations: Record<string, any>
    scaling_configuration: Record<string, any>
    monitoring_setup: Record<string, any>
  }
  benefits: string[]
  limitations: string[]
  estimated_setup_time: string
  complexity_level: 'low' | 'medium' | 'high' | 'expert'
}

interface AgentDeploymentStrategyPlannerProps {
  projectId: string
}

export function AgentDeploymentStrategyPlanner({ projectId }: AgentDeploymentStrategyPlannerProps) {
  const [strategies, setStrategies] = useState<DeploymentStrategy[]>([])
  const [scenarios, setScenarios] = useState<DeploymentScenario[]>([])
  const [regionAnalyses, setRegionAnalyses] = useState<RegionAnalysis[]>([])
  const [templates, setTemplates] = useState<DeploymentTemplate[]>([])
  
  const [selectedStrategy, setSelectedStrategy] = useState<DeploymentStrategy | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<DeploymentScenario | null>(null)
  const [viewMode, setViewMode] = useState<'strategies' | 'scenarios' | 'regions' | 'templates' | 'planner'>('planner')
  const [plannerStep, setPlannerStep] = useState(1)
  const [showCreateStrategy, setShowCreateStrategy] = useState(false)
  const [showScenarioResults, setShowScenarioResults] = useState(false)
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterComplexity, setFilterComplexity] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [optimizationGoal, setOptimizationGoal] = useState<'cost' | 'performance' | 'reliability' | 'balanced'>('balanced')

  useEffect(() => {
    fetchStrategyData()
  }, [projectId])

  const fetchStrategyData = async () => {
    setIsLoading(true)
    try {
      const [strategiesRes, scenariosRes, regionsRes, templatesRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-strategies`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-scenarios`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/region-analysis`),
        fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-templates`)
      ])

      const [strategiesData, scenariosData, regionsData, templatesData] = await Promise.all([
        strategiesRes.json(),
        scenariosRes.json(),
        regionsRes.json(),
        templatesRes.json()
      ])

      if (strategiesData.success) setStrategies(strategiesData.strategies)
      if (scenariosData.success) setScenarios(scenariosData.scenarios)
      if (regionsData.success) setRegionAnalyses(regionsData.regions)
      if (templatesData.success) setTemplates(templatesData.templates)
    } catch (error) {
      console.error('Failed to fetch strategy data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createStrategy = async (strategyConfig: any) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-strategies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(strategyConfig)
      })
      const data = await response.json()
      if (data.success) {
        fetchStrategyData()
        setShowCreateStrategy(false)
      }
    } catch (error) {
      console.error('Failed to create strategy:', error)
    }
  }

  const runScenario = async (scenarioId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-scenarios/${scenarioId}/run`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchStrategyData()
        setShowScenarioResults(true)
      }
    } catch (error) {
      console.error('Failed to run scenario:', error)
    }
  }

  const optimizeStrategy = async (strategyId: string, optimizationGoal: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-strategies/${strategyId}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: optimizationGoal })
      })
      const data = await response.json()
      if (data.success) {
        fetchStrategyData()
      }
    } catch (error) {
      console.error('Failed to optimize strategy:', error)
    }
  }

  const deployStrategy = async (strategyId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/agent-ops/deployment-strategies/${strategyId}/deploy`, {
        method: 'POST'
      })
      const data = await response.json()
      if (data.success) {
        fetchStrategyData()
      }
    } catch (error) {
      console.error('Failed to deploy strategy:', error)
    }
  }

  const getStrategyTypeIcon = (type: string) => {
    switch (type) {
      case 'regional': return <Globe className="w-4 h-4" />
      case 'workload_based': return <Activity className="w-4 h-4" />
      case 'cost_optimized': return <TrendingDown className="w-4 h-4" />
      case 'performance_focused': return <TrendingUp className="w-4 h-4" />
      case 'hybrid': return <GitMerge className="w-4 h-4" />
      case 'disaster_recovery': return <Shield className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getStrategyStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100'
      case 'approved': return 'text-blue-600 bg-blue-100'
      case 'deployed': return 'text-purple-600 bg-purple-100'
      case 'active': return 'text-green-600 bg-green-100'
      case 'deprecated': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getComplexityColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-orange-600'
      case 'expert': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const filteredStrategies = strategies.filter(strategy => {
    const searchMatch = searchTerm === '' || 
      strategy.strategy_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      strategy.strategy_type.toLowerCase().includes(searchTerm.toLowerCase())
    
    return searchMatch
  })

  const filteredTemplates = templates.filter(template => {
    const categoryMatch = filterCategory === 'all' || template.template_category === filterCategory
    const complexityMatch = filterComplexity === 'all' || template.complexity_level === filterComplexity
    const searchMatch = searchTerm === '' || 
      template.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.use_case.toLowerCase().includes(searchTerm.toLowerCase())
    
    return categoryMatch && complexityMatch && searchMatch
  })

  const strategyTypeData = strategies.reduce((acc, strategy) => {
    acc[strategy.strategy_type] = (acc[strategy.strategy_type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const strategyChartData = Object.entries(strategyTypeData).map(([type, count]) => ({
    type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count
  }))

  const regionSuitabilityData = regionAnalyses.map(region => ({
    name: region.region_name,
    suitability: region.deployment_recommendation.suitability_score,
    cost: region.infrastructure_analysis.cost_factors.compute || 0,
    demand: region.market_analysis.user_density,
    reliability: region.infrastructure_analysis.reliability_metrics.uptime || 0
  }))

  const costComparisonData = strategies.map(strategy => ({
    name: strategy.strategy_name,
    cost: strategy.cost_analysis.estimated_monthly_cost,
    performance: strategy.performance_predictions.expected_throughput,
    risk: strategy.risk_assessment.risk_level === 'low' ? 25 : 
          strategy.risk_assessment.risk_level === 'medium' ? 50 :
          strategy.risk_assessment.risk_level === 'high' ? 75 : 100
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Target className="w-6 h-6" />
            Agent Deployment Strategy Planner
          </h2>
          <p className="text-muted mt-1">Plan, optimize, and deploy intelligent agent distribution strategies</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateStrategy(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Create Strategy
          </button>
          
          <button
            onClick={fetchStrategyData}
            disabled={isLoading}
            className="btn btn-outline"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
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
                { key: 'planner', label: 'Planner', icon: Brain },
                { key: 'strategies', label: 'Strategies', icon: Target },
                { key: 'scenarios', label: 'Scenarios', icon: Activity },
                { key: 'regions', label: 'Regions', icon: Globe },
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

          {/* Optimization Goal */}
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted" />
            <select
              value={optimizationGoal}
              onChange={(e) => setOptimizationGoal(e.target.value as any)}
              className="px-3 py-1.5 border border-border rounded-md text-sm"
            >
              <option value="balanced">Balanced</option>
              <option value="cost">Cost Optimized</option>
              <option value="performance">Performance Focused</option>
              <option value="reliability">Reliability First</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search strategies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm w-56"
            />
          </div>

          {/* Filters for Templates */}
          {viewMode === 'templates' && (
            <>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 border border-border rounded-md text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="startup">Startup</option>
                  <option value="government">Government</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="financial">Financial</option>
                  <option value="retail">Retail</option>
                </select>
              </div>

              <select
                value={filterComplexity}
                onChange={(e) => setFilterComplexity(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-md text-sm"
              >
                <option value="all">All Complexity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="expert">Expert</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Interactive Strategy Planner */}
      {viewMode === 'planner' && (
        <div className="space-y-6">
          {/* Step Progress */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary">Deployment Strategy Wizard</h3>
              <div className="flex items-center gap-2 text-sm text-muted">
                Step {plannerStep} of 5
              </div>
            </div>

            <div className="flex items-center mb-6">
              {[1, 2, 3, 4, 5].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= plannerStep ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {step}
                  </div>
                  {step < 5 && (
                    <div className={`w-16 h-1 ${
                      step < plannerStep ? 'bg-primary' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {plannerStep === 1 && (
              <div className="space-y-6">
                <h4 className="font-semibold text-primary">Step 1: Define Your Requirements</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Primary Goal</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>Cost Optimization</option>
                        <option>Maximum Performance</option>
                        <option>High Availability</option>
                        <option>Global Coverage</option>
                        <option>Compliance First</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Expected Traffic Volume</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>Low (< 1K requests/day)</option>
                        <option>Medium (1K - 100K requests/day)</option>
                        <option>High (100K - 1M requests/day)</option>
                        <option>Very High (> 1M requests/day)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Budget Range (Monthly)</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>$0 - $1,000</option>
                        <option>$1,000 - $10,000</option>
                        <option>$10,000 - $50,000</option>
                        <option>$50,000+</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Latency Requirements</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>< 100ms (Ultra-low latency)</option>
                        <option>< 500ms (Low latency)</option>
                        <option>< 1000ms (Standard)</option>
                        <option>< 2000ms (Relaxed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Availability Target</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>99.9% (Standard)</option>
                        <option>99.95% (High)</option>
                        <option>99.99% (Critical)</option>
                        <option>99.999% (Mission Critical)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Compliance Requirements</label>
                      <div className="space-y-2">
                        {['GDPR', 'HIPAA', 'SOC2', 'PCI DSS', 'FedRAMP'].map(compliance => (
                          <label key={compliance} className="flex items-center gap-2">
                            <input type="checkbox" className="rounded border-border" />
                            <span className="text-sm text-primary">{compliance}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {plannerStep === 2 && (
              <div className="space-y-6">
                <h4 className="font-semibold text-primary">Step 2: Select Target Regions</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h5 className="font-medium text-primary mb-3">Region Recommendations</h5>
                    <div className="space-y-3">
                      {regionAnalyses.slice(0, 6).map(region => (
                        <div key={region.region_id} className="border border-border rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <input type="checkbox" className="rounded border-border" />
                              <span className="font-medium text-primary">{region.region_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted">Score:</span>
                              <span className={`font-medium ${
                                region.deployment_recommendation.suitability_score >= 80 ? 'text-green-600' :
                                region.deployment_recommendation.suitability_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {region.deployment_recommendation.suitability_score}%
                              </span>
                            </div>
                          </div>
                          <div className="text-xs text-muted">
                            {region.geographical_data.continent} • {region.geographical_data.country}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-primary mb-3">Regional Suitability Analysis</h5>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={regionSuitabilityData.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="suitability" fill="#10b981" name="Suitability Score" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {plannerStep === 3 && (
              <div className="space-y-6">
                <h4 className="font-semibold text-primary">Step 3: Configure Resources</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Instance Type</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>t3.micro (1 vCPU, 1GB RAM)</option>
                        <option>t3.small (2 vCPU, 2GB RAM)</option>
                        <option>t3.medium (2 vCPU, 4GB RAM)</option>
                        <option>t3.large (2 vCPU, 8GB RAM)</option>
                        <option>c5.large (2 vCPU, 4GB RAM, CPU Optimized)</option>
                        <option>m5.large (2 vCPU, 8GB RAM, Balanced)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Initial Deployment Size</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="100" 
                        defaultValue="3"
                        className="w-full px-3 py-2 border border-border rounded-md"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Auto-scaling Configuration</label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-muted">Min instances:</label>
                          <input type="number" min="1" defaultValue="2" className="w-20 px-2 py-1 border border-border rounded text-sm" />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-muted">Max instances:</label>
                          <input type="number" min="1" defaultValue="20" className="w-20 px-2 py-1 border border-border rounded text-sm" />
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-muted">Scale up threshold:</label>
                          <input type="number" min="50" max="100" defaultValue="75" className="w-20 px-2 py-1 border border-border rounded text-sm" />
                          <span className="text-xs text-muted">% CPU</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4">
                    <h5 className="font-medium text-primary mb-3">Resource Estimation</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Total vCPUs:</span>
                        <span className="font-medium text-primary">6</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Total Memory:</span>
                        <span className="font-medium text-primary">12 GB</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Estimated Cost:</span>
                        <span className="font-medium text-primary">$120/month</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Expected Throughput:</span>
                        <span className="font-medium text-primary">10K req/min</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {plannerStep === 4 && (
              <div className="space-y-6">
                <h4 className="font-semibold text-primary">Step 4: Deployment Strategy</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Deployment Pattern</label>
                      <div className="space-y-2">
                        {[
                          { id: 'rolling', name: 'Rolling Deployment', desc: 'Gradual replacement of instances' },
                          { id: 'blue_green', name: 'Blue-Green Deployment', desc: 'Parallel environment switching' },
                          { id: 'canary', name: 'Canary Deployment', desc: 'Progressive traffic shifting' },
                          { id: 'recreate', name: 'Recreate', desc: 'Stop all, then start new' }
                        ].map(pattern => (
                          <label key={pattern.id} className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input type="radio" name="deployment_pattern" value={pattern.id} className="mt-1" />
                            <div>
                              <div className="font-medium text-primary">{pattern.name}</div>
                              <div className="text-sm text-muted">{pattern.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Load Balancing Strategy</label>
                      <select className="w-full px-3 py-2 border border-border rounded-md">
                        <option>Round Robin</option>
                        <option>Least Connections</option>
                        <option>Weighted Round Robin</option>
                        <option>Geographic Routing</option>
                        <option>Latency-based Routing</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Failover Configuration</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" defaultChecked />
                          <span className="text-sm text-primary">Enable automatic failover</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" defaultChecked />
                          <span className="text-sm text-primary">Cross-region backup</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" />
                          <span className="text-sm text-primary">Health check automation</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Monitoring & Alerting</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" defaultChecked />
                          <span className="text-sm text-primary">Performance monitoring</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" defaultChecked />
                          <span className="text-sm text-primary">Error tracking</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-border" />
                          <span className="text-sm text-primary">Cost monitoring</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {plannerStep === 5 && (
              <div className="space-y-6">
                <h4 className="font-semibold text-primary">Step 5: Review & Deploy</h4>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card p-4">
                    <h5 className="font-medium text-primary mb-3">Strategy Summary</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Strategy Type:</span>
                        <span className="font-medium text-primary">Performance Focused</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Regions:</span>
                        <span className="font-medium text-primary">3 regions</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Initial Instances:</span>
                        <span className="font-medium text-primary">9 instances</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Deployment Pattern:</span>
                        <span className="font-medium text-primary">Rolling</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted">Estimated Cost:</span>
                        <span className="font-medium text-primary">$360/month</span>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4">
                    <h5 className="font-medium text-primary mb-3">Risk Assessment</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Overall Risk Level:</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Medium</span>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-primary mb-2">Risk Factors:</div>
                        <ul className="space-y-1 text-muted">
                          <li>• Multi-region complexity</li>
                          <li>• Higher infrastructure costs</li>
                          <li>• Cross-region latency</li>
                        </ul>
                      </div>
                      <div className="text-sm">
                        <div className="font-medium text-primary mb-2">Mitigation:</div>
                        <ul className="space-y-1 text-muted">
                          <li>• Automated failover configured</li>
                          <li>• Health monitoring enabled</li>
                          <li>• Rollback plan defined</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card p-4">
                  <h5 className="font-medium text-primary mb-3">Deployment Timeline</h5>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm text-primary font-medium">Phase 1: Infrastructure Setup (5-10 minutes)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-primary font-medium">Phase 2: Agent Deployment (10-15 minutes)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-primary font-medium">Phase 3: Health Verification (2-5 minutes)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-primary font-medium">Phase 4: Traffic Routing (1-2 minutes)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6 border-t border-border">
              <button
                onClick={() => setPlannerStep(Math.max(1, plannerStep - 1))}
                disabled={plannerStep === 1}
                className="btn btn-outline"
              >
                Previous
              </button>
              
              {plannerStep < 5 ? (
                <button
                  onClick={() => setPlannerStep(Math.min(5, plannerStep + 1))}
                  className="btn btn-primary"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={() => {
                    // Create and deploy strategy
                    const strategyConfig = {
                      strategy_name: 'Wizard Generated Strategy',
                      strategy_type: 'performance_focused',
                      optimization_goal: optimizationGoal
                    }
                    createStrategy(strategyConfig)
                  }}
                  className="btn btn-primary"
                >
                  <Zap className="w-4 h-4" />
                  Deploy Strategy
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Strategies View */}
      {viewMode === 'strategies' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Strategy Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={strategyChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ type, count }) => `${type}: ${count}`}
                    >
                      {strategyChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Cost vs Performance Analysis</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={costComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="cost" name="Monthly Cost" unit="$" />
                    <YAxis dataKey="performance" name="Throughput" />
                    <Tooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload
                          return (
                            <div className="bg-white p-3 border border-border rounded-lg shadow-lg">
                              <p className="font-semibold">{data.name}</p>
                              <p className="text-sm">Cost: ${data.cost}</p>
                              <p className="text-sm">Performance: {data.performance}</p>
                              <p className="text-sm">Risk: {data.risk}%</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter dataKey="performance" fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStrategies.map(strategy => (
              <div key={strategy.strategy_id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {getStrategyTypeIcon(strategy.strategy_type)}
                    <div>
                      <h3 className="font-semibold text-primary">{strategy.strategy_name}</h3>
                      <p className="text-sm text-muted">{strategy.strategy_type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStrategyStatusColor(strategy.status)}`}>
                    {strategy.status}
                  </span>
                </div>

                <p className="text-sm text-muted mb-4">{strategy.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">${strategy.cost_analysis.estimated_monthly_cost}</div>
                    <div className="text-xs text-muted">Monthly Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{strategy.performance_predictions.expected_availability}%</div>
                    <div className="text-xs text-muted">Availability</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{strategy.performance_predictions.expected_latency}ms</div>
                    <div className="text-xs text-muted">Latency</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${getRiskLevelColor(strategy.risk_assessment.risk_level).split(' ')[0]}`}>
                      {strategy.risk_assessment.risk_level.toUpperCase()}
                    </div>
                    <div className="text-xs text-muted">Risk Level</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedStrategy(strategy)}
                    className="btn btn-outline btn-sm flex-1"
                  >
                    <Eye className="w-3 h-3" />
                    Details
                  </button>
                  
                  {strategy.status === 'approved' && (
                    <button
                      onClick={() => deployStrategy(strategy.strategy_id)}
                      className="btn btn-primary btn-sm"
                    >
                      <Zap className="w-3 h-3" />
                      Deploy
                    </button>
                  )}
                  
                  <button
                    onClick={() => optimizeStrategy(strategy.strategy_id, optimizationGoal)}
                    className="btn btn-outline btn-sm"
                  >
                    <Target className="w-3 h-3" />
                    Optimize
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scenarios View */}
      {viewMode === 'scenarios' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">What-If Scenarios</h3>
            <button className="btn btn-primary">
              <Plus className="w-4 h-4" />
              Create Scenario
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {scenarios.map(scenario => (
              <div key={scenario.scenario_id} className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-primary">{scenario.scenario_name}</h4>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {scenario.scenario_type.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Traffic Multiplier:</span>
                    <span className="font-medium text-primary">{scenario.parameters.traffic_multiplier}x</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Confidence Level:</span>
                    <span className="font-medium text-primary">{scenario.confidence_level}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Last Run:</span>
                    <span className="font-medium text-primary">{new Date(scenario.last_run).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runScenario(scenario.scenario_id)}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    <Play className="w-3 h-3" />
                    Run Scenario
                  </button>
                  <button
                    onClick={() => setSelectedScenario(scenario)}
                    className="btn btn-outline btn-sm"
                  >
                    <Eye className="w-3 h-3" />
                    Results
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regions View */}
      {viewMode === 'regions' && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Regional Deployment Analysis</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionSuitabilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="suitability" fill="#10b981" name="Suitability Score" />
                  <Bar dataKey="demand" fill="#3b82f6" name="User Demand" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {regionAnalyses.map(region => (
              <div key={region.region_id} className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-primary">{region.region_name}</h4>
                    <p className="text-sm text-muted">{region.geographical_data.continent}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Suitability:</span>
                    <span className={`font-medium ${
                      region.deployment_recommendation.suitability_score >= 80 ? 'text-green-600' :
                      region.deployment_recommendation.suitability_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {region.deployment_recommendation.suitability_score}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">User Density:</span>
                    <span className="font-medium text-primary">{region.market_analysis.user_density}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Recommended Size:</span>
                    <span className="font-medium text-primary">{region.deployment_recommendation.recommended_deployment_size}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-muted">Compliance:</div>
                  <div className="flex flex-wrap gap-1">
                    {region.compliance_requirements.regulatory_frameworks.slice(0, 3).map(framework => (
                      <span key={framework} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {framework}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Templates View */}
      {viewMode === 'templates' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <div key={template.template_id} className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Copy className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-semibold text-primary">{template.template_name}</h4>
                    <p className="text-sm text-muted">{template.template_category}</p>
                  </div>
                </div>

                <p className="text-sm text-muted mb-4">{template.use_case}</p>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Architecture:</span>
                    <span className="font-medium text-primary">{template.architecture_pattern.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Complexity:</span>
                    <span className={`font-medium ${getComplexityColor(template.complexity_level)}`}>
                      {template.complexity_level}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Setup Time:</span>
                    <span className="font-medium text-primary">{template.estimated_setup_time}</span>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="text-xs text-muted">Benefits:</div>
                  <ul className="text-xs text-primary space-y-1">
                    {template.benefits.slice(0, 3).map((benefit, index) => (
                      <li key={index}>• {benefit}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      // Use template to start wizard
                      setPlannerStep(1)
                      setViewMode('planner')
                    }}
                    className="btn btn-primary btn-sm flex-1"
                  >
                    <Zap className="w-3 h-3" />
                    Use Template
                  </button>
                  <button className="btn btn-outline btn-sm">
                    <Eye className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Strategy Details Modal */}
      {selectedStrategy && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                {getStrategyTypeIcon(selectedStrategy.strategy_type)}
                <div>
                  <h3 className="text-xl font-bold text-primary">{selectedStrategy.strategy_name}</h3>
                  <p className="text-muted">{selectedStrategy.description}</p>
                </div>
              </div>
              
              <button
                onClick={() => setSelectedStrategy(null)}
                className="text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Strategy Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Target Metrics</h4>
                  <div className="space-y-2">
                    {Object.entries(selectedStrategy.target_metrics).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                        <span className="font-medium text-primary">{value}{key.includes('target') ? '%' : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Cost Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Monthly Cost:</span>
                      <span className="font-medium text-primary">${selectedStrategy.cost_analysis.estimated_monthly_cost}</span>
                    </div>
                    {Object.entries(selectedStrategy.cost_analysis.cost_breakdown).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium text-primary">${value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card p-4">
                  <h4 className="font-semibold text-primary mb-3">Risk Assessment</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted">Risk Level:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskLevelColor(selectedStrategy.risk_assessment.risk_level)}`}>
                        {selectedStrategy.risk_assessment.risk_level}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div className="text-muted mb-1">Risk Factors:</div>
                      <ul className="space-y-1">
                        {selectedStrategy.risk_assessment.risk_factors.slice(0, 3).map((factor, index) => (
                          <li key={index} className="text-xs text-primary">• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deployment Configuration */}
              <div className="card p-4">
                <h4 className="font-semibold text-primary mb-3">Deployment Configuration</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted mb-2">Target Regions:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStrategy.deployment_configuration.regions.map(region => (
                        <span key={region} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {region}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted mb-2">Instance Types:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedStrategy.deployment_configuration.instance_types.map(type => (
                        <span key={type} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {selectedStrategy.status === 'approved' && (
                  <button
                    onClick={() => {
                      deployStrategy(selectedStrategy.strategy_id)
                      setSelectedStrategy(null)
                    }}
                    className="btn btn-primary"
                  >
                    <Zap className="w-4 h-4" />
                    Deploy Strategy
                  </button>
                )}
                
                <button
                  onClick={() => {
                    optimizeStrategy(selectedStrategy.strategy_id, optimizationGoal)
                    setSelectedStrategy(null)
                  }}
                  className="btn btn-outline"
                >
                  <Target className="w-4 h-4" />
                  Optimize
                </button>
                
                <button className="btn btn-outline">
                  <Copy className="w-4 h-4" />
                  Clone Strategy
                </button>
                
                <button className="btn btn-outline">
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}