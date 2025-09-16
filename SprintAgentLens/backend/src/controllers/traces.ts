import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import Joi from 'joi';
import { TraceService } from '@/services/TraceService';
import { requireAuth, requireUser } from '@/middleware/auth';
import { logger, apiLogger } from '@/utils/logger';
import {
  CreateTraceRequest,
  UpdateTraceRequest,
  TraceListRequest,
  CreateSpanRequest,
  UpdateSpanRequest,
  CreateFeedbackRequest,
  TraceSummaryRequest,
  TraceAnalyticsRequest,
  TraceExportRequest,
  TraceSearchRequest,
  TraceNotFoundError,
  SpanNotFoundError,
  TracePermissionError,
  TraceValidationError,
  TraceStatusError,
  SpanHierarchyError,
} from '@/types/traces';

/**
 * Traces Controller with Enterprise Authentication Integration
 * All endpoints require authentication and implement RBAC
 * 
 * Compatible with Sprint Agent Lens SDK trace ingestion
 */

// Validation schemas
const createTraceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).required(),
  projectId: Joi.string().default('sample-project-id').optional(),
  workspaceId: Joi.string().max(50).optional(),
  experimentId: Joi.string().optional(),
  datasetId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  userId: Joi.string().optional(),
  tags: Joi.object().pattern(Joi.string().max(100), Joi.string().max(1000)).optional(),
  metadata: Joi.object().optional(),
  startTime: Joi.date().optional(),
  start_time: Joi.date().optional(), // SDK sends start_time (snake_case)
  endTime: Joi.date().optional(),
  end_time: Joi.date().optional(), // SDK might send end_time (snake_case)
  duration: Joi.number().optional(),
  status: Joi.string().valid('running', 'completed', 'error', 'timeout', 'cancelled').optional(),
  cost: Joi.number().optional(),
  tokens: Joi.object().optional(),
  input: Joi.object().optional(),
  output: Joi.object().optional(),
}).unknown(true); // Allow additional fields from SDK

const updateTraceSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  tags: Joi.object().pattern(Joi.string().max(100), Joi.string().max(1000)).optional(),
  metadata: Joi.object().optional(),
  endTime: Joi.date().optional(),
  status: Joi.string().valid('running', 'completed', 'error', 'timeout', 'cancelled').optional(),
});

const createSpanSchema = Joi.object({
  traceId: Joi.string().required(),
  parentSpanId: Joi.string().optional(),
  name: Joi.string().trim().min(1).max(255).required(),
  type: Joi.string().valid('llm', 'retrieval', 'embedding', 'preprocessing', 'postprocessing', 'validation', 'function', 'http', 'database', 'custom').required(),
  input: Joi.object().optional(),
  output: Joi.object().optional(),
  metadata: Joi.object().optional(),
  tags: Joi.object().pattern(Joi.string().max(100), Joi.string().max(1000)).optional(),
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
});

const updateSpanSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255).optional(),
  input: Joi.object().optional(),
  output: Joi.object().optional(),
  metadata: Joi.object().optional(),
  tags: Joi.object().pattern(Joi.string().max(100), Joi.string().max(1000)).optional(),
  endTime: Joi.date().optional(),
  status: Joi.string().valid('running', 'completed', 'error', 'timeout', 'cancelled').optional(),
});

const listTracesSchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  
  // Filters
  projectId: Joi.string().optional(),
  workspaceId: Joi.string().max(50).optional(),
  experimentId: Joi.string().optional(),
  datasetId: Joi.string().optional(),
  sessionId: Joi.string().optional(),
  userId: Joi.string().optional(),
  status: Joi.array().items(Joi.string().valid('running', 'completed', 'error', 'timeout', 'cancelled')).optional(),
  search: Joi.string().max(1000).optional(),
  hasErrors: Joi.boolean().optional(),
  hasFeedback: Joi.boolean().optional(),
  
  // Time range
  startTime: Joi.date().optional(),
  endTime: Joi.date().optional(),
  
  // Sorting
  sortBy: Joi.string().valid('start_time', 'duration', 'cost', 'tokens', 'score', 'updated_at').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional(),
});

const createFeedbackSchema = Joi.object({
  traceId: Joi.string().optional(),
  spanId: Joi.string().optional(),
  name: Joi.string().trim().min(1).max(100).required(),
  value: Joi.number().min(-1).max(1).required(),
  reason: Joi.string().max(1000).optional(),
  source: Joi.string().valid('human', 'llm', 'automatic').required(),
});

// TraceService uses static methods

