/**
 * Comprehensive Automation Rules Engine Types
 * Enterprise-grade rule evaluation, scheduling, and execution system
 */

// Base automation types
export type RuleType = 'evaluation' | 'notification' | 'data_transformation' | 'workflow' | 'alert' | 'quality_check' | 'auto_tagging' | 'custom';
export type TriggerType = 'event' | 'schedule' | 'manual' | 'api' | 'webhook' | 'condition';
export type EvaluatorType = 'llm_judge' | 'python_metric' | 'javascript' | 'sql_query' | 'api_call' | 'custom_function';
export type RuleStatus = 'draft' | 'active' | 'paused' | 'disabled' | 'archived' | 'error';
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'timeout' | 'skipped';
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'greater_equal' | 'less_equal' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'matches_regex' | 'in_array' | 'not_in_array';

// Authentication and authorization
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  workspaceId: string;
  permissions: string[];
}

// Core automation rule definition
export interface AutomationRule {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: RuleType;
  
  // Workspace and project association
  workspaceId: string;
  projectId?: string;
  
  // Rule configuration
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  evaluators: RuleEvaluator[];
  actions: RuleAction[];
  
  // Execution settings
  executionConfig: ExecutionConfig;
  retryConfig: RetryConfig;
  timeoutConfig: TimeoutConfig;
  
  // Status and lifecycle
  status: RuleStatus;
  isActive: boolean;
  priority: number; // 1-10, higher = more important
  
  // Scheduling
  schedule?: RuleSchedule;
  
  // Metadata and permissions
  metadata: RuleMetadata;
  permissions: RulePermissions;
  
  // Statistics
  statistics: RuleStatistics;
  
  // Audit fields
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy?: string;
  lastExecutedAt?: Date;
  nextExecutionAt?: Date;
}

// Rule trigger configuration
export interface RuleTrigger {
  type: TriggerType;
  config: TriggerConfig;
  filters?: TriggerFilter[];
}

export type TriggerConfig = 
  | EventTriggerConfig
  | ScheduleTriggerConfig
  | ManualTriggerConfig
  | ApiTriggerConfig
  | WebhookTriggerConfig
  | ConditionTriggerConfig;

export interface EventTriggerConfig {
  type: 'event';
  eventTypes: string[]; // trace_created, experiment_completed, etc.
  eventSources: string[]; // api, webhook, manual, system
  debounceMs?: number; // Prevent duplicate triggering
  batchSize?: number; // Process multiple events together
}

export interface ScheduleTriggerConfig {
  type: 'schedule';
  cronExpression: string;
  timezone: string;
  maxExecutions?: number;
  endDate?: Date;
}

export interface ManualTriggerConfig {
  type: 'manual';
  allowedRoles: string[];
  requireApproval?: boolean;
  approverRoles?: string[];
}

export interface ApiTriggerConfig {
  type: 'api';
  apiKeys: string[];
  rateLimitPerHour?: number;
  requiredHeaders?: Record<string, string>;
}

export interface WebhookTriggerConfig {
  type: 'webhook';
  webhookUrl: string;
  secretKey?: string;
  expectedHeaders?: Record<string, string>;
  retryCount?: number;
}

export interface ConditionTriggerConfig {
  type: 'condition';
  conditions: RuleCondition[];
  checkIntervalMs: number;
  maxChecks?: number;
}

export interface TriggerFilter {
  field: string;
  operator: ConditionOperator;
  value: any;
  caseSensitive?: boolean;
}

// Rule conditions for filtering execution
export interface RuleCondition {
  id: string;
  name: string;
  field: string; // JSONPath expression for data access
  operator: ConditionOperator;
  value: any;
  
  // Advanced options
  caseSensitive?: boolean;
  negated?: boolean;
  weight?: number; // For weighted conditions
  
  // Nested conditions
  logicalOperator?: 'AND' | 'OR';
  subConditions?: RuleCondition[];
}

// Rule evaluators for computation and analysis
export interface RuleEvaluator {
  id: string;
  name: string;
  type: EvaluatorType;
  config: EvaluatorConfig;
  
  // Output configuration
  outputField: string; // Where to store the result
  outputType: 'number' | 'string' | 'boolean' | 'object' | 'array';
  
  // Execution settings
  isRequired: boolean;
  failureHandling: 'stop' | 'continue' | 'retry';
  timeoutMs: number;
  
  // Dependencies
  dependsOn?: string[]; // IDs of other evaluators
}

export type EvaluatorConfig = 
  | LLMJudgeConfig
  | PythonMetricConfig
  | JavaScriptConfig
  | SqlQueryConfig
  | ApiCallConfig
  | CustomFunctionConfig;

