import { PrismaClient } from '@prisma/client'
import { 
  MCPServerDefinition, 
  ServerRegistration, 
  ServerUpdate, 
  SearchQuery, 
  SearchResult,
  HealthStatus,
  ServerCapabilities,
  UsageStats
} from '../types/mcp'
import { v4 as uuidv4 } from 'uuid'
import { MCPValidationService } from './MCPValidationService'

export class MCPServerService {
  constructor(private prisma: PrismaClient) {}

  async registerServer(
    serverData: Omit<MCPServerDefinition, 'id' | 'created' | 'updated' | 'status' | 'health' | 'stats'>
  ): Promise<ServerRegistration> {
    const serverId = uuidv4()
    const registrationToken = uuidv4()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const server = await this.prisma.mcpServer.create({
      data: {
        id: serverId,
        name: serverData.name,
        description: serverData.description,
        version: serverData.version || '1.0.0',
        author: serverData.author || 'Unknown',
        category: serverData.category || 'custom',
        tags: serverData.tags || [],
        endpoint: serverData.endpoint,
        protocol: serverData.protocol,
        authentication: serverData.authentication as any,
        capabilities: serverData.capabilities as any,
        documentation: serverData.documentation,
        repository: serverData.repository,
        license: serverData.license,
        icon: serverData.icon,
        screenshots: serverData.screenshots || [],
        status: 'active',
        registrationToken,
        tokenExpiresAt: expiresAt,
        health: {
          status: 'unknown',
          lastChecked: new Date(),
          issues: []
        } as any,
        stats: {
          totalConnections: 0,
          activeConnections: 0,
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          lastUsed: new Date()
        } as any
      }
    })

    // Create capability entries
    await this.createServerCapabilities(serverId, serverData.capabilities)

    return {
      serverId,
      registrationToken,
      expiresAt
    }
  }

  private async createServerCapabilities(serverId: string, capabilities: ServerCapabilities): Promise<void> {
    const capabilityEntries = []

    // Add tools
    for (const tool of capabilities.tools || []) {
      capabilityEntries.push({
        serverId,
        type: 'tool',
        name: tool.name,
        description: tool.description,
        schema: tool.inputSchema as any
      })
    }

    // Add resources
    for (const resource of capabilities.resources || []) {
      capabilityEntries.push({
        serverId,
        type: 'resource',
        name: resource.name,
        description: resource.description,
        schema: { uri: resource.uri, mimeType: resource.mimeType } as any
      })
    }

    // Add prompts
    for (const prompt of capabilities.prompts || []) {
      capabilityEntries.push({
        serverId,
        type: 'prompt',
        name: prompt.name,
        description: prompt.description,
        schema: { arguments: prompt.arguments } as any
      })
    }

    if (capabilityEntries.length > 0) {
      await this.prisma.serverCapability.createMany({
        data: capabilityEntries
      })
    }
  }

