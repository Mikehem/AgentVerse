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
  GitBranch, 
  Network, 
  Code, 
  Settings, 
  Plus, 
  Trash2,
  Edit,
  PlayCircle,
  StopCircle,
  RotateCcw,
  Save,
  Download,
  Upload,
  CheckCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Bot,
  Database,
  MessageSquare,
  Zap,
  Globe
} from 'lucide-react'

interface FrameworkConfig {
  framework: 'langchain' | 'langgraph'
  components: FrameworkComponent[]
  chains: ChainConfig[]
  memory: MemoryConfig
  llmProvider: LLMProviderConfig
  customCode: string
}

interface FrameworkComponent {
  id: string
  type: 'agent' | 'tool' | 'retriever' | 'memory' | 'llm' | 'chain'
  name: string
  config: any
  enabled: boolean
}

interface ChainConfig {
  id: string
  name: string
  type: 'sequential' | 'router' | 'conversation' | 'retrieval' | 'map_reduce' | 'stuff'
  steps: ChainStep[]
  conditions: ChainCondition[]
}

interface ChainStep {
  id: string
  name: string
  type: 'llm' | 'tool' | 'retriever' | 'transformer'
  config: any
  order: number
}

interface ChainCondition {
  id: string
  condition: string
  nextStep: string
}

interface MemoryConfig {
  type: 'conversation' | 'entity' | 'vector' | 'summary' | 'buffer'
  maxTokens?: number
  returnMessages?: number
  vectorStore?: string
}

interface LLMProviderConfig {
  provider: 'openai' | 'anthropic' | 'azure' | 'google' | 'huggingface'
  model: string
  temperature: number
  maxTokens: number
  apiKey?: string
  baseUrl?: string
}

const langchainComponents = [
  { type: 'agent', name: 'Conversational Agent', description: 'Basic conversational agent with tools' },
  { type: 'agent', name: 'ReAct Agent', description: 'Reasoning and Acting agent pattern' },
  { type: 'agent', name: 'Plan & Execute Agent', description: 'Planning and execution pattern' },
  { type: 'tool', name: 'Web Search Tool', description: 'Search the web for information' },
  { type: 'tool', name: 'Calculator Tool', description: 'Perform mathematical calculations' },
  { type: 'tool', name: 'Python REPL', description: 'Execute Python code' },
  { type: 'retriever', name: 'Vector Store Retriever', description: 'Retrieve from vector database' },
  { type: 'retriever', name: 'Web Search Retriever', description: 'Retrieve web search results' },
  { type: 'memory', name: 'Conversation Buffer', description: 'Store conversation history' },
  { type: 'memory', name: 'Entity Memory', description: 'Remember entities and facts' },
]

const langgraphComponents = [
  { type: 'agent', name: 'State Graph Agent', description: 'State-based agent with graph execution' },
  { type: 'agent', name: 'Multi-Agent System', description: 'Coordinated multi-agent system' },
  { type: 'agent', name: 'Hierarchical Agent', description: 'Manager-worker agent pattern' },
  { type: 'tool', name: 'Function Node', description: 'Custom function execution' },
  { type: 'tool', name: 'Conditional Node', description: 'Conditional execution logic' },
  { type: 'tool', name: 'Parallel Node', description: 'Parallel execution branches' },
  { type: 'memory', name: 'Shared State', description: 'Shared state across agents' },
  { type: 'memory', name: 'Agent Memory', description: 'Agent-specific memory' },
]

const chainTypes = {
  langchain: [
    { value: 'sequential', label: 'Sequential Chain', description: 'Execute steps in sequence' },
    { value: 'router', label: 'Router Chain', description: 'Route to different chains based on input' },
    { value: 'conversation', label: 'Conversation Chain', description: 'Conversational flow with memory' },
    { value: 'retrieval', label: 'Retrieval QA Chain', description: 'Question answering with retrieval' },
    { value: 'map_reduce', label: 'Map Reduce Chain', description: 'Map-reduce over documents' },
    { value: 'stuff', label: 'Stuff Chain', description: 'Stuff documents into prompt' },
  ],
  langgraph: [
    { value: 'state_graph', label: 'State Graph', description: 'State-based execution graph' },
    { value: 'message_graph', label: 'Message Graph', description: 'Message-passing graph' },
    { value: 'workflow', label: 'Workflow', description: 'Complex workflow execution' },
    { value: 'agent_network', label: 'Agent Network', description: 'Multi-agent communication network' },
  ]
}

