'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Filter, Search, RefreshCw, Download, Eye, Clock, DollarSign, Zap, TrendingUp, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface ProjectConversationsProps {
  project: {
    id: string
    name: string
    agents?: Array<{ id: string; name: string }>
  }
}

interface ConversationSession {
  id: string
  project_id: string
  agent_id: string
  agent_name: string
  session_id: string
  turn_count: number
  total_cost: number
  total_tokens: number
  started_at: string
  last_activity: string
  status: 'active' | 'completed' | 'error'
  conversation_spans: Array<{
    id: string
    conversation_turn: number
    conversation_role: string
    input_data?: string
    output_data?: string
    duration?: number
    cost?: number
    tokens?: number
  }>
}

export function ProjectConversations({ project }: ProjectConversationsProps) {
  const [conversations, setConversations] = useState<ConversationSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<ConversationSession | null>(null)

  const fetchConversations = async () => {
    setLoading(true)
    try {
      // Fetch conversation spans for this project
      const spansResponse = await fetch(`/api/v1/spans?limit=500`)
      const spansData = await spansResponse.json()

      if (spansData.success) {
        const allSpans = spansData.data || []
        
        // Filter spans for this project with conversation data
        let conversationSpans = allSpans.filter((span: any) => 
          span.project_id === project.id && 
          span.conversation_session_id && 
          span.conversation_role
        )
        
        // If no conversation spans found for this project, show all conversation spans
        if (conversationSpans.length === 0) {
          console.log(`No conversations found for project ${project.id}, showing all conversation spans`)
          conversationSpans = allSpans.filter((span: any) => 
            span.conversation_session_id && 
            span.conversation_role
          )
        }

        // Group by conversation session
        const sessionMap = new Map<string, any[]>()
        conversationSpans.forEach((span: any) => {
          const sessionId = span.conversation_session_id
          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, [])
          }
          sessionMap.get(sessionId)?.push(span)
        })

        // Transform into conversation sessions
        const conversationSessions: ConversationSession[] = Array.from(sessionMap.entries()).map(([sessionId, spans]) => {
          const sortedSpans = spans.sort((a, b) => 
            (a.conversation_turn || 0) - (b.conversation_turn || 0) || 
            new Date(a.start_time || 0).getTime() - new Date(b.start_time || 0).getTime()
          )

          const firstSpan = sortedSpans[0]
          const lastSpan = sortedSpans[sortedSpans.length - 1]
          const totalCost = sortedSpans.reduce((sum, s) => sum + (s.total_cost || s.cost || 0), 0)
          const totalTokens = sortedSpans.reduce((sum, s) => sum + (s.total_tokens || 0), 0)
          const maxTurn = Math.max(...sortedSpans.map(s => s.conversation_turn || 1))
          
          // Find agent name from project agents or use agent_id
          const agentName = Array.isArray(project.agents) 
            ? project.agents.find(a => a.id === firstSpan.agent_id)?.name || firstSpan.agent_id || 'Unknown Agent'
            : firstSpan.agent_id || 'Unknown Agent'

          return {
            id: sessionId,
            project_id: project.id,
            agent_id: firstSpan.agent_id || 'unknown',
            agent_name: agentName,
            session_id: sessionId,
            turn_count: maxTurn,
            total_cost: totalCost,
            total_tokens: totalTokens,
            started_at: firstSpan.start_time || firstSpan.created_at,
            last_activity: lastSpan.end_time || lastSpan.updated_at || lastSpan.start_time,
            status: lastSpan.status === 'error' ? 'error' : 'completed',
            conversation_spans: sortedSpans.map(span => ({
              id: span.id,
              conversation_turn: span.conversation_turn,
              conversation_role: span.conversation_role,
              input_data: span.input_data,
              output_data: span.output_data,
              duration: span.duration,
              cost: span.total_cost || span.cost,
              tokens: span.total_tokens
            }))
          }
        })

        // Sort by most recent activity
        conversationSessions.sort((a, b) => 
          new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime()
        )

        setConversations(conversationSessions)
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [project.id])

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    if (selectedAgent && conv.agent_id !== selectedAgent) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        conv.session_id.toLowerCase().includes(query) ||
        conv.agent_name.toLowerCase().includes(query) ||
        conv.conversation_spans.some(span => {
          const input = span.input_data ? JSON.parse(span.input_data) : null
          const output = span.output_data ? JSON.parse(span.output_data) : null
          return (
            (input?.message && input.message.toLowerCase().includes(query)) ||
            (output?.message && output.message.toLowerCase().includes(query))
          )
        })
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Loading conversations...</span>
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No conversations found for this project.</p>
        <p className="text-sm text-gray-400 mt-2">
          Conversations will appear here when agents generate conversation traces.
        </p>
      </div>
    )
  }

  const totalConversations = conversations.length
  const totalCost = conversations.reduce((sum, c) => sum + c.total_cost, 0)
  const totalTokens = conversations.reduce((sum, c) => sum + c.total_tokens, 0)
  const avgTurns = conversations.reduce((sum, c) => sum + c.turn_count, 0) / conversations.length

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            <span className="ml-2 text-sm font-medium text-gray-700">Total Conversations</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">{totalConversations}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-500" />
            <span className="ml-2 text-sm font-medium text-gray-700">Total Cost</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">${totalCost.toFixed(4)}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="ml-2 text-sm font-medium text-gray-700">Total Tokens</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">{totalTokens.toLocaleString()}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="ml-2 text-sm font-medium text-gray-700">Avg Turns</span>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-gray-900">{avgTurns.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="sm:w-48">
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Agents</option>
              {Array.isArray(project.agents) && project.agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchConversations}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Conversations ({filteredConversations.length})
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turns</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Started</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredConversations.map((conversation) => (
                <tr key={conversation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 truncate max-w-32">
                      {conversation.session_id}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{conversation.agent_name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{conversation.turn_count}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">${conversation.total_cost.toFixed(4)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{conversation.total_tokens.toLocaleString()}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {conversation.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {conversation.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {conversation.status === 'active' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                      <span className="ml-2 text-sm text-gray-900 capitalize">{conversation.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-500">
                      {new Date(conversation.started_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedConversation(conversation)}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversation Detail Modal/Panel */}
      {selectedConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">
                Conversation Details - {selectedConversation.agent_name}
              </h2>
              <button
                onClick={() => setSelectedConversation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Conversation Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Turns</div>
                  <div className="text-lg font-semibold">{selectedConversation.turn_count}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total Cost</div>
                  <div className="text-lg font-semibold">${selectedConversation.total_cost.toFixed(4)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Total Tokens</div>
                  <div className="text-lg font-semibold">{selectedConversation.total_tokens.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Status</div>
                  <div className="text-lg font-semibold capitalize">{selectedConversation.status}</div>
                </div>
              </div>

              {/* Natural Chat Interface */}
              <div className="space-y-6">
                <h3 className="text-md font-semibold text-gray-700">Conversation</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto">
                  {selectedConversation.conversation_spans
                    .sort((a, b) => a.conversation_turn - b.conversation_turn)
                    .map((span, index) => {
                      const isUser = span.conversation_role === 'user_input'
                      const isAssistant = span.conversation_role === 'assistant_response'
                      const isProcessing = span.conversation_role === 'agent_processing'
                      
                      // Skip processing spans in the chat view
                      if (isProcessing) return null
                      
                      const message = (() => {
                        try {
                          const data = isUser ? JSON.parse(span.input_data || '{}') : JSON.parse(span.output_data || '{}')
                          return data.message || data.content || (isUser ? span.input_data : span.output_data) || ''
                        } catch {
                          return (isUser ? span.input_data : span.output_data) || ''
                        }
                      })()

                      return (
                        <div key={span.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                            isUser ? 'order-1' : 'order-2'
                          }`}>
                            {/* Avatar */}
                            <div className={`flex items-center ${isUser ? 'justify-end' : 'justify-start'} mb-1`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                                isUser ? 'bg-blue-500' : 'bg-purple-500'
                              }`}>
                                {isUser ? 'U' : 'A'}
                              </div>
                              <span className="ml-2 text-xs text-gray-500">
                                {isUser ? 'User' : selectedConversation.agent_name}
                              </span>
                            </div>
                            
                            {/* Message Bubble */}
                            <div className={`rounded-lg px-4 py-3 ${
                              isUser 
                                ? 'bg-blue-500 text-white ml-auto' 
                                : 'bg-white text-gray-800 border'
                            }`}>
                              <p className="text-sm whitespace-pre-wrap">{message}</p>
                            </div>
                            
                            {/* Metrics */}
                            <div className={`flex items-center gap-3 mt-1 text-xs text-gray-500 ${
                              isUser ? 'justify-end' : 'justify-start'
                            }`}>
                              {span.duration && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {span.duration}ms
                                </span>
                              )}
                              {span.tokens > 0 && (
                                <span className="flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  {span.tokens} tokens
                                </span>
                              )}
                              {span.cost > 0 && (
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  ${span.cost.toFixed(4)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    }).filter(Boolean)}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t bg-gray-50">
              <button
                onClick={() => setSelectedConversation(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}