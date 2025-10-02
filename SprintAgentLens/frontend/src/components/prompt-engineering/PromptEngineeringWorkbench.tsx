'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  FileText, 
  Play, 
  Pause, 
  Square, 
  Save, 
  Download, 
  Upload,
  Copy,
  Edit3,
  Plus,
  Minus,
  RefreshCw,
  Settings,
  Eye,
  EyeOff,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  Brain,
  Lightbulb,
  Code,
  Database,
  GitBranch,
  GitCommit,
  GitMerge,
  Users,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Timer,
  Layers,
  Shuffle,
  RotateCcw,
  Maximize2,
  Minimize2,
  Split,
  Merge,
  Wand2,
  Sparkles,
  Palette,
  Type,
  AlignLeft,
  AlignCenter,
  Bold,
  Italic,
  Underline,
  List,
  Hash,
  Quote,
  Link,
  Image,
  Table,
  Indent,
  Outdent,
  Scissors,
  Clipboard,
  Undo,
  Redo,
  Mic,
  Volume2,
  Headphones
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ComposedChart, Area } from 'recharts'

interface PromptVersion {
  version_id: string
  version_number: string
  prompt_content: string
  system_message?: string
  parameters: {
    temperature: number
    max_tokens: number
    top_p: number
    frequency_penalty: number
    presence_penalty: number
  }
  model_config: {
    provider: string
    model: string
    api_version?: string
  }
  test_results: {
    accuracy_score: number
    coherence_score: number
    relevance_score: number
    creativity_score: number
    safety_score: number
    cost_per_request: number
    avg_response_time: number
    success_rate: number
  }
  metadata: {
    created_at: string
    created_by: string
    description: string
    tags: string[]
    use_case: string
    target_audience: string
  }
  status: 'draft' | 'testing' | 'approved' | 'deprecated' | 'archived'
}

interface PromptProject {
  project_id: string
  project_name: string
  description: string
  category: 'chatbot' | 'content_generation' | 'analysis' | 'classification' | 'extraction' | 'translation' | 'summarization'
  current_version: string
  versions: PromptVersion[]
  collaborators: string[]
  performance_metrics: {
    total_tests: number
    avg_score: number
    best_score: number
    improvement_trend: number
  }
  deployment_status: {
    environment: 'development' | 'staging' | 'production'
    last_deployed: string
    deployment_health: 'healthy' | 'warning' | 'error'
  }
  created_at: string
  last_updated: string
}

interface TestSuite {
  suite_id: string
  suite_name: string
  description: string
  test_cases: TestCase[]
  evaluation_criteria: {
    accuracy_weight: number
    coherence_weight: number
    relevance_weight: number
    creativity_weight: number
    safety_weight: number
  }
  automated_testing: boolean
  scheduled_runs: string[]
  last_run: string
  status: 'active' | 'paused' | 'completed'
}

interface TestCase {
  case_id: string
  input_prompt: string
  expected_output?: string
  evaluation_criteria: string[]
  context_variables: Record<string, any>
  expected_metrics: {
    min_accuracy: number
    max_response_time: number
    required_keywords: string[]
    forbidden_keywords: string[]
  }
  actual_results?: {
    output: string
    metrics: Record<string, number>
    timestamp: string
  }
}

interface PromptTemplate {
  template_id: string
  template_name: string
  category: string
  description: string
  template_content: string
  variables: {
    name: string
    type: 'string' | 'number' | 'boolean' | 'array'
    description: string
    required: boolean
    default_value?: any
  }[]
  use_cases: string[]
  rating: number
  downloads: number
  author: string
  license: string
  tags: string[]
}

interface PromptEngineeringWorkbenchProps {
  projectId: string
}

