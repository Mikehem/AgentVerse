'use client'

// Use AsyncLocalStorage only on server side, use Map on client side
const AsyncLocalStorage = typeof window === 'undefined' 
  ? require('async_hooks').AsyncLocalStorage 
  : class ClientAsyncLocalStorage {
      private store = new Map<string, any>()
      
      run<T>(store: any, callback: () => T): T {
        const key = Math.random().toString(36)
        this.store.set(key, store)
        try {
          return callback()
        } finally {
          this.store.delete(key)
        }
      }
      
      getStore() {
        // For client side, return a simple store
        return this.store.size > 0 ? Array.from(this.store.values()).pop() : undefined
      }
    }

export interface LLMUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costPerToken?: number
  totalCost?: number
}

export interface LLMModelInfo {
  name: string
  provider: string
  version?: string
}

export interface LLMParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface EnhancedSpanData {
  id: string
  name: string
  parentId?: string
  traceId: string
  kind: 'internal' | 'server' | 'client' | 'producer' | 'consumer' | 'llm' | 'agent'
  startTime: number
  endTime?: number
  duration?: number
  status: 'pending' | 'success' | 'error' | 'timeout'
  attributes: Record<string, any>
  metadata: Record<string, any>
  tags: string[]
  
  // LLM-specific fields
  llmData?: {
    model: LLMModelInfo
    usage: LLMUsage
    parameters: LLMParameters
    inputText?: string
    outputText?: string
    promptTemplate?: string
    conversations?: Array<{
      role: 'system' | 'user' | 'assistant'
      content: string
    }>
  }
  
  // Input/Output tracking
  input?: any
  output?: any
  
  // Error tracking
  error?: {
    name: string
    message: string
    stack?: string
    type: string
  }
  
  // Events within span
  events: Array<{
    name: string
    timestamp: number
    attributes: Record<string, any>
  }>
}

export interface EnhancedTraceData {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'pending' | 'success' | 'error' | 'timeout'
  metadata: Record<string, any>
  tags: string[]
  projectId?: string
  agentId?: string
  
  // Distributed tracing
  parentTraceId?: string
  correlationId?: string
  
  // Performance metrics
  totalTokens?: number
  totalCost?: number
  
  // Relationships
  spans: EnhancedSpanData[]
  childTraces?: string[]
}

export interface DistributedTraceHeaders {
  'X-Trace-ID': string
  'X-Span-ID': string
  'X-Parent-Span-ID': string
  'X-Correlation-ID': string
  'X-Agent-Lens-Version': string
  'X-Project-ID'?: string
  'X-Agent-ID'?: string
}

// Context storage for async operations
const traceContextStorage = typeof window === 'undefined' 
  ? new AsyncLocalStorage<{ trace: EnhancedTraceData | null; span: EnhancedSpanData | null }>()
  : null

// Browser-based context storage
const browserContext = {
  currentTrace: null as EnhancedTraceData | null,
  currentSpan: null as EnhancedSpanData | null,
  contextStack: [] as Array<{ trace: EnhancedTraceData | null; span: EnhancedSpanData | null }>
}

export class AgentLensContext {
  
  // Core Opik-compatible methods
  static getCurrentTraceData(): EnhancedTraceData | null {
    if (typeof window === 'undefined' && traceContextStorage) {
      const context = traceContextStorage.getStore()
      return context?.trace || null
    }
    return browserContext.currentTrace
  }

  static getCurrentSpanData(): EnhancedSpanData | null {
    if (typeof window === 'undefined' && traceContextStorage) {
      const context = traceContextStorage.getStore()
      return context?.span || null
    }
    return browserContext.currentSpan
  }

  static updateCurrentTrace(updates: Partial<EnhancedTraceData>): void {
    const currentTrace = this.getCurrentTraceData()
    if (!currentTrace) {
      console.warn('No active trace to update')
      return
    }

    // Apply updates
    Object.assign(currentTrace, updates)
    
    // Sync to backend
    this.syncTraceToBackend(currentTrace)
  }

