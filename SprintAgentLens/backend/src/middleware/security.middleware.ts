import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger, setUserContext } from './logging.middleware';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma';

export interface SecurityConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
    audience: string;
  };
  encryption: {
    algorithm: string;
    key: string;
    ivLength: number;
  };
  session: {
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  bruteForce: {
    maxAttempts: number;
    windowMs: number;
    blockDurationMs: number;
  };
  inputValidation: {
    maxLength: number;
    allowedFileTypes: string[];
    maxFileSize: number;
  };
  audit: {
    enabled: boolean;
    logFailedAuth: boolean;
    logSuspiciousActivity: boolean;
  };
}

interface LoginAttempt {
  ip: string;
  attempts: number;
  lastAttempt: number;
  blockedUntil?: number;
}

export class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private config: SecurityConfig;
  private prisma: PrismaClient;
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private suspiciousIPs: Set<string> = new Set();

  private constructor() {
    this.config = this.loadSecurityConfig();
    this.prisma = new PrismaClient();
    this.startCleanupTimer();
  }

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  private loadSecurityConfig(): SecurityConfig {
    const jwtSecret = process.env.JWT_SECRET;
    const encryptionKey = process.env.ENCRYPTION_KEY;

    if (!jwtSecret || jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    if (!encryptionKey || encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    return {
      jwt: {
        secret: jwtSecret,
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        issuer: process.env.JWT_ISSUER || 'sprintagentlens',
        audience: process.env.JWT_AUDIENCE || 'sprintagentlens-api'
      },
      encryption: {
        algorithm: 'aes-256-gcm',
        key: encryptionKey,
        ivLength: 16
      },
      session: {
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
      },
      bruteForce: {
        maxAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10),
        windowMs: parseInt(process.env.LOGIN_WINDOW_MS || '900000', 10), // 15 minutes
        blockDurationMs: parseInt(process.env.LOGIN_BLOCK_DURATION || '1800000', 10) // 30 minutes
      },
      inputValidation: {
        maxLength: parseInt(process.env.MAX_INPUT_LENGTH || '10000', 10),
        allowedFileTypes: (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,pdf,doc,docx,txt').split(','),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
      },
      audit: {
        enabled: process.env.AUDIT_ENABLED !== 'false',
        logFailedAuth: process.env.LOG_FAILED_AUTH !== 'false',
        logSuspiciousActivity: process.env.LOG_SUSPICIOUS_ACTIVITY !== 'false'
      }
    };
  }

  private startCleanupTimer(): void {
    // Clean up expired login attempts every 10 minutes
    setInterval(() => {
      this.cleanupExpiredAttempts();
    }, 10 * 60 * 1000);

    // Clean up suspicious IPs every hour
    setInterval(() => {
      this.cleanupSuspiciousIPs();
    }, 60 * 60 * 1000);
  }

  private cleanupExpiredAttempts(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, attempt] of this.loginAttempts.entries()) {
      if (now - attempt.lastAttempt > this.config.bruteForce.windowMs) {
        this.loginAttempts.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired login attempts`);
    }
  }

  private cleanupSuspiciousIPs(): void {
    // Clear suspicious IPs after 1 hour of no activity
    this.suspiciousIPs.clear();
    logger.debug('Cleared suspicious IP list');
  }

  // JWT Token Management
  public generateToken(payload: any): string {
    return jwt.sign(
      payload,
      this.config.jwt.secret,
      {
        expiresIn: this.config.jwt.expiresIn,
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        algorithm: 'HS256'
      }
    );
  }

  public verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.config.jwt.secret, {
        issuer: this.config.jwt.issuer,
        audience: this.config.jwt.audience,
        algorithms: ['HS256']
      });
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Authentication Middleware
  public authenticateToken(): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
          this.logSecurityEvent('MISSING_TOKEN', req, 'Authentication token not provided');
          return res.status(401).json({ error: 'Authentication token required' });
        }

        const decoded = this.verifyToken(token);
        
        // Check if user still exists and is active
        const user = await this.prisma.user.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            username: true,
            workspaceId: true,
            isActive: true,
            role: true
          }
        });

        if (!user || !user.isActive) {
          this.logSecurityEvent('INVALID_USER', req, 'User not found or inactive');
          return res.status(401).json({ error: 'Invalid authentication token' });
        }

        // Add user info to request
        (req as any).user = user;
        
        // Set user context for logging
        if (req.logContext) {
          setUserContext(req, user.id, user.workspaceId);
        }

        next();
      } catch (error) {
        this.logSecurityEvent('TOKEN_VERIFICATION_FAILED', req, error instanceof Error ? error.message : 'Token verification failed');
        res.status(401).json({ error: 'Invalid authentication token' });
      }
    };
  }

  // Authorization Middleware
  public requireRole(roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(user.role)) {
        this.logSecurityEvent('INSUFFICIENT_PERMISSIONS', req, `Required roles: ${roles.join(', ')}, user role: ${user.role}`);
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }

  // Workspace Isolation Middleware
  public enforceWorkspaceAccess(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user;
      const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Admin users can access any workspace
      if (user.role === 'ADMIN') {
        return next();
      }

      // Regular users can only access their own workspace
      if (workspaceId && workspaceId !== user.workspaceId) {
        this.logSecurityEvent('WORKSPACE_ACCESS_VIOLATION', req, `User ${user.id} attempted to access workspace ${workspaceId}`);
        return res.status(403).json({ error: 'Access denied to this workspace' });
      }

      next();
    };
  }

  // Brute Force Protection
  public bruteForceProtection(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
      const now = Date.now();
      
      const attempt = this.loginAttempts.get(clientIP);

      if (attempt) {
        // Check if IP is currently blocked
        if (attempt.blockedUntil && now < attempt.blockedUntil) {
          const remainingTime = Math.ceil((attempt.blockedUntil - now) / 1000);
          this.logSecurityEvent('BRUTE_FORCE_BLOCKED', req, `IP ${clientIP} blocked for ${remainingTime}s`);
          
          return res.status(429).json({
            error: 'Too many failed attempts',
            retryAfter: remainingTime,
            message: `Access blocked. Try again in ${remainingTime} seconds.`
          });
        }

        // Reset attempts if window has passed
        if (now - attempt.lastAttempt > this.config.bruteForce.windowMs) {
          this.loginAttempts.delete(clientIP);
        }
      }

      // Add failure tracking to request
      (req as any).recordLoginFailure = () => {
        this.recordLoginFailure(clientIP);
      };

      next();
    };
  }

  private recordLoginFailure(clientIP: string): void {
    const now = Date.now();
    const attempt = this.loginAttempts.get(clientIP) || {
      ip: clientIP,
      attempts: 0,
      lastAttempt: 0
    };

    attempt.attempts++;
    attempt.lastAttempt = now;

    // Block IP if max attempts exceeded
    if (attempt.attempts >= this.config.bruteForce.maxAttempts) {
      attempt.blockedUntil = now + this.config.bruteForce.blockDurationMs;
      this.suspiciousIPs.add(clientIP);
      
      this.logSecurityEvent('BRUTE_FORCE_DETECTION', { ip: clientIP } as any, `IP ${clientIP} blocked after ${attempt.attempts} failed attempts`);
    }

    this.loginAttempts.set(clientIP, attempt);
  }

  // Input Validation and Sanitization
  public validateInput(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request body size
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > this.config.inputValidation.maxLength) {
          this.logSecurityEvent('INPUT_TOO_LARGE', req, `Request body size: ${bodySize}`);
          return res.status(400).json({ error: 'Request body too large' });
        }

        // Sanitize and validate inputs
        this.sanitizeObject(req.body);
        this.sanitizeObject(req.query);
        this.sanitizeObject(req.params);

        // Check for SQL injection patterns
        if (this.detectSQLInjection(req)) {
          this.logSecurityEvent('SQL_INJECTION_ATTEMPT', req, 'Potential SQL injection detected');
          this.suspiciousIPs.add(req.ip || 'unknown');
          return res.status(400).json({ error: 'Invalid input detected' });
        }

        // Check for XSS patterns
        if (this.detectXSS(req)) {
          this.logSecurityEvent('XSS_ATTEMPT', req, 'Potential XSS attempt detected');
          this.suspiciousIPs.add(req.ip || 'unknown');
          return res.status(400).json({ error: 'Invalid input detected' });
        }

        next();
      } catch (error) {
        logger.error('Input validation error', { error });
        res.status(400).json({ error: 'Invalid input' });
      }
    };
  }

  private sanitizeObject(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove potential dangerous characters
        obj[key] = value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
      } else if (typeof value === 'object') {
        this.sanitizeObject(value);
      }
    }
  }

  private detectSQLInjection(req: Request): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(WAITFOR|DELAY|BENCHMARK)/i,
      /(OR|AND)\s+\d+\s*=\s*\d+/i,
      /1\s*=\s*1/i,
      /'\s*(OR|AND)\s*'/i,
      /--\s*$/i,
      /\/\*.*\*\//i
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return sqlPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(req.body) || checkValue(req.query) || checkValue(req.params);
  }

  private detectXSS(req: Request): boolean {
    const xssPatterns = [
      /<script[^>]*>[\s\S]*?<\/script>/gi,
      /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
      /<object[^>]*>[\s\S]*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<img[^>]+src[^>]*>/gi
    ];

    const checkValue = (value: any): boolean => {
      if (typeof value === 'string') {
        return xssPatterns.some(pattern => pattern.test(value));
      }
      if (typeof value === 'object' && value !== null) {
        return Object.values(value).some(checkValue);
      }
      return false;
    };

    return checkValue(req.body) || checkValue(req.query) || checkValue(req.params);
  }

  // Encryption/Decryption utilities
  public encrypt(text: string): string {
    const iv = crypto.randomBytes(this.config.encryption.ivLength);
    const cipher = crypto.createCipher(this.config.encryption.algorithm, this.config.encryption.key);
    cipher.setAutoPadding(true);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  public decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipher(this.config.encryption.algorithm, this.config.encryption.key);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Password utilities
  public async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  public async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Security event logging
  private logSecurityEvent(event: string, req: Request, details: string): void {
    if (!this.config.audit.enabled) return;

    const eventData = {
      event,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl,
      details,
      timestamp: new Date().toISOString(),
      requestId: req.logContext?.requestId
    };

    logger.logSecurityEvent(event, eventData);
    
    // Also log to audit log
    logger.audit({
      event: `SECURITY_${event}`,
      userId: (req as any).user?.id,
      workspaceId: (req as any).user?.workspaceId,
      metadata: eventData
    });
  }

  // File upload validation
  public validateFileUpload(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.file && !req.files) {
        return next();
      }

      const files = req.files ? (Array.isArray(req.files) ? req.files : [req.files]) : [req.file];

      for (const file of files) {
        if (!file) continue;

        // Check file size
        if (file.size > this.config.inputValidation.maxFileSize) {
          this.logSecurityEvent('FILE_TOO_LARGE', req, `File size: ${file.size} bytes`);
          return res.status(400).json({ error: 'File too large' });
        }

        // Check file type
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
        if (!fileExtension || !this.config.inputValidation.allowedFileTypes.includes(fileExtension)) {
          this.logSecurityEvent('INVALID_FILE_TYPE', req, `File type: ${fileExtension}`);
          return res.status(400).json({ error: 'Invalid file type' });
        }

        // Check for malicious file signatures (basic check)
        if (this.detectMaliciousFile(file)) {
          this.logSecurityEvent('MALICIOUS_FILE_DETECTED', req, `Suspicious file: ${file.originalname}`);
          this.suspiciousIPs.add(req.ip || 'unknown');
          return res.status(400).json({ error: 'File rejected for security reasons' });
        }
      }

      next();
    };
  }

  private detectMaliciousFile(file: any): boolean {
    // Basic file signature checking
    const buffer = file.buffer;
    if (!buffer) return false;

    const signatures = [
      // Executable signatures
      [0x4D, 0x5A], // PE executable (MZ)
      [0x7F, 0x45, 0x4C, 0x46], // ELF executable
      // Script signatures in images
      [0x3C, 0x73, 0x63, 0x72, 0x69, 0x70, 0x74] // <script
    ];

    return signatures.some(sig => {
      if (buffer.length < sig.length) return false;
      return sig.every((byte, index) => buffer[index] === byte);
    });
  }

  public getSecurityMetrics(): {
    blockedIPs: number;
    suspiciousIPs: number;
    failedLoginAttempts: number;
    recentSecurityEvents: number;
  } {
    return {
      blockedIPs: Array.from(this.loginAttempts.values()).filter(a => a.blockedUntil && Date.now() < a.blockedUntil).length,
      suspiciousIPs: this.suspiciousIPs.size,
      failedLoginAttempts: Array.from(this.loginAttempts.values()).reduce((sum, a) => sum + a.attempts, 0),
      recentSecurityEvents: 0 // Would need to track this separately
    };
  }
}