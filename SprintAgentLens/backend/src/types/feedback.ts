/**
 * Comprehensive Feedback & Scoring System Types
 * Enterprise-grade feedback collection, scoring, and analytics
 */

// Base feedback definition types
export type FeedbackType = 'numerical' | 'categorical' | 'boolean' | 'text' | 'likert_scale';
export type FeedbackScope = 'trace' | 'span' | 'experiment' | 'dataset' | 'model' | 'global';
export type AggregationType = 'average' | 'sum' | 'count' | 'min' | 'max' | 'median' | 'mode' | 'distribution';

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

// Feedback Definition Schema
export interface FeedbackDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type: FeedbackType;
  scope: FeedbackScope;
  workspaceId: string;
  
  // Configuration based on type
  config: FeedbackConfig;
  
  // Validation rules
  validation: FeedbackValidation;
  
  // Aggregation settings
  aggregation: FeedbackAggregationConfig;
  
  // Enterprise features
  isActive: boolean;
  isRequired: boolean;
  allowMultiple: boolean; // Multiple feedback instances per entity
  
  // Metadata
  metadata: {
    creator: string;
    creatorName: string;
    tags: string[];
    category?: string;
    version: number;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  
  // Permissions
  permissions: {
    canRead: string[];  // User IDs or role names
    canWrite: string[]; // User IDs or role names
    canDelete: string[]; // User IDs or role names
  };
}

// Type-specific configuration
export type FeedbackConfig = 
  | NumericalFeedbackConfig
  | CategoricalFeedbackConfig 
  | BooleanFeedbackConfig
  | TextFeedbackConfig
  | LikertScaleFeedbackConfig;

export interface NumericalFeedbackConfig {
  type: 'numerical';
  minValue: number;
  maxValue: number;
  precision: number; // Decimal places
  unit?: string; // e.g., 'seconds', 'tokens', 'accuracy'
  defaultValue?: number;
}

export interface CategoricalFeedbackConfig {
  type: 'categorical';
  options: CategoryOption[];
  allowOther: boolean;
  multiSelect: boolean;
  defaultValue?: string | string[];
}

export interface CategoryOption {
  value: string;
  label: string;
  description?: string;
  color?: string;
  weight?: number; // For scoring purposes
}

export interface BooleanFeedbackConfig {
  type: 'boolean';
  trueLabel: string;
  falseLabel: string;
  defaultValue?: boolean;
}

export interface TextFeedbackConfig {
  type: 'text';
  maxLength: number;
  minLength: number;
  placeholder?: string;
  isRichText: boolean;
  allowMarkdown: boolean;
}

export interface LikertScaleFeedbackConfig {
  type: 'likert_scale';
  scale: number; // 1-10, typically 5 or 7
  minLabel: string; // "Strongly Disagree"
  maxLabel: string; // "Strongly Agree"
  neutralLabel?: string;
  showNumbers: boolean;
  defaultValue?: number;
}

// Validation configuration
export interface FeedbackValidation {
  required: boolean;
  customRules: ValidationRule[];
  dependencies: FeedbackDependency[]; // Show/hide based on other feedback
}

export interface ValidationRule {
  type: 'regex' | 'range' | 'length' | 'custom';
  rule: string | number | ((value: any) => boolean);
  message: string;
}

export interface FeedbackDependency {
  feedbackDefinitionId: string;
  condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: any;
  action: 'show' | 'hide' | 'require' | 'disable';
}

// Aggregation configuration
export interface FeedbackAggregationConfig {
  enableAggregation: boolean;
  aggregationTypes: AggregationType[];
  timeWindows: TimeWindow[];
  groupBy: string[]; // Fields to group by
  filters: AggregationFilter[];
}

export interface TimeWindow {
  name: string;
  duration: number; // In milliseconds
  label: string; // "Last 24 hours", "Last week"
}

export interface AggregationFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with';
  value: any;
}

// Feedback Instance (actual feedback data)
export interface FeedbackInstance {
  id: string;
  definitionId: string;
  definitionName: string;
  
  // Target entity
  entityType: FeedbackScope;
  entityId: string;
  
  // Feedback data
  value: FeedbackValue;
  confidence?: number; // 0-1, for AI-generated feedback
  
  // Context
  workspaceId: string;
  projectId?: string;
  experimentId?: string;
  
  // Source information
  source: FeedbackSource;
  
  // Metadata
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    batchId?: string; // For bulk feedback
    version: number;
    tags: string[];
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Enterprise features
  isVerified: boolean; // Human-verified feedback
  verifiedBy?: string;
  verifiedAt?: Date;
}

// Feedback value types
export type FeedbackValue = 
  | number 
  | string 
  | string[] 
  | boolean 
  | TextFeedbackValue;

export interface TextFeedbackValue {
  text: string;
  html?: string; // If rich text
  sentiment?: {
    score: number; // -1 to 1
    magnitude: number; // 0 to 1
    label: 'positive' | 'negative' | 'neutral';
  };
  keywords?: string[];
  entities?: EntityMention[];
}

