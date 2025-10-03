'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Target, TrendingUp, Users, Star, MessageSquare, Calendar, BarChart3, Lightbulb, Award, Clock, CheckCircle, AlertTriangle, ArrowUp, ArrowDown, Plus, Filter, Search, Eye, Edit, Share } from 'lucide-react'

const ProductManagementPage = () => {
  const [activeTab, setActiveTab] = useState('overview')

  const kpiData = [
    { name: 'Jan', userGrowth: 12.5, retention: 85, satisfaction: 4.2, churn: 2.1 },
    { name: 'Feb', userGrowth: 15.2, retention: 87, satisfaction: 4.3, churn: 1.8 },
    { name: 'Mar', userGrowth: 18.7, retention: 89, satisfaction: 4.4, churn: 1.5 },
    { name: 'Apr', userGrowth: 22.1, retention: 91, satisfaction: 4.5, churn: 1.2 },
    { name: 'May', userGrowth: 25.8, retention: 92, satisfaction: 4.6, churn: 1.0 },
    { name: 'Jun', userGrowth: 28.3, retention: 94, satisfaction: 4.7, churn: 0.8 }
  ]

  const featureAdoption = [
    { name: 'AI Assistant', adoption: 78, satisfaction: 4.5 },
    { name: 'Data Analytics', adoption: 65, satisfaction: 4.2 },
    { name: 'Automation', adoption: 82, satisfaction: 4.6 },
    { name: 'Reporting', adoption: 71, satisfaction: 4.3 },
    { name: 'Integration', adoption: 58, satisfaction: 4.1 }
  ]

  const roadmapItems = [
    { id: 1, title: 'Advanced AI Models', status: 'in-progress', priority: 'high', effort: 'large', value: 'high', quarter: 'Q2 2025' },
    { id: 2, title: 'Real-time Collaboration', status: 'planned', priority: 'medium', effort: 'medium', value: 'medium', quarter: 'Q3 2025' },
    { id: 3, title: 'Mobile Application', status: 'research', priority: 'low', effort: 'large', value: 'medium', quarter: 'Q4 2025' },
    { id: 4, title: 'API Rate Limiting', status: 'completed', priority: 'high', effort: 'small', value: 'high', quarter: 'Q1 2025' }
  ]

  const userFeedback = [
    { id: 1, user: 'Sarah Chen', feedback: 'Love the new analytics dashboard! Very intuitive.', sentiment: 'positive', category: 'UI/UX', date: '2 hours ago' },
    { id: 2, user: 'Mike Johnson', feedback: 'API response times could be faster for large datasets.', sentiment: 'neutral', category: 'Performance', date: '5 hours ago' },
    { id: 3, user: 'Emily Davis', feedback: 'The automation features have saved us hours of manual work.', sentiment: 'positive', category: 'Features', date: '1 day ago' },
    { id: 4, user: 'Alex Wilson', feedback: 'Having issues with data export functionality.', sentiment: 'negative', category: 'Bug', date: '2 days ago' }
  ]

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600'
      case 'negative': return 'text-red-600'
      case 'neutral': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'planned': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'research': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Management</h1>
          <p className="text-gray-600">Drive product strategy and user experience</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Feature
          </Button>
          <Button className="gap-2">
            <Target className="w-4 h-4" />
            Update Roadmap
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">28.3%</p>
                <p className="text-xs text-gray-500">User Growth</p>
              </div>
              <div className="flex items-center">
                <ArrowUp className="w-4 h-4 text-green-500" />
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              +3.2% from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">94%</p>
                <p className="text-xs text-gray-500">User Retention</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              7-day retention rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-yellow-600">4.7</p>
                <p className="text-xs text-gray-500">Satisfaction Score</p>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Out of 5.0 rating
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">847</p>
                <p className="text-xs text-gray-500">Feature Requests</p>
              </div>
              <Lightbulb className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              This quarter
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
          <TabsTrigger value="analytics" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-2">
            <Calendar className="w-4 h-4" />
            Roadmap
          </TabsTrigger>
          <TabsTrigger value="feedback" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedback
          </TabsTrigger>
          <TabsTrigger value="experiments" className="gap-2">
            <Target className="w-4 h-4" />
            A/B Tests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>User Growth & Retention</CardTitle>
                <CardDescription>Monthly user acquisition and retention trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={kpiData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 30]} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="right" type="monotone" dataKey="userGrowth" stroke="#8884d8" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="retention" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Adoption</CardTitle>
                <CardDescription>Usage and satisfaction by feature</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={featureAdoption}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="adoption" fill="#8884d8" />
                    <Line yAxisId="right" type="monotone" dataKey="satisfaction" stroke="#82ca9d" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Feature Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Performance</CardTitle>
              <CardDescription>Adoption rates and user satisfaction by feature</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {featureAdoption.map((feature, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{feature.name}</h4>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Adoption:</span>
                          <div className="w-24">
                            <Progress value={feature.adoption} className="h-2" />
                          </div>
                          <span className="text-sm font-medium">{feature.adoption}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm font-medium">{feature.satisfaction}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Behavior Analytics</CardTitle>
              <CardDescription>Detailed insights into user engagement and product usage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">2.4M</div>
                  <div className="text-sm text-gray-600">Monthly Active Users</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+18% MoM</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">12.7m</div>
                  <div className="text-sm text-gray-600">Sessions This Month</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+23% MoM</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">8.3</div>
                  <div className="text-sm text-gray-600">Avg Session Duration</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <ArrowUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">+1.2m</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Roadmap</CardTitle>
              <CardDescription>Strategic initiatives and feature development timeline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {roadmapItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{item.title}</h4>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority} priority
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Effort: {item.effort}</span>
                        <span>Value: {item.value}</span>
                        <span>Target: {item.quarter}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="gap-1">
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="gap-1">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Feedback</CardTitle>
              <CardDescription>Recent feedback and feature requests from users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userFeedback.map((feedback) => (
                  <div key={feedback.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{feedback.user}</span>
                        <Badge variant="outline">{feedback.category}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${getSentimentColor(feedback.sentiment)}`}>
                          {feedback.sentiment}
                        </span>
                        <span className="text-sm text-gray-500">{feedback.date}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{feedback.feedback}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <div className="text-center py-12">
            <Target className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">A/B Testing Platform</h3>
            <p className="text-gray-600 mb-4">Design and run experiments to optimize user experience</p>
            <Button>Create Experiment</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProductManagementPage