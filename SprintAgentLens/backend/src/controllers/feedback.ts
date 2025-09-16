/**
 * Feedback Controller with enterprise authentication
 * Provides comprehensive feedback and scoring system endpoints with RBAC
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { feedbackService } from '../services/FeedbackService';
import type {
  AuthenticatedUser,
  CreateFeedbackDefinitionRequest,
  UpdateFeedbackDefinitionRequest,
  CreateFeedbackInstanceRequest,
  BulkCreateFeedbackRequest,
  FeedbackListRequest,
  FeedbackAggregationRequest,
  FeedbackScope,
  FeedbackType,
  FeedbackValue,
} from '../types/feedback';
import { logger } from '../utils/logger';

// Request/Response Types for FastifyRequest
interface CreateDefinitionBody extends CreateFeedbackDefinitionRequest {}
interface UpdateDefinitionBody extends UpdateFeedbackDefinitionRequest {}
interface CreateFeedbackBody extends CreateFeedbackInstanceRequest {}
interface BulkCreateFeedbackBody extends BulkCreateFeedbackRequest {}

interface FeedbackParams {
  id: string;
}

interface DefinitionParams {
  id: string;
}

interface FeedbackQuery extends Partial<FeedbackListRequest> {
  workspaceId?: string;
  definitionId?: string;
  entityType?: string;
  entityId?: string;
  entityIds?: string;
  projectId?: string;
  experimentId?: string;
  valueRange?: string;
  categoricalValues?: string;
  source?: string;
  userId?: string;
  isVerified?: string;
  startTime?: string;
  endTime?: string;
  searchQuery?: string;
  searchFields?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
}

interface AggregationQuery extends Omit<FeedbackAggregationRequest, 'definitionIds' | 'aggregationTypes' | 'timeWindows' | 'filters'> {
  definitionIds: string;
  aggregationTypes: string;
  timeWindows?: string;
  groupBy?: string;
  filters?: string;
  startTime?: string;
  endTime?: string;
  includeStatistics?: string;
  confidenceLevel?: string;
}

interface InsightsParams {
  entityType: string;
  entityId: string;
}

interface UpdateFeedbackValueBody {
  value: FeedbackValue;
}

export class FeedbackController {
  
  // Feedback Definition Endpoints
  static async createDefinition(
    request: FastifyRequest<{ Body: CreateDefinitionBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const definitionRequest = request.body;

      logger.info('Creating feedback definition', {
        name: definitionRequest.name,
        type: definitionRequest.type,
        scope: definitionRequest.scope,
        userId: user.id,
      });

      const definition = await feedbackService.createDefinition(definitionRequest, user);

      reply.status(201).send({
        success: true,
        data: definition,
        message: 'Feedback definition created successfully',
      });

    } catch (error) {
      logger.error('Failed to create feedback definition', {
        error: error.message,
        stack: error.stack,
        body: request.body,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackDefinitionError' ? 400 :
                        error.name === 'FeedbackValidationError' ? 400 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
          field: error.field,
        },
      });
    }
  }

  static async updateDefinition(
    request: FastifyRequest<{ Params: DefinitionParams; Body: UpdateDefinitionBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;
      const updateRequest = request.body;

      logger.info('Updating feedback definition', {
        definitionId: id,
        userId: user.id,
        changes: Object.keys(updateRequest),
      });

      const definition = await feedbackService.updateDefinition(id, updateRequest, user);

      reply.send({
        success: true,
        data: definition,
        message: 'Feedback definition updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update feedback definition', {
        error: error.message,
        definitionId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackDefinitionNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 :
                        error.name === 'FeedbackValidationError' ? 400 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async deleteDefinition(
    request: FastifyRequest<{ Params: DefinitionParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Deleting feedback definition', {
        definitionId: id,
        userId: user.id,
      });

      await feedbackService.deleteDefinition(id, user);

      reply.send({
        success: true,
        message: 'Feedback definition deleted successfully',
      });

    } catch (error) {
      logger.error('Failed to delete feedback definition', {
        error: error.message,
        definitionId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackDefinitionNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getDefinition(
    request: FastifyRequest<{ Params: DefinitionParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Getting feedback definition', {
        definitionId: id,
        userId: user.id,
      });

      const definition = await feedbackService.getDefinition(id, user);

      reply.send({
        success: true,
        data: definition,
      });

    } catch (error) {
      logger.error('Failed to get feedback definition', {
        error: error.message,
        definitionId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackDefinitionNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async listDefinitions(
    request: FastifyRequest<{ Querystring: { workspaceId?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const workspaceId = request.query.workspaceId || user.workspaceId;

      logger.info('Listing feedback definitions', {
        workspaceId,
        userId: user.id,
      });

      const definitions = await feedbackService.listDefinitions(workspaceId, user);

      reply.send({
        success: true,
        data: definitions,
        count: definitions.length,
      });

    } catch (error) {
      logger.error('Failed to list feedback definitions', {
        error: error.message,
        query: request.query,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Feedback Instance Endpoints
  static async createFeedback(
    request: FastifyRequest<{ Body: CreateFeedbackBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const feedbackRequest = request.body;

      logger.info('Creating feedback instance', {
        definitionId: feedbackRequest.definitionId,
        entityType: feedbackRequest.entityType,
        entityId: feedbackRequest.entityId,
        userId: user.id,
      });

      const feedback = await feedbackService.createFeedback(feedbackRequest, user);

      reply.status(201).send({
        success: true,
        data: feedback,
        message: 'Feedback created successfully',
      });

    } catch (error) {
      logger.error('Failed to create feedback instance', {
        error: error.message,
        stack: error.stack,
        body: request.body,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackDefinitionNotFoundError' ? 404 :
                        error.name === 'FeedbackValidationError' ? 400 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
          field: error.field,
        },
      });
    }
  }

  static async bulkCreateFeedback(
    request: FastifyRequest<{ Body: BulkCreateFeedbackBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const bulkRequest = request.body;

      logger.info('Bulk creating feedback instances', {
        count: bulkRequest.instances.length,
        userId: user.id,
      });

      const result = await feedbackService.bulkCreateFeedback(bulkRequest, user);

      reply.status(201).send({
        success: true,
        data: result,
        message: `Bulk feedback creation completed. Created: ${result.created}, Errors: ${result.errors.length}`,
      });

    } catch (error) {
      logger.error('Failed to bulk create feedback', {
        error: error.message,
        count: request.body.instances.length,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async updateFeedback(
    request: FastifyRequest<{ Params: FeedbackParams; Body: UpdateFeedbackValueBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;
      const { value } = request.body;

      logger.info('Updating feedback instance', {
        feedbackId: id,
        userId: user.id,
      });

      const feedback = await feedbackService.updateFeedback(id, value, user);

      reply.send({
        success: true,
        data: feedback,
        message: 'Feedback updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update feedback instance', {
        error: error.message,
        feedbackId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 :
                        error.name === 'FeedbackValidationError' ? 400 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async deleteFeedback(
    request: FastifyRequest<{ Params: FeedbackParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Deleting feedback instance', {
        feedbackId: id,
        userId: user.id,
      });

      await feedbackService.deleteFeedback(id, user);

      reply.send({
        success: true,
        message: 'Feedback deleted successfully',
      });

    } catch (error) {
      logger.error('Failed to delete feedback instance', {
        error: error.message,
        feedbackId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getFeedback(
    request: FastifyRequest<{ Params: FeedbackParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Getting feedback instance', {
        feedbackId: id,
        userId: user.id,
      });

      const feedback = await feedbackService.getFeedback(id, user);

      reply.send({
        success: true,
        data: feedback,
      });

    } catch (error) {
      logger.error('Failed to get feedback instance', {
        error: error.message,
        feedbackId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async listFeedback(
    request: FastifyRequest<{ Querystring: FeedbackQuery }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const query = request.query;

      logger.info('Listing feedback instances', {
        query,
        userId: user.id,
      });

      // Parse query parameters
      const listRequest: FeedbackListRequest = {
        workspaceId: query.workspaceId,
        definitionId: query.definitionId,
        entityType: query.entityType as FeedbackScope,
        entityId: query.entityId,
        entityIds: query.entityIds ? query.entityIds.split(',') : undefined,
        projectId: query.projectId,
        experimentId: query.experimentId,
        valueRange: query.valueRange ? {
          min: query.valueRange.includes('-') ? parseFloat(query.valueRange.split('-')[0]) : undefined,
          max: query.valueRange.includes('-') ? parseFloat(query.valueRange.split('-')[1]) : undefined,
        } : undefined,
        categoricalValues: query.categoricalValues ? query.categoricalValues.split(',') : undefined,
        source: query.source as any,
        userId: query.userId,
        isVerified: query.isVerified ? query.isVerified === 'true' : undefined,
        timeRange: (query.startTime && query.endTime) ? {
          start: new Date(query.startTime),
          end: new Date(query.endTime),
        } : undefined,
        searchQuery: query.searchQuery,
        searchFields: query.searchFields ? query.searchFields.split(',') : undefined,
        sortBy: query.sortBy as any,
        sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? Math.min(parseInt(query.limit), 100) : 20,
      };

      const result = await feedbackService.listFeedback(listRequest, user);

      reply.send({
        success: true,
        data: result.instances,
        pagination: result.pagination,
        aggregations: result.aggregations,
      });

    } catch (error) {
      logger.error('Failed to list feedback instances', {
        error: error.message,
        query: request.query,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Verification Endpoints
  static async verifyFeedback(
    request: FastifyRequest<{ Params: FeedbackParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Verifying feedback instance', {
        feedbackId: id,
        userId: user.id,
      });

      const feedback = await feedbackService.verifyFeedback(id, user);

      reply.send({
        success: true,
        data: feedback,
        message: 'Feedback verified successfully',
      });

    } catch (error) {
      logger.error('Failed to verify feedback instance', {
        error: error.message,
        feedbackId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async unverifyFeedback(
    request: FastifyRequest<{ Params: FeedbackParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Unverifying feedback instance', {
        feedbackId: id,
        userId: user.id,
      });

      const feedback = await feedbackService.unverifyFeedback(id, user);

      reply.send({
        success: true,
        data: feedback,
        message: 'Feedback unverified successfully',
      });

    } catch (error) {
      logger.error('Failed to unverify feedback instance', {
        error: error.message,
        feedbackId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackNotFoundError' ? 404 :
                        error.name === 'FeedbackPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Aggregation and Analytics Endpoints
  static async aggregateFeedback(
    request: FastifyRequest<{ Querystring: AggregationQuery }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const query = request.query;

      logger.info('Aggregating feedback data', {
        definitionIds: query.definitionIds,
        aggregationTypes: query.aggregationTypes,
        userId: user.id,
      });

      // Parse query parameters
      const aggregationRequest: FeedbackAggregationRequest = {
        workspaceId: query.workspaceId,
        definitionIds: query.definitionIds.split(','),
        entityType: query.entityType as FeedbackScope,
        entityIds: query.entityIds ? query.entityIds.split(',') : undefined,
        projectId: query.projectId,
        experimentId: query.experimentId,
        aggregationTypes: query.aggregationTypes.split(',') as any[],
        timeWindows: query.timeWindows ? JSON.parse(query.timeWindows) : undefined,
        groupBy: query.groupBy ? query.groupBy.split(',') : undefined,
        filters: query.filters ? JSON.parse(query.filters) : undefined,
        timeRange: (query.startTime && query.endTime) ? {
          start: new Date(query.startTime),
          end: new Date(query.endTime),
        } : undefined,
        includeStatistics: query.includeStatistics === 'true',
        confidenceLevel: query.confidenceLevel ? parseFloat(query.confidenceLevel) : undefined,
      };

      const result = await feedbackService.aggregateFeedback(aggregationRequest, user);

      reply.send({
        success: true,
        data: result.results,
        summary: result.summary,
        insights: result.insights,
      });

    } catch (error) {
      logger.error('Failed to aggregate feedback data', {
        error: error.message,
        query: request.query,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getFeedbackInsights(
    request: FastifyRequest<{ Params: InsightsParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { entityType, entityId } = request.params;

      logger.info('Getting feedback insights', {
        entityType,
        entityId,
        userId: user.id,
      });

      const insights = await feedbackService.getFeedbackInsights(
        entityType as FeedbackScope,
        entityId,
        user
      );

      reply.send({
        success: true,
        data: insights,
        count: insights.length,
      });

    } catch (error) {
      logger.error('Failed to get feedback insights', {
        error: error.message,
        entityType: request.params.entityType,
        entityId: request.params.entityId,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getEntityFeedbackSummary(
    request: FastifyRequest<{ Params: InsightsParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { entityType, entityId } = request.params;

      logger.info('Getting entity feedback summary', {
        entityType,
        entityId,
        userId: user.id,
      });

      const summary = await feedbackService.getEntityFeedbackSummary(
        entityType as FeedbackScope,
        entityId,
        user
      );

      reply.send({
        success: true,
        data: summary,
      });

    } catch (error) {
      logger.error('Failed to get entity feedback summary', {
        error: error.message,
        entityType: request.params.entityType,
        entityId: request.params.entityId,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Utility Endpoints
  static async validateFeedbackValue(
    request: FastifyRequest<{ 
      Params: { definitionId: string };
      Body: { value: FeedbackValue };
    }>,
    reply: FastifyReply
  ) {
    try {
      const { definitionId } = request.params;
      const { value } = request.body;

      logger.info('Validating feedback value', {
        definitionId,
        userId: request.user?.id,
      });

      const isValid = await feedbackService.validateFeedbackValue(definitionId, value);

      reply.send({
        success: true,
        data: { isValid },
      });

    } catch (error) {
      logger.error('Failed to validate feedback value', {
        error: error.message,
        definitionId: request.params.definitionId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'FeedbackDefinitionNotFoundError' ? 404 :
                        error.name === 'FeedbackValidationError' ? 400 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getFeedbackTypes(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const feedbackTypes: { value: FeedbackType; label: string; description: string }[] = [
        {
          value: 'numerical',
          label: 'Numerical',
          description: 'Numeric values with min/max ranges and precision control',
        },
        {
          value: 'categorical',
          label: 'Categorical',
          description: 'Predefined categories with optional custom values',
        },
        {
          value: 'boolean',
          label: 'Boolean',
          description: 'True/false values with customizable labels',
        },
        {
          value: 'text',
          label: 'Text',
          description: 'Free-form text input with length validation',
        },
        {
          value: 'likert_scale',
          label: 'Likert Scale',
          description: 'Rating scale (1-10) with customizable endpoints',
        },
      ];

      reply.send({
        success: true,
        data: feedbackTypes,
      });

    } catch (error) {
      logger.error('Failed to get feedback types', {
        error: error.message,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getFeedbackScopes(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const feedbackScopes: { value: FeedbackScope; label: string; description: string }[] = [
        {
          value: 'trace',
          label: 'Trace',
          description: 'Feedback on entire traces/requests',
        },
        {
          value: 'span',
          label: 'Span',
          description: 'Feedback on individual spans/operations',
        },
        {
          value: 'experiment',
          label: 'Experiment',
          description: 'Feedback on experiment runs and results',
        },
        {
          value: 'dataset',
          label: 'Dataset',
          description: 'Feedback on datasets and data items',
        },
        {
          value: 'model',
          label: 'Model',
          description: 'Feedback on model performance and outputs',
        },
        {
          value: 'global',
          label: 'Global',
          description: 'General feedback not tied to specific entities',
        },
      ];

      reply.send({
        success: true,
        data: feedbackScopes,
      });

    } catch (error) {
      logger.error('Failed to get feedback scopes', {
        error: error.message,
        userId: request.user?.id,
      });

      reply.status(500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }
}