export type WorkflowStepStatus = 'pending' | 'current' | 'completed' | 'error' | 'warning'

export interface WorkflowStep {
  id: string
  title: string
  description: string
  icon: any
  status: WorkflowStepStatus
  required: boolean
  canSkip?: boolean
  validationRules?: ValidationRule[]
}

export interface ValidationRule {
  field: string
  rule: 'required' | 'minLength' | 'pattern' | 'custom'
  value?: any
  message: string
  validator?: (value: any, formData: any) => boolean
}

export interface WorkflowState {
  currentStep: number
  steps: WorkflowStep[]
  formData: Record<string, any>
  isValid: boolean
  canProceed: boolean
  completionPercentage: number
}

export interface StepValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  canProceed: boolean
}

export type WorkflowAction = 
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'GO_TO_STEP'; stepIndex: number }
  | { type: 'UPDATE_FORM_DATA'; field: string; value: any }
  | { type: 'UPDATE_STEP_STATUS'; stepIndex: number; status: WorkflowStepStatus }
  | { type: 'VALIDATE_CURRENT_STEP' }
  | { type: 'SAVE_DRAFT' }
  | { type: 'RESET_WORKFLOW' }