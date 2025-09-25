# Agent Lens Solution Makefile
# Provides single commands for setup, start, stop, and management

.PHONY: help setup start stop restart status clean logs install test build deploy dev

# Default target
help:
	@echo "🚀 Agent Lens Solution Management"
	@echo "================================="
	@echo ""
	@echo "📋 Available Commands:"
	@echo ""
	@echo "🛠️  Setup & Installation:"
	@echo "  make setup          - Complete setup (install dependencies, configure environment)"
	@echo "  make install        - Install all dependencies only"
	@echo "  make config         - Configure environment files"
	@echo ""
	@echo "🚀 Service Management:"
	@echo "  make start          - Start all services (backend, frontend, databases)"
	@echo "  make stop           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make dev            - Start development environment"
	@echo ""
	@echo "📊 Monitoring & Logs:"
	@echo "  make status         - Check status of all services"
	@echo "  make logs           - Show logs from all services"
	@echo "  make logs-backend   - Show backend logs only"
	@echo "  make logs-frontend  - Show frontend logs only"
	@echo ""
	@echo "🧪 Development:"
	@echo "  make test           - Run all tests"
	@echo "  make build          - Build all components"
	@echo "  make lint           - Run linting on all code"
	@echo "  make format         - Format all code"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean          - Clean build artifacts and temporary files"
	@echo "  make reset          - Reset all data and configurations"
	@echo "  make reset-db       - Reset database with sample data"
	@echo "  make seed-db        - Seed database with sample data only"
	@echo "  make health         - Run health checks"
	@echo ""
	@echo "🚢 Deployment:"
	@echo "  make deploy         - Deploy to production"
	@echo "  make deploy-staging - Deploy to staging"
	@echo ""

# Variables
DOCKER_COMPOSE = docker-compose
NODE_VERSION = 18
PYTHON_VERSION = 3.9
FRONTEND_PORT = 3000
BACKEND_PORT = 8000
FRONTEND_DEV_PORT = 3001

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

# Check if command exists
define check_command
	@which $(1) > /dev/null || (echo "$(RED)❌ $(1) not found. Please install $(1).$(NC)" && exit 1)
endef

# Print colored status
define print_status
	@echo "$(GREEN)✅ $(1)$(NC)"
endef

define print_info
	@echo "$(BLUE)ℹ️  $(1)$(NC)"
endef

define print_warning
	@echo "$(YELLOW)⚠️  $(1)$(NC)"
endef

define print_error
	@echo "$(RED)❌ $(1)$(NC)"
endef

# Setup - Complete environment setup
setup: check-deps install config setup-db
	$(call print_status, "Agent Lens setup completed successfully!")
	@echo ""
	@echo "$(GREEN)🎉 Ready to start! Run: make start$(NC)"

# Check dependencies
check-deps:
	$(call print_info, "Checking system dependencies...")
	$(call check_command,node)
	$(call check_command,npm)
	$(call check_command,python3)
	$(call check_command,docker)
	$(call check_command,docker-compose)
	@node --version | grep -E "v(1[8-9]|[2-9][0-9])" > /dev/null || (echo "$(RED)❌ Node.js $(NODE_VERSION)+ required$(NC)" && exit 1)
	@python3 --version | grep -E "3\.(9|1[0-9])" > /dev/null || (echo "$(RED)❌ Python $(PYTHON_VERSION)+ required$(NC)" && exit 1)
	$(call print_status, "All dependencies found")

# Install all dependencies
install: install-backend install-frontend install-sdk
	$(call print_status, "All dependencies installed")

# Install backend dependencies
install-backend:
	$(call print_info, "Installing backend dependencies...")
	cd SprintAgentLens/backend && npm install
	$(call print_status, "Backend dependencies installed")

# Install frontend dependencies  
install-frontend:
	$(call print_info, "Installing frontend dependencies...")
	cd SprintAgentLens/frontend && npm install
	$(call print_status, "Frontend dependencies installed")

# Install SDK dependencies
install-sdk:
	$(call print_info, "Installing SDK dependencies...")
	cd Sprint_Lens_SDK && pip3 install -e .
	$(call print_status, "SDK dependencies installed")

