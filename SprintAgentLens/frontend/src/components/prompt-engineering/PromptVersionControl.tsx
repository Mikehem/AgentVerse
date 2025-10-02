'use client'

import { useState, useEffect } from 'react'
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  GitPullRequest,
  Users,
  MessageSquare,
  Clock,
  Eye,
  Edit3,
  Plus,
  Minus,
  Check,
  X,
  Star,
  Tag,
  Calendar,
  User,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
  Upload,
  Copy,
  Trash2,
  Settings,
  Filter,
  Search,
  BarChart3,
  FileText,
  Code,
  Diff,
  History,
  Share2,
  Bell,
  Archive,
  Lock,
  Unlock,
  Shield,
  Flag,
  Bookmark,
  Link,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
  Merge,
  Split,
  RotateCcw,
  FastForward,
  Rewind
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Timeline } from 'recharts'

interface PromptCommit {
  commit_id: string
  commit_message: string
  author: string
  timestamp: string
  branch: string
  changes: {
    lines_added: number
    lines_removed: number
    lines_modified: number
  }
  diff: {
    old_content: string
    new_content: string
    hunks: DiffHunk[]
  }
  metrics_change: {
    accuracy_delta: number
    performance_delta: number
    cost_delta: number
  }
  tags: string[]
  status: 'draft' | 'review' | 'approved' | 'deployed' | 'reverted'
  parent_commits: string[]
  reviewers: string[]
  comments: PromptComment[]
}

interface DiffHunk {
  old_start: number
  old_lines: number
  new_start: number
  new_lines: number
  lines: DiffLine[]
}

interface DiffLine {
  type: 'context' | 'addition' | 'deletion'
  content: string
  line_number_old?: number
  line_number_new?: number
}

interface PromptBranch {
  branch_id: string
  branch_name: string
  base_branch: string
  created_by: string
  created_at: string
  last_commit: string
  commits_ahead: number
  commits_behind: number
  status: 'active' | 'merged' | 'abandoned' | 'protected'
  description: string
  merge_conflicts: boolean
  pull_request?: PullRequest
}

interface PullRequest {
  pr_id: string
  title: string
  description: string
  source_branch: string
  target_branch: string
  author: string
  created_at: string
  status: 'open' | 'closed' | 'merged' | 'draft'
  reviewers: PRReviewer[]
  comments: PromptComment[]
  approvals: number
  required_approvals: number
  checks_passing: boolean
  conflicts: boolean
  merge_strategy: 'merge' | 'squash' | 'rebase'
  labels: string[]
}

interface PRReviewer {
  user: string
  status: 'pending' | 'approved' | 'changes_requested' | 'commented'
  review_date?: string
  comments: string
}

interface PromptComment {
  comment_id: string
  author: string
  content: string
  timestamp: string
  line_number?: number
  reply_to?: string
  reactions: {
    emoji: string
    users: string[]
  }[]
  resolved: boolean
}

interface CollaborationActivity {
  activity_id: string
  type: 'commit' | 'comment' | 'review' | 'merge' | 'branch_create' | 'pr_create' | 'deploy'
  user: string
  timestamp: string
  description: string
  target_id: string
  metadata: Record<string, any>
}

interface PromptVersionControlProps {
  projectId: string
  promptId: string
}

