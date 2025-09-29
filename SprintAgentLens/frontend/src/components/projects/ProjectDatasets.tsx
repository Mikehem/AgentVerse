'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Database, Eye, Download, MoreHorizontal } from 'lucide-react'
import { Project } from '@/lib/types'
import { DatasetCreateModal } from '@/components/datasets/DatasetCreateModal'

interface ProjectDatasetsProps {
  project: Project
}

export function ProjectDatasets({ project }: ProjectDatasetsProps) {
  const router = useRouter()
  const [datasets, setDatasets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    fetchProjectDatasets()
  }, [project.id])

  const fetchProjectDatasets = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/datasets?projectId=${project.id}`)
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

  const handleCreateDataset = () => {
    setShowCreateModal(true)
  }

  const handleDatasetCreated = (newDataset: any) => {
    setDatasets(prev => [...prev, newDataset])
    setShowCreateModal(false)
    fetchProjectDatasets() // Refresh the list
  }

  return (
    <div className="space-y-6">
      {/* Header with search and create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Datasets</h2>
          <p className="text-muted mt-1">Manage datasets for this project</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button 
            onClick={handleCreateDataset}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Dataset
          </button>
        </div>
      </div>

      {/* Datasets grid */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">
            Loading datasets...
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="p-8 text-center">
            <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No datasets found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 
                'Try adjusting your search terms.' :
                'Create your first dataset for this project.'
              }
            </p>
            <button 
              onClick={handleCreateDataset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Dataset
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-light">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-primary">Dataset</th>
                  <th className="text-left py-3 px-4 font-medium text-primary">Items</th>
                  <th className="text-left py-3 px-4 font-medium text-primary">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-primary">Updated</th>
                  <th className="text-right py-3 px-4 font-medium text-primary">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {filteredDatasets.map((dataset) => (
                  <tr 
                    key={dataset.id} 
                    className="hover:bg-accent-alpha cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}/datasets/${dataset.id}`)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Database className="w-5 h-5 text-primary" />
                        <div>
                          <div className="font-medium text-primary">{dataset.name}</div>
                          {dataset.description && (
                            <div className="text-sm text-muted truncate max-w-md">
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
                    <td className="py-3 px-4 text-sm text-muted">
                      {formatDate(dataset.created_at)}
                    </td>
                    <td className="py-3 px-4 text-sm text-muted">
                      {formatDate(dataset.updated_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/projects/${project.id}/datasets/${dataset.id}`)
                          }}
                          title="View dataset details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          onClick={(e) => e.stopPropagation()}
                          title="Export dataset"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded"
                          onClick={(e) => e.stopPropagation()}
                          title="More options"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dataset Create Modal */}
      <DatasetCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleDatasetCreated}
        projectId={project.id}
        projectName={project.name}
      />
    </div>
  )
}