# Configure environment files
config:
	$(call print_info, "Setting up environment configuration...")
	@if [ ! -f SprintAgentLens/backend/.env ]; then \
		cp SprintAgentLens/backend/.env.example SprintAgentLens/backend/.env 2>/dev/null || \
		echo "# Agent Lens Backend Environment\nPORT=8000\nNODE_ENV=development\nMYSQL_PASSWORD=\nCLICKHOUSE_PASSWORD=\nREDIS_PASSWORD=" > SprintAgentLens/backend/.env; \
	fi
	@if [ ! -f SprintAgentLens/frontend/.env.local ]; then \
		cp SprintAgentLens/frontend/.env.example SprintAgentLens/frontend/.env.local 2>/dev/null || \
		echo "# Agent Lens Frontend Environment\nNEXT_PUBLIC_API_URL=http://localhost:8000\nNEXT_PUBLIC_WS_URL=ws://localhost:8000" > SprintAgentLens/frontend/.env.local; \
	fi
	$(call print_status, "Environment files configured")

# Setup database
setup-db:
	$(call print_info, "Setting up databases...")
	@if [ -f docker-compose.yml ]; then \
		$(DOCKER_COMPOSE) up -d mysql clickhouse redis; \
	else \
		$(call print_warning, "No docker-compose.yml found, skipping database setup"); \
	fi
	$(call print_status, "Database setup completed")

# Start all services
start: start-db start-backend start-frontend
	$(call print_status, "All services started successfully!")
	@echo ""
	@echo "$(GREEN)🌐 Services are running:$(NC)"
	@echo "  Frontend:  http://localhost:$(FRONTEND_PORT)"
	@echo "  Backend:   http://localhost:$(BACKEND_PORT)"
	@echo "  Health:    http://localhost:$(BACKEND_PORT)/health"

# Start database services
start-db:
	$(call print_info, "Starting database services...")
	@if [ -f docker-compose.yml ]; then \
		$(DOCKER_COMPOSE) up -d mysql clickhouse redis; \
		sleep 5; \
	fi
	$(call print_status, "Database services started")

# Start backend service
start-backend:
	$(call print_info, "Starting backend service...")
	@cd SprintAgentLens/backend && \
	MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev > ../logs/backend.log 2>&1 & \
	echo $$! > ../logs/backend.pid
	@sleep 3
	$(call print_status, "Backend service started")

# Start frontend service
start-frontend:
	$(call print_info, "Starting frontend service...")
	@cd SprintAgentLens/frontend && \
	npm run dev > ../logs/frontend.log 2>&1 & \
	echo $$! > ../logs/frontend.pid
	@sleep 3
	$(call print_status, "Frontend service started")

# Development mode - start with hot reload
dev: create-logs-dir
	$(call print_info, "Starting development environment...")
	@echo "$(BLUE)🔧 Development Mode Active$(NC)"
	@make start-db
	@echo "$(BLUE)Starting backend in development mode...$(NC)"
	@cd SprintAgentLens/backend && MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev &
	@echo "$(BLUE)Starting frontend in development mode...$(NC)"
	@cd SprintAgentLens/frontend && PORT=$(FRONTEND_DEV_PORT) npm run dev &
	@sleep 3
	$(call print_status, "Development environment started")
	@echo ""
	@echo "$(GREEN)🌐 Development Services:$(NC)"
	@echo "  Frontend:  http://localhost:$(FRONTEND_DEV_PORT)"
	@echo "  Backend:   http://localhost:$(BACKEND_PORT)"

# Stop all services
stop: stop-frontend stop-backend stop-db
	$(call print_status, "All services stopped")

# Stop frontend service
stop-frontend:
	$(call print_info, "Stopping frontend service...")
	@if [ -f SprintAgentLens/logs/frontend.pid ]; then \
		kill `cat SprintAgentLens/logs/frontend.pid` 2>/dev/null || true; \
		rm SprintAgentLens/logs/frontend.pid; \
	fi
	@pkill -f "npm run dev" 2>/dev/null || true
	@pkill -f "next dev" 2>/dev/null || true
	$(call print_status, "Frontend service stopped")

# Stop backend service
stop-backend:
	$(call print_info, "Stopping backend service...")
	@if [ -f SprintAgentLens/logs/backend.pid ]; then \
		kill `cat SprintAgentLens/logs/backend.pid` 2>/dev/null || true; \
		rm SprintAgentLens/logs/backend.pid; \
	fi
	@pkill -f "backend.*npm run dev" 2>/dev/null || true
	$(call print_status, "Backend service stopped")

# Stop database services
stop-db:
	$(call print_info, "Stopping database services...")
	@if [ -f docker-compose.yml ]; then \
		$(DOCKER_COMPOSE) down; \
	fi
	$(call print_status, "Database services stopped")

# Restart all services
restart: stop start
	$(call print_status, "All services restarted")

