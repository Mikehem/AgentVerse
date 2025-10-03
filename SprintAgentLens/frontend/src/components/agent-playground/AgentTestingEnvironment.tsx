'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { 
  Play, 
  Stop, 
  Pause, 
  RotateCcw, 
  Download, 
  Upload,
  Settings,
  TestTube,
  MessageSquare,
  Bot,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  BarChart3,
  Zap,
  Target,
  Users,
  ArrowRight,
  Save,
  Trash2,
  Plus,
  Copy,
  Edit,
  PlayCircle,
  StopCircle
} from 'lucide-react'

interface TestScenario {
  id: string
  name: string
  description: string
  inputs: TestInput[]
  expectedOutputs: string[]
  parameters: TestParameters
  status: 'draft' | 'running' | 'completed' | 'failed'
  results?: TestResult[]
}

interface TestInput {
  id: string
  type: 'text' | 'file' | 'json' | 'url'
  label: string
  value: string
  required: boolean
}

interface TestParameters {
  maxDuration: number
  iterations: number
  parallelRuns: number
  randomSeed?: number
  temperature?: number
  maxTokens?: number
}

interface TestResult {
  id: string
  scenarioId: string
  input: string
  output: string
  duration: number
  tokenUsage: number
  cost: number
  success: boolean
  error?: string
  timestamp: Date
  metadata: any
}

interface ConversationMessage {
  id: string
  type: 'user' | 'agent' | 'system'
  content: string
  timestamp: Date
  metadata?: any
}

interface PerformanceMetrics {
  averageResponseTime: number
  successRate: number
  totalTokens: number
  totalCost: number
  errorCount: number
  testCount: number
}

interface AgentTestingEnvironmentProps {
  agent: any
  onTestComplete: (results: TestResult[]) => void
}

const predefinedScenarios: Partial<TestScenario>[] = [
  {
    name: 'Basic Conversation',
    description: 'Test basic conversational capabilities',
    inputs: [
      { id: '1', type: 'text', label: 'Greeting', value: 'Hello, how are you?', required: true },
      { id: '2', type: 'text', label: 'Question', value: 'What can you help me with?', required: true },
    ],
    expectedOutputs: ['Friendly greeting response', 'List of capabilities']
  },
  {
    name: 'Task Execution',
    description: 'Test specific task completion',
    inputs: [
      { id: '1', type: 'text', label: 'Task Request', value: 'Calculate 2 + 2', required: true },
      { id: '2', type: 'text', label: 'Complex Task', value: 'What is the square root of 144?', required: true },
    ],
    expectedOutputs: ['4', '12']
  },
  {
    name: 'Tool Usage',
    description: 'Test tool integration and usage',
    inputs: [
      { id: '1', type: 'text', label: 'Search Query', value: 'Search for the latest news about AI', required: true },
      { id: '2', type: 'text', label: 'Calculation', value: 'Calculate the area of a circle with radius 5', required: true },
    ],
    expectedOutputs: ['Search results with AI news', 'Approximately 78.54 square units']
  },
  {
    name: 'Error Handling',
    description: 'Test error handling and recovery',
    inputs: [
      { id: '1', type: 'text', label: 'Invalid Input', value: '!@#$%^&*()', required: true },
      { id: '2', type: 'text', label: 'Ambiguous Request', value: 'Do that thing', required: true },
    ],
    expectedOutputs: ['Error handled gracefully', 'Clarification request']
  }
]

