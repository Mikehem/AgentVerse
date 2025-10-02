'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Play, BarChart3, Users, MessageSquare, Zap, TrendingUp, Activity, FileText, Database, TestTube, Copy, Check, Shield } from 'lucide-react'
import { projectApi } from '@/lib/api'
import { Project } from '@/lib/types'
import { ProjectPrompts } from '@/components/prompts/ProjectPrompts'
import { ProjectConversations } from '@/components/projects/ProjectConversations'
import { ProjectOverview } from '@/components/projects/ProjectOverview'
import { ProjectMetrics } from '@/components/projects/ProjectMetrics'
import { ProjectAgents } from '@/components/projects/ProjectAgents'
import { ProjectDatasets } from '@/components/projects/ProjectDatasets'
import { ProjectEvaluations } from '@/components/projects/ProjectEvaluations'
import { ProjectExperiments } from '@/components/projects/ProjectExperiments'
import { ProjectTraces } from '@/components/projects/ProjectTraces'
import { ProjectRules } from '@/components/projects/ProjectRules'
import { ProjectSettings } from '@/components/projects/ProjectSettings'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedProjectId, setCopiedProjectId] = useState(false)
  
  // Initialize project loading directly with params
  useEffect(() => {
    let isMounted = true
    let projectId: string | null = null

    const initializeProject = async () => {
      try {
        const resolvedParams = await params
        if (!isMounted) return
        
        projectId = resolvedParams.id
        setLoading(true)
        
        const response = await projectApi.getById(projectId)
        if (!isMounted) return
        
        if (response.success && response.data) {
          setProject(response.data)
        } else {
          console.error('Failed to load project:', response.error)
          router.push('/')
        }
      } catch (error) {
        if (!isMounted) return
        console.error('Exception loading project:', error)
        router.push('/')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeProject()

    return () => {
      isMounted = false
    }
  }, []) // Empty dependency array - run only once on mount

  const handleCopyProjectId = async (projectId: string) => {
    try {
      await navigator.clipboard.writeText(projectId)
      setCopiedProjectId(true)
      // Clear the copied state after 2 seconds
      setTimeout(() => setCopiedProjectId(false), 2000)
    } catch (error) {
      console.error('Failed to copy project ID:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = projectId
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopiedProjectId(true)
      setTimeout(() => setCopiedProjectId(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted">Loading project...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-primary mb-4">Project not found</p>
          <button 
            onClick={() => router.push('/')}
            className="btn btn-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BarChart3 },
    { id: 'agents', name: 'Agents', icon: Users },
    { id: 'prompts', name: 'Prompts', icon: FileText },
    { id: 'metrics', name: 'Metrics', icon: TrendingUp },
    { id: 'traces', name: 'Traces', icon: Activity },
    { id: 'conversations', name: 'Conversations', icon: MessageSquare },
    { id: 'datasets', name: 'Datasets', icon: Database },
    { id: 'evaluations', name: 'Evaluations', icon: TestTube },
    { id: 'experiments', name: 'Experiments', icon: Zap },
    { id: 'rules', name: 'Rules', icon: Shield },
    { id: 'settings', name: 'Settings', icon: Settings }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-light">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="p-2 hover:bg-accent-alpha rounded-md transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-muted" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                  <Zap className={`w-5 h-5 text-${project.color}`} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-primary">{project.name}</h1>
                  <p className="text-sm text-muted">{project.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted">Project ID:</span>
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">{project.id}</code>
                    <button
                      onClick={() => handleCopyProjectId(project.id)}
                      className="p-1 hover:bg-accent-alpha rounded transition-colors"
                      title={copiedProjectId ? "Copied!" : "Copy Project ID"}
                    >
                      {copiedProjectId ? (
                        <Check className="w-3 h-3 text-success" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted hover:text-primary" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-success/20 text-success' 
                  : project.status === 'warning'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-error/20 text-error'
              }`}>
                {project.status}
              </div>
              
              <button className="btn btn-outline">
                <Play className="w-4 h-4" />
                Deploy
              </button>
              
              <button className="btn btn-primary">
                <Settings className="w-4 h-4" />
                Configure
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-primary hover:border-muted'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <ProjectOverview project={project} />
        )}
        {activeTab === 'agents' && (
          <ProjectAgents project={project} onNavigateToPrompts={() => setActiveTab('prompts')} />
        )}
        {activeTab === 'prompts' && (
          <ProjectPrompts project={project} />
        )}
        {activeTab === 'conversations' && (
          <ProjectConversations project={project} />
        )}
        {activeTab === 'datasets' && (
          <ProjectDatasets project={project} />
        )}
        {activeTab === 'evaluations' && (
          <ProjectEvaluations project={project} />
        )}
        {activeTab === 'experiments' && (
          <ProjectExperiments project={project} />
        )}
        {activeTab === 'metrics' && (
          <ProjectMetrics project={project} />
        )}
        {activeTab === 'traces' && (
          <ProjectTraces project={project} />
        )}
        {activeTab === 'rules' && (
          <ProjectRules project={project} />
        )}
        {activeTab === 'settings' && (
          <ProjectSettings project={project} onUpdate={setProject} />
        )}
      </div>
    </div>
  )
}