'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight,
  Play,
  Save,
  Settings,
  Upload,
  Download,
  Copy,
  RefreshCw,
  Zap,
  FileText,
  Code,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Edit3,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Interface definitions
interface Variable {
  id: string
  name: string
  value: string
  type: 'string' | 'number' | 'boolean' | 'array'
  description?: string
}

interface TestResult {
  id: string
  timestamp: string
  input: string
  output: string
  tokens: number
  cost: number
  latency: number
  status: 'success' | 'error'
}

interface PromptTemplate {
  id: string
  name: string
  content: string
  variables: Variable[]
  description?: string
  category: string
}

export default function PromptWorkbenchPage() {
  const [promptContent, setPromptContent] = useState('')
  const [variables, setVariables] = useState<Variable[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [showVariablePanel, setShowVariablePanel] = useState(true)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'results'>('editor')

  const [templates] = useState<PromptTemplate[]>([
    {
      id: '1',
      name: 'Customer Support',
      content: 'You are a helpful customer support agent. Please assist the customer with their inquiry about {{product}}. Be {{tone}} and provide {{detail_level}} explanations.',
      variables: [
        { id: '1', name: 'product', value: 'subscription billing', type: 'string' },
        { id: '2', name: 'tone', value: 'professional', type: 'string' },
        { id: '3', name: 'detail_level', value: 'detailed', type: 'string' }
      ],
      description: 'Template for customer support interactions',
      category: 'Support'
    },
    {
      id: '2',
      name: 'Code Review',
      content: 'Review the following {{language}} code and provide feedback on:\n1. Code quality\n2. Performance\n3. Security\n4. Best practices\n\nCode:\n{{code}}',
      variables: [
        { id: '1', name: 'language', value: 'JavaScript', type: 'string' },
        { id: '2', name: 'code', value: 'function hello() {\n  console.log("Hello World");\n}', type: 'string' }
      ],
      description: 'Template for code review tasks',
      category: 'Development'
    }
  ])

  useEffect(() => {
    // Initialize with default prompt
    if (!promptContent && templates.length > 0) {
      loadTemplate(templates[0])
    }
  }, [templates])

  const loadTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template)
    setPromptContent(template.content)
    setVariables([...template.variables])
  }

  const addVariable = () => {
    const newVariable: Variable = {
      id: Date.now().toString(),
      name: `variable_${variables.length + 1}`,
      value: '',
      type: 'string'
    }
    setVariables([...variables, newVariable])
  }

  const updateVariable = (id: string, field: keyof Variable, value: string) => {
    setVariables(variables.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  const removeVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id))
  }

  const renderPromptWithVariables = () => {
    let rendered = promptContent
    variables.forEach(variable => {
      const placeholder = `{{${variable.name}}}`
      rendered = rendered.replace(new RegExp(placeholder, 'g'), variable.value)
    })
    return rendered
  }

  const runPrompt = async () => {
    setIsRunning(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const newResult: TestResult = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        input: renderPromptWithVariables(),
        output: 'This is a simulated response from the AI model. In a real implementation, this would be the actual model response.',
        tokens: 150,
        cost: 0.003,
        latency: 1200,
        status: 'success'
      }
      
      setTestResults([newResult, ...testResults])
      setActiveTab('results')
    } catch (error) {
      console.error('Error running prompt:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const savePrompt = async () => {
    // Implement save functionality
    console.log('Saving prompt...')
  }

  return (
    <div className={cn("min-h-screen bg-background", isFullscreen && "fixed inset-0 z-50")}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <a href="/prompt-engineering" className="hover:text-primary">Prompt Engineering</a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Workbench</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Prompt Engineering Workbench</h1>
            <p className="text-gray-600 mt-1">
              IDE-like environment for developing and testing prompts
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={savePrompt}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button
              onClick={runPrompt}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isRunning ? 'Running...' : 'Test Prompt'}
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-5rem)]">
        {/* Template Library Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Templates</h3>
            <button className="p-1 text-gray-400 hover:text-primary">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template)}
                className={cn(
                  "w-full text-left p-3 rounded-md border transition-colors",
                  selectedTemplate?.id === template.id
                    ? "border-primary bg-primary-alpha text-primary"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <div className="font-medium text-sm">{template.name}</div>
                <div className="text-xs text-gray-500 mt-1">{template.category}</div>
                {template.description && (
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {template.description}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-white px-6">
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'editor'
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Code className="w-4 h-4 inline mr-2" />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'preview'
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Eye className="w-4 h-4 inline mr-2" />
              Preview
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                activeTab === 'results'
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              <Zap className="w-4 h-4 inline mr-2" />
              Results ({testResults.length})
            </button>
          </div>

          <div className="flex flex-1">
            {/* Editor Content */}
            <div className="flex-1 p-6">
              {activeTab === 'editor' && (
                <div className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Prompt Editor</h3>
                    <div className="flex gap-2">
                      <button className="p-2 text-gray-400 hover:text-primary">
                        <Upload className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary">
                        <Download className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-primary">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    className="w-full h-[calc(100%-4rem)] p-4 border border-gray-300 rounded-md font-mono text-sm resize-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter your prompt here... Use {{variable_name}} for variables."
                  />
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Prompt Preview</h3>
                    <span className="text-sm text-gray-500">
                      {variables.length} variables resolved
                    </span>
                  </div>
                  <div className="w-full h-[calc(100%-4rem)] p-4 border border-gray-300 rounded-md bg-gray-50 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {renderPromptWithVariables()}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'results' && (
                <div className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Test Results</h3>
                    <span className="text-sm text-gray-500">
                      {testResults.length} test runs
                    </span>
                  </div>
                  <div className="space-y-4 h-[calc(100%-4rem)] overflow-y-auto">
                    {testResults.length === 0 ? (
                      <div className="text-center py-12">
                        <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No test results yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Click "Test Prompt" to run your first test
                        </p>
                      </div>
                    ) : (
                      testResults.map((result) => (
                        <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                result.status === 'success' ? "bg-green-500" : "bg-red-500"
                              )} />
                              <span className="text-sm font-medium">
                                {new Date(result.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{result.tokens} tokens</span>
                              <span>${result.cost.toFixed(4)}</span>
                              <span>{result.latency}ms</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Input</h4>
                              <div className="bg-gray-50 p-3 rounded text-sm font-mono text-gray-600">
                                {result.input}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Output</h4>
                              <div className="bg-gray-50 p-3 rounded text-sm">
                                {result.output}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Variables Panel */}
            {showVariablePanel && (
              <div className="w-80 bg-gray-50 border-l border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Variables</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={addVariable}
                      className="p-1 text-gray-400 hover:text-primary"
                      title="Add Variable"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowVariablePanel(false)}
                      className="p-1 text-gray-400 hover:text-primary"
                      title="Hide Panel"
                    >
                      <EyeOff className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {variables.map((variable) => (
                    <div key={variable.id} className="bg-white p-3 rounded-md border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(variable.id, 'name', e.target.value)}
                          className="font-medium text-sm bg-transparent border-none p-0 focus:ring-0 focus:outline-none"
                          placeholder="Variable name"
                        />
                        <button
                          onClick={() => removeVariable(variable.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <select
                        value={variable.type}
                        onChange={(e) => updateVariable(variable.id, 'type', e.target.value)}
                        className="w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 mb-2"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="array">Array</option>
                      </select>

                      <textarea
                        value={variable.value}
                        onChange={(e) => updateVariable(variable.id, 'value', e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1 resize-none"
                        rows={variable.type === 'array' ? 3 : 2}
                        placeholder="Variable value"
                      />

                      {variable.description !== undefined && (
                        <input
                          type="text"
                          value={variable.description}
                          onChange={(e) => updateVariable(variable.id, 'description', e.target.value)}
                          className="w-full text-xs text-gray-500 border border-gray-200 rounded px-2 py-1 mt-2"
                          placeholder="Description (optional)"
                        />
                      )}
                    </div>
                  ))}

                  {variables.length === 0 && (
                    <div className="text-center py-8">
                      <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No variables defined</p>
                      <button
                        onClick={addVariable}
                        className="text-xs text-primary hover:text-primary-dark mt-1"
                      >
                        Add your first variable
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Variable Panel Toggle */}
      {!showVariablePanel && (
        <button
          onClick={() => setShowVariablePanel(true)}
          className="fixed right-4 top-1/2 transform -translate-y-1/2 p-2 bg-primary text-white rounded-l-md shadow-md"
          title="Show Variables Panel"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}