import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  requestId: string;
  userId?: string;
  workspaceId?: string;
  method: string;
  url: string;
  userAgent?: string;
  ip: string;
  startTime: number;
}

export interface AuditLogData {
  event: string;
  userId?: string;
  workspaceId?: string;
  entityType?: string;
  entityId?: string;
  changes?: any;
  metadata?: any;
}

export class Logger {
  private static instance: Logger;
  private winston: winston.Logger;
  private auditLogger: winston.Logger;

  private constructor() {
    this.winston = this.createLogger();
    this.auditLogger = this.createAuditLogger();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogger(): winston.Logger {
    const isProduction = process.env.NODE_ENV === 'production';
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFormat = process.env.LOG_FORMAT || 'json';

    const formats = [];
    
    // Add timestamp
    formats.push(winston.format.timestamp());
    
    // Add error stack trace
    formats.push(winston.format.errors({ stack: true }));
    
    // Add format based on environment
    if (logFormat === 'json') {
      formats.push(winston.format.json());
    } else {
      formats.push(winston.format.simple());
    }

    const transports: winston.transport[] = [];
    
    if (isProduction) {
      // Production: write to files
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 10
        })
      );
    } else {
      // Development: console output
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })
      );
    }

    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      exceptionHandlers: [
        new winston.transports.File({ filename: 'logs/exceptions.log' })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: 'logs/rejections.log' })
      ]
    });
  }

  private createAuditLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: 'logs/audit.log',
          maxsize: 10485760, // 10MB
          maxFiles: 20
        })
      ]
    });
  }

  public info(message: string, meta?: any): void {
    this.winston.info(message, meta);
  }

  public error(message: string, error?: Error | any): void {
    this.winston.error(message, error);
  }

  public warn(message: string, meta?: any): void {
    this.winston.warn(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.winston.debug(message, meta);
  }

  public audit(data: AuditLogData): void {
    if (process.env.AUDIT_ENABLED !== 'false') {
      this.auditLogger.info('AUDIT', {
        ...data,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
      });
    }
  }

  public logRequest(context: LogContext, response: Response): void {
    const duration = Date.now() - context.startTime;
    const logData = {
      requestId: context.requestId,
      method: context.method,
      url: context.url,
      statusCode: response.statusCode,
      duration,
      contentLength: response.get('content-length'),
      userId: context.userId,
      workspaceId: context.workspaceId,
      userAgent: context.userAgent,
      ip: context.ip
    };

    if (response.statusCode >= 400) {
      this.error('HTTP Request Failed', logData);
    } else if (duration > 5000) {
      this.warn('Slow HTTP Request', logData);
    } else {
      this.info('HTTP Request', logData);
    }
  }

  public logSecurityEvent(event: string, data: any): void {
    this.winston.warn('SECURITY_EVENT', {
      event,
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  public logPerformance(operation: string, duration: number, metadata?: any): void {
    const logData = {
      operation,
      duration,
      ...metadata,
      timestamp: new Date().toISOString()
    };

    if (duration > 10000) {
      this.error('Performance Issue - Very Slow Operation', logData);
    } else if (duration > 5000) {
      this.warn('Performance Issue - Slow Operation', logData);
    } else {
      this.info('Performance Log', logData);
    }
  }
}

// Extend Express Request to include log context
declare global {
  namespace Express {
    interface Request {
      logContext?: LogContext;
    }
  }
}

export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const logger = Logger.getInstance();
  
  // Create request context
  req.logContext = {
    requestId: uuidv4(),
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('user-agent'),
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    startTime: Date.now()
  };

  // Set request ID header
  res.set('X-Request-ID', req.logContext.requestId);

  // Log request completion
  res.on('finish', () => {
    if (req.logContext) {
      logger.logRequest(req.logContext, res);
    }
  });

  // Log unhandled errors
  res.on('error', (error) => {
    logger.error('Response Error', {
      requestId: req.logContext?.requestId,
      error: error.message,
      stack: error.stack
    });
  });

  next();
}

export function errorLoggingMiddleware(error: Error, req: Request, res: Response, next: NextFunction): void {
  const logger = Logger.getInstance();
  
  logger.error('Unhandled Request Error', {
    requestId: req.logContext?.requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    error: error.message,
    stack: error.stack,
    userId: req.logContext?.userId,
    workspaceId: req.logContext?.workspaceId
  });

  next(error);
}

export function setUserContext(req: Request, userId: string, workspaceId?: string): void {
  if (req.logContext) {
    req.logContext.userId = userId;
    req.logContext.workspaceId = workspaceId;
  }
}

export const logger = Logger.getInstance();