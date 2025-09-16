import { prisma } from '@/config/database';
import { logger, dbLogger } from '@/utils/logger';
import { AuthenticatedUser } from '@/types/auth';
import {
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentResponse,
  AgentListResponse,
  AgentFilters,
  AgentSortOptions,
  PaginationInfo,
  BulkDeleteRequest,
  BulkDeleteResponse,
  AgentStatsResponse,
  AgentUsageResponse,
  AgentPermissions,
  AgentAuditAction,
  AgentNotFoundError,
  AgentPermissionError,
  AgentValidationError,
  AgentDependencyError,
  AGENT_TYPES,
} from '@/types/agents';
import { UserRole } from '@/types/auth';
import { AgentStatus } from '@prisma/client';

/**
 * Agent Service with Enterprise Authentication Integration
 * All operations include workspace isolation, RBAC, and audit logging
 */
export class AgentService {
  /**
   * Create a new agent with authentication and authorization
   */
  static async createAgent(
    request: CreateAgentRequest,
    user: AuthenticatedUser
  ): Promise<AgentResponse> {
    try {
      logger.info(`Creating agent: ${request.name}`, {
        userId: user.id,
        username: user.username,
        projectId: request.projectId,
        agentType: request.agentType,
      });

      // Validate permissions
      if (!this.canCreateAgent(user)) {
        throw new AgentPermissionError('create', 'new agent');
      }

      // Validate input
      this.validateCreateRequest(request);

      // Verify project exists and user has access
      const project = await prisma.project.findUnique({
        where: { id: request.projectId },
      });

      if (!project) {
        throw new AgentValidationError('projectId', `Project not found: ${request.projectId}`);
      }

      // Check workspace access
      if (!this.canAccessWorkspace(user, project.workspaceId)) {
        throw new AgentPermissionError('create agent in', project.workspaceId);
      }

      // Check for duplicate agent name in project
      const existingAgent = await prisma.agent.findFirst({
        where: {
          name: request.name,
          projectId: request.projectId,
        },
      });

      if (existingAgent) {
        throw new AgentValidationError('name', `Agent name '${request.name}' already exists in project`);
      }

      // Create agent
      const agent = await prisma.agent.create({
        data: {
          name: request.name.trim(),
          description: request.description?.trim() || null,
          projectId: request.projectId,
          workspaceId: project.workspaceId,
          agentType: request.agentType,
          version: request.version || null,
          status: AgentStatus.ACTIVE,
          configuration: request.configuration || null,
          metadata: request.metadata || null,
          tags: request.tags || null,
          createdBy: user.id,
        },
      });

      // Log audit event
      await this.logAuditEvent(agent.id, user.id, AgentAuditAction.CREATED, {
        agentName: request.name,
        projectId: request.projectId,
        agentType: request.agentType,
        workspaceId: project.workspaceId,
      });

      logger.info(`Agent created successfully: ${agent.id}`, {
        agentId: agent.id,
        agentName: agent.name,
        projectId: request.projectId,
        userId: user.id,
      });

      return this.toAgentResponse(agent, user);
    } catch (error) {
      logger.error('Agent creation failed:', error);
      throw error;
    }
  }

