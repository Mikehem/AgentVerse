'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight,
  Wrench,
  GitBranch,
  TestTube,
  BarChart3,
  Library,
  Plus,
  Users,
  Clock,
  TrendingUp,
  Zap,
  FileText,
  Play,
  Settings
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Quick stats interface
interface QuickStats {
  totalPrompts: number
  activeTests: number
  avgPerformance: number
  templatesShared: number
}

// Recent activity interface
interface RecentActivity {
  id: string
  type: 'prompt_created' | 'test_completed' | 'template_shared' | 'version_published'
  title: string
  description: string
  timestamp: string
  user: string
}

export default function PromptEngineeringPage() {
  const [stats, setStats] = useState<QuickStats>({
    totalPrompts: 0,
    activeTests: 0,
    avgPerformance: 0,
    templatesShared: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Mock data for now - replace with actual API calls
      setStats({
        totalPrompts: 42,
        activeTests: 7,
        avgPerformance: 8.7,
        templatesShared: 15
      })

      setRecentActivity([
        {
          id: '1',
          type: 'prompt_created',
          title: 'Customer Support Prompt v2.1',
          description: 'Created new prompt for handling refund requests',
          timestamp: '2 hours ago',
          user: 'Sarah Chen'
        },
        {
          id: '2',
          type: 'test_completed',
          title: 'A/B Test: Response Tone',
          description: 'Completed testing formal vs casual tone',
          timestamp: '4 hours ago',
          user: 'Mike Rodriguez'
        },
        {
          id: '3',
          type: 'template_shared',
          title: 'Email Classification Template',
          description: 'Shared template to Engineering team',
          timestamp: '6 hours ago',
          user: 'Lisa Wang'
        }
      ])
    } catch (error) {
      console.error('Error fetching prompt engineering data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'prompt_created': return <FileText className="w-4 h-4 text-blue-500" />
      case 'test_completed': return <TestTube className="w-4 h-4 text-green-500" />
      case 'template_shared': return <Users className="w-4 h-4 text-purple-500" />
      case 'version_published': return <GitBranch className="w-4 h-4 text-orange-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const tools = [
    {
      title: 'Prompt Workbench',
      description: 'IDE-like environment for developing and testing prompts with real-time preview',
      icon: Wrench,
      href: '/prompt-engineering/workbench',
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      features: ['Syntax highlighting', 'Real-time testing', 'Variable management', 'Template system']
    },
    {
      title: 'Version Control',
      description: 'Git-like version control system for prompt management and collaboration',
      icon: GitBranch,
      href: '/prompt-engineering/version-control',
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      features: ['Version history', 'Branch management', 'Merge conflicts', 'Team collaboration']
    },
    {
      title: 'Testing Framework',
      description: 'Comprehensive A/B testing and validation suite for prompt optimization',
      icon: TestTube,
      href: '/prompt-engineering/testing',
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      features: ['A/B testing', 'Performance metrics', 'Statistical analysis', 'Automated evaluation']
    },
    {
      title: 'Performance Analytics',
      description: 'Advanced analytics and optimization platform for prompt performance insights',
      icon: BarChart3,
      href: '/prompt-engineering/analytics',
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      features: ['Performance tracking', 'Cost optimization', 'Usage analytics', 'Quality metrics']
    },
    {
      title: 'Template Library',
      description: 'Centralized marketplace and library for sharing and discovering prompt templates',
      icon: Library,
      href: '/prompt-engineering/templates',
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50',
      features: ['Template marketplace', 'Category browsing', 'Rating system', 'Custom collections']
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Prompt Engineering</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Prompt Engineering Suite</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive tools for developing, testing, and optimizing AI prompts
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" />
              New Prompt
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Prompts</p>
                <p className="text-2xl font-bold text-primary">{stats.totalPrompts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +12% from last month
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Tests</p>
                <p className="text-2xl font-bold text-primary">{stats.activeTests}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TestTube className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-600">
              <Play className="w-4 h-4 mr-1" />
              3 running now
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Performance</p>
                <p className="text-2xl font-bold text-primary">{stats.avgPerformance}/10</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              +0.3 improvement
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Templates Shared</p>
                <p className="text-2xl font-bold text-primary">{stats.templatesShared}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Library className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-purple-600">
              <Users className="w-4 h-4 mr-1" />
              5 teams using
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tools Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-primary">Prompt Engineering Tools</h2>
              <span className="text-sm text-gray-500">{tools.length} tools available</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tools.map((tool) => {
                const Icon = tool.icon
                return (
                  <div key={tool.href} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", tool.bgColor)}>
                          <Icon className={cn("w-6 h-6", tool.color.replace('bg-', 'text-'))} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-primary transition-colors">
                            {tool.title}
                          </h3>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                        {tool.description}
                      </p>
                      
                      <div className="space-y-2 mb-4">
                        {tool.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {feature}
                          </div>
                        ))}
                      </div>
                      
                      <a
                        href={tool.href}
                        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                      >
                        Launch Tool
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Recent Activity</h3>
                <p className="text-sm text-gray-500 mt-1">Latest updates from your team</p>
              </div>
              
              <div className="p-6">
                {loading ? (
                  <div className="text-center text-gray-500 py-8">
                    Loading activity...
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span>{activity.user}</span>
                            <span>•</span>
                            <span>{activity.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200">
                <button className="w-full text-sm text-primary hover:text-primary-dark font-medium">
                  View all activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}