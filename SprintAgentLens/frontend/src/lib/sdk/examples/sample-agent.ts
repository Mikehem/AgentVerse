import { 
  AgentLensClient, 
  traced, 
  tracedClass, 
  startConversation, 
  createTrace,
  SpanKind,
  SpanStatusCode,
  setGlobalClient
} from '../index'

// Initialize the SDK client
const client = new AgentLensClient({
  serviceName: 'sample-ai-agent',
  version: '1.0.0',
  environment: 'development',
  endpoint: 'http://localhost:3000'
})

setGlobalClient(client)

// Sample AI Agent with comprehensive tracing
export class SampleAIAgent {
  private model: string
  private temperature: number

  constructor(model = 'gpt-3.5-turbo', temperature = 0.7) {
    this.model = model
    this.temperature = temperature
  }

  async processQuery(query: string, context?: any): Promise<string> {
    // Simulate processing steps
    const processedQuery = await this.preprocessQuery(query)
    const response = await this.generateResponse(processedQuery, context)
    const finalResponse = await this.postprocessResponse(response)
    
    return finalResponse
  }

  private async preprocessQuery(query: string): Promise<string> {
    // Simulate query preprocessing
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Add some attributes to the current span
    const span = client.createSpan('preprocess.details')
    span.setAttributes({
      'query.length': query.length,
      'query.word_count': query.split(' ').length,
      'preprocessing.step': 'tokenization'
    })
    span.end()
    
    return query.trim().toLowerCase()
  }