// LLM-as-Judge evaluator configuration
export interface LLMJudgeConfig {
  type: 'llm_judge';
  providerName: string; // From LLM provider management
  modelName: string;
  systemPrompt: string;
  userPromptTemplate: string; // With variable substitution
  
  // Response parsing
  responseFormat: 'json' | 'text' | 'score' | 'classification';
  responseSchema?: any; // JSON schema for validation
  scoreRange?: { min: number; max: number };
  classifications?: string[];
  
  // Model parameters
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  
  // Reliability settings
  confidenceThreshold?: number; // Minimum confidence for valid result
  consensusCount?: number; // Number of independent evaluations
  fallbackEvaluator?: string; // ID of fallback evaluator
}

// Python metric evaluator configuration
export interface PythonMetricConfig {
  type: 'python_metric';
  scriptPath: string;
  functionName: string;
  pythonVersion: string;
  
  // Dependencies and environment
  requirements: string[]; // pip packages
  environmentVariables?: Record<string, string>;
  
  // Input/output handling
  inputMapping: Record<string, string>; // Map rule data to function parameters
  outputMapping: Record<string, string>; // Map function results to rule fields
  
  // Execution settings
  virtualEnv?: string;
  workingDirectory?: string;
  memoryLimitMB?: number;
  
  // Security
  allowedImports?: string[];
  restrictedImports?: string[];
  sandboxed?: boolean;
}

// JavaScript evaluator configuration
export interface JavaScriptConfig {
  type: 'javascript';
  code: string; // JavaScript code to execute
  
  // Security and sandboxing
  allowedGlobals?: string[];
  restrictedGlobals?: string[];
  sandboxed: boolean;
  
  // Input/output
  inputVariables: Record<string, any>;
  expectedOutputs: string[];
}

// SQL query evaluator configuration
export interface SqlQueryConfig {
  type: 'sql_query';
  connectionName: string; // Database connection identifier
  query: string; // SQL query with parameter substitution
  parameters: Record<string, any>;
  
  // Result handling
  expectSingleRow?: boolean;
  expectSingleValue?: boolean;
  resultMapping?: Record<string, string>;
  
  // Query limits
  timeoutMs: number;
  maxRows?: number;
}

// API call evaluator configuration
export interface ApiCallConfig {
  type: 'api_call';
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  
  // Authentication
  auth?: {
    type: 'bearer' | 'basic' | 'api_key';
    token?: string;
    username?: string;
    password?: string;
    apiKey?: string;
    apiKeyHeader?: string;
  };
  
  // Response handling
  responseFormat: 'json' | 'text' | 'xml';
  responseMapping?: Record<string, string>;
  errorHandling: 'throw' | 'return_null' | 'return_error';
}

// Custom function evaluator configuration
export interface CustomFunctionConfig {
  type: 'custom_function';
  functionId: string; // Reference to registered custom function
  parameters: Record<string, any>;
  
  // Function metadata
  functionVersion?: string;
  functionSource: 'builtin' | 'plugin' | 'user_defined';
}

// Rule actions for execution results
export interface RuleAction {
  id: string;
  name: string;
  type: ActionType;
  config: ActionConfig;
  
  // Execution conditions
  executeWhen: ActionExecutionCondition[];
  priority: number;
  
  // Error handling
  continueOnError: boolean;
  maxRetries: number;
  retryDelayMs: number;
}

export type ActionType = 'create_feedback' | 'send_notification' | 'update_metadata' | 'trigger_webhook' | 'create_experiment' | 'tag_entity' | 'generate_report' | 'custom_action';

export interface ActionExecutionCondition {
  evaluatorId: string;
  operator: ConditionOperator;
  value: any;
  required: boolean;
}

export type ActionConfig = 
  | CreateFeedbackActionConfig
  | SendNotificationActionConfig
  | UpdateMetadataActionConfig
  | TriggerWebhookActionConfig
  | CreateExperimentActionConfig
  | TagEntityActionConfig
  | GenerateReportActionConfig
  | CustomActionConfig;

export interface CreateFeedbackActionConfig {
  type: 'create_feedback';
  feedbackDefinitionId: string;
  valueExpression: string; // Expression to calculate feedback value
  entityTypeField: string; // Field containing entity type
  entityIdField: string; // Field containing entity ID
  confidence?: number;
  metadata?: Record<string, any>;
}

export interface SendNotificationActionConfig {
  type: 'send_notification';
  notificationType: 'email' | 'slack' | 'webhook' | 'sms';
  recipients: string[];
  subject?: string;
  messageTemplate: string;
  
