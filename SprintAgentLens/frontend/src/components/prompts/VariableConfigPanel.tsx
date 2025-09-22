'use client'

import { useState } from 'react'
import { Plus, X, Settings, Type, Hash, List, Calendar, Mail, Link, FileText, ToggleLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { VariableDefinition, VariableType, ListSubType, FileSubType } from '@/lib/types/variables'

interface VariableConfigPanelProps {
  variables: VariableDefinition[]
  onChange: (variables: VariableDefinition[]) => void
  extractedVariables: string[] // Variables found in template
}

const VARIABLE_TYPES: { value: VariableType; label: string; icon: any; description: string }[] = [
  { value: 'string', label: 'Text', icon: Type, description: 'Single line text input' },
  { value: 'integer', label: 'Integer', icon: Hash, description: 'Whole numbers only' },
  { value: 'float', label: 'Number', icon: Hash, description: 'Decimal numbers' },
  { value: 'boolean', label: 'Boolean', icon: ToggleLeft, description: 'True/false toggle' },
  { value: 'list', label: 'List', icon: List, description: 'Multiple items of the same type' },
  { value: 'file', label: 'File', icon: FileText, description: 'File upload' },
  { value: 'date', label: 'Date', icon: Calendar, description: 'Date/time picker' },
  { value: 'email', label: 'Email', icon: Mail, description: 'Email address' },
  { value: 'url', label: 'URL', icon: Link, description: 'Web address' },
]

const LIST_SUBTYPES: { value: ListSubType; label: string }[] = [
  { value: 'string', label: 'Text items' },
  { value: 'integer', label: 'Integer items' },
  { value: 'float', label: 'Number items' },
  { value: 'boolean', label: 'Boolean items' },
]

const FILE_SUBTYPES: { value: FileSubType; label: string }[] = [
  { value: 'any', label: 'Any file type' },
  { value: 'json', label: 'JSON files' },
  { value: 'csv', label: 'CSV files' },
  { value: 'pdf', label: 'PDF files' },
  { value: 'txt', label: 'Text files' },
  { value: 'image', label: 'Image files' },
]

export function VariableConfigPanel({ variables, onChange, extractedVariables }: VariableConfigPanelProps) {
  const [expandedVariable, setExpandedVariable] = useState<string | null>(null)

  const updateVariable = (index: number, updates: Partial<VariableDefinition>) => {
    const newVariables = [...variables]
    newVariables[index] = { ...newVariables[index], ...updates }
    onChange(newVariables)
  }

  const addVariable = (name: string) => {
    const newVariable: VariableDefinition = {
      name,
      type: 'string',
      label: name.charAt(0).toUpperCase() + name.slice(1),
      description: '',
      required: true,
      uiHints: {
        placeholder: `Enter ${name}...`,
        widget: 'input'
      }
    }
    onChange([...variables, newVariable])
  }

  const removeVariable = (index: number) => {
    const newVariables = variables.filter((_, i) => i !== index)
    onChange(newVariables)
  }

  const getVariableIcon = (type: VariableType) => {
    return VARIABLE_TYPES.find(t => t.value === type)?.icon || Type
  }

  // Find variables in template that don't have definitions yet
  const unconfiguredVariables = extractedVariables.filter(
    name => !variables.some(v => v.name === name)
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-primary">Variable Configuration</h3>
        <div className="text-sm text-muted">
          {variables.length} configured, {unconfiguredVariables.length} pending
        </div>
      </div>

      {/* Unconfigured variables */}
      {unconfiguredVariables.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-800">Variables found in template</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unconfiguredVariables.map(name => (
              <button
                key={name}
                onClick={() => addVariable(name)}
                className="flex items-center gap-1 px-3 py-1 bg-white border border-amber-300 rounded-md hover:bg-amber-50 text-sm"
              >
                <Plus className="w-3 h-3" />
                Configure {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Configured variables */}
      <div className="space-y-3">
        {variables.map((variable, index) => {
          const Icon = getVariableIcon(variable.type)
          const isExpanded = expandedVariable === variable.name
          const isInTemplate = extractedVariables.includes(variable.name)

          return (
            <div key={variable.name} className={`border rounded-lg ${isInTemplate ? 'border-green-200 bg-green-50' : 'border-border bg-white'}`}>
              {/* Variable header */}
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted" />
                    <div>
                      <div className="font-medium text-primary">{variable.name}</div>
                      <div className="text-sm text-muted">
                        {VARIABLE_TYPES.find(t => t.value === variable.type)?.label}
                        {variable.type === 'list' && variable.listConfig && ` of ${variable.listConfig.subType}s`}
                        {variable.type === 'file' && variable.fileConfig && variable.fileConfig.subType !== 'any' && ` (${variable.fileConfig.subType})`}
                      </div>
                    </div>
                    {!isInTemplate && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">
                        Not in template
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setExpandedVariable(isExpanded ? null : variable.name)}
                      className="p-1 hover:bg-accent rounded"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => removeVariable(index)}
                      className="p-1 hover:bg-red-50 text-red-600 rounded"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded configuration */}
              {isExpanded && (
                <div className="border-t border-border p-4 space-y-4">
                  {/* Basic settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Label</label>
                      <input
                        type="text"
                        value={variable.label || ''}
                        onChange={(e) => updateVariable(index, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Display label"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Type</label>
                      <select
                        value={variable.type}
                        onChange={(e) => updateVariable(index, { type: e.target.value as VariableType })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {VARIABLE_TYPES.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Description</label>
                    <input
                      type="text"
                      value={variable.description || ''}
                      onChange={(e) => updateVariable(index, { description: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Help text for users"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`required-${index}`}
                      checked={variable.required}
                      onChange={(e) => updateVariable(index, { required: e.target.checked })}
                      className="rounded border-border focus:ring-2 focus:ring-primary"
                    />
                    <label htmlFor={`required-${index}`} className="text-sm text-primary">
                      Required field
                    </label>
                  </div>

                  {/* Type-specific configuration */}
                  {variable.type === 'list' && (
                    <div className="p-3 bg-accent rounded-lg">
                      <h4 className="font-medium text-primary mb-3">List Configuration</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Item Type</label>
                          <select
                            value={variable.listConfig?.subType || 'string'}
                            onChange={(e) => updateVariable(index, {
                              listConfig: { ...variable.listConfig, subType: e.target.value as ListSubType }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            {LIST_SUBTYPES.map(subType => (
                              <option key={subType.value} value={subType.value}>
                                {subType.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Min Items</label>
                          <input
                            type="number"
                            min="0"
                            value={variable.listConfig?.minItems || ''}
                            onChange={(e) => updateVariable(index, {
                              listConfig: { ...variable.listConfig, minItems: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Max Items</label>
                          <input
                            type="number"
                            min="1"
                            value={variable.listConfig?.maxItems || ''}
                            onChange={(e) => updateVariable(index, {
                              listConfig: { ...variable.listConfig, maxItems: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="∞"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {variable.type === 'file' && (
                    <div className="p-3 bg-accent rounded-lg">
                      <h4 className="font-medium text-primary mb-3">File Configuration</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">File Type</label>
                          <select
                            value={variable.fileConfig?.subType || 'any'}
                            onChange={(e) => updateVariable(index, {
                              fileConfig: { ...variable.fileConfig, subType: e.target.value as FileSubType }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          >
                            {FILE_SUBTYPES.map(subType => (
                              <option key={subType.value} value={subType.value}>
                                {subType.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Max Size (KB)</label>
                          <input
                            type="number"
                            min="1"
                            value={variable.fileConfig?.maxSizeKB || ''}
                            onChange={(e) => updateVariable(index, {
                              fileConfig: { ...variable.fileConfig, maxSizeKB: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="1024"
                          />
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`multiple-${index}`}
                            checked={variable.fileConfig?.allowMultiple || false}
                            onChange={(e) => updateVariable(index, {
                              fileConfig: { ...variable.fileConfig, allowMultiple: e.target.checked }
                            })}
                            className="rounded border-border focus:ring-2 focus:ring-primary"
                          />
                          <label htmlFor={`multiple-${index}`} className="text-sm text-primary">
                            Allow multiple files
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {(variable.type === 'string' || variable.type === 'email' || variable.type === 'url') && (
                    <div className="p-3 bg-accent rounded-lg">
                      <h4 className="font-medium text-primary mb-3">Text Configuration</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Min Length</label>
                          <input
                            type="number"
                            min="0"
                            value={variable.stringConfig?.minLength || ''}
                            onChange={(e) => updateVariable(index, {
                              stringConfig: { ...variable.stringConfig, minLength: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Max Length</label>
                          <input
                            type="number"
                            min="1"
                            value={variable.stringConfig?.maxLength || ''}
                            onChange={(e) => updateVariable(index, {
                              stringConfig: { ...variable.stringConfig, maxLength: e.target.value ? parseInt(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="∞"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {(variable.type === 'integer' || variable.type === 'float') && (
                    <div className="p-3 bg-accent rounded-lg">
                      <h4 className="font-medium text-primary mb-3">Number Configuration</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Minimum</label>
                          <input
                            type="number"
                            step={variable.type === 'float' ? '0.01' : '1'}
                            value={variable.numberConfig?.min ?? ''}
                            onChange={(e) => updateVariable(index, {
                              numberConfig: { ...variable.numberConfig, min: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="No limit"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">Maximum</label>
                          <input
                            type="number"
                            step={variable.type === 'float' ? '0.01' : '1'}
                            value={variable.numberConfig?.max ?? ''}
                            onChange={(e) => updateVariable(index, {
                              numberConfig: { ...variable.numberConfig, max: e.target.value ? Number(e.target.value) : undefined }
                            })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            placeholder="No limit"
                          />
                        </div>
                        {variable.type === 'float' && (
                          <div>
                            <label className="block text-sm font-medium text-primary mb-2">Step</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={variable.numberConfig?.step ?? ''}
                              onChange={(e) => updateVariable(index, {
                                numberConfig: { ...variable.numberConfig, step: e.target.value ? Number(e.target.value) : undefined }
                              })}
                              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="0.01"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* UI Hints */}
                  <div className="p-3 bg-accent rounded-lg">
                    <h4 className="font-medium text-primary mb-3">UI Settings</h4>
                    <div>
                      <label className="block text-sm font-medium text-primary mb-2">Placeholder</label>
                      <input
                        type="text"
                        value={variable.uiHints?.placeholder || ''}
                        onChange={(e) => updateVariable(index, {
                          uiHints: { ...variable.uiHints, placeholder: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder={`Enter ${variable.name}...`}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {variables.length === 0 && unconfiguredVariables.length === 0 && (
        <div className="text-center py-8 text-muted">
          <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No variables found in template</p>
          <p className="text-sm mt-1">Add variables like <code className="bg-accent px-1 rounded">{'{{name}}'}</code> to your template</p>
        </div>
      )}
    </div>
  )
}