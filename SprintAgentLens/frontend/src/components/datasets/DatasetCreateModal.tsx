'use client'

import { useState, useRef } from 'react'
import { 
  X, 
  Upload, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Download,
  Eye,
  Plus
} from 'lucide-react'

interface DatasetCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (dataset: any) => void
  projectId?: string
  projectName?: string
}

interface DatasetItem {
  input_data: Record<string, any>
  expected_output?: Record<string, any>
  metadata?: Record<string, any>
}

type CreationMethod = 'manual' | 'upload' | 'template'

export function DatasetCreateModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  projectName
}: DatasetCreateModalProps) {
  const [step, setStep] = useState<'method' | 'details' | 'items' | 'review'>('method')
  const [creationMethod, setCreationMethod] = useState<CreationMethod>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Dataset metadata
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  
  // File upload
  const [file, setFile] = useState<File | null>(null)
  const [fileContent, setFileContent] = useState<string>('')
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<DatasetItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Manual creation
  const [items, setItems] = useState<DatasetItem[]>([
    { input_data: {}, expected_output: {}, metadata: {} }
  ])

  const resetForm = () => {
    setStep('method')
    setCreationMethod('manual')
    setName('')
    setDescription('')
    setTags([])
    setTagInput('')
    setFile(null)
    setFileContent('')
    setColumnMapping({})
    setPreview([])
    setItems([{ input_data: {}, expected_output: {}, metadata: {} }])
    setError(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleFileUpload = async (uploadedFile: File) => {
    setFile(uploadedFile)
    setError(null)
    
    try {
      const text = await uploadedFile.text()
      setFileContent(text)
      
      if (uploadedFile.name.endsWith('.csv')) {
        parseCSV(text)
      } else if (uploadedFile.name.endsWith('.jsonl')) {
        parseJSONL(text)
      } else if (uploadedFile.name.endsWith('.json')) {
        parseJSON(text)
      }
    } catch (err) {
      setError('Failed to read file. Please check the format.')
    }
  }

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim())
    if (lines.length === 0) return
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows = lines.slice(1).map(line => 
      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
    )
    
    // Set up column mapping options
    const mapping: Record<string, string> = {}
    headers.forEach(header => {
      const lower = header.toLowerCase()
      if (lower.includes('input') || lower.includes('question') || lower.includes('prompt')) {
        mapping[header] = 'input_data'
      } else if (lower.includes('output') || lower.includes('answer') || lower.includes('response')) {
        mapping[header] = 'expected_output'
      }
    })
    setColumnMapping(mapping)
    
    // Generate preview
    const previewItems: DatasetItem[] = rows.slice(0, 5).map(row => {
      const item: DatasetItem = { input_data: {}, expected_output: {}, metadata: {} }
      headers.forEach((header, index) => {
        const mappedTo = mapping[header]
        if (mappedTo === 'input_data') {
          item.input_data[header] = row[index]
        } else if (mappedTo === 'expected_output') {
          item.expected_output![header] = row[index]
        } else {
          item.metadata![header] = row[index]
        }
      })
      return item
    })
    setPreview(previewItems)
  }

  const parseJSONL = (text: string) => {
    try {
      const lines = text.split('\n').filter(line => line.trim())
      const parsed = lines.map(line => JSON.parse(line))
      setPreview(parsed.slice(0, 5))
    } catch (err) {
      setError('Invalid JSONL format. Each line must be valid JSON.')
    }
  }

  const parseJSON = (text: string) => {
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        setPreview(parsed.slice(0, 5))
      } else {
        setError('JSON file must contain an array of dataset items.')
      }
    } catch (err) {
      setError('Invalid JSON format.')
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const addManualItem = () => {
    setItems([...items, { input_data: {}, expected_output: {}, metadata: {} }])
  }

  const updateManualItem = (index: number, field: keyof DatasetItem, value: any) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  const removeManualItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Create dataset
      const datasetResponse = await fetch('/api/v1/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          project_id: projectId,
          metadata: { tags }
        })
      })
      
      if (!datasetResponse.ok) {
        throw new Error('Failed to create dataset')
      }
      
      const { data: dataset } = await datasetResponse.json()
      
      // Add items based on creation method
      let itemsToAdd: DatasetItem[] = []
      
      if (creationMethod === 'manual') {
        itemsToAdd = items.filter(item => 
          Object.keys(item.input_data).length > 0 || 
          Object.keys(item.expected_output || {}).length > 0
        )
      } else if (creationMethod === 'upload' && file) {
        // Parse full file content based on column mapping
        if (file.name.endsWith('.csv')) {
          const lines = fileContent.split('\n').filter(line => line.trim())
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
          const rows = lines.slice(1).map(line => 
            line.split(',').map(cell => cell.trim().replace(/"/g, ''))
          )
          
          itemsToAdd = rows.map(row => {
            const item: DatasetItem = { input_data: {}, expected_output: {}, metadata: {} }
            headers.forEach((header, index) => {
              const mappedTo = columnMapping[header]
              if (mappedTo === 'input_data') {
                item.input_data[header] = row[index]
              } else if (mappedTo === 'expected_output') {
                item.expected_output![header] = row[index]
              } else {
                item.metadata![header] = row[index]
              }
            })
            return item
          })
        } else if (file.name.endsWith('.jsonl')) {
          const lines = fileContent.split('\n').filter(line => line.trim())
          itemsToAdd = lines.map(line => JSON.parse(line))
        } else if (file.name.endsWith('.json')) {
          itemsToAdd = JSON.parse(fileContent)
        }
      }
      
      // Add items to dataset if any
      if (itemsToAdd.length > 0) {
        const itemsResponse = await fetch(`/api/v1/datasets/${dataset.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemsToAdd)
        })
        
        if (!itemsResponse.ok) {
          throw new Error('Failed to add items to dataset')
        }
      }
      
      onSuccess(dataset)
      handleClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create dataset')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Dataset</h2>
            {projectName && (
              <p className="text-sm text-gray-600 mt-1">for project: {projectName}</p>
            )}
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}

          {/* Step: Method Selection */}
          {step === 'method' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">How would you like to create your dataset?</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setCreationMethod('manual')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    creationMethod === 'manual'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Plus className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">Manual Creation</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Create dataset items manually with a form interface
                  </p>
                </button>

                <button
                  onClick={() => setCreationMethod('upload')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    creationMethod === 'upload'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Upload className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">File Upload</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload CSV, JSON, or JSONL files with your dataset
                  </p>
                </button>

                <button
                  onClick={() => setCreationMethod('template')}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    creationMethod === 'template'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <FileText className="w-8 h-8 text-blue-600 mb-2" />
                  <h4 className="font-medium text-gray-900">From Template</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Start with a pre-defined template for common use cases
                  </p>
                </button>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step: Dataset Details */}
          {step === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Dataset Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dataset Name *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="My evaluation dataset"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe the purpose and contents of this dataset"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addTag()}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Add tag and press Enter"
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {projectName && (
                    <div className="p-3 bg-gray-50 rounded-md">
                      <div className="text-sm font-medium text-gray-700">Project</div>
                      <div className="text-sm text-gray-600">{projectName}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('method')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('items')}
                  disabled={!name.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step: Items/Upload */}
          {step === 'items' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                {creationMethod === 'upload' ? 'Upload Dataset' : 'Add Dataset Items'}
              </h3>

              {creationMethod === 'upload' && (
                <div className="space-y-4">
                  {!file ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400"
                    >
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700">Upload your dataset file</p>
                      <p className="text-gray-500 mt-1">
                        Supports CSV, JSON, and JSONL formats
                      </p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.json,.jsonl"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file)
                        }}
                        className="hidden"
                      />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-600" />
                          <span className="font-medium">{file.name}</span>
                          <span className="text-sm text-gray-500">
                            ({(file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            setFile(null)
                            setFileContent('')
                            setPreview([])
                            setColumnMapping({})
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {file.name.endsWith('.csv') && Object.keys(columnMapping).length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Column Mapping</h4>
                          <p className="text-sm text-gray-600">
                            Map your CSV columns to dataset fields:
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.keys(columnMapping).map(column => (
                              <div key={column} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 min-w-0 flex-1">
                                  {column}
                                </span>
                                <select
                                  value={columnMapping[column]}
                                  onChange={(e) => setColumnMapping({
                                    ...columnMapping,
                                    [column]: e.target.value
                                  })}
                                  className="px-2 py-1 border border-gray-300 rounded text-sm"
                                >
                                  <option value="">Skip</option>
                                  <option value="input_data">Input Data</option>
                                  <option value="expected_output">Expected Output</option>
                                  <option value="metadata">Metadata</option>
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {preview.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-gray-900">Preview (first 5 items)</h4>
                          <div className="border border-gray-200 rounded-md overflow-hidden">
                            <div className="max-h-64 overflow-y-auto">
                              {preview.map((item, index) => (
                                <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
                                  <div className="text-xs text-gray-500 mb-1">Item {index + 1}</div>
                                  <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                                    {JSON.stringify(item, null, 2)}
                                  </pre>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {creationMethod === 'manual' && (
                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900">Item {index + 1}</h4>
                        {items.length > 1 && (
                          <button
                            onClick={() => removeManualItem(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Input Data (JSON)
                          </label>
                          <textarea
                            value={JSON.stringify(item.input_data, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                updateManualItem(index, 'input_data', parsed)
                              } catch (err) {
                                // Keep typing, don't update until valid JSON
                              }
                            }}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                            placeholder='{"question": "What is AI?"}'
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expected Output (JSON)
                          </label>
                          <textarea
                            value={JSON.stringify(item.expected_output, null, 2)}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value)
                                updateManualItem(index, 'expected_output', parsed)
                              } catch (err) {
                                // Keep typing, don't update until valid JSON
                              }
                            }}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                            placeholder='{"answer": "Artificial Intelligence..."}'
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={addManualItem}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800"
                  >
                    <Plus className="w-4 h-4 inline mr-2" />
                    Add Another Item
                  </button>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('details')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep('review')}
                  disabled={
                    (creationMethod === 'upload' && !file) ||
                    (creationMethod === 'manual' && items.every(item => 
                      Object.keys(item.input_data).length === 0 && 
                      Object.keys(item.expected_output || {}).length === 0
                    ))
                  }
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300"
                >
                  Review
                </button>
              </div>
            </div>
          )}

          {/* Step: Review */}
          {step === 'review' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Review Dataset</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Dataset Details</h4>
                    <div className="mt-2 space-y-1">
                      <div><span className="text-sm text-gray-600">Name:</span> {name}</div>
                      {description && <div><span className="text-sm text-gray-600">Description:</span> {description}</div>}
                      {projectName && <div><span className="text-sm text-gray-600">Project:</span> {projectName}</div>}
                      {tags.length > 0 && (
                        <div>
                          <span className="text-sm text-gray-600">Tags:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {tags.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Content Summary</h4>
                    <div className="mt-2 space-y-1">
                      <div><span className="text-sm text-gray-600">Creation Method:</span> {creationMethod}</div>
                      {file && <div><span className="text-sm text-gray-600">File:</span> {file.name}</div>}
                      <div>
                        <span className="text-sm text-gray-600">Items:</span>{' '}
                        {creationMethod === 'upload' && file 
                          ? `${fileContent.split('\n').filter(line => line.trim()).length - (file.name.endsWith('.csv') ? 1 : 0)} items`
                          : `${items.filter(item => Object.keys(item.input_data).length > 0 || Object.keys(item.expected_output || {}).length > 0).length} items`
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={() => setStep('items')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Dataset
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}