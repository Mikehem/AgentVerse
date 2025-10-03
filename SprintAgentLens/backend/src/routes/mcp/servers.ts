import { FastifyInstance } from 'fastify'
import { MCPServerDefinition, ServerRegistration, ServerUpdate, HealthStatus } from '../../types/mcp'
import { MCPServerService } from '../../services/MCPServerService'
import { MCPValidationService } from '../../services/MCPValidationService'

const serverRegistrationSchema = {
  type: 'object',
  required: ['name', 'description', 'endpoint', 'protocol', 'capabilities'],
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 255 },
    description: { type: 'string', minLength: 1, maxLength: 1000 },
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    author: { type: 'string', maxLength: 255 },
    category: { 
      type: 'string', 
      enum: ['productivity', 'development', 'data', 'communication', 'automation', 'ai', 'business', 'custom'] 
    },
    tags: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 20 
    },
    endpoint: { type: 'string', format: 'uri' },
    protocol: { 
      type: 'string', 
      enum: ['stdio', 'sse', 'websocket', 'http'] 
    },
    authentication: {
      type: 'object',
      properties: {
        type: { 
          type: 'string', 
          enum: ['none', 'apikey', 'oauth2', 'basic', 'certificate', 'jwt'] 
        },
        config: { type: 'object' }
      },
      required: ['type']
    },
    capabilities: {
      type: 'object',
      properties: {
        tools: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'description', 'inputSchema'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              inputSchema: { type: 'object' },
              outputSchema: { type: 'object' },
              examples: { type: 'array' }
            }
          }
        },
        resources: {
          type: 'array',
          items: {
            type: 'object',
            required: ['uri', 'name', 'description', 'mimeType'],
            properties: {
              uri: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              mimeType: { type: 'string' }
            }
          }
        },
        prompts: {
          type: 'array',
          items: {
            type: 'object',
            required: ['name', 'description'],
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              arguments: { type: 'array' }
            }
          }
        }
      },
      additionalProperties: false
    },
    documentation: { type: 'string', format: 'uri' },
    repository: { type: 'string', format: 'uri' },
    license: { type: 'string' },
    icon: { type: 'string', format: 'uri' },
    screenshots: {
      type: 'array',
      items: { type: 'string', format: 'uri' },
      maxItems: 10
    }
  },
  additionalProperties: false
}

const serverUpdateSchema = {
  type: 'object',
  properties: {
    version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+' },
    description: { type: 'string', minLength: 1, maxLength: 1000 },
    capabilities: {
      type: 'object',
      properties: {
        tools: { type: 'array' },
        resources: { type: 'array' },
        prompts: { type: 'array' }
      }
    },
    status: { 
      type: 'string', 
      enum: ['active', 'deprecated', 'maintenance', 'beta', 'alpha'] 
    },
    documentation: { type: 'string', format: 'uri' },
    tags: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 20 
    }
  },
  additionalProperties: false
}

