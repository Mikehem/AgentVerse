'use client'

import { 
  LayoutDashboard, 
  Folder, 
  Bot, 
  MessageSquare, 
  MessageCircle,
  Activity,
  TestTube, 
  Database, 
  Settings, 
  Users, 
  Cpu, 
  BarChart, 
  Zap,
  MoreHorizontal,
  Building2,
  Star,
  ThumbsUp,
  GitBranch,
  Network,
  Wrench,
  Library,
  BarChart3,
  Globe,
  Brain,
  Target,
  DollarSign,
  Shield,
  Code,
  PieChart,
  TrendingUp,
  Boxes
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, current: true },
  { name: 'Projects', href: '/projects', icon: Folder, current: false },
  { name: 'Agents', href: '/agents', icon: Bot, current: false },
  { name: 'Distributed Traces', href: '/distributed-traces', icon: Network, current: false },
  { name: 'Prompts', href: '/prompts', icon: MessageSquare, current: false },
  { name: 'Experiments', href: '/experiments', icon: Zap, current: false },
  { name: 'Datasets', href: '/datasets', icon: Database, current: false },
  { name: 'Settings', href: '/settings', icon: Settings, current: false },
]

const promptEngineeringNavigation = [
  { name: 'Prompt Engineering', href: '/prompt-engineering', icon: Wrench, current: false },
  { name: 'Workbench', href: '/prompt-engineering/workbench', icon: Wrench, current: false, isSubItem: true },
  { name: 'Version Control', href: '/prompt-engineering/version-control', icon: GitBranch, current: false, isSubItem: true },
  { name: 'Testing Framework', href: '/prompt-engineering/testing', icon: TestTube, current: false, isSubItem: true },
  { name: 'Performance Analytics', href: '/prompt-engineering/analytics', icon: BarChart3, current: false, isSubItem: true },
  { name: 'Template Library', href: '/prompt-engineering/templates', icon: Library, current: false, isSubItem: true },
]

const operationsNavigation = [
  { name: 'Agent Operations', href: '/agent-ops', icon: Activity, current: false },
  { name: 'Data Analytics', href: '/data-analytics', icon: BarChart3, current: false },
  { name: 'ML Engineering', href: '/ml-engineering', icon: Brain, current: false },
]

const businessNavigation = [
  { name: 'Product Management', href: '/product-management', icon: Target, current: false },
  { name: 'Business Intelligence', href: '/business-intelligence', icon: PieChart, current: false },
  { name: 'Compliance', href: '/compliance', icon: Shield, current: false },
]

const developmentNavigation = [
  { name: 'Agent Playground', href: '/agent-playground', icon: Boxes, current: false },
  { name: 'MCP Registry', href: '/mcp-registry', icon: Globe, current: false },
  { name: 'Developer Tools', href: '/developer-tools', icon: Code, current: false },
]

const adminNavigation = [
  { name: 'User Management', href: '/admin/users', icon: Users, current: false },
  { name: 'Departments', href: '/admin/departments', icon: Building2, current: false },
  { name: 'Business Priorities', href: '/admin/priorities', icon: Star, current: false },
  { name: 'Feedback Definitions', href: '/admin/feedback-definitions', icon: ThumbsUp, current: false },
  { name: 'LLM Providers', href: '/admin/providers', icon: Cpu, current: false },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart, current: false },
]

export function Sidebar() {
  return (
    <div className="sidebar flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-light">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Zap className="w-5 h-5 text-inverse" />
          </div>
          <span className="font-semibold text-lg text-primary">Sprint Agent Lens</span>
        </div>
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 p-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={cn(
                    'nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    item.current
                      ? 'active bg-primary-alpha text-primary'
                      : 'text-secondary hover:bg-accent-alpha hover:text-primary'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </a>
              </li>
            )
          })}
        </ul>

        {/* Operations Section */}
        <div className="mt-8 pt-6 border-t border-light">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Operations
          </p>
          <ul className="space-y-1">
            {operationsNavigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      'nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.current
                        ? 'active bg-primary-alpha text-primary'
                        : 'text-secondary hover:bg-accent-alpha hover:text-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Business Section */}
        <div className="mt-8 pt-6 border-t border-light">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Business
          </p>
          <ul className="space-y-1">
            {businessNavigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      'nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.current
                        ? 'active bg-primary-alpha text-primary'
                        : 'text-secondary hover:bg-accent-alpha hover:text-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Prompt Engineering Section */}
        <div className="mt-8 pt-6 border-t border-light">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Prompt Engineering
          </p>
          <ul className="space-y-1">
            {promptEngineeringNavigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      'nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.isSubItem && 'ml-3',
                      item.current
                        ? 'active bg-primary-alpha text-primary'
                        : 'text-secondary hover:bg-accent-alpha hover:text-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Development Section */}
        <div className="mt-8 pt-6 border-t border-light">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Development
          </p>
          <ul className="space-y-1">
            {developmentNavigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      'nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.current
                        ? 'active bg-primary-alpha text-primary'
                        : 'text-secondary hover:bg-accent-alpha hover:text-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Administration Section */}
        <div className="mt-8 pt-6 border-t border-light">
          <p className="px-3 text-xs font-semibold text-muted uppercase tracking-wider mb-3">
            Administration
          </p>
          <ul className="space-y-1">
            {adminNavigation.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className={cn(
                      'nav-item flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      item.current
                        ? 'active bg-primary-alpha text-primary'
                        : 'text-secondary hover:bg-accent-alpha hover:text-primary'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {/* User Profile Section */}
      <div className="p-4 border-t border-light">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-primary">
              AD
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary truncate">Admin User</p>
            <p className="text-xs text-muted truncate">admin@sprintlens.com</p>
          </div>
          <button className="p-1 rounded-md hover:bg-accent-alpha transition-colors">
            <MoreHorizontal className="w-4 h-4 text-muted" />
          </button>
        </div>
      </div>
    </div>
  )
}