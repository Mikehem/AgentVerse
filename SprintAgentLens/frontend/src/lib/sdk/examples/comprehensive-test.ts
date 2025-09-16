import { 
  AgentLensClient,
  setGlobalClient,
  startConversation,
  createTrace,
  SpanKind,
  SpanStatusCode,
  traced,
  tracedClass
} from '../index'
import { SampleAIAgent, runSampleAgent } from './sample-agent'

// Comprehensive test suite for all Agent Lens features
export class ComprehensiveTestSuite {
  private client: AgentLensClient
  private existingProject: any
  private existingAgents: any[]
  private testResults: Array<{
    testName: string
    status: 'pass' | 'fail' | 'skip'
    duration: number
    error?: string
    details?: any
  }> = []

  constructor() {
    this.client = new AgentLensClient({
      serviceName: 'comprehensive-test-suite',
      version: '1.0.0',
      environment: 'test',
      endpoint: 'http://localhost:3000'
    })
    
    setGlobalClient(this.client)
    this.existingProject = null
    this.existingAgents = []
  }

  // Initialize test suite by fetching existing project and agents
  private async initialize() {
    try {
      // Fetch existing project
      const projectsResponse = await fetch('http://localhost:3000/api/v1/projects')
      const projectsResult = await projectsResponse.json()
      
      if (projectsResult.success && projectsResult.data.length > 0) {
        this.existingProject = projectsResult.data[0] // Use first available project
        
        // Fetch agents for this project
        const agentsResponse = await fetch(`http://localhost:3000/api/v1/agents?projectId=${this.existingProject.id}`)
        const agentsResult = await agentsResponse.json()
        
        if (agentsResult.success) {
          this.existingAgents = agentsResult.data
        }
      }
      
      console.log(`🔧 Initialized test suite with:`)
      console.log(`   Project: ${this.existingProject?.name} (${this.existingProject?.id})`)
      console.log(`   Agents: ${this.existingAgents.length}`)
      this.existingAgents.forEach(agent => {
        console.log(`     - ${agent.name} (${agent.model})`)
      })
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize with existing data, using fallback data')
      // Fallback to default test data if needed
      this.existingProject = { id: 'test_project', name: 'Test Project' }
      this.existingAgents = []
    }
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = Date.now()
    console.log(`\n🧪 Running test: ${testName}`)
    
    try {
      const result = await testFn()
      const duration = Date.now() - startTime
      
      this.testResults.push({
        testName,
        status: 'pass',
        duration,
        details: result
      })
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`)
    } catch (error) {
      const duration = Date.now() - startTime
      
      this.testResults.push({
        testName,
        status: 'fail',
        duration,
        error: error instanceof Error ? error.message : String(error)
      })
      
      console.log(`❌ ${testName} - FAILED (${duration}ms)`)
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Test 1: Basic SDK Client Operations
  private async testBasicSDKOperations() {
    // Test conversation creation using existing project and agent
    const agentId = this.existingAgents.length > 0 ? this.existingAgents[0].id : undefined
    const conversation = await startConversation({
      name: 'SDK Test Conversation',
      project_id: this.existingProject?.id || 'test_project',
      agent_id: agentId,
      metadata: {
        test_type: 'basic_operations',
        timestamp: new Date().toISOString(),
        agent_name: this.existingAgents[0]?.name || 'Unknown'
      }
    })

    // Test message logging
    const message = await conversation.logMessage({
      role: 'user',
      content: 'Hello, this is a test message',
      metadata: { test: true }
    })

    // Test feedback logging
    await conversation.logFeedback({
      value: 'thumbs_up',
      score: 5,
      source: 'user',
      comment: 'Great response!'
    })

    return {
      conversationId: conversation.getConversationId(),
      messageId: message.id,
      feedbackLogged: true
    }
  }

  // Test 2: Trace and Span Operations
  private async testTraceOperations() {
    const trace = await createTrace({
      name: 'SDK Test Trace',
      project_id: this.existingProject?.id || 'test_project',
      metadata: {
        test_type: 'trace_operations',
        complexity: 'high',
        project_name: this.existingProject?.name || 'Test Project'
      }
    })

    // Test span logging
    const spanResult = await trace.logSpan({
      name: 'test.operation',
      kind: SpanKind.INTERNAL,
      attributes: {
        'operation.type': 'test',
        'operation.complexity': 'medium'
      },
      events: [
        {
          name: 'operation.started',
          attributes: { timestamp: Date.now().toString() }
        },
        {
          name: 'operation.completed',
          attributes: { timestamp: Date.now().toString() }
        }
      ],
      status: {
        code: SpanStatusCode.OK,
        message: 'Operation completed successfully'
      }
    })

    return {
      traceId: trace.getTraceId(),
      spanId: spanResult.span_id
    }
  }

  // Test 3: Attachment Operations
  private async testAttachmentOperations() {
    const conversation = await startConversation({
      name: 'Attachment Test Conversation',
      project_id: 'test_project'
    })

    // Create test files
    const testFiles = [
      new File(['Test document content'], 'test.txt', { type: 'text/plain' }),
      new File(['{"test": "data"}'], 'test.json', { type: 'application/json' }),
      new File(['<html><body>Test</body></html>'], 'test.html', { type: 'text/html' })
    ]

    // Test message with attachments
    const result = await conversation.logMessageWithAttachments({
      role: 'user',
      content: 'Please analyze these test files',
      attachments: testFiles,
      metadata: {
        test_case: 'attachment_operations',
        file_count: testFiles.length
      }
    })

    // Test attachment listing
    const attachmentList = await conversation.getAttachments({
      limit: 10
    })

    return {
      conversationId: conversation.getConversationId(),
      messageId: result.message.id,
      attachmentCount: result.attachments.length,
      listedAttachments: attachmentList.data.length
    }
  }

  // Test 4: Decorated Functions and Classes
  private async testDecoratedFunction(): Promise<any> {
    // Test manual span creation (simulating what decorators would do)
    const span = this.client.createSpan('comprehensive_test.decorated_method', {
      kind: SpanKind.INTERNAL,
      attributes: { test_type: 'decorator' }
    })

    try {
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100))
      
      span.setStatus({ code: SpanStatusCode.OK })
      
      return {
        decoratorTest: true,
        timestamp: Date.now()
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

  // Test 5: Complex AI Agent Workflow
  private async testAIAgentWorkflow() {
    const agent = new SampleAIAgent('gpt-3.5-turbo', 0.7)

    // Test simple query
    const simpleResponse = await agent.processQuery('What is AI?')

    // Test conversation handling
    const conversationResult = await agent.handleConversation([
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' }
    ])

    // Test complex analysis
    const analysisResult = await agent.performComplexAnalysis({
      document: 'Sample test document for analysis',
      metadata: {
        words: 100,
        sentences: 5,
        language: 'english'
      }
    })

    // Test attachment handling
    const mockFiles = [
      new File(['AI research paper content'], 'research.txt', { type: 'text/plain' })
    ]
    
    const attachmentResult = await agent.handleMessageWithAttachments(
      'Please review this research paper',
      mockFiles
    )

    return {
      simpleQuery: { length: simpleResponse.length },
      conversation: { id: conversationResult.conversationId },
      analysis: { traceId: analysisResult.traceId },
      attachments: { count: attachmentResult.attachments.length }
    }
  }

  // Test 6: Dataset Operations
  private async testDatasetOperations() {
    // Create a test dataset using existing project
    const response = await fetch('http://localhost:3000/api/v1/datasets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `SDK Test Dataset - ${Date.now()}`,
        description: 'Dataset created for comprehensive SDK testing',
        project_id: this.existingProject?.id || 'test_project',
        metadata: {
          test_type: 'comprehensive_test',
          created_by: 'sdk_test_suite',
          project_name: this.existingProject?.name || 'Test Project'
        }
      })
    })

    const result = await response.json()
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to create dataset')
    }

    // List datasets
    const listResponse = await fetch('http://localhost:3000/api/v1/datasets?projectId=test_project')
    const listResult = await listResponse.json()

    return {
      datasetId: result.data.id,
      datasetName: result.data.name,
      totalDatasets: listResult.data?.length || 0
    }
  }

  // Test 7: Evaluation and Experiment Operations  
  private async testEvaluationOperations() {
    // Create evaluation
    const evalResponse = await fetch('http://localhost:3000/api/v1/evaluations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Evaluation',
        description: 'Evaluation created for comprehensive testing',
        project_id: 'test_project',
        config: {
          metrics: ['accuracy', 'precision', 'recall'],
          test_type: 'comprehensive'
        }
      })
    })

    const evalResult = await evalResponse.json()
    
    if (!evalResult.success) {
      throw new Error(evalResult.error || 'Failed to create evaluation')
    }

    // Create experiment
    const expResponse = await fetch('http://localhost:3000/api/v1/experiments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Experiment',
        description: 'Experiment created for comprehensive testing',
        project_id: 'test_project',
        agent_config: {
          model: 'gpt-3.5-turbo',
          temperature: 0.7
        },
        evaluation_config: {
          evaluation_id: evalResult.data.id
        }
      })
    })

    const expResult = await expResponse.json()
    
    if (!expResult.success) {
      throw new Error(expResult.error || 'Failed to create experiment')
    }

    return {
      evaluationId: evalResult.data.id,
      experimentId: expResult.data.id
    }
  }

  // Test 8: Error Handling and Recovery
  private async testErrorHandling() {
    const errors: string[] = []
    
    try {
      // Test invalid conversation creation
      await startConversation({
        name: '', // Invalid empty name
        project_id: 'nonexistent'
      })
    } catch (error) {
      errors.push('conversation_creation')
    }

    try {
      // Test invalid trace creation
      await createTrace({
        name: '', // Invalid empty name
        project_id: 'nonexistent'
      })
    } catch (error) {
      errors.push('trace_creation')
    }

    try {
      // Test invalid attachment upload
      const invalidFile = new File([''], '', { type: '' }) // Invalid file
      await this.client.uploadAttachment({
        file: invalidFile,
        conversation_id: 'nonexistent'
      })
    } catch (error) {
      errors.push('attachment_upload')
    }

    return {
      errorsHandled: errors.length,
      errorTypes: errors
    }
  }

  // Main test runner
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Comprehensive Agent Lens Test Suite')
    console.log('================================================')
    
    // Initialize test suite with existing project data
    await this.initialize()
    
    const startTime = Date.now()

    // Run all tests
    await this.runTest('Basic SDK Operations', () => this.testBasicSDKOperations())
    await this.runTest('Trace Operations', () => this.testTraceOperations())
    await this.runTest('Attachment Operations', () => this.testAttachmentOperations())
    await this.runTest('Decorated Functions', () => this.testDecoratedFunction())
    await this.runTest('AI Agent Workflow', () => this.testAIAgentWorkflow())
    await this.runTest('Dataset Operations', () => this.testDatasetOperations())
    await this.runTest('Evaluation Operations', () => this.testEvaluationOperations())
    await this.runTest('Error Handling', () => this.testErrorHandling())

    // Generate test report
    const totalDuration = Date.now() - startTime
    const passed = this.testResults.filter(r => r.status === 'pass').length
    const failed = this.testResults.filter(r => r.status === 'fail').length
    const total = this.testResults.length

    console.log('\n📊 Test Results Summary')
    console.log('=======================')
    console.log(`Total Tests: ${total}`)
    console.log(`Passed: ${passed} ✅`)
    console.log(`Failed: ${failed} ❌`)
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`)
    console.log(`Total Duration: ${totalDuration}ms`)

    if (failed > 0) {
      console.log('\n❌ Failed Tests:')
      this.testResults
        .filter(r => r.status === 'fail')
        .forEach(r => {
          console.log(`  - ${r.testName}: ${r.error}`)
        })
    }

    console.log('\n📈 Detailed Results:')
    this.testResults.forEach(r => {
      const status = r.status === 'pass' ? '✅' : '❌'
      console.log(`  ${status} ${r.testName} (${r.duration}ms)`)
    })

    if (passed === total) {
      console.log('\n🎉 All tests passed! Agent Lens is working correctly.')
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed. Please check the implementation.`)
    }
  }

  // Get test results
  getResults() {
    return {
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'pass').length,
        failed: this.testResults.filter(r => r.status === 'fail').length,
        successRate: this.testResults.length > 0 ? 
          (this.testResults.filter(r => r.status === 'pass').length / this.testResults.length) * 100 : 0
      }
    }
  }
}

// Export test runner function
export async function runComprehensiveTests(): Promise<void> {
  const testSuite = new ComprehensiveTestSuite()
  await testSuite.runAllTests()
  return testSuite.getResults() as any
}

// Export for individual test execution
export default ComprehensiveTestSuite