'use client'

import { Header } from '@/components/layout/Header'
import { DepartmentManager } from '@/components/admin/DepartmentManager'

export default function DepartmentsPage() {
  return (
    <>
      {/* Header */}
      <Header
        title="Department Management"
        subtitle="Configure departments for project organization"
        onNewProject={undefined} // Hide the new project button on admin pages
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <DepartmentManager />
      </main>
    </>
  )
}