export function PromptVersionControl({ projectId, promptId }: PromptVersionControlProps) {
  const [commits, setCommits] = useState<PromptCommit[]>([])
  const [branches, setBranches] = useState<PromptBranch[]>([])
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [activities, setActivities] = useState<CollaborationActivity[]>([])
  
  const [currentBranch, setCurrentBranch] = useState('main')
  const [selectedCommit, setSelectedCommit] = useState<PromptCommit | null>(null)
  const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null)
  const [viewMode, setViewMode] = useState<'commits' | 'branches' | 'pull_requests' | 'diff' | 'activity'>('commits')
  const [showDiff, setShowDiff] = useState(false)
  const [diffMode, setDiffMode] = useState<'side_by_side' | 'unified'>('side_by_side')
  const [filterAuthor, setFilterAuthor] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateBranch, setShowCreateBranch] = useState(false)
  const [showCreatePR, setShowCreatePR] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchVersionData()
  }, [projectId, promptId, currentBranch])

  const fetchVersionData = async () => {
    setIsLoading(true)
    try {
      const [commitsRes, branchesRes, prsRes, activitiesRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/commits?branch=${currentBranch}`),
        fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/branches`),
        fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/pull-requests`),
        fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/activities`)
      ])

      const [commitsData, branchesData, prsData, activitiesData] = await Promise.all([
        commitsRes.json(),
        branchesRes.json(),
        prsRes.json(),
        activitiesRes.json()
      ])

      if (commitsData.success) setCommits(commitsData.commits)
      if (branchesData.success) setBranches(branchesData.branches)
      if (prsData.success) setPullRequests(prsData.pull_requests)
      if (activitiesData.success) setActivities(activitiesData.activities)
    } catch (error) {
      console.error('Failed to fetch version data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const createBranch = async (branchName: string, baseBranch: string, description: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_name: branchName,
          base_branch: baseBranch,
          description
        })
      })
      
      if (response.ok) {
        fetchVersionData()
        setShowCreateBranch(false)
      }
    } catch (error) {
      console.error('Failed to create branch:', error)
    }
  }

  const createPullRequest = async (prData: Partial<PullRequest>) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/pull-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prData)
      })
      
      if (response.ok) {
        fetchVersionData()
        setShowCreatePR(false)
      }
    } catch (error) {
      console.error('Failed to create pull request:', error)
    }
  }

  const mergePullRequest = async (prId: string, mergeStrategy: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/pull-requests/${prId}/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merge_strategy: mergeStrategy })
      })
      
      if (response.ok) {
        fetchVersionData()
      }
    } catch (error) {
      console.error('Failed to merge pull request:', error)
    }
  }

  const addComment = async (commitId: string, content: string, lineNumber?: number) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/commits/${commitId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          line_number: lineNumber
        })
      })
      
      if (response.ok) {
        fetchVersionData()
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  const reviewPullRequest = async (prId: string, status: string, comments: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/pull-requests/${prId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          comments
        })
      })
      
      if (response.ok) {
        fetchVersionData()
      }
    } catch (error) {
      console.error('Failed to review pull request:', error)
    }
  }

  const revertCommit = async (commitId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${projectId}/prompts/${promptId}/commits/${commitId}/revert`, {
        method: 'POST'
      })
      
      if (response.ok) {
        fetchVersionData()
      }
    } catch (error) {
      console.error('Failed to revert commit:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit3 className="w-4 h-4 text-gray-600" />
      case 'review': return <Eye className="w-4 h-4 text-blue-600" />
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'deployed': return <Star className="w-4 h-4 text-purple-600" />
      case 'reverted': return <RotateCcw className="w-4 h-4 text-red-600" />
      case 'open': return <GitPullRequest className="w-4 h-4 text-blue-600" />
      case 'closed': return <X className="w-4 h-4 text-gray-600" />
      case 'merged': return <GitMerge className="w-4 h-4 text-purple-600" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'text-gray-600 bg-gray-100'
      case 'review': return 'text-blue-600 bg-blue-100'
      case 'approved': return 'text-green-600 bg-green-100'
      case 'deployed': return 'text-purple-600 bg-purple-100'
      case 'reverted': return 'text-red-600 bg-red-100'
      case 'open': return 'text-blue-600 bg-blue-100'
      case 'closed': return 'text-gray-600 bg-gray-100'
      case 'merged': return 'text-purple-600 bg-purple-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getDeltaColor = (delta: number) => {
    if (delta > 0) return 'text-green-600'
    if (delta < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const filteredCommits = commits.filter(commit => {
    const authorMatch = filterAuthor === 'all' || commit.author === filterAuthor
    const statusMatch = filterStatus === 'all' || commit.status === filterStatus
    const searchMatch = searchTerm === '' || 
      commit.commit_message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      commit.author.toLowerCase().includes(searchTerm.toLowerCase())
    
    return authorMatch && statusMatch && searchMatch
  })

  const commitTrendData = commits.slice(0, 30).reverse().map((commit, index) => ({
    commit: index + 1,
    accuracy: commit.metrics_change.accuracy_delta,
    performance: commit.metrics_change.performance_delta,
    cost: commit.metrics_change.cost_delta
  }))

  const authorData = commits.reduce((acc, commit) => {
    acc[commit.author] = (acc[commit.author] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const authorChartData = Object.entries(authorData).map(([author, count]) => ({
    author,
    commits: count
  }))

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-primary">Version Control & Collaboration</h2>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Branch:</span>
            <select
              value={currentBranch}
              onChange={(e) => setCurrentBranch(e.target.value)}
              className="px-3 py-1 border border-border rounded text-sm font-medium text-primary"
            >
              {branches.map(branch => (
                <option key={branch.branch_id} value={branch.branch_name}>
                  {branch.branch_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateBranch(true)}
            className="btn btn-outline btn-sm"
          >
            <GitBranch className="w-4 h-4" />
            New Branch
          </button>
          
          <button
            onClick={() => setShowCreatePR(true)}
            className="btn btn-primary btn-sm"
          >
            <GitPullRequest className="w-4 h-4" />
            Create PR
          </button>
          
          <button
            onClick={fetchVersionData}
            disabled={isLoading}
            className="btn btn-outline btn-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-border">
        <div className="flex">
          {[
            { key: 'commits', label: 'Commits', icon: GitCommit },
            { key: 'branches', label: 'Branches', icon: GitBranch },
            { key: 'pull_requests', label: 'Pull Requests', icon: GitPullRequest },
            { key: 'diff', label: 'Diff Viewer', icon: Diff },
            { key: 'activity', label: 'Activity', icon: Activity }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setViewMode(key as any)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 ${
                viewMode === key
                  ? 'border-primary text-primary bg-blue-50'
                  : 'border-transparent text-muted hover:text-primary hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {/* Commits View */}
        {viewMode === 'commits' && (
          <div className="h-full flex">
            <div className="flex-1 overflow-y-auto">
              {/* Filters */}
              <div className="p-4 border-b border-border bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-muted" />
                    <input
                      type="text"
                      placeholder="Search commits..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-1 border border-border rounded text-sm w-64"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted" />
                    <select
                      value={filterAuthor}
                      onChange={(e) => setFilterAuthor(e.target.value)}
                      className="px-3 py-1 border border-border rounded text-sm"
                    >
                      <option value="all">All Authors</option>
                      {Array.from(new Set(commits.map(c => c.author))).map(author => (
                        <option key={author} value={author}>{author}</option>
                      ))}
                    </select>
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-3 py-1 border border-border rounded text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="deployed">Deployed</option>
                  </select>
                </div>
              </div>

              {/* Commit List */}
              <div className="p-4">
                <div className="space-y-3">
                  {filteredCommits.map(commit => (
                    <div
                      key={commit.commit_id}
                      onClick={() => setSelectedCommit(commit)}
                      className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedCommit?.commit_id === commit.commit_id ? 'border-primary bg-blue-50' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                            {commit.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-primary">{commit.commit_message}</div>
                            <div className="text-sm text-muted">
                              {commit.author} • {new Date(commit.timestamp).toLocaleDateString()} • {commit.commit_id.substring(0, 8)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {getStatusIcon(commit.status)}
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(commit.status)}`}>
                            {commit.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1">
                          <Plus className="w-3 h-3 text-green-600" />
                          <span className="text-green-600">{commit.changes.lines_added}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Minus className="w-3 h-3 text-red-600" />
                          <span className="text-red-600">{commit.changes.lines_removed}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Edit3 className="w-3 h-3 text-blue-600" />
                          <span className="text-blue-600">{commit.changes.lines_modified}</span>
                        </div>
                        
                        {commit.metrics_change.accuracy_delta !== 0 && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted">Accuracy:</span>
                            <span className={getDeltaColor(commit.metrics_change.accuracy_delta)}>
                              {commit.metrics_change.accuracy_delta > 0 ? '+' : ''}{commit.metrics_change.accuracy_delta}%
                            </span>
                          </div>
                        )}
                      </div>

                      {commit.tags.length > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          {commit.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                              <Tag className="w-3 h-3 inline mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {commit.comments.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-muted">
                          <MessageSquare className="w-3 h-3" />
                          <span>{commit.comments.length} comments</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Commit Details Sidebar */}
            {selectedCommit && (
              <div className="w-96 border-l border-border bg-gray-50 overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-primary">Commit Details</h3>
                    <button
                      onClick={() => setSelectedCommit(null)}
                      className="text-muted hover:text-primary"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-primary mb-1">Message</div>
                      <div className="text-sm text-gray-700">{selectedCommit.commit_message}</div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-primary mb-1">Author</div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                          {selectedCommit.author.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{selectedCommit.author}</span>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-primary mb-1">Changes</div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="card p-2 text-center">
                          <div className="text-green-600 font-medium">+{selectedCommit.changes.lines_added}</div>
                          <div className="text-xs text-muted">Added</div>
                        </div>
                        <div className="card p-2 text-center">
                          <div className="text-red-600 font-medium">-{selectedCommit.changes.lines_removed}</div>
                          <div className="text-xs text-muted">Removed</div>
                        </div>
                        <div className="card p-2 text-center">
                          <div className="text-blue-600 font-medium">{selectedCommit.changes.lines_modified}</div>
                          <div className="text-xs text-muted">Modified</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-primary mb-1">Performance Impact</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted">Accuracy:</span>
                          <span className={`text-sm font-medium ${getDeltaColor(selectedCommit.metrics_change.accuracy_delta)}`}>
                            {selectedCommit.metrics_change.accuracy_delta > 0 ? '+' : ''}{selectedCommit.metrics_change.accuracy_delta}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted">Performance:</span>
                          <span className={`text-sm font-medium ${getDeltaColor(selectedCommit.metrics_change.performance_delta)}`}>
                            {selectedCommit.metrics_change.performance_delta > 0 ? '+' : ''}{selectedCommit.metrics_change.performance_delta}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted">Cost:</span>
                          <span className={`text-sm font-medium ${getDeltaColor(-selectedCommit.metrics_change.cost_delta)}`}>
                            {selectedCommit.metrics_change.cost_delta > 0 ? '+' : ''}{selectedCommit.metrics_change.cost_delta}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowDiff(true)}
                        className="btn btn-primary btn-sm flex-1"
                      >
                        <Diff className="w-4 h-4" />
                        View Diff
                      </button>
                      
                      <button
                        onClick={() => revertCommit(selectedCommit.commit_id)}
                        className="btn btn-outline btn-sm"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Revert
                      </button>
                    </div>

                    {selectedCommit.comments.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-primary mb-2">Comments</div>
                        <div className="space-y-2">
                          {selectedCommit.comments.map(comment => (
                            <div key={comment.comment_id} className="card p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-primary">{comment.author}</span>
                                <span className="text-xs text-muted">{new Date(comment.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="text-sm text-gray-700">{comment.content}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branches View */}
        {viewMode === 'branches' && (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {branches.map(branch => (
                <div key={branch.branch_id} className="card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-primary" />
                      <span className="font-semibold text-primary">{branch.branch_name}</span>
                      {branch.status === 'protected' && <Shield className="w-4 h-4 text-yellow-600" />}
                    </div>
                    
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(branch.status)}`}>
                      {branch.status}
                    </span>
                  </div>

                  <div className="text-sm text-muted mb-3">{branch.description}</div>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-muted">Ahead</div>
                      <div className="font-medium text-primary">{branch.commits_ahead} commits</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted">Behind</div>
                      <div className="font-medium text-primary">{branch.commits_behind} commits</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted">
                      Created by {branch.created_by} • {new Date(branch.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {branch.merge_conflicts && (
                        <AlertTriangle className="w-4 h-4 text-orange-600" title="Merge conflicts" />
                      )}
                      
                      <button
                        onClick={() => setCurrentBranch(branch.branch_name)}
                        className="btn btn-outline btn-xs"
                      >
                        Switch
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pull Requests View */}
        {viewMode === 'pull_requests' && (
          <div className="p-4">
            <div className="space-y-4">
              {pullRequests.map(pr => (
                <div key={pr.pr_id} className="card p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      {getStatusIcon(pr.status)}
                      <div>
                        <h3 className="font-semibold text-primary">{pr.title}</h3>
                        <div className="text-sm text-muted mb-2">{pr.description}</div>
                        <div className="text-xs text-muted">
                          #{pr.pr_id} opened by {pr.author} • {new Date(pr.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(pr.status)}`}>
                        {pr.status}
                      </span>
                      
                      {pr.status === 'open' && (
                        <button
                          onClick={() => mergePullRequest(pr.pr_id, pr.merge_strategy)}
                          disabled={!pr.checks_passing || pr.conflicts || pr.approvals < pr.required_approvals}
                          className="btn btn-primary btn-sm"
                        >
                          <GitMerge className="w-4 h-4" />
                          Merge
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1 text-sm">
                      <GitBranch className="w-3 h-3 text-muted" />
                      <span className="font-medium text-primary">{pr.source_branch}</span>
                      <ArrowRight className="w-3 h-3 text-muted" />
                      <span className="font-medium text-primary">{pr.target_branch}</span>
                    </div>
                    
                    {pr.conflicts && (
                      <div className="flex items-center gap-1 text-sm text-orange-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Conflicts</span>
                      </div>
                    )}
                    
                    {pr.checks_passing ? (
                      <div className="flex items-center gap-1 text-sm text-green-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>Checks passing</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-sm text-red-600">
                        <X className="w-3 h-3" />
                        <span>Checks failing</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-muted">Approvals:</span>
                        <span className="font-medium text-primary ml-1">
                          {pr.approvals}/{pr.required_approvals}
                        </span>
                      </div>
                      
                      {pr.comments.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-muted">
                          <MessageSquare className="w-3 h-3" />
                          <span>{pr.comments.length}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPR(pr)}
                        className="btn btn-outline btn-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </div>
                  </div>

                  {pr.labels.length > 0 && (
                    <div className="flex items-center gap-2 mt-3">
                      {pr.labels.map(label => (
                        <span key={label} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Activity View */}
        {viewMode === 'activity' && (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h3 className="font-semibold text-primary mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {activities.map(activity => (
                    <div key={activity.activity_id} className="flex items-start gap-3 p-3 border border-border rounded">
                      <div className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-xs">
                        {activity.user.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-700">{activity.description}</div>
                        <div className="text-xs text-muted">{new Date(activity.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-primary mb-4">Commit Trends</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={commitTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="commit" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="accuracy" stroke="#10b981" name="Accuracy %" />
                      <Line type="monotone" dataKey="performance" stroke="#3b82f6" name="Performance %" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="mt-6">
                  <h4 className="font-semibold text-primary mb-3">Contributors</h4>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={authorChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          fill="#8884d8"
                          dataKey="commits"
                          label={({ author, commits }) => `${author}: ${commits}`}
                        >
                          {authorChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Branch Modal */}
      {showCreateBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-primary">Create New Branch</h3>
              <button
                onClick={() => setShowCreateBranch(false)}
                className="text-muted hover:text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Branch Name</label>
                <input
                  type="text"
                  placeholder="feature/new-improvement"
                  className="w-full px-3 py-2 border border-border rounded"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Base Branch</label>
                <select className="w-full px-3 py-2 border border-border rounded">
                  {branches.map(branch => (
                    <option key={branch.branch_id} value={branch.branch_name}>
                      {branch.branch_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea
                  placeholder="Describe the purpose of this branch..."
                  className="w-full px-3 py-2 border border-border rounded h-20 resize-none"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateBranch(false)}
                  className="btn btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Create branch logic
                    setShowCreateBranch(false)
                  }}
                  className="btn btn-primary flex-1"
                >
                  Create Branch
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diff Viewer Modal */}
      {showDiff && selectedCommit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 h-5/6 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-primary">Diff Viewer</h3>
                <span className="text-sm text-muted">• {selectedCommit.commit_id.substring(0, 8)}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <select
                  value={diffMode}
                  onChange={(e) => setDiffMode(e.target.value as any)}
                  className="px-3 py-1 border border-border rounded text-sm"
                >
                  <option value="side_by_side">Side by Side</option>
                  <option value="unified">Unified</option>
                </select>
                
                <button
                  onClick={() => setShowDiff(false)}
                  className="text-muted hover:text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 bg-gray-50 font-mono text-sm">
              {diffMode === 'side_by_side' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="bg-red-100 text-red-800 px-2 py-1 text-xs font-medium mb-2">BEFORE</div>
                    <div className="bg-white border rounded p-3 whitespace-pre-wrap">
                      {selectedCommit.diff.old_content}
                    </div>
                  </div>
                  <div>
                    <div className="bg-green-100 text-green-800 px-2 py-1 text-xs font-medium mb-2">AFTER</div>
                    <div className="bg-white border rounded p-3 whitespace-pre-wrap">
                      {selectedCommit.diff.new_content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border rounded p-3">
                  {selectedCommit.diff.hunks.map((hunk, hunkIndex) => (
                    <div key={hunkIndex} className="mb-4">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 text-xs font-medium mb-2">
                        @@ -{hunk.old_start},{hunk.old_lines} +{hunk.new_start},{hunk.new_lines} @@
                      </div>
                      {hunk.lines.map((line, lineIndex) => (
                        <div
                          key={lineIndex}
                          className={`${
                            line.type === 'addition' ? 'bg-green-50 text-green-800' :
                            line.type === 'deletion' ? 'bg-red-50 text-red-800' :
                            'bg-white text-gray-700'
                          } px-2 py-1 border-l-2 ${
                            line.type === 'addition' ? 'border-green-500' :
                            line.type === 'deletion' ? 'border-red-500' :
                            'border-gray-300'
                          }`}
                        >
                          <span className="text-xs text-gray-500 mr-4">
                            {line.line_number_old || ' '} {line.line_number_new || ' '}
                          </span>
                          {line.type === 'addition' ? '+' : line.type === 'deletion' ? '-' : ' '}
                          {line.content}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}