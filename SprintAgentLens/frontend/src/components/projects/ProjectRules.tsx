'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Plus, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Brain,
  Filter,
  Settings,
  TrendingUp,
  Zap,
  Target
} from 'lucide-react'
import { Project } from '@/lib/types'
import { Rule, RuleExecution, RuleTemplate, RuleMetrics } from '@/types/rules'

interface ProjectRulesProps {
  project: Project
}

export function ProjectRules({ project }: ProjectRulesProps) {
  const [rules, setRules] = useState<Rule[]>([])
  const [ruleExecutions, setRuleExecutions] = useState<RuleExecution[]>([])
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'executions' | 'metrics'>('overview')

  // Built-in rule templates
  const ruleTemplates: RuleTemplate[] = [
    {
      id: 'hallucination_detection',
      name: 'Hallucination Detection',
      description: 'Detect when the AI generates false or unsupported information',
      type: 'llm_judge',
      metric_type: 'hallucination',
      config: {
        prompt: 'Analyze the AI response for any false, unsupported, or fabricated information. Consider the context and expected knowledge.',
        variables: ['input', 'output', 'context'],
        score_definition: {
          type: 'binary'
        }
      },
      is_built_in: true
    },
    {
      id: 'content_moderation',
      name: 'Content Moderation',
      description: 'Flag inappropriate, harmful, or unsafe content in AI responses',
      type: 'llm_judge',
      metric_type: 'moderation',
      config: {
        prompt: 'Evaluate if the content contains harmful, inappropriate, toxic, or unsafe material.',
        variables: ['input', 'output'],
        score_definition: {
          type: 'categorical',
          categories: ['safe', 'mild_concern', 'moderate_risk', 'high_risk']
        }
      },
      is_built_in: true
    },
    {
      id: 'answer_relevance',
      name: 'Answer Relevance',
      description: 'Measure how relevant and helpful the AI response is to the user question',
      type: 'llm_judge',
      metric_type: 'relevance',
      config: {
        prompt: 'Rate how relevant and helpful this response is to the user\'s question or request.',
        variables: ['input', 'output'],
        score_definition: {
          type: 'scale',
          scale: { min: 1, max: 5 }
        }
      },
      is_built_in: true
    },
    {
      id: 'conversation_coherence',
      name: 'Conversation Coherence',
      description: 'Evaluate conversation flow and context consistency across messages',
      type: 'thread_evaluation',
      metric_type: 'coherence',
      config: {
        prompt: 'Analyze the conversation for logical flow, context consistency, and coherent responses.',
        variables: ['conversation_history', 'latest_response'],
        score_definition: {
          type: 'scale',
          scale: { min: 1, max: 10 }
        }
      },
      is_built_in: true
    },
    {
      id: 'user_frustration',
      name: 'User Frustration Detection',
      description: 'Detect signs of user frustration or dissatisfaction',
      type: 'thread_evaluation',
      metric_type: 'frustration',
      config: {
        prompt: 'Analyze user messages for signs of frustration, confusion, or dissatisfaction.',
        variables: ['user_messages', 'conversation_context'],
        score_definition: {
          type: 'scale',
          scale: { min: 0, max: 10 }
        }
      },
      is_built_in: true
    }
  ]

  useEffect(() => {
    fetchRules()
    fetchRuleExecutions()
  }, [project.id])

  const fetchRules = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/rules?projectId=${project.id}`)
      const data = await response.json()
      if (data.success) {
        setRules(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRuleExecutions = async () => {
    try {
      const response = await fetch(`/api/v1/rule-executions?projectId=${project.id}&limit=100`)
      const data = await response.json()
      if (data.success) {
        setRuleExecutions(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch rule executions:', error)
    }
  }

  const createRuleFromTemplate = async (template: RuleTemplate) => {
    try {
      const newRule: Partial<Rule> = {
        name: template.name,
        description: template.description,
        project_id: project.id,
        type: template.type,
        status: 'draft',
        sampling_rate: 10, // Default 10%
        model: 'gpt-4o-mini',
        metric_type: template.metric_type,
        config: {
          ...template.config,
          prompt: template.config.prompt || '',
          variables: template.config.variables || [],
          score_definition: template.config.score_definition || { type: 'binary' }
        }
      }

      const response = await fetch('/api/v1/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRule)
      })

      const data = await response.json()
      if (data.success) {
        setRules(prev => [...prev, data.data])
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to create rule:', error)
    }
  }

  const toggleRuleStatus = async (ruleId: string, newStatus: 'active' | 'inactive') => {
    try {
      const response = await fetch(`/api/v1/rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      if (data.success) {
        setRules(prev => prev.map(rule => 
          rule.id === ruleId ? { ...rule, status: newStatus } : rule
        ))
      }
    } catch (error) {
      console.error('Failed to update rule status:', error)
    }
  }

  const deleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/v1/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRules(prev => prev.filter(rule => rule.id !== ruleId))
      }
    } catch (error) {
      console.error('Failed to delete rule:', error)
    }
  }

  const getStatusIcon = (status: Rule['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive':
        return <Pause className="w-4 h-4 text-yellow-500" />
      case 'draft':
        return <Edit className="w-4 h-4 text-gray-500" />
    }
  }

  const getMetricIcon = (type: Rule['metric_type']) => {
    switch (type) {
      case 'hallucination':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'moderation':
        return <Shield className="w-4 h-4 text-purple-500" />
      case 'relevance':
        return <Target className="w-4 h-4 text-blue-500" />
      case 'coherence':
        return <Brain className="w-4 h-4 text-indigo-500" />
      case 'frustration':
        return <TrendingUp className="w-4 h-4 text-orange-500" />
      case 'custom':
        return <Settings className="w-4 h-4 text-gray-500" />
    }
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'rules', name: 'Rules', icon: Shield },
    { id: 'executions', name: 'Executions', icon: Zap },
    { id: 'metrics', name: 'Metrics', icon: TrendingUp },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading rules...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">Project Rules</h2>
            <p className="text-sm text-muted">Automated evaluation and monitoring rules for {project.name}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4" />
          Create Rule
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{rules.length}</p>
                  <p className="text-sm text-muted">Total Rules</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {rules.filter(r => r.status === 'active').length}
                  </p>
                  <p className="text-sm text-muted">Active Rules</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">
                    {ruleExecutions.length}
                  </p>
                  <p className="text-sm text-muted">Total Executions</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">
                    {ruleExecutions.filter(e => e.status === 'completed').length > 0 
                      ? Math.round((ruleExecutions.filter(e => e.status === 'completed').length / ruleExecutions.length) * 100)
                      : 0}%
                  </p>
                  <p className="text-sm text-muted">Success Rate</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="card p-6">
            <h3 className="font-semibold text-primary mb-4">Recent Rule Executions</h3>
            {ruleExecutions.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-12 h-12 text-muted mx-auto mb-4" />
                <h4 className="font-medium text-primary mb-2">No executions yet</h4>
                <p className="text-muted">Rules will automatically execute on new traces once activated</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ruleExecutions.slice(0, 5).map((execution) => {
                  const rule = rules.find(r => r.id === execution.rule_id)
                  return (
                    <div key={execution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {execution.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : execution.status === 'failed' ? (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium text-primary">{rule?.name || 'Unknown Rule'}</p>
                          <p className="text-sm text-muted">
                            Score: {execution.score || 'N/A'} • {execution.execution_time}ms
                          </p>
                        </div>
                      </div>
                      <div className="text-sm text-muted">
                        {new Date(execution.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="w-16 h-16 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary mb-2">No rules configured</h3>
              <p className="text-muted mb-6 max-w-md mx-auto">
                Create evaluation rules to automatically monitor and score your AI interactions in production.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <Plus className="w-4 h-4" />
                Create Your First Rule
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {rules.map((rule) => (
                <div key={rule.id} className="card p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      {getMetricIcon(rule.metric_type)}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-primary">{rule.name}</h3>
                          {getStatusIcon(rule.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rule.status === 'active' 
                              ? 'bg-green-100 text-green-700'
                              : rule.status === 'inactive'
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {rule.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted">{rule.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                          <span>Type: {rule.type.replace('_', ' ')}</span>
                          <span>Sampling: {rule.sampling_rate}%</span>
                          <span>Model: {rule.model}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleRuleStatus(
                          rule.id, 
                          rule.status === 'active' ? 'inactive' : 'active'
                        )}
                        className={`btn btn-sm ${
                          rule.status === 'active' ? 'btn-outline' : 'btn-primary'
                        }`}
                      >
                        {rule.status === 'active' ? (
                          <>
                            <Pause className="w-3 h-3" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3" />
                            Activate
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => setSelectedRule(rule)}
                        className="btn btn-sm btn-outline"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </button>
                      
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="btn btn-sm btn-outline text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Rule Stats */}
                  <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border">
                    <div className="text-center">
                      <p className="text-lg font-bold text-primary">{rule.stats.total_executions}</p>
                      <p className="text-xs text-muted">Executions</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">
                        {rule.stats.total_executions > 0 
                          ? Math.round((rule.stats.successful_executions / rule.stats.total_executions) * 100)
                          : 0}%
                      </p>
                      <p className="text-xs text-muted">Success Rate</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">
                        {rule.stats.average_score?.toFixed(2) || 'N/A'}
                      </p>
                      <p className="text-xs text-muted">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">
                        ${rule.stats.execution_cost.toFixed(4)}
                      </p>
                      <p className="text-xs text-muted">Total Cost</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-green-600 font-medium">+12.5%</span>
              </div>
              <h3 className="text-2xl font-bold text-primary">3,970</h3>
              <p className="text-sm text-muted">Total Executions</p>
              <p className="text-xs text-muted mt-1">Last 24 hours</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-green-600 font-medium">+2.1%</span>
              </div>
              <h3 className="text-2xl font-bold text-primary">96.8%</h3>
              <p className="text-sm text-muted">Success Rate</p>
              <p className="text-xs text-muted mt-1">3,847 successful</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm text-red-600 font-medium">-0.3%</span>
              </div>
              <h3 className="text-2xl font-bold text-primary">1,287ms</h3>
              <p className="text-sm text-muted">Avg Execution Time</p>
              <p className="text-xs text-muted mt-1">Within SLA</p>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-orange-600 font-medium">+8.7%</span>
              </div>
              <h3 className="text-2xl font-bold text-primary">$12.90</h3>
              <p className="text-sm text-muted">Total Cost</p>
              <p className="text-xs text-muted mt-1">This month</p>
            </div>
          </div>

          {/* Rule Performance Comparison */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary">Rule Performance Comparison</h3>
              <div className="flex items-center gap-2">
                <select className="text-sm border border-border rounded px-2 py-1">
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 font-medium text-muted">Rule</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Executions</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Success Rate</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Avg Score</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Cost</th>
                    <th className="text-right py-3 px-2 font-medium text-muted">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id} className="border-b border-border hover:bg-gray-50">
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-2">
                          {getMetricIcon(rule.metric_type)}
                          <div>
                            <p className="font-medium text-primary">{rule.name}</p>
                            <p className="text-xs text-muted">{rule.metric_type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right font-medium">
                        {rule.stats.total_executions.toLocaleString()}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={`font-medium ${
                          (rule.stats.successful_executions / rule.stats.total_executions) > 0.95
                            ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {rule.stats.total_executions > 0 
                            ? Math.round((rule.stats.successful_executions / rule.stats.total_executions) * 100)
                            : 0}%
                        </span>
                      </td>
                      <td className="py-4 px-2 text-right font-medium">
                        {rule.stats.average_score?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="py-4 px-2 text-right font-medium">
                        ${rule.stats.execution_cost.toFixed(4)}
                      </td>
                      <td className="py-4 px-2 text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          (rule.stats.successful_executions / rule.stats.total_executions) > 0.95
                            ? 'bg-green-100 text-green-700'
                            : (rule.stats.successful_executions / rule.stats.total_executions) > 0.9
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {(rule.stats.successful_executions / rule.stats.total_executions) > 0.95 ? 'A+' :
                           (rule.stats.successful_executions / rule.stats.total_executions) > 0.9 ? 'A' : 'B'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cost Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Cost Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm">GPT-4o</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$6.45</p>
                    <p className="text-xs text-muted">50%</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm">GPT-4o-mini</span>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">$6.45</p>
                    <p className="text-xs text-muted">50%</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Cost</span>
                    <span>$12.90</span>
                  </div>
                  <p className="text-xs text-muted mt-1">Projected monthly: $387.00</p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-primary mb-4">Detection Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Hallucinations Detected</span>
                  <div className="text-right">
                    <p className="font-medium text-red-600">149</p>
                    <p className="text-xs text-muted">12% rate</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Content Issues Found</span>
                  <div className="text-right">
                    <p className="font-medium text-orange-600">323</p>
                    <p className="text-xs text-muted">15% rate</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Low Relevance Responses</span>
                  <div className="text-right">
                    <p className="font-medium text-yellow-600">28</p>
                    <p className="text-xs text-muted">5% rate</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Issues</span>
                    <span className="text-red-600">500</span>
                  </div>
                  <p className="text-xs text-muted mt-1">12.6% of all evaluations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Execution Timeline */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-primary">Execution Timeline</h3>
              <div className="flex items-center gap-2">
                <button className="btn btn-sm btn-outline">
                  <Clock className="w-4 h-4" />
                  Real-time
                </button>
              </div>
            </div>
            
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted mx-auto mb-2" />
                <p className="text-muted">Execution timeline chart would appear here</p>
                <p className="text-xs text-muted">Integration with charting library needed</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-border">
              <h2 className="text-xl font-bold text-primary">Create New Rule</h2>
              <p className="text-muted">Choose a built-in template or create a custom rule</p>
            </div>

            <div className="p-6">
              <div className="grid gap-4">
                {ruleTemplates.map((template) => (
                  <div key={template.id} className="border border-border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getMetricIcon(template.metric_type)}
                        <div>
                          <h3 className="font-semibold text-primary">{template.name}</h3>
                          <p className="text-sm text-muted">{template.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted">
                            <span>Type: {template.type.replace('_', ' ')}</span>
                            <span>Metric: {template.metric_type}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => createRuleFromTemplate(template)}
                        className="btn btn-primary"
                      >
                        Use Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border flex justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-outline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}