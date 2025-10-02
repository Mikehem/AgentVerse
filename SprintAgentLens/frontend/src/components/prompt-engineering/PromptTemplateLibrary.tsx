'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Search, Star, Download, Upload, Heart, Eye, Share, Copy, Edit, Trash2, Plus, Filter, SortAsc, SortDesc, Package, Store, Code, FileText, Sparkles, Award, TrendingUp, Users, Globe, Lock, Unlock, BookOpen, Lightbulb, Target, Zap, Clock, DollarSign, Shield, ChevronDown, ExternalLink, GitBranch, Database, Layers, Settings, MessageSquare, ThumbsUp, Flag } from 'lucide-react'

interface PromptTemplate {
  id: string
  name: string
  description: string
  content: string
  category: string
  subcategory: string
  tags: string[]
  author: {
    id: string
    name: string
    avatar?: string
    verified: boolean
  }
  stats: {
    views: number
    downloads: number
    likes: number
    forks: number
    stars: number
    comments: number
  }
  performance: {
    avgScore: number
    avgLatency: number
    avgCost: number
    successRate: number
  }
  metadata: {
    version: string
    createdAt: Date
    updatedAt: Date
    license: 'MIT' | 'Apache' | 'GPL' | 'Commercial' | 'Custom'
    compatibility: string[]
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    estimatedTokens: number
  }
  pricing: {
    type: 'free' | 'freemium' | 'premium' | 'enterprise'
    price?: number
    currency?: string
  }
  variables: Array<{
    name: string
    description: string
    type: 'string' | 'number' | 'boolean' | 'array' | 'object'
    required: boolean
    defaultValue?: any
    examples?: any[]
  }>
  examples: Array<{
    input: Record<string, any>
    output: string
    description: string
  }>
  featured: boolean
  trending: boolean
  verified: boolean
  isPrivate: boolean
}

interface TemplateCollection {
  id: string
  name: string
  description: string
  templates: string[]
  author: {
    id: string
    name: string
    avatar?: string
  }
  isPublic: boolean
  stats: {
    views: number
    likes: number
    forks: number
  }
  createdAt: Date
  updatedAt: Date
}

interface TemplateReview {
  id: string
  templateId: string
  author: {
    id: string
    name: string
    avatar?: string
  }
  rating: number
  comment: string
  helpful: number
  createdAt: Date
}

