import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Joi from 'joi';
import { AgentService } from '@/services/AgentService';
import { requireAuth, requireUser } from '@/middleware/auth';
import { logger, apiLogger } from '@/utils/logger';
import {
  CreateAgentRequest,
  UpdateAgentRequest,
  AgentFilters,
  AgentSortOptions,
  BulkDeleteRequest,
  AgentNotFoundError,
  AgentPermissionError,
  AgentValidationError,
  AgentDependencyError,
  AGENT_TYPES,
} from '@/types/agents';
import { AgentStatus } from '@prisma/client';

/**
 * Agents Controller with Enterprise Authentication Integration
 * All endpoints require authentication and implement RBAC
 */

// Validation schemas
const createAgentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  projectId: Joi.string().uuid().required(),
  agentType: Joi.string().trim().min(1).max(50).required(),
  version: Joi.string().trim().max(20).optional().allow(''),
  configuration: Joi.object().optional(),
  metadata: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const updateAgentSchema = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  description: Joi.string().trim().max(1000).optional().allow(''),
  agentType: Joi.string().trim().min(1).max(50).optional(),
  version: Joi.string().trim().max(20).optional().allow(''),
  status: Joi.string().valid(...Object.values(AgentStatus)).optional(),
  configuration: Joi.object().optional(),
  metadata: Joi.object().optional(),
  tags: Joi.array().items(Joi.string()).optional(),
});

const listAgentsSchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  size: Joi.number().integer().min(1).max(100).default(10),
  
  // Filters
  name: Joi.string().max(100).optional(),
  projectId: Joi.string().uuid().optional(),
  agentType: Joi.string().max(50).optional(),
  status: Joi.string().valid(...Object.values(AgentStatus)).optional(),
  createdBy: Joi.string().optional(),
  createdAfter: Joi.date().optional(),
  createdBefore: Joi.date().optional(),
  lastUsedAfter: Joi.date().optional(),
  lastUsedBefore: Joi.date().optional(),
  
  // Sorting
  sortField: Joi.string().valid('name', 'agentType', 'status', 'createdAt', 'lastUsedAt', 'totalTraces', 'totalSpans').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const bulkDeleteSchema = Joi.object({
  agentIds: Joi.array().items(Joi.string().uuid()).min(1).max(100).required(),
  force: Joi.boolean().optional().default(false),
});

