'use client'

import { useState, useEffect, use } from 'react'
import { 
  Database, 
  Plus, 
  Search,
  ChevronRight,
  FileText,
  Calendar,
  Download,
  Upload,
  MoreHorizontal,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DatasetCreateModal } from '@/components/datasets/DatasetCreateModal'

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

interface Project {
  id: string
  name: string
  description?: string
}

export default function ProjectDatasetsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const projectId = resolvedParams.id
  const [project, setProject] = useState<Project | null>(null)
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchProject()
    fetchProjectDatasets()
  }, [projectId])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}`)
      const result = await response.json()
      
      if (result.success) {
        setProject(result.data)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    }
  }

  const fetchProjectDatasets = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/datasets?projectId=${projectId}`)
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

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <button 
                onClick={() => router.push('/projects')}
                className="hover:text-primary"
              >
                Sprint Agent Lens
              </button>
              <ChevronRight className="w-4 h-4" />
              <button 
                onClick={() => router.push(`/projects/${projectId}`)}
                className="hover:text-primary"
              >
                {project.name}
              </button>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Datasets</span>
            </nav>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push(`/projects/${projectId}`)}
                className="p-1 text-gray-400 hover:text-primary"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-primary">Project Datasets</h1>
                <p className="text-gray-600 mt-1">
                  Manage datasets for <strong>{project.name}</strong>
                </p>
              </div>
            </div>
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
        {/* Search */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search project datasets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Project Datasets */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">
              Datasets ({filteredDatasets.length})
            </h3>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded transition-colors">
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-primary hover:bg-gray-50 rounded transition-colors">
                <Download className="w-4 h-4" />
                Export All
              </button>
            </div>
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
                {searchTerm ? 
                  'Try adjusting your search terms.' :
                  `Create your first dataset for ${project.name}.`
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
            <>
              {/* Table View for Project Datasets */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Dataset</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Items</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Created</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Updated</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredDatasets.map((dataset) => (
                      <tr key={dataset.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <Database className="w-5 h-5 text-primary" />
                            <div>
                              <button
                                onClick={() => router.push(`/projects/${projectId}/datasets/${dataset.id}`)}
                                className="font-medium text-gray-900 hover:text-primary text-left"
                              >
                                {dataset.name}
                              </button>
                              {dataset.description && (
                                <div className="text-sm text-gray-500 truncate max-w-md">
                                  {dataset.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {dataset.item_count.toLocaleString()} items
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(dataset.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {formatDate(dataset.updated_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => router.push(`/projects/${projectId}/datasets/${dataset.id}`)}
                              className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded"
                              title="View Dataset"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded" title="Download Dataset">
                              <Download className="w-4 h-4" />
                            </button>
                            <button className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-100 rounded" title="More Options">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dataset Create Modal */}
      <DatasetCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(dataset) => {
          console.log('Dataset created:', dataset)
          fetchProjectDatasets()
        }}
        projectId={projectId}
        projectName={project.name}
      />
    </div>
  )
}