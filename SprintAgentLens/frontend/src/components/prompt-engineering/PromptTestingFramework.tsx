'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertTriangle, CheckCircle, XCircle, Clock, Play, Pause, Square, BarChart3, TrendingUp, TrendingDown, Settings, Filter, Download, Share, RefreshCw, Zap, Target, Users, Globe, Cpu, Memory, Timer, Award, AlertCircle, FileText, Code, Database, Lightbulb, TestTube } from 'lucide-react'

interface TestCase {
  id: string
  name: string
  description: string
  input: string
  expectedOutput?: string
  categories: string[]
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped'
  result?: TestResult
  createdAt: Date
  updatedAt: Date
  tags: string[]
}

interface TestResult {
  id: string
  testCaseId: string
  promptVersion: string
  output: string
  score: number
  latency: number
  tokenUsage: number
  cost: number
  timestamp: Date
  metrics: {
    accuracy?: number
    relevance?: number
    coherence?: number
    fluency?: number
    safety?: number
    creativity?: number
    factuality?: number
  }
  evaluations: {
    automated: AutomatedEvaluation[]
    human?: HumanEvaluation
  }
}

interface AutomatedEvaluation {
  metric: string
  score: number
  confidence: number
  reasoning: string
  category: 'quality' | 'safety' | 'performance' | 'accuracy'
}

interface HumanEvaluation {
  evaluatorId: string
  evaluatorName: string
  score: number
  feedback: string
  timestamp: Date
  criteria: {
    [key: string]: number
  }
}

interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled'
  variants: ABTestVariant[]
  trafficSplit: number[]
  startDate?: Date
  endDate?: Date
  targetMetric: string
  significanceLevel: number
  minSampleSize: number
  currentSampleSize: number
  results?: ABTestResults
  configuration: {
    randomizationUnit: 'user' | 'session' | 'request'
    exclusionCriteria: string[]
    inclusionCriteria: string[]
    guardrailMetrics: string[]
  }
}

interface ABTestVariant {
  id: string
  name: string
  description: string
  promptId: string
  promptVersion: string
  isControl: boolean
  weight: number
  performance: {
    requests: number
    successRate: number
    avgLatency: number
    avgScore: number
    totalCost: number
  }
}

interface ABTestResults {
  winner?: string
  confidence: number
  significantDifference: boolean
  pValue: number
  effectSize: number
  recommendations: string[]
  details: {
    [variantId: string]: {
      sampleSize: number
      conversionRate: number
      confidenceInterval: [number, number]
      performance: {
        [metric: string]: number
      }
    }
  }
}

interface TestSuite {
  id: string
  name: string
  description: string
  testCases: TestCase[]
  schedule?: {
    frequency: 'manual' | 'hourly' | 'daily' | 'weekly'
    nextRun?: Date
  }
  environment: 'development' | 'staging' | 'production'
  notifications: {
    onFailure: boolean
    onSuccess: boolean
    channels: string[]
  }
}

