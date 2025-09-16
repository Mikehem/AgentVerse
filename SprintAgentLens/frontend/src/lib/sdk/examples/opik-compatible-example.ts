/**
 * Comprehensive example demonstrating 100% Opik compatibility + advanced features
 * 
 * This example shows:
 * 1. Context Management (Opik-compatible API)
 * 2. Enhanced LLM tracing with token tracking
 * 3. Distributed tracing headers
 * 4. Advanced decorators and instrumentation
 * 5. Automatic instrumentation
 * 6. Advanced search and filtering
 */

import {
  AgentLensClient,
  AgentLensContext,
  ConfigManager,
  AutoInstrumentation,
  LLMInstrumentation,
  createConfigFromEnvironment,
  llmCall,
  agentAction,
  toolCall,
  monitor,
  getCurrentTraceData,
  getCurrentSpanData,
  updateCurrentTrace,
  updateCurrentSpan,
  getDistributedTraceHeaders
} from '../index'

// 1. Initialize SDK with advanced configuration
async function initializeAgentLens() {
  // Create configuration from environment variables + custom settings
  const config = {
    ...createConfigFromEnvironment(),
    serviceName: 'my-ai-agent',
    version: '2.0.0',
    
    // Advanced sampling
    sampling: {
      rate: 0.8, // Sample 80% of traces
      strategy: 'adaptive' as const,
      maxTracesPerSecond: 200,
      enabledForLLMCalls: true,
      enabledForAgentActions: true
    },
    
    // Batch processing
    batching: {
      maxBatchSize: 100,
      flushInterval: 3000,
      maxRetries: 5,
      retryBackoffMs: 2000,
      enableCompression: true
    },
    
    // Security settings
    security: {
      redactPII: true,
      sanitizeInputs: true,
      sanitizeOutputs: true,
      blockedPatterns: [
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/, // Credit cards
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
      ]
    },
    
    // Enable distributed tracing
    enableDistributedTracing: true,
    enableAsyncContextTracking: true,
    enableRealTimeSync: true,
    
    // Callbacks for monitoring
    onTraceStart: (trace) => console.log('Trace started:', trace.id),
    onTraceEnd: (trace) => console.log('Trace completed:', trace.id),
    onError: (error, context) => console.error('SDK Error:', error, context)
  }

  // Initialize configuration manager
  const configManager = ConfigManager.getInstance(config)
  
  // Initialize client
  const client = new AgentLensClient(config)
  
  // Initialize automatic instrumentation
  AutoInstrumentation.initialize(configManager)
  
  return { client, configManager }
}

// 2. Advanced AI Agent with full Opik compatibility
class OpikCompatibleAIAgent {
  private openai: any
  private anthropic: any

  constructor() {
    // Auto-instrument LLM providers
    this.openai = LLMInstrumentation.instrumentOpenAI(
      // Your OpenAI instance
      new (require('openai'))({ apiKey: process.env.OPENAI_API_KEY })
    )
    
    this.anthropic = LLMInstrumentation.instrumentAnthropic(
      // Your Anthropic instance  
      new (require('@anthropic-ai/sdk'))({ apiKey: process.env.ANTHROPIC_API_KEY })
    )
  }

  @agentAction('reasoning')
  @monitor({ threshold: 2000, captureArgs: true, captureResult: true })
  async reasonAboutQuery(query: string): Promise<string> {
    // Access current context (Opik-compatible)
    const currentTrace = getCurrentTraceData()
    const currentSpan = getCurrentSpanData()
    
    console.log('Current context:', {
      traceId: currentTrace?.id,
      spanId: currentSpan?.id
    })

    // Update trace metadata
    updateCurrentTrace({
      metadata: {
        queryType: 'reasoning',
        userQuery: query,
        processingStarted: new Date().toISOString()
      }
    })

    // Add tags to current span
    AgentLensContext.addSpanTag('reasoning')
    AgentLensContext.addSpanTag('high-complexity')
    
    // Record reasoning steps as events
    AgentLensContext.addSpanEvent('reasoning.start', {
      query,
      approach: 'multi-step'
    })

    const reasoning = await this.performReasoning(query)
    
    AgentLensContext.addSpanEvent('reasoning.complete', {
      stepsCount: reasoning.steps.length,
      confidence: reasoning.confidence
    })

    return reasoning.result
  }