  /**
   * List agents with authentication, filtering, and pagination
   */
  static async listAgents(
    user: AuthenticatedUser,
    filters?: AgentFilters,
    sort?: AgentSortOptions,
    page = 1,
    size = 10
  ): Promise<AgentListResponse> {
    try {
      logger.debug(`Listing agents for user: ${user.username}`, {
        userId: user.id,
        workspaceId: user.workspaceId,
        filters,
        sort,
        page,
        size,
      });

      // Build where clause with workspace isolation
      const whereClause: any = {};
      
      // Workspace isolation - critical security requirement
      if (user.role === UserRole.ADMIN) {
        // Admin can see all workspaces or filter by project
        if (filters?.projectId) {
          const project = await prisma.project.findUnique({
            where: { id: filters.projectId },
            select: { workspaceId: true },
          });
          if (project) {
            whereClause.workspaceId = project.workspaceId;
            whereClause.projectId = filters.projectId;
          }
        }
      } else {
        // Regular users can only see their workspace
        whereClause.workspaceId = user.workspaceId;
        if (filters?.projectId) {
          whereClause.projectId = filters.projectId;
        }
      }

      // Apply additional filters
      if (filters?.name) {
        whereClause.name = {
          contains: filters.name,
          mode: 'insensitive',
        };
      }

      if (filters?.agentType) {
        whereClause.agentType = filters.agentType;
      }

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.createdBy) {
        whereClause.createdBy = filters.createdBy;
      }

      if (filters?.createdAfter || filters?.createdBefore) {
        whereClause.createdAt = {};
        if (filters.createdAfter) {
          whereClause.createdAt.gte = filters.createdAfter;
        }
        if (filters.createdBefore) {
          whereClause.createdAt.lte = filters.createdBefore;
        }
      }

      if (filters?.lastUsedAfter || filters?.lastUsedBefore) {
        whereClause.lastUsedAt = {};
        if (filters.lastUsedAfter) {
          whereClause.lastUsedAt.gte = filters.lastUsedAfter;
        }
        if (filters.lastUsedBefore) {
          whereClause.lastUsedAt.lte = filters.lastUsedBefore;
        }
      }

      // Build sort order
      const orderBy: any = {};
      if (sort) {
        orderBy[sort.field] = sort.order;
      } else {
        orderBy.createdAt = 'desc'; // Default sort
      }

      // Execute query with pagination
      const [agents, totalCount] = await Promise.all([
        prisma.agent.findMany({
          where: whereClause,
          orderBy: orderBy,
          skip: (page - 1) * size,
          take: size,
          include: {
            project: {
              select: { name: true, workspaceId: true },
            },
          },
        }),
        prisma.agent.count({ where: whereClause }),
      ]);

      // Transform to response format
      const agentResponses = agents.map(agent => this.toAgentResponse(agent, user));

      const pagination: PaginationInfo = {
        page,
        size,
        total: totalCount,
        totalPages: Math.ceil(totalCount / size),
        hasNext: page < Math.ceil(totalCount / size),
        hasPrevious: page > 1,
      };

      dbLogger.debug(`Listed ${agents.length} agents`, {
        userId: user.id,
        totalCount,
        page,
        size,
      });

      return {
        agents: agentResponses,
        pagination,
        filters,
      };
    } catch (error) {
      logger.error('Agent listing failed:', error);
      throw error;
    }
  }

  /**
   * Get agent by ID with authentication and authorization
   */
  static async getAgent(
    agentId: string,
    user: AuthenticatedUser
  ): Promise<AgentResponse> {
    try {
      logger.debug(`Getting agent: ${agentId}`, {
        agentId,
        userId: user.id,
      });

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          project: {
            select: { name: true, workspaceId: true },
          },
        },
      });

      if (!agent) {
        throw new AgentNotFoundError(agentId);
      }

      // Check permissions
      if (!this.canReadAgent(user, agent)) {
        await this.logAuditEvent(agentId, user.id, AgentAuditAction.PERMISSION_DENIED, {
          action: 'read',
          reason: 'workspace_access_denied',
        });
        throw new AgentPermissionError('read', agentId);
      }

      // Log audit event for viewing
      await this.logAuditEvent(agentId, user.id, AgentAuditAction.VIEWED);

      return this.toAgentResponse(agent, user);
    } catch (error) {
      logger.error(`Agent retrieval failed for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent with authentication and authorization
   */
  static async updateAgent(
    agentId: string,
    updates: UpdateAgentRequest,
    user: AuthenticatedUser
  ): Promise<AgentResponse> {
    try {
      logger.info(`Updating agent: ${agentId}`, {
        agentId,
        userId: user.id,
        updates,
      });

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          project: {
            select: { workspaceId: true },
          },
        },
      });

      if (!agent) {
        throw new AgentNotFoundError(agentId);
      }

      // Check permissions
      if (!this.canEditAgent(user, agent)) {
        await this.logAuditEvent(agentId, user.id, AgentAuditAction.PERMISSION_DENIED, {
          action: 'update',
          reason: 'insufficient_permissions',
        });
        throw new AgentPermissionError('update', agentId);
      }

      // Validate updates
      this.validateUpdateRequest(updates);

      // Check for name conflicts if name is being changed
      if (updates.name && updates.name !== agent.name) {
        const existingAgent = await prisma.agent.findFirst({
          where: {
            name: updates.name,
            projectId: agent.projectId,
            id: { not: agentId },
          },
        });

        if (existingAgent) {
          throw new AgentValidationError('name', `Agent name '${updates.name}' already exists in project`);
        }
      }

      // Update agent
      const updatedAgent = await prisma.agent.update({
        where: { id: agentId },
        data: {
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.description !== undefined && { description: updates.description?.trim() || null }),
          ...(updates.agentType && { agentType: updates.agentType }),
          ...(updates.version !== undefined && { version: updates.version || null }),
          ...(updates.status && { status: updates.status }),
          ...(updates.configuration !== undefined && { configuration: updates.configuration || null }),
          ...(updates.metadata !== undefined && { metadata: updates.metadata || null }),
          ...(updates.tags !== undefined && { tags: updates.tags || null }),
          lastUpdatedBy: user.id,
        },
        include: {
          project: {
            select: { name: true, workspaceId: true },
          },
        },
      });

      // Log audit event
      await this.logAuditEvent(agentId, user.id, AgentAuditAction.UPDATED, {
        changes: updates,
      });

      logger.info(`Agent updated successfully: ${agentId}`, {
        agentId,
        userId: user.id,
      });

      return this.toAgentResponse(updatedAgent, user);
    } catch (error) {
      logger.error(`Agent update failed for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Delete agent with authentication and authorization
   */
  static async deleteAgent(
    agentId: string,
    user: AuthenticatedUser,
    force = false
  ): Promise<void> {
    try {
      logger.info(`Deleting agent: ${agentId}`, {
        agentId,
        userId: user.id,
        force,
      });

      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
        include: {
          project: {
            select: { workspaceId: true },
          },
          _count: {
            select: {
              traces: true,
              spans: true,
            },
          },
        },
      });

      if (!agent) {
        throw new AgentNotFoundError(agentId);
      }

      // Check permissions
      if (!this.canDeleteAgent(user, agent)) {
        await this.logAuditEvent(agentId, user.id, AgentAuditAction.PERMISSION_DENIED, {
          action: 'delete',
          reason: 'insufficient_permissions',
        });
        throw new AgentPermissionError('delete', agentId);
      }

      // Check if agent has dependencies
      const hasTraces = agent._count.traces > 0;
      const hasSpans = agent._count.spans > 0;

      if ((hasTraces || hasSpans) && !force) {
        throw new AgentDependencyError(
          `Agent has ${agent._count.traces} traces and ${agent._count.spans} spans. Use force=true to delete anyway.`
        );
      }

      if (force && (hasTraces || hasSpans) && user.role !== UserRole.ADMIN) {
        throw new AgentPermissionError('force delete', agentId);
      }

      // Delete agent (CASCADE will handle related records)
      await prisma.agent.delete({
        where: { id: agentId },
      });

      // Log audit event
      await this.logAuditEvent(agentId, user.id, AgentAuditAction.DELETED, {
        agentName: agent.name,
        tracesDeleted: agent._count.traces,
        spansDeleted: agent._count.spans,
        force,
      });

      logger.info(`Agent deleted successfully: ${agentId}`, {
        agentId,
        userId: user.id,
        tracesDeleted: agent._count.traces,
        spansDeleted: agent._count.spans,
      });
    } catch (error) {
      logger.error(`Agent deletion failed for ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Update agent usage statistics
   */
  static async updateAgentUsage(
    agentId: string,
    incrementTraces = 0,
    incrementSpans = 0
  ): Promise<void> {
    try {
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          totalTraces: { increment: incrementTraces },
          totalSpans: { increment: incrementSpans },
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Failed to update agent usage for ${agentId}:`, error);
      // Don't throw - usage tracking failure shouldn't break operations
    }
  }

  /**
   * Permission checking methods
   */
  private static canCreateAgent(user: AuthenticatedUser): boolean {
    return user.permissions.includes('agents:create');
  }

  private static canReadAgent(user: AuthenticatedUser, agent: any): boolean {
    // Admin can read any agent
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Users can only read agents in their workspace
    return agent.project?.workspaceId === user.workspaceId || agent.workspaceId === user.workspaceId;
  }

  private static canEditAgent(user: AuthenticatedUser, agent: any): boolean {
    // Admin can edit any agent
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Users can only edit agents in their workspace and have edit permission
    const inWorkspace = agent.project?.workspaceId === user.workspaceId || agent.workspaceId === user.workspaceId;
    return inWorkspace && user.permissions.includes('agents:update');
  }

  private static canDeleteAgent(user: AuthenticatedUser, agent: any): boolean {
    // Admin can delete any agent
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Users can delete their own agents or if they have delete permission
    const inWorkspace = agent.project?.workspaceId === user.workspaceId || agent.workspaceId === user.workspaceId;
    return inWorkspace && 
           (agent.createdBy === user.id || user.permissions.includes('agents:delete'));
  }

  private static canAccessWorkspace(user: AuthenticatedUser, workspaceId: string): boolean {
    // Admin can access any workspace
    if (user.role === UserRole.ADMIN) {
      return true;
    }
    
    // Regular users can only access their own workspace
    return user.workspaceId === workspaceId;
  }

  /**
   * Get user permissions for an agent
   */
  private static getAgentPermissions(user: AuthenticatedUser, agent: any): AgentPermissions {
    const isOwner = agent.createdBy === user.id;
    const isAdmin = user.role === UserRole.ADMIN;
    const canAccess = this.canReadAgent(user, agent);

    return {
      canRead: canAccess,
      canEdit: canAccess && (isAdmin || user.permissions.includes('agents:update')),
      canDelete: canAccess && (isAdmin || isOwner || user.permissions.includes('agents:delete')),
      canCreateTraces: canAccess && user.permissions.includes('traces:create'),
      canViewMetrics: canAccess && user.permissions.includes('agents:read'),
      canManageConfiguration: canAccess && (isAdmin || isOwner || user.permissions.includes('agents:update')),
      isOwner,
    };
  }

  /**
   * Transform database agent to response format
   */
  private static toAgentResponse(
    agent: any,
    user: AuthenticatedUser
  ): AgentResponse {
    const permissions = this.getAgentPermissions(user, agent);

    return {
      id: agent.id,
      name: agent.name,
      description: agent.description,
      projectId: agent.projectId,
      workspaceId: agent.workspaceId,
      agentType: agent.agentType,
      version: agent.version,
      status: agent.status,
      configuration: agent.configuration,
      metadata: agent.metadata,
      tags: agent.tags,
      totalTraces: agent.totalTraces,
      totalSpans: agent.totalSpans,
      lastUsedAt: agent.lastUsedAt,
      createdAt: agent.createdAt,
      createdBy: agent.createdBy,
      lastUpdatedAt: agent.lastUpdatedAt,
      lastUpdatedBy: agent.lastUpdatedBy,
      canEdit: permissions.canEdit,
      canDelete: permissions.canDelete,
      canCreateTraces: permissions.canCreateTraces,
    };
  }

  /**
   * Validation methods
   */
  private static validateCreateRequest(request: CreateAgentRequest): void {
    if (!request.name || request.name.trim().length === 0) {
      throw new AgentValidationError('name', 'Agent name is required');
    }

    if (request.name.length > 100) {
      throw new AgentValidationError('name', 'Agent name cannot exceed 100 characters');
    }

    if (!request.projectId || request.projectId.trim().length === 0) {
      throw new AgentValidationError('projectId', 'Project ID is required');
    }

    if (!request.agentType || request.agentType.trim().length === 0) {
      throw new AgentValidationError('agentType', 'Agent type is required');
    }

    if (request.agentType.length > 50) {
      throw new AgentValidationError('agentType', 'Agent type cannot exceed 50 characters');
    }

    if (request.description && request.description.length > 1000) {
      throw new AgentValidationError('description', 'Agent description cannot exceed 1000 characters');
    }

    if (request.version && request.version.length > 20) {
      throw new AgentValidationError('version', 'Agent version cannot exceed 20 characters');
    }
  }

  private static validateUpdateRequest(updates: UpdateAgentRequest): void {
    if (updates.name !== undefined) {
      if (!updates.name || updates.name.trim().length === 0) {
        throw new AgentValidationError('name', 'Agent name cannot be empty');
      }

      if (updates.name.length > 100) {
        throw new AgentValidationError('name', 'Agent name cannot exceed 100 characters');
      }
    }

    if (updates.agentType !== undefined) {
      if (!updates.agentType || updates.agentType.trim().length === 0) {
        throw new AgentValidationError('agentType', 'Agent type cannot be empty');
      }

      if (updates.agentType.length > 50) {
        throw new AgentValidationError('agentType', 'Agent type cannot exceed 50 characters');
      }
    }

    if (updates.description !== undefined && updates.description && updates.description.length > 1000) {
      throw new AgentValidationError('description', 'Agent description cannot exceed 1000 characters');
    }

    if (updates.version !== undefined && updates.version && updates.version.length > 20) {
      throw new AgentValidationError('version', 'Agent version cannot exceed 20 characters');
    }
  }

  /**
   * Audit logging
   */
  private static async logAuditEvent(
    agentId: string,
    userId: string,
    action: AgentAuditAction,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.userAuditLog.create({
        data: {
          userId,
          event: `agent_${action}`,
          eventType: 'USER_UPDATED', // We'll extend this enum later
          description: `Agent ${action}: ${agentId}`,
          metadata: {
            agentId,
            action,
            ...details,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to log agent audit event:', error);
      // Don't throw - audit logging failure shouldn't break the operation
    }
  }
}