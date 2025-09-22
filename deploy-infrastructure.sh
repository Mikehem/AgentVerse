#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SprintAgentLens Infrastructure Deployment${NC}"
echo "=================================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop and try again.${NC}"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install Docker Compose.${NC}"
    exit 1
fi

# Load environment variables
if [ -f .env.infrastructure ]; then
    echo -e "${GREEN}✅ Loading environment configuration...${NC}"
    export $(cat .env.infrastructure | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}⚠️  .env.infrastructure not found. Using default values.${NC}"
fi

# Create necessary directories
echo -e "${BLUE}📁 Creating necessary directories...${NC}"
mkdir -p data/postgres data/clickhouse data/minio data/redis data/grafana
mkdir -p logs/postgres logs/clickhouse logs/minio logs/redis logs/grafana

# Stop existing services if running
echo -e "${YELLOW}🛑 Stopping existing services...${NC}"
docker-compose -f docker-compose.infrastructure.yml down -v || true

# Pull latest images
echo -e "${BLUE}📥 Pulling latest Docker images...${NC}"
docker-compose -f docker-compose.infrastructure.yml pull

# Start infrastructure services
echo -e "${GREEN}🔄 Starting infrastructure services...${NC}"
docker-compose -f docker-compose.infrastructure.yml up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be ready...${NC}"

# Function to wait for service
wait_for_service() {
    local service=$1
    local max_attempts=$2
    local attempt=1
    
    echo -e "${YELLOW}Waiting for $service...${NC}"
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f docker-compose.infrastructure.yml ps $service | grep -q "healthy\|Up"; then
            echo -e "${GREEN}✅ $service is ready${NC}"
            return 0
        fi
        echo -e "${YELLOW}Attempt $attempt/$max_attempts for $service...${NC}"
        sleep 5
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service failed to start after $max_attempts attempts${NC}"
    return 1
}

# Wait for each service
wait_for_service "postgres" 12
wait_for_service "clickhouse" 12
wait_for_service "minio" 8
wait_for_service "redis" 6

# Initialize MinIO buckets
echo -e "${BLUE}🪣 Initializing MinIO buckets...${NC}"
docker run --rm --network host \
    -e MINIO_ENDPOINT=localhost:9000 \
    -e MINIO_ACCESS_KEY=sprintlens \
    -e MINIO_SECRET_KEY=sprintlens_minio_password \
    minio/mc:latest sh -c "
    mc alias set sprintlens http://localhost:9000 sprintlens sprintlens_minio_password &&
    mc mb sprintlens/sprintlens-storage --ignore-existing &&
    mc anonymous set download sprintlens/sprintlens-storage &&
    echo 'MinIO bucket created successfully'
    " || echo -e "${YELLOW}⚠️  MinIO bucket creation skipped (may already exist)${NC}"

# Test database connections
echo -e "${BLUE}🔍 Testing database connections...${NC}"

# Test PostgreSQL
PGPASSWORD=sprintlens_password psql -h localhost -p 5432 -U sprintlens -d sprintlens -c "SELECT version();" > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ PostgreSQL connection successful${NC}" || \
    echo -e "${RED}❌ PostgreSQL connection failed${NC}"

# Test ClickHouse
curl -s "http://localhost:8123/ping" > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ ClickHouse connection successful${NC}" || \
    echo -e "${RED}❌ ClickHouse connection failed${NC}"

# Test Redis
redis-cli -h localhost -p 6379 -a sprintlens_redis_password ping > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ Redis connection successful${NC}" || \
    echo -e "${RED}❌ Redis connection failed${NC}"

# Display service URLs
echo -e "${GREEN}"
echo "=================================================="
echo "🎉 Infrastructure deployment completed!"
echo "=================================================="
echo -e "${NC}"
echo "Service URLs:"
echo "• PostgreSQL: localhost:5432 (user: sprintlens, db: sprintlens)"
echo "• ClickHouse: http://localhost:8123 (user: sprintlens_analytics)"
echo "• MinIO Console: http://localhost:9001 (user: sprintlens)"
echo "• MinIO API: http://localhost:9000"
echo "• Redis: localhost:6379"
echo "• Grafana: http://localhost:3001 (admin/sprintlens_grafana_password)"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Update your application .env file with the new database URLs"
echo "2. Run database migrations: npm run migrate"
echo "3. Start your application services"
echo "4. Access Grafana for analytics dashboards"
echo ""
echo -e "${YELLOW}To stop all services: docker-compose -f docker-compose.infrastructure.yml down${NC}"
echo -e "${YELLOW}To view logs: docker-compose -f docker-compose.infrastructure.yml logs -f [service_name]${NC}"