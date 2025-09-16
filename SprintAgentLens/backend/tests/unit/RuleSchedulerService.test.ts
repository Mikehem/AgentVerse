import { RuleSchedulerService } from '../../src/services/RuleSchedulerService';
import { CronJob } from 'cron';
import type {
  RuleSchedule,
  ScheduleConfig,
  ScheduledExecution,
  SchedulerStatus,
  ScheduleValidation,
  CronExpression,
  IntervalConfig,
  OneTimeConfig,
  ScheduleType,
  ExecutionWindow,
  ScheduleConstraints,
  HealthMetrics,
} from '../../src/types/automationRules';

// Mock cron library
jest.mock('cron');
const MockCronJob = CronJob as jest.MockedClass<typeof CronJob>;

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock AutomationRuleService
const mockRuleService = {
  executeRule: jest.fn(),
  getRuleEntity: jest.fn(),
  updateRuleStatistics: jest.fn(),
};

jest.mock('../../src/services/AutomationRuleService', () => ({
  AutomationRuleService: jest.fn(() => mockRuleService),
}));

describe('RuleSchedulerService', () => {
  let schedulerService: RuleSchedulerService;
  let mockCronJob: jest.Mocked<CronJob>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    schedulerService = new RuleSchedulerService();

    // Mock CronJob instance
    mockCronJob = {
      start: jest.fn(),
      stop: jest.fn(),
      destroy: jest.fn(),
      running: false,
      cronTime: {
        source: '0 */6 * * *',
        zone: 'UTC',
      },
      onTick: jest.fn(),
      onComplete: jest.fn(),
    } as any;

    MockCronJob.mockImplementation(() => mockCronJob);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Schedule Management', () => {
    test('should create and start cron schedule successfully', async () => {
      const schedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 */6 * * *', // Every 6 hours
          timezone: 'UTC',
        },
        constraints: {
          maxExecutions: 100,
          executionWindows: [
            {
              startTime: '09:00',
              endTime: '17:00',
              timezone: 'America/New_York',
              days: [1, 2, 3, 4, 5], // Monday to Friday
            },
          ],
        },
        metadata: {
          createdBy: 'user-123',
          description: 'Business hours evaluation',
        },
      };

      const ruleId = 'rule-123';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'test-rule',
        workspaceId: 'workspace-123',
        isActive: true,
      });

      const result = await schedulerService.scheduleRule(ruleId, schedule);

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
      expect(MockCronJob).toHaveBeenCalledWith(
        '0 */6 * * *',
        expect.any(Function),
        null,
        false, // Don't start immediately
        'UTC'
      );
      expect(mockCronJob.start).toHaveBeenCalled();
    });

    test('should create interval-based schedule', async () => {
      const schedule: RuleSchedule = {
        type: 'interval',
        config: {
          type: 'interval',
          intervalMs: 3600000, // 1 hour
          maxExecutions: 24,
        },
        constraints: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-12-31T23:59:59Z'),
        },
      };

      const ruleId = 'rule-456';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'interval-rule',
        workspaceId: 'workspace-123',
        isActive: true,
      });

      const result = await schedulerService.scheduleRule(ruleId, schedule);

      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
      expect(result.nextExecution).toBeDefined();
      
      // Verify interval was set correctly
      const scheduledJob = (schedulerService as any).scheduledJobs.get(result.scheduleId);
      expect(scheduledJob).toBeDefined();
      expect(scheduledJob.config.intervalMs).toBe(3600000);
    });

    test('should create one-time schedule', async () => {
      const executionTime = new Date(Date.now() + 3600000); // 1 hour from now

      const schedule: RuleSchedule = {
        type: 'one_time',
        config: {
          type: 'one_time',
          executeAt: executionTime,
          retryOnFailure: true,
          maxRetries: 3,
        },
      };

      const ruleId = 'rule-789';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'one-time-rule',
        workspaceId: 'workspace-123',
        isActive: true,
      });

      const result = await schedulerService.scheduleRule(ruleId, schedule);

      expect(result.success).toBe(true);
      expect(result.nextExecution).toEqual(executionTime);
    });

    test('should validate cron expressions', () => {
      const validExpressions = [
        '0 0 * * *',      // Daily at midnight
        '*/15 * * * *',   // Every 15 minutes
        '0 9-17 * * 1-5', // Business hours, weekdays
        '0 0 1 * *',      // Monthly on 1st
        '0 0 * * 0',      // Weekly on Sunday
      ];

      const invalidExpressions = [
        '60 * * * *',     // Invalid minute (>59)
        '* * 32 * *',     // Invalid day (>31)
        '* * * 13 *',     // Invalid month (>12)
        '* * * * 8',      // Invalid day of week (>7)
        'invalid',        // Not a cron expression
        '',               // Empty string
      ];

      validExpressions.forEach(expr => {
        const validation = schedulerService.validateCronExpression(expr);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toHaveLength(0);
      });

      invalidExpressions.forEach(expr => {
        const validation = schedulerService.validateCronExpression(expr);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.length).toBeGreaterThan(0);
      });
    });

    test('should handle execution window constraints', async () => {
      const schedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 * * * *', // Every hour
          timezone: 'America/New_York',
        },
        constraints: {
          executionWindows: [
            {
              startTime: '09:00',
              endTime: '17:00',
              timezone: 'America/New_York',
              days: [1, 2, 3, 4, 5], // Monday to Friday
            },
          ],
        },
      };

      const ruleId = 'rule-window';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'windowed-rule',
        workspaceId: 'workspace-123',
        isActive: true,
      });

      await schedulerService.scheduleRule(ruleId, schedule);

      // Test execution during allowed window (Tuesday 2PM EST)
      const allowedTime = new Date('2024-01-02T19:00:00Z'); // 2PM EST in UTC
      jest.setSystemTime(allowedTime);
      
      const allowedResult = schedulerService.isWithinExecutionWindow(schedule, allowedTime);
      expect(allowedResult).toBe(true);

      // Test execution outside window (Tuesday 6AM EST)
      const blockedTime = new Date('2024-01-02T11:00:00Z'); // 6AM EST in UTC
      const blockedResult = schedulerService.isWithinExecutionWindow(schedule, blockedTime);
      expect(blockedResult).toBe(false);

      // Test execution on weekend
      const weekendTime = new Date('2024-01-06T19:00:00Z'); // Saturday 2PM EST
      const weekendResult = schedulerService.isWithinExecutionWindow(schedule, weekendTime);
      expect(weekendResult).toBe(false);
    });
  });

  describe('Schedule Execution', () => {
    test('should execute scheduled rule and update statistics', async () => {
      const schedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 0 * * *',
          timezone: 'UTC',
        },
      };

      const ruleId = 'rule-exec';
      const mockRule = {
        id: ruleId,
        name: 'execution-test-rule',
        workspaceId: 'workspace-123',
        isActive: true,
        trigger: { type: 'schedule' },
      };

      mockRuleService.getRuleEntity.mockResolvedValue(mockRule);
      mockRuleService.executeRule.mockResolvedValue({
        id: 'exec-123',
        status: 'completed',
        executionTimeMs: 1500,
      });

      await schedulerService.scheduleRule(ruleId, schedule);

      // Simulate cron execution
      const cronCallback = MockCronJob.mock.calls[0][1] as Function;
      await cronCallback();

      expect(mockRuleService.executeRule).toHaveBeenCalledWith({
        ruleId,
        trigger: {
          type: 'schedule',
          triggeredBy: 'scheduler',
          timestamp: expect.any(Date),
          source: 'cron',
          scheduleId: expect.any(String),
        },
        options: {
          async: true,
        },
      }, expect.any(Object));

      expect(mockRuleService.updateRuleStatistics).toHaveBeenCalledWith(
        ruleId,
        expect.objectContaining({
          lastExecutionStatus: 'completed',
          lastExecutedAt: expect.any(Date),
        })
      );
    });

    test('should handle execution failures and retry logic', async () => {
      const schedule: RuleSchedule = {
        type: 'interval',
        config: {
          type: 'interval',
          intervalMs: 60000, // 1 minute
          retryOnFailure: true,
          maxRetries: 3,
          retryBackoffMs: 5000,
        },
      };

      const ruleId = 'rule-retry';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'retry-rule',
        isActive: true,
      });

      // Mock initial failure, then success
      let executionCount = 0;
      mockRuleService.executeRule.mockImplementation(() => {
        executionCount++;
        if (executionCount < 3) {
          return Promise.resolve({
            id: `exec-${executionCount}`,
            status: 'failed',
            error: 'Temporary failure',
          });
        }
        return Promise.resolve({
          id: `exec-${executionCount}`,
          status: 'completed',
          executionTimeMs: 1200,
        });
      });

      const result = await schedulerService.scheduleRule(ruleId, schedule);
      expect(result.success).toBe(true);

      // Trigger execution
      const scheduledJob = (schedulerService as any).scheduledJobs.get(result.scheduleId);
      await scheduledJob.executeWithRetry();

      expect(mockRuleService.executeRule).toHaveBeenCalledTimes(3);
      
      // Final execution should be successful
      const lastCall = mockRuleService.executeRule.mock.calls[2];
      expect(lastCall).toBeDefined();
    });

    test('should handle concurrent execution limits', async () => {
      const schedule: RuleSchedule = {
        type: 'interval',
        config: {
          type: 'interval',
          intervalMs: 1000, // 1 second - very frequent
          maxConcurrentExecutions: 2,
        },
      };

      const ruleId = 'rule-concurrent';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'concurrent-rule',
        isActive: true,
      });

      // Mock slow executions
      mockRuleService.executeRule.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              id: `exec-${Date.now()}`,
              status: 'completed',
              executionTimeMs: 3000,
            });
          }, 3000);
        });
      });

      await schedulerService.scheduleRule(ruleId, schedule);

      // Simulate rapid interval triggers
      const scheduledJob = (schedulerService as any).scheduledJobs.get(ruleId);
      const execPromises = [
        scheduledJob.execute(),
        scheduledJob.execute(),
        scheduledJob.execute(),
        scheduledJob.execute(),
      ];

      // Wait for executions to start
      jest.advanceTimersByTime(100);

      const activeExecutions = schedulerService.getActiveExecutions(ruleId);
      expect(activeExecutions.length).toBeLessThanOrEqual(2);
    });

    test('should pause and resume schedules', async () => {
      const schedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '* * * * *', // Every minute
          timezone: 'UTC',
        },
      };

      const ruleId = 'rule-pause';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'pauseable-rule',
        isActive: true,
      });

      const result = await schedulerService.scheduleRule(ruleId, schedule);
      expect(result.success).toBe(true);

      // Pause the schedule
      const pauseResult = await schedulerService.pauseSchedule(result.scheduleId);
      expect(pauseResult.success).toBe(true);
      expect(mockCronJob.stop).toHaveBeenCalled();

      // Resume the schedule
      const resumeResult = await schedulerService.resumeSchedule(result.scheduleId);
      expect(resumeResult.success).toBe(true);
      expect(mockCronJob.start).toHaveBeenCalledTimes(2); // Once for initial, once for resume
    });

    test('should handle schedule updates', async () => {
      const initialSchedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 0 * * *', // Daily
          timezone: 'UTC',
        },
      };

      const updatedSchedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 */6 * * *', // Every 6 hours
          timezone: 'UTC',
        },
        constraints: {
          maxExecutions: 100,
        },
      };

      const ruleId = 'rule-update';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'updatable-rule',
        isActive: true,
      });

      // Create initial schedule
      const initialResult = await schedulerService.scheduleRule(ruleId, initialSchedule);
      expect(initialResult.success).toBe(true);

      // Update the schedule
      const updateResult = await schedulerService.updateSchedule(
        initialResult.scheduleId,
        updatedSchedule
      );
      expect(updateResult.success).toBe(true);

      // Verify old job was stopped and new one created
      expect(mockCronJob.stop).toHaveBeenCalled();
      expect(MockCronJob).toHaveBeenCalledTimes(2); // Initial + updated
    });
  });

  describe('Health Monitoring', () => {
    test('should monitor scheduler health and performance', async () => {
      const schedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '*/5 * * * *', // Every 5 minutes
          timezone: 'UTC',
        },
      };

      const ruleId = 'rule-health';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'health-monitored-rule',
        isActive: true,
      });

      await schedulerService.scheduleRule(ruleId, schedule);

      // Simulate some executions
      const healthMetrics = await schedulerService.getHealthMetrics();

      expect(healthMetrics).toMatchObject({
        status: expect.stringMatching(/^(healthy|degraded|unhealthy)$/),
        activeSchedules: expect.any(Number),
        totalExecutions: expect.any(Number),
        averageExecutionTime: expect.any(Number),
        errorRate: expect.any(Number),
        uptime: expect.any(Number),
        memoryUsage: expect.any(Number),
        lastHealthCheck: expect.any(Date),
      });
    });

    test('should detect and report unhealthy schedules', async () => {
      const schedule: RuleSchedule = {
        type: 'interval',
        config: {
          type: 'interval',
          intervalMs: 60000, // 1 minute
          healthCheck: {
            enabled: true,
            maxConsecutiveFailures: 3,
            healthCheckInterval: 300000, // 5 minutes
          },
        },
      };

      const ruleId = 'rule-unhealthy';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'unhealthy-rule',
        isActive: true,
      });

      // Mock consecutive failures
      mockRuleService.executeRule.mockResolvedValue({
        id: 'exec-fail',
        status: 'failed',
        error: 'Rule execution failed',
      });

      const result = await schedulerService.scheduleRule(ruleId, schedule);
      expect(result.success).toBe(true);

      // Simulate multiple failed executions
      const scheduledJob = (schedulerService as any).scheduledJobs.get(result.scheduleId);
      await scheduledJob.execute();
      await scheduledJob.execute();
      await scheduledJob.execute();

      const healthStatus = await schedulerService.getScheduleHealth(result.scheduleId);
      expect(healthStatus.status).toBe('unhealthy');
      expect(healthStatus.consecutiveFailures).toBe(3);
      expect(healthStatus.issues).toContain('max_consecutive_failures_exceeded');
    });

    test('should implement graceful shutdown', async () => {
      const schedules: RuleSchedule[] = [
        {
          type: 'cron',
          config: { type: 'cron', cronExpression: '* * * * *', timezone: 'UTC' },
        },
        {
          type: 'interval',
          config: { type: 'interval', intervalMs: 30000 },
        },
      ];

      const ruleIds = ['rule-1', 'rule-2'];

      // Create multiple schedules
      for (let i = 0; i < schedules.length; i++) {
        mockRuleService.getRuleEntity.mockResolvedValue({
          id: ruleIds[i],
          name: `rule-${i + 1}`,
          isActive: true,
        });

        await schedulerService.scheduleRule(ruleIds[i], schedules[i]);
      }

      // Mock ongoing executions
      mockRuleService.executeRule.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              id: 'exec-shutdown',
              status: 'completed',
              executionTimeMs: 2000,
            });
          }, 2000);
        });
      });

      // Start some executions
      const activeJobs = (schedulerService as any).scheduledJobs;
      const executionPromises = Array.from(activeJobs.values()).map(
        (job: any) => job.execute()
      );

      // Initiate graceful shutdown
      const shutdownPromise = schedulerService.gracefulShutdown(5000); // 5 second timeout

      // Advance time to complete executions
      jest.advanceTimersByTime(2500);

      const shutdownResult = await shutdownPromise;

      expect(shutdownResult.success).toBe(true);
      expect(shutdownResult.completedExecutions).toBe(2);
      expect(shutdownResult.cancelledExecutions).toBe(0);
      expect(mockCronJob.stop).toHaveBeenCalledTimes(2);
    });
  });

  describe('Advanced Features', () => {
    test('should support schedule dependencies', async () => {
      const parentSchedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 0 * * *',
          timezone: 'UTC',
        },
      };

      const dependentSchedule: RuleSchedule = {
        type: 'cron',
        config: {
          type: 'cron',
          cronExpression: '0 1 * * *',
          timezone: 'UTC',
        },
        dependencies: [
          {
            ruleId: 'parent-rule',
            dependencyType: 'success',
            waitTimeoutMs: 3600000, // 1 hour
          },
        ],
      };

      mockRuleService.getRuleEntity.mockImplementation((id: string) => {
        return Promise.resolve({
          id,
          name: id,
          workspaceId: 'workspace-123',
          isActive: true,
        });
      });

      // Create parent schedule
      const parentResult = await schedulerService.scheduleRule('parent-rule', parentSchedule);
      expect(parentResult.success).toBe(true);

      // Create dependent schedule
      const dependentResult = await schedulerService.scheduleRule('dependent-rule', dependentSchedule);
      expect(dependentResult.success).toBe(true);

      // Mock parent execution success
      mockRuleService.executeRule.mockResolvedValueOnce({
        id: 'parent-exec',
        status: 'completed',
        executionTimeMs: 1000,
      });

      // Execute parent
      const parentJob = (schedulerService as any).scheduledJobs.get(parentResult.scheduleId);
      await parentJob.execute();

      // Execute dependent (should proceed since parent succeeded)
      mockRuleService.executeRule.mockResolvedValueOnce({
        id: 'dependent-exec',
        status: 'completed',
        executionTimeMs: 800,
      });

      const dependentJob = (schedulerService as any).scheduledJobs.get(dependentResult.scheduleId);
      const dependencyCheck = await dependentJob.checkDependencies();
      
      expect(dependencyCheck.canExecute).toBe(true);
      expect(dependencyCheck.blockedBy).toHaveLength(0);
    });

    test('should handle timezone conversions correctly', async () => {
      const timezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'Pacific/Sydney',
        'UTC',
      ];

      for (const timezone of timezones) {
        const schedule: RuleSchedule = {
          type: 'cron',
          config: {
            type: 'cron',
            cronExpression: '0 9 * * 1-5', // 9 AM weekdays
            timezone,
          },
        };

        const ruleId = `rule-${timezone.replace('/', '-')}`;
        mockRuleService.getRuleEntity.mockResolvedValue({
          id: ruleId,
          name: `timezone-rule-${timezone}`,
          isActive: true,
        });

        const result = await schedulerService.scheduleRule(ruleId, schedule);
        expect(result.success).toBe(true);

        // Verify next execution is calculated correctly for timezone
        const nextExecution = await schedulerService.getNextExecution(result.scheduleId);
        expect(nextExecution).toBeInstanceOf(Date);

        // Should be 9 AM in the specified timezone
        const nextInTimezone = nextExecution.toLocaleString('en-US', {
          timeZone: timezone,
          hour: '2-digit',
          minute: '2-digit',
        });
        expect(nextInTimezone).toContain('09:00');
      }
    });

    test('should provide comprehensive execution history', async () => {
      const schedule: RuleSchedule = {
        type: 'interval',
        config: {
          type: 'interval',
          intervalMs: 10000, // 10 seconds for testing
        },
      };

      const ruleId = 'rule-history';
      mockRuleService.getRuleEntity.mockResolvedValue({
        id: ruleId,
        name: 'history-rule',
        isActive: true,
      });

      await schedulerService.scheduleRule(ruleId, schedule);

      // Simulate multiple executions with different outcomes
      const executions = [
        { status: 'completed', executionTimeMs: 1000 },
        { status: 'failed', error: 'Temporary error', executionTimeMs: 500 },
        { status: 'completed', executionTimeMs: 1200 },
        { status: 'timeout', executionTimeMs: 30000 },
        { status: 'completed', executionTimeMs: 900 },
      ];

      for (const execution of executions) {
        mockRuleService.executeRule.mockResolvedValueOnce({
          id: `exec-${Date.now()}`,
          ...execution,
        });

        const scheduledJob = (schedulerService as any).scheduledJobs.get(ruleId);
        await scheduledJob.execute();
        
        // Advance time between executions
        jest.advanceTimersByTime(10000);
      }

      const history = await schedulerService.getExecutionHistory(ruleId, {
        limit: 10,
        offset: 0,
        includeFailures: true,
      });

      expect(history.executions).toHaveLength(5);
      expect(history.totalExecutions).toBe(5);
      expect(history.successfulExecutions).toBe(3);
      expect(history.failedExecutions).toBe(2);
      expect(history.averageExecutionTime).toBeCloseTo(6520, 0); // Average of execution times
      expect(history.successRate).toBeCloseTo(0.6, 1);
    });
  });
});