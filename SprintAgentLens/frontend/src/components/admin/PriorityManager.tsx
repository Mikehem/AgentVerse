'use client'

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { PriorityForm } from './PriorityForm'
import { BusinessPriority } from '@/lib/types'
import { BusinessPriorityFormData } from '@/lib/validationSchemas'
import { businessPriorityApi } from '@/lib/api'

export function PriorityManager() {
  const [priorities, setPriorities] = useState<BusinessPriority[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPriority, setEditingPriority] = useState<BusinessPriority | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load priorities on component mount
  useEffect(() => {
    loadPriorities()
  }, [])

  const loadPriorities = async () => {
    setLoading(true)
    try {
      const response = await businessPriorityApi.getAll()
      if (response.success && response.data) {
        const prioritiesData = Array.isArray(response.data) ? response.data : []
        setPriorities(prioritiesData)
      } else {
        console.error('Failed to load priorities:', response.error)
        setPriorities([])
      }
    } catch (error) {
      console.error('Failed to load priorities:', error)
      setPriorities([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingPriority(null)
    setIsModalOpen(true)
  }

  const handleEdit = (priority: BusinessPriority) => {
    setEditingPriority(priority)
    setIsModalOpen(true)
  }

  const handleDelete = async (priority: BusinessPriority) => {
    if (!confirm(`Are you sure you want to delete "${priority.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await businessPriorityApi.delete(priority.id)
      if (response.success) {
        setPriorities(priorities.filter(p => p.id !== priority.id))
        alert('Priority deleted successfully!')
      } else {
        console.error('Failed to delete priority:', response.error)
        alert('Failed to delete priority. Please try again.')
      }
    } catch (error) {
      console.error('Failed to delete priority:', error)
      alert('Failed to delete priority. Please try again.')
    }
  }

  const handleToggleStatus = async (priority: BusinessPriority) => {
    try {
      const response = await businessPriorityApi.toggleStatus(priority.id)
      if (response.success && response.data) {
        setPriorities(priorities.map(p => 
          p.id === priority.id ? response.data! : p
        ))
        alert(`Priority ${response.data.isActive ? 'activated' : 'deactivated'} successfully!`)
      } else {
        console.error('Failed to toggle priority status:', response.error)
        alert('Failed to update priority status. Please try again.')
      }
    } catch (error) {
      console.error('Failed to toggle priority status:', error)
      alert('Failed to update priority status. Please try again.')
    }
  }

  const handleSubmit = async (data: BusinessPriorityFormData) => {
    setIsSubmitting(true)
    try {
      if (editingPriority) {
        // Update existing priority
        const response = await businessPriorityApi.update(editingPriority.id, data)
        if (response.success && response.data) {
          setPriorities(priorities.map(p => 
            p.id === editingPriority.id ? response.data! : p
          ))
          alert('Priority updated successfully!')
        } else {
          console.error('Failed to update priority:', response.error)
          alert('Failed to update priority. Please try again.')
          return
        }
      } else {
        // Create new priority
        const response = await businessPriorityApi.create(data)
        if (response.success && response.data) {
          setPriorities([...priorities, response.data])
          alert('Priority created successfully!')
        } else {
          console.error('Failed to create priority:', response.error)
          alert('Failed to create priority. Please try again.')
          return
        }
      }
      
      setIsModalOpen(false)
      setEditingPriority(null)
    } catch (error) {
      console.error('Failed to save priority:', error)
      alert('Failed to save priority. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: Column<BusinessPriority>[] = [
    {
      key: 'level',
      label: 'Level',
      sortable: true,
      width: '16',
      render: (value) => (
        <span className="inline-flex items-center justify-center w-8 h-8 bg-primary text-inverse rounded-full text-sm font-bold">
          {value}
        </span>
      )
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, item) => (
        <div className="flex items-center gap-3">
          <div 
            className="w-4 h-4 rounded-full border border-light flex-shrink-0"
            style={{ backgroundColor: item.color }}
          />
          <div>
            <div className="font-medium text-primary">{value}</div>
            <div className="text-sm text-muted">{item.description}</div>
          </div>
        </div>
      )
    },
    {
      key: 'color',
      label: 'Color',
      render: (value) => (
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded border border-light"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-sm">{value}</span>
        </div>
      )
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
          value 
            ? 'bg-success/20 text-success' 
            : 'bg-error/20 text-error'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'updatedAt',
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
      <DataTable
        data={priorities}
        columns={columns}
        title="Business Priority Management"
        description="Manage priority levels that can be assigned to projects"
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleStatus={handleToggleStatus}
        loading={loading}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPriority(null)
        }}
        title={editingPriority ? 'Edit Business Priority' : 'Create New Priority'}
        size="md"
      >
        <PriorityForm
          priority={editingPriority || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingPriority(null)
          }}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  )
}