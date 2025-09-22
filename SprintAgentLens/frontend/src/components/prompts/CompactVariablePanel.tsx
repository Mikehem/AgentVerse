'use client'

import { useState } from 'react'
import { Plus, X, Settings, Type, Hash, List, Calendar, Mail, Link, FileText, ToggleLeft, ChevronDown, ChevronRight, Check, Copy, Palette, Key, Phone, Code, Clock, CalendarDays, AlignLeft, CheckSquare } from 'lucide-react'
import { VariableDefinition, VariableType, ListSubType, FileSubType } from '@/lib/types/variables'

interface CompactVariablePanelProps {
  variables: VariableDefinition[]
  onChange: (variables: VariableDefinition[]) => void
  extractedVariables: string[]
}

const VARIABLE_TYPES: { value: VariableType; label: string; icon: any; description: string; category: string }[] = [
  // Text Types
  { value: 'string', label: 'Text', icon: Type, description: 'Single line text', category: 'Text' },
  { value: 'text', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text area', category: 'Text' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address', category: 'Text' },
  { value: 'url', label: 'URL', icon: Link, description: 'Web address', category: 'Text' },
  { value: 'password', label: 'Password', icon: Key, description: 'Password input', category: 'Text' },
  { value: 'phone', label: 'Phone', icon: Phone, description: 'Phone number', category: 'Text' },
  
  // Numbers
  { value: 'integer', label: 'Integer', icon: Hash, description: 'Whole numbers', category: 'Number' },
  { value: 'float', label: 'Decimal', icon: Hash, description: 'Decimal numbers', category: 'Number' },
  
  // Choices
  { value: 'boolean', label: 'Toggle', icon: ToggleLeft, description: 'True/false', category: 'Choice' },
  { value: 'select', label: 'Dropdown', icon: ChevronDown, description: 'Single choice', category: 'Choice' },
  { value: 'multiselect', label: 'Multi-Select', icon: CheckSquare, description: 'Multiple choices', category: 'Choice' },
  { value: 'list', label: 'List', icon: List, description: 'Multiple items', category: 'Choice' },
  
  // Special
  { value: 'file', label: 'File', icon: FileText, description: 'File upload', category: 'Special' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date picker', category: 'Special' },
  { value: 'datetime', label: 'Date & Time', icon: CalendarDays, description: 'Date and time', category: 'Special' },
  { value: 'time', label: 'Time', icon: Clock, description: 'Time picker', category: 'Special' },
  { value: 'color', label: 'Color', icon: Palette, description: 'Color picker', category: 'Special' },
  { value: 'json', label: 'JSON', icon: Code, description: 'JSON data', category: 'Special' },
]

const VARIABLE_CATEGORIES = ['Text', 'Number', 'Choice', 'Special']

export function CompactVariablePanel({ variables, onChange, extractedVariables }: CompactVariablePanelProps) {
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null)
  const [showTypeSelector, setShowTypeSelector] = useState<string | null>(null)

  const updateVariable = (index: number, updates: Partial<VariableDefinition>) => {
    const newVariables = [...variables]
    newVariables[index] = { ...newVariables[index], ...updates }
    onChange(newVariables)
  }

  const addVariable = (name: string, type: VariableType = 'string') => {
    const newVariable: VariableDefinition = {
      name,
      type,
      label: name.charAt(0).toUpperCase() + name.slice(1),
      description: '',
      required: true,
      uiHints: {
        placeholder: `Enter ${name}...`,
        widget: getDefaultWidget(type)
      }
    }
    
    // Set default configurations based on type
    if (type === 'select' || type === 'multiselect') {
      newVariable.selectConfig = { options: [{ value: 'option1', label: 'Option 1' }] }
    }
    
    onChange([...variables, newVariable])
    setExpandedVariable(name)
  }

  const removeVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index)
    onChange(newVariables)
  }

  const getDefaultWidget = (type: VariableType): 'input' | 'textarea' | 'select' | 'file' | 'date' => {
    switch (type) {
      case 'text': return 'textarea'
      case 'file': return 'file'
      case 'date':
      case 'datetime':
      case 'time': return 'date'
      case 'select':
      case 'multiselect': return 'select'
      default: return 'input'
    }
  }

  const getVariableIcon = (type: VariableType) => {
    return VARIABLE_TYPES.find(t => t.value === type)?.icon || Type
  }

  const unconfiguredVariables = extractedVariables.filter(
    name => !variables.some(v => v.name === name)
  )

  const TypeSelector = ({ variableName, onSelect }: { variableName: string, onSelect: (type: VariableType) => void }) => (
    <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
      {VARIABLE_CATEGORIES.map(category => (
        <div key={category} className="p-2">
          <div className="text-xs font-medium text-gray-500 mb-1">{category}</div>
          <div className="grid grid-cols-2 gap-1">
            {VARIABLE_TYPES.filter(t => t.category === category).map(type => {
              const Icon = type.icon
              return (
                <button
                  key={type.value}
                  onClick={() => {
                    onSelect(type.value)
                    setShowTypeSelector(null)
                  }}
                  className="flex items-center gap-2 p-2 text-left hover:bg-gray-50 rounded text-xs"
                >
                  <Icon className="w-3 h-3 text-gray-400" />
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-gray-500 text-xs">{type.description}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Variables</h3>
        <div className="text-xs text-gray-500">
          {variables.length} configured • {unconfiguredVariables.length} pending
        </div>
      </div>

      {/* Quick add unconfigured variables */}
      {unconfiguredVariables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {unconfiguredVariables.map(name => (
            <div key={name} className="relative">
              <button
                onClick={() => setShowTypeSelector(name)}
                className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
              >
                <Plus className="w-3 h-3" />
                {name}
              </button>
              {showTypeSelector === name && (
                <TypeSelector
                  variableName={name}
                  onSelect={(type) => addVariable(name, type)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Configured variables - compact list */}
      <div className="space-y-2">
        {variables.map((variable, index) => {
          const Icon = getVariableIcon(variable.type)
          const isExpanded = expandedVariable === variable.name
          const isInTemplate = extractedVariables.includes(variable.name)
          const typeInfo = VARIABLE_TYPES.find(t => t.value === variable.type)

          return (
            <div key={variable.name} className={`border rounded-lg ${isInTemplate ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
              {/* Compact header */}
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900">{variable.name}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {typeInfo?.label}
                        </span>
                        {variable.required && (
                          <span className="text-xs text-red-500">*</span>
                        )}
                        {!isInTemplate && (
                          <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                            unused
                          </span>
                        )}
                      </div>
                      {variable.description && (
                        <div className="text-xs text-gray-500 truncate">{variable.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setExpandedVariable(isExpanded ? null : variable.name)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    <button
                      onClick={() => removeVariable(index)}
                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded configuration */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-3 space-y-3">
                  {/* Quick settings row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={variable.label || ''}
                        onChange={(e) => updateVariable(index, { label: e.target.value })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Display label"
                      />
                    </div>
                    <div className="relative">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                      <button
                        onClick={() => setShowTypeSelector(showTypeSelector === variable.name ? null : variable.name)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>{typeInfo?.label}</span>
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showTypeSelector === variable.name && (
                        <TypeSelector
                          variableName={variable.name}
                          onSelect={(type) => updateVariable(index, { type })}
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={variable.description || ''}
                      onChange={(e) => updateVariable(index, { description: e.target.value })}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Help text for users"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={variable.required}
                      onChange={(e) => updateVariable(index, { required: e.target.checked })}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`required-${index}`} className="text-xs text-gray-700">
                      Required field
                    </label>
                  </div>

                  {/* Type-specific compact configurations */}
                  {(variable.type === 'select' || variable.type === 'multiselect') && (
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Options</span>
                        <button
                          onClick={() => {
                            const options = variable.selectConfig?.options || []
                            updateVariable(index, {
                              selectConfig: {
                                ...variable.selectConfig,
                                options: [...options, { value: `option${options.length + 1}`, label: `Option ${options.length + 1}` }]
                              }
                            })
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800"
                        >
                          Add Option
                        </button>
                      </div>
                      <div className="space-y-1">
                        {(variable.selectConfig?.options || []).map((option, optionIndex) => (
                          <div key={optionIndex} className="flex gap-1">
                            <input
                              type="text"
                              value={option.label}
                              onChange={(e) => {
                                const options = [...(variable.selectConfig?.options || [])]
                                options[optionIndex] = { ...option, label: e.target.value, value: e.target.value.toLowerCase() }
                                updateVariable(index, {
                                  selectConfig: { ...variable.selectConfig, options }
                                })
                              }}
                              className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                              placeholder="Option label"
                            />
                            <button
                              onClick={() => {
                                const options = (variable.selectConfig?.options || []).filter((_, i) => i !== optionIndex)
                                updateVariable(index, {
                                  selectConfig: { ...variable.selectConfig, options }
                                })
                              }}
                              className="p-1 text-red-600 hover:text-red-800"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(variable.type === 'string' || variable.type === 'text') && (
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Min Length</label>
                          <input
                            type="number"
                            min="0"
                            value={variable.stringConfig?.minLength || ''}
                            onChange={(e) => updateVariable(index, {
                              stringConfig: { ...variable.stringConfig, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Max Length</label>
                          <input
                            type="number"
                            min="1"
                            value={variable.stringConfig?.maxLength || ''}
                            onChange={(e) => updateVariable(index, {
                              stringConfig: { ...variable.stringConfig, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="∞"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(variable.type === 'integer' || variable.type === 'float') && (
                    <div className="p-2 bg-gray-50 rounded">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Min Value</label>
                          <input
                            type="number"
                            step={variable.type === 'float' ? '0.01' : '1'}
                            value={variable.numberConfig?.min ?? ''}
                            onChange={(e) => updateVariable(index, {
                              numberConfig: { ...variable.numberConfig, min: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="No limit"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Max Value</label>
                          <input
                            type="number"
                            step={variable.type === 'float' ? '0.01' : '1'}
                            value={variable.numberConfig?.max ?? ''}
                            onChange={(e) => updateVariable(index, {
                              numberConfig: { ...variable.numberConfig, max: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="No limit"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {variables.length === 0 && unconfiguredVariables.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No variables found</p>
          <p className="text-xs mt-1">Add variables like <code className="bg-gray-100 px-1 rounded">{'{{name}}'}</code> to your template</p>
        </div>
      )}
    </div>
  )
}