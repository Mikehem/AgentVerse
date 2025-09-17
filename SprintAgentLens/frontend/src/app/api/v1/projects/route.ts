import { NextRequest, NextResponse } from 'next/server'
import { projectDb, agentDb } from '@/lib/database'
import { projectCreationSchema } from '@/lib/validationSchemas'
import { z } from 'zod'

// Function to create default agents based on project template
async function createDefaultAgents(projectId: string, template: string) {
  try {
    if (template === 'simple') {
      // Create one general-purpose agent for simple projects
      agentDb.create({
        projectId,
        name: 'Primary Assistant',
        description: 'Main conversational agent handling all user interactions. This agent ID will be used by the runtime system to send metrics and track performance.',
        type: 'general',
        role: 'Primary Assistant',
        capabilities: [
          'Natural Language Processing',
          'Question Answering',
          'Task Completion',
          'General Conversation'
        ],
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'You are a helpful AI assistant. Provide accurate, helpful, and friendly responses to user queries.',
        status: 'active',
        isActive: true,
        version: '1.0.0',
        config: {
          timeout: 30000,
          retries: 2,
          rateLimitPerMinute: 60,
          priority: 5
        },
        tags: ['default', 'primary'],
        createdBy: 'system'
      })
    } else if (template === 'autonomous') {
      // Create three specialized agents for autonomous projects
      
      // 1. Task Coordinator (Orchestrator)
      agentDb.create({
        projectId,
        name: 'Task Coordinator',
        description: 'Orchestrates and coordinates tasks between different specialized agents. Runtime system uses this agent ID to route coordination requests and track workflow metrics.',
        type: 'orchestrator',
        role: 'Task Coordinator',
        capabilities: [
          'Task Management',
          'Workflow Orchestration',
          'Agent Coordination',
          'Priority Management'
        ],
        model: 'gpt-4',
        temperature: 0.5,
        maxTokens: 1500,
        systemPrompt: 'You are a task coordinator responsible for managing and orchestrating workflows between specialized agents. Focus on efficiency and proper task delegation.',
        status: 'active',
        isActive: true,
        version: '1.0.0',
        config: {
          timeout: 25000,
          retries: 3,
          rateLimitPerMinute: 80,
          priority: 8
        },
        tags: ['default', 'orchestrator'],
        createdBy: 'system'
      })

      // 2. Data Analyzer (Specialist)
      agentDb.create({
        projectId,
        name: 'Data Analyzer',
        description: 'Specialized agent for data analysis and insights generation. Runtime system sends analytical tasks to this agent ID and collects performance metrics.',
        type: 'specialist',
        role: 'Data Analyzer',
        capabilities: [
          'Data Analysis',
          'Statistical Computing',
          'Report Generation',
          'Pattern Recognition',
          'Insight Extraction'
        ],
        model: 'gpt-4',
        temperature: 0.3,
        maxTokens: 3000,
        systemPrompt: 'You are a data analysis specialist. Focus on accurate analysis, clear insights, and comprehensive reporting. Always provide data-driven recommendations.',
        status: 'active',
        isActive: true,
        version: '1.0.0',
        config: {
          timeout: 45000,
          retries: 2,
          rateLimitPerMinute: 40,
          priority: 7
        },
        tags: ['default', 'specialist', 'analytics'],
        createdBy: 'system'
      })

      // 3. Response Generator (Specialist)
      agentDb.create({
        projectId,
        name: 'Response Generator',
        description: 'Specialized in generating responses and user communication. Runtime system routes final response generation to this agent ID and tracks response quality metrics.',
        type: 'specialist',
        role: 'Response Generator',
        capabilities: [
          'Content Generation',
          'Response Crafting',
          'Communication',
          'Language Processing',
          'User Interface'
        ],
        model: 'gpt-3.5-turbo',
        temperature: 0.8,
        maxTokens: 2500,
        systemPrompt: 'You are a response generation specialist. Create clear, engaging, and helpful responses. Focus on user experience and communication quality.',
        status: 'active',
        isActive: true,
        version: '1.0.0',
        config: {
          timeout: 20000,
          retries: 2,
          rateLimitPerMinute: 100,
          priority: 6
        },
        tags: ['default', 'specialist', 'communication'],
        createdBy: 'system'
      })
    }
    // For 'blank' template, don't create any agents
  } catch (error) {
    console.error('Failed to create default agents:', error)
    // Don't fail the project creation if agent creation fails
  }
}

// GET /api/v1/projects - Get all projects
export async function GET() {
  try {
    const projects = projectDb.getAll()
    return NextResponse.json({
      success: true,
      data: projects
    })
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch projects'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/projects - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle both full UI requests and simple API requests
    let validatedData
    try {
      validatedData = projectCreationSchema.parse(body)
    } catch (error) {
      // Handle simple project creation from Python clients
      validatedData = {
        name: body.name || 'SimpleAgent Project',
        code: body.code || body.id || `project_${Date.now()}`,
        description: body.description || 'Created via API',
        department: body.department || 'default',
        priority: body.priority || 'medium',
        tags: body.tags || [],
        template: body.template || 'simple',
        securityLevel: body.security_level || body.securityLevel || 'standard',
        dataRetention: body.data_retention || body.dataRetention || '90',
        defaultAccess: body.default_access || body.defaultAccess || 'collaborate',
        piiHandling: body.pii_handling || body.piiHandling || false,
        complianceMode: body.compliance_mode || body.complianceMode || false,
        teamMembers: body.team_members || body.teamMembers || [],
        visibility: body.visibility || 'private'
      }
    }
    
    // Map template to icon and color
    const templateConfig = {
      blank: { icon: 'square', color: 'muted' },
      simple: { icon: 'trending-up', color: 'primary' },
      autonomous: { icon: 'bar-chart-3', color: 'secondary' }
    }
    
    const config = templateConfig[validatedData.template as keyof typeof templateConfig] || templateConfig.simple
    
    // Create project data
    const projectData = {
      ...validatedData,
      icon: config.icon,
      color: config.color,
      agents: 0,
      conversations: 0,
      successRate: 0,
      status: 'active' as const
    }
    
    // Create project
    const project = projectDb.create(projectData)
    
    // Create default agents based on template
    await createDefaultAgents(project.id, validatedData.template)
    
    // Get updated project with agent count
    const updatedProject = projectDb.getById(project.id)
    
    return NextResponse.json({
      success: true,
      data: updatedProject
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    console.error('Failed to create project:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create project'
      },
      { status: 500 }
    )
  }
}