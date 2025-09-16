#!/bin/bash

# SprintAgentLens Backend Deployment Script
# This script handles production deployment with zero-downtime and rollback capabilities

set -e

# Configuration
PROJECT_NAME="sprintagentlens-backend"
DOCKER_IMAGE="sprintagentlens/backend"
BACKUP_DIR="/opt/backups/sprintagentlens"
LOG_FILE="/var/log/sprintagentlens-deploy.log"
MAX_BACKUPS=5

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root or with sudo"
    fi
}

# Validate environment
validate_environment() {
    log "Validating deployment environment..."
    
    # Check required commands
    local required_commands=("docker" "docker-compose" "mysql" "redis-cli" "nginx")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            error "Required command '$cmd' is not installed"
        fi
    done
    
    # Check required files
    local required_files=(".env.production" "docker-compose.production.yml" "nginx.conf")
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file '$file' not found"
        fi
    done
    
    # Validate environment variables
    source .env.production
    local required_vars=("DATABASE_URL" "REDIS_URL" "JWT_SECRET" "ENCRYPTION_KEY")
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            error "Required environment variable '$var' is not set"
        fi
    done
    
    success "Environment validation completed"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_path="$BACKUP_DIR/$backup_timestamp"
    
    mkdir -p "$backup_path"
    
    # Backup database
    log "Backing up database..."
    local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    local db_port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    local db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    local db_pass=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    mysqldump -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_pass" "$db_name" > "$backup_path/database.sql"
    
    # Backup Redis data
    log "Backing up Redis data..."
    redis-cli --rdb "$backup_path/redis.rdb"
    
    # Backup application files
    log "Backing up application files..."
    tar -czf "$backup_path/app_files.tar.gz" uploads/ logs/ || true
    
    # Backup current Docker images
    log "Backing up Docker images..."
    docker save "$DOCKER_IMAGE:latest" | gzip > "$backup_path/docker_image.tar.gz" || true
    
    # Clean up old backups
    log "Cleaning up old backups..."
    ls -dt "$BACKUP_DIR"/*/ | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf || true
    
    success "Backup created at $backup_path"
    echo "$backup_path" > /tmp/sprintagentlens_last_backup
}

# Build new Docker image
build_image() {
    local version=${1:-latest}
    log "Building Docker image version $version..."
    
    # Build the image
    docker build -t "$DOCKER_IMAGE:$version" .
    docker tag "$DOCKER_IMAGE:$version" "$DOCKER_IMAGE:latest"
    
    success "Docker image built successfully"
}

# Run pre-deployment tests
run_tests() {
    log "Running pre-deployment tests..."
    
    # Test Docker image
    log "Testing Docker image..."
    local test_container=$(docker run -d \
        --env-file .env.production \
        -e NODE_ENV=test \
        "$DOCKER_IMAGE:latest")
    
    # Wait for container to start
    sleep 10
    
    # Check if container is healthy
    local container_status=$(docker inspect --format='{{.State.Status}}' "$test_container")
    if [[ "$container_status" != "running" ]]; then
        docker logs "$test_container"
        docker rm -f "$test_container"
        error "Docker container failed to start"
    fi
    
    # Test health endpoint
    local container_ip=$(docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$test_container")
    if ! curl -f "http://$container_ip:3000/health/ping" > /dev/null 2>&1; then
        docker logs "$test_container"
        docker rm -f "$test_container"
        error "Health check failed"
    fi
    
    # Clean up test container
    docker rm -f "$test_container"
    
    success "Pre-deployment tests passed"
}

# Deploy with zero downtime
deploy() {
    log "Starting deployment..."
    
    # Scale up new version
    log "Scaling up new version..."
    docker-compose -f docker-compose.production.yml up -d --scale app=2 app
    
    # Wait for new instance to be healthy
    log "Waiting for new instance to be healthy..."
    local max_attempts=30
    local attempt=0
    
    while [[ $attempt -lt $max_attempts ]]; do
        if curl -f http://localhost/health/ping > /dev/null 2>&1; then
            break
        fi
        sleep 10
        ((attempt++))
    done
    
    if [[ $attempt -eq $max_attempts ]]; then
        error "New instance failed to become healthy"
    fi
    
    # Run database migrations
    log "Running database migrations..."
    docker-compose -f docker-compose.production.yml exec -T app npx prisma migrate deploy
    
    # Scale down old version
    log "Scaling down to single instance..."
    docker-compose -f docker-compose.production.yml up -d --scale app=1 app
    
    # Reload Nginx configuration
    log "Reloading Nginx configuration..."
    docker-compose -f docker-compose.production.yml exec nginx nginx -s reload
    
    success "Deployment completed successfully"
}

# Verify deployment
verify_deployment() {
    log "Verifying deployment..."
    
    # Test all critical endpoints
    local endpoints=(
        "/health/ping"
        "/health/ready"
        "/health/live"
        "/api/v1/auth/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        log "Testing endpoint: $endpoint"
        if ! curl -f "http://localhost$endpoint" > /dev/null 2>&1; then
            warn "Endpoint $endpoint is not responding correctly"
        fi
    done
    
    # Check Docker containers
    log "Checking Docker containers..."
    docker-compose -f docker-compose.production.yml ps
    
    # Check logs for errors
    log "Checking for recent errors in logs..."
    docker-compose -f docker-compose.production.yml logs --tail=50 app | grep -i error || true
    
    success "Deployment verification completed"
}

# Rollback to previous version
rollback() {
    local backup_path=$(cat /tmp/sprintagentlens_last_backup 2>/dev/null || echo "")
    
    if [[ -z "$backup_path" ]] || [[ ! -d "$backup_path" ]]; then
        error "No backup found for rollback"
    fi
    
    log "Rolling back to backup: $backup_path"
    
    # Stop current containers
    docker-compose -f docker-compose.production.yml down
    
    # Restore Docker image
    if [[ -f "$backup_path/docker_image.tar.gz" ]]; then
        log "Restoring Docker image..."
        gunzip -c "$backup_path/docker_image.tar.gz" | docker load
    fi
    
    # Restore database
    log "Restoring database..."
    local db_host=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    local db_port=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    local db_name=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    local db_user=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    local db_pass=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
    
    mysql -h"$db_host" -P"$db_port" -u"$db_user" -p"$db_pass" "$db_name" < "$backup_path/database.sql"
    
    # Restore Redis data
    if [[ -f "$backup_path/redis.rdb" ]]; then
        log "Restoring Redis data..."
        docker-compose -f docker-compose.production.yml stop redis
        cp "$backup_path/redis.rdb" /var/lib/redis/dump.rdb
        docker-compose -f docker-compose.production.yml start redis
    fi
    
    # Restore application files
    if [[ -f "$backup_path/app_files.tar.gz" ]]; then
        log "Restoring application files..."
        tar -xzf "$backup_path/app_files.tar.gz"
    fi
    
    # Start services
    docker-compose -f docker-compose.production.yml up -d
    
    success "Rollback completed"
}

# Cleanup old resources
cleanup() {
    log "Cleaning up old resources..."
    
    # Remove unused Docker images
    docker image prune -f
    
    # Remove unused volumes
    docker volume prune -f
    
    # Remove old containers
    docker container prune -f
    
    # Clean up logs older than 30 days
    find logs/ -name "*.log" -mtime +30 -delete 2>/dev/null || true
    
    success "Cleanup completed"
}

# Main deployment flow
main() {
    local command=${1:-deploy}
    local version=${2:-latest}
    
    case $command in
        "deploy")
            check_permissions
            validate_environment
            create_backup
            build_image "$version"
            run_tests
            deploy
            verify_deployment
            cleanup
            success "Deployment completed successfully!"
            ;;
        "rollback")
            check_permissions
            rollback
            verify_deployment
            success "Rollback completed successfully!"
            ;;
        "backup")
            check_permissions
            validate_environment
            create_backup
            success "Backup created successfully!"
            ;;
        "test")
            validate_environment
            build_image "$version"
            run_tests
            success "Tests passed successfully!"
            ;;
        "cleanup")
            check_permissions
            cleanup
            success "Cleanup completed successfully!"
            ;;
        *)
            echo "Usage: $0 {deploy|rollback|backup|test|cleanup} [version]"
            echo ""
            echo "Commands:"
            echo "  deploy [version]  - Deploy application (default: latest)"
            echo "  rollback          - Rollback to previous backup"
            echo "  backup            - Create backup only"
            echo "  test [version]    - Run tests only"
            echo "  cleanup           - Cleanup old resources"
            exit 1
            ;;
    esac
}

# Set up logging
mkdir -p "$(dirname "$LOG_FILE")"
mkdir -p "$BACKUP_DIR"

# Run main function
main "$@"