  // Channel-specific config
  emailConfig?: {
    fromAddress?: string;
    replyTo?: string;
    attachments?: string[];
  };
  slackConfig?: {
    channel: string;
    username?: string;
    iconEmoji?: string;
  };
  webhookConfig?: {
    url: string;
    headers?: Record<string, string>;
  };
}

export interface UpdateMetadataActionConfig {
  type: 'update_metadata';
  entityType: 'trace' | 'span' | 'experiment' | 'dataset';
  entityIdField: string;
  metadataUpdates: Record<string, any>;
  mergeStrategy: 'replace' | 'merge' | 'append';
}

export interface TriggerWebhookActionConfig {
  type: 'trigger_webhook';
  webhookUrl: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
  payloadTemplate: string; // Template for webhook payload
  retryCount: number;
  timeoutMs: number;
}

export interface CreateExperimentActionConfig {
  type: 'create_experiment';
  projectId: string;
  experimentTemplate: {
    name: string;
    description?: string;
    configuration: any;
  };
  autoStart: boolean;
}

export interface TagEntityActionConfig {
  type: 'tag_entity';
  entityType: 'trace' | 'span' | 'experiment' | 'dataset';
  entityIdField: string;
  tags: string[];
  tagSource: 'rule_evaluation';
}

export interface GenerateReportActionConfig {
  type: 'generate_report';
  reportType: string;
  reportParameters: Record<string, any>;
  outputFormat: 'pdf' | 'html' | 'json' | 'csv';
  deliveryMethod: 'email' | 'webhook' | 'storage';
}

export interface CustomActionConfig {
  type: 'custom_action';
  actionId: string;
  parameters: Record<string, any>;
}

// Rule execution configuration
export interface ExecutionConfig {
  mode: 'sync' | 'async' | 'batch';
  maxConcurrentExecutions: number;
  executionTimeoutMs: number;
  
  // Resource limits
  memoryLimitMB?: number;
  cpuLimitPercent?: number;
  
  // Batching (for batch mode)
  batchSize?: number;
  batchTimeoutMs?: number;
  
  // Rate limiting
  maxExecutionsPerMinute?: number;
  maxExecutionsPerHour?: number;
  maxExecutionsPerDay?: number;
}

export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  retryOnErrors: string[]; // Error types to retry on
}

export interface TimeoutConfig {
  totalTimeoutMs: number;
  evaluatorTimeoutMs: number;
  actionTimeoutMs: number;
  escalationTimeoutMs?: number; // For long-running rules
}

// Rule scheduling configuration
export interface RuleSchedule {
  type: 'cron' | 'interval' | 'once';
  config: ScheduleConfig;
  
  // Schedule restrictions
  activeHours?: { start: string; end: string }; // "09:00" to "17:00"
  activeDays?: number[]; // 0-6 (Sunday-Saturday)
  timezone: string;
  
  // Execution windows
  maxExecutionDuration?: number;
  skipIfRunning?: boolean;
  queueIfRunning?: boolean;
}

export type ScheduleConfig = 
  | CronScheduleConfig
  | IntervalScheduleConfig
  | OnceScheduleConfig;

export interface CronScheduleConfig {
  type: 'cron';
  expression: string;
  description?: string;
}

export interface IntervalScheduleConfig {
  type: 'interval';
  intervalMs: number;
  startDelay?: number;
  maxExecutions?: number;
}

export interface OnceScheduleConfig {
  type: 'once';
  executeAt: Date;
  timezone?: string;
}

// Rule metadata and context
export interface RuleMetadata {
  creator: string;
  creatorName: string;
  tags: string[];
  category?: string;
  version: number;
  
  // Documentation
  documentation?: string;
  examples?: RuleExample[];
  
  // Dependencies
  dependencies?: string[]; // IDs of other rules
  conflicts?: string[]; // IDs of conflicting rules
  
  // Performance hints
  estimatedExecutionTime?: number;
  resourceIntensive?: boolean;
  cacheable?: boolean;
}

export interface RuleExample {
  name: string;
  description: string;
  inputData: any;
  expectedOutput: any;
}

export interface RulePermissions {
  canRead: string[]; // User IDs or role names
  canWrite: string[]; // User IDs or role names
  canExecute: string[]; // User IDs or role names
  canDelete: string[]; // User IDs or role names
}

