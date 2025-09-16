'use client'

import { 
  ShoppingCart, 
  HeartPulse, 
  Banknote, 
  GraduationCap, 
  Plane, 
  Home,
  PlusCircle
} from 'lucide-react'
import { cn, formatNumber, formatPercentage } from '@/lib/utils'
import { Project } from '@/lib/types'

// Icon mapping
const iconMap = {
  'shopping-cart': ShoppingCart,
  'heart-pulse': HeartPulse,
  'banknote': Banknote,
  'graduation-cap': GraduationCap,
  'plane': Plane,
  'home': Home,
}

interface ProjectTileProps {
  project: Project
  onClick?: () => void
}

export function ProjectTile({ project, onClick }: ProjectTileProps) {
  const Icon = iconMap[project.icon as keyof typeof iconMap]
  
  const getIconBg = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary/10'
      case 'secondary': return 'bg-secondary/10' 
      case 'accent': return 'bg-accent/10'
      case 'warning': return 'bg-warning/10'
      case 'error': return 'bg-error/10'
      default: return 'bg-primary/10'
    }
  }

  const getIconColor = (color: string) => {
    switch (color) {
      case 'primary': return 'text-primary'
      case 'secondary': return 'text-secondary'
      case 'accent': return 'text-accent' 
      case 'warning': return 'text-warning'
      case 'error': return 'text-error'
      default: return 'text-primary'
    }
  }
  
  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-success/20 text-success'
      case 'warning':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-warning/20 text-warning'
      case 'inactive':
        return 'px-3 py-1 text-xs font-medium rounded-full bg-gray-200 text-muted'
    }
  }

  const getStatusText = (status: Project['status']) => {
    switch (status) {
      case 'active':
        return 'Active'
      case 'warning':
        return 'Needs Attention'
      case 'inactive':
        return 'Inactive'
    }
  }

  return (
    <div 
      className="card p-6 cursor-pointer transition-all duration-200 hover:shadow-medium hover:-translate-y-1 hover:border-primary"
      onClick={onClick}
    >
      {/* Project Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 ${getIconBg(project.color)} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {Icon && <Icon className={`w-6 h-6 ${getIconColor(project.color)}`} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-primary mb-1 truncate">{project.name}</h3>
          <p className="text-sm text-muted line-clamp-2">{project.description}</p>
        </div>
      </div>
      
      {/* Project Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-lg font-semibold text-primary">{project.stats.agents}</div>
          <div className="text-xs text-muted">Agents</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-secondary">{formatNumber(project.stats.conversations)}</div>
          <div className="text-xs text-muted">Conversations</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-lg font-semibold",
            project.status === 'active' ? 'text-success' :
            project.status === 'warning' ? 'text-warning' : 'text-error'
          )}>
            {formatPercentage(project.stats.successRate)}
          </div>
          <div className="text-xs text-muted">Success Rate</div>
        </div>
      </div>
      
      {/* Project Status */}
      <div className="flex items-center justify-between pt-4 border-t border-light">
        <span className={getStatusBadge(project.status)}>
          {getStatusText(project.status)}
        </span>
        <span className="text-sm text-muted">
          Updated {project.lastUpdated}
        </span>
      </div>
    </div>
  )
}

interface CreateProjectTileProps {
  onClick?: () => void
}

export function CreateProjectTile({ onClick }: CreateProjectTileProps) {
  return (
    <div 
      className="border-2 border-dashed border-border rounded-lg p-8 cursor-pointer transition-all duration-200 hover:border-primary hover:bg-primary-alpha text-center min-h-[280px] flex flex-col items-center justify-center"
      onClick={onClick}
    >
      <PlusCircle className="w-12 h-12 text-muted mb-3" />
      <h3 className="font-semibold text-primary mb-1">Create New Project</h3>
      <p className="text-sm text-muted">Start building your AI agent project</p>
    </div>
  )
}