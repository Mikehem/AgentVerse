'use client'

import { useState, useEffect } from 'react'
import { 
  Database, 
  Plus, 
  Search, 
  Filter,
  ChevronRight,
  FileText,
  Calendar,
  Tag,
  Download,
  Upload,
  MoreHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Dataset {
  id: string
  name: string
  description?: string
  project_id?: string
  project_name?: string
  item_count: number
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [projects, setProjects] = useState<any[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchDatasets()
    fetchProjects()
  }, [selectedProject])

  const fetchDatasets = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedProject) params.append('projectId', selectedProject)
      
      const response = await fetch(`/api/v1/datasets?${params}`)
      const result = await response.json()
      
      if (result.success) {
        setDatasets(result.data)
      }
    } catch (error) {
      console.error('Error fetching datasets:', error)
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

  const filteredDatasets = datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dataset.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
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
              <span className="text-primary font-medium">Datasets</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Dataset Management</h1>
            <p className="text-gray-600 mt-1">
              Organize and manage your training and evaluation datasets
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Dataset
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Filters */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-primary">Filter Datasets</h3>
              <button 
                onClick={() => {
                  setSearchTerm('')
                  setSelectedProject('')
                }}
                className="text-sm text-gray-500 hover:text-primary"
              >
                Clear filters
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search datasets..."
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
            </div>
          </div>
        </div>

        {/* Datasets Grid */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Datasets ({filteredDatasets.length})
            </h3>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading datasets...
            </div>
          ) : filteredDatasets.length === 0 ? (
            <div className="p-8 text-center">
              <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedProject ? 
                  'Try adjusting your filters or search terms.' :
                  'Create your first dataset to get started.'
                }
              </p>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Dataset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {filteredDatasets.map((dataset) => (
                <DatasetCard key={dataset.id} dataset={dataset} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface DatasetCardProps {
  dataset: Dataset
}

function DatasetCard({ dataset }: DatasetCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h4 className="font-medium text-gray-900 truncate">{dataset.name}</h4>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {dataset.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {dataset.description}
        </p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Items:</span>
          <span className="font-medium">{dataset.item_count.toLocaleString()}</span>
        </div>
        
        {dataset.project_name && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Project:</span>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
              {dataset.project_name}
            </span>
          </div>
        )}
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-600">{formatDate(dataset.created_at)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-primary hover:bg-gray-50 rounded transition-colors">
          <FileText className="w-3 h-3" />
          View Items
        </button>
        <button className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-600 hover:text-primary hover:bg-gray-50 rounded transition-colors">
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>
    </div>
  )
}