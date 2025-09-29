'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Play, Pause, BarChart3, Users, MessageSquare, Zap, TrendingUp, Activity, Clock, CheckCircle, XCircle, AlertCircle, ArrowRight, Plus, Brain, Code, Wrench, Copy, Check, Search, LayoutGrid, List, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Tag, Eye, ExternalLink, Database, TestTube, Star, Trash2, DollarSign, Calculator, Filter, Download, GitBranch, FileText, MoreHorizontal, X, Edit } from 'lucide-react'
import { projectApi, agentApi, runApi, conversationApi } from '@/lib/api'
import { Project, Agent, Run } from '@/lib/types'
import { AgentCreationForm } from '@/components/agents/AgentCreationForm'
import { ConversationsDashboard } from '@/components/conversations/ConversationsDashboard'
import { ConversationThread } from '@/components/conversations/ConversationThread'
import { ConversationSpanDetail } from '@/components/conversations/ConversationSpanDetail'
import { ConversationSearch } from '@/components/conversations/ConversationSearch'
import { TraceFeedback } from '@/components/traces/TraceFeedback'
import { CostAnalyticsChart } from '@/components/traces/CostAnalyticsChart'
import { ProjectPrompts } from '@/components/prompts/ProjectPrompts'
import { ProjectConversations } from '@/components/projects/ProjectConversations'
import { ConversationMetrics, ConversationTableRow, ConversationFilter, SpanData, TraceData, ConversationStatus } from '@/types/agent-lens'
import { SpanTimeline } from '@/components/spans/SpanTimeline'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedProjectId, setCopiedProjectId] = useState(false)
  
  // Initialize project loading directly with params
  useEffect(() => {
    let isMounted = true
    let projectId: string | null = null

    const initializeProject = async () => {
      try {
        const resolvedParams = await params
        if (!isMounted) return
        
        projectId = resolvedParams.id
        setLoading(true)
        
        const response = await projectApi.getById(projectId)
        if (!isMounted) return
        
        if (response.success && response.data) {
          setProject(response.data)
        } else {
          console.error('Failed to load project:', response.error)
          router.push('/')
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Exception loading project:', error)
        router.push('/')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeProject()

    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array - run only once on mount

  const handleCopyProjectId = async (projectId: string) => {
    try {
      await navigator.clipboard.writeText(projectId)
      setCopiedProjectId(true)
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedProjectId(false), 2000)
    } catch (error) {
      console.error('Failed to copy project ID:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = projectId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedProjectId(true)
      setTimeout(() => setCopiedProjectId(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-primary mb-4">Project not found</p>
          <button 
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'agents', name: 'Agents', icon: Users },
    { id: 'prompts', name: 'Prompts', icon: FileText },
    { id: 'metrics', name: 'Metrics', icon: TrendingUp },
    { id: 'traces', name: 'Traces', icon: Activity },
    { id: 'conversations', name: 'Conversations', icon: MessageSquare },
    { id: 'datasets', name: 'Datasets', icon: Database },
    { id: 'evaluations', name: 'Evaluations', icon: TestTube },
    { id: 'experiments', name: 'Experiments', icon: Zap },
    { id: 'settings', name: 'Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-light">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-accent-alpha rounded-md transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                  <Zap className={`w-5 h-5 text-${project.color}`} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-primary">{project.name}</h1>
                  <p className="text-sm text-muted">{project.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted">Project ID:</span>
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">{project.id}</code>
                    <button
                      onClick={() => handleCopyProjectId(project.id)}
                      className="p-1 hover:bg-accent-alpha rounded transition-colors"
                      title={copiedProjectId ? "Copied!" : "Copy Project ID"}
                    >
                      {copiedProjectId ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted hover:text-primary" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-success/20 text-success' 
                  : project.status === 'warning'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-error/20 text-error'
              }`}>
                {project.status}
              </div>
              
              <button className="btn btn-outline">
                <Play className="w-4 h-4" />
                Deploy
              </button>
              
              <button className="btn btn-primary">
                <Settings className="w-4 h-4" />
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-primary hover:border-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <ProjectOverview project={project} />
        )}
        {activeTab === 'agents' && (
          <ProjectAgents project={project} onNavigateToPrompts={() => setActiveTab('prompts')} />
        )}
        {activeTab === 'prompts' && (
          <ProjectPrompts project={project} />
        )}
        {activeTab === 'conversations' && (
          <ProjectConversations project={project} />
        )}
        {activeTab === 'datasets' && (
          <ProjectDatasets project={project} />
        )}
        {activeTab === 'evaluations' && (
          <ProjectEvaluations project={project} />
        )}
        {activeTab === 'experiments' && (
          <ProjectExperiments project={project} />
        )}
        {activeTab === 'metrics' && (
          <ProjectMetrics project={project} />
        )}
        {activeTab === 'traces' && (
          <ProjectTraces project={project} />
        )}
        {activeTab === 'settings' && (
          <ProjectSettings project={project} onUpdate={setProject} />
        )}
      </div>
    </div>
  )
}

// Project Overview Component
function ProjectOverview({ project }: { project: Project }) {
  const [liveMetrics, setLiveMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Fetch live metrics from database
  useEffect(() => {
    const fetchLiveMetrics = async () => {
      try {
        setLoading(true)
        
        // Fetch cost analytics for this project
        const costResponse = await fetch(`/api/v1/cost-analytics?projectId=${project.id}&level=conversation&includeBreakdown=true`)
        const costData = await costResponse.json()
        
        // Fetch conversation count and success rate
        const conversationsResponse = await fetch(`/api/v1/conversations?projectId=${project.id}&limit=1000`)
        const conversationsData = await conversationsResponse.json()
        
        if (costData.success && conversationsData.success) {
          const conversations = conversationsData.data || []
          const successfulConversations = conversations.filter((c: any) => c.status === 'success').length
          const successRate = conversations.length > 0 ? (successfulConversations / conversations.length) * 100 : 0
          
          setLiveMetrics({
            totalCost: costData.analytics?.summary?.totalCost || 0,
            totalTokens: costData.analytics?.summary?.totalTokens || 0,
            avgCostPerConversation: costData.analytics?.summary?.avgCostPerItem || 0,
            conversationCount: conversations.length,
            successRate: successRate,
            costByAgent: costData.analytics?.data?.reduce((acc: any, item: any) => {
              acc[item.agent_id] = (acc[item.agent_id] || 0) + item.total_cost
              return acc
            }, {}) || {}
          })
        }
      } catch (error) {
        console.error('Failed to fetch live metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLiveMetrics()
  }, [project.id])

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{project.agents}</p>
              <p className="text-sm text-muted">Active Agents</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary/10 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-secondary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-secondary">
                {loading ? '...' : (liveMetrics?.conversationCount?.toLocaleString() || project.conversations.toLocaleString())}
              </p>
              <p className="text-sm text-muted">Conversations</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-accent">
                {loading ? '...' : (liveMetrics?.successRate?.toFixed(1) || project.successRate.toFixed(1))}%
              </p>
              <p className="text-sm text-muted">Success Rate</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                ${loading ? '...' : (liveMetrics?.totalCost?.toFixed(4) || '0.0000')}
              </p>
              <p className="text-sm text-muted">Total Cost</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">
                {loading ? '...' : (liveMetrics?.totalTokens?.toLocaleString() || '0')}
              </p>
              <p className="text-sm text-muted">Total Tokens</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Project Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted">Department:</span>
              <span className="text-primary">{project.department || 'Not assigned'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Template:</span>
              <span className="text-primary">{project.template}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Security Level:</span>
              <span className="text-primary">{project.securityLevel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Visibility:</span>
              <span className="text-primary">{project.visibility}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Created:</span>
              <span className="text-primary">{new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Cost Breakdown by Agent</h3>
          {loading ? (
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
              <div className="animate-pulse bg-gray-200 h-4 rounded w-3/4"></div>
              <div className="animate-pulse bg-gray-200 h-4 rounded w-1/2"></div>
            </div>
          ) : liveMetrics?.costByAgent && Object.keys(liveMetrics.costByAgent).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(liveMetrics.costByAgent)
                .sort(([,a], [,b]) => (b as number) - (a as number))
                .slice(0, 5)
                .map(([agentId, cost]) => (
                <div key={agentId} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium">{agentId.replace('agent_', '').replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-sm font-bold text-green-600">${(cost as number).toFixed(4)}</span>
                </div>
              ))}
              {Object.keys(liveMetrics.costByAgent).length > 5 && (
                <div className="text-xs text-muted pt-2 border-t">
                  +{Object.keys(liveMetrics.costByAgent).length - 5} more agents
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted">No cost data available</span>
          )}
        </div>
      </div>

      {/* Performance Metrics Section */}
      {liveMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">Average Cost Per Conversation</h3>
            <div className="text-3xl font-bold text-green-600">
              ${liveMetrics.avgCostPerConversation.toFixed(6)}
            </div>
            <p className="text-sm text-muted mt-2">
              Based on {liveMetrics.conversationCount} conversations
            </p>
          </div>
          
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">Token Efficiency</h3>
            <div className="text-3xl font-bold text-warning">
              {liveMetrics.totalTokens > 0 ? (liveMetrics.totalCost / liveMetrics.totalTokens * 1000).toFixed(6) : '0.000000'}
            </div>
            <p className="text-sm text-muted mt-2">Cost per 1K tokens</p>
          </div>
          
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">Agent Utilization</h3>
            <div className="text-3xl font-bold text-primary">
              {Object.keys(liveMetrics.costByAgent).length}
            </div>
            <p className="text-sm text-muted mt-2">Active agents with cost data</p>
          </div>
        </div>
      )}

      {/* Tags Section */}
      <div className="card p-6">
        <h3 className="font-semibold text-primary mb-4">Project Tags</h3>
        <div className="flex flex-wrap gap-2">
          {project.tags.map((tag, index) => (
            <span 
              key={index}
              className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
            >
              {tag}
            </span>
          ))}
          {project.tags.length === 0 && (
            <span className="text-muted">No tags assigned</span>
          )}
        </div>
      </div>
    </div>
  )
}

// Project Agents Component
function ProjectAgents({ project, onNavigateToPrompts }: { project: Project; onNavigateToPrompts: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [agentPromptLinks, setAgentPromptLinks] = useState<Record<string, any>>({})
  const [prompts, setPrompts] = useState<any[]>([])

  // Load agents for this project
  useEffect(() => {
    if (!project?.id) return

    let isMounted = true

    const loadAgents = async () => {
      if (!isMounted) return
      
      setLoading(true)
      try {
        const response = await agentApi.getAll(project.id)
        if (!isMounted) return
        
        if (response.success && response.data) {
          console.log('✅ Agents loaded successfully:', response.data)
          setAgents(response.data)
        } else {
          console.error('❌ Failed to load agents:', response.error)
          setAgents([])
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Exception loading agents:', error)
        setAgents([])
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadAgents()

    return () => {
      isMounted = false
    }
  }, [project?.id]) // Only re-run when project.id changes

  // Load prompts and agent-prompt links
  useEffect(() => {
    const loadPromptData = async () => {
      if (!project?.id) return
      
      try {
        // Load prompts for this project
        const promptsResponse = await fetch(`/api/v1/prompts?projectId=${project.id}&includeActiveVersion=true`)
        const promptsData = await promptsResponse.json()
        
        if (promptsData.success) {
          setPrompts(promptsData.prompts)
        }

        // Load agent-prompt links
        const linksResponse = await fetch(`/api/v1/agent-prompt-links?projectId=${project.id}`)
        const linksData = await linksResponse.json()
        
        if (linksData.success) {
          const linksMap: Record<string, any> = {}
          linksData.links.forEach((link: any) => {
            linksMap[link.agent_id] = {
              ...link,
              prompt: promptsData.prompts?.find((p: any) => p.id === link.prompt_id)
            }
          })
          setAgentPromptLinks(linksMap)
        }
      } catch (error) {
        console.error('Failed to load prompt data:', error)
      }
    }

    loadPromptData()
  }, [project?.id, agents.length]) // Re-run when agents change

  const loadAgents = async () => {
    if (!project?.id) return
    
    setLoading(true)
    try {
      const response = await agentApi.getAll(project.id)
      if (response.success && response.data) {
        setAgents(response.data)
      } else {
        console.error('Failed to load agents:', response.error)
        setAgents([])
      }
    } catch (error) {
      console.error('Exception loading agents:', error)
      setAgents([])
    } finally {
      setLoading(false)
    }
  }

  const handleAgentCreated = (newAgent: Agent) => {
    setAgents(prev => [...prev, newAgent])
  }

  const handleToggleStatus = async (agentId: string, currentStatus: boolean) => {
    try {
      const response = await agentApi.toggleStatus(agentId, !currentStatus)
      if (response.success && response.data) {
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? response.data! : agent
        ))
      }
    } catch (error) {
      console.error('Failed to toggle agent status:', error)
    }
  }

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      try {
        const response = await agentApi.delete(agentId)
        if (response.success) {
          setAgents(prev => prev.filter(agent => agent.id !== agentId))
        }
      } catch (error) {
        console.error('Failed to delete agent:', error)
      }
    }
  }

  const handleCopyAgentId = async (agentId: string) => {
    try {
      await navigator.clipboard.writeText(agentId)
      setCopiedId(agentId)
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      console.error('Failed to copy agent ID:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = agentId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedId(agentId)
      setTimeout(() => setCopiedId(null), 2000)
    }
  }

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'general': return <Brain className="w-5 h-5" />
      case 'specialist': return <Wrench className="w-5 h-5" />
      case 'orchestrator': return <Code className="w-5 h-5" />
      default: return <Users className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading agents...</p>
        </div>
      </div>
    )
  }

  console.log('🔍 ProjectAgents render - agents.length:', agents.length, 'loading:', loading, 'agents:', agents)

  if (agents.length === 0) {
    console.log('📭 Showing no agents state')
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-primary">Agents</h2>
              <p className="text-muted">No agents configured for this project</p>
            </div>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add First Agent
            </button>
          </div>

          <div className="card p-12 text-center">
            <Users className="w-16 h-16 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-primary mb-2">No Agents Yet</h3>
            <p className="text-muted mb-6">Create your first agent to start building your AI system.</p>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn btn-primary"
            >
              <Plus className="w-4 h-4" />
              Create Agent
            </button>
          </div>
        </div>

        <AgentCreationForm 
          projectId={project.id}
          isOpen={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleAgentCreated}
        />
      </>
    )
  }

  console.log('📋 Showing agents list with', agents.length, 'agents')
  
  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Agents</h2>
            <p className="text-muted">{agents.length} agent{agents.length > 1 ? 's' : ''} configured</p>
          </div>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Agent
          </button>
        </div>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                    {getAgentIcon(agent.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">{agent.name}</h3>
                    <p className="text-sm text-muted capitalize">{agent.type} • {agent.role}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  agent.status === 'active' && agent.isActive
                    ? 'bg-success/20 text-success' 
                    : 'bg-muted/20 text-muted'
                }`}>
                  {agent.isActive ? agent.status : 'inactive'}
                </div>
              </div>

              <p className="text-sm text-muted mb-4">{agent.description}</p>

              {/* Agent Details */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted">Agent ID:</span>
                  <div className="flex items-center gap-2">
                    <code className="text-primary font-mono text-xs bg-primary/10 px-2 py-1 rounded">{agent.id}</code>
                    <button
                      onClick={() => handleCopyAgentId(agent.id)}
                      className="p-1 hover:bg-accent-alpha rounded transition-colors"
                      title={copiedId === agent.id ? "Copied!" : "Copy Agent ID"}
                    >
                      {copiedId === agent.id ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted hover:text-primary" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Model:</span>
                  <span className="text-primary">{agent.model}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Temperature:</span>
                  <span className="text-primary">{agent.temperature}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted">Max Tokens:</span>
                  <span className="text-primary">{agent.maxTokens?.toLocaleString() || 'N/A'}</span>
                </div>
              </div>

              {/* Agent Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{agent.conversations.toLocaleString()}</p>
                  <p className="text-xs text-muted">Conversations</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-secondary">{agent.successRate.toFixed(1)}%</p>
                  <p className="text-xs text-muted">Success Rate</p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="mb-4">
                <p className="text-sm font-medium text-primary mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1">
                  {agent.capabilities.slice(0, 3).map((capability, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-accent/20 text-accent rounded text-xs"
                    >
                      {capability}
                    </span>
                  ))}
                  {agent.capabilities.length > 3 && (
                    <span className="px-2 py-1 bg-muted/20 text-muted rounded text-xs">
                      +{agent.capabilities.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Current Prompt */}
              <div className="mb-4 p-3 bg-accent/5 rounded-lg border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-primary">Current Prompt</p>
                  <FileText className="w-4 h-4 text-accent" />
                </div>
                {agentPromptLinks[agent.id] ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary font-medium">
                        {agentPromptLinks[agent.id].prompt?.name || 'Unknown Prompt'}
                      </span>
                      {agentPromptLinks[agent.id].prompt?.activeVersion && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          <CheckCircle className="w-3 h-3" />
                          v{agentPromptLinks[agent.id].prompt.activeVersion.version_number}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={onNavigateToPrompts}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </button>
                      <button
                        onClick={onNavigateToPrompts}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs border border-border rounded hover:bg-accent"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-muted mb-2">No prompt assigned</p>
                    <button
                      onClick={onNavigateToPrompts}
                      className="flex items-center justify-center gap-1 px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 mx-auto"
                    >
                      <Plus className="w-3 h-3" />
                      Create Prompt
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleToggleStatus(agent.id, agent.isActive)}
                  className={`flex-1 btn text-sm ${
                    agent.isActive ? 'btn-outline' : 'btn-primary'
                  }`}
                >
                  {agent.isActive ? 'Deactivate' : 'Activate'}
                </button>
                <button className="flex-1 btn btn-secondary text-sm">
                  Configure
                </button>
                <button 
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="btn btn-error text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Performance Overview */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Performance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <MessageSquare className="w-6 h-6 text-primary" />
              </div>
              <p className="text-2xl font-bold text-primary">
                {agents.reduce((sum, agent) => sum + agent.conversations, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted">Total Conversations</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <BarChart3 className="w-6 h-6 text-success" />
              </div>
              <p className="text-2xl font-bold text-success">
                {agents.length > 0 
                  ? (agents.reduce((sum, agent) => sum + agent.successRate, 0) / agents.length).toFixed(1)
                  : '0'
                }%
              </p>
              <p className="text-sm text-muted">Average Success Rate</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-2xl font-bold text-secondary">{agents.filter(a => a.isActive).length}</p>
              <p className="text-sm text-muted">Active Agents</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <p className="text-2xl font-bold text-accent">
                {agents.length > 0 
                  ? Math.round(agents.reduce((sum, agent) => sum + agent.avgResponseTime, 0) / agents.length)
                  : 0
                }ms
              </p>
              <p className="text-sm text-muted">Avg Response Time</p>
            </div>
          </div>
        </div>
      </div>

      <AgentCreationForm 
        projectId={project.id}
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSuccess={handleAgentCreated}
      />
    </>
  )
}

function LegacyProjectConversations({ project }: { project: Project }) {
  const [viewMode, setViewMode] = useState<'dashboard' | 'thread' | 'span'>('dashboard')
  const [selectedConversation, setSelectedConversation] = useState<ConversationTableRow | null>(null)
  const [selectedSpan, setSelectedSpan] = useState<SpanData | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceData | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  
  const [metrics, setMetrics] = useState<ConversationMetrics>({
    total_conversations: 0,
    total_threads: 0,
    average_response_time: 0,
    success_rate: 0,
    total_tokens: 0,
    total_cost: 0,
    active_threads: 0,
    error_count: 0,
    conversations_today: 0,
    conversations_this_week: 0,
    period_comparison: {
      conversations_change: 0,
      response_time_change: 0,
      success_rate_change: 0,
      token_usage_change: 0,
    },
  })

  const [conversations, setConversations] = useState<ConversationTableRow[]>([])

  const [spans] = useState<SpanData[]>([])

  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState<ConversationFilter>({
    // Pre-filter by project
    project_ids: [project.id]
  })

  // Load project agents for filtering
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await agentApi.getAll(project.id)
        if (response.success && response.data) {
          setAgents(response.data)
        } else {
          console.error('Failed to load project agents:', response.error)
          setAgents([])
        }
      } catch (error) {
        console.error('Failed to load project agents:', error)
        setAgents([])
      }
    }
    loadAgents()
  }, [project.id])

  // Load conversations for this project
  useEffect(() => {
    if (!project?.id) return
    handleRefresh()
  }, [project.id])

  const handleFiltersChange = (newFilters: ConversationFilter) => {
    // Always include project filter
    setFilters({ ...newFilters, project_ids: [project.id] })
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await conversationApi.getAll({ projectId: project.id })
      if (response.success && response.data) {
        // Transform conversations to match expected format
        const transformedConversations = response.data.map((conv: any) => ({
          id: conv.id,
          input: conv.input || conv.user_message || '',
          output: conv.output || conv.assistant_response || '',
          status: conv.status || 'success',
          timestamp: conv.createdAt || conv.created_at || new Date().toISOString(),
          agent_id: conv.agentId || conv.agent_id,
          agent_name: conv.agent_name || 'Unknown Agent',
          project_id: conv.projectId || conv.project_id,
          response_time: conv.responseTime || conv.response_time || 0,
          token_usage: conv.tokenUsage || conv.token_usage || 0,
          cost: conv.cost || 0,
          metadata: (() => {
            try {
              if (typeof conv.metadata === 'string') {
                // Handle malformed metadata that was serialized as individual characters
                if (conv.metadata.includes('"0":"{"')) {
                  // Reconstruct the JSON from the character-by-character serialization
                  const chars = Object.values(JSON.parse(conv.metadata))
                  const jsonString = chars.join('')
                  return JSON.parse(jsonString)
                }
                return JSON.parse(conv.metadata || '{}')
              }
              return conv.metadata || {}
            } catch (e) {
              console.warn('Failed to parse metadata for conversation', conv.id, e)
              return {}
            }
          })()
        }))
        setConversations(transformedConversations)
        
        // Calculate metrics from conversations
        const totalConversations = transformedConversations.length
        const successfulConversations = transformedConversations.filter((c: any) => c.status === 'success').length
        const successRate = totalConversations > 0 ? (successfulConversations / totalConversations) * 100 : 0
        const avgResponseTime = totalConversations > 0 ? 
          transformedConversations.reduce((sum: number, c: any) => sum + (c.response_time || 0), 0) / totalConversations : 0
        const totalTokens = transformedConversations.reduce((sum: number, c: any) => sum + (c.token_usage || 0), 0)
        const totalCost = transformedConversations.reduce((sum: number, c: any) => sum + (c.cost || 0), 0)
        
        setMetrics({
          total_conversations: totalConversations,
          total_threads: totalConversations, // Simplified - each conversation as a thread
          average_response_time: Math.round(avgResponseTime),
          success_rate: successRate,
          total_tokens: totalTokens,
          total_cost: totalCost,
          active_threads: 0, // TODO: Calculate based on recent activity
          error_count: totalConversations - successfulConversations,
          conversations_today: transformedConversations.filter((c: any) => 
            new Date(c.timestamp).toDateString() === new Date().toDateString()
          ).length,
          conversations_this_week: transformedConversations.filter((c: any) => {
            const convDate = new Date(c.timestamp)
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            return convDate >= weekAgo
          }).length,
          period_comparison: {
            conversations_change: 0, // TODO: Calculate based on historical data
            response_time_change: 0,
            success_rate_change: 0,
            token_usage_change: 0,
          },
        })
      } else {
        console.error('Failed to fetch conversations:', response.error)
        setConversations([])
      }
    } catch (error) {
      console.error('Failed to refresh project conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      if (conversations.length === 0) {
        console.log('No conversations to export for project:', project.name)
        return
      }
      
      const projectConversations = conversations.filter(conv => 
        conv.metadata?.project_id === project.id
      )
      
      if (projectConversations.length === 0) {
        console.log('No project-specific conversations to export')
        return
      }
      
      const dataStr = JSON.stringify(projectConversations, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `${project.name}-conversations-${new Date().toISOString().split('T')[0]}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleConversationSelect = (conversation: ConversationTableRow) => {
    setSelectedConversation(conversation)
    setViewMode('thread')
  }

  const handleSpanSelect = (span: SpanData) => {
    setSelectedSpan(span)
    setViewMode('span')
  }

  const handleBackToDashboard = () => {
    setViewMode('dashboard')
    setSelectedConversation(null)
    setSelectedSpan(null)
  }

  const handleBackToThread = () => {
    setViewMode('thread')
    setSelectedSpan(null)
  }

  const handleSearch = (query: string, searchFilters: ConversationFilter) => {
    // Always maintain project filter
    handleFiltersChange({ ...searchFilters, search: query })
  }

  // Render based on view mode
  if (viewMode === 'thread' && selectedConversation) {
    return (
      <ConversationThread
        conversation={selectedConversation}
        spans={spans}
        onBack={handleBackToDashboard}
      />
    )
  }

  if (viewMode === 'span' && selectedSpan) {
    return (
      <ConversationSpanDetail
        span={selectedSpan}
        trace={selectedTrace || undefined}
        childSpans={spans.filter(s => s.id !== selectedSpan.id)}
        onBack={handleBackToThread}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Project-specific header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-primary flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          {project.name} - Conversations
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Monitor and analyze conversations for this project
          {agents.length > 0 && ` across ${agents.length} agent${agents.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Search Bar */}
      <ConversationSearch
        onSearch={handleSearch}
        onResultSelect={handleConversationSelect}
        suggestions={conversations.filter(c => 
          filters.search ? c.input.toLowerCase().includes(filters.search.toLowerCase()) : false
        )}
        loading={loading}
      />

      {/* Dashboard */}
      <ConversationsDashboard
        metrics={metrics}
        conversations={conversations}
        loading={loading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onConversationSelect={handleConversationSelect}
        projectAgents={agents} // Pass project agents for filtering
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  )
}

function ProjectDatasets({ project }: { project: Project }) {
  const router = useRouter()
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjectDatasets()
  }, [project.id])

  const fetchProjectDatasets = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/datasets?projectId=${project.id}`)
      const result = await response.json()
      
      if (result.success) {
        setDatasets(result.data)
      }
    } catch (error) {
      console.error('Error fetching datasets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredDatasets = datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Datasets</h2>
          <p className="text-muted mt-1">Manage datasets for this project</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Create Dataset
          </button>
        </div>
      </div>

      {/* Datasets grid */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">
            Loading datasets...
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No datasets found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 
                'Try adjusting your search terms.' :
                'Create your first dataset for this project.'
              }
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Create Dataset
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-light">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-primary">Dataset</th>
                  <th className="text-left py-3 px-4 font-medium text-primary">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-primary">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-primary">Updated</th>
                  <th className="text-right py-3 px-4 font-medium text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {filteredDatasets.map((dataset) => (
                  <tr 
                    key={dataset.id} 
                    className="hover:bg-accent-alpha cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}/datasets/${dataset.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium text-primary">{dataset.name}</div>
                          {dataset.description && (
                            <div className="text-sm text-muted truncate max-w-md">
                              {dataset.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {dataset.item_count.toLocaleString()} items
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">
                      {formatDate(dataset.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">
                      {formatDate(dataset.updated_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/projects/${project.id}/datasets/${dataset.id}`)
                          }}
                          title="View dataset details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          onClick={(e) => e.stopPropagation()}
                          title="Export dataset"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          onClick={(e) => e.stopPropagation()}
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectEvaluations({ project }: { project: Project }) {
  const [activeEvalTab, setActiveEvalTab] = useState('evaluations')
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null)
  const [showEvaluationDetailModal, setShowEvaluationDetailModal] = useState(false)

  useEffect(() => {
    fetchProjectEvaluations()
  }, [project.id])

  const fetchProjectEvaluations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/evaluations?projectId=${project.id}`)
      const result = await response.json()
      
      if (result.success) {
        setEvaluations(result.data)
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvaluations = evaluations.filter(evaluation => {
    // First filter by search term
    const matchesSearch = evaluation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Exclude heuristic evaluations from regular evaluations tab
    try {
      const config = typeof evaluation.configuration === 'string' 
        ? JSON.parse(evaluation.configuration) 
        : evaluation.configuration;
      
      const isHeuristic = config?.metrics && Array.isArray(config.metrics) && 
                         config.metrics.some((metric: string) => 
                           ['contains', 'equals', 'regex', 'is_json', 'levenshtein'].includes(metric)
                         );
      
      return !isHeuristic; // Only show non-heuristic evaluations in Evaluations tab
    } catch {
      return true; // If parsing fails, show in regular evaluations
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Evaluations</h2>
          <p className="text-muted mt-1">Manage evaluations and heuristic metrics for this project</p>
        </div>
      </div>

      {/* Evaluation Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveEvalTab('evaluations')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeEvalTab === 'evaluations'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TestTube className="w-4 h-4" />
            Evaluations
          </div>
        </button>
        <button
          onClick={() => setActiveEvalTab('metrics')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeEvalTab === 'metrics'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Heuristic Metrics
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeEvalTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search evaluations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                Create Evaluation
              </button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="p-8 text-center text-muted">Loading evaluations...</div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="p-8 text-center">
                <TestTube className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">No evaluations found</h3>
                <p className="text-muted mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Create your first evaluation for this project.'}
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  Create Evaluation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-light">
                {filteredEvaluations.map((evaluation) => (
                  <div 
                    key={evaluation.id} 
                    className="p-4 hover:bg-accent-alpha cursor-pointer"
                    onClick={() => {
                      setSelectedEvaluation(evaluation)
                      setShowEvaluationDetailModal(true)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <TestTube className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-primary">{evaluation.name}</h4>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(evaluation.status || 'pending')}`}>
                            {evaluation.status || 'pending'}
                          </div>
                        </div>
                        {evaluation.description && (
                          <p className="text-sm text-muted mb-2 line-clamp-2">{evaluation.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted">
                          <span>{evaluation.result_count || 0} results</span>
                          <span>{new Date(evaluation.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvaluation(evaluation)
                            setShowEvaluationDetailModal(true)
                          }}
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          title="View Results"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('More options for:', evaluation);
                          }}
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          title="More Options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeEvalTab === 'metrics' && <HeuristicMetricsSection project={project} />}
      
      {/* Evaluation Detail Modal */}
      {showEvaluationDetailModal && selectedEvaluation && (
        <EvaluationDetailModal
          isOpen={showEvaluationDetailModal}
          onClose={() => setShowEvaluationDetailModal(false)}
          evaluation={selectedEvaluation}
        />
      )}
    </div>
  )
}

// Heuristic Metrics Section Component
function HeuristicMetricsSection({ project }: { project: Project }) {
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<any>(null)
  const [showMetricModal, setShowMetricModal] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      // Fetch evaluations and filter for heuristic metrics
      const response = await fetch(`/api/v1/evaluations?projectId=${project.id}`)
      const result = await response.json()
      
      if (result.success) {
        // Filter evaluations that contain heuristic metrics
        const heuristicEvaluations = result.data.filter((evaluation: any) => {
          try {
            const config = typeof evaluation.configuration === 'string' 
              ? JSON.parse(evaluation.configuration) 
              : evaluation.configuration;
            
            return config?.metrics && Array.isArray(config.metrics) && 
                   config.metrics.some((metric: string) => 
                     ['contains', 'equals', 'regex', 'regexmatch', 'is_json', 'isjson', 'levenshtein', 'levenshteinratio', 'sentencebleu', 'corpusbleu', 'sentiment', 'rouge', 'aggregatedmetric'].includes(metric.toLowerCase())
                   );
          } catch {
            return false;
          }
        });
        setMetrics(heuristicEvaluations)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMetrics = metrics.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMetricTypeIcon = (type: string) => {
    switch (type) {
      case 'contains': return <Search className="w-4 h-4" />
      case 'equals': return <CheckCircle className="w-4 h-4" />
      case 'regex': return <Code className="w-4 h-4" />
      case 'is_json': return <FileText className="w-4 h-4" />
      case 'levenshtein': return <TrendingUp className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const getMetricTypeName = (type: string) => {
    switch (type) {
      case 'contains': return 'Contains Text'
      case 'equals': return 'Exact Match'
      case 'regex': return 'Regex Pattern'
      case 'is_json': return 'Valid JSON'
      case 'levenshtein': return 'Text Similarity'
      default: return type
    }
  }

  const getMetricTypes = (evaluation: any) => {
    try {
      const config = typeof evaluation.configuration === 'string' 
        ? JSON.parse(evaluation.configuration) 
        : evaluation.configuration;
      
      return config?.metrics || [];
    } catch {
      return [];
    }
  }

  const handleMetricClick = (metric: any) => {
    setSelectedMetric(metric);
    setShowMetricModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Metric
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading metrics...</div>
        ) : filteredMetrics.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No heuristic metrics found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Create your first heuristic metric for evaluations.'}
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Metric
            </button>
          </div>
        ) : (
          <div className="divide-y divide-light">
            {filteredMetrics.map((metric) => {
              const metricTypes = getMetricTypes(metric);
              const primaryType = metricTypes[0] || 'custom';
              
              return (
                <div 
                  key={metric.id} 
                  className="p-4 hover:bg-accent-alpha cursor-pointer"
                  onClick={() => handleMetricClick(metric)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getMetricTypeIcon(primaryType)}
                        <h4 className="font-medium text-primary">{metric.name}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Heuristic Evaluation
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {metricTypes.length} Metric{metricTypes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {metric.description && (
                        <p className="text-sm text-muted mb-2 line-clamp-2">{metric.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>Metrics: {metricTypes.map(getMetricTypeName).join(', ')}</span>
                        <span>Created: {new Date(metric.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMetricClick(metric);
                        }}
                        className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('More options for:', metric);
                        }}
                        className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                        title="More Options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Metric Modal placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Heuristic Metric</h3>
            <p className="text-muted mb-4">Metric creation form would go here...</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-muted hover:text-primary border border-light rounded-md"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Details Modal */}
      {showMetricModal && selectedMetric && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-light">
              <div className="flex items-center gap-3">
                {getMetricTypeIcon(getMetricTypes(selectedMetric)[0] || 'custom')}
                <h2 className="text-xl font-semibold text-primary">{selectedMetric.name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Heuristic Evaluation
                </span>
              </div>
              <button 
                onClick={() => setShowMetricModal(false)}
                className="p-2 text-muted hover:text-primary hover:bg-accent-alpha rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-primary mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Name:</span>
                        <span className="font-medium">{selectedMetric.name}</span>
                      </div>
                      {selectedMetric.description && (
                        <div className="flex justify-between">
                          <span className="text-muted">Description:</span>
                          <span className="font-medium">{selectedMetric.description}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted">Type:</span>
                        <span className="font-medium">{selectedMetric.type || 'Custom'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Created:</span>
                        <span className="font-medium">{new Date(selectedMetric.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric Types */}
                  <div>
                    <h3 className="font-medium text-primary mb-2">Heuristic Metrics</h3>
                    <div className="space-y-2">
                      {getMetricTypes(selectedMetric).map((metricType, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-accent/5 rounded-lg">
                          {getMetricTypeIcon(metricType)}
                          <span className="font-medium">{getMetricTypeName(metricType)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="font-medium text-primary mb-2">Configuration</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                      {JSON.stringify(
                        typeof selectedMetric.configuration === 'string' 
                          ? JSON.parse(selectedMetric.configuration) 
                          : selectedMetric.configuration,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-light">
                <button
                  onClick={() => console.log('Run evaluation:', selectedMetric)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run Evaluation
                </button>
                <button
                  onClick={() => console.log('Edit metric:', selectedMetric)}
                  className="flex items-center gap-2 px-4 py-2 border border-light rounded-md hover:bg-accent-alpha transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowMetricModal(false)}
                  className="px-4 py-2 text-muted hover:text-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectExperiments({ project }: { project: Project }) {
  const [experiments, setExperiments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjectExperiments()
  }, [project.id])

  const fetchProjectExperiments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/experiments?projectId=${project.id}`)
      const result = await response.json()
      
      if (result.success) {
        setExperiments(result.data)
      }
    } catch (error) {
      console.error('Error fetching experiments:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExperiments = experiments.filter(experiment =>
    experiment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    experiment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Experiments</h2>
          <p className="text-muted mt-1">Manage experiments for this project</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search experiments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Create Experiment
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading experiments...</div>
        ) : filteredExperiments.length === 0 ? (
          <div className="p-8 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No experiments found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Create your first experiment for this project.'}
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Create Experiment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-light">
            {filteredExperiments.map((experiment) => (
              <div key={experiment.id} className="p-4 hover:bg-accent-alpha cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <h4 className="font-medium text-primary">{experiment.name}</h4>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
                        {experiment.status}
                      </div>
                    </div>
                    {experiment.description && (
                      <p className="text-sm text-muted mb-2 line-clamp-2">{experiment.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted">
                      {experiment.dataset_name && <span>Dataset: {experiment.dataset_name}</span>}
                      <span>{new Date(experiment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ProjectMetrics({ project }: { project: Project }) {
  const [costAnalytics, setCostAnalytics] = useState<any>(null)
  const [tracesData, setTracesData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // Filter states
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedAgent, setSelectedAgent] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [searchTraceId, setSearchTraceId] = useState('')

  // Fetch cost analytics data
  useEffect(() => {
    const fetchCostAnalytics = async () => {
      try {
        setLoading(true)
        
        // Build query parameters based on filters
        const params = new URLSearchParams({
          projectId: project.id,
          includeAnalytics: 'true',
          limit: '1000'
        })
        
        // Time range filtering
        if (timeRange !== 'all') {
          const now = new Date()
          let startTime = new Date()
          switch (timeRange) {
            case '1h':
              startTime.setHours(now.getHours() - 1)
              break
            case '24h':
              startTime.setDate(now.getDate() - 1)
              break
            case '7d':
              startTime.setDate(now.getDate() - 7)
              break
            case '30d':
              startTime.setDate(now.getDate() - 30)
              break
          }
          params.append('startTime', startTime.toISOString())
        }
        
        // Agent filtering
        if (selectedAgent) {
          params.append('agentId', selectedAgent)
        }
        
        // Status filtering
        if (selectedStatus) {
          params.append('status', selectedStatus)
        }
        
        // Trace ID search
        if (searchTraceId) {
          params.append('search', searchTraceId)
        }
        
        // Fetch cost analytics from the dedicated endpoint
        const costParams = new URLSearchParams({
          projectId: project.id,
          level: 'conversation',
          includeBreakdown: 'true'
        })
        
        // Add time filtering for cost analytics
        if (timeRange !== 'all') {
          const now = new Date()
          let startDate = new Date()
          switch (timeRange) {
            case '1h':
              startDate.setHours(now.getHours() - 1)
              break
            case '24h':
              startDate.setDate(now.getDate() - 1)
              break
            case '7d':
              startDate.setDate(now.getDate() - 7)
              break
            case '30d':
              startDate.setDate(now.getDate() - 30)
              break
          }
          costParams.append('startDate', startDate.toISOString())
        }
        
        if (selectedAgent) {
          costParams.append('agentId', selectedAgent)
        }
        
        if (selectedStatus) {
          costParams.append('status', selectedStatus)
        }

        const costResponse = await fetch(`/api/v1/cost-analytics?${costParams}`)
        const costData = await costResponse.json()
        
        // Also fetch traces for additional data
        const tracesResponse = await fetch(`/v1/private/traces?${params}`)
        const tracesData = await tracesResponse.json()
        
        if (costData.success) {
          setCostAnalytics(costData.analytics?.summary)
          setTracesData(costData.analytics?.data || [])
        } else if (tracesData.success) {
          // Fallback to traces data if cost analytics fails
          setCostAnalytics(tracesData.analytics?.costAnalytics)
          setTracesData(tracesData.data)
        }
      } catch (error) {
        console.error('Failed to fetch cost analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCostAnalytics()
  }, [project.id, timeRange, selectedAgent, selectedStatus, searchTraceId])

  // Generate mock time-series data for charts
  const generateTimeSeriesData = (baseValue: number, points: number = 30) => {
    return Array.from({ length: points }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (points - i - 1))
      return {
        date: date.toISOString().split('T')[0],
        value: Math.max(0, baseValue + (Math.random() - 0.5) * baseValue * 0.3)
      }
    })
  }

  const conversationsData = generateTimeSeriesData(project.conversations / 30, 30)
  const successRateData = generateTimeSeriesData(project.successRate, 30)
  
  // Generate cost trend data (mock for now, can be enhanced with real time-series data)
  const costTrendData = generateTimeSeriesData((costAnalytics?.totalCost || 0.05) / 30, 30)
  const tokenUsageData = generateTimeSeriesData((costAnalytics?.totalTokens || 1000) / 30, 30)
  
  // Generate agent-specific metrics
  const agentMetrics = project.template === 'Autonomous' ? [
    { name: 'Task Coordinator', conversations: Math.floor(project.conversations * 0.4), successRate: project.successRate + 2, responseTime: 1.2 },
    { name: 'Data Analyzer', conversations: Math.floor(project.conversations * 0.35), successRate: project.successRate - 1, responseTime: 2.1 },
    { name: 'Response Generator', conversations: Math.floor(project.conversations * 0.25), successRate: project.successRate + 1, responseTime: 0.8 }
  ] : project.template === 'Simple' ? [
    { name: 'Primary Assistant', conversations: project.conversations, successRate: project.successRate, responseTime: 1.5 }
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Metrics & Analytics</h2>
            <p className="text-muted">Performance insights and key metrics</p>
          </div>
          <button className="btn btn-outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </button>
        </div>
        
        {/* Enhanced Filtering Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-background/50 rounded-lg border">
          {/* Time Range Filter */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Time Range</label>
            <select 
              className="input text-sm w-full"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1h">Last 1 hour</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="all">All time</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Agent</label>
            <select 
              className="input text-sm w-full"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
            >
              <option value="">All agents</option>
              <option value="agent_analytics_specialist">Analytics Specialist</option>
              <option value="agent_performance_optimizer">Performance Optimizer</option>
              <option value="agent_customer_support">Customer Support</option>
              <option value="agent_debug_assistant">Debug Assistant</option>
              <option value="agent_strategic_planner">Strategic Planner</option>
              <option value="agent_security_auditor">Security Auditor</option>
              <option value="agent_data_scientist">Data Scientist</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Status</label>
            <select 
              className="input text-sm w-full"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="success">Success</option>
              <option value="running">Running</option>
              <option value="error">Error</option>
              <option value="timeout">Timeout</option>
            </select>
          </div>

          {/* Trace ID Search */}
          <div>
            <label className="block text-sm font-medium text-muted mb-1">Trace ID</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="Search trace ID..."
                className="input text-sm w-full pl-10"
                value={searchTraceId}
                onChange={(e) => setSearchTraceId(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Total Conversations</h3>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-primary">{project.conversations.toLocaleString()}</p>
          <p className="text-sm text-success">+12.5% vs last month</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Success Rate</h3>
            <BarChart3 className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-primary">{project.successRate.toFixed(1)}%</p>
          <p className="text-sm text-success">+2.3% vs last month</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Total Cost</h3>
            <DollarSign className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            ${loading ? '...' : (costAnalytics?.totalCost?.toFixed(4) || '0.0000')}
          </p>
          <p className="text-sm text-muted">
            {costAnalytics?.totalTokens?.toLocaleString() || '0'} total tokens
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Avg Cost/Trace</h3>
            <Calculator className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-primary">
            ${loading ? '...' : (costAnalytics?.averageCostPerTrace?.toFixed(6) || '0.000000')}
          </p>
          <p className="text-sm text-muted">
            {costAnalytics?.averageTokensPerTrace || 0} avg tokens
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Avg Response Time</h3>
            <Activity className="w-4 h-4 text-secondary" />
          </div>
          <p className="text-2xl font-bold text-primary">1.2s</p>
          <p className="text-sm text-success">-0.3s vs last month</p>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-muted">Active Agents</h3>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <p className="text-2xl font-bold text-primary">{project.agents}</p>
          <p className="text-sm text-muted">No change</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {/* Conversations Over Time */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Conversations Over Time</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {conversationsData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-primary/20 hover:bg-primary/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / Math.max(...conversationsData.map(d => d.value))) * 160)}px` }}
                  title={`${point.date}: ${Math.round(point.value)} conversations`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Success Rate Trend */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Success Rate Trend</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {successRateData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-success/20 hover:bg-success/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / 100) * 160)}px` }}
                  title={`${point.date}: ${point.value.toFixed(1)}% success rate`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Trend */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Cost Trend (USD)</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {costTrendData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-green-500/20 hover:bg-green-500/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / Math.max(...costTrendData.map(d => d.value), 0.001)) * 160)}px` }}
                  title={`${point.date}: $${point.value.toFixed(6)} cost`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Token Usage Trend */}
        <div className="card p-6 overflow-hidden">
          <h3 className="font-semibold text-primary mb-4">Token Usage Trend</h3>
          <div className="h-48 flex items-end justify-between gap-1 px-2 mb-8">
            {tokenUsageData.slice(-14).map((point, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div 
                  className="bg-blue-500/20 hover:bg-blue-500/30 transition-colors rounded-sm cursor-pointer min-w-[16px] w-4"
                  style={{ height: `${Math.max(8, (point.value / Math.max(...tokenUsageData.map(d => d.value), 1)) * 160)}px` }}
                  title={`${point.date}: ${Math.round(point.value)} tokens`}
                />
                <span className="text-[10px] text-muted absolute top-full mt-1 whitespace-nowrap">
                  {point.date.split('-')[2]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance Breakdown */}
      {agentMetrics.length > 0 && (
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Agent Performance Breakdown</h3>
          <div className="space-y-4">
            {agentMetrics.map((agent, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-background/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                    <Users className={`w-4 h-4 text-${project.color}`} />
                  </div>
                  <div>
                    <h4 className="font-medium text-primary">{agent.name}</h4>
                    <p className="text-sm text-muted">{agent.conversations.toLocaleString()} conversations</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-bold text-success">{agent.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted">Success Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-secondary">{agent.responseTime}s</p>
                    <p className="text-xs text-muted">Avg Response</p>
                  </div>
                  <div className="w-24 bg-background rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${agent.successRate}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Performance Insights</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-success/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-success mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success">Improved Response Time</p>
                <p className="text-xs text-muted">Average response time decreased by 0.3s this month</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">High Success Rate</p>
                <p className="text-xs text-muted">Consistently maintaining above 85% success rate</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-warning/10 rounded-lg">
              <Activity className="w-5 h-5 text-warning mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">Peak Usage Hours</p>
                <p className="text-xs text-muted">Highest activity between 2-4 PM daily</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Resource Utilization</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">CPU Usage</span>
                <span className="text-primary">68%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Memory Usage</span>
                <span className="text-secondary">45%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="h-full bg-secondary rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted">Network I/O</span>
                <span className="text-accent">32%</span>
              </div>
              <div className="w-full bg-background rounded-full h-2">
                <div className="h-full bg-accent rounded-full" style={{ width: '32%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Analytics Section */}
      {costAnalytics && (
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">Cost Analytics & Token Usage</h3>
            
            {/* Provider and Model Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Provider Distribution */}
              <div>
                <h4 className="font-medium text-primary mb-3">Provider Distribution</h4>
                {costAnalytics.providerDistribution?.length > 0 ? (
                  <div className="space-y-2">
                    {costAnalytics.providerDistribution.map((provider: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="text-sm font-medium">{provider.provider || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">{provider.count} traces</span>
                          <span className="text-sm font-medium">{provider.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No provider data available</p>
                )}
              </div>

              {/* Model Distribution */}
              <div>
                <h4 className="font-medium text-primary mb-3">Model Distribution</h4>
                {costAnalytics.modelDistribution?.length > 0 ? (
                  <div className="space-y-2">
                    {costAnalytics.modelDistribution.map((model: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                        <span className="text-sm font-medium">{model.model || 'Unknown'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted">{model.count} traces</span>
                          <span className="text-sm font-medium">{model.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">No model data available</p>
                )}
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h4 className="font-medium text-green-800 dark:text-green-200">Total Cost</h4>
                </div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                  ${costAnalytics.totalCost?.toFixed(4) || '0.0000'}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  ${costAnalytics.averageCostPerTrace?.toFixed(6) || '0.000000'} avg per trace
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">Token Usage</h4>
                </div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {costAnalytics.totalTokens?.toLocaleString() || '0'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {costAnalytics.averageTokensPerTrace || 0} avg per trace
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-purple-600" />
                  <h4 className="font-medium text-purple-800 dark:text-purple-200">Cost Efficiency</h4>
                </div>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  ${costAnalytics.costPerToken?.toFixed(8) || '0.00000000'}
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">per token</p>
              </div>
            </div>

            {/* Token Breakdown */}
            <div className="mt-6">
              <h4 className="font-medium text-primary mb-3">Token Breakdown</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <span className="text-sm font-medium">Prompt Tokens</span>
                  <span className="text-sm text-primary font-bold">
                    {costAnalytics.totalPromptTokens?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <span className="text-sm font-medium">Completion Tokens</span>
                  <span className="text-sm text-primary font-bold">
                    {costAnalytics.totalCompletionTokens?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


interface OpikTrace {
  id: string
  name: string
  startTime: string
  endTime?: string
  duration?: number
  status: 'running' | 'success' | 'error' | 'timeout'
  metadata?: Record<string, any>
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  tags?: string[]
}

function MetadataEditor({ trace, onUpdate }: { trace: OpikTrace; onUpdate: (metadata: Record<string, any>) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedMetadata, setEditedMetadata] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    setEditedMetadata(JSON.stringify(trace.metadata || {}, null, 2))
  }, [trace.metadata])

  const validateJSON = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString)
      setValidationError(null)
      return true
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Invalid JSON')
      return false
    }
  }

  const handleSave = async () => {
    if (!validateJSON(editedMetadata)) return

    try {
      const parsedMetadata = JSON.parse(editedMetadata)
      
      // Here you would typically make an API call to update the trace metadata
      // For now, we'll just update the local state
      onUpdate(parsedMetadata)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save metadata:', error)
    }
  }

  const toggleKeyExpansion = (key: string) => {
    const newExpanded = new Set(expandedKeys)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedKeys(newExpanded)
  }

  const renderValue = (value: any, depth: number = 0): React.ReactNode => {
    if (value === null) return <span className="text-gray-400">null</span>
    if (value === undefined) return <span className="text-gray-400">undefined</span>
    
    if (typeof value === 'boolean') {
      return <span className="text-blue-600 font-medium">{value.toString()}</span>
    }
    
    if (typeof value === 'number') {
      return <span className="text-green-600 font-medium">{value}</span>
    }
    
    if (typeof value === 'string') {
      if (value.length > 100) {
        return (
          <span className="text-orange-600">
            "{value.substring(0, 100)}..."
            <button className="text-blue-500 hover:underline ml-1">expand</button>
          </span>
        )
      }
      return <span className="text-orange-600">"{value}"</span>
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-500">[]</span>
      return (
        <div className="ml-4">
          <span className="text-gray-600">[</span>
          {value.map((item, index) => (
            <div key={index} className="ml-4">
              <span className="text-gray-500">{index}:</span> {renderValue(item, depth + 1)}
            </div>
          ))}
          <span className="text-gray-600">]</span>
        </div>
      )
    }
    
    if (typeof value === 'object') {
      const keys = Object.keys(value)
      if (keys.length === 0) return <span className="text-gray-500">{}</span>
      
      return (
        <div className="ml-4">
          <span className="text-gray-600">{'{'}</span>
          {keys.map((key) => (
            <div key={key} className="ml-4 py-1">
              <span className="text-purple-600 font-medium">"{key}"</span>
              <span className="text-gray-500">: </span>
              {renderValue(value[key], depth + 1)}
            </div>
          ))}
          <span className="text-gray-600">{'}'}</span>
        </div>
      )
    }
    
    return <span>{String(value)}</span>
  }

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Edit Metadata</h4>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!!validationError}
              className="btn btn-sm btn-primary disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false)
                setValidationError(null)
                setEditedMetadata(JSON.stringify(trace.metadata || {}, null, 2))
              }}
              className="btn btn-sm btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>

        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 text-sm font-medium">JSON Validation Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{validationError}</p>
          </div>
        )}

        <div className="relative">
          <textarea
            value={editedMetadata}
            onChange={(e) => {
              setEditedMetadata(e.target.value)
              validateJSON(e.target.value)
            }}
            className={`w-full h-64 px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 ${
              validationError 
                ? 'border-red-300 focus:ring-red-500' 
                : 'border-gray-300 focus:ring-primary'
            }`}
            placeholder="Enter JSON metadata..."
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">Metadata</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="btn btn-sm btn-secondary"
          >
            <Code className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(trace.metadata, null, 2))
            }}
            className="btn btn-sm btn-secondary"
          >
            <Copy className="w-4 h-4" />
            Copy
          </button>
        </div>
      </div>

      {!trace.metadata || Object.keys(trace.metadata).length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Database className="w-8 h-8 mx-auto mb-2" />
          <p>No metadata available</p>
          <p className="text-sm">Click Edit to add metadata to this trace</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 border">
          <div className="font-mono text-sm">
            {renderValue(trace.metadata)}
          </div>
        </div>
      )}
    </div>
  )
}


function TraceAnalyticsDashboard({ traces }: { traces: OpikTrace[] }) {
  const analytics = useMemo(() => {
    const total = traces.length
    const successful = traces.filter(t => t.status === 'success').length
    const failed = traces.filter(t => t.status === 'error').length
    const running = traces.filter(t => t.status === 'running').length
    const timeout = traces.filter(t => t.status === 'timeout').length
    
    const durations = traces.filter(t => t.duration).map(t => t.duration!)
    const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0
    
    // Performance percentiles
    const sortedDurations = [...durations].sort((a, b) => a - b)
    const p50 = sortedDurations[Math.floor(sortedDurations.length * 0.5)] || 0
    const p90 = sortedDurations[Math.floor(sortedDurations.length * 0.9)] || 0
    const p99 = sortedDurations[Math.floor(sortedDurations.length * 0.99)] || 0
    
    // Recent activity (last 24 hours simulation)
    const now = new Date()
    const recentTraces = traces.filter(t => {
      const traceTime = new Date(t.startTime)
      return (now.getTime() - traceTime.getTime()) < 24 * 60 * 60 * 1000
    })
    
    return {
      total,
      successful,
      failed,
      running,
      timeout,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      avgDuration,
      maxDuration,
      minDuration,
      p50,
      p90,
      p99,
      recentCount: recentTraces.length
    }
  }, [traces])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(1)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Traces</p>
              <p className="text-2xl font-semibold text-gray-900">{analytics.total}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-semibold text-green-600">{analytics.successRate.toFixed(1)}%</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-2xl font-semibold text-blue-600">{formatDuration(analytics.avgDuration)}</p>
            </div>
            <Clock className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent (24h)</p>
              <p className="text-2xl font-semibold text-purple-600">{analytics.recentCount}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Success</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.successful}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-green-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.successful / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Error</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.failed}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-red-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.failed / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Running</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.running}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-blue-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.running / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Timeout</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{analytics.timeout}</span>
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-yellow-500 rounded-full" 
                    style={{ width: analytics.total > 0 ? `${(analytics.timeout / analytics.total) * 100}%` : '0%' }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Percentiles</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P50 (Median)</span>
              <span className="text-sm font-medium">{formatDuration(analytics.p50)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P90</span>
              <span className="text-sm font-medium">{formatDuration(analytics.p90)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">P99</span>
              <span className="text-sm font-medium">{formatDuration(analytics.p99)}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Min Duration</span>
                <span className="text-sm font-medium">{formatDuration(analytics.minDuration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Max Duration</span>
                <span className="text-sm font-medium">{formatDuration(analytics.maxDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">High Success Rate</p>
              <p className="text-xs text-gray-600">
                {analytics.successRate > 90 ? 'Excellent performance' : 
                 analytics.successRate > 70 ? 'Good performance' : 'Needs attention'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Response Time</p>
              <p className="text-xs text-gray-600">
                {analytics.avgDuration < 1000 ? 'Very fast' : 
                 analytics.avgDuration < 5000 ? 'Good' : 'Consider optimization'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Activity Level</p>
              <p className="text-xs text-gray-600">
                {analytics.recentCount > 10 ? 'High activity' : 
                 analytics.recentCount > 3 ? 'Moderate activity' : 'Low activity'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectTraces({ project }: { project: Project }) {
  const [selectedTrace, setSelectedTrace] = useState<OpikTrace | null>(null)
  const [traces, setTraces] = useState<OpikTrace[]>([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('input-output')
  const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list')
  const [dateRange, setDateRange] = useState({ start: '', end: '' })
  const [durationFilter, setDurationFilter] = useState({ min: '', max: '' })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [tagsFilter, setTagsFilter] = useState('')
  const [sortBy, setSortBy] = useState('startTime')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filters, setFilters] = useState({
    projectId: project.id,
    status: '',
    search: '',
    startDate: '',
    endDate: '',
    provider: '',
    model: ''
  })

  // Load real traces and cost analytics from API
  useEffect(() => {
    loadTraces()
    fetchCostAnalytics()
  }, [project.id, filters, statusFilter, dateRange, durationFilter, tagsFilter])

  const loadTraces = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        projectId: project.id,
        limit: '50'
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery)
      }

      const response = await fetch(`/v1/private/traces?${params}`)
      const data = await response.json()

      if (data.success) {
        setTraces(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load traces:', error)
      setTraces([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCostAnalytics = async () => {
    try {
      const params = new URLSearchParams()
      
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.provider) params.append('provider', filters.provider)
      if (filters.model) params.append('model', filters.model)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      params.append('level', 'trace')
      params.append('includeBreakdown', 'true')
      params.append('granularity', 'day')

      const response = await fetch(`/api/v1/cost-analytics?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.analytics)
      }
    } catch (error) {
      console.error('Failed to fetch cost analytics:', error)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    loadTraces()
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const exportCostData = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.projectId) params.append('projectId', filters.projectId)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const response = await fetch(`/api/v1/cost-analytics?${params}&level=trace&includeBreakdown=true`)
      const data = await response.json()
      
      if (data.success) {
        const csvContent = convertToCsv(data.analytics)
        downloadCsv(csvContent, 'cost-analytics.csv')
      }
    } catch (error) {
      console.error('Failed to export cost data:', error)
    }
  }

  const convertToCsv = (analytics: any) => {
    const headers = ['Date', 'Total Cost', 'Input Cost', 'Output Cost', 'Total Tokens', 'Traces Count']
    const rows = analytics.breakdown?.map((item: any) => [
      new Date(item.timestamp).toISOString().split('T')[0],
      item.totalCost.toFixed(6),
      item.inputCost.toFixed(6),
      item.outputCost.toFixed(6),
      item.totalTokens,
      item.count
    ]) || []
    
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const formatCost = (cost: number) => {
    if (cost === 0 || cost === null || cost === undefined) return '$0.000000'
    return `$${Number(cost).toFixed(6)}`
  }

  const formatTokens = (tokens: number) => {
    if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
    if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
    return tokens?.toString() || '0'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'timeout': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredTraces = useMemo(() => {
    let filtered = traces.filter(trace => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = (
          trace.name.toLowerCase().includes(query) ||
          trace.id.toLowerCase().includes(query) ||
          JSON.stringify(trace.inputData || {}).toLowerCase().includes(query) ||
          JSON.stringify(trace.outputData || {}).toLowerCase().includes(query) ||
          JSON.stringify(trace.metadata || {}).toLowerCase().includes(query)
        )
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && trace.status !== statusFilter) {
        return false
      }

      // Date range filter
      if (dateRange.start || dateRange.end) {
        const traceDate = new Date(trace.startTime)
        if (dateRange.start && traceDate < new Date(dateRange.start)) return false
        if (dateRange.end && traceDate > new Date(dateRange.end)) return false
      }

      // Duration filter
      if (durationFilter.min || durationFilter.max) {
        const duration = trace.duration || 0
        if (durationFilter.min && duration < parseFloat(durationFilter.min)) return false
        if (durationFilter.max && duration > parseFloat(durationFilter.max)) return false
      }

      // Tags filter
      if (tagsFilter.trim()) {
        const tags = tagsFilter.toLowerCase().split(',').map(t => t.trim()).filter(Boolean)
        const traceTags = (trace.tags || []).map(t => t.toLowerCase())
        if (!tags.some(tag => traceTags.some(traceTag => traceTag.includes(tag)))) {
          return false
        }
      }

      return true
    })

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name || ''
          bValue = b.name || ''
          break
        case 'status':
          aValue = a.status
          bValue = b.status
          break
        case 'duration':
          aValue = a.duration || 0
          bValue = b.duration || 0
          break
        case 'startTime':
        default:
          aValue = new Date(a.startTime).getTime()
          bValue = new Date(b.startTime).getTime()
          break
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [traces, searchQuery, statusFilter, dateRange, durationFilter, tagsFilter, sortBy, sortOrder])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-success" />
      case 'error': return <XCircle className="w-4 h-4 text-error" />
      case 'warning': return <AlertCircle className="w-4 h-4 text-warning" />
      default: return <Clock className="w-4 h-4 text-muted" />
    }
  }

  const formatDuration = (duration: number | undefined) => {
    if (!duration) return 'N/A'
    if (duration < 1000) return `${duration.toFixed(0)}ms`
    return `${(duration / 1000).toFixed(2)}s`
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getInputPreview = (inputData: Record<string, any> | undefined) => {
    if (!inputData) return 'No input data'
    const text = JSON.stringify(inputData)
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  const getOutputPreview = (outputData: Record<string, any> | undefined) => {
    if (!outputData) return 'No output data'
    const text = JSON.stringify(outputData)
    return text.length > 100 ? text.substring(0, 100) + '...' : text
  }

  return (
    <div className="space-y-6">
      {/* Header with search and filters */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-primary">Traces</h2>
            <p className="text-muted">A trace is a step-by-step record of how your LLM application processes a single input, including LLM calls and other operations.</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <List className="w-4 h-4 inline mr-2" />
                List
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'analytics'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-600 hover:text-primary'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Analytics
              </button>
            </div>
            <button 
              onClick={loadTraces}
              className="btn btn-outline"
            >
              <Activity className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Search and filter bar */}
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-background/50 rounded-lg border">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search traces by ID, name, input, output, or metadata..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 input text-sm"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input text-sm"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
              <option value="running">Running</option>
              <option value="timeout">Timeout</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input text-sm"
            >
              <option value="startTime">Sort by Start Time</option>
              <option value="name">Sort by Name</option>
              <option value="status">Sort by Status</option>
              <option value="duration">Sort by Duration</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-outline text-sm"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
            
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`btn text-sm ${showAdvancedFilters ? 'btn-primary' : 'btn-outline'}`}
            >
              <Settings className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
              <h4 className="text-sm font-medium text-gray-900">Advanced Filters</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
                
                {/* Duration Range */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Duration (ms)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={durationFilter.min}
                    onChange={(e) => setDurationFilter(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Duration (ms)</label>
                  <input
                    type="number"
                    placeholder="∞"
                    value={durationFilter.max}
                    onChange={(e) => setDurationFilter(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full input text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g., production, user-input, llm-call"
                  value={tagsFilter}
                  onChange={(e) => setTagsFilter(e.target.value)}
                  className="w-full input text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDateRange({ start: '', end: '' })
                    setDurationFilter({ min: '', max: '' })
                    setTagsFilter('')
                    setSearchQuery('')
                    setStatusFilter('all')
                  }}
                  className="btn btn-outline text-sm"
                >
                  Clear All Filters
                </button>
                
                <div className="text-sm text-gray-600">
                  {filteredTraces.length} of {traces.length} traces shown
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dashboard */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold tracking-tight flex items-center gap-2">
                <GitBranch className="w-6 h-6 text-primary" />
                Traces & Cost Analytics
              </h3>
              <p className="text-muted-foreground">
                Monitor trace execution and analyze cost patterns across your AI agents
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={exportCostData} 
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button 
                onClick={() => { loadTraces(); fetchCostAnalytics(); }} 
                className="flex items-center gap-2 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                <TrendingUp className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Cost Summary Cards */}
          {analytics?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Total Cost</h4>
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatCost(analytics.summary.totalCost)}</div>
                  <p className="text-xs text-muted-foreground">
                    Input: {formatCost(analytics.summary.totalInputCost)} | Output: {formatCost(analytics.summary.totalOutputCost)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Total Tokens</h4>
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatTokens(analytics.summary.totalTokens)}</div>
                  <p className="text-xs text-muted-foreground">
                    Prompt: {formatTokens(analytics.summary.totalPromptTokens)} | Completion: {formatTokens(analytics.summary.totalCompletionTokens)}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Avg Cost/Trace</h4>
                  <BarChart3 className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{formatCost(analytics.summary.avgCostPerItem)}</div>
                  <p className="text-xs text-muted-foreground">
                    Across {analytics.summary.count} traces
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border">
                <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <h4 className="text-sm font-medium">Active Traces</h4>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{analytics.summary.count}</div>
                  <p className="text-xs text-muted-foreground">
                    Total traces analyzed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cost Analytics Chart */}
          {analytics?.breakdown && (
            <div className="bg-white p-6 rounded-lg border">
              <div className="mb-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Cost Analytics Over Time
                </h4>
              </div>
              <CostAnalyticsChart data={analytics.breakdown} />
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-6 rounded-lg border">
            <div className="mb-4">
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search traces..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Provider</label>
                <input
                  type="text"
                  placeholder="Provider"
                  value={filters.provider}
                  onChange={(e) => handleFilterChange('provider', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Model</label>
                <input
                  type="text"
                  placeholder="Model"
                  value={filters.model}
                  onChange={(e) => handleFilterChange('model', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>

          {/* Legacy Analytics Dashboard for traces count etc */}
          <TraceAnalyticsDashboard traces={filteredTraces} />
        </div>
      )}

      {/* Traces table */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">ID</th>
                <th className="text-left p-4 font-medium text-gray-700">Operation</th>
                <th className="text-left p-4 font-medium text-gray-700">Status</th>
                <th className="text-left p-4 font-medium text-gray-700">Start Time</th>
                <th className="text-left p-4 font-medium text-gray-700">Duration</th>
                <th className="text-left p-4 font-medium text-gray-700">Cost</th>
                <th className="text-left p-4 font-medium text-gray-700">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                    Loading traces...
                  </td>
                </tr>
              ) : filteredTraces.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    No traces found
                  </td>
                </tr>
              ) : (
                filteredTraces.map((trace) => (
                  <tr 
                    key={trace.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTrace(trace)}
                  >
                    <td className="p-4">
                      <div className="font-mono text-xs">{trace.id?.slice(0, 12)}...</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{trace.operationName || trace.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{project.id}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trace.status)}`}>
                        {trace.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="text-xs">
                        {trace.startTime ? new Date(trace.startTime).toLocaleString() : 'N/A'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {trace.duration ? `${trace.duration}ms` : 'N/A'}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-xs">
                        {formatCost(trace.total_cost || 0)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs">
                        {formatTokens(trace.total_tokens || 0)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {filteredTraces.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
            <div className="text-sm text-gray-700">
              Showing 1-{Math.min(filteredTraces.length, 50)} of {filteredTraces.length}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Previous</button>
              <button className="px-3 py-1 text-sm border rounded hover:bg-gray-100">Next</button>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Trace detail modal */}
      {selectedTrace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{selectedTrace.name || 'Trace Details'}</h3>
                <span className="text-sm text-gray-500">⏱️ {formatDuration(selectedTrace.duration)}</span>
                <span className="text-sm text-gray-500"># {selectedTrace.id}</span>
                <span className="text-sm text-gray-500">{getStatusIcon(selectedTrace.status)}</span>
              </div>
              <button
                onClick={() => setSelectedTrace(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            {/* Tab navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button 
                  onClick={() => setActiveTab('input-output')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'input-output' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Input/Output
                </button>
                <button 
                  onClick={() => setActiveTab('timeline')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'timeline' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Timeline
                </button>
                <button 
                  onClick={() => setActiveTab('feedback')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'feedback' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Feedback scores
                </button>
                <button 
                  onClick={() => setActiveTab('metadata')}
                  className={`py-3 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'metadata' 
                      ? 'border-blue-500 text-blue-600' 
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Metadata
                </button>
              </nav>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-12rem)]">
              {/* Input/Output Tab */}
              {activeTab === 'input-output' && (
                <>
                  {/* Input section */}
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Input <span className="text-xs text-gray-500">▲</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {selectedTrace.inputData ? JSON.stringify(selectedTrace.inputData, null, 2) : 'No input data available'}
                      </pre>
                    </div>
                  </div>

                  {/* Output section */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                      Output <span className="text-xs text-gray-500">▲</span>
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 border">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-x-auto">
                        {selectedTrace.outputData ? JSON.stringify(selectedTrace.outputData, null, 2) : 'No output data available'}
                      </pre>
                    </div>
                  </div>
                </>
              )}

              {/* Timeline Tab - Distributed Spans View */}
              {activeTab === 'timeline' && (
                <div>
                  <SpanTimeline 
                    traceId={selectedTrace.id} 
                    spans={selectedTrace.spans}
                    className="mt-4"
                  />
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === 'feedback' && (
                <TraceFeedback 
                  traceId={selectedTrace.id}
                  projectId={project?.id}
                  onScoresChange={(scores) => {
                    console.log('Feedback scores updated:', scores)
                  }}
                />
              )}

              {/* Metadata Tab */}
              {activeTab === 'metadata' && (
                <MetadataEditor 
                  trace={selectedTrace} 
                  onUpdate={(metadata) => {
                    setSelectedTrace(prev => prev ? { ...prev, metadata } : null)
                  }} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


function ProjectSettings({ project, onUpdate }: { project: Project; onUpdate: (project: Project) => void }) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description,
    department: project.department || '',
    securityLevel: project.securityLevel,
    visibility: project.visibility,
    tags: project.tags.join(', ')
  })

  const handleSave = async () => {
    try {
      const updatedData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      }

      const response = await projectApi.update(project.id, updatedData)
      if (response.success && response.data) {
        onUpdate(response.data)
        setIsEditing(false)
      } else {
        alert('Failed to update project: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('Failed to update project')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: project.name,
      description: project.description,
      department: project.department || '',
      securityLevel: project.securityLevel,
      visibility: project.visibility,
      tags: project.tags.join(', ')
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Settings</h2>
          <p className="text-muted">Configure project details and preferences</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn btn-primary"
          >
            <Settings className="w-4 h-4" />
            Edit Settings
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Project Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Enter project name"
                />
              ) : (
                <p className="text-primary">{project.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Description</label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Enter project description"
                />
              ) : (
                <p className="text-muted">{project.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Department</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input w-full"
                  placeholder="Enter department"
                />
              ) : (
                <p className="text-primary">{project.department || 'Not assigned'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Security & Access</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Security Level</label>
              {isEditing ? (
                <select
                  value={formData.securityLevel}
                  onChange={(e) => setFormData({ ...formData, securityLevel: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              ) : (
                <p className="text-primary capitalize">{project.securityLevel}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Visibility</label>
              {isEditing ? (
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="private">Private</option>
                  <option value="team">Team</option>
                  <option value="organization">Organization</option>
                </select>
              ) : (
                <p className="text-primary capitalize">{project.visibility}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Created</label>
              <p className="text-muted">{new Date(project.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tags & Classification */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Tags & Classification</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="input w-full"
                  placeholder="Enter tags separated by commas"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length === 0 && (
                    <span className="text-muted">No tags assigned</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Template</label>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                  <Zap className={`w-4 h-4 text-${project.color}`} />
                </div>
                <span className="text-primary">{project.template}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Status</label>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'active' 
                  ? 'bg-success/20 text-success' 
                  : project.status === 'warning'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-error/20 text-error'
              }`}>
                {project.status}
              </div>
            </div>
          </div>
        </div>

        {/* Project Statistics */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Project Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted">Active Agents:</span>
              <span className="text-primary font-medium">{project.agents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Conversations:</span>
              <span className="text-primary font-medium">{project.conversations.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Success Rate:</span>
              <span className="text-primary font-medium">{project.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Last Modified:</span>
              <span className="text-muted">{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          <button 
            onClick={handleCancel}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card p-6 border-error/20">
        <h3 className="font-semibold text-error mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-primary">Delete Project</h4>
            <p className="text-sm text-muted">Permanently delete this project and all associated data</p>
          </div>
          <button className="btn btn-error">
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}

// Evaluation Detail Modal Component
interface EvaluationDetailModalProps {
  isOpen: boolean
  onClose: () => void
  evaluation: any
}

function EvaluationDetailModal({ isOpen, onClose, evaluation }: EvaluationDetailModalProps) {
  if (!isOpen) return null

  const results = evaluation.results ? JSON.parse(evaluation.results) : null
  const config = evaluation.configuration ? JSON.parse(evaluation.configuration) : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg border shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-primary">{evaluation.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                evaluation.status === 'completed' ? 'bg-success/10 text-success' :
                evaluation.status === 'running' ? 'bg-warning/10 text-warning' :
                'bg-muted/20 text-muted'
              }`}>
                {evaluation.status || 'pending'}
              </span>
              <span className="text-sm text-muted">
                {new Date(evaluation.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-accent-alpha rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Evaluation Configuration */}
          <div>
            <h3 className="text-lg font-medium text-primary mb-3">Configuration</h3>
            <div className="bg-accent-alpha p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Type:</span>
                  <span className="ml-2 text-muted">{evaluation.type || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium">Project:</span>
                  <span className="ml-2 text-muted">{evaluation.project_name || 'N/A'}</span>
                </div>
                {config?.metrics && (
                  <div className="col-span-2">
                    <span className="font-medium">Metrics:</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {config.metrics.map((metric: string, index: number) => (
                        <span key={index} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                          {metric}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Evaluation Results */}
          {results ? (
            <div>
              <h3 className="text-lg font-medium text-primary mb-3">Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-accent-alpha p-4 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {results.items_evaluated || 0}
                  </div>
                  <div className="text-sm text-muted">Items Evaluated</div>
                </div>
                <div className="bg-accent-alpha p-4 rounded-lg">
                  <div className="text-2xl font-bold text-success">
                    {results.average_score ? `${(results.average_score * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-muted">Average Score</div>
                </div>
                <div className="bg-accent-alpha p-4 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {results.pass_rate ? `${(results.pass_rate * 100).toFixed(1)}%` : 'N/A'}
                  </div>
                  <div className="text-sm text-muted">Pass Rate</div>
                </div>
              </div>

              {results.metric_summaries && (
                <div>
                  <h4 className="font-medium text-primary mb-3">Metric Performance</h4>
                  <div className="space-y-3">
                    {Object.entries(results.metric_summaries).map(([metric, summary]: [string, any]) => (
                      <div key={metric} className="bg-accent-alpha p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-primary">{metric}</span>
                          <span className="text-sm text-muted">
                            {summary.passedExecutions || 0}/{summary.totalExecutions || 0} passed
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted">Average Score:</span>
                            <span className="ml-2 font-medium">
                              {summary.averageScore ? `${(summary.averageScore * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted">Pass Rate:</span>
                            <span className="ml-2 font-medium">
                              {summary.passRate ? `${(summary.passRate * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h3 className="text-lg font-medium text-primary mb-3">Results</h3>
              <div className="bg-accent-alpha p-8 rounded-lg text-center">
                <TestTube className="w-12 h-12 text-muted mx-auto mb-3" />
                <p className="text-muted">
                  {evaluation.status === 'pending' 
                    ? 'This evaluation has not been executed yet.'
                    : 'No results available for this evaluation.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Raw Configuration (for debugging) */}
          {config && (
            <details className="bg-accent-alpha p-4 rounded-lg">
              <summary className="font-medium text-primary cursor-pointer">Raw Configuration</summary>
              <pre className="mt-3 text-xs text-muted overflow-x-auto">
                {JSON.stringify(config, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted hover:text-primary hover:bg-accent-alpha rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}