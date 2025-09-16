'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'

const numericalDetailsSchema = z.object({
  min: z.number(),
  max: z.number()
})

const categoricalDetailsSchema = z.object({
  categories: z.record(z.string(), z.number()).refine(
    (categories) => Object.keys(categories).length >= 2,
    { message: "At least 2 categories are required" }
  )
})

const feedbackDefinitionFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  type: z.enum(['numerical', 'categorical']),
  details: z.union([numericalDetailsSchema, categoricalDetailsSchema])
})

type FeedbackDefinitionFormData = z.infer<typeof feedbackDefinitionFormSchema>

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

interface FeedbackDefinitionFormProps {
  definition?: FeedbackDefinition
  onSubmit: (data: FeedbackDefinitionFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function FeedbackDefinitionForm({ definition, onSubmit, onCancel, isSubmitting = false }: FeedbackDefinitionFormProps) {
  const [feedbackType, setFeedbackType] = useState<'numerical' | 'categorical'>(definition?.type || 'numerical')
  const [categories, setCategories] = useState<Array<{ name: string; value: number }>>(() => {
    if (definition?.type === 'categorical' && definition.details?.categories) {
      return Object.entries(definition.details.categories).map(([name, value]) => ({ name, value: value as number }))
    }
    return [{ name: '', value: 0 }, { name: '', value: 1 }]
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<FeedbackDefinitionFormData>({
    resolver: zodResolver(feedbackDefinitionFormSchema),
    defaultValues: {
      name: definition?.name || '',
      description: definition?.description || '',
      type: definition?.type || 'numerical',
      details: definition?.details || (feedbackType === 'numerical' ? { min: 0, max: 10 } : { categories: {} })
    }
  })

  const watchedType = watch('type')

  useEffect(() => {
    setFeedbackType(watchedType)
  }, [watchedType])

  const addCategory = () => {
    setCategories([...categories, { name: '', value: categories.length }])
  }

  const removeCategory = (index: number) => {
    if (categories.length > 2) {
      setCategories(categories.filter((_, i) => i !== index))
    }
  }

  const updateCategory = (index: number, field: 'name' | 'value', value: string | number) => {
    const newCategories = [...categories]
    newCategories[index] = { ...newCategories[index], [field]: value }
    setCategories(newCategories)
  }

  const handleFormSubmit = (data: FeedbackDefinitionFormData) => {
    let details: any

    if (data.type === 'numerical') {
      details = {
        min: Number(data.details.min),
        max: Number(data.details.max)
      }
    } else {
      const categoryObject: Record<string, number> = {}
      categories.forEach(cat => {
        if (cat.name.trim()) {
          categoryObject[cat.name.trim()] = Number(cat.value)
        }
      })
      details = { categories: categoryObject }
    }

    onSubmit({
      ...data,
      details
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Definition Name <span className="text-error">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="e.g., Response Quality"
          className="input"
        />
        {errors.name && (
          <p className="text-sm text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">Description</label>
        <textarea
          {...register('description')}
          rows={3}
          placeholder="Brief description of what this feedback measures"
          className="input"
        />
        {errors.description && (
          <p className="text-sm text-error">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-primary">
          Feedback Type <span className="text-error">*</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              {...register('type')}
              type="radio"
              value="numerical"
              className="mr-3"
            />
            <div>
              <div className="font-medium">Numerical</div>
              <div className="text-sm text-muted">Range-based scoring (e.g., 1-10)</div>
            </div>
          </label>
          <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              {...register('type')}
              type="radio"
              value="categorical"
              className="mr-3"
            />
            <div>
              <div className="font-medium">Categorical</div>
              <div className="text-sm text-muted">Predefined categories</div>
            </div>
          </label>
        </div>
        {errors.type && (
          <p className="text-sm text-error">{errors.type.message}</p>
        )}
      </div>

      {feedbackType === 'numerical' && (
        <div className="space-y-4">
          <h4 className="font-medium text-primary">Numerical Range</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary">Minimum Value</label>
              <input
                {...register('details.min', { valueAsNumber: true })}
                type="number"
                placeholder="0"
                className="input"
              />
              {errors.details?.min && (
                <p className="text-sm text-error">{errors.details.min.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary">Maximum Value</label>
              <input
                {...register('details.max', { valueAsNumber: true })}
                type="number"
                placeholder="10"
                className="input"
              />
              {errors.details?.max && (
                <p className="text-sm text-error">{errors.details.max.message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {feedbackType === 'categorical' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-primary">Categories</h4>
            <button
              type="button"
              onClick={addCategory}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary-dark"
            >
              <Plus className="w-4 h-4" />
              Add Category
            </button>
          </div>
          <div className="space-y-3">
            {categories.map((category, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <label className="block text-sm text-muted">Category Name</label>
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => updateCategory(index, 'name', e.target.value)}
                    placeholder={`Category ${index + 1}`}
                    className="input"
                  />
                </div>
                <div className="w-24 space-y-2">
                  <label className="block text-sm text-muted">Value</label>
                  <input
                    type="number"
                    value={category.value}
                    onChange={(e) => updateCategory(index, 'value', Number(e.target.value))}
                    className="input"
                  />
                </div>
                {categories.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="mt-7 p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {categories.length < 2 && (
            <p className="text-sm text-error">At least 2 categories are required</p>
          )}
        </div>
      )}

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
          {isSubmitting ? 'Saving...' : definition ? 'Update Definition' : 'Create Definition'}
        </button>
      </div>
    </form>
  )
}