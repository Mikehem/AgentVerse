import { AutomationRuleService } from '../../src/services/AutomationRuleService';
import { LLMJudgeService } from '../../src/services/LLMJudgeService';
import { PythonMetricService } from '../../src/services/PythonMetricService';
import { RuleSchedulerService } from '../../src/services/RuleSchedulerService';
import { prisma } from '../../src/config/database';
import type {
  AuthenticatedUser,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  ExecuteRuleRequest,
  AutomationRule,
  RuleExecution,
  ExecutionStatus,
  RuleStatus,
  TriggerType,
  EvaluatorType,
  RuleType,
  ConditionOperator,
  ExecutionTrigger,
  ExecutionConfig,
  RetryConfig,
  TimeoutConfig,
  RuleMetadata,
  RulePermissions,
  RuleStatistics,
  RuleTrigger,
  RuleCondition,
  RuleEvaluator,
  RuleAction,
  RuleSchedule,
} from '../../src/types/automationRules';

// Mock dependencies
jest.mock('../../src/config/database', () => ({
  prisma: {
    automationRule: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    ruleExecution: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
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

jest.mock('../../src/services/BackgroundJobService', () => ({
  backgroundJobService: {
    addJob: jest.fn(),
    getJobStatus: jest.fn(),
    cancelJob: jest.fn(),
  },
}));

jest.mock('../../src/services/LLMJudgeService');
jest.mock('../../src/services/PythonMetricService');
jest.mock('../../src/services/RuleSchedulerService');

// Import mocked functions
import { validateWorkspaceAccess, checkResourcePermission } from '../../src/utils/auth';
import { logger } from '../../src/utils/logger';
import { backgroundJobService } from '../../src/services/BackgroundJobService';

describe('AutomationRuleService', () => {
  let automationRuleService: AutomationRuleService;
  let mockUser: AuthenticatedUser;
  let mockRule: AutomationRule;
  let mockExecution: RuleExecution;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create service instance
    automationRuleService = new AutomationRuleService();

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

    // Mock automation rule with JSON-serialized fields
    mockRule = {
      id: 'rule-123',
      name: 'test-rule',
      displayName: 'Test Automation Rule',
      description: 'Test rule for unit testing',
      type: 'evaluation',
      workspaceId: 'workspace-123',
      projectId: 'project-123',
      trigger: JSON.stringify({
        type: 'event',
        config: {
          type: 'event',
          eventTypes: ['trace_created'],
          eventSources: ['api'],
        },
      }),
      conditions: JSON.stringify([
        {
          field: 'score',
          operator: 'greater_than',
          value: 0.8,
          logicalOperator: 'and',
        },
      ]),
      evaluators: JSON.stringify([
        {
          id: 'eval-1',
          type: 'llm_judge',
          config: {
            model: 'gpt-4',
            prompt: 'Evaluate the response quality',
            temperature: 0.1,
          },
          weight: 1.0,
        },
      ]),
      actions: JSON.stringify([
        {
          id: 'action-1',
          type: 'notification',
          config: {
            type: 'email',
            recipients: ['admin@company.com'],
            template: 'rule-triggered',
          },
        },
      ]),
      executionConfig: JSON.stringify({
        maxConcurrentExecutions: 5,
        executionTimeoutMs: 300000,
        enableRetries: true,
        enableBatching: false,
        batchSize: 10,
        batchTimeoutMs: 60000,
      }),
      retryConfig: JSON.stringify({
        maxRetries: 3,
        backoffStrategy: 'exponential',
        initialDelayMs: 1000,
        maxDelayMs: 30000,
        retryableErrors: ['timeout', 'rate_limit', 'server_error'],
      }),
      timeoutConfig: JSON.stringify({
        evaluationTimeoutMs: 60000,
        actionTimeoutMs: 30000,
        totalExecutionTimeoutMs: 300000,
      }),
      status: 'active',
      isActive: true,
      priority: 5,
      schedule: JSON.stringify({
        type: 'cron',
        cronExpression: '0 */6 * * *',
        timezone: 'UTC',
      }),
      metadata: JSON.stringify({
        creator: 'user-123',
        creatorName: 'Test User',
        tags: ['quality', 'automation'],
        category: 'evaluation',
        version: 1,
        description: 'Automated quality evaluation rule',
      }),
      permissions: JSON.stringify({
        canRead: ['user-123'],
        canWrite: ['user-123'],
        canExecute: ['user-123'],
        canDelete: ['user-123'],
      }),
      statistics: JSON.stringify({
        totalExecutions: 25,
        successfulExecutions: 23,
        failedExecutions: 2,
        averageExecutionTimeMs: 1500,
        lastExecutionStatus: 'completed',
        successRate: 0.92,
        averageLatency: 1200,
        p95Latency: 2000,
        p99Latency: 3500,
        executionTrend: [],
        errorTrend: [],
      }),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'user-123',
      updatedAt: new Date('2024-01-02T00:00:00Z'),
      updatedBy: 'user-123',
      lastExecutedAt: new Date('2024-01-02T12:00:00Z'),
      nextExecutionAt: new Date('2024-01-02T18:00:00Z'),
    };

    // Mock rule execution
    mockExecution = {
      id: 'exec-123',
      ruleId: 'rule-123',
      ruleName: 'test-rule',
      workspaceId: 'workspace-123',
      projectId: 'project-123',
      status: 'completed',
      trigger: JSON.stringify({
        type: 'event',
        eventId: 'event-123',
        timestamp: new Date(),
        source: 'api',
      }),
      input: JSON.stringify({
        traceId: 'trace-123',
        data: { score: 0.85, text: 'Good response' },
      }),
      results: JSON.stringify({
        evaluatorResults: [
          {
            evaluatorId: 'eval-1',
            status: 'completed',
            result: { score: 0.9, reason: 'High quality response' },
            executionTimeMs: 1200,
          },
        ],
        actionResults: [
          {
            actionId: 'action-1',
            status: 'completed',
            result: { messageId: 'msg-123' },
            executionTimeMs: 300,
          },
        ],
      }),
      metadata: JSON.stringify({
        executorId: 'user-123',
        executorName: 'Test User',
        executionContext: 'automatic',
        retryCount: 0,
        executionDurationMs: 1500,
      }),
      error: null,
      startedAt: new Date('2024-01-02T12:00:00Z'),
      completedAt: new Date('2024-01-02T12:00:01.5Z'),
      createdAt: new Date('2024-01-02T12:00:00Z'),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createRule', () => {
    test('should create automation rule successfully', async () => {
      const request: CreateAutomationRuleRequest = {
        name: 'quality-evaluation',
        displayName: 'Quality Evaluation Rule',
        description: 'Automatically evaluate response quality',
        type: 'evaluation',
        projectId: 'project-123',
        trigger: {
          type: 'event',
          config: {
            type: 'event',
            eventTypes: ['trace_created'],
            eventSources: ['api'],
          },
        },
        conditions: [
          {
            field: 'score',
            operator: 'greater_than',
            value: 0.8,
            logicalOperator: 'and',
          },
        ],
        evaluators: [
          {
            id: 'eval-1',
            type: 'llm_judge',
            config: {
              model: 'gpt-4',
              prompt: 'Evaluate quality',
              temperature: 0.1,
            },
            weight: 1.0,
          },
        ],
        actions: [
          {
            id: 'action-1',
            type: 'notification',
            config: {
              type: 'email',
              recipients: ['admin@company.com'],
              template: 'rule-triggered',
            },
          },
        ],
        priority: 5,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.automationRule.create as jest.Mock).mockResolvedValue(mockRule);

      const result = await automationRuleService.createRule(request, mockUser);

      expect(validateWorkspaceAccess).toHaveBeenCalledWith(mockUser, mockUser.workspaceId);
      expect(prisma.automationRule.findFirst).toHaveBeenCalledWith({
        where: {
          name: request.name,
          workspaceId: mockUser.workspaceId,
          deletedAt: null,
        },
      });
      expect(prisma.automationRule.create).toHaveBeenCalled();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(request.name);
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(true);
      expect(result.canExecute).toBe(true);
    });

    test('should throw error if rule name already exists', async () => {
      const request: CreateAutomationRuleRequest = {
        name: 'existing-rule',
        displayName: 'Existing Rule',
        type: 'evaluation',
        trigger: {
          type: 'manual',
          config: {
            type: 'manual',
            requiresConfirmation: true,
          },
        },
        evaluators: [],
        actions: [],
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findFirst as jest.Mock).mockResolvedValue(mockRule);

      await expect(
        automationRuleService.createRule(request, mockUser)
      ).rejects.toThrow("Rule 'existing-rule' already exists in workspace");

      expect(prisma.automationRule.create).not.toHaveBeenCalled();
    });

    test('should validate required fields', async () => {
      const incompleteRequest = {
        name: 'test-rule',
        // Missing required fields
      } as CreateAutomationRuleRequest;

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(
        automationRuleService.createRule(incompleteRequest, mockUser)
      ).rejects.toThrow('Missing required field');
    });

    test('should enforce workspace access control', async () => {
      const request: CreateAutomationRuleRequest = {
        name: 'test-rule',
        displayName: 'Test Rule',
        type: 'evaluation',
        trigger: {
          type: 'manual',
          config: { type: 'manual', requiresConfirmation: true },
        },
        evaluators: [],
        actions: [],
      };

      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Resource belongs to different workspace')
      );

      await expect(
        automationRuleService.createRule(request, mockUser)
      ).rejects.toThrow('Access denied: Resource belongs to different workspace');

      expect(prisma.automationRule.create).not.toHaveBeenCalled();
    });
  });

  describe('updateRule', () => {
    test('should update automation rule successfully', async () => {
      const updateRequest: UpdateAutomationRuleRequest = {
        displayName: 'Updated Rule Name',
        description: 'Updated description',
        priority: 8,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
      (prisma.automationRule.update as jest.Mock).mockResolvedValue({
        ...mockRule,
        displayName: updateRequest.displayName,
        description: updateRequest.description,
        priority: updateRequest.priority,
        updatedAt: new Date(),
      });

      const result = await automationRuleService.updateRule('rule-123', updateRequest, mockUser);

      expect(result.displayName).toBe(updateRequest.displayName);
      expect(result.description).toBe(updateRequest.description);
      expect(result.priority).toBe(updateRequest.priority);
      expect(prisma.automationRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: expect.objectContaining({
          displayName: updateRequest.displayName,
          description: updateRequest.description,
          priority: updateRequest.priority,
        }),
      });
    });

    test('should throw error for non-existent rule', async () => {
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        automationRuleService.updateRule('non-existent', {}, mockUser)
      ).rejects.toThrow('Automation rule not found');
    });

    test('should enforce write permissions', async () => {
      const mockRuleOtherUser = {
        ...mockRule,
        permissions: JSON.stringify({
          canRead: ['other-user'],
          canWrite: ['other-user'],
          canExecute: ['other-user'],
          canDelete: ['other-user'],
        }),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRuleOtherUser);

      await expect(
        automationRuleService.updateRule('rule-123', { displayName: 'New Name' }, mockUser)
      ).rejects.toThrow('Insufficient permissions to write rule');
    });
  });

  describe('executeRule', () => {
    test('should execute rule successfully', async () => {
      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
          metadata: { reason: 'Manual test execution' },
        },
        input: {
          traceId: 'trace-123',
          data: { score: 0.85, text: 'Test response' },
        },
        options: {
          skipConditions: false,
          dryRun: false,
          async: true,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);
      (backgroundJobService.addJob as jest.Mock).mockResolvedValue({ id: 'job-123' });

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.id).toBeDefined();
      expect(result.status).toBe('pending');
      expect(prisma.ruleExecution.create).toHaveBeenCalled();
      expect(backgroundJobService.addJob).toHaveBeenCalled();
    });

    test('should validate rule conditions before execution', async () => {
      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: {
          traceId: 'trace-123',
          data: { score: 0.5 }, // Below threshold of 0.8
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.status).toBe('skipped');
      expect(result.skipReason).toContain('conditions not met');
    });

    test('should support dry run mode', async () => {
      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: {
          traceId: 'trace-123',
          data: { score: 0.9 },
        },
        options: {
          dryRun: true,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.isDryRun).toBe(true);
      expect(result.dryRunResults).toBeDefined();
      expect(prisma.ruleExecution.create).not.toHaveBeenCalled();
    });

    test('should enforce execute permissions', async () => {
      const mockRuleNoExecutePermission = {
        ...mockRule,
        permissions: JSON.stringify({
          canRead: ['user-123'],
          canWrite: ['user-123'],
          canExecute: ['other-user'], // No execute permission for mockUser
          canDelete: ['user-123'],
        }),
      };

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: { data: {} },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRuleNoExecutePermission);

      await expect(
        automationRuleService.executeRule(executeRequest, mockUser)
      ).rejects.toThrow('Insufficient permissions to execute rule');
    });
  });

  describe('listRules', () => {
    test('should list rules with filters and pagination', async () => {
      const listRequest = {
        workspaceId: 'workspace-123',
        projectId: 'project-123',
        type: 'evaluation' as RuleType,
        status: 'active' as RuleStatus,
        isActive: true,
        limit: 20,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
        search: 'quality',
      };

      const mockRules = [mockRule];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findMany as jest.Mock).mockResolvedValue(mockRules);
      (prisma.automationRule.count as jest.Mock).mockResolvedValue(1);

      const result = await automationRuleService.listRules(listRequest, mockUser);

      expect(result.rules).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
      expect(prisma.automationRule.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'workspace-123',
          projectId: 'project-123',
          type: 'evaluation',
          status: 'active',
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: 'quality' } },
            { displayName: { contains: 'quality' } },
            { description: { contains: 'quality' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    test('should filter rules by permissions', async () => {
      const listRequest = {
        workspaceId: 'workspace-123',
        limit: 10,
        offset: 0,
      };

      const mockRulesWithDifferentPermissions = [
        mockRule, // User has access
        {
          ...mockRule,
          id: 'rule-456',
          permissions: JSON.stringify({
            canRead: ['other-user'],
            canWrite: ['other-user'],
            canExecute: ['other-user'],
            canDelete: ['other-user'],
          }),
        }, // User doesn't have access
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findMany as jest.Mock).mockResolvedValue(mockRulesWithDifferentPermissions);
      (prisma.automationRule.count as jest.Mock).mockResolvedValue(2);

      const result = await automationRuleService.listRules(listRequest, mockUser);

      // Should only return rules the user can read
      expect(result.rules).toHaveLength(1);
      expect(result.rules[0].id).toBe('rule-123');
    });
  });

  describe('Rule Health Monitoring', () => {
    test('should get rule health status', async () => {
      const mockHealthyRule = {
        ...mockRule,
        statistics: JSON.stringify({
          totalExecutions: 100,
          successfulExecutions: 95,
          failedExecutions: 5,
          averageExecutionTimeMs: 1200,
          lastExecutionStatus: 'completed',
          successRate: 0.95,
          averageLatency: 1000,
          p95Latency: 1500,
          p99Latency: 2000,
        }),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockHealthyRule);

      const health = await automationRuleService.getRuleHealth('rule-123', mockUser);

      expect(health.status).toBe('healthy');
      expect(health.successRate).toBe(0.95);
      expect(health.averageLatency).toBe(1000);
      expect(health.checks).toContainEqual(
        expect.objectContaining({
          name: 'success_rate',
          status: 'healthy',
        })
      );
    });

    test('should detect unhealthy rule conditions', async () => {
      const mockUnhealthyRule = {
        ...mockRule,
        statistics: JSON.stringify({
          totalExecutions: 100,
          successfulExecutions: 60,
          failedExecutions: 40,
          averageExecutionTimeMs: 5000,
          lastExecutionStatus: 'failed',
          successRate: 0.6,
          averageLatency: 4500,
          p95Latency: 8000,
          p99Latency: 12000,
        }),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockUnhealthyRule);

      const health = await automationRuleService.getRuleHealth('rule-123', mockUser);

      expect(health.status).toBe('unhealthy');
      expect(health.successRate).toBe(0.6);
      expect(health.checks.some(check => check.status === 'warning' || check.status === 'critical')).toBe(true);
    });
  });

  describe('Rule Evaluation and Execution Engine', () => {
    test('should evaluate rule conditions correctly', async () => {
      const ruleWithComplexConditions = {
        ...mockRule,
        conditions: JSON.stringify([
          {
            field: 'score',
            operator: 'greater_than',
            value: 0.8,
            logicalOperator: 'and',
          },
          {
            field: 'category',
            operator: 'equals',
            value: 'quality',
            logicalOperator: 'and',
          },
          {
            field: 'tags',
            operator: 'contains',
            value: 'automated',
            logicalOperator: 'or',
          },
        ]),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithComplexConditions);

      // Test data that meets all AND conditions
      const passingData = {
        score: 0.85,
        category: 'quality',
        tags: ['manual', 'review'],
      };

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: { data: passingData },
        options: { dryRun: true },
      };

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.conditionsEvaluated).toBe(true);
      expect(result.conditionsPassed).toBe(true);
      expect(result.dryRunResults?.conditionResults).toHaveLength(3);
    });

    test('should handle different condition operators correctly', async () => {
      const testCases = [
        { operator: 'equals', value: 'test', input: 'test', expected: true },
        { operator: 'not_equals', value: 'test', input: 'other', expected: true },
        { operator: 'greater_than', value: 5, input: 10, expected: true },
        { operator: 'less_than', value: 10, input: 5, expected: true },
        { operator: 'greater_equal', value: 5, input: 5, expected: true },
        { operator: 'less_equal', value: 10, input: 10, expected: true },
        { operator: 'contains', value: 'test', input: 'this is a test', expected: true },
        { operator: 'not_contains', value: 'test', input: 'this is other', expected: true },
        { operator: 'starts_with', value: 'hello', input: 'hello world', expected: true },
        { operator: 'ends_with', value: 'world', input: 'hello world', expected: true },
        { operator: 'matches_regex', value: '^[A-Z]+$', input: 'HELLO', expected: true },
        { operator: 'in_array', value: ['a', 'b', 'c'], input: 'b', expected: true },
        { operator: 'not_in_array', value: ['a', 'b', 'c'], input: 'd', expected: true },
      ];

      for (const testCase of testCases) {
        const ruleWithSpecificCondition = {
          ...mockRule,
          conditions: JSON.stringify([
            {
              field: 'testField',
              operator: testCase.operator,
              value: testCase.value,
              logicalOperator: 'and',
            },
          ]),
        };

        (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithSpecificCondition);

        const executeRequest: ExecuteRuleRequest = {
          ruleId: 'rule-123',
          trigger: {
            type: 'manual',
            triggeredBy: 'user-123',
            timestamp: new Date(),
            source: 'api',
          },
          input: { data: { testField: testCase.input } },
          options: { dryRun: true },
        };

        const result = await automationRuleService.executeRule(executeRequest, mockUser);
        
        expect(result.conditionsPassed).toBe(testCase.expected);
      }
    });

    test('should execute evaluators in parallel with proper error handling', async () => {
      const ruleWithMultipleEvaluators = {
        ...mockRule,
        evaluators: JSON.stringify([
          {
            id: 'eval-llm',
            type: 'llm_judge',
            config: {
              model: 'gpt-4',
              prompt: 'Evaluate quality',
              temperature: 0.1,
            },
            weight: 0.6,
          },
          {
            id: 'eval-python',
            type: 'python_metric',
            config: {
              script: 'def evaluate(data): return data.get("score", 0)',
              timeout: 30,
            },
            weight: 0.4,
          },
        ]),
      };

      const mockLLMService = {
        evaluate: jest.fn().mockResolvedValue({
          score: 0.9,
          confidence: 0.95,
          reasoning: 'High quality response',
        }),
      };

      const mockPythonService = {
        executeMetric: jest.fn().mockResolvedValue({
          result: 0.85,
          executionTime: 150,
          metadata: { computed: true },
        }),
      };

      (LLMJudgeService as jest.MockedClass<typeof LLMJudgeService>).mockImplementation(
        () => mockLLMService as any
      );
      (PythonMetricService as jest.MockedClass<typeof PythonMetricService>).mockImplementation(
        () => mockPythonService as any
      );

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithMultipleEvaluators);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);
      (backgroundJobService.addJob as jest.Mock).mockResolvedValue({ id: 'job-123' });

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'api',
          triggeredBy: 'system',
          timestamp: new Date(),
          source: 'webhook',
        },
        input: {
          traceId: 'trace-123',
          data: { score: 0.85, text: 'Sample response' },
        },
        options: { async: false },
      };

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.status).toBe('completed');
      expect(result.evaluatorResults).toHaveLength(2);
      expect(mockLLMService.evaluate).toHaveBeenCalled();
      expect(mockPythonService.executeMetric).toHaveBeenCalled();
    });

    test('should handle evaluator failures gracefully', async () => {
      const ruleWithFailingEvaluator = {
        ...mockRule,
        evaluators: JSON.stringify([
          {
            id: 'eval-failing',
            type: 'llm_judge',
            config: {
              model: 'gpt-4',
              prompt: 'Evaluate',
            },
            weight: 1.0,
          },
        ]),
      };

      const mockLLMService = {
        evaluate: jest.fn().mockRejectedValue(new Error('API rate limit exceeded')),
      };

      (LLMJudgeService as jest.MockedClass<typeof LLMJudgeService>).mockImplementation(
        () => mockLLMService as any
      );

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithFailingEvaluator);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: { data: { score: 0.9 } },
        options: { async: false },
      };

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.status).toBe('failed');
      expect(result.evaluatorResults?.[0]?.error).toContain('API rate limit exceeded');
      expect(result.evaluatorResults?.[0]?.status).toBe('failed');
    });

    test('should execute actions after successful evaluation', async () => {
      const ruleWithActions = {
        ...mockRule,
        actions: JSON.stringify([
          {
            id: 'action-notification',
            type: 'notification',
            config: {
              type: 'email',
              recipients: ['admin@company.com'],
              template: 'rule-triggered',
              subject: 'Rule Executed: {{ruleName}}',
            },
          },
          {
            id: 'action-webhook',
            type: 'webhook',
            config: {
              url: 'https://api.example.com/webhook',
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            },
          },
        ]),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithActions);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);
      (backgroundJobService.addJob as jest.Mock).mockResolvedValue({ id: 'job-123' });

      // Mock HTTP request for webhook
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'event',
          eventId: 'event-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: {
          traceId: 'trace-123',
          data: { score: 0.9 },
        },
        options: { async: false },
      };

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.actionResults).toHaveLength(2);
      expect(result.actionResults?.[0]?.status).toBe('completed');
      expect(result.actionResults?.[1]?.status).toBe('completed');
      expect(fetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    test('should implement retry logic for failed executions', async () => {
      const ruleWithRetry = {
        ...mockRule,
        retryConfig: JSON.stringify({
          maxRetries: 3,
          backoffStrategy: 'exponential',
          initialDelayMs: 1000,
          maxDelayMs: 10000,
          retryableErrors: ['timeout', 'server_error'],
        }),
      };

      let attemptCount = 0;
      const mockFailingService = {
        evaluate: jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary server error');
          }
          return { score: 0.8, confidence: 0.9 };
        }),
      };

      (LLMJudgeService as jest.MockedClass<typeof LLMJudgeService>).mockImplementation(
        () => mockFailingService as any
      );

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithRetry);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'schedule',
          timestamp: new Date(),
          source: 'cron',
        },
        input: { data: { score: 0.85 } },
        options: { async: false },
      };

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.status).toBe('completed');
      expect(result.retryCount).toBe(2);
      expect(mockFailingService.evaluate).toHaveBeenCalledTimes(3);
    });

    test('should handle execution timeouts', async () => {
      const ruleWithTimeout = {
        ...mockRule,
        timeoutConfig: JSON.stringify({
          evaluationTimeoutMs: 1000,
          actionTimeoutMs: 500,
          totalExecutionTimeoutMs: 2000,
        }),
      };

      const mockSlowService = {
        evaluate: jest.fn().mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ score: 0.8 }), 2000))
        ),
      };

      (LLMJudgeService as jest.MockedClass<typeof LLMJudgeService>).mockImplementation(
        () => mockSlowService as any
      );

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(ruleWithTimeout);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);

      const executeRequest: ExecuteRuleRequest = {
        ruleId: 'rule-123',
        trigger: {
          type: 'manual',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'api',
        },
        input: { data: { score: 0.85 } },
        options: { async: false },
      };

      const result = await automationRuleService.executeRule(executeRequest, mockUser);

      expect(result.status).toBe('timeout');
      expect(result.error).toContain('timeout');
    });

    test('should support batch execution for multiple inputs', async () => {
      const batchRule = {
        ...mockRule,
        executionConfig: JSON.stringify({
          maxConcurrentExecutions: 5,
          executionTimeoutMs: 300000,
          enableRetries: true,
          enableBatching: true,
          batchSize: 3,
          batchTimeoutMs: 60000,
        }),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(batchRule);
      (prisma.ruleExecution.create as jest.Mock).mockResolvedValue(mockExecution);
      (backgroundJobService.addJob as jest.Mock).mockResolvedValue({ id: 'job-123' });

      const batchExecuteRequest = {
        ruleId: 'rule-123',
        batchInputs: [
          {
            traceId: 'trace-1',
            data: { score: 0.8, text: 'Response 1' },
          },
          {
            traceId: 'trace-2',
            data: { score: 0.9, text: 'Response 2' },
          },
          {
            traceId: 'trace-3',
            data: { score: 0.7, text: 'Response 3' },
          },
        ],
        trigger: {
          type: 'api',
          triggeredBy: 'user-123',
          timestamp: new Date(),
          source: 'batch_api',
        },
        options: {
          async: true,
          maxParallelExecutions: 2,
        },
      };

      const result = await automationRuleService.executeBatchRule(batchExecuteRequest, mockUser);

      expect(result.batchId).toBeDefined();
      expect(result.totalInputs).toBe(3);
      expect(result.status).toBe('queued');
      expect(backgroundJobService.addJob).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rule Statistics and Analytics', () => {
    test('should get rule statistics', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findUnique as jest.Mock).mockResolvedValue(mockRule);
      (prisma.ruleExecution.findMany as jest.Mock).mockResolvedValue([
        mockExecution,
        { ...mockExecution, id: 'exec-456', status: 'failed' },
      ]);

      const stats = await automationRuleService.getRuleStatistics('rule-123', mockUser);

      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successRate).toBeDefined();
      expect(stats.averageExecutionTime).toBeDefined();
      expect(stats.executionTrend).toBeDefined();
    });

    test('should get workspace rule analytics', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.automationRule.findMany as jest.Mock).mockResolvedValue([mockRule]);
      (prisma.automationRule.groupBy as jest.Mock).mockResolvedValue([
        { type: 'evaluation', _count: { id: 5 } },
        { type: 'notification', _count: { id: 3 } },
      ]);
      (prisma.ruleExecution.groupBy as jest.Mock).mockResolvedValue([
        { status: 'completed', _count: { id: 150 } },
        { status: 'failed', _count: { id: 10 } },
      ]);

      const analytics = await automationRuleService.getWorkspaceAnalytics('workspace-123', mockUser);

      expect(analytics.totalRules).toBeDefined();
      expect(analytics.activeRules).toBeDefined();
      expect(analytics.ruleDistribution).toBeDefined();
      expect(analytics.executionStats).toBeDefined();
      expect(analytics.successRate).toBeDefined();
    });
  });
});