import { trace, context, Span, SpanKind, SpanStatusCode, Tracer } from '@opentelemetry/api'

export interface TraceConfig {
  serviceName: string
  version?: string
  environment?: string
  endpoint?: string
  apiKey?: string
}

export interface SpanData {
  name: string
  kind?: SpanKind
  attributes?: Record<string, any>
  startTime?: number
  endTime?: number
  status?: {
    code: SpanStatusCode
    message?: string
  }
  events?: Array<{
    name: string
    time?: number
    attributes?: Record<string, any>
  }>
}

export interface TraceData {
  id: string
  name: string
  startTime: number
  endTime?: number
  duration?: number
  status: 'success' | 'error' | 'pending'
  spans: SpanData[]
  metadata?: Record<string, any>
}

export class AgentLensClient {
  private tracer: Tracer
  private config: TraceConfig
  private endpoint: string

  constructor(config: TraceConfig) {
    this.config = config
    this.endpoint = config.endpoint || 'http://localhost:3000'
    this.tracer = trace.getTracer(config.serviceName, config.version)
  }

  // Span management
  createSpan(name: string, options?: {
    kind?: SpanKind
    parent?: Span | context.Context
    attributes?: Record<string, any>
  }): Span {
    const spanOptions = {
      kind: options?.kind || SpanKind.INTERNAL,
      attributes: options?.attributes || {}
    }

    if (options?.parent) {
      if ('setValue' in options.parent) {
        // It's a context
        return this.tracer.startSpan(name, spanOptions, options.parent as context.Context)
      } else {
        // It's a span, create context from it
        const ctx = trace.setSpan(context.active(), options.parent as Span)
        return this.tracer.startSpan(name, spanOptions, ctx)
      }
    }

    return this.tracer.startSpan(name, spanOptions)
  }

