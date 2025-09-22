'use client'

import { ChevronLeft, ChevronRight, Save, CheckCircle, AlertTriangle } from 'lucide-react'
import { WorkflowStep } from '@/lib/types/workflow'

interface WorkflowNavigationProps {
  currentStep: number
  totalSteps: number
  currentStepData: WorkflowStep
  canProceed: boolean
  canGoBack: boolean
  isLastStep: boolean
  isSaving: boolean
  onNext: () => void
  onBack: () => void
  onSaveDraft: () => void
  onFinish: () => void
  errors?: string[]
  warnings?: string[]
}

export function WorkflowNavigation({
  currentStep,
  totalSteps,
  currentStepData,
  canProceed,
  canGoBack,
  isLastStep,
  isSaving,
  onNext,
  onBack,
  onSaveDraft,
  onFinish,
  errors = [],
  warnings = []
}: WorkflowNavigationProps) {
  
  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Validation Messages */}
      {(hasErrors || hasWarnings) && (
        <div className="mb-4 space-y-2">
          {errors.map((error, index) => (
            <div key={`error-${index}`} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          ))}
          {warnings.map((warning, index) => (
            <div key={`warning-${index}`} className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-yellow-700">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        {/* Left Side - Back Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            disabled={!canGoBack}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canGoBack 
                ? 'text-gray-700 bg-gray-100 hover:bg-gray-200' 
                : 'text-gray-400 bg-gray-50 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* Save Draft Button */}
          <button
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-3 h-3" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
        </div>

        {/* Center - Step Info */}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Step {currentStep + 1} of {totalSteps}</span>
          {currentStepData.canSkip && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
              Optional
            </span>
          )}
        </div>

        {/* Right Side - Next/Finish Button */}
        <div className="flex items-center gap-3">
          {isLastStep ? (
            <button
              onClick={onFinish}
              disabled={!canProceed || isSaving}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                canProceed && !isSaving
                  ? 'text-white bg-green-600 hover:bg-green-700'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Complete & Save'}
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!canProceed}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                canProceed 
                  ? 'text-white bg-blue-600 hover:bg-blue-700'
                  : 'text-gray-400 bg-gray-200 cursor-not-allowed'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Step Requirements */}
      {currentStepData.required && !canProceed && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
          <p className="text-xs text-blue-700">
            <span className="font-medium">Required:</span> Complete this step to continue
          </p>
        </div>
      )}

      {/* Skip Option */}
      {currentStepData.canSkip && !isLastStep && (
        <div className="mt-3">
          <button
            onClick={onNext}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Skip this step for now
          </button>
        </div>
      )}
    </div>
  )
}