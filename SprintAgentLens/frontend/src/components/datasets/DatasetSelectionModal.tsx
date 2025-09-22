'use client'

import { useState, useEffect } from 'react'
import { 
  X,
  Database,
  Plus,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Dataset {
  id: string
  name: string
  description?: string
  project_id?: string
  project_name?: string
  item_count: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

interface ConversationData {
  id: string
  input: string
  output: string
  metadata?: Record<string, any>
  thread_id?: string
  agent_name?: string
  status?: string
  cost?: number
  token_usage?: number
  response_time?: number
  created_at: string
}

interface DatasetSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  projectName: string
  conversations: ConversationData[]
  onSuccess?: (datasetId: string, addedCount: number) => void
}

interface NewDatasetForm {
  name: string
  description: string
}

export function DatasetSelectionModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  conversations,
  onSuccess
}: DatasetSelectionModalProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('')
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newDatasetForm, setNewDatasetForm] = useState<NewDatasetForm>({
    name: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    if (isOpen) {
      fetchDatasets()
      setSelectedDatasetId('')
      setShowCreateNew(false)
      setError('')
      setSearchTerm('')
    }
  }, [isOpen, projectId])

  const fetchDatasets = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/datasets?projectId=${projectId}`)
      const result = await response.json()
      
      if (result.success) {
        setDatasets(result.data)
      } else {
        setError('Failed to load datasets')
      }
    } catch (error) {
      console.error('Error fetching datasets:', error)
      setError('Failed to load datasets')
    } finally {
      setLoading(false)
    }
  }

  const createNewDataset = async () => {
    try {
      const response = await fetch('/api/v1/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDatasetForm.name,
          description: newDatasetForm.description,
          project_id: projectId,
          metadata: {
            type: 'conversation',
            source: 'agent_lens'
          }
        })
      })
      
      const result = await response.json()
      if (result.success) {
        return result.data.id
      } else {
        throw new Error(result.error || 'Failed to create dataset')
      }
    } catch (error) {
      throw error
    }
  }

  const addConversationsToDataset = async (datasetId: string) => {
    try {
      const datasetItems = conversations.map(conv => ({
        input_data: {
          message: conv.input,
          conversation_id: conv.id,
          thread_id: conv.thread_id || undefined,
          agent_name: conv.agent_name || undefined
        },
        expected_output: {
          response: conv.output
        },
        metadata: {
          ...conv.metadata,
          status: conv.status,
          cost: conv.cost,
          token_usage: conv.token_usage,
          response_time: conv.response_time,
          created_at: conv.created_at,
          source: 'agent_lens_conversation'
        }
      }))

      const response = await fetch(`/api/v1/datasets/${datasetId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datasetItems)
      })

      const result = await response.json()
      if (result.success) {
        return result.count || datasetItems.length
      } else {
        throw new Error(result.error || 'Failed to add conversations to dataset')
      }
    } catch (error) {
      throw error
    }
  }

  const handleSubmit = async () => {
    if (!selectedDatasetId && !showCreateNew) {
      setError('Please select a dataset or create a new one')
      return
    }

    if (showCreateNew && (!newDatasetForm.name.trim())) {
      setError('Please enter a dataset name')
      return
    }

    try {
      setSubmitting(true)
      setError('')

      let targetDatasetId = selectedDatasetId

      if (showCreateNew) {
        targetDatasetId = await createNewDataset()
      }

      const addedCount = await addConversationsToDataset(targetDatasetId)
      
      onSuccess?.(targetDatasetId, addedCount)
      onClose()
    } catch (error) {
      console.error('Error adding conversations to dataset:', error)
      setError(error instanceof Error ? error.message : 'Failed to add conversations to dataset')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredDatasets = datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Add to Dataset
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Adding {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} to a dataset
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Dataset Selection Tabs */}
            <div className="mb-4">
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setShowCreateNew(false)}
                  className={cn(
                    "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
                    !showCreateNew 
                      ? "bg-white text-primary shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Existing Dataset
                </button>
                <button
                  onClick={() => setShowCreateNew(true)}
                  className={cn(
                    "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
                    showCreateNew 
                      ? "bg-white text-primary shadow-sm" 
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  Create New
                </button>
              </div>
            </div>

            {showCreateNew ? (
              /* Create New Dataset Form */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dataset Name *
                  </label>
                  <input
                    type="text"
                    value={newDatasetForm.name}
                    onChange={(e) => setNewDatasetForm({ ...newDatasetForm, name: e.target.value })}
                    placeholder="Enter dataset name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newDatasetForm.description}
                    onChange={(e) => setNewDatasetForm({ ...newDatasetForm, description: e.target.value })}
                    placeholder="Enter dataset description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  Dataset will be created in project: <strong>{projectName}</strong>
                </div>
              </div>
            ) : (
              /* Existing Dataset Selection */
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search datasets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>

                {/* Dataset List */}
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  {loading ? (
                    <div className="p-4 text-center text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-2" />
                      Loading datasets...
                    </div>
                  ) : filteredDatasets.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <Database className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      {searchTerm ? 'No datasets match your search' : 'No datasets found'}
                      <p className="text-xs mt-1">Create a new dataset above</p>
                    </div>
                  ) : (
                    filteredDatasets.map((dataset) => (
                      <button
                        key={dataset.id}
                        onClick={() => setSelectedDatasetId(dataset.id)}
                        className={cn(
                          "w-full p-3 text-left border-b border-gray-100 hover:bg-gray-50 transition-colors",
                          selectedDatasetId === dataset.id && "bg-primary/5 border-primary/20"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex items-center gap-2">
                              <Database className="w-4 h-4 text-primary" />
                              {selectedDatasetId === dataset.id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {dataset.name}
                              </div>
                              {dataset.description && (
                                <div className="text-xs text-gray-500 truncate">
                                  {dataset.description}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                                <span>{dataset.item_count.toLocaleString()} items</span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(dataset.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={handleSubmit}
              disabled={submitting || (!selectedDatasetId && !showCreateNew)}
              className="w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {showCreateNew ? 'Create & Add' : 'Add to Dataset'}
            </button>
            <button
              onClick={onClose}
              disabled={submitting}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}