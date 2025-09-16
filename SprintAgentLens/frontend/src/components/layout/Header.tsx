'use client'

import { Search, Filter, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HeaderProps {
  title: string
  subtitle?: string
  onNewProject?: () => void
  onFilter?: () => void
  onSearch?: (query: string) => void
}

export function Header({ 
  title, 
  subtitle, 
  onNewProject, 
  onFilter, 
  onSearch 
}: HeaderProps) {
  return (
    <header className="bg-card border-b border-light px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Page Title and Breadcrumb */}
        <div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          {subtitle && (
            <nav className="flex items-center gap-2 mt-1" aria-label="Breadcrumb">
              <span className="text-sm text-muted">{subtitle}</span>
            </nav>
          )}
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <input 
              type="text" 
              placeholder="Search projects..." 
              className="input w-64 pl-9"
              onChange={(e) => onSearch?.(e.target.value)}
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted" />
          </div>
          
          {/* Actions */}
          <button 
            className="btn btn-outline"
            onClick={onFilter}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          
          <button 
            className="btn btn-primary"
            onClick={onNewProject}
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>
      </div>
    </header>
  )
}