export async function mcpServersRoutes(fastify: FastifyInstance) {
  const mcpServerService = new MCPServerService(fastify.prisma)
  const mcpValidationService = new MCPValidationService()

  // Register a new MCP server
  fastify.post<{
    Body: Omit<MCPServerDefinition, 'id' | 'created' | 'updated' | 'status' | 'health' | 'stats'>
  }>('/', {
    schema: {
      body: serverRegistrationSchema,
      response: {
        201: {
          type: 'object',
          properties: {
            serverId: { type: 'string' },
            registrationToken: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Validate server definition
      const validationResult = await mcpValidationService.validateServerDefinition(request.body)
      if (!validationResult.valid) {
        return reply.status(400).send({
          error: 'Invalid server definition',
          details: validationResult.errors
        })
      }

      // Test connectivity to the server
      const connectivityTest = await mcpValidationService.testServerConnectivity(
        request.body.endpoint,
        request.body.protocol,
        request.body.authentication
      )
      
      if (!connectivityTest.success) {
        return reply.status(400).send({
          error: 'Server connectivity test failed',
          details: [connectivityTest.error]
        })
      }

      // Register the server
      const registration = await mcpServerService.registerServer(request.body)
      
      reply.status(201).send(registration)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get all servers with filtering and pagination
  fastify.get<{
    Querystring: {
      category?: string
      tags?: string
      author?: string
      status?: string
      search?: string
      limit?: number
      offset?: number
      sortBy?: string
      sortOrder?: 'asc' | 'desc'
    }
  }>('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          tags: { type: 'string' },
          author: { type: 'string' },
          status: { type: 'string' },
          search: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
          sortBy: { type: 'string', enum: ['name', 'created', 'updated', 'popularity'], default: 'created' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            servers: { type: 'array' },
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const query = {
        text: request.query.search,
        category: request.query.category as any,
        tags: request.query.tags?.split(','),
        author: request.query.author,
        status: request.query.status?.split(',') as any,
        limit: request.query.limit || 20,
        offset: request.query.offset || 0,
        sortBy: (request.query.sortBy || 'created') as any,
        sortOrder: request.query.sortOrder || 'desc'
      }

      const result = await mcpServerService.searchServers(query)
      reply.send(result)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get a specific server by ID
  fastify.get<{
    Params: { serverId: string }
  }>('/:serverId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          serverId: { type: 'string', format: 'uuid' }
        },
        required: ['serverId']
      },
      response: {
        200: { type: 'object' },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const server = await mcpServerService.getServerById(request.params.serverId)
      if (!server) {
        return reply.status(404).send({ error: 'Server not found' })
      }
      reply.send(server)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Update a server
  fastify.put<{
    Params: { serverId: string }
    Body: ServerUpdate
  }>('/:serverId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          serverId: { type: 'string', format: 'uuid' }
        },
        required: ['serverId']
      },
      body: serverUpdateSchema,
      response: {
        200: { type: 'object' },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const server = await mcpServerService.updateServer(request.params.serverId, request.body)
      if (!server) {
        return reply.status(404).send({ error: 'Server not found' })
      }
      reply.send(server)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Delete a server
  fastify.delete<{
    Params: { serverId: string }
  }>('/:serverId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          serverId: { type: 'string', format: 'uuid' }
        },
        required: ['serverId']
      },
      response: {
        204: {},
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const success = await mcpServerService.deleteServer(request.params.serverId)
      if (!success) {
        return reply.status(404).send({ error: 'Server not found' })
      }
      reply.status(204).send()
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get server capabilities
  fastify.get<{
    Params: { serverId: string }
  }>('/:serverId/capabilities', {
    schema: {
      params: {
        type: 'object',
        properties: {
          serverId: { type: 'string', format: 'uuid' }
        },
        required: ['serverId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            tools: { type: 'array' },
            resources: { type: 'array' },
            prompts: { type: 'array' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const capabilities = await mcpServerService.getServerCapabilities(request.params.serverId)
      if (!capabilities) {
        return reply.status(404).send({ error: 'Server not found' })
      }
      reply.send(capabilities)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Health check for a server
  fastify.get<{
    Params: { serverId: string }
  }>('/:serverId/health', {
    schema: {
      params: {
        type: 'object',
        properties: {
          serverId: { type: 'string', format: 'uuid' }
        },
        required: ['serverId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy', 'unknown'] },
            lastChecked: { type: 'string', format: 'date-time' },
            responseTime: { type: 'number' },
            uptime: { type: 'number' },
            issues: { type: 'array' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const health = await mcpServerService.checkServerHealth(request.params.serverId)
      if (!health) {
        return reply.status(404).send({ error: 'Server not found' })
      }
      reply.send(health)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Test connectivity to a server
  fastify.post<{
    Params: { serverId: string }
  }>('/:serverId/test', {
    schema: {
      params: {
        type: 'object',
        properties: {
          serverId: { type: 'string', format: 'uuid' }
        },
        required: ['serverId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            responseTime: { type: 'number' },
            error: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const testResult = await mcpServerService.testServerConnection(request.params.serverId)
      if (!testResult) {
        return reply.status(404).send({ error: 'Server not found' })
      }
      reply.send(testResult)
    } catch (error) {
      fastify.log.error(error)
      reply.status(500).send({ error: 'Internal server error' })
    }
  })
}