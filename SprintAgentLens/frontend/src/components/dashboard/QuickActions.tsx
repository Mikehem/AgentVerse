'use client'

import { FileText, Users, Settings } from 'lucide-react'
import { QuickAction } from '@/lib/types'

// Icon mapping  
const iconMap = {
  'file-text': FileText,
  'users': Users,
  'settings': Settings,
}

interface QuickActionsProps {
  actions: QuickAction[]
  onActionClick?: (action: QuickAction) => void
}

export function QuickActions({ actions, onActionClick }: QuickActionsProps) {
  const getIconBg = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary/10'
      case 'secondary': return 'bg-secondary/10' 
      case 'accent': return 'bg-accent/10'
      default: return 'bg-primary/10'
    }
  }

  const getIconColor = (color: string) => {
    switch (color) {
      case 'primary': return 'text-primary'
      case 'secondary': return 'text-secondary'
      case 'accent': return 'text-accent'
      default: return 'text-primary'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {actions.map((action) => {
        const Icon = iconMap[action.icon as keyof typeof iconMap]
        
        return (
          <button
            key={action.id}
            className="card p-4 text-left hover:shadow-md transition-all duration-200"
            onClick={() => onActionClick?.(action)}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 ${getIconBg(action.color)} rounded-lg flex items-center justify-center`}>
                {Icon && <Icon className={`w-5 h-5 ${getIconColor(action.color)}`} />}
              </div>
              <h4 className="font-semibold text-primary">{action.title}</h4>
            </div>
            <p className="text-sm text-muted">{action.description}</p>
          </button>
        )
      })}
    </div>
  )
}