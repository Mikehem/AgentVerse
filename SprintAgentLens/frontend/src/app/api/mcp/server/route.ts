import { NextRequest, NextResponse } from 'next/server'

interface MCPRequest {
  jsonrpc: string
  id: number | string
  method: string
  params?: any
}

interface MCPResponse {
  jsonrpc: string
  id: number | string
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

// Mock data for testing
const getMockTraces = (projectId?: string, limit = 10) => [
  {
    id: 'trace_1',
    project_id: projectId || 'default',
    agent_id: 'agent_customer_support',
    status: 'success',
    latency: 1250,
    cost: 0.0045,
    total_tokens: 280,
    created_at: new Date().toISOString(),
  },
  {
    id: 'trace_2', 
    project_id: projectId || 'default',
    agent_id: 'agent_research',
    status: 'error',
    latency: 3200,
    cost: 0.0012,
    total_tokens: 150,
    error: 'API timeout',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  }
]

const getMockMetrics = (projectId: string) => ({
  totalCost: 0.1245,
  totalTokens: 12450,
  successRate: 89.5,
  averageLatency: 1850,
  conversationCount: 145,
})

const getMockConversations = (projectId?: string, limit = 10) => [
  {
    id: 'conv_1',
    project_id: projectId || 'default',
    agent_name: 'Customer Support Agent',
    status: 'success',
    message_count: 4,
    total_cost: 0.0034,
    created_at: new Date().toISOString(),
  }
]

// HTTP API handler for MCP requests
export async function POST(request: NextRequest) {
  try {
    const mcpRequest: MCPRequest = await request.json()

    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: mcpRequest.id,
    }

    // Route to appropriate handler based on method
    try {
      let result

      switch (mcpRequest.method) {
        case 'tools/list':
          result = {
            tools: [
              {
                name: 'get_recent_traces',
                description: 'Retrieve recent traces from SprintLens',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: {
                      type: 'string',
                      description: 'Project ID to filter traces (optional)',
                    },
                    limit: {
                      type: 'number',
                      description: 'Number of traces to retrieve (default: 10)',
                      default: 10,
                    },
                  },
                },
              },
              {
                name: 'get_project_metrics',
                description: 'Get metrics and analytics for a project',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: {
                      type: 'string',
                      description: 'Project ID',
                    },
                    timeRange: {
                      type: 'string',
                      description: 'Time range for metrics (24h, 7d, 30d)',
                      default: '24h',
                    },
                  },
                  required: ['projectId'],
                },
              },
              {
                name: 'analyze_trace_performance',
                description: 'Analyze trace performance and suggest improvements',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: {
                      type: 'string',
                      description: 'Project ID',
                    },
                    traceCount: {
                      type: 'number',
                      description: 'Number of recent traces to analyze',
                      default: 10,
                    },
                  },
                  required: ['projectId'],
                },
              },
              {
                name: 'get_conversations',
                description: 'Retrieve recent conversations from SprintLens',
                inputSchema: {
                  type: 'object',
                  properties: {
                    projectId: {
                      type: 'string',
                      description: 'Project ID to filter conversations',
                    },
                    limit: {
                      type: 'number',
                      description: 'Number of conversations to retrieve',
                      default: 10,
                    },
                  },
                },
              },
            ],
          }
          break

        case 'tools/call':
          const { name, arguments: args } = mcpRequest.params
          
          if (name === 'get_recent_traces') {
            const traces = getMockTraces(args?.projectId, args?.limit)
            result = {
              content: [
                {
                  type: 'text',
                  text: `Retrieved ${traces.length} recent traces:\n\n${JSON.stringify(traces, null, 2)}`,
                },
              ],
            }
          } else if (name === 'get_project_metrics') {
            const metrics = getMockMetrics(args.projectId)
            result = {
              content: [
                {
                  type: 'text',
                  text: `Project metrics for ${args.projectId}:\n\n${JSON.stringify(metrics, null, 2)}`,
                },
              ],
            }
          } else if (name === 'analyze_trace_performance') {
            const traces = getMockTraces(args.projectId, args?.traceCount || 10)
            const analysis = {
              summary: `Analysis of ${traces.length} traces for project ${args.projectId}`,
              averageLatency: traces.reduce((sum, t) => sum + t.latency, 0) / traces.length,
              successRate: (traces.filter(t => t.status === 'success').length / traces.length) * 100,
              totalCost: traces.reduce((sum, t) => sum + t.cost, 0),
              recommendations: [
                'Consider optimizing slow operations to reduce latency',
                'Implement retry logic for failed requests',
                'Monitor token usage to control costs'
              ]
            }
            result = {
              content: [
                {
                  type: 'text',
                  text: `# Trace Performance Analysis\n\n${JSON.stringify(analysis, null, 2)}`,
                },
              ],
            }
          } else if (name === 'get_conversations') {
            const conversations = getMockConversations(args?.projectId, args?.limit)
            result = {
              content: [
                {
                  type: 'text',
                  text: `Retrieved ${conversations.length} conversations:\n\n${JSON.stringify(conversations, null, 2)}`,
                },
              ],
            }
          } else {
            throw new Error(`Unknown tool: ${name}`)
          }
          break

        case 'prompts/list':
          result = {
            prompts: [
              {
                name: 'analyze_traces',
                description: 'Analyze recent traces and provide insights',
                arguments: [
                  {
                    name: 'projectId',
                    description: 'Project ID to analyze',
                    required: true,
                  },
                  {
                    name: 'traceCount',
                    description: 'Number of traces to analyze',
                    required: false,
                  },
                ],
              },
              {
                name: 'improve_prompt',
                description: 'Suggest improvements for a prompt based on trace data',
                arguments: [
                  {
                    name: 'promptId',
                    description: 'Prompt ID to improve',
                    required: true,
                  },
                  {
                    name: 'projectId',
                    description: 'Project ID',
                    required: true,
                  },
                ],
              },
            ],
          }
          break

        case 'prompts/get':
          const { name: promptName, arguments: promptArgs } = mcpRequest.params

          if (promptName === 'analyze_traces') {
            const projectId = promptArgs?.projectId
            const traceCount = promptArgs?.traceCount || 10

            result = {
              description: 'Analyze recent traces and provide insights',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Analyze the last ${traceCount} traces for project ${projectId}. Look for patterns in:
1. Response times and latency
2. Error rates and failure patterns  
3. Cost and token usage trends
4. User satisfaction indicators
5. Performance bottlenecks

Provide actionable insights and recommendations for optimization.`,
                  },
                },
              ],
            }
          } else if (promptName === 'improve_prompt') {
            result = {
              description: 'Suggest improvements for a prompt based on trace data',
              messages: [
                {
                  role: 'user',
                  content: {
                    type: 'text',
                    text: `Analyze the performance of prompt ${promptArgs?.promptId} in project ${promptArgs?.projectId}. Based on recent trace data, suggest specific improvements to reduce response time, improve output quality, decrease token usage and costs, and enhance user satisfaction.`,
                  },
                },
              ],
            }
          } else {
            throw new Error(`Unknown prompt: ${promptName}`)
          }
          break

        case 'resources/list':
          result = {
            resources: [
              {
                uri: 'sprintlens://projects',
                name: 'Projects',
                description: 'List all projects in SprintLens',
                mimeType: 'application/json',
              },
              {
                uri: 'sprintlens://prompts',
                name: 'Prompts',
                description: 'List all prompts in SprintLens',
                mimeType: 'application/json',
              },
            ],
          }
          break

        case 'resources/read':
          const { uri } = mcpRequest.params

          if (uri === 'sprintlens://projects') {
            result = {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify([
                    { id: 'project-1', name: 'Customer Support', status: 'active' },
                    { id: 'project-2', name: 'Research Assistant', status: 'active' }
                  ], null, 2),
                },
              ],
            }
          } else if (uri === 'sprintlens://prompts') {
            result = {
              contents: [
                {
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify([
                    { id: 'prompt-1', name: 'Customer Support Template', type: 'conversation' },
                    { id: 'prompt-2', name: 'Research Query', type: 'single-shot' }
                  ], null, 2),
                },
              ],
            }
          } else {
            throw new Error(`Unknown resource: ${uri}`)
          }
          break

        default:
          throw new Error(`Unknown method: ${mcpRequest.method}`)
      }

      response.result = result
    } catch (error: any) {
      response.error = {
        code: -32603,
        message: error.message || 'Internal error',
      }
    }

    return NextResponse.json(response)
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error',
        },
      },
      { status: 400 }
    )
  }
}

// GET handler for server info
export async function GET() {
  return NextResponse.json({
    name: 'sprintlens-mcp-server',
    version: '1.0.0',
    description: 'SprintLens MCP Server for IDE integration',
    capabilities: {
      tools: true,
      prompts: true,
      resources: true,
    },
    endpoints: {
      tools: [
        'get_recent_traces',
        'get_project_metrics', 
        'analyze_trace_performance',
        'get_conversations',
      ],
      prompts: [
        'analyze_traces',
        'improve_prompt',
      ],
      resources: [
        'sprintlens://projects',
        'sprintlens://prompts',
      ],
    },
    examples: {
      cursor_setup: `In Cursor IDE:
1. Go to Settings → Features → Add new MCP server
2. Use command: npx -y sprintlens-mcp --apiBaseUrl http://localhost:3000/api/mcp/server
3. Save and restart Cursor
4. Ask AI: "What are the recent traces in SprintLens?"`,
      
      sample_queries: [
        "What prompts are available in the SprintLens prompt library?",
        "Show me the most recent traces and their performance metrics",
        "Analyze the last 20 traces and suggest optimizations",
        "What are the cost trends for this project?",
        "Based on recent errors, what improvements can be made?"
      ]
    }
  })
}