// Rule execution statistics and monitoring
export interface RuleStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
  lastExecutionStatus: ExecutionStatus;
  lastExecutionError?: string;
  lastExecutionDuration?: number;
  
  // Performance metrics
  successRate: number; // 0-100
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  
  // Resource usage
  averageMemoryUsage?: number;
  averageCpuUsage?: number;
  totalCost?: number;
  
  // Trend data (last 30 days)
  executionTrend: ExecutionTrendPoint[];
  errorTrend: ErrorTrendPoint[];
}

export interface ExecutionTrendPoint {
  date: Date;
  executions: number;
  successes: number;
  failures: number;
  averageDuration: number;
}

export interface ErrorTrendPoint {
  date: Date;
  errorType: string;
  count: number;
  samples: string[];
}

// Rule execution instance
export interface RuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  
  // Execution context
  triggeredBy: ExecutionTrigger;
  inputData: any;
  workspaceId: string;
  
  // Status and timing
  status: ExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // Results
  evaluatorResults: EvaluatorResult[];
  actionResults: ActionResult[];
  
  // Error information
  error?: ExecutionError;
  warnings?: string[];
  
  // Resource usage
  memoryUsage?: number;
  cpuUsage?: number;
  cost?: number;
  
  // Metadata
  executionNumber: number; // Sequential number for this rule
  parentExecutionId?: string; // For chained executions
  metadata: any;
}

export interface ExecutionTrigger {
  type: TriggerType;
  source: string;
  timestamp: Date;
  data?: any;
}

export interface EvaluatorResult {
  evaluatorId: string;
  evaluatorName: string;
  status: ExecutionStatus;
  value: any;
  confidence?: number;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // Error information
  error?: string;
  warnings?: string[];
  
  // Additional context
  metadata?: any;
}

export interface ActionResult {
  actionId: string;
  actionName: string;
  status: ExecutionStatus;
  result?: any;
  
  // Timing
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  
  // Error information
  error?: string;
  warnings?: string[];
  
  // Additional context
  metadata?: any;
}

export interface ExecutionError {
  type: string;
  message: string;
  stack?: string;
  phase: 'trigger' | 'condition' | 'evaluator' | 'action';
  componentId?: string;
  recoverable: boolean;
  
  // Context
  inputData?: any;
  timestamp: Date;
  
  // Additional details
  details?: Record<string, any>;
}

// Request/Response types for API
export interface CreateAutomationRuleRequest {
  name: string;
  displayName: string;
  description?: string;
  type: RuleType;
  projectId?: string;
  
  trigger: RuleTrigger;
  conditions?: RuleCondition[];
  evaluators: RuleEvaluator[];
  actions: RuleAction[];
  
  executionConfig?: Partial<ExecutionConfig>;
  retryConfig?: Partial<RetryConfig>;
  schedule?: RuleSchedule;
  
  priority?: number;
  metadata?: Partial<RuleMetadata>;
  permissions?: Partial<RulePermissions>;
}

export interface UpdateAutomationRuleRequest extends Partial<CreateAutomationRuleRequest> {}

export interface ExecuteRuleRequest {
  inputData?: any;
  dryRun?: boolean;
  debugMode?: boolean;
  overrideConfig?: Partial<ExecutionConfig>;
}

export interface RuleListRequest {
  workspaceId?: string;
  projectId?: string;
  type?: RuleType;
  status?: RuleStatus;
  createdBy?: string;
  tags?: string[];
  
  // Filtering
  searchQuery?: string;
  hasSchedule?: boolean;
  isActive?: boolean;
  
  // Time filtering
  createdAfter?: Date;
  createdBefore?: Date;
  lastExecutedAfter?: Date;
  lastExecutedBefore?: Date;
  
  // Sorting and pagination
  sortBy?: 'name' | 'created_at' | 'last_executed_at' | 'execution_count' | 'success_rate';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ExecutionListRequest {
  ruleId?: string;
  workspaceId?: string;
  status?: ExecutionStatus;
  triggeredBy?: TriggerType;
  
  // Time filtering
  startedAfter?: Date;
  startedBefore?: Date;
  
  // Performance filtering
  minDuration?: number;
  maxDuration?: number;
  hasErrors?: boolean;
  
  // Sorting and pagination
  sortBy?: 'started_at' | 'duration' | 'status';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Response types
export interface AutomationRuleResponse extends AutomationRule {
  canRead: boolean;
  canWrite: boolean;
  canExecute: boolean;
  canDelete: boolean;
  
  // Additional computed fields
  isScheduled: boolean;
  nextScheduledExecution?: Date;
  recentExecutions: RuleExecution[];
  healthStatus: RuleHealthStatus;
}

export interface RuleHealthStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  checks: HealthCheck[];
  lastChecked: Date;
  
  issues?: HealthIssue[];
  recommendations?: string[];
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  value?: any;
  threshold?: any;
}

export interface HealthIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  firstSeen: Date;
  count: number;
  