export function PromptEngineeringWorkbench({ projectId }: PromptEngineeringWorkbenchProps) {
  const [projects, setProjects] = useState<PromptProject[]>([])
  const [currentProject, setCurrentProject] = useState<PromptProject | null>(null)
  const [currentVersion, setCurrentVersion] = useState<PromptVersion | null>(null)
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  
  const [viewMode, setViewMode] = useState<'editor' | 'testing' | 'analytics' | 'templates' | 'collaboration'>('editor')
  const [editorLayout, setEditorLayout] = useState<'horizontal' | 'vertical'>('horizontal')
  const [showPreview, setShowPreview] = useState(true)
  const [showAssistant, setShowAssistant] = useState(false)
  const [isTestRunning, setIsTestRunning] = useState(false)
  const [selectedTestSuite, setSelectedTestSuite] = useState<TestSuite | null>(null)
  
  const [promptContent, setPromptContent] = useState('')
  const [systemMessage, setSystemMessage] = useState('')
  const [testInput, setTestInput] = useState('')
  const [testOutput, setTestOutput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  const editorRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetchPromptProjects()
    fetchTestSuites()
    fetchTemplates()
  }, [projectId])

  useEffect(() => {
    if (autoSave && currentProject && promptContent) {
      const timer = setTimeout(() => {
        saveCurrentVersion()
      }, 2000) // Auto-save after 2 seconds of inactivity
      
      return () => clearTimeout(timer)
    }
  }, [promptContent, systemMessage, autoSave])

  const fetchPromptProjects = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/projects`)
      const data = await response.json()
      if (data.success) {
        setProjects(data.projects)
        if (data.projects.length > 0) {
          setCurrentProject(data.projects[0])
          const currentVer = data.projects[0].versions.find((v: PromptVersion) => v.version_id === data.projects[0].current_version)
          if (currentVer) {
            setCurrentVersion(currentVer)
            setPromptContent(currentVer.prompt_content)
            setSystemMessage(currentVer.system_message || '')
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch prompt projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTestSuites = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/test-suites`)
      const data = await response.json()
      if (data.success) {
        setTestSuites(data.test_suites)
      }
    } catch (error) {
      console.error('Failed to fetch test suites:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/templates`)
      const data = await response.json()
      if (data.success) {
        setTemplates(data.templates)
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error)
    }
  }

  const saveCurrentVersion = async () => {
    if (!currentProject || !currentVersion) return
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/projects/${currentProject.project_id}/versions/${currentVersion.version_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_content: promptContent,
          system_message: systemMessage,
          parameters: currentVersion.parameters
        })
      })
      
      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('Failed to save version:', error)
    }
  }

  const testPrompt = async () => {
    if (!promptContent || !testInput) return
    
    setIsTestRunning(true)
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptContent,
          system_message: systemMessage,
          input: testInput,
          parameters: currentVersion?.parameters || {}
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setTestOutput(data.output)
      }
    } catch (error) {
      console.error('Failed to test prompt:', error)
    } finally {
      setIsTestRunning(false)
    }
  }

  const runTestSuite = async (suiteId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/test-suites/${suiteId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptContent,
          system_message: systemMessage,
          parameters: currentVersion?.parameters || {}
        })
      })
      
      const data = await response.json()
      if (data.success) {
        fetchTestSuites() // Refresh test results
      }
    } catch (error) {
      console.error('Failed to run test suite:', error)
    }
  }

  const createNewVersion = async () => {
    if (!currentProject) return
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/projects/${currentProject.project_id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_content: promptContent,
          system_message: systemMessage,
          description: `Version ${currentProject.versions.length + 1}`,
          parameters: currentVersion?.parameters || {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
          }
        })
      })
      
      if (response.ok) {
        fetchPromptProjects()
      }
    } catch (error) {
      console.error('Failed to create new version:', error)
    }
  }

  const optimizePrompt = async () => {
    if (!promptContent) return
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-engineering/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptContent,
          system_message: systemMessage,
          optimization_goals: ['accuracy', 'clarity', 'conciseness'],
          context: currentProject?.category || 'general'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setPromptContent(data.optimized_prompt)
        if (data.optimized_system_message) {
          setSystemMessage(data.optimized_system_message)
        }
      }
    } catch (error) {
      console.error('Failed to optimize prompt:', error)
    }
  }

  const insertTemplate = (template: PromptTemplate) => {
    if (editorRef.current) {
      const cursorPosition = editorRef.current.selectionStart
      const newContent = promptContent.slice(0, cursorPosition) + template.template_content + promptContent.slice(cursorPosition)
      setPromptContent(newContent)
    }
  }

  const formatText = (format: string) => {
    if (!editorRef.current) return
    
    const start = editorRef.current.selectionStart
    const end = editorRef.current.selectionEnd
    const selectedText = promptContent.substring(start, end)
    
    let formattedText = selectedText
    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`
        break
      case 'italic':
        formattedText = `*${selectedText}*`
        break
      case 'code':
        formattedText = `\`${selectedText}\``
        break
      case 'quote':
        formattedText = `> ${selectedText}`
        break
      case 'list':
        formattedText = `- ${selectedText}`
        break
    }
    
    const newContent = promptContent.substring(0, start) + formattedText + promptContent.substring(end)
    setPromptContent(newContent)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100'
      case 'testing': return 'text-blue-600 bg-blue-100'
      case 'approved': return 'text-green-600 bg-green-100'
      case 'deprecated': return 'text-red-600 bg-red-100'
      case 'archived': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 75) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const performanceData = currentProject?.versions.map((version, index) => ({
    version: version.version_number,
    accuracy: version.test_results.accuracy_score,
    coherence: version.test_results.coherence_score,
    relevance: version.test_results.relevance_score,
    cost: version.test_results.cost_per_request,
    response_time: version.test_results.avg_response_time
  })) || []

  const categoryData = projects.reduce((acc, project) => {
    acc[project.category] = (acc[project.category] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const categoryChartData = Object.entries(categoryData).map(([category, count]) => ({
    category: category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-primary">Prompt Engineering Workbench</h1>
          </div>
          
          {currentProject && (
            <div className="flex items-center gap-2">
              <span className="text-muted">•</span>
              <span className="font-medium text-primary">{currentProject.project_name}</span>
              {currentVersion && (
                <>
                  <span className="text-muted">•</span>
                  <span className="text-sm text-muted">v{currentVersion.version_number}</span>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-xs text-muted">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`btn btn-sm ${autoSave ? 'btn-primary' : 'btn-outline'}`}
          >
            {autoSave ? 'Auto-save On' : 'Auto-save Off'}
          </button>
          
          <button
            onClick={saveCurrentVersion}
            className="btn btn-primary btn-sm"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          
          <button
            onClick={createNewVersion}
            className="btn btn-outline btn-sm"
          >
            <GitBranch className="w-4 h-4" />
            New Version
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-border flex flex-col">
          {/* View Tabs */}
          <div className="border-b border-border">
            <div className="flex">
              {[
                { key: 'editor', label: 'Editor', icon: Edit3 },
                { key: 'testing', label: 'Testing', icon: Target },
                { key: 'analytics', label: 'Analytics', icon: BarChart3 },
                { key: 'templates', label: 'Templates', icon: Layers },
                { key: 'collaboration', label: 'Team', icon: Users }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setViewMode(key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1 ${
                    viewMode === key
                      ? 'bg-primary text-white'
                      : 'text-muted hover:text-primary hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {viewMode === 'editor' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Projects</h3>
                  <div className="space-y-2">
                    {projects.map(project => (
                      <div
                        key={project.project_id}
                        onClick={() => {
                          setCurrentProject(project)
                          const currentVer = project.versions.find(v => v.version_id === project.current_version)
                          if (currentVer) {
                            setCurrentVersion(currentVer)
                            setPromptContent(currentVer.prompt_content)
                            setSystemMessage(currentVer.system_message || '')
                          }
                        }}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                          currentProject?.project_id === project.project_id ? 'border-primary bg-blue-50' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-primary">{project.project_name}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(project.versions.find(v => v.version_id === project.current_version)?.status || 'draft')}`}>
                            {project.versions.find(v => v.version_id === project.current_version)?.status}
                          </span>
                        </div>
                        <div className="text-xs text-muted">{project.category}</div>
                        <div className="text-xs text-muted">{project.versions.length} versions</div>
                      </div>
                    ))}
                  </div>
                </div>

                {currentProject && (
                  <div>
                    <h3 className="font-semibold text-primary mb-2">Versions</h3>
                    <div className="space-y-2">
                      {currentProject.versions.map(version => (
                        <div
                          key={version.version_id}
                          onClick={() => {
                            setCurrentVersion(version)
                            setPromptContent(version.prompt_content)
                            setSystemMessage(version.system_message || '')
                          }}
                          className={`p-2 rounded border cursor-pointer hover:bg-gray-50 ${
                            currentVersion?.version_id === version.version_id ? 'border-primary bg-blue-50' : 'border-border'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-primary">v{version.version_number}</span>
                            <span className={`text-xs ${getScoreColor(version.test_results.accuracy_score)}`}>
                              {version.test_results.accuracy_score}%
                            </span>
                          </div>
                          <div className="text-xs text-muted">{version.metadata.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {viewMode === 'testing' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Test Suites</h3>
                  <div className="space-y-2">
                    {testSuites.map(suite => (
                      <div key={suite.suite_id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-primary">{suite.suite_name}</span>
                          <button
                            onClick={() => runTestSuite(suite.suite_id)}
                            className="btn btn-primary btn-xs"
                          >
                            <Play className="w-3 h-3" />
                            Run
                          </button>
                        </div>
                        <div className="text-xs text-muted mb-2">{suite.test_cases.length} test cases</div>
                        <div className="text-xs text-muted">Last run: {new Date(suite.last_run).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Quick Test</h3>
                  <div className="space-y-2">
                    <textarea
                      placeholder="Enter test input..."
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md text-sm h-20 resize-none"
                    />
                    <button
                      onClick={testPrompt}
                      disabled={isTestRunning || !promptContent || !testInput}
                      className="btn btn-primary btn-sm w-full"
                    >
                      {isTestRunning ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Test Prompt
                    </button>
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'templates' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Template Library</h3>
                  <div className="space-y-2">
                    {templates.map(template => (
                      <div key={template.template_id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-primary text-sm">{template.template_name}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs text-muted">{template.rating}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted mb-2">{template.description}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted">{template.downloads} downloads</span>
                          <button
                            onClick={() => insertTemplate(template)}
                            className="btn btn-outline btn-xs"
                          >
                            <Plus className="w-3 h-3" />
                            Use
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {viewMode === 'analytics' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Performance Overview</h3>
                  {currentProject && (
                    <div className="space-y-3">
                      <div className="card p-3">
                        <div className="text-xs text-muted">Total Tests</div>
                        <div className="text-lg font-bold text-primary">{currentProject.performance_metrics.total_tests}</div>
                      </div>
                      <div className="card p-3">
                        <div className="text-xs text-muted">Average Score</div>
                        <div className={`text-lg font-bold ${getScoreColor(currentProject.performance_metrics.avg_score)}`}>
                          {currentProject.performance_metrics.avg_score}%
                        </div>
                      </div>
                      <div className="card p-3">
                        <div className="text-xs text-muted">Improvement</div>
                        <div className={`text-lg font-bold ${currentProject.performance_metrics.improvement_trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {currentProject.performance_metrics.improvement_trend >= 0 ? '+' : ''}{currentProject.performance_metrics.improvement_trend}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {viewMode === 'collaboration' && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-primary mb-2">Collaborators</h3>
                  {currentProject && (
                    <div className="space-y-2">
                      {currentProject.collaborators.map(collaborator => (
                        <div key={collaborator} className="flex items-center gap-2 p-2 rounded border border-border">
                          <Users className="w-4 h-4 text-muted" />
                          <span className="text-sm text-primary">{collaborator}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-primary mb-2">Recent Activity</h3>
                  <div className="space-y-2">
                    <div className="text-xs text-muted p-2 rounded bg-gray-50">
                      Version 1.2 created by John Doe
                    </div>
                    <div className="text-xs text-muted p-2 rounded bg-gray-50">
                      Test suite "Quality Check" completed
                    </div>
                    <div className="text-xs text-muted p-2 rounded bg-gray-50">
                      Prompt optimized for accuracy
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-border p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Text Formatting */}
                <div className="flex items-center gap-1 border-r border-border pr-2">
                  <button
                    onClick={() => formatText('bold')}
                    className="btn btn-outline btn-xs"
                    title="Bold"
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => formatText('italic')}
                    className="btn btn-outline btn-xs"
                    title="Italic"
                  >
                    <Italic className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => formatText('code')}
                    className="btn btn-outline btn-xs"
                    title="Code"
                  >
                    <Code className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => formatText('quote')}
                    className="btn btn-outline btn-xs"
                    title="Quote"
                  >
                    <Quote className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => formatText('list')}
                    className="btn btn-outline btn-xs"
                    title="List"
                  >
                    <List className="w-3 h-3" />
                  </button>
                </div>

                {/* AI Tools */}
                <div className="flex items-center gap-1 border-r border-border pr-2">
                  <button
                    onClick={optimizePrompt}
                    className="btn btn-outline btn-xs"
                    title="AI Optimize"
                  >
                    <Wand2 className="w-3 h-3" />
                    Optimize
                  </button>
                  <button
                    onClick={() => setShowAssistant(!showAssistant)}
                    className={`btn btn-xs ${showAssistant ? 'btn-primary' : 'btn-outline'}`}
                    title="AI Assistant"
                  >
                    <Brain className="w-3 h-3" />
                    Assistant
                  </button>
                </div>

                {/* Layout Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditorLayout('horizontal')}
                    className={`btn btn-xs ${editorLayout === 'horizontal' ? 'btn-primary' : 'btn-outline'}`}
                    title="Horizontal Layout"
                  >
                    <Split className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setEditorLayout('vertical')}
                    className={`btn btn-xs ${editorLayout === 'vertical' ? 'btn-primary' : 'btn-outline'}`}
                    title="Vertical Layout"
                  >
                    <Layers className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`btn btn-xs ${showPreview ? 'btn-primary' : 'btn-outline'}`}
                    title="Toggle Preview"
                  >
                    {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentVersion && (
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="text-muted">Model:</span>
                      <span className="font-medium text-primary">{currentVersion.model_config.model}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted">Temp:</span>
                      <span className="font-medium text-primary">{currentVersion.parameters.temperature}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-muted">Tokens:</span>
                      <span className="font-medium text-primary">{currentVersion.parameters.max_tokens}</span>
                    </div>
                  </div>
                )}
                
                <button className="btn btn-outline btn-sm">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
              </div>
            </div>
          </div>

          {/* Editor Content */}
          <div className={`flex-1 flex ${editorLayout === 'vertical' ? 'flex-col' : 'flex-row'} overflow-hidden`}>
            {/* Prompt Editor */}
            <div className={`flex flex-col bg-white ${editorLayout === 'vertical' ? 'h-1/2' : 'flex-1'} ${showPreview && editorLayout === 'horizontal' ? 'border-r border-border' : ''}`}>
              <div className="bg-gray-50 px-4 py-2 border-b border-border">
                <h3 className="font-semibold text-primary">Prompt Editor</h3>
              </div>
              
              <div className="flex-1 flex flex-col">
                {/* System Message */}
                <div className="border-b border-border">
                  <div className="px-4 py-2 bg-yellow-50">
                    <label className="text-xs font-medium text-muted">System Message (Optional)</label>
                    <textarea
                      value={systemMessage}
                      onChange={(e) => setSystemMessage(e.target.value)}
                      placeholder="Enter system message to define the AI's role and behavior..."
                      className="w-full mt-1 p-2 border border-border rounded text-sm h-16 resize-none bg-white"
                    />
                  </div>
                </div>

                {/* Main Prompt */}
                <div className="flex-1 p-4">
                  <label className="text-xs font-medium text-muted">Prompt Content</label>
                  <textarea
                    ref={editorRef}
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    placeholder="Enter your prompt here. Use {{variable}} syntax for dynamic content..."
                    className="w-full mt-1 p-3 border border-border rounded text-sm h-full resize-none font-mono"
                    style={{ minHeight: '300px' }}
                  />
                </div>
              </div>
            </div>

            {/* Preview/Test Area */}
            {showPreview && (
              <div className={`flex flex-col bg-gray-50 ${editorLayout === 'vertical' ? 'h-1/2 border-t border-border' : 'flex-1'}`}>
                <div className="bg-gray-100 px-4 py-2 border-b border-border">
                  <h3 className="font-semibold text-primary">Live Preview & Testing</h3>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto">
                  {viewMode === 'testing' && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-primary">Test Input</label>
                        <textarea
                          value={testInput}
                          onChange={(e) => setTestInput(e.target.value)}
                          placeholder="Enter test input..."
                          className="w-full mt-1 p-3 border border-border rounded text-sm h-20 resize-none"
                        />
                      </div>
                      
                      <button
                        onClick={testPrompt}
                        disabled={isTestRunning || !promptContent || !testInput}
                        className="btn btn-primary w-full"
                      >
                        {isTestRunning ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Test Prompt
                          </>
                        )}
                      </button>
                      
                      {testOutput && (
                        <div>
                          <label className="text-sm font-medium text-primary">Output</label>
                          <div className="mt-1 p-3 bg-white border border-border rounded text-sm whitespace-pre-wrap">
                            {testOutput}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === 'analytics' && currentProject && (
                    <div className="space-y-4">
                      <div className="card p-4">
                        <h4 className="font-semibold text-primary mb-3">Version Performance</h4>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={performanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="version" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy" />
                              <Line type="monotone" dataKey="coherence" stroke="#3b82f6" name="Coherence" />
                              <Line type="monotone" dataKey="relevance" stroke="#f59e0b" name="Relevance" />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      
                      {currentVersion && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="card p-3">
                            <div className="text-xs text-muted">Accuracy</div>
                            <div className={`text-lg font-bold ${getScoreColor(currentVersion.test_results.accuracy_score)}`}>
                              {currentVersion.test_results.accuracy_score}%
                            </div>
                          </div>
                          <div className="card p-3">
                            <div className="text-xs text-muted">Coherence</div>
                            <div className={`text-lg font-bold ${getScoreColor(currentVersion.test_results.coherence_score)}`}>
                              {currentVersion.test_results.coherence_score}%
                            </div>
                          </div>
                          <div className="card p-3">
                            <div className="text-xs text-muted">Response Time</div>
                            <div className="text-lg font-bold text-primary">
                              {currentVersion.test_results.avg_response_time}ms
                            </div>
                          </div>
                          <div className="card p-3">
                            <div className="text-xs text-muted">Cost</div>
                            <div className="text-lg font-bold text-primary">
                              ${currentVersion.test_results.cost_per_request.toFixed(4)}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {viewMode === 'editor' && (
                    <div className="space-y-4">
                      <div className="card p-4">
                        <h4 className="font-semibold text-primary mb-3">Prompt Preview</h4>
                        <div className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap font-mono">
                          {systemMessage && (
                            <div className="mb-3 p-2 bg-yellow-100 rounded">
                              <div className="text-xs font-medium text-yellow-800 mb-1">SYSTEM:</div>
                              <div className="text-yellow-700">{systemMessage}</div>
                            </div>
                          )}
                          <div className="text-gray-700">
                            {promptContent || 'Enter your prompt content to see preview...'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="card p-4">
                        <h4 className="font-semibold text-primary mb-3">Variables Detected</h4>
                        <div className="space-y-2">
                          {(promptContent.match(/\{\{(\w+)\}\}/g) || []).map((variable, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Hash className="w-3 h-3 text-muted" />
                              <span className="font-medium text-primary">{variable}</span>
                            </div>
                          ))}
                          {!(promptContent.match(/\{\{(\w+)\}\}/g) || []).length && (
                            <div className="text-sm text-muted">No variables detected. Use {{variable}} syntax to add dynamic content.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Assistant Sidebar */}
      {showAssistant && (
        <div className="w-80 bg-white border-l border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-primary">AI Assistant</h3>
              <button
                onClick={() => setShowAssistant(false)}
                className="text-muted hover:text-primary"
              >
                ✕
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              <div className="card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span className="font-medium text-primary">Suggestions</span>
                </div>
                <div className="text-sm text-muted">
                  • Add more specific instructions for better accuracy
                  • Consider using examples in your prompt
                  • Define the desired output format clearly
                </div>
              </div>
              
              <div className="card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-green-500" />
                  <span className="font-medium text-primary">Best Practices</span>
                </div>
                <div className="text-sm text-muted">
                  • Keep prompts concise but specific
                  • Use consistent formatting
                  • Test with edge cases
                </div>
              </div>
              
              <div className="card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="font-medium text-primary">Warnings</span>
                </div>
                <div className="text-sm text-muted">
                  • No safety guidelines detected
                  • Consider adding output length limits
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}