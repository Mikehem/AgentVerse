/**
 * Distributed Tracing Implementation for Agent Lens
 * Provides trace context propagation, span management, and A2A communication tracing
 */

import { 
  DistributedTraceContext, 
  DistributedTraceHeaders, 
  DistributedSpan, 
  TraceContextCarrier,
  DistributedTracingConfig,
  A2ACommunication
} from '@/types/distributed-tracing';

// Default configuration
const DEFAULT_CONFIG: DistributedTracingConfig = {
  enabled: true,
  serviceName: 'agent-lens',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  samplingRate: 1.0,
  maxSpansPerTrace: 1000,
  maxTraceLength: 300000, // 5 minutes
  exportInterval: 5000,
  exportBatchSize: 100,
  exportTimeout: 30000,
  traceIdHeader: 'x-agent-lens-trace-id',
  spanIdHeader: 'x-agent-lens-span-id',
  parentSpanIdHeader: 'x-agent-lens-parent-span-id',
  baggageHeader: 'x-agent-lens-baggage',
  flagsHeader: 'x-agent-lens-flags'
};

export class DistributedTracer {
  private config: DistributedTracingConfig;
  private activeSpans: Map<string, DistributedSpan> = new Map();
  private traceContext: DistributedTraceContext | null = null;
  private spanBuffer: DistributedSpan[] = [];
  private exportTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<DistributedTracingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startExportTimer();
    this.detectContainerInfo();
  }

  /**
   * Generate a new trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
  }

  /**
   * Generate a new span ID
   */
  generateSpanId(): string {
    return `span_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Extract trace context from HTTP headers or other carriers
   */
  extractTraceContext(carrier: TraceContextCarrier): DistributedTraceContext | null {
    const headers = carrier.headers || {};
    
    const traceId = headers[this.config.traceIdHeader];
    const spanId = headers[this.config.spanIdHeader];
    const parentSpanId = headers[this.config.parentSpanIdHeader];
    const baggageHeader = headers[this.config.baggageHeader];
    const flagsHeader = headers[this.config.flagsHeader];

    if (!traceId || !spanId) {
      return null;
    }

    let baggage: Record<string, string> = {};
    if (baggageHeader) {
      try {
        baggage = JSON.parse(baggageHeader);
      } catch (e) {
        console.warn('Failed to parse baggage header:', e);
      }
    }

    return {
      traceId,
      spanId,
      parentSpanId,
      baggage,
      flags: flagsHeader ? parseInt(flagsHeader) : 0
    };
  }

  /**
   * Inject trace context into HTTP headers or other carriers
   */
  injectTraceContext(context: DistributedTraceContext, carrier: TraceContextCarrier): void {
    if (!carrier.headers) {
      carrier.headers = {};
    }

    carrier.headers[this.config.traceIdHeader] = context.traceId;
    carrier.headers[this.config.spanIdHeader] = context.spanId;
    
    if (context.parentSpanId) {
      carrier.headers[this.config.parentSpanIdHeader] = context.parentSpanId;
    }

    if (context.baggage && Object.keys(context.baggage).length > 0) {
      carrier.headers[this.config.baggageHeader] = JSON.stringify(context.baggage);
    }

    if (context.flags) {
      carrier.headers[this.config.flagsHeader] = context.flags.toString();
    }
  }

  /**
   * Start a new distributed trace
   */
  startTrace(operationName: string, options?: {
    agentId?: string;
    agentType?: string;
    serviceVersion?: string;
    tags?: Record<string, string>;
  }): DistributedSpan {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    this.traceContext = {
      traceId,
      spanId,
      baggage: {}
    };

    const span = this.startSpan(operationName, {
      ...options,
      traceId,
      parentSpanId: undefined
    });

    return span;
  }

  /**
   * Continue a distributed trace from extracted context
   */
  continueTrace(
    context: DistributedTraceContext,
    operationName: string,
    options?: {
      agentId?: string;
      agentType?: string;
      serviceVersion?: string;
      tags?: Record<string, string>;
    }
  ): DistributedSpan {
    this.traceContext = context;

    const span = this.startSpan(operationName, {
      ...options,
      traceId: context.traceId,
      parentSpanId: context.spanId
    });

    return span;
  }

  /**
   * Start a new span within the current trace
   */
  startSpan(operationName: string, options?: {
    agentId?: string;
    agentType?: string;
    agentVersion?: string;
    serviceVersion?: string;
    traceId?: string;
    parentSpanId?: string;
    tags?: Record<string, string>;
    communicationType?: 'http' | 'grpc' | 'message_queue' | 'websocket' | 'direct';
    sourceAgentId?: string;
    targetAgentId?: string;
  }): DistributedSpan {
    if (!this.config.enabled) {
      return this.createDummySpan(operationName);
    }

    const spanId = this.generateSpanId();
    const traceId = options?.traceId || this.traceContext?.traceId || this.generateTraceId();
    
    const span: DistributedSpan = {
      id: spanId,
      traceId,
      parentSpanId: options?.parentSpanId || this.traceContext?.spanId,
      operationName,
      serviceName: this.config.serviceName,
      serviceVersion: options?.serviceVersion || this.config.serviceVersion,
      startTime: new Date().toISOString(),
      status: 'running',
      tags: {
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion || '',
        'environment': this.config.environment || '',
        ...options?.tags
      },
      logs: [],
      agentId: options?.agentId,
      agentType: options?.agentType,
      agentVersion: options?.agentVersion,
      communicationType: options?.communicationType || 'direct',
      sourceAgentId: options?.sourceAgentId,
      targetAgentId: options?.targetAgentId,
      
      // Container info
      containerId: this.config.containerId,
      containerName: this.config.containerName,
      hostname: this.config.hostname,
      podName: this.config.podName,
      namespace: this.config.namespace
    };

    this.activeSpans.set(spanId, span);

    // Update trace context
    this.traceContext = {
      traceId,
      spanId,
      parentSpanId: span.parentSpanId,
      baggage: this.traceContext?.baggage || {}
    };

    return span;
  }

  /**
   * Finish a span
   */
  finishSpan(
    spanId: string, 
    options?: {
      status?: 'success' | 'error' | 'timeout';
      errorMessage?: string;
      tags?: Record<string, string>;
      totalCost?: number;
      inputCost?: number;
      outputCost?: number;
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      provider?: string;
      modelName?: string;
    }
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    const endTime = new Date().toISOString();
    const startTime = new Date(span.startTime);
    const duration = new Date(endTime).getTime() - startTime.getTime();

    // Update span
    span.endTime = endTime;
    span.duration = duration;
    span.status = options?.status || 'success';

    if (options?.errorMessage) {
      span.logs.push({
        timestamp: endTime,
        level: 'error',
        message: options.errorMessage
      });
    }

    if (options?.tags) {
      span.tags = { ...span.tags, ...options.tags };
    }

    // Add cost tracking
    if (options?.totalCost) span.totalCost = options.totalCost;
    if (options?.inputCost) span.inputCost = options.inputCost;
    if (options?.outputCost) span.outputCost = options.outputCost;
    if (options?.promptTokens) span.promptTokens = options.promptTokens;
    if (options?.completionTokens) span.completionTokens = options.completionTokens;
    if (options?.totalTokens) span.totalTokens = options.totalTokens;
    if (options?.provider) span.provider = options.provider;
    if (options?.modelName) span.modelName = options.modelName;

    // Remove from active spans and add to buffer
    this.activeSpans.delete(spanId);
    this.spanBuffer.push(span);

    // Check if buffer needs to be exported
    if (this.spanBuffer.length >= this.config.exportBatchSize) {
      this.exportSpans();
    }
  }

  /**
   * Add a log to a span
   */
  addSpanLog(
    spanId: string,
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    fields?: Record<string, any>
  ): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    span.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      fields
    });
  }

  /**
   * Add tags to a span
   */
  addSpanTags(spanId: string, tags: Record<string, string>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`Span ${spanId} not found`);
      return;
    }

    span.tags = { ...span.tags, ...tags };
  }

  /**
   * Get current trace context for propagation
   */
  getCurrentTraceContext(): DistributedTraceContext | null {
    return this.traceContext;
  }

  /**
   * Get headers for distributed trace propagation
   */
  getDistributedTraceHeaders(): DistributedTraceHeaders | {} {
    if (!this.traceContext) {
      return {};
    }

    const headers: DistributedTraceHeaders = {
      [this.config.traceIdHeader]: this.traceContext.traceId,
      [this.config.spanIdHeader]: this.traceContext.spanId
    };

    if (this.traceContext.parentSpanId) {
      headers[this.config.parentSpanIdHeader] = this.traceContext.parentSpanId;
    }

    if (this.traceContext.baggage && Object.keys(this.traceContext.baggage).length > 0) {
      headers[this.config.baggageHeader] = JSON.stringify(this.traceContext.baggage);
    }

    if (this.traceContext.flags) {
      headers[this.config.flagsHeader] = this.traceContext.flags.toString();
    }

    return headers;
  }

  /**
   * Track A2A communication
   */
  trackA2ACommunication(
    sourceAgentId: string,
    targetAgentId: string,
    communicationType: 'http' | 'grpc' | 'message_queue' | 'websocket' | 'direct',
    options?: {
      protocol?: string;
      endpoint?: string;
      method?: string;
      payload?: any;
      sourceHost?: string;
      targetHost?: string;
      sourcePort?: number;
      targetPort?: number;
    }
  ): A2ACommunication {
    const id = `a2a_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const communication: A2ACommunication = {
      id,
      traceId: this.traceContext?.traceId || this.generateTraceId(),
      sourceSpanId: this.traceContext?.spanId || this.generateSpanId(),
      targetSpanId: this.generateSpanId(),
      sourceAgentId,
      targetAgentId,
      communicationType,
      protocol: options?.protocol || communicationType,
      endpoint: options?.endpoint,
      method: options?.method,
      payload: options?.payload,
      startTime: new Date().toISOString(),
      status: 'running',
      sourceHost: options?.sourceHost,
      targetHost: options?.targetHost,
      sourcePort: options?.sourcePort,
      targetPort: options?.targetPort
    };

    return communication;
  }

  /**
   * Export spans to backend
   */
  private async exportSpans(): Promise<void> {
    if (this.spanBuffer.length === 0) {
      return;
    }

    const spans = [...this.spanBuffer];
    this.spanBuffer = [];

    try {
      const response = await fetch('/api/v1/distributed-traces/spans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ spans })
      });

      if (!response.ok) {
        console.error('Failed to export spans:', response.statusText);
        // Re-add spans to buffer for retry
        this.spanBuffer.unshift(...spans);
      }
    } catch (error) {
      console.error('Error exporting spans:', error);
      // Re-add spans to buffer for retry
      this.spanBuffer.unshift(...spans);
    }
  }

  /**
   * Start export timer
   */
  private startExportTimer(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
    }

    this.exportTimer = setInterval(() => {
      this.exportSpans();
    }, this.config.exportInterval);
  }

  /**
   * Detect container information
   */
  private detectContainerInfo(): void {
    try {
      // Get container ID from cgroup (if running in container)
      if (process.env.HOSTNAME) {
        this.config.hostname = process.env.HOSTNAME;
      }

      // Kubernetes pod info
      if (process.env.POD_NAME) {
        this.config.podName = process.env.POD_NAME;
      }

      if (process.env.POD_NAMESPACE) {
        this.config.namespace = process.env.POD_NAMESPACE;
      }

      // Docker container info
      if (process.env.CONTAINER_NAME) {
        this.config.containerName = process.env.CONTAINER_NAME;
      }
    } catch (error) {
      console.warn('Failed to detect container info:', error);
    }
  }

  /**
   * Create a dummy span for when tracing is disabled
   */
  private createDummySpan(operationName: string): DistributedSpan {
    return {
      id: 'dummy',
      traceId: 'dummy',
      operationName,
      serviceName: this.config.serviceName,
      startTime: new Date().toISOString(),
      status: 'success',
      tags: {},
      logs: [],
      communicationType: 'direct'
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.exportTimer) {
      clearInterval(this.exportTimer);
      this.exportTimer = null;
    }

    // Export remaining spans
    this.exportSpans();
  }
}