  @llmCall({
    model: 'gpt-4',
    provider: 'openai',
    captureTokens: true,
    captureConversation: true
  })
  async performReasoning(query: string): Promise<{
    result: string
    steps: string[]
    confidence: number
  }> {
    // This decorator automatically:
    // 1. Records LLM model info
    // 2. Captures token usage
    // 3. Records conversation
    // 4. Handles errors
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a reasoning AI. Break down complex queries into steps.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      max_tokens: 500,
      temperature: 0.1
    })

    // Extract reasoning steps
    const result = response.choices[0].message.content
    const steps = result.split('\n').filter(line => line.trim().startsWith('-'))
    
    return {
      result,
      steps,
      confidence: 0.9
    }
  }

  @toolCall('web-search')
  async searchWeb(query: string): Promise<any[]> {
    // Get distributed tracing headers for external calls
    const headers = getDistributedTraceHeaders()
    
    // Make external API call with tracing headers
    const response = await fetch(`https://api.search.com/search?q=${encodeURIComponent(query)}`, {
      headers: {
        'Content-Type': 'application/json',
        ...headers // Propagate trace context
      }
    })

    const results = await response.json()
    
    // Record tool usage metrics
    AgentLensContext.addSpanMetadata('search_results_count', results.length)
    AgentLensContext.addSpanMetadata('search_provider', 'web-api')
    
    return results
  }

  @agentAction('synthesis')
  async synthesizeResponse(reasoningResult: string, searchResults: any[]): Promise<string> {
    // Record input data
    AgentLensContext.addSpanMetadata('input', {
      reasoningLength: reasoningResult.length,
      searchResultsCount: searchResults.length
    })

    // Use Anthropic for synthesis
    const response = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Synthesize this reasoning with search results:\n\nReasoning: ${reasoningResult}\n\nSearch Results: ${JSON.stringify(searchResults.slice(0, 3))}`
        }
      ]
    })

    const synthesis = response.content[0].text
    
    // Update current span with synthesis metrics
    updateCurrentSpan({
      metadata: {
        synthesisLength: synthesis.length,
        sourcesUsed: searchResults.length,
        completedAt: new Date().toISOString()
      }
    })

    return synthesis
  }
}

// 3. Main execution with full context tracking
async function demonstrateOpikCompatibility() {
  console.log('🚀 Initializing Agent Lens with 100% Opik compatibility...')
  
  // Initialize SDK
  const { client, configManager } = await initializeAgentLens()
  
  console.log('✅ SDK initialized with advanced configuration')
  
  // Create AI agent
  const agent = new OpikCompatibleAIAgent()
  
  console.log('✅ AI Agent created with auto-instrumentation')

  // Start a conversation with full context
  const conversation = await client.startConversation({
    name: 'Advanced AI Research Assistant',
    project_id: 'proj_opik_demo',
    agent_id: 'agent_research_v2',
    metadata: {
      sessionType: 'research',
      userTier: 'premium'
    }
  })

  console.log('✅ Conversation started:', conversation.getConversationId())

  // Create a trace for the research operation
  const trace = await client.createTrace({
    name: 'Research Query Processing',
    project_id: 'proj_opik_demo',
    conversation_id: conversation.getConversationId(),
    metadata: {
      complexity: 'high',
      expectedDuration: '30s'
    }
  })

  console.log('✅ Trace created:', trace.getTraceId())

  // Execute AI operations within trace context
  const query = "What are the latest developments in quantum computing and their implications for AI?"
  
  try {
    // Run the entire operation within proper context
    const result = await AgentLensContext.runWithContextAsync(
      getCurrentTraceData(),
      null, // Will create spans automatically via decorators
      async () => {
        console.log('🧠 Starting reasoning process...')
        const reasoning = await agent.reasonAboutQuery(query)
        
        console.log('🔍 Searching for additional information...')
        const searchResults = await agent.searchWeb(query)
        
        console.log('🔄 Synthesizing final response...')
        const synthesis = await agent.synthesizeResponse(reasoning, searchResults)
        
        return synthesis
      }
    )

    // Log the conversation
    await conversation.logMessage({
      role: 'user',
      content: query,
      metadata: { source: 'demo' }
    })

    await conversation.logMessage({
      role: 'assistant', 
      content: result,
      metadata: { 
        confidence: 0.9,
        tokensUsed: getCurrentTraceData()?.totalTokens || 0,
        totalCost: getCurrentTraceData()?.totalCost || 0
      }
    })

    console.log('✅ Research complete! Result:', result.substring(0, 100) + '...')
    
    // Demonstrate context access (Opik-compatible API)
    const traceData = getCurrentTraceData()
    const contextSummary = AgentLensContext.getContextSummary()
    
    console.log('📊 Final Context Summary:', contextSummary)
    console.log('💰 Total Cost:', traceData?.totalCost || 0)
    console.log('🔢 Total Tokens:', traceData?.totalTokens || 0)
    
  } catch (error) {
    console.error('❌ Error during research:', error)
    
    // Error is automatically captured by decorators and context
    updateCurrentTrace({
      status: 'error',
      metadata: {
        errorType: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    })
  }
  
  console.log('🎉 Demo complete! Check your traces dashboard.')
}

// 4. Advanced search and filtering demonstration
async function demonstrateAdvancedSearch() {
  const { client } = await initializeAgentLens()
  
  // Advanced search with multiple criteria
  const searchFilters = {
    textSearch: 'quantum computing',
    timeRange: {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      end: new Date()
    },
    durationRange: {
      min: 1000, // > 1 second
      max: 30000 // < 30 seconds
    },
    status: ['success'] as const,
    tags: ['reasoning', 'llm'],
    costRange: {
      min: 0,
      max: 0.10 // Under 10 cents
    },
    tokenRange: {
      min: 100,
      max: 2000
    },
    llmProviders: ['openai', 'anthropic'],
    hasErrors: false,
    isSlowQuery: false
  }

  console.log('🔍 Performing advanced search with filters:', searchFilters)
  
  // This would integrate with your backend search API
  // The AdvancedTraceSearch component provides the UI for this
}

// Export demonstration functions
export {
  demonstrateOpikCompatibility,
  demonstrateAdvancedSearch,
  OpikCompatibleAIAgent,
  initializeAgentLens
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateOpikCompatibility()
    .then(() => console.log('✅ Demonstration completed successfully'))
    .catch(error => console.error('❌ Demonstration failed:', error))
}