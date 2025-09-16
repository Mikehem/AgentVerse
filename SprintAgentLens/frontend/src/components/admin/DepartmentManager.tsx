'use client'

import { useState, useEffect } from 'react'
import { DataTable, Column } from '@/components/ui/DataTable'
import { Modal } from '@/components/ui/Modal'
import { DepartmentForm } from './DepartmentForm'
import { Department } from '@/lib/types'
import { DepartmentFormData } from '@/lib/validationSchemas'
import { departmentApi } from '@/lib/api'

export function DepartmentManager() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load departments on component mount
  useEffect(() => {
    loadDepartments()
  }, [])

  const loadDepartments = async () => {
    console.log('🔄 Loading departments...')
    setLoading(true)
    try {
      const response = await departmentApi.getAll()
      console.log('📡 Departments API response:', response)
      if (response.success && response.data) {
        const departmentsData = Array.isArray(response.data) ? response.data : []
        console.log(`✅ Loaded ${departmentsData.length} departments`)
        setDepartments(departmentsData)
      } else {
        console.error('❌ Failed to load departments:', response.error)
        setDepartments([])
      }
    } catch (error) {
      console.error('💥 Exception loading departments:', error)
      setDepartments([])
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingDepartment(null)
    setIsModalOpen(true)
  }

  const handleEdit = (department: Department) => {
    setEditingDepartment(department)
    setIsModalOpen(true)
  }

  const handleDelete = async (department: Department) => {
    if (!confirm(`Are you sure you want to delete "${department.name}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await departmentApi.delete(department.id)
      if (response.success) {
        console.log('✅ Department deleted successfully, reloading data...')
        await loadDepartments() // Reload data from server
        alert('Department deleted successfully!')
      } else {
        console.error('Failed to delete department:', response.error)
        alert('Failed to delete department. Please try again.')
      }
    } catch (error) {
      console.error('Failed to delete department:', error)
      alert('Failed to delete department. Please try again.')
    }
  }

  const handleToggleStatus = async (department: Department) => {
    try {
      const response = await departmentApi.toggleStatus(department.id)
      if (response.success && response.data) {
        console.log('✅ Department status toggled successfully, reloading data...')
        await loadDepartments() // Reload data from server
        alert(`Department ${response.data.isActive ? 'activated' : 'deactivated'} successfully!`)
      } else {
        console.error('Failed to toggle department status:', response.error)
        alert('Failed to update department status. Please try again.')
      }
    } catch (error) {
      console.error('Failed to toggle department status:', error)
      alert('Failed to update department status. Please try again.')
    }
  }

  const handleSubmit = async (data: DepartmentFormData) => {
    setIsSubmitting(true)
    try {
      if (editingDepartment) {
        // Update existing department
        const response = await departmentApi.update(editingDepartment.id, data)
        if (response.success && response.data) {
          console.log('✅ Department updated successfully, reloading data...')
          await loadDepartments() // Reload data from server instead of updating local state
          alert('Department updated successfully!')
        } else {
          console.error('Failed to update department:', response.error)
          alert(`Failed to update department: ${response.error}`)
          return
        }
      } else {
        // Create new department
        const response = await departmentApi.create(data)
        if (response.success && response.data) {
          console.log('✅ Department created successfully, reloading data...')
          await loadDepartments() // Reload data from server instead of updating local state
          alert('Department created successfully!')
        } else {
          console.error('Failed to create department:', response.error)
          alert(`Failed to create department: ${response.error}`)
          return
        }
      }
      
      setIsModalOpen(false)
      setEditingDepartment(null)
    } catch (error) {
      console.error('Failed to save department:', error)
      alert('Failed to save department. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns: Column<Department>[] = [
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
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm bg-background px-2 py-1 rounded">{value}</span>
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
        data={departments}
        columns={columns}
        title="Department Management"
        description="Manage departments that can be assigned to projects"
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
          setEditingDepartment(null)
        }}
        title={editingDepartment ? 'Edit Department' : 'Create New Department'}
        size="md"
      >
        <DepartmentForm
          department={editingDepartment || undefined}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingDepartment(null)
          }}
          isSubmitting={isSubmitting}
        />
      </Modal>
    </>
  )
}