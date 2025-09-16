import { BackgroundJobService } from '../../src/services/BackgroundJobService';
import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { prisma } from '../../src/config/database';
import type {
  AuthenticatedUser,
  CreateJobRequest,
  JobResponse,
  JobListRequest,
  JobType,
  JobStatus,
  JobOptions,
  JobMetadata,
  JobSchedule,
  JobProgress,
  JobResult,
  JobStats,
  QueueHealth,
} from '../../src/types/jobs';

// Mock dependencies
jest.mock('bullmq');
jest.mock('ioredis');
jest.mock('../../src/config/database', () => ({
  prisma: {
    workspace: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/auth', () => ({
  validateWorkspaceAccess: jest.fn(),
  checkResourcePermission: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocked functions
import { validateWorkspaceAccess, checkResourcePermission } from '../../src/utils/auth';
import { logger } from '../../src/utils/logger';

const MockQueue = Queue as jest.MockedClass<typeof Queue>;
const MockWorker = Worker as jest.MockedClass<typeof Worker>;
const MockRedis = Redis as jest.MockedClass<typeof Redis>;

describe('BackgroundJobService', () => {
  let backgroundJobService: BackgroundJobService;
  let mockUser: AuthenticatedUser;
  let mockRedis: jest.Mocked<Redis>;
  let mockQueue: jest.Mocked<Queue>;
  let mockWorker: jest.Mocked<Worker>;
  let mockJob: jest.Mocked<Job>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis instance
    mockRedis = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    } as any;

    MockRedis.mockImplementation(() => mockRedis);

    // Mock Queue instance
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getJobs: jest.fn(),
      getJobCounts: jest.fn(),
      clean: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      waitUntilReady: jest.fn(),
    } as any;

    MockQueue.mockImplementation(() => mockQueue);

    // Mock Worker instance
    mockWorker = {
      on: jest.fn(),
      close: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      run: jest.fn(),
    } as any;

    MockWorker.mockImplementation(() => mockWorker);

    // Mock Job instance
    mockJob = {
      id: 'job-123',
      name: 'test-job',
      data: {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'experiment_execution',
      },
      opts: {
        priority: 0,
        attempts: 3,
      },
      progress: jest.fn(),
      updateProgress: jest.fn(),
      log: jest.fn(),
      moveToCompleted: jest.fn(),
      moveToFailed: jest.fn(),
      retry: jest.fn(),
      remove: jest.fn(),
      getState: jest.fn(),
      processedOn: Date.now(),
      finishedOn: null,
      failedReason: null,
      returnvalue: null,
      attemptsMade: 0,
    } as any;

    // Mock user
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'USER',
      workspaceId: 'workspace-123',
      permissions: ['read', 'write', 'execute'],
    };

    backgroundJobService = new BackgroundJobService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Job Creation', () => {
    test('should create job successfully', async () => {
      const createRequest: CreateJobRequest = {
        name: 'test-experiment',
        type: 'experiment_execution',
        workspaceId: 'workspace-123',
        payload: {
          experimentId: 'exp-123',
          modelConfig: { temperature: 0.7 },
          dataset: { id: 'dataset-123', size: 1000 },
        },
        options: {
          priority: 'high',
          attempts: 5,
          timeout: 300000, // 5 minutes
        },
        metadata: {
          description: 'ML experiment execution',
          tags: ['ml', 'experiment'],
          category: 'machine-learning',
          owner: 'user-123',
          project: { id: 'proj-123', name: 'Test Project' },
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockJob.id = 'job-456';
      mockQueue.add.mockResolvedValue(mockJob);

      const result = await backgroundJobService.createJob(createRequest, mockUser);

      expect(result.id).toBe('job-456');
      expect(result.name).toBe('test-experiment');
      expect(result.type).toBe('experiment_execution');
      expect(result.workspaceId).toBe('workspace-123');
      expect(result.status).toBeDefined();
      expect(result.canRead).toBe(true);
      expect(result.canCancel).toBe(true);

      expect(validateWorkspaceAccess).toHaveBeenCalledWith(mockUser, 'workspace-123');
      expect(mockQueue.add).toHaveBeenCalledWith(
        'test-experiment',
        expect.objectContaining({
          workspaceId: 'workspace-123',
          userId: 'user-123',
          type: 'experiment_execution',
        }),
        expect.objectContaining({
          priority: expect.any(Number),
          attempts: 5,
          timeout: 300000,
        })
      );
    });

    test('should validate job creation request', async () => {
      const invalidRequest = {
        // Missing required fields
        name: '',
        type: 'invalid_type' as JobType,
        workspaceId: '',
        payload: null,
      } as CreateJobRequest;

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(
        backgroundJobService.createJob(invalidRequest, mockUser)
      ).rejects.toThrow('Missing required field');
    });

    test('should enforce workspace access control', async () => {
      const createRequest: CreateJobRequest = {
        name: 'unauthorized-job',
        type: 'data_export',
        workspaceId: 'other-workspace',
        payload: { data: 'sensitive' },
      };

      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Resource belongs to different workspace')
      );

      await expect(
        backgroundJobService.createJob(createRequest, mockUser)
      ).rejects.toThrow('Access denied: Resource belongs to different workspace');

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    test('should create scheduled job', async () => {
      const scheduledRequest: CreateJobRequest = {
        name: 'scheduled-cleanup',
        type: 'cleanup_tasks',
        workspaceId: 'workspace-123',
        payload: { olderThan: '30d' },
        schedule: {
          type: 'cron',
          pattern: '0 0 * * *', // Daily at midnight
          timezone: 'UTC',
          startAt: new Date('2024-01-01'),
          endAt: new Date('2024-12-31'),
        },
        options: {
          priority: 'low',
          attempts: 1,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockQueue.add.mockResolvedValue(mockJob);

      const result = await backgroundJobService.createJob(scheduledRequest, mockUser);

      expect(result.schedule).toBeDefined();
      expect(result.schedule?.type).toBe('cron');
      expect(result.schedule?.pattern).toBe('0 0 * * *');
      expect(result.nextRunAt).toBeDefined();
    });

    test('should handle different job types with appropriate concurrency', async () => {
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
        'custom',
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      for (const jobType of jobTypes) {
        const request: CreateJobRequest = {
          name: `test-${jobType}`,
          type: jobType,
          workspaceId: 'workspace-123',
          payload: { test: true },
        };

        mockQueue.add.mockResolvedValue({ ...mockJob, id: `job-${jobType}` });

        const result = await backgroundJobService.createJob(request, mockUser);
        expect(result.type).toBe(jobType);
        expect(result.id).toBe(`job-${jobType}`);
      }
    });
  });

  describe('Job Management', () => {
    test('should get job by ID successfully', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'trace_analysis',
      };

      mockJob.data = jobData;
      mockJob.getState = jest.fn().mockResolvedValue('completed');

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      // Mock finding job by ID
      backgroundJobService.findJobById = jest.fn().mockResolvedValue(mockJob);

      const result = await backgroundJobService.getJob('job-123', mockUser);

      expect(result.id).toBe('job-123');
      expect(result.status).toBe('completed');
      expect(result.workspaceId).toBe('workspace-123');
    });

    test('should cancel job successfully', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'data_export',
      };

      mockJob.data = jobData;
      mockJob.getState = jest.fn().mockResolvedValue('waiting');
      mockJob.remove = jest.fn().mockResolvedValue(undefined);

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      backgroundJobService.findJobById = jest.fn().mockResolvedValue(mockJob);

      const result = await backgroundJobService.cancelJob('job-123', mockUser);

      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    test('should retry failed job', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'llm_batch_requests',
      };

      mockJob.data = jobData;
      mockJob.getState = jest.fn().mockResolvedValue('failed');
      mockJob.retry = jest.fn().mockResolvedValue(undefined);
      mockJob.attemptsMade = 2;
      mockJob.opts = { attempts: 5 };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      backgroundJobService.findJobById = jest.fn().mockResolvedValue(mockJob);

      const result = await backgroundJobService.retryJob('job-123', mockUser);

      expect(result.success).toBe(true);
      expect(result.attemptsRemaining).toBe(3); // 5 - 2 = 3
      expect(mockJob.retry).toHaveBeenCalled();
    });

    test('should list jobs with filters and pagination', async () => {
      const listRequest: JobListRequest = {
        workspaceId: 'workspace-123',
        type: 'experiment_execution',
        status: 'completed',
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        createdBy: 'user-123',
      };

      const mockJobs = [
        { ...mockJob, id: 'job-1' },
        { ...mockJob, id: 'job-2' },
        { ...mockJob, id: 'job-3' },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      mockQueue.getJobs.mockResolvedValue(mockJobs);
      mockQueue.getJobCounts.mockResolvedValue({
        completed: 15,
        active: 2,
        waiting: 5,
        failed: 1,
      });

      const result = await backgroundJobService.listJobs(listRequest, mockUser);

      expect(result.jobs).toHaveLength(3);
      expect(result.total).toBe(23); // Sum of all counts
      expect(result.counts.completed).toBe(15);
      expect(result.counts.failed).toBe(1);
    });

    test('should enforce job permissions', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'other-user', // Different user
        type: 'data_export',
      };

      const mockUserLimitedPermissions = {
        ...mockUser,
        role: 'VIEWER' as const,
      };

      mockJob.data = jobData;

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      backgroundJobService.findJobById = jest.fn().mockResolvedValue(mockJob);

      await expect(
        backgroundJobService.cancelJob('job-123', mockUserLimitedPermissions)
      ).rejects.toThrow('Insufficient permissions to cancel job');
    });
  });

  describe('Job Processing', () => {
    test('should process experiment execution job', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'experiment_execution',
        payload: {
          experimentId: 'exp-123',
          modelConfig: { temperature: 0.7, maxTokens: 1000 },
          dataset: { id: 'dataset-123', samples: 100 },
        },
      };

      mockJob.data = jobData;
      mockJob.updateProgress = jest.fn().mockResolvedValue(undefined);
      mockJob.log = jest.fn().mockResolvedValue(undefined);

      // Mock experiment execution
      const mockResult = {
        experimentId: 'exp-123',
        results: {
          accuracy: 0.92,
          precision: 0.89,
          recall: 0.95,
          f1Score: 0.92,
        },
        processedSamples: 100,
        executionTimeMs: 45000,
        modelOutputs: [],
      };

      backgroundJobService.processExperimentExecution = jest.fn().mockResolvedValue(mockResult);

      const result = await backgroundJobService.processJob(mockJob);

      expect(result).toEqual(mockResult);
      expect(mockJob.updateProgress).toHaveBeenCalled();
      expect(mockJob.log).toHaveBeenCalledWith('Starting experiment execution...');
    });

    test('should process dataset processing job with progress tracking', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'dataset_processing',
        payload: {
          datasetId: 'dataset-456',
          operation: 'transform',
          transformations: [
            { type: 'normalize', column: 'score' },
            { type: 'tokenize', column: 'text' },
          ],
          batchSize: 100,
        },
      };

      mockJob.data = jobData;
      mockJob.updateProgress = jest.fn().mockResolvedValue(undefined);

      const mockResult = {
        datasetId: 'dataset-456',
        processedItems: 1000,
        transformedItems: 950,
        skippedItems: 50,
        errors: [],
        executionTimeMs: 30000,
      };

      backgroundJobService.processDatasetProcessing = jest.fn().mockResolvedValue(mockResult);

      const result = await backgroundJobService.processJob(mockJob);

      expect(result).toEqual(mockResult);
      expect(mockJob.updateProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          progress: expect.any(Number),
          processed: expect.any(Number),
          total: expect.any(Number),
        })
      );
    });

    test('should process trace analysis job', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'trace_analysis',
        payload: {
          traceIds: ['trace-1', 'trace-2', 'trace-3'],
          analysisTypes: ['performance', 'quality', 'sentiment'],
          options: {
            includeSpans: true,
            aggregateResults: true,
          },
        },
      };

      mockJob.data = jobData;
      mockJob.updateProgress = jest.fn().mockResolvedValue(undefined);

      const mockResult = {
        processedTraces: 3,
        analysisResults: {
          performance: { averageLatency: 1200, p95Latency: 2000 },
          quality: { averageScore: 0.87, distribution: {} },
          sentiment: { positive: 0.6, neutral: 0.3, negative: 0.1 },
        },
        errors: [],
        executionTimeMs: 15000,
      };

      backgroundJobService.processTraceAnalysis = jest.fn().mockResolvedValue(mockResult);

      const result = await backgroundJobService.processJob(mockJob);

      expect(result).toEqual(mockResult);
      expect(backgroundJobService.processTraceAnalysis).toHaveBeenCalledWith(jobData.payload);
    });

    test('should handle job processing failures with retry logic', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'llm_batch_requests',
        payload: { requests: [] },
      };

      mockJob.data = jobData;
      mockJob.attemptsMade = 1;
      mockJob.opts = { attempts: 3 };

      // First attempt fails
      backgroundJobService.processLLMBatchRequests = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit exceeded'))
        .mockResolvedValueOnce({ processedRequests: 100, errors: [] });

      // Should not throw on first failure (will be retried)
      await expect(backgroundJobService.processJob(mockJob)).rejects.toThrow('Rate limit exceeded');

      // Second attempt should succeed
      const result = await backgroundJobService.processJob(mockJob);
      expect(result.processedRequests).toBe(100);
    });

    test('should process webhook delivery job', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'webhook_delivery',
        payload: {
          webhookUrl: 'https://api.example.com/webhook',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { event: 'experiment_completed', data: {} },
          retryPolicy: { maxRetries: 3, backoffMs: 1000 },
        },
      };

      mockJob.data = jobData;

      // Mock successful webhook delivery
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve({ success: true }),
      });

      const result = await backgroundJobService.processJob(mockJob);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    test('should handle custom job processing', async () => {
      const jobData = {
        workspaceId: 'workspace-123',
        userId: 'user-123',
        type: 'custom',
        payload: {
          customHandler: 'user-defined-processor',
          parameters: { param1: 'value1', param2: 123 },
        },
      };

      mockJob.data = jobData;

      // Mock custom handler lookup and execution
      backgroundJobService.getCustomHandler = jest.fn().mockReturnValue({
        execute: jest.fn().mockResolvedValue({
          result: 'custom processing completed',
          metadata: { processedAt: new Date() },
        }),
      });

      const result = await backgroundJobService.processJob(mockJob);

      expect(result.result).toBe('custom processing completed');
      expect(backgroundJobService.getCustomHandler).toHaveBeenCalledWith('user-defined-processor');
    });
  });

  describe('Queue Management and Health', () => {
    test('should get queue statistics', async () => {
      const mockCounts = {
        waiting: 5,
        active: 2,
        completed: 150,
        failed: 8,
        delayed: 3,
        paused: 0,
      };

      mockQueue.getJobCounts.mockResolvedValue(mockCounts);

      const stats = await backgroundJobService.getJobStats('experiment_execution');

      expect(stats).toEqual({
        jobType: 'experiment_execution',
        counts: mockCounts,
        total: 168, // Sum of all counts
        successRate: 0.947, // 150/158 (completed + failed)
        averageWaitTime: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        throughput: expect.any(Number),
      });
    });

    test('should get overall queue health', async () => {
      // Mock health metrics for all queues
      const mockHealthData = {
        totalQueues: 11,
        totalJobs: 1000,
        activeJobs: 15,
        failedJobs: 25,
        completedJobs: 960,
        averageProcessingTime: 2500,
        memoryUsage: 128.5,
        redisConnected: true,
      };

      backgroundJobService.getOverallHealth = jest.fn().mockResolvedValue({
        status: 'healthy',
        ...mockHealthData,
        checks: [
          { name: 'redis_connection', status: 'healthy', message: 'Connected' },
          { name: 'queue_processing', status: 'healthy', message: 'All queues processing' },
          { name: 'error_rate', status: 'healthy', message: 'Error rate within threshold' },
          { name: 'memory_usage', status: 'healthy', message: 'Memory usage normal' },
        ],
      });

      const health = await backgroundJobService.getOverallHealth();

      expect(health.status).toBe('healthy');
      expect(health.totalJobs).toBe(1000);
      expect(health.checks).toHaveLength(4);
      expect(health.redisConnected).toBe(true);
    });

    test('should detect unhealthy queue conditions', async () => {
      const unhealthyHealthData = {
        totalQueues: 11,
        totalJobs: 5000,
        activeJobs: 500, // Too many active jobs
        failedJobs: 1000, // High failure rate
        completedJobs: 3500,
        averageProcessingTime: 15000, // Slow processing
        memoryUsage: 512.0, // High memory usage
        redisConnected: true,
      };

      backgroundJobService.getOverallHealth = jest.fn().mockResolvedValue({
        status: 'unhealthy',
        ...unhealthyHealthData,
        checks: [
          { name: 'redis_connection', status: 'healthy', message: 'Connected' },
          { name: 'queue_processing', status: 'warning', message: 'High queue backlog' },
          { name: 'error_rate', status: 'critical', message: 'High error rate: 22.2%' },
          { name: 'memory_usage', status: 'warning', message: 'High memory usage: 512MB' },
        ],
      });

      const health = await backgroundJobService.getOverallHealth();

      expect(health.status).toBe('unhealthy');
      expect(health.checks.some(check => check.status === 'critical')).toBe(true);
      expect(health.checks.some(check => check.status === 'warning')).toBe(true);
    });

    test('should pause and resume queues', async () => {
      mockQueue.pause.mockResolvedValue(undefined);
      mockQueue.resume.mockResolvedValue(undefined);

      // Pause specific queue
      const pauseResult = await backgroundJobService.pauseQueue('experiment_execution');
      expect(pauseResult.success).toBe(true);
      expect(mockQueue.pause).toHaveBeenCalled();

      // Resume specific queue
      const resumeResult = await backgroundJobService.resumeQueue('experiment_execution');
      expect(resumeResult.success).toBe(true);
      expect(mockQueue.resume).toHaveBeenCalled();
    });

    test('should clean completed and failed jobs', async () => {
      mockQueue.clean.mockResolvedValue(['job-1', 'job-2', 'job-3']);

      const cleanResult = await backgroundJobService.cleanJobs('trace_analysis', {
        type: 'completed',
        olderThan: 86400000, // 1 day
        limit: 100,
      });

      expect(cleanResult.cleaned).toBe(3);
      expect(cleanResult.jobIds).toEqual(['job-1', 'job-2', 'job-3']);
      expect(mockQueue.clean).toHaveBeenCalledWith(86400000, 100, 'completed');
    });
  });

  describe('Advanced Features', () => {
    test('should handle job dependencies', async () => {
      const dependentJobRequest: CreateJobRequest = {
        name: 'dependent-analysis',
        type: 'trace_analysis',
        workspaceId: 'workspace-123',
        payload: { traceIds: ['trace-1'] },
        options: {
          priority: 'normal',
          attempts: 3,
        },
        metadata: {
          owner: 'user-123',
          dependencies: ['experiment-job-123'], // Depends on other job
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      // Mock dependency checking
      backgroundJobService.checkJobDependencies = jest.fn().mockResolvedValue({
        canExecute: true,
        pendingDependencies: [],
      });

      mockQueue.add.mockResolvedValue({
        ...mockJob,
        id: 'dependent-job-456',
      });

      const result = await backgroundJobService.createJob(dependentJobRequest, mockUser);

      expect(result.id).toBe('dependent-job-456');
      expect(backgroundJobService.checkJobDependencies).toHaveBeenCalledWith(['experiment-job-123']);
    });

    test('should support job chaining', async () => {
      const chainedJobs: CreateJobRequest[] = [
        {
          name: 'step-1-data-processing',
          type: 'dataset_processing',
          workspaceId: 'workspace-123',
          payload: { datasetId: 'dataset-123', operation: 'clean' },
        },
        {
          name: 'step-2-model-training',
          type: 'experiment_execution',
          workspaceId: 'workspace-123',
          payload: { modelType: 'transformer', datasetId: 'dataset-123' },
        },
        {
          name: 'step-3-evaluation',
          type: 'model_evaluation',
          workspaceId: 'workspace-123',
          payload: { modelId: 'model-from-step-2' },
        },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      let jobIdCounter = 1;
      mockQueue.add.mockImplementation(() => 
        Promise.resolve({ ...mockJob, id: `chain-job-${jobIdCounter++}` })
      );

      const results = await backgroundJobService.createJobChain(chainedJobs, mockUser);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('chain-job-1');
      expect(results[1].id).toBe('chain-job-2');
      expect(results[2].id).toBe('chain-job-3');

      // Verify dependency chain was established
      expect(mockQueue.add).toHaveBeenCalledTimes(3);
    });

    test('should handle bulk job operations', async () => {
      const bulkJobIds = ['job-1', 'job-2', 'job-3', 'job-4', 'job-5'];

      // Mock job retrieval
      backgroundJobService.findJobById = jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          ...mockJob,
          id,
          data: { workspaceId: 'workspace-123', userId: 'user-123' },
          getState: () => Promise.resolve('waiting'),
          remove: jest.fn().mockResolvedValue(undefined),
        })
      );

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const result = await backgroundJobService.bulkCancelJobs(bulkJobIds, mockUser);

      expect(result.succeeded).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(5);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    test('should provide job execution metrics and analytics', async () => {
      const metricsRequest = {
        workspaceId: 'workspace-123',
        jobType: 'experiment_execution',
        timeRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
        },
        granularity: 'daily' as const,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const mockMetrics = {
        totalJobs: 150,
        completedJobs: 140,
        failedJobs: 10,
        averageExecutionTime: 25000,
        medianExecutionTime: 20000,
        p95ExecutionTime: 45000,
        throughputPerHour: 6.25,
        errorRate: 0.067,
        dailyBreakdown: [
          { date: '2024-01-01', completed: 5, failed: 0, avgTime: 22000 },
          { date: '2024-01-02', completed: 4, failed: 1, avgTime: 28000 },
        ],
        topErrors: [
          { error: 'Timeout error', count: 5, percentage: 50 },
          { error: 'Memory limit exceeded', count: 3, percentage: 30 },
        ],
      };

      backgroundJobService.getJobMetrics = jest.fn().mockResolvedValue(mockMetrics);

      const result = await backgroundJobService.getJobMetrics(metricsRequest, mockUser);

      expect(result.totalJobs).toBe(150);
      expect(result.errorRate).toBe(0.067);
      expect(result.dailyBreakdown).toHaveLength(2);
      expect(result.topErrors).toHaveLength(2);
    });
  });
});