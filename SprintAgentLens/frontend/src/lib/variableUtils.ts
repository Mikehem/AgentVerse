import { VariableDefinition, VariableValidationResult, VariableValidationError, VariableType } from './types/variables'

// Extract variables from template string
export function extractVariablesFromTemplate(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const variables: string[] = []
  let match
  
  while ((match = regex.exec(template)) !== null) {
    const variableName = match[1].trim()
    if (!variables.includes(variableName)) {
      variables.push(variableName)
    }
  }
  
  return variables
}

// Create default variable definition for a variable name
export function createDefaultVariableDefinition(name: string): VariableDefinition {
  return {
    name,
    type: 'string',
    label: name.charAt(0).toUpperCase() + name.slice(1),
    description: `Variable: ${name}`,
    required: true,
    uiHints: {
      placeholder: `Enter ${name}...`,
      widget: 'input'
    }
  }
}

// Get default value for a variable type
export function getDefaultValueForType(type: VariableType): any {
  switch (type) {
    case 'string':
    case 'email':
    case 'url':
      return ''
    case 'integer':
    case 'float':
      return 0
    case 'boolean':
      return false
    case 'list':
      return []
    case 'file':
      return null
    case 'date':
      return ''
    default:
      return ''
  }
}

// Validate variable value against its definition
export function validateVariableValue(
  value: any, 
  definition: VariableDefinition
): VariableValidationError | null {
  // Check required
  if (definition.required && (value === null || value === undefined || value === '')) {
    return {
      name: definition.name,
      message: `${definition.label || definition.name} is required`,
      type: 'required'
    }
  }

  // If not required and empty, skip other validations
  if (!value && !definition.required) {
    return null
  }

  // Type-specific validation
  switch (definition.type) {
    case 'string':
      if (typeof value !== 'string') {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be a string`,
          type: 'type'
        }
      }
      if (definition.stringConfig) {
        if (definition.stringConfig.minLength && value.length < definition.stringConfig.minLength) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must be at least ${definition.stringConfig.minLength} characters`,
            type: 'range'
          }
        }
        if (definition.stringConfig.maxLength && value.length > definition.stringConfig.maxLength) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must be no more than ${definition.stringConfig.maxLength} characters`,
            type: 'range'
          }
        }
        if (definition.stringConfig.pattern) {
          const regex = new RegExp(definition.stringConfig.pattern)
          if (!regex.test(value)) {
            return {
              name: definition.name,
              message: `${definition.label || definition.name} format is invalid`,
              type: 'format'
            }
          }
        }
      }
      break

    case 'integer':
      if (!Number.isInteger(Number(value))) {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be an integer`,
          type: 'type'
        }
      }
      if (definition.numberConfig) {
        const numValue = Number(value)
        if (definition.numberConfig.min !== undefined && numValue < definition.numberConfig.min) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must be at least ${definition.numberConfig.min}`,
            type: 'range'
          }
        }
        if (definition.numberConfig.max !== undefined && numValue > definition.numberConfig.max) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must be no more than ${definition.numberConfig.max}`,
            type: 'range'
          }
        }
      }
      break

    case 'float':
      if (isNaN(Number(value))) {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be a number`,
          type: 'type'
        }
      }
      if (definition.numberConfig) {
        const numValue = Number(value)
        if (definition.numberConfig.min !== undefined && numValue < definition.numberConfig.min) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must be at least ${definition.numberConfig.min}`,
            type: 'range'
          }
        }
        if (definition.numberConfig.max !== undefined && numValue > definition.numberConfig.max) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must be no more than ${definition.numberConfig.max}`,
            type: 'range'
          }
        }
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be true or false`,
          type: 'type'
        }
      }
      break

    case 'list':
      if (!Array.isArray(value)) {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be a list`,
          type: 'type'
        }
      }
      if (definition.listConfig) {
        if (definition.listConfig.minItems && value.length < definition.listConfig.minItems) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must have at least ${definition.listConfig.minItems} items`,
            type: 'range'
          }
        }
        if (definition.listConfig.maxItems && value.length > definition.listConfig.maxItems) {
          return {
            name: definition.name,
            message: `${definition.label || definition.name} must have no more than ${definition.listConfig.maxItems} items`,
            type: 'range'
          }
        }
        
        // Validate each item matches the subType
        for (let i = 0; i < value.length; i++) {
          const item = value[i]
          const itemValid = validateSubTypeValue(item, definition.listConfig.subType)
          if (!itemValid) {
            return {
              name: definition.name,
              message: `Item ${i + 1} in ${definition.label || definition.name} must be a ${definition.listConfig.subType}`,
              type: 'type'
            }
          }
        }
      }
      break

    case 'email':
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be a valid email address`,
          type: 'format'
        }
      }
      break

    case 'url':
      try {
        new URL(value)
      } catch {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be a valid URL`,
          type: 'format'
        }
      }
      break

    case 'date':
      const dateValue = new Date(value)
      if (isNaN(dateValue.getTime())) {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} must be a valid date`,
          type: 'format'
        }
      }
      if (definition.dateConfig) {
        if (definition.dateConfig.minDate) {
          const minDate = new Date(definition.dateConfig.minDate)
          if (dateValue < minDate) {
            return {
              name: definition.name,
              message: `${definition.label || definition.name} must be after ${definition.dateConfig.minDate}`,
              type: 'range'
            }
          }
        }
        if (definition.dateConfig.maxDate) {
          const maxDate = new Date(definition.dateConfig.maxDate)
          if (dateValue > maxDate) {
            return {
              name: definition.name,
              message: `${definition.label || definition.name} must be before ${definition.dateConfig.maxDate}`,
              type: 'range'
            }
          }
        }
      }
      break

    case 'file':
      // File validation would depend on the actual file object structure
      // For now, just check if it's not null when required
      if (definition.required && !value) {
        return {
          name: definition.name,
          message: `${definition.label || definition.name} is required`,
          type: 'required'
        }
      }
      break
  }

  return null
}

// Helper function to validate sub-type values for lists
function validateSubTypeValue(value: any, subType: string): boolean {
  switch (subType) {
    case 'string':
      return typeof value === 'string'
    case 'integer':
      return Number.isInteger(Number(value))
    case 'float':
      return !isNaN(Number(value))
    case 'boolean':
      return typeof value === 'boolean'
    default:
      return true
  }
}

// Validate all variables against their definitions
export function validateVariables(
  values: Record<string, any>,
  definitions: VariableDefinition[]
): VariableValidationResult {
  const errors: VariableValidationError[] = []
  const validatedValues: Record<string, any> = {}

  for (const definition of definitions) {
    const value = values[definition.name]
    const error = validateVariableValue(value, definition)
    
    if (error) {
      errors.push(error)
    } else {
      // Use default value if no value provided and not required
      validatedValues[definition.name] = value !== undefined ? value : getDefaultValueForType(definition.type)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    values: validatedValues
  }
}

// Generate variable definitions from template, merging with existing definitions
export function generateVariableDefinitions(
  template: string,
  existingDefinitions: VariableDefinition[] = []
): VariableDefinition[] {
  const variableNames = extractVariablesFromTemplate(template)
  const existingMap = new Map(existingDefinitions.map(def => [def.name, def]))
  
  return variableNames.map(name => {
    const existing = existingMap.get(name)
    if (existing) {
      return existing
    }
    return createDefaultVariableDefinition(name)
  })
}