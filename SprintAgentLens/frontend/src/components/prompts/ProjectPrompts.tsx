'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreVertical, Eye, Edit, Trash2, Copy, GitBranch, GitCompare, Play, CheckCircle, Clock, FileText, Tag, User, Calendar, BarChart3 } from 'lucide-react'
import { Project } from '@/lib/types'
import { PromptEditor } from './PromptEditor'
import { PromptWorkflow } from '../workflow/PromptWorkflow'
import { PromptMetricsDashboard } from '../metrics/PromptMetricsDashboard'
import { PromptVersionComparison } from './PromptVersionComparison'
import { PromptTester } from './PromptTester'

interface Prompt {
  id: string
  name: string
  description?: string
  project_id: string
  tags: string[]
  metadata: any
  created_at: string
  updated_at: string
  created_by?: string
  updated_by?: string
  activeVersion?: PromptVersion
  versions?: PromptVersion[]
}

interface PromptVersion {
  id: string
  prompt_id: string
  version: string
  template: string
  variables: string[]
  is_active: boolean
  changelog?: string
  status: string
  comments?: string
  variable_definitions?: string
  created_at: string
  created_by?: string
}

interface ProjectPromptsProps {
  project: Project
}

export function ProjectPrompts({ project }: ProjectPromptsProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showMetrics, setShowMetrics] = useState(false)
  const [metricsPrompt, setMetricsPrompt] = useState<Prompt | null>(null)
  const [showVersionComparison, setShowVersionComparison] = useState(false)
  const [comparisonPrompt, setComparisonPrompt] = useState<Prompt | null>(null)
  const [showTestPrompt, setShowTestPrompt] = useState(false)
  const [testingPrompt, setTestingPrompt] = useState<Prompt | null>(null)

  useEffect(() => {
    fetchPrompts()
  }, [project.id])

  const fetchPrompts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/prompts?projectId=${project.id}&includeActiveVersion=true&includeVersions=true`)
      const data = await response.json()
      
      if (data.success) {
        setPrompts(data.prompts)
      } else {
        console.error('Failed to fetch prompts:', data.error)
      }
    } catch (error) {
      console.error('Error fetching prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPrompts = prompts.filter(prompt =>
    prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreatePrompt = () => {
    setShowCreateModal(true)
  }

  const handlePromptCreated = () => {
    setShowCreateModal(false)
    fetchPrompts()
  }

  const handleEditPrompt = (prompt: Prompt) => {
    setEditingPrompt(prompt)
    setShowEditModal(true)
  }

  const handlePromptUpdated = () => {
    setShowEditModal(false)
    setEditingPrompt(null)
    fetchPrompts()
  }

  const handleViewMetrics = (prompt: Prompt) => {
    setMetricsPrompt(prompt)
    setShowMetrics(true)
  }

  const handleCloseMetrics = () => {
    setShowMetrics(false)
    setMetricsPrompt(null)
  }

  const handleCompareVersions = (prompt: Prompt) => {
    setComparisonPrompt(prompt)
    setShowVersionComparison(true)
  }

  const handleCloseVersionComparison = () => {
    setShowVersionComparison(false)
    setComparisonPrompt(null)
  }

  const handleTestPrompt = (prompt: Prompt) => {
    setTestingPrompt(prompt)
    setShowTestPrompt(true)
  }

  const handleCloseTestPrompt = () => {
    setShowTestPrompt(false)
    setTestingPrompt(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading prompts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Prompts</h2>
          <p className="text-muted mt-1">
            Manage prompt templates and versions for your agents
          </p>
        </div>
        <button
          onClick={handleCreatePrompt}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Prompt
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted w-4 h-4" />
          <input
            type="text"
            placeholder="Search prompts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <div className="flex items-center border border-border rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-accent' : 'hover:bg-accent'}`}
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-accent' : 'hover:bg-accent'}`}
          >
            <div className="w-4 h-4 grid grid-cols-2 gap-0.5">
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
              <div className="bg-current rounded-sm"></div>
            </div>
          </button>
        </div>
      </div>

      {/* Version Comparison View */}
      {showVersionComparison && comparisonPrompt ? (
        <PromptVersionComparison
          promptId={comparisonPrompt.id}
          promptName={comparisonPrompt.name}
          onClose={handleCloseVersionComparison}
          onViewMetrics={(versionId) => {
            handleCloseVersionComparison()
            handleViewMetrics(comparisonPrompt)
          }}
          isInline={true}
        />
      ) : (
        <>
          {/* Prompts List/Grid */}
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary mb-2">No prompts found</h3>
              <p className="text-muted mb-4">
                {searchTerm ? 'No prompts match your search criteria.' : 'Create your first prompt to get started.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreatePrompt}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  Create Prompt
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-accent border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary">Active Version</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary">Template</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary">Updated</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-primary">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrompts.map((prompt) => (
                  <tr key={prompt.id} className="border-b border-border hover:bg-accent/50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-primary">{prompt.name}</div>
                        {prompt.description && (
                          <div className="text-sm text-muted mt-1">{prompt.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {prompt.activeVersion ? (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            <CheckCircle className="w-3 h-3" />
                            v{prompt.activeVersion.version}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          <Clock className="w-3 h-3" />
                          No active version
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {prompt.template ? 'Template configured' : 'No template'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted">
                      {new Date(prompt.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPrompt(prompt)}
                          className="p-1 hover:bg-accent rounded"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditPrompt(prompt)}
                          className="p-1 hover:bg-accent rounded"
                          title="Edit prompt"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewMetrics(prompt)}
                          className="p-1 hover:bg-accent rounded"
                          title="View metrics"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCompareVersions(prompt)}
                          className="p-1 hover:bg-accent rounded"
                          title="Compare versions"
                        >
                          <GitCompare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleTestPrompt(prompt)}
                          className="p-1 hover:bg-accent rounded"
                          title="Test prompt"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1 hover:bg-accent rounded"
                          title="More options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((prompt) => (
            <div key={prompt.id} className="bg-white rounded-lg border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-medium text-primary mb-1">{prompt.name}</h3>
                  {prompt.description && (
                    <p className="text-sm text-muted line-clamp-2">{prompt.description}</p>
                  )}
                </div>
                <button className="p-1 hover:bg-accent rounded">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Active Version:</span>
                  {prompt.activeVersion ? (
                    <span className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                      <CheckCircle className="w-3 h-3" />
                      v{prompt.activeVersion.version}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      <Clock className="w-3 h-3" />
                      None
                    </span>
                  )}
                </div>


                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Updated {new Date(prompt.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedPrompt(prompt)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                  <button
                    onClick={() => handleViewMetrics(prompt)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                  >
                    <BarChart3 className="w-3 h-3" />
                    Metrics
                  </button>
                  <button
                    onClick={() => handleCompareVersions(prompt)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 rounded hover:bg-gray-50 text-sm"
                  >
                    <GitCompare className="w-3 h-3" />
                    Compare
                  </button>
                  <button 
                    onClick={() => handleTestPrompt(prompt)}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white rounded hover:bg-primary/90 text-sm"
                  >
                    <Play className="w-3 h-3" />
                    Test
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Prompt Detail Modal */}
      {selectedPrompt && (
        <PromptDetailModal
          prompt={selectedPrompt}
          onClose={() => setSelectedPrompt(null)}
          onUpdate={fetchPrompts}
        />
      )}

      {/* Create Prompt Modal */}
      {showCreateModal && (
        <PromptWorkflow
          mode="create"
          projectId={project.id}
          onClose={() => setShowCreateModal(false)}
          onSaved={handlePromptCreated}
        />
      )}

      {/* Edit Prompt Modal */}
      {showEditModal && editingPrompt && (
        <PromptWorkflow
          mode="edit"
          projectId={project.id}
          prompt={editingPrompt}
          onClose={() => setShowEditModal(false)}
          onSaved={handlePromptUpdated}
        />
      )}

      {/* Metrics Dashboard Modal */}
      {showMetrics && metricsPrompt && (
        <PromptMetricsDashboard
          promptId={metricsPrompt.id}
          promptName={metricsPrompt.name}
          onClose={handleCloseMetrics}
        />
      )}


      {/* Test Prompt Modal */}
      {showTestPrompt && testingPrompt && (
        <PromptTester
          prompt={testingPrompt}
          onClose={handleCloseTestPrompt}
        />
      )}
    </div>
  )
}

// Prompt Detail Modal - using PromptEditor in view mode
function PromptDetailModal({ prompt, onClose, onUpdate }: any) {
  return (
    <PromptEditor
      mode="view"
      projectId={prompt.project_id}
      prompt={prompt}
      onClose={onClose}
      onSave={onUpdate}
    />
  )
}