interface FrameworkIntegrationProps {
  agent: any
  onConfigUpdate: (config: FrameworkConfig) => void
}

export function FrameworkIntegration({ agent, onConfigUpdate }: FrameworkIntegrationProps) {
  const [config, setConfig] = useState<FrameworkConfig>({
    framework: agent?.framework || 'langchain',
    components: [],
    chains: [],
    memory: {
      type: 'conversation',
      maxTokens: 1000,
      returnMessages: 5
    },
    llmProvider: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 1000
    },
    customCode: ''
  })

  const [selectedComponent, setSelectedComponent] = useState<FrameworkComponent | null>(null)
  const [selectedChain, setSelectedChain] = useState<ChainConfig | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const addComponent = useCallback((componentTemplate: any) => {
    const newComponent: FrameworkComponent = {
      id: `comp-${Date.now()}`,
      type: componentTemplate.type,
      name: componentTemplate.name,
      config: {},
      enabled: true
    }
    
    setConfig(prev => ({
      ...prev,
      components: [...prev.components, newComponent]
    }))
  }, [])

  const removeComponent = useCallback((componentId: string) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.filter(c => c.id !== componentId)
    }))
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null)
    }
  }, [selectedComponent])

  const updateComponent = useCallback((componentId: string, updates: Partial<FrameworkComponent>) => {
    setConfig(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === componentId ? { ...c, ...updates } : c
      )
    }))
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => prev ? { ...prev, ...updates } : null)
    }
  }, [selectedComponent])

  const addChain = useCallback(() => {
    const newChain: ChainConfig = {
      id: `chain-${Date.now()}`,
      name: 'New Chain',
      type: 'sequential',
      steps: [],
      conditions: []
    }
    
    setConfig(prev => ({
      ...prev,
      chains: [...prev.chains, newChain]
    }))
  }, [])

  const generateCode = useCallback(async () => {
    setIsGenerating(true)
    
    // Simulate code generation
    setTimeout(() => {
      const code = generateFrameworkCode(config)
      setConfig(prev => ({ ...prev, customCode: code }))
      setIsGenerating(false)
    }, 2000)
  }, [config])

  const generateFrameworkCode = (config: FrameworkConfig): string => {
    if (config.framework === 'langchain') {
      return `# Generated LangChain Agent
from langchain.agents import initialize_agent, AgentType
from langchain.llms import ${config.llmProvider.provider === 'openai' ? 'OpenAI' : 'ChatAnthropic'}
from langchain.memory import ${config.memory.type === 'conversation' ? 'ConversationBufferMemory' : 'EntityMemory'}
from langchain.tools import Tool

# Initialize LLM
llm = ${config.llmProvider.provider === 'openai' ? 'OpenAI' : 'ChatAnthropic'}(
    temperature=${config.llmProvider.temperature},
    max_tokens=${config.llmProvider.maxTokens}
)

# Initialize Memory
memory = ${config.memory.type === 'conversation' ? 'ConversationBufferMemory' : 'EntityMemory'}(
    memory_key="chat_history",
    return_messages=True
)

# Define Tools
tools = [
${config.components.filter(c => c.type === 'tool' && c.enabled).map(tool => `    Tool(
        name="${tool.name}",
        description="Tool for ${tool.name.toLowerCase()}",
        func=lambda x: "Tool execution result"
    )`).join(',\n')}
]

# Initialize Agent
agent = initialize_agent(
    tools=tools,
    llm=llm,
    agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
    memory=memory,
    verbose=True
)

# Run Agent
def run_agent(input_text):
    return agent.run(input_text)

if __name__ == "__main__":
    result = run_agent("Hello, how can you help me?")
    print(result)`
    } else {
      return `# Generated LangGraph Agent
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
from langchain.llms import ${config.llmProvider.provider === 'openai' ? 'OpenAI' : 'ChatAnthropic'}
from typing import TypedDict, Annotated, List
import operator

# Define State
class AgentState(TypedDict):
    messages: Annotated[List, operator.add]
    next: str

# Initialize LLM
llm = ${config.llmProvider.provider === 'openai' ? 'OpenAI' : 'ChatAnthropic'}(
    temperature=${config.llmProvider.temperature},
    max_tokens=${config.llmProvider.maxTokens}
)

# Define Agent Function
def agent_function(state):
    response = llm.invoke(state["messages"][-1])
    return {"messages": [response], "next": "end"}

# Define Tools
${config.components.filter(c => c.type === 'tool' && c.enabled).map(tool => `def ${tool.name.replace(/\s+/g, '_').toLowerCase()}(state):
    # ${tool.name} implementation
    return {"messages": ["${tool.name} executed"], "next": "agent"}`).join('\n\n')}

# Create Graph
graph = StateGraph(AgentState)

# Add Nodes
graph.add_node("agent", agent_function)
${config.components.filter(c => c.type === 'tool' && c.enabled).map(tool => 
  `graph.add_node("${tool.name.replace(/\s+/g, '_').toLowerCase()}", ${tool.name.replace(/\s+/g, '_').toLowerCase()})`).join('\n')}

# Add Edges
graph.set_entry_point("agent")
${config.components.filter(c => c.type === 'tool' && c.enabled).map(tool => 
  `graph.add_edge("${tool.name.replace(/\s+/g, '_').toLowerCase()}", "agent")`).join('\n')}
graph.add_edge("agent", END)

# Compile Graph
app = graph.compile()

# Run Agent
def run_agent(input_text):
    result = app.invoke({"messages": [input_text], "next": "agent"})
    return result["messages"][-1]

if __name__ == "__main__":
    result = run_agent("Hello, how can you help me?")
    print(result)`
    }
  }

  const components = config.framework === 'langchain' ? langchainComponents : langgraphComponents

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {config.framework === 'langchain' ? (
              <GitBranch className="w-5 h-5 text-blue-600" />
            ) : (
              <Network className="w-5 h-5 text-purple-600" />
            )}
            {config.framework === 'langchain' ? 'LangChain' : 'LangGraph'} Configuration
          </CardTitle>
          <CardDescription>
            Configure your {config.framework} agent framework and components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="components" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="components">Components</TabsTrigger>
              <TabsTrigger value="chains">Chains</TabsTrigger>
              <TabsTrigger value="memory">Memory</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>

            <TabsContent value="components" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Available Components</h3>
                <Button size="sm" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Available Components */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-3">Available</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {components.map((component, index) => (
                      <Card 
                        key={index}
                        className="cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => addComponent(component)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between mb-1">
                            <h5 className="font-medium text-sm">{component.name}</h5>
                            <Badge variant="outline" className="text-xs">
                              {component.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600">{component.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Added Components */}
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-3">
                    Added ({config.components.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {config.components.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No components added</p>
                      </div>
                    ) : (
                      config.components.map((component) => (
                        <Card 
                          key={component.id}
                          className={`cursor-pointer transition-colors ${
                            selectedComponent?.id === component.id 
                              ? 'ring-2 ring-sage-500 bg-sage-50' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedComponent(component)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <h5 className="font-medium text-sm">{component.name}</h5>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={component.enabled}
                                  onCheckedChange={(checked) => 
                                    updateComponent(component.id, { enabled: checked })
                                  }
                                  size="sm"
                                />
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    removeComponent(component.id)
                                  }}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {component.type}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Component Configuration */}
              {selectedComponent && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Component Configuration</CardTitle>
                    <CardDescription>
                      Configure {selectedComponent.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="component-name">Name</Label>
                      <Input
                        id="component-name"
                        value={selectedComponent.name}
                        onChange={(e) => updateComponent(selectedComponent.id, { name: e.target.value })}
                      />
                    </div>
                    
                    {selectedComponent.type === 'tool' && (
                      <div>
                        <Label htmlFor="tool-description">Description</Label>
                        <Textarea
                          id="tool-description"
                          value={selectedComponent.config.description || ''}
                          onChange={(e) => updateComponent(selectedComponent.id, { 
                            config: { ...selectedComponent.config, description: e.target.value }
                          })}
                          placeholder="Describe what this tool does"
                        />
                      </div>
                    )}

                    {selectedComponent.type === 'retriever' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="vector-store">Vector Store</Label>
                          <Select 
                            value={selectedComponent.config.vectorStore || ''}
                            onValueChange={(value) => updateComponent(selectedComponent.id, { 
                              config: { ...selectedComponent.config, vectorStore: value }
                            })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select vector store" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="chroma">Chroma</SelectItem>
                              <SelectItem value="pinecone">Pinecone</SelectItem>
                              <SelectItem value="weaviate">Weaviate</SelectItem>
                              <SelectItem value="faiss">FAISS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="search-k">Search K</Label>
                          <Input
                            id="search-k"
                            type="number"
                            value={selectedComponent.config.searchK || 4}
                            onChange={(e) => updateComponent(selectedComponent.id, { 
                              config: { ...selectedComponent.config, searchK: parseInt(e.target.value) }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="chains" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Execution Chains</h3>
                <Button onClick={addChain} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Chain
                </Button>
              </div>

              <div className="space-y-4">
                {config.chains.map((chain) => (
                  <Card key={chain.id} className="cursor-pointer hover:bg-gray-50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{chain.name}</h4>
                          <p className="text-sm text-gray-600">
                            {chainTypes[config.framework]?.find(ct => ct.value === chain.type)?.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{chain.type}</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-red-600"
                            onClick={() => setConfig(prev => ({
                              ...prev,
                              chains: prev.chains.filter(c => c.id !== chain.id)
                            }))}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {chain.steps.length} steps configured
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {config.chains.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chains configured</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="memory" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Memory Configuration</CardTitle>
                  <CardDescription>
                    Configure how your agent stores and retrieves information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="memory-type">Memory Type</Label>
                      <Select 
                        value={config.memory.type}
                        onValueChange={(value: any) => setConfig(prev => ({
                          ...prev,
                          memory: { ...prev.memory, type: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="conversation">Conversation Buffer</SelectItem>
                          <SelectItem value="entity">Entity Memory</SelectItem>
                          <SelectItem value="vector">Vector Memory</SelectItem>
                          <SelectItem value="summary">Summary Memory</SelectItem>
                          <SelectItem value="buffer">Buffer Memory</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="max-tokens">Max Tokens</Label>
                      <Input
                        id="max-tokens"
                        type="number"
                        value={config.memory.maxTokens || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          memory: { ...prev.memory, maxTokens: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                  </div>
                  
                  {config.memory.type === 'conversation' && (
                    <div>
                      <Label htmlFor="return-messages">Return Messages</Label>
                      <Input
                        id="return-messages"
                        type="number"
                        value={config.memory.returnMessages || ''}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          memory: { ...prev.memory, returnMessages: parseInt(e.target.value) }
                        }))}
                      />
                    </div>
                  )}

                  {config.memory.type === 'vector' && (
                    <div>
                      <Label htmlFor="vector-store-memory">Vector Store</Label>
                      <Select 
                        value={config.memory.vectorStore || ''}
                        onValueChange={(value) => setConfig(prev => ({
                          ...prev,
                          memory: { ...prev.memory, vectorStore: value }
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select vector store" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chroma">Chroma</SelectItem>
                          <SelectItem value="pinecone">Pinecone</SelectItem>
                          <SelectItem value="weaviate">Weaviate</SelectItem>
                          <SelectItem value="faiss">FAISS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="code" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Generated Code</h3>
                <div className="flex gap-2">
                  <Button 
                    onClick={generateCode}
                    disabled={isGenerating}
                    size="sm"
                  >
                    {isGenerating ? (
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Code className="w-4 h-4 mr-2" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Code'}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96">
                    <pre>{config.customCode || '# Click "Generate Code" to see the generated framework code'}</pre>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Project Structure</CardTitle>
                  <CardDescription>
                    Files that will be included in the exported project
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-yellow-400 rounded-sm"></div>
                      <span>agent_project/</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      <div>├── main.py</div>
                      <div>├── requirements.txt</div>
                      <div>├── .env.example</div>
                      <div>├── README.md</div>
                      <div>├── agents/</div>
                      <div className="ml-4">
                        <div>│   ├── __init__.py</div>
                        <div>│   └── {agent?.name?.replace(/\s+/g, '_').toLowerCase() || 'my'}_agent.py</div>
                      </div>
                      <div>├── tools/</div>
                      <div className="ml-4">
                        <div>│   ├── __init__.py</div>
                        <div>│   └── custom_tools.py</div>
                      </div>
                      <div>├── config/</div>
                      <div className="ml-4">
                        <div>│   ├── __init__.py</div>
                        <div>│   └── settings.py</div>
                      </div>
                      <div>└── tests/</div>
                      <div className="ml-4">
                        <div>    ├── __init__.py</div>
                        <div>    └── test_agent.py</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}