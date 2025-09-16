import { SpanKind, SpanStatusCode } from '@opentelemetry/api'
import { AgentLensClient } from './client'
import { AgentLensContext, EnhancedSpanData, EnhancedTraceData } from './context'

// Global client instance
let globalClient: AgentLensClient | null = null

export function setGlobalClient(client: AgentLensClient) {
  globalClient = client
}

export function getGlobalClient(): AgentLensClient {
  if (!globalClient) {
    throw new Error('AgentLens client not initialized. Call setGlobalClient() first.')
  }
  return globalClient
}

// Decorator for tracing functions
export function traced(
  spanName?: string,
  options?: {
    kind?: SpanKind
    attributes?: Record<string, any>
  }
) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const finalSpanName = spanName || `${target.constructor.name}.${propertyName}`

    descriptor.value = function (...args: any[]) {
      const client = getGlobalClient()
      const span = client.createSpan(finalSpanName, {
        kind: options?.kind || SpanKind.INTERNAL,
        attributes: {
          'function.name': propertyName,
          'function.class': target.constructor.name,
          ...options?.attributes
        }
      })

      try {
        const result = method.apply(this, args)

        if (result && typeof result.then === 'function') {
          // Handle async functions
          return result
            .then((res: any) => {
              span.setStatus({ code: SpanStatusCode.OK })
              return res
            })
            .catch((error: any) => {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: error instanceof Error ? error.message : 'Unknown error'
              })
              throw error
            })
            .finally(() => {
              span.end()
            })
        } else {
          // Handle sync functions
          span.setStatus({ code: SpanStatusCode.OK })
          span.end()
          return result
        }
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        })
        span.end()
        throw error
      }
    }

    return descriptor
  }
}

// Decorator for tracing class methods
export function tracedClass(spanPrefix?: string) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const prototype = constructor.prototype
    const propertyNames = Object.getOwnPropertyNames(prototype)

    for (const propertyName of propertyNames) {
      if (propertyName === 'constructor') continue

      const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName)
      if (descriptor && typeof descriptor.value === 'function') {
        const originalMethod = descriptor.value
        const spanName = spanPrefix ? `${spanPrefix}.${propertyName}` : `${constructor.name}.${propertyName}`

        descriptor.value = function (...args: any[]) {
          const client = getGlobalClient()
          const span = client.createSpan(spanName, {
            kind: SpanKind.INTERNAL,
            attributes: {
              'function.name': propertyName,
              'function.class': constructor.name
            }
          })

          try {
            const result = originalMethod.apply(this, args)

            if (result && typeof result.then === 'function') {
              return result
                .then((res: any) => {
                  span.setStatus({ code: SpanStatusCode.OK })
                  return res
                })
                .catch((error: any) => {
                  span.setStatus({
                    code: SpanStatusCode.ERROR,
                    message: error instanceof Error ? error.message : 'Unknown error'
                  })
                  throw error
                })
                .finally(() => {
                  span.end()
                })
            } else {
              span.setStatus({ code: SpanStatusCode.OK })
              span.end()
              return result
            }
          } catch (error) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : 'Unknown error'
            })
            span.end()
            throw error
          }
        }

        Object.defineProperty(prototype, propertyName, descriptor)
      }
    }

    return constructor
  }
}

// Higher-order function for tracing
export function withTracing<T extends any[], R>(
  fn: (...args: T) => R,
  spanName: string,
  options?: {
    kind?: SpanKind
    attributes?: Record<string, any>
  }
): (...args: T) => R {
  return (...args: T): R => {
    const client = getGlobalClient()
    return client.wrapFunction(fn, spanName, options)(...args)
  }
}

// Higher-order function for tracing async functions
export function withAsyncTracing<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  spanName: string,
  options?: {
    kind?: SpanKind
    attributes?: Record<string, any>
  }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const client = getGlobalClient()
    const wrappedFn = await client.wrapAsyncFunction(fn, spanName, options)
    return wrappedFn(...args)
  }
}

