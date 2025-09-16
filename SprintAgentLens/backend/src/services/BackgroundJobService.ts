/**
 * Background Job Service with enterprise authentication and workspace isolation
 * Provides comprehensive job management with Bull/BullMQ integration
 */

import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import type { 
  AuthenticatedUser,
  BackgroundJobService as IBackgroundJobService,
  CreateJobRequest,
  JobResponse,
  JobListRequest,
  JobListResponse,
  JobType,
  JobStatus,
  JobProgress,
  JobResult,
  JobOptions
} from '../types/jobs';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { validateWorkspaceAccess, checkResourcePermission } from '../utils/auth';
import { JobNotFoundError, JobPermissionError, JobValidationError } from '../types/jobs';

export class BackgroundJobService implements IBackgroundJobService {
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();
  private redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
    });

    this.initializeQueues();
    this.initializeWorkers();
  }

  private initializeQueues(): void {
    const jobTypes: JobType[] = [
      'experiment_execution',
      'dataset_processing', 
      'trace_analysis',
      'llm_batch_requests',
      'data_export',
      'model_evaluation',
      'feedback_aggregation',
      'cleanup_tasks',
      'report_generation',
      'webhook_delivery',
      'custom'
    ];

    jobTypes.forEach(type => {
      const queue = new Queue(`jobs:${type}`, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 10,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      });

      this.queues.set(type, queue);
      logger.info(`Initialized queue for job type: ${type}`);
    });
  }

  private initializeWorkers(): void {
    this.queues.forEach((queue, jobType) => {
      const worker = new Worker(`jobs:${jobType}`, async (job) => {
        return this.processJob(job);
      }, {
        connection: this.redis,
        concurrency: this.getConcurrencyForJobType(jobType),
      });

      worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed successfully`, {
          jobType,
          jobId: job.id,
          duration: Date.now() - job.processedOn!,
        });
      });

      worker.on('failed', (job, err) => {
        logger.error(`Job ${job?.id} failed`, {
          jobType,
          jobId: job?.id,
          error: err.message,
          stack: err.stack,
        });
      });

      this.workers.set(jobType, worker);
      logger.info(`Initialized worker for job type: ${jobType}`);
    });
  }

  private getConcurrencyForJobType(jobType: JobType): number {
    const concurrencyMap: Record<JobType, number> = {
      experiment_execution: 2,
      dataset_processing: 3,
      trace_analysis: 5,
      llm_batch_requests: 1,
      data_export: 2,
      model_evaluation: 2,
      feedback_aggregation: 3,
      cleanup_tasks: 1,
      report_generation: 2,
      webhook_delivery: 5,
      custom: 3,
    };

    return concurrencyMap[jobType] || 3;
  }

  async createJob(request: CreateJobRequest, user: AuthenticatedUser): Promise<JobResponse> {
    try {
      // Validate workspace access
      await validateWorkspaceAccess(user, request.workspaceId);

      // Validate request
      this.validateCreateJobRequest(request);

      // Get the appropriate queue
      const queue = this.queues.get(request.type);
      if (!queue) {
        throw new JobValidationError('type', `Unsupported job type: ${request.type}`);
      }

      // Prepare job data with authentication context
      const jobData = {
        ...request,
        userId: user.id,
        userName: user.fullName || user.username,
        createdAt: new Date(),
      };

      // Add job to queue
      const job = await queue.add(
        request.name,
        jobData,
        {
          priority: this.getPriorityValue(request.options?.priority || 'normal'),
          delay: request.options?.delay,
          attempts: request.options?.attempts || 3,
          timeout: request.options?.timeout,
          removeOnComplete: request.options?.removeOnComplete !== false ? 10 : false,
          removeOnFail: request.options?.removeOnFail !== false ? 10 : false,
          backoff: request.options?.backoff,
        }
      );

      // Get workspace name
      const workspace = await this.getWorkspaceInfo(request.workspaceId);

      return this.formatJobResponse(job, workspace.name, user);

    } catch (error) {
      logger.error('Failed to create job', {
        error: error.message,
        stack: error.stack,
        request,
        userId: user.id,
      });
      throw error;
    }
  }

  async getJob(jobId: string, user: AuthenticatedUser): Promise<JobResponse> {
    try {
      const job = await this.findJobById(jobId);
      if (!job) {
        throw new JobNotFoundError(jobId);
      }

      // Check workspace access
      const jobData = job.data as any;
      await validateWorkspaceAccess(user, jobData.workspaceId);

      // Check if user can read this job
      if (!this.canReadJob(user, jobData)) {
        throw new JobPermissionError('read', jobId);
      }

      const workspace = await this.getWorkspaceInfo(jobData.workspaceId);
      return this.formatJobResponse(job, workspace.name, user);

    } catch (error) {
      logger.error('Failed to get job', {
        error: error.message,
        jobId,
        userId: user.id,
      });
      throw error;
    }
  }

  async cancelJob(jobId: string, user: AuthenticatedUser): Promise<void> {
    try {
      const job = await this.findJobById(jobId);
      if (!job) {
        throw new JobNotFoundError(jobId);
      }

      const jobData = job.data as any;
      await validateWorkspaceAccess(user, jobData.workspaceId);

      // Check if user can cancel this job
      if (!this.canCancelJob(user, jobData)) {
        throw new JobPermissionError('cancel', jobId);
      }

      await job.remove();
      
      logger.info('Job cancelled successfully', {
        jobId,
        userId: user.id,
      });

    } catch (error) {
      logger.error('Failed to cancel job', {
        error: error.message,
        jobId,
        userId: user.id,
      });
      throw error;
    }
  }

  async retryJob(jobId: string, user: AuthenticatedUser): Promise<JobResponse> {
    try {
      const job = await this.findJobById(jobId);
      if (!job) {
        throw new JobNotFoundError(jobId);
      }

      const jobData = job.data as any;
      await validateWorkspaceAccess(user, jobData.workspaceId);

      // Check if user can retry this job
      if (!this.canRetryJob(user, jobData)) {
        throw new JobPermissionError('retry', jobId);
      }

      await job.retry();
      
      const workspace = await this.getWorkspaceInfo(jobData.workspaceId);
      const retried = await this.findJobById(jobId);
      
      logger.info('Job retried successfully', {
        jobId,
        userId: user.id,
      });

      return this.formatJobResponse(retried!, workspace.name, user);

    } catch (error) {
      logger.error('Failed to retry job', {
        error: error.message,
        jobId,
        userId: user.id,
      });
      throw error;
    }
  }

  async listJobs(request: JobListRequest, user: AuthenticatedUser): Promise<JobListResponse> {
    try {
      // Use user's workspace if not specified
      const workspaceId = request.workspaceId || user.workspaceId;
      await validateWorkspaceAccess(user, workspaceId);

      const jobs = await this.getJobsByFilters(request, workspaceId);
      const workspace = await this.getWorkspaceInfo(workspaceId);

      // Filter jobs by permissions
      const accessibleJobs = jobs.filter(job => {
        const jobData = job.data as any;
        return this.canReadJob(user, jobData);
      });

      // Apply pagination
      const page = request.page || 1;
      const limit = Math.min(request.limit || 20, 100);
      const offset = (page - 1) * limit;
      const paginatedJobs = accessibleJobs.slice(offset, offset + limit);

      // Format responses
      const jobResponses = paginatedJobs.map(job => 
        this.formatJobResponse(job, workspace.name, user)
      );

      // Calculate aggregations
      const aggregations = this.calculateAggregations(accessibleJobs);

      return {
        jobs: jobResponses,
        pagination: {
          page,
          limit,
          total: accessibleJobs.length,
          totalPages: Math.ceil(accessibleJobs.length / limit),
        },
        aggregations,
      };

    } catch (error) {
      logger.error('Failed to list jobs', {
        error: error.message,
        request,
        userId: user.id,
      });
      throw error;
    }
  }

  private async processJob(job: Job): Promise<any> {
    const jobData = job.data as any;
    const jobType = jobData.type as JobType;

    logger.info(`Processing job: ${job.id}`, {
      jobType,
      jobName: jobData.name,
      workspaceId: jobData.workspaceId,
    });

    try {
      // Update progress
      await job.updateProgress(0);

      let result: any;

      switch (jobType) {
        case 'experiment_execution':
          result = await this.processExperimentExecution(job);
          break;
        case 'dataset_processing':
          result = await this.processDatasetProcessing(job);
          break;
        case 'trace_analysis':
          result = await this.processTraceAnalysis(job);
          break;
        case 'llm_batch_requests':
          result = await this.processLLMBatchRequests(job);
          break;
        case 'data_export':
          result = await this.processDataExport(job);
          break;
        case 'model_evaluation':
          result = await this.processModelEvaluation(job);
          break;
        case 'feedback_aggregation':
          result = await this.processFeedbackAggregation(job);
          break;
        case 'cleanup_tasks':
          result = await this.processCleanupTasks(job);
          break;
        case 'report_generation':
          result = await this.processReportGeneration(job);
          break;
        case 'webhook_delivery':
          result = await this.processWebhookDelivery(job);
          break;
        case 'custom':
          result = await this.processCustomJob(job);
          break;
        default:
          throw new Error(`Unsupported job type: ${jobType}`);
      }

      await job.updateProgress(100);
      return result;

    } catch (error) {
      logger.error(`Job processing failed: ${job.id}`, {
        error: error.message,
        stack: error.stack,
        jobType,
      });
      throw error;
    }
  }

  // Job processors for different types
  private async processExperimentExecution(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(25);
    
    // Implement experiment execution logic
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
    await job.updateProgress(75);
    
    return { success: true, message: 'Experiment executed successfully' };
  }

  private async processDatasetProcessing(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(20);
    
    // Implement dataset processing logic
    await new Promise(resolve => setTimeout(resolve, 800));
    await job.updateProgress(60);
    
    return { success: true, message: 'Dataset processed successfully' };
  }

  private async processTraceAnalysis(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(30);
    
    // Implement trace analysis logic
    await new Promise(resolve => setTimeout(resolve, 600));
    await job.updateProgress(80);
    
    return { success: true, message: 'Trace analysis completed' };
  }

  private async processLLMBatchRequests(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(10);
    
    // Implement LLM batch processing logic
    await new Promise(resolve => setTimeout(resolve, 2000)); // Longer for LLM calls
    await job.updateProgress(90);
    
    return { success: true, message: 'LLM batch requests completed' };
  }

  private async processDataExport(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(15);
    
    // Implement data export logic
    await new Promise(resolve => setTimeout(resolve, 1200));
    await job.updateProgress(85);
    
    return { success: true, message: 'Data export completed' };
  }

  private async processModelEvaluation(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(20);
    
    // Implement model evaluation logic
    await new Promise(resolve => setTimeout(resolve, 1500));
    await job.updateProgress(90);
    
    return { success: true, message: 'Model evaluation completed' };
  }

  private async processFeedbackAggregation(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(25);
    
    // Implement feedback aggregation logic
    await new Promise(resolve => setTimeout(resolve, 700));
    await job.updateProgress(85);
    
    return { success: true, message: 'Feedback aggregation completed' };
  }

  private async processCleanupTasks(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(30);
    
    // Implement cleanup logic
    await new Promise(resolve => setTimeout(resolve, 500));
    await job.updateProgress(95);
    
    return { success: true, message: 'Cleanup tasks completed' };
  }

  private async processReportGeneration(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(20);
    
    // Implement report generation logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    await job.updateProgress(80);
    
    return { success: true, message: 'Report generation completed' };
  }

  private async processWebhookDelivery(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(50);
    
    // Implement webhook delivery logic
    await new Promise(resolve => setTimeout(resolve, 300));
    await job.updateProgress(95);
    
    return { success: true, message: 'Webhook delivered successfully' };
  }

  private async processCustomJob(job: Job): Promise<any> {
    const data = job.data as any;
    await job.updateProgress(25);
    
    // Implement custom job logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    await job.updateProgress(90);
    
    return { success: true, message: 'Custom job completed' };
  }

  // Helper methods
  private validateCreateJobRequest(request: CreateJobRequest): void {
    if (!request.name || request.name.length < 1 || request.name.length > 255) {
      throw new JobValidationError('name', 'Job name must be between 1 and 255 characters');
    }

    if (!request.workspaceId) {
      throw new JobValidationError('workspaceId', 'Workspace ID is required');
    }

    if (request.options?.attempts && (request.options.attempts < 1 || request.options.attempts > 10)) {
      throw new JobValidationError('attempts', 'Attempts must be between 1 and 10');
    }

    if (request.options?.delay && request.options.delay < 0) {
      throw new JobValidationError('delay', 'Delay must be non-negative');
    }
  }

  private getPriorityValue(priority: 'low' | 'normal' | 'high' | 'critical'): number {
    const priorityMap = {
      low: 1,
      normal: 5,
      high: 10,
      critical: 20,
    };
    return priorityMap[priority];
  }

  private async findJobById(jobId: string): Promise<Job | null> {
    // Search across all queues for the job
    for (const [, queue] of this.queues) {
      try {
        const job = await queue.getJob(jobId);
        if (job) return job;
      } catch (error) {
        // Job not found in this queue, continue searching
        continue;
      }
    }
    return null;
  }

  private async getJobsByFilters(request: JobListRequest, workspaceId: string): Promise<Job[]> {
    const allJobs: Job[] = [];

    for (const [jobType, queue] of this.queues) {
      // Skip if type filter specified and this type not included
      if (request.type && !request.type.includes(jobType)) {
        continue;
      }

      // Get jobs from different states
      const states = request.status || ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'cancelled'];
      
      for (const state of states) {
        try {
          const jobs = await queue.getJobs([state as any], 0, 1000);
          const workspaceJobs = jobs.filter(job => {
            const jobData = job.data as any;
            return jobData.workspaceId === workspaceId;
          });
          allJobs.push(...workspaceJobs);
        } catch (error) {
          // Continue if state not supported
          continue;
        }
      }
    }

    return this.filterAndSortJobs(allJobs, request);
  }

  private filterAndSortJobs(jobs: Job[], request: JobListRequest): Job[] {
    let filtered = jobs;

    // Apply filters
    if (request.createdBy) {
      filtered = filtered.filter(job => {
        const jobData = job.data as any;
        return jobData.userId === request.createdBy;
      });
    }

    if (request.tags) {
      filtered = filtered.filter(job => {
        const jobData = job.data as any;
        const jobTags = jobData.metadata?.tags || [];
        return request.tags!.every(tag => jobTags.includes(tag));
      });
    }

    if (request.timeRange) {
      filtered = filtered.filter(job => {
        const createdAt = new Date(job.timestamp);
        return createdAt >= request.timeRange!.start && createdAt <= request.timeRange!.end;
      });
    }

    // Apply sorting
    const sortBy = request.sortBy || 'created_at';
    const sortOrder = request.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'created_at':
          aValue = a.timestamp;
          bValue = b.timestamp;
          break;
        case 'started_at':
          aValue = a.processedOn || 0;
          bValue = b.processedOn || 0;
          break;
        case 'completed_at':
          aValue = a.finishedOn || 0;
          bValue = b.finishedOn || 0;
          break;
        case 'priority':
          aValue = a.opts.priority || 0;
          bValue = b.opts.priority || 0;
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        default:
          aValue = a.timestamp;
          bValue = b.timestamp;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }

  private calculateAggregations(jobs: Job[]): JobListResponse['aggregations'] {
    const statusCounts: Record<JobStatus, number> = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
      cancelled: 0,
      stalled: 0,
    };

    const typeCounts: Record<JobType, number> = {
      experiment_execution: 0,
      dataset_processing: 0,
      trace_analysis: 0,
      llm_batch_requests: 0,
      data_export: 0,
      model_evaluation: 0,
      feedback_aggregation: 0,
      cleanup_tasks: 0,
      report_generation: 0,
      webhook_delivery: 0,
      custom: 0,
    };

    let totalDuration = 0;
    let completedJobs = 0;
    let successfulJobs = 0;

    jobs.forEach(job => {
      const jobData = job.data as any;
      const status = this.getJobStatus(job);
      const jobType = jobData.type as JobType;

      statusCounts[status]++;
      typeCounts[jobType]++;

      if (job.finishedOn && job.processedOn) {
        totalDuration += job.finishedOn - job.processedOn;
        completedJobs++;
        
        if (status === 'completed') {
          successfulJobs++;
        }
      }
    });

    return {
      statusCounts,
      typeCounts,
      totalDuration,
      successRate: completedJobs > 0 ? (successfulJobs / completedJobs) * 100 : 0,
    };
  }

  private getJobStatus(job: Job): JobStatus {
    if (job.finishedOn) {
      return job.returnvalue ? 'completed' : 'failed';
    }
    
    if (job.processedOn) {
      return 'active';
    }

    if (job.opts.delay && job.opts.delay > Date.now()) {
      return 'delayed';
    }

    return 'waiting';
  }

  private formatJobResponse(job: Job, workspaceName: string, user: AuthenticatedUser): JobResponse {
    const jobData = job.data as any;
    const status = this.getJobStatus(job);
    
    const progress: JobProgress = {
      percentage: job.progress || 0,
      current: 0,
      total: 0,
      logs: [],
    };

    const result: JobResult | undefined = job.returnvalue ? {
      success: true,
      data: job.returnvalue,
      metrics: {
        duration: job.finishedOn && job.processedOn ? job.finishedOn - job.processedOn : 0,
        memoryUsage: 0,
        cpuUsage: 0,
      },
    } : undefined;

    return {
      id: job.id!,
      name: jobData.name,
      type: jobData.type,
      workspaceId: jobData.workspaceId,
      workspaceName,
      payload: jobData.payload || {},
      options: {
        priority: this.getPriorityName(job.opts.priority || 5),
        delay: job.opts.delay,
        attempts: job.opts.attempts || 3,
        timeout: job.opts.timeout,
        removeOnComplete: job.opts.removeOnComplete !== false,
        removeOnFail: job.opts.removeOnFail !== false,
      },
      schedule: jobData.schedule,
      metadata: jobData.metadata || { owner: jobData.userId },
      status,
      progress,
      result,
      createdAt: new Date(job.timestamp),
      createdBy: jobData.userId,
      createdByName: jobData.userName,
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
      completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
      failedAt: job.failedReason ? job.finishedOn ? new Date(job.finishedOn) : undefined : undefined,
      nextRunAt: undefined, // TODO: Implement for scheduled jobs
      canRead: this.canReadJob(user, jobData),
      canCancel: this.canCancelJob(user, jobData),
      canRetry: this.canRetryJob(user, jobData),
      canDelete: this.canDeleteJob(user, jobData),
    };
  }

  private getPriorityName(priority: number): 'low' | 'normal' | 'high' | 'critical' {
    if (priority >= 20) return 'critical';
    if (priority >= 10) return 'high';
    if (priority >= 5) return 'normal';
    return 'low';
  }

  private async getWorkspaceInfo(workspaceId: string) {
    // TODO: Implement workspace service
    return { name: workspaceId };
  }

  // Permission checking methods
  private canReadJob(user: AuthenticatedUser, jobData: any): boolean {
    if (user.role === 'ADMIN') return true;
    return jobData.workspaceId === user.workspaceId;
  }

  private canCancelJob(user: AuthenticatedUser, jobData: any): boolean {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'VIEWER') return false;
    return jobData.workspaceId === user.workspaceId && (
      jobData.userId === user.id || user.role === 'USER'
    );
  }

  private canRetryJob(user: AuthenticatedUser, jobData: any): boolean {
    return this.canCancelJob(user, jobData); // Same permissions as cancel
  }

  private canDeleteJob(user: AuthenticatedUser, jobData: any): boolean {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'VIEWER') return false;
    return jobData.workspaceId === user.workspaceId && jobData.userId === user.id;
  }

  // Cleanup method
  async shutdown(): Promise<void> {
    logger.info('Shutting down background job service');
    
    // Close all workers
    await Promise.all(
      Array.from(this.workers.values()).map(worker => worker.close())
    );
    
    // Close all queues
    await Promise.all(
      Array.from(this.queues.values()).map(queue => queue.close())
    );
    
    // Close Redis connection
    this.redis.disconnect();
    
    logger.info('Background job service shut down complete');
  }
}

// Export singleton instance
export const backgroundJobService = new BackgroundJobService();

// Export error classes for convenience
export * from '../types/jobs';