import { PrismaClient } from '../generated/prisma';
import { logger } from '../middleware/logging.middleware';

export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  timestamp: number;
  model?: string;
  action?: string;
}

export interface DatabaseOptimizationConfig {
  slowQueryThreshold: number;
  connectionPool: {
    min: number;
    max: number;
    acquireTimeout: number;
    createTimeout: number;
    destroyTimeout: number;
    idleTimeout: number;
    reapInterval: number;
    createRetryInterval: number;
  };
  queryOptimization: {
    enableQueryPlan: boolean;
    cacheQueryPlans: boolean;
    logSlowQueries: boolean;
    analyzeQueries: boolean;
  };
}

export class DatabaseOptimizationService {
  private static instance: DatabaseOptimizationService;
  private prisma: PrismaClient;
  private config: DatabaseOptimizationConfig;
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private slowQueries: Set<string> = new Set();

  private constructor() {
    this.config = this.loadConfig();
    this.prisma = this.createOptimizedPrismaClient();
    this.setupQueryMonitoring();
    this.startPeriodicOptimization();
  }

  public static getInstance(): DatabaseOptimizationService {
    if (!DatabaseOptimizationService.instance) {
      DatabaseOptimizationService.instance = new DatabaseOptimizationService();
    }
    return DatabaseOptimizationService.instance;
  }

