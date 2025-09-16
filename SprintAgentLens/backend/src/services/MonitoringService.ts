import { Request, Response } from 'express';
import { PrismaClient } from '../generated/prisma';
import Redis from 'ioredis';
import { logger } from '../middleware/logging.middleware';

export interface SystemMetrics {
  timestamp: number;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    free: number;
    total: number;
    percentage: number;
  };
  database: {
    activeConnections: number;
    queryCount: number;
    avgQueryTime: number;
    errors: number;
  };
  redis: {
    connected: boolean;
    memoryUsage: number;
    keyCount: number;
    errors: number;
  };
  http: {
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
    activeRequests: number;
  };
  uptime: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      responseTime?: number;
    };
  };
  timestamp: number;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private prisma: PrismaClient;
  private redis: Redis;
  private metrics: {
    requests: Map<string, number>;
    errors: Map<string, number>;
    responseTimes: number[];
    queries: {
      count: number;
      totalTime: number;
      errors: number;
    };
  };
  private startTime: number;

  private constructor() {
    this.prisma = new PrismaClient();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.startTime = Date.now();
    this.metrics = {
      requests: new Map(),
      errors: new Map(),
      responseTimes: [],
      queries: {
        count: 0,
        totalTime: 0,
        errors: 0
      }
    };

    this.setupPrismaMonitoring();
    this.setupRedisMonitoring();
    this.startMetricsCollection();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private setupPrismaMonitoring(): void {
    // Monitor database queries
    this.prisma.$use(async (params, next) => {
      const start = Date.now();
      try {
        const result = await next(params);
        const duration = Date.now() - start;
        
        this.metrics.queries.count++;
        this.metrics.queries.totalTime += duration;
        
        if (duration > 1000) {
          logger.warn('Slow Database Query', {
            model: params.model,
            action: params.action,
            duration
          });
        }
        
        return result;
      } catch (error) {
        this.metrics.queries.errors++;
        logger.error('Database Query Error', {
          model: params.model,
          action: params.action,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    });
  }

  private setupRedisMonitoring(): void {
    this.redis.on('error', (error) => {
      logger.error('Redis Error', { error: error.message });
    });

    this.redis.on('connect', () => {
      logger.info('Redis Connected');
    });

    this.redis.on('disconnect', () => {
      logger.warn('Redis Disconnected');
    });
  }

  private startMetricsCollection(): void {
    // Clear old metrics every 5 minutes
    setInterval(() => {
      this.clearOldMetrics();
    }, 5 * 60 * 1000);

    // Log system metrics every minute
    setInterval(async () => {
      const metrics = await this.getSystemMetrics();
      logger.info('System Metrics', metrics);
    }, 60 * 1000);
  }

  private clearOldMetrics(): void {
    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-1000);
    }
  }

  public recordRequest(method: string, path: string, statusCode: number, responseTime: number): void {
    const key = `${method}:${path}`;
    this.metrics.requests.set(key, (this.metrics.requests.get(key) || 0) + 1);
    this.metrics.responseTimes.push(responseTime);

    if (statusCode >= 400) {
      this.metrics.errors.set(key, (this.metrics.errors.get(key) || 0) + 1);
    }
  }

  public async getSystemMetrics(): Promise<SystemMetrics> {
    const process = await import('process');
    const os = await import('os');

    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Calculate averages
    const avgResponseTime = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length
      : 0;

    const avgQueryTime = this.metrics.queries.count > 0
      ? this.metrics.queries.totalTime / this.metrics.queries.count
      : 0;

    const totalRequests = Array.from(this.metrics.requests.values()).reduce((a, b) => a + b, 0);
    const totalErrors = Array.from(this.metrics.errors.values()).reduce((a, b) => a + b, 0);

    let redisInfo = {
      connected: false,
      memoryUsage: 0,
      keyCount: 0,
      errors: 0
    };

    try {
      if (this.redis.status === 'ready') {
        redisInfo.connected = true;
        const info = await this.redis.info('memory');
        const keyCount = await this.redis.dbsize();
        redisInfo.keyCount = keyCount;
        
        // Parse memory usage from Redis INFO
        const memMatch = info.match(/used_memory:(\d+)/);
        if (memMatch) {
          redisInfo.memoryUsage = parseInt(memMatch[1], 10);
        }
      }
    } catch (error) {
      logger.error('Failed to get Redis info', { error });
      redisInfo.errors++;
    }

    return {
      timestamp: Date.now(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to milliseconds
        loadAverage: os.loadavg()
      },
      memory: {
        used: memUsage.heapUsed,
        free: os.freemem(),
        total: os.totalmem(),
        percentage: (memUsage.heapUsed / os.totalmem()) * 100
      },
      database: {
        activeConnections: 1, // Prisma doesn't expose this easily
        queryCount: this.metrics.queries.count,
        avgQueryTime,
        errors: this.metrics.queries.errors
      },
      redis: redisInfo,
      http: {
        requestCount: totalRequests,
        errorCount: totalErrors,
        avgResponseTime,
        activeRequests: 0 // This would need more complex tracking
      },
      uptime: Date.now() - this.startTime
    };
  }

  public async performHealthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Database health check
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      checks.database = {
        status: responseTime < 1000 ? 'pass' : 'warn',
        message: `Database responded in ${responseTime}ms`,
        responseTime
      };

      if (responseTime > 1000) {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.database = {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Database check failed'
      };
      overallStatus = 'unhealthy';
    }

    // Redis health check
    try {
      const start = Date.now();
      await this.redis.ping();
      const responseTime = Date.now() - start;
      
      checks.redis = {
        status: responseTime < 100 ? 'pass' : 'warn',
        message: `Redis responded in ${responseTime}ms`,
        responseTime
      };

      if (responseTime > 100 && overallStatus === 'healthy') {
        overallStatus = 'degraded';
      }
    } catch (error) {
      checks.redis = {
        status: 'fail',
        message: error instanceof Error ? error.message : 'Redis check failed'
      };
      overallStatus = 'unhealthy';
    }

    // Memory health check
    const os = await import('os');
    const memUsage = process.memoryUsage();
    const memoryPercentage = (memUsage.heapUsed / os.totalmem()) * 100;
    
    checks.memory = {
      status: memoryPercentage < 80 ? 'pass' : memoryPercentage < 90 ? 'warn' : 'fail',
      message: `Memory usage: ${memoryPercentage.toFixed(1)}%`
    };

    if (memoryPercentage > 80 && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }
    if (memoryPercentage > 90) {
      overallStatus = 'unhealthy';
    }

    // Disk space check (simplified)
    checks.disk = {
      status: 'pass',
      message: 'Disk space check not implemented'
    };

    return {
      status: overallStatus,
      checks,
      timestamp: Date.now()
    };
  }

  public async getMetricsForPrometheus(): Promise<string> {
    const metrics = await this.getSystemMetrics();
    const lines: string[] = [];

    // HTTP metrics
    lines.push(`# HELP http_requests_total Total number of HTTP requests`);
    lines.push(`# TYPE http_requests_total counter`);
    lines.push(`http_requests_total ${metrics.http.requestCount}`);

    lines.push(`# HELP http_request_duration_milliseconds HTTP request duration in milliseconds`);
    lines.push(`# TYPE http_request_duration_milliseconds histogram`);
    lines.push(`http_request_duration_milliseconds ${metrics.http.avgResponseTime}`);

    // Database metrics
    lines.push(`# HELP database_queries_total Total number of database queries`);
    lines.push(`# TYPE database_queries_total counter`);
    lines.push(`database_queries_total ${metrics.database.queryCount}`);

    lines.push(`# HELP database_query_duration_milliseconds Average database query duration`);
    lines.push(`# TYPE database_query_duration_milliseconds gauge`);
    lines.push(`database_query_duration_milliseconds ${metrics.database.avgQueryTime}`);

    // System metrics
    lines.push(`# HELP memory_usage_bytes Memory usage in bytes`);
    lines.push(`# TYPE memory_usage_bytes gauge`);
    lines.push(`memory_usage_bytes ${metrics.memory.used}`);

    lines.push(`# HELP process_uptime_seconds Process uptime in seconds`);
    lines.push(`# TYPE process_uptime_seconds gauge`);
    lines.push(`process_uptime_seconds ${metrics.uptime / 1000}`);

    return lines.join('\n');
  }

  public setupMetricsEndpoint(app: any): void {
    // Health check endpoint
    app.get('/health', async (req: Request, res: Response) => {
      try {
        const health = await this.performHealthCheck();
        const statusCode = health.status === 'healthy' ? 200 : 
                          health.status === 'degraded' ? 200 : 503;
        res.status(statusCode).json(health);
      } catch (error) {
        logger.error('Health check failed', { error });
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp: Date.now()
        });
      }
    });

    // Metrics endpoint for Prometheus
    app.get('/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await this.getMetricsForPrometheus();
        res.set('Content-Type', 'text/plain').send(metrics);
      } catch (error) {
        logger.error('Metrics endpoint failed', { error });
        res.status(500).send('Internal Server Error');
      }
    });

    // System metrics endpoint
    app.get('/system/metrics', async (req: Request, res: Response) => {
      try {
        const metrics = await this.getSystemMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('System metrics failed', { error });
        res.status(500).json({ error: 'Failed to get system metrics' });
      }
    });
  }
}