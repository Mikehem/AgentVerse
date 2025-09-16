import { ConfigService } from './config.service';

export interface ProductionConfig {
  server: {
    port: number;
    host: string;
    timeout: number;
    compression: boolean;
    cluster: {
      enabled: boolean;
      workers: number;
    };
  };
  database: {
    url: string;
    pool: {
      min: number;
      max: number;
      timeout: number;
    };
    ssl: boolean;
    logging: boolean;
  };
  redis: {
    url: string;
    options: {
      retryDelayOnFailover: number;
      enableReadyCheck: boolean;
      maxRetriesPerRequest: number;
    };
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
    encryption: {
      key: string;
      algorithm: string;
    };
    rateLimit: {
      windowMs: number;
      max: number;
    };
    cors: {
      origin: string | string[];
      credentials: boolean;
    };
    headers: {
      helmet: boolean;
      csp: boolean;
      hsts: boolean;
      frameOptions: string;
    };
  };
  logging: {
    level: string;
    format: string;
    enableAudit: boolean;
    retentionDays: number;
  };
  monitoring: {
    enabled: boolean;
    port: number;
    healthCheck: {
      timeout: number;
      database: boolean;
      redis: boolean;
    };
  };
  cache: {
    ttl: number;
    maxSize: number;
    queryCache: boolean;
  };
  upload: {
    maxSize: number;
    directory: string;
    tempDirectory: string;
  };
  aws: {
    region: string;
    s3: {
      bucket: string;
    };
  };
  email: {
    smtp: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
    from: string;
  };
  queue: {
    redis: string;
    concurrency: number;
    maxAttempts: number;
    backoffType: string;
  };
  features: {
    analytics: boolean;
    telemetry: boolean;
    experimental: boolean;
  };
}

export class ProductionConfigService extends ConfigService {
  private static instance: ProductionConfigService;

  private constructor() {
    super();
  }

  public static getInstance(): ProductionConfigService {
    if (!ProductionConfigService.instance) {
      ProductionConfigService.instance = new ProductionConfigService();
    }
    return ProductionConfigService.instance;
  }

