'use client'

import { Folder, Bot, MessageCircle, Target, TrendingUp } from 'lucide-react'
import { formatNumber, formatPercentage } from '@/lib/utils'
import { OverviewStats as OverviewStatsType } from '@/lib/types'

interface OverviewStatsProps {
  stats: OverviewStatsType
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  const statsConfig = [
    {
      title: 'Active Projects',
      value: stats.activeProjects.toString(),
      change: stats.trends.projects,
      icon: Folder,
      color: 'primary'
    },
    {
      title: 'Total Agents', 
      value: stats.totalAgents.toString(),
      change: stats.trends.agents,
      icon: Bot,
      color: 'secondary'
    },
    {
      title: 'Total Conversations',
      value: formatNumber(stats.totalConversations),
      change: stats.trends.conversations,
      icon: MessageCircle,
      color: 'accent'
    },
    {
      title: 'Avg Success Rate',
      value: formatPercentage(stats.avgSuccessRate),
      change: stats.trends.successRate,
      icon: Target,
      color: 'warning'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsConfig.map((stat) => {
        const Icon = stat.icon
        return (
          <div key={stat.title} className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className={`text-2xl font-bold mb-2 text-${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-muted mb-2">
                  {stat.title}
                </div>
                <div className="flex items-center gap-1 text-sm font-medium text-success">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </div>
              </div>
              <div className={`w-10 h-10 bg-${stat.color}-alpha rounded-lg flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${stat.color}`} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}