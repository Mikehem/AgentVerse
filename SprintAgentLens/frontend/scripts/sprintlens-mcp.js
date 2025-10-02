#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import fetch from 'node-fetch'

// Command line argument parsing
const args = process.argv.slice(2)
let apiKey = null
let apiBaseUrl = 'http://localhost:3000/api'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--apiKey' && i + 1 < args.length) {
    apiKey = args[i + 1]
    i++
  } else if (args[i] === '--apiBaseUrl' && i + 1 < args.length) {
    apiBaseUrl = args[i + 1]
    i++
  }
}

console.error('🚀 Starting SprintLens MCP Server...')
console.error(`📡 API Base URL: ${apiBaseUrl}`)
if (apiKey) {
  console.error('🔑 API Key provided')
}

// Initialize MCP Server
const server = new Server(
  {
    name: 'sprintlens-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
)

// Helper function to make API calls
async function apiCall(endpoint, options = {}) {
  const url = `${apiBaseUrl}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Tools for interacting with SprintLens
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_recent_traces',
        description: 'Retrieve recent traces from SprintLens to analyze LLM performance',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID to filter traces (optional)',
            },
            limit: {
              type: 'number',
              description: 'Number of traces to retrieve (default: 10, max: 100)',
              default: 10,
              maximum: 100,
            },
          },
        },
      },
      {
        name: 'get_project_metrics',
        description: 'Get comprehensive metrics and analytics for a project',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID to get metrics for',
            },
            timeRange: {
              type: 'string',
              description: 'Time range for metrics',
              enum: ['1h', '24h', '7d', '30d'],
              default: '24h',
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'analyze_trace_performance',
        description: 'Analyze trace performance and provide actionable optimization insights',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID to analyze',
            },
            traceCount: {
              type: 'number',
              description: 'Number of recent traces to analyze',
              default: 20,
              maximum: 100,
            },
          },
          required: ['projectId'],
        },
      },
      {
        name: 'get_conversations',
        description: 'Retrieve recent conversations to understand user interactions',
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
              maximum: 50,
            },
            status: {
              type: 'string',
              description: 'Filter by conversation status',
              enum: ['success', 'error', 'all'],
              default: 'all',
            },
          },
        },
      },
      {
        name: 'get_prompt_library',
        description: 'Access the SprintLens prompt library to view and manage prompts',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID to filter prompts (optional)',
            },
            search: {
              type: 'string',
              description: 'Search term to filter prompts (optional)',
            },
          },
        },
      },
      {
        name: 'save_prompt',
        description: 'Save a new prompt to the SprintLens prompt library',
        inputSchema: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID to save the prompt to',
            },
            name: {
              type: 'string',
              description: 'Name of the prompt',
            },
            description: {
              type: 'string',
              description: 'Description of the prompt',
            },
            template: {
              type: 'string',
              description: 'The prompt template content',
            },
            variables: {
              type: 'array',
              description: 'List of variables used in the template',
              items: { type: 'string' },
            },
          },
          required: ['projectId', 'name', 'template'],
        },
      },
    ],
  }
})

// Prompts for common analysis tasks
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'analyze_traces',
        description: 'Analyze recent traces and provide performance insights',
        arguments: [
          {
            name: 'projectId',
            description: 'Project ID to analyze',
            required: true,
          },
          {
            name: 'traceCount',
            description: 'Number of traces to analyze (default: 20)',
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
      {
        name: 'cost_optimization',
        description: 'Analyze costs and suggest optimizations',
        arguments: [
          {
            name: 'projectId',
            description: 'Project ID to analyze',
            required: true,
          },
          {
            name: 'timeRange',
            description: 'Time range for analysis (default: 7d)',
            required: false,
          },
        ],
      },
    ],
  }
})

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  if (name === 'analyze_traces') {
    const projectId = args?.projectId
    const traceCount = args?.traceCount || 20

    return {
      description: 'Analyze recent traces and provide actionable insights',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Please analyze the last ${traceCount} traces for project ${projectId} using the get_recent_traces and analyze_trace_performance tools. Focus on:

1. **Performance Analysis:**
   - Average response times and latency patterns
   - Identification of slow operations
   - Bottlenecks in the LLM pipeline

2. **Error Analysis:**
   - Error rates and common failure patterns
   - Root cause analysis of failures
   - Reliability trends

3. **Cost Analysis:**
   - Token usage patterns and costs
   - Cost per operation trends
   - Opportunities for cost optimization

4. **Quality Metrics:**
   - Success rates and satisfaction indicators
   - Output quality patterns
   - User interaction effectiveness

Provide specific, actionable recommendations for optimization based on the data.`,
          },
        },
      ],
    }
  }

  if (name === 'improve_prompt') {
    const promptId = args?.promptId
    const projectId = args?.projectId

    return {
      description: 'Suggest prompt improvements based on performance data',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze the performance of prompt ${promptId} in project ${projectId} and suggest improvements. Use the available tools to:

1. **Gather Performance Data:**
   - Get recent traces for this prompt
   - Analyze response times and quality
   - Review cost and token usage

2. **Identify Issues:**
   - Response time problems
   - Quality or accuracy issues
   - High token usage or costs
   - Error patterns

3. **Provide Improvements:**
   - Specific prompt modifications
   - Alternative phrasings for better results
   - Optimization for speed and cost
   - Structure improvements for clarity

Give concrete, implementable suggestions with before/after examples where possible.`,
          },
        },
      ],
    }
  }

  if (name === 'cost_optimization') {
    const projectId = args?.projectId
    const timeRange = args?.timeRange || '7d'

    return {
      description: 'Analyze costs and provide optimization strategies',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Perform a comprehensive cost analysis for project ${projectId} over the last ${timeRange}. Use the available tools to:

1. **Cost Breakdown:**
   - Total costs and trends
   - Cost per operation/conversation
   - High-cost operations identification
   - Token usage patterns

2. **Optimization Opportunities:**
   - Model selection optimizations
   - Prompt efficiency improvements
   - Caching opportunities
   - Batch processing options

3. **Recommendations:**
   - Specific cost reduction strategies
   - Alternative models or configurations
   - Architectural improvements
   - Monitoring and alerting suggestions

Provide quantified recommendations with expected cost savings.`,
          },
        },
      ],
    }
  }

  throw new Error(`Unknown prompt: ${name}`)
})

// Tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'get_recent_traces') {
      const projectId = args?.projectId
      const limit = Math.min(args?.limit || 10, 100)

      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(projectId && { projectId }),
      })

      const data = await apiCall(`/v1/traces?${queryParams}`)
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch traces')
      }

      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${data.data?.length || 0} traces:\n\n${JSON.stringify(data.data, null, 2)}`,
          },
        ],
      }
    }

    if (name === 'get_project_metrics') {
      const { projectId, timeRange = '24h' } = args

      const data = await apiCall(`/v1/metrics?projectId=${projectId}&timeRange=${timeRange}`)

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch metrics')
      }

      return {
        content: [
          {
            type: 'text',
            text: `Project metrics for ${projectId} (${timeRange}):\n\n${JSON.stringify(data.data, null, 2)}`,
          },
        ],
      }
    }

    if (name === 'analyze_trace_performance') {
      const { projectId, traceCount = 20 } = args
      const limit = Math.min(traceCount, 100)

      // Fetch recent traces
      const tracesData = await apiCall(`/v1/traces?projectId=${projectId}&limit=${limit}`)
      
      if (!tracesData.success) {
        throw new Error('Failed to fetch traces for analysis')
      }

      // Fetch project metrics
      const metricsData = await apiCall(`/v1/metrics?projectId=${projectId}&timeRange=24h`)

      // Perform detailed analysis
      const traces = tracesData.data || []
      const metrics = metricsData.data || {}

      if (traces.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `No traces found for project ${projectId}. The project may be inactive or have no recent activity.`,
            },
          ],
        }
      }

      const analysis = {
        summary: {
          totalTraces: traces.length,
          timeRange: '24h',
          projectId,
        },
        performance: {
          averageLatency: Math.round(traces.reduce((sum, trace) => sum + (trace.latency || 0), 0) / traces.length),
          medianLatency: traces.map(t => t.latency || 0).sort()[Math.floor(traces.length / 2)],
          p95Latency: traces.map(t => t.latency || 0).sort()[Math.floor(traces.length * 0.95)],
          slowestTrace: Math.max(...traces.map(t => t.latency || 0)),
        },
        reliability: {
          successRate: Math.round((traces.filter(t => t.status === 'success').length / traces.length) * 100),
          errorRate: Math.round((traces.filter(t => t.status === 'error').length / traces.length) * 100),
          commonErrors: traces
            .filter(t => t.status === 'error')
            .map(t => t.error)
            .filter(Boolean)
            .slice(0, 5),
        },
        costs: {
          totalCost: traces.reduce((sum, trace) => sum + (trace.cost || 0), 0).toFixed(4),
          averageCostPerTrace: (traces.reduce((sum, trace) => sum + (trace.cost || 0), 0) / traces.length).toFixed(6),
          totalTokens: traces.reduce((sum, trace) => sum + (trace.total_tokens || 0), 0),
          averageTokensPerTrace: Math.round(traces.reduce((sum, trace) => sum + (trace.total_tokens || 0), 0) / traces.length),
        },
        insights: {
          slowTraces: traces.filter(t => (t.latency || 0) > 5000).length,
          highCostTraces: traces.filter(t => (t.cost || 0) > 0.1).length,
          recentErrorSpike: traces.slice(0, 5).filter(t => t.status === 'error').length > 2,
        },
        recommendations: [],
      }

      // Generate recommendations
      if (analysis.performance.averageLatency > 3000) {
        analysis.recommendations.push('⚡ High latency detected. Consider optimizing prompts or using faster models.')
      }
      if (analysis.reliability.errorRate > 10) {
        analysis.recommendations.push('❌ High error rate. Investigate common failure patterns and add error handling.')
      }
      if (analysis.costs.totalCost > 10) {
        analysis.recommendations.push('💰 High costs detected. Consider using more cost-effective models or optimizing token usage.')
      }
      if (analysis.insights.slowTraces > traces.length * 0.2) {
        analysis.recommendations.push('🐌 Many slow traces. Review prompt complexity and model selection.')
      }
      if (analysis.insights.recentErrorSpike) {
        analysis.recommendations.push('🚨 Recent error spike detected. Check for system issues or prompt problems.')
      }

      return {
        content: [
          {
            type: 'text',
            text: `# SprintLens Trace Performance Analysis

