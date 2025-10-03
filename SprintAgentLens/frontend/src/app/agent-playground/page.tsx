'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { 
  Bot, 
  Play, 
  Stop, 
  Download, 
  Settings, 
  Code, 
  TestTube, 
  Network, 
  Plus,
  Trash2,
  Edit,
  Copy,
  Save,
  RotateCcw,
  Zap,
  MessageSquare,
  Database,
  Calculator,
  Globe,
  Mail,
  Calendar,
  FileText,
  GitBranch,
  Users,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  Shield
} from 'lucide-react'
import { MCPIntegration } from '@/components/agent-playground/MCPIntegration'

interface Agent {
  id: string
  name: string
  description: string
  type: 'single' | 'multi-agent'
  framework: 'langchain' | 'langgraph'
  status: 'draft' | 'testing' | 'ready' | 'error'
  config: {
    systemPrompt: string
    temperature: number
    maxTokens: number
    model: string
    llmProvider: string
  }
  tools: Tool[]
  chains: Chain[]
  relationships: AgentRelationship[]
  lastModified: string
}

interface Tool {
  id: string
  name: string
  type: 'built-in' | 'custom' | 'api'
  description: string
  enabled: boolean
}

interface Chain {
  id: string
  name: string
  type: 'sequential' | 'router' | 'conversation' | 'retrieval'
  steps: string[]
}

interface AgentRelationship {
  sourceAgentId: string
  targetAgentId: string
  communicationType: 'message' | 'event' | 'state'
}

const builtInTools: Tool[] = [
  { id: 'web-search', name: 'Web Search', type: 'built-in', description: 'Search the web using Google/Bing', enabled: false },
  { id: 'calculator', name: 'Calculator', type: 'built-in', description: 'Perform mathematical calculations', enabled: false },
  { id: 'code-execution', name: 'Code Execution', type: 'built-in', description: 'Execute Python/JavaScript code', enabled: false },
  { id: 'file-operations', name: 'File Operations', type: 'built-in', description: 'Read and write files', enabled: false },
  { id: 'database', name: 'Database', type: 'built-in', description: 'Execute SQL queries', enabled: false },
  { id: 'email', name: 'Email', type: 'built-in', description: 'Send email notifications', enabled: false },
  { id: 'calendar', name: 'Calendar', type: 'built-in', description: 'Manage calendar events', enabled: false },
]

const chainTypes = [
  { value: 'sequential', label: 'Sequential Chain', description: 'Execute steps in order' },
  { value: 'router', label: 'Router Chain', description: 'Route to different paths based on input' },
  { value: 'conversation', label: 'Conversation Chain', description: 'Maintain conversation context' },
  { value: 'retrieval', label: 'Retrieval Chain', description: 'RAG-based information retrieval' },
]

const llmProviders = [
  { value: 'openai', label: 'OpenAI', models: ['gpt-4', 'gpt-3.5-turbo'] },
  { value: 'anthropic', label: 'Anthropic', models: ['claude-3-opus', 'claude-3-sonnet'] },
  { value: 'azure', label: 'Azure OpenAI', models: ['gpt-4', 'gpt-35-turbo'] },
  { value: 'google', label: 'Google', models: ['gemini-pro', 'gemini-pro-vision'] },
]

