#!/usr/bin/env node

/**
 * Agent Lens Database Seeding Script
 * Creates a default project with comprehensive sample data for all views and pages
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CONFIG = {
  projectId: 'proj_production_demo_001',
  projectName: 'Production Demo Project',
  dataDir: path.join(__dirname, '..', 'SprintAgentLens', 'frontend', 'data'),
  dbFile: 'sprintlens.db'
};

// Sample data generators
class SampleDataGenerator {
  constructor() {
    this.projectId = CONFIG.projectId;
    this.startDate = new Date('2024-01-01');
    this.endDate = new Date();
    this.customers = this.generateCustomers();
    this.agents = this.generateAgents();
    this.intents = [
      'order_inquiry', 'return_request', 'billing_inquiry', 'technical_support',
      'shipping_inquiry', 'account_issue', 'product_question', 'cancellation_request',
      'complaint', 'compliment', 'general_inquiry', 'escalation'
    ];
  }

  generateCustomers() {
    const names = ['Alice Johnson', 'Bob Smith', 'Carol Davis', 'David Wilson', 'Eva Brown', 'Frank Miller', 'Grace Lee', 'Henry Garcia'];
    const tiers = ['standard', 'premium', 'enterprise'];
    
    return names.map((name, index) => ({
      id: `customer_${index + 1}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      tier: tiers[index % tiers.length],
      joinDate: this.randomDate(new Date('2023-01-01'), new Date('2024-06-01')),
      totalSessions: Math.floor(Math.random() * 20) + 1
    }));
  }

  generateAgents() {
    return [
      { id: 'agent_sarah', name: 'Sarah AI Assistant', type: 'primary', version: '2.1.0' },
      { id: 'agent_alex', name: 'Alex Technical Support', type: 'technical', version: '2.0.3' },
      { id: 'agent_emma', name: 'Emma Billing Specialist', type: 'billing', version: '1.9.8' }
    ];
  }

  randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate conversations with realistic patterns
  generateConversations(count = 100) {
    const conversations = [];
    
    for (let i = 0; i < count; i++) {
      const customer = this.randomChoice(this.customers);
      const agent = this.randomChoice(this.agents);
      const intent = this.randomChoice(this.intents);
      const timestamp = this.randomDate(this.startDate, this.endDate);
      
      const responseTime = Math.floor(Math.random() * 5000) + 500; // 0.5-5.5 seconds
      const tokenUsage = Math.floor(Math.random() * 2000) + 100;
      const cost = tokenUsage * 0.0001; // Example cost calculation
      const status = Math.random() < 0.9 ? 'success' : (Math.random() < 0.5 ? 'error' : 'timeout');
      const conversationContent = this.generateConversationContent(intent);
      
      const conversation = {
        id: `conv_${uuidv4().substring(0, 12)}`,
        projectId: this.projectId,
        customerId: customer.id,
        customerName: customer.name,
        agentId: agent.id,
        agentName: agent.name,
        sessionId: `session_${uuidv4().substring(0, 12)}`,
        timestamp: timestamp.toISOString(),
        intent,
        confidence: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
        status: this.randomChoice(['completed', 'escalated', 'pending']),
        satisfactionScore: Math.random() * 2 + 3, // 3.0 to 5.0
        duration: Math.floor(Math.random() * 600) + 60, // 1-10 minutes
        turns: Math.floor(Math.random() * 8) + 2, // 2-10 turns
        escalated: Math.random() < 0.15, // 15% escalation rate
        resolved: Math.random() < 0.85, // 85% resolution rate
        
        // Additional fields for ConversationTableRow interface
        input: conversationContent.userMessage,
        output: conversationContent.agentResponse,
        response_time: responseTime,
        token_usage: tokenUsage,
        cost: cost,
        feedback: Math.random() < 0.3 ? this.randomChoice([
          'Very helpful response',
          'Could be more detailed',
          'Perfect solution',
          'Quick resolution'
        ]) : undefined,
        thread_id: `thread_${uuidv4().substring(0, 8)}`,
        conversation_index: 0,
        metadata: {
          customer_tier: customer.tier,
          agent_type: agent.type,
          session_length: Math.floor(Math.random() * 300) + 30,
          ip_address: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
          user_agent: 'Mozilla/5.0 (compatible; Agent Lens Bot)',
          source: this.randomChoice(['web', 'mobile', 'api', 'widget'])
        },
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
        agent_name: agent.name,
        turn_count: Math.floor(Math.random() * 5) + 1,
        is_thread: Math.random() < 0.3,
        
        // Keep original fields for backward compatibility
        ...conversationContent
      };
      
      conversations.push(conversation);
    }
    
    return conversations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  generateConversationContent(intent) {
    const templates = {
      order_inquiry: {
        userMessage: "Hi, I want to check the status of my order #12345",
        agentResponse: "I'd be happy to help you check your order status. Let me look that up for you right away.",
        topic: "Order Status",
        tags: ['order', 'tracking', 'status']
      },
      return_request: {
        userMessage: "I need to return this product because it doesn't fit properly",
        agentResponse: "I understand you'd like to return your item. I can definitely help you start the return process.",
        topic: "Product Return",
        tags: ['return', 'refund', 'product']
      },
      technical_support: {
        userMessage: "Your API is returning 500 errors and my integration is failing",
        agentResponse: "I'm sorry to hear about the API issues. This sounds like a technical problem that needs immediate attention. Let me escalate this to our technical team.",
        topic: "API Issues",
        tags: ['technical', 'api', 'error', 'escalation']
      },
      billing_inquiry: {
        userMessage: "I have a question about the charges on my last bill",
        agentResponse: "I can help you understand the charges on your bill. Let me review your account details.",
        topic: "Billing Question",
        tags: ['billing', 'charges', 'account']
      }
    };
    
    const template = templates[intent] || templates.order_inquiry;
    return template;
  }

  // Generate traces for observability
  generateTraces(conversations) {
    const traces = [];
    
    conversations.forEach(conv => {
      // Main conversation trace
      const mainTrace = {
        id: `trace_${uuidv4().substring(0, 12)}`,
        conversationId: conv.id,
        projectId: this.projectId,
        name: `process_conversation_${conv.intent}`,
        timestamp: conv.timestamp,
        duration: conv.duration * 1000, // milliseconds
        status: conv.escalated ? 'escalated' : 'completed',
        spans: this.generateSpans(conv),
        metadata: {
          intent: conv.intent,
          confidence: conv.confidence,
          customer_tier: this.customers.find(c => c.id === conv.customerId)?.tier,
          agent_version: this.agents.find(a => a.id === conv.agentId)?.version
        }
      };
      
      traces.push(mainTrace);
    });
    
    return traces;
  }

  generateSpans(conversation) {
    const baseTime = new Date(conversation.timestamp).getTime();
    const spans = [];
    
    // Intent classification span
    spans.push({
      id: `span_${uuidv4().substring(0, 8)}`,
      name: 'classify_intent',
      startTime: baseTime,
      duration: Math.floor(Math.random() * 500) + 100,
      status: 'completed',
      attributes: {
        input_length: conversation.userMessage?.length || 50,
        intent_detected: conversation.intent,
        confidence: conversation.confidence
      }
    });
    
    // LLM processing span
    spans.push({
      id: `span_${uuidv4().substring(0, 8)}`,
      name: 'llm_processing',
      startTime: baseTime + 200,
      duration: Math.floor(Math.random() * 2000) + 500,
      status: 'completed',
      attributes: {
        model: 'gpt-4o-mini',
        prompt_tokens: Math.floor(Math.random() * 200) + 50,
        completion_tokens: Math.floor(Math.random() * 300) + 100,
        cost: (Math.random() * 0.01).toFixed(4)
      }
    });
    
    // Response generation span
    spans.push({
      id: `span_${uuidv4().substring(0, 8)}`,
      name: 'generate_response',
      startTime: baseTime + 1000,
      duration: Math.floor(Math.random() * 300) + 100,
      status: 'completed',
      attributes: {
        response_length: conversation.agentResponse?.length || 80,
        escalation_triggered: conversation.escalated
      }
    });
    
    return spans;
  }

  // Generate metrics and analytics data
  generateMetrics(conversations, traces) {
    const metrics = {
      overview: this.generateOverviewMetrics(conversations),
      performance: this.generatePerformanceMetrics(conversations, traces),
      quality: this.generateQualityMetrics(conversations),
      costs: this.generateCostMetrics(traces),
      intents: this.generateIntentMetrics(conversations),
      trends: this.generateTrendMetrics(conversations)
    };
    
    return metrics;
  }

  generateOverviewMetrics(conversations) {
    const total = conversations.length;
    const completed = conversations.filter(c => c.status === 'completed').length;
    const escalated = conversations.filter(c => c.escalated).length;
    const avgSatisfaction = conversations.reduce((sum, c) => sum + c.satisfactionScore, 0) / total;
    
    return {
      totalConversations: total,
      completedConversations: completed,
      escalatedConversations: escalated,
      completionRate: (completed / total * 100).toFixed(1),
      escalationRate: (escalated / total * 100).toFixed(1),
      avgSatisfactionScore: avgSatisfaction.toFixed(2),
      avgDuration: (conversations.reduce((sum, c) => sum + c.duration, 0) / total).toFixed(1)
    };
  }

  generatePerformanceMetrics(conversations, traces) {
    const avgResponseTime = traces.reduce((sum, t) => sum + t.duration, 0) / traces.length / 1000;
    const p95ResponseTime = this.calculatePercentile(traces.map(t => t.duration / 1000), 95);
    
    return {
      avgResponseTime: avgResponseTime.toFixed(2),
      p95ResponseTime: p95ResponseTime.toFixed(2),
      throughput: (conversations.length / 30).toFixed(1), // conversations per day
      uptime: '99.8%',
      errorRate: '0.2%'
    };
  }

  generateQualityMetrics(conversations) {
    const highSatisfaction = conversations.filter(c => c.satisfactionScore >= 4.0).length;
    const resolved = conversations.filter(c => c.resolved).length;
    
    return {
      highSatisfactionRate: (highSatisfaction / conversations.length * 100).toFixed(1),
      resolutionRate: (resolved / conversations.length * 100).toFixed(1),
      avgTurnsPerConversation: (conversations.reduce((sum, c) => sum + c.turns, 0) / conversations.length).toFixed(1),
      firstContactResolution: '78.3%'
    };
  }

  generateCostMetrics(traces) {
    const totalCost = traces.reduce((sum, trace) => {
      const llmSpan = trace.spans.find(s => s.name === 'llm_processing');
      return sum + (llmSpan ? parseFloat(llmSpan.attributes.cost || 0) : 0);
    }, 0);
    
    const totalTokens = traces.reduce((sum, trace) => {
      const llmSpan = trace.spans.find(s => s.name === 'llm_processing');
      if (llmSpan) {
        return sum + (llmSpan.attributes.prompt_tokens || 0) + (llmSpan.attributes.completion_tokens || 0);
      }
      return sum;
    }, 0);
    
    return {
      totalCost: totalCost.toFixed(4),
      avgCostPerConversation: (totalCost / traces.length).toFixed(4),
      totalTokens,
      avgTokensPerConversation: Math.floor(totalTokens / traces.length),
      costPerToken: (totalCost / totalTokens).toFixed(6)
    };
  }

  generateIntentMetrics(conversations) {
    const intentCounts = {};
    const intentSatisfaction = {};
    
    conversations.forEach(conv => {
      intentCounts[conv.intent] = (intentCounts[conv.intent] || 0) + 1;
      if (!intentSatisfaction[conv.intent]) {
        intentSatisfaction[conv.intent] = [];
      }
      intentSatisfaction[conv.intent].push(conv.satisfactionScore);
    });
    
    const intentMetrics = {};
    Object.keys(intentCounts).forEach(intent => {
      const scores = intentSatisfaction[intent];
      intentMetrics[intent] = {
        count: intentCounts[intent],
        percentage: (intentCounts[intent] / conversations.length * 100).toFixed(1),
        avgSatisfaction: (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)
      };
    });
    
    return intentMetrics;
  }

  generateTrendMetrics(conversations) {
    const dailyData = {};
    
    conversations.forEach(conv => {
      const date = new Date(conv.timestamp).toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = {
          conversations: 0,
          escalations: 0,
          satisfaction: [],
          duration: []
        };
      }
      
      dailyData[date].conversations++;
      if (conv.escalated) dailyData[date].escalations++;
      dailyData[date].satisfaction.push(conv.satisfactionScore);
      dailyData[date].duration.push(conv.duration);
    });
    
    // Convert to time series
    const trends = Object.keys(dailyData).sort().map(date => ({
      date,
      conversations: dailyData[date].conversations,
      escalations: dailyData[date].escalations,
      escalationRate: (dailyData[date].escalations / dailyData[date].conversations * 100).toFixed(1),
      avgSatisfaction: (dailyData[date].satisfaction.reduce((sum, s) => sum + s, 0) / dailyData[date].satisfaction.length).toFixed(2),
      avgDuration: (dailyData[date].duration.reduce((sum, d) => sum + d, 0) / dailyData[date].duration.length).toFixed(1)
    }));
    
    return trends;
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * percentile / 100) - 1;
    return sorted[index];
  }

  // Generate datasets for training
  generateDatasets(conversations) {
    const datasets = {
      intent_classification: {
        id: 'dataset_intent_001',
        name: 'Intent Classification Training Set',
        description: 'Customer message intent classification dataset',
        version: '1.0',
        createdAt: new Date().toISOString(),
        examples: conversations.map(conv => ({
          input: conv.userMessage,
          output: conv.intent,
          confidence: conv.confidence,
          metadata: {
            customer_tier: this.customers.find(c => c.id === conv.customerId)?.tier,
            resolved: conv.resolved
          }
        }))
      },
      response_quality: {
        id: 'dataset_quality_001',
        name: 'Response Quality Dataset',
        description: 'Agent response quality and satisfaction correlation',
        version: '1.0',
        createdAt: new Date().toISOString(),
        examples: conversations.map(conv => ({
          input: {
            user_message: conv.userMessage,
            agent_response: conv.agentResponse,
            intent: conv.intent
          },
          output: {
            satisfaction_score: conv.satisfactionScore,
            resolved: conv.resolved,
            escalated: conv.escalated
          }
        }))
      }
    };
    
    return datasets;
  }

  // Generate sample data for all views
  generateAllSampleData() {
    console.log('🎯 Generating comprehensive sample data...');
    
    // Generate core data
    const conversations = this.generateConversations(150);
    const traces = this.generateTraces(conversations);
    const metrics = this.generateMetrics(conversations, traces);
    const datasets = this.generateDatasets(conversations);
    
    // Generate additional view-specific data
    const projects = [{
      id: this.projectId,
      name: CONFIG.projectName,
      description: 'Demo project showcasing Agent Lens capabilities',
      icon: 'folder',
      color: 'blue',
      template: 'autonomous',
      department: 'Customer Support',
      priority: 'High',
      tags: ['production', 'demo', 'ai-agents'],
      securityLevel: 'standard',
      dataRetention: '90',
      defaultAccess: 'collaborate',
      piiHandling: true,
      complianceMode: true,
      teamMembers: ['admin@sprintlens.com', 'demo@sprintlens.com'],
      visibility: 'private',
      status: 'active',
      agents: conversations.filter(c => c.agentId).length || 3,
      conversations: conversations.length,
      successRate: Math.round((conversations.filter(c => c.resolved).length / conversations.length) * 100) / 100,
      createdAt: this.startDate.toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        agents: conversations.filter(c => c.agentId).length || 3,
        conversations: conversations.length,
        successRate: Math.round((conversations.filter(c => c.resolved).length / conversations.length) * 100) / 100
      },
      lastUpdated: new Date().toISOString(),
      settings: {
        retentionDays: 90,
        autoEvaluation: true,
        costTracking: true
      }
    }];
    
    const evaluations = this.generateEvaluations(conversations);
    const prompts = this.generatePrompts();
    const models = this.generateModels();
    
    return {
      projects,
      conversations,
      traces,
      metrics,
      datasets,
      evaluations,
      prompts,
      models,
      customers: this.customers,
      agents: this.agents,
      metadata: {
        generated_at: new Date().toISOString(),
        version: '1.0.0',
        total_conversations: conversations.length,
        date_range: {
          start: this.startDate.toISOString(),
          end: this.endDate.toISOString()
        }
      }
    };
  }

  generateEvaluations(conversations) {
    return conversations.slice(0, 20).map(conv => ({
      id: `eval_${uuidv4().substring(0, 12)}`,
      conversationId: conv.id,
      projectId: this.projectId,
      timestamp: conv.timestamp,
      metrics: {
        relevance: Math.random() * 0.3 + 0.7,
        helpfulness: Math.random() * 0.3 + 0.7,
        politeness: Math.random() * 0.2 + 0.8,
        accuracy: Math.random() * 0.3 + 0.7
      },
      overallScore: Math.random() * 0.3 + 0.7,
      feedback: this.randomChoice([
        'Response was helpful and accurate',
        'Could be more specific about next steps', 
        'Excellent customer service tone',
        'Resolved the issue quickly'
      ])
    }));
  }

  generatePrompts() {
    return [
      {
        id: 'prompt_001',
        name: 'Customer Support Assistant',
        version: '2.1.0',
        content: 'You are a helpful customer support assistant. Respond professionally and try to resolve customer issues efficiently.',
        createdAt: new Date().toISOString(),
        usage: 89,
        performance: 0.87
      },
      {
        id: 'prompt_002', 
        name: 'Technical Support Specialist',
        version: '1.5.2',
        content: 'You are a technical support specialist. Help customers with technical issues and escalate complex problems when needed.',
        createdAt: new Date().toISOString(),
        usage: 34,
        performance: 0.92
      }
    ];
  }

  generateModels() {
    return [
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'OpenAI',
        usage: 78,
        avgCost: 0.0023,
        avgLatency: 1.2,
        successRate: 99.1
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        provider: 'OpenAI', 
        usage: 22,
        avgCost: 0.0156,
        avgLatency: 2.1,
        successRate: 99.8
      }
    ];
  }
}

// Populate SQLite database with sample data
async function populateSQLiteDatabase(sampleData) {
  try {
    // Use require to load better-sqlite3 (might not be available in all environments)
    let Database;
    try {
      Database = require('better-sqlite3');
    } catch (error) {
      console.log('⚠️  SQLite not available, skipping database population');
      return;
    }
    
    const dbPath = path.join(CONFIG.dataDir, CONFIG.dbFile);
    const db = new Database(dbPath);
    
    // Enable WAL mode for better concurrent performance
    db.pragma('journal_mode = WAL');
    
    // Create projects table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'folder',
        color TEXT NOT NULL DEFAULT 'primary',
        template TEXT NOT NULL,
        department TEXT,
        priority TEXT NOT NULL,
        tags TEXT NOT NULL DEFAULT '[]',
        security_level TEXT NOT NULL,
        data_retention TEXT NOT NULL,
        default_access TEXT NOT NULL,
        pii_handling INTEGER NOT NULL DEFAULT 0,
        compliance_mode INTEGER NOT NULL DEFAULT 0,
        team_members TEXT NOT NULL DEFAULT '[]',
        visibility TEXT NOT NULL DEFAULT 'private',
        status TEXT NOT NULL DEFAULT 'active',
        agents INTEGER NOT NULL DEFAULT 0,
        conversations INTEGER NOT NULL DEFAULT 0,
        success_rate REAL NOT NULL DEFAULT 0.0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        created_by TEXT DEFAULT 'system'
      )
    `);
    
    // Clear existing projects
    db.exec('DELETE FROM projects');
    
    // Insert sample project
    const project = sampleData.projects[0];
    const insertProject = db.prepare(`
      INSERT INTO projects (
        id, name, description, icon, color, template, department, priority,
        tags, security_level, data_retention, default_access, pii_handling,
        compliance_mode, team_members, visibility, status, agents, conversations,
        success_rate, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    insertProject.run(
      project.id,
      project.name,
      project.description,
      project.icon,
      project.color,
      project.template,
      project.department,
      project.priority,
      JSON.stringify(project.tags),
      project.securityLevel,
      project.dataRetention,
      project.defaultAccess,
      project.piiHandling ? 1 : 0,
      project.complianceMode ? 1 : 0,
      JSON.stringify(project.teamMembers),
      project.visibility,
      project.status,
      project.agents,
      project.conversations,
      project.successRate,
      project.createdAt,
      project.updatedAt,
      'system'
    );
    
    db.close();
    console.log('✅ SQLite database populated with sample project');
    
  } catch (error) {
    console.log('⚠️  SQLite population failed:', error.message);
    // Don't fail the entire seeding process
  }
}

// Database initialization
async function initializeDatabase() {
  console.log('📦 Initializing Agent Lens database with sample data...');
  
  // Clear existing data files first
  if (fs.existsSync(CONFIG.dataDir)) {
    console.log('🧹 Clearing existing data files...');
    const dataFiles = fs.readdirSync(CONFIG.dataDir).filter(file => file.endsWith('.json'));
    dataFiles.forEach(file => {
      const filePath = path.join(CONFIG.dataDir, file);
      fs.unlinkSync(filePath);
      console.log(`🗑️  Removed ${file}`);
    });
  }
  
  // Ensure data directory exists
  if (!fs.existsSync(CONFIG.dataDir)) {
    fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  }
  
  const generator = new SampleDataGenerator();
  const sampleData = generator.generateAllSampleData();
  
  // Write sample data to JSON files for the frontend to consume
  const files = [
    { filename: 'projects.json', data: sampleData.projects },
    { filename: 'conversations.json', data: sampleData.conversations },
    { filename: 'traces.json', data: sampleData.traces },
    { filename: 'metrics.json', data: sampleData.metrics },
    { filename: 'datasets.json', data: sampleData.datasets },
    { filename: 'evaluations.json', data: sampleData.evaluations },
    { filename: 'prompts.json', data: sampleData.prompts },
    { filename: 'models.json', data: sampleData.models },
    { filename: 'customers.json', data: sampleData.customers },
    { filename: 'agents.json', data: sampleData.agents },
    { filename: 'sample_data_metadata.json', data: sampleData.metadata }
  ];
  
  files.forEach(({ filename, data }) => {
    const filePath = path.join(CONFIG.dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Created ${filename} with ${Array.isArray(data) ? data.length : Object.keys(data).length} entries`);
  });
  
  // Create SQLite database and add sample project
  await populateSQLiteDatabase(sampleData);
  
  console.log('✅ SQLite database populated with sample data');
  
  console.log('\n🎉 Database initialization completed!');
  console.log(`📁 Sample data location: ${CONFIG.dataDir}`);
  console.log(`🏷️  Default project: ${CONFIG.projectName} (${CONFIG.projectId})`);
  console.log(`📊 Generated ${sampleData.conversations.length} conversations`);
  console.log(`🔍 Generated ${sampleData.traces.length} traces`);
  console.log(`📈 Generated comprehensive metrics and analytics`);
  
  return sampleData;
}

// Main execution
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('\n✨ Agent Lens is ready with sample data!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { SampleDataGenerator, initializeDatabase };