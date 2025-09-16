'use client'

import { useState, useEffect } from 'react'
import { Tag, Plus, X, Edit, Save, MessageSquare, Hash, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConversationTagsProps {
  conversationId: string
  initialTags?: string[]
  initialAnnotations?: Record<string, any>
  onTagsChange?: (tags: string[], annotations: Record<string, any>) => void
  readonly?: boolean
  compact?: boolean
}

export function ConversationTags({
  conversationId,
  initialTags = [],
  initialAnnotations = {},
  onTagsChange,
  readonly = false,
  compact = false
}: ConversationTagsProps) {
  const [tags, setTags] = useState<string[]>(initialTags)
  const [annotations, setAnnotations] = useState<Record<string, any>>(initialAnnotations)
  const [isLoading, setIsLoading] = useState(false)
  const [showAddTag, setShowAddTag] = useState(false)
  const [showAddAnnotation, setShowAddAnnotation] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [newAnnotationKey, setNewAnnotationKey] = useState('')
  const [newAnnotationValue, setNewAnnotationValue] = useState('')
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null)
  const [editAnnotationValue, setEditAnnotationValue] = useState('')

  // Load tags and annotations on mount
  useEffect(() => {
    if (conversationId) {
      fetchTagsAndAnnotations()
    }
  }, [conversationId])

  const fetchTagsAndAnnotations = async () => {
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/tags`)
      const result = await response.json()
      
      if (result.success) {
        setTags(result.data.tags || [])
        setAnnotations(result.data.annotations || {})
      }
    } catch (error) {
      console.error('Error fetching tags and annotations:', error)
    }
  }

  const addTag = async () => {
    if (!newTag.trim() || tags.includes(newTag.trim())) {
      setNewTag('')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [newTag.trim()] })
      })

      const result = await response.json()
      if (result.success) {
        setTags(result.data.tags)
        setAnnotations(result.data.annotations)
        setNewTag('')
        setShowAddTag(false)
        onTagsChange?.(result.data.tags, result.data.annotations)
      }
    } catch (error) {
      console.error('Error adding tag:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeTag = async (tagToRemove: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/tags?tag=${encodeURIComponent(tagToRemove)}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        setTags(result.data.tags)
        setAnnotations(result.data.annotations)
        onTagsChange?.(result.data.tags, result.data.annotations)
      }
    } catch (error) {
      console.error('Error removing tag:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addAnnotation = async () => {
    if (!newAnnotationKey.trim() || !newAnnotationValue.trim()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotations: {
            [newAnnotationKey.trim()]: newAnnotationValue.trim()
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setTags(result.data.tags)
        setAnnotations(result.data.annotations)
        setNewAnnotationKey('')
        setNewAnnotationValue('')
        setShowAddAnnotation(false)
        onTagsChange?.(result.data.tags, result.data.annotations)
      }
    } catch (error) {
      console.error('Error adding annotation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateAnnotation = async (key: string, value: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotations: {
            [key]: value
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setTags(result.data.tags)
        setAnnotations(result.data.annotations)
        setEditingAnnotation(null)
        setEditAnnotationValue('')
        onTagsChange?.(result.data.tags, result.data.annotations)
      }
    } catch (error) {
      console.error('Error updating annotation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeAnnotation = async (key: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/tags?annotation=${encodeURIComponent(key)}`, {
        method: 'DELETE'
      })

      const result = await response.json()
      if (result.success) {
        setTags(result.data.tags)
        setAnnotations(result.data.annotations)
        onTagsChange?.(result.data.tags, result.data.annotations)
      }
    } catch (error) {
      console.error('Error removing annotation:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getTagColor = (tag: string) => {
    // Simple hash-based color assignment
    let hash = 0
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash)
    }
    
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200'
    ]
    
    return colors[Math.abs(hash) % colors.length]
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {tags.length > 0 && (
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600">{tags.length}</span>
          </div>
        )}
        {Object.keys(annotations).length > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-gray-400" />
            <span className="text-gray-600">{Object.keys(annotations).length}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tags Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-700">Tags</h4>
          </div>
          {!readonly && (
            <button
              onClick={() => setShowAddTag(!showAddTag)}
              disabled={isLoading}
              className="text-xs text-primary hover:text-primary-dark disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
                getTagColor(tag)
              )}
            >
              <Hash className="w-2.5 h-2.5" />
              {tag}
              {!readonly && (
                <button
                  onClick={() => removeTag(tag)}
                  disabled={isLoading}
                  className="ml-1 hover:text-red-600 disabled:opacity-50"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </span>
          ))}

          {showAddTag && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="Enter tag"
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                autoFocus
              />
              <button
                onClick={addTag}
                disabled={isLoading || !newTag.trim()}
                className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
              >
                <Save className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  setShowAddTag(false)
                  setNewTag('')
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {tags.length === 0 && !showAddTag && (
          <p className="text-xs text-gray-500 italic">No tags added yet</p>
        )}
      </div>

      {/* Annotations Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-600" />
            <h4 className="text-sm font-medium text-gray-700">Annotations</h4>
          </div>
          {!readonly && (
            <button
              onClick={() => setShowAddAnnotation(!showAddAnnotation)}
              disabled={isLoading}
              className="text-xs text-primary hover:text-primary-dark disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="space-y-2">
          {Object.entries(annotations).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-700">{key}:</div>
                {editingAnnotation === key ? (
                  <input
                    type="text"
                    value={editAnnotationValue}
                    onChange={(e) => setEditAnnotationValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        updateAnnotation(key, editAnnotationValue)
                      } else if (e.key === 'Escape') {
                        setEditingAnnotation(null)
                        setEditAnnotationValue('')
                      }
                    }}
                    className="mt-1 w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                    autoFocus
                  />
                ) : (
                  <div className="text-xs text-gray-600 truncate">{String(value)}</div>
                )}
              </div>
              {!readonly && (
                <div className="flex items-center gap-1 ml-2">
                  {editingAnnotation === key ? (
                    <>
                      <button
                        onClick={() => updateAnnotation(key, editAnnotationValue)}
                        disabled={isLoading}
                        className="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingAnnotation(null)
                          setEditAnnotationValue('')
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingAnnotation(key)
                          setEditAnnotationValue(String(value))
                        }}
                        disabled={isLoading}
                        className="p-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeAnnotation(key)}
                        disabled={isLoading}
                        className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}

          {showAddAnnotation && (
            <div className="p-2 bg-gray-50 rounded-md">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newAnnotationKey}
                  onChange={(e) => setNewAnnotationKey(e.target.value)}
                  placeholder="Key"
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="text"
                  value={newAnnotationValue}
                  onChange={(e) => setNewAnnotationValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addAnnotation()}
                  placeholder="Value"
                  className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center justify-end gap-1 mt-2">
                <button
                  onClick={addAnnotation}
                  disabled={isLoading || !newAnnotationKey.trim() || !newAnnotationValue.trim()}
                  className="px-2 py-1 text-xs text-green-600 hover:text-green-700 disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                </button>
                <button
                  onClick={() => {
                    setShowAddAnnotation(false)
                    setNewAnnotationKey('')
                    setNewAnnotationValue('')
                  }}
                  className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {Object.keys(annotations).length === 0 && !showAddAnnotation && (
          <p className="text-xs text-gray-500 italic">No annotations added yet</p>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <AlertCircle className="w-3 h-3 animate-spin" />
          Updating...
        </div>
      )}
    </div>
  )
}