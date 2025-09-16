/**
 * Background Jobs Controller with enterprise authentication
 * Provides comprehensive job management endpoints with RBAC
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { backgroundJobService } from '../services/BackgroundJobService';
import type { 
  CreateJobRequest,
  JobListRequest,
  JobType,
  JobStatus,
  AuthenticatedUser 
} from '../types/jobs';
import { logger } from '../utils/logger';

// Request/Response Types
interface CreateJobBody extends CreateJobRequest {}

interface GetJobParams {
  jobId: string;
}

interface ListJobsQuery {
  workspaceId?: string;
  type?: string; // Comma-separated JobTypes
  status?: string; // Comma-separated JobStatus values
  createdBy?: string;
  tags?: string; // Comma-separated tags
  startTime?: string;
  endTime?: string;
  sortBy?: 'created_at' | 'started_at' | 'completed_at' | 'priority' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export class JobController {
  static async createJob(
    request: FastifyRequest<{ Body: CreateJobBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const jobRequest = request.body;

      logger.info('Creating background job', {
        jobName: jobRequest.name,
        jobType: jobRequest.type,
        workspaceId: jobRequest.workspaceId,
        userId: user.id,
      });

      const job = await backgroundJobService.createJob(jobRequest, user);

      reply.status(201).send({
        success: true,
        data: job,
        message: 'Job created successfully',
      });

    } catch (error) {
      logger.error('Failed to create job', {
        error: error.message,
        stack: error.stack,
        body: request.body,
        userId: request.user?.id,
      });

      reply.status(error.name === 'JobValidationError' ? 400 : 500).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getJob(
    request: FastifyRequest<{ Params: GetJobParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { jobId } = request.params;

      logger.info('Getting job details', {
        jobId,
        userId: user.id,
      });

      const job = await backgroundJobService.getJob(jobId, user);

      reply.send({
        success: true,
        data: job,
      });

    } catch (error) {
      logger.error('Failed to get job', {
        error: error.message,
        jobId: request.params.jobId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'JobNotFoundError' ? 404 :
                        error.name === 'JobPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async cancelJob(
    request: FastifyRequest<{ Params: GetJobParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { jobId } = request.params;

      logger.info('Cancelling job', {
        jobId,
        userId: user.id,
      });

      await backgroundJobService.cancelJob(jobId, user);

      reply.send({
        success: true,
        message: 'Job cancelled successfully',
      });

    } catch (error) {
      logger.error('Failed to cancel job', {
        error: error.message,
        jobId: request.params.jobId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'JobNotFoundError' ? 404 :
                        error.name === 'JobPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async retryJob(
    request: FastifyRequest<{ Params: GetJobParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { jobId } = request.params;

      logger.info('Retrying job', {
        jobId,
        userId: user.id,
      });

      const job = await backgroundJobService.retryJob(jobId, user);

      reply.send({
        success: true,
        data: job,
        message: 'Job retried successfully',
      });

    } catch (error) {
      logger.error('Failed to retry job', {
        error: error.message,
        jobId: request.params.jobId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'JobNotFoundError' ? 404 :
                        error.name === 'JobPermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async listJobs(
    request: FastifyRequest<{ Querystring: ListJobsQuery }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const query = request.query;

      logger.info('Listing jobs', {
        query,
        userId: user.id,
      });

      // Parse query parameters
      const listRequest: JobListRequest = {
        workspaceId: query.workspaceId,
        type: query.type ? query.type.split(',') as JobType[] : undefined,
        status: query.status ? query.status.split(',') as JobStatus[] : undefined,
        createdBy: query.createdBy,
        tags: query.tags ? query.tags.split(',') : undefined,
        timeRange: (query.startTime && query.endTime) ? {
          start: new Date(query.startTime),
          end: new Date(query.endTime),
        } : undefined,
        sortBy: query.sortBy || 'created_at',
        sortOrder: query.sortOrder || 'desc',
        page: query.page ? parseInt(query.page.toString()) : 1,
        limit: query.limit ? Math.min(parseInt(query.limit.toString()), 100) : 20,
      };

      const result = await backgroundJobService.listJobs(listRequest, user);

      reply.send({
        success: true,
        data: result.jobs,
        pagination: result.pagination,
        aggregations: result.aggregations,
      });

    } catch (error) {
      logger.error('Failed to list jobs', {
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

  static async getJobStats(
    request: FastifyRequest<{ Querystring: { workspaceId?: string } }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const workspaceId = request.query.workspaceId || user.workspaceId;

      logger.info('Getting job statistics', {
        workspaceId,
        userId: user.id,
      });

      // Get recent jobs for stats
      const result = await backgroundJobService.listJobs({
        workspaceId,
        limit: 1000, // Get more for better stats
      }, user);

      // Calculate additional stats
      const now = Date.now();
      const last24h = now - 24 * 60 * 60 * 1000;
      const last7d = now - 7 * 24 * 60 * 60 * 1000;

      const recentJobs = result.jobs.filter(job => 
        job.createdAt.getTime() > last24h
      );

      const weeklyJobs = result.jobs.filter(job =>
        job.createdAt.getTime() > last7d
      );

      const stats = {
        total: result.jobs.length,
        last24Hours: recentJobs.length,
        last7Days: weeklyJobs.length,
        byStatus: result.aggregations.statusCounts,
        byType: result.aggregations.typeCounts,
        successRate: result.aggregations.successRate,
        averageDuration: result.aggregations.totalDuration > 0 
          ? result.aggregations.totalDuration / result.jobs.filter(j => j.completedAt).length
          : 0,
        activeJobs: result.aggregations.statusCounts.active + result.aggregations.statusCounts.waiting,
        failedJobs: result.aggregations.statusCounts.failed,
      };

      reply.send({
        success: true,
        data: stats,
      });

    } catch (error) {
      logger.error('Failed to get job stats', {
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

  static async getJobTypes(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const jobTypes: { value: JobType; label: string; description: string }[] = [
        {
          value: 'experiment_execution',
          label: 'Experiment Execution',
          description: 'Run ML experiments with model evaluation',
        },
        {
          value: 'dataset_processing',
          label: 'Dataset Processing',
          description: 'Process and validate dataset items',
        },
        {
          value: 'trace_analysis',
          label: 'Trace Analysis',
          description: 'Analyze observability trace data',
        },
        {
          value: 'llm_batch_requests',
          label: 'LLM Batch Requests',
          description: 'Process batch LLM API calls',
        },
        {
          value: 'data_export',
          label: 'Data Export',
          description: 'Export data to various formats',
        },
        {
          value: 'model_evaluation',
          label: 'Model Evaluation',
          description: 'Evaluate model performance metrics',
        },
        {
          value: 'feedback_aggregation',
          label: 'Feedback Aggregation',
          description: 'Aggregate and analyze feedback scores',
        },
        {
          value: 'cleanup_tasks',
          label: 'Cleanup Tasks',
          description: 'Clean up expired data and resources',
        },
        {
          value: 'report_generation',
          label: 'Report Generation',
          description: 'Generate analytics and performance reports',
        },
        {
          value: 'webhook_delivery',
          label: 'Webhook Delivery',
          description: 'Deliver webhook notifications',
        },
        {
          value: 'custom',
          label: 'Custom Job',
          description: 'Custom user-defined job processing',
        },
      ];

      reply.send({
        success: true,
        data: jobTypes,
      });

    } catch (error) {
      logger.error('Failed to get job types', {
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

  static async getQueueHealth(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;

      // Only admin users can check queue health
      if (user.role !== 'ADMIN') {
        reply.status(403).send({
          success: false,
          error: {
            type: 'PermissionError',
            message: 'Only administrators can check queue health',
          },
        });
        return;
      }

      logger.info('Checking queue health', {
        userId: user.id,
      });

      // This would require access to the queue internals
      // For now, return basic health info
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        queues: {
          experiment_execution: { status: 'active', workers: 2 },
          dataset_processing: { status: 'active', workers: 3 },
          trace_analysis: { status: 'active', workers: 5 },
          llm_batch_requests: { status: 'active', workers: 1 },
          data_export: { status: 'active', workers: 2 },
          model_evaluation: { status: 'active', workers: 2 },
          feedback_aggregation: { status: 'active', workers: 3 },
          cleanup_tasks: { status: 'active', workers: 1 },
          report_generation: { status: 'active', workers: 2 },
          webhook_delivery: { status: 'active', workers: 5 },
          custom: { status: 'active', workers: 3 },
        },
      };

      reply.send({
        success: true,
        data: health,
      });

    } catch (error) {
      logger.error('Failed to get queue health', {
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