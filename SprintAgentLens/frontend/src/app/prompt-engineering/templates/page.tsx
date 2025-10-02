'use client'

import { useState, useEffect } from 'react'
import { 
  ChevronRight,
  Library,
  Search,
  Filter,
  Plus,
  Star,
  Download,
  Upload,
  Eye,
  Heart,
  Share2,
  Bookmark,
  Tag,
  Users,
  Clock,
  TrendingUp,
  FileText,
  Code,
  Zap,
  Settings,
  MoreHorizontal,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  CheckCircle,
  Edit3,
  Copy,
  Trash2,
  XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Interface definitions
interface Template {
  id: string
  name: string
  description: string
  content: string
  category: string
  tags: string[]
  author: string
  author_avatar?: string
  created_at: string
  updated_at: string
  downloads: number
  likes: number
  rating: number
  rating_count: number
  is_public: boolean
  is_featured: boolean
  is_liked: boolean
  is_bookmarked: boolean
  variables: {
    name: string
    type: string
    description: string
    default_value?: string
  }[]
  use_cases: string[]
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  version: string
}

interface Category {
  id: string
  name: string
  count: number
  description: string
  icon: string
}

export default function TemplateLibraryPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'downloads'>('popular')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Mock data - replace with actual API calls
      setCategories([
        {
          id: '1',
          name: 'Customer Support',
          count: 24,
          description: 'Templates for customer service and support interactions',
          icon: 'Users'
        },
        {
          id: '2',
          name: 'Content Generation',
          count: 18,
          description: 'Templates for creating marketing and creative content',
          icon: 'FileText'
        },
        {
          id: '3',
          name: 'Code Review',
          count: 15,
          description: 'Templates for code analysis and review processes',
          icon: 'Code'
        },
        {
          id: '4',
          name: 'Data Analysis',
          count: 12,
          description: 'Templates for analyzing and interpreting data',
          icon: 'BarChart3'
        },
        {
          id: '5',
          name: 'Education',
          count: 9,
          description: 'Templates for educational content and tutoring',
          icon: 'GraduationCap'
        }
      ])

      setTemplates([
        {
          id: '1',
          name: 'Professional Customer Support',
          description: 'A comprehensive template for handling customer inquiries with a professional tone. Includes escalation paths and empathy guidelines.',
          content: 'You are a professional customer support representative. Please assist the customer with their inquiry about {{inquiry_topic}}. Maintain a {{tone}} tone and provide {{detail_level}} explanations. If the issue requires escalation, follow the {{escalation_process}} protocol.',
          category: 'Customer Support',
          tags: ['professional', 'escalation', 'empathy', 'troubleshooting'],
          author: 'Sarah Chen',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T14:30:00Z',
          downloads: 1247,
          likes: 89,
          rating: 4.8,
          rating_count: 45,
          is_public: true,
          is_featured: true,
          is_liked: false,
          is_bookmarked: true,
          variables: [
            { name: 'inquiry_topic', type: 'string', description: 'The main topic of customer inquiry' },
            { name: 'tone', type: 'string', description: 'Communication tone', default_value: 'professional and empathetic' },
            { name: 'detail_level', type: 'string', description: 'Level of detail in response', default_value: 'comprehensive' },
            { name: 'escalation_process', type: 'string', description: 'Escalation procedure to follow' }
          ],
          use_cases: ['Customer service', 'Technical support', 'Billing inquiries', 'Product questions'],
          difficulty: 'beginner',
          version: '2.1'
        },
        {
          id: '2',
          name: 'Creative Content Generator',
          description: 'Generate engaging marketing content with customizable style and audience targeting. Perfect for social media and blog posts.',
          content: 'Create {{content_type}} content for {{target_audience}} about {{topic}}. The tone should be {{tone}} and the style should be {{style}}. Include {{key_points}} and ensure the content is {{length_requirement}}.',
          category: 'Content Generation',
          tags: ['marketing', 'social media', 'blog', 'creative', 'audience'],
          author: 'Mike Rodriguez',
          created_at: '2024-01-18T09:15:00Z',
          updated_at: '2024-01-19T16:45:00Z',
          downloads: 892,
          likes: 67,
          rating: 4.6,
          rating_count: 32,
          is_public: true,
          is_featured: false,
          is_liked: true,
          is_bookmarked: false,
          variables: [
            { name: 'content_type', type: 'string', description: 'Type of content to create' },
            { name: 'target_audience', type: 'string', description: 'Intended audience for the content' },
            { name: 'topic', type: 'string', description: 'Main topic or subject' },
            { name: 'tone', type: 'string', description: 'Writing tone', default_value: 'engaging and informative' },
            { name: 'style', type: 'string', description: 'Writing style', default_value: 'conversational' },
            { name: 'key_points', type: 'array', description: 'Key points to include' },
            { name: 'length_requirement', type: 'string', description: 'Content length requirement' }
          ],
          use_cases: ['Social media posts', 'Blog articles', 'Email campaigns', 'Product descriptions'],
          difficulty: 'intermediate',
          version: '1.4'
        },
        {
          id: '3',
          name: 'Code Review Assistant',
          description: 'Comprehensive code review template that checks for quality, security, performance, and best practices across multiple programming languages.',
          content: 'Review the following {{language}} code for:\n1. Code quality and readability\n2. Performance optimization opportunities\n3. Security vulnerabilities\n4. Best practices adherence\n5. {{additional_criteria}}\n\nCode:\n```{{language}}\n{{code}}\n```\n\nProvide {{feedback_style}} feedback with specific suggestions for improvement.',
          category: 'Code Review',
          tags: ['code quality', 'security', 'performance', 'best practices', 'programming'],
          author: 'Lisa Wang',
          created_at: '2024-01-12T14:20:00Z',
          updated_at: '2024-01-18T11:10:00Z',
          downloads: 634,
          likes: 54,
          rating: 4.9,
          rating_count: 28,
          is_public: true,
          is_featured: true,
          is_liked: false,
          is_bookmarked: true,
          variables: [
            { name: 'language', type: 'string', description: 'Programming language of the code' },
            { name: 'code', type: 'string', description: 'Code to be reviewed' },
            { name: 'additional_criteria', type: 'string', description: 'Additional review criteria' },
            { name: 'feedback_style', type: 'string', description: 'Style of feedback', default_value: 'constructive and detailed' }
          ],
          use_cases: ['Code reviews', 'Security audits', 'Performance optimization', 'Mentoring'],
          difficulty: 'advanced',
          version: '3.0'
        }
      ])
    } catch (error) {
      console.error('Error fetching template data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    const matchesDifficulty = !filterDifficulty || template.difficulty === filterDifficulty
    const matchesFeatured = !showFeaturedOnly || template.is_featured
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesFeatured
  })

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    let aValue, bValue
    
    switch (sortBy) {
      case 'popular':
        aValue = a.likes + a.downloads
        bValue = b.likes + b.downloads
        break
      case 'recent':
        aValue = new Date(a.updated_at).getTime()
        bValue = new Date(b.updated_at).getTime()
        break
      case 'rating':
        aValue = a.rating
        bValue = b.rating
        break
      case 'downloads':
        aValue = a.downloads
        bValue = b.downloads
        break
      default:
        return 0
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800'
      case 'advanced': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleLikeTemplate = async (templateId: string) => {
    // Implement like functionality
    setTemplates(templates.map(t => 
      t.id === templateId 
        ? { ...t, is_liked: !t.is_liked, likes: t.is_liked ? t.likes - 1 : t.likes + 1 }
        : t
    ))
  }

  const handleBookmarkTemplate = async (templateId: string) => {
    // Implement bookmark functionality
    setTemplates(templates.map(t => 
      t.id === templateId 
        ? { ...t, is_bookmarked: !t.is_bookmarked }
        : t
    ))
  }

  const handleDownloadTemplate = async (templateId: string) => {
    // Implement download functionality
    setTemplates(templates.map(t => 
      t.id === templateId 
        ? { ...t, downloads: t.downloads + 1 }
        : t
    ))
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
              <span className="text-primary font-medium">Template Library</span>
            </nav>
            <h1 className="text-2xl font-bold text-primary">Prompt Template Library</h1>
            <p className="text-gray-600 mt-1">
              Centralized marketplace and library for sharing and discovering prompt templates
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4" />
              Import
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors">
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          {/* Categories */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedCategory('')}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                  !selectedCategory ? "bg-primary-alpha text-primary" : "hover:bg-gray-100"
                )}
              >
                All Templates ({templates.length})
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.name)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                    selectedCategory === category.name 
                      ? "bg-primary-alpha text-primary" 
                      : "hover:bg-gray-100"
                  )}
                >
                  {category.name} ({category.count})
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Filters</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={showFeaturedOnly}
                  onChange={(e) => setShowFeaturedOnly(e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                  Featured only
                </label>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Library Stats</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Total Templates:</span>
                <span className="font-medium">{templates.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Contributors:</span>
                <span className="font-medium">{new Set(templates.map(t => t.author)).size}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Downloads:</span>
                <span className="font-medium">{templates.reduce((sum, t) => sum + t.downloads, 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Search and Controls */}
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search templates, tags, or descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
                
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="popular">Most Popular</option>
                  <option value="recent">Most Recent</option>
                  <option value="rating">Highest Rated</option>
                  <option value="downloads">Most Downloaded</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  title={`Sort ${sortOrder === 'desc' ? 'Ascending' : 'Descending'}`}
                >
                  {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                </button>
                
                <div className="flex border border-gray-300 rounded-md">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === 'grid' ? "bg-primary text-white" : "hover:bg-gray-50"
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === 'list' ? "bg-primary text-white" : "hover:bg-gray-50"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{sortedTemplates.length} templates found</span>
                <div className="flex items-center gap-4">
                  <button className="hover:text-primary">Clear filters</button>
                </div>
              </div>
            </div>
          </div>

          {/* Templates Grid/List */}
          {loading ? (
            <div className="text-center py-12">
              <Library className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Loading templates...</p>
            </div>
          ) : sortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <Library className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search terms or filters
              </p>
              <button className="text-primary hover:text-primary-dark">
                Clear all filters
              </button>
            </div>
          ) : (
            <div className={cn(
              "gap-6",
              viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "space-y-4"
            )}>
              {sortedTemplates.map((template) => (
                <div
                  key={template.id}
                  className={cn(
                    "bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200",
                    viewMode === 'grid' ? "p-6" : "p-4 flex gap-4"
                  )}
                >
                  {viewMode === 'grid' ? (
                    // Grid View
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{template.name}</h3>
                            {template.is_featured && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <p className="text-sm text-gray-500">by {template.author}</p>
                        </div>
                        <button
                          onClick={() => handleBookmarkTemplate(template.id)}
                          className={cn(
                            "p-1 rounded",
                            template.is_bookmarked ? "text-primary" : "text-gray-400 hover:text-primary"
                          )}
                        >
                          <Bookmark className={cn("w-4 h-4", template.is_bookmarked && "fill-current")} />
                        </button>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">{template.description}</p>
                      
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {template.category}
                        </span>
                        <span className={cn("text-xs px-2 py-1 rounded", getDifficultyColor(template.difficulty))}>
                          {template.difficulty}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {template.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            #{tag}
                          </span>
                        ))}
                        {template.tags.length > 3 && (
                          <span className="text-xs text-gray-500">+{template.tags.length - 3} more</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{template.rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            <span>{template.downloads.toLocaleString()}</span>
                          </div>
                        </div>
                        <span>{formatDate(template.updated_at)}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadTemplate(template.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Use Template
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTemplate(template)
                            setShowPreview(true)
                          }}
                          className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleLikeTemplate(template.id)}
                          className={cn(
                            "p-2 border border-gray-300 rounded-md hover:bg-gray-50",
                            template.is_liked && "text-red-500 border-red-300"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", template.is_liked && "fill-current")} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    // List View
                    <div className="flex-1 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{template.name}</h3>
                          {template.is_featured && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {template.category}
                          </span>
                          <span className={cn("text-xs px-2 py-1 rounded", getDifficultyColor(template.difficulty))}>
                            {template.difficulty}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>by {template.author}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span>{template.rating.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-4 h-4" />
                            <span>{template.downloads.toLocaleString()}</span>
                          </div>
                          <span>{formatDate(template.updated_at)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadTemplate(template.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Use
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTemplate(template)
                            setShowPreview(true)
                          }}
                          className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleLikeTemplate(template.id)}
                          className={cn(
                            "p-2 border border-gray-300 rounded-md hover:bg-gray-50",
                            template.is_liked && "text-red-500 border-red-300"
                          )}
                        >
                          <Heart className={cn("w-4 h-4", template.is_liked && "fill-current")} />
                        </button>
                        <button
                          onClick={() => handleBookmarkTemplate(template.id)}
                          className={cn(
                            "p-2 border border-gray-300 rounded-md hover:bg-gray-50",
                            template.is_bookmarked && "text-primary border-primary"
                          )}
                        >
                          <Bookmark className={cn("w-4 h-4", template.is_bookmarked && "fill-current")} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{selectedTemplate.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">by {selectedTemplate.author}</p>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">Variables</h3>
                  <div className="space-y-2 mb-4">
                    {selectedTemplate.variables.map((variable, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-sm">{variable.name}</div>
                        <div className="text-xs text-gray-500">{variable.description}</div>
                      </div>
                    ))}
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">Use Cases</h3>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedTemplate.use_cases.map((useCase, index) => (
                      <li key={index}>{useCase}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Template Content</h3>
                  <div className="bg-gray-50 p-4 rounded font-mono text-sm whitespace-pre-wrap">
                    {selectedTemplate.content}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>Version {selectedTemplate.version}</span>
                  <span>Updated {formatDate(selectedTemplate.updated_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadTemplate(selectedTemplate.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Use Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}