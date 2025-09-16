#!/usr/bin/env node
/**
 * Database Population Script for Agent Lens
 * 
 * This script directly populates the Agent Lens database with realistic
 * production-grade conversation data for testing observability features.
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Database configuration
const DB_PATH = path.join(__dirname, 'data', 'sprintlens.db');
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables if they don't exist
function initializeTables() {
  console.log('🔧 Initializing database tables...');
  
  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      description TEXT,
      department TEXT,
      priority TEXT,
      template TEXT DEFAULT 'blank',
      security_level TEXT DEFAULT 'standard',
      data_retention TEXT DEFAULT '90',
      default_access TEXT DEFAULT 'read',
      pii_handling BOOLEAN DEFAULT false,
      compliance_mode BOOLEAN DEFAULT false,
      tags TEXT DEFAULT '[]',
      visibility TEXT DEFAULT 'private',
      status TEXT DEFAULT 'active',
      conversations INTEGER DEFAULT 0,
      agents INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0,
      avg_response_time INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'system'
    )
  `);
  
  // Agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'general',
      role TEXT,
      capabilities TEXT DEFAULT '[]',
      system_prompt TEXT,
      model TEXT DEFAULT 'gpt-4',
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 2000,
      status TEXT DEFAULT 'active',
      is_active BOOLEAN DEFAULT true,
      version TEXT DEFAULT '1.0.0',
      conversations INTEGER DEFAULT 0,
      success_rate REAL DEFAULT 0,
      avg_response_time INTEGER DEFAULT 0,
      last_active_at DATETIME,
      config TEXT DEFAULT '{}',
      tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT DEFAULT 'system',
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);
  
  // Conversations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      input TEXT NOT NULL,
      output TEXT NOT NULL,
      status TEXT DEFAULT 'success',
      response_time INTEGER NOT NULL,
      token_usage INTEGER NOT NULL,
      cost REAL NOT NULL,
      thread_id TEXT,
      conversation_index INTEGER DEFAULT 1,
      turn_count INTEGER DEFAULT 1,
      is_thread BOOLEAN DEFAULT false,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    )
  `);
  
  // Traces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      conversation_id TEXT,
      name TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER,
      status TEXT DEFAULT 'running',
      metadata TEXT DEFAULT '{}',
      tags TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `);
  
  // Spans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS spans (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      parent_span_id TEXT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'function',
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      duration INTEGER,
      input TEXT,
      output TEXT,
      metadata TEXT DEFAULT '{}',
      token_usage INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trace_id) REFERENCES traces(id),
      FOREIGN KEY (parent_span_id) REFERENCES spans(id)
    )
  `);
  
  console.log('✅ Database tables initialized');
}

// Production-grade test data
function generateProductionData() {
  console.log('🏭 Generating production-grade test data...');
  
  const projectId = 'proj_production_demo_001';
  const timestamp = new Date().toISOString();
  
  // Create project
  const insertProject = db.prepare(`
    INSERT OR REPLACE INTO projects (
      id, name, code, description, department, priority, template,
      conversations, agents, success_rate, avg_response_time,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  insertProject.run(
    projectId,
    'Customer Experience Platform',
    'CEP',
    'Production customer experience platform with AI-powered support, technical assistance, and sales automation',
    'Customer Success',
    'High',
    'autonomous',
    0, // Will be updated as we add conversations
    0, // Will be updated as we add agents
    0, // Will be calculated
    0, // Will be calculated
    timestamp,
    timestamp
  );
  
  console.log('✅ Created project: Customer Experience Platform');
  
  // Create agents
  const agents = [
    {
      id: 'agent_customer_support_001',
      name: 'Customer Support Assistant',
      description: 'AI-powered customer support agent handling account issues, billing inquiries, and general support requests',
      type: 'general',
      role: 'Customer Support Specialist',
      capabilities: JSON.stringify(['natural_language_processing', 'knowledge_base_search', 'escalation_management', 'sentiment_analysis']),
      model: 'gpt-4',
      temperature: 0.7
    },
    {
      id: 'agent_technical_support_001', 
      name: 'Technical Support Specialist',
      description: 'Advanced technical support agent for API integrations, performance issues, and system troubleshooting',
      type: 'specialist',
      role: 'Senior Technical Support Engineer',
      capabilities: JSON.stringify(['api_debugging', 'performance_analysis', 'system_diagnostics', 'code_review']),
      model: 'claude-3-opus',
      temperature: 0.5
    },
    {
      id: 'agent_sales_assistant_001',
      name: 'Sales Development Assistant',
      description: 'AI sales agent for lead qualification, product demonstrations, and pricing discussions',
      type: 'specialist', 
      role: 'Sales Development Representative',
      capabilities: JSON.stringify(['lead_qualification', 'product_knowledge', 'pricing_optimization', 'demo_scheduling']),
      model: 'gpt-4-turbo',
      temperature: 0.8
    }
  ];
  
  const insertAgent = db.prepare(`
    INSERT OR REPLACE INTO agents (
      id, project_id, name, description, type, role, capabilities,
      model, temperature, conversations, success_rate, avg_response_time,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  agents.forEach(agent => {
    insertAgent.run(
      agent.id, projectId, agent.name, agent.description, agent.type,
      agent.role, agent.capabilities, agent.model, agent.temperature,
      0, 0, 0, timestamp, timestamp
    );
    console.log(`✅ Created agent: ${agent.name}`);
  });
  
  // Generate realistic conversations
  console.log('💬 Generating realistic conversations...');
  
  const conversationScenarios = [
    // Customer Support Scenarios
    {
      agentId: 'agent_customer_support_001',
      agentName: 'Customer Support Assistant',
      scenarios: [
        {
          input: "I'm having trouble logging into my account. I keep getting an 'invalid password' error even though I'm sure my password is correct.",
          output: "I understand how frustrating login issues can be. Let me help you resolve this. First, let's try resetting your password to ensure it's working correctly. I'll also check if there might be any temporary account restrictions.",
          responseTime: 1200,
          tokenUsage: 450,
          cost: 0.0135,
          scenarioType: 'account_access',
          turnCount: 3,
          isThread: true
        },
        {
          input: "Why was I charged $89.99 last month? My plan is supposed to be $49.99.",
          output: "I can help clarify your billing charges. Let me review your account details. The $89.99 charge includes your base plan ($49.99) plus additional usage fees for premium features that were used during the billing period.",
          responseTime: 980,
          tokenUsage: 380,
          cost: 0.0114,
          scenarioType: 'billing_inquiry',
          turnCount: 2,
          isThread: true
        },
        {
          input: "The mobile app keeps crashing when I try to upload photos. I'm using iPhone 15 Pro with iOS 17.4.",
          output: "I'm sorry you're experiencing crashes with photo uploads. This appears to be related to a compatibility issue with iOS 17.4. Here's a workaround while we work on a fix: try reducing the photo resolution before uploading.",
          responseTime: 1450,
          tokenUsage: 520,
          cost: 0.0156,
          scenarioType: 'technical_issue',
          turnCount: 4,
          isThread: true
        },
        {
          input: "I want to upgrade to the premium plan. What additional features do I get?",
          output: "Great choice! The Premium plan includes advanced analytics, priority customer support, unlimited file storage, and access to our API. You'll also get custom branding options and advanced team collaboration features.",
          responseTime: 890,
          tokenUsage: 340,
          cost: 0.0102,
          scenarioType: 'plan_upgrade',
          turnCount: 2,
          isThread: true
        },
        {
          input: "How can I export all my data? I need it for compliance purposes.",
          output: "Absolutely, I can help you with data export for compliance. You can access the data export feature in your account settings under 'Privacy & Data'. The export includes all your conversations, files, and account activity in JSON and CSV formats.",
          responseTime: 1120,
          tokenUsage: 420,
          cost: 0.0126,
          scenarioType: 'data_export',
          turnCount: 3,
          isThread: true
        }
      ]
    },
    
    // Technical Support Scenarios
    {
      agentId: 'agent_technical_support_001',
      agentName: 'Technical Support Specialist', 
      scenarios: [
        {
          input: "I'm getting 500 errors when making POST requests to your API endpoint /api/v1/data. The payload seems correct according to your documentation.",
          output: "Let me help you troubleshoot these 500 errors. First, let's verify your API key permissions and rate limiting status. Can you share the exact payload structure you're sending? I'll also check our server logs for any patterns.",
          responseTime: 2100,
          tokenUsage: 680,
          cost: 0.051,
          scenarioType: 'api_integration',
          turnCount: 5,
          isThread: true
        },
        {
          input: "Our application performance has degraded significantly since your last update. Response times increased by 400%. Can you help?",
          output: "A 400% performance degradation is definitely concerning. Let me analyze this immediately. I'll check the recent deployment changes and run diagnostics on your specific use case. Please share your application's typical query patterns so I can identify the bottleneck.",
          responseTime: 2450,
          tokenUsage: 750,
          cost: 0.05625,
          scenarioType: 'performance_issue',
          turnCount: 6,
          isThread: true
        },
        {
          input: "We need to implement SSO with SAML for our enterprise deployment. What are the configuration requirements?",
          output: "I'll guide you through the SAML SSO implementation. We support SAML 2.0 with both IdP-initiated and SP-initiated flows. First, you'll need to configure your identity provider settings in our admin console. I'll provide you with the detailed configuration steps and metadata.",
          responseTime: 1890,
          tokenUsage: 620,
          cost: 0.0465,
          scenarioType: 'sso_implementation',
          turnCount: 4,
          isThread: true
        },
        {
          input: "Webhook events aren't being delivered to our endpoint. Our server shows no incoming requests, but the webhook is configured correctly.",
          output: "Let me investigate the webhook delivery issue. I'll check our webhook queue status and delivery logs for your endpoint. Common causes include SSL certificate issues, firewall blocking, or endpoint timeouts. Let me run some diagnostics first.",
          responseTime: 1750,
          tokenUsage: 590,
          cost: 0.04425,
          scenarioType: 'webhook_debugging',
          turnCount: 4,
          isThread: true
        }
      ]
    },
    
    // Sales Scenarios
    {
      agentId: 'agent_sales_assistant_001',
      agentName: 'Sales Development Assistant',
      scenarios: [
        {
          input: "I'm interested in your enterprise solution for a 500-person company. What are the key features and pricing options?",
          output: "Perfect! For a 500-person enterprise deployment, I'd recommend our Enterprise Plus plan. Key features include unlimited users, advanced analytics, dedicated support, custom integrations, and enterprise-grade security. Let me schedule a demo to show you these features in action.",
          responseTime: 1340,
          tokenUsage: 480,
          cost: 0.0144,
          scenarioType: 'enterprise_inquiry',
          turnCount: 3,
          isThread: true
        },
        {
          input: "Can you provide a comparison between your Professional and Enterprise plans? We're trying to decide which fits our needs.",
          output: "Absolutely! The main differences are: Professional supports up to 50 users with standard analytics, while Enterprise offers unlimited users with advanced reporting. Enterprise also includes priority support, custom branding, and API access. What's your current team size and main use case?",
          responseTime: 1120,
          tokenUsage: 420,
          cost: 0.0126,
          scenarioType: 'plan_comparison',
          turnCount: 2,
          isThread: true
        },
        {
          input: "We're evaluating multiple solutions. How does your platform compare to [Competitor X] in terms of features and pricing?",
          output: "Great question! While I can't speak negatively about competitors, I can highlight our strengths: superior AI accuracy (98.7% vs industry average 94%), faster response times, and more flexible pricing. Our customers often mention our customer support quality as a key differentiator. Would you like me to arrange a side-by-side demo?",
          responseTime: 1580,
          tokenUsage: 520,
          cost: 0.0156,
          scenarioType: 'competitive_analysis',
          turnCount: 3,
          isThread: true
        },
        {
          input: "What kind of ROI can we expect from implementing your solution? Do you have any case studies?",
          output: "Excellent question! Our customers typically see 40-60% reduction in support ticket volume and 35% improvement in customer satisfaction scores within 3 months. I have several case studies from similar-sized companies. One manufacturing client saved $180K annually in support costs. I'd love to share these detailed case studies with you.",
          responseTime: 1450,
          tokenUsage: 490,
          cost: 0.0147,
          scenarioType: 'roi_discussion',
          turnCount: 2,
          isThread: true
        }
      ]
    }
  ];
  
  const insertConversation = db.prepare(`
    INSERT INTO conversations (
      id, project_id, agent_id, agent_name, input, output, status,
      response_time, token_usage, cost, thread_id, turn_count, is_thread,
      metadata, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertTrace = db.prepare(`
    INSERT INTO traces (
      id, project_id, conversation_id, name, start_time, end_time,
      duration, status, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertSpan = db.prepare(`
    INSERT INTO spans (
      id, trace_id, name, type, start_time, end_time, duration,
      input, output, metadata, token_usage, cost, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let conversationCount = 0;
  let totalTokens = 0;
  let totalCost = 0;
  let successfulConversations = 0;
  const agentStats = {};
  
  // Process each agent's scenarios
  conversationScenarios.forEach(agentData => {
    agentStats[agentData.agentId] = {
      conversations: 0,
      tokens: 0,
      cost: 0,
      responseTimes: []
    };
    
    agentData.scenarios.forEach((scenario, index) => {
      conversationCount++;
      
      // Generate conversation ID and thread ID
      const conversationId = `conv_${agentData.agentId}_${String(index + 1).padStart(3, '0')}`;
      const threadId = scenario.isThread ? `thread_${agentData.agentId}_${String(index + 1).padStart(3, '0')}` : null;
      
      // Add some randomness to make it more realistic
      const responseTimeVariation = Math.floor(Math.random() * 400 - 200); // ±200ms
      const finalResponseTime = Math.max(200, scenario.responseTime + responseTimeVariation);
      
      const tokenVariation = Math.floor(Math.random() * 100 - 50); // ±50 tokens
      const finalTokenUsage = Math.max(50, scenario.tokenUsage + tokenVariation);
      
      const finalCost = finalTokenUsage * (agentData.agentId === 'agent_technical_support_001' ? 0.000075 : 0.00003);
      
      // Create conversation with current timestamp variations
      const conversationTime = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time within last 7 days
      
      const metadata = JSON.stringify({
        scenario_type: scenario.scenarioType,
        complexity_level: Math.floor(Math.random() * 5) + 1,
        user_sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        resolution_status: 'resolved',
        agent_confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0
      });
      
      // Insert conversation
      insertConversation.run(
        conversationId, projectId, agentData.agentId, agentData.agentName,
        scenario.input, scenario.output, 'success',
        finalResponseTime, finalTokenUsage, finalCost,
        threadId, scenario.turnCount, scenario.isThread ? 1 : 0,
        metadata, conversationTime.toISOString(), conversationTime.toISOString()
      );
      
      // Create trace for this conversation
      const traceId = `trace_${conversationId}`;
      const traceStartTime = new Date(conversationTime.getTime() - finalResponseTime);
      const traceMetadata = JSON.stringify({
        conversation_id: conversationId,
        agent_type: agentData.agentId.includes('customer') ? 'customer_support' : 
                   agentData.agentId.includes('technical') ? 'technical_support' : 'sales',
        trace_version: '1.0'
      });
      
      insertTrace.run(
        traceId, projectId, conversationId, `Conversation Processing: ${scenario.scenarioType}`,
        traceStartTime.toISOString(), conversationTime.toISOString(),
        finalResponseTime, 'completed', traceMetadata
      );
      
      // Create spans for this trace (simulate agent processing steps)
      const spanTypes = [
        { name: 'input_analysis', type: 'analysis', duration: Math.floor(finalResponseTime * 0.2) },
        { name: 'context_retrieval', type: 'retrieval', duration: Math.floor(finalResponseTime * 0.3) },
        { name: 'llm_processing', type: 'llm', duration: Math.floor(finalResponseTime * 0.4) },
        { name: 'response_validation', type: 'validation', duration: Math.floor(finalResponseTime * 0.1) }
      ];
      
      let cumulativeTime = 0;
      spanTypes.forEach((spanType, spanIndex) => {
        const spanId = `span_${traceId}_${spanIndex}`;
        const spanStartTime = new Date(traceStartTime.getTime() + cumulativeTime);
        const spanEndTime = new Date(spanStartTime.getTime() + spanType.duration);
        
        const spanTokenUsage = spanType.type === 'llm' ? Math.floor(finalTokenUsage * 0.8) : 
                              spanType.type === 'analysis' ? Math.floor(finalTokenUsage * 0.15) :
                              Math.floor(finalTokenUsage * 0.05);
        
        const spanCost = spanType.type === 'llm' ? finalCost * 0.9 : finalCost * 0.1 / 3;
        
        const spanMetadata = JSON.stringify({
          processing_stage: spanType.name,
          model_used: spanType.type === 'llm' ? (agentData.agentId === 'agent_technical_support_001' ? 'claude-3-opus' : 'gpt-4') : null,
          confidence_score: spanType.type === 'llm' ? Math.random() * 0.2 + 0.8 : null
        });
        
        insertSpan.run(
          spanId, traceId, spanType.name, spanType.type,
          spanStartTime.toISOString(), spanEndTime.toISOString(), spanType.duration,
          JSON.stringify({ stage: spanType.name, input_text: scenario.input }),
          JSON.stringify({ stage: spanType.name, processing_result: 'completed' }),
          spanMetadata, spanTokenUsage, spanCost, 'success'
        );
        
        cumulativeTime += spanType.duration;
      });
      
      // Update statistics
      totalTokens += finalTokenUsage;
      totalCost += finalCost;
      successfulConversations++;
      
      agentStats[agentData.agentId].conversations++;
      agentStats[agentData.agentId].tokens += finalTokenUsage;
      agentStats[agentData.agentId].cost += finalCost;
      agentStats[agentData.agentId].responseTimes.push(finalResponseTime);
      
      if (conversationCount % 5 === 0) {
        console.log(`  Generated ${conversationCount} conversations...`);
      }
    });
  });
  
  // Add some error scenarios (5% failure rate)
  const errorScenarios = [
    {
      agentId: 'agent_customer_support_001',
      input: "I need help with my account but I'm getting timeout errors.",
      output: "Error: Request timeout - please try again later",
      status: 'error'
    },
    {
      agentId: 'agent_technical_support_001', 
      input: "The API integration is completely broken after your update.",
      output: "Error: Unable to process request due to system maintenance",
      status: 'error'
    }
  ];
  
  errorScenarios.forEach((scenario, index) => {
    conversationCount++;
    const conversationId = `conv_error_${String(index + 1).padStart(3, '0')}`;
    const errorTime = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000); // Random time within last day
    
    const errorMetadata = JSON.stringify({
      error_type: 'timeout',
      retry_count: 3,
      error_code: 'TIMEOUT_ERROR'
    });
    
    insertConversation.run(
      conversationId, projectId, scenario.agentId, agentStats[scenario.agentId] ? 'Known Agent' : 'Unknown Agent',
      scenario.input, scenario.output, scenario.status,
      5000, 0, 0, null, 1, 0,
      errorMetadata, errorTime.toISOString(), errorTime.toISOString()
    );
  });
  
  // Update project and agent statistics
  const totalResponseTime = Object.values(agentStats).reduce((sum, stats) => 
    sum + stats.responseTimes.reduce((a, b) => a + b, 0), 0
  );
  const totalConversations = Object.values(agentStats).reduce((sum, stats) => sum + stats.conversations, 0);
  const avgResponseTime = totalConversations > 0 ? Math.floor(totalResponseTime / totalConversations) : 0;
  const successRate = conversationCount > 0 ? (successfulConversations / conversationCount * 100) : 0;
  
  // Update project stats
  const updateProject = db.prepare(`
    UPDATE projects 
    SET conversations = ?, agents = ?, success_rate = ?, avg_response_time = ?, updated_at = ?
    WHERE id = ?
  `);
  
  updateProject.run(conversationCount, agents.length, successRate, avgResponseTime, timestamp, projectId);
  
  // Update agent stats
  const updateAgent = db.prepare(`
    UPDATE agents 
    SET conversations = ?, success_rate = ?, avg_response_time = ?, last_active_at = ?, updated_at = ?
    WHERE id = ?
  `);
  
  Object.keys(agentStats).forEach(agentId => {
    const stats = agentStats[agentId];
    const agentAvgResponseTime = stats.responseTimes.length > 0 ? 
      Math.floor(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length) : 0;
    const agentSuccessRate = 100; // All agent conversations were successful in our test data
    
    updateAgent.run(
      stats.conversations, agentSuccessRate, agentAvgResponseTime, 
      timestamp, timestamp, agentId
    );
  });
  
  console.log(`✅ Generated ${conversationCount} conversations with traces and spans`);
  console.log(`   Total tokens: ${totalTokens.toLocaleString()}`);
  console.log(`   Total cost: $${totalCost.toFixed(4)}`);
  console.log(`   Success rate: ${successRate.toFixed(1)}%`);
  console.log(`   Avg response time: ${avgResponseTime}ms`);
  
  return {
    projectId,
    conversationCount,
    totalTokens,
    totalCost,
    successRate,
    avgResponseTime,
    agentStats
  };
}

function main() {
  console.log('🏭 Agent Lens Database Population Tool');
  console.log('======================================');
  
  try {
    // Initialize database
    initializeTables();
    
    // Generate production data
    const results = generateProductionData();
    
    console.log('\n📊 POPULATION SUMMARY');
    console.log('====================');
    console.log(`Project ID: ${results.projectId}`);
    console.log(`Conversations: ${results.conversationCount}`);
    console.log(`Total Tokens: ${results.totalTokens.toLocaleString()}`);
    console.log(`Total Cost: $${results.totalCost.toFixed(4)}`);
    console.log(`Success Rate: ${results.successRate.toFixed(1)}%`);
    console.log(`Avg Response Time: ${results.avgResponseTime}ms`);
    
    console.log('\n🤖 AGENT BREAKDOWN');
    console.log('==================');
    Object.entries(results.agentStats).forEach(([agentId, stats]) => {
      const avgTime = stats.responseTimes.length > 0 ? 
        Math.floor(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length) : 0;
      console.log(`${agentId}:`);
      console.log(`  Conversations: ${stats.conversations}`);
      console.log(`  Avg Response Time: ${avgTime}ms`);
      console.log(`  Total Tokens: ${stats.tokens.toLocaleString()}`);
      console.log(`  Total Cost: $${stats.cost.toFixed(4)}`);
    });
    
    console.log('\n🎯 NEXT STEPS');
    console.log('==============');
    console.log('1. Open Agent Lens dashboard: http://localhost:3000');
    console.log('2. Navigate to the "Customer Experience Platform" project');
    console.log('3. Click on the "Conversations" tab to view generated data');
    console.log('4. Test filtering by agent, status, time range, and search');
    console.log('5. Verify observability features with realistic conversation data');
    console.log('6. Check individual conversation threads and traces');
    
    console.log('\n✅ Database population completed successfully!');
    
  } catch (error) {
    console.error('❌ Database population failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateProductionData, initializeTables };