export default async function agentsController(fastify: FastifyInstance): Promise<void> {
  // Add JSON schema definitions for Swagger documentation
  fastify.addSchema({
    $id: 'CreateAgentRequest',
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1, maxLength: 100 },
      description: { type: 'string', maxLength: 1000 },
      projectId: { type: 'string', format: 'uuid' },
      agentType: { type: 'string', minLength: 1, maxLength: 50 },
      version: { type: 'string', maxLength: 20 },
      configuration: { type: 'object' },
      metadata: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' } },
    },
    required: ['name', 'projectId', 'agentType'],
  });

  fastify.addSchema({
    $id: 'AgentResponse',
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      projectId: { type: 'string' },
      workspaceId: { type: 'string' },
      agentType: { type: 'string' },
      version: { type: 'string' },
      status: { type: 'string', enum: Object.values(AgentStatus) },
      configuration: { type: 'object' },
      metadata: { type: 'object' },
      tags: { type: 'array', items: { type: 'string' } },
      totalTraces: { type: 'number' },
      totalSpans: { type: 'number' },
      lastUsedAt: { type: 'string', format: 'date-time' },
      createdAt: { type: 'string', format: 'date-time' },
      createdBy: { type: 'string' },
      lastUpdatedAt: { type: 'string', format: 'date-time' },
      lastUpdatedBy: { type: 'string' },
      canEdit: { type: 'boolean' },
      canDelete: { type: 'boolean' },
      canCreateTraces: { type: 'boolean' },
    },
  });

  /**
   * GET / - List agents with authentication and filtering
   */
  fastify.get('/', {
    preHandler: requireUser,
    schema: {
      description: 'List agents with filtering, sorting, and pagination',
      tags: ['agents'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          size: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
          name: { type: 'string', maxLength: 100 },
          projectId: { type: 'string', format: 'uuid' },
          agentType: { type: 'string', maxLength: 50 },
          status: { type: 'string', enum: Object.values(AgentStatus) },
          createdBy: { type: 'string' },
          createdAfter: { type: 'string', format: 'date-time' },
          createdBefore: { type: 'string', format: 'date-time' },
          lastUsedAfter: { type: 'string', format: 'date-time' },
          lastUsedBefore: { type: 'string', format: 'date-time' },
          sortField: { type: 'string', enum: ['name', 'agentType', 'status', 'createdAt', 'lastUsedAt', 'totalTraces', 'totalSpans'] },
          sortOrder: { type: 'string', enum: ['asc', 'desc'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            agents: { type: 'array', items: { $ref: 'AgentResponse' } },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                size: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
                hasNext: { type: 'boolean' },
                hasPrevious: { type: 'boolean' },
              },
            },
            filters: { type: 'object' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const queryParams = request.query as any;
      
      // Validate query parameters
      const { error, value } = listAgentsSchema.validate(queryParams);
      if (error) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details,
        });
      }

      const {
        page, size, name, projectId, agentType, status, createdBy,
        createdAfter, createdBefore, lastUsedAfter, lastUsedBefore,
        sortField, sortOrder
      } = value;

      // Build filters
      const filters: AgentFilters = {};
      if (name) filters.name = name;
      if (projectId) filters.projectId = projectId;
      if (agentType) filters.agentType = agentType;
      if (status) filters.status = status;
      if (createdBy) filters.createdBy = createdBy;
      if (createdAfter) filters.createdAfter = new Date(createdAfter);
      if (createdBefore) filters.createdBefore = new Date(createdBefore);
      if (lastUsedAfter) filters.lastUsedAfter = new Date(lastUsedAfter);
      if (lastUsedBefore) filters.lastUsedBefore = new Date(lastUsedBefore);

      // Build sort options
      let sort: AgentSortOptions | undefined;
      if (sortField && sortOrder) {
        sort = { field: sortField, order: sortOrder };
      }

      apiLogger.info('Listing agents', {
        userId: user.id,
        filters,
        sort,
        page,
        size,
      });

      const result = await AgentService.listAgents(user, filters, sort, page, size);
      return reply.send(result);
      
    } catch (error) {
      logger.error('Error listing agents:', error);
      
      if (error instanceof AgentPermissionError) {
        return reply.status(403).send({
          error: 'PERMISSION_DENIED',
          message: error.message,
        });
      }
      
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to list agents',
      });
    }
  });

  /**
   * POST / - Create new agent with authentication
   */
  fastify.post('/', {
    preHandler: requireUser,
    schema: {
      description: 'Create a new agent',
      tags: ['agents'],
      body: { $ref: 'CreateAgentRequest' },
      response: {
        201: { $ref: 'AgentResponse' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const body = request.body as CreateAgentRequest;
      
      // Validate request body
      const { error, value } = createAgentSchema.validate(body);
      if (error) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details,
        });
      }

      apiLogger.info('Creating agent', {
        userId: user.id,
        agentName: value.name,
        projectId: value.projectId,
        agentType: value.agentType,
      });

      const result = await AgentService.createAgent(value, user);
      return reply.status(201).send(result);
      
    } catch (error) {
      logger.error('Error creating agent:', error);
      
      if (error instanceof AgentPermissionError) {
        return reply.status(403).send({
          error: 'PERMISSION_DENIED',
          message: error.message,
        });
      }
      
      if (error instanceof AgentValidationError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }
      
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create agent',
      });
    }
  });

  /**
   * GET /:agentId - Get specific agent by ID
   */
  fastify.get('/:agentId', {
    preHandler: requireUser,
    schema: {
      description: 'Get agent by ID',
      tags: ['agents'],
      params: {
        type: 'object',
        properties: {
          agentId: { type: 'string', format: 'uuid' },
        },
        required: ['agentId'],
      },
      response: {
        200: { $ref: 'AgentResponse' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { agentId } = request.params as { agentId: string };

      apiLogger.info('Getting agent', {
        userId: user.id,
        agentId,
      });

      const result = await AgentService.getAgent(agentId, user);
      return reply.send(result);
      
    } catch (error) {
      logger.error('Error getting agent:', error);
      
      if (error instanceof AgentNotFoundError) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: error.message,
        });
      }
      
      if (error instanceof AgentPermissionError) {
        return reply.status(403).send({
          error: 'PERMISSION_DENIED',
          message: error.message,
        });
      }
      
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get agent',
      });
    }
  });

  /**
   * PUT /:agentId - Update agent by ID
   */
  fastify.put('/:agentId', {
    preHandler: requireUser,
    schema: {
      description: 'Update agent by ID',
      tags: ['agents'],
      params: {
        type: 'object',
        properties: {
          agentId: { type: 'string', format: 'uuid' },
        },
        required: ['agentId'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 1000 },
          agentType: { type: 'string', minLength: 1, maxLength: 50 },
          version: { type: 'string', maxLength: 20 },
          status: { type: 'string', enum: Object.values(AgentStatus) },
          configuration: { type: 'object' },
          metadata: { type: 'object' },
          tags: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: { $ref: 'AgentResponse' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { agentId } = request.params as { agentId: string };
      const body = request.body as UpdateAgentRequest;
      
      // Validate request body
      const { error, value } = updateAgentSchema.validate(body);
      if (error) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.details[0].message,
          details: error.details,
        });
      }

      apiLogger.info('Updating agent', {
        userId: user.id,
        agentId,
        updates: Object.keys(value),
      });

      const result = await AgentService.updateAgent(agentId, value, user);
      return reply.send(result);
      
    } catch (error) {
      logger.error('Error updating agent:', error);
      
      if (error instanceof AgentNotFoundError) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: error.message,
        });
      }
      
      if (error instanceof AgentPermissionError) {
        return reply.status(403).send({
          error: 'PERMISSION_DENIED',
          message: error.message,
        });
      }
      
      if (error instanceof AgentValidationError) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }
      
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to update agent',
      });
    }
  });

  /**
   * DELETE /:agentId - Delete agent by ID
   */
  fastify.delete('/:agentId', {
    preHandler: requireUser,
    schema: {
      description: 'Delete agent by ID',
      tags: ['agents'],
      params: {
        type: 'object',
        properties: {
          agentId: { type: 'string', format: 'uuid' },
        },
        required: ['agentId'],
      },
      querystring: {
        type: 'object',
        properties: {
          force: { type: 'boolean', default: false },
        },
      },
      response: {
        204: { type: 'null' },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      const { agentId } = request.params as { agentId: string };
      const { force = false } = request.query as { force?: boolean };

      apiLogger.info('Deleting agent', {
        userId: user.id,
        agentId,
        force,
      });

      await AgentService.deleteAgent(agentId, user, force);
      return reply.status(204).send();
      
    } catch (error) {
      logger.error('Error deleting agent:', error);
      
      if (error instanceof AgentNotFoundError) {
        return reply.status(404).send({
          error: 'AGENT_NOT_FOUND',
          message: error.message,
        });
      }
      
      if (error instanceof AgentPermissionError) {
        return reply.status(403).send({
          error: 'PERMISSION_DENIED',
          message: error.message,
        });
      }
      
      if (error instanceof AgentDependencyError) {
        return reply.status(409).send({
          error: 'DEPENDENCY_CONFLICT',
          message: error.message,
        });
      }
      
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete agent',
      });
    }
  });

  /**
   * GET /types - Get available agent types
   */
  fastify.get('/types', {
    preHandler: requireUser,
    schema: {
      description: 'Get available agent types',
      tags: ['agents'],
      response: {
        200: {
          type: 'object',
          properties: {
            types: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  value: { type: 'string' },
                  label: { type: 'string' },
                  description: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const types = [
      { value: AGENT_TYPES.LLM, label: 'LLM Agent', description: 'Large Language Model based agent' },
      { value: AGENT_TYPES.SEARCH, label: 'Search Agent', description: 'Search and information retrieval agent' },
      { value: AGENT_TYPES.TOOL, label: 'Tool Agent', description: 'Tool execution and utility agent' },
      { value: AGENT_TYPES.RETRIEVAL, label: 'Retrieval Agent', description: 'Vector search and retrieval agent' },
      { value: AGENT_TYPES.EMBEDDING, label: 'Embedding Agent', description: 'Text embedding and similarity agent' },
      { value: AGENT_TYPES.CHAIN, label: 'Chain Agent', description: 'Multi-step workflow agent' },
      { value: AGENT_TYPES.CUSTOM, label: 'Custom Agent', description: 'Custom implementation agent' },
    ];

    return reply.send({ types });
  });
}