export default function AgentPlayground() {
  const [activeTab, setActiveTab] = useState('builder')
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const [isExporting, setIsExporting] = useState(false)

  const createNewAgent = useCallback(() => {
    const newAgent: Agent = {
      id: `agent-${Date.now()}`,
      name: 'New Agent',
      description: 'A new agent ready for configuration',
      type: 'single',
      framework: 'langchain',
      status: 'draft',
      config: {
        systemPrompt: 'You are a helpful AI assistant.',
        temperature: 0.7,
        maxTokens: 1000,
        model: 'gpt-4',
        llmProvider: 'openai'
      },
      tools: [],
      chains: [],
      relationships: [],
      lastModified: new Date().toISOString()
    }
    setAgents(prev => [...prev, newAgent])
    setSelectedAgent(newAgent)
    setIsCreating(false)
  }, [])

  const updateAgent = useCallback((updates: Partial<Agent>) => {
    if (!selectedAgent) return
    
    const updatedAgent = {
      ...selectedAgent,
      ...updates,
      lastModified: new Date().toISOString()
    }
    
    setSelectedAgent(updatedAgent)
    setAgents(prev => prev.map(agent => 
      agent.id === selectedAgent.id ? updatedAgent : agent
    ))
  }, [selectedAgent])

  const testAgent = useCallback(async () => {
    if (!selectedAgent) return
    
    updateAgent({ status: 'testing' })
    
    // Simulate testing
    setTimeout(() => {
      const success = Math.random() > 0.3
      setTestResults({
        success,
        duration: Math.random() * 5000 + 1000,
        response: success 
          ? "Hello! I'm your AI assistant. How can I help you today?"
          : "Error: Failed to initialize agent. Please check your configuration.",
        tokenUsage: success ? Math.floor(Math.random() * 100) + 20 : 0,
        cost: success ? (Math.random() * 0.01).toFixed(4) : 0
      })
      updateAgent({ status: success ? 'ready' : 'error' })
    }, 2000)
  }, [selectedAgent, updateAgent])

  const exportAgent = useCallback(async () => {
    if (!selectedAgent) return
    
    setIsExporting(true)
    
    // Simulate code generation and zip creation
    setTimeout(() => {
      const blob = new Blob(['# Generated agent code would be here'], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedAgent.name.toLowerCase().replace(/\s+/g, '-')}-agent.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setIsExporting(false)
    }, 3000)
  }, [selectedAgent])

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />
      case 'testing': return <Clock className="w-4 h-4 animate-spin" />
      case 'ready': return <CheckCircle className="w-4 h-4" />
      case 'error': return <AlertCircle className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'testing': return 'bg-blue-100 text-blue-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Playground</h1>
          <p className="text-gray-600 mt-2">
            Build, test, and deploy AI agents using LangChain and LangGraph frameworks
          </p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-sage-600 hover:bg-sage-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Agent
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Agent List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Agents</CardTitle>
              <CardDescription>
                {agents.length} agent{agents.length !== 1 ? 's' : ''} created
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {agents.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No agents yet</p>
                    <p className="text-xs">Create your first agent to get started</p>
                  </div>
                ) : (
                  agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`p-3 cursor-pointer transition-colors border-l-4 ${
                        selectedAgent?.id === agent.id
                          ? 'bg-sage-50 border-sage-500'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">{agent.name}</h4>
                        <Badge className={`text-xs ${getStatusColor(agent.status)}`}>
                          {getStatusIcon(agent.status)}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                        {agent.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {agent.framework}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {agent.type}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {selectedAgent && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={testAgent}
                  disabled={selectedAgent.status === 'testing'}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {selectedAgent.status === 'testing' ? 'Testing...' : 'Test Agent'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={exportAgent}
                  disabled={isExporting || selectedAgent.status !== 'ready'}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Code'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => {
                    const duplicated = {
                      ...selectedAgent,
                      id: `agent-${Date.now()}`,
                      name: `${selectedAgent.name} (Copy)`,
                      status: 'draft' as const,
                      lastModified: new Date().toISOString()
                    }
                    setAgents(prev => [...prev, duplicated])
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start text-red-600 hover:text-red-700"
                  onClick={() => {
                    setAgents(prev => prev.filter(a => a.id !== selectedAgent.id))
                    setSelectedAgent(null)
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          {!selectedAgent && !isCreating ? (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Agent Playground
                </h3>
                <p className="text-gray-600 mb-6 max-w-md">
                  Create intelligent agents using LangChain and LangGraph frameworks. 
                  Build single agents or complex multi-agent systems with A2A communication.
                </p>
                <Button 
                  onClick={() => setIsCreating(true)}
                  className="bg-sage-600 hover:bg-sage-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Agent
                </Button>
              </div>
            </Card>
          ) : isCreating ? (
            <Card>
              <CardHeader>
                <CardTitle>Create New Agent</CardTitle>
                <CardDescription>
                  Choose your agent type and framework to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                    <CardContent className="p-4 text-center">
                      <Bot className="w-8 h-8 mx-auto mb-2 text-sage-600" />
                      <h4 className="font-medium">Single Agent</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        One agent with specific tools and capabilities
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                    <CardContent className="p-4 text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-sage-600" />
                      <h4 className="font-medium">Multi-Agent System</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Multiple agents with A2A communication
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Label className="text-sm font-medium">Framework</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                      <CardContent className="p-4 text-center">
                        <GitBranch className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                        <h4 className="font-medium">LangChain</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Chain-based agent development
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                      <CardContent className="p-4 text-center">
                        <Network className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                        <h4 className="font-medium">LangGraph</h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Graph-based agent orchestration
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={createNewAgent} className="bg-sage-600 hover:bg-sage-700">
                    Create Agent
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-5 w-full">
                <TabsTrigger value="builder">Builder</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
                <TabsTrigger value="deploy">Deploy</TabsTrigger>
                <TabsTrigger value="mcp">MCP Registry</TabsTrigger>
              </TabsList>

              <TabsContent value="builder" className="space-y-6">
                {/* Agent Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Configuration</CardTitle>
                    <CardDescription>
                      Configure your agent's basic settings and behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="agent-name">Agent Name</Label>
                        <Input
                          id="agent-name"
                          value={selectedAgent?.name || ''}
                          onChange={(e) => updateAgent({ name: e.target.value })}
                          placeholder="Enter agent name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="agent-framework">Framework</Label>
                        <Select 
                          value={selectedAgent?.framework} 
                          onValueChange={(value: 'langchain' | 'langgraph') => 
                            updateAgent({ framework: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="langchain">LangChain</SelectItem>
                            <SelectItem value="langgraph">LangGraph</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="agent-description">Description</Label>
                      <Textarea
                        id="agent-description"
                        value={selectedAgent?.description || ''}
                        onChange={(e) => updateAgent({ description: e.target.value })}
                        placeholder="Describe what this agent does"
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label htmlFor="system-prompt">System Prompt</Label>
                      <Textarea
                        id="system-prompt"
                        value={selectedAgent?.config.systemPrompt || ''}
                        onChange={(e) => updateAgent({ 
                          config: { ...selectedAgent!.config, systemPrompt: e.target.value }
                        })}
                        placeholder="You are a helpful AI assistant..."
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="llm-provider">LLM Provider</Label>
                        <Select 
                          value={selectedAgent?.config.llmProvider} 
                          onValueChange={(value) => updateAgent({ 
                            config: { ...selectedAgent!.config, llmProvider: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {llmProviders.map(provider => (
                              <SelectItem key={provider.value} value={provider.value}>
                                {provider.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="model">Model</Label>
                        <Select 
                          value={selectedAgent?.config.model} 
                          onValueChange={(value) => updateAgent({ 
                            config: { ...selectedAgent!.config, model: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {llmProviders
                              .find(p => p.value === selectedAgent?.config.llmProvider)
                              ?.models.map(model => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="max-tokens">Max Tokens</Label>
                        <Input
                          id="max-tokens"
                          type="number"
                          value={selectedAgent?.config.maxTokens || ''}
                          onChange={(e) => updateAgent({ 
                            config: { ...selectedAgent!.config, maxTokens: parseInt(e.target.value) }
                          })}
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="temperature">Temperature: {selectedAgent?.config.temperature}</Label>
                      <input
                        type="range"
                        id="temperature"
                        min="0"
                        max="1"
                        step="0.1"
                        value={selectedAgent?.config.temperature || 0.7}
                        onChange={(e) => updateAgent({ 
                          config: { ...selectedAgent!.config, temperature: parseFloat(e.target.value) }
                        })}
                        className="w-full mt-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Tools Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>Tools & Capabilities</CardTitle>
                    <CardDescription>
                      Enable tools and capabilities for your agent
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {builtInTools.map((tool) => {
                        const isEnabled = selectedAgent?.tools.some(t => t.id === tool.id) || false
                        const Icon = tool.name === 'Web Search' ? Globe :
                                   tool.name === 'Calculator' ? Calculator :
                                   tool.name === 'Code Execution' ? Code :
                                   tool.name === 'File Operations' ? FileText :
                                   tool.name === 'Database' ? Database :
                                   tool.name === 'Email' ? Mail :
                                   tool.name === 'Calendar' ? Calendar : Settings

                        return (
                          <div 
                            key={tool.id}
                            className={`p-4 border rounded-lg transition-all cursor-pointer ${
                              isEnabled 
                                ? 'border-sage-300 bg-sage-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              if (isEnabled) {
                                updateAgent({
                                  tools: selectedAgent!.tools.filter(t => t.id !== tool.id)
                                })
                              } else {
                                updateAgent({
                                  tools: [...(selectedAgent!.tools || []), tool]
                                })
                              }
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Icon className="w-5 h-5 text-sage-600" />
                                <h4 className="font-medium">{tool.name}</h4>
                              </div>
                              <Switch checked={isEnabled} />
                            </div>
                            <p className="text-sm text-gray-600">{tool.description}</p>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Testing</CardTitle>
                    <CardDescription>
                      Test your agent's responses and behavior
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-3">
                      <Button 
                        onClick={testAgent}
                        disabled={selectedAgent?.status === 'testing'}
                        className="bg-sage-600 hover:bg-sage-700"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        {selectedAgent?.status === 'testing' ? 'Testing...' : 'Run Test'}
                      </Button>
                      <Button variant="outline">
                        <Settings className="w-4 h-4 mr-2" />
                        Test Settings
                      </Button>
                    </div>

                    {testResults && (
                      <div className="space-y-4">
                        <div className={`p-4 rounded-lg border ${
                          testResults.success 
                            ? 'border-green-200 bg-green-50' 
                            : 'border-red-200 bg-red-50'
                        }`}>
                          <div className="flex items-center gap-2 mb-2">
                            {testResults.success ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-red-600" />
                            )}
                            <h4 className="font-medium">
                              {testResults.success ? 'Test Passed' : 'Test Failed'}
                            </h4>
                          </div>
                          <p className="text-sm mb-3">{testResults.response}</p>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Duration:</span>
                              <span className="ml-2 font-medium">
                                {(testResults.duration / 1000).toFixed(2)}s
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Tokens:</span>
                              <span className="ml-2 font-medium">{testResults.tokenUsage}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Cost:</span>
                              <span className="ml-2 font-medium">${testResults.cost}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="code" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Code Preview</CardTitle>
                    <CardDescription>
                      Preview the Python code that will be generated for your agent
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                      <pre>{`# Generated ${selectedAgent?.framework} Agent
from ${selectedAgent?.framework === 'langchain' ? 'langchain' : 'langgraph'} import *
from langchain.llms import ${selectedAgent?.config.llmProvider === 'openai' ? 'OpenAI' : 'AzureOpenAI'}

class ${selectedAgent?.name?.replace(/\s+/g, '')}Agent:
    def __init__(self):
        self.llm = ${selectedAgent?.config.llmProvider === 'openai' ? 'OpenAI' : 'AzureOpenAI'}(
            temperature=${selectedAgent?.config.temperature},
            max_tokens=${selectedAgent?.config.maxTokens}
        )
        self.tools = [${selectedAgent?.tools.map(t => `"${t.name}"`).join(', ')}]
        
    def run(self, input_text):
        # Agent implementation will be generated here
        return self.llm.predict(input_text)`}</pre>
                    </div>
                    <div className="mt-4 flex gap-3">
                      <Button 
                        onClick={exportAgent}
                        disabled={isExporting || selectedAgent?.status !== 'ready'}
                        className="bg-sage-600 hover:bg-sage-700"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {isExporting ? 'Generating...' : 'Download ZIP'}
                      </Button>
                      <Button variant="outline">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Code
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deploy" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Deployment Options</CardTitle>
                    <CardDescription>
                      Deploy your agent to various environments
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                        <CardContent className="p-4 text-center">
                          <Zap className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                          <h4 className="font-medium">Local Development</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Run locally for testing
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                        <CardContent className="p-4 text-center">
                          <Globe className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <h4 className="font-medium">Cloud Deployment</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Deploy to AWS/Azure/GCP
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="cursor-pointer hover:ring-2 hover:ring-sage-200 transition-all">
                        <CardContent className="p-4 text-center">
                          <Activity className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <h4 className="font-medium">Production</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Full production deployment
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mcp" className="space-y-6">
                <MCPIntegration
                  onAgentConnect={(agent) => {
                    console.log('Agent connected from MCP:', agent)
                    // You could add the agent to the local agents list here if needed
                  }}
                  onToolCall={(agentId, tool, result) => {
                    console.log('Tool called:', { agentId, tool, result })
                    // Handle tool call results here
                  }}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}