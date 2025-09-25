import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '@/utils/logger';

/**
 * Health check controller for monitoring and diagnostics
 */
export default async function healthRoutes(server: FastifyInstance) {
  // Basic ping endpoint - always responds quickly
  server.get('/ping', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // Basic health check endpoint
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Simple health indicators
    const memoryOk = memUsage.heapUsed < 1024 * 1024 * 1024; // Less than 1GB
    const uptimeOk = uptime > 0;
    
    const healthy = memoryOk && uptimeOk;
    const status = healthy ? 'healthy' : 'unhealthy';

    reply.status(healthy ? 200 : 503).send({
      status,
      timestamp: new Date().toISOString(),
      uptime,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss
      },
      service: 'SprintAgentLens Backend',
      version: '1.0.0'
    });
  });

  // Readiness check - indicates if service is ready to accept traffic  
  server.get('/ready', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Basic readiness checks that work even during startup issues
      const memUsage = process.memoryUsage();
      const memoryOk = memUsage.heapUsed < 1024 * 1024 * 1024; // Less than 1GB
      const uptimeOk = process.uptime() > 0;
      
      // Always report ready for basic process health
      const ready = memoryOk && uptimeOk;

      reply.status(ready ? 200 : 503).send({
        status: ready ? 'ready' : 'not_ready',
        checks: {
          memory: memoryOk ? 'ok' : 'fail',
          process: uptimeOk ? 'ok' : 'fail',
          uptime: process.uptime()
        },
        timestamp: new Date().toISOString(),
        message: 'Basic health check - database connectivity not required'
      });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      reply.status(503).send({
        status: 'not_ready',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Liveness check - indicates if service is alive
  server.get('/live', async (request: FastifyRequest, reply: FastifyReply) => {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    // Simple checks to ensure process is healthy
    const memoryOk = memUsage.heapUsed < 1024 * 1024 * 1024; // Less than 1GB
    const uptimeOk = uptime > 0;
    
    const alive = memoryOk && uptimeOk;

    reply.status(alive ? 200 : 503).send({
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

  logger.debug('✅ Health routes registered');
}