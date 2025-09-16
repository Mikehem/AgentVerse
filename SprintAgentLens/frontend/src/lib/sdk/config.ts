'use client'

export interface SamplingConfig {
  rate: number // 0.0 to 1.0
  strategy: 'head' | 'tail' | 'adaptive'
  maxTracesPerSecond?: number
  enabledForLLMCalls?: boolean
  enabledForAgentActions?: boolean
}

export interface BatchConfig {
  maxBatchSize: number
  flushInterval: number // milliseconds
  maxRetries: number
  retryBackoffMs: number
  enableCompression?: boolean
}

export interface AutoInstrumentationConfig {
  fetch: boolean
  nextjs: boolean
  database: boolean
  llm: boolean
  agent: boolean
  filesystem: boolean
  network: boolean
}

export interface SecurityConfig {
  redactPII: boolean
  sanitizeInputs: boolean
  sanitizeOutputs: boolean
  allowedDomains?: string[]
  blockedPatterns?: RegExp[]
}

export interface AdvancedSDKConfig {
  serviceName: string
  version?: string
  environment?: string
  endpoint?: string
  apiKey?: string
  
  // Enhanced configuration
  sampling?: SamplingConfig
  batching?: BatchConfig
  autoInstrumentation?: AutoInstrumentationConfig
  security?: SecurityConfig
  
  // Performance
  enableAsyncContextTracking?: boolean
  enableDistributedTracing?: boolean
  enableRealTimeSync?: boolean
  enableOfflineMode?: boolean
  
  // Debug and monitoring
  debug?: boolean
  enableProfiling?: boolean
  enableMetrics?: boolean
  
  // Callbacks
  onTraceStart?: (trace: any) => void
  onTraceEnd?: (trace: any) => void
  onSpanStart?: (span: any) => void
  onSpanEnd?: (span: any) => void
  onError?: (error: Error, context: any) => void
}

export const defaultConfig: Partial<AdvancedSDKConfig> = {
  sampling: {
    rate: 1.0,
    strategy: 'head',
    maxTracesPerSecond: 100,
    enabledForLLMCalls: true,
    enabledForAgentActions: true
  },
  batching: {
    maxBatchSize: 50,
    flushInterval: 5000,
    maxRetries: 3,
    retryBackoffMs: 1000,
    enableCompression: true
  },
  autoInstrumentation: {
    fetch: true,
    nextjs: true,
    database: false,
    llm: true,
    agent: true,
    filesystem: false,
    network: false
  },
  security: {
    redactPII: true,
    sanitizeInputs: true,
    sanitizeOutputs: true,
    allowedDomains: [],
    blockedPatterns: [
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit card numbers
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Email (optional)
    ]
  },
  enableAsyncContextTracking: true,
  enableDistributedTracing: true,
  enableRealTimeSync: false,
  enableOfflineMode: true,
  debug: false,
  enableProfiling: false,
  enableMetrics: true
}

export class ConfigManager {
  private config: AdvancedSDKConfig
  private static instance: ConfigManager | null = null

  private constructor(config: AdvancedSDKConfig) {
    this.config = { ...defaultConfig, ...config }
  }

  static getInstance(config?: AdvancedSDKConfig): ConfigManager {
    if (!ConfigManager.instance) {
      if (!config) {
        throw new Error('ConfigManager not initialized. Provide config on first call.')
      }
      ConfigManager.instance = new ConfigManager(config)
    }
    return ConfigManager.instance
  }

  getConfig(): AdvancedSDKConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<AdvancedSDKConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  shouldSample(type: 'trace' | 'llm' | 'agent' = 'trace'): boolean {
    const sampling = this.config.sampling
    if (!sampling) return true

    // Check specific enablement flags
    if (type === 'llm' && !sampling.enabledForLLMCalls) return false
    if (type === 'agent' && !sampling.enabledForAgentActions) return false

    // Apply sampling rate
    return Math.random() < sampling.rate
  }

  shouldBatch(): boolean {
    return !!this.config.batching && this.config.batching.maxBatchSize > 1
  }

  isAutoInstrumentationEnabled(type: keyof AutoInstrumentationConfig): boolean {
    return this.config.autoInstrumentation?.[type] ?? false
  }

  sanitizeData(data: any, type: 'input' | 'output'): any {
    const security = this.config.security
    if (!security) return data

    let sanitized = data

    // Apply redaction patterns
    if ((type === 'input' && security.sanitizeInputs) || 
        (type === 'output' && security.sanitizeOutputs)) {
      
      if (typeof sanitized === 'string') {
        for (const pattern of security.blockedPatterns || []) {
          sanitized = sanitized.replace(pattern, '[REDACTED]')
        }
      } else if (typeof sanitized === 'object' && sanitized !== null) {
        sanitized = this.sanitizeObject(sanitized, security.blockedPatterns || [])
      }
    }

    return sanitized
  }

