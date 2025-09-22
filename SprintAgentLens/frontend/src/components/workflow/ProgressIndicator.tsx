'use client'

import { Check, AlertCircle, X, Circle } from 'lucide-react'
import { WorkflowStep, WorkflowStepStatus } from '@/lib/types/workflow'

interface ProgressIndicatorProps {
  steps: WorkflowStep[]
  currentStep: number
  completionPercentage: number
}

const getStepIcon = (status: WorkflowStepStatus, stepIcon: any) => {
  const StepIcon = stepIcon
  
  switch (status) {
    case 'completed':
      return <Check className="w-4 h-4 text-green-600" />
    case 'error':
      return <X className="w-4 h-4 text-red-600" />
    case 'warning':
      return <AlertCircle className="w-4 h-4 text-yellow-600" />
    case 'current':
      return <StepIcon className="w-4 h-4 text-blue-600" />
    default:
      return <Circle className="w-4 h-4 text-gray-400" />
  }
}

const getStepStyles = (status: WorkflowStepStatus, isCurrent: boolean) => {
  const baseStyles = "relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-200"
  
  switch (status) {
    case 'completed':
      return `${baseStyles} bg-green-100 border-green-500`
    case 'error':
      return `${baseStyles} bg-red-100 border-red-500`
    case 'warning':
      return `${baseStyles} bg-yellow-100 border-yellow-500`
    case 'current':
      return `${baseStyles} bg-blue-100 border-blue-500 ring-2 ring-blue-200`
    default:
      return `${baseStyles} bg-gray-100 border-gray-300`
  }
}

const getConnectorStyles = (status: WorkflowStepStatus, nextStatus: WorkflowStepStatus) => {
  if (status === 'completed') {
    return "bg-green-500"
  }
  if (status === 'current' || status === 'error' || status === 'warning') {
    return "bg-gray-300"
  }
  return "bg-gray-300"
}

export function ProgressIndicator({ steps, currentStep, completionPercentage }: ProgressIndicatorProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      {/* Overall Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {currentStep + 1} of {steps.length}
          </span>
          <span className="text-sm text-gray-500">
            {Math.round(completionPercentage)}% Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCurrent = index === currentStep
          const isLast = index === steps.length - 1
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div className={getStepStyles(step.status, isCurrent)}>
                  {getStepIcon(step.status, step.icon)}
                </div>
                <div className="mt-2 text-center">
                  <div className={`text-xs font-medium ${
                    isCurrent ? 'text-blue-600' : 
                    step.status === 'completed' ? 'text-green-600' : 
                    step.status === 'error' ? 'text-red-600' :
                    step.status === 'warning' ? 'text-yellow-600' :
                    'text-gray-500'
                  }`}>
                    {step.title}
                  </div>
                  {isCurrent && (
                    <div className="text-xs text-gray-500 mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div className="flex-1 h-0.5 mx-3 mt-[-16px]">
                  <div className={`h-full transition-all duration-300 ${
                    getConnectorStyles(step.status, steps[index + 1]?.status)
                  }`} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Current Step Details */}
      {steps[currentStep] && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              {getStepIcon(steps[currentStep].status, steps[currentStep].icon)}
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-900">
                {steps[currentStep].title}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {steps[currentStep].description}
              </p>
              {steps[currentStep].required && (
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="text-xs text-blue-600">Required step</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}