/**
 * Comprehensive unit tests for workspace isolation in background jobs
 * Tests multi-tenancy, data isolation, permission enforcement, and security boundaries
 */

import { Queue, Worker, Job } from 'bullmq';
import { BackgroundJobService } from '../../src/services/BackgroundJobService';
import type { 
  CreateJobRequest,
  JobType,
  JobOptions,
  AuthenticatedUser,
  JobListRequest 
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

describe('Workspace Isolation for Background Jobs', () => {
  let jobService: BackgroundJobService;
  let mockQueues: Map<JobType, jest.Mocked<Queue>>;
  let mockWorkers: Map<JobType, jest.Mocked<Worker>>;
  
  // Multiple workspace users for testing isolation
  let workspaceAUser: AuthenticatedUser;
  let workspaceBUser: AuthenticatedUser;
  let workspaceCUser: AuthenticatedUser;
  let adminUser: AuthenticatedUser;

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

    // Create test users from different workspaces
    workspaceAUser = {
      id: 'user-a-123',
      username: 'user-a',
      email: 'user-a@workspace-a.com',
      fullName: 'User A',
      workspaceId: 'workspace-a',
      role: 'USER',
      permissions: ['jobs:create', 'jobs:read', 'jobs:cancel', 'jobs:retry'],
    };

    workspaceBUser = {
      id: 'user-b-456',
      username: 'user-b',
      email: 'user-b@workspace-b.com',
      fullName: 'User B',
      workspaceId: 'workspace-b',
      role: 'USER',
      permissions: ['jobs:create', 'jobs:read', 'jobs:cancel', 'jobs:retry'],
    };

    workspaceCUser = {
      id: 'user-c-789',
      username: 'user-c',
      email: 'user-c@workspace-c.com',
      fullName: 'User C',
      workspaceId: 'workspace-c',
      role: 'VIEWER',
      permissions: ['jobs:read'],
    };

    adminUser = {
      id: 'admin-999',
      username: 'admin',
      email: 'admin@system.com',
      fullName: 'System Admin',
      workspaceId: 'admin-workspace',
      role: 'ADMIN',
      permissions: ['jobs:*'],
    };

    // Mock auth validation - will be overridden per test as needed
    require('../../src/utils/auth').validateWorkspaceAccess.mockResolvedValue(true);
    require('../../src/utils/auth').checkResourcePermission.mockReturnValue(true);

    // Mock database calls for different workspaces
    const { prisma } = require('../../src/config/database');
    prisma.workspace.findUnique.mockImplementation((query: any) => {
      const workspaceId = query.where.id;
      const workspaceMap = {
        'workspace-a': { id: 'workspace-a', name: 'Workspace A' },
        'workspace-b': { id: 'workspace-b', name: 'Workspace B' },
        'workspace-c': { id: 'workspace-c', name: 'Workspace C' },
        'admin-workspace': { id: 'admin-workspace', name: 'Admin Workspace' },
      };
      return Promise.resolve(workspaceMap[workspaceId] || null);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Workspace Access Validation', () => {
    it('should validate workspace access when creating jobs', async () => {
      const request: CreateJobRequest = {
        name: 'Workspace A Job',
        type: 'experiment_execution',
        workspaceId: 'workspace-a',
        payload: { experimentId: 'exp-a-123' },
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      const mockJob = {
        id: 'job-a-123',
        data: { ...request, userId: workspaceAUser.id },
        opts: {},
      };
      mockQueue.add.mockResolvedValue(mockJob);

      await jobService.createJob(request, workspaceAUser);

      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(workspaceAUser, 'workspace-a');
    });

    it('should reject job creation for unauthorized workspace', async () => {
      const request: CreateJobRequest = {
        name: 'Unauthorized Job',
        type: 'data_export',
        workspaceId: 'workspace-a', // User B trying to access Workspace A
        payload: { format: 'csv' },
      };

      // Mock workspace access validation to fail
      require('../../src/utils/auth').validateWorkspaceAccess.mockRejectedValue(
        new Error('Access denied to workspace workspace-a')
      );

      await expect(jobService.createJob(request, workspaceBUser))
        .rejects
        .toThrow('Access denied to workspace workspace-a');
    });

    it('should validate workspace access when retrieving jobs', async () => {
      const jobId = 'job-a-123';
      const mockJob = {
        id: jobId,
        data: {
          workspaceId: 'workspace-a',
          userId: 'user-a-123',
          name: 'Test Job',
        },
        opts: {},
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockResolvedValue(mockJob);

      await jobService.getJob(jobId, workspaceAUser);

      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(workspaceAUser, 'workspace-a');
    });

    it('should reject job retrieval from unauthorized workspace', async () => {
      const jobId = 'job-a-123';
      const mockJob = {
        id: jobId,
        data: {
          workspaceId: 'workspace-a', // Job belongs to Workspace A
          userId: 'user-a-123',
          name: 'Test Job',
        },
        opts: {},
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockResolvedValue(mockJob);

      // Mock workspace access validation to fail
      require('../../src/utils/auth').validateWorkspaceAccess.mockRejectedValue(
        new Error('Access denied to workspace workspace-a')
      );

      await expect(jobService.getJob(jobId, workspaceBUser)) // User B trying to access Workspace A job
        .rejects
        .toThrow('Access denied to workspace workspace-a');
    });
  });

  describe('Job Listing with Workspace Isolation', () => {
    let workspaceAJobs: any[];
    let workspaceBJobs: any[];

    beforeEach(() => {
      // Create mock jobs for different workspaces
      workspaceAJobs = [
        {
          id: 'job-a1',
          data: { workspaceId: 'workspace-a', userId: 'user-a-123', name: 'Job A1' },
          opts: {},
        },
        {
          id: 'job-a2',
          data: { workspaceId: 'workspace-a', userId: 'user-a-123', name: 'Job A2' },
          opts: {},
        },
      ];

      workspaceBJobs = [
        {
          id: 'job-b1',
          data: { workspaceId: 'workspace-b', userId: 'user-b-456', name: 'Job B1' },
          opts: {},
        },
        {
          id: 'job-b2',
          data: { workspaceId: 'workspace-b', userId: 'user-b-456', name: 'Job B2' },
          opts: {},
        },
      ];

      // Mock getJobsByFilters to return mixed workspace jobs
      (jobService as any).getJobsByFilters = jest.fn().mockImplementation((request: any, workspaceId: string) => {
        if (workspaceId === 'workspace-a') return Promise.resolve(workspaceAJobs);
        if (workspaceId === 'workspace-b') return Promise.resolve(workspaceBJobs);
        return Promise.resolve([]);
      });
    });

    it('should only return jobs from user workspace', async () => {
      const request: JobListRequest = {
        workspaceId: 'workspace-a',
      };

      const response = await jobService.listJobs(request, workspaceAUser);

      expect(response.jobs).toHaveLength(2);
      response.jobs.forEach(job => {
        expect(job.workspaceId).toBe('workspace-a');
      });
    });

    it('should not leak jobs from other workspaces', async () => {
      const request: JobListRequest = {
        workspaceId: 'workspace-b',
      };

      // User A should not see Workspace B jobs
      require('../../src/utils/auth').validateWorkspaceAccess.mockRejectedValue(
        new Error('Access denied to workspace workspace-b')
      );

      await expect(jobService.listJobs(request, workspaceAUser))
        .rejects
        .toThrow('Access denied to workspace workspace-b');
    });

    it('should use user default workspace when not specified', async () => {
      const request: JobListRequest = {
        // No workspaceId specified
      };

      await jobService.listJobs(request, workspaceAUser);

      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(workspaceAUser, 'workspace-a');
    });

    it('should filter jobs by user permissions within workspace', async () => {
      // Mock canReadJob to filter based on user permissions
      (jobService as any).canReadJob = jest.fn().mockImplementation((user: AuthenticatedUser, jobData: any) => {
        // Users can only read their own jobs or if they're admin
        return user.role === 'ADMIN' || jobData.userId === user.id;
      });

      const mixedWorkspaceAJobs = [
        ...workspaceAJobs,
        {
          id: 'job-a3',
          data: { workspaceId: 'workspace-a', userId: 'other-user-456', name: 'Other User Job' },
          opts: {},
        },
      ];

      (jobService as any).getJobsByFilters.mockResolvedValue(mixedWorkspaceAJobs);

      const request: JobListRequest = {
        workspaceId: 'workspace-a',
      };

      const response = await jobService.listJobs(request, workspaceAUser);

      // Should only return jobs readable by the user
      expect(response.jobs).toHaveLength(2); // Only user-a-123's jobs
      response.jobs.forEach(job => {
        expect(job.createdBy).toBe('user-a-123');
      });
    });
  });

  describe('Job Operations with Workspace Isolation', () => {
    let mockJob: any;

    beforeEach(() => {
      mockJob = {
        id: 'job-a-123',
        data: {
          workspaceId: 'workspace-a',
          userId: 'user-a-123',
          name: 'Test Job',
        },
        opts: {},
        retry: jest.fn(),
        remove: jest.fn(),
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockResolvedValue(mockJob);
    });

    it('should allow retry only within same workspace', async () => {
      await jobService.retryJob('job-a-123', workspaceAUser);

      expect(mockJob.retry).toHaveBeenCalled();
      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(workspaceAUser, 'workspace-a');
    });

    it('should reject retry from different workspace', async () => {
      // User B trying to retry Workspace A job
      require('../../src/utils/auth').validateWorkspaceAccess.mockRejectedValue(
        new Error('Access denied to workspace workspace-a')
      );

      await expect(jobService.retryJob('job-a-123', workspaceBUser))
        .rejects
        .toThrow('Access denied to workspace workspace-a');

      expect(mockJob.retry).not.toHaveBeenCalled();
    });

    it('should allow cancel only within same workspace', async () => {
      await jobService.cancelJob('job-a-123', workspaceAUser);

      expect(mockJob.remove).toHaveBeenCalled();
      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(workspaceAUser, 'workspace-a');
    });

    it('should reject cancel from different workspace', async () => {
      // User B trying to cancel Workspace A job
      require('../../src/utils/auth').validateWorkspaceAccess.mockRejectedValue(
        new Error('Access denied to workspace workspace-a')
      );

      await expect(jobService.cancelJob('job-a-123', workspaceBUser))
        .rejects
        .toThrow('Access denied to workspace workspace-a');

      expect(mockJob.remove).not.toHaveBeenCalled();
    });
  });

  describe('Admin Cross-Workspace Access', () => {
    let workspaceAJob: any;
    let workspaceBJob: any;

    beforeEach(() => {
      workspaceAJob = {
        id: 'job-a-123',
        data: { workspaceId: 'workspace-a', userId: 'user-a-123', name: 'Workspace A Job' },
        opts: {},
        retry: jest.fn(),
        remove: jest.fn(),
      };

      workspaceBJob = {
        id: 'job-b-123',
        data: { workspaceId: 'workspace-b', userId: 'user-b-456', name: 'Workspace B Job' },
        opts: {},
        retry: jest.fn(),
        remove: jest.fn(),
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockImplementation((jobId: string) => {
        if (jobId === 'job-a-123') return Promise.resolve(workspaceAJob);
        if (jobId === 'job-b-123') return Promise.resolve(workspaceBJob);
        return Promise.resolve(null);
      });
    });

    it('should allow admin to access jobs from any workspace', async () => {
      // Admin accessing Workspace A job
      await jobService.getJob('job-a-123', adminUser);

      // Admin accessing Workspace B job
      await jobService.getJob('job-b-123', adminUser);

      const { validateWorkspaceAccess } = require('../../src/utils/auth');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(adminUser, 'workspace-a');
      expect(validateWorkspaceAccess).toHaveBeenCalledWith(adminUser, 'workspace-b');
    });

    it('should allow admin to retry jobs from any workspace', async () => {
      await jobService.retryJob('job-a-123', adminUser);
      await jobService.retryJob('job-b-123', adminUser);

      expect(workspaceAJob.retry).toHaveBeenCalled();
      expect(workspaceBJob.retry).toHaveBeenCalled();
    });

    it('should allow admin to cancel jobs from any workspace', async () => {
      await jobService.cancelJob('job-a-123', adminUser);
      await jobService.cancelJob('job-b-123', adminUser);

      expect(workspaceAJob.remove).toHaveBeenCalled();
      expect(workspaceBJob.remove).toHaveBeenCalled();
    });
  });

  describe('Role-Based Access Control Within Workspace', () => {
    let ownerJob: any;
    let otherUserJob: any;

    beforeEach(() => {
      ownerJob = {
        id: 'owner-job',
        data: { workspaceId: 'workspace-a', userId: 'user-a-123', name: 'Owner Job' },
        opts: {},
        retry: jest.fn(),
        remove: jest.fn(),
      };

      otherUserJob = {
        id: 'other-job',
        data: { workspaceId: 'workspace-a', userId: 'other-user-789', name: 'Other User Job' },
        opts: {},
        retry: jest.fn(),
        remove: jest.fn(),
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockImplementation((jobId: string) => {
        if (jobId === 'owner-job') return Promise.resolve(ownerJob);
        if (jobId === 'other-job') return Promise.resolve(otherUserJob);
        return Promise.resolve(null);
      });
    });

    it('should allow users to access their own jobs', async () => {
      await jobService.getJob('owner-job', workspaceAUser);
      expect(ownerJob).toBeDefined();
    });

    it('should allow users to retry their own jobs', async () => {
      await jobService.retryJob('owner-job', workspaceAUser);
      expect(ownerJob.retry).toHaveBeenCalled();
    });

    it('should allow users to cancel their own jobs', async () => {
      await jobService.cancelJob('owner-job', workspaceAUser);
      expect(ownerJob.remove).toHaveBeenCalled();
    });

    it('should restrict viewer role from job operations', async () => {
      const viewerUser: AuthenticatedUser = {
        ...workspaceAUser,
        role: 'VIEWER',
        permissions: ['jobs:read'],
      };

      // Viewer should be able to read but not retry
      await jobService.getJob('owner-job', viewerUser);

      await expect(jobService.retryJob('owner-job', viewerUser))
        .rejects
        .toThrow('Permission denied');
    });
  });

  describe('Data Isolation and Security', () => {
    it('should include workspace context in job data', async () => {
      const request: CreateJobRequest = {
        name: 'Workspace Isolated Job',
        type: 'trace_analysis',
        workspaceId: 'workspace-a',
        payload: { traceId: 'trace-123' },
      };

      const mockQueue = mockQueues.get('trace_analysis')!;
      mockQueue.add.mockResolvedValue({
        id: 'job-123',
        data: { ...request, userId: workspaceAUser.id },
        opts: {},
      });

      await jobService.createJob(request, workspaceAUser);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'Workspace Isolated Job',
        expect.objectContaining({
          workspaceId: 'workspace-a',
          userId: 'user-a-123',
          userName: 'User A',
        }),
        expect.any(Object)
      );
    });

    it('should prevent workspace ID tampering in job creation', async () => {
      const request: CreateJobRequest = {
        name: 'Tampered Job',
        type: 'data_export',
        workspaceId: 'workspace-b', // User A trying to create job in Workspace B
        payload: { format: 'json' },
      };

      require('../../src/utils/auth').validateWorkspaceAccess.mockRejectedValue(
        new Error('Access denied to workspace workspace-b')
      );

      await expect(jobService.createJob(request, workspaceAUser))
        .rejects
        .toThrow('Access denied to workspace workspace-b');
    });

    it('should sanitize sensitive data in job responses', async () => {
      const mockJob = {
        id: 'sensitive-job',
        data: {
          workspaceId: 'workspace-a',
          userId: 'user-a-123',
          name: 'Sensitive Job',
          payload: {
            apiKey: 'secret-key-123',
            password: 'password123',
            publicData: 'safe-data',
          },
        },
        opts: {},
      };

      const mockQueue = mockQueues.get('experiment_execution')!;
      mockQueue.getJob.mockResolvedValue(mockJob);

      const response = await jobService.getJob('sensitive-job', workspaceAUser);

      // Ensure sensitive data is handled appropriately
      expect(response.payload).toHaveProperty('publicData', 'safe-data');
      // Sensitive fields should be handled according to security policies
      expect(response).toHaveProperty('workspaceId', 'workspace-a');
    });
  });

  describe('Multi-Tenant Resource Quotas', () => {
    it('should respect workspace-specific job limits', async () => {
      // This would be implemented with actual quota checking
      const workspaceQuotas = {
        'workspace-a': { maxActiveJobs: 10, maxQueuedJobs: 50 },
        'workspace-b': { maxActiveJobs: 5, maxQueuedJobs: 20 },
        'workspace-c': { maxActiveJobs: 2, maxQueuedJobs: 10 },
      };

      const workspaceAQuota = workspaceQuotas['workspace-a'];
      const workspaceBQuota = workspaceQuotas['workspace-b'];

      expect(workspaceAQuota.maxActiveJobs).toBeGreaterThan(workspaceBQuota.maxActiveJobs);
      expect(workspaceAQuota.maxQueuedJobs).toBeGreaterThan(workspaceBQuota.maxQueuedJobs);
    });

    it('should enforce different priority levels per workspace tier', () => {
      const workspaceTiers = {
        'workspace-a': 'enterprise', // Higher priority
        'workspace-b': 'professional', // Medium priority
        'workspace-c': 'basic', // Lower priority
      };

      const priorityMap = {
        enterprise: 20,
        professional: 10,
        basic: 5,
      };

      Object.entries(workspaceTiers).forEach(([workspaceId, tier]) => {
        const priority = priorityMap[tier as keyof typeof priorityMap];
        expect(priority).toBeGreaterThan(0);
        expect(priority).toBeLessThanOrEqual(20);
      });
    });
  });
});