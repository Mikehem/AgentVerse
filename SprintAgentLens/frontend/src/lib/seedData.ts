import { runDb, conversationDb, metricsDb, tracesDb } from './database'

// Realistic conversation templates for different domains
const conversationTemplates = [
  // Customer Support
  {
    domain: 'customer_support',
    inputs: [
      'I need help with my account login',
      'My payment was charged twice this month',
      'How do I cancel my subscription?',
      'I cannot access my dashboard',
      'The app keeps crashing on my phone',
      'I want to upgrade my plan',
      'How do I reset my password?',
      'I need a refund for my last purchase',
      'My account has been suspended, why?',
      'Can you help me understand my billing?'
    ],
    outputs: [
      'I can help you with your account login. Let me guide you through the password reset process.',
      'I see the duplicate charge on your account. I\'ve initiated a refund that will process within 3-5 business days.',
      'I can help you cancel your subscription. Would you like to downgrade to a free plan instead?',
      'Let me check your dashboard access permissions. Please clear your browser cache and try again.',
      'I\'m sorry about the app crashes. Please try updating to the latest version from the app store.',
      'I\'d be happy to help you upgrade your plan. What features are you looking for?',
      'I\'ll send you a password reset link to your registered email address.',
      'I understand your frustration. Let me review your purchase and process the appropriate refund.',
      'Your account was suspended due to unusual activity. I\'ve now restored access for you.',
      'I\'ll walk you through your billing details. Your next charge will be on the 15th of next month.'
    ]
  },
  // Technical Support
  {
    domain: 'technical_support',
    inputs: [
      'The API is returning 500 errors',
      'How do I integrate webhooks?',
      'My API key is not working',
      'Rate limits are too restrictive',
      'Documentation is unclear on authentication',
      'How do I bulk upload data?',
      'The SDK is missing for Python',
      'Response time is very slow',
      'How do I implement real-time updates?',
      'SSL certificate errors in production'
    ],
    outputs: [
      'I see the 500 errors in your logs. This appears to be related to a recent deployment. I\'ve escalated this to our engineering team.',
      'To integrate webhooks, you\'ll need to create an endpoint on your server and register it in your dashboard settings.',
      'Your API key appears to be expired. I\'ve generated a new one for you - please check your email.',
      'I understand the rate limits are restrictive. Based on your usage, I can increase your limit to 10,000 requests per hour.',
      'You\'re right, the auth docs need updating. For now, use Bearer token authentication with your API key.',
      'For bulk uploads, use our batch API endpoint with up to 1000 records per request.',
      'The Python SDK is in beta. I\'ll send you access to the repository and documentation.',
      'Slow response times can be caused by large payloads. Try pagination with smaller page sizes.',
      'For real-time updates, implement WebSocket connections or use our Server-Sent Events endpoint.',
      'The SSL certificate error is due to SNI issues. Try updating your client library or contact your hosting provider.'
    ]
  },
  // Sales & Marketing
  {
    domain: 'sales',
    inputs: [
      'What are your enterprise pricing options?',
      'Can I get a demo of the platform?',
      'Do you offer custom integrations?',
      'What\'s included in the professional plan?',
      'I need SOC 2 compliance documentation',
      'Can you explain your data retention policy?',
      'Do you have case studies in healthcare?',
      'What\'s your uptime guarantee?',
      'I need a quote for 500 users',
      'How does your platform compare to competitors?'
    ],
    outputs: [
      'Our enterprise plans start at $50 per user per month with volume discounts. I\'ll connect you with our enterprise sales team.',
      'I\'d be happy to schedule a personalized demo. What specific features are you most interested in seeing?',
      'Yes, we offer custom integrations as part of our enterprise plans. Our team can build connectors for your specific needs.',
      'The professional plan includes unlimited projects, advanced analytics, priority support, and API access.',
      'I\'ll send you our SOC 2 Type II report and compliance documentation within the hour.',
      'We retain your data for as long as your account is active, plus 30 days after cancellation for recovery purposes.',
      'Absolutely! I have several healthcare case studies showing 40% efficiency improvements. I\'ll send them over.',
      'We guarantee 99.9% uptime with automatic failover and redundancy across multiple data centers.',
      'For 500 users, your monthly cost would be $15,000 with our volume pricing. This includes dedicated support.',
      'Compared to competitors, we offer 50% faster processing, better accuracy, and more integrations at a lower cost per user.'
    ]
  }
]

