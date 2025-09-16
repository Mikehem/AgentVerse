/**
 * Background Job processing types with enterprise authentication
 * All job operations include workspace isolation and user attribution
 */

import type { AuthenticatedUser } from './auth';

export interface CreateJobRequest {
  name: string;
  type: JobType;
  workspaceId: string;
  payload: Record<string, any>;
  options?: JobOptions;
  schedule?: JobSchedule;
  metadata?: JobMetadata;
}

export type JobType = 
  | 'experiment_execution'    // Run ML experiments
  | 'dataset_processing'     // Process dataset items
  | 'trace_analysis'         // Analyze trace data
  | 'llm_batch_requests'     // Batch LLM API calls
  | 'data_export'           // Export data to various formats  
  | 'model_evaluation'      // Evaluate model performance
  | 'feedback_aggregation'  // Aggregate feedback scores
  | 'cleanup_tasks'         // Cleanup expired data
  | 'report_generation'     // Generate analytics reports
  | 'webhook_delivery'      // Deliver webhook notifications
  | 'custom';               // Custom user-defined jobs

export interface JobOptions {
  priority: 'low' | 'normal' | 'high' | 'critical';
  delay?: number;           // Delay in milliseconds
  attempts: number;         // Max retry attempts
  timeout?: number;         // Timeout in milliseconds
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };
  removeOnComplete?: boolean;
  removeOnFail?: boolean;
}

export interface JobSchedule {
  type: 'cron' | 'interval' | 'once';
  pattern?: string;         // Cron pattern
  interval?: number;        // Interval in milliseconds
  startAt?: Date;          // When to start
  endAt?: Date;            // When to end
  timezone?: string;
}

export interface JobMetadata {
  description?: string;
  tags?: string[];
  category?: string;
  owner: string;
  project?: {
    id: string;
    name: string;
  };
  experiment?: {
    id: string;
    name: string;
  };
  dataset?: {
    id: string;
    name: string;
  };
  notifications?: {
    onComplete?: boolean;
    onFail?: boolean;
    webhookUrl?: string;
    email?: string[];
  };
}

export interface JobResponse {
  id: string;
  name: string;
  type: JobType;
  workspaceId: string;
  workspaceName: string;
  payload: Record<string, any>;
  options: JobOptions;
  schedule?: JobSchedule;
  metadata: JobMetadata;
  status: JobStatus;
  progress: JobProgress;
  result?: JobResult;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  nextRunAt?: Date;
  // Permissions
  canRead: boolean;
  canCancel: boolean;
  canRetry: boolean;
  canDelete: boolean;
}

export type JobStatus = 
  | 'waiting'      // Waiting to be processed
  | 'active'       // Currently being processed
  | 'completed'    // Successfully completed
  | 'failed'       // Failed with error
  | 'delayed'      // Delayed execution
  | 'paused'       // Paused by user
  | 'cancelled'    // Cancelled by user
  | 'stalled';     // Worker died while processing

export interface JobProgress {
  percentage: number;
  current: number;
  total: number;
  message?: string;
  stage?: string;
  data?: Record<string, any>;
  logs: JobLogEntry[];
}

export interface JobLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
}

export interface JobResult {
  success: boolean;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  metrics?: {
    duration: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  outputs?: {
    files?: string[];
    urls?: string[];
    artifacts?: Record<string, any>;
  };
}

// Background Job Service interface
export interface BackgroundJobService {
  createJob(request: CreateJobRequest, user: AuthenticatedUser): Promise<JobResponse>;
  getJob(jobId: string, user: AuthenticatedUser): Promise<JobResponse>;
  cancelJob(jobId: string, user: AuthenticatedUser): Promise<void>;
  retryJob(jobId: string, user: AuthenticatedUser): Promise<JobResponse>;
  listJobs(request: JobListRequest, user: AuthenticatedUser): Promise<JobListResponse>;
}

export interface JobListRequest {
  workspaceId?: string;
  type?: JobType[];
  status?: JobStatus[];
  createdBy?: string;
  tags?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  sortBy?: 'created_at' | 'started_at' | 'completed_at' | 'priority' | 'name';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface JobListResponse {
  jobs: JobResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  aggregations: {
    statusCounts: Record<JobStatus, number>;
    typeCounts: Record<JobType, number>;
    totalDuration: number;
    successRate: number;
  };
}

// Error classes
export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`);
    this.name = 'JobNotFoundError';
  }
}

export class JobPermissionError extends Error {
  constructor(action: string, jobId: string) {
    super(`Permission denied: ${action} on job ${jobId}`);
    this.name = 'JobPermissionError';
  }
}

export class JobValidationError extends Error {
  constructor(field: string, message: string) {
    super(`Validation error on ${field}: ${message}`);
    this.name = 'JobValidationError';
  }
}