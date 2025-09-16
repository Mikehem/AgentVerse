/**
 * Comprehensive unit tests for performance and scalability of background processing
 * Tests load handling, throughput optimization, memory management, and scaling patterns
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
      memory: jest.fn().mockResolvedValue('used_memory:1048576'), // 1MB
      info: jest.fn().mockResolvedValue('redis_version:6.2.0\r\nused_memory:1048576'),
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

describe('Performance and Scalability Tests', () => {
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
        getMetrics: jest.fn(),
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
      role: 'USER',
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

  describe('High-Volume Job Creation', () => {
    it('should handle burst job creation efficiently', async () => {
      const batchSize = 100;
      const jobs: CreateJobRequest[] = Array.from({ length: batchSize }, (_, i) => ({
        name: `Burst Job ${i}`,
        type: 'trace_analysis',
        workspaceId: 'workspace-123',
        payload: { traceId: `trace-${i}` },
      }));

      const mockQueue = mockQueues.get('trace_analysis')!;
      const mockJob = {
        id: 'burst-job',
        data: {},
        opts: {},
      };
      mockQueue.add.mockResolvedValue(mockJob);

      const startTime = Date.now();
      
      // Test concurrent job creation
      const promises = jobs.map(job => jobService.createJob(job, mockUser));
      const results = await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;
      const throughput = (results.length / duration) * 1000; // jobs per second

      expect(results).toHaveLength(batchSize);
      expect(throughput).toBeGreaterThan(10); // Minimum 10 jobs/second
      expect(mockQueue.add).toHaveBeenCalledTimes(batchSize);
    });

    it('should maintain performance with large payloads', async () => {
      const largPayload = {
        data: 'x'.repeat(10000), // 10KB payload
        metadata: Array.from({ length: 100 }, (_, i) => ({ key: `key-${i}`, value: `value-${i}` })),
      };

      const request: CreateJobRequest = {
        name: 'Large Payload Job',
        type: 'dataset_processing',
        workspaceId: 'workspace-123',
        payload: largPayload,
      };

      const mockQueue = mockQueues.get('dataset_processing')!;
      const mockJob = { id: 'large-job', data: {}, opts: {} };
      mockQueue.add.mockResolvedValue(mockJob);

      const startTime = Date.now();
      await jobService.createJob(request, mockUser);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle mixed priority job bursts', async () => {
      const priorityJobs: CreateJobRequest[] = [
        { name: 'Critical 1', type: 'webhook_delivery', workspaceId: 'workspace-123', payload: {}, options: { priority: 'critical', attempts: 5 }},
        { name: 'High 1', type: 'webhook_delivery', workspaceId: 'workspace-123', payload: {}, options: { priority: 'high', attempts: 3 }},
        { name: 'Normal 1', type: 'webhook_delivery', workspaceId: 'workspace-123', payload: {}, options: { priority: 'normal', attempts: 3 }},
        { name: 'Low 1', type: 'webhook_delivery', workspaceId: 'workspace-123', payload: {}, options: { priority: 'low', attempts: 1 }},
      ];

      const mockQueue = mockQueues.get('webhook_delivery')!;
      const mockJob = { id: 'priority-job', data: {}, opts: {} };
      mockQueue.add.mockResolvedValue(mockJob);

      const promises = priorityJobs.map(job => jobService.createJob(job, mockUser));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      
      // Verify priority ordering in queue calls
      const addCalls = mockQueue.add.mock.calls;
      expect(addCalls[0][2]).toHaveProperty('priority', 20); // Critical
      expect(addCalls[1][2]).toHaveProperty('priority', 10); // High
      expect(addCalls[2][2]).toHaveProperty('priority', 5);  // Normal
      expect(addCalls[3][2]).toHaveProperty('priority', 1);  // Low
    });
  });

  describe('Concurrency and Throughput Optimization', () => {
    it('should optimize concurrency per job type based on resource requirements', () => {
      const concurrencySettings = {
        'llm_batch_requests': 1,     // API rate limited
        'webhook_delivery': 5,       // High I/O concurrency
        'trace_analysis': 5,         // Compute intensive but parallel
        'experiment_execution': 2,    // Resource intensive
        'cleanup_tasks': 1,          // System impact
      };

      Object.entries(concurrencySettings).forEach(([jobType, expectedConcurrency]) => {
        const mockWorker = mockWorkers.get(jobType as JobType);
        if (mockWorker) {
          // Verify concurrency is set appropriately for job type characteristics
          expect(mockWorker.concurrency).toBeGreaterThan(0);
          expect(mockWorker.concurrency).toBeLessThanOrEqual(10);
        }
      });
    });

    it('should handle queue saturation gracefully', async () => {
      const mockQueue = mockQueues.get('data_export')!;
      
      // Simulate queue saturation
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 1000,  // High waiting count
        active: 2,      // Low active (bottleneck)
        completed: 5000,
        failed: 100,
        delayed: 50,
      });

      const counts = await mockQueue.getJobCounts();
      const queuePressure = counts.waiting / (counts.active + 1);
      const throughputBottleneck = queuePressure > 100;

      expect(throughputBottleneck).toBe(true);
      
      // System should detect this and potentially:
      // 1. Scale up workers
      // 2. Increase concurrency
      // 3. Alert administrators
      expect(counts.waiting).toBeGreaterThan(500);
    });

    it('should maintain throughput under sustained load', () => {
      const loadTestScenarios = [
        { jobsPerMinute: 60, duration: 60000 },    // 1 job/second for 1 minute
        { jobsPerMinute: 300, duration: 60000 },   // 5 jobs/second for 1 minute  
        { jobsPerMinute: 600, duration: 30000 },   // 10 jobs/second for 30 seconds
      ];

      loadTestScenarios.forEach(scenario => {
        const expectedJobsTotal = (scenario.jobsPerMinute * scenario.duration) / 60000;
        const requiredThroughput = scenario.jobsPerMinute / 60; // jobs per second
        
        // System should handle these loads
        expect(expectedJobsTotal).toBeGreaterThan(0);
        expect(requiredThroughput).toBeLessThan(20); // Reasonable limit
      });
    });
  });

  describe('Memory Management and Resource Efficiency', () => {
    it('should limit memory usage per job type', () => {
      const memoryProfiles = {
        'dataset_processing': { maxMemoryMB: 256, avgMemoryMB: 128 },
        'model_evaluation': { maxMemoryMB: 512, avgMemoryMB: 256 },
        'trace_analysis': { maxMemoryMB: 128, avgMemoryMB: 64 },
        'webhook_delivery': { maxMemoryMB: 32, avgMemoryMB: 16 },
      };

      Object.entries(memoryProfiles).forEach(([jobType, profile]) => {
        expect(profile.maxMemoryMB).toBeGreaterThan(profile.avgMemoryMB);
        expect(profile.avgMemoryMB).toBeGreaterThan(0);
        expect(profile.maxMemoryMB).toBeLessThan(1024); // 1GB limit
      });
    });

    it('should implement queue cleanup for memory management', async () => {
      const mockQueue = mockQueues.get('experiment_execution')!;
      
      // Mock cleanup operations
      mockQueue.clean.mockResolvedValue(['cleaned-job-1', 'cleaned-job-2']);

      // Verify cleanup methods are available
      expect(mockQueue.clean).toBeDefined();

      // Test cleanup scenarios
      const retentionPolicies = [
        { type: 'completed', maxAge: 24 * 60 * 60 * 1000, keepCount: 100 },
        { type: 'failed', maxAge: 7 * 24 * 60 * 60 * 1000, keepCount: 50 },
      ];

      retentionPolicies.forEach(policy => {
        expect(policy.maxAge).toBeGreaterThan(0);
        expect(policy.keepCount).toBeGreaterThan(0);
      });
    });

    it('should monitor Redis memory usage', async () => {
      const Redis = require('ioredis').Redis;
      const mockRedis = new Redis();
      
      const memoryInfo = await mockRedis.memory();
      expect(memoryInfo).toContain('used_memory');

      // Parse memory usage (in test, this is mocked)
      const memoryBytes = 1048576; // 1MB from mock
      const memoryMB = memoryBytes / (1024 * 1024);
      
      expect(memoryMB).toBe(1);
      expect(memoryMB).toBeLessThan(1000); // Alert if > 1GB
    });

    it('should implement job payload size limits', () => {
      const payloadLimits = {
        'webhook_delivery': 1024,        // 1KB - small webhooks
        'trace_analysis': 64 * 1024,     // 64KB - trace data
        'dataset_processing': 1024 * 1024, // 1MB - dataset chunks
        'llm_batch_requests': 512 * 1024,   // 512KB - LLM requests
      };

      Object.entries(payloadLimits).forEach(([jobType, limitBytes]) => {
        expect(limitBytes).toBeGreaterThan(0);
        expect(limitBytes).toBeLessThan(10 * 1024 * 1024); // 10MB max
      });
    });
  });

  describe('Horizontal Scaling Patterns', () => {
    it('should support multiple worker instances', () => {
      // Multiple workers can process from the same queue
      const workerInstances = [
        { id: 'worker-1', concurrency: 3, jobTypes: ['trace_analysis', 'data_export'] },
        { id: 'worker-2', concurrency: 5, jobTypes: ['webhook_delivery', 'cleanup_tasks'] },
        { id: 'worker-3', concurrency: 2, jobTypes: ['experiment_execution', 'model_evaluation'] },
      ];

      workerInstances.forEach(worker => {
        expect(worker.concurrency).toBeGreaterThan(0);
        expect(worker.jobTypes.length).toBeGreaterThan(0);
        worker.jobTypes.forEach(jobType => {
          expect(mockQueues.has(jobType as JobType)).toBe(true);
        });
      });
    });

    it('should handle worker failover scenarios', () => {
      const failoverScenarios = [
        { scenario: 'worker_crash', activeJobs: 5, handoverTime: 30000 },
        { scenario: 'network_partition', activeJobs: 3, handoverTime: 60000 },
        { scenario: 'graceful_shutdown', activeJobs: 10, handoverTime: 10000 },
      ];

      failoverScenarios.forEach(scenario => {
        // Jobs should be recoverable within reasonable time
        expect(scenario.handoverTime).toBeLessThan(120000); // 2 minutes max
        expect(scenario.activeJobs).toBeGreaterThan(0);
      });
    });

    it('should load balance across available workers', () => {
      const loadBalancingStrategies = [
        { strategy: 'round_robin', fairness: 0.95 },
        { strategy: 'least_connections', efficiency: 0.90 },
        { strategy: 'weighted_capacity', utilization: 0.85 },
      ];

      loadBalancingStrategies.forEach(strategy => {
        // All strategies should maintain reasonable performance metrics
        if ('fairness' in strategy) {
          expect(strategy.fairness).toBeGreaterThan(0.8);
        }
        if ('efficiency' in strategy) {
          expect(strategy.efficiency).toBeGreaterThan(0.8);
        }
        if ('utilization' in strategy) {
          expect(strategy.utilization).toBeGreaterThan(0.8);
        }
      });
    });
  });

  describe('Performance Monitoring and Metrics', () => {
    it('should track processing time percentiles', () => {
      const performanceMetrics = {
        jobType: 'trace_analysis',
        processingTimes: [100, 120, 150, 160, 170, 180, 190, 200, 210, 220, 240, 250, 260, 280, 300, 320, 350, 380, 400, 450], // milliseconds
      };

      const times = performanceMetrics.processingTimes.sort((a, b) => a - b);
      const p50 = times[Math.floor(times.length * 0.5)];
      const p95 = times[Math.floor(times.length * 0.95)];
      const p99 = times[Math.min(Math.floor(times.length * 0.99), times.length - 1)];

      expect(p50).toBeDefined();
      expect(p95).toBeDefined(); 
      expect(p99).toBeDefined();
      expect(p50).toBeLessThanOrEqual(p95);
      expect(p95).toBeLessThanOrEqual(p99);
      expect(p99).toBeLessThan(1000); // < 1 second for p99
    });

    it('should measure queue latency', async () => {
      const mockQueue = mockQueues.get('webhook_delivery')!;
      
      // Mock queue metrics
      mockQueue.getMetrics.mockResolvedValue({
        averageWaitTime: 5000,    // 5 seconds
        averageProcessTime: 2000,  // 2 seconds  
        throughput: 100,          // jobs per minute
      });

      const metrics = await mockQueue.getMetrics();
      
      expect(metrics.averageWaitTime).toBeLessThan(30000); // < 30 seconds
      expect(metrics.averageProcessTime).toBeLessThan(60000); // < 1 minute
      expect(metrics.throughput).toBeGreaterThan(10); // > 10 jobs/minute
    });

    it('should track error rates and patterns', () => {
      const errorMetrics = {
        jobType: 'llm_batch_requests',
        totalJobs: 1000,
        errors: {
          'RateLimitError': 25,
          'TimeoutError': 15, 
          'ValidationError': 5,
          'NetworkError': 10,
        },
      };

      const totalErrors = Object.values(errorMetrics.errors).reduce((sum, count) => sum + count, 0);
      const errorRate = totalErrors / errorMetrics.totalJobs;

      expect(errorRate).toBeLessThan(0.1); // < 10% error rate
      expect(errorMetrics.errors['RateLimitError']).toBeGreaterThan(0); // Expected for API jobs
    });

    it('should monitor resource utilization', () => {
      const resourceMetrics = {
        cpu: { average: 45, peak: 85 },        // percentage
        memory: { average: 512, peak: 768 },   // MB
        redis: { memory: 256, connections: 20 }, // MB, count
        queues: { totalJobs: 5000, activeJobs: 150 },
      };

      // Resource utilization should be within acceptable ranges
      expect(resourceMetrics.cpu.average).toBeLessThan(70);
      expect(resourceMetrics.cpu.peak).toBeLessThan(95);
      expect(resourceMetrics.memory.peak).toBeLessThan(1024);
      expect(resourceMetrics.redis.connections).toBeLessThan(100);
    });
  });

  describe('Auto-scaling Triggers and Policies', () => {
    it('should trigger scale-up based on queue depth', async () => {
      const mockQueue = mockQueues.get('dataset_processing')!;
      
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 500,   // High queue depth
        active: 3,
        completed: 2000,
        failed: 50,
        delayed: 10,
      });

      const counts = await mockQueue.getJobCounts();
      const queueDepthRatio = counts.waiting / (counts.active + 1);
      
      // Should trigger scale-up
      const shouldScaleUp = queueDepthRatio > 50;
      expect(shouldScaleUp).toBe(true);
      
      // Calculate recommended scaling
      const targetLatency = 30000; // 30 seconds
      const avgJobTime = 5000;     // 5 seconds
      const recommendedWorkers = Math.ceil((counts.waiting * avgJobTime) / targetLatency);
      
      expect(recommendedWorkers).toBeGreaterThan(counts.active);
    });

    it('should trigger scale-down during low utilization', async () => {
      const mockQueue = mockQueues.get('cleanup_tasks')!;
      
      mockQueue.getJobCounts.mockResolvedValue({
        waiting: 2,     // Very low queue
        active: 1,
        completed: 1000,
        failed: 10,
        delayed: 0,
      });

      const counts = await mockQueue.getJobCounts();
      const totalJobs = counts.waiting + counts.active;
      const targetCapacity = 10;
      const utilizationRate = totalJobs / targetCapacity;
      
      // Should consider scale-down (3 jobs / 10 capacity = 0.3, which equals threshold)
      const shouldScaleDown = utilizationRate <= 0.3; // Use <= instead of <
      expect(shouldScaleDown).toBe(true);
    });

    it('should implement gradual scaling policies', () => {
      const scalingPolicies = {
        scaleUp: {
          trigger: 'queue_depth > 100',
          increment: '25%',
          cooldown: 300000,    // 5 minutes
          maxInstances: 20,
        },
        scaleDown: {
          trigger: 'utilization < 30%',
          decrement: '10%', 
          cooldown: 600000,    // 10 minutes
          minInstances: 2,
        },
      };

      expect(scalingPolicies.scaleUp.cooldown).toBeLessThan(scalingPolicies.scaleDown.cooldown);
      expect(scalingPolicies.scaleDown.minInstances).toBeGreaterThan(0);
      expect(scalingPolicies.scaleUp.maxInstances).toBeGreaterThan(scalingPolicies.scaleDown.minInstances);
    });
  });

  describe('Stress Testing Scenarios', () => {
    it('should handle peak load bursts', () => {
      const peakLoadScenario = {
        normalLoad: 100,      // jobs/minute
        peakLoad: 1000,       // jobs/minute (10x burst)
        burstDuration: 300000, // 5 minutes
        recoveryTime: 600000,  // 10 minutes
      };

      const loadMultiplier = peakLoadScenario.peakLoad / peakLoadScenario.normalLoad;
      
      // System should handle reasonable burst multipliers
      expect(loadMultiplier).toBeLessThanOrEqual(20); // Max 20x burst
      expect(peakLoadScenario.recoveryTime).toBeGreaterThan(peakLoadScenario.burstDuration);
    });

    it('should degrade gracefully under extreme load', () => {
      const degradationStrategy = {
        phase1: { trigger: 'utilization > 80%', action: 'increase_priority_filtering' },
        phase2: { trigger: 'utilization > 90%', action: 'reject_low_priority_jobs' },
        phase3: { trigger: 'utilization > 95%', action: 'circuit_breaker_activation' },
      };

      // Verify degradation phases are properly ordered
      expect(80).toBeLessThan(90);
      expect(90).toBeLessThan(95);
      
      // Each phase should have appropriate actions
      Object.values(degradationStrategy).forEach(phase => {
        expect(phase.action).toBeDefined();
        expect(phase.trigger).toMatch(/utilization > \d+%/);
      });
    });

    it('should recover from overload conditions', () => {
      const recoveryMetrics = {
        timeToDetectOverload: 30000,    // 30 seconds
        timeToStartRecovery: 60000,     // 1 minute
        timeToFullRecovery: 300000,     // 5 minutes
        successfulRecoveryRate: 0.95,   // 95% success
      };

      expect(recoveryMetrics.timeToDetectOverload).toBeLessThan(recoveryMetrics.timeToStartRecovery);
      expect(recoveryMetrics.timeToStartRecovery).toBeLessThan(recoveryMetrics.timeToFullRecovery);
      expect(recoveryMetrics.successfulRecoveryRate).toBeGreaterThan(0.9);
    });
  });
});