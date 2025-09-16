/**
 * Rule Scheduler Service for automation rule scheduling and execution
 * Provides comprehensive cron-based scheduling with enterprise monitoring
 */

import { CronJob } from 'cron';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { automationRuleService } from './AutomationRuleService';
import type {
  AutomationRule,
  RuleSchedule,
  RuleExecution,
  ExecutionTrigger,
  CronScheduleConfig,
  IntervalScheduleConfig,
  OnceScheduleConfig,
  ScheduleConfig,
  AuthenticatedUser
} from '../types/automationRules';

export interface ScheduledRuleInfo {
  ruleId: string;
  ruleName: string;
  schedule: RuleSchedule;
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
  cronJob?: CronJob;
  intervalId?: NodeJS.Timeout;
  executionCount: number;
  failureCount: number;
}

export interface SchedulerStats {
  totalScheduledRules: number;
  activeRules: number;
  pausedRules: number;
  completedRules: number;
  nextExecutions: Array<{
    ruleId: string;
    ruleName: string;
    nextRun: Date;
  }>;
  recentExecutions: Array<{
    ruleId: string;
    ruleName: string;
    executedAt: Date;
    status: string;
    duration: number;
  }>;
}

export class RuleSchedulerService extends EventEmitter {
  private scheduledRules: Map<string, ScheduledRuleInfo> = new Map();
  private isRunning: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  
  constructor() {
    super();
    this.setupEventHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Rule scheduler is already running');
      return;
    }

    logger.info('Starting rule scheduler service');
    this.isRunning = true;

    // Load existing scheduled rules from database
    await this.loadScheduledRules();

    // Start health check interval
    this.startHealthCheck();

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    this.emit('scheduler:started');
    logger.info('Rule scheduler service started successfully', {
      scheduledRules: this.scheduledRules.size,
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Rule scheduler is not running');
      return;
    }

    logger.info('Stopping rule scheduler service');
    this.isRunning = false;

    // Stop all scheduled jobs
    for (const [ruleId, ruleInfo] of this.scheduledRules) {
      await this.unscheduleRule(ruleId);
    }

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    this.emit('scheduler:stopped');
    logger.info('Rule scheduler service stopped');
  }

