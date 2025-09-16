'use client'

import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  className?: string
}

export function TagInput({ value, onChange, placeholder = "Add tags...", className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(value.length - 1)
    }
  }

  const addTag = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue])
      setInputValue('')
    }
  }

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index)
    onChange(newTags)
  }

  const handleContainerClick = () => {
    // Focus the input when container is clicked
    const input = document.querySelector('.tag-input-field') as HTMLInputElement
    input?.focus()
  }

  return (
    <div 
      className={cn(
        "flex flex-wrap gap-2 items-center bg-card border border-light rounded-md p-3 min-h-12 cursor-text",
        className
      )}
      onClick={handleContainerClick}
    >
      {value.map((tag, index) => (
        <div
          key={index}
          className="flex items-center gap-1 bg-secondary text-inverse px-2 py-1 rounded text-xs font-medium"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeTag(index)
            }}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={value.length === 0 ? placeholder : ''}
        className="tag-input-field flex-1 min-w-24 bg-transparent outline-none text-sm"
      />
    </div>
  )
}