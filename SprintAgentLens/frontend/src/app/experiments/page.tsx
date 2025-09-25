'use client'

import { useState, useEffect } from 'react'
import { 
  Zap, 
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
  Database,
  Settings,
  Bot
} from 'lucide-react'
import { cn } from '@/lib/utils'
import ExperimentCreateModal from '@/components/experiments/ExperimentCreateModal'
import ExperimentResultsModal from '@/components/experiments/ExperimentResultsModal'

interface Experiment {
  id: string
  name: string
  description?: string
  project_id?: string
  project_name?: string
  dataset_id?: string
  dataset_name?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  agent_config?: Record<string, any>
  evaluation_config?: Record<string, any>
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
  started_at?: string
  completed_at?: string
}

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResultsModal, setShowResultsModal] = useState(false)
  const [selectedExperimentForResults, setSelectedExperimentForResults] = useState<Experiment | null>(null)

  useEffect(() => {
    fetchExperiments()
    fetchProjects()
  }, [selectedProject])

  const fetchExperiments = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedProject) params.append('projectId', selectedProject)
      
      const response = await fetch(`/api/v1/experiments?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setExperiments(result.data)
      }
    } catch (error) {
      console.error('Error fetching experiments:', error)
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

  const filteredExperiments = experiments.filter(experiment => {
    const matchesSearch = experiment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      experiment.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !selectedStatus || experiment.status === selectedStatus
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
              <span className="text-primary font-medium">Experiments</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Experiment Management</h1>
            <p className="text-gray-600 mt-1">
              Design and run experiments to test and optimize your AI agents
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Experiment
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Filter Experiments</h3>
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
                  placeholder="Search experiments..."
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

        {/* Experiments List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Experiments ({filteredExperiments.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading experiments...
            </div>
          ) : filteredExperiments.length === 0 ? (
            <div className="p-8 text-center">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No experiments found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedProject || selectedStatus ? 
                  'Try adjusting your filters or search terms.' :
                  'Create your first experiment to get started.'
                }
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Experiment
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredExperiments.map((experiment) => (
                <ExperimentRow 
                  key={experiment.id} 
                  experiment={experiment} 
                  onViewResults={(exp) => {
                    setSelectedExperimentForResults(exp)
                    setShowResultsModal(true)
                  }}
                  onRefresh={fetchExperiments}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Experiment Creation Modal */}
      <ExperimentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchExperiments}
        projectId={selectedProject}
      />

      {/* Experiment Results Modal */}
      {selectedExperimentForResults && (
        <ExperimentResultsModal
          isOpen={showResultsModal}
          onClose={() => {
            setShowResultsModal(false)
            setSelectedExperimentForResults(null)
          }}
          experimentId={selectedExperimentForResults.id}
          experimentName={selectedExperimentForResults.name}
        />
      )}
    </div>
  )
}

interface ExperimentRowProps {
  experiment: Experiment
  onViewResults: (experiment: Experiment) => void
  onRefresh: () => void
}

function ExperimentRow({ experiment, onViewResults, onRefresh }: ExperimentRowProps) {
  const [isRunning, setIsRunning] = useState(false)

  const handleRunExperiment = async () => {
    if (isRunning) return
    
    try {
      setIsRunning(true)
      
      const response = await fetch(`/api/v1/experiments/${experiment.id}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()
      
      if (result.success) {
        // Show success message and refresh experiments list
        alert('Experiment started successfully!')
        onRefresh() // Use callback instead of page reload
      } else {
        alert('Failed to start experiment: ' + result.error)
      }

    } catch (error) {
      console.error('Error starting experiment:', error)
      alert('Failed to start experiment')
    } finally {
      setIsRunning(false)
    }
  }

  const handleViewResults = () => {
    onViewResults(experiment)
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
            <Zap className="w-5 h-5 text-primary" />
            <h4 className="font-medium text-gray-900">{experiment.name}</h4>
            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
              {getStatusIcon(experiment.status)}
              {experiment.status.charAt(0).toUpperCase() + experiment.status.slice(1)}
            </div>
          </div>

          {experiment.description && (
            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
              {experiment.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-500">
            {experiment.project_name && (
              <div className="flex items-center gap-1">
                <Tag className="w-3 h-3" />
                <span>{experiment.project_name}</span>
              </div>
            )}
            {experiment.dataset_name && (
              <div className="flex items-center gap-1">
                <Database className="w-3 h-3" />
                <span>{experiment.dataset_name}</span>
              </div>
            )}
            {experiment.agent_config && (
              <div className="flex items-center gap-1">
                <Bot className="w-3 h-3" />
                <span>Agent Config</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(experiment.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {experiment.status === 'pending' && (
            <button
              onClick={handleRunExperiment}
              disabled={isRunning}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Run Experiment"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  Run
                </>
              )}
            </button>
          )}
          
          {experiment.status === 'completed' && (
            <button
              onClick={handleViewResults}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              title="View Results"
            >
              <BarChart3 className="w-3 h-3" />
              Results
            </button>
          )}
          
          <button 
            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          
          <button 
            className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md"
            title="More Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}