  // Conversation tracking
  async startConversation(data: {
    name: string
    project_id?: string
    agent_id?: string
    metadata?: Record<string, any>
  }) {
    const span = this.createSpan('conversation.start', {
      kind: SpanKind.SERVER,
      attributes: {
        'conversation.name': data.name,
        'conversation.project_id': data.project_id || '',
        'conversation.agent_id': data.agent_id || '',
        ...data.metadata
      }
    })

    try {
      const response = await fetch(`${this.endpoint}/api/v1/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          name: data.name,
          project_id: data.project_id,
          agent_id: data.agent_id,
          metadata: data.metadata
        })
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'conversation.id': result.data.id,
          'conversation.status': 'started'
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result.data
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to start conversation' 
        })
        throw new Error(result.error || 'Failed to start conversation')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Message tracking
  async logMessage(conversationId: string, data: {
    role: 'user' | 'assistant' | 'system'
    content: string
    metadata?: Record<string, any>
    trace_id?: string
    span_id?: string
  }) {
    const span = this.createSpan('message.log', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'message.conversation_id': conversationId,
        'message.role': data.role,
        'message.content_length': data.content.length,
        'message.trace_id': data.trace_id || '',
        'message.span_id': data.span_id || ''
      }
    })

    try {
      const response = await fetch(`${this.endpoint}/api/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          role: data.role,
          content: data.content,
          metadata: data.metadata,
          trace_id: data.trace_id,
          span_id: data.span_id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'message.id': result.data.id,
          'message.timestamp': result.data.timestamp
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result.data
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to log message' 
        })
        throw new Error(result.error || 'Failed to log message')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Trace management
  async createTrace(data: {
    name: string
    project_id?: string
    conversation_id?: string
    metadata?: Record<string, any>
  }) {
    const span = this.createSpan('trace.create', {
      kind: SpanKind.SERVER,
      attributes: {
        'trace.name': data.name,
        'trace.project_id': data.project_id || '',
        'trace.conversation_id': data.conversation_id || ''
      }
    })

    try {
      const response = await fetch(`${this.endpoint}/api/v1/traces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          name: data.name,
          project_id: data.project_id,
          conversation_id: data.conversation_id,
          metadata: data.metadata
        })
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'trace.id': result.data.id,
          'trace.status': 'created'
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result.data
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to create trace' 
        })
        throw new Error(result.error || 'Failed to create trace')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Span logging
  async logSpan(traceId: string, data: SpanData) {
    const span = this.createSpan('span.log', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'span.trace_id': traceId,
        'span.name': data.name,
        'span.kind': data.kind?.toString() || 'INTERNAL'
      }
    })

    try {
      const response = await fetch(`${this.endpoint}/api/v1/traces/${traceId}/spans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          span_id: `span_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: data.name,
          kind: data.kind || SpanKind.INTERNAL,
          start_time: data.startTime || Date.now(),
          end_time: data.endTime,
          attributes: data.attributes || {},
          events: data.events || [],
          status: data.status || { code: SpanStatusCode.OK }
        })
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'span.id': result.data.span_id,
          'span.logged': 'true'
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result.data
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to log span' 
        })
        throw new Error(result.error || 'Failed to log span')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Feedback logging
  async logFeedback(conversationId: string, data: {
    score?: number
    value?: 'thumbs_up' | 'thumbs_down'
    source: 'user' | 'reviewer' | 'system'
    comment?: string
    metadata?: Record<string, any>
  }) {
    const span = this.createSpan('feedback.log', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'feedback.conversation_id': conversationId,
        'feedback.source': data.source,
        'feedback.value': data.value || '',
        'feedback.score': data.score?.toString() || ''
      }
    })

    try {
      const response = await fetch(`${this.endpoint}/api/v1/conversations/${conversationId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          score: data.score,
          value: data.value,
          source: data.source,
          comment: data.comment,
          metadata: data.metadata
        })
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'feedback.logged': 'true'
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result.data
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to log feedback' 
        })
        throw new Error(result.error || 'Failed to log feedback')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Media and attachment logging
  async uploadAttachment(data: {
    file: File
    conversation_id?: string
    trace_id?: string
    span_id?: string
    metadata?: Record<string, any>
  }) {
    const span = this.createSpan('attachment.upload', {
      kind: SpanKind.CLIENT,
      attributes: {
        'attachment.filename': data.file.name,
        'attachment.size': data.file.size,
        'attachment.type': data.file.type,
        'attachment.conversation_id': data.conversation_id || '',
        'attachment.trace_id': data.trace_id || '',
        'attachment.span_id': data.span_id || ''
      }
    })

    try {
      const formData = new FormData()
      formData.append('file', data.file)
      
      if (data.conversation_id) formData.append('conversation_id', data.conversation_id)
      if (data.trace_id) formData.append('trace_id', data.trace_id)
      if (data.span_id) formData.append('span_id', data.span_id)
      if (data.metadata) formData.append('metadata', JSON.stringify(data.metadata))

      const response = await fetch(`${this.endpoint}/api/v1/attachments`, {
        method: 'POST',
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: formData
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'attachment.id': result.data.id,
          'attachment.download_url': result.data.download_url
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result.data
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to upload attachment' 
        })
        throw new Error(result.error || 'Failed to upload attachment')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  async getAttachments(filters?: {
    conversation_id?: string
    trace_id?: string
    span_id?: string
    limit?: number
    offset?: number
  }) {
    const span = this.createSpan('attachments.list', {
      kind: SpanKind.CLIENT,
      attributes: {
        'query.conversation_id': filters?.conversation_id || '',
        'query.trace_id': filters?.trace_id || '',
        'query.span_id': filters?.span_id || '',
        'query.limit': filters?.limit?.toString() || '20'
      }
    })

    try {
      const params = new URLSearchParams()
      if (filters?.conversation_id) params.append('conversationId', filters.conversation_id)
      if (filters?.trace_id) params.append('traceId', filters.trace_id)
      if (filters?.span_id) params.append('spanId', filters.span_id)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const response = await fetch(`${this.endpoint}/api/v1/attachments?${params}`, {
        headers: {
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        }
      })

      const result = await response.json()
      
      if (result.success) {
        span.setAttributes({
          'attachments.count': result.data.length.toString(),
          'attachments.total': result.pagination?.total?.toString() || '0'
        })
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } else {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: result.error || 'Failed to fetch attachments' 
        })
        throw new Error(result.error || 'Failed to fetch attachments')
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Enhanced message logging with attachment support
  async logMessageWithAttachments(conversationId: string, data: {
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: File[]
    metadata?: Record<string, any>
    trace_id?: string
    span_id?: string
  }) {
    const span = this.createSpan('message.log_with_attachments', {
      kind: SpanKind.INTERNAL,
      attributes: {
        'message.conversation_id': conversationId,
        'message.role': data.role,
        'message.content_length': data.content.length,
        'message.attachments_count': data.attachments?.length.toString() || '0'
      }
    })

    try {
      // First log the message
      const message = await this.logMessage(conversationId, {
        role: data.role,
        content: data.content,
        metadata: data.metadata,
        trace_id: data.trace_id,
        span_id: data.span_id
      })

      // Then upload any attachments
      const attachments = []
      if (data.attachments && data.attachments.length > 0) {
        for (const file of data.attachments) {
          const attachment = await this.uploadAttachment({
            file,
            conversation_id: conversationId,
            trace_id: data.trace_id,
            span_id: data.span_id,
            metadata: {
              message_id: message.id,
              uploaded_at: new Date().toISOString()
            }
          })
          attachments.push(attachment)
        }
      }

      span.setAttributes({
        'message.id': message.id,
        'attachments.uploaded': attachments.length.toString()
      })
      span.setStatus({ code: SpanStatusCode.OK })

      return {
        message,
        attachments
      }
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      })
      throw error
    } finally {
      span.end()
    }
  }

  // Utility methods
  wrapFunction<T extends any[], R>(
    fn: (...args: T) => R,
    spanName: string,
    options?: {
      attributes?: Record<string, any>
      kind?: SpanKind
    }
  ): (...args: T) => R {
    return (...args: T): R => {
      const span = this.createSpan(spanName, {
        kind: options?.kind || SpanKind.INTERNAL,
        attributes: options?.attributes || {}
      })

      try {
        const result = fn(...args)
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } catch (error) {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })
        throw error
      } finally {
        span.end()
      }
    }
  }

  async wrapAsyncFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    spanName: string,
    options?: {
      attributes?: Record<string, any>
      kind?: SpanKind
    }
  ): Promise<(...args: T) => Promise<R>> {
    return async (...args: T): Promise<R> => {
      const span = this.createSpan(spanName, {
        kind: options?.kind || SpanKind.INTERNAL,
        attributes: options?.attributes || {}
      })

      try {
        const result = await fn(...args)
        span.setStatus({ code: SpanStatusCode.OK })
        return result
      } catch (error) {
        span.setStatus({ 
          code: SpanStatusCode.ERROR, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        })
        throw error
      } finally {
        span.end()
      }
    }
  }
}