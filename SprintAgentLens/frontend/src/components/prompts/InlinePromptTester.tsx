'use client'

import { useState, useEffect } from 'react'
import { Play, Send, Loader2, Copy, CheckCircle, AlertCircle, RotateCcw, Settings, Clock, Wifi } from 'lucide-react'

interface VariableDefinition {
  name: string
  type: string
  description?: string
  required?: boolean
  defaultValue?: string
}

interface InlinePromptTesterProps {
  template?: string
  variables?: string[]
  variableDefinitions?: VariableDefinition[]
}

interface LLMProvider {
  id: string
  name: string
  type: string
  display_name: string
  description?: string
  status: string
  config: any
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
  model?: string
}

interface ConnectionTestResult {
  success: boolean
  message?: string
  error?: string
  responseTime?: number
  details?: any
}

export function InlinePromptTester({ template, variables, variableDefinitions }: InlinePromptTesterProps) {
  const [variableValues, setVariableValues] = useState<Record<string, string>>({})
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<TestExecution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null)
  const [showSettings, setShowSettings] = useState(true) // Start with settings visible
  const [providers, setProviders] = useState<LLMProvider[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null)
  
  // Test settings
  const [testSettings, setTestSettings] = useState({
    providerId: '',
    model: '',
    temperature: 0.7,
    maxTokens: 1000
  })

  // Initialize variable values when variables change
  useEffect(() => {
    if (variables && variables.length > 0) {
      const initialValues: Record<string, string> = {}
      variables.forEach(variable => {
        const definition = variableDefinitions?.find(def => def.name === variable)
        initialValues[variable] = definition?.defaultValue || ''
      })
      setVariableValues(initialValues)
    }
  }, [variables, variableDefinitions])

  // Load providers on component mount
  useEffect(() => {
    const loadProviders = async () => {
      try {
        const response = await fetch('/api/v1/llm-providers?status=active')
        const data = await response.json()
        
        if (data.success) {
          setProviders(data.providers)
          // Set first provider as default if available
          if (data.providers.length > 0) {
            setTestSettings(prev => ({
              ...prev,
              providerId: data.providers[0].id
            }))
          }
        }
      } catch (error) {
        console.error('Failed to load providers:', error)
      } finally {
        setLoadingProviders(false)
      }
    }

    loadProviders()
  }, [])

  // Update model when provider changes
  useEffect(() => {
    if (testSettings.providerId && providers.length > 0) {
      const selectedProvider = providers.find(p => p.id === testSettings.providerId)
      if (selectedProvider) {
        // Get default model from provider config or type
        const defaultModels = {
          openai: 'gpt-4',
          azure_openai: 'gpt-4',
          anthropic: 'claude-3-sonnet-20240229',
          google: 'gemini-pro',
          xai: 'grok-beta',
          mistral: 'mistral-large-latest'
        }
        const defaultModel = selectedProvider.config?.model || defaultModels[selectedProvider.type as keyof typeof defaultModels] || 'gpt-4'
        setTestSettings(prev => ({
          ...prev,
          model: defaultModel
        }))
      }
    }
  }, [testSettings.providerId, providers])

  const interpolateTemplate = (template: string, vars: Record<string, string>): string => {
    let result = template
    Object.entries(vars).forEach(([key, value]) => {
      // Handle multiple template formats: {{var}}, {var}, $var, ${var}
      const patterns = [
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),  // {{variable}}
        new RegExp(`\\{${key}\\}`, 'g'),        // {variable}
        new RegExp(`\\$\\{${key}\\}`, 'g'),     // ${variable}
        new RegExp(`\\$${key}\\b`, 'g')         // $variable
      ]
      patterns.forEach(pattern => {
        result = result.replace(pattern, value || '')
      })
    })
    return result
  }

  // Test connection to provider
  const testConnection = async () => {
    if (!testSettings.providerId) {
      setConnectionResult({
        success: false,
        error: 'Please select a provider first'
      })
      return
    }

    setIsTestingConnection(true)
    setConnectionResult(null)

    try {
      const response = await fetch('/api/v1/llm/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: testSettings.providerId
        })
      })

      const result = await response.json()
      setConnectionResult(result)
    } catch (error) {
      setConnectionResult({
        success: false,
        error: 'Failed to test connection'
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Execute LLM call with real API
  const executeLLMCall = async (prompt: string, settings: any) => {
    const response = await fetch('/api/v1/llm/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        providerId: settings.providerId,
        prompt,
        model: settings.model,
        temperature: settings.temperature,
        maxTokens: settings.maxTokens
      })
    })

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error)
    }

    return result
  }

  const executePrompt = async () => {
    if (!template) return
    
    if (!testSettings.providerId) {
      const execution: TestExecution = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        input: variableValues,
        output: '',
        executionTime: 0,
        success: false,
        error: 'Please select a provider before testing'
      }
      setExecutionHistory(prev => [execution, ...prev])
      setSelectedExecution(execution)
      return
    }

    setIsExecuting(true)
    const startTime = Date.now()

    try {
      // Interpolate template with variables
      const finalPrompt = interpolateTemplate(template, variableValues)

      // Execute with real LLM API
      const result = await executeLLMCall(finalPrompt, testSettings)
      const endTime = Date.now()
      const executionTime = endTime - startTime

      const execution: TestExecution = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        input: { ...variableValues, _finalPrompt: finalPrompt },
        output: result.output,
        executionTime: result.executionTime || executionTime,
        success: true,
        cost: result.cost,
        tokens: result.tokens,
        model: result.model
      }

      setExecutionHistory(prev => [execution, ...prev])
      setSelectedExecution(execution)

    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime

      const execution: TestExecution = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        input: variableValues,
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

  const resetTest = () => {
    setSelectedExecution(null)
    setConnectionResult(null)
    // Reset variables to defaults
    if (variables && variables.length > 0) {
      const initialValues: Record<string, string> = {}
      variables.forEach(variable => {
        const definition = variableDefinitions?.find(def => def.name === variable)
        initialValues[variable] = definition?.defaultValue || ''
      })
      setVariableValues(initialValues)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const finalPrompt = template ? interpolateTemplate(template, variableValues) : ''

  return (
    <div className="h-[600px] flex flex-col bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Test Your Prompt</h3>
          <p className="text-sm text-gray-600">
            Configure provider, fill variables, and test with real LLM APIs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${
              showSettings 
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={resetTest}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Input Panel */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          {/* Settings Panel */}
          {showSettings && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Provider Settings</h4>
                <button
                  onClick={testConnection}
                  disabled={isTestingConnection || !testSettings.providerId}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingConnection ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wifi className="w-3 h-3" />
                  )}
                  Test Connection
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Provider</label>
                  <select 
                    value={testSettings.providerId}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, providerId: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loadingProviders}
                  >
                    {loadingProviders ? (
                      <option value="">Loading providers...</option>
                    ) : providers.length === 0 ? (
                      <option value="">No providers available</option>
                    ) : (
                      <>
                        <option value="">Select provider...</option>
                        {providers.map(provider => (
                          <option key={provider.id} value={provider.id}>
                            {provider.display_name}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Model</label>
                  <select 
                    value={testSettings.model}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={!testSettings.providerId}
                  >
                    {!testSettings.providerId ? (
                      <option value="">Select provider first...</option>
                    ) : (() => {
                      const selectedProvider = providers.find(p => p.id === testSettings.providerId)
                      if (!selectedProvider) return <option value="">Provider not found</option>
                      
                      const modelsByType = {
                        openai: [
                          { value: 'gpt-4', label: 'GPT-4' },
                          { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
                          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                        ],
                        azure_openai: [
                          { value: 'gpt-4', label: 'GPT-4' },
                          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                          { value: 'gpt-35-turbo', label: 'GPT-3.5 Turbo' }
                        ],
                        anthropic: [
                          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
                          { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
                          { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
                        ],
                        google: [
                          { value: 'gemini-pro', label: 'Gemini Pro' },
                          { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
                        ],
                        xai: [
                          { value: 'grok-beta', label: 'Grok Beta' }
                        ],
                        mistral: [
                          { value: 'mistral-large-latest', label: 'Mistral Large' },
                          { value: 'mistral-medium-latest', label: 'Mistral Medium' }
                        ]
                      }
                      
                      const availableModels = modelsByType[selectedProvider.type as keyof typeof modelsByType] || [
                        { value: 'default-model', label: 'Default Model' }
                      ]
                      
                      return availableModels.map(model => (
                        <option key={model.value} value={model.value}>
                          {model.label}
                        </option>
                      ))
                    })()}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Temperature</label>
                  <input
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={testSettings.temperature}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Max Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="4000"
                    value={testSettings.maxTokens}
                    onChange={(e) => setTestSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Connection Test Result */}
              {connectionResult && (
                <div className={`p-2 rounded text-xs ${
                  connectionResult.success 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  <div className="flex items-center gap-2">
                    {connectionResult.success ? (
                      <CheckCircle className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    <span className="font-medium">
                      {connectionResult.success ? 'Connected' : 'Connection Failed'}
                    </span>
                    {connectionResult.responseTime && (
                      <span className="text-xs opacity-75">
                        ({connectionResult.responseTime}ms)
                      </span>
                    )}
                  </div>
                  <p className="mt-1">
                    {connectionResult.message || connectionResult.error}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Variables Input */}
          <div className="flex-1 overflow-auto p-4">
            {!template ? (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Please add a template in the previous step to enable testing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Variables */}
                {variables && variables.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Variables</h4>
                    <div className="space-y-3">
                      {variables.map((variable) => {
                        const definition = variableDefinitions?.find(def => def.name === variable)
                        return (
                          <div key={variable}>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {variable}
                              {definition?.required && <span className="text-red-500 ml-1">*</span>}
                            </label>
                            {definition?.description && (
                              <p className="text-xs text-gray-500 mb-1">{definition.description}</p>
                            )}
                            <textarea
                              value={variableValues[variable] || ''}
                              onChange={(e) => setVariableValues(prev => ({ ...prev, [variable]: e.target.value }))}
                              placeholder={definition?.defaultValue || `Enter ${variable}...`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                              rows={2}
                            />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      No variables detected in your template. You can still test the static prompt.
                    </p>
                  </div>
                )}

                {/* Template Preview */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Final Prompt Preview</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <pre className="text-sm font-mono whitespace-pre-wrap text-gray-700 leading-relaxed">
                      {finalPrompt}
                    </pre>
                  </div>
                </div>

                {/* Execute Button */}
                <button
                  onClick={executePrompt}
                  disabled={isExecuting || !testSettings.providerId}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
            )}
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-1/2 flex flex-col">
          {/* Execution History */}
          <div className="h-48 border-b border-gray-200 overflow-auto">
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Execution History</h4>
              {executionHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No executions yet</p>
              ) : (
                <div className="space-y-2">
                  {executionHistory.map((execution) => (
                    <button
                      key={execution.id}
                      onClick={() => setSelectedExecution(execution)}
                      className={`w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors ${
                        selectedExecution?.id === execution.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {execution.success ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-xs text-gray-500">
                            {execution.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {execution.executionTime}ms
                        </div>
                      </div>
                      {execution.tokens && (
                        <div className="text-xs text-gray-500">
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
                      <div className="text-lg font-bold text-gray-900">{selectedExecution.tokens.total}</div>
                      <div className="text-xs text-gray-500">Total Tokens</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-gray-900">{selectedExecution.executionTime}ms</div>
                      <div className="text-xs text-gray-500">Execution Time</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg text-center">
                      <div className="text-lg font-bold text-gray-900">${selectedExecution.cost?.toFixed(4)}</div>
                      <div className="text-xs text-gray-500">Cost</div>
                    </div>
                  </div>
                )}

                {/* Output Text */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-sm font-medium text-gray-900">AI Response</h5>
                    {selectedExecution.output && (
                      <button
                        onClick={() => copyToClipboard(selectedExecution.output)}
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                        title="Copy response"
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {selectedExecution.output || 'No output generated'}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Test</h3>
                  <p className="text-gray-500 text-sm">
                    Configure your provider settings and click "Execute Prompt" to see real AI responses
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}