  private sanitizeObject(obj: any, patterns: RegExp[]): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item, patterns))
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          let sanitizedValue = value
          for (const pattern of patterns) {
            sanitizedValue = sanitizedValue.replace(pattern, '[REDACTED]')
          }
          sanitized[key] = sanitizedValue
        } else {
          sanitized[key] = this.sanitizeObject(value, patterns)
        }
      }
      return sanitized
    }

    return obj
  }

  getRetryConfig(): { maxRetries: number; backoffMs: number } {
    const batching = this.config.batching
    return {
      maxRetries: batching?.maxRetries ?? 3,
      backoffMs: batching?.retryBackoffMs ?? 1000
    }
  }

  getBatchConfig(): { maxSize: number; flushInterval: number } {
    const batching = this.config.batching
    return {
      maxSize: batching?.maxBatchSize ?? 50,
      flushInterval: batching?.flushInterval ?? 5000
    }
  }

  isDebugEnabled(): boolean {
    return !!this.config.debug
  }

  executeCallback(
    type: 'onTraceStart' | 'onTraceEnd' | 'onSpanStart' | 'onSpanEnd' | 'onError',
    data: any
  ): void {
    try {
      const callback = this.config[type] as any
      if (typeof callback === 'function') {
        callback(data)
      }
    } catch (error) {
      if (this.isDebugEnabled()) {
        console.error(`Error in ${type} callback:`, error)
      }
    }
  }
}

// Environment-based configuration
export function createConfigFromEnvironment(): Partial<AdvancedSDKConfig> {
  const env = typeof process !== 'undefined' ? process.env : {}
  
  return {
    serviceName: env.AGENT_LENS_SERVICE_NAME || 'agent-lens-app',
    version: env.AGENT_LENS_VERSION || '1.0.0',
    environment: env.AGENT_LENS_ENVIRONMENT || env.NODE_ENV || 'development',
    endpoint: env.AGENT_LENS_ENDPOINT || 'http://localhost:3000',
    apiKey: env.AGENT_LENS_API_KEY,
    debug: env.AGENT_LENS_DEBUG === 'true',
    
    sampling: {
      rate: parseFloat(env.AGENT_LENS_SAMPLING_RATE || '1.0'),
      strategy: (env.AGENT_LENS_SAMPLING_STRATEGY as any) || 'head',
      maxTracesPerSecond: parseInt(env.AGENT_LENS_MAX_TRACES_PER_SECOND || '100'),
      enabledForLLMCalls: env.AGENT_LENS_SAMPLE_LLM !== 'false',
      enabledForAgentActions: env.AGENT_LENS_SAMPLE_AGENT !== 'false'
    },
    
    batching: {
      maxBatchSize: parseInt(env.AGENT_LENS_BATCH_SIZE || '50'),
      flushInterval: parseInt(env.AGENT_LENS_FLUSH_INTERVAL || '5000'),
      maxRetries: parseInt(env.AGENT_LENS_MAX_RETRIES || '3'),
      retryBackoffMs: parseInt(env.AGENT_LENS_RETRY_BACKOFF || '1000'),
      enableCompression: env.AGENT_LENS_ENABLE_COMPRESSION !== 'false'
    },
    
    autoInstrumentation: {
      fetch: env.AGENT_LENS_AUTO_FETCH !== 'false',
      nextjs: env.AGENT_LENS_AUTO_NEXTJS !== 'false',
      database: env.AGENT_LENS_AUTO_DATABASE === 'true',
      llm: env.AGENT_LENS_AUTO_LLM !== 'false',
      agent: env.AGENT_LENS_AUTO_AGENT !== 'false',
      filesystem: env.AGENT_LENS_AUTO_FS === 'true',
      network: env.AGENT_LENS_AUTO_NETWORK === 'true'
    },
    
    security: {
      redactPII: env.AGENT_LENS_REDACT_PII !== 'false',
      sanitizeInputs: env.AGENT_LENS_SANITIZE_INPUTS !== 'false',
      sanitizeOutputs: env.AGENT_LENS_SANITIZE_OUTPUTS !== 'false'
    },
    
    enableAsyncContextTracking: env.AGENT_LENS_ASYNC_CONTEXT !== 'false',
    enableDistributedTracing: env.AGENT_LENS_DISTRIBUTED_TRACING !== 'false',
    enableRealTimeSync: env.AGENT_LENS_REALTIME_SYNC === 'true',
    enableOfflineMode: env.AGENT_LENS_OFFLINE_MODE !== 'false',
    enableProfiling: env.AGENT_LENS_PROFILING === 'true',
    enableMetrics: env.AGENT_LENS_METRICS !== 'false'
  }
}