'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Star, MessageSquare, Check, X, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FeedbackData {
  score: number // -1 = thumbs down, 0 = neutral, 1 = thumbs up
  comment?: string
  category?: string
  timestamp: string
  updated_at: string
  metadata?: Record<string, any>
  history?: Array<{
    score: number
    comment?: string
    category?: string
    timestamp: string
    replaced_at: string
  }>
}

interface ConversationFeedbackProps {
  conversationId: string
  initialFeedback?: FeedbackData | null
  onFeedbackChange?: (feedback: FeedbackData) => void
  compact?: boolean
  showHistory?: boolean
}

export function ConversationFeedback({
  conversationId,
  initialFeedback,
  onFeedbackChange,
  compact = false,
  showHistory = false
}: ConversationFeedbackProps) {
  const [feedback, setFeedback] = useState<FeedbackData | null>(initialFeedback || null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCommentBox, setShowCommentBox] = useState(false)
  const [comment, setComment] = useState('')

  const handleFeedbackSubmit = async (score: number, feedbackComment?: string) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score,
          comment: feedbackComment,
          category: 'general'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFeedback(result.data)
        onFeedbackChange?.(result.data)
        setShowCommentBox(false)
        setComment('')
      } else {
        console.error('Failed to submit feedback:', result.error)
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleThumbsUp = () => {
    handleFeedbackSubmit(1)
  }

  const handleThumbsDown = () => {
    setShowCommentBox(true)
  }

  const handleCommentSubmit = () => {
    if (currentScore) {
      // Update existing feedback
      handleUpdateFeedback(currentScore, comment)
    } else {
      // Create new negative feedback
      handleFeedbackSubmit(-1, comment)
    }
  }

  const handleCommentCancel = () => {
    setShowCommentBox(false)
    setComment('')
  }

  const handleUpdateFeedback = async (score: number, feedbackComment?: string) => {
    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/feedback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          score,
          comment: feedbackComment,
          category: 'general'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFeedback(result.data)
        onFeedbackChange?.(result.data)
        setShowCommentBox(false)
        setComment('')
      } else {
        console.error('Failed to update feedback:', result.error)
      }
    } catch (error) {
      console.error('Error updating feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteFeedback = async () => {
    if (!confirm('Are you sure you want to delete your feedback?')) {
      return
    }

    setIsSubmitting(true)
    
    try {
      const response = await fetch(`/api/v1/conversations/${conversationId}/feedback`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        setFeedback(null)
        onFeedbackChange?.(null)
      } else {
        console.error('Failed to delete feedback:', result.error)
      }
    } catch (error) {
      console.error('Error deleting feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentScore = feedback?.score

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {currentScore ? (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {currentScore === 1 ? (
              <ThumbsUp className="w-3 h-3 text-green-600" />
            ) : currentScore === -1 ? (
              <ThumbsDown className="w-3 h-3 text-red-600" />
            ) : (
              <Star className="w-3 h-3 text-yellow-600" />
            )}
            <span>Rated</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={handleThumbsUp}
              disabled={isSubmitting}
              className="p-1 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              title="Good response"
            >
              <ThumbsUp className="w-3 h-3" />
            </button>
            <button
              onClick={handleThumbsDown}
              disabled={isSubmitting}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
              title="Poor response"
            >
              <ThumbsDown className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">How was this response?</h4>
        {currentScore && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {currentScore === 1 ? (
                <>
                  <ThumbsUp className="w-4 h-4 text-green-600" />
                  <span>Helpful</span>
                </>
              ) : currentScore === -1 ? (
                <>
                  <ThumbsDown className="w-4 h-4 text-red-600" />
                  <span>Not helpful</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 text-yellow-600" />
                  <span>Neutral</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setShowCommentBox(true)
                  setComment(feedback?.comment || '')
                }}
                disabled={isSubmitting}
                className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50"
                title="Edit feedback"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={handleDeleteFeedback}
                disabled={isSubmitting}
                className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                title="Delete feedback"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {!currentScore && !showCommentBox && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleThumbsUp}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg border border-gray-200 hover:border-green-200 transition-colors disabled:opacity-50"
          >
            <ThumbsUp className="w-4 h-4" />
            <span>Helpful</span>
          </button>
          
          <button
            onClick={handleThumbsDown}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 hover:border-red-200 transition-colors disabled:opacity-50"
          >
            <ThumbsDown className="w-4 h-4" />
            <span>Not helpful</span>
          </button>

          <button
            onClick={() => setShowCommentBox(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-200 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Add comment</span>
          </button>
        </div>
      )}

      {showCommentBox && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="mb-3">
            <label htmlFor="feedback-comment" className="block text-xs font-medium text-gray-700 mb-1">
              Tell us more about your experience (optional)
            </label>
            <textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What could be improved?"
              className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCommentSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary-dark rounded-md transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              Submit
            </button>
            <button
              onClick={handleCommentCancel}
              disabled={isSubmitting}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 bg-white border border-gray-300 hover:bg-gray-50 rounded-md transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {currentScore && feedback?.comment && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs font-medium text-gray-700 mb-1">Your feedback:</div>
          <div className="text-sm text-gray-600">{feedback.comment}</div>
        </div>
      )}

      {showHistory && feedback?.history && feedback.history.length > 1 && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="text-xs font-medium text-gray-700 mb-2">Feedback History</div>
          <div className="space-y-2">
            {feedback.history.slice(-3).map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs text-gray-500">
                {item.score === 1 ? (
                  <ThumbsUp className="w-3 h-3 text-green-600" />
                ) : item.score === -1 ? (
                  <ThumbsDown className="w-3 h-3 text-red-600" />
                ) : (
                  <Star className="w-3 h-3 text-yellow-600" />
                )}
                <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                {item.comment && <span>- {item.comment.slice(0, 50)}...</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}