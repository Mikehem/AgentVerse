# Database Migration Guide: SQLite → PostgreSQL + pgvector + MinIO + ClickHouse

## Overview

This guide outlines the migration from SQLite to a production-ready infrastructure stack optimized for AI/ML workloads and real-time analytics.

## Target Architecture

### New Infrastructure Stack
- **PostgreSQL 16 + pgvector**: Primary database with vector embeddings support
- **MinIO**: S3-compatible object storage for files and media
- **ClickHouse**: Real-time analytics engine for metrics and observability
- **Redis**: Caching and session management
- **Grafana**: Analytics dashboards and monitoring

### Key Benefits
1. **Scalability**: Handle millions of records and concurrent users
2. **Vector Search**: Native support for embeddings and semantic similarity
3. **Real-time Analytics**: Sub-second query performance on large datasets
4. **Blob Storage**: Scalable file and media management
5. **High Availability**: Production-ready with backup and replication

## Migration Roadmap

### Phase 1: Infrastructure Setup (Immediate)
- [x] Create Docker Compose configuration
- [x] Design PostgreSQL schema with pgvector
- [x] Create ClickHouse analytics schema
- [x] Configure MinIO and Grafana
- [x] Build deployment automation

### Phase 2: Parallel Development (Week 1)
- [ ] Install database adapters (pg, clickhouse-js, minio-js)
- [ ] Create database abstraction layer
- [ ] Implement data migration scripts
- [ ] Add vector embeddings support
- [ ] Configure analytics pipelines

### Phase 3: Feature Enhancement (Week 2)
- [ ] Semantic search for conversations and prompts
- [ ] Real-time dashboards for agent performance
- [ ] Automated backup and disaster recovery
- [ ] Performance optimization and indexing

### Phase 4: Production Deployment (Week 3)
- [ ] Load testing and performance validation
- [ ] Security hardening and access controls
- [ ] Monitoring and alerting setup
- [ ] Documentation and training

## Critical Use Cases Requiring Migration

### 1. AI/ML Workloads with Vector Search
**Current Limitation**: No support for embeddings
**Solution**: pgvector enables:
- Semantic similarity search in conversations
- RAG (Retrieval Augmented Generation) for prompt optimization
- Agent behavior clustering and analysis
- Document and dataset similarity matching

### 2. Large-Scale Evaluation Metrics
**Current Limitation**: SQLite performance degrades with large datasets
**Solution**: ClickHouse provides:
- Real-time analytics on millions of evaluation results
- Complex aggregations and time-series analysis
- Sub-second query performance
- Automatic data compression and partitioning

### 3. Multi-User Concurrent Access
**Current Limitation**: SQLite single-writer bottleneck
**Solution**: PostgreSQL offers:
- Full ACID compliance with concurrent access
- Connection pooling and performance optimization
- Advanced indexing and query optimization
- Horizontal scaling capabilities

### 4. Enterprise File Management
**Current Limitation**: Local file storage doesn't scale
**Solution**: MinIO provides:
- S3-compatible object storage
- Versioning and lifecycle management
- CDN integration and global distribution
- Enterprise-grade security and compliance

## Deployment Instructions

### Prerequisites
- Docker Desktop installed and running
- 8GB+ RAM available for containers
- 50GB+ disk space for data volumes

### Quick Start
```bash
# 1. Deploy infrastructure
./deploy-infrastructure.sh

# 2. Verify services are running
docker-compose -f docker-compose.infrastructure.yml ps

# 3. Update application environment
cp .env.infrastructure .env

# 4. Install new dependencies
npm install pg @types/pg clickhouse minio @aws-sdk/client-s3

# 5. Run database migrations
npm run migrate:postgres
npm run migrate:clickhouse

# 6. Start application with new stack
npm run dev
```

