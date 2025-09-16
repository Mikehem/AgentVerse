'use client'

import { AgentLensContext } from './context'
import { ConfigManager } from './config'

export class AutoInstrumentation {
  private static initialized = false
  private static originalFetch: typeof fetch | null = null
  private static configManager: ConfigManager | null = null

  static initialize(configManager: ConfigManager): void {
    if (this.initialized) return
    
    this.configManager = configManager
    const config = configManager.getConfig()

    if (config.autoInstrumentation?.fetch) {
      this.instrumentFetch()
    }

    if (config.autoInstrumentation?.nextjs && typeof window !== 'undefined') {
      this.instrumentNextJSNavigation()
    }

    this.initialized = true
  }

  // Instrument fetch API
  private static instrumentFetch(): void {
    if (typeof window === 'undefined' || !window.fetch) return
    
    this.originalFetch = window.fetch
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const method = init?.method || 'GET'
      
      // Skip instrumentation for internal Agent Lens API calls
      if (url.includes('/api/v1/traces') || url.includes('/api/v1/spans')) {
        return this.originalFetch!(input, init)
      }

      const spanName = `fetch ${method} ${new URL(url, window.location.href).pathname}`
      const startTime = Date.now()

      // Add distributed tracing headers
      const headers = new Headers(init?.headers)
      const traceHeaders = AgentLensContext.getDistributedTraceHeaders()
      Object.entries(traceHeaders).forEach(([key, value]) => {
        if (value) headers.set(key, value)
      })

      const enhancedInit = {
        ...init,
        headers
      }

      try {
        AgentLensContext.addSpanEvent('http.request.start', {
          url,
          method,
          headers: Object.fromEntries(headers.entries())
        })

        const response = await this.originalFetch!(input, enhancedInit)
        const duration = Date.now() - startTime

        AgentLensContext.addSpanEvent('http.request.success', {
          url,
          method,
          status: response.status,
          statusText: response.statusText,
          duration,
          responseHeaders: Object.fromEntries(response.headers.entries())
        })

        // Add tags based on response
        if (response.status >= 400) {
          AgentLensContext.addSpanTag('http-error')
        }
        if (duration > 1000) {
          AgentLensContext.addSpanTag('slow-request')
        }

        return response
      } catch (error) {
        const duration = Date.now() - startTime
        
        AgentLensContext.addSpanEvent('http.request.error', {
          url,
          method,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        })

        AgentLensContext.addSpanTag('http-error')
        throw error
      }
    }
  }

  // Instrument Next.js navigation
  private static instrumentNextJSNavigation(): void {
    if (typeof window === 'undefined') return

    // Listen for Next.js route changes
    let currentPath = window.location.pathname

    const handleRouteChange = (url: string) => {
      if (url !== currentPath) {
        AgentLensContext.addSpanEvent('navigation', {
          from: currentPath,
          to: url,
          timestamp: Date.now()
        })
        currentPath = url
      }
    }

    // Use Next.js router events if available
    if (typeof window !== 'undefined' && (window as any).next?.router) {
      const router = (window as any).next.router
      router.events.on('routeChangeStart', handleRouteChange)
      router.events.on('routeChangeComplete', handleRouteChange)
    } else {
      // Fallback: listen to popstate events
      window.addEventListener('popstate', () => {
        handleRouteChange(window.location.pathname)
      })

      // Override pushState and replaceState
      const originalPushState = history.pushState
      const originalReplaceState = history.replaceState

      history.pushState = function(...args) {
        originalPushState.apply(this, args)
        handleRouteChange(window.location.pathname)
      }

      history.replaceState = function(...args) {
        originalReplaceState.apply(this, args)
        handleRouteChange(window.location.pathname)
      }
    }
  }

  // Instrument console methods for debugging
  static instrumentConsole(): void {
    if (typeof console === 'undefined') return

    const originalMethods = {
      log: console.log,
      warn: console.warn,
      error: console.error,
      info: console.info,
      debug: console.debug
    }

    Object.entries(originalMethods).forEach(([level, originalMethod]) => {
      console[level as keyof typeof originalMethods] = (...args: any[]) => {
        // Call original method
        originalMethod.apply(console, args)

        // Add to trace context
        AgentLensContext.addSpanEvent(`console.${level}`, {
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          timestamp: Date.now(),
          level
        })
      }
    })
  }

  // Instrument unhandled errors
  static instrumentErrorHandling(): void {
    if (typeof window === 'undefined') return

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      AgentLensContext.addSpanEvent('unhandled.promise.rejection', {
        error: event.reason instanceof Error ? {
          name: event.reason.name,
          message: event.reason.message,
          stack: event.reason.stack
        } : String(event.reason),
        timestamp: Date.now()
      })

      AgentLensContext.addSpanTag('error')
    })

    // Unhandled errors
    window.addEventListener('error', (event) => {
      AgentLensContext.addSpanEvent('unhandled.error', {
        error: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        },
        timestamp: Date.now()
      })

      AgentLensContext.addSpanTag('error')
    })
  }

  // Instrument performance metrics
  static instrumentPerformance(): void {
    if (typeof window === 'undefined' || !window.performance) return

    // Page load metrics
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          AgentLensContext.addSpanEvent('page.load.metrics', {
            domContentLoadedTime: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            connectTime: navigation.connectEnd - navigation.connectStart,
            responseTime: navigation.responseEnd - navigation.responseStart,
            timestamp: Date.now()
          })
        }

        // Core Web Vitals if available
        if ('web-vitals' in window) {
          this.instrumentWebVitals()
        }
      }, 0)
    })
  }

  private static instrumentWebVitals(): void {
    // This would require the web-vitals library
    // For now, we'll capture basic metrics
    if (typeof window === 'undefined') return

    // First Contentful Paint
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          AgentLensContext.addSpanEvent('web.vitals.fcp', {
            value: entry.startTime,
            timestamp: Date.now()
          })
        }
      }
    })

    try {
      observer.observe({ entryTypes: ['paint'] })
    } catch (e) {
      // Observer not supported
    }
  }

  // Restore original functions
  static cleanup(): void {
    if (this.originalFetch && typeof window !== 'undefined') {
      window.fetch = this.originalFetch
      this.originalFetch = null
    }
    this.initialized = false
  }
}