## Summary
- **Project**: ${projectId}
- **Traces Analyzed**: ${analysis.summary.totalTraces}
- **Time Range**: ${analysis.summary.timeRange}

## Performance Metrics
- **Average Latency**: ${analysis.performance.averageLatency}ms
- **Median Latency**: ${analysis.performance.medianLatency}ms
- **95th Percentile**: ${analysis.performance.p95Latency}ms
- **Slowest Trace**: ${analysis.performance.slowestTrace}ms

## Reliability
- **Success Rate**: ${analysis.reliability.successRate}%
- **Error Rate**: ${analysis.reliability.errorRate}%
- **Common Errors**: ${analysis.reliability.commonErrors.length > 0 ? analysis.reliability.commonErrors.join(', ') : 'None'}

## Cost Analysis
- **Total Cost**: $${analysis.costs.totalCost}
- **Average Cost/Trace**: $${analysis.costs.averageCostPerTrace}
- **Total Tokens**: ${analysis.costs.totalTokens.toLocaleString()}
- **Average Tokens/Trace**: ${analysis.costs.averageTokensPerTrace}

## Key Insights
- **Slow Traces (>5s)**: ${analysis.insights.slowTraces}
- **High Cost Traces (>$0.10)**: ${analysis.insights.highCostTraces}
- **Recent Error Spike**: ${analysis.insights.recentErrorSpike ? 'Yes' : 'No'}

## Recommendations
${analysis.recommendations.length > 0 ? analysis.recommendations.join('\n') : '✅ Performance looks good! No immediate optimizations needed.'}

---
*Analysis generated by SprintLens MCP Server*`,
          },
        ],
      }
    }

    if (name === 'get_conversations') {
      const projectId = args?.projectId
      const limit = Math.min(args?.limit || 10, 50)
      const status = args?.status || 'all'

      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        ...(projectId && { projectId }),
        ...(status !== 'all' && { status }),
      })

      const data = await apiCall(`/v1/conversations?${queryParams}`)

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch conversations')
      }

      return {
        content: [
          {
            type: 'text',
            text: `Retrieved ${data.data?.length || 0} conversations:\n\n${JSON.stringify(data.data, null, 2)}`,
          },
        ],
      }
    }

    if (name === 'get_prompt_library') {
      const projectId = args?.projectId
      const search = args?.search

      const queryParams = new URLSearchParams({
        ...(projectId && { projectId }),
        ...(search && { search }),
      })

      const data = await apiCall(`/v1/prompts?${queryParams}`)

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch prompts')
      }

      return {
        content: [
          {
            type: 'text',
            text: `SprintLens Prompt Library (${data.data?.length || 0} prompts):\n\n${JSON.stringify(data.data, null, 2)}`,
          },
        ],
      }
    }

    if (name === 'save_prompt') {
      const { projectId, name, description, template, variables = [] } = args

      const data = await apiCall('/v1/prompts', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          name,
          description,
          template,
          variables,
        }),
      })

      if (!data.success) {
        throw new Error(data.error || 'Failed to save prompt')
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ Prompt "${name}" saved successfully to project ${projectId}!\n\nPrompt ID: ${data.data?.id}\n\nDetails:\n${JSON.stringify(data.data, null, 2)}`,
          },
        ],
      }
    }

    throw new Error(`Unknown tool: ${name}`)
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error executing ${name}: ${error.message}`,
        },
      ],
      isError: true,
    }
  }
})

// Resources (for accessing SprintLens data)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'sprintlens://projects',
        name: 'Projects',
        description: 'List all projects in SprintLens',
        mimeType: 'application/json',
      },
      {
        uri: 'sprintlens://prompts',
        name: 'Prompt Library',
        description: 'Access the SprintLens prompt library',
        mimeType: 'application/json',
      },
      {
        uri: 'sprintlens://metrics/summary',
        name: 'Metrics Summary',
        description: 'Overall platform metrics and analytics',
        mimeType: 'application/json',
      },
    ],
  }
})

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params

  if (uri === 'sprintlens://projects') {
    const data = await apiCall('/v1/projects')
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data.data || [], null, 2),
        },
      ],
    }
  }

  if (uri === 'sprintlens://prompts') {
    const data = await apiCall('/v1/prompts')
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data.data || [], null, 2),
        },
      ],
    }
  }

  if (uri === 'sprintlens://metrics/summary') {
    const data = await apiCall('/v1/metrics/summary')
    
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(data.data || {}, null, 2),
        },
      ],
    }
  }

  throw new Error(`Unknown resource: ${uri}`)
})

// Start the server
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('✅ SprintLens MCP Server started successfully!')
}

main().catch((error) => {
  console.error('❌ Failed to start MCP server:', error)
  process.exit(1)
})