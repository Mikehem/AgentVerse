'use client'

import { useState, useEffect } from 'react'
import { X, Save, Play, Upload, FileText, MessageSquare, Settings, Eye, Code, Wand2, Download, Copy, RotateCcw, RefreshCw, Sliders, History, CheckCircle, Circle, ArrowRight, Clock } from 'lucide-react'
import { VariableDefinition } from '@/lib/types/variables'
import { VariableConfigPanel } from './VariableConfigPanel'
import { CompactVariablePanel } from './CompactVariablePanel'
import { TypedVariableInput } from './TypedVariableInput'
import { extractVariablesFromTemplate, generateVariableDefinitions, validateVariables } from '@/lib/variableUtils'

// Helper function to safely parse variables from the database
function safeParseVariables(variables: any): string[] {
  if (!variables) return []
  if (Array.isArray(variables)) return variables
  if (typeof variables === 'string') {
    try {
      const parsed = JSON.parse(variables)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

// Helper function to safely parse variable definitions
function safeParseVariableDefinitions(variableDefinitions: any): VariableDefinition[] {
  if (!variableDefinitions) return []
  if (Array.isArray(variableDefinitions)) return variableDefinitions
  if (typeof variableDefinitions === 'string') {
    try {
      const parsed = JSON.parse(variableDefinitions)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

interface PromptEditorProps {
  mode?: 'create' | 'edit' | 'view'
  prompt?: any
  projectId: string
  onClose: () => void
  onSave?: () => void
  onSaved?: () => void
}

interface Provider {
  id: string
  name: string
  display_name: string
  type: string
  status: string
}

interface TestMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export function PromptEditor({ mode = 'create', prompt, projectId, onClose, onSave, onSaved }: PromptEditorProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'test' | 'settings' | 'variables'>('editor')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  
  // Form state
  const [name, setName] = useState(prompt?.name || '')
  const [description, setDescription] = useState(prompt?.description || '')
  const [template, setTemplate] = useState(prompt?.activeVersion?.template || '')
  const [tags, setTags] = useState<string[]>(prompt?.tags || [])
  const [variables, setVariables] = useState<string[]>(safeParseVariables(prompt?.activeVersion?.variables))
  const [variableDefinitions, setVariableDefinitions] = useState<VariableDefinition[]>(
    safeParseVariableDefinitions(prompt?.activeVersion?.variable_definitions) || []
  )
  const [commitMessage, setCommitMessage] = useState('')
  
  // Versioning state
  const [versionType, setVersionType] = useState<'major' | 'minor' | 'patch'>('patch')
  const [customVersion, setCustomVersion] = useState('')
  const [useCustomVersion, setUseCustomVersion] = useState(false)
  const [status, setStatus] = useState<'draft' | 'current' | 'deactivated'>('draft')
  const [comments, setComments] = useState('')
  const [showCurrentWarning, setShowCurrentWarning] = useState(false)
  
  // Test state for typed variables
  const [testVariableValues, setTestVariableValues] = useState<Record<string, any>>({})
  
  // Test state
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [testMessages, setTestMessages] = useState<TestMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [providers, setProviders] = useState<Provider[]>([])
  const [uploadedDocument, setUploadedDocument] = useState<string | null>(null)
  const [documentName, setDocumentName] = useState<string>('')
  const [testingConnection, setTestingConnection] = useState(false)
  
  // Version history state
  const [versionHistory, setVersionHistory] = useState<any[]>([])
  const [loadingVersions, setLoadingVersions] = useState(false)
  
  // Load providers on mount
  useEffect(() => {
    fetchProviders()
    if (prompt) {
      fetchVersionHistory()
    }
  }, [prompt])

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/v1/llm-providers?status=active')
      const data = await response.json()
      if (data.success) {
        setProviders(data.providers)
        
        // Set default provider if this is a new prompt
        if (!prompt && data.providers.length > 0) {
          // Try to find Azure OpenAI provider by name
          const azureProvider = data.providers.find(p => p.name === 'azure_openai_default')
          if (azureProvider) {
            setSelectedProvider(azureProvider.id)
            setSelectedModel('msgen4o') // Default deployment for Azure OpenAI
          } else {
            // Fallback to first available provider
            setSelectedProvider(data.providers[0].id)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch providers:', error)
    }
  }

  const fetchVersionHistory = async () => {
    if (!prompt?.id) return
    
    setLoadingVersions(true)
    try {
      const response = await fetch(`/api/v1/prompts/${prompt.id}?includeVersions=true`)
      const data = await response.json()
      if (data.success && data.prompt?.versions) {
        setVersionHistory(data.prompt.versions)
      }
    } catch (error) {
      console.error('Failed to fetch version history:', error)
    } finally {
      setLoadingVersions(false)
    }
  }

  const loadVersion = (version: any) => {
    setTemplate(version.template || '')
    setVariables(safeParseVariables(version.variables))
    setVariableDefinitions(safeParseVariableDefinitions(version.variable_definitions) || [])
    setStatus(version.status || 'draft')
    setComments(version.comments || '')
  }

  // Extract variables from template and update definitions
  useEffect(() => {
    const templateVars = extractVariablesFromTemplate(template)
    setVariables(templateVars)
    
    // Generate/update variable definitions
    const newDefinitions = generateVariableDefinitions(template, variableDefinitions)
    setVariableDefinitions(newDefinitions)
  }, [template])

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g
    const matches = []
    let match
    while ((match = regex.exec(text)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1])
      }
    }
    return matches
  }

  // Get available models for selected provider
  const getAvailableModels = () => {
    const selectedProviderData = providers.find(p => p.id === selectedProvider)
    if (!selectedProviderData) {
      return []
    }

    // Based on provider type, return available models
    switch (selectedProviderData.type) {
      case 'azure_openai':
        return ['msgen4o', 'gpt-4', 'gpt-4-32k', 'gpt-35-turbo', 'gpt-4o', 'gpt-4o-mini']
      case 'openai':
        return ['gpt-4o', 'gpt-4o-mini', 'gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
      case 'anthropic':
        return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      case 'xai':
        return ['grok-beta', 'grok-vision-beta']
      case 'google':
        return ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash']
      case 'mistral':
        return ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mistral-7b']
      default:
        return []
    }
  }

  // Handle provider change and reset model
  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId)
    setSelectedModel('') // Reset model when provider changes
    
    // Set default model for Azure OpenAI provider
    const selectedProviderData = providers.find(p => p.id === providerId)
    if (selectedProviderData && selectedProviderData.type === 'azure_openai') {
      setSelectedModel('msgen4o')
    } else {
      const models = getAvailableModels()
      if (models.length > 0) {
        setSelectedModel(models[0])
      }
    }
  }

  // Function to substitute variables in template
  const substituteVariables = (template: string, values: Record<string, any>): string => {
    let result = template
    Object.entries(values).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`
      const substitution = value !== null && value !== undefined ? String(value) : ''
      result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), substitution)
    })
    return result
  }

  // Test connection to selected provider
  const handleTestConnection = async () => {
    if (!selectedProvider || !selectedModel) {
      alert('Please select both provider and model first')
      return
    }

    setTestingConnection(true)
    
    try {
      const response = await fetch(`/api/v1/llm-providers/${selectedProvider}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: selectedModel })
      })
      
      const data = await response.json()
      
      if (data.success && data.testResult) {
        const { success, response: testResponse, error, latency } = data.testResult
        
        if (success) {
          alert(`✅ Connection Test Successful!\n\nProvider: ${selectedProvider}\nModel: ${selectedModel}\nResponse: ${testResponse}\nLatency: ${latency}ms`)
        } else {
          alert(`❌ Connection Test Failed!\n\nProvider: ${selectedProvider}\nModel: ${selectedModel}\nError: ${error}\nLatency: ${latency}ms`)
        }
      } else {
        alert('❌ Failed to run connection test')
      }
    } catch (error) {
      console.error('Error testing connection:', error)
      alert('❌ Failed to run connection test')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !template.trim()) {
      alert('Name and template are required')
      return
    }

    setSaving(true)
    try {
      const url = prompt ? `/api/v1/prompts/${prompt.id}` : '/api/v1/prompts'
      const method = prompt ? 'PUT' : 'POST'
      
      // Determine version number
      let versionNumber: string
      if (useCustomVersion) {
        versionNumber = customVersion
      } else {
        // For new prompts, start with 1.0.0, for existing use increment logic
        if (!prompt) {
          versionNumber = '1.0.0'
        } else {
          // This will be handled by the API using the versionType
          versionNumber = '' // API will generate
        }
      }

      const body: any = {
        name,
        description,
        projectId,
        tags,
        template,
        variables,
        variableDefinitions,
        commitMessage: commitMessage || (prompt ? 'Updated prompt' : 'Initial version'),
        versionNumber: useCustomVersion ? versionNumber : undefined,
        versionType: !useCustomVersion ? versionType : undefined,
        status,
        comments,
        createdBy: 'current-user', // TODO: Get from auth context
        updatedBy: 'current-user'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        onSaved()
      } else {
        const error = await response.json()
        alert(`Failed to save prompt: ${error.error}`)
      }
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!template.trim() || !selectedProvider || !selectedModel) {
      alert('Template, provider, and model are required for testing')
      return
    }

    // Validate required variables are filled
    const missingVariables = variableDefinitions
      .filter(def => def.required && !testVariableValues[def.name])
      .map(def => def.name)
    
    if (missingVariables.length > 0) {
      alert(`Please fill in required variables: ${missingVariables.join(', ')}`)
      return
    }

    setTesting(true)
    try {
      // Substitute variables in template
      const substitutedPrompt = substituteVariables(template, testVariableValues)
      
      // Add user message showing the substituted prompt
      const userMessage: TestMessage = {
        role: 'user',
        content: userInput || substitutedPrompt,
        timestamp: new Date()
      }
      setTestMessages(prev => [...prev, userMessage])
      setUserInput('')

      // Call the actual LLM API
      const response = await fetch(`/api/v1/llm-providers/${selectedProvider}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: selectedModel,
          message: substitutedPrompt,
          maxTokens: 1000,
          temperature: 0.7
        })
      })
      
      const data = await response.json()
      
      if (data.success && data.chatResult) {
        const { success, response: llmResponse, error, latency } = data.chatResult
        
        let content: string
        if (success) {
          content = `**Rendered Prompt:**\n\n${substitutedPrompt}\n\n---\n\n**Response:**\n\n${llmResponse}\n\n---\n\n_Response time: ${latency}ms_`
        } else {
          content = `**Error:** ${error}\n\n**Rendered Prompt:**\n\n${substitutedPrompt}`
        }
        
        const assistantMessage: TestMessage = {
          role: 'assistant',
          content,
          timestamp: new Date()
        }
        setTestMessages(prev => [...prev, assistantMessage])
      } else {
        // Fallback for API errors
        const assistantMessage: TestMessage = {
          role: 'assistant',
          content: `**Error:** Failed to get response from LLM provider\n\n**Rendered Prompt:**\n${substitutedPrompt}`,
          timestamp: new Date()
        }
        setTestMessages(prev => [...prev, assistantMessage])
      }
      
      setTesting(false)

    } catch (error) {
      console.error('Error testing prompt:', error)
      setTesting(false)
    }
  }

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setUploadedDocument(content)
        setDocumentName(file.name)
        
        // Auto-add document content to template if empty
        if (!template.trim()) {
          setTemplate(`Analyze the following document:\n\n{{document}}\n\nPlease provide insights about: {{analysis_focus}}`)
        }
      }
      reader.readAsText(file)
    }
  }

  const addTagInput = (value: string) => {
    if (value.trim() && !tags.includes(value.trim())) {
      setTags([...tags, value.trim()])
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const renderPromptEditor = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Prompt Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter prompt name..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commit Message
          </label>
          <input
            type="text"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your changes..."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe what this prompt does..."
        />
      </div>

      {/* Document Upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
        <div className="text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="mt-2">
            <label htmlFor="document-upload" className="cursor-pointer">
              <span className="mt-2 block text-sm font-medium text-gray-900">
                Upload a document to analyze
              </span>
              <span className="mt-1 block text-sm text-gray-500">
                PNG, JPG, PDF, TXT, DOC up to 10MB
              </span>
            </label>
            <input
              id="document-upload"
              type="file"
              className="sr-only"
              accept=".txt,.pdf,.doc,.docx,.png,.jpg,.jpeg"
              onChange={handleDocumentUpload}
            />
          </div>
        </div>
        {uploadedDocument && (
          <div className="mt-3 p-2 bg-blue-50 rounded border flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-800">{documentName}</span>
            <button
              onClick={() => {
                setUploadedDocument(null)
                setDocumentName('')
              }}
              className="ml-auto text-blue-600 hover:text-blue-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Template Editor */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Prompt Template *
        </label>
        <div className="relative">
          <textarea
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            rows={12}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Enter your prompt template here...&#10;&#10;Use {{variable_name}} for dynamic values.&#10;&#10;Example:&#10;You are a helpful assistant. Please analyze the following text:&#10;&#10;{{user_input}}&#10;&#10;Provide a summary focusing on {{focus_area}}."
          />
          <div className="absolute bottom-2 right-2 text-xs text-gray-500">
            {template.length} characters
          </div>
        </div>
      </div>

      {/* Variables */}
      {Array.isArray(variables) && variables.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Detected Variables
          </label>
          <div className="flex flex-wrap gap-2">
            {variables.map((variable) => (
              <span
                key={variable}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-mono"
              >
                {`{{${variable}}}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              addTagInput(e.currentTarget.value)
              e.currentTarget.value = ''
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Add tags (press Enter)..."
        />
      </div>

      {/* Versioning & Status */}
      <div className="border-t pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Version Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Version Increment
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="use-custom-version"
                  checked={useCustomVersion}
                  onChange={(e) => setUseCustomVersion(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="use-custom-version" className="text-sm text-gray-600">
                  Use custom version number
                </label>
              </div>
              
              {useCustomVersion ? (
                <input
                  type="text"
                  value={customVersion}
                  onChange={(e) => setCustomVersion(e.target.value)}
                  placeholder="e.g., 2.1.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <select
                  value={versionType}
                  onChange={(e) => setVersionType(e.target.value as 'major' | 'minor' | 'patch')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="patch">Patch (bug fixes)</option>
                  <option value="minor">Minor (new features)</option>
                  <option value="major">Major (breaking changes)</option>
                </select>
              )}
            </div>
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => {
                const newStatus = e.target.value as 'draft' | 'current' | 'deactivated'
                if (newStatus === 'current') {
                  setShowCurrentWarning(true)
                }
                setStatus(newStatus)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="current">Current</option>
              <option value="deactivated">Deactivated</option>
            </select>
            {status === 'current' && (
              <p className="text-xs text-amber-600 mt-1">
                Setting as current will deactivate any existing current version
              </p>
            )}
          </div>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Version Comments
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Add notes about this version..."
          />
        </div>
      </div>
    </div>
  )

  const renderVariablesConfig = () => (
    <CompactVariablePanel
      variables={variableDefinitions}
      onChange={setVariableDefinitions}
      extractedVariables={variables}
    />
  )

  const renderTestInterface = () => (
    <div className="space-y-4">
      {/* Variable Inputs */}
      {variableDefinitions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Configure Variables</h3>
          <p className="text-sm text-gray-600">
            Fill in the variables to test your prompt template
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variableDefinitions.map((definition) => (
              <TypedVariableInput
                key={definition.name}
                definition={definition}
                value={testVariableValues[definition.name]}
                onChange={(value) => 
                  setTestVariableValues(prev => ({ ...prev, [definition.name]: value }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Provider and Model Selection */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Provider *
            </label>
            <select
              value={selectedProvider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a provider...</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.display_name} ({provider.type})
                </option>
              ))}
            </select>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Model *
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedProvider}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Choose a model...</option>
              {getAvailableModels().map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Test Connection Button */}
        {selectedProvider && selectedModel && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => handleTestConnection()}
              disabled={testingConnection}
              className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${testingConnection ? 'animate-spin' : ''}`} />
              {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>
          </div>
        )}
      </div>

      {/* Chat Interface */}
      <div className="border border-gray-300 rounded-lg h-96 flex flex-col">
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {testMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Start testing your prompt by typing a message below</p>
            </div>
          ) : (
            testMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-sm lg:max-w-2xl px-4 py-2 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">
                    {message.content.split('\n').map((line, idx) => {
                      // Handle markdown-style formatting
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <div key={idx} className="font-bold mb-1">{line.slice(2, -2)}</div>
                      }
                      if (line.startsWith('_') && line.endsWith('_')) {
                        return <div key={idx} className="italic text-xs opacity-75">{line.slice(1, -1)}</div>
                      }
                      if (line === '---') {
                        return <hr key={idx} className="my-2 border-gray-300" />
                      }
                      if (line.trim() === '') {
                        return <div key={idx} className="h-2" />
                      }
                      return <div key={idx}>{line}</div>
                    })}
                  </div>
                  <p className="text-xs opacity-75 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          {testing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-gray-300 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !testing) {
                  handleTest()
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={variableDefinitions.length > 0 ? "Test with configured variables (leave empty to use template)" : "Type your test message..."}
              disabled={testing}
            />
            <button
              onClick={handleTest}
              disabled={testing || !selectedProvider || !selectedModel}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>
        </div>
      </div>

      {/* Clear Chat */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setTestMessages([])}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Clear Chat
        </button>
        <div className="text-sm text-gray-500">
          {testMessages.length} messages
        </div>
      </div>
    </div>
  )

  const renderSettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-800 mb-2">Settings & Metadata</h4>
        <p className="text-sm text-yellow-700">
          Configure advanced options and metadata for this prompt.
        </p>
      </div>
      
      {/* Version Info */}
      {prompt && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Version Information</h4>
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>Current Version: v{prompt.activeVersion?.version || '1.0.0'}</div>
              <div>Created: {new Date(prompt.created_at).toLocaleDateString()}</div>
              <div>Last Updated: {new Date(prompt.updated_at).toLocaleDateString()}</div>
              <div>Total Versions: {versionHistory.length || 1}</div>
            </div>
          </div>
        </div>
      )}

      {/* Version History */}
      {prompt && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-gray-500" />
            <h4 className="text-sm font-medium text-gray-700">Version History</h4>
          </div>
          {loadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">Loading versions...</span>
            </div>
          ) : versionHistory.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
              {versionHistory.map((version, index) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-medium">v{version.version}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        version.status === 'current' ? 'bg-green-100 text-green-800' :
                        version.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {version.status === 'current' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {version.status === 'draft' && <Circle className="w-3 h-3 mr-1" />}
                        {version.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(version.created_at).toLocaleString()}
                    </div>
                    {version.comments && (
                      <div className="text-sm text-gray-600 truncate">{version.comments}</div>
                    )}
                    {version.changelog && (
                      <div className="text-xs text-gray-500 italic truncate">{version.changelog}</div>
                    )}
                  </div>
                  <button
                    onClick={() => loadVersion(version)}
                    className="ml-2 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center gap-1"
                  >
                    <ArrowRight className="w-3 h-3" />
                    Load
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No version history available</p>
            </div>
          )}
        </div>
      )}

      {/* Advanced Options */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Advanced Options</h4>
        <div className="space-y-3">
          <label className="flex items-center">
            <input type="checkbox" className="rounded" />
            <span className="ml-2 text-sm text-gray-600">Enable version auto-activation</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded" />
            <span className="ml-2 text-sm text-gray-600">Require approval for activation</span>
          </label>
          <label className="flex items-center">
            <input type="checkbox" className="rounded" />
            <span className="ml-2 text-sm text-gray-600">Log all test interactions</span>
          </label>
        </div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {prompt ? 'Edit Prompt' : 'Create New Prompt'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {prompt ? `Editing: ${prompt.name}` : 'Design and test your prompt'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'editor', name: 'Editor', icon: Code },
              { id: 'variables', name: 'Variables', icon: Sliders },
              { id: 'test', name: 'Test', icon: Play },
              { id: 'settings', name: 'Settings', icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'editor' && renderPromptEditor()}
          {activeTab === 'variables' && renderVariablesConfig()}
          {activeTab === 'test' && renderTestInterface()}
          {activeTab === 'settings' && renderSettings()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {activeTab === 'editor' && `${template.length} characters`}
            {activeTab === 'variables' && `${variableDefinitions.length} variables configured`}
            {activeTab === 'test' && `Provider: ${selectedProvider || 'None selected'} ${selectedModel ? `• Model: ${selectedModel}` : ''}`}
            {activeTab === 'settings' && `Last saved: ${prompt ? new Date(prompt.updated_at).toLocaleString() : 'Never'}`}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            {activeTab === 'test' ? (
              <button
                onClick={handleTest}
                disabled={testing || !selectedProvider || !selectedModel}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Play className="w-4 h-4" />
                {testing ? 'Testing...' : 'Test Prompt'}
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !template.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Prompt'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}