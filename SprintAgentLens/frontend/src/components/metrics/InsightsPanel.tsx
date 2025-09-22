'use client'

import { useState } from 'react'
import { 
  Lightbulb, 
  AlertTriangle, 
  Info, 
  TrendingUp,
  X,
  ChevronRight,
  DollarSign,
  Clock,
  Star,
  Activity,
  CheckCircle
} from 'lucide-react'
import { MetricInsight } from '@/lib/types/metrics'

interface InsightsPanelProps {
  insights: MetricInsight[]
  alerts: MetricInsight[]
}

export function InsightsPanel({ insights, alerts }: InsightsPanelProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set())
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  
  const handleDismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set([...prev, insightId]))
  }
  
  const handleToggleExpand = (insightId: string) => {
    setExpandedInsight(expandedInsight === insightId ? null : insightId)
  }
  
  const visibleInsights = insights.filter(insight => !dismissedInsights.has(insight.id))
  const visibleAlerts = alerts.filter(alert => !dismissedInsights.has(alert.id))
  
  if (visibleInsights.length === 0 && visibleAlerts.length === 0) {
    return null
  }
  
  return (
    <div className="space-y-4">
      {/* Alerts Section */}
      {visibleAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Active Alerts</h3>
            <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
              {visibleAlerts.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {visibleAlerts.map((alert) => (
              <InsightCard
                key={alert.id}
                insight={alert}
                isAlert={true}
                isExpanded={expandedInsight === alert.id}
                onToggleExpand={() => handleToggleExpand(alert.id)}
                onDismiss={() => handleDismissInsight(alert.id)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Insights Section */}
      {visibleInsights.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Insights & Recommendations</h3>
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {visibleInsights.length}
            </span>
          </div>
          
          <div className="space-y-3">
            {visibleInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                isAlert={false}
                isExpanded={expandedInsight === insight.id}
                onToggleExpand={() => handleToggleExpand(insight.id)}
                onDismiss={() => handleDismissInsight(insight.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

interface InsightCardProps {
  insight: MetricInsight
  isAlert: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onDismiss: () => void
}

function InsightCard({ 
  insight, 
  isAlert, 
  isExpanded, 
  onToggleExpand, 
  onDismiss 
}: InsightCardProps) {
  const getInsightIcon = () => {
    if (isAlert) {
      switch (insight.severity) {
        case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />
        case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />
        default: return <Info className="w-4 h-4 text-blue-600" />
      }
    }
    
    switch (insight.type) {
      case 'trend': return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'recommendation': return <Lightbulb className="w-4 h-4 text-green-600" />
      case 'comparison': return <Activity className="w-4 h-4 text-purple-600" />
      default: return <Info className="w-4 h-4 text-blue-600" />
    }
  }
  
  const getMetricIcons = () => {
    return insight.metricTypes.map((metricType) => {
      switch (metricType) {
        case 'cost': return <DollarSign key={metricType} className="w-3 h-3" />
        case 'performance': return <Clock key={metricType} className="w-3 h-3" />
        case 'quality': return <Star key={metricType} className="w-3 h-3" />
        default: return <Activity key={metricType} className="w-3 h-3" />
      }
    })
  }
  
  const getBgColor = () => {
    if (isAlert) {
      switch (insight.severity) {
        case 'critical': return 'bg-red-100'
        case 'warning': return 'bg-yellow-100'
        default: return 'bg-blue-100'
      }
    }
    return 'bg-white'
  }
  
  const getBorderColor = () => {
    if (isAlert) {
      switch (insight.severity) {
        case 'critical': return 'border-red-300'
        case 'warning': return 'border-yellow-300'
        default: return 'border-blue-300'
      }
    }
    return 'border-gray-200'
  }
  
  return (
    <div className={`${getBgColor()} border ${getBorderColor()} rounded-lg p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-shrink-0 mt-0.5">
              {getInsightIcon()}
            </div>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-sm text-gray-700">
                    {insight.description}
                  </p>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-1 ml-3">
                  <button
                    onClick={onToggleExpand}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title={isExpanded ? 'Collapse' : 'Expand details'}
                  >
                    <ChevronRight 
                      className={`w-4 h-4 text-gray-500 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`} 
                    />
                  </button>
                  <button
                    onClick={onDismiss}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Dismiss insight"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Metadata */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span>Metrics:</span>
                  <div className="flex items-center gap-1">
                    {getMetricIcons()}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  <span>Confidence:</span>
                  <span className="font-medium">
                    {Math.round(insight.confidence * 100)}%
                  </span>
                </div>
                
                <div>
                  {new Date(insight.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          
          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
              {/* Evidence */}
              {insight.evidence && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Evidence</h5>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div>Current value: {insight.evidence.currentValue}</div>
                    {insight.evidence.previousValue && (
                      <div>Previous value: {insight.evidence.previousValue}</div>
                    )}
                    {insight.evidence.threshold && (
                      <div>Threshold: {insight.evidence.threshold}</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              {insight.recommendations && insight.recommendations.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Recommendations</h5>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {insight.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {/* Estimated Impact */}
              {insight.estimatedImpact && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Estimated Impact</h5>
                  <div className="text-sm text-gray-700 space-y-1">
                    {insight.estimatedImpact.costSavings && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-green-600" />
                        <span>Cost savings: ${insight.estimatedImpact.costSavings.toFixed(2)}</span>
                      </div>
                    )}
                    {insight.estimatedImpact.performanceImprovement && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Performance improvement: {insight.estimatedImpact.performanceImprovement.toFixed(1)}%</span>
                      </div>
                    )}
                    {insight.estimatedImpact.qualityImprovement && (
                      <div className="flex items-center gap-2">
                        <Star className="w-3 h-3 text-yellow-600" />
                        <span>Quality improvement: {insight.estimatedImpact.qualityImprovement.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}