  private async generateResponse(query: string, context?: any): Promise<string> {
    // Simulate LLM API call
    const span = client.createSpan('llm.api_call', {
      kind: SpanKind.CLIENT,
      attributes: {
        'llm.model': this.model,
        'llm.temperature': this.temperature,
        'llm.max_tokens': 1000,
        'query.processed': query
      }
    })

    try {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Simulate different response types based on query
      let response: string
      if (query.includes('error')) {
        throw new Error('Simulated LLM error')
      } else if (query.includes('hello')) {
        response = 'Hello! How can I assist you today?'
      } else if (query.includes('weather')) {
        response = 'I\'m sorry, I don\'t have access to current weather information. You might want to check a weather app or website.'
      } else {
        response = `I understand you're asking about: "${query}". Let me provide you with a helpful response based on my knowledge.`
      }

      span.setAttributes({
        'llm.response.length': response.length,
        'llm.tokens.prompt': Math.floor(query.length / 4),
        'llm.tokens.completion': Math.floor(response.length / 4),
        'llm.finish_reason': 'stop'
      })
      
      span.setStatus({ code: SpanStatusCode.OK })
      return response
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

  private async postprocessResponse(response: string): Promise<string> {
    // Simulate response postprocessing
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // Add formatting, safety checks, etc.
    const processedResponse = response.charAt(0).toUpperCase() + response.slice(1)
    
    return processedResponse
  }

  // Method to demonstrate attachment handling
  async handleMessageWithAttachments(message: string, attachments?: File[]) {
    const conversation = await startConversation({
      name: 'Message with Attachments',
      project_id: 'sample_project',
      agent_id: 'sample_agent',
      metadata: {
        has_attachments: attachments ? attachments.length > 0 : false,
        attachment_count: attachments?.length || 0
      }
    })

    try {
      // Log user message with attachments
      const result = await conversation.logMessageWithAttachments({
        role: 'user',
        content: message,
        attachments,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'sample_agent_demo'
        }
      })

      // Process the message (with awareness of attachments)
      let response = await this.processQuery(message, { 
        conversation_id: conversation.getConversationId(),
        has_attachments: attachments && attachments.length > 0
      })

      // If there were attachments, acknowledge them in the response
      if (attachments && attachments.length > 0) {
        response = `I see you've shared ${attachments.length} file(s) with me. ` + response
      }

      // Log assistant response
      await conversation.logMessage({
        role: 'assistant',
        content: response,
        metadata: {
          processed_attachments: attachments?.length || 0,
          generated_at: new Date().toISOString()
        }
      })

      return {
        conversationId: conversation.getConversationId(),
        response,
        attachments: result.attachments,
        message: result.message
      }
    } catch (error) {
      console.error('Error handling message with attachments:', error)
      throw error
    }
  }

  // Method to demonstrate conversation tracking
  async handleConversation(messages: Array<{ role: 'user' | 'assistant', content: string }>) {
    const conversation = await startConversation({
      name: 'Sample Agent Conversation',
      project_id: 'sample_project',
      agent_id: 'sample_agent',
      metadata: {
        model: this.model,
        temperature: this.temperature
      }
    })

    try {
      // Log existing messages
      for (const message of messages) {
        await conversation.logMessage({
          role: message.role,
          content: message.content,
          metadata: {
            logged_at: new Date().toISOString()
          }
        })
      }

      // Process the last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()
      if (lastUserMessage) {
        const response = await this.processQuery(lastUserMessage.content, { conversation_id: conversation.getConversationId() })
        
        await conversation.logMessage({
          role: 'assistant',
          content: response,
          metadata: {
            generated_at: new Date().toISOString(),
            model: this.model
          }
        })

        return { conversationId: conversation.getConversationId(), response }
      }
    } catch (error) {
      console.error('Error handling conversation:', error)
      throw error
    }
  }

  // Method to demonstrate trace creation for complex workflows
  async performComplexAnalysis(data: any) {
    const trace = await createTrace({
      name: 'Complex Data Analysis',
      project_id: 'sample_project',
      metadata: {
        analysis_type: 'comprehensive',
        data_size: JSON.stringify(data).length
      }
    })

    try {
      // Step 1: Data validation
      await trace.logSpan({
        name: 'analysis.validate',
        kind: SpanKind.INTERNAL,
        attributes: {
          'data.type': typeof data,
          'data.keys': Object.keys(data).join(',')
        },
        startTime: Date.now()
      })

      // Step 2: Data processing
      const processingStart = Date.now()
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate processing
      
      await trace.logSpan({
        name: 'analysis.process',
        kind: SpanKind.INTERNAL,
        attributes: {
          'processing.duration_ms': Date.now() - processingStart,
          'processing.steps': 5
        },
        startTime: processingStart,
        endTime: Date.now()
      })

      // Step 3: Generate insights
      await trace.logSpan({
        name: 'analysis.insights',
        kind: SpanKind.INTERNAL,
        attributes: {
          'insights.generated': 3,
          'confidence.score': 0.85
        }
      })

      return {
        traceId: trace.getTraceId(),
        insights: ['Insight 1', 'Insight 2', 'Insight 3'],
        confidence: 0.85
      }
    } catch (error) {
      await trace.logSpan({
        name: 'analysis.error',
        kind: SpanKind.INTERNAL,
        attributes: {
          'error.message': error instanceof Error ? error.message : 'Unknown error',
          'error.type': 'processing_error'
        },
        status: {
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      })
      throw error
    }
  }
}

// Example usage function
export async function runSampleAgent() {
  console.log('🤖 Starting Sample AI Agent Demo...')
  
  const agent = new SampleAIAgent('gpt-3.5-turbo', 0.7)

  try {
    // Test 1: Simple query processing
    console.log('\n📝 Test 1: Simple Query Processing')
    const response1 = await agent.processQuery('Hello, how are you?')
    console.log('Response:', response1)

    // Test 2: Conversation handling
    console.log('\n💬 Test 2: Conversation Handling')
    const conversationResult = await agent.handleConversation([
      { role: 'user', content: 'What is the weather like today?' }
    ])
    console.log('Conversation ID:', conversationResult.conversationId)
    console.log('Response:', conversationResult.response)

    // Test 3: Complex analysis
    console.log('\n📊 Test 3: Complex Analysis')
    const analysisResult = await agent.performComplexAnalysis({
      document: 'sample document',
      metrics: { words: 150, sentences: 10 }
    })
    console.log('Analysis Results:', analysisResult)

    // Test 4: Attachment handling (simulate with mock files)
    console.log('\n📎 Test 4: Attachment Handling')
    try {
      // Create mock files for demonstration
      const mockFiles = [
        new File(['Hello, this is a test document'], 'test.txt', { type: 'text/plain' }),
        new File(['{"key": "value"}'], 'data.json', { type: 'application/json' })
      ]
      
      const attachmentResult = await agent.handleMessageWithAttachments(
        'Please analyze these files',
        mockFiles
      )
      console.log('Attachment handling result:', {
        conversationId: attachmentResult.conversationId,
        response: attachmentResult.response,
        attachmentCount: attachmentResult.attachments.length
      })
    } catch (error) {
      console.log('Attachment test error:', error.message)
    }

    // Test 5: Error handling
    console.log('\n❌ Test 5: Error Handling')
    try {
      await agent.processQuery('trigger error please')
    } catch (error) {
      console.log('Caught expected error:', error.message)
    }

    console.log('\n✅ Sample Agent Demo Completed Successfully!')
    
  } catch (error) {
    console.error('❌ Demo failed:', error)
  }
}

// Export for use in other files
export default SampleAIAgent