/**
 * Automation Rules Controller with enterprise authentication
 * Provides comprehensive rule management and execution endpoints with RBAC
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { automationRuleService } from '../services/AutomationRuleService';
import { ruleSchedulerService } from '../services/RuleSchedulerService';
import type {
  AuthenticatedUser,
  CreateAutomationRuleRequest,
  UpdateAutomationRuleRequest,
  ExecuteRuleRequest,
  RuleListRequest,
  ExecutionListRequest,
  RuleType,
  RuleStatus,
  ExecutionStatus,
  TriggerType,
  EvaluatorType,
} from '../types/automationRules';
import { logger } from '../utils/logger';

// Request/Response Types for FastifyRequest
interface CreateRuleBody extends CreateAutomationRuleRequest {}
interface UpdateRuleBody extends UpdateAutomationRuleRequest {}
interface ExecuteRuleBody extends ExecuteRuleRequest {}

interface RuleParams {
  id: string;
}

interface ExecutionParams {
  executionId: string;
}

interface RuleQuery extends Partial<RuleListRequest> {
  workspaceId?: string;
  projectId?: string;
  type?: string;
  status?: string;
  createdBy?: string;
  tags?: string;
  searchQuery?: string;
  hasSchedule?: string;
  isActive?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastExecutedAfter?: string;
  lastExecutedBefore?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
}

interface ExecutionQuery extends Omit<ExecutionListRequest, 'startedAfter' | 'startedBefore'> {
  ruleId?: string;
  workspaceId?: string;
  status?: string;
  triggeredBy?: string;
  startedAfter?: string;
  startedBefore?: string;
  minDuration?: string;
  maxDuration?: string;
  hasErrors?: string;
  sortBy?: string;
  sortOrder?: string;
  page?: string;
  limit?: string;
}

interface TestEvaluatorBody {
  evaluator: any; // RuleEvaluator
  inputData: any;
}

export class AutomationRulesController {
  
  // Rule Management Endpoints
  static async createRule(
    request: FastifyRequest<{ Body: CreateRuleBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const ruleRequest = request.body;

      logger.info('Creating automation rule', {
        name: ruleRequest.name,
        type: ruleRequest.type,
        projectId: ruleRequest.projectId,
        userId: user.id,
      });

      const rule = await automationRuleService.createRule(ruleRequest, user);

      // Schedule rule if it has a schedule and is active
      if (rule.schedule && rule.isActive) {
        try {
          await ruleSchedulerService.scheduleRule(rule as any);
        } catch (scheduleError) {
          logger.warn('Failed to schedule rule after creation', {
            ruleId: rule.id,
            error: scheduleError.message,
          });
        }
      }

      reply.status(201).send({
        success: true,
        data: rule,
        message: 'Automation rule created successfully',
      });

    } catch (error) {
      logger.error('Failed to create automation rule', {
        error: error.message,
        stack: error.stack,
        body: request.body,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'AutomationRuleError' ? 400 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
          field: error.field,
        },
      });
    }
  }

  static async updateRule(
    request: FastifyRequest<{ Params: RuleParams; Body: UpdateRuleBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;
      const updateRequest = request.body;

      logger.info('Updating automation rule', {
        ruleId: id,
        userId: user.id,
        changes: Object.keys(updateRequest),
      });

      const rule = await automationRuleService.updateRule(id, updateRequest, user);

      // Update schedule if changed
      if (updateRequest.schedule !== undefined) {
        try {
          if (updateRequest.schedule && rule.isActive) {
            await ruleSchedulerService.scheduleRule(rule as any);
          } else {
            await ruleSchedulerService.unscheduleRule(id);
          }
        } catch (scheduleError) {
          logger.warn('Failed to update rule schedule', {
            ruleId: id,
            error: scheduleError.message,
          });
        }
      }

      reply.send({
        success: true,
        data: rule,
        message: 'Automation rule updated successfully',
      });

    } catch (error) {
      logger.error('Failed to update automation rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 :
                        error.name === 'AutomationRuleError' ? 400 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async deleteRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Deleting automation rule', {
        ruleId: id,
        userId: user.id,
      });

      // Unschedule rule first
      try {
        await ruleSchedulerService.unscheduleRule(id);
      } catch (error) {
        logger.debug('Rule was not scheduled', { ruleId: id });
      }

      await automationRuleService.deleteRule(id, user);

      reply.send({
        success: true,
        message: 'Automation rule deleted successfully',
      });

    } catch (error) {
      logger.error('Failed to delete automation rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Getting automation rule', {
        ruleId: id,
        userId: user.id,
      });

      const rule = await automationRuleService.getRule(id, user);

      reply.send({
        success: true,
        data: rule,
      });

    } catch (error) {
      logger.error('Failed to get automation rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async listRules(
    request: FastifyRequest<{ Querystring: RuleQuery }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const query = request.query;

      logger.info('Listing automation rules', {
        query,
        userId: user.id,
      });

      // Parse query parameters
      const listRequest: RuleListRequest = {
        workspaceId: query.workspaceId,
        projectId: query.projectId,
        type: query.type as RuleType,
        status: query.status as RuleStatus,
        createdBy: query.createdBy,
        tags: query.tags ? query.tags.split(',') : undefined,
        searchQuery: query.searchQuery,
        hasSchedule: query.hasSchedule === 'true',
        isActive: query.isActive === 'true',
        createdAfter: query.createdAfter ? new Date(query.createdAfter) : undefined,
        createdBefore: query.createdBefore ? new Date(query.createdBefore) : undefined,
        lastExecutedAfter: query.lastExecutedAfter ? new Date(query.lastExecutedAfter) : undefined,
        lastExecutedBefore: query.lastExecutedBefore ? new Date(query.lastExecutedBefore) : undefined,
        sortBy: query.sortBy as any,
        sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? Math.min(parseInt(query.limit), 100) : 20,
      };

      const result = await automationRuleService.listRules(listRequest, user);

      reply.send({
        success: true,
        data: result.rules,
        pagination: result.pagination,
        aggregations: result.aggregations,
      });

    } catch (error) {
      logger.error('Failed to list automation rules', {
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

  // Rule Execution Endpoints
  static async executeRule(
    request: FastifyRequest<{ Params: RuleParams; Body: ExecuteRuleBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;
      const executeRequest = request.body || {};

      logger.info('Executing automation rule', {
        ruleId: id,
        dryRun: executeRequest.dryRun,
        debugMode: executeRequest.debugMode,
        userId: user.id,
      });

      const execution = await automationRuleService.executeRule(id, executeRequest, user);

      reply.status(202).send({
        success: true,
        data: execution,
        message: executeRequest.dryRun ? 'Rule dry run completed' : 'Rule execution started',
      });

    } catch (error) {
      logger.error('Failed to execute automation rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getExecution(
    request: FastifyRequest<{ Params: ExecutionParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { executionId } = request.params;

      logger.info('Getting rule execution', {
        executionId,
        userId: user.id,
      });

      const execution = await automationRuleService.getExecution(executionId, user);

      reply.send({
        success: true,
        data: execution,
      });

    } catch (error) {
      logger.error('Failed to get rule execution', {
        error: error.message,
        executionId: request.params.executionId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'ExecutionNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async listExecutions(
    request: FastifyRequest<{ Querystring: ExecutionQuery }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const query = request.query;

      logger.info('Listing rule executions', {
        query,
        userId: user.id,
      });

      // Parse query parameters
      const listRequest: ExecutionListRequest = {
        ruleId: query.ruleId,
        workspaceId: query.workspaceId,
        status: query.status as ExecutionStatus,
        triggeredBy: query.triggeredBy as TriggerType,
        startedAfter: query.startedAfter ? new Date(query.startedAfter) : undefined,
        startedBefore: query.startedBefore ? new Date(query.startedBefore) : undefined,
        minDuration: query.minDuration ? parseInt(query.minDuration) : undefined,
        maxDuration: query.maxDuration ? parseInt(query.maxDuration) : undefined,
        hasErrors: query.hasErrors === 'true',
        sortBy: query.sortBy as any,
        sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc',
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? Math.min(parseInt(query.limit), 100) : 20,
      };

      const result = await automationRuleService.listExecutions(listRequest, user);

      reply.send({
        success: true,
        data: result.executions,
        pagination: result.pagination,
        aggregations: result.aggregations,
      });

    } catch (error) {
      logger.error('Failed to list rule executions', {
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

  static async cancelExecution(
    request: FastifyRequest<{ Params: ExecutionParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { executionId } = request.params;

      logger.info('Cancelling rule execution', {
        executionId,
        userId: user.id,
      });

      await automationRuleService.cancelExecution(executionId, user);

      reply.send({
        success: true,
        message: 'Rule execution cancelled successfully',
      });

    } catch (error) {
      logger.error('Failed to cancel rule execution', {
        error: error.message,
        executionId: request.params.executionId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'ExecutionNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async retryExecution(
    request: FastifyRequest<{ Params: ExecutionParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { executionId } = request.params;

      logger.info('Retrying rule execution', {
        executionId,
        userId: user.id,
      });

      const execution = await automationRuleService.retryExecution(executionId, user);

      reply.send({
        success: true,
        data: execution,
        message: 'Rule execution retried successfully',
      });

    } catch (error) {
      logger.error('Failed to retry rule execution', {
        error: error.message,
        executionId: request.params.executionId,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'ExecutionNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Rule Status Management Endpoints
  static async activateRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Activating automation rule', {
        ruleId: id,
        userId: user.id,
      });

      const rule = await automationRuleService.activateRule(id, user);

      // Schedule rule if it has a schedule
      if (rule.schedule) {
        try {
          await ruleSchedulerService.scheduleRule(rule as any);
        } catch (scheduleError) {
          logger.warn('Failed to schedule activated rule', {
            ruleId: id,
            error: scheduleError.message,
          });
        }
      }

      reply.send({
        success: true,
        data: rule,
        message: 'Rule activated successfully',
      });

    } catch (error) {
      logger.error('Failed to activate rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async deactivateRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Deactivating automation rule', {
        ruleId: id,
        userId: user.id,
      });

      // Unschedule rule first
      try {
        await ruleSchedulerService.unscheduleRule(id);
      } catch (error) {
        logger.debug('Rule was not scheduled', { ruleId: id });
      }

      const rule = await automationRuleService.deactivateRule(id, user);

      reply.send({
        success: true,
        data: rule,
        message: 'Rule deactivated successfully',
      });

    } catch (error) {
      logger.error('Failed to deactivate rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async pauseRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Pausing automation rule', {
        ruleId: id,
        userId: user.id,
      });

      // Pause scheduler
      try {
        await ruleSchedulerService.pauseRule(id);
      } catch (error) {
        logger.debug('Rule was not scheduled', { ruleId: id });
      }

      const rule = await automationRuleService.pauseRule(id, user);

      reply.send({
        success: true,
        data: rule,
        message: 'Rule paused successfully',
      });

    } catch (error) {
      logger.error('Failed to pause rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async resumeRule(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Resuming automation rule', {
        ruleId: id,
        userId: user.id,
      });

      const rule = await automationRuleService.resumeRule(id, user);

      // Resume scheduler
      if (rule.schedule && rule.isActive) {
        try {
          await ruleSchedulerService.resumeRule(id);
        } catch (scheduleError) {
          logger.warn('Failed to resume rule schedule', {
            ruleId: id,
            error: scheduleError.message,
          });
        }
      }

      reply.send({
        success: true,
        data: rule,
        message: 'Rule resumed successfully',
      });

    } catch (error) {
      logger.error('Failed to resume rule', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Health and Monitoring Endpoints
  static async getRuleHealth(
    request: FastifyRequest<{ Params: RuleParams }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { id } = request.params;

      logger.info('Getting rule health status', {
        ruleId: id,
        userId: user.id,
      });

      const health = await automationRuleService.getRuleHealth(id, user);

      reply.send({
        success: true,
        data: health,
      });

    } catch (error) {
      logger.error('Failed to get rule health', {
        error: error.message,
        ruleId: request.params.id,
        userId: request.user?.id,
      });

      const statusCode = error.name === 'RuleNotFoundError' ? 404 :
                        error.name === 'RulePermissionError' ? 403 : 500;

      reply.status(statusCode).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async getSystemHealth(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;

      // Only admin users can check system health
      if (user.role !== 'ADMIN') {
        reply.status(403).send({
          success: false,
          error: {
            type: 'PermissionError',
            message: 'Only administrators can check system health',
          },
        });
        return;
      }

      logger.info('Getting system health status', {
        userId: user.id,
      });

      const systemHealth = await automationRuleService.getSystemHealth(user);
      const schedulerStats = ruleSchedulerService.getSchedulerStats();

      const health = {
        ...systemHealth,
        scheduler: schedulerStats,
        timestamp: new Date(),
      };

      reply.send({
        success: true,
        data: health,
      });

    } catch (error) {
      logger.error('Failed to get system health', {
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

  // Testing and Validation Endpoints
  static async validateRule(
    request: FastifyRequest<{ Body: CreateRuleBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const ruleRequest = request.body;

      logger.info('Validating automation rule', {
        name: ruleRequest.name,
        type: ruleRequest.type,
        userId: user.id,
      });

      const validation = await automationRuleService.validateRule(ruleRequest, user);

      reply.send({
        success: true,
        data: validation,
        message: 'Rule validation completed',
      });

    } catch (error) {
      logger.error('Failed to validate rule', {
        error: error.message,
        body: request.body,
        userId: request.user?.id,
      });

      reply.status(400).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  static async testEvaluator(
    request: FastifyRequest<{ Body: TestEvaluatorBody }>,
    reply: FastifyReply
  ) {
    try {
      const user = request.user as AuthenticatedUser;
      const { evaluator, inputData } = request.body;

      logger.info('Testing rule evaluator', {
        evaluatorType: evaluator.type,
        evaluatorName: evaluator.name,
        userId: user.id,
      });

      const result = await automationRuleService.testEvaluator(evaluator, inputData, user);

      reply.send({
        success: true,
        data: result,
        message: 'Evaluator test completed',
      });

    } catch (error) {
      logger.error('Failed to test evaluator', {
        error: error.message,
        body: request.body,
        userId: request.user?.id,
      });

      reply.status(400).send({
        success: false,
        error: {
          type: error.name,
          message: error.message,
        },
      });
    }
  }

  // Utility Endpoints
  static async getRuleTypes(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const ruleTypes: { value: RuleType; label: string; description: string }[] = [
        {
          value: 'evaluation',
          label: 'Evaluation',
          description: 'Evaluate data and generate scores or classifications',
        },
        {
          value: 'notification',
          label: 'Notification',
          description: 'Send notifications based on conditions',
        },
        {
          value: 'data_transformation',
          label: 'Data Transformation',
          description: 'Transform and enrich data automatically',
        },
        {
          value: 'workflow',
          label: 'Workflow',
          description: 'Execute complex multi-step workflows',
        },
        {
          value: 'alert',
          label: 'Alert',
          description: 'Generate alerts for critical conditions',
        },
        {
          value: 'quality_check',
          label: 'Quality Check',
          description: 'Perform automated quality assurance',
        },
        {
          value: 'auto_tagging',
          label: 'Auto Tagging',
          description: 'Automatically tag entities based on rules',
        },
        {
          value: 'custom',
          label: 'Custom',
          description: 'Custom rule type for specialized use cases',
        },
      ];

      reply.send({
        success: true,
        data: ruleTypes,
      });

    } catch (error) {
      logger.error('Failed to get rule types', {
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

  static async getEvaluatorTypes(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      const evaluatorTypes: { value: EvaluatorType; label: string; description: string }[] = [
        {
          value: 'llm_judge',
          label: 'LLM Judge',
          description: 'Use LLM models to evaluate and score content',
        },
        {
          value: 'python_metric',
          label: 'Python Metric',
          description: 'Execute custom Python scripts for calculations',
        },
        {
          value: 'javascript',
          label: 'JavaScript',
          description: 'Execute JavaScript code for evaluations',
        },
        {
          value: 'sql_query',
          label: 'SQL Query',
          description: 'Query databases for data-driven evaluations',
        },
        {
          value: 'api_call',
          label: 'API Call',
          description: 'Call external APIs for evaluations',
        },
        {
          value: 'custom_function',
          label: 'Custom Function',
          description: 'Use registered custom functions',
        },
      ];

      reply.send({
        success: true,
        data: evaluatorTypes,
      });

    } catch (error) {
      logger.error('Failed to get evaluator types', {
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