export function AgentTestingEnvironment({ agent, onTestComplete }: AgentTestingEnvironmentProps) {
  const [activeTab, setActiveTab] = useState('scenarios')
  const [scenarios, setScenarios] = useState<TestScenario[]>([])
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null)
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [currentInput, setCurrentInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageResponseTime: 0,
    successRate: 0,
    totalTokens: 0,
    totalCost: 0,
    errorCount: 0,
    testCount: 0
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const createScenario = useCallback((template?: Partial<TestScenario>) => {
    const newScenario: TestScenario = {
      id: `scenario-${Date.now()}`,
      name: template?.name || 'New Test Scenario',
      description: template?.description || 'Custom test scenario',
      inputs: template?.inputs || [
        { id: '1', type: 'text', label: 'Input', value: '', required: true }
      ],
      expectedOutputs: template?.expectedOutputs || ['Expected response'],
      parameters: {
        maxDuration: 30000,
        iterations: 1,
        parallelRuns: 1,
        randomSeed: Math.floor(Math.random() * 1000),
        temperature: 0.7,
        maxTokens: 1000
      },
      status: 'draft'
    }
    
    setScenarios(prev => [...prev, newScenario])
    setSelectedScenario(newScenario)
  }, [])

  const updateScenario = useCallback((scenarioId: string, updates: Partial<TestScenario>) => {
    setScenarios(prev => prev.map(scenario => 
      scenario.id === scenarioId ? { ...scenario, ...updates } : scenario
    ))
    if (selectedScenario?.id === scenarioId) {
      setSelectedScenario(prev => prev ? { ...prev, ...updates } : null)
    }
  }, [selectedScenario])

  const runScenario = useCallback(async (scenario: TestScenario) => {
    updateScenario(scenario.id, { status: 'running' })
    setIsRunning(true)

    const results: TestResult[] = []

    try {
      for (let i = 0; i < scenario.parameters.iterations; i++) {
        for (const input of scenario.inputs) {
          if (!input.value.trim() && input.required) continue

          const startTime = Date.now()
          
          // Simulate agent execution
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000))
          
          const duration = Date.now() - startTime
          const success = Math.random() > 0.2 // 80% success rate
          const tokenUsage = Math.floor(Math.random() * 100) + 20
          const cost = tokenUsage * 0.0001

          const result: TestResult = {
            id: `result-${Date.now()}-${i}`,
            scenarioId: scenario.id,
            input: input.value,
            output: success 
              ? `Simulated response to: ${input.value}`
              : `Error processing: ${input.value}`,
            duration,
            tokenUsage,
            cost,
            success,
            error: success ? undefined : 'Simulated error for testing',
            timestamp: new Date(),
            metadata: {
              iteration: i + 1,
              inputType: input.type,
              temperature: scenario.parameters.temperature,
              maxTokens: scenario.parameters.maxTokens
            }
          }

          results.push(result)
          setTestResults(prev => [...prev, result])
        }
      }

      updateScenario(scenario.id, { 
        status: 'completed',
        results
      })

      // Update metrics
      const successCount = results.filter(r => r.success).length
      const totalDuration = results.reduce((sum, r) => sum + r.duration, 0)
      const totalTokens = results.reduce((sum, r) => sum + r.tokenUsage, 0)
      const totalCost = results.reduce((sum, r) => sum + r.cost, 0)

      setMetrics(prev => ({
        averageResponseTime: totalDuration / results.length,
        successRate: (successCount / results.length) * 100,
        totalTokens: prev.totalTokens + totalTokens,
        totalCost: prev.totalCost + totalCost,
        errorCount: prev.errorCount + (results.length - successCount),
        testCount: prev.testCount + results.length
      }))

    } catch (error) {
      updateScenario(scenario.id, { status: 'failed' })
    } finally {
      setIsRunning(false)
    }

    onTestComplete(results)
  }, [updateScenario, onTestComplete])

  const sendMessage = useCallback(async () => {
    if (!currentInput.trim() || isRunning) return

    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: currentInput,
      timestamp: new Date()
    }

    setConversation(prev => [...prev, userMessage])
    setCurrentInput('')
    setIsRunning(true)

    try {
      // Simulate agent response
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000))

      const agentMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        type: 'agent',
        content: `I understand you said: "${userMessage.content}". Let me help you with that.`,
        timestamp: new Date(),
        metadata: {
          processingTime: Math.random() * 3000 + 1000,
          tokenUsage: Math.floor(Math.random() * 100) + 20,
          cost: (Math.floor(Math.random() * 100) + 20) * 0.0001
        }
      }

      setConversation(prev => [...prev, agentMessage])
    } catch (error) {
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        type: 'system',
        content: 'Error: Failed to get response from agent',
        timestamp: new Date()
      }
      setConversation(prev => [...prev, errorMessage])
    } finally {
      setIsRunning(false)
    }
  }, [currentInput, isRunning])

  const getStatusIcon = (status: TestScenario['status']) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />
      case 'running': return <Clock className="w-4 h-4 animate-spin" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: TestScenario['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agent Testing Environment</h2>
          <p className="text-gray-600">Test and validate your agent's behavior and performance</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Import Tests
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
          <TabsTrigger value="interactive">Interactive Testing</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Scenario List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Test Scenarios</CardTitle>
                    <Button size="sm" onClick={() => createScenario()}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription>
                    {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''} created
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="space-y-1">
                    {/* Predefined Templates */}
                    <div className="p-3 border-b">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Templates</h4>
                      <div className="space-y-1">
                        {predefinedScenarios.map((template, index) => (
                          <button
                            key={index}
                            className="w-full text-left p-2 text-sm hover:bg-gray-50 rounded transition-colors"
                            onClick={() => createScenario(template)}
                          >
                            {template.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Scenarios */}
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className={`p-3 cursor-pointer transition-colors border-l-4 ${
                          selectedScenario?.id === scenario.id
                            ? 'bg-sage-50 border-sage-500'
                            : 'border-transparent hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedScenario(scenario)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-sm truncate">{scenario.name}</h4>
                          <Badge className={`text-xs ${getStatusColor(scenario.status)}`}>
                            {getStatusIcon(scenario.status)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                          {scenario.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {scenario.inputs.length} input{scenario.inputs.length !== 1 ? 's' : ''}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              runScenario(scenario)
                            }}
                            disabled={scenario.status === 'running'}
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}

                    {scenarios.length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No scenarios yet</p>
                        <p className="text-xs">Create your first test scenario</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scenario Configuration */}
            <div className="lg:col-span-2">
              {selectedScenario ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Scenario Configuration</CardTitle>
                        <CardDescription>
                          Configure test inputs and parameters
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm"
                          onClick={() => runScenario(selectedScenario)}
                          disabled={selectedScenario.status === 'running'}
                          className="bg-sage-600 hover:bg-sage-700"
                        >
                          {selectedScenario.status === 'running' ? (
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {selectedScenario.status === 'running' ? 'Running...' : 'Run Test'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const duplicated = {
                              ...selectedScenario,
                              id: `scenario-${Date.now()}`,
                              name: `${selectedScenario.name} (Copy)`,
                              status: 'draft' as const
                            }
                            setScenarios(prev => [...prev, duplicated])
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="scenario-name">Scenario Name</Label>
                        <Input
                          id="scenario-name"
                          value={selectedScenario.name}
                          onChange={(e) => updateScenario(selectedScenario.id, { name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="scenario-status">Status</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(selectedScenario.status)}>
                            {getStatusIcon(selectedScenario.status)}
                            <span className="ml-1 capitalize">{selectedScenario.status}</span>
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="scenario-description">Description</Label>
                      <Textarea
                        id="scenario-description"
                        value={selectedScenario.description}
                        onChange={(e) => updateScenario(selectedScenario.id, { description: e.target.value })}
                        rows={3}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label>Test Inputs</Label>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            const newInput: TestInput = {
                              id: `input-${Date.now()}`,
                              type: 'text',
                              label: 'New Input',
                              value: '',
                              required: false
                            }
                            updateScenario(selectedScenario.id, {
                              inputs: [...selectedScenario.inputs, newInput]
                            })
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Input
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {selectedScenario.inputs.map((input, index) => (
                          <Card key={input.id} className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Input
                                value={input.label}
                                onChange={(e) => {
                                  const updatedInputs = selectedScenario.inputs.map(inp =>
                                    inp.id === input.id ? { ...inp, label: e.target.value } : inp
                                  )
                                  updateScenario(selectedScenario.id, { inputs: updatedInputs })
                                }}
                                className="font-medium"
                                placeholder="Input label"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700"
                                onClick={() => {
                                  const updatedInputs = selectedScenario.inputs.filter(inp => inp.id !== input.id)
                                  updateScenario(selectedScenario.id, { inputs: updatedInputs })
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <Select 
                                value={input.type}
                                onValueChange={(value: any) => {
                                  const updatedInputs = selectedScenario.inputs.map(inp =>
                                    inp.id === input.id ? { ...inp, type: value } : inp
                                  )
                                  updateScenario(selectedScenario.id, { inputs: updatedInputs })
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="text">Text</SelectItem>
                                  <SelectItem value="file">File</SelectItem>
                                  <SelectItem value="json">JSON</SelectItem>
                                  <SelectItem value="url">URL</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={input.required}
                                  onChange={(e) => {
                                    const updatedInputs = selectedScenario.inputs.map(inp =>
                                      inp.id === input.id ? { ...inp, required: e.target.checked } : inp
                                    )
                                    updateScenario(selectedScenario.id, { inputs: updatedInputs })
                                  }}
                                  className="rounded"
                                />
                                <Label className="text-xs">Required</Label>
                              </div>
                            </div>
                            <Textarea
                              value={input.value}
                              onChange={(e) => {
                                const updatedInputs = selectedScenario.inputs.map(inp =>
                                  inp.id === input.id ? { ...inp, value: e.target.value } : inp
                                )
                                updateScenario(selectedScenario.id, { inputs: updatedInputs })
                              }}
                              placeholder="Enter test input..."
                              rows={2}
                            />
                          </Card>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Test Parameters</Label>
                      <div className="grid grid-cols-2 gap-4 mt-2">
                        <div>
                          <Label htmlFor="iterations" className="text-sm">Iterations</Label>
                          <Input
                            id="iterations"
                            type="number"
                            value={selectedScenario.parameters.iterations}
                            onChange={(e) => updateScenario(selectedScenario.id, {
                              parameters: { 
                                ...selectedScenario.parameters, 
                                iterations: parseInt(e.target.value) || 1 
                              }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="max-duration" className="text-sm">Max Duration (ms)</Label>
                          <Input
                            id="max-duration"
                            type="number"
                            value={selectedScenario.parameters.maxDuration}
                            onChange={(e) => updateScenario(selectedScenario.id, {
                              parameters: { 
                                ...selectedScenario.parameters, 
                                maxDuration: parseInt(e.target.value) || 30000 
                              }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="temperature" className="text-sm">Temperature</Label>
                          <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            value={selectedScenario.parameters.temperature || 0.7}
                            onChange={(e) => updateScenario(selectedScenario.id, {
                              parameters: { 
                                ...selectedScenario.parameters, 
                                temperature: parseFloat(e.target.value) || 0.7 
                              }
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="max-tokens" className="text-sm">Max Tokens</Label>
                          <Input
                            id="max-tokens"
                            type="number"
                            value={selectedScenario.parameters.maxTokens || 1000}
                            onChange={(e) => updateScenario(selectedScenario.id, {
                              parameters: { 
                                ...selectedScenario.parameters, 
                                maxTokens: parseInt(e.target.value) || 1000 
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <TestTube className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Scenario Selected
                    </h3>
                    <p className="text-gray-600 mb-6">
                      Select a test scenario from the list or create a new one to get started
                    </p>
                    <Button onClick={() => createScenario()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Scenario
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="interactive" className="space-y-6">
          <Card className="h-96">
            <CardHeader>
              <CardTitle>Interactive Chat</CardTitle>
              <CardDescription>
                Test your agent interactively with real-time conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                {conversation.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Start a conversation with your agent</p>
                    </div>
                  </div>
                ) : (
                  conversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-sage-600 text-white'
                            : message.type === 'agent'
                            ? 'bg-gray-100 text-gray-900'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                        {message.metadata && (
                          <div className="text-xs opacity-70 mt-1">
                            {message.metadata.processingTime && (
                              <span>⏱️ {(message.metadata.processingTime / 1000).toFixed(2)}s</span>
                            )}
                            {message.metadata.tokenUsage && (
                              <span className="ml-2">🔤 {message.metadata.tokenUsage} tokens</span>
                            )}
                            {message.metadata.cost && (
                              <span className="ml-2">💰 ${message.metadata.cost.toFixed(4)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="flex gap-2">
                <Input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  placeholder="Type your message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isRunning}
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!currentInput.trim() || isRunning}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  {isRunning ? (
                    <Clock className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConversation([])}
                  disabled={conversation.length === 0}
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>
                View detailed results from your test scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              {testResults.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No test results yet</p>
                  <p className="text-sm">Run some test scenarios to see results here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {testResults.slice(-10).reverse().map((result) => (
                    <Card key={result.id} className={`${result.success ? 'border-green-200' : 'border-red-200'}`}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {result.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            <h4 className="font-medium">
                              {scenarios.find(s => s.id === result.scenarioId)?.name || 'Unknown Scenario'}
                            </h4>
                          </div>
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-gray-600">Input</p>
                            <p className="text-sm bg-gray-50 p-2 rounded">{result.input}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Output</p>
                            <p className="text-sm bg-gray-50 p-2 rounded">{result.output}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Duration:</span>
                            <span className="ml-1 font-medium">{(result.duration / 1000).toFixed(2)}s</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Tokens:</span>
                            <span className="ml-1 font-medium">{result.tokenUsage}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Cost:</span>
                            <span className="ml-1 font-medium">${result.cost.toFixed(4)}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Time:</span>
                            <span className="ml-1 font-medium">{result.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {result.error && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                            <p className="text-sm text-red-700">{result.error}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Avg Response Time</p>
                    <p className="text-2xl font-bold">
                      {(metrics.averageResponseTime / 1000).toFixed(2)}s
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tests</p>
                    <p className="text-2xl font-bold">{metrics.testCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Tokens</p>
                    <p className="text-2xl font-bold">{metrics.totalTokens.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Cost</p>
                    <p className="text-2xl font-bold">${metrics.totalCost.toFixed(4)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Error Count</p>
                    <p className="text-2xl font-bold">{metrics.errorCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}