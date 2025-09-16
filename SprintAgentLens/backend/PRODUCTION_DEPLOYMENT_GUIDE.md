# SprintAgentLens Backend - Production Deployment Guide

This comprehensive guide covers the deployment of SprintAgentLens Backend in a production environment with enterprise-grade security, monitoring, and reliability.

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Deployment Setup](#pre-deployment-setup)
3. [Environment Configuration](#environment-configuration)
4. [Security Configuration](#security-configuration)
5. [Database Setup](#database-setup)
6. [Deployment Process](#deployment-process)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Backup and Recovery](#backup-and-recovery)
10. [Troubleshooting](#troubleshooting)

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 4 cores (8+ recommended for production)
- **RAM**: 8GB (16GB+ recommended for production)
- **Storage**: 100GB SSD (500GB+ recommended for production)
- **Network**: Stable internet connection with sufficient bandwidth

### Software Requirements
- **Operating System**: Ubuntu 20.04 LTS or later (recommended), CentOS 7+, or RHEL 7+
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **MySQL**: 8.0+
- **Redis**: 6.0+
- **Nginx**: 1.18+
- **Node.js**: 18.x (for tooling only)

## Pre-Deployment Setup

### 1. Server Preparation

Run the automated setup script as root:

```bash
sudo ./scripts/setup-production.sh [domain] [setup_ssl]
```

Examples:
```bash
# Basic setup for development/testing
sudo ./scripts/setup-production.sh localhost false

# Production setup with custom domain and SSL
sudo ./scripts/setup-production.sh api.sprintagentlens.com true
```

The setup script will:
- Install required system dependencies
- Configure Docker and Docker Compose
- Create application user and directories
- Setup firewall rules
- Configure fail2ban for security
- Setup log rotation
- Install monitoring tools
- Optimize system settings

### 2. Manual Setup (if not using setup script)

If you prefer manual setup, follow these steps:

#### Install Dependencies
```bash
# Ubuntu/Debian
apt-get update
apt-get install -y docker.io docker-compose nginx mysql-client redis-tools

# CentOS/RHEL
yum install -y docker docker-compose nginx mysql redis

# Start services
systemctl start docker
systemctl enable docker
```

#### Create Application User
```bash
useradd -r -s /bin/bash -d /opt/sprintagentlens sprintagentlens
usermod -aG docker sprintagentlens
mkdir -p /opt/sprintagentlens /var/log/sprintagentlens /opt/backups/sprintagentlens
chown -R sprintagentlens:sprintagentlens /opt/sprintagentlens /var/log/sprintagentlens /opt/backups/sprintagentlens
```

## Environment Configuration

### 1. Production Environment File

Create `.env.production` with your production settings:

```bash
cp .env.production.example .env.production
```

### 2. Required Environment Variables

Update the following critical variables:

```env
# Database (replace with your production database URL)
DATABASE_URL=mysql://username:password@db-host:3306/sprintagentlens_production

# Redis (replace with your production Redis URL)
REDIS_URL=redis://redis-host:6379

# Security (generate strong secrets)
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters-long
ENCRYPTION_KEY=your-super-secure-encryption-key-at-least-32-characters
SESSION_SECRET=your-super-secure-session-secret

# External Services
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket-name

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com

# Domain Configuration
CORS_ORIGIN=https://your-frontend-domain.com
```

### 3. Generate Secure Secrets

Use these commands to generate secure secrets:

```bash
# Generate JWT secret (32+ characters)
openssl rand -hex 32

# Generate encryption key (32+ characters)
openssl rand -hex 32

# Generate session secret
openssl rand -hex 24
```

## Security Configuration

### 1. SSL Certificates

#### Using Let's Encrypt (Recommended for production)
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

#### Using Custom Certificates
```bash
# Create SSL directory
mkdir -p ssl/

# Copy your certificates
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# Set proper permissions
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

### 2. Firewall Configuration

```bash
# Ubuntu/Debian with UFW
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL with firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 3. Security Headers

The included Nginx configuration automatically adds security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## Database Setup

### 1. Database Creation

```sql
-- Connect to MySQL as root
mysql -u root -p

-- Create database
CREATE DATABASE sprintagentlens_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'sprintagentlens'@'%' IDENTIFIED BY 'secure_password_here';

-- Grant permissions
GRANT ALL PRIVILEGES ON sprintagentlens_production.* TO 'sprintagentlens'@'%';

-- Apply changes
FLUSH PRIVILEGES;
```

### 2. Database Optimization

Add these settings to your MySQL configuration:

```ini
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 256M
innodb_flush_log_at_trx_commit = 2
innodb_flush_method = O_DIRECT
max_connections = 200
query_cache_size = 128M
query_cache_type = 1
```

## Deployment Process

### 1. Copy Application Files

```bash
# Switch to application user
sudo -u sprintagentlens -i

# Navigate to application directory
cd /opt/sprintagentlens

# Clone or copy your application code
git clone https://github.com/yourusername/sprintagentlens-backend.git .
# OR
# rsync -av /path/to/your/code/ .

# Ensure proper ownership
sudo chown -R sprintagentlens:sprintagentlens /opt/sprintagentlens
```

### 2. Run Deployment

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run full deployment
sudo ./scripts/deploy.sh deploy

# Or run specific steps
sudo ./scripts/deploy.sh test    # Run tests only
sudo ./scripts/deploy.sh backup # Create backup only
```

### 3. Deployment Steps Breakdown

The deployment script performs these steps:

1. **Environment Validation**: Checks all required environment variables and files
2. **Backup Creation**: Creates full backup of database, Redis data, and application files
3. **Image Building**: Builds optimized Docker image
4. **Pre-deployment Tests**: Runs health checks and basic tests
5. **Zero-downtime Deployment**: Deploys new version without service interruption
6. **Database Migration**: Applies any pending database migrations
7. **Verification**: Verifies deployment success
8. **Cleanup**: Removes old resources

## Post-Deployment Verification

### 1. Health Checks

```bash
# Basic health check
curl http://localhost/health/ping

# Detailed health check
curl http://localhost/health/detailed

# Ready/Live checks (for Kubernetes)
curl http://localhost/health/ready
curl http://localhost/health/live
```

### 2. Service Status

```bash
# Check Docker containers
docker-compose -f docker-compose.production.yml ps

# Check logs
docker-compose -f docker-compose.production.yml logs -f app

# Check resource usage
docker stats
```

### 3. Database Connectivity

```bash
# Test database connection
docker-compose -f docker-compose.production.yml exec app npx prisma db pull

# Check migrations
docker-compose -f docker-compose.production.yml exec app npx prisma migrate status
```

## Monitoring and Maintenance

### 1. Application Monitoring

The application includes built-in monitoring endpoints:

- **Metrics**: `http://localhost/metrics` (Prometheus format)
- **Health**: `http://localhost/health/system`
- **Performance**: Real-time performance monitoring via logging

### 2. Log Management

```bash
# View application logs
docker-compose -f docker-compose.production.yml logs -f app

# View nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# View system logs
journalctl -u docker -f
```

### 3. Performance Monitoring

#### Prometheus and Grafana (Optional)

The included `docker-compose.production.yml` includes Prometheus and Grafana:

```bash
# Access Prometheus
http://localhost:9090

# Access Grafana
http://localhost:3001
# Default credentials: admin/admin
```

#### System Monitoring

```bash
# CPU and memory usage
htop

# Disk I/O
iotop

# Network connections
netstat -tulpn

# Docker resource usage
docker stats
```

## Backup and Recovery

### 1. Automated Backups

The deployment script sets up automated daily backups:

```bash
# Manual backup
sudo ./scripts/deploy.sh backup

# View backup location
ls -la /opt/backups/sprintagentlens/
```

### 2. Backup Contents

Each backup includes:
- Complete database dump
- Redis data snapshot
- Application files (uploads, logs)
- Docker image snapshot

### 3. Recovery Process

```bash
# Rollback to previous backup
sudo ./scripts/deploy.sh rollback

# Manual restore (if needed)
# 1. Stop services
docker-compose -f docker-compose.production.yml down

# 2. Restore database
mysql -h localhost -u username -p database_name < backup_file.sql

# 3. Restore Redis data
cp backup/redis.rdb /var/lib/redis/dump.rdb

# 4. Restore application files
tar -xzf backup/app_files.tar.gz

# 5. Start services
docker-compose -f docker-compose.production.yml up -d
```

## Troubleshooting

### 1. Common Issues

#### Application Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs app

# Check environment variables
docker-compose -f docker-compose.production.yml exec app env | grep -E 'DATABASE_URL|REDIS_URL|JWT_SECRET'

# Test database connection
docker-compose -f docker-compose.production.yml exec app npx prisma db pull
```

#### High Memory Usage
```bash
# Check memory usage
docker stats

# Restart services if needed
docker-compose -f docker-compose.production.yml restart app
```

#### Database Connection Issues
```bash
# Test database connectivity
mysql -h db_host -u db_user -p db_name

# Check database logs
docker-compose -f docker-compose.production.yml logs db
```

#### Redis Connection Issues
```bash
# Test Redis connectivity
redis-cli -h redis_host ping

# Check Redis logs
docker-compose -f docker-compose.production.yml logs redis
```

### 2. Performance Issues

#### Slow Queries
```bash
# Enable MySQL slow query log
echo "slow_query_log = 1" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "slow_query_log_file = /var/log/mysql/slow.log" >> /etc/mysql/mysql.conf.d/mysqld.cnf
echo "long_query_time = 2" >> /etc/mysql/mysql.conf.d/mysqld.cnf

# Analyze slow queries
mysqldumpslow /var/log/mysql/slow.log
```

#### High CPU Usage
```bash
# Check process usage
top -p $(pgrep -d',' node)

# Profile application (if needed)
docker-compose -f docker-compose.production.yml exec app node --prof app.js
```

### 3. Security Issues

#### Suspicious Activity
```bash
# Check fail2ban logs
sudo journalctl -u fail2ban -f

# Check application security logs
docker-compose -f docker-compose.production.yml logs app | grep -i security

# View blocked IPs
sudo fail2ban-client status nginx-http-auth
```

#### SSL Certificate Issues
```bash
# Test SSL certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Renew Let's Encrypt certificate
sudo certbot renew

# Check certificate expiration
echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

## Maintenance Tasks

### 1. Regular Maintenance

#### Daily
- Monitor application health endpoints
- Check system resource usage
- Review error logs

#### Weekly
- Analyze slow query logs
- Review security logs
- Check disk space usage
- Verify backup integrity

#### Monthly
- Update system packages
- Review and rotate logs
- Analyze performance metrics
- Update SSL certificates (if needed)

### 2. Update Process

```bash
# 1. Create backup
sudo ./scripts/deploy.sh backup

# 2. Pull latest code
git pull origin main

# 3. Deploy update
sudo ./scripts/deploy.sh deploy

# 4. Verify deployment
curl http://localhost/health/ping
```

### 3. Scaling Considerations

#### Horizontal Scaling
- Use Docker Swarm or Kubernetes for multi-node deployment
- Implement session clustering for Redis
- Use database read replicas for read scaling

#### Vertical Scaling
- Increase server resources (CPU, RAM)
- Optimize database configuration
- Implement connection pooling
- Use CDN for static assets

## Support and Documentation

### 1. Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/)

### 2. Getting Help

1. Check application logs first
2. Review this documentation
3. Search for similar issues in the project repository
4. Create a support ticket with:
   - System information
   - Error logs
   - Steps to reproduce
   - Expected vs actual behavior

### 3. Emergency Contacts

In case of critical production issues:
1. Check application health endpoints
2. Review recent deployment logs
3. Consider immediate rollback if needed
4. Contact system administrator

Remember: Always test deployments in a staging environment before applying to production!