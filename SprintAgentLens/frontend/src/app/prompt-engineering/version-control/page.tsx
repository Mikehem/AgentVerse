'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight,
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  Download,
  Upload,
  MoreHorizontal,
  FileText,
  Code,
  Eye,
  Edit3,
  Trash2,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Interface definitions
interface Branch {
  id: string
  name: string
  type: 'main' | 'feature' | 'hotfix' | 'release'
  author: string
  created_at: string
  last_commit: string
  commits_ahead: number
  commits_behind: number
  status: 'active' | 'merged' | 'stale'
}

interface Commit {
  id: string
  hash: string
  message: string
  author: string
  timestamp: string
  branch: string
  changes: {
    added: number
    modified: number
    deleted: number
  }
  status: 'success' | 'failed' | 'pending'
}

interface PullRequest {
  id: string
  title: string
  description: string
  source_branch: string
  target_branch: string
  author: string
  created_at: string
  status: 'open' | 'merged' | 'closed' | 'draft'
  reviews: {
    approved: number
    requested_changes: number
    pending: number
  }
  changes: {
    files: number
    additions: number
    deletions: number
  }
}

export default function VersionControlPage() {
  const [activeTab, setActiveTab] = useState<'branches' | 'commits' | 'pull-requests'>('branches')
  const [branches, setBranches] = useState<Branch[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('main')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [activeTab, selectedBranch])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      setBranches([
        {
          id: '1',
          name: 'main',
          type: 'main',
          author: 'System',
          created_at: '2024-01-01T00:00:00Z',
          last_commit: 'Fix customer support prompt template',
          commits_ahead: 0,
          commits_behind: 0,
          status: 'active'
        },
        {
          id: '2',
          name: 'feature/enhanced-support-prompts',
          type: 'feature',
          author: 'Sarah Chen',
          created_at: '2024-01-15T10:30:00Z',
          last_commit: 'Add multi-language support variables',
          commits_ahead: 3,
          commits_behind: 1,
          status: 'active'
        },
        {
          id: '3',
          name: 'hotfix/billing-prompt-fix',
          type: 'hotfix',
          author: 'Mike Rodriguez',
          created_at: '2024-01-20T14:20:00Z',
          last_commit: 'Fix billing calculation prompt edge case',
          commits_ahead: 1,
          commits_behind: 0,
          status: 'active'
        }
      ])

      setCommits([
        {
          id: '1',
          hash: 'a1b2c3d',
          message: 'Fix customer support prompt template',
          author: 'Sarah Chen',
          timestamp: '2024-01-20T15:30:00Z',
          branch: 'main',
          changes: { added: 2, modified: 1, deleted: 0 },
          status: 'success'
        },
        {
          id: '2',
          hash: 'e4f5g6h',
          message: 'Add multi-language support variables',
          author: 'Sarah Chen',
          timestamp: '2024-01-20T14:15:00Z',
          branch: 'feature/enhanced-support-prompts',
          changes: { added: 5, modified: 2, deleted: 1 },
          status: 'success'
        },
        {
          id: '3',
          hash: 'i7j8k9l',
          message: 'Update billing calculation logic in prompts',
          author: 'Mike Rodriguez',
          timestamp: '2024-01-20T13:45:00Z',
          branch: 'hotfix/billing-prompt-fix',
          changes: { added: 1, modified: 3, deleted: 0 },
          status: 'pending'
        }
      ])

      setPullRequests([
        {
          id: '1',
          title: 'Enhanced Support Prompts with Multi-language Support',
          description: 'This PR adds comprehensive multi-language support to our customer support prompts, including variables for language-specific tone and cultural context.',
          source_branch: 'feature/enhanced-support-prompts',
          target_branch: 'main',
          author: 'Sarah Chen',
          created_at: '2024-01-20T12:00:00Z',
          status: 'open',
          reviews: { approved: 1, requested_changes: 0, pending: 1 },
          changes: { files: 4, additions: 45, deletions: 12 }
        },
        {
          id: '2',
          title: 'Hotfix: Billing Prompt Edge Cases',
          description: 'Quick fix for edge cases in billing calculation prompts that were causing incorrect responses for enterprise customers.',
          source_branch: 'hotfix/billing-prompt-fix',
          target_branch: 'main',
          author: 'Mike Rodriguez',
          created_at: '2024-01-20T14:30:00Z',
          status: 'draft',
          reviews: { approved: 0, requested_changes: 0, pending: 2 },
          changes: { files: 2, additions: 8, deletions: 3 }
        }
      ])
    } catch (error) {
      console.error('Error fetching version control data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBranchTypeColor = (type: string) => {
    switch (type) {
      case 'main': return 'bg-blue-100 text-blue-800'
      case 'feature': return 'bg-green-100 text-green-800'
      case 'hotfix': return 'bg-red-100 text-red-800'
      case 'release': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500'
      case 'failed': return 'text-red-500'
      case 'pending': return 'text-yellow-500'
      case 'open': return 'text-green-500'
      case 'merged': return 'text-blue-500'
      case 'closed': return 'text-gray-500'
      case 'draft': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />
      case 'failed': return <XCircle className="w-4 h-4" />
      case 'pending': return <Clock className="w-4 h-4" />
      case 'open': return <GitPullRequest className="w-4 h-4" />
      case 'merged': return <GitMerge className="w-4 h-4" />
      case 'closed': return <XCircle className="w-4 h-4" />
      case 'draft': return <FileText className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
              <span>Sprint Agent Lens</span>
              <ChevronRight className="w-4 h-4" />
              <a href="/prompt-engineering" className="hover:text-primary">Prompt Engineering</a>
              <ChevronRight className="w-4 h-4" />
              <span className="text-primary font-medium">Version Control</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Prompt Version Control</h1>
            <p className="text-gray-600 mt-1">
              Git-like version control system for prompt management and collaboration
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <GitBranch className="w-4 h-4" />
              New Branch
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" />
              Create PR
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('branches')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'branches'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <GitBranch className="w-4 h-4 inline mr-2" />
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'commits'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <GitCommit className="w-4 h-4 inline mr-2" />
            Commits ({commits.length})
          </button>
          <button
            onClick={() => setActiveTab('pull-requests')}
            className={cn(
              "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === 'pull-requests'
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            )}
          >
            <GitPullRequest className="w-4 h-4 inline mr-2" />
            Pull Requests ({pullRequests.length})
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder={`Search ${activeTab.replace('-', ' ')}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button 
                onClick={fetchData}
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg border border-gray-200">
          {/* Branches Tab */}
          {activeTab === 'branches' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Branches</h3>
                <p className="text-sm text-gray-500 mt-1">Manage prompt development branches</p>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading branches...</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {branches.map((branch) => (
                    <div key={branch.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <GitBranch className="w-5 h-5 text-primary" />
                            <span className="font-medium text-gray-900">{branch.name}</span>
                            <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getBranchTypeColor(branch.type))}>
                              {branch.type}
                            </span>
                            {branch.name === selectedBranch && (
                              <span className="px-2 py-1 text-xs font-medium bg-primary text-white rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">{branch.last_commit}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{branch.author}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(branch.created_at)}</span>
                            </div>
                            {branch.commits_ahead > 0 && (
                              <span className="text-green-600">
                                +{branch.commits_ahead} ahead
                              </span>
                            )}
                            {branch.commits_behind > 0 && (
                              <span className="text-red-600">
                                -{branch.commits_behind} behind
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Copy className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <GitMerge className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Commits Tab */}
          {activeTab === 'commits' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Commit History</h3>
                <p className="text-sm text-gray-500 mt-1">Track changes and modifications to prompts</p>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading commits...</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {commits.map((commit) => (
                    <div key={commit.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-1", getStatusColor(commit.status))}>
                          {getStatusIcon(commit.status)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{commit.message}</span>
                            <code className="px-2 py-1 text-xs bg-gray-100 rounded font-mono">
                              {commit.hash}
                            </code>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{commit.author}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              <span>{commit.branch}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(commit.timestamp)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            {commit.changes.added > 0 && (
                              <span className="text-green-600">+{commit.changes.added} added</span>
                            )}
                            {commit.changes.modified > 0 && (
                              <span className="text-blue-600">~{commit.changes.modified} modified</span>
                            )}
                            {commit.changes.deleted > 0 && (
                              <span className="text-red-600">-{commit.changes.deleted} deleted</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Pull Requests Tab */}
          {activeTab === 'pull-requests' && (
            <div>
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-primary">Pull Requests</h3>
                <p className="text-sm text-gray-500 mt-1">Review and merge prompt changes</p>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading pull requests...</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {pullRequests.map((pr) => (
                    <div key={pr.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-3">
                        <div className={cn("mt-1", getStatusColor(pr.status))}>
                          {getStatusIcon(pr.status)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{pr.title}</span>
                            <span className={cn("px-2 py-1 text-xs font-medium rounded-full", 
                              pr.status === 'open' ? 'bg-green-100 text-green-800' :
                              pr.status === 'merged' ? 'bg-blue-100 text-blue-800' :
                              pr.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            )}>
                              {pr.status}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{pr.description}</p>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                            <div className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              <span>{pr.author}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              <span>{pr.source_branch} → {pr.target_branch}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(pr.created_at)}</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>{pr.changes.files} files changed</span>
                            <span className="text-green-600">+{pr.changes.additions}</span>
                            <span className="text-red-600">-{pr.changes.deletions}</span>
                            <div className="flex items-center gap-2">
                              <span>Reviews:</span>
                              {pr.reviews.approved > 0 && (
                                <span className="text-green-600">✓{pr.reviews.approved}</span>
                              )}
                              {pr.reviews.requested_changes > 0 && (
                                <span className="text-red-600">✗{pr.reviews.requested_changes}</span>
                              )}
                              {pr.reviews.pending > 0 && (
                                <span className="text-yellow-600">⏳{pr.reviews.pending}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-md">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}