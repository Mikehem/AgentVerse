'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { businessPrioritySchema, BusinessPriorityFormData } from '@/lib/validationSchemas'
import { BusinessPriority } from '@/lib/types'

interface PriorityFormProps {
  priority?: BusinessPriority
  onSubmit: (data: BusinessPriorityFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

const priorityLevels = [
  { value: 1, label: 'Level 1 - Critical' },
  { value: 2, label: 'Level 2 - High' },
  { value: 3, label: 'Level 3 - Medium' },
  { value: 4, label: 'Level 4 - Low' }
]

const predefinedColors = [
  '#DC2626', // Red
  '#EA580C', // Orange
  '#D97706', // Amber
  '#16A34A', // Green
  '#2563EB', // Blue
  '#7C3AED', // Purple
  '#C2185B', // Pink
  '#795548'  // Brown
]

export function PriorityForm({ priority, onSubmit, onCancel, isSubmitting = false }: PriorityFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<BusinessPriorityFormData>({
    resolver: zodResolver(businessPrioritySchema),
    defaultValues: {
      name: priority?.name || '',
      description: priority?.description || '',
      level: priority?.level || 1,
      color: priority?.color || '#DC2626',
      isActive: priority?.isActive ?? true
    }
  })

  const watchedColor = watch('color')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Priority Name <span className="text-error">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="e.g., Critical - Revenue Impact"
          className="input"
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Description <span className="text-error">*</span>
        </label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Describe when this priority level should be used"
          className="input"
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Priority Level <span className="text-error">*</span>
        </label>
        <select 
          {...register('level', { valueAsNumber: true })}
          className="input"
        >
          {priorityLevels.map((level) => (
            <option key={level.value} value={level.value}>
              {level.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">Lower numbers indicate higher priority</p>
        {errors.level && (
          <p className="text-sm text-error">{errors.level.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Color <span className="text-error">*</span>
        </label>
        <div className="flex items-center gap-3">
          <input
            {...register('color')}
            type="color"
            className="w-12 h-10 rounded border border-light cursor-pointer"
          />
          <input
            {...register('color')}
            type="text"
            placeholder="#DC2626"
            className="input flex-1"
          />
          <div 
            className="w-10 h-10 rounded border border-light"
            style={{ backgroundColor: watchedColor }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {predefinedColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue('color', color)}
              className="w-6 h-6 rounded border border-light hover:scale-110 transition-transform"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        {errors.color && (
          <p className="text-sm text-error">{errors.color.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          {...register('isActive')}
          type="checkbox"
          id="priority-active"
          className="h-4 w-4"
        />
        <label htmlFor="priority-active" className="text-sm font-medium text-primary cursor-pointer">
          Active Priority
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
          {isSubmitting ? 'Saving...' : priority ? 'Update Priority' : 'Create Priority'}
        </button>
      </div>
    </form>
  )
}