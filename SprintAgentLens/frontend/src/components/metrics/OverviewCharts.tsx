'use client'

import { useState } from 'react'
import { 
  PromptOverviewMetrics,
  MetricFocus,
  TimeRange
} from '@/lib/types/metrics'
import { BarChart3, TrendingUp, PieChart } from 'lucide-react'

interface OverviewChartsProps {
  overview: PromptOverviewMetrics
  metricFocus: MetricFocus
  timeRange: TimeRange
}

export function OverviewCharts({ overview, metricFocus, timeRange }: OverviewChartsProps) {
  const [activeChart, setActiveChart] = useState<'scatter' | 'trends' | 'volume' | 'distribution'>('scatter')
  
  const chartTabs = [
    {
      id: 'scatter' as const,
      label: 'Cost vs Performance',
      icon: BarChart3,
      description: 'Compare versions by cost and performance'
    },
    {
      id: 'trends' as const,
      label: 'Trends Over Time',
      icon: TrendingUp,
      description: 'Track metrics evolution'
    },
    {
      id: 'volume' as const,
      label: 'Volume Analysis',
      icon: BarChart3,
      description: 'Request volume by version'
    },
    {
      id: 'distribution' as const,
      label: 'Rating Distribution',
      icon: PieChart,
      description: 'Quality score breakdown'
    }
  ]
  
  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Chart Navigation */}
      <div className="border-b border-border bg-gray-50">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
          <div className="flex items-center space-x-1">
            {chartTabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeChart === tab.id
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title={tab.description}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* Chart Content */}
      <div className="p-6">
        {activeChart === 'scatter' && (
          <CostPerformanceChart overview={overview} />
        )}
        {activeChart === 'trends' && (
          <TrendsChart overview={overview} timeRange={timeRange} />
        )}
        {activeChart === 'volume' && (
          <VolumeChart overview={overview} />
        )}
        {activeChart === 'distribution' && (
          <RatingDistributionChart overview={overview} />
        )}
      </div>
    </div>
  )
}

