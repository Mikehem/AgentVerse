'use client'

import { BarChart3, TrendingUp, Clock, Activity } from 'lucide-react'

interface TraceData {
  timestamp: string
  count: number
  avgDuration: number
  successRate: number
}

interface TraceAnalyticsChartProps {
  data: TraceData[]
  timeRange: string
}

export function TraceAnalyticsChart({ data, timeRange }: TraceAnalyticsChartProps) {
  const maxCount = Math.max(...data.map(d => d.count))
  const maxDuration = Math.max(...data.map(d => d.avgDuration))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Performance Analytics</h3>
          <p className="text-sm text-gray-500">Trace volume and performance over {timeRange}</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            Trace Count
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            Avg Duration
          </div>
        </div>
      </div>

      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>{maxCount}</span>
          <span>{Math.round(maxCount * 0.75)}</span>
          <span>{Math.round(maxCount * 0.5)}</span>
          <span>{Math.round(maxCount * 0.25)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-12 mr-4 h-full flex items-end justify-between space-x-2">
          {data.map((point, index) => {
            const countHeight = (point.count / maxCount) * 100
            const durationHeight = (point.avgDuration / maxDuration) * 100
            
            return (
              <div key={index} className="flex flex-col items-center flex-1 group">
                {/* Bars */}
                <div className="relative w-full h-48 flex items-end justify-center space-x-1">
                  <div
                    className="bg-blue-500 rounded-t-sm transition-all duration-300 group-hover:bg-blue-600"
                    style={{ height: `${countHeight}%`, width: '40%' }}
                    title={`${point.count} traces`}
                  ></div>
                  <div
                    className="bg-green-500 rounded-t-sm transition-all duration-300 group-hover:bg-green-600"
                    style={{ height: `${durationHeight}%`, width: '40%' }}
                    title={`${point.avgDuration.toFixed(1)}ms avg duration`}
                  ></div>
                </div>
                
                {/* X-axis label */}
                <div className="mt-2 text-xs text-gray-500 text-center">
                  {new Date(point.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>

                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-gray-800 text-white text-xs rounded px-2 py-1 pointer-events-none z-10 transition-opacity duration-200">
                  <div>Count: {point.count}</div>
                  <div>Duration: {point.avgDuration.toFixed(1)}ms</div>
                  <div>Success: {(point.successRate * 100).toFixed(1)}%</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-6 grid grid-cols-3 gap-6 pt-6 border-t border-gray-200">
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-50 rounded-lg mx-auto mb-2">
            <Activity className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {data.reduce((sum, d) => sum + d.count, 0)}
          </div>
          <div className="text-sm text-gray-500">Total Traces</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-green-50 rounded-lg mx-auto mb-2">
            <Clock className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {(data.reduce((sum, d) => sum + d.avgDuration, 0) / data.length).toFixed(1)}ms
          </div>
          <div className="text-sm text-gray-500">Avg Duration</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center w-8 h-8 bg-purple-50 rounded-lg mx-auto mb-2">
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-lg font-semibold text-gray-900">
            {((data.reduce((sum, d) => sum + d.successRate, 0) / data.length) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500">Success Rate</div>
        </div>
      </div>
    </div>
  )
}