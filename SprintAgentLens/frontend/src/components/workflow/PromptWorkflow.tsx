'use client'

import { useState, useEffect, useReducer } from 'react'
import { FileText, Edit3, Settings, Play, Save, Users, X } from 'lucide-react'
import { WorkflowStep, WorkflowState, WorkflowAction, StepValidationResult } from '@/lib/types/workflow'
import { VariableDefinition } from '@/lib/types/variables'
import { ProgressIndicator } from './ProgressIndicator'
import { WorkflowNavigation } from './WorkflowNavigation'
import { CompactVariablePanel } from '../prompts/CompactVariablePanel'
import { TypedVariableInput } from '../prompts/TypedVariableInput'
import { InlinePromptTester } from '../prompts/InlinePromptTester'
import { extractVariablesFromTemplate, generateVariableDefinitions } from '@/lib/variableUtils'

interface PromptWorkflowProps {
  mode?: 'create' | 'edit'
  prompt?: any
  projectId: string
  onClose: () => void
  onSaved?: () => void
}

// Define workflow steps
const createWorkflowSteps = (mode: 'create' | 'edit'): WorkflowStep[] => [
  {
    id: 'basic-setup',
    title: 'Basic Setup',
    description: 'Set prompt name, description, and basic details',
    icon: FileText,
    status: 'current',
    required: true,
    validationRules: [
      { field: 'name', rule: 'required', message: 'Prompt name is required' },
      { field: 'name', rule: 'minLength', value: 3, message: 'Name must be at least 3 characters' }
    ]
  },
  {
    id: 'template-design',
    title: 'Template Design',
    description: 'Write your prompt template with variables',
    icon: Edit3,
    status: 'pending',
    required: true,
    validationRules: [
      { field: 'template', rule: 'required', message: 'Prompt template is required' },
      { field: 'template', rule: 'minLength', value: 10, message: 'Template must be at least 10 characters' }
    ]
  },
  {
    id: 'variables',
    title: 'Configure Variables',
    description: 'Set up variables found in your template',
    icon: Settings,
    status: 'pending',
    required: false,
    canSkip: true,
    validationRules: [
      { 
        field: 'variableDefinitions', 
        rule: 'custom', 
        message: 'All required variables must be configured',
        validator: (value, formData) => {
          const variables = extractVariablesFromTemplate(formData.template || '')
          const definitions = value || []
          return variables.every(varName => 
            definitions.some((def: VariableDefinition) => def.name === varName)
          )
        }
      }
    ]
  },
  {
    id: 'test',
    title: 'Test & Validate',
    description: 'Test your prompt with sample data',
    icon: Play,
    status: 'pending',
    required: false,
    canSkip: true
  },
  {
    id: 'agents',
    title: 'Link Agents',
    description: 'Select agents to use this prompt',
    icon: Users,
    status: 'pending',
    required: false,
    canSkip: true,
    validationRules: [
      { 
        field: 'linkedAgents', 
        rule: 'custom', 
        message: 'Current prompts must be linked to exactly one agent',
        validator: (value, formData) => {
          if (formData.status === 'current') {
            return value && value.length === 1
          }
          return true
        }
      }
    ]
  },
  {
    id: 'save',
    title: 'Version & Save',
    description: 'Set version, status, and save your prompt',
    icon: Save,
    status: 'pending',
    required: true,
    validationRules: [
      { field: 'status', rule: 'required', message: 'Status selection is required' }
    ]
  }
]

