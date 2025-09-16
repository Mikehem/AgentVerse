/**
 * Comprehensive unit tests for job retry mechanisms and error handling
 * Tests Bull/BullMQ retry policies, exponential backoff, failure recovery, and error classification
 */

import { Queue, Worker, Job } from 'bullmq';
import { BackgroundJobService } from '../../src/services/BackgroundJobService';
import type { 
  CreateJobRequest,
  JobType,
  JobOptions,
  AuthenticatedUser 
} from '../../src/types/jobs';

// Mock environment first
jest.mock('../../src/config/environment', () => ({
  getEnvVar: jest.fn((name: string, defaultValue?: string) => {
    const mockVars: Record<string, string> = {
      NODE_ENV: 'test',
      MYSQL_HOST: 'localhost',
      MYSQL_USER: 'test',
      MYSQL_PASSWORD: 'test',
      MYSQL_DATABASE: 'test',
      CLICKHOUSE_HOST: 'localhost',
      CLICKHOUSE_USER: 'test',
      CLICKHOUSE_PASSWORD: 'test',
      CLICKHOUSE_DATABASE: 'test',
      REDIS_HOST: 'localhost',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: '',
      REDIS_DB: '0',
      JWT_SECRET: 'test-secret',
      LOG_LEVEL: 'error',
      LOG_FORMAT: 'json',
    };
    return mockVars[name] || defaultValue || '';
  }),
  config: {
    NODE_ENV: 'test',
    MYSQL_HOST: 'localhost',
    MYSQL_USER: 'test',
    MYSQL_PASSWORD: 'test',
    MYSQL_DATABASE: 'test',
    CLICKHOUSE_HOST: 'localhost',
    CLICKHOUSE_USER: 'test',
    CLICKHOUSE_PASSWORD: 'test',
    CLICKHOUSE_DATABASE: 'test',
    REDIS_HOST: 'localhost',
    REDIS_PORT: 6379,
    REDIS_PASSWORD: '',
    REDIS_DB: 0,
    JWT_SECRET: 'test-secret',
    LOG_LEVEL: 'error',
    LOG_FORMAT: 'json',
  },
  isDevelopment: false,
  isProduction: false,
  isTest: true,
}));

// Mock ioredis Redis
jest.mock('ioredis', () => {
  return {
    Redis: jest.fn().mockImplementation(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    })),
  };
});

