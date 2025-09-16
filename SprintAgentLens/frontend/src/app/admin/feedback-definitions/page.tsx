'use client'

import { Header } from '@/components/layout/Header'
import { FeedbackDefinitionsManager } from '@/components/admin/FeedbackDefinitionsManager'

export default function FeedbackDefinitionsPage() {
  return (
    <>
      {/* Header */}
      <Header
        title="Feedback Definitions"
        subtitle="Configure feedback definitions for traces and spans"
        onNewProject={undefined} // Hide the new project button on admin pages
      />

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-auto">
        <FeedbackDefinitionsManager />
      </main>
    </>
  )
}