'use client'

import { useState, useEffect } from 'react'
import { 
  X, 
  Database, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Play,
  Settings,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Dataset {
  id: string
  name: string
  description?: string
  item_count: number
  project_name?: string
}

interface PromptVersion {
  id: string
  prompt_id: string
  version: string
  template: string
  variables: any
  is_active: boolean
  status: string
}

interface Prompt {
  id: string
  name: string
  description?: string
  project_id: string
  activeVersion?: PromptVersion
  versions?: PromptVersion[]
}

interface Evaluation {
  id: string
  name: string
  type: string
  description?: string
  config?: any
}

interface ExperimentCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  projectId?: string
}

export default function ExperimentCreateModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  projectId 
}: ExperimentCreateModalProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    datasetId: '',
    promptVersionId: '',
    evaluationIds: [] as string[],
    projectId: projectId || ''
  })

  const [expandedSections, setExpandedSections] = useState({
    dataset: true,
    prompt: true,
    evaluations: true
  })

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, projectId])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch datasets
      const datasetsResponse = await fetch(`/api/v1/datasets${projectId ? `?projectId=${projectId}` : ''}`)
      const datasetsResult = await datasetsResponse.json()
      if (datasetsResult.success) {
        setDatasets(datasetsResult.data)
      }

      // Fetch prompts with active versions
      const promptsResponse = await fetch(`/api/v1/prompts${projectId ? `?projectId=${projectId}` : ''}&includeActiveVersion=true`)
      const promptsResult = await promptsResponse.json()
      if (promptsResult.success) {
        setPrompts(promptsResult.prompts)
      }

      // Fetch evaluations
      const evaluationsResponse = await fetch(`/api/v1/evaluations${projectId ? `?projectId=${projectId}` : ''}`)
      const evaluationsResult = await evaluationsResponse.json()
      if (evaluationsResult.success) {
        setEvaluations(evaluationsResult.data)
      }

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.datasetId || !formData.promptVersionId || formData.evaluationIds.length === 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/v1/experiments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          project_id: formData.projectId,
          dataset_id: formData.datasetId,
          configuration: {
            prompt_version_id: formData.promptVersionId,
            evaluation_ids: formData.evaluationIds
          }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        onSuccess()
        onClose()
        resetForm()
      } else {
        alert('Failed to create experiment: ' + result.error)
      }

    } catch (error) {
      console.error('Error creating experiment:', error)
      alert('Failed to create experiment')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      datasetId: '',
      promptVersionId: '',
      evaluationIds: [],
      projectId: projectId || ''
    })
    setStep(1)
  }

  const handleEvaluationToggle = (evaluationId: string) => {
    setFormData(prev => ({
      ...prev,
      evaluationIds: prev.evaluationIds.includes(evaluationId)
        ? prev.evaluationIds.filter(id => id !== evaluationId)
        : [...prev.evaluationIds, evaluationId]
    }))
  }

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const selectedDataset = datasets.find(d => d.id === formData.datasetId)
  const selectedPrompt = prompts.find(p => p.activeVersion?.id === formData.promptVersionId)
  const selectedEvaluations = evaluations.filter(e => formData.evaluationIds.includes(e.id))

  const canProceed = formData.name && formData.datasetId && formData.promptVersionId && formData.evaluationIds.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-primary">Create New Experiment</h2>
            <p className="text-sm text-gray-600 mt-1">
              Configure an experiment to test prompts against datasets using evaluations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Info */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-primary mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Experiment Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter experiment name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Describe what this experiment tests"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Dataset Selection */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => toggleSection('dataset')}
              className="flex items-center gap-2 text-lg font-medium text-primary mb-4 hover:text-primary-dark transition-colors"
            >
              {expandedSections.dataset ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <Database className="w-5 h-5" />
              Dataset Selection *
              {selectedDataset && (
                <span className="text-sm text-green-600 font-normal">
                  ({selectedDataset.name} - {selectedDataset.item_count} items)
                </span>
              )}
            </button>
            
            {expandedSections.dataset && (
              <div className="ml-7">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading datasets...</div>
                ) : datasets.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No datasets found. Please create a dataset first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {datasets.map((dataset) => (
                      <div
                        key={dataset.id}
                        onClick={() => setFormData(prev => ({ ...prev, datasetId: dataset.id }))}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          formData.datasetId === dataset.id
                            ? "border-primary bg-primary-50 ring-2 ring-primary"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{dataset.name}</h4>
                            {dataset.description && (
                              <p className="text-sm text-gray-600 mt-1">{dataset.description}</p>
                            )}
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>{dataset.item_count} items</span>
                              {dataset.project_name && <span>Project: {dataset.project_name}</span>}
                            </div>
                          </div>
                          {formData.datasetId === dataset.id && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prompt Selection */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => toggleSection('prompt')}
              className="flex items-center gap-2 text-lg font-medium text-primary mb-4 hover:text-primary-dark transition-colors"
            >
              {expandedSections.prompt ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <FileText className="w-5 h-5" />
              Prompt Selection *
              {selectedPrompt && (
                <span className="text-sm text-green-600 font-normal">
                  ({selectedPrompt.name} v{selectedPrompt.activeVersion?.version})
                </span>
              )}
            </button>
            
            {expandedSections.prompt && (
              <div className="ml-7">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading prompts...</div>
                ) : prompts.filter(p => p.activeVersion).length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No active prompt versions found. Please create and activate a prompt version first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {prompts.filter(p => p.activeVersion).map((prompt) => (
                      <div
                        key={prompt.activeVersion!.id}
                        onClick={() => setFormData(prev => ({ ...prev, promptVersionId: prompt.activeVersion!.id }))}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          formData.promptVersionId === prompt.activeVersion!.id
                            ? "border-primary bg-primary-50 ring-2 ring-primary"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{prompt.name}</h4>
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                v{prompt.activeVersion!.version}
                              </span>
                            </div>
                            {prompt.description && (
                              <p className="text-sm text-gray-600 mt-1">{prompt.description}</p>
                            )}
                            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded font-mono">
                              {prompt.activeVersion!.template.substring(0, 100)}
                              {prompt.activeVersion!.template.length > 100 && '...'}
                            </div>
                          </div>
                          {formData.promptVersionId === prompt.activeVersion!.id && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Evaluation Selection */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => toggleSection('evaluations')}
              className="flex items-center gap-2 text-lg font-medium text-primary mb-4 hover:text-primary-dark transition-colors"
            >
              {expandedSections.evaluations ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <CheckCircle className="w-5 h-5" />
              Evaluation Selection *
              {selectedEvaluations.length > 0 && (
                <span className="text-sm text-green-600 font-normal">
                  ({selectedEvaluations.length} selected)
                </span>
              )}
            </button>
            
            {expandedSections.evaluations && (
              <div className="ml-7">
                {loading ? (
                  <div className="text-center py-4 text-gray-500">Loading evaluations...</div>
                ) : evaluations.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No evaluations found. Please create evaluations first.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {evaluations.map((evaluation) => (
                      <div
                        key={evaluation.id}
                        onClick={() => handleEvaluationToggle(evaluation.id)}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all",
                          formData.evaluationIds.includes(evaluation.id)
                            ? "border-primary bg-primary-50 ring-2 ring-primary"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">{evaluation.name}</h4>
                              <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                {evaluation.type}
                              </span>
                            </div>
                            {evaluation.description && (
                              <p className="text-sm text-gray-600 mt-1">{evaluation.description}</p>
                            )}
                          </div>
                          {formData.evaluationIds.includes(evaluation.id) && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary */}
          {canProceed && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="text-sm font-medium text-green-800 mb-2">Experiment Summary</h3>
              <div className="text-sm text-green-700 space-y-1">
                <div>• Dataset: {selectedDataset?.name} ({selectedDataset?.item_count} items)</div>
                <div>• Prompt: {selectedPrompt?.name} (v{selectedPrompt?.activeVersion?.version})</div>
                <div>• Evaluations: {selectedEvaluations.map(e => e.name).join(', ')}</div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canProceed || loading}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Create Experiment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}