  public getProductionConfig(): ProductionConfig {
    return {
      server: {
        port: this.getNumber('PORT', 3000),
        host: this.getString('HOST', '0.0.0.0'),
        timeout: this.getNumber('REQUEST_TIMEOUT', 30000),
        compression: this.getBoolean('COMPRESSION_ENABLED', true),
        cluster: {
          enabled: this.getBoolean('CLUSTER_ENABLED', false),
          workers: this.getNumber('CLUSTER_WORKERS', 0)
        }
      },
      database: {
        url: this.getRequiredString('DATABASE_URL'),
        pool: {
          min: this.getNumber('DATABASE_POOL_MIN', 2),
          max: this.getNumber('DATABASE_POOL_MAX', 20),
          timeout: this.getNumber('DATABASE_TIMEOUT', 30000)
        },
        ssl: this.getBoolean('DATABASE_SSL', true),
        logging: this.getBoolean('DATABASE_LOGGING', false)
      },
      redis: {
        url: this.getRequiredString('REDIS_URL'),
        options: {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3
        }
      },
      security: {
        jwt: {
          secret: this.getRequiredString('JWT_SECRET'),
          expiresIn: this.getString('JWT_EXPIRES_IN', '24h'),
          refreshExpiresIn: this.getString('JWT_REFRESH_EXPIRES_IN', '7d')
        },
        encryption: {
          key: this.getRequiredString('ENCRYPTION_KEY'),
          algorithm: 'aes-256-gcm'
        },
        rateLimit: {
          windowMs: this.getNumber('RATE_LIMIT_WINDOW_MS', 900000),
          max: this.getNumber('RATE_LIMIT_MAX_REQUESTS', 100)
        },
        cors: {
          origin: this.getString('CORS_ORIGIN', 'https://app.sprintagentlens.com'),
          credentials: this.getBoolean('CORS_CREDENTIALS', true)
        },
        headers: {
          helmet: this.getBoolean('HELMET_ENABLED', true),
          csp: this.getBoolean('CSP_ENABLED', true),
          hsts: this.getBoolean('HSTS_ENABLED', true),
          frameOptions: this.getString('FRAME_OPTIONS', 'DENY')
        }
      },
      logging: {
        level: this.getString('LOG_LEVEL', 'info'),
        format: this.getString('LOG_FORMAT', 'json'),
        enableAudit: this.getBoolean('AUDIT_ENABLED', true),
        retentionDays: this.getNumber('AUDIT_RETENTION_DAYS', 90)
      },
      monitoring: {
        enabled: this.getBoolean('ENABLE_METRICS', true),
        port: this.getNumber('METRICS_PORT', 9090),
        healthCheck: {
          timeout: this.getNumber('HEALTH_CHECK_TIMEOUT', 5000),
          database: this.getBoolean('DATABASE_HEALTH_CHECK', true),
          redis: this.getBoolean('REDIS_HEALTH_CHECK', true)
        }
      },
      cache: {
        ttl: this.getNumber('CACHE_TTL', 3600),
        maxSize: this.getNumber('CACHE_MAX_SIZE', 1000),
        queryCache: this.getBoolean('ENABLE_QUERY_CACHE', true)
      },
      upload: {
        maxSize: this.getNumber('MAX_FILE_SIZE', 104857600),
        directory: this.getString('UPLOAD_DIRECTORY', '/app/uploads'),
        tempDirectory: this.getString('TEMP_DIRECTORY', '/app/temp')
      },
      aws: {
        region: this.getString('AWS_REGION', 'us-west-2'),
        s3: {
          bucket: this.getRequiredString('AWS_S3_BUCKET')
        }
      },
      email: {
        smtp: {
          host: this.getRequiredString('SMTP_HOST'),
          port: this.getNumber('SMTP_PORT', 587),
          user: this.getRequiredString('SMTP_USER'),
          password: this.getRequiredString('SMTP_PASSWORD')
        },
        from: this.getString('EMAIL_FROM', 'noreply@sprintagentlens.com')
      },
      queue: {
        redis: this.getString('QUEUE_REDIS_URL', this.getRequiredString('REDIS_URL')),
        concurrency: this.getNumber('QUEUE_CONCURRENCY', 5),
        maxAttempts: this.getNumber('QUEUE_MAX_ATTEMPTS', 3),
        backoffType: this.getString('QUEUE_BACKOFF_TYPE', 'exponential')
      },
      features: {
        analytics: this.getBoolean('FEATURE_ANALYTICS', true),
        telemetry: this.getBoolean('FEATURE_TELEMETRY', true),
        experimental: this.getBoolean('FEATURE_EXPERIMENTAL', false)
      }
    };
  }

  public validateProductionConfig(): void {
    const requiredVars = [
      'DATABASE_URL',
      'REDIS_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'AWS_S3_BUCKET',
      'SMTP_HOST',
      'SMTP_USER',
      'SMTP_PASSWORD'
    ];

    const missing = requiredVars.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secret strength
    const jwtSecret = this.getString('JWT_SECRET');
    if (jwtSecret && jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Validate encryption key
    const encryptionKey = this.getString('ENCRYPTION_KEY');
    if (encryptionKey && encryptionKey.length < 32) {
      throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
    }

    // Validate database URL format
    const dbUrl = this.getString('DATABASE_URL');
    if (dbUrl && !dbUrl.startsWith('mysql://')) {
      throw new Error('DATABASE_URL must be a valid MySQL connection string');
    }

    // Validate Redis URL format
    const redisUrl = this.getString('REDIS_URL');
    if (redisUrl && !redisUrl.startsWith('redis://')) {
      throw new Error('REDIS_URL must be a valid Redis connection string');
    }
  }
}