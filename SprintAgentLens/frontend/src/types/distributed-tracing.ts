/**
 * Distributed Tracing Types for Agent Lens
 * Based on Opik's distributed tracing specification
 */

export interface DistributedTraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  baggage?: Record<string, string>;
  flags?: number;
}

export interface DistributedTraceHeaders {
  'x-agent-lens-trace-id': string;
  'x-agent-lens-span-id': string;
  'x-agent-lens-parent-span-id'?: string;
  'x-agent-lens-baggage'?: string; // JSON encoded baggage
  'x-agent-lens-flags'?: string;
}

export interface DistributedSpan {
  id: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  serviceName: string;
  serviceVersion?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'error' | 'timeout';
  tags: Record<string, string>;
  logs: SpanLog[];
  
  // Agent-specific fields
  agentId?: string;
  agentType?: string;
  agentVersion?: string;
  
  // Container/deployment info
  containerId?: string;
  containerName?: string;
  hostname?: string;
  podName?: string;
  namespace?: string;
  
  // A2A communication
  sourceAgentId?: string;
  targetAgentId?: string;
  communicationType: 'http' | 'grpc' | 'message_queue' | 'websocket' | 'direct';
  
  // Cost tracking (inherited from existing system)
  totalCost?: number;
  inputCost?: number;
  outputCost?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  provider?: string;
  modelName?: string;
}

export interface SpanLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  fields?: Record<string, any>;
}

export interface DistributedTrace {
  id: string;
  rootSpanId: string;
  spans: DistributedSpan[];
  serviceName: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'error' | 'timeout';
  
  // Multi-agent scenario info
  agentCount: number;
  serviceCount: number;
  containerCount: number;
  
  // Aggregated metrics
  totalCost: number;
  totalTokens: number;
  totalRequests: number;
  errorCount: number;
  
  // Topology information
  serviceMap: ServiceInteraction[];
  criticalPath: string[]; // Span IDs in critical path
}

export interface ServiceInteraction {
  sourceService: string;
  targetService: string;
  sourceAgentId?: string;
  targetAgentId?: string;
  callCount: number;
  avgDuration: number;
  errorRate: number;
  communicationType: string;
}

export interface A2ACommunication {
  id: string;
  traceId: string;
  sourceSpanId: string;
  targetSpanId: string;
  sourceAgentId: string;
  targetAgentId: string;
  communicationType: 'http' | 'grpc' | 'message_queue' | 'websocket' | 'direct';
  protocol: string;
  endpoint?: string;
  method?: string;
  payload?: any;
  response?: any;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: 'running' | 'success' | 'error' | 'timeout';
  errorMessage?: string;
  
  // Network info
  sourceHost?: string;
  targetHost?: string;
  sourcePort?: number;
  targetPort?: number;
}

export interface DistributedTraceFilter {
  traceId?: string;
  serviceName?: string;
  agentId?: string;
  agentType?: string;
  operationName?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  minDuration?: number;
  maxDuration?: number;
  hasErrors?: boolean;
  communicationType?: string;
  
  // Container filters
  containerId?: string;
  containerName?: string;
  hostname?: string;
  namespace?: string;
}

export interface DistributedTraceMetrics {
  totalTraces: number;
  totalSpans: number;
  totalServices: number;
  totalAgents: number;
  totalContainers: number;
  
  avgTraceLength: number;
  avgTraceDuration: number;
  avgSpansPerTrace: number;
  avgAgentsPerTrace: number;
  
  successRate: number;
  errorRate: number;
  timeoutRate: number;
  
  totalCost: number;
  avgCostPerTrace: number;
  totalTokens: number;
  avgTokensPerTrace: number;
  
  topServices: Array<{
    name: string;
    spanCount: number;
    avgDuration: number;
    errorRate: number;
  }>;
  
  topAgents: Array<{
    id: string;
    type: string;
    spanCount: number;
    avgDuration: number;
    errorRate: number;
    totalCost: number;
  }>;
  
  communicationMatrix: Array<{
    source: string;
    target: string;
    callCount: number;
    avgDuration: number;
    errorRate: number;
    communicationType: string;
  }>;
}

export interface TraceVisualizationData {
  trace: DistributedTrace;
  timeline: TimelineSpan[];
  serviceMap: ServiceMapNode[];
  dependencies: DependencyEdge[];
  criticalPath: CriticalPathSpan[];
}

export interface TimelineSpan {
  spanId: string;
  serviceName: string;
  operationName: string;
  startOffset: number; // milliseconds from trace start
  duration: number;
  depth: number; // nesting level
  status: string;
  agentId?: string;
  communicationType?: string;
}

export interface ServiceMapNode {
  id: string;
  name: string;
  type: 'agent' | 'service' | 'container';
  agentId?: string;
  spanCount: number;
  avgDuration: number;
  errorRate: number;
  totalCost: number;
  position?: { x: number; y: number };
}

export interface DependencyEdge {
  source: string;
  target: string;
  callCount: number;
  avgDuration: number;
  errorRate: number;
  communicationType: string;
  strength: number; // 0-1, for visualization
}

export interface CriticalPathSpan {
  spanId: string;
  serviceName: string;
  operationName: string;
  duration: number;
  startTime: string;
  isCritical: boolean;
  agentId?: string;
}

// Utility types for trace context propagation
export interface TraceContextCarrier {
  headers?: Record<string, string>;
  metadata?: Record<string, string>;
  environment?: Record<string, string>;
}

export interface TraceContextExtractor {
  extract(carrier: TraceContextCarrier): DistributedTraceContext | null;
}

export interface TraceContextInjector {
  inject(context: DistributedTraceContext, carrier: TraceContextCarrier): void;
}

export interface DistributedTracingConfig {
  enabled: boolean;
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  
  // Container info
  containerId?: string;
  containerName?: string;
  hostname?: string;
  podName?: string;
  namespace?: string;
  
  // Sampling configuration
  samplingRate: number; // 0.0 to 1.0
  maxSpansPerTrace: number;
  maxTraceLength: number; // milliseconds
  
  // Export configuration
  exportInterval: number; // milliseconds
  exportBatchSize: number;
  exportTimeout: number; // milliseconds
  
  // Headers configuration
  traceIdHeader: string;
  spanIdHeader: string;
  parentSpanIdHeader: string;
  baggageHeader: string;
  flagsHeader: string;
}