// Utility for manual span creation
export function createSpan(
  name: string,
  options?: {
    kind?: SpanKind
    attributes?: Record<string, any>
  }
) {
  const client = getGlobalClient()
  return client.createSpan(name, options)
}

// Context managers
export class ConversationContext {
  private conversationId: string
  private client: AgentLensClient

  constructor(conversationId: string, client?: AgentLensClient) {
    this.conversationId = conversationId
    this.client = client || getGlobalClient()
  }

  async logMessage(data: {
    role: 'user' | 'assistant' | 'system'
    content: string
    metadata?: Record<string, any>
    trace_id?: string
    span_id?: string
  }) {
    return this.client.logMessage(this.conversationId, data)
  }

  async logMessageWithAttachments(data: {
    role: 'user' | 'assistant' | 'system'
    content: string
    attachments?: File[]
    metadata?: Record<string, any>
    trace_id?: string
    span_id?: string
  }) {
    return this.client.logMessageWithAttachments(this.conversationId, data)
  }

  async uploadAttachment(data: {
    file: File
    trace_id?: string
    span_id?: string
    metadata?: Record<string, any>
  }) {
    return this.client.uploadAttachment({
      ...data,
      conversation_id: this.conversationId
    })
  }

  async getAttachments(filters?: {
    trace_id?: string
    span_id?: string
    limit?: number
    offset?: number
  }) {
    return this.client.getAttachments({
      ...filters,
      conversation_id: this.conversationId
    })
  }

  async logFeedback(data: {
    score?: number
    value?: 'thumbs_up' | 'thumbs_down'
    source: 'user' | 'reviewer' | 'system'
    comment?: string
    metadata?: Record<string, any>
  }) {
    return this.client.logFeedback(this.conversationId, data)
  }

  getConversationId(): string {
    return this.conversationId
  }
}

export class TraceContext {
  private traceId: string
  private client: AgentLensClient

  constructor(traceId: string, client?: AgentLensClient) {
    this.traceId = traceId
    this.client = client || getGlobalClient()
  }

  async logSpan(data: {
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
  }) {
    return this.client.logSpan(this.traceId, data)
  }

  getTraceId(): string {
    return this.traceId
  }
}

// Factory functions
export async function startConversation(data: {
  name: string
  project_id?: string
  agent_id?: string
  metadata?: Record<string, any>
}, client?: AgentLensClient): Promise<ConversationContext> {
  const agentClient = client || getGlobalClient()
  const conversation = await agentClient.startConversation(data)
  return new ConversationContext(conversation.id, agentClient)
}

export async function createTrace(data: {
  name: string
  project_id?: string
  conversation_id?: string
  metadata?: Record<string, any>
}, client?: AgentLensClient): Promise<TraceContext> {
  const agentClient = client || getGlobalClient()
  const trace = await agentClient.createTrace(data)
  return new TraceContext(trace.id, agentClient)
}

// LLM-specific decorators
export function llmCall(options?: {
  model?: string
  provider?: string
  captureTokens?: boolean
  captureConversation?: boolean
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const spanName = `llm.${propertyName}`

    descriptor.value = async function (...args: any[]) {
      const currentTrace = AgentLensContext.getCurrentTraceData()
      const parentSpan = AgentLensContext.getCurrentSpanData()

      const spanData: Partial<EnhancedSpanData> = {
        name: spanName,
        kind: 'llm',
        startTime: Date.now(),
        status: 'pending',
        attributes: {
          'llm.call': true,
          'function.name': propertyName,
          'function.class': target.constructor.name
        },
        metadata: {},
        tags: ['llm'],
        events: [],
        parentId: parentSpan?.id,
        traceId: currentTrace?.id || ''
      }

      if (options?.model) {
        spanData.llmData = {
          model: {
            name: options.model,
            provider: options.provider || 'unknown'
          },
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          parameters: {}
        }
      }

      const span = spanData as EnhancedSpanData
      span.id = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        const result = await AgentLensContext.runWithContextAsync(
          currentTrace,
          span,
          async () => {
            // Capture input if requested
            if (options?.captureConversation && args.length > 0) {
              const input = args[0]
              if (typeof input === 'object' && input.messages) {
                AgentLensContext.recordLLMConversation(input.messages)
              }
              span.input = input
            }

            const methodResult = await method.apply(this, args)

            // Capture output
            span.output = methodResult

            // Try to extract token usage from result
            if (options?.captureTokens && methodResult && typeof methodResult === 'object') {
              if (methodResult.usage) {
                AgentLensContext.recordLLMUsage(methodResult.usage)
              }
            }

            return methodResult
          }
        )

        span.status = 'success'
        span.endTime = Date.now()
        span.duration = span.endTime - span.startTime

        return result
      } catch (error) {
        span.status = 'error'
        span.endTime = Date.now()
        span.duration = span.endTime - span.startTime
        span.error = {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error
        }
        throw error
      }
    }

    return descriptor
  }
}

