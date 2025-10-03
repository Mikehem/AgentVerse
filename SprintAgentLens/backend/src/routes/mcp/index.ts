import { FastifyInstance } from 'fastify'
import { mcpServersRoutes } from './servers'
import { mcpDiscoveryRoutes } from './discovery'
import { mcpConnectionsRoutes } from './connections'
import { mcpAnalyticsRoutes } from './analytics'

export async function mcpRoutes(fastify: FastifyInstance) {
  fastify.register(async function (fastify) {
    // Add MCP-specific middleware
    fastify.addHook('preHandler', async (request, reply) => {
      // Add MCP protocol headers
      reply.header('X-MCP-Version', '1.0.0')
      reply.header('X-MCP-Registry', 'AgentLens')
    })

    // Register MCP route modules
    await fastify.register(mcpServersRoutes, { prefix: '/servers' })
    await fastify.register(mcpDiscoveryRoutes, { prefix: '/discovery' })
    await fastify.register(mcpConnectionsRoutes, { prefix: '/connections' })
    await fastify.register(mcpAnalyticsRoutes, { prefix: '/analytics' })
  }, { prefix: '/mcp' })
}