const PromptTestingFramework = ({ projectId }: { projectId: string }) => {
  const [activeTab, setActiveTab] = useState('test-cases')
  const [testCases, setTestCases] = useState<TestCase[]>([])
  const [abTests, setABTests] = useState<ABTest[]>([])
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set())
  const [selectedTestCases, setSelectedTestCases] = useState<Set<string>>(new Set())
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('updated')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showABTestDialog, setShowABTestDialog] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([])

  useEffect(() => {
    loadTestData()
  }, [projectId])

  const loadTestData = async () => {
    try {
      const [testCasesRes, abTestsRes, testSuitesRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/prompt-testing/test-cases`),
        fetch(`/api/v1/projects/${projectId}/prompt-testing/ab-tests`),
        fetch(`/api/v1/projects/${projectId}/prompt-testing/test-suites`)
      ])

      setTestCases(await testCasesRes.json())
      setABTests(await abTestsRes.json())
      setTestSuites(await testSuitesRes.json())
    } catch (error) {
      console.error('Failed to load test data:', error)
    }
  }

  const runTestCase = useCallback(async (testCase: TestCase) => {
    setRunningTests(prev => new Set(prev).add(testCase.id))
    
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-testing/test-cases/${testCase.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptVersions: selectedPrompts })
      })

      const result = await response.json()
      
      setTestCases(prev => prev.map(tc => 
        tc.id === testCase.id 
          ? { ...tc, status: result.status, result, updatedAt: new Date() }
          : tc
      ))
    } catch (error) {
      console.error('Test execution failed:', error)
      setTestCases(prev => prev.map(tc => 
        tc.id === testCase.id 
          ? { ...tc, status: 'failed', updatedAt: new Date() }
          : tc
      ))
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev)
        newSet.delete(testCase.id)
        return newSet
      })
    }
  }, [projectId, selectedPrompts])

  const runBatchTests = useCallback(async () => {
    const casesToRun = testCases.filter(tc => selectedTestCases.has(tc.id))
    let completed = 0

    for (const testCase of casesToRun) {
      await runTestCase(testCase)
      completed++
      setTestProgress((completed / casesToRun.length) * 100)
    }

    setTestProgress(0)
    setSelectedTestCases(new Set())
  }, [testCases, selectedTestCases, runTestCase])

  const createABTest = useCallback(async (testConfig: Partial<ABTest>) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompt-testing/ab-tests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      })

      const newTest = await response.json()
      setABTests(prev => [...prev, newTest])
      setShowABTestDialog(false)
    } catch (error) {
      console.error('Failed to create A/B test:', error)
    }
  }, [projectId])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'running': return <Clock className="w-4 h-4 text-blue-500 animate-spin" />
      case 'pending': return <Clock className="w-4 h-4 text-gray-400" />
      case 'skipped': return <AlertCircle className="w-4 h-4 text-yellow-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredTestCases = testCases
    .filter(tc => filterCategory === 'all' || tc.categories.includes(filterCategory))
    .filter(tc => filterStatus === 'all' || tc.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name)
        case 'priority': 
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        case 'status': return a.status.localeCompare(b.status)
        case 'updated': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        default: return 0
      }
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompt Testing Framework</h2>
          <p className="text-gray-600">Advanced testing and A/B testing for prompt optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <TestTube className="w-4 h-4" />
            Create Test
          </Button>
          <Button
            onClick={() => setShowABTestDialog(true)}
            variant="outline"
            className="gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            A/B Test
          </Button>
          <Button
            onClick={loadTestData}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="test-cases" className="gap-2">
            <TestTube className="w-4 h-4" />
            Test Cases
          </TabsTrigger>
          <TabsTrigger value="ab-testing" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            A/B Testing
          </TabsTrigger>
          <TabsTrigger value="test-suites" className="gap-2">
            <Database className="w-4 h-4" />
            Test Suites
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="accuracy">Accuracy</SelectItem>
                  <SelectItem value="safety">Safety</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="quality">Quality</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              {selectedTestCases.size > 0 && (
                <>
                  <Badge variant="secondary">{selectedTestCases.size} selected</Badge>
                  <Button
                    onClick={runBatchTests}
                    size="sm"
                    className="gap-2"
                    disabled={runningTests.size > 0}
                  >
                    <Play className="w-4 h-4" />
                    Run Selected
                  </Button>
                </>
              )}
            </div>
          </div>

          {testProgress > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Running tests...</span>
                    <span>{Math.round(testProgress)}%</span>
                  </div>
                  <Progress value={testProgress} />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {filteredTestCases.map((testCase) => (
              <Card key={testCase.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTestCases.has(testCase.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedTestCases)
                          if (e.target.checked) {
                            newSet.add(testCase.id)
                          } else {
                            newSet.delete(testCase.id)
                          }
                          setSelectedTestCases(newSet)
                        }}
                        className="rounded"
                      />
                      <div>
                        <CardTitle className="text-lg">{testCase.name}</CardTitle>
                        <CardDescription>{testCase.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(testCase.priority)}>
                        {testCase.priority}
                      </Badge>
                      {getStatusIcon(testCase.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-wrap gap-1">
                        {testCase.categories.map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {testCase.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => runTestCase(testCase)}
                        disabled={runningTests.has(testCase.id)}
                        size="sm"
                        variant="outline"
                        className="gap-2"
                      >
                        {runningTests.has(testCase.id) ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Run
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <Label className="text-sm font-medium">Input</Label>
                    <p className="text-sm text-gray-700 mt-1 line-clamp-2">{testCase.input}</p>
                  </div>

                  {testCase.result && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {Math.round(testCase.result.score * 100)}%
                        </div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {testCase.result.latency}ms
                        </div>
                        <div className="text-xs text-gray-500">Latency</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {testCase.result.tokenUsage}
                        </div>
                        <div className="text-xs text-gray-500">Tokens</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          ${testCase.result.cost.toFixed(4)}
                        </div>
                        <div className="text-xs text-gray-500">Cost</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ab-testing" className="space-y-4">
          <div className="grid gap-4">
            {abTests.map((abTest) => (
              <Card key={abTest.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {abTest.name}
                        <Badge 
                          variant={abTest.status === 'running' ? 'default' : 'secondary'}
                          className="gap-1"
                        >
                          {abTest.status === 'running' && <Zap className="w-3 h-3" />}
                          {abTest.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{abTest.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline">
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button size="sm">
                        View Results
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{abTest.variants.length}</div>
                      <div className="text-xs text-gray-500">Variants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{abTest.currentSampleSize}</div>
                      <div className="text-xs text-gray-500">Sample Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round((abTest.currentSampleSize / abTest.minSampleSize) * 100)}%
                      </div>
                      <div className="text-xs text-gray-500">Progress</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {abTest.results?.confidence ? `${Math.round(abTest.results.confidence * 100)}%` : '-'}
                      </div>
                      <div className="text-xs text-gray-500">Confidence</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Variants Performance</Label>
                    {abTest.variants.map((variant, index) => (
                      <div key={variant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant={variant.isControl ? 'default' : 'outline'}>
                            {variant.isControl ? 'Control' : `Variant ${index}`}
                          </Badge>
                          <span className="font-medium">{variant.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <div className="font-medium">{variant.performance.requests}</div>
                            <div className="text-gray-500">requests</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{Math.round(variant.performance.successRate * 100)}%</div>
                            <div className="text-gray-500">success</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{variant.performance.avgLatency}ms</div>
                            <div className="text-gray-500">latency</div>
                          </div>
                          <div className="text-center">
                            <div className="font-medium">{variant.performance.avgScore.toFixed(2)}</div>
                            <div className="text-gray-500">score</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Progress value={(abTest.currentSampleSize / abTest.minSampleSize) * 100} />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="test-suites" className="space-y-4">
          <div className="grid gap-4">
            {testSuites.map((suite) => (
              <Card key={suite.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {suite.name}
                        <Badge variant="outline">{suite.environment}</Badge>
                      </CardTitle>
                      <CardDescription>{suite.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-2">
                        <Play className="w-4 h-4" />
                        Run Suite
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{suite.testCases.length}</div>
                      <div className="text-xs text-gray-500">Test Cases</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {suite.schedule?.frequency || 'Manual'}
                      </div>
                      <div className="text-xs text-gray-500">Schedule</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {suite.testCases.filter(tc => tc.status === 'passed').length}
                      </div>
                      <div className="text-xs text-gray-500">Passing</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{testCases.length}</p>
                    <p className="text-xs text-gray-500">Total Tests</p>
                  </div>
                  <TestTube className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {Math.round((testCases.filter(tc => tc.status === 'passed').length / testCases.length) * 100)}%
                    </p>
                    <p className="text-xs text-gray-500">Pass Rate</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{abTests.filter(t => t.status === 'running').length}</p>
                    <p className="text-xs text-gray-500">Active A/B Tests</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {testCases.reduce((sum, tc) => sum + (tc.result?.latency || 0), 0) / testCases.length || 0}ms
                    </p>
                    <p className="text-xs text-gray-500">Avg Latency</p>
                  </div>
                  <Timer className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Test Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['passed', 'failed', 'pending', 'running'].map((status) => {
                    const count = testCases.filter(tc => tc.status === status).length
                    const percentage = (count / testCases.length) * 100
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          <span className="capitalize">{status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={percentage} className="w-20" />
                          <span className="text-sm text-gray-500">{count}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Average Score</span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-medium">87.5%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Response Time</span>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <span className="font-medium">+12ms</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cost per Test</span>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-green-500" />
                      <span className="font-medium">$0.023</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Test Case</DialogTitle>
            <DialogDescription>
              Create a new test case to validate prompt performance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input placeholder="Enter test name..." />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe what this test validates..." />
            </div>
            <div className="space-y-2">
              <Label>Input</Label>
              <Textarea placeholder="Enter test input..." />
            </div>
            <div className="space-y-2">
              <Label>Expected Output (Optional)</Label>
              <Textarea placeholder="Enter expected output..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button>Create Test</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showABTestDialog} onOpenChange={setShowABTestDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create A/B Test</DialogTitle>
            <DialogDescription>
              Set up an A/B test to compare prompt variants
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Test Name</Label>
                <Input placeholder="Enter test name..." />
              </div>
              <div className="space-y-2">
                <Label>Target Metric</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Overall Score</SelectItem>
                    <SelectItem value="accuracy">Accuracy</SelectItem>
                    <SelectItem value="latency">Latency</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe the A/B test..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Traffic Split (%)</Label>
                <Input type="number" placeholder="50" />
              </div>
              <div className="space-y-2">
                <Label>Minimum Sample Size</Label>
                <Input type="number" placeholder="1000" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowABTestDialog(false)}>
                Cancel
              </Button>
              <Button>Create A/B Test</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PromptTestingFramework