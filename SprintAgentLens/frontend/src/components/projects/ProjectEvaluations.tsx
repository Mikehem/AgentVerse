'use client'

import { useState, useEffect } from 'react'
import { TestTube, BarChart3, Search, Plus, MoreHorizontal, Eye, CheckCircle, Code, FileText, TrendingUp, X, Play, Edit } from 'lucide-react'
import { Project } from '@/lib/types'

interface ProjectEvaluationsProps {
  project: Project
}

// Define missing modal components as placeholders
function EvaluationDetailModal({ isOpen, onClose, evaluation }: { isOpen: boolean; onClose: () => void; evaluation: any }) {
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-primary">{evaluation.name}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-muted">{evaluation.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted">Status:</span>
              <p className="font-medium">{evaluation.status || 'pending'}</p>
            </div>
            <div>
              <span className="text-sm text-muted">Results:</span>
              <p className="font-medium">{evaluation.result_count || 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProjectEvaluations({ project }: ProjectEvaluationsProps) {
  const [activeEvalTab, setActiveEvalTab] = useState('evaluations')
  const [evaluations, setEvaluations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null)
  const [showEvaluationDetailModal, setShowEvaluationDetailModal] = useState(false)

  useEffect(() => {
    fetchProjectEvaluations()
  }, [project.id])

  const fetchProjectEvaluations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/evaluations?projectId=${project.id}`)
      const result = await response.json()
      
      if (result.success) {
        setEvaluations(result.data)
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvaluations = evaluations.filter(evaluation => {
    // First filter by search term
    const matchesSearch = evaluation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    // Exclude heuristic evaluations from regular evaluations tab
    try {
      const config = typeof evaluation.configuration === 'string' 
        ? JSON.parse(evaluation.configuration) 
        : evaluation.configuration;
      
      const isHeuristic = config?.metrics && Array.isArray(config.metrics) && 
                         config.metrics.some((metric: string) => 
                           ['contains', 'equals', 'regex', 'is_json', 'levenshtein'].includes(metric)
                         );
      
      return !isHeuristic; // Only show non-heuristic evaluations in Evaluations tab
    } catch {
      return true; // If parsing fails, show in regular evaluations
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Evaluations</h2>
          <p className="text-muted mt-1">Manage evaluations and heuristic metrics for this project</p>
        </div>
      </div>

      {/* Evaluation Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveEvalTab('evaluations')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeEvalTab === 'evaluations'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <TestTube className="w-4 h-4" />
            Evaluations
          </div>
        </button>
        <button
          onClick={() => setActiveEvalTab('metrics')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeEvalTab === 'metrics'
              ? 'bg-white text-primary shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Heuristic Metrics
          </div>
        </button>
      </div>

      {/* Tab Content */}
      {activeEvalTab === 'evaluations' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search evaluations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
                <Plus className="w-4 h-4" />
                Create Evaluation
              </button>
            </div>
          </div>

          <div className="card">
            {loading ? (
              <div className="p-8 text-center text-muted">Loading evaluations...</div>
            ) : filteredEvaluations.length === 0 ? (
              <div className="p-8 text-center">
                <TestTube className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary mb-2">No evaluations found</h3>
                <p className="text-muted mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Create your first evaluation for this project.'}
                </p>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" />
                  Create Evaluation
                </button>
              </div>
            ) : (
              <div className="divide-y divide-light">
                {filteredEvaluations.map((evaluation) => (
                  <div 
                    key={evaluation.id} 
                    className="p-4 hover:bg-accent-alpha cursor-pointer"
                    onClick={() => {
                      setSelectedEvaluation(evaluation)
                      setShowEvaluationDetailModal(true)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <TestTube className="w-5 h-5 text-primary" />
                          <h4 className="font-medium text-primary">{evaluation.name}</h4>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(evaluation.status || 'pending')}`}>
                            {evaluation.status || 'pending'}
                          </div>
                        </div>
                        {evaluation.description && (
                          <p className="text-sm text-muted mb-2 line-clamp-2">{evaluation.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted">
                          <span>{evaluation.result_count || 0} results</span>
                          <span>{new Date(evaluation.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvaluation(evaluation)
                            setShowEvaluationDetailModal(true)
                          }}
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          title="View Results"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            console.log('More options for:', evaluation);
                          }}
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          title="More Options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeEvalTab === 'metrics' && <HeuristicMetricsSection project={project} />}
      
      {/* Evaluation Detail Modal */}
      {showEvaluationDetailModal && selectedEvaluation && (
        <EvaluationDetailModal
          isOpen={showEvaluationDetailModal}
          onClose={() => setShowEvaluationDetailModal(false)}
          evaluation={selectedEvaluation}
        />
      )}
    </div>
  )
}

// Heuristic Metrics Section Component
function HeuristicMetricsSection({ project }: { project: Project }) {
  const [metrics, setMetrics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<any>(null)
  const [showMetricModal, setShowMetricModal] = useState(false)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      // Fetch evaluations and filter for heuristic metrics
      const response = await fetch(`/api/v1/evaluations?projectId=${project.id}`)
      const result = await response.json()
      
      if (result.success) {
        // Filter evaluations that contain heuristic metrics
        const heuristicEvaluations = result.data.filter((evaluation: any) => {
          try {
            const config = typeof evaluation.configuration === 'string' 
              ? JSON.parse(evaluation.configuration) 
              : evaluation.configuration;
            
            return config?.metrics && Array.isArray(config.metrics) && 
                   config.metrics.some((metric: string) => 
                     ['contains', 'equals', 'regex', 'regexmatch', 'is_json', 'isjson', 'levenshtein', 'levenshteinratio', 'sentencebleu', 'corpusbleu', 'sentiment', 'rouge', 'aggregatedmetric'].includes(metric.toLowerCase())
                   );
          } catch {
            return false;
          }
        });
        setMetrics(heuristicEvaluations)
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMetrics = metrics.filter(metric =>
    metric.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    metric.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getMetricTypeIcon = (type: string) => {
    switch (type) {
      case 'contains': return <Search className="w-4 h-4" />
      case 'equals': return <CheckCircle className="w-4 h-4" />
      case 'regex': return <Code className="w-4 h-4" />
      case 'is_json': return <FileText className="w-4 h-4" />
      case 'levenshtein': return <TrendingUp className="w-4 h-4" />
      default: return <BarChart3 className="w-4 h-4" />
    }
  }

  const getMetricTypeName = (type: string) => {
    switch (type) {
      case 'contains': return 'Contains Text'
      case 'equals': return 'Exact Match'
      case 'regex': return 'Regex Pattern'
      case 'is_json': return 'Valid JSON'
      case 'levenshtein': return 'Text Similarity'
      default: return type
    }
  }

  const getMetricTypes = (evaluation: any) => {
    try {
      const config = typeof evaluation.configuration === 'string' 
        ? JSON.parse(evaluation.configuration) 
        : evaluation.configuration;
      
      return config?.metrics || [];
    } catch {
      return [];
    }
  }

  const handleMetricClick = (metric: any) => {
    setSelectedMetric(metric);
    setShowMetricModal(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Metric
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading metrics...</div>
        ) : filteredMetrics.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No heuristic metrics found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Create your first heuristic metric for evaluations.'}
            </p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Metric
            </button>
          </div>
        ) : (
          <div className="divide-y divide-light">
            {filteredMetrics.map((metric) => {
              const metricTypes = getMetricTypes(metric);
              const primaryType = metricTypes[0] || 'custom';
              
              return (
                <div 
                  key={metric.id} 
                  className="p-4 hover:bg-accent-alpha cursor-pointer"
                  onClick={() => handleMetricClick(metric)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getMetricTypeIcon(primaryType)}
                        <h4 className="font-medium text-primary">{metric.name}</h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Heuristic Evaluation
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {metricTypes.length} Metric{metricTypes.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {metric.description && (
                        <p className="text-sm text-muted mb-2 line-clamp-2">{metric.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted">
                        <span>Metrics: {metricTypes.map(getMetricTypeName).join(', ')}</span>
                        <span>Created: {new Date(metric.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMetricClick(metric);
                        }}
                        className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('More options for:', metric);
                        }}
                        className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                        title="More Options"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Metric Modal placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Heuristic Metric</h3>
            <p className="text-muted mb-4">Metric creation form would go here...</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-muted hover:text-primary border border-light rounded-md"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Details Modal */}
      {showMetricModal && selectedMetric && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-light">
              <div className="flex items-center gap-3">
                {getMetricTypeIcon(getMetricTypes(selectedMetric)[0] || 'custom')}
                <h2 className="text-xl font-semibold text-primary">{selectedMetric.name}</h2>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Heuristic Evaluation
                </span>
              </div>
              <button 
                onClick={() => setShowMetricModal(false)}
                className="p-2 text-muted hover:text-primary hover:bg-accent-alpha rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-primary mb-2">Basic Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted">Name:</span>
                        <span className="font-medium">{selectedMetric.name}</span>
                      </div>
                      {selectedMetric.description && (
                        <div className="flex justify-between">
                          <span className="text-muted">Description:</span>
                          <span className="font-medium">{selectedMetric.description}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted">Type:</span>
                        <span className="font-medium">{selectedMetric.type || 'Custom'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Created:</span>
                        <span className="font-medium">{new Date(selectedMetric.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Metric Types */}
                  <div>
                    <h3 className="font-medium text-primary mb-2">Heuristic Metrics</h3>
                    <div className="space-y-2">
                      {getMetricTypes(selectedMetric).map((metricType, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-accent/5 rounded-lg">
                          {getMetricTypeIcon(metricType)}
                          <span className="font-medium">{getMetricTypeName(metricType)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="font-medium text-primary mb-2">Configuration</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap overflow-auto">
                      {JSON.stringify(
                        typeof selectedMetric.configuration === 'string' 
                          ? JSON.parse(selectedMetric.configuration) 
                          : selectedMetric.configuration,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-light">
                <button
                  onClick={() => console.log('Run evaluation:', selectedMetric)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Run Evaluation
                </button>
                <button
                  onClick={() => console.log('Edit metric:', selectedMetric)}
                  className="flex items-center gap-2 px-4 py-2 border border-light rounded-md hover:bg-accent-alpha transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => setShowMetricModal(false)}
                  className="px-4 py-2 text-muted hover:text-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}