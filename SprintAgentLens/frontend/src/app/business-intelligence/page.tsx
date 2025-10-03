'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, TrendingDown, BarChart3, PieChart as PieChartIcon, Building, Users, Target, Clock, Award, AlertTriangle, ArrowUp, ArrowDown, Calendar, Download, Share, Filter, Eye } from 'lucide-react'

const BusinessIntelligencePage = () => {
  const [activeTab, setActiveTab] = useState('executive')
  const [timeRange, setTimeRange] = useState('30d')

  const revenueData = [
    { month: 'Jan', revenue: 125000, costs: 85000, profit: 40000, customers: 1250 },
    { month: 'Feb', revenue: 142000, costs: 92000, profit: 50000, customers: 1420 },
    { month: 'Mar', revenue: 156000, costs: 98000, profit: 58000, customers: 1560 },
    { month: 'Apr', revenue: 168000, costs: 105000, profit: 63000, customers: 1680 },
    { month: 'May', revenue: 185000, costs: 115000, profit: 70000, customers: 1850 },
    { month: 'Jun', revenue: 198000, costs: 122000, profit: 76000, customers: 1980 }
  ]

  const departmentPerformance = [
    { department: 'Sales', revenue: 450000, growth: 15.2, efficiency: 92 },
    { department: 'Marketing', revenue: 280000, growth: 8.7, efficiency: 88 },
    { department: 'Product', revenue: 195000, growth: 22.1, efficiency: 95 },
    { department: 'Customer Success', revenue: 120000, growth: 12.4, efficiency: 91 }
  ]

  const operationalMetrics = [
    { metric: 'Customer Acquisition Cost', value: '$125', change: -8.2, trend: 'down' },
    { metric: 'Lifetime Value', value: '$2,450', change: 12.5, trend: 'up' },
    { metric: 'Churn Rate', value: '2.1%', change: -0.8, trend: 'down' },
    { metric: 'Net Promoter Score', value: '67', change: 4.2, trend: 'up' }
  ]

  const marketSegments = [
    { name: 'Enterprise', value: 45, color: '#8884d8', revenue: 540000 },
    { name: 'Mid-Market', value: 35, color: '#82ca9d', revenue: 420000 },
    { name: 'Small Business', value: 20, color: '#ffc658', revenue: 240000 }
  ]

  const kpis = [
    { title: 'Monthly Recurring Revenue', value: '$198K', change: '+12.5%', trend: 'up', color: 'text-green-600' },
    { title: 'Annual Run Rate', value: '$2.4M', change: '+18.2%', trend: 'up', color: 'text-green-600' },
    { title: 'Gross Margin', value: '62.3%', change: '+2.1%', trend: 'up', color: 'text-green-600' },
    { title: 'Customer Count', value: '1,980', change: '+15.8%', trend: 'up', color: 'text-green-600' }
  ]

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? 
      <ArrowUp className="w-4 h-4 text-green-500" /> : 
      <ArrowDown className="w-4 h-4 text-red-500" />
  }

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Intelligence</h1>
          <p className="text-gray-600">Strategic insights and performance analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button className="gap-2">
            <Share className="w-4 h-4" />
            Share Report
          </Button>
        </div>
      </div>

      {/* Executive Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.title}</p>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(kpi.trend)}
                  <span className={`text-sm font-medium ${kpi.color}`}>
                    {kpi.change}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="executive" className="gap-2">
            <Building className="w-4 h-4" />
            Executive
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="market" className="gap-2">
            <PieChartIcon className="w-4 h-4" />
            Market Analysis
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Forecasting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6">
          {/* Revenue & Growth */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue & Profitability</CardTitle>
                <CardDescription>Monthly revenue, costs, and profit trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="costs" stackId="2" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="profit" stackId="3" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>Customer acquisition and revenue per customer</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="customers" stroke="#8884d8" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Department Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>Revenue contribution and efficiency by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentPerformance.map((dept, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{dept.department}</h4>
                      <div className="flex items-center gap-6 mt-2">
                        <div className="text-sm">
                          <span className="text-gray-600">Revenue: </span>
                          <span className="font-medium">${dept.revenue.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Growth: </span>
                          <span className="font-medium text-green-600">+{dept.growth}%</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-600">Efficiency: </span>
                          <span className="font-medium">{dept.efficiency}%</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Details
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Operational Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Key Operational Metrics</CardTitle>
              <CardDescription>Critical business performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {operationalMetrics.map((metric, index) => (
                  <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">{metric.value}</div>
                    <div className="text-sm text-gray-600 mb-2">{metric.metric}</div>
                    <div className={`flex items-center justify-center gap-1 text-sm ${getTrendColor(metric.trend)}`}>
                      {getTrendIcon(metric.trend)}
                      <span>{Math.abs(metric.change)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>Revenue distribution across different channels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" />
                    <Bar dataKey="profit" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Structure</CardTitle>
                <CardDescription>Operational cost breakdown and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                    <Line type="monotone" dataKey="costs" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Current financial position and key ratios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">$76K</div>
                  <div className="text-sm text-gray-600">Monthly Profit</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+20.6% MoM</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">38.4%</div>
                  <div className="text-sm text-gray-600">Profit Margin</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+3.2%</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">$912K</div>
                  <div className="text-sm text-gray-600">Annual Revenue Run Rate</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+18% YoY</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operational Efficiency</CardTitle>
              <CardDescription>Key operational metrics and performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">98.7%</div>
                  <div className="text-sm text-gray-600">System Uptime</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">145ms</div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">94.2%</div>
                  <div className="text-sm text-gray-600">Customer Satisfaction</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">24/7</div>
                  <div className="text-sm text-gray-600">Support Coverage</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="market" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Market Segments</CardTitle>
                <CardDescription>Revenue distribution by market segment</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={marketSegments}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {marketSegments.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Segment Performance</CardTitle>
                <CardDescription>Revenue and growth by market segment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {marketSegments.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium">{segment.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${segment.revenue.toLocaleString()}</div>
                        <div className="text-sm text-gray-600">{segment.value}% of total</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          <div className="text-center py-12">
            <TrendingUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Predictive Analytics</h3>
            <p className="text-gray-600 mb-4">Advanced forecasting and trend analysis</p>
            <Button>Configure Forecasting</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BusinessIntelligencePage