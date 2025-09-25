'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  BarChart3, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Download,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExperimentResultsModalProps {
  isOpen: boolean
  onClose: () => void
  experimentId: string
  experimentName: string
}

interface ExperimentRun {
  id: string
  status: string
  total_items: number
  completed_items: number
  failed_items: number
  execution_time: number
  aggregate_scores: any
  evaluation_ids: string[]
  results: ExperimentResult[]
  results_pagination: any
}

interface ExperimentResult {
  id: string
  input_data: any
  generated_output: string
  expected_output: any
  evaluation_scores: any
  overall_score: number
  passed: boolean
  execution_time: number
}

export default function ExperimentResultsModal({
  isOpen,
  onClose,
  experimentId,
  experimentName
}: ExperimentResultsModalProps) {
  const [loading, setLoading] = useState(false)
  const [runs, setRuns] = useState<ExperimentRun[]>([])
  const [selectedRun, setSelectedRun] = useState<ExperimentRun | null>(null)
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (isOpen && experimentId) {
      fetchResults()
    }
  }, [isOpen, experimentId])

  const fetchResults = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/v1/experiments/${experimentId}/results`)
      const result = await response.json()
      
      if (result.success) {
        setRuns(result.data)
        if (result.data.length > 0) {
          setSelectedRun(result.data[0]) // Select latest run by default
        }
      }
    } catch (error) {
      console.error('Error fetching experiment results:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleResultExpansion = (resultId: string) => {
    const newExpanded = new Set(expandedResults)
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId)
    } else {
      newExpanded.add(resultId)
    }
    setExpandedResults(newExpanded)
  }

  const formatScore = (score: number) => {
    return Math.round(score * 100)
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600'
    if (score >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-primary">Experiment Results</h2>
            <p className="text-sm text-gray-600 mt-1">{experimentName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-100px)]">
          {/* Sidebar - Run Selection */}
          <div className="w-80 border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Experiment Runs</h3>
              <p className="text-sm text-gray-500">Select a run to view results</p>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading runs...</div>
              ) : runs.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No runs found</div>
              ) : (
                <div className="p-2 space-y-2">
                  {runs.map((run) => (
                    <div
                      key={run.id}
                      onClick={() => setSelectedRun(run)}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-all",
                        selectedRun?.id === run.id
                          ? "border-primary bg-primary-50 ring-2 ring-primary"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          Run #{run.id.slice(-6)}
                        </span>
                        <span className={cn(
                          "px-2 py-1 text-xs rounded-full",
                          run.status === 'completed' ? 'bg-green-100 text-green-800' :
                          run.status === 'running' ? 'bg-blue-100 text-blue-800' :
                          run.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        )}>
                          {run.status}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500 space-y-1">
                        <div>Items: {run.completed_items}/{run.total_items}</div>
                        {run.execution_time && (
                          <div>Time: {Math.round(run.execution_time / 1000)}s</div>
                        )}
                        {run.aggregate_scores && Object.keys(run.aggregate_scores).length > 0 && (
                          <div>
                            Avg Score: {formatScore(
                              Object.values(run.aggregate_scores)
                                .reduce((sum: number, score: any) => sum + score.averageScore, 0) / 
                              Object.keys(run.aggregate_scores).length
                            )}%
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedRun ? (
              <>
                {/* Summary Stats */}
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Total Items</p>
                          <p className="text-2xl font-bold text-primary">{selectedRun.total_items}</p>
                        </div>
                        <BarChart3 className="w-8 h-8 text-primary" />
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Success Rate</p>
                          <p className="text-2xl font-bold text-green-600">
                            {Math.round((selectedRun.completed_items / selectedRun.total_items) * 100)}%
                          </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Avg Score</p>
                          <p className={cn(
                            "text-2xl font-bold",
                            selectedRun.aggregate_scores && Object.keys(selectedRun.aggregate_scores).length > 0
                              ? getScoreColor(
                                  Object.values(selectedRun.aggregate_scores)
                                    .reduce((sum: number, score: any) => sum + score.averageScore, 0) / 
                                  Object.keys(selectedRun.aggregate_scores).length
                                )
                              : 'text-gray-400'
                          )}>
                            {selectedRun.aggregate_scores && Object.keys(selectedRun.aggregate_scores).length > 0
                              ? formatScore(
                                  Object.values(selectedRun.aggregate_scores)
                                    .reduce((sum: number, score: any) => sum + score.averageScore, 0) / 
                                  Object.keys(selectedRun.aggregate_scores).length
                                ) + '%'
                              : 'N/A'
                            }
                          </p>
                        </div>
                        <TrendingUp className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                    
                    <div className="bg-white p-4 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Execution Time</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {selectedRun.execution_time ? Math.round(selectedRun.execution_time / 1000) + 's' : 'N/A'}
                          </p>
                        </div>
                        <Clock className="w-8 h-8 text-purple-600" />
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Breakdown */}
                  {selectedRun.aggregate_scores && Object.keys(selectedRun.aggregate_scores).length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-900 mb-3">Evaluation Breakdown</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(selectedRun.aggregate_scores).map(([evalId, score]: [string, any]) => (
                          <div key={evalId} className="bg-white p-4 rounded-lg border">
                            <div className="flex items-center justify-between mb-2">
                              <h5 className="font-medium text-sm text-gray-900">{score.name}</h5>
                              <span className={cn(
                                "px-2 py-1 text-xs rounded-full",
                                getScoreBadgeColor(score.averageScore)
                              )}>
                                {formatScore(score.averageScore)}%
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <div>Pass Rate: {formatScore(score.passRate)}%</div>
                              <div>Type: {score.type}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Individual Results */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Individual Results</h4>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4" />
                        Export
                      </button>
                    </div>
                  </div>

                  {selectedRun.results.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">No results available</div>
                  ) : (
                    <div className="space-y-4">
                      {selectedRun.results.map((result) => (
                        <div key={result.id} className="border border-gray-200 rounded-lg">
                          <div 
                            onClick={() => toggleResultExpansion(result.id)}
                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {expandedResults.has(result.id) ? 
                                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                                  <ChevronRight className="w-4 h-4 text-gray-400" />
                                }
                                <div>
                                  <h5 className="font-medium text-gray-900">
                                    Item #{result.id.slice(-6)}
                                  </h5>
                                  <p className="text-sm text-gray-500">
                                    Score: {formatScore(result.overall_score)}% • 
                                    {result.passed ? ' Passed' : ' Failed'} • 
                                    {result.execution_time}ms
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2 py-1 text-xs rounded-full",
                                  result.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                )}>
                                  {result.passed ? 'Passed' : 'Failed'}
                                </span>
                                <span className={cn(
                                  "px-2 py-1 text-xs rounded-full",
                                  getScoreBadgeColor(result.overall_score)
                                )}>
                                  {formatScore(result.overall_score)}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {expandedResults.has(result.id) && (
                            <div className="border-t border-gray-200 bg-gray-50">
                              <div className="p-4 space-y-4">
                                {/* Input */}
                                <div>
                                  <h6 className="font-medium text-sm text-gray-900 mb-2">Input</h6>
                                  <div className="bg-white p-3 rounded border text-sm font-mono text-gray-700">
                                    {JSON.stringify(result.input_data, null, 2)}
                                  </div>
                                </div>

                                {/* Generated Output */}
                                <div>
                                  <h6 className="font-medium text-sm text-gray-900 mb-2">Generated Output</h6>
                                  <div className="bg-white p-3 rounded border text-sm text-gray-700">
                                    {result.generated_output}
                                  </div>
                                </div>

                                {/* Expected Output */}
                                {result.expected_output && (
                                  <div>
                                    <h6 className="font-medium text-sm text-gray-900 mb-2">Expected Output</h6>
                                    <div className="bg-white p-3 rounded border text-sm font-mono text-gray-700">
                                      {JSON.stringify(result.expected_output, null, 2)}
                                    </div>
                                  </div>
                                )}

                                {/* Evaluation Scores */}
                                <div>
                                  <h6 className="font-medium text-sm text-gray-900 mb-2">Evaluation Scores</h6>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(result.evaluation_scores).map(([evalId, score]: [string, any]) => (
                                      <div key={evalId} className="bg-white p-3 rounded border">
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-sm font-medium">{evalId}</span>
                                          <span className={cn(
                                            "px-2 py-1 text-xs rounded-full",
                                            getScoreBadgeColor(score.value)
                                          )}>
                                            {formatScore(score.value)}%
                                          </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {score.passed ? 'Passed' : 'Failed'} • 
                                          {score.details?.execution_time}ms
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                Select a run to view results
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}