// Workflow reducer
function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'NEXT_STEP':
      if (state.currentStep < state.steps.length - 1) {
        const newSteps = [...state.steps]
        newSteps[state.currentStep].status = 'completed'
        newSteps[state.currentStep + 1].status = 'current'
        
        return {
          ...state,
          currentStep: state.currentStep + 1,
          steps: newSteps,
          completionPercentage: ((state.currentStep + 1) / state.steps.length) * 100
        }
      }
      return state

    case 'PREVIOUS_STEP':
      if (state.currentStep > 0) {
        const newSteps = [...state.steps]
        newSteps[state.currentStep].status = 'pending'
        newSteps[state.currentStep - 1].status = 'current'
        
        return {
          ...state,
          currentStep: state.currentStep - 1,
          steps: newSteps,
          completionPercentage: (state.currentStep / state.steps.length) * 100
        }
      }
      return state

    case 'GO_TO_STEP':
      const newSteps = [...state.steps]
      newSteps[state.currentStep].status = 'pending'
      newSteps[action.stepIndex].status = 'current'
      
      return {
        ...state,
        currentStep: action.stepIndex,
        steps: newSteps,
        completionPercentage: (action.stepIndex / state.steps.length) * 100
      }

    case 'UPDATE_FORM_DATA':
      return {
        ...state,
        formData: {
          ...state.formData,
          [action.field]: action.value
        }
      }

    case 'UPDATE_STEP_STATUS':
      const updatedSteps = [...state.steps]
      updatedSteps[action.stepIndex].status = action.status
      
      return {
        ...state,
        steps: updatedSteps
      }

    default:
      return state
  }
}

