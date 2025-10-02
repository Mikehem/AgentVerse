'use client'

import { useState, useEffect } from 'react'
import { X, Play, Copy, CheckCircle, AlertCircle, Clock, Send, Loader2, Settings, RotateCcw, Plus, Trash2, MessageSquare, Database, GitBranch } from 'lucide-react'

interface PromptVersion {
  id: string
  version_number: number
  template: string
  variables: string[]
  is_active: boolean
}

interface Prompt {
  id: string
  name: string
  description?: string
  activeVersion?: PromptVersion
  versions?: PromptVersion[]
}

interface TestExecution {
  id: string
  timestamp: Date
  input: Record<string, string>
  output: string
  executionTime: number
  success: boolean
  error?: string
  cost?: number
  tokens?: {
    input: number
    output: number
    total: number
  }
}

interface Project {
  id: string
  name: string
}

interface PromptTesterProps {
  prompt: Prompt
  project: Project
  onClose: () => void
}

export function PromptTester({ prompt, project, onClose }: PromptTesterProps) {
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<TestExecution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDatasets, setShowDatasets] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null)
  const [availableDatasets, setAvailableDatasets] = useState<any[]>([])
  
  // Test settings
  const [testSettings, setTestSettings] = useState({
    provider: 'openai',
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 1000
  })

  // Message structure for chat-based prompts
  const [messages, setMessages] = useState([
    { role: 'system', content: '' },
    { role: 'user', content: '' }
  ])

  // Provider configurations
  const providers = {
    openai: {
      name: 'OpenAI',
      models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    anthropic: {
      name: 'Anthropic',
      models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229']
    },
    ollama: {
      name: 'Ollama',
      models: ['llama2', 'llama3', 'mistral', 'codellama']
    },
    gemini: {
      name: 'Google Gemini',
      models: ['gemini-pro', 'gemini-pro-vision']
    }
  }

  useEffect(() => {
    // Auto-select active version or first version
    if (prompt.activeVersion) {
      setSelectedVersion(prompt.activeVersion)
      initializeVariables(prompt.activeVersion)
    } else if (prompt.versions && prompt.versions.length > 0) {
      const firstVersion = prompt.versions[0]
      setSelectedVersion(firstVersion)
      initializeVariables(firstVersion)
    }
    
    // Fetch available datasets for this project
    fetchDatasets()
  }, [prompt])

  const fetchDatasets = async () => {
    try {
      const response = await fetch(`/api/v1/datasets?projectId=${project.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAvailableDatasets(data.data || [])
        }
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error)
    }
  }

  const initializeVariables = (version: PromptVersion) => {
    const initialVars: Record<string, string> = {}
    const variables = Array.isArray(version.variables) ? version.variables : []
    variables.forEach(variable => {
      initialVars[variable] = ''
    })
    setVariables(initialVars)
    
    // Initialize messages with template content if available
    if (version.template && version.template.trim()) {
      setMessages([
        { role: 'user', content: version.template }
      ])
    } else {
      setMessages([
        { role: 'system', content: '' },
        { role: 'user', content: '' }
      ])
    }
  }

  const handleVersionChange = (versionId: string) => {
    const version = prompt.versions?.find(v => v.id === versionId)
    if (version) {
      setSelectedVersion(version)
      initializeVariables(version)
    }
  }

  const interpolateTemplate = (template: string, vars: Record<string, string>): string => {
    let result = template
    Object.entries(vars).forEach(([key, value]) => {
      // Handle multiple template formats: {{var}}, {var}, $var, ${var}
      const patterns = [
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        new RegExp(`\\{${key}\\}`, 'g'),
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        new RegExp(`\\$${key}\\b`, 'g')
      ]
      patterns.forEach(pattern => {
        result = result.replace(pattern, value)
      })
    })
    return result
  }

  const executePrompt = async () => {
    if (!selectedVersion) return

    setIsExecuting(true)
    const startTime = Date.now()

    try {
      // Interpolate variables in messages
      const messagesForAPI = messages
        .filter(msg => msg.content.trim() !== '') // Filter out empty messages
        .map(msg => ({
          role: msg.role,
          content: interpolateTemplate(msg.content, variables)
        }))

      // If no messages configured, fall back to template
      if (messagesForAPI.length === 0 && selectedVersion.template) {
        const finalPrompt = interpolateTemplate(selectedVersion.template, variables)
        messagesForAPI.push({ role: 'user', content: finalPrompt })
      }

      if (messagesForAPI.length === 0) {
        throw new Error('No messages configured for execution')
      }

      // Call playground API
      const playgroundResult = await callPlaygroundAPI(messagesForAPI, testSettings, variables)
      const endTime = Date.now()
      const executionTime = endTime - startTime

      const execution: TestExecution = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        input: { 
          ...variables, 
          _messages: messagesForAPI,
          _template: selectedVersion.template ? interpolateTemplate(selectedVersion.template, variables) : undefined
        },
        output: playgroundResult.output || '',
        executionTime,
        success: playgroundResult.success,
        error: playgroundResult.error,
        cost: playgroundResult.cost,
        tokens: playgroundResult.tokens
      }

      setExecutionHistory(prev => [execution, ...prev])
      setSelectedExecution(execution)
      setOutput(playgroundResult.output || '')

    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime

      const execution: TestExecution = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        input: variables,
        output: '',
        executionTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }

      setExecutionHistory(prev => [execution, ...prev])
      setSelectedExecution(execution)
    } finally {
      setIsExecuting(false)
    }
  }

  // Real API call to playground endpoint
  const callPlaygroundAPI = async (messages: any[], settings: any, variables: Record<string, string>) => {
    try {
      const response = await fetch('/api/v1/playground', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: project.id,
          provider: settings.provider,
          model: settings.model,
          messages,
          settings: {
            temperature: settings.temperature,
            maxTokens: settings.maxTokens
          },
          variables
        })
      })

      const data = await response.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Playground API call failed')
      }

      const result = {
        success: true,
        output: data.data.content,
        cost: data.data.cost,
        tokens: {
          input: data.data.usage.promptTokens,
          output: data.data.usage.completionTokens,
          total: data.data.usage.totalTokens
        },
        latency: data.data.latency,
        model: data.data.model,
        provider: data.data.provider
      }

      // Log conversation to project (the API already handles this, but we can add explicit logging here if needed)
      await logConversationToProject(messages, result, settings, variables)

      return result
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Network error'
      }
    }
  }

  // Log conversation to project conversations
  const logConversationToProject = async (messages: any[], result: any, settings: any, variables: Record<string, string>) => {
    try {
      await fetch('/api/v1/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_id: project.id,
          agent_id: `prompt_tester_${prompt.id}`,
          agent_name: `Prompt Tester: ${prompt.name}`,
          messages: messages.map((msg, index) => ({
            id: `msg_${Date.now()}_${index}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString()
          })),
          response: result.output,
          status: result.success ? 'success' : 'error',
          total_cost: result.cost || 0,
          input_tokens: result.tokens?.input || 0,
          output_tokens: result.tokens?.output || 0,
          total_tokens: result.tokens?.total || 0,
          latency: result.latency || 0,
          provider: settings.provider,
          model: settings.model,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          metadata: {
            prompt_version: selectedVersion?.version_number,
            variables,
            dataset_id: selectedDataset
          }
        })
      })
    } catch (error) {
      console.error('Failed to log conversation to project:', error)
      // Don't throw error here as it shouldn't break the main flow
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const resetTest = () => {
    setOutput('')
    setSelectedExecution(null)
    if (selectedVersion) {
      initializeVariables(selectedVersion)
    }
    setMessages([
      { role: 'system', content: '' },
      { role: 'user', content: '' }
    ])
  }

  const addMessage = () => {
    setMessages(prev => [...prev, { role: 'user', content: '' }])
  }

  const updateMessage = (index: number, field: 'role' | 'content', value: string) => {
    setMessages(prev => prev.map((msg, i) => 
      i === index ? { ...msg, [field]: value } : msg
    ))
  }

  const removeMessage = (index: number) => {
    if (messages.length > 1) {
      setMessages(prev => prev.filter((_, i) => i !== index))
    }
  }

  const duplicatePrompt = () => {
    // Create a new version of the current prompt for quick experimentation
    const currentMessages = messages.map(msg => ({...msg}))
    // Logic to save as new version would go here
    console.log('Duplicating prompt with messages:', currentMessages)
  }

  if (!selectedVersion) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p>No versions available for this prompt</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <Play className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-xl font-bold text-primary">Test Prompt</h2>
              <p className="text-sm text-muted">{prompt.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDatasets(!showDatasets)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Connect dataset"
            >
              <Database className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Test settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={resetTest}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
              title="Reset test"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Input Panel */}
          <div className="w-1/2 border-r border-border flex flex-col">
            {/* Version Selector */}
            <div className="p-4 border-b border-border bg-accent/30">
              <label className="text-sm font-medium text-primary mb-2 block">
                Select Version
              </label>
              <select
                value={selectedVersion.id}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {prompt.versions?.map((version) => (
                  <option key={version.id} value={version.id}>
                    v{version.version_number} {version.is_active ? '(Active)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="p-4 border-b border-border bg-yellow-50">
                <h3 className="text-sm font-medium text-primary mb-3">Test Settings</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted">Provider</label>
                    <select 
                      value={testSettings.provider}
                      onChange={(e) => {
                        const newProvider = e.target.value
                        const firstModel = providers[newProvider as keyof typeof providers]?.models[0] || ''
                        setTestSettings(prev => ({ 
                          ...prev, 
                          provider: newProvider,
                          model: firstModel
                        }))
                      }}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    >
                      {Object.entries(providers).map(([key, provider]) => (
                        <option key={key} value={key}>{provider.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">Model</label>
                    <select 
                      value={testSettings.model}
                      onChange={(e) => setTestSettings(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    >
                      {providers[testSettings.provider as keyof typeof providers]?.models.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">Temperature</label>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={testSettings.temperature}
                      onChange={(e) => setTestSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted">Max Tokens</label>
                    <input
                      type="number"
                      min="1"
                      max="4000"
                      value={testSettings.maxTokens}
                      onChange={(e) => setTestSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Dataset Panel */}
            {showDatasets && (
              <div className="p-4 border-b border-border bg-blue-50">
                <h3 className="text-sm font-medium text-primary mb-3">Dataset Connection</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted">Select Dataset</label>
                    <select 
                      value={selectedDataset || ''}
                      onChange={(e) => setSelectedDataset(e.target.value || null)}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    >
                      <option value="">No dataset selected</option>
                      {availableDatasets.map((dataset) => (
                        <option key={dataset.id} value={dataset.id}>
                          {dataset.name} ({dataset.items_count || 0} items)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedDataset && (
                    <div className="bg-white p-2 rounded border text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Database className="w-3 h-3 text-blue-500" />
                        <span className="font-medium">Dataset Connected</span>
                      </div>
                      <p className="text-muted">Variables will be populated from dataset items during experimental runs.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Variables Input */}
            <div className="flex-1 overflow-auto p-4">
              {selectedVersion.variables.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-primary mb-3">Variables</h3>
                  <div className="space-y-3">
                    {selectedVersion.variables.map((variable) => (
                      <div key={variable}>
                        <label className="text-xs font-medium text-primary block mb-1">
                          {variable}
                        </label>
                        <input
                          type="text"
                          value={variables[variable] || ''}
                          onChange={(e) => setVariables(prev => ({ ...prev, [variable]: e.target.value }))}
                          placeholder={`Enter value for ${variable}...`}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Configuration */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-primary">Messages</h3>
                  <button
                    onClick={addMessage}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90"
                  >
                    <Plus className="w-3 h-3" />
                    Add Message
                  </button>
                </div>
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div key={index} className="border border-border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <select
                          value={message.role}
                          onChange={(e) => updateMessage(index, 'role', e.target.value)}
                          className="px-2 py-1 text-xs border border-border rounded"
                        >
                          <option value="system">System</option>
                          <option value="user">User</option>
                          <option value="assistant">Assistant</option>
                        </select>
                        {messages.length > 1 && (
                          <button
                            onClick={() => removeMessage(index)}
                            className="p-1 hover:bg-red-100 rounded transition-colors"
                          >
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </button>
                        )}
                      </div>
                      <textarea
                        value={message.content}
                        onChange={(e) => updateMessage(index, 'content', e.target.value)}
                        placeholder={`Enter ${message.role} message...`}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Template Preview (if using template) */}
              {selectedVersion.template && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-primary mb-2">Template Preview</h3>
                  <div className="bg-gray-50 border border-border rounded-lg p-3">
                    <pre className="text-sm font-mono whitespace-pre-wrap">
                      {interpolateTemplate(selectedVersion.template, variables)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Execute Button */}
              <button
                onClick={executePrompt}
                disabled={isExecuting}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Execute Prompt
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Output Panel */}
          <div className="w-1/2 flex flex-col">
            {/* Execution History */}
            <div className="h-48 border-b border-border overflow-auto">
              <div className="p-4">
                <h3 className="text-sm font-medium text-primary mb-3">Execution History</h3>
                {executionHistory.length === 0 ? (
                  <p className="text-sm text-muted">No executions yet</p>
                ) : (
                  <div className="space-y-2">
                    {executionHistory.map((execution) => (
                      <button
                        key={execution.id}
                        onClick={() => setSelectedExecution(execution)}
                        className={`w-full text-left p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors ${
                          selectedExecution?.id === execution.id ? 'bg-accent' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            {execution.success ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="text-xs text-muted">
                              {execution.timestamp.toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted">
                            <Clock className="w-3 h-3" />
                            {execution.executionTime}ms
                          </div>
                        </div>
                        {execution.tokens && (
                          <div className="text-xs text-muted">
                            {execution.tokens.total} tokens • ${execution.cost?.toFixed(4)}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Output Display */}
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-primary">Output</h3>
                {selectedExecution && (
                  <button
                    onClick={() => copyToClipboard(selectedExecution.output)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    title="Copy output"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {selectedExecution ? (
                <div className="space-y-4">
                  {/* Success/Error Status */}
                  <div className={`p-3 rounded-lg ${
                    selectedExecution.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedExecution.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {selectedExecution.success ? 'Success' : 'Error'}
                      </span>
                    </div>
                    {selectedExecution.error && (
                      <p className="text-sm text-red-700">{selectedExecution.error}</p>
                    )}
                  </div>

                  {/* Metrics */}
                  {selectedExecution.success && selectedExecution.tokens && (
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-primary">{selectedExecution.tokens.total}</div>
                        <div className="text-xs text-muted">Total Tokens</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-primary">{selectedExecution.executionTime}ms</div>
                        <div className="text-xs text-muted">Execution Time</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg text-center">
                        <div className="text-lg font-bold text-primary">${selectedExecution.cost?.toFixed(4)}</div>
                        <div className="text-xs text-muted">Cost</div>
                      </div>
                    </div>
                  )}

                  {/* Output Text */}
                  <div className="bg-gray-50 border border-border rounded-lg p-4">
                    <pre className="text-sm whitespace-pre-wrap leading-relaxed">
                      {selectedExecution.output || 'No output generated'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Play className="w-12 h-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-primary mb-2">Ready to Test</h3>
                    <p className="text-muted">
                      Fill in the variables and click "Execute Prompt" to see the output
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}