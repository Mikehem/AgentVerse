import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { MonitoringService } from '../services/MonitoringService';
import { logger } from './logging.middleware';

export interface PerformanceConfig {
  compression: {
    enabled: boolean;
    threshold: number;
    level: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    standardLimiter: any;
    strictLimiter: any;
  };
  slowDown: {
    windowMs: number;
    delayAfter: number;
    delayMs: number;
  };
  timeout: {
    server: number;
    database: number;
  };
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

export class PerformanceMiddleware {
  private static instance: PerformanceMiddleware;
  private config: PerformanceConfig;
  private monitoringService: MonitoringService;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;

  private constructor() {
    this.monitoringService = MonitoringService.getInstance();
    this.cache = new Map();
    this.config = this.loadConfig();
    this.startCacheCleanup();
  }

  public static getInstance(): PerformanceMiddleware {
    if (!PerformanceMiddleware.instance) {
      PerformanceMiddleware.instance = new PerformanceMiddleware();
    }
    return PerformanceMiddleware.instance;
  }

  private loadConfig(): PerformanceConfig {
    return {
      compression: {
        enabled: process.env.COMPRESSION_ENABLED !== 'false',
        threshold: parseInt(process.env.COMPRESSION_THRESHOLD || '1024', 10),
        level: parseInt(process.env.COMPRESSION_LEVEL || '6', 10)
      },
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        standardLimiter: null,
        strictLimiter: null
      },
      slowDown: {
        windowMs: parseInt(process.env.SLOW_DOWN_WINDOW_MS || '900000', 10), // 15 minutes
        delayAfter: parseInt(process.env.SLOW_DOWN_DELAY_AFTER || '50', 10),
        delayMs: parseInt(process.env.SLOW_DOWN_DELAY_MS || '100', 10)
      },
      timeout: {
        server: parseInt(process.env.REQUEST_TIMEOUT || '30000', 10),
        database: parseInt(process.env.DATABASE_TIMEOUT || '30000', 10)
      },
      cache: {
        enabled: process.env.ENABLE_QUERY_CACHE !== 'false',
        ttl: parseInt(process.env.CACHE_TTL || '300000', 10) // 5 minutes
      }
    };
  }

  private startCacheCleanup(): void {
    // Clean expired cache entries every 5 minutes
    setInterval(() => {
      this.cleanupCache();
    }, 5 * 60 * 1000);
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  public setupCompression(): any {
    if (!this.config.compression.enabled) {
      return (req: Request, res: Response, next: NextFunction) => next();
    }

    return compression({
      threshold: this.config.compression.threshold,
      level: this.config.compression.level,
      filter: (req: Request, res: Response) => {
        // Don't compress if client doesn't support it
        if (req.headers['x-no-compression']) {
          return false;
        }
        
        // Use compression filter
        return compression.filter(req, res);
      }
    });
  }

  public setupRateLimiting() {
    // Standard rate limiting for most endpoints
    this.config.rateLimit.standardLimiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: {
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent')
        });
        
        res.status(429).json({
          error: 'Too many requests from this IP',
          retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
        });
      },
      skip: (req: Request) => {
        // Skip rate limiting for health checks
        return req.path.startsWith('/health');
      }
    });

    // Strict rate limiting for sensitive endpoints
    this.config.rateLimit.strictLimiter = rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: Math.floor(this.config.rateLimit.max / 5), // 5x stricter
      message: {
        error: 'Too many authentication attempts',
        retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        logger.warn('Strict rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent')
        });
        
        // Log potential security issue
        logger.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent'),
          type: 'strict'
        });
        
        res.status(429).json({
          error: 'Too many authentication attempts',
          retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
        });
      }
    });

    return {
      standard: this.config.rateLimit.standardLimiter,
      strict: this.config.rateLimit.strictLimiter
    };
  }

  public setupSlowDown(): any {
    return slowDown({
      windowMs: this.config.slowDown.windowMs,
      delayAfter: this.config.slowDown.delayAfter,
      delayMs: this.config.slowDown.delayMs,
      maxDelayMs: this.config.slowDown.delayMs * 10,
      skipSuccessfulRequests: true,
      skipFailedRequests: false,
      onLimitReached: (req: Request) => {
        logger.warn('Slow down limit reached', {
          ip: req.ip,
          path: req.path,
          userAgent: req.get('User-Agent')
        });
      }
    });
  }

  public setupRequestTimeout(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Set timeout for the request
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          logger.error('Request timeout', {
            requestId: req.logContext?.requestId,
            path: req.path,
            method: req.method,
            timeout: this.config.timeout.server
          });
          
          res.status(408).json({
            error: 'Request timeout',
            message: 'The server took too long to respond'
          });
        }
      }, this.config.timeout.server);

      // Clear timeout when response is sent
      res.on('finish', () => {
        clearTimeout(timeout);
      });

      // Clear timeout on error
      res.on('error', () => {
        clearTimeout(timeout);
      });

      next();
    };
  }

  public setupResponseTime(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        
        // Add response time header
        res.set('X-Response-Time', `${duration}ms`);
        
        // Record metrics
        this.monitoringService.recordRequest(
          req.method,
          req.route?.path || req.path,
          res.statusCode,
          duration
        );
        
        // Log slow requests
        if (duration > 5000) {
          logger.warn('Slow request detected', {
            requestId: req.logContext?.requestId,
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode
          });
        }
      });

      next();
    };
  }

  public cacheMiddleware(ttl?: number): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.cache.enabled || req.method !== 'GET') {
        return next();
      }

      const cacheKey = this.generateCacheKey(req);
      const cached = this.getFromCache(cacheKey);

      if (cached) {
        logger.debug('Cache hit', { cacheKey, path: req.path });
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(body: any) {
        if (res.statusCode === 200) {
          const cacheTtl = ttl || this.config.cache.ttl;
          this.setCache(cacheKey, body, cacheTtl);
          res.set('X-Cache', 'MISS');
          logger.debug('Response cached', { cacheKey, path: req.path, ttl: cacheTtl });
        }
        return originalJson.call(this, body);
      }.bind(this);

      next();
    };
  }

  private generateCacheKey(req: Request): string {
    const userId = req.logContext?.userId || 'anonymous';
    const workspaceId = req.logContext?.workspaceId || 'default';
    const query = JSON.stringify(req.query);
    return `${req.method}:${req.path}:${userId}:${workspaceId}:${query}`;
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    // Limit cache size
    if (this.cache.size >= 1000) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Remove oldest 10%
      const toRemove = Math.floor(entries.length * 0.1);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  public clearCache(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      return size;
    }

    let cleared = 0;
    const regex = new RegExp(pattern);
    
    for (const [key] of this.cache.entries()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  public getCacheStats(): { size: number; hitRate: number; memoryUsage: number } {
    const size = this.cache.size;
    let totalMemory = 0;

    for (const [key, entry] of this.cache.entries()) {
      totalMemory += key.length * 2; // Approximate string size
      totalMemory += JSON.stringify(entry.data).length * 2;
      totalMemory += 24; // Approximate object overhead
    }

    return {
      size,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      memoryUsage: totalMemory
    };
  }

  public setupSecurityHeaders(): any {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Adjust based on your needs
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }
}