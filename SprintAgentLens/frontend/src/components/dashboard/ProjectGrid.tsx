'use client'

import { useState } from 'react'
import { ProjectTile, CreateProjectTile } from './ProjectTile'
import { Project } from '@/lib/types'
import { cn } from '@/lib/utils'

interface ProjectGridProps {
  projects: Project[]
  onCreateProject?: () => void
  onProjectClick?: (project: Project) => void
}

type FilterStatus = 'all' | 'active' | 'draft'

export function ProjectGrid({ projects, onCreateProject, onProjectClick }: ProjectGridProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all')

  const filteredProjects = projects.filter(project => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'active') return project.status === 'active'
    if (activeFilter === 'draft') return project.status === 'inactive'
    return true
  })

  const filters: { key: FilterStatus; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'draft', label: 'Draft' }
  ]

  return (
    <div className="mb-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-primary">Your Projects</h2>
        <div className="flex gap-2">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              className={cn(
                'px-3 py-1 text-sm rounded-md transition-colors',
                activeFilter === filter.key
                  ? 'bg-primary-alpha text-primary'
                  : 'text-muted hover:bg-accent-alpha hover:text-primary'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create New Project Tile */}
        <CreateProjectTile onClick={onCreateProject} />
        
        {/* Project Tiles */}
        {filteredProjects.map((project) => (
          <ProjectTile
            key={project.id}
            project={project}
            onClick={() => onProjectClick?.(project)}
          />
        ))}
      </div>
    </div>
  )
}