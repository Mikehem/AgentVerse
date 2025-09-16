import { TraceService } from '../../src/services/TraceService';
import { createClient } from '@clickhouse/client';
import { PrismaClient } from '@prisma/client';
import type {
  AuthenticatedUser,
  CreateTraceRequest,
  UpdateTraceRequest,
  TraceResponse,
  TraceListRequest,
  CreateSpanRequest,
  UpdateSpanRequest,
  SpanResponse,
  TraceAnalyticsRequest,
  TraceExportRequest,
  TraceSearchRequest,
  TraceStatus,
  SpanStatus,
  SpanType,
  TraceMetadata,
  SpanMetadata,
  TraceScore,
  SpanScore,
  TraceSummaryRequest,
  OTLPTraceExportRequest,
} from '../../src/types/traces';

// Mock dependencies
jest.mock('@clickhouse/client');
jest.mock('@prisma/client');
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../src/services/ProjectService', () => ({
  ProjectService: {
    canReadProject: jest.fn().mockReturnValue(true),
    getProject: jest.fn().mockResolvedValue({
      id: 'project-123',
      name: 'Test Project',
      workspaceId: 'workspace-123',
    }),
  },
}));

// Mock background job service
jest.mock('../../src/services/BackgroundJobService', () => ({
  backgroundJobService: {
    createJob: jest.fn(),
    getJobStatus: jest.fn(),
  },
}));

const mockClickHouse = {
  exec: jest.fn(),
  query: jest.fn(),
  insert: jest.fn(),
  close: jest.fn(),
};

const mockPrisma = {
  trace: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  span: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  workspace: {
    findUnique: jest.fn(),
  },
  project: {
    findUnique: jest.fn(),
  },
  experiment: {
    findUnique: jest.fn(),
  },
  dataset: {
    findUnique: jest.fn(),
  },
};

// Import mocked functions
import { backgroundJobService } from '../../src/services/BackgroundJobService';

(createClient as jest.Mock).mockReturnValue(mockClickHouse);
(PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);

