// Main SDK exports
export { AgentLensClient } from './client'
export type { TraceConfig, SpanData, TraceData } from './client'

// Opik Integration exports
export {
  OpikClient,
  OpikDatasetManager,
  initializeOpik,
  setGlobalOpikClient,
  getGlobalOpikClient,
  getOrCreateDataset
} from './opik-integration'
export type {
  OpikSDKConfig,
  OpikDataset,
  OpikDatasetItem
} from './opik-integration'

// Enhanced Context Management (Opik-compatible)
export { 
  AgentLensContext,
  getCurrentTraceData,
  getCurrentSpanData,
  updateCurrentTrace,
  updateCurrentSpan,
  getDistributedTraceHeaders
} from './context'
export type { 
  EnhancedSpanData,
  EnhancedTraceData,
  LLMUsage,
  LLMModelInfo,
  LLMParameters,
  DistributedTraceHeaders
} from './context'

// Advanced Configuration
export { ConfigManager, createConfigFromEnvironment, defaultConfig } from './config'
export type { 
  AdvancedSDKConfig,
  SamplingConfig,
  BatchConfig,
  AutoInstrumentationConfig,
  SecurityConfig
} from './config'

// Automatic Instrumentation
export { AutoInstrumentation, LLMInstrumentation, enableAutoInstrumentation } from './auto-instrumentation'

// Decorators and utilities
export {
  traced,
  tracedClass,
  withTracing,
  withAsyncTracing,
  createSpan,
  setGlobalClient,
  getGlobalClient,
  ConversationContext,
  TraceContext,
  startConversation,
  createTrace,
  // New LLM-specific decorators
  llmCall,
  agentAction,
  toolCall,
  monitor
} from './decorators'

// OpenTelemetry re-exports for convenience
export { SpanKind, SpanStatusCode } from '@opentelemetry/api'

// Example usage and utilities
export const Examples = {
  // Basic client setup
  basicSetup: `
import { AgentLensClient, setGlobalClient } from '@agentlens/sdk'

const client = new AgentLensClient({
  serviceName: 'my-ai-service',
  version: '1.0.0',
  environment: 'production',
  endpoint: 'http://localhost:3000',
  apiKey: 'your-api-key'
})

setGlobalClient(client)
`,

  // Using decorators
  decoratorUsage: `
import { traced, tracedClass, SpanKind } from '@agentlens/sdk'

@tracedClass('MyAIAgent')
class AIAgent {
  @traced('agent.generate', { kind: SpanKind.CLIENT })
  async generateResponse(prompt: string): Promise<string> {
    // Your AI logic here
    return "Generated response"
  }
}
`,

  // Manual tracing
  manualTracing: `
import { startConversation, createTrace } from '@agentlens/sdk'

// Start a conversation
const conversation = await startConversation({
  name: 'Customer Support Chat',
  project_id: 'proj_123',
  agent_id: 'agent_456'
})

// Log messages
await conversation.logMessage({
  role: 'user',
  content: 'Hello, I need help'
})

await conversation.logMessage({
  role: 'assistant',
  content: 'How can I assist you today?'
})

// Create traces for complex operations
const trace = await createTrace({
  name: 'Document Analysis',
  project_id: 'proj_123',
  conversation_id: conversation.getConversationId()
})

await trace.logSpan({
  name: 'document.parse',
  attributes: { 'document.type': 'pdf', 'document.size': 1024 }
})
`,

  // Wrapper functions
  wrapperUsage: `
import { withTracing, withAsyncTracing, SpanKind } from '@agentlens/sdk'

// Wrap sync functions
const tracedCalculation = withTracing(
  (a: number, b: number) => a + b,
  'math.add',
  { attributes: { 'operation': 'addition' } }
)

// Wrap async functions
const tracedApiCall = withAsyncTracing(
  async (url: string) => {
    const response = await fetch(url)
    return response.json()
  },
  'api.call',
  { kind: SpanKind.CLIENT }
)
`
}

// Utility functions for common patterns
export const Utils = {
  // Generate trace ID
  generateTraceId: (): string => {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  },

  // Generate span ID
  generateSpanId: (): string => {
    return `span_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  },

  // Create timestamp
  createTimestamp: (): number => {
    return Date.now()
  },

  // Format duration
  formatDuration: (startTime: number, endTime: number): string => {
    const duration = endTime - startTime
    if (duration < 1000) return `${duration}ms`
    if (duration < 60000) return `${(duration / 1000).toFixed(2)}s`
    return `${(duration / 60000).toFixed(2)}m`
  },

  // Sanitize attributes (remove undefined, null, functions)
  sanitizeAttributes: (attributes: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {}
    for (const [key, value] of Object.entries(attributes)) {
      if (value !== undefined && value !== null && typeof value !== 'function') {
        if (typeof value === 'object') {
          sanitized[key] = JSON.stringify(value)
        } else {
          sanitized[key] = String(value)
        }
      }
    }
    return sanitized
  }
}

// Default export for convenience
export { AgentLensClient as default } from './client'