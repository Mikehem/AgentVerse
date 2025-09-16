'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { departmentSchema, DepartmentFormData } from '@/lib/validationSchemas'
import { Department } from '@/lib/types'
import { generateProjectCode } from '@/lib/utils'
import { useEffect } from 'react'

interface DepartmentFormProps {
  department?: Department
  onSubmit: (data: DepartmentFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function DepartmentForm({ department, onSubmit, onCancel, isSubmitting = false }: DepartmentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name || '',
      description: department?.description || '',
      code: department?.code || '',
      isActive: department?.isActive ?? true
    }
  })

  const watchedName = watch('name') || ''
  const watchedCode = watch('code') || ''

  // Auto-generate code when name changes (only for new departments)
  useEffect(() => {
    if (!department && watchedName.trim() && watchedName.length >= 2) {
      const generatedCode = watchedName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '')
        .split(/\s+/)
        .join('_')
        .substring(0, 20) // Max 20 characters
      setValue('code', generatedCode)
    }
  }, [watchedName, setValue, department])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Department Name <span className="text-error">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="e.g., Customer Service"
          className="input"
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Department Code <span className="text-error">*</span>
        </label>
        <input
          {...register('code')}
          type="text"
          value={watchedCode}
          readOnly={!department} // Only editable when updating existing department
          placeholder="e.g., CUSTOMER_SERVICE"
          className={`input ${!department ? 'bg-background-light text-muted cursor-not-allowed' : ''}`}
        />
        {!department && (
          <p className="text-xs text-muted">
            <span className="text-success">✓ Auto-generated</span> - Unique identifier for backend tracking
          </p>
        )}
        {errors.code && (
          <p className="text-sm text-error">{errors.code.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Brief description of this department's responsibilities"
          className="input"
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('isActive')}
          type="checkbox"
          id="department-active"
          className="h-4 w-4"
        />
        <label htmlFor="department-active" className="text-sm font-medium text-primary cursor-pointer">
          Active Department
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline flex-1"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary flex-1"
        >
          {isSubmitting ? 'Saving...' : department ? 'Update Department' : 'Create Department'}
        </button>
      </div>
    </form>
  )
}