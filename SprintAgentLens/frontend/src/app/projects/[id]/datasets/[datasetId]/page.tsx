'use client'

import { useState, useEffect, use } from 'react'
import { 
  Database, 
  ArrowLeft,
  ChevronRight,
  Plus,
  Search,
  Edit,
  Trash2,
  Download,
  Upload,
  Filter,
  MoreHorizontal,
  Eye,
  FileText,
  Save,
  X,
  Play,
  Settings
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { AddItemsModal } from '@/components/datasets/AddItemsModal'
import { convertToCSV, convertToSimpleCSV, downloadCSV, generateExportFilename } from '@/lib/utils/csvExport'

interface DatasetItem {
  id: string
  dataset_id: string
  input_data: Record<string, any>
  expected_output?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

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

interface Project {
  id: string
  name: string
  description?: string
}

export default function DatasetDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string; datasetId: string }> 
}) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { id: projectId, datasetId } = resolvedParams
  
  const [project, setProject] = useState<Project | null>(null)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [items, setItems] = useState<DatasetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [viewingItem, setViewingItem] = useState<DatasetItem | null>(null)
  const [editingItem, setEditingItem] = useState<DatasetItem | null>(null)
  const [editItemForm, setEditItemForm] = useState<{
    input_data: Record<string, any>
    expected_output?: Record<string, any>
    metadata?: Record<string, any>
  }>({ input_data: {} })
  const [showEvaluationModal, setShowEvaluationModal] = useState(false)
  const [isRunningEvaluation, setIsRunningEvaluation] = useState(false)
  const [showAddItemsModal, setShowAddItemsModal] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const itemsPerPage = 20

  useEffect(() => {
    fetchProject()
    fetchDataset()
    fetchDatasetItems()
  }, [projectId, datasetId, currentPage])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}`)
      const result = await response.json()
      if (result.success) {
        setProject(result.data)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const fetchDataset = async () => {
    try {
      const response = await fetch(`/api/v1/datasets/${datasetId}`)
      const result = await response.json()
      if (result.success) {
        setDataset(result.data)
        setEditForm({
          name: result.data.name,
          description: result.data.description || ''
        })
      }
    } catch (error) {
      console.error('Error fetching dataset:', error)
    }
  }

  const fetchDatasetItems = async () => {
    try {
      setLoading(true)
      const offset = (currentPage - 1) * itemsPerPage
      const response = await fetch(
        `/api/v1/datasets/${datasetId}/items?limit=${itemsPerPage}&offset=${offset}`
      )
      const result = await response.json()
      if (result.success) {
        setItems(result.data)
        setTotalItems(result.pagination?.total || result.data.length)
      }
    } catch (error) {
      console.error('Error fetching dataset items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveDataset = async () => {
    try {
      const response = await fetch(`/api/v1/datasets/${datasetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      const result = await response.json()
      if (result.success) {
        setDataset(result.data)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Error updating dataset:', error)
    }
  }

  const handleDeleteItems = async () => {
    if (selectedItems.size === 0) return
    
    try {
      const itemIds = Array.from(selectedItems)
      const params = itemIds.map(id => `itemId=${id}`).join('&')
      const response = await fetch(
        `/api/v1/datasets/${datasetId}/items?${params}`,
        { method: 'DELETE' }
      )
      const result = await response.json()
      if (result.success) {
        setSelectedItems(new Set())
        fetchDatasetItems()
        fetchDataset() // Refresh item count
      }
    } catch (error) {
      console.error('Error deleting items:', error)
    }
  }

  const handleViewItem = (item: DatasetItem) => {
    setViewingItem(item)
  }

  const handleEditItem = (item: DatasetItem) => {
    setEditingItem(item)
    setEditItemForm({
      input_data: item.input_data,
      expected_output: item.expected_output || {},
      metadata: item.metadata || {}
    })
  }

  const handleAddItemsSuccess = async (addedItems: any[]) => {
    console.log(`Successfully added ${addedItems.length} items to dataset`)
    
    // Refresh the dataset and items list
    await Promise.all([
      fetchDataset(),
      fetchDatasetItems()
    ])
    
    // Close the modal
    setShowAddItemsModal(false)
  }

  const handleSaveItemEdit = async () => {
    if (!editingItem) return
    
    try {
      // For now, we'll implement this as deleting the old item and creating a new one
      // since the API doesn't have PUT for individual items
      const response = await fetch(`/api/v1/datasets/${datasetId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItemForm)
      })
      
      if (response.ok) {
        // Delete the old item
        await fetch(
          `/api/v1/datasets/${datasetId}/items?itemId=${editingItem.id}`,
          { method: 'DELETE' }
        )
        
        setEditingItem(null)
        fetchDatasetItems()
        fetchDataset()
      }
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDeleteSingleItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    
    try {
      const response = await fetch(
        `/api/v1/datasets/${datasetId}/items?itemId=${itemId}`,
        { method: 'DELETE' }
      )
      const result = await response.json()
      if (result.success) {
        fetchDatasetItems()
        fetchDataset() // Refresh item count
      }
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const handleExportDataset = async () => {
    setIsExporting(true)
    
    try {
      // Fetch all dataset items for export
      const response = await fetch(`/api/v1/datasets/${datasetId}/items?limit=10000`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error('Failed to fetch dataset items for export')
      }
      
      const allItems = result.data
      
      if (allItems.length === 0) {
        alert('No items to export')
        return
      }
      
      // Convert to CSV
      const csvContent = convertToSimpleCSV(allItems)
      const filename = generateExportFilename(dataset?.name || 'dataset', 'csv')
      
      // Download the file
      downloadCSV(csvContent, filename)
      
      console.log(`Exported ${allItems.length} items to ${filename}`)
    } catch (error) {
      console.error('Error exporting dataset:', error)
      alert('Failed to export dataset. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const filteredItems = items.filter(item =>
    JSON.stringify(item.input_data).toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(item.expected_output || {}).toLowerCase().includes(searchTerm.toLowerCase()) ||
    JSON.stringify(item.metadata || {}).toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatJson = (obj: any) => {
    if (!obj) return 'N/A'
    return JSON.stringify(obj, null, 2)
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage)

  if (!project || !dataset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <button 
                onClick={() => router.push('/projects')}
                className="hover:text-primary"
              >
                Sprint Agent Lens
              </button>
              <ChevronRight className="w-4 h-4" />
              <button 
                onClick={() => router.push(`/projects/${projectId}`)}
                className="hover:text-primary"
              >
                {project.name}
              </button>
              <ChevronRight className="w-4 h-4" />
              <button 
                onClick={() => router.push(`/projects/${projectId}/datasets`)}
                className="hover:text-primary"
              >
                Datasets
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">{dataset.name}</span>
            </nav>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push(`/projects/${projectId}/datasets`)}
                className="p-1 text-gray-400 hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Database className="w-6 h-6 text-primary" />
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-2xl font-bold text-primary bg-transparent border-b border-primary focus:outline-none"
                    />
                    <button
                      onClick={handleSaveDataset}
                      className="p-1 text-green-600 hover:text-green-700"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditForm({
                          name: dataset.name,
                          description: dataset.description || ''
                        })
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-primary">{dataset.name}</h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-gray-400 hover:text-primary"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            {isEditing ? (
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Dataset description..."
                className="mt-2 w-full text-gray-600 bg-transparent border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-primary resize-none"
                rows={2}
              />
            ) : (
              dataset.description && (
                <p className="text-gray-600 mt-1">{dataset.description}</p>
              )
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right text-sm">
              <div className="text-gray-500">Total Items</div>
              <div className="text-xl font-semibold text-primary">
                {dataset.item_count.toLocaleString()}
              </div>
            </div>
            <button 
              onClick={() => setShowEvaluationModal(true)}
              disabled={isRunningEvaluation}
              className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunningEvaluation ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Evaluations
                </>
              )}
            </button>
            <button 
              onClick={handleExportDataset}
              disabled={isExporting || dataset.item_count === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export CSV
                </>
              )}
            </button>
            <button 
              onClick={() => setShowAddItemsModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Items
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Controls */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Dataset Items</h3>
              <div className="flex items-center gap-2">
                {selectedItems.size > 0 && (
                  <button
                    onClick={handleDeleteItems}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete ({selectedItems.size})
                  </button>
                )}
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded transition-colors">
                  <Filter className="w-4 h-4" />
                  Filter
                </button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search dataset items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Dataset Items */}
        <div className="bg-white rounded-lg border border-gray-200">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading dataset items...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 
                  'Try adjusting your search terms.' :
                  'This dataset doesn\'t have any items yet.'
                }
              </p>
              <button 
                onClick={() => setShowAddItemsModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Items
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-12 py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(new Set(filteredItems.map(item => item.id)))
                            } else {
                              setSelectedItems(new Set())
                            }
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Input Data</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Expected Output</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Metadata</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(item.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedItems)
                              if (e.target.checked) {
                                newSelected.add(item.id)
                              } else {
                                newSelected.delete(item.id)
                              }
                              setSelectedItems(newSelected)
                            }}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-md">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border max-h-24 overflow-y-auto">
                              {formatJson(item.input_data)}
                            </pre>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-md">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border max-h-24 overflow-y-auto">
                              {formatJson(item.expected_output)}
                            </pre>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-md">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words bg-gray-50 p-2 rounded border max-h-24 overflow-y-auto">
                              {formatJson(item.metadata)}
                            </pre>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(item.created_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button 
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded"
                              onClick={() => handleViewItem(item)}
                              title="View item details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded"
                              onClick={() => handleEditItem(item)}
                              title="Edit item"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              onClick={() => handleDeleteSingleItem(item.id)}
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} items
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* View Item Modal */}
      {viewingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Dataset Item Details</h2>
                <button
                  onClick={() => setViewingItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Input Data</label>
                  <pre className="bg-gray-50 p-4 rounded border text-sm overflow-auto max-h-64">
                    {formatJson(viewingItem.input_data)}
                  </pre>
                </div>
                
                {viewingItem.expected_output && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Output</label>
                    <pre className="bg-gray-50 p-4 rounded border text-sm overflow-auto max-h-64">
                      {formatJson(viewingItem.expected_output)}
                    </pre>
                  </div>
                )}
                
                {viewingItem.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Metadata</label>
                    <pre className="bg-gray-50 p-4 rounded border text-sm overflow-auto max-h-64">
                      {formatJson(viewingItem.metadata)}
                    </pre>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span> {formatDate(viewingItem.created_at)}
                  </div>
                  <div>
                    <span className="font-medium">Updated:</span> {formatDate(viewingItem.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Edit Dataset Item</h2>
                <button
                  onClick={() => setEditingItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Input Data (JSON)</label>
                  <textarea
                    value={JSON.stringify(editItemForm.input_data, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        setEditItemForm({ ...editItemForm, input_data: parsed })
                      } catch (error) {
                        // Keep the raw value for editing
                      }
                    }}
                    className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="Enter JSON data..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Output (JSON)</label>
                  <textarea
                    value={JSON.stringify(editItemForm.expected_output || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        setEditItemForm({ ...editItemForm, expected_output: parsed })
                      } catch (error) {
                        // Keep the raw value for editing
                      }
                    }}
                    className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="Enter JSON data..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Metadata (JSON)</label>
                  <textarea
                    value={JSON.stringify(editItemForm.metadata || {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        setEditItemForm({ ...editItemForm, metadata: parsed })
                      } catch (error) {
                        // Keep the raw value for editing
                      }
                    }}
                    className="w-full h-24 p-3 border border-gray-300 rounded-md font-mono text-sm"
                    placeholder="Enter JSON data..."
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <button
                    onClick={() => setEditingItem(null)}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveItemEdit}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && dataset && (
        <AddItemsModal
          isOpen={showAddItemsModal}
          onClose={() => setShowAddItemsModal(false)}
          onSuccess={handleAddItemsSuccess}
          datasetId={datasetId}
          datasetName={dataset.name}
        />
      )}

      {/* Run Evaluations Modal */}
      {showEvaluationModal && (
        <EvaluationConfigModal
          isOpen={showEvaluationModal}
          onClose={() => setShowEvaluationModal(false)}
          dataset={dataset}
          projectId={projectId}
          onRunEvaluation={async (config) => {
            console.log('Running evaluation with config:', config)
            setShowEvaluationModal(false)
            setIsRunningEvaluation(true)
            
            try {
              // First, fetch dataset items
              const itemsResponse = await fetch(`/api/v1/datasets/${dataset.id}/items`)
              const itemsResult = await itemsResponse.json()
              
              if (!itemsResult.success) {
                throw new Error('Failed to fetch dataset items')
              }
              
              const items = itemsResult.data
              console.log(`Fetched ${items.length} dataset items for evaluation`)
              
              // Create evaluation record
              const evaluationData = {
                name: config.name,
                project_id: config.projectId,
                dataset_id: config.datasetId,
                configuration: JSON.stringify({
                  metrics: config.metrics,
                  metricConfigs: config.metricConfigs,
                  type: 'dataset_evaluation'
                }),
                status: 'running',
                metadata: {
                  dataset_name: dataset.name,
                  item_count: items.length,
                  started_at: new Date().toISOString()
                }
              }
              
              const createResponse = await fetch('/api/v1/evaluations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(evaluationData)
              })
              
              if (!createResponse.ok) {
                throw new Error('Failed to create evaluation')
              }
              
              const evaluationResult = await createResponse.json()
              console.log('Created evaluation:', evaluationResult.data)
              
              // Execute actual metrics against dataset items
              const { evaluationEngine } = await import('@/lib/evaluation/execution-engine')
              const executionResult = await evaluationEngine.executeEvaluation(config, items)
              
              console.log('Evaluation execution completed:', executionResult.summary)
              
              // Update evaluation status to completed with results
              await fetch(`/api/v1/evaluations`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: evaluationResult.data.id,
                  status: 'completed',
                  results: {
                    metrics_executed: config.metrics.length,
                    items_evaluated: executionResult.processedItems,
                    average_score: executionResult.summary.averageScore,
                    pass_rate: executionResult.summary.passRate,
                    execution_time_ms: executionResult.executionTime,
                    metric_summaries: executionResult.summary.metricSummaries,
                    completed_at: new Date().toISOString()
                  }
                })
              })
              
              alert(`Evaluation "${config.name}" completed successfully!\n\nResults:\n- Items evaluated: ${executionResult.processedItems}\n- Average score: ${(executionResult.summary.averageScore * 100).toFixed(1)}%\n- Pass rate: ${(executionResult.summary.passRate * 100).toFixed(1)}%\n- Execution time: ${executionResult.executionTime.toFixed(0)}ms`)
              
            } catch (error) {
              console.error('Error running evaluation:', error)
              alert(`Failed to run evaluation: ${error.message}`)
            } finally {
              setIsRunningEvaluation(false)
            }
          }}
        />
      )}
    </div>
  )
}

// Evaluation Configuration Modal Component
interface EvaluationConfigModalProps {
  isOpen: boolean
  onClose: () => void
  dataset: Dataset
  projectId: string
  onRunEvaluation: (config: any) => void
}

function EvaluationConfigModal({ isOpen, onClose, dataset, projectId, onRunEvaluation }: EvaluationConfigModalProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([])
  const [evaluationName, setEvaluationName] = useState(`Evaluation for ${dataset.name}`)
  const [metricConfigs, setMetricConfigs] = useState<Record<string, any>>({})

  const availableMetrics = [
    {
      id: 'contains',
      name: 'Contains Text',
      description: 'Check if output contains specific text',
      configFields: [
        { name: 'expectedText', type: 'array', label: 'Expected Text (comma-separated)', required: true },
        { name: 'caseSensitive', type: 'boolean', label: 'Case Sensitive', default: false },
        { name: 'matchType', type: 'select', label: 'Match Type', options: ['any', 'all'], default: 'any' }
      ]
    },
    {
      id: 'equals',
      name: 'Exact Match',
      description: 'Check if output exactly matches expected text',
      configFields: [
        { name: 'caseSensitive', type: 'boolean', label: 'Case Sensitive', default: false },
        { name: 'trimWhitespace', type: 'boolean', label: 'Trim Whitespace', default: true },
        { name: 'normalizeWhitespace', type: 'boolean', label: 'Normalize Whitespace', default: false }
      ]
    },
    {
      id: 'regexmatch',
      name: 'Regex Match',
      description: 'Check if output matches a regex pattern',
      configFields: [
        { name: 'pattern', type: 'text', label: 'Regex Pattern', required: true },
        { name: 'flags', type: 'text', label: 'Regex Flags', default: 'i' },
        { name: 'minMatches', type: 'number', label: 'Minimum Matches', default: 1 }
      ]
    },
    {
      id: 'isjson',
      name: 'Valid JSON',
      description: 'Check if output is valid JSON',
      configFields: [
        { name: 'strict', type: 'boolean', label: 'Strict Mode (object only)', default: true },
        { name: 'allowEmpty', type: 'boolean', label: 'Allow Empty', default: false },
        { name: 'minKeys', type: 'number', label: 'Minimum Keys', default: 0 }
      ]
    },
    {
      id: 'levenshteinratio',
      name: 'Text Similarity',
      description: 'Measure text similarity using Levenshtein distance',
      configFields: [
        { name: 'threshold', type: 'number', label: 'Similarity Threshold (0-1)', default: 0.8, min: 0, max: 1, step: 0.1 },
        { name: 'caseSensitive', type: 'boolean', label: 'Case Sensitive', default: false },
        { name: 'trimWhitespace', type: 'boolean', label: 'Trim Whitespace', default: true }
      ]
    }
  ]

  const handleMetricToggle = (metricId: string) => {
    setSelectedMetrics(prev => {
      const newSelected = prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
      
      // Initialize config for newly selected metrics
      if (!prev.includes(metricId) && newSelected.includes(metricId)) {
        const metric = availableMetrics.find(m => m.id === metricId)
        if (metric) {
          const defaultConfig: any = {}
          metric.configFields.forEach(field => {
            if (field.default !== undefined) {
              defaultConfig[field.name] = field.default
            }
          })
          setMetricConfigs(prevConfigs => ({
            ...prevConfigs,
            [metricId]: defaultConfig
          }))
        }
      }
      
      return newSelected
    })
  }

  const handleConfigChange = (metricId: string, fieldName: string, value: any) => {
    setMetricConfigs(prev => ({
      ...prev,
      [metricId]: {
        ...prev[metricId],
        [fieldName]: value
      }
    }))
  }

  const handleRunEvaluation = () => {
    const config = {
      name: evaluationName,
      projectId,
      datasetId: dataset.id,
      metrics: selectedMetrics,
      metricConfigs,
      timestamp: new Date().toISOString()
    }
    onRunEvaluation(config)
  }

  const renderConfigField = (metricId: string, field: any) => {
    const value = metricConfigs[metricId]?.[field.name] ?? field.default ?? ''
    
    switch (field.type) {
      case 'boolean':
        return (
          <label key={field.name} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleConfigChange(metricId, field.name, e.target.checked)}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm">{field.label}</span>
          </label>
        )
      
      case 'number':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
            <input
              type="number"
              value={value}
              min={field.min}
              max={field.max}
              step={field.step || 1}
              onChange={(e) => handleConfigChange(metricId, field.name, parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )
      
      case 'select':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
            <select
              value={value}
              onChange={(e) => handleConfigChange(metricId, field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {field.options.map((option: string) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        )
      
      case 'array':
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
            <input
              type="text"
              value={Array.isArray(value) ? value.join(', ') : value}
              onChange={(e) => handleConfigChange(metricId, field.name, e.target.value.split(',').map(s => s.trim()))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter values separated by commas"
            />
          </div>
        )
      
      default:
        return (
          <div key={field.name} className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
            <input
              type="text"
              value={value}
              onChange={(e) => handleConfigChange(metricId, field.name, e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Configure Evaluation</h2>
              <p className="text-sm text-gray-600 mt-1">
                Run heuristic evaluations against dataset: <strong>{dataset.name}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Evaluation Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Evaluation Name</label>
              <input
                type="text"
                value={evaluationName}
                onChange={(e) => setEvaluationName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Enter evaluation name"
              />
            </div>

            {/* Metric Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Select Heuristic Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableMetrics.map((metric) => (
                  <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric.id)}
                        onChange={() => handleMetricToggle(metric.id)}
                        className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{metric.name}</h4>
                        <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                        
                        {/* Metric Configuration */}
                        {selectedMetrics.includes(metric.id) && (
                          <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                            <h5 className="text-sm font-medium text-gray-700">Configuration</h5>
                            {metric.configFields.map(field => renderConfigField(metric.id, field))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dataset Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Dataset Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span> {dataset.name}
                </div>
                <div>
                  <span className="text-gray-500">Items:</span> {dataset.item_count.toLocaleString()}
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">Description:</span> {dataset.description || 'No description'}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRunEvaluation}
                disabled={selectedMetrics.length === 0}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Run Evaluation ({selectedMetrics.length} metrics)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}