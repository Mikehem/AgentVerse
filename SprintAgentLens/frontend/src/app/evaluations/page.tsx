'use client'

import { useState, useEffect } from 'react'
import { 
  TestTube, 
  Plus, 
  Search, 
  Filter,
  ChevronRight,
  Calendar,
  Tag,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  MoreHorizontal,
  BarChart3,
  Database
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Evaluation {
  id: string
  name: string
  description?: string
  project_id?: string
  project_name?: string
  dataset_id?: string
  dataset_name?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  result_count: number
  config?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchEvaluations()
    fetchProjects()
  }, [selectedProject])

  const fetchEvaluations = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedProject) params.append('projectId', selectedProject)
      
      const response = await fetch(`/api/v1/evaluations?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setEvaluations(result.data)
      }
    } catch (error) {
      console.error('Error fetching evaluations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/v1/projects')
      const result = await response.json()
      
      if (result.success) {
        setProjects(result.data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const filteredEvaluations = evaluations.filter(evaluation => {
    const matchesSearch = evaluation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !selectedStatus || evaluation.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-blue-500" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Evaluations</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Evaluation Management</h1>
            <p className="text-gray-600 mt-1">
              Create and manage evaluations for your AI agents and models
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Evaluation
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Filter Evaluations</h3>
              <button 
                onClick={() => {
                  setSearchTerm('')
                  setSelectedProject('')
                  setSelectedStatus('')
                }}
                className="text-sm text-gray-500 hover:text-primary"
              >
                Clear filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search evaluations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Project Filter */}
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Evaluations List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Evaluations ({filteredEvaluations.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading evaluations...
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="p-8 text-center">
              <TestTube className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No evaluations found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedProject || selectedStatus ? 
                  'Try adjusting your filters or search terms.' :
                  'Create your first evaluation to get started.'
                }
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Evaluation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredEvaluations.map((evaluation) => (
                <EvaluationRow key={evaluation.id} evaluation={evaluation} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface EvaluationRowProps {
  evaluation: Evaluation
}

function EvaluationRow({ evaluation }: EvaluationRowProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-blue-500" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'failed': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <TestTube className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-gray-900">{evaluation.name}</h4>
            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(evaluation.status)}`}>
              {getStatusIcon(evaluation.status)}
              {evaluation.status.charAt(0).toUpperCase() + evaluation.status.slice(1)}
            </div>
          </div>

          {evaluation.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {evaluation.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {evaluation.project_name && (
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>{evaluation.project_name}</span>
              </div>
            )}
            {evaluation.dataset_name && (
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{evaluation.dataset_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              <span>{evaluation.result_count} results</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(evaluation.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
            <BarChart3 className="w-4 h-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}