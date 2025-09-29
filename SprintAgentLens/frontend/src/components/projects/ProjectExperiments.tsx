'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Zap, Settings, BarChart3, MoreHorizontal } from 'lucide-react'
import { Project } from '@/lib/types'

interface ProjectExperimentsProps {
  project: Project
}

export function ProjectExperiments({ project }: ProjectExperimentsProps) {
  const [experiments, setExperiments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProjectExperiments()
  }, [project.id])

  const fetchProjectExperiments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/v1/experiments?projectId=${project.id}`)
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

  const filteredExperiments = experiments.filter(experiment =>
    experiment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    experiment.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Experiments</h2>
          <p className="text-muted mt-1">Manage experiments for this project</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search experiments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" />
            Create Experiment
          </button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-muted">Loading experiments...</div>
        ) : filteredExperiments.length === 0 ? (
          <div className="p-8 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary mb-2">No experiments found</h3>
            <p className="text-muted mb-4">
              {searchTerm ? 'Try adjusting your search terms.' : 'Create your first experiment for this project.'}
            </p>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-inverse rounded-md hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />
              Create Experiment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-light">
            {filteredExperiments.map((experiment) => (
              <div key={experiment.id} className="p-4 hover:bg-accent-alpha cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <h4 className="font-medium text-primary">{experiment.name}</h4>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(experiment.status)}`}>
                        {experiment.status}
                      </div>
                    </div>
                    {experiment.description && (
                      <p className="text-sm text-muted mb-2 line-clamp-2">{experiment.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted">
                      {experiment.dataset_name && <span>Dataset: {experiment.dataset_name}</span>}
                      <span>{new Date(experiment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded">
                      <BarChart3 className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-muted hover:text-primary hover:bg-accent-alpha rounded">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}