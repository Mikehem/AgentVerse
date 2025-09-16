'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  Info, 
  LayoutTemplate, 
  ShieldCheck, 
  ArrowLeft, 
  Save, 
  ArrowRight,
  Headphones,
  TrendingUp,
  Edit3,
  BarChart3,
  Square,
  Lock,
  Shield,
  CheckCircle
} from 'lucide-react'
import { projectCreationSchema, ProjectCreationFormData } from '@/lib/validationSchemas'
import { TagInput } from '@/components/ui/TagInput'
import { cn, generateProjectCode } from '@/lib/utils'
import { Department, BusinessPriority } from '@/lib/types'
import { departmentApi, businessPriorityApi, projectApi } from '@/lib/api'
import { useState, useEffect } from 'react'

interface ProjectCreationFormProps {
  onCancel?: () => void
  onSubmit?: (data: ProjectCreationFormData) => void
}

const templates = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Start from scratch with complete control over your project setup',
    icon: Square,
    color: 'muted',
    agents: 0,
    feature: 'Full control'
  },
  {
    id: 'simple',
    name: 'Simple (1 Agent)',
    description: 'Basic project with a single agent for straightforward tasks',
    icon: TrendingUp,
    color: 'primary',
    agents: 1,
    feature: 'Quick start'
  },
  {
    id: 'autonomous',
    name: 'Autonomous (3 agents)',
    description: 'Advanced project with 3 agents working collaboratively',
    icon: BarChart3,
    color: 'secondary',
    agents: 3,
    feature: 'Advanced'
  }
]

const securityLevels = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Standard encryption, basic access controls',
    icon: Lock
  },
  {
    id: 'standard',
    name: 'Standard',
    description: 'Enhanced security, role-based access, audit logs',
    icon: Shield
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Advanced encryption, SSO, compliance features',
    icon: ShieldCheck
  }
]

