'use client'

import { useState } from 'react'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Crown,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  MoreVertical,
  Play,
  GitCompare
} from 'lucide-react'
import { 
  PromptOverviewMetrics,
  MetricFocus
} from '@/lib/types/metrics'
import { formatMetricValue, formatPercentageChange } from '@/lib/utils/metricsUtils'

interface VersionComparisonProps {
  promptId: string
  versions: PromptOverviewMetrics['versions']
  bestPerforming: PromptOverviewMetrics['bestPerforming']
  metricFocus: MetricFocus
}

export function VersionComparison({ 
  promptId, 
  versions, 
  bestPerforming, 
  metricFocus 
}: VersionComparisonProps) {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [sortBy, setSortBy] = useState<'version' | 'cost' | 'performance' | 'quality' | 'volume'>('version')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  
  const handleVersionSelect = (versionId: string) => {
    setSelectedVersions(prev => 
      prev.includes(versionId)
        ? prev.filter(id => id !== versionId)
        : [...prev, versionId]
    )
  }
  
  const handleCompareSelected = () => {
    if (selectedVersions.length >= 2) {
      // Navigate to comparison view or open modal
      console.log('Compare versions:', selectedVersions)
    }
  }
  
  const sortedVersions = [...versions].sort((a, b) => {
    let aValue: number, bValue: number
    
    switch (sortBy) {
      case 'version':
        aValue = a.versionNumber
        bValue = b.versionNumber
        break
      case 'cost':
        aValue = a.summary.avgCostPerRequest
        bValue = b.summary.avgCostPerRequest
        break
      case 'performance':
        aValue = a.summary.avgLatencyMs
        bValue = b.summary.avgLatencyMs
        break
      case 'quality':
        aValue = a.summary.avgRating
        bValue = b.summary.avgRating
        break
      case 'volume':
        aValue = a.summary.totalRequests
        bValue = b.summary.totalRequests
        break
      default:
        aValue = a.versionNumber
        bValue = b.versionNumber
    }
    
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
  })
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'testing':
        return <Clock className="w-4 h-4 text-blue-600" />
      case 'draft':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-400" />
    }
  }
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'testing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-600" />
      default:
        return <Minus className="w-3 h-3 text-gray-400" />
    }
  }
  
  const isBestPerforming = (versionId: string, metric: string) => {
    return bestPerforming[metric as keyof typeof bestPerforming] === versionId
  }
  
  return (
    <div className="bg-white rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="border-b border-border bg-gray-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Version Comparison</h3>
            <p className="text-sm text-gray-600 mt-1">
              Compare performance across different prompt versions
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Compare button */}
            {selectedVersions.length >= 2 && (
              <button
                onClick={handleCompareSelected}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm"
              >
                <GitCompare className="w-4 h-4" />
                Compare ({selectedVersions.length})
              </button>
            )}
            
            {/* View mode toggle */}
            <div className="flex items-center border border-border rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'table' ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-sm ${
                  viewMode === 'cards' ? 'bg-accent' : 'hover:bg-accent'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        {viewMode === 'table' ? (
          <VersionTable
            versions={sortedVersions}
            bestPerforming={bestPerforming}
            selectedVersions={selectedVersions}
            onVersionSelect={handleVersionSelect}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={(column) => {
              if (sortBy === column) {
                setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
              } else {
                setSortBy(column)
                setSortOrder('asc')
              }
            }}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
            getTrendIcon={getTrendIcon}
            isBestPerforming={isBestPerforming}
          />
        ) : (
          <VersionCards
            versions={sortedVersions}
            bestPerforming={bestPerforming}
            selectedVersions={selectedVersions}
            onVersionSelect={handleVersionSelect}
            getStatusIcon={getStatusIcon}
            getStatusColor={getStatusColor}
            getTrendIcon={getTrendIcon}
            isBestPerforming={isBestPerforming}
          />
        )}
      </div>
    </div>
  )
}

