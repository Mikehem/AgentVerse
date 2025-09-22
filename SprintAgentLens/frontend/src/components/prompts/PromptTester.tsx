'use client'

import { useState, useEffect } from 'react'
import { X, Play, Copy, CheckCircle, AlertCircle, Clock, Send, Loader2, Settings, RotateCcw } from 'lucide-react'

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

interface PromptTesterProps {
  prompt: Prompt
  onClose: () => void
}

export function PromptTester({ prompt, onClose }: PromptTesterProps) {
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [output, setOutput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionHistory, setExecutionHistory] = useState<TestExecution[]>([])
  const [selectedExecution, setSelectedExecution] = useState<TestExecution | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  
  // Test settings
  const [testSettings, setTestSettings] = useState({
    provider: 'openai',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000
  })

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
  }, [prompt])

  const initializeVariables = (version: PromptVersion) => {
    const initialVars: Record<string, string> = {}
    const variables = Array.isArray(version.variables) ? version.variables : []
    variables.forEach(variable => {
      initialVars[variable] = ''
    })
    setVariables(initialVars)
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
      // Interpolate template with variables
      const finalPrompt = interpolateTemplate(selectedVersion.template, variables)

      // Mock execution - in real implementation, this would call your LLM API
      const mockExecution = await mockLLMCall(finalPrompt, testSettings)
      const endTime = Date.now()
      const executionTime = endTime - startTime

      const execution: TestExecution = {
        id: `test-${Date.now()}`,
        timestamp: new Date(),
        input: { ...variables, _finalPrompt: finalPrompt },
        output: mockExecution.output,
        executionTime,
        success: mockExecution.success,
        error: mockExecution.error,
        cost: mockExecution.cost,
        tokens: mockExecution.tokens
      }

      setExecutionHistory(prev => [execution, ...prev])
      setSelectedExecution(execution)
      setOutput(mockExecution.output)

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

  // Mock LLM call - replace with actual API call
  const mockLLMCall = async (prompt: string, settings: any) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

    // Mock different responses based on prompt content
    const responses = [
      "This is a mock response to your prompt. In a real implementation, this would be the actual LLM output.",
      "Here's a detailed response that addresses your prompt with multiple points and considerations.",
      "Thank you for your prompt! This is an example of how the AI would respond to your specific request.",
      "Based on your input, here's a comprehensive answer that demonstrates the prompt template functionality.",
    ]

    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    const inputTokens = Math.floor(prompt.length / 4) // Rough estimate
    const outputTokens = Math.floor(randomResponse.length / 4)

    return {
      success: Math.random() > 0.1, // 90% success rate
      output: randomResponse,
      cost: (inputTokens * 0.00003 + outputTokens * 0.00006), // GPT-4 pricing
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      }
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
                      onChange={(e) => setTestSettings(prev => ({ ...prev, provider: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                      <option value="google">Google</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted">Model</label>
                    <select 
                      value={testSettings.model}
                      onChange={(e) => setTestSettings(prev => ({ ...prev, model: e.target.value }))}
                      className="w-full px-2 py-1 text-sm border border-border rounded"
                    >
                      <option value="gpt-4">GPT-4</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                      <option value="claude-3">Claude 3</option>
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

            {/* Variables Input */}
            <div className="flex-1 overflow-auto p-4">
              <h3 className="text-sm font-medium text-primary mb-3">Variables</h3>
              {selectedVersion.variables.length === 0 ? (
                <p className="text-sm text-muted">No variables defined for this template</p>
              ) : (
                <div className="space-y-3">
                  {selectedVersion.variables.map((variable) => (
                    <div key={variable}>
                      <label className="text-xs font-medium text-primary block mb-1">
                        {variable}
                      </label>
                      <textarea
                        value={variables[variable] || ''}
                        onChange={(e) => setVariables(prev => ({ ...prev, [variable]: e.target.value }))}
                        placeholder={`Enter value for ${variable}...`}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              )}
              
              {/* Template Preview */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-primary mb-2">Template Preview</h3>
                <div className="bg-gray-50 border border-border rounded-lg p-3">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {interpolateTemplate(selectedVersion.template, variables)}
                  </pre>
                </div>
              </div>

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