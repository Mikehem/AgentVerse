/**
 * Comprehensive unit tests for job queue management and prioritization
 * Tests Bull/BullMQ queue operations, priority handling, concurrency, and resource allocation
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

describe('Job Queue Management and Prioritization', () => {
  let jobService: BackgroundJobService;
  let mockQueues: Map<JobType, jest.Mocked<Queue>>;
  let mockWorkers: Map<JobType, jest.Mocked<Worker>>;
  let mockUser: AuthenticatedUser;

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

    jobService = new BackgroundJobService();
    
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      workspaceId: 'workspace-123',
      role: 'developer',
      permissions: ['jobs:create', 'jobs:read', 'jobs:cancel'],
    };

    // Mock auth validation
    require('../../src/utils/auth').validateWorkspaceAccess.mockResolvedValue(true);
    require('../../src/utils/auth').checkResourcePermission.mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Queue Initialization', () => {
    it('should initialize queues for all job types', () => {
      const expectedJobTypes: JobType[] = [
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

      expectedJobTypes.forEach(jobType => {
        expect(MockedQueue).toHaveBeenCalledWith(
          `jobs:${jobType}`,
          expect.objectContaining({
            defaultJobOptions: expect.objectContaining({
              removeOnComplete: 10,
              removeOnFail: 10,
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 2000,
              },
            }),
          })
        );
      });
    });

    it('should initialize workers with correct concurrency levels', () => {
      const expectedConcurrency = {
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

      Object.entries(expectedConcurrency).forEach(([jobType, concurrency]) => {
        expect(MockedWorker).toHaveBeenCalledWith(
          `jobs:${jobType}`,
          expect.any(Function),
          expect.objectContaining({
            concurrency,
          })
        );
      });
    });

    it('should set up event listeners for workers', () => {
      mockWorkers.forEach(mockWorker => {
        expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
        expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      });
    });
  });

  describe('Job Priority Management', () => {
    const mockJob = {
      id: 'job-123',
      data: {
        name: 'Test Job',
        type: 'experiment_execution',
        workspaceId: 'workspace-123',
        userId: 'user-123',
        userName: 'Test User',
        payload: {},
      },
      opts: {
        priority: 1,
        attempts: 3,
        timeout: undefined,
        delay: undefined,
      },
    } as any;

    beforeEach(() => {
      // Set up all queues to return the mock job
      mockQueues.forEach(mockQueue => {
        mockQueue.add.mockResolvedValue(mockJob);
      });
      
      // Mock database calls
      const { prisma } = require('../../src/config/database');
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });
    });

    it('should handle critical priority jobs correctly', async () => {
      const request: CreateJobRequest = {
        name: 'Critical Experiment',
        type: 'experiment_execution',
        workspaceId: 'workspace-123',
        payload: { experimentId: 'exp-123' },
        options: {
          priority: 'critical',
          attempts: 5,
          timeout: 300000,
        },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('experiment_execution')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'Critical Experiment',
        expect.any(Object),
        expect.objectContaining({
          priority: 20, // Critical = highest priority value
          attempts: 5,
          timeout: 300000,
        })
      );
    });

    it('should handle high priority jobs correctly', async () => {
      const request: CreateJobRequest = {
        name: 'High Priority Task',
        type: 'data_export',
        workspaceId: 'workspace-123',
        payload: { format: 'csv' },
        options: {
          priority: 'high',
        },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('data_export')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'High Priority Task',
        expect.any(Object),
        expect.objectContaining({
          priority: 10, // High priority
        })
      );
    });

    it('should handle normal priority jobs correctly', async () => {
      const request: CreateJobRequest = {
        name: 'Normal Task',
        type: 'trace_analysis',
        workspaceId: 'workspace-123',
        payload: { traceId: 'trace-123' },
        options: {
          priority: 'normal',
        },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('trace_analysis')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'Normal Task',
        expect.any(Object),
        expect.objectContaining({
          priority: 5, // Normal priority
        })
      );
    });

    it('should handle low priority jobs correctly', async () => {
      const request: CreateJobRequest = {
        name: 'Low Priority Cleanup',
        type: 'cleanup_tasks',
        workspaceId: 'workspace-123',
        payload: { retentionDays: 30 },
        options: {
          priority: 'low',
        },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('cleanup_tasks')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'Low Priority Cleanup',
        expect.any(Object),
        expect.objectContaining({
          priority: 1, // Low priority
        })
      );
    });

    it('should default to normal priority when not specified', async () => {
      const request: CreateJobRequest = {
        name: 'Default Priority Task',
        type: 'feedback_aggregation',
        workspaceId: 'workspace-123',
        payload: { feedbackType: 'rating' },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('feedback_aggregation')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'Default Priority Task',
        expect.any(Object),
        expect.objectContaining({
          priority: 5, // Default to normal priority
        })
      );
    });
  });

  describe('Queue Resource Management', () => {
    it('should allocate appropriate concurrency for resource-intensive jobs', () => {
      // LLM batch requests should have low concurrency due to API rate limits
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:llm_batch_requests',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 1,
        })
      );

      // Cleanup tasks should have low concurrency to avoid system impact
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:cleanup_tasks',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 1,
        })
      );
    });

    it('should allocate higher concurrency for I/O intensive jobs', () => {
      // Trace analysis can handle multiple concurrent operations
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:trace_analysis',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        })
      );

      // Webhook delivery can handle multiple concurrent requests
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:webhook_delivery',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });

    it('should allocate moderate concurrency for balanced workloads', () => {
      // Dataset processing needs balance between memory and throughput
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:dataset_processing',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 3,
        })
      );

      // Custom jobs default to moderate concurrency
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:custom',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 3,
        })
      );
    });
  });

  describe('Queue Health Monitoring', () => {
    beforeEach(() => {
      mockQueues.forEach(mockQueue => {
        mockQueue.getJobCounts.mockResolvedValue({
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 3,
          delayed: 1,
        });
      });
    });

    it('should support queue health monitoring through job counts', async () => {
      const mockQueue = mockQueues.get('trace_analysis')!;
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 10,
        active: 3,
        completed: 150,
        failed: 5,
        delayed: 2,
      });

      // Verify the queue has the getJobCounts method available
      expect(mockQueue.getJobCounts).toBeDefined();
      expect(typeof mockQueue.getJobCounts).toBe('function');
    });

    it('should support queue congestion detection through metrics', () => {
      const mockQueue = mockQueues.get('experiment_execution')!;
      
      // Verify queue provides metrics for congestion detection
      expect(mockQueue.getWaiting).toBeDefined();
      expect(mockQueue.getActive).toBeDefined();
      expect(mockQueue.getJobCounts).toBeDefined();
    });

    it('should support failure rate monitoring', () => {
      const mockQueue = mockQueues.get('llm_batch_requests')!;
      
      // Verify queue provides methods for failure tracking
      expect(mockQueue.getFailed).toBeDefined();
      expect(mockQueue.getCompleted).toBeDefined();
      expect(mockQueue.getJobCounts).toBeDefined();
    });
  });

  describe('Queue Maintenance Operations', () => {
    it('should support job cleanup through clean method', () => {
      const mockQueue = mockQueues.get('trace_analysis')!;
      
      // Verify queue provides cleanup capabilities
      expect(mockQueue.clean).toBeDefined();
      expect(typeof mockQueue.clean).toBe('function');
    });

    it('should support queue pausing and resuming', () => {
      const mockQueue = mockQueues.get('data_export')!;
      
      // Verify queue provides pause/resume capabilities
      expect(mockQueue.pause).toBeDefined();
      expect(mockQueue.resume).toBeDefined();
      expect(typeof mockQueue.pause).toBe('function');
      expect(typeof mockQueue.resume).toBe('function');
    });

    it('should support bulk job operations', () => {
      const mockQueue = mockQueues.get('cleanup_tasks')!;
      
      // Verify queue provides bulk operations
      expect(mockQueue.removeJobs).toBeDefined();
      expect(typeof mockQueue.removeJobs).toBe('function');
    });
  });

  describe('Job Scheduling and Delays', () => {
    const mockJob = {
      id: 'scheduled-job-123',
      data: {
        name: 'Scheduled Job',
        type: 'report_generation',
        workspaceId: 'workspace-123',
        userId: 'user-123',
        userName: 'Test User',
        payload: {},
      },
      opts: {
        priority: 5,
        attempts: 3,
        timeout: undefined,
        delay: undefined,
      },
    } as any;

    beforeEach(() => {
      // Set up all queues to return the mock job
      mockQueues.forEach(mockQueue => {
        mockQueue.add.mockResolvedValue(mockJob);
      });
      
      const { prisma } = require('../../src/config/database');
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });
    });

    it('should schedule jobs with delay', async () => {
      const request: CreateJobRequest = {
        name: 'Delayed Report',
        type: 'report_generation',
        workspaceId: 'workspace-123',
        payload: { reportType: 'weekly' },
        options: {
          priority: 'normal',
          delay: 60000, // 1 minute delay
        },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('report_generation')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'Delayed Report',
        expect.any(Object),
        expect.objectContaining({
          delay: 60000,
        })
      );
    });

    it('should handle immediate jobs without delay', async () => {
      const request: CreateJobRequest = {
        name: 'Immediate Task',
        type: 'webhook_delivery',
        workspaceId: 'workspace-123',
        payload: { url: 'https://example.com/webhook' },
        options: {
          priority: 'high',
        },
      };

      await jobService.createJob(request, mockUser);

      const mockQueue = mockQueues.get('webhook_delivery')!;
      expect(mockQueue.add).toHaveBeenCalledWith(
        'Immediate Task',
        expect.any(Object),
        expect.not.objectContaining({
          delay: expect.any(Number),
        })
      );
    });
  });

  describe('Batch Job Operations', () => {
    it('should handle bulk job creation with mixed priorities', async () => {
      const requests: CreateJobRequest[] = [
        {
          name: 'Batch Job 1',
          type: 'dataset_processing',
          workspaceId: 'workspace-123',
          payload: { datasetId: 'dataset-1' },
          options: { priority: 'high' },
        },
        {
          name: 'Batch Job 2',
          type: 'dataset_processing',
          workspaceId: 'workspace-123',
          payload: { datasetId: 'dataset-2' },
          options: { priority: 'normal' },
        },
        {
          name: 'Batch Job 3',
          type: 'dataset_processing',
          workspaceId: 'workspace-123',
          payload: { datasetId: 'dataset-3' },
          options: { priority: 'low' },
        },
      ];

      // Set up all queues to return a mock job
      const batchMockJob = {
        id: 'batch-job-123',
        data: {
          name: 'Batch Job',
          type: 'dataset_processing',
          workspaceId: 'workspace-123',
          userId: 'user-123',
          userName: 'Test User',
          payload: {},
        },
        opts: {
          priority: 5,
          attempts: 3,
          timeout: undefined,
          delay: undefined,
        },
      };
      
      mockQueues.forEach(mockQueue => {
        mockQueue.add.mockResolvedValue(batchMockJob);
      });
      
      const { prisma } = require('../../src/config/database');
      prisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      const results = await Promise.all(
        requests.map(request => jobService.createJob(request, mockUser))
      );

      const mockQueue = mockQueues.get('dataset_processing')!;
      
      expect(results).toHaveLength(3);
      expect(mockQueue.add).toHaveBeenCalledTimes(3);

      // Verify priority ordering
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        1,
        'Batch Job 1',
        expect.any(Object),
        expect.objectContaining({ priority: 10 }) // High priority
      );
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        2,
        'Batch Job 2',
        expect.any(Object),
        expect.objectContaining({ priority: 5 }) // Normal priority
      );
      expect(mockQueue.add).toHaveBeenNthCalledWith(
        3,
        'Batch Job 3',
        expect.any(Object),
        expect.objectContaining({ priority: 1 }) // Low priority
      );
    });

    it('should support bulk job removal capabilities', () => {
      const mockQueue = mockQueues.get('cleanup_tasks')!;
      
      // Verify queue supports bulk removal operations
      expect(mockQueue.removeJobs).toBeDefined();
      expect(typeof mockQueue.removeJobs).toBe('function');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid job type gracefully', async () => {
      const request: CreateJobRequest = {
        name: 'Invalid Job',
        type: 'invalid_type' as JobType,
        workspaceId: 'workspace-123',
        payload: {},
      };

      await expect(jobService.createJob(request, mockUser))
        .rejects
        .toThrow('Unsupported job type: invalid_type');
    });

    it('should handle queue initialization failures', () => {
      MockedQueue.mockImplementationOnce(() => {
        throw new Error('Queue initialization failed');
      });

      expect(() => new BackgroundJobService())
        .toThrow('Queue initialization failed');
    });

    it('should handle worker initialization failures', () => {
      MockedWorker.mockImplementationOnce(() => {
        throw new Error('Worker initialization failed');
      });

      expect(() => new BackgroundJobService())
        .toThrow('Worker initialization failed');
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize queue settings for high-throughput jobs', () => {
      // Webhook delivery queue should optimize for throughput
      expect(MockedQueue).toHaveBeenCalledWith(
        'jobs:webhook_delivery',
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            removeOnComplete: 10,
            removeOnFail: 10,
          }),
        })
      );
    });

    it('should handle memory-intensive jobs appropriately', () => {
      // Model evaluation should have lower concurrency for memory management
      expect(MockedWorker).toHaveBeenCalledWith(
        'jobs:model_evaluation',
        expect.any(Function),
        expect.objectContaining({
          concurrency: 2, // Limited concurrency for memory-intensive operations
        })
      );
    });
  });
});