  static updateCurrentSpan(updates: Partial<EnhancedSpanData>): void {
    const currentSpan = this.getCurrentSpanData()
    if (!currentSpan) {
      console.warn('No active span to update')
      return
    }

    // Apply updates
    Object.assign(currentSpan, updates)
    
    // Update end time if status is changing to completed
    if (updates.status && ['success', 'error', 'timeout'].includes(updates.status)) {
      currentSpan.endTime = Date.now()
      currentSpan.duration = currentSpan.endTime - currentSpan.startTime
    }
    
    // Sync to backend
    this.syncSpanToBackend(currentSpan)
  }

  static addTraceTag(tag: string): void {
    const currentTrace = this.getCurrentTraceData()
    if (currentTrace) {
      if (!currentTrace.tags.includes(tag)) {
        currentTrace.tags.push(tag)
        this.syncTraceToBackend(currentTrace)
      }
    }
  }

  static addSpanTag(tag: string): void {
    const currentSpan = this.getCurrentSpanData()
    if (currentSpan) {
      if (!currentSpan.tags.includes(tag)) {
        currentSpan.tags.push(tag)
        this.syncSpanToBackend(currentSpan)
      }
    }
  }

  static addTraceMetadata(key: string, value: any): void {
    const currentTrace = this.getCurrentTraceData()
    if (currentTrace) {
      currentTrace.metadata[key] = value
      this.syncTraceToBackend(currentTrace)
    }
  }

  static addSpanMetadata(key: string, value: any): void {
    const currentSpan = this.getCurrentSpanData()
    if (currentSpan) {
      currentSpan.metadata[key] = value
      this.syncSpanToBackend(currentSpan)
    }
  }

  static addSpanEvent(name: string, attributes: Record<string, any> = {}): void {
    const currentSpan = this.getCurrentSpanData()
    if (currentSpan) {
      currentSpan.events.push({
        name,
        timestamp: Date.now(),
        attributes
      })
      this.syncSpanToBackend(currentSpan)
    }
  }

  // Distributed tracing support
  static getDistributedTraceHeaders(): DistributedTraceHeaders {
    const currentTrace = this.getCurrentTraceData()
    const currentSpan = this.getCurrentSpanData()
    
    return {
      'X-Trace-ID': currentTrace?.id || '',
      'X-Span-ID': currentSpan?.id || '',
      'X-Parent-Span-ID': currentSpan?.parentId || '',
      'X-Correlation-ID': currentTrace?.correlationId || currentTrace?.id || '',
      'X-Agent-Lens-Version': '1.0.0',
      'X-Project-ID': currentTrace?.projectId,
      'X-Agent-ID': currentTrace?.agentId
    }
  }

  static injectDistributedTraceHeaders(headers: Record<string, string>): Record<string, string> {
    const traceHeaders = this.getDistributedTraceHeaders()
    return {
      ...headers,
      ...Object.fromEntries(
        Object.entries(traceHeaders).filter(([_, value]) => value !== undefined && value !== '')
      )
    }
  }

  static extractDistributedTraceHeaders(headers: Record<string, string>): {
    traceId?: string
    spanId?: string
    parentSpanId?: string
    correlationId?: string
    projectId?: string
    agentId?: string
  } {
    return {
      traceId: headers['X-Trace-ID'] || headers['x-trace-id'],
      spanId: headers['X-Span-ID'] || headers['x-span-id'],
      parentSpanId: headers['X-Parent-Span-ID'] || headers['x-parent-span-id'],
      correlationId: headers['X-Correlation-ID'] || headers['x-correlation-id'],
      projectId: headers['X-Project-ID'] || headers['x-project-id'],
      agentId: headers['X-Agent-ID'] || headers['x-agent-id']
    }
  }

  // LLM-specific helper methods
  static recordLLMUsage(usage: LLMUsage): void {
    const currentSpan = this.getCurrentSpanData()
    const currentTrace = this.getCurrentTraceData()
    
    if (currentSpan) {
      if (!currentSpan.llmData) {
        currentSpan.llmData = {} as any
      }
      currentSpan.llmData.usage = usage
      this.syncSpanToBackend(currentSpan)
    }
    
    // Aggregate at trace level
    if (currentTrace) {
      currentTrace.totalTokens = (currentTrace.totalTokens || 0) + usage.totalTokens
      currentTrace.totalCost = (currentTrace.totalCost || 0) + (usage.totalCost || 0)
      this.syncTraceToBackend(currentTrace)
    }
  }