  async scheduleRule(rule: AutomationRule): Promise<void> {
    if (!rule.schedule || !rule.isActive) {
      logger.debug('Rule cannot be scheduled', {
        ruleId: rule.id,
        hasSchedule: !!rule.schedule,
        isActive: rule.isActive,
      });
      return;
    }

    try {
      // Remove existing schedule if present
      if (this.scheduledRules.has(rule.id)) {
        await this.unscheduleRule(rule.id);
      }

      const scheduleInfo: ScheduledRuleInfo = {
        ruleId: rule.id,
        ruleName: rule.name,
        schedule: rule.schedule,
        nextRun: this.calculateNextRun(rule.schedule),
        isActive: true,
        executionCount: 0,
        failureCount: 0,
      };

      // Create appropriate scheduler based on schedule type
      switch (rule.schedule.type) {
        case 'cron':
          await this.scheduleCronJob(rule, scheduleInfo);
          break;
        case 'interval':
          await this.scheduleIntervalJob(rule, scheduleInfo);
          break;
        case 'once':
          await this.scheduleOneTimeJob(rule, scheduleInfo);
          break;
        default:
          throw new Error(`Unsupported schedule type: ${rule.schedule.type}`);
      }

      this.scheduledRules.set(rule.id, scheduleInfo);

      logger.info('Rule scheduled successfully', {
        ruleId: rule.id,
        ruleName: rule.name,
        scheduleType: rule.schedule.type,
        nextRun: scheduleInfo.nextRun,
      });

      this.emit('rule:scheduled', { ruleId: rule.id, scheduleInfo });

    } catch (error) {
      logger.error('Failed to schedule rule', {
        ruleId: rule.id,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  async unscheduleRule(ruleId: string): Promise<void> {
    const scheduleInfo = this.scheduledRules.get(ruleId);
    if (!scheduleInfo) {
      logger.debug('Rule is not scheduled', { ruleId });
      return;
    }

    try {
      // Stop the scheduled job
      if (scheduleInfo.cronJob) {
        scheduleInfo.cronJob.stop();
        scheduleInfo.cronJob.destroy();
      }

      if (scheduleInfo.intervalId) {
        clearTimeout(scheduleInfo.intervalId);
      }

      this.scheduledRules.delete(ruleId);

      logger.info('Rule unscheduled successfully', {
        ruleId,
        ruleName: scheduleInfo.ruleName,
      });

      this.emit('rule:unscheduled', { ruleId, scheduleInfo });

    } catch (error) {
      logger.error('Failed to unschedule rule', {
        ruleId,
        error: error.message,
      });
      throw error;
    }
  }

  async pauseRule(ruleId: string): Promise<void> {
    const scheduleInfo = this.scheduledRules.get(ruleId);
    if (!scheduleInfo) {
      throw new Error(`Rule ${ruleId} is not scheduled`);
    }

    if (scheduleInfo.cronJob) {
      scheduleInfo.cronJob.stop();
    }

    if (scheduleInfo.intervalId) {
      clearTimeout(scheduleInfo.intervalId);
      scheduleInfo.intervalId = undefined;
    }

    scheduleInfo.isActive = false;

    logger.info('Rule paused', {
      ruleId,
      ruleName: scheduleInfo.ruleName,
    });

    this.emit('rule:paused', { ruleId, scheduleInfo });
  }

  async resumeRule(ruleId: string): Promise<void> {
    const scheduleInfo = this.scheduledRules.get(ruleId);
    if (!scheduleInfo) {
      throw new Error(`Rule ${ruleId} is not scheduled`);
    }

    if (scheduleInfo.isActive) {
      logger.debug('Rule is already active', { ruleId });
      return;
    }

    // Get the latest rule data
    const rule = await this.getRuleFromDatabase(ruleId);
    if (!rule) {
      throw new Error(`Rule ${ruleId} not found in database`);
    }

    // Reschedule the rule
    await this.scheduleRule(rule);

    logger.info('Rule resumed', {
      ruleId,
      ruleName: scheduleInfo.ruleName,
    });

    this.emit('rule:resumed', { ruleId, scheduleInfo });
  }

  async executeScheduledRule(ruleId: string, trigger: ExecutionTrigger): Promise<void> {
    const scheduleInfo = this.scheduledRules.get(ruleId);
    if (!scheduleInfo) {
      logger.error('Attempted to execute unscheduled rule', { ruleId });
      return;
    }

    try {
      logger.info('Executing scheduled rule', {
        ruleId,
        ruleName: scheduleInfo.ruleName,
        trigger: trigger.type,
      });

      scheduleInfo.lastRun = new Date();
      scheduleInfo.executionCount++;

      // Get system user for scheduled executions
      const systemUser = await this.getSystemUser(scheduleInfo.ruleId);
      
      // Execute the rule
      const execution = await automationRuleService.executeRule(
        ruleId,
        {
          inputData: trigger.data || {},
          dryRun: false,
          debugMode: false,
        },
        systemUser
      );

      // Update statistics
      if (execution.status === 'failed') {
        scheduleInfo.failureCount++;
      }

      // Calculate next run time
      const rule = await this.getRuleFromDatabase(ruleId);
      if (rule?.schedule) {
        scheduleInfo.nextRun = this.calculateNextRun(rule.schedule);
      }

      logger.info('Scheduled rule execution completed', {
        ruleId,
        executionId: execution.id,
        status: execution.status,
        duration: execution.duration,
      });

      this.emit('rule:executed', {
        ruleId,
        execution,
        scheduleInfo,
      });

      // Handle one-time schedules
      if (scheduleInfo.schedule.type === 'once') {
        await this.unscheduleRule(ruleId);
        logger.info('One-time rule execution completed, unscheduled', { ruleId });
      }

    } catch (error) {
      scheduleInfo.failureCount++;

      logger.error('Scheduled rule execution failed', {
        ruleId,
        error: error.message,
        stack: error.stack,
      });

      this.emit('rule:execution_failed', {
        ruleId,
        error: error.message,
        scheduleInfo,
      });

      // Check if rule should be disabled due to consecutive failures
      await this.handleExecutionFailure(ruleId, scheduleInfo, error);
    }
  }

  getScheduledRules(): Map<string, ScheduledRuleInfo> {
    return new Map(this.scheduledRules);
  }

  getSchedulerStats(): SchedulerStats {
    const rules = Array.from(this.scheduledRules.values());
    
    const nextExecutions = rules
      .filter(rule => rule.isActive)
      .sort((a, b) => a.nextRun.getTime() - b.nextRun.getTime())
      .slice(0, 10)
      .map(rule => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        nextRun: rule.nextRun,
      }));

    // Get recent executions from the last hour
    const recentExecutions = rules
      .filter(rule => rule.lastRun && (Date.now() - rule.lastRun.getTime()) < 3600000)
      .sort((a, b) => (b.lastRun?.getTime() || 0) - (a.lastRun?.getTime() || 0))
      .slice(0, 20)
      .map(rule => ({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        executedAt: rule.lastRun!,
        status: rule.failureCount > rule.executionCount / 2 ? 'failing' : 'success',
        duration: 0, // Would need to track this separately
      }));

    return {
      totalScheduledRules: rules.length,
      activeRules: rules.filter(r => r.isActive).length,
      pausedRules: rules.filter(r => !r.isActive).length,
      completedRules: rules.filter(r => r.schedule.type === 'once' && r.executionCount > 0).length,
      nextExecutions,
      recentExecutions,
    };
  }

  // Private helper methods

  private async scheduleCronJob(rule: AutomationRule, scheduleInfo: ScheduledRuleInfo): Promise<void> {
    const config = rule.schedule!.config as CronScheduleConfig;
    const timezone = rule.schedule!.timezone || 'UTC';

    // Validate cron expression
    try {
      const cronJob = new CronJob(
        config.expression,
        async () => {
          const trigger: ExecutionTrigger = {
            type: 'schedule',
            source: 'cron',
            timestamp: new Date(),
            data: { scheduleType: 'cron', expression: config.expression },
          };
          
          await this.executeScheduledRule(rule.id, trigger);
        },
        null, // onComplete
        false, // start immediately
        timezone,
        null, // context
        false, // runOnInit
        undefined, // utcOffset
        false // unrefTimeout
      );

      // Check schedule restrictions
      const now = new Date();
      if (this.shouldSkipExecution(rule.schedule!, now)) {
        logger.debug('Cron job created but execution will be restricted', {
          ruleId: rule.id,
          now: now.toISOString(),
          restrictions: {
            activeHours: rule.schedule!.activeHours,
            activeDays: rule.schedule!.activeDays,
          },
        });
      }

      cronJob.start();
      scheduleInfo.cronJob = cronJob;

    } catch (error) {
      throw new Error(`Invalid cron expression '${config.expression}': ${error.message}`);
    }
  }

  private async scheduleIntervalJob(rule: AutomationRule, scheduleInfo: ScheduledRuleInfo): Promise<void> {
    const config = rule.schedule!.config as IntervalScheduleConfig;
    let executionCount = 0;

    const executeInterval = async () => {
      // Check max executions
      if (config.maxExecutions && executionCount >= config.maxExecutions) {
        await this.unscheduleRule(rule.id);
        logger.info('Interval rule completed maximum executions', {
          ruleId: rule.id,
          maxExecutions: config.maxExecutions,
        });
        return;
      }

      // Check schedule restrictions
      const now = new Date();
      if (this.shouldSkipExecution(rule.schedule!, now)) {
        logger.debug('Interval execution skipped due to restrictions', {
          ruleId: rule.id,
          now: now.toISOString(),
        });
        
        // Schedule next check
        scheduleInfo.intervalId = setTimeout(executeInterval, Math.min(config.intervalMs, 60000));
        return;
      }

      const trigger: ExecutionTrigger = {
        type: 'schedule',
        source: 'interval',
        timestamp: new Date(),
        data: { scheduleType: 'interval', intervalMs: config.intervalMs },
      };

      await this.executeScheduledRule(rule.id, trigger);
      executionCount++;

      // Schedule next execution
      scheduleInfo.intervalId = setTimeout(executeInterval, config.intervalMs);
      scheduleInfo.nextRun = new Date(Date.now() + config.intervalMs);
    };

    // Initial delay
    const startDelay = config.startDelay || 0;
    scheduleInfo.intervalId = setTimeout(executeInterval, startDelay);
    scheduleInfo.nextRun = new Date(Date.now() + startDelay);
  }

  private async scheduleOneTimeJob(rule: AutomationRule, scheduleInfo: ScheduledRuleInfo): Promise<void> {
    const config = rule.schedule!.config as OnceScheduleConfig;
    const executeAt = config.executeAt.getTime();
    const now = Date.now();

    if (executeAt <= now) {
      logger.warn('One-time schedule is in the past, executing immediately', {
        ruleId: rule.id,
        executeAt: config.executeAt.toISOString(),
        now: new Date().toISOString(),
      });
    }

    const delay = Math.max(0, executeAt - now);

    scheduleInfo.intervalId = setTimeout(async () => {
      const trigger: ExecutionTrigger = {
        type: 'schedule',
        source: 'once',
        timestamp: new Date(),
        data: { scheduleType: 'once', executeAt: config.executeAt },
      };

      await this.executeScheduledRule(rule.id, trigger);
    }, delay);

    scheduleInfo.nextRun = config.executeAt;
  }

  private calculateNextRun(schedule: RuleSchedule): Date {
    const now = new Date();

    switch (schedule.type) {
      case 'cron':
        try {
          const config = schedule.config as CronScheduleConfig;
          const cronJob = new CronJob(config.expression, () => {}, null, false, schedule.timezone || 'UTC');
          return cronJob.nextDate().toDate();
        } catch (error) {
          logger.warn('Failed to calculate next cron run', {
            expression: (schedule.config as CronScheduleConfig).expression,
            error: error.message,
          });
          return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours
        }

      case 'interval':
        const intervalConfig = schedule.config as IntervalScheduleConfig;
        return new Date(now.getTime() + intervalConfig.intervalMs);

      case 'once':
        const onceConfig = schedule.config as OnceScheduleConfig;
        return onceConfig.executeAt;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000); // Default to 24 hours
    }
  }

  private shouldSkipExecution(schedule: RuleSchedule, now: Date): boolean {
    // Check active hours
    if (schedule.activeHours) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTime = currentHour * 60 + currentMinute;

      const [startHour, startMinute] = schedule.activeHours.start.split(':').map(Number);
      const [endHour, endMinute] = schedule.activeHours.end.split(':').map(Number);
      
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      if (startTime <= endTime) {
        // Same day range
        if (currentTime < startTime || currentTime > endTime) {
          return true;
        }
      } else {
        // Overnight range
        if (currentTime < startTime && currentTime > endTime) {
          return true;
        }
      }
    }

    // Check active days (0 = Sunday, 6 = Saturday)
    if (schedule.activeDays && schedule.activeDays.length > 0) {
      const currentDay = now.getDay();
      if (!schedule.activeDays.includes(currentDay)) {
        return true;
      }
    }

    return false;
  }