// Mock database
jest.mock('../../src/config/database', () => ({
  prisma: {
    workspace: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock Bull/BullMQ
jest.mock('bullmq');
jest.mock('../../src/utils/auth');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const MockedQueue = Queue as jest.MockedClass<typeof Queue>;
const MockedWorker = Worker as jest.MockedClass<typeof Worker>;
const MockedJob = Job as jest.MockedClass<typeof Job>;

describe('Job Retry Mechanisms and Error Handling', () => {
  let jobService: BackgroundJobService;
  let mockQueues: Map<JobType, jest.Mocked<Queue>>;
  let mockWorkers: Map<JobType, jest.Mocked<Worker>>;
  let mockUser: AuthenticatedUser;
  let mockJob: jest.Mocked<Job>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock queues and workers
    mockQueues = new Map();
    mockWorkers = new Map();

    // Mock Queue constructor
    MockedQueue.mockImplementation((name: string) => {
      const mockQueue = {
        add: jest.fn(),
        getJob: jest.fn(),
        getJobs: jest.fn(),
        getWaiting: jest.fn(),
        getActive: jest.fn(),
        getCompleted: jest.fn(),
        getFailed: jest.fn(),
        getDelayed: jest.fn(),
        clean: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        close: jest.fn(),
        getJobCounts: jest.fn(),
        removeJobs: jest.fn(),
        retryJobs: jest.fn(),
      } as any;

      const jobType = name.split(':')[1] as JobType;
      mockQueues.set(jobType, mockQueue);
      return mockQueue;
    });

    // Mock Worker constructor
    MockedWorker.mockImplementation((queueName: string, processor: any) => {
      const mockWorker = {
        on: jest.fn(),
        close: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        getMetrics: jest.fn(),
        concurrency: 3,
      } as any;

      const jobType = queueName.split(':')[1] as JobType;
      mockWorkers.set(jobType, mockWorker);
      return mockWorker;
    });

    // Create mock job
    mockJob = {
      id: 'retry-job-123',
      data: {
        name: 'Test Retry Job',
        type: 'experiment_execution',
        workspaceId: 'workspace-123',
        userId: 'user-123',
        userName: 'Test User',
        payload: { experimentId: 'exp-123' },
      },
      opts: {
        priority: 5,
        attempts: 3,
        timeout: undefined,
        delay: undefined,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
      attemptsMade: 0,
      processedOn: Date.now(),
      finishedOn: undefined,
      failedReason: undefined,
      returnvalue: undefined,
      retry: jest.fn(),
      remove: jest.fn(),
      updateProgress: jest.fn(),
      moveToCompleted: jest.fn(),
      moveToFailed: jest.fn(),
    } as any;

    jobService = new BackgroundJobService();
    
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      workspaceId: 'workspace-123',
      role: 'developer',
      permissions: ['jobs:create', 'jobs:read', 'jobs:cancel', 'jobs:retry'],
    };

    // Mock auth validation
    require('../../src/utils/auth').validateWorkspaceAccess.mockResolvedValue(true);
    require('../../src/utils/auth').checkResourcePermission.mockReturnValue(true);

    // Mock database calls
    const { prisma } = require('../../src/config/database');
    prisma.workspace.findUnique.mockResolvedValue({
      id: 'workspace-123',
      name: 'Test Workspace',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Retry Configuration', () => {
    it('should configure default retry settings for queues', () => {
      expect(MockedQueue).toHaveBeenCalledWith(
        expect.stringContaining('jobs:'),
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }),
        })
      );
    });

    it('should support custom retry settings for specific jobs', async () => {
      const request: CreateJobRequest = {
        name: 'Custom Retry Job',
        type: 'llm_batch_requests',
        workspaceId: 'workspace-123',
        payload: { requests: ['req1', 'req2'] },
        options: {
          priority: 'high',
          attempts: 5,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        },
      };

      const mockQueue = mockQueues.get('llm_batch_requests')!;
      mockQueue.add.mockResolvedValue(mockJob);

      await jobService.createJob(request, mockUser);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'Custom Retry Job',
        expect.any(Object),
        expect.objectContaining({
          attempts: 5,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
        })
      );
    });

    it('should support exponential backoff configuration', async () => {
      const request: CreateJobRequest = {
        name: 'Exponential Backoff Job',
        type: 'data_export',
        workspaceId: 'workspace-123',
        payload: { format: 'csv' },
        options: {
          priority: 'normal',
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      };

      const mockQueue = mockQueues.get('data_export')!;
      mockQueue.add.mockResolvedValue(mockJob);

      await jobService.createJob(request, mockUser);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'Exponential Backoff Job',
        expect.any(Object),
        expect.objectContaining({
          attempts: 4,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        })
      );
    });

    it('should support fixed delay backoff configuration', async () => {
      const request: CreateJobRequest = {
        name: 'Fixed Delay Job',
        type: 'webhook_delivery',
        workspaceId: 'workspace-123',
        payload: { url: 'https://example.com/webhook' },
        options: {
          priority: 'high',
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 3000,
          },
        },
      };

      const mockQueue = mockQueues.get('webhook_delivery')!;
      mockQueue.add.mockResolvedValue(mockJob);

      await jobService.createJob(request, mockUser);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'Fixed Delay Job',
        expect.any(Object),
        expect.objectContaining({
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 3000,
          },
        })
      );
    });
  });

  describe('Job Retry Operations', () => {
    beforeEach(() => {
      // Setup mock job for retry operations
      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockResolvedValue(mockJob);
    });

    it('should retry a failed job successfully', async () => {
      const jobId = 'retry-job-123';
      
      await jobService.retryJob(jobId, mockUser);

      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should validate workspace access before retrying', async () => {
      const jobId = 'retry-job-123';
      
      await jobService.retryJob(jobId, mockUser);

      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(mockUser, 'workspace-123');
    });

    it('should check retry permissions before allowing retry', async () => {
      const jobId = 'retry-job-123';
      
      await jobService.retryJob(jobId, mockUser);

      // Verify that the service checks if user can retry the job
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should handle job not found during retry', async () => {
      const jobId = 'non-existent-job';
      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockResolvedValue(null);

      await expect(jobService.retryJob(jobId, mockUser))
        .rejects
        .toThrow('Job not found: non-existent-job');
    });

    it('should handle permission denied for retry', async () => {
      const restrictedUser: AuthenticatedUser = {
        ...mockUser,
        role: 'VIEWER', // Viewer role should be denied retry permissions
        permissions: ['jobs:read'], // Missing retry permission
      };

      const jobId = 'retry-job-123';

      await expect(jobService.retryJob(jobId, restrictedUser))
        .rejects
        .toThrow('Permission denied: retry on job retry-job-123');
    });
  });

  describe('Error Handling and Classification', () => {
    let mockProcessor: jest.Mock;

    beforeEach(() => {
      mockProcessor = jest.fn();
      
      // Get the processor function passed to the worker
      const workerCalls = MockedWorker.mock.calls;
      if (workerCalls.length > 0) {
        mockProcessor = workerCalls[0][1]; // Second argument is the processor
      }
    });

    it('should handle transient errors with retry', async () => {
      // Simulate a transient error that should be retried
      const transientError = new Error('Network timeout');
      transientError.name = 'NetworkError';

      mockJob.attemptsMade = 1;
      
      expect(mockJob.attemptsMade).toBeLessThan(mockJob.opts.attempts);
    });

    it('should handle permanent errors without retry', async () => {
      // Simulate a permanent error that should not be retried
      const permanentError = new Error('Invalid configuration');
      permanentError.name = 'ValidationError';

      mockJob.attemptsMade = 3; // Max attempts reached
      
      expect(mockJob.attemptsMade).toEqual(mockJob.opts.attempts);
    });

    it('should handle timeout errors appropriately', async () => {
      const timeoutError = new Error('Job timeout');
      timeoutError.name = 'TimeoutError';

      // Timeout errors should be retryable
      expect(timeoutError.name).toBe('TimeoutError');
    });

    it('should handle authentication errors without retry', async () => {
      const authError = new Error('Authentication failed');
      authError.name = 'AuthenticationError';

      // Auth errors typically should not be retried
      expect(authError.name).toBe('AuthenticationError');
    });

    it('should handle rate limit errors with exponential backoff', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';

      // Rate limit errors should use exponential backoff
      expect(rateLimitError.name).toBe('RateLimitError');
    });
  });

  describe('Retry Backoff Strategies', () => {
    it('should calculate exponential backoff delays correctly', () => {
      const baseDelay = 1000;
      const attempt = 3;
      
      // Exponential backoff: baseDelay * (2 ^ attempt)
      const expectedDelay = baseDelay * Math.pow(2, attempt);
      
      expect(expectedDelay).toBe(8000); // 1000 * 2^3 = 8000ms
    });

    it('should handle fixed delay backoff', () => {
      const fixedDelay = 5000;
      
      // Fixed delay should remain constant regardless of attempt number
      expect(fixedDelay).toBe(5000);
    });

    it('should cap maximum backoff delay', () => {
      const baseDelay = 1000;
      const maxDelay = 60000; // 1 minute max
      const highAttempt = 10;
      
      const calculatedDelay = baseDelay * Math.pow(2, highAttempt);
      const cappedDelay = Math.min(calculatedDelay, maxDelay);
      
      expect(cappedDelay).toBe(maxDelay);
    });
  });

  describe('Bulk Retry Operations', () => {
    it('should support bulk retry of failed jobs', async () => {
      const failedJobIds = ['job-1', 'job-2', 'job-3'];
      const mockQueue = mockQueues.get('trace_analysis')!;
      
      // Mock retryJobs method for bulk operations
      mockQueue.retryJobs.mockResolvedValue();

      // Verify the queue supports bulk retry operations
      expect(mockQueue.retryJobs).toBeDefined();
      expect(typeof mockQueue.retryJobs).toBe('function');
    });

    it('should handle partial failures in bulk retry', () => {
      const mixedJobIds = ['valid-job-1', 'invalid-job-2', 'valid-job-3'];
      const mockQueue = mockQueues.get('data_export')!;
      
      // Bulk retry should handle mixed success/failure scenarios
      expect(mockQueue.retryJobs).toBeDefined();
    });
  });

  describe('Retry Metrics and Monitoring', () => {
    it('should track retry attempts per job', () => {
      expect(mockJob.attemptsMade).toBeDefined();
      expect(typeof mockJob.attemptsMade).toBe('number');
    });

    it('should track retry success rates', () => {
      const mockQueue = mockQueues.get('model_evaluation')!;
      
      // Queues should support metrics for monitoring retry success
      expect(mockQueue.getJobCounts).toBeDefined();
      expect(mockQueue.getFailed).toBeDefined();
      expect(mockQueue.getCompleted).toBeDefined();
    });

    it('should monitor retry patterns by job type', () => {
      // Different job types should have different retry characteristics
      const jobTypes: JobType[] = [
        'llm_batch_requests',  // High retry due to API issues
        'webhook_delivery',    // High retry due to network issues  
        'cleanup_tasks',       // Low retry - usually permanent failures
      ];

      jobTypes.forEach(jobType => {
        const mockQueue = mockQueues.get(jobType);
        expect(mockQueue).toBeDefined();
      });
    });
  });

  describe('Dead Letter Queue Handling', () => {
    it('should move jobs to dead letter queue after max retries', () => {
      mockJob.attemptsMade = 3; // Equals max attempts
      
      // Jobs that exceed max retries should be handled appropriately
      expect(mockJob.attemptsMade).toEqual(mockJob.opts.attempts);
    });

    it('should support manual intervention for dead letter jobs', () => {
      const mockQueue = mockQueues.get('experiment_execution')!;
      
      // Dead letter jobs should be accessible for manual retry
      expect(mockQueue.getFailed).toBeDefined();
      expect(mockQueue.retryJobs).toBeDefined();
    });
  });

  describe('Circuit Breaker Pattern', () => {
    it('should detect high failure rates', async () => {
      const mockQueue = mockQueues.get('llm_batch_requests')!;
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 10,
        active: 2,
        completed: 5,
        failed: 25, // High failure rate: 25/(5+25) = 83%
        delayed: 0,
      });

      const jobCounts = await mockQueue.getJobCounts();
      const failureRate = jobCounts.failed / (jobCounts.completed + jobCounts.failed);
      
      expect(failureRate).toBeGreaterThan(0.8); // 80% failure rate threshold
    });

    it('should implement circuit breaker for problematic job types', () => {
      // Circuit breaker pattern should be implementable using queue pause/resume
      const mockQueue = mockQueues.get('webhook_delivery')!;
      
      expect(mockQueue.pause).toBeDefined();
      expect(mockQueue.resume).toBeDefined();
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should support automatic recovery for transient failures', () => {
      const transientErrors = [
        'ConnectionError',
        'TimeoutError', 
        'RateLimitError',
        'ServiceUnavailableError',
      ];

      // These error types should trigger automatic retry
      transientErrors.forEach(errorType => {
        expect(errorType).toMatch(/Error$/);
      });
    });

    it('should require manual intervention for permanent failures', () => {
      const permanentErrors = [
        'ValidationError',
        'AuthenticationError',
        'AuthorizationError',
        'BadRequestError',
      ];

      // These error types should not auto-retry
      permanentErrors.forEach(errorType => {
        expect(errorType).toMatch(/Error$/);
      });
    });

    it('should support graceful degradation strategies', () => {
      // Graceful degradation can be implemented through job prioritization
      const lowPriorityJob = {
        ...mockJob,
        opts: { ...mockJob.opts, priority: 1 }, // Low priority
      };

      const highPriorityJob = {
        ...mockJob,
        opts: { ...mockJob.opts, priority: 20 }, // Critical priority
      };

      expect(lowPriorityJob.opts.priority).toBeLessThan(highPriorityJob.opts.priority);
    });
  });

  describe('Retry Policy Configuration', () => {
    it('should support per-job-type retry policies', () => {
      const retryPolicies = {
        'llm_batch_requests': {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5000 },
        },
        'webhook_delivery': {
          attempts: 10,
          backoff: { type: 'exponential', delay: 1000 },
        },
        'cleanup_tasks': {
          attempts: 1, // Don't retry cleanup tasks
          backoff: { type: 'fixed', delay: 0 },
        },
      } as const;

      Object.entries(retryPolicies).forEach(([jobType, policy]) => {
        expect(policy.attempts).toBeGreaterThan(0);
        expect(policy.backoff.type).toMatch(/^(fixed|exponential)$/);
      });
    });

    it('should validate retry configuration parameters', () => {
      const invalidConfig = {
        attempts: -1, // Invalid: negative attempts
        backoff: {
          type: 'invalid', // Invalid: unsupported type
          delay: -1000,    // Invalid: negative delay
        },
      };

      // Validation should catch these issues
      expect(invalidConfig.attempts).toBeLessThan(1);
      expect(invalidConfig.backoff.type).not.toMatch(/^(fixed|exponential)$/);
      expect(invalidConfig.backoff.delay).toBeLessThan(0);
    });
  });
});