  static recordLLMModel(model: LLMModelInfo): void {
    const currentSpan = this.getCurrentSpanData()
    if (currentSpan) {
      if (!currentSpan.llmData) {
        currentSpan.llmData = {} as any
      }
      currentSpan.llmData.model = model
      currentSpan.kind = 'llm'
      this.syncSpanToBackend(currentSpan)
    }
  }

  static recordLLMConversation(conversations: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>): void {
    const currentSpan = this.getCurrentSpanData()
    if (currentSpan) {
      if (!currentSpan.llmData) {
        currentSpan.llmData = {} as any
      }
      currentSpan.llmData.conversations = conversations
      this.syncSpanToBackend(currentSpan)
    }
  }

  // Context management for async operations
  static runWithContext<T>(
    trace: EnhancedTraceData | null,
    span: EnhancedSpanData | null,
    fn: () => T
  ): T {
    if (typeof window === 'undefined' && traceContextStorage) {
      return traceContextStorage.run({ trace, span }, fn)
    } else {
      // Browser fallback - use context stack
      browserContext.contextStack.push({
        trace: browserContext.currentTrace,
        span: browserContext.currentSpan
      })
      
      browserContext.currentTrace = trace
      browserContext.currentSpan = span
      
      try {
        return fn()
      } finally {
        const previous = browserContext.contextStack.pop()
        if (previous) {
          browserContext.currentTrace = previous.trace
          browserContext.currentSpan = previous.span
        }
      }
    }
  }

  static async runWithContextAsync<T>(
    trace: EnhancedTraceData | null,
    span: EnhancedSpanData | null,
    fn: () => Promise<T>
  ): Promise<T> {
    if (typeof window === 'undefined' && traceContextStorage) {
      return traceContextStorage.run({ trace, span }, fn)
    } else {
      // Browser fallback
      return this.runWithContext(trace, span, fn)
    }
  }

  // Internal sync methods
  private static async syncTraceToBackend(trace: EnhancedTraceData): Promise<void> {
    try {
      await fetch('/api/v1/traces', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getDistributedTraceHeaders()
        },
        body: JSON.stringify(trace)
      })
    } catch (error) {
      console.error('Failed to sync trace to backend:', error)
    }
  }

  private static async syncSpanToBackend(span: EnhancedSpanData): Promise<void> {
    try {
      await fetch('/api/v1/spans', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getDistributedTraceHeaders()
        },
        body: JSON.stringify(span)
      })
    } catch (error) {
      console.error('Failed to sync span to backend:', error)
    }
  }

  // Utility methods
  static getContextSummary(): {
    hasActiveTrace: boolean
    hasActiveSpan: boolean
    traceId?: string
    spanId?: string
    traceName?: string
    spanName?: string
  } {
    const trace = this.getCurrentTraceData()
    const span = this.getCurrentSpanData()
    
    return {
      hasActiveTrace: !!trace,
      hasActiveSpan: !!span,
      traceId: trace?.id,
      spanId: span?.id,
      traceName: trace?.name,
      spanName: span?.name
    }
  }

  static clearContext(): void {
    if (typeof window === 'undefined') {
      // Server-side: context is automatically cleared when async context ends
    } else {
      browserContext.currentTrace = null
      browserContext.currentSpan = null
      browserContext.contextStack = []
    }
  }
}

// Export both the class and convenience functions for easier imports
export default AgentLensContext

// Convenience functions that match Opik's naming convention
export const getCurrentTraceData = () => AgentLensContext.getCurrentTraceData()
export const getCurrentSpanData = () => AgentLensContext.getCurrentSpanData()
export const updateCurrentTrace = (updates: Partial<EnhancedTraceData>) => AgentLensContext.updateCurrentTrace(updates)
export const updateCurrentSpan = (updates: Partial<EnhancedSpanData>) => AgentLensContext.updateCurrentSpan(updates)
export const getDistributedTraceHeaders = () => AgentLensContext.getDistributedTraceHeaders()