export default async function tracesController(server: FastifyInstance) {
  // Apply authentication middleware to all routes
  await server.addHook('onRequest', requireAuth);

  // Create new trace
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user!;
    try {
      const { error, value } = createTraceSchema.validate(request.body);
      
      if (error) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.details,
        });
      }

      const traceData: CreateTraceRequest = {
        ...value,
        workspaceId: value.workspaceId || user.workspaceId,
        // Normalize start_time to startTime
        startTime: value.start_time || value.startTime,
        endTime: value.end_time || value.endTime,
      };

      apiLogger.info(`Creating trace: ${traceData.name}`, {
        module: 'traces',
        userId: user.id,
        projectId: traceData.projectId,
        workspaceId: traceData.workspaceId,
      });

      const trace = await TraceService.createTrace(traceData, user);
      
      apiLogger.info(`Trace created successfully: ${trace.id}`, {
        module: 'traces',
        traceId: trace.id,
      });

      return reply.status(201).send({
        success: true,
        data: trace,
      });

    } catch (error) {
      console.log('=== TRACE CREATION ERROR DETAILS ===');
      console.log('Error:', error);
      console.log('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.log('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.log('Error stack:', error instanceof Error ? error.stack : 'Unknown');
      console.log('=== TRACE CREATION ERROR END ===');

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      if (error instanceof TraceValidationError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          message: error.message,
        });
      }

      logger.error('❌ Error creating trace:', {
        error: error?.message || 'Unknown error',
        errorType: error?.constructor?.name || 'Unknown',  
        errorStack: error?.stack || 'No stack trace available',
        userId: user?.id,
        userName: user?.username,
        requestBody: JSON.stringify(request.body, null, 2),
        module: 'TracesController.createTrace'
      });
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // List traces with filtering and pagination
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { error, value } = listTracesSchema.validate(request.query);
      
      if (error) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.details,
        });
      }

      const filters: TraceListRequest = {
        ...value,
        workspaceId: value.workspaceId || user.workspaceId,
        timeRange: value.startTime && value.endTime ? {
          start: new Date(value.startTime),
          end: new Date(value.endTime),
        } : undefined,
      };

      const response = await service.listTraces(user, filters);
      
      return reply.send({
        success: true,
        data: response,
      });

    } catch (error) {
      logger.error('Error listing traces:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Get trace by ID with spans
  server.get('/:traceId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { traceId } = request.params as { traceId: string };
      
      const summaryRequest: TraceSummaryRequest = {
        traceId,
        includeSpans: true,
        includeMetrics: true,
        includeFeedback: true,
      };

      const traceSummary = await service.getTraceSummary(user, summaryRequest);
      
      return reply.send({
        success: true,
        data: traceSummary,
      });

    } catch (error) {
      if (error instanceof TraceNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Trace not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      logger.error('Error getting trace:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Update trace
  server.patch('/:traceId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { traceId } = request.params as { traceId: string };
      const { error, value } = updateTraceSchema.validate(request.body);
      
      if (error) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.details,
        });
      }

      const trace = await service.updateTrace(user, traceId, value as UpdateTraceRequest);
      
      return reply.send({
        success: true,
        data: trace,
      });

    } catch (error) {
      if (error instanceof TraceNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Trace not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      if (error instanceof TraceStatusError) {
        return reply.status(409).send({
          success: false,
          error: 'Invalid trace status',
          message: error.message,
        });
      }

      logger.error('Error updating trace:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Delete trace
  server.delete('/:traceId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { traceId } = request.params as { traceId: string };

      await service.deleteTrace(user, traceId);
      
      return reply.send({
        success: true,
        message: 'Trace deleted successfully',
      });

    } catch (error) {
      if (error instanceof TraceNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Trace not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      logger.error('Error deleting trace:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Create span for a trace
  server.post('/:traceId/spans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { traceId } = request.params as { traceId: string };
      const { error, value } = createSpanSchema.validate(request.body);
      
      if (error) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.details,
        });
      }

      // Ensure traceId matches the URL parameter
      const spanData: CreateSpanRequest = {
        ...value,
        traceId,
      };

      const span = await service.createSpan(user, spanData);
      
      return reply.status(201).send({
        success: true,
        data: span,
      });

    } catch (error) {
      if (error instanceof TraceNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Trace not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      if (error instanceof SpanHierarchyError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid span hierarchy',
          message: error.message,
        });
      }

      logger.error('Error creating span:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Get spans for a trace
  server.get('/:traceId/spans', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { traceId } = request.params as { traceId: string };
      const { page = 1, limit = 50 } = request.query as { page?: number, limit?: number };

      const spanListRequest = {
        traceId,
        page,
        limit,
      };

      const spans = await service.listSpans(user, spanListRequest);
      
      return reply.send({
        success: true,
        data: spans,
      });

    } catch (error) {
      if (error instanceof TraceNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Trace not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      logger.error('Error getting spans:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Update span
  server.patch('/spans/:spanId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { spanId } = request.params as { spanId: string };
      const { error, value } = updateSpanSchema.validate(request.body);
      
      if (error) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.details,
        });
      }

      const span = await service.updateSpan(user, spanId, value as UpdateSpanRequest);
      
      return reply.send({
        success: true,
        data: span,
      });

    } catch (error) {
      if (error instanceof SpanNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Span not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      logger.error('Error updating span:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  // Add feedback to trace or span
  server.post('/feedback', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user!;
      const { error, value } = createFeedbackSchema.validate(request.body);
      
      if (error) {
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: error.details,
        });
      }

      const feedback = await service.createFeedback(user, value as CreateFeedbackRequest);
      
      return reply.status(201).send({
        success: true,
        data: feedback,
      });

    } catch (error) {
      if (error instanceof TraceNotFoundError || error instanceof SpanNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'Target not found',
        });
      }

      if (error instanceof TracePermissionError) {
        return reply.status(403).send({
          success: false,
          error: 'Permission denied',
          message: error.message,
        });
      }

      logger.error('Error creating feedback:', error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
      });
    }
  });

  logger.info('✅ Traces controller registered with full authentication integration', {
    module: 'traces',
  });
}