  private async loadScheduledRules(): Promise<void> {
    try {
      const rules = await prisma.automationRule.findMany({
        where: {
          isActive: true,
          schedule: { not: null },
        },
      });

      logger.info('Loading scheduled rules from database', {
        count: rules.length,
      });

      for (const ruleData of rules) {
        try {
          const rule = this.deserializeRule(ruleData);
          await this.scheduleRule(rule);
        } catch (error) {
          logger.error('Failed to load scheduled rule', {
            ruleId: ruleData.id,
            error: error.message,
          });
        }
      }

    } catch (error) {
      logger.error('Failed to load scheduled rules', {
        error: error.message,
        stack: error.stack,
      });
    }
  }

  private deserializeRule(data: any): AutomationRule {
    return {
      ...data,
      trigger: JSON.parse(data.trigger),
      conditions: JSON.parse(data.conditions),
      evaluators: JSON.parse(data.evaluators),
      actions: JSON.parse(data.actions),
      executionConfig: JSON.parse(data.executionConfig),
      retryConfig: JSON.parse(data.retryConfig),
      timeoutConfig: JSON.parse(data.timeoutConfig),
      schedule: data.schedule ? JSON.parse(data.schedule) : undefined,
      metadata: JSON.parse(data.metadata),
      permissions: JSON.parse(data.permissions),
      statistics: JSON.parse(data.statistics),
    };
  }

