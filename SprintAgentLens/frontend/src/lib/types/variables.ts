export type VariableType = 
  | 'string'
  | 'text'
  | 'integer' 
  | 'float'
  | 'boolean'
  | 'list'
  | 'select'
  | 'multiselect'
  | 'file'
  | 'date'
  | 'datetime'
  | 'time'
  | 'email'
  | 'url'
  | 'password'
  | 'phone'
  | 'color'
  | 'json'

export type ListSubType = 'string' | 'integer' | 'float' | 'boolean'

export type FileSubType = 'json' | 'csv' | 'pdf' | 'txt' | 'image' | 'any'

export interface VariableDefinition {
  name: string
  type: VariableType
  label?: string
  description?: string
  required: boolean
  defaultValue?: any
  
  // Type-specific configurations
  listConfig?: {
    subType: ListSubType
    minItems?: number
    maxItems?: number
  }
  
  fileConfig?: {
    subType: FileSubType
    maxSizeKB?: number
    allowMultiple?: boolean
  }
  
  stringConfig?: {
    minLength?: number
    maxLength?: number
    pattern?: string
  }
  
  numberConfig?: {
    min?: number
    max?: number
    step?: number
  }
  
  selectConfig?: {
    options: { value: string; label: string }[]
    allowCustom?: boolean
  }
  
  dateConfig?: {
    format?: 'date' | 'datetime' | 'time'
    minDate?: string
    maxDate?: string
  }
  
  jsonConfig?: {
    schema?: any
    prettify?: boolean
  }
  
  // Validation
  validation?: {
    pattern?: string
    customMessage?: string
  }
  
  // UI hints
  uiHints?: {
    placeholder?: string
    helpText?: string
    widget?: 'input' | 'textarea' | 'select' | 'file' | 'date'
  }
}

export interface VariableValue {
  name: string
  value: any
  type: VariableType
}

export interface VariableValidationError {
  name: string
  message: string
  type: 'required' | 'type' | 'format' | 'range' | 'custom'
}

export interface VariableValidationResult {
  isValid: boolean
  errors: VariableValidationError[]
  values: Record<string, any>
}