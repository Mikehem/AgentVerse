'use client'

import { useState, useEffect } from 'react'
import { Star, ThumbsUp, ThumbsDown, MessageSquare, Check, X, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackDefinition {
  id: string
  name: string
  description?: string
  type: 'numerical' | 'categorical'
  details: {
    min?: number
    max?: number
    categories?: Record<string, number>
  }
}

interface FeedbackScore {
  id: string
  traceId: string
  name: string
  categoryName?: string
  value: number
  reason?: string
  source: string
  createdBy: string
  createdAt: string
  lastUpdatedAt: string
}

interface TraceFeedbackProps {
  traceId: string
  projectId?: string
  initialScores?: FeedbackScore[]
  onScoresChange?: (scores: FeedbackScore[]) => void
  compact?: boolean
}

export function TraceFeedback({
  traceId,
  projectId,
  initialScores = [],
  onScoresChange,
  compact = false
}: TraceFeedbackProps) {
  const [definitions, setDefinitions] = useState<FeedbackDefinition[]>([])
  const [scores, setScores] = useState<FeedbackScore[]>(initialScores)
  const [loadingDefinitions, setLoadingDefinitions] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showScoreForm, setShowScoreForm] = useState(false)
  const [selectedDefinition, setSelectedDefinition] = useState<FeedbackDefinition | null>(null)
  const [scoreValue, setScoreValue] = useState<number | string>('')
  const [reason, setReason] = useState('')
  const [editingScore, setEditingScore] = useState<FeedbackScore | null>(null)
  const [showAllDefinitions, setShowAllDefinitions] = useState(false)

  useEffect(() => {
    loadFeedbackDefinitions()
  }, [])

  const loadFeedbackDefinitions = async () => {
    try {
      const response = await fetch('/api/v1/feedback-definitions')
      const data = await response.json()
      if (data.success && data.data) {
        setDefinitions(data.data)
      }
    } catch (error) {
      console.error('Failed to load feedback definitions:', error)
    } finally {
      setLoadingDefinitions(false)
    }
  }

  const handleStartScoring = (definition: FeedbackDefinition) => {
    setSelectedDefinition(definition)
    setScoreValue(definition.type === 'numerical' ? definition.details.min || 0 : '')
    setReason('')
    setEditingScore(null)
    setShowScoreForm(true)
  }

  const handleEditScore = (score: FeedbackScore) => {
    const definition = definitions.find(d => d.name === score.name)
    if (definition) {
      setSelectedDefinition(definition)
      setScoreValue(score.value)
      setReason(score.reason || '')
      setEditingScore(score)
      setShowScoreForm(true)
    }
  }

  const handleSubmitScore = async () => {
    if (!selectedDefinition || scoreValue === '') return

    setIsSubmitting(true)
    try {
      const scoreData = {
        traceId,
        name: selectedDefinition.name,
        value: Number(scoreValue),
        reason: reason.trim() || undefined,
        source: 'ui' as const
      }

      const url = editingScore 
        ? '/api/v1/feedback-scores'
        : '/api/v1/feedback-scores'
      
      const method = editingScore ? 'PUT' : 'POST'
      const body = editingScore 
        ? { id: editingScore.id, ...scoreData }
        : scoreData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const result = await response.json()
      if (result.success) {
        if (editingScore) {
          // Update existing score
          const updatedScores = scores.map(s => 
            s.id === editingScore.id ? result.data : s
          )
          setScores(updatedScores)
          onScoresChange?.(updatedScores)
        } else {
          // Add new score
          const newScores = [...scores, result.data]
          setScores(newScores)
          onScoresChange?.(newScores)
        }
        handleCancelScore()
      } else {
        console.error('Failed to submit score:', result.error)
      }
    } catch (error) {
      console.error('Error submitting score:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteScore = async (score: FeedbackScore) => {
    if (!confirm(`Are you sure you want to delete the "${score.name}" score?`)) {
      return
    }

    try {
      const response = await fetch(`/api/v1/feedback-scores?id=${score.id}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      if (result.success) {
        const updatedScores = scores.filter(s => s.id !== score.id)
        setScores(updatedScores)
        onScoresChange?.(updatedScores)
      }
    } catch (error) {
      console.error('Failed to delete score:', error)
    }
  }

  const handleCancelScore = () => {
    setShowScoreForm(false)
    setSelectedDefinition(null)
    setScoreValue('')
    setReason('')
    setEditingScore(null)
  }

  const getExistingScore = (definitionName: string) => {
    return scores.find(s => s.name === definitionName)
  }

  // Smart categorization of feedback definitions
  const categorizeDefinitions = () => {
    const commonDefinitions = definitions.filter(def => 
      ['accuracy', 'relevance', 'helpfulness', 'quality', 'satisfaction', 'clarity', 'correctness'].some(keyword =>
        def.name.toLowerCase().includes(keyword)
      )
    )
    
    const otherDefinitions = definitions.filter(def => 
      !commonDefinitions.some(common => common.id === def.id)
    )
    
    return { commonDefinitions, otherDefinitions }
  }

  const { commonDefinitions, otherDefinitions } = categorizeDefinitions()
  const availableDefinitions = showAllDefinitions ? definitions : commonDefinitions

  const renderScoreValue = (score: FeedbackScore, definition: FeedbackDefinition) => {
    if (definition.type === 'numerical') {
      return (
        <span className="text-lg font-semibold text-primary">
          {score.value}
        </span>
      )
    } else {
      // Find category name for the score value
      const categories = definition.details.categories || {}
      const categoryName = Object.keys(categories).find(
        key => categories[key] === score.value
      )
      return (
        <span className="text-sm font-medium text-primary">
          {categoryName || score.value}
        </span>
      )
    }
  }

  const renderScoreInput = () => {
    if (!selectedDefinition) return null

    if (selectedDefinition.type === 'numerical') {
      const min = selectedDefinition.details.min || 0
      const max = selectedDefinition.details.max || 10
      
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Score ({min} - {max})
          </label>
          <input
            type="number"
            min={min}
            max={max}
            value={scoreValue}
            onChange={(e) => setScoreValue(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      )
    } else {
      const categories = selectedDefinition.details.categories || {}
      
      return (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={scoreValue}
            onChange={(e) => setScoreValue(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Select a category</option>
            {Object.entries(categories).map(([name, value]) => (
              <option key={name} value={value}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {scores.map((score) => {
          const definition = definitions.find(d => d.name === score.name)
          if (!definition) return null
          
          return (
            <div key={score.id} className="flex items-center gap-2 px-2 py-1 bg-gray-100 rounded-md text-sm">
              <span className="text-gray-600">{score.name}:</span>
              {renderScoreValue(score, definition)}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-700">Feedback Scores</h4>
        {!showScoreForm && (
          <button
            onClick={() => setShowScoreForm(true)}
            className="text-sm text-primary hover:text-primary-dark"
          >
            Add Score
          </button>
        )}
      </div>

      {/* Existing Scores */}
      {scores.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {scores.map((score) => {
            const definition = definitions.find(d => d.name === score.name)
            if (!definition) return null
            
            return (
              <div key={score.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-gray-900">{score.name}</div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditScore(score)}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit score"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteScore(score)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete score"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                  {renderScoreValue(score, definition)}
                  <span className="text-xs text-gray-500">
                    {definition.type === 'numerical' 
                      ? `/ ${definition.details.max}` 
                      : 'category'
                    }
                  </span>
                </div>
                
                {score.reason && (
                  <div className="text-xs text-gray-600">{score.reason}</div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Score Form */}
      {showScoreForm && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h5 className="font-medium text-gray-900 mb-3">
            {editingScore ? 'Edit Score' : 'Add New Score'}
          </h5>
          
          {!editingScore && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Feedback Definition
              </label>
              
              {/* Common/Suggested Definitions */}
              {commonDefinitions.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                    Suggested for this project
                  </div>
                  <select
                    value={selectedDefinition?.id || ''}
                    onChange={(e) => {
                      const def = commonDefinitions.find(d => d.id === e.target.value)
                      if (def) handleStartScoring(def)
                    }}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">Select a common feedback type</option>
                    {commonDefinitions
                      .filter(def => !getExistingScore(def.name))
                      .map((def) => (
                        <option key={def.id} value={def.id}>
                          {def.name} ({def.type})
                        </option>
                      ))
                    }
                  </select>
                </div>
              )}
              
              {/* Show All Definitions Option */}
              {otherDefinitions.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAllDefinitions(!showAllDefinitions)}
                    className="text-sm text-primary hover:text-primary-dark mb-2 flex items-center gap-1"
                  >
                    {showAllDefinitions ? '− Show fewer options' : '+ Show all feedback types'}
                  </button>
                  
                  {showAllDefinitions && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                        All available definitions
                      </div>
                      <select
                        value={selectedDefinition?.id || ''}
                        onChange={(e) => {
                          const def = definitions.find(d => d.id === e.target.value)
                          if (def) handleStartScoring(def)
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        <option value="">Select any feedback definition</option>
                        {definitions
                          .filter(def => !getExistingScore(def.name))
                          .map((def) => (
                            <option key={def.id} value={def.id}>
                              {def.name} ({def.type})
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {selectedDefinition && (
            <>
              {renderScoreInput()}
              
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Reason (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why did you give this score?"
                  className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={2}
                />
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleSubmitScore}
                  disabled={isSubmitting || scoreValue === ''}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition-colors disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                  {isSubmitting ? 'Saving...' : editingScore ? 'Update' : 'Submit'}
                </button>
                <button
                  onClick={handleCancelScore}
                  disabled={isSubmitting}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {loadingDefinitions && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
          <span className="text-xs text-gray-500 mt-1">Loading feedback definitions...</span>
        </div>
      )}

      {!loadingDefinitions && definitions.length === 0 && (
        <div className="text-center py-4 text-sm text-gray-500">
          No feedback definitions available. Create some in the admin section.
        </div>
      )}
    </div>
  )
}