// Cost vs Performance Scatter Plot
function CostPerformanceChart({ overview }: { overview: PromptOverviewMetrics }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Cost vs Performance Analysis</h4>
        <div className="text-sm text-gray-500">
          Bubble size represents request volume
        </div>
      </div>
      
      {/* Mock scatter plot visualization */}
      <div className="relative h-80 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="absolute inset-4">
          {/* Y-axis label */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm text-gray-600">
            Quality Rating (1-5)
          </div>
          
          {/* X-axis label */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm text-gray-600">
            Average Cost per Request ($)
          </div>
          
          {/* Data points */}
          <div className="relative w-full h-full">
            {overview.versions.map((version, index) => {
              const x = (version.summary.avgCostPerRequest * 1000) % 80 + 10 // Mock positioning
              const y = (version.summary.avgRating / 5) * 80 + 10
              const size = Math.log(version.summary.totalRequests || 1) * 3 + 8
              
              const colors = [
                'bg-blue-500 border-blue-600',
                'bg-green-500 border-green-600', 
                'bg-purple-500 border-purple-600',
                'bg-orange-500 border-orange-600'
              ]
              
              return (
                <div
                  key={version.versionId}
                  className={`absolute rounded-full border-2 ${colors[index % colors.length]} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                  style={{
                    left: `${x}%`,
                    top: `${100 - y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={`Version ${version.versionNumber}: $${version.summary.avgCostPerRequest.toFixed(4)}, ${version.summary.avgRating.toFixed(1)}/5`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                    v{version.versionNumber}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Grid lines */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Vertical grid lines */}
            {[25, 50, 75].map(x => (
              <div key={x} className="absolute h-full border-l border-gray-300 opacity-30" style={{ left: `${x}%` }} />
            ))}
            {/* Horizontal grid lines */}
            {[25, 50, 75].map(y => (
              <div key={y} className="absolute w-full border-t border-gray-300 opacity-30" style={{ top: `${y}%` }} />
            ))}
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {overview.versions.map((version, index) => {
          const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
          return (
            <div key={version.versionId} className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`} />
              <span>Version {version.versionNumber}</span>
              <span className="text-gray-500">({version.summary.totalRequests} requests)</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Trends Over Time Chart
function TrendsChart({ overview, timeRange }: { overview: PromptOverviewMetrics; timeRange: TimeRange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Metrics Trends</h4>
        <div className="text-sm text-gray-500">
          Last 7 days
        </div>
      </div>
      
      {/* Mock line chart */}
      <div className="h-80 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <div className="relative w-full h-full">
          {/* Mock trend lines */}
          <svg className="w-full h-full">
            {/* Cost trend (decreasing) */}
            <polyline
              points="50,200 100,180 150,170 200,160 250,155 300,150"
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Performance trend (improving) */}
            <polyline
              points="50,180 100,170 150,160 200,150 250,145 300,140"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Quality trend (improving) */}
            <polyline
              points="50,160 100,155 150,150 200,148 250,145 300,142"
              fill="none"
              stroke="#F59E0B"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
            
            {/* Volume trend (increasing) */}
            <polyline
              points="50,220 100,210 150,200 200,190 250,180 300,170"
              fill="none"
              stroke="#8B5CF6"
              strokeWidth="2"
              className="drop-shadow-sm"
            />
          </svg>
          
          {/* Trend indicators */}
          <div className="absolute top-4 right-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span>Cost</span>
              <span className="text-green-600 text-xs">↓ 12.5%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-0.5 bg-blue-500"></div>
              <span>Performance</span>
              <span className="text-blue-600 text-xs">↑ 8.2%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-0.5 bg-yellow-500"></div>
              <span>Quality</span>
              <span className="text-yellow-600 text-xs">↑ 5.8%</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-3 h-0.5 bg-purple-500"></div>
              <span>Volume</span>
              <span className="text-purple-600 text-xs">↑ 23.4%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Volume Analysis Chart
function VolumeChart({ overview }: { overview: PromptOverviewMetrics }) {
  const maxRequests = Math.max(...overview.versions.map(v => v.summary.totalRequests))
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Request Volume by Version</h4>
        <div className="text-sm text-gray-500">
          Total: {overview.summary.totalRequests.toLocaleString()} requests
        </div>
      </div>
      
      {/* Bar chart */}
      <div className="space-y-3">
        {overview.versions.map((version, index) => {
          const percentage = (version.summary.totalRequests / maxRequests) * 100
          const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500']
          
          return (
            <div key={version.versionId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Version {version.versionNumber}</span>
                <div className="flex items-center gap-2">
                  <span>{version.summary.totalRequests.toLocaleString()}</span>
                  <span className="text-gray-500">
                    ({((version.summary.totalRequests / overview.summary.totalRequests) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${colors[index % colors.length]} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Rating Distribution Chart
function RatingDistributionChart({ overview }: { overview: PromptOverviewMetrics }) {
  // Mock rating distribution data
  const ratingDistribution = [
    { rating: 5, count: 450, percentage: 45 },
    { rating: 4, count: 320, percentage: 32 },
    { rating: 3, count: 150, percentage: 15 },
    { rating: 2, count: 60, percentage: 6 },
    { rating: 1, count: 20, percentage: 2 }
  ]
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Quality Rating Distribution</h4>
        <div className="text-sm text-gray-500">
          Avg: {overview.summary.avgRating.toFixed(1)}/5.0
        </div>
      </div>
      
      {/* Distribution bars */}
      <div className="space-y-2">
        {ratingDistribution.map((item) => (
          <div key={item.rating} className="flex items-center gap-3">
            <div className="w-12 text-sm font-medium text-gray-700">
              {item.rating} ⭐
            </div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
              <div
                className="h-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-800">
                {item.count} ({item.percentage}%)
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">87%</div>
          <div className="text-sm text-gray-600">Positive (4-5★)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">15%</div>
          <div className="text-sm text-gray-600">Neutral (3★)</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">8%</div>
          <div className="text-sm text-gray-600">Negative (1-2★)</div>
        </div>
      </div>
    </div>
  )
}