  private loadConfig(): DatabaseOptimizationConfig {
    return {
      slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000', 10),
      connectionPool: {
        min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
        max: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
        acquireTimeout: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT || '30000', 10),
        createTimeout: parseInt(process.env.DATABASE_CREATE_TIMEOUT || '30000', 10),
        destroyTimeout: parseInt(process.env.DATABASE_DESTROY_TIMEOUT || '5000', 10),
        idleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '300000', 10),
        reapInterval: parseInt(process.env.DATABASE_REAP_INTERVAL || '1000', 10),
        createRetryInterval: parseInt(process.env.DATABASE_RETRY_INTERVAL || '200', 10)
      },
      queryOptimization: {
        enableQueryPlan: process.env.ENABLE_QUERY_PLAN !== 'false',
        cacheQueryPlans: process.env.CACHE_QUERY_PLANS !== 'false',
        logSlowQueries: process.env.LOG_SLOW_QUERIES !== 'false',
        analyzeQueries: process.env.ANALYZE_QUERIES !== 'false'
      }
    };
  }

  private createOptimizedPrismaClient(): PrismaClient {
    const datasourceUrl = process.env.DATABASE_URL;
    
    if (!datasourceUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Add connection pool parameters to URL
    const url = new URL(datasourceUrl);
    url.searchParams.set('connection_limit', this.config.connectionPool.max.toString());
    url.searchParams.set('pool_timeout', Math.floor(this.config.connectionPool.acquireTimeout / 1000).toString());
    url.searchParams.set('socket_timeout', '60s');
    url.searchParams.set('connect_timeout', '30s');

    return new PrismaClient({
      datasources: {
        db: {
          url: url.toString()
        }
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ]
    });
  }

  private setupQueryMonitoring(): void {
    // Monitor query performance
    this.prisma.$use(async (params, next) => {
      const startTime = Date.now();
      
      try {
        const result = await next(params);
        const executionTime = Date.now() - startTime;
        
        // Record metrics
        this.recordQueryMetrics({
          query: `${params.model}.${params.action}`,
          executionTime,
          timestamp: Date.now(),
          model: params.model || undefined,
          action: params.action
        });
        
        // Log slow queries
        if (executionTime > this.config.slowQueryThreshold) {
          this.handleSlowQuery(params, executionTime);
        }
        
        return result;
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        logger.error('Database query failed', {
          model: params.model,
          action: params.action,
          executionTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        throw error;
      }
    });

    // Listen to query events for detailed logging
    this.prisma.$on('query', (event) => {
      if (this.config.queryOptimization.logSlowQueries) {
        const duration = parseInt(event.duration);
        
        if (duration > this.config.slowQueryThreshold) {
          logger.warn('Slow query detected', {
            query: event.query,
            params: event.params,
            duration: event.duration,
            target: event.target
          });
        }
      }
    });

    this.prisma.$on('error', (event) => {
      logger.error('Database error', {
        message: event.message,
        target: event.target
      });
    });
  }

  private recordQueryMetrics(metrics: QueryPerformanceMetrics): void {
    this.queryMetrics.push(metrics);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }
  }

  private handleSlowQuery(params: any, executionTime: number): void {
    const queryKey = `${params.model}.${params.action}`;
    
    // Track slow queries
    this.slowQueries.add(queryKey);
    
    logger.warn('Slow query detected', {
      model: params.model,
      action: params.action,
      args: params.args,
      executionTime,
      threshold: this.config.slowQueryThreshold
    });
    
    // Suggest optimization for common slow queries
    this.suggestOptimization(params, executionTime);
  }

  private suggestOptimization(params: any, executionTime: number): void {
    const suggestions: string[] = [];
    
    // Analyze common performance issues
    if (params.action === 'findMany' && !params.args?.take && !params.args?.skip) {
      suggestions.push('Consider adding pagination (take/skip) to limit result set');
    }
    
    if (params.action === 'findMany' && params.args?.where && !params.args?.orderBy) {
      suggestions.push('Consider adding orderBy for consistent results and better performance');
    }
    
    if (params.action === 'findMany' && params.args?.include) {
      suggestions.push('Review included relations - consider if all are necessary');
    }
    
    if (params.action === 'count' && params.args?.where) {
      suggestions.push('Ensure indexes exist on WHERE clause columns');
    }
    
    if (executionTime > 5000) {
      suggestions.push('Query execution time is very high - consider query optimization or caching');
    }
    
    if (suggestions.length > 0) {
      logger.info('Query optimization suggestions', {
        model: params.model,
        action: params.action,
        executionTime,
        suggestions
      });
    }
  }

  private startPeriodicOptimization(): void {
    // Run optimization analysis every 10 minutes
    setInterval(() => {
      this.analyzePerformance();
    }, 10 * 60 * 1000);
    
    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupMetrics();
    }, 60 * 60 * 1000);
  }

  private analyzePerformance(): void {
    if (this.queryMetrics.length === 0) {
      return;
    }
    
    const now = Date.now();
    const last10Minutes = this.queryMetrics.filter(m => now - m.timestamp < 10 * 60 * 1000);
    
    if (last10Minutes.length === 0) {
      return;
    }
    
    // Calculate statistics
    const avgExecutionTime = last10Minutes.reduce((sum, m) => sum + m.executionTime, 0) / last10Minutes.length;
    const maxExecutionTime = Math.max(...last10Minutes.map(m => m.executionTime));
    const slowQueryCount = last10Minutes.filter(m => m.executionTime > this.config.slowQueryThreshold).length;
    
    // Group by query type
    const queryStats = new Map<string, { count: number; totalTime: number; maxTime: number }>();
    
    last10Minutes.forEach(metric => {
      const key = metric.query;
      const existing = queryStats.get(key) || { count: 0, totalTime: 0, maxTime: 0 };
      
      existing.count++;
      existing.totalTime += metric.executionTime;
      existing.maxTime = Math.max(existing.maxTime, metric.executionTime);
      
      queryStats.set(key, existing);
    });
    
    logger.info('Database performance analysis', {
      period: '10 minutes',
      totalQueries: last10Minutes.length,
      avgExecutionTime: Math.round(avgExecutionTime),
      maxExecutionTime,
      slowQueryCount,
      slowQueryPercentage: Math.round((slowQueryCount / last10Minutes.length) * 100),
      topQueries: Array.from(queryStats.entries())
        .sort((a, b) => b[1].totalTime - a[1].totalTime)
        .slice(0, 5)
        .map(([query, stats]) => ({
          query,
          count: stats.count,
          avgTime: Math.round(stats.totalTime / stats.count),
          maxTime: stats.maxTime
        }))
    });
  }

  private cleanupMetrics(): void {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour ago
    const before = this.queryMetrics.length;
    
    this.queryMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff);
    
    const cleaned = before - this.queryMetrics.length;
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} old query metrics`);
    }
  }

  public async getPerformanceMetrics(): Promise<{
    currentConnections: number;
    avgQueryTime: number;
    slowQueryCount: number;
    topSlowQueries: Array<{
      query: string;
      avgTime: number;
      count: number;
      maxTime: number;
    }>;
    recentErrors: number;
  }> {
    const now = Date.now();
    const last5Minutes = this.queryMetrics.filter(m => now - m.timestamp < 5 * 60 * 1000);
    
    const avgQueryTime = last5Minutes.length > 0 
      ? last5Minutes.reduce((sum, m) => sum + m.executionTime, 0) / last5Minutes.length 
      : 0;
    
    const slowQueryCount = last5Minutes.filter(m => m.executionTime > this.config.slowQueryThreshold).length;
    
    // Group slow queries
    const slowQueryStats = new Map<string, { count: number; totalTime: number; maxTime: number }>();
    
    last5Minutes
      .filter(m => m.executionTime > this.config.slowQueryThreshold)
      .forEach(metric => {
        const key = metric.query;
        const existing = slowQueryStats.get(key) || { count: 0, totalTime: 0, maxTime: 0 };
        
        existing.count++;
        existing.totalTime += metric.executionTime;
        existing.maxTime = Math.max(existing.maxTime, metric.executionTime);
        
        slowQueryStats.set(key, existing);
      });
    
    const topSlowQueries = Array.from(slowQueryStats.entries())
      .sort((a, b) => b[1].totalTime - a[1].totalTime)
      .slice(0, 10)
      .map(([query, stats]) => ({
        query,
        avgTime: Math.round(stats.totalTime / stats.count),
        count: stats.count,
        maxTime: stats.maxTime
      }));
    
    return {
      currentConnections: 1, // Prisma doesn't expose this easily
      avgQueryTime: Math.round(avgQueryTime),
      slowQueryCount,
      topSlowQueries,
      recentErrors: 0 // Would need to track this separately
    };
  }

  public async optimizeDatabase(): Promise<{
    tablesAnalyzed: number;
    indexesSuggested: string[];
    optimizationsApplied: string[];
  }> {
    logger.info('Starting database optimization analysis');
    
    const results = {
      tablesAnalyzed: 0,
      indexesSuggested: [] as string[],
      optimizationsApplied: [] as string[]
    };
    
    try {
      // Get table information
      const tables = await this.prisma.$queryRaw<Array<{ TABLE_NAME: string }>>`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME NOT LIKE '_prisma_%'
      `;
      
      results.tablesAnalyzed = tables.length;
      
      // Analyze each table
      for (const table of tables) {
        await this.analyzeTable(table.TABLE_NAME, results);
      }
      
      logger.info('Database optimization analysis completed', results);
      
    } catch (error) {
      logger.error('Database optimization failed', { error });
      throw error;
    }
    
    return results;
  }

  private async analyzeTable(tableName: string, results: any): Promise<void> {
    try {
      // Get table stats
      const stats = await this.prisma.$queryRaw<Array<{ 
        TABLE_ROWS: number; 
        DATA_LENGTH: number; 
        INDEX_LENGTH: number; 
      }>>`
        SELECT TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
      `;
      
      if (stats.length === 0) return;
      
      const tableStats = stats[0];
      
      // Check if table needs indexing based on size and slow queries
      if (tableStats.TABLE_ROWS > 10000) {
        const slowQueriesForTable = Array.from(this.slowQueries).filter(q => q.includes(tableName));
        
        if (slowQueriesForTable.length > 0) {
          results.indexesSuggested.push(`Consider adding indexes to ${tableName} (${tableStats.TABLE_ROWS} rows, ${slowQueriesForTable.length} slow queries)`);
        }
      }
      
      // Check index efficiency
      if (tableStats.INDEX_LENGTH > tableStats.DATA_LENGTH * 0.3) {
        results.indexesSuggested.push(`Review indexes on ${tableName} - index size (${tableStats.INDEX_LENGTH}) is large compared to data size (${tableStats.DATA_LENGTH})`);
      }
      
    } catch (error) {
      logger.warn(`Failed to analyze table ${tableName}`, { error });
    }
  }

  public getPrismaClient(): PrismaClient {
    return this.prisma;
  }

  public async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}