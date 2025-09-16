'use client'

import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ProjectCreationForm } from '@/components/projects/ProjectCreationForm'
import { ProjectCreationFormData } from '@/lib/validationSchemas'

export default function NewProjectPage() {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  const handleSubmit = (data: ProjectCreationFormData) => {
    // Here you would normally send to API
    console.log('Project created:', data)
    
    // Show success message and redirect
    alert(`Project "${data.name}" created successfully!`)
    router.push('/')
  }

  return (
    <>
      {/* Header */}
      <Header
        title="Create New Project"
        subtitle="Set up your AI agent project with initial configuration"
        onNewProject={undefined} // Hide the new project button on this page
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <ProjectCreationForm onCancel={handleBack} onSubmit={handleSubmit} />
        </div>
      </main>
    </>
  )
}