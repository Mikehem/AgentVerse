'use client'

import { 
  DollarSign, 
  Clock, 
  Star, 
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Zap
} from 'lucide-react'
import { 
  PromptOverviewMetrics,
  MetricFocus
} from '@/lib/types/metrics'
import { 
  formatMetricValue,
  formatPercentageChange,
  getTrendIcon
} from '@/lib/utils/metricsUtils'

interface QuickMetricsCardsProps {
  overview: PromptOverviewMetrics
  metricFocus: MetricFocus
}

export function QuickMetricsCards({ overview, metricFocus }: QuickMetricsCardsProps) {
  // Calculate percentage changes (mock data for now - would come from API)
  const changes = {
    cost: -12.5, // 12.5% decrease
    performance: -8.2, // 8.2% improvement (decrease in latency)
    quality: 5.8, // 5.8% increase
    volume: 23.4 // 23.4% increase
  }
  
  const cards = [
    {
      id: 'requests',
      title: 'Total Requests',
      value: overview.summary.totalRequests.toLocaleString(),
      change: changes.volume,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      trend: overview.trends.volume,
      priority: metricFocus === 'all' ? 1 : 4
    },
    {
      id: 'cost',
      title: 'Total Cost',
      value: `$${overview.summary.totalCost.toFixed(2)}`,
      change: changes.cost,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      trend: overview.trends.cost,
      priority: metricFocus === 'cost' ? 1 : metricFocus === 'all' ? 2 : 3
    },
    {
      id: 'performance',
      title: 'Avg Response Time',
      value: `${Math.round(overview.summary.avgResponseTime)}ms`,
      change: changes.performance,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      trend: overview.trends.performance,
      priority: metricFocus === 'performance' ? 1 : metricFocus === 'all' ? 3 : 3
    },
    {
      id: 'quality',
      title: 'Avg Rating',
      value: `${overview.summary.avgRating.toFixed(1)}/5.0`,
      change: changes.quality,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      trend: overview.trends.quality,
      priority: metricFocus === 'quality' ? 1 : metricFocus === 'all' ? 4 : 3
    }
  ]
  
  // Add additional cards based on metric focus
  if (metricFocus === 'cost') {
    const avgCostPerRequest = overview.summary.totalCost / overview.summary.totalRequests
    cards.push({
      id: 'cost-per-request',
      title: 'Cost per Request',
      value: `$${avgCostPerRequest.toFixed(4)}`,
      change: changes.cost,
      icon: Zap,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      trend: overview.trends.cost,
      priority: 2
    })
  }
  
  if (metricFocus === 'quality') {
    cards.push({
      id: 'active-versions',
      title: 'Active Versions',
      value: overview.summary.activeVersions.toString(),
      change: 0,
      icon: Users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      trend: 'stable',
      priority: 2
    })
  }
  
  // Sort cards by priority for focused views
  const sortedCards = [...cards].sort((a, b) => a.priority - b.priority)
  
  // Limit cards based on focus
  const displayCards = metricFocus === 'all' ? sortedCards.slice(0, 4) : sortedCards.slice(0, 3)
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {displayCards.map((card) => {
        const Icon = card.icon
        const isPositiveChange = card.change > 0
        const isNegativeChange = card.change < 0
        const isNeutralChange = Math.abs(card.change) < 1
        
        // For some metrics, positive change is good, for others it's bad
        const isGoodChange = (() => {
          if (isNeutralChange) return null
          
          switch (card.id) {
            case 'cost':
            case 'cost-per-request':
            case 'performance': // Lower latency is better
              return isNegativeChange
            case 'quality':
            case 'requests':
            case 'active-versions':
              return isPositiveChange
            default:
              return isPositiveChange
          }
        })()
        
        const changeColor = isNeutralChange 
          ? 'text-gray-500' 
          : isGoodChange 
            ? 'text-green-600' 
            : 'text-red-600'
        
        const TrendIcon = isNeutralChange 
          ? Minus 
          : isPositiveChange 
            ? TrendingUp 
            : TrendingDown
        
        return (
          <div
            key={card.id}
            className={`bg-white rounded-lg border ${card.borderColor} p-6 hover:shadow-md transition-all duration-200`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 ${card.bgColor} rounded-lg`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-gray-900">
                  {getTrendIcon(card.trend)}
                </span>
              </div>
            </div>
            
            {/* Value */}
            <div className="mb-2">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {card.value}
              </div>
              <div className="text-sm text-gray-600">
                {card.title}
              </div>
            </div>
            
            {/* Change indicator */}
            <div className="flex items-center gap-1">
              <TrendIcon className={`w-3 h-3 ${changeColor}`} />
              <span className={`text-sm font-medium ${changeColor}`}>
                {card.change === 0 
                  ? 'No change' 
                  : formatPercentageChange(card.change)
                }
              </span>
              <span className="text-xs text-gray-500 ml-1">
                vs last period
              </span>
            </div>
          </div>
        )
      })}
      
      {/* Best Performing Version Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Star className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-right">
            <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">
              RECOMMENDED
            </span>
          </div>
        </div>
        
        <div className="mb-2">
          <div className="text-lg font-bold text-blue-900 mb-1">
            Version {overview.bestPerforming.overall.split('-').pop()}
          </div>
          <div className="text-sm text-blue-700">
            Best Overall Performance
          </div>
        </div>
        
        <div className="text-xs text-blue-600">
          Optimal balance of cost, speed, and quality
        </div>
      </div>
    </div>
  )
}

// Loading skeleton for quick metrics cards
export function QuickMetricsCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-9 h-9 bg-gray-200 rounded-lg"></div>
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
          </div>
          
          <div className="mb-2">
            <div className="w-20 h-8 bg-gray-200 rounded mb-2"></div>
            <div className="w-24 h-4 bg-gray-200 rounded"></div>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-gray-200 rounded"></div>
            <div className="w-12 h-4 bg-gray-200 rounded"></div>
            <div className="w-16 h-3 bg-gray-200 rounded ml-1"></div>
          </div>
        </div>
      ))}
    </div>
  )
}