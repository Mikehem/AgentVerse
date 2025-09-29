'use client'

import { useState, useEffect } from 'react'
import { Users, MessageSquare, BarChart3, DollarSign, Zap } from 'lucide-react'
import { Project } from '@/lib/types'

interface ProjectOverviewProps {
  project: Project
}

export function ProjectOverview({ project }: ProjectOverviewProps) {
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