// Global tracer instance
let globalTracer: DistributedTracer | null = null;

/**
 * Get the global distributed tracer instance
 */
export function getDistributedTracer(config?: Partial<DistributedTracingConfig>): DistributedTracer {
  if (!globalTracer) {
    globalTracer = new DistributedTracer(config);
  }
  return globalTracer;
}

/**
 * Decorator for automatic span creation
 */
export function trace(operationName?: string, options?: {
  agentId?: string;
  agentType?: string;
  tags?: Record<string, string>;
}) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const spanName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracer = getDistributedTracer();
      const span = tracer.startSpan(spanName, options);

      try {
        const result = await originalMethod.apply(this, args);
        tracer.finishSpan(span.id, { status: 'success' });
        return result;
      } catch (error) {
        tracer.finishSpan(span.id, {
          status: 'error',
          errorMessage: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Utility function to wrap HTTP requests with distributed tracing
 */
export async function tracedFetch(
  url: string,
  options: RequestInit = {},
  spanOptions?: {
    operationName?: string;
    agentId?: string;
    targetAgentId?: string;
    tags?: Record<string, string>;
  }
): Promise<Response> {
  const tracer = getDistributedTracer();
  const operationName = spanOptions?.operationName || `HTTP ${options.method || 'GET'} ${url}`;
  
  const span = tracer.startSpan(operationName, {
    ...spanOptions,
    communicationType: 'http',
    tags: {
      'http.url': url,
      'http.method': options.method || 'GET',
      ...spanOptions?.tags
    }
  });

  // Add trace headers
  const traceHeaders = tracer.getDistributedTraceHeaders();
  const headers = {
    ...options.headers,
    ...traceHeaders
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    tracer.addSpanTags(span.id, {
      'http.status_code': response.status.toString(),
      'http.status_text': response.statusText
    });

    const status = response.ok ? 'success' : 'error';
    const errorMessage = response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`;
    
    tracer.finishSpan(span.id, { status, errorMessage });
    
    return response;
  } catch (error) {
    tracer.finishSpan(span.id, {
      status: 'error',
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

/**
 * Trace Tree Node for building hierarchical trace structures
 */
export interface TraceTreeNode {
  span: DistributedSpan;
  children: TraceTreeNode[];
  depth: number;
  a2aCommunications: A2ACommunication[];
  metrics: {
    totalDuration: number;
    totalCost: number;
    totalTokens: number;
    successRate: number;
    errorCount: number;
    childSpanCount: number;
  };
}

/**
 * Trace Correlation Engine for building trace trees and managing relationships
 */
export class TraceCorrelationEngine {
  /**
   * Build a trace tree from spans and A2A communications
   */
  static buildTraceTree(
    spans: DistributedSpan[],
    a2aCommunications: A2ACommunication[] = []
  ): TraceTreeNode[] {
    const spanMap = new Map<string, DistributedSpan>();
    const childrenMap = new Map<string, DistributedSpan[]>();
    const a2aMap = new Map<string, A2ACommunication[]>();

    // Build span map
    spans.forEach(span => {
      spanMap.set(span.id, span);
    });

    // Build children map (parent -> children)
    spans.forEach(span => {
      if (span.parentSpanId) {
        if (!childrenMap.has(span.parentSpanId)) {
          childrenMap.set(span.parentSpanId, []);
        }
        childrenMap.get(span.parentSpanId)!.push(span);
      }
    });

    // Build A2A communication map (span -> communications)
    a2aCommunications.forEach(comm => {
      if (comm.sourceSpanId) {
        if (!a2aMap.has(comm.sourceSpanId)) {
          a2aMap.set(comm.sourceSpanId, []);
        }
        a2aMap.get(comm.sourceSpanId)!.push(comm);
      }
      if (comm.targetSpanId && comm.targetSpanId !== comm.sourceSpanId) {
        if (!a2aMap.has(comm.targetSpanId)) {
          a2aMap.set(comm.targetSpanId, []);
        }
        a2aMap.get(comm.targetSpanId)!.push(comm);
      }
    });

    // Find root spans (spans with no parent or parent not in current span set)
    const rootSpans = spans.filter(span => 
      !span.parentSpanId || !spanMap.has(span.parentSpanId)
    );

    // Build tree nodes recursively
    return rootSpans.map(rootSpan => 
      this.buildTraceNode(rootSpan, childrenMap, a2aMap, 0)
    );
  }

  /**
   * Build a single trace tree node recursively
   */
  private static buildTraceNode(
    span: DistributedSpan,
    childrenMap: Map<string, DistributedSpan[]>,
    a2aMap: Map<string, A2ACommunication[]>,
    depth: number
  ): TraceTreeNode {
    const children = childrenMap.get(span.id) || [];
    const a2aCommunications = a2aMap.get(span.id) || [];

    // Build child nodes recursively
    const childNodes = children.map(child => 
      this.buildTraceNode(child, childrenMap, a2aMap, depth + 1)
    );

    // Calculate metrics for this node and its children
    const metrics = this.calculateNodeMetrics(span, childNodes);

    return {
      span,
      children: childNodes,
      depth,
      a2aCommunications,
      metrics
    };
  }

  /**
   * Calculate metrics for a trace node including all its children
   */
  private static calculateNodeMetrics(
    span: DistributedSpan,
    children: TraceTreeNode[]
  ): TraceTreeNode['metrics'] {
    const childMetrics = children.reduce((acc, child) => ({
      totalDuration: acc.totalDuration + child.metrics.totalDuration,
      totalCost: acc.totalCost + child.metrics.totalCost,
      totalTokens: acc.totalTokens + child.metrics.totalTokens,
      errorCount: acc.errorCount + child.metrics.errorCount,
      childSpanCount: acc.childSpanCount + child.metrics.childSpanCount + 1
    }), {
      totalDuration: 0,
      totalCost: 0,
      totalTokens: 0,
      errorCount: 0,
      childSpanCount: 0
    });

    const spanDuration = span.duration || 0;
    const spanCost = span.totalCost || 0;
    const spanTokens = span.totalTokens || 0;
    const spanError = span.status === 'error' ? 1 : 0;

    const totalSpanCount = childMetrics.childSpanCount + 1;
    const totalErrorCount = childMetrics.errorCount + spanError;

    return {
      totalDuration: spanDuration + childMetrics.totalDuration,
      totalCost: spanCost + childMetrics.totalCost,
      totalTokens: spanTokens + childMetrics.totalTokens,
      successRate: totalSpanCount > 0 ? ((totalSpanCount - totalErrorCount) / totalSpanCount) * 100 : 100,
      errorCount: totalErrorCount,
      childSpanCount: childMetrics.childSpanCount
    };
  }

  /**
   * Find trace paths between two agents
   */
  static findAgentPaths(
    traceTree: TraceTreeNode[],
    sourceAgentId: string,
    targetAgentId: string
  ): TraceTreeNode[][] {
    const paths: TraceTreeNode[][] = [];

    function searchPaths(nodes: TraceTreeNode[], currentPath: TraceTreeNode[]) {
      for (const node of nodes) {
        const newPath = [...currentPath, node];

        // Check if this node has A2A communication between source and target
        const hasA2APath = node.a2aCommunications.some(comm => 
          comm.sourceAgentId === sourceAgentId && comm.targetAgentId === targetAgentId
        );

        if (hasA2APath) {
          paths.push(newPath);
        }

        // Continue searching in children
        if (node.children.length > 0) {
          searchPaths(node.children, newPath);
        }
      }
    }

    searchPaths(traceTree, []);
    return paths;
  }

  /**
   * Calculate cross-agent communication patterns
   */
  static analyzeCrossAgentPatterns(
    traceTree: TraceTreeNode[]
  ): {
    agentInteractions: Map<string, Set<string>>;
    communicationTypes: Map<string, number>;
    crossContainerCommunications: A2ACommunication[];
    criticalPath: TraceTreeNode[];
  } {
    const agentInteractions = new Map<string, Set<string>>();
    const communicationTypes = new Map<string, number>();
    const crossContainerCommunications: A2ACommunication[] = [];
    let criticalPath: TraceTreeNode[] = [];
    let maxDuration = 0;

    function analyzeNode(node: TraceTreeNode, currentPath: TraceTreeNode[]) {
      const newPath = [...currentPath, node];

      // Track critical path (longest duration path)
      if (node.metrics.totalDuration > maxDuration) {
        maxDuration = node.metrics.totalDuration;
        criticalPath = newPath;
      }

      // Analyze A2A communications
      node.a2aCommunications.forEach(comm => {
        // Track agent interactions
        if (!agentInteractions.has(comm.sourceAgentId)) {
          agentInteractions.set(comm.sourceAgentId, new Set());
        }
        agentInteractions.get(comm.sourceAgentId)!.add(comm.targetAgentId);

        // Track communication types
        const commType = comm.communicationType;
        communicationTypes.set(commType, (communicationTypes.get(commType) || 0) + 1);

        // Track cross-container communications
        if (comm.sourceHost && comm.targetHost && comm.sourceHost !== comm.targetHost) {
          crossContainerCommunications.push(comm);
        }
      });

      // Recurse into children
      node.children.forEach(child => analyzeNode(child, newPath));
    }

    traceTree.forEach(root => analyzeNode(root, []));

    return {
      agentInteractions,
      communicationTypes,
      crossContainerCommunications,
      criticalPath
    };
  }

  /**
   * Detect bottlenecks and performance issues in the trace
   */
  static detectBottlenecks(
    traceTree: TraceTreeNode[]
  ): {
    slowestSpans: { span: DistributedSpan; duration: number; path: string[] }[];
    highCostSpans: { span: DistributedSpan; cost: number; path: string[] }[];
    errorPaths: { path: TraceTreeNode[]; errorCount: number }[];
    hotspotAgents: { agentId: string; totalDuration: number; spanCount: number }[];
  } {
    const slowestSpans: { span: DistributedSpan; duration: number; path: string[] }[] = [];
    const highCostSpans: { span: DistributedSpan; cost: number; path: string[] }[] = [];
    const errorPaths: { path: TraceTreeNode[]; errorCount: number }[] = [];
    const agentMetrics = new Map<string, { totalDuration: number; spanCount: number }>();

    function analyzeNode(node: TraceTreeNode, currentPath: TraceTreeNode[], pathNames: string[]) {
      const newPath = [...currentPath, node];
      const newPathNames = [...pathNames, node.span.operationName];

      // Track slow spans
      if (node.span.duration && node.span.duration > 1000) { // > 1 second
        slowestSpans.push({
          span: node.span,
          duration: node.span.duration,
          path: newPathNames
        });
      }

      // Track high cost spans
      if (node.span.totalCost && node.span.totalCost > 0.01) { // > $0.01
        highCostSpans.push({
          span: node.span,
          cost: node.span.totalCost,
          path: newPathNames
        });
      }

      // Track error paths
      if (node.metrics.errorCount > 0) {
        errorPaths.push({
          path: newPath,
          errorCount: node.metrics.errorCount
        });
      }

      // Track agent metrics
      if (node.span.agentId) {
        const existing = agentMetrics.get(node.span.agentId) || { totalDuration: 0, spanCount: 0 };
        agentMetrics.set(node.span.agentId, {
          totalDuration: existing.totalDuration + (node.span.duration || 0),
          spanCount: existing.spanCount + 1
        });
      }

      // Recurse into children
      node.children.forEach(child => analyzeNode(child, newPath, newPathNames));
    }

    traceTree.forEach(root => analyzeNode(root, [], []));

    // Sort and limit results
    slowestSpans.sort((a, b) => b.duration - a.duration);
    highCostSpans.sort((a, b) => b.cost - a.cost);
    errorPaths.sort((a, b) => b.errorCount - a.errorCount);

    // Create hotspot agents list
    const hotspotAgents = Array.from(agentMetrics.entries())
      .map(([agentId, metrics]) => ({ agentId, ...metrics }))
      .sort((a, b) => b.totalDuration - a.totalDuration);

    return {
      slowestSpans: slowestSpans.slice(0, 10),
      highCostSpans: highCostSpans.slice(0, 10),
      errorPaths: errorPaths.slice(0, 5),
      hotspotAgents: hotspotAgents.slice(0, 10)
    };
  }

  /**
   * Calculate service dependency graph
   */
  static buildServiceDependencyGraph(
    traceTree: TraceTreeNode[]
  ): {
    nodes: { id: string; label: string; spanCount: number; avgDuration: number; errorRate: number }[];
    edges: { source: string; target: string; weight: number; communicationType: string }[];
  } {
    const serviceMetrics = new Map<string, { spanCount: number; totalDuration: number; errorCount: number }>();
    const serviceDependencies = new Map<string, Map<string, { weight: number; communicationType: string }>>();

    function analyzeNode(node: TraceTreeNode) {
      const serviceName = node.span.serviceName;

      // Track service metrics
      if (!serviceMetrics.has(serviceName)) {
        serviceMetrics.set(serviceName, { spanCount: 0, totalDuration: 0, errorCount: 0 });
      }

      const metrics = serviceMetrics.get(serviceName)!;
      metrics.spanCount++;
      metrics.totalDuration += node.span.duration || 0;
      if (node.span.status === 'error') {
        metrics.errorCount++;
      }

      // Track service dependencies from A2A communications
      node.a2aCommunications.forEach(comm => {
        const sourceService = `agent_${comm.sourceAgentId}`;
        const targetService = `agent_${comm.targetAgentId}`;

        if (!serviceDependencies.has(sourceService)) {
          serviceDependencies.set(sourceService, new Map());
        }

        const targetMap = serviceDependencies.get(sourceService)!;
        const existing = targetMap.get(targetService) || { weight: 0, communicationType: comm.communicationType };
        targetMap.set(targetService, {
          weight: existing.weight + 1,
          communicationType: comm.communicationType
        });
      });

      // Recurse into children
      node.children.forEach(child => analyzeNode(child));
    }

    traceTree.forEach(root => analyzeNode(root));

    // Build nodes
    const nodes = Array.from(serviceMetrics.entries()).map(([serviceName, metrics]) => ({
      id: serviceName,
      label: serviceName,
      spanCount: metrics.spanCount,
      avgDuration: metrics.spanCount > 0 ? metrics.totalDuration / metrics.spanCount : 0,
      errorRate: metrics.spanCount > 0 ? (metrics.errorCount / metrics.spanCount) * 100 : 0
    }));

    // Build edges
    const edges: { source: string; target: string; weight: number; communicationType: string }[] = [];
    serviceDependencies.forEach((targetMap, source) => {
      targetMap.forEach((edge, target) => {
        edges.push({
          source,
          target,
          weight: edge.weight,
          communicationType: edge.communicationType
        });
      });
    });

    return { nodes, edges };
  }
}