'use client'

import { useState } from 'react'
import { Plus, X, Upload, Calendar } from 'lucide-react'
import { VariableDefinition, VariableValidationError } from '@/lib/types/variables'

interface TypedVariableInputProps {
  definition: VariableDefinition
  value: any
  onChange: (value: any) => void
  error?: VariableValidationError
}

export function TypedVariableInput({ definition, value, onChange, error }: TypedVariableInputProps) {
  const [listItems, setListItems] = useState<any[]>(Array.isArray(value) ? value : [])

  const updateListItems = (items: any[]) => {
    setListItems(items)
    onChange(items)
  }

  const addListItem = () => {
    const defaultValue = getDefaultValueForSubType(definition.listConfig?.subType || 'string')
    updateListItems([...listItems, defaultValue])
  }

  const updateListItem = (index: number, newValue: any) => {
    const newItems = [...listItems]
    newItems[index] = newValue
    updateListItems(newItems)
  }

  const removeListItem = (index: number) => {
    updateListItems(listItems.filter((_, i) => i !== index))
  }

  const getDefaultValueForSubType = (subType: string) => {
    switch (subType) {
      case 'integer':
      case 'float':
        return 0
      case 'boolean':
        return false
      case 'string':
      default:
        return ''
    }
  }

  const renderInput = () => {
    switch (definition.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            minLength={definition.stringConfig?.minLength}
            maxLength={definition.stringConfig?.maxLength}
            pattern={definition.stringConfig?.pattern}
          />
        )

      case 'text':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={3}
            minLength={definition.stringConfig?.minLength}
            maxLength={definition.stringConfig?.maxLength}
          />
        )

      case 'password':
        return (
          <input
            type="password"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            minLength={definition.stringConfig?.minLength}
            maxLength={definition.stringConfig?.maxLength}
          />
        )

      case 'phone':
        return (
          <input
            type="tel"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder || '+1 (555) 123-4567'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )

      case 'color':
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => onChange(e.target.value)}
              className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
            />
            <input
              type="text"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              placeholder="#000000"
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
            />
          </div>
        )

      case 'json':
        return (
          <textarea
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value)
                onChange(parsed)
              } catch {
                onChange(e.target.value)
              }
            }}
            placeholder='{"key": "value"}'
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            rows={4}
          />
        )

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">Choose an option...</option>
            {(definition.selectConfig?.options || []).map((option, index) => (
              <option key={index} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-2">
            {(definition.selectConfig?.options || []).map((option, index) => (
              <label key={index} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValue = value || []
                    if (e.target.checked) {
                      onChange([...currentValue, option.value])
                    } else {
                      onChange(currentValue.filter((v: any) => v !== option.value))
                    }
                  }}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )

      case 'datetime':
        return (
          <input
            type="datetime-local"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            min={definition.dateConfig?.minDate}
            max={definition.dateConfig?.maxDate}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )

      case 'integer':
        return (
          <input
            type="number"
            step="1"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : '')}
            placeholder={definition.uiHints?.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            min={definition.numberConfig?.min}
            max={definition.numberConfig?.max}
          />
        )

      case 'float':
        return (
          <input
            type="number"
            step={definition.numberConfig?.step || 0.01}
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : '')}
            placeholder={definition.uiHints?.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            min={definition.numberConfig?.min}
            max={definition.numberConfig?.max}
          />
        )

      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <label className="flex items-center">
              <input
                type="radio"
                name={`${definition.name}-bool`}
                checked={value === true}
                onChange={() => onChange(true)}
                className="mr-2"
              />
              True
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`${definition.name}-bool`}
                checked={value === false}
                onChange={() => onChange(false)}
                className="mr-2"
              />
              False
            </label>
          </div>
        )

      case 'list':
        return (
          <div className="space-y-2">
            {listItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="flex-1">
                  {definition.listConfig?.subType === 'string' && (
                    <input
                      type="text"
                      value={item || ''}
                      onChange={(e) => updateListItem(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {definition.listConfig?.subType === 'integer' && (
                    <input
                      type="number"
                      step="1"
                      value={item || ''}
                      onChange={(e) => updateListItem(index, e.target.value ? parseInt(e.target.value) : '')}
                      placeholder={`Item ${index + 1}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {definition.listConfig?.subType === 'float' && (
                    <input
                      type="number"
                      step="0.01"
                      value={item || ''}
                      onChange={(e) => updateListItem(index, e.target.value ? parseFloat(e.target.value) : '')}
                      placeholder={`Item ${index + 1}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}
                  {definition.listConfig?.subType === 'boolean' && (
                    <select
                      value={item ? 'true' : 'false'}
                      onChange={(e) => updateListItem(index, e.target.value === 'true')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </select>
                  )}
                </div>
                <button
                  onClick={() => removeListItem(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={addListItem}
              className="flex items-center gap-2 px-3 py-2 text-primary border border-dashed border-primary rounded-lg hover:bg-accent"
              disabled={definition.listConfig?.maxItems && listItems.length >= definition.listConfig.maxItems}
            >
              <Plus className="w-4 h-4" />
              Add item
            </button>
            {definition.listConfig?.minItems && listItems.length < definition.listConfig.minItems && (
              <p className="text-sm text-amber-600">
                Minimum {definition.listConfig.minItems} items required
              </p>
            )}
          </div>
        )

      case 'file':
        return (
          <div className="space-y-2">
            <input
              type="file"
              onChange={(e) => {
                const files = e.target.files
                if (definition.fileConfig?.allowMultiple) {
                  onChange(files ? Array.from(files) : [])
                } else {
                  onChange(files?.[0] || null)
                }
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              accept={getFileAccept(definition.fileConfig?.subType)}
              multiple={definition.fileConfig?.allowMultiple}
            />
            {definition.fileConfig?.subType && definition.fileConfig.subType !== 'any' && (
              <p className="text-sm text-muted">
                Accepts {definition.fileConfig.subType.toUpperCase()} files only
              </p>
            )}
            {definition.fileConfig?.maxSizeKB && (
              <p className="text-sm text-muted">
                Maximum file size: {definition.fileConfig.maxSizeKB} KB
              </p>
            )}
          </div>
        )

      case 'date':
        const inputType = definition.dateConfig?.format === 'time' ? 'time' 
          : definition.dateConfig?.format === 'datetime' ? 'datetime-local' 
          : 'date'
        
        return (
          <div className="relative">
            <input
              type={inputType}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                error ? 'border-red-500' : 'border-gray-300'
              }`}
              min={definition.dateConfig?.minDate}
              max={definition.dateConfig?.maxDate}
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          </div>
        )

      case 'email':
        return (
          <input
            type="email"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder || 'user@example.com'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )

      case 'url':
        return (
          <input
            type="url"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder || 'https://example.com'}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={definition.uiHints?.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )
    }
  }

  const getFileAccept = (subType?: string) => {
    switch (subType) {
      case 'json':
        return '.json,application/json'
      case 'csv':
        return '.csv,text/csv'
      case 'pdf':
        return '.pdf,application/pdf'
      case 'txt':
        return '.txt,text/plain'
      case 'image':
        return 'image/*'
      default:
        return undefined
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-primary">
          {definition.label || definition.name}
          {definition.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <span className="text-xs text-muted bg-accent px-2 py-1 rounded">
          {definition.type}
          {definition.type === 'list' && definition.listConfig && ` of ${definition.listConfig.subType}s`}
        </span>
      </div>
      
      {definition.description && (
        <p className="text-sm text-muted">{definition.description}</p>
      )}
      
      {renderInput()}
      
      {error && (
        <p className="text-sm text-red-600">{error.message}</p>
      )}
      
      {definition.uiHints?.helpText && (
        <p className="text-xs text-muted">{definition.uiHints.helpText}</p>
      )}
    </div>
  )
}