export function PromptWorkflow({ mode = 'create', prompt, projectId, onClose, onSaved }: PromptWorkflowProps) {
  // Initialize workflow state
  const initialState: WorkflowState = {
    currentStep: 0,
    steps: createWorkflowSteps(mode),
    formData: {
      name: prompt?.name || '',
      description: prompt?.description || '',
      template: prompt?.activeVersion?.template || '',
      variables: [],
      variableDefinitions: prompt?.activeVersion?.variable_definitions || [],
      projectId,
      status: 'draft',
      comments: '',
      commitMessage: '',
      versionType: 'patch',
      useCustomVersion: false,
      customVersion: '',
      selectedProvider: '',
      selectedModel: '',
      testVariableValues: {},
      linkedAgents: [],
      availableAgents: []
    },
    isValid: false,
    canProceed: false,
    completionPercentage: 0
  }

  const [state, dispatch] = useReducer(workflowReducer, initialState)
  const [validation, setValidation] = useState<StepValidationResult>({
    isValid: false,
    errors: [],
    warnings: [],
    canProceed: false
  })
  const [isSaving, setIsSaving] = useState(false)

  // Load available agents
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch(`/api/v1/agents?projectId=${projectId}`)
        const data = await response.json()
        if (data.success) {
          handleFormUpdate('availableAgents', data.data || [])
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error)
      }
    }
    fetchAgents()
  }, [projectId])

  // Extract variables when template changes
  useEffect(() => {
    if (state.formData.template) {
      const variables = extractVariablesFromTemplate(state.formData.template)
      const newDefinitions = generateVariableDefinitions(state.formData.template, state.formData.variableDefinitions)
      
      dispatch({ type: 'UPDATE_FORM_DATA', field: 'variables', value: variables })
      dispatch({ type: 'UPDATE_FORM_DATA', field: 'variableDefinitions', value: newDefinitions })
    }
  }, [state.formData.template])

  // Validate current step
  useEffect(() => {
    validateCurrentStep()
  }, [state.currentStep, state.formData])

  const validateCurrentStep = () => {
    const currentStepData = state.steps[state.currentStep]
    const errors: string[] = []
    const warnings: string[] = []

    if (currentStepData.validationRules) {
      for (const rule of currentStepData.validationRules) {
        const fieldValue = state.formData[rule.field]
        let isValid = true

        switch (rule.rule) {
          case 'required':
            isValid = fieldValue !== '' && fieldValue !== null && fieldValue !== undefined
            break
          case 'minLength':
            isValid = fieldValue && fieldValue.length >= rule.value
            break
          case 'pattern':
            isValid = rule.value.test(fieldValue)
            break
          case 'custom':
            isValid = rule.validator ? rule.validator(fieldValue, state.formData) : true
            break
        }

        if (!isValid) {
          errors.push(rule.message)
        }
      }
    }

    const canProceed = errors.length === 0 && (currentStepData.canSkip || !currentStepData.required || errors.length === 0)

    setValidation({
      isValid: errors.length === 0,
      errors,
      warnings,
      canProceed
    })

    // Update step status based on validation
    if (errors.length > 0) {
      dispatch({ type: 'UPDATE_STEP_STATUS', stepIndex: state.currentStep, status: 'error' })
    } else if (warnings.length > 0) {
      dispatch({ type: 'UPDATE_STEP_STATUS', stepIndex: state.currentStep, status: 'warning' })
    } else {
      dispatch({ type: 'UPDATE_STEP_STATUS', stepIndex: state.currentStep, status: 'current' })
    }
  }

  const handleNext = () => {
    if (validation.canProceed) {
      dispatch({ type: 'NEXT_STEP' })
    }
  }

  const handleBack = () => {
    dispatch({ type: 'PREVIOUS_STEP' })
  }

  const handleFormUpdate = (field: string, value: any) => {
    dispatch({ type: 'UPDATE_FORM_DATA', field, value })
  }

  const handleSaveDraft = async () => {
    setIsSaving(true)
    try {
      // Save as draft logic here
      console.log('Saving draft...', state.formData)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
    } catch (error) {
      console.error('Failed to save draft:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFinish = async () => {
    setIsSaving(true)
    try {
      const url = prompt ? `/api/v1/prompts/${prompt.id}` : '/api/v1/prompts'
      const method = prompt ? 'PUT' : 'POST'
      
      // Determine version number
      let versionNumber: string
      if (state.formData.useCustomVersion) {
        versionNumber = state.formData.customVersion
      } else {
        // For new prompts, start with 1.0.0, for existing use increment logic
        if (!prompt) {
          versionNumber = '1.0.0'
        } else {
          // This will be handled by the API using the versionType
          versionNumber = '' // API will generate
        }
      }

      const body: any = {
        name: state.formData.name,
        description: state.formData.description,
        projectId: state.formData.projectId,
        template: state.formData.template,
        variables: state.formData.variables,
        variableDefinitions: state.formData.variableDefinitions,
        commitMessage: state.formData.commitMessage || (prompt ? 'Updated prompt' : 'Initial version'),
        versionNumber: state.formData.useCustomVersion ? versionNumber : undefined,
        versionType: !state.formData.useCustomVersion ? state.formData.versionType : undefined,
        status: state.formData.status,
        comments: state.formData.comments,
        createdBy: 'current-user', // TODO: Get from auth context
        updatedBy: 'current-user'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        const result = await response.json()
        
        // If we have linked agents and the prompt is current, link them
        if (state.formData.linkedAgents?.length > 0 && state.formData.status === 'current') {
          await linkAgentsToPrompt(result.prompt.id, state.formData.linkedAgents)
        }
        
        onSaved?.()
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save prompt')
      }
    } catch (error) {
      console.error('Failed to save prompt:', error)
      // Show error to user
      alert(`Failed to save prompt: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const linkAgentsToPrompt = async (promptId: string, agentIds: string[]) => {
    try {
      for (const agentId of agentIds) {
        await fetch(`/api/v1/agents/${agentId}/prompts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            promptId,
            status: 'active'
          }),
        })
      }
    } catch (error) {
      console.error('Failed to link agents:', error)
      // Non-fatal error, just log it
    }
  }

  const renderCurrentStep = () => {
    const currentStepId = state.steps[state.currentStep].id

    switch (currentStepId) {
      case 'basic-setup':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Name *
              </label>
              <input
                type="text"
                value={state.formData.name}
                onChange={(e) => handleFormUpdate('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a descriptive name for your prompt..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={state.formData.description}
                onChange={(e) => handleFormUpdate('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe what this prompt does and when to use it..."
              />
            </div>
          </div>
        )

      case 'template-design':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Prompt Template *
              </label>
              <textarea
                value={state.formData.template}
                onChange={(e) => handleFormUpdate('template', e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                placeholder="Write your prompt template here...&#10;&#10;Use {{variable_name}} for dynamic values.&#10;&#10;Example:&#10;You are a helpful assistant. Please analyze the following:&#10;&#10;{{user_input}}&#10;&#10;Focus on: {{analysis_focus}}"
              />
              <div className="mt-2 text-sm text-gray-500">
                Variables detected: {state.formData.variables?.length || 0}
              </div>
            </div>
          </div>
        )

      case 'variables':
        return (
          <CompactVariablePanel
            variables={state.formData.variableDefinitions}
            onChange={(vars) => handleFormUpdate('variableDefinitions', vars)}
            extractedVariables={state.formData.variables}
          />
        )

      case 'test':
        return (
          <InlinePromptTester
            template={state.formData.template}
            variables={state.formData.variables}
            variableDefinitions={state.formData.variableDefinitions}
          />
        )

      case 'agents':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Link to Agents</h3>
              <p className="text-sm text-gray-600 mb-4">
                Select one agent to use this prompt. {state.formData.status === 'current' && (
                  <span className="text-amber-600 font-medium">Current prompts must be linked to exactly one agent.</span>
                )}
              </p>
            </div>

            {state.formData.availableAgents?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {state.formData.availableAgents.map((agent: any) => (
                  <div 
                    key={agent.id} 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      state.formData.linkedAgents.includes(agent.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => {
                      const currentLinked = state.formData.linkedAgents || []
                      const newLinked = currentLinked.includes(agent.id)
                        ? [] // Deselect if already selected
                        : [agent.id] // Replace with single selection
                      handleFormUpdate('linkedAgents', newLinked)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center ${
                        state.formData.linkedAgents.includes(agent.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {state.formData.linkedAgents.includes(agent.id) && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        {agent.description && (
                          <p className="text-sm text-gray-600 mt-1">{agent.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            agent.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {agent.status}
                          </span>
                          {agent.current_prompt_id && (
                            <span className="text-xs text-gray-500">
                              Has active prompt
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No agents found in this project</p>
                <p className="text-sm text-gray-400 mt-1">Create an agent first to link it to this prompt</p>
              </div>
            )}

            {state.formData.linkedAgents?.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="text-sm font-medium text-green-800 mb-2">
                  Selected Agent
                </h4>
                <div className="flex flex-wrap gap-2">
                  {state.formData.linkedAgents.map((agentId: string) => {
                    const agent = state.formData.availableAgents.find((a: any) => a.id === agentId)
                    return agent ? (
                      <span key={agentId} className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                        {agent.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            )}
          </div>
        )

      case 'save':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Version & Save</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={state.formData.status}
                  onChange={(e) => handleFormUpdate('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="current">Current</option>
                  <option value="deactivated">Deactivated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version Type
                </label>
                <select
                  value={state.formData.versionType}
                  onChange={(e) => handleFormUpdate('versionType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="patch">Patch (bug fixes)</option>
                  <option value="minor">Minor (new features)</option>
                  <option value="major">Major (breaking changes)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Commit Message
              </label>
              <input
                type="text"
                value={state.formData.commitMessage}
                onChange={(e) => handleFormUpdate('commitMessage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your changes..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Version Comments
              </label>
              <textarea
                value={state.formData.comments}
                onChange={(e) => handleFormUpdate('comments', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add notes about this version..."
              />
            </div>
          </div>
        )

      default:
        return <div>Step not implemented</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create New Prompt' : 'Edit Prompt'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Follow the guided steps to configure your prompt
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          steps={state.steps}
          currentStep={state.currentStep}
          completionPercentage={state.completionPercentage}
        />

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderCurrentStep()}
        </div>

        {/* Navigation */}
        <WorkflowNavigation
          currentStep={state.currentStep}
          totalSteps={state.steps.length}
          currentStepData={state.steps[state.currentStep]}
          canProceed={validation.canProceed}
          canGoBack={state.currentStep > 0}
          isLastStep={state.currentStep === state.steps.length - 1}
          isSaving={isSaving}
          onNext={handleNext}
          onBack={handleBack}
          onSaveDraft={handleSaveDraft}
          onFinish={handleFinish}
          errors={validation.errors}
          warnings={validation.warnings}
        />
      </div>
    </div>
  )
}