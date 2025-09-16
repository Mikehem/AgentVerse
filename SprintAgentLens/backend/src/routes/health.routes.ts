import { Router, Request, Response } from 'express';
import { MonitoringService } from '../services/MonitoringService';
import { PrismaClient } from '../generated/prisma';
import Redis from 'ioredis';
import { logger } from '../middleware/logging.middleware';

const router = Router();
const monitoringService = MonitoringService.getInstance();

// Basic health check - always returns quickly
router.get('/ping', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Readiness check - indicates if the service is ready to accept traffic
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const prisma = new PrismaClient();
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    const checks = await Promise.allSettled([
      // Database connectivity
      prisma.$queryRaw`SELECT 1 as test`,
      // Redis connectivity
      redis.ping(),
      // Basic memory check
      Promise.resolve(process.memoryUsage())
    ]);

    await prisma.$disconnect();
    redis.disconnect();

    const dbCheck = checks[0].status === 'fulfilled';
    const redisCheck = checks[1].status === 'fulfilled';
    const memCheck = checks[2].status === 'fulfilled';

    const ready = dbCheck && redisCheck && memCheck;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      checks: {
        database: dbCheck ? 'ok' : 'failed',
        redis: redisCheck ? 'ok' : 'failed',
        memory: memCheck ? 'ok' : 'failed'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness check - indicates if the service is alive
router.get('/live', (req: Request, res: Response) => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  // Simple checks to ensure the process is healthy
  const memoryOk = memUsage.heapUsed < 1024 * 1024 * 1024; // Less than 1GB
  const uptimeOk = uptime > 0;
  
  const alive = memoryOk && uptimeOk;

  res.status(alive ? 200 : 503).json({
    status: alive ? 'alive' : 'unhealthy',
    memory: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      rss: memUsage.rss
    },
    uptime: uptime,
    timestamp: new Date().toISOString()
  });
});

// Comprehensive health check
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await monitoringService.performHealthCheck();
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

// Deep health check with detailed diagnostics
router.get('/detailed', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const prisma = new PrismaClient();
    const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    const results = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime: 0,
      checks: {} as any,
      system: {} as any,
      dependencies: {} as any
    };

    // System checks
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const os = await import('os');

    results.system = {
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        percentage: (memUsage.heapUsed / os.totalmem()) * 100
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: os.loadavg()
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch()
    };

    // Database detailed check
    try {
      const dbStart = Date.now();
      
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1 as connectivity_test`;
      
      // Test a simple query on actual table
      const userCount = await prisma.user.count();
      
      // Test transaction capability
      await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT 1 as transaction_test`;
      });

      const dbTime = Date.now() - dbStart;
      
      results.checks.database = {
        status: dbTime < 1000 ? 'pass' : dbTime < 3000 ? 'warn' : 'fail',
        responseTime: dbTime,
        userCount,
        features: {
          connectivity: 'pass',
          queries: 'pass',
          transactions: 'pass'
        }
      };
    } catch (error) {
      results.checks.database = {
        status: 'fail',
        error: error instanceof Error ? error.message : 'Database check failed'
      };
      results.status = 'unhealthy';
    }

    // Redis detailed check
    try {
      const redisStart = Date.now();
      
      // Test basic connectivity
      await redis.ping();
      
      // Test write/read operations
      const testKey = `health_check_${Date.now()}`;
      await redis.set(testKey, 'test', 'EX', 10);
      const testValue = await redis.get(testKey);
      await redis.del(testKey);
      
      // Get Redis info
      const info = await redis.info('server');
      const keyCount = await redis.dbsize();
      
      const redisTime = Date.now() - redisStart;
      
      results.checks.redis = {
        status: redisTime < 100 ? 'pass' : redisTime < 500 ? 'warn' : 'fail',
        responseTime: redisTime,
        keyCount,
        features: {
          connectivity: 'pass',
          readWrite: testValue === 'test' ? 'pass' : 'fail',
          commands: 'pass'
        },
        version: info.match(/redis_version:([^\r\n]+)/)?.[1] || 'unknown'
      };
    } catch (error) {
      results.checks.redis = {
        status: 'fail',
        error: error instanceof Error ? error.message : 'Redis check failed'
      };
      if (results.status === 'healthy') {
        results.status = 'degraded';
      }
    }

    // File system check
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const testFile = path.join(process.cwd(), 'temp', `health_check_${Date.now()}.tmp`);
      const testData = 'health check test';
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(testFile), { recursive: true });
      
      // Test write
      await fs.writeFile(testFile, testData);
      
      // Test read
      const readData = await fs.readFile(testFile, 'utf8');
      
      // Test delete
      await fs.unlink(testFile);
      
      results.checks.filesystem = {
        status: readData === testData ? 'pass' : 'fail',
        features: {
          read: 'pass',
          write: 'pass',
          delete: 'pass'
        }
      };
    } catch (error) {
      results.checks.filesystem = {
        status: 'fail',
        error: error instanceof Error ? error.message : 'Filesystem check failed'
      };
      if (results.status === 'healthy') {
        results.status = 'degraded';
      }
    }

    // Environment variables check
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    results.checks.environment = {
      status: missingVars.length === 0 ? 'pass' : 'fail',
      requiredVariables: requiredEnvVars,
      missingVariables: missingVars,
      nodeEnv: process.env.NODE_ENV
    };

    if (missingVars.length > 0) {
      results.status = 'unhealthy';
    }

    // External dependencies check
    results.dependencies = {
      database: results.checks.database?.status || 'unknown',
      redis: results.checks.redis?.status || 'unknown',
      filesystem: results.checks.filesystem?.status || 'unknown'
    };

    // Clean up connections
    await prisma.$disconnect();
    redis.disconnect();

    results.responseTime = Date.now() - startTime;

    // Determine overall status
    const hasFailures = Object.values(results.checks).some((check: any) => check.status === 'fail');
    const hasWarnings = Object.values(results.checks).some((check: any) => check.status === 'warn');

    if (hasFailures) {
      results.status = 'unhealthy';
    } else if (hasWarnings) {
      results.status = 'degraded';
    }

    const statusCode = results.status === 'healthy' ? 200 : 
                      results.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(results);

  } catch (error) {
    logger.error('Detailed health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
  }
});

// Metrics endpoint for monitoring systems
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getMetricsForPrometheus();
    res.set('Content-Type', 'text/plain').send(metrics);
  } catch (error) {
    logger.error('Metrics endpoint failed', { error });
    res.status(500).send('Internal Server Error');
  }
});

// System metrics endpoint
router.get('/system', async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getSystemMetrics();
    res.json(metrics);
  } catch (error) {
    logger.error('System metrics failed', { error });
    res.status(500).json({ error: 'Failed to get system metrics' });
  }
});

export default router;