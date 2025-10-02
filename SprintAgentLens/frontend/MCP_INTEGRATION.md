# SprintLens MCP Integration

SprintLens provides a Model Context Protocol (MCP) server that allows AI-powered IDEs to access and analyze your agent traces, prompts, and project metrics directly from your development environment.

## What is MCP?

Model Context Protocol (MCP) is a standard that enables AI assistants to access external data sources and tools. With SprintLens MCP integration, you can:

- 🔍 Query recent traces and performance data
- 📊 Analyze agent performance and costs
- 📝 Access your prompt library
- 🔧 Get AI-powered optimization recommendations
- 📈 Monitor project metrics in real-time

## Quick Setup

### For Cursor IDE

1. Open Cursor IDE
2. Go to Settings → Features
3. Click "Add new MCP server"
4. Enter this command:
   ```bash
   npx -y sprintlens-mcp --apiBaseUrl http://localhost:3000/api/mcp/server
   ```
5. Save and restart Cursor
6. Start asking questions about your SprintLens data!

### For Other IDEs

Use the HTTP API endpoint directly:
```
POST http://localhost:3000/api/mcp/server
```

## Available Tools

### `get_recent_traces`
Retrieve recent traces from SprintLens.

**Parameters:**
- `projectId` (optional): Filter traces by project
- `limit` (optional): Number of traces to retrieve (default: 10)

**Example usage:**
> "Show me the latest 5 traces from project-123"

### `get_project_metrics`
Get comprehensive metrics and analytics for a project.

**Parameters:**
- `projectId` (required): Project ID to analyze
- `timeRange` (optional): Time range (24h, 7d, 30d)

**Example usage:**
> "What are the performance metrics for project-123 over the last 7 days?"

### `analyze_trace_performance`
Analyze trace performance and provide actionable insights.

**Parameters:**
- `projectId` (required): Project to analyze
- `traceCount` (optional): Number of traces to analyze (default: 10)

**Example usage:**
> "Analyze the performance of the last 20 traces in project-123 and suggest improvements"

### `get_conversations`
Retrieve recent conversations and their details.

**Parameters:**
- `projectId` (optional): Filter by project
- `limit` (optional): Number of conversations (default: 10)

**Example usage:**
> "Show me recent conversations that had errors"

## Example AI Queries

Once configured, you can ask your AI assistant questions like:

- **"What were the outputs of the most recent traces in SprintLens?"**
- **"Based on the last 10 traces, suggest improvements to reduce latency"**
- **"What are the cost trends for my customer support project?"**
- **"Analyze error patterns in recent conversations"**
- **"Show me the prompts available in the SprintLens library"**
- **"Which agents are performing poorly and why?"**

## Available Prompts

### `analyze_traces`
Pre-built prompt for comprehensive trace analysis.

**Arguments:**
- `projectId`: Project to analyze
- `traceCount`: Number of traces to analyze

### `improve_prompt`
Suggest improvements for existing prompts based on performance data.

**Arguments:**
- `promptId`: Prompt to analyze
- `projectId`: Project context

## Resources

### `sprintlens://projects`
Access list of all projects in SprintLens.

### `sprintlens://prompts`
Access the SprintLens prompt library.

## API Endpoints

The MCP server provides these endpoints:

- `GET /api/mcp/server` - Server information and capabilities
- `POST /api/mcp/server` - MCP JSON-RPC requests

## Testing the Integration

You can test the MCP server using curl:

```bash
# List available tools
curl -X POST http://localhost:3000/api/mcp/server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Get recent traces
curl -X POST http://localhost:3000/api/mcp/server \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "get_recent_traces",
      "arguments": {
        "projectId": "my-project",
        "limit": 5
      }
    }
  }'
```

## Local Development

To run the MCP server locally:

```bash
cd SprintAgentLens/frontend
npm run mcp -- --apiBaseUrl http://localhost:3000/api/mcp/server
```

## Advanced Usage

### Custom Queries
You can combine multiple tools in complex queries:

> "Get the recent traces from project-123, analyze their performance, and suggest specific prompt improvements based on the error patterns"

### Project Monitoring
Set up regular monitoring queries:

> "Create a daily summary of project performance including cost trends, error rates, and top-performing agents"

### Optimization Workflows
Use MCP for continuous improvement:

> "Based on this week's trace data, what changes should I make to reduce costs while maintaining quality?"

## Troubleshooting

### Connection Issues
- Ensure SprintLens is running on `http://localhost:3000`
- Check that the MCP server endpoint is accessible
- Verify IDE MCP configuration

### No Data Returned
- Confirm project IDs exist in SprintLens
- Check that traces/conversations have been recorded
- Verify time ranges for metrics queries

### IDE Integration Issues
- Restart your IDE after adding the MCP server
- Check IDE logs for MCP connection errors
- Ensure the npx command completed successfully

## Security

- The MCP server runs locally and only accesses your SprintLens instance
- No data is sent to external services
- API keys are optional and only needed for authenticated access

## Contributing

To extend the MCP integration:

1. Add new tools in `/src/app/api/mcp/server/route.ts`
2. Update the configuration UI in `/src/components/mcp/MCPConfiguration.tsx`
3. Test new functionality with curl or IDE integration
4. Update this documentation

## Support

For issues with MCP integration:

1. Check the browser console for errors
2. Test the endpoints directly with curl
3. Verify SprintLens is running and accessible
4. Review IDE-specific MCP setup documentation