export function ProjectCreationForm({ onCancel, onSubmit }: ProjectCreationFormProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank')
  const [selectedSecurity, setSelectedSecurity] = useState<string>('standard')
  const [departments, setDepartments] = useState<Department[]>([])
  const [businessPriorities, setBusinessPriorities] = useState<BusinessPriority[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProjectCreationFormData>({
    resolver: zodResolver(projectCreationSchema),
    defaultValues: {
      code: '', // Will be auto-generated
      template: 'blank',
      securityLevel: 'standard',
      dataRetention: '90',
      defaultAccess: 'collaborate',
      piiHandling: true,
      complianceMode: false,
      tags: [],
      teamMembers: [],
      visibility: 'private'
    }
  })

  const watchedName = watch('name') || ''
  const watchedCode = watch('code') || ''
  const watchedTags = watch('tags') || []

  // Auto-generate project code when name changes
  useEffect(() => {
    if (watchedName.trim() && watchedName.length >= 3) {
      const generatedCode = generateProjectCode(watchedName)
      setValue('code', generatedCode)
    }
  }, [watchedName, setValue])

  // Load departments and business priorities on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true)
      try {
        // Load departments
        const departmentsResponse = await departmentApi.getAll()
        if (departmentsResponse.success && departmentsResponse.data) {
          const departmentsData = Array.isArray(departmentsResponse.data) 
            ? departmentsResponse.data 
            : []
          setDepartments(departmentsData.filter(d => d.isActive))
        } else {
          console.error('Failed to load departments:', departmentsResponse.error)
          setDepartments([])
        }

        // Load business priorities
        const prioritiesResponse = await businessPriorityApi.getAll()
        if (prioritiesResponse.success && prioritiesResponse.data) {
          const prioritiesData = Array.isArray(prioritiesResponse.data) 
            ? prioritiesResponse.data 
            : []
          setBusinessPriorities(prioritiesData.filter(p => p.isActive))
        } else {
          console.error('Failed to load priorities:', prioritiesResponse.error)
          setBusinessPriorities([])
        }
      } catch (error) {
        console.error('Failed to load form data:', error)
        // Fallback to empty arrays on error
        setDepartments([])
        setBusinessPriorities([])
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [])

  const handleFormSubmit = async (data: ProjectCreationFormData) => {
    try {
      console.log('Creating project with data:', data)
      
      // Save project to database via API
      const response = await projectApi.create(data)
      
      if (response.success && response.data) {
        console.log('✅ Project created successfully:', response.data)
        alert('Project created successfully!')
        
        // Call onSubmit if provided (for any parent component handling)
        if (onSubmit) {
          onSubmit(data)
        }
      } else {
        console.error('❌ Failed to create project:', response.error)
        alert(`Failed to create project: ${response.error}`)
      }
    } catch (error) {
      console.error('💥 Exception creating project:', error)
      alert('Error creating project. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Information Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-light">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <Info className="w-4 h-4 text-inverse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">Basic Information</h2>
            <p className="text-sm text-muted">Essential details about your project</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary">
              Project Name <span className="text-error">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g., E-commerce Customer Support"
              className="input"
            />
            {errors.name && (
              <p className="text-sm text-error">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary">
              Project Code <span className="text-error">*</span>
            </label>
            <input
              {...register('code')}
              type="text"
              value={watchedCode}
              readOnly
              className="input bg-background-light text-muted cursor-not-allowed"
              placeholder="Auto-generated from project name"
            />
            <p className="text-xs text-muted">
              <span className="text-success">✓ Auto-generated</span> - Unique identifier for backend metrics tracking
            </p>
            {errors.code && (
              <p className="text-sm text-error">{errors.code.message}</p>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-primary">
              Description <span className="text-error">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Describe the purpose and goals of this project..."
              className="input"
            />
            {errors.description && (
              <p className="text-sm text-error">{errors.description.message}</p>
            )}
            <p className="text-xs text-muted">Provide a clear description to help team members understand the project scope</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary">Department</label>
            <select {...register('department')} className="input" disabled={loadingData}>
              <option value="">
                {loadingData ? 'Loading departments...' : 'Select Department'}
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.code}>
                  {department.name}
                </option>
              ))}
            </select>
            {!loadingData && departments.length === 0 && (
              <p className="text-xs text-warning">No active departments available. Please configure departments in the admin section.</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-primary">
              Business Priority <span className="text-error">*</span>
            </label>
            <select {...register('priority')} className="input" disabled={loadingData}>
              <option value="">
                {loadingData ? 'Loading priorities...' : 'Select Priority'}
              </option>
              {businessPriorities
                .sort((a, b) => a.level - b.level) // Sort by priority level (lower number = higher priority)
                .map((priority) => (
                  <option key={priority.id} value={priority.id}>
                    Level {priority.level} - {priority.name}
                  </option>
                ))}
            </select>
            {!loadingData && businessPriorities.length === 0 && (
              <p className="text-xs text-warning">No active priorities available. Please configure business priorities in the admin section.</p>
            )}
            {errors.priority && (
              <p className="text-sm text-error">{errors.priority.message}</p>
            )}
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-primary">Tags</label>
            <TagInput
              value={watchedTags}
              onChange={(tags) => setValue('tags', tags)}
              placeholder="Add tags..."
            />
            <p className="text-xs text-muted">Press Enter to add tags. Use tags for better organization and discovery</p>
          </div>
        </div>
      </div>

      {/* Project Template Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-light">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <LayoutTemplate className="w-4 h-4 text-inverse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">Project Template</h2>
            <p className="text-sm text-muted">Choose a template to get started quickly</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => {
            const Icon = template.icon
            const isSelected = selectedTemplate === template.id
            return (
              <div
                key={template.id}
                onClick={() => {
                  setSelectedTemplate(template.id)
                  setValue('template', template.id as any)
                }}
                className={cn(
                  "relative p-4 border rounded-lg cursor-pointer transition-all duration-200",
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "border-light bg-card hover:border-primary/50"
                )}
              >
                {isSelected && (
                  <div className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                    <CheckCircle className="w-3 h-3 text-inverse" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 text-${template.color}`} />
                  <h3 className="font-semibold text-primary">{template.name}</h3>
                </div>
                <p className="text-sm text-muted mb-3">{template.description}</p>
                <div className="flex items-center gap-4 text-xs text-muted">
                  <span>{template.agents} agents</span>
                  <span>{template.feature}</span>
                </div>
              </div>
            )
          })}
        </div>
        {errors.template && (
          <p className="text-sm text-error mt-2">{errors.template.message}</p>
        )}
      </div>

      {/* Security & Access Section */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-light">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-inverse" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary">Security & Access</h2>
            <p className="text-sm text-muted">Configure security level and access permissions</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-3">
              Security Level <span className="text-error">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {securityLevels.map((level) => {
                const Icon = level.icon
                const isSelected = selectedSecurity === level.id
                return (
                  <div
                    key={level.id}
                    onClick={() => {
                      setSelectedSecurity(level.id)
                      setValue('securityLevel', level.id as any)
                    }}
                    className={cn(
                      "p-4 border rounded-lg cursor-pointer transition-all duration-200 text-center",
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-light bg-card hover:border-primary/50"
                    )}
                  >
                    <div className="flex justify-center mb-2">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h4 className="font-semibold text-sm text-primary">{level.name}</h4>
                    <p className="text-xs text-muted mt-1">{level.description}</p>
                  </div>
                )
              })}
            </div>
            {errors.securityLevel && (
              <p className="text-sm text-error mt-2">{errors.securityLevel.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary">Data Retention Period</label>
              <select {...register('dataRetention')} className="input">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">6 months</option>
                <option value="365">1 year</option>
                <option value="unlimited">Unlimited</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-primary">Default Access Level</label>
              <select {...register('defaultAccess')} className="input">
                <option value="read">Read Only</option>
                <option value="collaborate">Collaborate</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <input 
                {...register('piiHandling')} 
                type="checkbox" 
                id="pii-handling" 
                className="mt-1" 
              />
              <div>
                <label htmlFor="pii-handling" className="text-sm font-medium text-primary cursor-pointer">
                  Enable PII detection and handling
                </label>
                <p className="text-xs text-muted">Automatically detect and protect personally identifiable information</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input 
                {...register('complianceMode')} 
                type="checkbox" 
                id="compliance-mode" 
                className="mt-1" 
              />
              <div>
                <label htmlFor="compliance-mode" className="text-sm font-medium text-primary cursor-pointer">
                  Enable compliance mode (GDPR, HIPAA)
                </label>
                <p className="text-xs text-muted">Additional compliance features and data handling restrictions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6">
        <div className="flex items-center gap-2 text-sm text-success">
          <CheckCircle className="w-4 h-4" />
          <span>Project details configured</span>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-outline"
          >
            <ArrowLeft className="w-4 h-4" />
            Cancel
          </button>

          <button
            type="button"
            className="btn btn-outline"
            onClick={() => alert('Save as draft functionality would be implemented here')}
          >
            <Save className="w-4 h-4" />
            Save as Draft
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary"
          >
            {isSubmitting ? 'Creating...' : 'Create Project'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  )
}