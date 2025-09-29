'use client'

import { useState } from 'react'
import { Settings, Zap } from 'lucide-react'
import { Project } from '@/lib/types'
import { projectApi } from '@/lib/api'

interface ProjectSettingsProps {
  project: Project
  onUpdate: (project: Project) => void
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: project.name,
    description: project.description,
    department: project.department || '',
    securityLevel: project.securityLevel,
    visibility: project.visibility,
    tags: project.tags.join(', ')
  })

  const handleSave = async () => {
    try {
      const updatedData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      }

      const response = await projectApi.update(project.id, updatedData)
      if (response.success && response.data) {
        onUpdate(response.data)
        setIsEditing(false)
      } else {
        alert('Failed to update project: ' + (response.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Failed to update project:', error)
      alert('Failed to update project')
    }
  }

  const handleCancel = () => {
    setFormData({
      name: project.name,
      description: project.description,
      department: project.department || '',
      securityLevel: project.securityLevel,
      visibility: project.visibility,
      tags: project.tags.join(', ')
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Project Settings</h2>
          <p className="text-muted">Configure project details and preferences</p>
        </div>
        {!isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="btn btn-primary"
          >
            <Settings className="w-4 h-4" />
            Edit Settings
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Project Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input w-full"
                  placeholder="Enter project name"
                />
              ) : (
                <p className="text-primary">{project.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Description</label>
              {isEditing ? (
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full h-20 resize-none"
                  placeholder="Enter project description"
                />
              ) : (
                <p className="text-muted">{project.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Department</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="input w-full"
                  placeholder="Enter department"
                />
              ) : (
                <p className="text-primary">{project.department || 'Not assigned'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Security & Access</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Security Level</label>
              {isEditing ? (
                <select
                  value={formData.securityLevel}
                  onChange={(e) => setFormData({ ...formData, securityLevel: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              ) : (
                <p className="text-primary capitalize">{project.securityLevel}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Visibility</label>
              {isEditing ? (
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                  className="input w-full"
                >
                  <option value="private">Private</option>
                  <option value="team">Team</option>
                  <option value="organization">Organization</option>
                </select>
              ) : (
                <p className="text-primary capitalize">{project.visibility}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Created</label>
              <p className="text-muted">{new Date(project.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Tags & Classification */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Tags & Classification</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">Tags</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="input w-full"
                  placeholder="Enter tags separated by commas"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, index) => (
                    <span 
                      key={index}
                      className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  {project.tags.length === 0 && (
                    <span className="text-muted">No tags assigned</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Template</label>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 bg-${project.color}/10 rounded-lg flex items-center justify-center`}>
                  <Zap className={`w-4 h-4 text-${project.color}`} />
                </div>
                <span className="text-primary">{project.template}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary mb-1">Status</label>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'active' 
                  ? 'bg-success/20 text-success' 
                  : project.status === 'warning'
                  ? 'bg-warning/20 text-warning'
                  : 'bg-error/20 text-error'
              }`}>
                {project.status}
              </div>
            </div>
          </div>
        </div>

        {/* Project Statistics */}
        <div className="card p-6">
          <h3 className="font-semibold text-primary mb-4">Project Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted">Active Agents:</span>
              <span className="text-primary font-medium">{project.agents}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Total Conversations:</span>
              <span className="text-primary font-medium">{project.conversations.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Success Rate:</span>
              <span className="text-primary font-medium">{project.successRate.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Last Modified:</span>
              <span className="text-muted">{new Date(project.updatedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex justify-end gap-3">
          <button 
            onClick={handleCancel}
            className="btn btn-outline"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="btn btn-primary"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card p-6 border-error/20">
        <h3 className="font-semibold text-error mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-primary">Delete Project</h4>
            <p className="text-sm text-muted">Permanently delete this project and all associated data</p>
          </div>
          <button className="btn btn-error">
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}