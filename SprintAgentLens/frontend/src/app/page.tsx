'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { OverviewStats } from '@/components/dashboard/OverviewStats'
import { ProjectGrid } from '@/components/dashboard/ProjectGrid'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { Project, QuickAction, OverviewStats as OverviewStatsType } from '@/lib/types'
import { projectApi } from '@/lib/api'

export default function Dashboard() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState<Project[]>([])
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  // Load projects on component mount
  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    setLoading(true)
    try {
      console.log('🔄 Loading projects...')
      const response = await projectApi.getAll()
      console.log('📡 Projects API response:', response)
      
      if (response.success && response.data) {
        const projectsData = Array.isArray(response.data) ? response.data : []
        console.log(`✅ Loaded ${projectsData.length} projects`)
        setProjects(projectsData)
        setFilteredProjects(projectsData)
      } else {
        console.error('❌ Failed to load projects:', response.error)
        setProjects([])
        setFilteredProjects([])
      }
    } catch (error) {
      console.error('💥 Exception loading projects:', error)
      setProjects([])
      setFilteredProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Calculate stats from real project data
  const overviewStats: OverviewStatsType = {
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalAgents: projects.reduce((sum, p) => sum + p.agents, 0),
    totalConversations: projects.reduce((sum, p) => sum + p.conversations, 0),
    avgSuccessRate: projects.length > 0 
      ? projects.reduce((sum, p) => sum + p.successRate, 0) / projects.length 
      : 0,
    trends: {
      projects: projects.length > 0 ? `${projects.length} project${projects.length > 1 ? 's' : ''}` : 'No projects yet',
      agents: projects.reduce((sum, p) => sum + p.agents, 0) > 0 ? 'Agents deployed' : 'No agents yet',
      conversations: projects.reduce((sum, p) => sum + p.conversations, 0) > 0 ? 'Active conversations' : 'No conversations yet',
      successRate: projects.length > 0 ? 'Performance tracked' : 'No data yet'
    }
  }

  // Empty quick actions for now
  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'Create Your First Project',
      description: 'Start building with our project templates',
      icon: 'plus-circle',
      color: 'primary'
    },
    {
      id: '2',
      title: 'Configure Departments',
      description: 'Set up departments for better organization',
      icon: 'building-2',
      color: 'secondary'
    },
    {
      id: '3',
      title: 'Manage Priorities',
      description: 'Configure business priority levels',
      icon: 'star',
      color: 'accent'
    }
  ]

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.trim() === '') {
      setFilteredProjects(projects)
    } else {
      const filtered = projects.filter(project =>
        project.name.toLowerCase().includes(query.toLowerCase()) ||
        project.description.toLowerCase().includes(query.toLowerCase())
      )
      setFilteredProjects(filtered)
    }
  }

  const handleNewProject = () => {
    router.push('/projects/new')
  }

  const handleFilter = () => {
    alert('Filter dropdown would open here')
  }

  const handleProjectClick = (project: Project) => {
    router.push(`/projects/${project.id}`)
  }

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.id === '1') {
      router.push('/projects/new')
    } else if (action.id === '2') {
      router.push('/admin/departments')
    } else if (action.id === '3') {
      router.push('/admin/priorities')
    }
  }

  return (
    <>
      {/* Header */}
      <Header
        title="Dashboard"
        subtitle="Overview of all your AI agent projects"
        onNewProject={handleNewProject}
        onFilter={handleFilter}
        onSearch={handleSearch}
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        {/* Overview Statistics */}
        <OverviewStats stats={overviewStats} />

        {/* Projects Section */}
        <ProjectGrid
          projects={searchQuery ? filteredProjects : projects}
          onCreateProject={handleNewProject}
          onProjectClick={handleProjectClick}
          loading={loading}
        />

        {/* Quick Actions */}
        <QuickActions
          actions={quickActions}
          onActionClick={handleQuickActionClick}
        />
      </main>
    </>
  )
}