'use client'

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { FeedbackDefinitionForm } from './FeedbackDefinitionForm'
import { Plus, Edit2, Trash2, Settings } from 'lucide-react'

interface FeedbackDefinition {
  id: string
  name: string
  description?: string
  type: 'numerical' | 'categorical'
  details: any
  createdBy: string
  createdAt: string
  lastUpdatedAt: string
}

interface FeedbackDefinitionFormData {
  name: string
  description?: string
  type: 'numerical' | 'categorical'
  details: any
}

export function FeedbackDefinitionsManager() {
  const [definitions, setDefinitions] = useState<FeedbackDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDefinition, setEditingDefinition] = useState<FeedbackDefinition | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadDefinitions()
  }, [])

  const loadDefinitions = async () => {
    console.log('🔄 Loading feedback definitions...')
    setLoading(true)
    try {
      const response = await fetch('/api/v1/feedback-definitions')
      const data = await response.json()
      console.log('📡 Feedback definitions API response:', data)
      if (data.success && data.data) {
        const definitionsData = Array.isArray(data.data) ? data.data : []
        console.log(`✅ Loaded ${definitionsData.length} feedback definitions`)
        setDefinitions(definitionsData)
      } else {
        console.error('❌ Failed to load feedback definitions:', data.error)
        setDefinitions([])
      }
    } catch (error) {
      console.error('💥 Exception loading feedback definitions:', error)
      setDefinitions([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingDefinition(null)
    setIsModalOpen(true)
  }

  const handleEdit = (definition: FeedbackDefinition) => {
    setEditingDefinition(definition)
    setIsModalOpen(true)
  }

  const handleDelete = async (definition: FeedbackDefinition) => {
    if (!confirm(`Are you sure you want to delete "${definition.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/v1/feedback-definitions?id=${definition.id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        console.log('✅ Feedback definition deleted successfully, reloading data...')
        await loadDefinitions()
        alert('Feedback definition deleted successfully!')
      } else {
        console.error('Failed to delete feedback definition:', data.error)
        alert('Failed to delete feedback definition. Please try again.')
      }
    } catch (error) {
      console.error('Failed to delete feedback definition:', error)
      alert('Failed to delete feedback definition. Please try again.')
    }
  }

  const handleSubmit = async (data: FeedbackDefinitionFormData) => {
    setIsSubmitting(true)
    try {
      if (editingDefinition) {
        // Update existing definition
        const response = await fetch('/api/v1/feedback-definitions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingDefinition.id, ...data })
        })
        const result = await response.json()
        if (result.success) {
          console.log('✅ Feedback definition updated successfully, reloading data...')
          await loadDefinitions()
          alert('Feedback definition updated successfully!')
        } else {
          console.error('Failed to update feedback definition:', result.error)
          alert(`Failed to update feedback definition: ${result.error}`)
          return
        }
      } else {
        // Create new definition
        const response = await fetch('/api/v1/feedback-definitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        const result = await response.json()
        if (result.success) {
          console.log('✅ Feedback definition created successfully, reloading data...')
          await loadDefinitions()
          alert('Feedback definition created successfully!')
        } else {
          console.error('Failed to create feedback definition:', result.error)
          alert(`Failed to create feedback definition: ${result.error}`)
          return
        }
      }
      
      setIsModalOpen(false)
      setEditingDefinition(null)
    } catch (error) {
      console.error('Failed to save feedback definition:', error)
      alert('Failed to save feedback definition. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderDetails = (definition: FeedbackDefinition) => {
    if (definition.type === 'numerical') {
      return (
        <span className="text-sm text-muted">
          Range: {definition.details.min} - {definition.details.max}
        </span>
      )
    } else if (definition.type === 'categorical') {
      const categories = Object.keys(definition.details.categories)
      return (
        <span className="text-sm text-muted">
          Categories: {categories.slice(0, 3).join(', ')}{categories.length > 3 ? '...' : ''}
        </span>
      )
    }
    return null
  }

  const columns: Column<FeedbackDefinition>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, item) => (
        <div>
          <div className="font-medium text-primary">{value}</div>
          {item.description && (
            <div className="text-sm text-muted">{item.description}</div>
          )}
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value === 'numerical' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {value === 'numerical' ? 'Numerical' : 'Categorical'}
        </span>
      )
    },
    {
      key: 'details',
      label: 'Details',
      render: (_, item) => renderDetails(item)
    },
    {
      key: 'createdBy',
      label: 'Created By',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted">{value}</span>
      )
    },
    {
      key: 'lastUpdatedAt',
      label: 'Last Updated',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-muted">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '32'
    }
  ]

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-primary">Feedback Definitions</h2>
              <p className="text-sm text-muted mt-1">
                Manage feedback definitions that can be used for scoring traces and spans
              </p>
            </div>
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Definition
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-muted">Loading feedback definitions...</span>
            </div>
          ) : definitions.length === 0 ? (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-muted mx-auto mb-3" />
              <p className="text-muted">No feedback definitions found</p>
              <p className="text-sm text-muted mt-1">Create your first feedback definition to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="text-left py-3 px-4 font-medium text-gray-900"
                        style={{ width: column.width ? `${column.width}%` : undefined }}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {definitions.map((definition) => (
                    <tr key={definition.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {columns.map((column) => (
                        <td key={column.key} className="py-3 px-4">
                          {column.key === 'actions' ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(definition)}
                                className="p-1 text-gray-400 hover:text-primary transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(definition)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : column.render ? (
                            column.render(definition[column.key as keyof FeedbackDefinition], definition)
                          ) : (
                            definition[column.key as keyof FeedbackDefinition]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingDefinition(null)
        }}
        title={editingDefinition ? 'Edit Feedback Definition' : 'Create New Feedback Definition'}
        size="lg"
      >
        <FeedbackDefinitionForm
          definition={editingDefinition || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingDefinition(null)
          }}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  )
}