export interface EntityMention {
  text: string;
  type: string;
  confidence: number;
  startOffset: number;
  endOffset: number;
}

// Feedback source information
export interface FeedbackSource {
  type: 'human' | 'ai' | 'system' | 'api' | 'webhook' | 'batch';
  userId?: string;
  userName?: string;
  aiModel?: string;
  systemProcess?: string;
  apiKey?: string;
  webhookId?: string;
  batchJobId?: string;
  
  // Additional context
  context?: {
    page?: string;
    component?: string;
    action?: string;
    experiment?: string;
  };
}

// Feedback analytics and aggregation results
export interface FeedbackAggregationResult {
  definitionId: string;
  definitionName: string;
  aggregationType: AggregationType;
  
  // Results
  value: number | string | AggregationDistribution;
  count: number;
  
  // Time and grouping information
  timeWindow: TimeWindow;
  groupBy?: Record<string, any>;
  
  // Statistical information
  statistics?: {
    mean?: number;
    median?: number;
    mode?: any;
    stdDev?: number;
    percentiles?: Record<string, number>;
    confidence?: {
      interval: [number, number];
      level: number; // e.g., 0.95 for 95%
    };
  };
  
  // Metadata
  calculatedAt: Date;
  dataPoints: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

export interface AggregationDistribution {
  buckets: DistributionBucket[];
  total: number;
}

export interface DistributionBucket {
  value: any;
  label: string;
  count: number;
  percentage: number;
}

// Request/Response types for API endpoints
export interface CreateFeedbackDefinitionRequest {
  name: string;
  displayName: string;
  description?: string;
  type: FeedbackType;
  scope: FeedbackScope;
  config: FeedbackConfig;
  validation?: Partial<FeedbackValidation>;
  aggregation?: Partial<FeedbackAggregationConfig>;
  isRequired?: boolean;
  allowMultiple?: boolean;
  metadata?: {
    tags?: string[];
    category?: string;
  };
  permissions?: Partial<FeedbackDefinition['permissions']>;
}

export interface UpdateFeedbackDefinitionRequest extends Partial<CreateFeedbackDefinitionRequest> {}

export interface CreateFeedbackInstanceRequest {
  definitionId: string;
  entityType: FeedbackScope;
  entityId: string;
  value: FeedbackValue;
  confidence?: number;
  projectId?: string;
  experimentId?: string;
  metadata?: {
    sessionId?: string;
    batchId?: string;
    tags?: string[];
  };
}

export interface BulkCreateFeedbackRequest {
  instances: CreateFeedbackInstanceRequest[];
  batchMetadata?: {
    name?: string;
    description?: string;
    source?: string;
  };
}

export interface FeedbackListRequest {
  workspaceId?: string;
  definitionId?: string;
  entityType?: FeedbackScope;
  entityId?: string;
  entityIds?: string[];
  projectId?: string;
  experimentId?: string;
  
  // Filtering
  valueRange?: { min?: number; max?: number };
  categoricalValues?: string[];
  source?: FeedbackSource['type'];
  userId?: string;
  isVerified?: boolean;
  
  // Time filtering
  timeRange?: {
    start: Date;
    end: Date;
  };
  
  // Search
  searchQuery?: string;
  searchFields?: string[];
  
  // Sorting and pagination
  sortBy?: 'created_at' | 'updated_at' | 'value' | 'confidence';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FeedbackAggregationRequest {
  workspaceId?: string;
  definitionIds: string[];
  entityType?: FeedbackScope;
  entityIds?: string[];
  projectId?: string;
  experimentId?: string;
  
  // Aggregation settings
  aggregationTypes: AggregationType[];
  timeWindows?: TimeWindow[];
  groupBy?: string[];
  
  // Filtering
  filters?: AggregationFilter[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  
  // Advanced options
  includeStatistics?: boolean;
  confidenceLevel?: number; // For confidence intervals
}

// Response types
export interface FeedbackDefinitionResponse extends FeedbackDefinition {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  instanceCount?: number;
  lastFeedbackAt?: Date;
}

export interface FeedbackInstanceResponse extends FeedbackInstance {
  definitionInfo: {
    name: string;
    displayName: string;
    type: FeedbackType;
    config: FeedbackConfig;
  };
  canEdit: boolean;
  canDelete: boolean;
  canVerify: boolean;
}

export interface FeedbackListResponse {
  instances: FeedbackInstanceResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  aggregations?: {
    byDefinition: Record<string, number>;
    byValue: Record<string, number>;
    bySource: Record<string, number>;
    timeDistribution: { date: string; count: number }[];
  };
}

export interface FeedbackAggregationResponse {
  results: FeedbackAggregationResult[];
  summary: {
    totalDefinitions: number;
    totalInstances: number;
    timeRange: { start: Date; end: Date };
    calculatedAt: Date;
  };
  insights?: FeedbackInsight[];
}

export interface FeedbackInsight {
  type: 'trend' | 'anomaly' | 'correlation' | 'recommendation';
  title: string;
  description: string;
  confidence: number; // 0-1
  data: any;
  actionable?: boolean;
  actions?: InsightAction[];
}

export interface InsightAction {
  type: string;
  label: string;
  description: string;
  endpoint: string;
  method: string;
  payload?: any;
}

// Error types
export class FeedbackDefinitionError extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'FeedbackDefinitionError';
  }
}

export class FeedbackValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public expectedType?: string,
    public receivedValue?: any
  ) {
    super(message);
    this.name = 'FeedbackValidationError';
  }
}