// Agent action decorator
export function agentAction(actionType?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const spanName = `agent.${actionType || propertyName}`

    descriptor.value = async function (...args: any[]) {
      const currentTrace = AgentLensContext.getCurrentTraceData()
      const parentSpan = AgentLensContext.getCurrentSpanData()

      const spanData: Partial<EnhancedSpanData> = {
        name: spanName,
        kind: 'agent',
        startTime: Date.now(),
        status: 'pending',
        attributes: {
          'agent.action': actionType || propertyName,
          'function.name': propertyName,
          'function.class': target.constructor.name
        },
        metadata: {},
        tags: ['agent'],
        events: [],
        parentId: parentSpan?.id,
        traceId: currentTrace?.id || '',
        input: args.length > 0 ? args[0] : undefined
      }

      const span = spanData as EnhancedSpanData
      span.id = `span_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      try {
        const result = await AgentLensContext.runWithContextAsync(
          currentTrace,
          span,
          async () => method.apply(this, args)
        )

        span.output = result
        span.status = 'success'
        span.endTime = Date.now()
        span.duration = span.endTime - span.startTime

        return result
      } catch (error) {
        span.status = 'error'
        span.endTime = Date.now()
        span.duration = span.endTime - span.startTime
        span.error = {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          type: typeof error
        }
        throw error
      }
    }

    return descriptor
  }
}

// Tool use decorator
export function toolCall(toolName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const spanName = `tool.${toolName || propertyName}`

    descriptor.value = async function (...args: any[]) {
      AgentLensContext.addSpanEvent('tool.call.start', {
        tool: toolName || propertyName,
        input: args
      })

      try {
        const result = await method.apply(this, args)
        
        AgentLensContext.addSpanEvent('tool.call.success', {
          tool: toolName || propertyName,
          output: result
        })

        return result
      } catch (error) {
        AgentLensContext.addSpanEvent('tool.call.error', {
          tool: toolName || propertyName,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    }

    return descriptor
  }
}

// Performance monitoring decorator
export function monitor(options?: {
  threshold?: number // ms
  captureArgs?: boolean
  captureResult?: boolean
}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value
    const threshold = options?.threshold || 1000

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      
      if (options?.captureArgs) {
        AgentLensContext.addSpanMetadata('input', args)
      }

      try {
        const result = await method.apply(this, args)
        const duration = Date.now() - startTime

        if (options?.captureResult) {
          AgentLensContext.addSpanMetadata('output', result)
        }

        AgentLensContext.addSpanMetadata('performance', {
          duration,
          slow: duration > threshold
        })

        if (duration > threshold) {
          AgentLensContext.addSpanTag('slow-operation')
          AgentLensContext.addSpanEvent('performance.warning', {
            duration,
            threshold,
            function: propertyName
          })
        }

        return result
      } catch (error) {
        const duration = Date.now() - startTime
        AgentLensContext.addSpanMetadata('performance', {
          duration,
          failed: true
        })
        throw error
      }
    }

    return descriptor
  }
}