// Higher-level wrapper for common LLM providers
export class LLMInstrumentation {
  static instrumentOpenAI(openaiInstance: any): any {
    if (!openaiInstance?.chat?.completions?.create) return openaiInstance

    const originalCreate = openaiInstance.chat.completions.create

    openaiInstance.chat.completions.create = async function(params: any) {
      const spanName = `openai.chat.completion`
      const startTime = Date.now()

      AgentLensContext.recordLLMModel({
        name: params.model || 'unknown',
        provider: 'openai'
      })

      AgentLensContext.addSpanEvent('llm.request.start', {
        provider: 'openai',
        model: params.model,
        messages: params.messages?.length || 0,
        maxTokens: params.max_tokens,
        temperature: params.temperature
      })

      try {
        const response = await originalCreate.call(this, params)
        const duration = Date.now() - startTime

        // Extract usage information
        if (response.usage) {
          AgentLensContext.recordLLMUsage({
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens
          })
        }

        // Record conversation if available
        if (params.messages) {
          AgentLensContext.recordLLMConversation([
            ...params.messages,
            ...(response.choices?.map((choice: any) => ({
              role: 'assistant' as const,
              content: choice.message?.content || ''
            })) || [])
          ])
        }

        AgentLensContext.addSpanEvent('llm.request.success', {
          provider: 'openai',
          model: params.model,
          choices: response.choices?.length || 0,
          usage: response.usage,
          duration
        })

        return response
      } catch (error) {
        const duration = Date.now() - startTime
        
        AgentLensContext.addSpanEvent('llm.request.error', {
          provider: 'openai',
          model: params.model,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration
        })

        throw error
      }
    }

    return openaiInstance
  }

  static instrumentAnthropic(anthropicInstance: any): any {
    if (!anthropicInstance?.messages?.create) return anthropicInstance

    const originalCreate = anthropicInstance.messages.create

    anthropicInstance.messages.create = async function(params: any) {
      AgentLensContext.recordLLMModel({
        name: params.model || 'unknown',
        provider: 'anthropic'
      })

      AgentLensContext.addSpanEvent('llm.request.start', {
        provider: 'anthropic',
        model: params.model,
        messages: params.messages?.length || 0,
        maxTokens: params.max_tokens
      })

      try {
        const response = await originalCreate.call(this, params)

        // Extract usage if available
        if (response.usage) {
          AgentLensContext.recordLLMUsage({
            promptTokens: response.usage.input_tokens || 0,
            completionTokens: response.usage.output_tokens || 0,
            totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)
          })
        }

        return response
      } catch (error) {
        AgentLensContext.addSpanEvent('llm.request.error', {
          provider: 'anthropic',
          model: params.model,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        throw error
      }
    }

    return anthropicInstance
  }
}

// Utility function to auto-instrument common scenarios
export function enableAutoInstrumentation(options?: {
  fetch?: boolean
  navigation?: boolean
  console?: boolean
  errors?: boolean
  performance?: boolean
}): void {
  const defaultOptions = {
    fetch: true,
    navigation: true,
    console: false,
    errors: true,
    performance: true,
    ...options
  }

  if (defaultOptions.errors) {
    AutoInstrumentation.instrumentErrorHandling()
  }

  if (defaultOptions.performance) {
    AutoInstrumentation.instrumentPerformance()
  }

  if (defaultOptions.console) {
    AutoInstrumentation.instrumentConsole()
  }
}