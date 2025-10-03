'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Database, BarChart3, PieChart as PieChartIcon, TrendingUp, Download, Upload, Filter, Search, Calendar, Users, DollarSign, Activity, FileText, Code, Table, Layers, Settings, Plus, RefreshCw, Play, Eye, Edit, Trash2, Share, ExternalLink } from 'lucide-react'

interface Dataset {
  id: string
  name: string
  description: string
  rows: number
  columns: number
  size: string
  lastUpdated: Date
  source: string
  status: 'active' | 'processing' | 'error'
  tags: string[]
}

interface Report {
  id: string
  name: string
  description: string
  type: 'dashboard' | 'chart' | 'table' | 'export'
  lastRun: Date
  schedule?: string
  status: 'completed' | 'running' | 'failed' | 'scheduled'
  views: number
}

interface QueryResult {
  columns: string[]
  rows: any[]
  executionTime: number
  rowCount: number
}

const DataAnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [sqlQuery, setSqlQuery] = useState('')
  const [isQueryRunning, setIsQueryRunning] = useState(false)
  const [selectedDataset, setSelectedDataset] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDataset, setShowCreateDataset] = useState(false)
  const [showCreateReport, setShowCreateReport] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    try {
      // Mock data for demonstration
      const mockDatasets: Dataset[] = [
        {
          id: 'ds-001',
          name: 'Agent Performance Metrics',
          description: 'Historical performance data from all agents',
          rows: 1250000,
          columns: 24,
          size: '2.3 GB',
          lastUpdated: new Date(),
          source: 'agent-telemetry',
          status: 'active',
          tags: ['performance', 'real-time', 'agents']
        },
        {
          id: 'ds-002',
          name: 'User Interaction Logs',
          description: 'Complete user interaction history and feedback',
          rows: 856000,
          columns: 18,
          size: '1.8 GB',
          lastUpdated: new Date(Date.now() - 3600000),
          source: 'user-analytics',
          status: 'active',
          tags: ['users', 'interactions', 'feedback']
        },
        {
          id: 'ds-003',
          name: 'Cost Analytics Data',
          description: 'Comprehensive cost tracking and resource utilization',
          rows: 342000,
          columns: 15,
          size: '654 MB',
          lastUpdated: new Date(Date.now() - 7200000),
          source: 'billing-system',
          status: 'processing',
          tags: ['costs', 'billing', 'resources']
        }
      ]

      const mockReports: Report[] = [
        {
          id: 'rpt-001',
          name: 'Daily Performance Summary',
          description: 'Automated daily report on agent performance metrics',
          type: 'dashboard',
          lastRun: new Date(),
          schedule: 'daily',
          status: 'completed',
          views: 1247
        },
        {
          id: 'rpt-002',
          name: 'User Satisfaction Analysis',
          description: 'Weekly analysis of user satisfaction trends',
          type: 'chart',
          lastRun: new Date(Date.now() - 86400000),
          schedule: 'weekly',
          status: 'completed',
          views: 892
        },
        {
          id: 'rpt-003',
          name: 'Cost Optimization Report',
          description: 'Monthly cost analysis and optimization recommendations',
          type: 'export',
          lastRun: new Date(Date.now() - 3600000),
          status: 'running',
          views: 534
        }
      ]

      setDatasets(mockDatasets)
      setReports(mockReports)
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    }
  }

  const runQuery = async () => {
    setIsQueryRunning(true)
    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockResult: QueryResult = {
        columns: ['agent_id', 'timestamp', 'response_time', 'success_rate', 'cost'],
        rows: [
          ['agent-001', '2025-01-15 10:00:00', 145, 99.2, 0.0023],
          ['agent-002', '2025-01-15 10:00:00', 178, 98.7, 0.0031],
          ['agent-003', '2025-01-15 10:00:00', 201, 97.9, 0.0028],
          ['agent-004', '2025-01-15 10:00:00', 167, 99.5, 0.0025],
          ['agent-005', '2025-01-15 10:00:00', 189, 98.3, 0.0029]
        ],
        executionTime: 1847,
        rowCount: 5
      }
      
      setQueryResult(mockResult)
    } catch (error) {
      console.error('Query execution failed:', error)
    } finally {
      setIsQueryRunning(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200'
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      case 'scheduled': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const chartData = [
    { name: 'Jan', users: 4000, revenue: 2400, agents: 240 },
    { name: 'Feb', users: 3000, revenue: 1398, agents: 221 },
    { name: 'Mar', users: 2000, revenue: 9800, agents: 229 },
    { name: 'Apr', users: 2780, revenue: 3908, agents: 200 },
    { name: 'May', users: 1890, revenue: 4800, agents: 218 },
    { name: 'Jun', users: 2390, revenue: 3800, agents: 250 }
  ]

  const pieData = [
    { name: 'Text Processing', value: 400, color: '#8884d8' },
    { name: 'Image Analysis', value: 300, color: '#82ca9d' },
    { name: 'Data Analysis', value: 200, color: '#ffc658' },
    { name: 'Customer Support', value: 100, color: '#ff7300' }
  ]

  const filteredDatasets = datasets.filter(dataset => {
    const matchesSearch = dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         dataset.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Analytics</h1>
          <p className="text-gray-600">Explore, analyze, and visualize your data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateDataset(true)}
            variant="outline"
            className="gap-2"
          >
            <Upload className="w-4 h-4" />
            Import Data
          </Button>
          <Button
            onClick={() => setShowCreateReport(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{datasets.length}</p>
                <p className="text-xs text-gray-500">Active Datasets</p>
              </div>
              <Database className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {datasets.reduce((sum, ds) => sum + ds.rows, 0).toLocaleString()} total rows
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{reports.length}</p>
                <p className="text-xs text-gray-500">Reports</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {reports.reduce((sum, r) => sum + r.views, 0).toLocaleString()} total views
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">5.2 GB</p>
                <p className="text-xs text-gray-500">Total Data Size</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Across all datasets
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">847</p>
                <p className="text-xs text-gray-500">Queries Today</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+12% from yesterday</span>
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
          <TabsTrigger value="datasets" className="gap-2">
            <Database className="w-4 h-4" />
            Datasets
          </TabsTrigger>
          <TabsTrigger value="query" className="gap-2">
            <Code className="w-4 h-4" />
            SQL Query
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="visualizations" className="gap-2">
            <PieChartIcon className="w-4 h-4" />
            Charts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Data Overview Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends</CardTitle>
                <CardDescription>Data usage and query patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="agents" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Source Distribution</CardTitle>
                <CardDescription>Distribution of data across different sources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Data Activity</CardTitle>
              <CardDescription>Latest data operations and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: '5 minutes ago', event: 'Agent Performance Metrics dataset updated', user: 'System', type: 'update' },
                  { time: '1 hour ago', event: 'Daily Performance Summary report generated', user: 'Sarah Chen', type: 'report' },
                  { time: '2 hours ago', event: 'New query executed: User engagement analysis', user: 'Mike Johnson', type: 'query' },
                  { time: '4 hours ago', event: 'Cost Analytics Data import completed', user: 'System', type: 'import' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-2 h-2 rounded-full mt-2 ${
                      activity.type === 'update' ? 'bg-blue-500' :
                      activity.type === 'report' ? 'bg-green-500' :
                      activity.type === 'query' ? 'bg-purple-500' : 'bg-orange-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm">{activity.event}</p>
                      <p className="text-xs text-gray-500">{activity.time} • {activity.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-6">
          {/* Dataset Filters */}
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={selectedDataset} onValueChange={setSelectedDataset}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="agent-telemetry">Agent Telemetry</SelectItem>
                <SelectItem value="user-analytics">User Analytics</SelectItem>
                <SelectItem value="billing-system">Billing System</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              More Filters
            </Button>
          </div>

          {/* Datasets Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDatasets.map((dataset) => (
              <Card key={dataset.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{dataset.name}</CardTitle>
                      <CardDescription>{dataset.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(dataset.status)}>
                      {dataset.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Dataset Metrics */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{dataset.rows.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Rows</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{dataset.columns}</div>
                      <div className="text-xs text-gray-500">Columns</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{dataset.size}</div>
                      <div className="text-xs text-gray-500">Size</div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {dataset.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Dataset Info */}
                  <div className="text-sm text-gray-600">
                    <div>Source: {dataset.source}</div>
                    <div>Updated: {dataset.lastUpdated.toLocaleDateString()}</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Preview
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Download className="w-3 h-3" />
                      Export
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Settings className="w-3 h-3" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SQL Query Interface</CardTitle>
              <CardDescription>Execute SQL queries against your datasets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>SQL Query</Label>
                <Textarea
                  placeholder="SELECT * FROM agent_performance WHERE response_time < 200..."
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="min-h-32 font-mono"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={runQuery}
                  disabled={isQueryRunning || !sqlQuery.trim()}
                  className="gap-2"
                >
                  {isQueryRunning ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  {isQueryRunning ? 'Running...' : 'Execute Query'}
                </Button>
                <Button variant="outline">Save Query</Button>
                <Button variant="outline">Load Template</Button>
              </div>

              {queryResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {queryResult.rowCount} rows returned in {queryResult.executionTime}ms
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Download className="w-3 h-3" />
                        Export
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1">
                        <BarChart3 className="w-3 h-3" />
                        Visualize
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          {queryResult.columns.map((column) => (
                            <th key={column} className="px-4 py-2 text-left text-sm font-medium">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.rows.map((row, index) => (
                          <tr key={index} className="border-t">
                            {row.map((cell: any, cellIndex: number) => (
                              <td key={cellIndex} className="px-4 py-2 text-sm">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {reports.map((report) => (
              <Card key={report.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{report.name}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                    <Badge className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{report.views}</div>
                      <div className="text-xs text-gray-500">Views</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold capitalize">{report.type}</div>
                      <div className="text-xs text-gray-500">Type</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div>Last run: {report.lastRun.toLocaleDateString()}</div>
                    {report.schedule && <div>Schedule: {report.schedule}</div>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      View
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Share className="w-3 h-3" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="visualizations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Users</CardTitle>
                <CardDescription>Monthly comparison of revenue and user growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" />
                    <Area type="monotone" dataKey="users" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Agent Activity</CardTitle>
                <CardDescription>Agent deployment and usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="agents" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Dataset Dialog */}
      <Dialog open={showCreateDataset} onOpenChange={setShowCreateDataset}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Dataset</DialogTitle>
            <DialogDescription>
              Upload or connect a new data source to your analytics workspace
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dataset Name</Label>
                <Input placeholder="Enter dataset name..." />
              </div>
              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV File</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="api">API Endpoint</SelectItem>
                    <SelectItem value="stream">Data Stream</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe this dataset..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDataset(false)}>
                Cancel
              </Button>
              <Button>Import Dataset</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Report Dialog */}
      <Dialog open={showCreateReport} onOpenChange={setShowCreateReport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
            <DialogDescription>
              Build a new report or dashboard for your analytics
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input placeholder="Enter report name..." />
              </div>
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                    <SelectItem value="chart">Chart</SelectItem>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe this report..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateReport(false)}>
                Cancel
              </Button>
              <Button>Create Report</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DataAnalyticsPage