import { MCPServerDefinition, AuthConfig, MCPProtocol, ServerCapabilities } from '../types/mcp'
import { JSONSchema7 } from 'json-schema'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import axios from 'axios'
import WebSocket from 'ws'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ConnectivityTestResult {
  success: boolean
  error?: string
  responseTime?: number
}

export class MCPValidationService {
  private ajv: Ajv

  constructor() {
    this.ajv = new Ajv({ allErrors: true })
    addFormats(this.ajv)
  }

  async validateServerDefinition(
    serverData: Omit<MCPServerDefinition, 'id' | 'created' | 'updated' | 'status' | 'health' | 'stats'>
  ): Promise<ValidationResult> {
    const errors: string[] = []

    // Validate basic fields
    if (!serverData.name || serverData.name.trim().length === 0) {
      errors.push('Server name is required')
    }

    if (!serverData.description || serverData.description.trim().length === 0) {
      errors.push('Server description is required')
    }

    if (!serverData.endpoint) {
      errors.push('Server endpoint is required')
    } else {
      try {
        new URL(serverData.endpoint)
      } catch {
        errors.push('Server endpoint must be a valid URL')
      }
    }

    // Validate version format
    if (serverData.version && !this.isValidSemVer(serverData.version)) {
      errors.push('Version must follow semantic versioning (e.g., 1.0.0)')
    }

    // Validate protocol
    const validProtocols: MCPProtocol[] = ['stdio', 'sse', 'websocket', 'http']
    if (!validProtocols.includes(serverData.protocol)) {
      errors.push(`Protocol must be one of: ${validProtocols.join(', ')}`)
    }

    // Validate authentication
    const authValidation = this.validateAuthentication(serverData.authentication)
    if (!authValidation.valid) {
      errors.push(...authValidation.errors)
    }

    // Validate capabilities
    const capabilitiesValidation = this.validateCapabilities(serverData.capabilities)
    if (!capabilitiesValidation.valid) {
      errors.push(...capabilitiesValidation.errors)
    }

    // Validate URLs if provided
    if (serverData.documentation && !this.isValidUrl(serverData.documentation)) {
      errors.push('Documentation URL is not valid')
    }

    if (serverData.repository && !this.isValidUrl(serverData.repository)) {
      errors.push('Repository URL is not valid')
    }

    if (serverData.icon && !this.isValidUrl(serverData.icon)) {
      errors.push('Icon URL is not valid')
    }

    if (serverData.screenshots) {
      for (let i = 0; i < serverData.screenshots.length; i++) {
        if (!this.isValidUrl(serverData.screenshots[i])) {
          errors.push(`Screenshot URL ${i + 1} is not valid`)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private validateAuthentication(auth: AuthConfig): ValidationResult {
    const errors: string[] = []

    if (!auth || !auth.type) {
      errors.push('Authentication type is required')
      return { valid: false, errors }
    }

    switch (auth.type) {
      case 'apikey':
        if (!auth.config || (!auth.config.header && !auth.config.query)) {
          errors.push('API key authentication requires header or query parameter configuration')
        }
        break
      case 'oauth2':
        if (!auth.config || !auth.config.authorizationUrl || !auth.config.tokenUrl) {
          errors.push('OAuth2 authentication requires authorizationUrl and tokenUrl')
        }
        break
      case 'basic':
        // Basic auth doesn't require additional config
        break
      case 'certificate':
        if (!auth.config || !auth.config.certPath) {
          errors.push('Certificate authentication requires certificate path')
        }
        break
      case 'jwt':
        if (!auth.config || !auth.config.secret) {
          errors.push('JWT authentication requires secret configuration')
        }
        break
      case 'none':
        // No additional validation needed
        break
      default:
        errors.push(`Unsupported authentication type: ${auth.type}`)
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  private validateCapabilities(capabilities: ServerCapabilities): ValidationResult {
    const errors: string[] = []

    if (!capabilities) {
      errors.push('Server capabilities are required')
      return { valid: false, errors }
    }

    // Validate tools
    if (capabilities.tools) {
      for (let i = 0; i < capabilities.tools.length; i++) {
        const tool = capabilities.tools[i]
        if (!tool.name) {
          errors.push(`Tool ${i + 1}: name is required`)
        }
        if (!tool.description) {
          errors.push(`Tool ${i + 1}: description is required`)
        }
        if (!tool.inputSchema) {
          errors.push(`Tool ${i + 1}: inputSchema is required`)
        } else {
          try {
            this.ajv.compile(tool.inputSchema)
          } catch (error) {
            errors.push(`Tool ${i + 1}: invalid inputSchema - ${error}`)
          }
        }
        if (tool.outputSchema) {
          try {
            this.ajv.compile(tool.outputSchema)
          } catch (error) {
            errors.push(`Tool ${i + 1}: invalid outputSchema - ${error}`)
          }
        }
      }
    }

    // Validate resources
    if (capabilities.resources) {
      for (let i = 0; i < capabilities.resources.length; i++) {
        const resource = capabilities.resources[i]
        if (!resource.uri) {
          errors.push(`Resource ${i + 1}: uri is required`)
        }
        if (!resource.name) {
          errors.push(`Resource ${i + 1}: name is required`)
        }
        if (!resource.description) {
          errors.push(`Resource ${i + 1}: description is required`)
        }
        if (!resource.mimeType) {
          errors.push(`Resource ${i + 1}: mimeType is required`)
        }
      }
    }

    // Validate prompts
    if (capabilities.prompts) {
      for (let i = 0; i < capabilities.prompts.length; i++) {
        const prompt = capabilities.prompts[i]
        if (!prompt.name) {
          errors.push(`Prompt ${i + 1}: name is required`)
        }
        if (!prompt.description) {
          errors.push(`Prompt ${i + 1}: description is required`)
        }
      }
    }

    // Ensure at least one capability is provided
    const hasCapabilities = 
      (capabilities.tools && capabilities.tools.length > 0) ||
      (capabilities.resources && capabilities.resources.length > 0) ||
      (capabilities.prompts && capabilities.prompts.length > 0)

    if (!hasCapabilities) {
      errors.push('Server must provide at least one tool, resource, or prompt')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  async testServerConnectivity(
    endpoint: string,
    protocol: MCPProtocol,
    auth: AuthConfig
  ): Promise<ConnectivityTestResult> {
    const startTime = Date.now()

    try {
      switch (protocol) {
        case 'http':
          return await this.testHttpConnectivity(endpoint, auth)
        case 'websocket':
          return await this.testWebSocketConnectivity(endpoint, auth)
        case 'sse':
          return await this.testSSEConnectivity(endpoint, auth)
        case 'stdio':
          // For stdio, we can't really test connectivity without spawning the process
          return {
            success: true,
            responseTime: Date.now() - startTime
          }
        default:
          return {
            success: false,
            error: `Unsupported protocol: ${protocol}`
          }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    }
  }

  private async testHttpConnectivity(endpoint: string, auth: AuthConfig): Promise<ConnectivityTestResult> {
    const startTime = Date.now()

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      // Add authentication headers
      if (auth.type === 'apikey' && auth.config?.header) {
        headers[auth.config.header] = 'test-key'
      } else if (auth.type === 'basic') {
        headers['Authorization'] = 'Basic dGVzdDp0ZXN0' // test:test in base64
      } else if (auth.type === 'jwt') {
        headers['Authorization'] = 'Bearer test-token'
      }

      // Send a basic MCP initialize request
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'AgentLens-Registry',
            version: '1.0.0'
          }
        }
      }, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 500 // Accept 4xx as valid connectivity
      })

      return {
        success: response.status < 500,
        responseTime: Date.now() - startTime,
        error: response.status >= 400 ? `HTTP ${response.status}` : undefined
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message,
          responseTime: Date.now() - startTime
        }
      }
      throw error
    }
  }

  private async testWebSocketConnectivity(endpoint: string, auth: AuthConfig): Promise<ConnectivityTestResult> {
    const startTime = Date.now()

    return new Promise((resolve) => {
      const wsUrl = endpoint.replace(/^http/, 'ws')
      const ws = new WebSocket(wsUrl)

      const timeout = setTimeout(() => {
        ws.close()
        resolve({
          success: false,
          error: 'Connection timeout',
          responseTime: Date.now() - startTime
        })
      }, 10000)

      ws.on('open', () => {
        clearTimeout(timeout)
        ws.close()
        resolve({
          success: true,
          responseTime: Date.now() - startTime
        })
      })

      ws.on('error', (error) => {
        clearTimeout(timeout)
        resolve({
          success: false,
          error: error.message,
          responseTime: Date.now() - startTime
        })
      })
    })
  }

  private async testSSEConnectivity(endpoint: string, auth: AuthConfig): Promise<ConnectivityTestResult> {
    const startTime = Date.now()

    try {
      const headers: Record<string, string> = {
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }

      // Add authentication headers
      if (auth.type === 'apikey' && auth.config?.header) {
        headers[auth.config.header] = 'test-key'
      }

      const response = await axios.get(endpoint, {
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 500
      })

      return {
        success: response.status < 400,
        responseTime: Date.now() - startTime,
        error: response.status >= 400 ? `HTTP ${response.status}` : undefined
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return {
          success: false,
          error: error.code === 'ECONNREFUSED' ? 'Connection refused' : error.message,
          responseTime: Date.now() - startTime
        }
      }
      throw error
    }
  }

  private isValidSemVer(version: string): boolean {
    const semVerRegex = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/
    return semVerRegex.test(version)
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
}