// Table view component
function VersionTable({
  versions,
  bestPerforming,
  selectedVersions,
  onVersionSelect,
  sortBy,
  sortOrder,
  onSort,
  getStatusIcon,
  getStatusColor,
  getTrendIcon,
  isBestPerforming
}: any) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-3 px-4">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={selectedVersions.length === versions.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    onVersionSelect(versions.map((v: any) => v.versionId))
                  } else {
                    onVersionSelect([])
                  }
                }}
              />
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">
              <button
                onClick={() => onSort('version')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Version
                {sortBy === 'version' && (
                  sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">
              <button
                onClick={() => onSort('volume')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Requests
                {sortBy === 'volume' && (
                  sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">
              <button
                onClick={() => onSort('cost')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Avg Cost
                {sortBy === 'cost' && (
                  sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">
              <button
                onClick={() => onSort('performance')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Avg Latency
                {sortBy === 'performance' && (
                  sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">
              <button
                onClick={() => onSort('quality')}
                className="flex items-center gap-1 hover:text-primary"
              >
                Avg Rating
                {sortBy === 'quality' && (
                  sortOrder === 'asc' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />
                )}
              </button>
            </th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Trend</th>
            <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((version: any) => (
            <tr key={version.versionId} className="border-b border-border hover:bg-gray-50">
              <td className="py-3 px-4">
                <input
                  type="checkbox"
                  className="rounded border-border"
                  checked={selectedVersions.includes(version.versionId)}
                  onChange={() => onVersionSelect(version.versionId)}
                />
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium">v{version.versionNumber}</span>
                  {version.isRecommended && <Crown className="w-4 h-4 text-yellow-500" />}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  {getStatusIcon(version.status)}
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(version.status)}`}>
                    {version.status}
                  </span>
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <span>{version.summary.totalRequests.toLocaleString()}</span>
                  {isBestPerforming(version.versionId, 'volume') && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <span>${version.summary.avgCostPerRequest.toFixed(4)}</span>
                  {isBestPerforming(version.versionId, 'cost') && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <span>{Math.round(version.summary.avgLatencyMs)}ms</span>
                  {isBestPerforming(version.versionId, 'speed') && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <span>{version.summary.avgRating.toFixed(1)}/5.0</span>
                  {isBestPerforming(version.versionId, 'quality') && (
                    <Crown className="w-3 h-3 text-yellow-500" />
                  )}
                </div>
              </td>
              <td className="py-3 px-4">
                {getTrendIcon(version.trend)}
              </td>
              <td className="py-3 px-4">
                <div className="flex items-center gap-1">
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Test version"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-200 rounded"
                    title="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Cards view component
function VersionCards({
  versions,
  bestPerforming,
  selectedVersions,
  onVersionSelect,
  getStatusIcon,
  getStatusColor,
  getTrendIcon,
  isBestPerforming
}: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {versions.map((version: any) => (
        <div
          key={version.versionId}
          className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
            selectedVersions.includes(version.versionId) ? 'ring-2 ring-primary' : 'border-border'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="rounded border-border"
                checked={selectedVersions.includes(version.versionId)}
                onChange={() => onVersionSelect(version.versionId)}
              />
              <span className="font-medium">Version {version.versionNumber}</span>
              {version.isRecommended && <Crown className="w-4 h-4 text-yellow-500" />}
            </div>
            
            <div className="flex items-center gap-2">
              {getStatusIcon(version.status)}
              <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(version.status)}`}>
                {version.status}
              </span>
            </div>
          </div>
          
          {/* Metrics */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Requests</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{version.summary.totalRequests.toLocaleString()}</span>
                {isBestPerforming(version.versionId, 'volume') && (
                  <Crown className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Cost</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">${version.summary.avgCostPerRequest.toFixed(4)}</span>
                {isBestPerforming(version.versionId, 'cost') && (
                  <Crown className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Latency</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{Math.round(version.summary.avgLatencyMs)}ms</span>
                {isBestPerforming(version.versionId, 'speed') && (
                  <Crown className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Rating</span>
              <div className="flex items-center gap-1">
                <span className="font-medium">{version.summary.avgRating.toFixed(1)}/5.0</span>
                {isBestPerforming(version.versionId, 'quality') && (
                  <Crown className="w-3 h-3 text-yellow-500" />
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Trend:</span>
              {getTrendIcon(version.trend)}
            </div>
            
            <div className="flex items-center gap-1">
              <button
                className="p-1 hover:bg-gray-200 rounded"
                title="View details"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                className="p-1 hover:bg-gray-200 rounded"
                title="Test version"
              >
                <Play className="w-4 h-4" />
              </button>
              <button
                className="p-1 hover:bg-gray-200 rounded"
                title="More options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}