export class FeedbackPermissionError extends Error {
  constructor(
    public action: string,
    public resourceId: string,
    message?: string
  ) {
    super(message || `Permission denied for ${action} on feedback ${resourceId}`);
    this.name = 'FeedbackPermissionError';
  }
}

export class FeedbackNotFoundError extends Error {
  constructor(public feedbackId: string) {
    super(`Feedback not found: ${feedbackId}`);
    this.name = 'FeedbackNotFoundError';
  }
}

export class FeedbackDefinitionNotFoundError extends Error {
  constructor(public definitionId: string) {
    super(`Feedback definition not found: ${definitionId}`);
    this.name = 'FeedbackDefinitionNotFoundError';
  }
}

// Service interface
export interface FeedbackServiceInterface {
  // Definition management
  createDefinition(request: CreateFeedbackDefinitionRequest, user: AuthenticatedUser): Promise<FeedbackDefinitionResponse>;
  updateDefinition(id: string, request: UpdateFeedbackDefinitionRequest, user: AuthenticatedUser): Promise<FeedbackDefinitionResponse>;
  deleteDefinition(id: string, user: AuthenticatedUser): Promise<void>;
  getDefinition(id: string, user: AuthenticatedUser): Promise<FeedbackDefinitionResponse>;
  listDefinitions(workspaceId: string, user: AuthenticatedUser): Promise<FeedbackDefinitionResponse[]>;
  
  // Feedback instance management
  createFeedback(request: CreateFeedbackInstanceRequest, user: AuthenticatedUser): Promise<FeedbackInstanceResponse>;
  bulkCreateFeedback(request: BulkCreateFeedbackRequest, user: AuthenticatedUser): Promise<{ created: number; errors: string[] }>;
  updateFeedback(id: string, value: FeedbackValue, user: AuthenticatedUser): Promise<FeedbackInstanceResponse>;
  deleteFeedback(id: string, user: AuthenticatedUser): Promise<void>;
  getFeedback(id: string, user: AuthenticatedUser): Promise<FeedbackInstanceResponse>;
  listFeedback(request: FeedbackListRequest, user: AuthenticatedUser): Promise<FeedbackListResponse>;
  
  // Verification
  verifyFeedback(id: string, user: AuthenticatedUser): Promise<FeedbackInstanceResponse>;
  unverifyFeedback(id: string, user: AuthenticatedUser): Promise<FeedbackInstanceResponse>;
  
  // Aggregation and analytics
  aggregateFeedback(request: FeedbackAggregationRequest, user: AuthenticatedUser): Promise<FeedbackAggregationResponse>;
  getFeedbackInsights(entityType: FeedbackScope, entityId: string, user: AuthenticatedUser): Promise<FeedbackInsight[]>;
  
  // Utility methods
  validateFeedbackValue(definitionId: string, value: FeedbackValue): Promise<boolean>;
  getEntityFeedbackSummary(entityType: FeedbackScope, entityId: string, user: AuthenticatedUser): Promise<any>;
}

// Constants
export const SUPPORTED_FEEDBACK_TYPES: FeedbackType[] = [
  'numerical',
  'categorical', 
  'boolean',
  'text',
  'likert_scale'
];

export const SUPPORTED_FEEDBACK_SCOPES: FeedbackScope[] = [
  'trace',
  'span', 
  'experiment',
  'dataset',
  'model',
  'global'
];

export const SUPPORTED_AGGREGATION_TYPES: AggregationType[] = [
  'average',
  'sum',
  'count',
  'min',
  'max',
  'median',
  'mode',
  'distribution'
];

export const DEFAULT_TIME_WINDOWS: TimeWindow[] = [
  { name: 'last_hour', duration: 60 * 60 * 1000, label: 'Last Hour' },
  { name: 'last_24h', duration: 24 * 60 * 60 * 1000, label: 'Last 24 Hours' },
  { name: 'last_week', duration: 7 * 24 * 60 * 60 * 1000, label: 'Last Week' },
  { name: 'last_month', duration: 30 * 24 * 60 * 60 * 1000, label: 'Last Month' },
  { name: 'last_quarter', duration: 90 * 24 * 60 * 60 * 1000, label: 'Last Quarter' },
];