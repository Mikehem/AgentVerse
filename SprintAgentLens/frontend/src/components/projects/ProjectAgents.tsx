'use client'

import { useState, useEffect } from 'react'
import { Plus, Users, Brain, Wrench, Code, Copy, Check, MessageSquare, BarChart3, Clock, FileText, CheckCircle, Eye, Edit } from 'lucide-react'
import { agentApi } from '@/lib/api'
import { Project, Agent } from '@/lib/types'
import { AgentCreationForm } from '@/components/agents/AgentCreationForm'

interface ProjectAgentsProps {
  project: Project
  onNavigateToPrompts: () => void
}

export function ProjectAgents({ project, onNavigateToPrompts }: ProjectAgentsProps) {
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