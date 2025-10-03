'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts'
import { Brain, Cpu, Activity, GitBranch, Play, Pause, Square, Settings, Upload, Download, Eye, Edit, Trash2, Plus, RefreshCw, Clock, CheckCircle, AlertTriangle, Zap, Database, Code, TrendingUp, TrendingDown, Target, Award, Layers, Network, BarChart3 } from 'lucide-react'

interface Model {
  id: string
  name: string
  version: string
  status: 'training' | 'deployed' | 'failed' | 'pending' | 'testing'
  accuracy: number
  latency: number
  throughput: number
  lastTrained: Date
  framework: string
  size: string
  environment: 'development' | 'staging' | 'production'
}

interface Experiment {
  id: string
  name: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'queued'
  progress: number
  startTime: Date
  duration?: number
  parameters: Record<string, any>
  metrics: Record<string, number>
  modelId?: string
}

interface Pipeline {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'error'
  stages: string[]
  lastRun: Date
  successRate: number
  avgDuration: number
}

const MLEngineeringPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [models, setModels] = useState<Model[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModel, setShowCreateModel] = useState(false)
  const [showCreateExperiment, setShowCreateExperiment] = useState(false)

  useEffect(() => {
    loadMLData()
    const interval = setInterval(loadMLData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadMLData = async () => {
    try {
      // Mock data for demonstration
      const mockModels: Model[] = [
        {
          id: 'model-001',
          name: 'Text Classification v2.1',
          version: '2.1.4',
          status: 'deployed',
          accuracy: 94.7,
          latency: 23,
          throughput: 1250,
          lastTrained: new Date(Date.now() - 86400000),
          framework: 'PyTorch',
          size: '1.2 GB',
          environment: 'production'
        },
        {
          id: 'model-002',
          name: 'Sentiment Analysis',
          version: '1.8.2',
          status: 'training',
          accuracy: 92.3,
          latency: 45,
          throughput: 890,
          lastTrained: new Date(),
          framework: 'TensorFlow',
          size: '890 MB',
          environment: 'development'
        },
        {
          id: 'model-003',
          name: 'Image Recognition',
          version: '3.0.1',
          status: 'testing',
          accuracy: 97.1,
          latency: 156,
          throughput: 340,
          lastTrained: new Date(Date.now() - 3600000),
          framework: 'PyTorch',
          size: '2.8 GB',
          environment: 'staging'
        }
      ]

      const mockExperiments: Experiment[] = [
        {
          id: 'exp-001',
          name: 'Hyperparameter Optimization',
          description: 'Testing different learning rates and batch sizes',
          status: 'running',
          progress: 67,
          startTime: new Date(Date.now() - 7200000),
          parameters: { learning_rate: 0.001, batch_size: 32, epochs: 100 },
          metrics: { accuracy: 0.943, loss: 0.127, f1_score: 0.956 },
          modelId: 'model-001'
        },
        {
          id: 'exp-002',
          name: 'Feature Engineering Study',
          description: 'Comparing different feature extraction methods',
          status: 'completed',
          progress: 100,
          startTime: new Date(Date.now() - 172800000),
          duration: 14400,
          parameters: { feature_method: 'tfidf', max_features: 10000 },
          metrics: { accuracy: 0.923, precision: 0.918, recall: 0.934 }
        },
        {
          id: 'exp-003',
          name: 'Model Architecture Comparison',
          description: 'Testing BERT vs RoBERTa performance',
          status: 'queued',
          progress: 0,
          startTime: new Date(Date.now() + 3600000),
          parameters: { model_type: 'bert-base', fine_tune_layers: 2 },
          metrics: {}
        }
      ]

      const mockPipelines: Pipeline[] = [
        {
          id: 'pipe-001',
          name: 'Production Training Pipeline',
          description: 'Automated training pipeline for production models',
          status: 'active',
          stages: ['Data Validation', 'Preprocessing', 'Training', 'Evaluation', 'Deployment'],
          lastRun: new Date(Date.now() - 3600000),
          successRate: 94.2,
          avgDuration: 2400
        },
        {
          id: 'pipe-002',
          name: 'Model Validation Pipeline',
          description: 'Comprehensive model testing and validation',
          status: 'active',
          stages: ['Load Model', 'Performance Tests', 'Bias Detection', 'Security Scan'],
          lastRun: new Date(Date.now() - 7200000),
          successRate: 98.7,
          avgDuration: 1800
        }
      ]

      setModels(mockModels)
      setExperiments(mockExperiments)
      setPipelines(mockPipelines)
    } catch (error) {
      console.error('Failed to load ML data:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'training': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'testing': return <Play className="w-4 h-4 text-yellow-500" />
      case 'failed': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'running': return <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'queued': return <Clock className="w-4 h-4 text-gray-500" />
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'inactive': return <Pause className="w-4 h-4 text-gray-500" />
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed': return 'bg-green-100 text-green-800 border-green-200'
      case 'training': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'testing': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'queued': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredModels = models.filter(model => {
    const matchesEnvironment = selectedEnvironment === 'all' || model.environment === selectedEnvironment
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesEnvironment && matchesSearch
  })

  const performanceData = [
    { name: 'Week 1', accuracy: 89.2, latency: 45, throughput: 890 },
    { name: 'Week 2', accuracy: 91.5, latency: 42, throughput: 920 },
    { name: 'Week 3', accuracy: 93.1, latency: 38, throughput: 1050 },
    { name: 'Week 4', accuracy: 94.7, latency: 35, throughput: 1180 },
    { name: 'Week 5', accuracy: 95.2, latency: 32, throughput: 1250 }
  ]

  const experimentData = experiments.map(exp => ({
    name: exp.name.substring(0, 10) + '...',
    accuracy: exp.metrics.accuracy ? exp.metrics.accuracy * 100 : 0,
    loss: exp.metrics.loss || 0,
    progress: exp.progress
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ML Engineering</h1>
          <p className="text-gray-600">Build, train, and deploy machine learning models</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateExperiment(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Experiment
          </Button>
          <Button
            onClick={() => setShowCreateModel(true)}
            className="gap-2"
          >
            <Brain className="w-4 h-4" />
            Deploy Model
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{models.length}</p>
                <p className="text-xs text-gray-500">Active Models</p>
              </div>
              <Brain className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {models.filter(m => m.status === 'deployed').length} deployed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{experiments.length}</p>
                <p className="text-xs text-gray-500">Experiments</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">{experiments.filter(e => e.status === 'running').length} running</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">94.7%</p>
                <p className="text-xs text-gray-500">Avg Accuracy</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+2.3% this week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">1,250</p>
                <p className="text-xs text-gray-500">Requests/sec</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+8% throughput</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Brain className="w-4 h-4" />
            Models
          </TabsTrigger>
          <TabsTrigger value="experiments" className="gap-2">
            <Activity className="w-4 h-4" />
            Experiments
          </TabsTrigger>
          <TabsTrigger value="pipelines" className="gap-2">
            <GitBranch className="w-4 h-4" />
            Pipelines
          </TabsTrigger>
          <TabsTrigger value="infrastructure" className="gap-2">
            <Cpu className="w-4 h-4" />
            Infrastructure
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Performance Trends</CardTitle>
                <CardDescription>Accuracy and latency over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" domain={[85, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[20, 50]} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="accuracy" stroke="#8884d8" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="latency" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Experiment Results</CardTitle>
                <CardDescription>Current experiment performance</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={experimentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="accuracy" fill="#8884d8" />
                    <Bar dataKey="progress" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Model Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Model Status Overview</CardTitle>
              <CardDescription>Current status of all models in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {models.map((model) => (
                  <div key={model.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{model.name}</h4>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(model.status)}
                        <Badge className={getStatusColor(model.status)} variant="outline">
                          {model.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>Accuracy: {model.accuracy}%</div>
                      <div>Latency: {model.latency}ms</div>
                      <div>Version: {model.version}</div>
                      <div>Environment: {model.environment}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest ML operations and events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '5 minutes ago', event: 'Model deployment completed for Text Classification v2.1', type: 'success' },
                  { time: '1 hour ago', event: 'Hyperparameter optimization experiment started', type: 'info' },
                  { time: '2 hours ago', event: 'Training pipeline executed successfully', type: 'success' },
                  { time: '4 hours ago', event: 'Model validation detected performance drift', type: 'warning' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'success' ? 'bg-green-500' :
                      activity.type === 'warning' ? 'bg-yellow-500' :
                      activity.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm">{activity.event}</p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          {/* Model Filters */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={selectedEnvironment} onValueChange={setSelectedEnvironment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by environment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Environments</SelectItem>
                <SelectItem value="development">Development</SelectItem>
                <SelectItem value="staging">Staging</SelectItem>
                <SelectItem value="production">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Models Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredModels.map((model) => (
              <Card key={model.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{model.name}</CardTitle>
                      <CardDescription>Version {model.version} • {model.framework}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(model.status)}
                      <Badge className={getStatusColor(model.status)}>
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{model.accuracy}%</div>
                      <div className="text-xs text-gray-500">Accuracy</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{model.latency}ms</div>
                      <div className="text-xs text-gray-500">Latency</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">{model.throughput}</div>
                      <div className="text-xs text-gray-500">Req/sec</div>
                    </div>
                  </div>

                  {/* Model Info */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Size:</span>
                      <span>{model.size}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Environment:</span>
                      <span className="capitalize">{model.environment}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Trained:</span>
                      <span>{model.lastTrained.toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Monitor
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Download className="w-3 h-3" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {experiments.map((experiment) => (
              <Card key={experiment.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{experiment.name}</CardTitle>
                      <CardDescription>{experiment.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(experiment.status)}
                      <Badge className={getStatusColor(experiment.status)}>
                        {experiment.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  {experiment.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{experiment.progress}%</span>
                      </div>
                      <Progress value={experiment.progress} className="h-2" />
                    </div>
                  )}

                  {/* Parameters */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Parameters</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {Object.entries(experiment.parameters).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span>{key}:</span>
                          <span>{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  {Object.keys(experiment.metrics).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Metrics</div>
                      <div className="grid grid-cols-2 gap-2 text-center">
                        {Object.entries(experiment.metrics).map(([key, value]) => (
                          <div key={key}>
                            <div className="text-lg font-bold">{typeof value === 'number' ? value.toFixed(3) : value}</div>
                            <div className="text-xs text-gray-500 capitalize">{key}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timing */}
                  <div className="text-sm text-gray-600">
                    <div>Started: {experiment.startTime.toLocaleString()}</div>
                    {experiment.duration && (
                      <div>Duration: {Math.round(experiment.duration / 60)} minutes</div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                    {experiment.status === 'running' && (
                      <Button size="sm" variant="outline" className="gap-1">
                        <Pause className="w-3 h-3" />
                        Pause
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-1">
                      <Download className="w-3 h-3" />
                      Export
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pipelines" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pipelines.map((pipeline) => (
              <Card key={pipeline.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                      <CardDescription>{pipeline.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(pipeline.status)}
                      <Badge className={getStatusColor(pipeline.status)}>
                        {pipeline.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stages */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Pipeline Stages</div>
                    <div className="flex flex-wrap gap-1">
                      {pipeline.stages.map((stage, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {stage}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">{pipeline.successRate}%</div>
                      <div className="text-xs text-gray-500">Success Rate</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">{Math.round(pipeline.avgDuration / 60)}m</div>
                      <div className="text-xs text-gray-500">Avg Duration</div>
                    </div>
                  </div>

                  {/* Last Run */}
                  <div className="text-sm text-gray-600">
                    Last run: {pipeline.lastRun.toLocaleString()}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Play className="w-3 h-3" />
                      Run
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Configure
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Logs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="infrastructure" className="space-y-6">
          <div className="text-center py-12">
            <Cpu className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Infrastructure Management</h3>
            <p className="text-gray-600 mb-4">Monitor and scale your ML infrastructure</p>
            <Button>Configure Infrastructure</Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Model Dialog */}
      <Dialog open={showCreateModel} onOpenChange={setShowCreateModel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deploy New Model</DialogTitle>
            <DialogDescription>
              Deploy a trained model to your environment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model Name</Label>
                <Input placeholder="Enter model name..." />
              </div>
              <div className="space-y-2">
                <Label>Framework</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select framework" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pytorch">PyTorch</SelectItem>
                    <SelectItem value="tensorflow">TensorFlow</SelectItem>
                    <SelectItem value="scikit-learn">Scikit-learn</SelectItem>
                    <SelectItem value="xgboost">XGBoost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Environment</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="staging">Staging</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Model File</Label>
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Model
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModel(false)}>
                Cancel
              </Button>
              <Button>Deploy Model</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Experiment Dialog */}
      <Dialog open={showCreateExperiment} onOpenChange={setShowCreateExperiment}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Experiment</DialogTitle>
            <DialogDescription>
              Set up a new machine learning experiment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Experiment Name</Label>
              <Input placeholder="Enter experiment name..." />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input placeholder="Describe your experiment..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Model</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select base model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="model-001">Text Classification v2.1</SelectItem>
                    <SelectItem value="model-002">Sentiment Analysis</SelectItem>
                    <SelectItem value="model-003">Image Recognition</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Dataset</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dataset-001">Training Dataset A</SelectItem>
                    <SelectItem value="dataset-002">Validation Dataset B</SelectItem>
                    <SelectItem value="dataset-003">Test Dataset C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateExperiment(false)}>
                Cancel
              </Button>
              <Button>Create Experiment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MLEngineeringPage