describe('TraceService', () => {
  let mockUser: AuthenticatedUser;
  let mockTrace: any;
  let mockSpan: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'user',
      workspaceId: 'workspace-123',
      permissions: ['read', 'write', 'execute'],
    };

    mockTrace = {
      id: 'trace-123',
      name: 'test-trace',
      projectId: 'project-123',
      workspaceId: 'workspace-123',
      status: 'running',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: null,
      tags: { environment: 'test', version: '1.0' },
      metadata: {
        environment: 'development',
        source: 'api',
        costTracking: { enabled: true },
        performance: { priority: 'medium' },
        business: { feature: 'chat' },
      },
      spanCount: 0,
      errorCount: 0,
      warningCount: 0,
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    };

    mockSpan = {
      id: 'span-123',
      traceId: 'trace-123',
      parentSpanId: null,
      name: 'llm-completion',
      type: 'llm',
      input: { prompt: 'Hello, world!' },
      output: { response: 'Hello! How can I help you?' },
      status: 'completed',
      startTime: new Date('2024-01-01T10:00:01Z'),
      endTime: new Date('2024-01-01T10:00:03Z'),
      duration: 2000,
      tokens: 25,
      cost: 0.001,
      metadata: {
        model: 'gpt-4',
        provider: 'openai',
        temperature: 0.7,
      },
      createdAt: new Date('2024-01-01T10:00:01Z'),
      updatedAt: new Date('2024-01-01T10:00:03Z'),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Trace Management', () => {
    test('should create trace successfully', async () => {
      const createRequest: CreateTraceRequest = {
        name: 'chat-conversation',
        projectId: 'project-123',
        workspaceId: 'workspace-123',
        experimentId: 'exp-123',
        sessionId: 'session-456',
        userId: 'user-789',
        tags: {
          environment: 'production',
          version: '2.1.0',
          feature: 'chat',
        },
        metadata: {
          environment: 'production',
          source: 'api',
          model: 'gpt-4',
          provider: 'openai',
          costTracking: {
            enabled: true,
            currency: 'USD',
          },
          performance: {
            expectedDuration: 5000,
            priority: 'high',
          },
          business: {
            feature: 'chat-completion',
            team: 'ai-team',
            department: 'engineering',
          },
        },
        startTime: new Date(),
      };

      mockPrisma.trace.create.mockResolvedValue({
        ...mockTrace,
        name: createRequest.name,
        experimentId: createRequest.experimentId,
        sessionId: createRequest.sessionId,
        userId: createRequest.userId,
        tags: createRequest.tags,
        metadata: JSON.stringify(createRequest.metadata),
      });

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockPrisma.project.findUnique.mockResolvedValue({
        id: 'project-123',
        name: 'Test Project',
      });

      mockClickHouse.insert.mockResolvedValue(undefined);

      const result = await TraceService.createTrace(createRequest, mockUser);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('chat-conversation');
      expect(result.experimentId).toBe('exp-123');
      expect(result.canRead).toBe(true);
      expect(result.canEdit).toBe(true);
      expect(result.canAddSpans).toBe(true);

      expect(mockPrisma.trace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'chat-conversation',
          projectId: 'project-123',
          workspaceId: 'workspace-123',
          experimentId: 'exp-123',
          sessionId: 'session-456',
          userId: 'user-789',
        }),
      });

      expect(mockClickHouse.insert).toHaveBeenCalledWith({
        table: 'traces',
        values: [expect.objectContaining({
          id: expect.any(String),
          name: 'chat-conversation',
          workspace_id: 'workspace-123',
        })],
        format: 'JSONEachRow',
      });
    });

    test('should update trace successfully', async () => {
      const updateRequest: UpdateTraceRequest = {
        name: 'updated-trace-name',
        status: 'completed',
        endTime: new Date('2024-01-01T10:05:00Z'),
        tags: { updated: 'true' },
        metadata: {
          performance: { priority: 'low' },
          business: { customFields: { updated: true } },
        },
      };

      mockPrisma.trace.findUnique.mockResolvedValue(mockTrace);
      mockPrisma.trace.update.mockResolvedValue({
        ...mockTrace,
        name: updateRequest.name,
        status: updateRequest.status,
        endTime: updateRequest.endTime,
        tags: { ...mockTrace.tags, ...updateRequest.tags },
        updatedAt: new Date(),
      });

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockClickHouse.exec.mockResolvedValue(undefined);

      const result = await TraceService.updateTrace('trace-123', updateRequest, mockUser);

      expect(result.name).toBe('updated-trace-name');
      expect(result.status).toBe('completed');
      expect(result.endTime).toEqual(updateRequest.endTime);
      expect(result.tags.updated).toBe('true');

      expect(mockPrisma.trace.update).toHaveBeenCalledWith({
        where: { id: 'trace-123' },
        data: expect.objectContaining({
          name: 'updated-trace-name',
          status: 'completed',
          endTime: updateRequest.endTime,
        }),
      });
    });

    test('should get trace with spans and feedback', async () => {
      const mockSpans = [
        { ...mockSpan, id: 'span-1', name: 'input-processing' },
        { ...mockSpan, id: 'span-2', name: 'llm-call', parentSpanId: 'span-1' },
        { ...mockSpan, id: 'span-3', name: 'output-formatting', parentSpanId: 'span-1' },
      ];

      const mockFeedback = [
        {
          id: 'feedback-1',
          traceId: 'trace-123',
          name: 'quality',
          value: 0.85,
          source: 'human',
          createdBy: 'user-456',
        },
        {
          id: 'feedback-2',
          traceId: 'trace-123',
          name: 'relevance',
          value: 0.92,
          source: 'automated',
          createdBy: null,
        },
      ];

      mockPrisma.trace.findUnique.mockResolvedValue(mockTrace);
      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockClickHouse.query.mockImplementation(({ query }) => {
        if (query.includes('FROM spans')) {
          return { json: () => Promise.resolve(mockSpans) };
        }
        if (query.includes('FROM feedback')) {
          return { json: () => Promise.resolve(mockFeedback) };
        }
        return { json: () => Promise.resolve([]) };
      });

      const result = await TraceService.getTrace('trace-123', mockUser, {
        includeSpans: true,
        includeFeedback: true,
      });

      expect(result.id).toBe('trace-123');
      expect(result.spans).toHaveLength(3);
      expect(result.feedbackScores).toHaveLength(2);
      expect(result.averageScore).toBeCloseTo(0.885, 2); // (0.85 + 0.92) / 2
    });

    test('should list traces with filters and pagination', async () => {
      const listRequest: TraceListRequest = {
        workspaceId: 'workspace-123',
        projectId: 'project-123',
        status: 'completed',
        tags: { environment: 'production' },
        startTime: {
          gte: new Date('2024-01-01T00:00:00Z'),
          lte: new Date('2024-01-31T23:59:59Z'),
        },
        limit: 20,
        offset: 0,
        sortBy: 'startTime',
        sortOrder: 'desc',
        search: 'chat',
      };

      const mockTraces = [
        { ...mockTrace, id: 'trace-1', name: 'chat-session-1' },
        { ...mockTrace, id: 'trace-2', name: 'chat-session-2' },
        { ...mockTrace, id: 'trace-3', name: 'chat-session-3' },
      ];

      mockClickHouse.query.mockResolvedValue({
        json: () => Promise.resolve(mockTraces),
      });

      mockClickHouse.query.mockResolvedValueOnce({
        json: () => Promise.resolve([{ count: 125 }]),
      });

      const result = await TraceService.listTraces(listRequest, mockUser);

      expect(result.traces).toHaveLength(3);
      expect(result.total).toBe(125);
      expect(result.hasMore).toBe(true);
      expect(result.nextOffset).toBe(20);

      expect(mockClickHouse.query).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('WHERE workspace_id = {workspace_id:String}'),
          query_params: expect.objectContaining({
            workspace_id: 'workspace-123',
            project_id: 'project-123',
            status: 'completed',
          }),
        })
      );
    });
  });

  describe('Span Management', () => {
    test('should create span successfully', async () => {
      const createSpanRequest: CreateSpanRequest = {
        traceId: 'trace-123',
        parentSpanId: 'span-parent',
        name: 'database-query',
        type: 'db',
        input: {
          query: 'SELECT * FROM users WHERE id = ?',
          parameters: [123],
        },
        output: {
          results: [{ id: 123, name: 'John Doe' }],
          rowCount: 1,
        },
        metadata: {
          database: 'postgres',
          table: 'users',
          operation: 'select',
        },
        startTime: new Date(),
      };

      mockPrisma.trace.findUnique.mockResolvedValue(mockTrace);
      mockPrisma.span.create.mockResolvedValue({
        ...mockSpan,
        name: createSpanRequest.name,
        type: createSpanRequest.type,
        parentSpanId: createSpanRequest.parentSpanId,
      });

      mockClickHouse.insert.mockResolvedValue(undefined);

      const result = await TraceService.createSpan(createSpanRequest, mockUser);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('database-query');
      expect(result.type).toBe('db');
      expect(result.parentSpanId).toBe('span-parent');
      expect(result.canRead).toBe(true);
      expect(result.canEdit).toBe(true);

      expect(mockPrisma.span.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          traceId: 'trace-123',
          parentSpanId: 'span-parent',
          name: 'database-query',
          type: 'db',
        }),
      });
    });

    test('should update span with completion data', async () => {
      const updateSpanRequest: UpdateSpanRequest = {
        output: {
          response: 'Operation completed successfully',
          metrics: { executionTime: 250, memoryUsed: 1024 },
        },
        status: 'completed',
        endTime: new Date('2024-01-01T10:00:05Z'),
        tokens: 150,
        cost: 0.005,
        metadata: {
          finalMetrics: { success: true, errors: 0 },
        },
      };

      mockPrisma.span.findUnique.mockResolvedValue({
        ...mockSpan,
        trace: mockTrace,
      });

      mockPrisma.span.update.mockResolvedValue({
        ...mockSpan,
        output: JSON.stringify(updateSpanRequest.output),
        status: updateSpanRequest.status,
        endTime: updateSpanRequest.endTime,
        tokens: updateSpanRequest.tokens,
        cost: updateSpanRequest.cost,
        duration: 4000, // Calculated from start/end times
      });

      mockClickHouse.exec.mockResolvedValue(undefined);

      const result = await TraceService.updateSpan('span-123', updateSpanRequest, mockUser);

      expect(result.status).toBe('completed');
      expect(result.endTime).toEqual(updateSpanRequest.endTime);
      expect(result.tokens).toBe(150);
      expect(result.cost).toBe(0.005);
      expect(result.duration).toBe(4000);

      expect(mockPrisma.span.update).toHaveBeenCalledWith({
        where: { id: 'span-123' },
        data: expect.objectContaining({
          status: 'completed',
          endTime: updateSpanRequest.endTime,
          tokens: 150,
          cost: 0.005,
        }),
      });
    });

    test('should build span hierarchy correctly', async () => {
      const hierarchicalSpans = [
        { ...mockSpan, id: 'span-root', name: 'root-span', parentSpanId: null },
        { ...mockSpan, id: 'span-child-1', name: 'child-1', parentSpanId: 'span-root' },
        { ...mockSpan, id: 'span-child-2', name: 'child-2', parentSpanId: 'span-root' },
        { ...mockSpan, id: 'span-grandchild', name: 'grandchild', parentSpanId: 'span-child-1' },
      ];

      mockClickHouse.query.mockResolvedValue({
        json: () => Promise.resolve(hierarchicalSpans),
      });

      const result = await TraceService.getSpanHierarchy('trace-123', mockUser);

      expect(result).toHaveLength(1); // Only root spans at top level
      expect(result[0].id).toBe('span-root');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].children).toHaveLength(1);
      expect(result[0].children[0].children[0].id).toBe('span-grandchild');
    });
  });

  describe('Async Processing Capabilities', () => {
    test('should process trace analysis asynchronously', async () => {
      const analysisRequest: TraceAnalyticsRequest = {
        workspaceId: 'workspace-123',
        traceIds: ['trace-1', 'trace-2', 'trace-3'],
        analysisTypes: ['performance', 'quality', 'cost'],
        timeRange: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z'),
        },
        options: {
          async: true,
          priority: 'high',
          notifyOnCompletion: true,
        },
      };

      (backgroundJobService.createJob as jest.Mock).mockResolvedValue({
        id: 'job-analysis-456',
        name: 'trace-analysis',
        status: 'queued',
      });

      const result = await TraceService.analyzeTracesAsync(analysisRequest, mockUser);

      expect(result.jobId).toBe('job-analysis-456');
      expect(result.status).toBe('queued');
      expect(result.estimatedDuration).toBeDefined();

      expect(backgroundJobService.createJob).toHaveBeenCalledWith({
        name: 'trace-analysis',
        type: 'trace_analysis',
        workspaceId: 'workspace-123',
        payload: {
          traceIds: ['trace-1', 'trace-2', 'trace-3'],
          analysisTypes: ['performance', 'quality', 'cost'],
          timeRange: analysisRequest.timeRange,
        },
        options: {
          priority: 'high',
          attempts: 3,
        },
      }, mockUser);
    });

    test('should export large trace datasets asynchronously', async () => {
      const exportRequest: TraceExportRequest = {
        workspaceId: 'workspace-123',
        filters: {
          projectIds: ['project-1', 'project-2'],
          status: 'completed',
          timeRange: {
            startDate: new Date('2024-01-01T00:00:00Z'),
            endDate: new Date('2024-12-31T23:59:59Z'),
          },
        },
        format: 'json',
        includeSpans: true,
        includeFeedback: true,
        options: {
          async: true,
          compression: 'gzip',
          maxRecords: 10000,
        },
      };

      (backgroundJobService.createJob as jest.Mock).mockResolvedValue({
        id: 'job-export-789',
        name: 'trace-export',
        status: 'queued',
      });

      const result = await TraceService.exportTracesAsync(exportRequest, mockUser);

      expect(result.jobId).toBe('job-export-789');
      expect(result.format).toBe('json');
      expect(result.estimatedSize).toBeDefined();
      expect(result.downloadUrl).toBeUndefined(); // Will be available after completion

      expect(backgroundJobService.createJob).toHaveBeenCalledWith({
        name: 'trace-export',
        type: 'data_export',
        workspaceId: 'workspace-123',
        payload: {
          exportType: 'traces',
          filters: exportRequest.filters,
          format: 'json',
          includeSpans: true,
          includeFeedback: true,
        },
        options: {
          priority: 'normal',
          attempts: 2,
          timeout: 3600000, // 1 hour
        },
      }, mockUser);
    });

    test('should process real-time trace streaming', async () => {
      const streamConfig = {
        workspaceId: 'workspace-123',
        filters: {
          projectId: 'project-123',
          tags: { environment: 'production' },
        },
        bufferSize: 100,
        flushIntervalMs: 5000,
      };

      const mockTraceStream = [
        { ...mockTrace, id: 'stream-trace-1', name: 'streaming-trace-1' },
        { ...mockTrace, id: 'stream-trace-2', name: 'streaming-trace-2' },
      ];

      // Mock streaming implementation
      const streamProcessor = {
        process: jest.fn().mockImplementation((traces) => {
          return Promise.resolve({
            processed: traces.length,
            buffered: 0,
            flushed: traces.length,
          });
        }),
      };

      TraceService.createStreamProcessor = jest.fn().mockReturnValue(streamProcessor);

      const result = await TraceService.processTraceStream(mockTraceStream, streamConfig, mockUser);

      expect(result.processed).toBe(2);
      expect(result.flushed).toBe(2);
      expect(streamProcessor.process).toHaveBeenCalledWith(mockTraceStream);
    });

    test('should handle batch trace processing', async () => {
      const batchTraces: CreateTraceRequest[] = [
        {
          name: 'batch-trace-1',
          projectId: 'project-123',
          workspaceId: 'workspace-123',
        },
        {
          name: 'batch-trace-2',
          projectId: 'project-123',
          workspaceId: 'workspace-123',
        },
        {
          name: 'batch-trace-3',
          projectId: 'project-123',
          workspaceId: 'workspace-123',
        },
      ];

      mockPrisma.trace.create.mockResolvedValueOnce({
        ...mockTrace,
        id: 'batch-trace-1',
        name: 'batch-trace-1',
      });
      mockPrisma.trace.create.mockResolvedValueOnce({
        ...mockTrace,
        id: 'batch-trace-2',
        name: 'batch-trace-2',
      });
      mockPrisma.trace.create.mockResolvedValueOnce({
        ...mockTrace,
        id: 'batch-trace-3',
        name: 'batch-trace-3',
      });

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockClickHouse.insert.mockResolvedValue(undefined);

      const result = await TraceService.batchCreateTraces(batchTraces, mockUser);

      expect(result.created).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.results).toHaveLength(3);
      expect(result.results.every(r => r.success)).toBe(true);

      expect(mockPrisma.trace.create).toHaveBeenCalledTimes(3);
      expect(mockClickHouse.insert).toHaveBeenCalledWith({
        table: 'traces',
        values: expect.any(Array),
        format: 'JSONEachRow',
      });
    });

    test('should process OTLP trace data', async () => {
      const otlpRequest: OTLPTraceExportRequest = {
        resourceSpans: [
          {
            resource: {
              attributes: [
                { key: 'service.name', value: { stringValue: 'test-service' } },
                { key: 'service.version', value: { stringValue: '1.0.0' } },
              ],
            },
            scopeSpans: [
              {
                spans: [
                  {
                    traceId: Buffer.from('trace123', 'utf8'),
                    spanId: Buffer.from('span123', 'utf8'),
                    name: 'http-request',
                    kind: 3, // CLIENT
                    startTimeUnixNano: BigInt(1640995200000000000), // 2022-01-01T00:00:00Z
                    endTimeUnixNano: BigInt(1640995205000000000),   // 2022-01-01T00:00:05Z
                    attributes: [
                      { key: 'http.method', value: { stringValue: 'GET' } },
                      { key: 'http.url', value: { stringValue: 'https://api.example.com/users' } },
                    ],
                    status: { code: 1 }, // OK
                  },
                ],
              },
            ],
          },
        ],
      };

      mockPrisma.trace.create.mockResolvedValue({
        ...mockTrace,
        id: 'otlp-trace-123',
        name: 'http-request',
      });

      mockPrisma.span.create.mockResolvedValue({
        ...mockSpan,
        id: 'otlp-span-123',
        name: 'http-request',
      });

      mockClickHouse.insert.mockResolvedValue(undefined);

      const result = await TraceService.processOTLPTraceData(otlpRequest, mockUser);

      expect(result.processed).toBe(1);
      expect(result.traces).toHaveLength(1);
      expect(result.spans).toHaveLength(1);
      expect(result.errors).toHaveLength(0);

      expect(mockPrisma.trace.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'http-request',
          workspaceId: 'workspace-123',
        }),
      });
    });
  });

  describe('Search and Analytics', () => {
    test('should perform advanced trace search', async () => {
      const searchRequest: TraceSearchRequest = {
        workspaceId: 'workspace-123',
        query: {
          text: 'chat completion',
          filters: {
            status: ['completed', 'running'],
            tags: { environment: 'production' },
            performance: {
              minDuration: 1000,
              maxDuration: 30000,
            },
            cost: {
              minCost: 0.001,
              maxCost: 1.0,
            },
          },
        },
        options: {
          fuzzySearch: true,
          includeSpans: true,
          highlightMatches: true,
        },
        pagination: {
          limit: 25,
          offset: 0,
        },
      };

      const mockSearchResults = [
        {
          ...mockTrace,
          id: 'search-trace-1',
          name: 'chat completion request',
          _score: 0.95,
          _highlights: ['chat <em>completion</em> request'],
        },
        {
          ...mockTrace,
          id: 'search-trace-2',
          name: 'completion generation',
          _score: 0.78,
          _highlights: ['<em>completion</em> generation'],
        },
      ];

      mockClickHouse.query.mockResolvedValue({
        json: () => Promise.resolve(mockSearchResults),
      });

      const result = await TraceService.searchTraces(searchRequest, mockUser);

      expect(result.results).toHaveLength(2);
      expect(result.results[0]._score).toBe(0.95);
      expect(result.results[0]._highlights).toContain('chat <em>completion</em> request');
      expect(result.totalMatches).toBeDefined();
      expect(result.searchTime).toBeDefined();
    });

    test('should generate trace summary and insights', async () => {
      const summaryRequest: TraceSummaryRequest = {
        workspaceId: 'workspace-123',
        projectId: 'project-123',
        timeRange: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-31T23:59:59Z'),
        },
        groupBy: ['status', 'tags.environment'],
        metrics: ['count', 'avg_duration', 'error_rate', 'total_cost'],
      };

      const mockSummary = {
        totalTraces: 1500,
        totalSpans: 8750,
        averageDuration: 2340,
        errorRate: 0.034,
        totalCost: 45.67,
        breakdown: {
          by_status: {
            completed: 1440,
            failed: 45,
            running: 15,
          },
          by_environment: {
            production: 1200,
            staging: 225,
            development: 75,
          },
        },
        trends: {
          daily: [
            { date: '2024-01-01', count: 48, avg_duration: 2100, error_rate: 0.02 },
            { date: '2024-01-02', count: 52, avg_duration: 2280, error_rate: 0.04 },
          ],
        },
        insights: [
          {
            type: 'performance_degradation',
            severity: 'warning',
            message: 'Average duration increased by 15% over the period',
            data: { previous: 2030, current: 2340, change_percent: 15.3 },
          },
          {
            type: 'error_spike',
            severity: 'info',
            message: 'Error rate is within normal range but trending upward',
            data: { current_rate: 0.034, threshold: 0.05 },
          },
        ],
      };

      mockClickHouse.query.mockImplementation(({ query }) => {
        if (query.includes('COUNT(*)')) {
          return { json: () => Promise.resolve([{ count: 1500 }]) };
        }
        if (query.includes('GROUP BY')) {
          return { json: () => Promise.resolve(mockSummary.breakdown) };
        }
        return { json: () => Promise.resolve(mockSummary.trends.daily) };
      });

      TraceService.generateInsights = jest.fn().mockResolvedValue(mockSummary.insights);

      const result = await TraceService.getTraceSummary(summaryRequest, mockUser);

      expect(result.totalTraces).toBe(1500);
      expect(result.errorRate).toBe(0.034);
      expect(result.breakdown.by_status.completed).toBe(1440);
      expect(result.insights).toHaveLength(2);
      expect(result.insights[0].severity).toBe('warning');
    });

    test('should handle complex aggregation queries', async () => {
      const aggregationQuery = {
        workspaceId: 'workspace-123',
        metrics: [
          'trace_count',
          'avg_duration',
          'p95_duration',
          'error_rate',
          'total_cost',
          'unique_users',
        ],
        groupBy: ['project_id', 'tags.environment', 'hour(start_time)'],
        timeRange: {
          startDate: new Date('2024-01-01T00:00:00Z'),
          endDate: new Date('2024-01-07T23:59:59Z'),
        },
        filters: {
          status: ['completed', 'failed'],
          minSpanCount: 1,
        },
      };

      const mockAggregationResults = [
        {
          project_id: 'project-123',
          environment: 'production',
          hour: 10,
          trace_count: 45,
          avg_duration: 2100,
          p95_duration: 5200,
          error_rate: 0.022,
          total_cost: 1.45,
          unique_users: 32,
        },
        {
          project_id: 'project-123',
          environment: 'production',
          hour: 11,
          trace_count: 52,
          avg_duration: 1950,
          p95_duration: 4800,
          error_rate: 0.019,
          total_cost: 1.68,
          unique_users: 38,
        },
      ];

      mockClickHouse.query.mockResolvedValue({
        json: () => Promise.resolve(mockAggregationResults),
      });

      const result = await TraceService.aggregateTraceMetrics(aggregationQuery, mockUser);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].trace_count).toBe(45);
      expect(result.results[0].p95_duration).toBe(5200);
      expect(result.groupBy).toEqual(['project_id', 'tags.environment', 'hour(start_time)']);
      expect(result.totalGroups).toBe(2);
    });
  });

  describe('Permission and Security', () => {
    test('should enforce workspace isolation', async () => {
      const otherWorkspaceTrace = {
        ...mockTrace,
        workspaceId: 'other-workspace',
      };

      mockPrisma.trace.findUnique.mockResolvedValue(otherWorkspaceTrace);

      await expect(
        TraceService.getTrace('trace-123', mockUser)
      ).rejects.toThrow('Access denied');
    });

    test('should check permissions for trace operations', async () => {
      const viewerUser: AuthenticatedUser = {
        ...mockUser,
        role: 'viewer',
      };

      expect(TraceService.canCreateTrace(viewerUser, 'project-123')).toBe(false);
      expect(TraceService.canEditTrace(viewerUser, mockTrace)).toBe(false);
      expect(TraceService.canDeleteTrace(viewerUser, mockTrace)).toBe(false);
      expect(TraceService.canAddSpans(viewerUser, mockTrace)).toBe(false);

      expect(TraceService.canReadTrace(viewerUser, mockTrace)).toBe(true);
      expect(TraceService.canAddFeedback(viewerUser, mockTrace)).toBe(true);
    });

    test('should validate trace data before processing', async () => {
      const invalidTraceRequest: CreateTraceRequest = {
        name: '', // Empty name
        projectId: '',
        workspaceId: 'workspace-123',
        tags: {
          // Too many tags
          ...Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`tag${i}`, `value${i}`])),
        },
      };

      await expect(
        TraceService.createTrace(invalidTraceRequest, mockUser)
      ).rejects.toThrow('Validation failed');
    });

    test('should sanitize sensitive data in traces', async () => {
      const sensitiveTraceRequest: CreateTraceRequest = {
        name: 'sensitive-trace',
        projectId: 'project-123',
        workspaceId: 'workspace-123',
        metadata: {
          environment: 'production',
          source: 'api',
          costTracking: { enabled: true },
          performance: { priority: 'medium' },
          business: {
            customFields: {
              api_key: 'sk-1234567890abcdef', // Should be sanitized
              user_email: 'user@example.com', // Should be sanitized
              safe_field: 'safe_value', // Should be kept
            },
          },
        },
      };

      mockPrisma.trace.create.mockImplementation((data) => {
        // Verify sensitive data was sanitized
        const metadata = JSON.parse(data.data.metadata);
        expect(metadata.business.customFields.api_key).toBe('[REDACTED]');
        expect(metadata.business.customFields.user_email).toBe('[REDACTED]');
        expect(metadata.business.customFields.safe_field).toBe('safe_value');

        return Promise.resolve({
          ...mockTrace,
          metadata: JSON.stringify(metadata),
        });
      });

      mockPrisma.workspace.findUnique.mockResolvedValue({
        id: 'workspace-123',
        name: 'Test Workspace',
      });

      mockClickHouse.insert.mockResolvedValue(undefined);

      await TraceService.createTrace(sensitiveTraceRequest, mockUser);

      expect(mockPrisma.trace.create).toHaveBeenCalled();
    });
  });
});