  suggestedActions?: string[];
}

export interface RuleExecutionResponse extends RuleExecution {
  canRetry: boolean;
  canCancel: boolean;
  
  // Enhanced results
  evaluatorSummary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  
  actionSummary: {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export interface RuleListResponse {
  rules: AutomationRuleResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  aggregations?: {
    byType: Record<RuleType, number>;
    byStatus: Record<RuleStatus, number>;
    totalExecutions: number;
    averageSuccessRate: number;
  };
}

export interface ExecutionListResponse {
  executions: RuleExecutionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  aggregations?: {
    byStatus: Record<ExecutionStatus, number>;
    averageDuration: number;
    successRate: number;
    totalCost: number;
  };
}

// Error types
export class AutomationRuleError extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'AutomationRuleError';
  }
}

export class RuleExecutionError extends Error {
  constructor(
    public ruleId: string,
    public phase: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RuleExecutionError';
  }
}

export class RulePermissionError extends Error {
  constructor(
    public action: string,
    public ruleId: string,
    message?: string
  ) {
    super(message || `Permission denied for ${action} on rule ${ruleId}`);
    this.name = 'RulePermissionError';
  }
}

export class RuleNotFoundError extends Error {
  constructor(public ruleId: string) {
    super(`Automation rule not found: ${ruleId}`);
    this.name = 'RuleNotFoundError';
  }
}

// Service interface
export interface AutomationRuleServiceInterface {
  // Rule management
  createRule(request: CreateAutomationRuleRequest, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  updateRule(id: string, request: UpdateAutomationRuleRequest, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  deleteRule(id: string, user: AuthenticatedUser): Promise<void>;
  getRule(id: string, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  listRules(request: RuleListRequest, user: AuthenticatedUser): Promise<RuleListResponse>;
  
  // Rule execution
  executeRule(id: string, request: ExecuteRuleRequest, user: AuthenticatedUser): Promise<RuleExecutionResponse>;
  cancelExecution(executionId: string, user: AuthenticatedUser): Promise<void>;
  retryExecution(executionId: string, user: AuthenticatedUser): Promise<RuleExecutionResponse>;
  
  // Rule status management
  activateRule(id: string, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  deactivateRule(id: string, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  pauseRule(id: string, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  resumeRule(id: string, user: AuthenticatedUser): Promise<AutomationRuleResponse>;
  
  // Execution monitoring
  getExecution(executionId: string, user: AuthenticatedUser): Promise<RuleExecutionResponse>;
  listExecutions(request: ExecutionListRequest, user: AuthenticatedUser): Promise<ExecutionListResponse>;
  getRuleExecutions(ruleId: string, user: AuthenticatedUser): Promise<RuleExecutionResponse[]>;
  
  // Health and monitoring
  getRuleHealth(id: string, user: AuthenticatedUser): Promise<RuleHealthStatus>;
  getSystemHealth(user: AuthenticatedUser): Promise<any>;
  
  // Testing and debugging
  validateRule(request: CreateAutomationRuleRequest, user: AuthenticatedUser): Promise<any>;
  testEvaluator(evaluator: RuleEvaluator, inputData: any, user: AuthenticatedUser): Promise<any>;
}

// Constants and defaults
export const SUPPORTED_RULE_TYPES: RuleType[] = [
  'evaluation',
  'notification',
  'data_transformation',
  'workflow',
  'alert',
  'quality_check',
  'auto_tagging',
  'custom'
];

export const SUPPORTED_TRIGGER_TYPES: TriggerType[] = [
  'event',
  'schedule',
  'manual',
  'api',
  'webhook',
  'condition'
];

export const SUPPORTED_EVALUATOR_TYPES: EvaluatorType[] = [
  'llm_judge',
  'python_metric',
  'javascript',
  'sql_query',
  'api_call',
  'custom_function'
];

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  mode: 'async',
  maxConcurrentExecutions: 5,
  executionTimeoutMs: 300000, // 5 minutes
  maxExecutionsPerHour: 100,
};

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  enabled: true,
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
  maxBackoffMs: 30000,
  retryOnErrors: ['TIMEOUT', 'NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
};

export const DEFAULT_TIMEOUT_CONFIG: TimeoutConfig = {
  totalTimeoutMs: 300000, // 5 minutes
  evaluatorTimeoutMs: 60000, // 1 minute
  actionTimeoutMs: 30000, // 30 seconds
};