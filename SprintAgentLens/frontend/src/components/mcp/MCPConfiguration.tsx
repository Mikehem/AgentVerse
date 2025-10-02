'use client'

import { useState, useEffect } from 'react'
import { Settings, Terminal, Copy, Check, ExternalLink, Download, Play, AlertCircle, CheckCircle, Info } from 'lucide-react'

interface MCPConfigurationProps {
  project?: {
    id: string
    name: string
  }
}

export function MCPConfiguration({ project }: MCPConfigurationProps) {
  const [apiKey, setApiKey] = useState('')
  const [mcpServerUrl, setMcpServerUrl] = useState('http://localhost:3000/api/mcp/server')
  const [copied, setCopied] = useState('')
  const [mcpStatus, setMcpStatus] = useState<'disconnected' | 'connected' | 'testing'>('disconnected')

  const commands = {
    cursor: `npx -y sprintlens-mcp --apiBaseUrl ${mcpServerUrl}${apiKey ? ` --apiKey ${apiKey}` : ''}`,
    local: `cd scripts && npm install && npm start -- --apiBaseUrl ${mcpServerUrl}${apiKey ? ` --apiKey ${apiKey}` : ''}`,
    standalone: `npm install -g sprintlens-mcp && sprintlens-mcp --apiBaseUrl ${mcpServerUrl}${apiKey ? ` --apiKey ${apiKey}` : ''}`,
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(type)
      setTimeout(() => setCopied(''), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const testMCPConnection = async () => {
    setMcpStatus('testing')
    try {
      const response = await fetch('/api/mcp/server', {
        method: 'GET',
        headers: {
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
      })
      
      if (response.ok) {
        setMcpStatus('connected')
        setTimeout(() => setMcpStatus('disconnected'), 3000)
      } else {
        setMcpStatus('disconnected')
      }
    } catch (error) {
      console.error('MCP connection test failed:', error)
      setMcpStatus('disconnected')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Terminal className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-primary">MCP Integration</h2>
          <p className="text-sm text-muted">Connect SprintLens to your IDE with Model Context Protocol</p>
        </div>
      </div>

      {/* What is MCP */}
      <div className="card p-6 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">What is MCP?</h3>
            <p className="text-sm text-blue-800 mb-3">
              Model Context Protocol (MCP) allows your IDE to communicate with SprintLens, giving you AI-powered
              access to your prompts, traces, and analytics directly from your development environment.
            </p>
            <div className="text-sm text-blue-800">
              <strong>With MCP you can:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Query recent traces and performance data</li>
                <li>Analyze and optimize prompt performance</li>
                <li>Access your prompt library from the IDE</li>
                <li>Get AI-powered insights and recommendations</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="card p-6">
        <h3 className="font-semibold text-primary mb-4">Configuration</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-primary block mb-2">
              API Key (Optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key for authenticated access..."
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <p className="text-xs text-muted mt-1">
              Leave empty for local development without authentication
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-primary block mb-2">
              MCP Server URL
            </label>
            <input
              type="url"
              value={mcpServerUrl}
              onChange={(e) => setMcpServerUrl(e.target.value)}
              placeholder="http://localhost:3000/api/mcp/server"
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={testMCPConnection}
              disabled={mcpStatus === 'testing'}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
              {mcpStatus === 'testing' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Test Connection
                </>
              )}
            </button>
            
            {mcpStatus === 'connected' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Connection successful!</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IDE Setup Instructions */}
      <div className="space-y-4">
        <h3 className="font-semibold text-primary">IDE Setup Instructions</h3>

        {/* Cursor IDE */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <Terminal className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-primary">Cursor IDE</h4>
              <p className="text-sm text-muted">AI-powered code editor with built-in MCP support</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-primary">
              <strong>Step 1:</strong> Open Cursor Settings → Features → Add new MCP server
            </p>
            <p className="text-sm text-primary">
              <strong>Step 2:</strong> Use this command:
            </p>
            
            <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm relative">
              <code>{commands.cursor}</code>
              <button
                onClick={() => copyToClipboard(commands.cursor, 'cursor')}
                className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded"
                title="Copy command"
              >
                {copied === 'cursor' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-sm text-primary">
              <strong>Step 3:</strong> Save and restart Cursor. You can now ask AI questions about your SprintLens data!
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Try asking:</strong> "What were the outputs of the most recent traces?" or 
                "Based on recent traces, suggest improvements to my prompts"
              </p>
            </div>
          </div>
        </div>

        {/* Local Development */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Download className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-primary">Local Development</h4>
              <p className="text-sm text-muted">Run the MCP server locally for development</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-primary">
              <strong>Option 1:</strong> Run from SprintLens project:
            </p>
            
            <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm relative">
              <code>{commands.local}</code>
              <button
                onClick={() => copyToClipboard(commands.local, 'local')}
                className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded"
                title="Copy command"
              >
                {copied === 'local' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            <p className="text-sm text-primary">
              <strong>Option 2:</strong> Install globally:
            </p>
            
            <div className="bg-gray-900 text-gray-100 p-3 rounded-lg font-mono text-sm relative">
              <code>{commands.standalone}</code>
              <button
                onClick={() => copyToClipboard(commands.standalone, 'standalone')}
                className="absolute top-2 right-2 p-1 hover:bg-gray-700 rounded"
                title="Copy command"
              >
                {copied === 'standalone' ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Example Queries */}
      <div className="card p-6">
        <h4 className="font-semibold text-primary mb-4">Example AI Queries</h4>
        <div className="space-y-3">
          {[
            "What prompts are available in the SprintLens prompt library?",
            "Show me the most recent traces and their performance metrics",
            "Analyze the last 20 traces and suggest optimizations",
            "What are the cost trends for this project?",
            "Based on recent errors, what improvements can be made?",
            "Save this prompt to the SprintLens library",
          ].map((query, index) => (
            <div key={index} className="bg-gray-50 border border-border rounded-lg p-3">
              <p className="text-sm font-mono text-primary">"{query}"</p>
            </div>
          ))}
        </div>
      </div>

      {/* Links */}
      <div className="flex items-center gap-4 pt-4">
        <a
          href="https://docs.anthropic.com/claude/docs/mcp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm">Learn more about MCP</span>
        </a>
        <a
          href="/api/mcp/server"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span className="text-sm">View server info</span>
        </a>
      </div>
    </div>
  )
}