### Manual Deployment
```bash
# Start infrastructure services
docker-compose -f docker-compose.infrastructure.yml up -d

# Wait for health checks
docker-compose -f docker-compose.infrastructure.yml ps

# Test connections
psql -h localhost -p 5432 -U sprintlens -d sprintlens -c "SELECT version();"
curl http://localhost:8123/ping
```

## Service Configuration

### PostgreSQL Connection
```typescript
import { Pool } from 'pg'

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'sprintlens',
  user: 'sprintlens',
  password: 'sprintlens_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})
```

### ClickHouse Analytics
```typescript
import { createClient } from '@clickhouse/client'

const clickhouse = createClient({
  host: 'http://localhost:8123',
  database: 'sprintlens_analytics',
  username: 'sprintlens_analytics',
  password: 'analytics_password',
})
```

### MinIO Object Storage
```typescript
import { S3Client } from '@aws-sdk/client-s3'

const s3Client = new S3Client({
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'sprintlens',
    secretAccessKey: 'sprintlens_minio_password',
  },
  forcePathStyle: true,
})
```

## Data Migration Strategy

### 1. Incremental Migration
- Keep SQLite as read-only during migration
- Write new data to PostgreSQL
- Migrate historical data in batches
- Validate data integrity at each step

### 2. Vector Embeddings Population
- Generate embeddings for existing conversations
- Index prompts and dataset items for semantic search
- Create similarity clusters for agent behaviors

### 3. Analytics Data Backfill
- Export metrics from SQLite to ClickHouse
- Aggregate historical performance data
- Create baseline dashboards and alerts

## Performance Optimizations

### PostgreSQL
- Connection pooling with pg-pool
- Query optimization with EXPLAIN ANALYZE
- Proper indexing on frequently queried columns
- Vector index tuning for embedding searches

### ClickHouse
- Partitioning by time periods
- Compression and TTL policies
- Materialized views for real-time aggregations
- Distributed tables for horizontal scaling

### MinIO
- Bucket policies for public/private access
- Lifecycle management for old files
- CDN integration for global distribution
- Encryption at rest and in transit

## Monitoring and Observability

### Grafana Dashboards
- Agent performance metrics
- Cost analytics and trending
- Evaluation success rates
- System health and resource usage

### Alerting Rules
- Database connection failures
- High response times
- Cost threshold breaches
- Storage capacity warnings

## Security Considerations

### Database Security
- SSL/TLS encryption for all connections
- Role-based access control (RBAC)
- Regular security updates and patches
- Network isolation and firewalls

### Object Storage Security
- Bucket policies and IAM roles
- Encryption at rest and in transit
- Access logging and auditing
- Secure credential management

## Rollback Plan

### Emergency Rollback
1. Stop application services
2. Revert to SQLite configuration
3. Restore from backup if needed
4. Investigate and fix issues
5. Resume migration after validation

### Data Consistency
- Maintain SQLite backups during migration
- Implement data validation checksums
- Test rollback procedures in staging
- Document recovery procedures

## Success Metrics

### Performance Improvements
- Query response time < 100ms (vs 1s+ in SQLite)
- Concurrent user support > 100 (vs 1 in SQLite)
- Evaluation throughput > 10,000 items/minute
- Vector similarity search < 50ms

### Feature Enablement
- Semantic search functionality
- Real-time analytics dashboards
- Scalable file upload/download
- Multi-tenant support

### Operational Benefits
- Automated backup and recovery
- Horizontal scaling capabilities
- Production-ready monitoring
- Enterprise compliance features

## Next Steps

1. **Deploy Infrastructure**: Run `./deploy-infrastructure.sh`
2. **Install Dependencies**: Add PostgreSQL, ClickHouse, and MinIO clients
3. **Implement Database Layer**: Create abstraction for new services
4. **Migrate Core Features**: Start with projects and agents
5. **Add Vector Search**: Implement semantic similarity features
6. **Deploy Analytics**: Create real-time dashboards
7. **Production Hardening**: Security, monitoring, and optimization