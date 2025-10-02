'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight,
  TestTube,
  Play,
  Pause,
  Square,
  BarChart3,
  Target,
  Clock,
  Zap,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  FileText,
  Eye,
  Edit3,
  Trash2,
  RefreshCw,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Interface definitions
interface TestSuite {
  id: string
  name: string
  description: string
  prompt_id: string
  prompt_name: string
  type: 'ab_test' | 'performance' | 'quality' | 'regression'
  status: 'draft' | 'running' | 'completed' | 'failed' | 'paused'
  created_at: string
  started_at?: string
  completed_at?: string
  author: string
  test_cases: number
  success_rate: number
  avg_score: number
  config: {
    sample_size: number
    confidence_level: number
    iterations: number
  }
}

interface TestResult {
  id: string
  test_suite_id: string
  test_case: string
  variant: 'A' | 'B' | 'control'
  prompt_version: string
  input: string
  output: string
  score: number
  metrics: {
    relevance: number
    accuracy: number
    coherence: number
    safety: number
  }
  execution_time: number
  token_count: number
  cost: number
  timestamp: string
  status: 'pass' | 'fail' | 'pending'
}

interface TestMetrics {
  total_tests: number
  completed_tests: number
  pass_rate: number
  avg_performance_score: number
  total_cost: number
  avg_execution_time: number
}