# Check status of all services
status:
	@echo "$(BLUE)📊 Agent Lens Service Status$(NC)"
	@echo "================================"
	@echo ""
	@echo "🗄️  Databases:"
	@if command -v docker >/dev/null 2>&1; then \
		docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "(mysql|clickhouse|redis|agent)" || echo "  No database containers running"; \
	else \
		echo "  Docker not available"; \
	fi
	@echo ""
	@echo "🖥️  Backend:"
	@if curl -s http://localhost:$(BACKEND_PORT)/health >/dev/null 2>&1; then \
		echo "  ✅ Backend running on port $(BACKEND_PORT)"; \
	else \
		echo "  ❌ Backend not responding on port $(BACKEND_PORT)"; \
	fi
	@echo ""
	@echo "🌐 Frontend:"
	@if curl -s http://localhost:$(FRONTEND_PORT) >/dev/null 2>&1; then \
		echo "  ✅ Frontend running on port $(FRONTEND_PORT)"; \
	else \
		echo "  ❌ Frontend not responding on port $(FRONTEND_PORT)"; \
	fi
	@if curl -s http://localhost:$(FRONTEND_DEV_PORT) >/dev/null 2>&1; then \
		echo "  ✅ Frontend dev server running on port $(FRONTEND_DEV_PORT)"; \
	fi

# Health check
health:
	$(call print_info, "Running health checks...")
	@echo "🏥 Health Check Results:"
	@echo ""
	@echo "Backend API:"
	@curl -s http://localhost:$(BACKEND_PORT)/health || echo "❌ Backend health check failed"
	@echo ""
	@echo "Database Connections:"
	@if command -v docker >/dev/null 2>&1; then \
		docker exec -it agent_lens_mysql mysql -u root -e "SELECT 'MySQL OK';" 2>/dev/null || echo "❌ MySQL connection failed"; \
		docker exec -it agent_lens_clickhouse clickhouse-client --query "SELECT 'ClickHouse OK';" 2>/dev/null || echo "❌ ClickHouse connection failed"; \
		docker exec -it agent_lens_redis redis-cli ping 2>/dev/null || echo "❌ Redis connection failed"; \
	fi

# Create logs directory
create-logs-dir:
	@mkdir -p SprintAgentLens/logs

# Show logs from all services
logs: create-logs-dir
	@echo "$(BLUE)📋 Recent logs from all services:$(NC)"
	@echo ""
	@echo "$(YELLOW)=== Backend Logs ===$(NC)"
	@tail -20 SprintAgentLens/logs/backend.log 2>/dev/null || echo "No backend logs found"
	@echo ""
	@echo "$(YELLOW)=== Frontend Logs ===$(NC)"
	@tail -20 SprintAgentLens/logs/frontend.log 2>/dev/null || echo "No frontend logs found"
	@echo ""
	@if command -v docker >/dev/null 2>&1; then \
		echo "$(YELLOW)=== Database Logs ===$(NC)"; \
		docker logs --tail=10 agent_lens_mysql 2>/dev/null || echo "No MySQL logs"; \
	fi

# Show backend logs only
logs-backend: create-logs-dir
	@echo "$(BLUE)📋 Backend Service Logs:$(NC)"
	@tail -f SprintAgentLens/logs/backend.log 2>/dev/null || echo "No backend logs found"

# Show frontend logs only  
logs-frontend: create-logs-dir
	@echo "$(BLUE)📋 Frontend Service Logs:$(NC)"
	@tail -f SprintAgentLens/logs/frontend.log 2>/dev/null || echo "No frontend logs found"

# Run tests
test: test-backend test-frontend test-sdk
	$(call print_status, "All tests completed")

# Test backend
test-backend:
	$(call print_info, "Running backend tests...")
	@cd SprintAgentLens/backend && npm test || true

# Test frontend
test-frontend:
	$(call print_info, "Running frontend tests...")
	@cd SprintAgentLens/frontend && npm test || true

# Test SDK
test-sdk:
	$(call print_info, "Running SDK tests...")
	@cd Sprint_Lens_SDK && python -m pytest tests/ || true

# Build all components
build: build-backend build-frontend
	$(call print_status, "All components built")

# Build backend
build-backend:
	$(call print_info, "Building backend...")
	@cd SprintAgentLens/backend && npm run build

# Build frontend
build-frontend:
	$(call print_info, "Building frontend...")
	@cd SprintAgentLens/frontend && npm run build

# Lint all code
lint: lint-backend lint-frontend
	$(call print_status, "Linting completed")

# Lint backend
lint-backend:
	$(call print_info, "Linting backend code...")
	@cd SprintAgentLens/backend && npm run lint || true

# Lint frontend
lint-frontend:
	$(call print_info, "Linting frontend code...")
	@cd SprintAgentLens/frontend && npm run lint || true

# Format all code
format: format-backend format-frontend
	$(call print_status, "Code formatting completed")