  async getServerById(serverId: string): Promise<MCPServerDefinition | null> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId },
      include: {
        capabilities: true
      }
    })

    if (!server) return null

    return this.mapToServerDefinition(server)
  }

  async searchServers(query: SearchQuery): Promise<SearchResult> {
    const where: any = {}

    // Text search
    if (query.text) {
      where.OR = [
        { name: { contains: query.text, mode: 'insensitive' } },
        { description: { contains: query.text, mode: 'insensitive' } },
        { author: { contains: query.text, mode: 'insensitive' } },
        { tags: { hasSome: [query.text] } }
      ]
    }

    // Category filter
    if (query.category) {
      where.category = query.category
    }

    // Tags filter
    if (query.tags && query.tags.length > 0) {
      where.tags = { hassome: query.tags }
    }

    // Author filter
    if (query.author) {
      where.author = { contains: query.author, mode: 'insensitive' }
    }

    // Status filter
    if (query.status && query.status.length > 0) {
      where.status = { in: query.status }
    }

    const [servers, total] = await Promise.all([
      this.prisma.mcpServer.findMany({
        where,
        include: {
          capabilities: true
        },
        orderBy: this.getOrderBy(query.sortBy, query.sortOrder),
        take: query.limit || 20,
        skip: query.offset || 0
      }),
      this.prisma.mcpServer.count({ where })
    ])

    // Generate facets
    const facets = await this.generateSearchFacets(where)

    return {
      servers: servers.map(server => this.mapToServerDefinition(server)),
      total,
      facets
    }
  }

  private getOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc') {
    const order = sortOrder || 'desc'
    
    switch (sortBy) {
      case 'name':
        return { name: order }
      case 'updated':
        return { updatedAt: order }
      case 'popularity':
        return { stats: { path: ['totalConnections'], order } }
      case 'created':
      default:
        return { createdAt: order }
    }
  }

  private async generateSearchFacets(baseWhere: any): Promise<any> {
    const [categoryFacets, tagFacets, authorFacets, statusFacets] = await Promise.all([
      this.prisma.mcpServer.groupBy({
        by: ['category'],
        where: baseWhere,
        _count: true
      }),
      this.prisma.$queryRaw`
        SELECT unnest(tags) as tag, COUNT(*) as count
        FROM mcp_servers 
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `,
      this.prisma.mcpServer.groupBy({
        by: ['author'],
        where: baseWhere,
        _count: true,
        orderBy: { _count: { author: 'desc' } },
        take: 20
      }),
      this.prisma.mcpServer.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: true
      })
    ])

    return {
      categories: Object.fromEntries(
        categoryFacets.map(f => [f.category, f._count])
      ),
      tags: Object.fromEntries(
        (tagFacets as any[]).map(f => [f.tag, parseInt(f.count)])
      ),
      authors: Object.fromEntries(
        authorFacets.map(f => [f.author, f._count])
      ),
      status: Object.fromEntries(
        statusFacets.map(f => [f.status, f._count])
      )
    }
  }

  async updateServer(serverId: string, updates: ServerUpdate): Promise<MCPServerDefinition | null> {
    const server = await this.prisma.mcpServer.update({
      where: { id: serverId },
      data: {
        ...updates,
        capabilities: updates.capabilities as any,
        updatedAt: new Date()
      },
      include: {
        capabilities: true
      }
    })

    // Update capabilities if provided
    if (updates.capabilities) {
      await this.prisma.serverCapability.deleteMany({
        where: { serverId }
      })
      await this.createServerCapabilities(serverId, updates.capabilities as ServerCapabilities)
    }

    return this.mapToServerDefinition(server)
  }

  async deleteServer(serverId: string): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.serverCapability.deleteMany({
          where: { serverId }
        }),
        this.prisma.mcpConnection.deleteMany({
          where: { serverId }
        }),
        this.prisma.mcpUsageAnalytic.deleteMany({
          where: { serverId }
        }),
        this.prisma.mcpServer.delete({
          where: { id: serverId }
        })
      ])
      return true
    } catch (error) {
      return false
    }
  }

  async getServerCapabilities(serverId: string): Promise<ServerCapabilities | null> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId },
      select: { capabilities: true }
    })

    return server?.capabilities as ServerCapabilities || null
  }

  async checkServerHealth(serverId: string): Promise<HealthStatus | null> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId },
      select: { endpoint, protocol, authentication, health: true }
    })

    if (!server) return null

    try {
      const validationService = new MCPValidationService()
      const startTime = Date.now()
      
      const testResult = await validationService.testServerConnectivity(
        server.endpoint,
        server.protocol as any,
        server.authentication as any
      )

      const responseTime = Date.now() - startTime
      
      const health: HealthStatus = {
        status: testResult.success ? 'healthy' : 'unhealthy',
        lastChecked: new Date(),
        responseTime,
        issues: testResult.success ? [] : [{
          code: 'CONNECTION_FAILED',
          message: testResult.error || 'Connection test failed',
          severity: 'high' as const,
          timestamp: new Date()
        }]
      }

      // Update health in database
      await this.prisma.mcpServer.update({
        where: { id: serverId },
        data: { health: health as any }
      })

      return health
    } catch (error) {
      const health: HealthStatus = {
        status: 'unhealthy',
        lastChecked: new Date(),
        issues: [{
          code: 'HEALTH_CHECK_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          severity: 'critical' as const,
          timestamp: new Date()
        }]
      }

      await this.prisma.mcpServer.update({
        where: { id: serverId },
        data: { health: health as any }
      })

      return health
    }
  }

  async testServerConnection(serverId: string): Promise<{ success: boolean; responseTime?: number; error?: string } | null> {
    const server = await this.prisma.mcpServer.findUnique({
      where: { id: serverId },
      select: { endpoint: true, protocol: true, authentication: true }
    })

    if (!server) return null

    try {
      const validationService = new MCPValidationService()
      const startTime = Date.now()
      
      const result = await validationService.testServerConnectivity(
        server.endpoint,
        server.protocol as any,
        server.authentication as any
      )

      const responseTime = Date.now() - startTime

      return {
        success: result.success,
        responseTime: result.success ? responseTime : undefined,
        error: result.error
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async getServerStats(serverId: string): Promise<UsageStats | null> {
    const [server, connectionCount, usageData] = await Promise.all([
      this.prisma.mcpServer.findUnique({
        where: { id: serverId },
        select: { stats: true }
      }),
      this.prisma.mcpConnection.count({
        where: { serverId, status: 'connected' }
      }),
      this.prisma.mcpUsageAnalytic.aggregate({
        where: { serverId },
        _count: { id: true },
        _avg: { duration: true }
      })
    ])

    if (!server) return null

    const stats = server.stats as any || {}
    
    return {
      totalConnections: stats.totalConnections || 0,
      activeConnections: connectionCount,
      totalRequests: usageData._count.id || 0,
      averageResponseTime: usageData._avg.duration || 0,
      errorRate: stats.errorRate || 0,
      lastUsed: stats.lastUsed ? new Date(stats.lastUsed) : new Date()
    }
  }

  private mapToServerDefinition(server: any): MCPServerDefinition {
    return {
      id: server.id,
      name: server.name,
      description: server.description,
      version: server.version,
      author: server.author,
      category: server.category,
      tags: server.tags,
      endpoint: server.endpoint,
      protocol: server.protocol,
      authentication: server.authentication,
      capabilities: server.capabilities,
      documentation: server.documentation,
      repository: server.repository,
      license: server.license,
      icon: server.icon,
      screenshots: server.screenshots,
      created: server.createdAt,
      updated: server.updatedAt,
      status: server.status,
      health: server.health,
      stats: server.stats
    }
  }
}