/**
 * Performance Benchmark Tests
 * Comprehensive performance testing and benchmarking for all system components
 * Tests throughput, latency, memory usage, and scalability limits
 */

import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { AuthService } from '../../src/services/AuthService';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  operation: string;
  duration: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage?: number;
}

interface BenchmarkResult {
  testName: string;
  metrics: PerformanceMetrics[];
  summary: {
    averageDuration: number;
    maxDuration: number;
    minDuration: number;
    totalOperations: number;
    operationsPerSecond: number;
  };
}

describe('Performance Benchmark Tests', () => {
  let testWorkspace: any;
  let testUser: any;
  let authToken: string;
  let benchmarkResults: BenchmarkResult[] = [];

  beforeAll(async () => {
    await setupBenchmarkEnvironment();
  });

  afterAll(async () => {
    await cleanupBenchmarkEnvironment();
    await generatePerformanceReport();
    await prisma.$disconnect();
  });

  async function setupBenchmarkEnvironment() {
    // Create dedicated benchmark workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Performance Benchmark Workspace',
        slug: 'perf-benchmark',
        description: 'Workspace for performance testing',
      },
    });

    const salt = await AuthService.generateSalt();
    const hashedPassword = await AuthService.hashPassword('BenchmarkPass123!', salt);

    testUser = await prisma.user.create({
      data: {
        username: 'perf-benchmark-user',
        email: 'benchmark@perf.test',
        passwordHash: hashedPassword,
        salt,
        fullName: 'Performance Benchmark User',
        role: 'ADMIN',
        workspaceId: testWorkspace.id,
      },
    });

    // Authenticate
    const authResponse = await request(app)
      .post('/v1/enterprise/auth/login')
      .send({
        username: 'perf-benchmark-user',
        password: 'BenchmarkPass123!',
      });
    authToken = authResponse.body.token;
  }

  async function cleanupBenchmarkEnvironment() {
    await prisma.feedbackScore.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.feedbackDefinition.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.automationRule.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.dataset.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.project.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.userSession.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.workspace.delete({
      where: { id: testWorkspace.id },
    });
  }

  async function measurePerformance<T>(
    operation: string,
    func: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    const result = await func();

    const endTime = performance.now();
    const endMemory = process.memoryUsage();

    const duration = endTime - startTime;
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    return {
      result,
      metrics: {
        operation,
        duration,
        throughput: 1000 / duration, // operations per second
        memoryUsage: memoryDelta,
      },
    };
  }

  async function runBenchmark(
    testName: string,
    operations: Array<{ name: string; func: () => Promise<any> }>,
    iterations: number = 1
  ): Promise<BenchmarkResult> {
    const allMetrics: PerformanceMetrics[] = [];

    for (let i = 0; i < iterations; i++) {
      for (const operation of operations) {
        const { metrics } = await measurePerformance(operation.name, operation.func);
        allMetrics.push(metrics);
      }
    }

    const durations = allMetrics.map(m => m.duration);
    const totalOperations = allMetrics.length;

    const result: BenchmarkResult = {
      testName,
      metrics: allMetrics,
      summary: {
        averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        maxDuration: Math.max(...durations),
        minDuration: Math.min(...durations),
        totalOperations,
        operationsPerSecond: (totalOperations * 1000) / durations.reduce((a, b) => a + b, 0),
      },
    };

    benchmarkResults.push(result);
    return result;
  }

  async function generatePerformanceReport() {
    console.log('\n=== PERFORMANCE BENCHMARK REPORT ===\n');
    
    benchmarkResults.forEach(result => {
      console.log(`Test: ${result.testName}`);
      console.log(`  Total Operations: ${result.summary.totalOperations}`);
      console.log(`  Average Duration: ${result.summary.averageDuration.toFixed(2)}ms`);
      console.log(`  Min/Max Duration: ${result.summary.minDuration.toFixed(2)}ms / ${result.summary.maxDuration.toFixed(2)}ms`);
      console.log(`  Throughput: ${result.summary.operationsPerSecond.toFixed(2)} ops/sec`);
      console.log('');
    });

    // Performance thresholds validation
    benchmarkResults.forEach(result => {
      expect(result.summary.averageDuration).toBeLessThan(1000); // < 1 second average
      expect(result.summary.operationsPerSecond).toBeGreaterThan(1); // > 1 ops/sec
    });
  }

  describe('Authentication Performance', () => {
    it('should benchmark authentication operations', async () => {
      const result = await runBenchmark(
        'Authentication Operations',
        [
          {
            name: 'login',
            func: async () => {
              return request(app)
                .post('/v1/enterprise/auth/login')
                .send({
                  username: 'perf-benchmark-user',
                  password: 'BenchmarkPass123!',
                });
            },
          },
          {
            name: 'token_validation',
            func: async () => {
              return request(app)
                .get('/v1/enterprise/auth/me')
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        10 // 10 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(500); // < 500ms for auth operations
      expect(result.summary.operationsPerSecond).toBeGreaterThan(5); // > 5 ops/sec
    });
  });

  describe('Project Management Performance', () => {
    it('should benchmark project CRUD operations', async () => {
      let createdProjectId: string;

      const result = await runBenchmark(
        'Project CRUD Operations',
        [
          {
            name: 'create_project',
            func: async () => {
              const response = await request(app)
                .post('/v1/private/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  name: `Benchmark Project ${Date.now()}`,
                  description: 'Performance benchmark project',
                  workspaceId: testWorkspace.id,
                });
              createdProjectId = response.body.id;
              return response;
            },
          },
          {
            name: 'get_project',
            func: async () => {
              return request(app)
                .get(`/v1/private/projects/${createdProjectId}`)
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
          {
            name: 'update_project',
            func: async () => {
              return request(app)
                .patch(`/v1/private/projects/${createdProjectId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  description: `Updated at ${Date.now()}`,
                });
            },
          },
          {
            name: 'list_projects',
            func: async () => {
              return request(app)
                .get('/v1/private/projects?page=1&limit=10')
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        5 // 5 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(300); // < 300ms average
      expect(result.summary.operationsPerSecond).toBeGreaterThan(10); // > 10 ops/sec
    });
  });

  describe('Dataset Operations Performance', () => {
    it('should benchmark dataset operations at scale', async () => {
      // First create a project for datasets
      const projectResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Dataset Performance Project',
          description: 'Project for dataset performance testing',
          workspaceId: testWorkspace.id,
        });
      
      const project = projectResponse.body;

      const result = await runBenchmark(
        'Dataset Bulk Operations',
        [
          {
            name: 'bulk_create_datasets',
            func: async () => {
              // Create 5 datasets concurrently
              const promises = Array.from({ length: 5 }, (_, i) =>
                request(app)
                  .post('/v1/private/datasets')
                  .set('Authorization', `Bearer ${authToken}`)
                  .send({
                    name: `Perf Dataset ${Date.now()}-${i}`,
                    description: `Performance dataset ${i}`,
                    projectId: project.id,
                    workspaceId: testWorkspace.id,
                  })
              );
              return Promise.all(promises);
            },
          },
          {
            name: 'list_datasets_with_pagination',
            func: async () => {
              return request(app)
                .get(`/v1/private/datasets?projectId=${project.id}&page=1&limit=20`)
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        3 // 3 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(2000); // < 2 seconds for bulk ops
    });
  });

  describe('Feedback System Performance', () => {
    it('should benchmark feedback definition and scoring performance', async () => {
      let feedbackDefId: string;

      const result = await runBenchmark(
        'Feedback System Operations',
        [
          {
            name: 'create_feedback_definition',
            func: async () => {
              const response = await request(app)
                .post('/v1/private/feedback/definitions')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  name: `Perf Feedback ${Date.now()}`,
                  description: 'Performance test feedback definition',
                  type: 'numerical',
                  workspaceId: testWorkspace.id,
                  config: { min: 0, max: 10, step: 0.1 },
                });
              feedbackDefId = response.body.id;
              return response;
            },
          },
          {
            name: 'create_feedback_scores',
            func: async () => {
              // Create multiple feedback scores
              const promises = Array.from({ length: 10 }, (_, i) =>
                request(app)
                  .post('/v1/private/feedback/scores')
                  .set('Authorization', `Bearer ${authToken}`)
                  .send({
                    value: Math.random() * 10,
                    source: 'automated',
                    entityType: 'trace',
                    entityId: `trace-${Date.now()}-${i}`,
                    workspaceId: testWorkspace.id,
                    feedbackDefinitionId: feedbackDefId,
                  })
              );
              return Promise.all(promises);
            },
          },
          {
            name: 'aggregate_feedback_scores',
            func: async () => {
              return request(app)
                .get(`/v1/private/feedback/definitions/${feedbackDefId}/scores/aggregate`)
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        3 // 3 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(1500); // < 1.5 seconds
    });
  });

  describe('Automation Rules Performance', () => {
    it('should benchmark automation rule creation and evaluation', async () => {
      const result = await runBenchmark(
        'Automation Rules Operations',
        [
          {
            name: 'create_automation_rule',
            func: async () => {
              return request(app)
                .post('/v1/private/automation/rules')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  name: `Perf Rule ${Date.now()}`,
                  description: 'Performance test automation rule',
                  type: 'evaluation',
                  trigger: 'trace_completed',
                  isActive: true,
                  workspaceId: testWorkspace.id,
                  configuration: {
                    conditions: [
                      {
                        field: 'trace.duration',
                        operator: 'greater_than',
                        value: 1000,
                      },
                    ],
                    actions: [
                      {
                        type: 'llm_judge_evaluation',
                        config: {
                          model: 'gpt-3.5-turbo',
                          prompt: 'Evaluate performance',
                        },
                      },
                    ],
                  },
                  schedule: {
                    type: 'trigger',
                    enabled: true,
                  },
                });
            },
          },
          {
            name: 'list_automation_rules',
            func: async () => {
              return request(app)
                .get('/v1/private/automation/rules?page=1&limit=20')
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        5 // 5 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(800); // < 800ms
    });
  });

  describe('Background Jobs Performance', () => {
    it('should benchmark job creation and listing performance', async () => {
      const result = await runBenchmark(
        'Background Jobs Operations',
        [
          {
            name: 'create_background_job',
            func: async () => {
              return request(app)
                .post('/v1/private/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                  name: `Perf Job ${Date.now()}`,
                  type: 'data_export',
                  workspaceId: testWorkspace.id,
                  payload: {
                    format: 'csv',
                    entityType: 'project',
                    entityId: 'test-id',
                  },
                  options: {
                    priority: 'normal',
                    attempts: 3,
                  },
                });
            },
          },
          {
            name: 'list_jobs_with_filtering',
            func: async () => {
              return request(app)
                .get('/v1/private/jobs?type=data_export&status=waiting&page=1&limit=20')
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        5 // 5 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(400); // < 400ms
    });
  });

  describe('Complex Query Performance', () => {
    it('should benchmark complex cross-system queries', async () => {
      // Create test data first
      const project = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Complex Query Test Project',
          description: 'Project for complex query testing',
          workspaceId: testWorkspace.id,
        });

      // Create multiple datasets
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          request(app)
            .post('/v1/private/datasets')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Complex Dataset ${i}`,
              description: `Dataset ${i} for complex queries`,
              projectId: project.body.id,
              workspaceId: testWorkspace.id,
            })
        )
      );

      const result = await runBenchmark(
        'Complex Cross-System Queries',
        [
          {
            name: 'project_with_datasets_and_stats',
            func: async () => {
              return request(app)
                .get(`/v1/private/projects/${project.body.id}?include=datasets,stats`)
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
          {
            name: 'workspace_summary_query',
            func: async () => {
              return request(app)
                .get('/v1/private/workspaces/summary')
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
          {
            name: 'search_across_entities',
            func: async () => {
              return request(app)
                .get('/v1/private/search?q=Complex&types=projects,datasets&limit=20')
                .set('Authorization', `Bearer ${authToken}`);
            },
          },
        ],
        3 // 3 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(1000); // < 1 second for complex queries
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentOperations = async () => {
        const promises = Array.from({ length: 20 }, async (_, i) => {
          // Mix of different operations running concurrently
          const operations = [
            () => request(app)
              .get('/v1/private/projects?page=1&limit=5')
              .set('Authorization', `Bearer ${authToken}`),
            () => request(app)
              .get('/v1/private/datasets?page=1&limit=5')
              .set('Authorization', `Bearer ${authToken}`),
            () => request(app)
              .get('/v1/private/jobs?page=1&limit=5')
              .set('Authorization', `Bearer ${authToken}`),
            () => request(app)
              .get('/v1/enterprise/auth/me')
              .set('Authorization', `Bearer ${authToken}`),
          ];

          const operation = operations[i % operations.length];
          return operation();
        });

        return Promise.all(promises);
      };

      const result = await runBenchmark(
        'Concurrent Operations',
        [
          {
            name: 'concurrent_mixed_operations',
            func: concurrentOperations,
          },
        ],
        3 // 3 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(3000); // < 3 seconds for 20 concurrent ops
    });
  });

  describe('Memory Usage Performance', () => {
    it('should monitor memory usage during operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform memory-intensive operations
      const operations = [];
      for (let i = 0; i < 100; i++) {
        operations.push(
          request(app)
            .post('/v1/private/projects')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: `Memory Test Project ${i}`,
              description: `Project ${i} for memory testing`,
              workspaceId: testWorkspace.id,
            })
        );
      }

      await Promise.all(operations);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseInMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase: ${memoryIncreaseInMB.toFixed(2)} MB for 100 operations`);

      // Memory increase should be reasonable (< 100MB for 100 operations)
      expect(memoryIncreaseInMB).toBeLessThan(100);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Memory should be reasonable after operations
      const postGcMemory = process.memoryUsage();
      const postGcMemoryInMB = postGcMemory.heapUsed / (1024 * 1024);
      expect(postGcMemoryInMB).toBeLessThan(200); // < 200MB total heap usage
    });
  });

  describe('Database Performance', () => {
    it('should benchmark database query performance', async () => {
      const result = await runBenchmark(
        'Database Query Performance',
        [
          {
            name: 'complex_join_query',
            func: async () => {
              return prisma.project.findMany({
                where: { workspaceId: testWorkspace.id },
                include: {
                  datasets: {
                    include: {
                      createdByUser: true,
                    },
                  },
                  createdByUser: true,
                },
                take: 10,
              });
            },
          },
          {
            name: 'aggregation_query',
            func: async () => {
              return prisma.project.aggregate({
                where: { workspaceId: testWorkspace.id },
                _count: { id: true },
                _min: { createdAt: true },
                _max: { updatedAt: true },
              });
            },
          },
          {
            name: 'filtered_count_query',
            func: async () => {
              return prisma.dataset.count({
                where: {
                  workspaceId: testWorkspace.id,
                  createdAt: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                  },
                },
              });
            },
          },
        ],
        10 // 10 iterations
      );

      expect(result.summary.averageDuration).toBeLessThan(200); // < 200ms for DB queries
    });
  });
});