export default function TestingFrameworkPage() {
  const [activeTab, setActiveTab] = useState<'suites' | 'results' | 'metrics'>('suites')
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [metrics, setMetrics] = useState<TestMetrics>({
    total_tests: 0,
    completed_tests: 0,
    pass_rate: 0,
    avg_performance_score: 0,
    total_cost: 0,
    avg_execution_time: 0
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [selectedSuite, setSelectedSuite] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      setTestSuites([
        {
          id: '1',
          name: 'Customer Support Tone A/B Test',
          description: 'Testing formal vs casual tone in customer support prompts',
          prompt_id: 'prompt_1',
          prompt_name: 'Customer Support Base',
          type: 'ab_test',
          status: 'running',
          created_at: '2024-01-20T10:00:00Z',
          started_at: '2024-01-20T10:30:00Z',
          author: 'Sarah Chen',
          test_cases: 100,
          success_rate: 78.5,
          avg_score: 8.2,
          config: {
            sample_size: 100,
            confidence_level: 95,
            iterations: 1000
          }
        },
        {
          id: '2',
          name: 'Product Recommendation Quality Test',
          description: 'Evaluating recommendation accuracy and relevance',
          prompt_id: 'prompt_2',
          prompt_name: 'Product Recommendations',
          type: 'quality',
          status: 'completed',
          created_at: '2024-01-19T14:00:00Z',
          started_at: '2024-01-19T14:15:00Z',
          completed_at: '2024-01-19T16:45:00Z',
          author: 'Mike Rodriguez',
          test_cases: 250,
          success_rate: 92.3,
          avg_score: 9.1,
          config: {
            sample_size: 250,
            confidence_level: 99,
            iterations: 500
          }
        },
        {
          id: '3',
          name: 'Performance Regression Test',
          description: 'Checking for performance degradation after recent changes',
          prompt_id: 'prompt_3',
          prompt_name: 'Query Processing',
          type: 'regression',
          status: 'draft',
          created_at: '2024-01-20T16:00:00Z',
          author: 'Lisa Wang',
          test_cases: 50,
          success_rate: 0,
          avg_score: 0,
          config: {
            sample_size: 50,
            confidence_level: 95,
            iterations: 200
          }
        }
      ])

      setTestResults([
        {
          id: '1',
          test_suite_id: '1',
          test_case: 'Billing inquiry - refund request',
          variant: 'A',
          prompt_version: 'v2.1-formal',
          input: 'I want a refund for my last payment',
          output: 'I understand you would like to request a refund for your recent payment. I will be happy to assist you with this process.',
          score: 8.5,
          metrics: {
            relevance: 9.0,
            accuracy: 8.5,
            coherence: 8.8,
            safety: 9.2
          },
          execution_time: 1200,
          token_count: 45,
          cost: 0.0023,
          timestamp: '2024-01-20T11:15:00Z',
          status: 'pass'
        },
        {
          id: '2',
          test_suite_id: '1',
          test_case: 'Billing inquiry - refund request',
          variant: 'B',
          prompt_version: 'v2.1-casual',
          input: 'I want a refund for my last payment',
          output: 'Hey there! No problem, I can help you get that refund sorted out. Let me walk you through the process.',
          score: 7.8,
          metrics: {
            relevance: 8.5,
            accuracy: 7.8,
            coherence: 7.5,
            safety: 8.5
          },
          execution_time: 1100,
          token_count: 42,
          cost: 0.0021,
          timestamp: '2024-01-20T11:15:30Z',
          status: 'pass'
        }
      ])

      setMetrics({
        total_tests: 156,
        completed_tests: 134,
        pass_rate: 86.2,
        avg_performance_score: 8.4,
        total_cost: 12.45,
        avg_execution_time: 1150
      })
    } catch (error) {
      console.error('Error fetching testing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-500'
      case 'completed': return 'text-green-500'
      case 'failed': return 'text-red-500'
      case 'paused': return 'text-yellow-500'
      case 'draft': return 'text-gray-500'
      case 'pass': return 'text-green-500'
      case 'fail': return 'text-red-500'
      case 'pending': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'paused': return <Pause className="w-4 h-4" />
      case 'draft': return <FileText className="w-4 h-4" />
      case 'pass': return <CheckCircle className="w-4 h-4" />
      case 'fail': return <XCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ab_test': return 'bg-blue-100 text-blue-800'
      case 'performance': return 'bg-orange-100 text-orange-800'
      case 'quality': return 'bg-green-100 text-green-800'
      case 'regression': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const runTestSuite = async (suiteId: string) => {
    // Implement test suite execution
    console.log(`Running test suite: ${suiteId}`)
  }

  const pauseTestSuite = async (suiteId: string) => {
    // Implement test suite pause
    console.log(`Pausing test suite: ${suiteId}`)
  }

  const stopTestSuite = async (suiteId: string) => {
    // Implement test suite stop
    console.log(`Stopping test suite: ${suiteId}`)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <a href="/prompt-engineering" className="hover:text-primary">Prompt Engineering</a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Testing Framework</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Prompt Testing Framework</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive A/B testing and validation suite for prompt optimization
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              Config
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" />
              New Test Suite
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Tests</p>
                <p className="text-lg font-bold text-primary">{metrics.total_tests}</p>
              </div>
              <TestTube className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Completed</p>
                <p className="text-lg font-bold text-primary">{metrics.completed_tests}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Pass Rate</p>
                <p className="text-lg font-bold text-primary">{metrics.pass_rate}%</p>
              </div>
              <Target className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Score</p>
                <p className="text-lg font-bold text-primary">{metrics.avg_performance_score}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Cost</p>
                <p className="text-lg font-bold text-primary">${metrics.total_cost}</p>
              </div>
              <Zap className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Time</p>
                <p className="text-lg font-bold text-primary">{metrics.avg_execution_time}ms</p>
              </div>
              <Clock className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('suites')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'suites'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <TestTube className="w-4 h-4 inline mr-2" />
            Test Suites ({testSuites.length})
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
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Results ({testResults.length})
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'metrics'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Analytics
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              {activeTab === 'suites' && (
                <>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="draft">Draft</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="paused">Paused</option>
                  </select>
                  
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">All Types</option>
                    <option value="ab_test">A/B Test</option>
                    <option value="performance">Performance</option>
                    <option value="quality">Quality</option>
                    <option value="regression">Regression</option>
                  </select>
                </>
              )}
              
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button 
                onClick={fetchData}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Test Suites Tab */}
          {activeTab === 'suites' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Test Suites</h3>
                <p className="text-sm text-gray-500 mt-1">Manage and execute prompt test suites</p>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading test suites...</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {testSuites.map((suite) => (
                    <div key={suite.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <TestTube className="w-5 h-5 text-primary" />
                            <span className="font-medium text-gray-900">{suite.name}</span>
                            <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getTypeColor(suite.type))}>
                              {suite.type.replace('_', ' ')}
                            </span>
                            <div className={cn("flex items-center gap-1", getStatusColor(suite.status))}>
                              {getStatusIcon(suite.status)}
                              <span className="text-sm font-medium">{suite.status}</span>
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-3">{suite.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">{suite.test_cases}</p>
                              <p className="text-xs text-gray-500">Test Cases</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">{suite.success_rate}%</p>
                              <p className="text-xs text-gray-500">Success Rate</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">{suite.avg_score}</p>
                              <p className="text-xs text-gray-500">Avg Score</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-primary">{suite.config.confidence_level}%</p>
                              <p className="text-xs text-gray-500">Confidence</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              <span>{suite.author}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{suite.prompt_name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(suite.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {suite.status === 'draft' && (
                            <button
                              onClick={() => runTestSuite(suite.id)}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              <Play className="w-3 h-3" />
                              Start
                            </button>
                          )}
                          
                          {suite.status === 'running' && (
                            <>
                              <button
                                onClick={() => pauseTestSuite(suite.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
                              >
                                <Pause className="w-3 h-3" />
                                Pause
                              </button>
                              <button
                                onClick={() => stopTestSuite(suite.id)}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                              >
                                <Square className="w-3 h-3" />
                                Stop
                              </button>
                            </>
                          )}
                          
                          {suite.status === 'completed' && (
                            <button className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                              <BarChart3 className="w-3 h-3" />
                              Results
                            </button>
                          )}
                          
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Test Results</h3>
                <p className="text-sm text-gray-500 mt-1">Detailed results from test executions</p>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading test results...</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {testResults.map((result) => (
                    <div key={result.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-1", getStatusColor(result.status))}>
                          {getStatusIcon(result.status)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-900">{result.test_case}</span>
                            <span className={cn("px-2 py-1 text-xs font-medium rounded-full",
                              result.variant === 'A' ? 'bg-blue-100 text-blue-800' :
                              result.variant === 'B' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            )}>
                              Variant {result.variant}
                            </span>
                            <span className="text-sm text-gray-500">
                              Score: <span className="font-medium">{result.score}/10</span>
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                            <div>
                              <span className="text-gray-500">Relevance:</span>
                              <span className="font-medium ml-1">{result.metrics.relevance}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Accuracy:</span>
                              <span className="font-medium ml-1">{result.metrics.accuracy}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Coherence:</span>
                              <span className="font-medium ml-1">{result.metrics.coherence}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Safety:</span>
                              <span className="font-medium ml-1">{result.metrics.safety}</span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Input</h5>
                              <div className="bg-gray-50 p-2 rounded text-sm">{result.input}</div>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">Output</h5>
                              <div className="bg-gray-50 p-2 rounded text-sm">{result.output}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{result.execution_time}ms</span>
                            <span>{result.token_count} tokens</span>
                            <span>${result.cost.toFixed(4)}</span>
                            <span>{formatDate(result.timestamp)}</span>
                          </div>
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
            <div>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Testing Analytics</h3>
                <p className="text-sm text-gray-500 mt-1">Performance insights and trends</p>
              </div>
              
              <div className="p-6">
                <div className="text-center py-12">
                  <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Dashboard</h3>
                  <p className="text-gray-500 mb-4">
                    Detailed analytics and performance insights would be displayed here
                  </p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• Performance trends over time</p>
                    <p>• A/B test comparison charts</p>
                    <p>• Cost optimization insights</p>
                    <p>• Quality metrics breakdown</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}