// Realistic metrics for different types
const metricTemplates = {
  response_time: { min: 100, max: 5000, unit: 'ms' },
  token_usage: { min: 50, max: 2000, unit: 'tokens' },
  cost: { min: 0.001, max: 0.05, unit: 'usd' },
  success_rate: { min: 85, max: 99.5, unit: 'percentage' },
  hallucination_score: { min: 0.1, max: 0.9, unit: 'score' },
  answer_relevance: { min: 0.6, max: 0.98, unit: 'score' },
  coherence_score: { min: 0.7, max: 0.95, unit: 'score' },
  user_satisfaction: { min: 3.2, max: 4.8, unit: 'rating' },
  error_rate: { min: 0.5, max: 15, unit: 'percentage' },
  throughput: { min: 10, max: 200, unit: 'requests_per_minute' }
}

// Generate realistic datetime within the last N days
function getRandomDateTime(daysBack: number): string {
  const now = new Date()
  const randomTime = now.getTime() - (Math.random() * daysBack * 24 * 60 * 60 * 1000)
  return new Date(randomTime).toISOString()
}

// Generate a random value within a range
function getRandomValue(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Get random element from array
function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export async function createSeedData(projectId: string, agentId: string) {
  console.log('🌱 Creating seed data...')
  
  try {
    // Create 5 runs with realistic data
    const runs = []
    for (let i = 0; i < 5; i++) {
      const startTime = getRandomDateTime(30)
      const endTime = new Date(new Date(startTime).getTime() + (Math.random() * 3600000 + 600000)).toISOString() // 10min to 1hr duration
      
      const runData = {
        projectId,
        agentId,
        name: `${getRandomElement(['Demo', 'Production', 'Testing', 'Evaluation', 'Load Test'])} Run ${i + 1}`,
        description: `Automated ${getRandomElement(['customer support', 'technical assistance', 'sales inquiry'])} session`,
        startTime,
        endTime,
        status: getRandomElement(['completed', 'completed', 'completed', 'failed']), // 75% success rate
        tags: [
          getRandomElement(['demo', 'production', 'test']),
          getRandomElement(['automated', 'manual']),
          getRandomElement(['high-priority', 'medium-priority', 'low-priority'])
        ],
        metadata: {
          environment: getRandomElement(['production', 'staging', 'development']),
          version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          user_agent: getRandomElement(['web', 'mobile', 'api'])
        }
      }
      
      const run = runDb.create(runData)
      runs.push(run)
    }

    // Create conversations for each run (10-50 conversations per run)
    let totalConversations = 0
    let totalMetrics = 0
    let totalTraces = 0
    
    for (const run of runs) {
      const conversationCount = Math.floor(Math.random() * 40) + 10 // 10-50 conversations
      
      for (let i = 0; i < conversationCount; i++) {
        const domain = getRandomElement(conversationTemplates)
        const input = getRandomElement(domain.inputs)
        const output = getRandomElement(domain.outputs)
        const responseTime = Math.floor(getRandomValue(200, 3000))
        const tokenUsage = Math.floor(getRandomValue(100, 800))
        const cost = (tokenUsage * 0.00002) + Math.random() * 0.01
        const timestamp = getRandomDateTime(7)
        
        const conversation = conversationDb.create({
          projectId,
          agentId,
          runId: run.id,
          userId: `user_${Math.floor(Math.random() * 1000)}`,
          sessionId: `session_${run.id}_${Math.floor(i / 5)}`, // Group conversations in sessions
          input,
          output,
          status: Math.random() > 0.1 ? 'success' : getRandomElement(['error', 'timeout']),
          responseTime,
          tokenUsage,
          cost,
          feedback: Math.random() > 0.8 ? getRandomElement(['Helpful', 'Not quite right', 'Perfect answer', 'Needs improvement']) : null,
          metadata: JSON.stringify({
            domain: domain.domain,
            intent: getRandomElement(['question', 'complaint', 'request', 'compliment']),
            sentiment: getRandomElement(['positive', 'negative', 'neutral']),
            language: 'en',
            channel: getRandomElement(['web', 'mobile', 'api', 'chat'])
          }),
          createdAt: timestamp
        })
        
        totalConversations++
        
        // Create trace for each conversation
        const trace = tracesDb.create({
          projectId,
          agentId,
          runId: run.id,
          conversationId: conversation.id,
          traceType: 'conversation',
          operationName: 'process_user_input',
          startTime: timestamp,
          endTime: new Date(new Date(timestamp).getTime() + responseTime).toISOString(),
          duration: responseTime,
          status: conversation.status === 'success' ? 'success' : 'error',
          inputData: JSON.stringify({ input, domain: domain.domain }),
          outputData: JSON.stringify({ output, tokenUsage, cost }),
          spans: JSON.stringify([
            {
              name: 'input_processing',
              duration: Math.floor(responseTime * 0.2),
              status: 'success'
            },
            {
              name: 'llm_generation',
              duration: Math.floor(responseTime * 0.6),
              status: conversation.status === 'success' ? 'success' : 'error'
            },
            {
              name: 'output_formatting',
              duration: Math.floor(responseTime * 0.2),
              status: 'success'
            }
          ]),
          metadata: JSON.stringify({
            model: getRandomElement(['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'gemini-pro']),
            temperature: 0.7,
            max_tokens: 1000
          }),
          createdAt: timestamp
        })
        
        totalTraces++
        
        // Create comprehensive metrics for each conversation
        const metricsToCreate = [
          // Performance metrics
          { type: 'response_time', value: responseTime },
          { type: 'token_usage', value: tokenUsage },
          { type: 'cost', value: cost },
          
          // Quality metrics (Opik-style)
          { type: 'answer_relevance', value: getRandomValue(0.7, 0.98) },
          { type: 'coherence_score', value: getRandomValue(0.75, 0.95) },
          { type: 'hallucination_score', value: getRandomValue(0.05, 0.3) },
          
          // User experience metrics
          { type: 'user_satisfaction', value: getRandomValue(3.5, 4.8) },
          
          // Safety metrics
          { type: 'toxicity_score', value: getRandomValue(0.01, 0.1) },
          { type: 'bias_score', value: getRandomValue(0.02, 0.15) }
        ]
        
        // Add conditional metrics based on status
        if (conversation.status !== 'success') {
          metricsToCreate.push(
            { type: 'error_rate', value: 1 }
          )
        } else {
          metricsToCreate.push(
            { type: 'success_rate', value: 1 }
          )
        }
        
        for (const metricData of metricsToCreate) {
          const metric = metricsDb.create({
            projectId,
            agentId,
            runId: run.id,
            metricType: metricData.type,
            value: metricData.value,
            unit: metricTemplates[metricData.type as keyof typeof metricTemplates]?.unit || null,
            aggregationType: 'instant',
            timestamp,
            evaluationModel: ['hallucination_score', 'answer_relevance', 'coherence_score'].includes(metricData.type) 
              ? getRandomElement(['gpt-4o', 'claude-3-sonnet', 'gemini-pro']) 
              : null,
            threshold: metricData.type === 'hallucination_score' ? 0.3 : null,
            metadata: JSON.stringify({
              conversation_id: conversation.id,
              domain: domain.domain,
              session_id: conversation.sessionId
            }),
            createdAt: timestamp
          })
          
          totalMetrics++
        }
      }
      
      // Update run with final stats
      const runConversations = totalConversations
      const successfulConversations = conversationCount * 0.9 // Assume 90% success rate
      const avgResponseTime = Math.floor(getRandomValue(800, 1500))
      
      runDb.update(run.id, {
        endTime: run.endTime,
        duration: new Date(run.endTime).getTime() - new Date(run.startTime).getTime(),
        totalConversations: conversationCount,
        totalMetrics: conversationCount * 9, // 9 metrics per conversation
        totalTraces: conversationCount,
        avgResponseTime,
        totalTokenUsage: conversationCount * Math.floor(getRandomValue(300, 600)),
        totalCost: conversationCount * getRandomValue(0.01, 0.03),
        successRate: (successfulConversations / conversationCount) * 100,
        status: run.status
      })
    }
    
    console.log(`✅ Seed data created successfully:`)
    console.log(`   - ${runs.length} runs`)
    console.log(`   - ${totalConversations} conversations`)
    console.log(`   - ${totalMetrics} metrics`)
    console.log(`   - ${totalTraces} traces`)
    
    return {
      runs: runs.length,
      conversations: totalConversations,
      metrics: totalMetrics,
      traces: totalTraces
    }
    
  } catch (error) {
    console.error('❌ Error creating seed data:', error)
    throw error
  }
}

// Function to clear all seed data for a project
export async function clearSeedData(projectId: string) {
  console.log('🧹 Clearing seed data...')
  
  try {
    // Clear in reverse dependency order
    const metrics = metricsDb.getAll('SELECT id FROM metrics WHERE projectId = ?', [projectId])
    metrics.forEach(metric => metricsDb.delete(metric.id))
    
    const traces = tracesDb.getAll('SELECT id FROM traces WHERE projectId = ?', [projectId])
    traces.forEach(trace => tracesDb.delete(trace.id))
    
    const conversations = conversationDb.getAll('SELECT id FROM conversations WHERE projectId = ?', [projectId])
    conversations.forEach(conversation => conversationDb.delete(conversation.id))
    
    const runs = runDb.getAll('SELECT id FROM runs WHERE projectId = ?', [projectId])
    runs.forEach(run => runDb.delete(run.id))
    
    console.log('✅ Seed data cleared successfully')
    
  } catch (error) {
    console.error('❌ Error clearing seed data:', error)
    throw error
  }
}