  private async getRuleFromDatabase(ruleId: string): Promise<AutomationRule | null> {
    try {
      const result = await prisma.automationRule.findUnique({
        where: { id: ruleId },
      });
      
      if (!result) return null;
      return this.deserializeRule(result);
    } catch (error) {
      logger.error('Failed to get rule from database', {
        ruleId,
        error: error.message,
      });
      return null;
    }
  }

  private async getSystemUser(ruleId: string): Promise<AuthenticatedUser> {
    // In practice, this would get a system user or service account
    // For now, return a placeholder system user
    return {
      id: 'system',
      username: 'system',
      email: 'system@sprintagentlens.com',
      fullName: 'System User',
      role: 'ADMIN',
      workspaceId: 'system',
      permissions: ['*'],
    };
  }

  private async handleExecutionFailure(
    ruleId: string,
    scheduleInfo: ScheduledRuleInfo,
    error: Error
  ): Promise<void> {
    const failureRate = scheduleInfo.failureCount / Math.max(scheduleInfo.executionCount, 1);
    
    // If failure rate is high, consider disabling the rule
    if (failureRate > 0.8 && scheduleInfo.executionCount > 5) {
      logger.warn('Rule has high failure rate, considering disabling', {
        ruleId,
        failureRate,
        executionCount: scheduleInfo.executionCount,
        failureCount: scheduleInfo.failureCount,
      });

      // Pause the rule temporarily
      await this.pauseRule(ruleId);

      this.emit('rule:high_failure_rate', {
        ruleId,
        failureRate,
        scheduleInfo,
        error: error.message,
      });
    }
  }

  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Scheduler health check failed', {
          error: error.message,
        });
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private async performHealthCheck(): Promise<void> {
    const stats = this.getSchedulerStats();
    
    logger.debug('Scheduler health check', {
      totalScheduledRules: stats.totalScheduledRules,
      activeRules: stats.activeRules,
      pausedRules: stats.pausedRules,
      nextExecutions: stats.nextExecutions.length,
    });

    // Check for rules that should have executed but didn't
    const now = Date.now();
    const overdueRules = Array.from(this.scheduledRules.values()).filter(
      rule => rule.isActive && rule.nextRun.getTime() < now - 5 * 60 * 1000 // 5 minutes overdue
    );

    if (overdueRules.length > 0) {
      logger.warn('Found overdue scheduled rules', {
        overdueCount: overdueRules.length,
        overdueRules: overdueRules.map(rule => ({
          ruleId: rule.ruleId,
          ruleName: rule.ruleName,
          nextRun: rule.nextRun,
          overdueDuration: now - rule.nextRun.getTime(),
        })),
      });

      this.emit('scheduler:overdue_rules', { overdueRules });
    }
  }

  private setupEventHandlers(): void {
    this.on('rule:executed', (data) => {
      logger.debug('Rule execution event', {
        ruleId: data.ruleId,
        status: data.execution.status,
      });
    });

    this.on('rule:execution_failed', (data) => {
      logger.warn('Rule execution failed event', {
        ruleId: data.ruleId,
        error: data.error,
      });
    });
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down scheduler gracefully`);
      await this.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Export singleton instance
export const ruleSchedulerService = new RuleSchedulerService();