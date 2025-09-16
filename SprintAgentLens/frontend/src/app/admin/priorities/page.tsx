'use client'

import { Header } from '@/components/layout/Header'
import { PriorityManager } from '@/components/admin/PriorityManager'

export default function PrioritiesPage() {
  return (
    <>
      {/* Header */}
      <Header
        title="Business Priority Management"
        subtitle="Configure priority levels for project classification"
        onNewProject={undefined} // Hide the new project button on admin pages
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <PriorityManager />
      </main>
    </>
  )
}