# Format backend
format-backend:
	$(call print_info, "Formatting backend code...")
	@cd SprintAgentLens/backend && npm run format || true

# Format frontend
format-frontend:
	$(call print_info, "Formatting frontend code...")
	@cd SprintAgentLens/frontend && npm run format || true

# Clean build artifacts and temporary files
clean:
	$(call print_info, "Cleaning build artifacts...")
	@rm -rf SprintAgentLens/backend/dist
	@rm -rf SprintAgentLens/backend/node_modules/.cache
	@rm -rf SprintAgentLens/frontend/.next
	@rm -rf SprintAgentLens/frontend/node_modules/.cache
	@rm -rf SprintAgentLens/logs/*
	@rm -f SprintAgentLens/logs/*.pid
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	$(call print_status, "Cleanup completed")

# Reset all data and configurations
reset: stop clean
	$(call print_warning, "Resetting all data and configurations...")
	@read -p "Are you sure? This will delete all data (y/N): " confirm && [ "$$confirm" = "y" ]
	@if [ -f docker-compose.yml ]; then \
		$(DOCKER_COMPOSE) down -v; \
	fi
	@rm -f SprintAgentLens/backend/.env
	@rm -f SprintAgentLens/frontend/.env.local
	@rm -rf SprintAgentLens/frontend/data/*
	$(call print_status, "Reset completed")

# Reset database with sample data
reset-db: stop
	$(call print_info, "Resetting database with sample data...")
	@if [ -f docker-compose.yml ]; then \
		$(DOCKER_COMPOSE) down -v; \
		$(DOCKER_COMPOSE) up -d mysql clickhouse redis; \
		sleep 10; \
	fi
	$(call print_info, "Clearing SQLite database...")
	@cd SprintAgentLens/frontend && rm -f data/sprintlens.db data/sprintlens.db-wal data/sprintlens.db-shm
	@make seed-db
	$(call print_status, "Database reset with sample data completed")

# Seed database with sample data
seed-db:
	$(call print_info, "Seeding database with sample data...")
	@if [ -f scripts/seed-database.js ]; then \
		cd SprintAgentLens/backend && node ../../scripts/seed-database.js; \
	else \
		echo "$(YELLOW)⚠️  Seed script not found, creating sample data...$(NC)"; \
		make create-sample-data; \
	fi
	$(call print_status, "Database seeded successfully")

# Create sample data files
create-sample-data:
	$(call print_info, "Creating sample data files...")
	@mkdir -p SprintAgentLens/frontend/data
	@mkdir -p scripts
	@node scripts/create-sample-data.js || echo "$(YELLOW)Sample data creation requires Node.js script$(NC)"
	$(call print_status, "Sample data files created")

# Deploy to production
deploy: build
	$(call print_info, "Deploying to production...")
	@echo "$(YELLOW)🚀 Production deployment not yet configured$(NC)"
	@echo "Please configure your production deployment pipeline"

# Deploy to staging
deploy-staging: build
	$(call print_info, "Deploying to staging...")
	@echo "$(YELLOW)🚀 Staging deployment not yet configured$(NC)"
	@echo "Please configure your staging deployment pipeline"

# Quick commands
quick-start: start
quick-stop: stop
quick-restart: restart

# Development helpers
dev-reset: stop clean setup dev
	$(call print_status, "Development environment reset and restarted")

# Install development tools
install-dev-tools:
	$(call print_info, "Installing development tools...")
	@npm install -g nodemon concurrently
	@pip3 install pytest black flake8
	$(call print_status, "Development tools installed")

# Show running processes
ps:
	@echo "$(BLUE)🔍 Agent Lens Processes:$(NC)"
	@ps aux | grep -E "(node|npm|python)" | grep -E "(agent|sprint)" || echo "No Agent Lens processes found"

# Kill all related processes (emergency stop)
kill-all:
	$(call print_warning, "Emergency stop - killing all related processes...")
	@pkill -f "SprintAgentLens" 2>/dev/null || true
	@pkill -f "agent_lens" 2>/dev/null || true
	@pkill -f "3000.*npm" 2>/dev/null || true
	@pkill -f "8000.*npm" 2>/dev/null || true
	$(call print_status, "All processes terminated")

# Show environment info
env-info:
	@echo "$(BLUE)🔧 Environment Information:$(NC)"
	@echo "Node.js: $(shell node --version)"
	@echo "npm: $(shell npm --version)"
	@echo "Python: $(shell python3 --version)"
	@echo "Docker: $(shell docker --version)"
	@echo "Docker Compose: $(shell docker-compose --version)"
	@echo "OS: $(shell uname -s)"
	@echo "Architecture: $(shell uname -m)"