const PromptTemplateLibrary = ({ projectId }: { projectId: string }) => {
  const [activeTab, setActiveTab] = useState('browse')
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [collections, setCollections] = useState<TemplateCollection[]>([])
  const [reviews, setReviews] = useState<TemplateReview[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sortBy, setSortBy] = useState('popularity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterDifficulty, setFilterDifficulty] = useState('all')
  const [filterPricing, setFilterPricing] = useState('all')
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false)
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [myTemplates, setMyTemplates] = useState<PromptTemplate[]>([])
  const [likedTemplates, setLikedTemplates] = useState<Set<string>>(new Set())
  const [starredTemplates, setStarredTemplates] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTemplateData()
  }, [projectId])

  const loadTemplateData = async () => {
    setIsLoading(true)
    try {
      const [templatesRes, collectionsRes, reviewsRes, myTemplatesRes] = await Promise.all([
        fetch(`/api/v1/projects/${projectId}/prompt-templates/public`),
        fetch(`/api/v1/projects/${projectId}/prompt-templates/collections`),
        fetch(`/api/v1/projects/${projectId}/prompt-templates/reviews`),
        fetch(`/api/v1/projects/${projectId}/prompt-templates/my-templates`)
      ])

      setTemplates(await templatesRes.json())
      setCollections(await collectionsRes.json())
      setReviews(await reviewsRes.json())
      setMyTemplates(await myTemplatesRes.json())
    } catch (error) {
      console.error('Failed to load template data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const categories = [
    'All Categories',
    'Content Creation',
    'Data Analysis',
    'Code Generation',
    'Customer Support',
    'Education',
    'Marketing',
    'Research',
    'Translation',
    'Summarization',
    'Creative Writing',
    'Business Intelligence',
    'Legal',
    'Healthcare',
    'Finance'
  ]

  const allTags = Array.from(new Set(templates.flatMap(t => t.tags)))

  const filteredTemplates = templates
    .filter(template => {
      if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !template.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false
      }
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false
      }
      if (selectedTags.length > 0 && !selectedTags.some(tag => template.tags.includes(tag))) {
        return false
      }
      if (filterDifficulty !== 'all' && template.metadata.difficulty !== filterDifficulty) {
        return false
      }
      if (filterPricing !== 'all' && template.pricing.type !== filterPricing) {
        return false
      }
      if (showFeaturedOnly && !template.featured) {
        return false
      }
      if (showVerifiedOnly && !template.verified) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      let aValue: any, bValue: any
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'created':
          aValue = new Date(a.metadata.createdAt).getTime()
          bValue = new Date(b.metadata.createdAt).getTime()
          break
        case 'updated':
          aValue = new Date(a.metadata.updatedAt).getTime()
          bValue = new Date(b.metadata.updatedAt).getTime()
          break
        case 'popularity':
          aValue = a.stats.downloads + a.stats.likes + a.stats.stars
          bValue = b.stats.downloads + b.stats.likes + b.stats.stars
          break
        case 'rating':
          aValue = a.performance.avgScore
          bValue = b.performance.avgScore
          break
        case 'price':
          aValue = a.pricing.price || 0
          bValue = b.pricing.price || 0
          break
        default:
          return 0
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

  const handleLikeTemplate = useCallback(async (templateId: string) => {
    try {
      const method = likedTemplates.has(templateId) ? 'DELETE' : 'POST'
      await fetch(`/api/v1/projects/${projectId}/prompt-templates/${templateId}/like`, { method })
      
      setLikedTemplates(prev => {
        const newSet = new Set(prev)
        if (method === 'POST') {
          newSet.add(templateId)
        } else {
          newSet.delete(templateId)
        }
        return newSet
      })

      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, stats: { ...template.stats, likes: template.stats.likes + (method === 'POST' ? 1 : -1) }}
          : template
      ))
    } catch (error) {
      console.error('Failed to like template:', error)
    }
  }, [projectId, likedTemplates])

  const handleStarTemplate = useCallback(async (templateId: string) => {
    try {
      const method = starredTemplates.has(templateId) ? 'DELETE' : 'POST'
      await fetch(`/api/v1/projects/${projectId}/prompt-templates/${templateId}/star`, { method })
      
      setStarredTemplates(prev => {
        const newSet = new Set(prev)
        if (method === 'POST') {
          newSet.add(templateId)
        } else {
          newSet.delete(templateId)
        }
        return newSet
      })

      setTemplates(prev => prev.map(template => 
        template.id === templateId 
          ? { ...template, stats: { ...template.stats, stars: template.stats.stars + (method === 'POST' ? 1 : -1) }}
          : template
      ))
    } catch (error) {
      console.error('Failed to star template:', error)
    }
  }, [projectId, starredTemplates])

  const handleDownloadTemplate = useCallback(async (template: PromptTemplate) => {
    try {
      await fetch(`/api/v1/projects/${projectId}/prompt-templates/${template.id}/download`, { method: 'POST' })
      
      setTemplates(prev => prev.map(t => 
        t.id === template.id 
          ? { ...t, stats: { ...t.stats, downloads: t.stats.downloads + 1 }}
          : t
      ))

      const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Failed to download template:', error)
    }
  }, [projectId])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200'
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'advanced': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'expert': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPricingColor = (type: string) => {
    switch (type) {
      case 'free': return 'bg-green-100 text-green-800 border-green-200'
      case 'freemium': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'premium': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'enterprise': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderTemplateCard = (template: PromptTemplate) => (
    <Card key={template.id} className="transition-all hover:shadow-lg cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                {template.name}
              </CardTitle>
              {template.featured && <Badge variant="default" className="gap-1">
                <Sparkles className="w-3 h-3" />
                Featured
              </Badge>}
              {template.verified && <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                Verified
              </Badge>}
              {template.trending && <Badge variant="secondary" className="gap-1">
                <TrendingUp className="w-3 h-3" />
                Trending
              </Badge>}
            </div>
            <CardDescription className="line-clamp-2">{template.description}</CardDescription>
          </div>
          <Button
            onClick={(e) => {
              e.stopPropagation()
              setSelectedTemplate(template)
              setShowPreview(true)
            }}
            variant="ghost"
            size="sm"
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyColor(template.metadata.difficulty)}>
              {template.metadata.difficulty}
            </Badge>
            <Badge className={getPricingColor(template.pricing.type)}>
              {template.pricing.type}
              {template.pricing.price && ` $${template.pricing.price}`}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Star className="w-4 h-4 text-yellow-500" />
            <span>{template.performance.avgScore.toFixed(1)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{template.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              <span>{template.stats.downloads}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{template.stats.likes}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              <span>{template.stats.stars}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <img
              src={template.author.avatar || '/api/placeholder/24/24'}
              alt={template.author.name}
              className="w-5 h-5 rounded-full"
            />
            <span>{template.author.name}</span>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleLikeTemplate(template.id)
              }}
              variant="ghost"
              size="sm"
              className={`gap-1 ${likedTemplates.has(template.id) ? 'text-red-500' : ''}`}
            >
              <Heart className={`w-4 h-4 ${likedTemplates.has(template.id) ? 'fill-current' : ''}`} />
              Like
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleStarTemplate(template.id)
              }}
              variant="ghost"
              size="sm"
              className={`gap-1 ${starredTemplates.has(template.id) ? 'text-yellow-500' : ''}`}
            >
              <Star className={`w-4 h-4 ${starredTemplates.has(template.id) ? 'fill-current' : ''}`} />
              Star
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={(e) => {
                e.stopPropagation()
                handleDownloadTemplate(template)
              }}
              size="sm"
              variant="outline"
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              Use
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prompt Template Library</h2>
          <p className="text-gray-600">Discover, share, and reuse prompt templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Import
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="browse" className="gap-2">
            <Store className="w-4 h-4" />
            Browse
          </TabsTrigger>
          <TabsTrigger value="my-templates" className="gap-2">
            <Package className="w-4 h-4" />
            My Templates
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-2">
            <Layers className="w-4 h-4" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="starred" className="gap-2">
            <Star className="w-4 h-4" />
            Starred
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Marketplace
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                    {(selectedTags.length > 0 || filterDifficulty !== 'all' || filterPricing !== 'all' || showFeaturedOnly || showVerifiedOnly) && (
                      <Badge variant="secondary" className="ml-1">
                        {[selectedTags.length, filterDifficulty !== 'all' ? 1 : 0, filterPricing !== 'all' ? 1 : 0, showFeaturedOnly ? 1 : 0, showVerifiedOnly ? 1 : 0].reduce((a, b) => a + b, 0)}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                          <SelectItem value="expert">Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Pricing</Label>
                      <Select value={filterPricing} onValueChange={setFilterPricing}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="freemium">Freemium</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Featured Only</Label>
                        <Switch checked={showFeaturedOnly} onCheckedChange={setShowFeaturedOnly} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Verified Only</Label>
                        <Switch checked={showVerifiedOnly} onCheckedChange={setShowVerifiedOnly} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {allTags.slice(0, 20).map((tag) => (
                          <Badge
                            key={tag}
                            variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              if (selectedTags.includes(tag)) {
                                setSelectedTags(selectedTags.filter(t => t !== tag))
                              } else {
                                setSelectedTags([...selectedTags, tag])
                              }
                            }}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="updated">Updated</SelectItem>
                  <SelectItem value="price">Price</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button
                variant={view === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('grid')}
              >
                Grid
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setView('list')}
              >
                List
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Showing {filteredTemplates.length} of {templates.length} templates
          </div>

          <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredTemplates.map((template) => renderTemplateCard(template))}
          </div>
        </TabsContent>

        <TabsContent value="my-templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">My Templates</h3>
              <p className="text-sm text-gray-600">{myTemplates.length} templates created</p>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Create New
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myTemplates.map((template) => (
              <Card key={template.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">{template.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this template? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={getDifficultyColor(template.metadata.difficulty)}>
                      {template.metadata.difficulty}
                    </Badge>
                    <Badge variant={template.isPrivate ? 'outline' : 'default'} className="gap-1">
                      {template.isPrivate ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      {template.isPrivate ? 'Private' : 'Public'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">{template.stats.downloads}</div>
                      <div className="text-xs text-gray-500">Downloads</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{template.stats.likes}</div>
                      <div className="text-xs text-gray-500">Likes</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{template.performance.avgScore.toFixed(1)}</div>
                      <div className="text-xs text-gray-500">Avg Score</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="gap-1">
                      <Share className="w-4 h-4" />
                      Share
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Copy className="w-4 h-4" />
                      Clone
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Template Collections</h3>
              <p className="text-sm text-gray-600">Curated sets of related templates</p>
            </div>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Collection
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {collections.map((collection) => (
              <Card key={collection.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {collection.name}
                        <Badge variant={collection.isPublic ? 'default' : 'outline'}>
                          {collection.isPublic ? 'Public' : 'Private'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{collection.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">{collection.templates.length}</div>
                      <div className="text-xs text-gray-500">Templates</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{collection.stats.views}</div>
                      <div className="text-xs text-gray-500">Views</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">{collection.stats.likes}</div>
                      <div className="text-xs text-gray-500">Likes</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={collection.author.avatar || '/api/placeholder/24/24'}
                        alt={collection.author.name}
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="text-sm">{collection.author.name}</span>
                    </div>
                    <Button size="sm">View Collection</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="starred" className="space-y-4">
          <div className="text-center py-12">
            <Star className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No starred templates yet</h3>
            <p className="text-gray-600 mb-4">Star templates you find useful to access them quickly</p>
            <Button onClick={() => setActiveTab('browse')}>
              Browse Templates
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <div className="text-center py-12">
            <Store className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Marketplace Coming Soon</h3>
            <p className="text-gray-600 mb-4">Buy and sell premium prompt templates</p>
            <Button disabled>
              Join Waitlist
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedTemplate.name}
                  {selectedTemplate.verified && (
                    <Badge variant="outline" className="gap-1">
                      <Shield className="w-3 h-3" />
                      Verified
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>{selectedTemplate.description}</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{selectedTemplate.performance.avgScore.toFixed(1)}</div>
                    <div className="text-xs text-gray-500">Avg Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{selectedTemplate.performance.avgLatency}ms</div>
                    <div className="text-xs text-gray-500">Avg Latency</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">${selectedTemplate.performance.avgCost.toFixed(4)}</div>
                    <div className="text-xs text-gray-500">Avg Cost</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(selectedTemplate.performance.successRate * 100)}%</div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h4 className="font-semibold">Template Content</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</pre>
                  </div>
                </div>

                {selectedTemplate.variables.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Variables</h4>
                    <div className="space-y-2">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium">{variable.name}</div>
                            <div className="text-sm text-gray-600">{variable.description}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{variable.type}</Badge>
                            {variable.required && <Badge variant="secondary">Required</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleDownloadTemplate(selectedTemplate)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Use Template
                  </Button>
                  <Button
                    onClick={() => handleLikeTemplate(selectedTemplate.id)}
                    variant="outline"
                    className={`gap-2 ${likedTemplates.has(selectedTemplate.id) ? 'text-red-500' : ''}`}
                  >
                    <Heart className={`w-4 h-4 ${likedTemplates.has(selectedTemplate.id) ? 'fill-current' : ''}`} />
                    Like
                  </Button>
                  <Button
                    onClick={() => handleStarTemplate(selectedTemplate.id)}
                    variant="outline"
                    className={`gap-2 ${starredTemplates.has(selectedTemplate.id) ? 'text-yellow-500' : ''}`}
                  >
                    <Star className={`w-4 h-4 ${starredTemplates.has(selectedTemplate.id) ? 'fill-current' : ''}`} />
                    Star
                  </Button>
                  <Button variant="outline" className="gap-2">
                    <Share className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>
              Create a new prompt template to share with the community
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input placeholder="Enter template name..." />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((category) => (
                      <SelectItem key={category} value={category.toLowerCase().replace(/\s+/g, '-')}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe what this template does..." />
            </div>
            <div className="space-y-2">
              <Label>Template Content</Label>
              <Textarea 
                placeholder="Enter your prompt template content..."
                className="min-h-32"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>License</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select license" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MIT">MIT</SelectItem>
                    <SelectItem value="Apache">Apache 2.0</SelectItem>
                    <SelectItem value="GPL">GPL v3</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="private" />
              <Label htmlFor="private">Make this template private</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button>Create Template</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PromptTemplateLibrary