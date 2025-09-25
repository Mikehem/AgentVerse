# SprintLens Development Makefile
.PHONY: help start stop clean install frontend backend dev-frontend dev-backend

# Colors for output
GREEN := \033[32m
RED := \033[31m
BLUE := \033[34m
YELLOW := \033[33m
NC := \033[0m

help: ## Show this help message
	@echo "$(GREEN)SprintLens Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(BLUE)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies for both frontend and backend
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	cd frontend && npm install
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	cd backend && npm install
	@echo "$(GREEN)✅ All dependencies installed$(NC)"

clean: ## Clean build artifacts and node_modules
	@echo "$(YELLOW)Cleaning frontend...$(NC)"
	cd frontend && rm -rf .next node_modules
	@echo "$(YELLOW)Cleaning backend...$(NC)"
	cd backend && rm -rf dist node_modules
	@echo "$(GREEN)✅ Clean complete$(NC)"

stop: ## Stop all running services
	@echo "$(YELLOW)Stopping all SprintLens services...$(NC)"
	-lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || true
	-pkill -f "npm run dev" 2>/dev/null || true
	@echo "$(GREEN)✅ All services stopped$(NC)"

dev-frontend: ## Start frontend in development mode
	@echo "$(BLUE)Starting frontend on port 3001...$(NC)"
	cd frontend && PORT=3001 npm run dev

dev-backend: ## Start backend in development mode
	@echo "$(BLUE)Starting backend on port 3000...$(NC)"
	cd backend && MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev

start: stop ## Start both frontend and backend services
	@echo "$(GREEN)🚀 Starting SprintLens Solution...$(NC)"
	@echo "$(BLUE)Frontend will be available at: http://localhost:3001$(NC)"
	@echo "$(BLUE)Backend will be available at: http://localhost:3000$(NC)"
	@echo ""
	@echo "$(YELLOW)Starting backend...$(NC)"
	cd backend && MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev &
	@sleep 3
	@echo "$(YELLOW)Starting frontend...$(NC)"
	cd frontend && rm -rf .next && PORT=3001 npm run dev &
	@echo "$(GREEN)✅ Both services started$(NC)"
	@echo "$(BLUE)Press Ctrl+C to stop, or run 'make stop' to stop services$(NC)"

status: ## Check status of services
	@echo "$(BLUE)Checking service status...$(NC)"
	@if lsof -i:3000 >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Backend running on port 3000$(NC)"; \
	else \
		echo "$(RED)❌ Backend not running on port 3000$(NC)"; \
	fi
	@if lsof -i:3001 >/dev/null 2>&1; then \
		echo "$(GREEN)✅ Frontend running on port 3001$(NC)"; \
	else \
		echo "$(RED)❌ Frontend not running on port 3001$(NC)"; \
	fi

logs-frontend: ## Show frontend logs
	@echo "$(BLUE)Frontend logs (use Ctrl+C to exit):$(NC)"
	cd frontend && npm run dev

logs-backend: ## Show backend logs
	@echo "$(BLUE)Backend logs (use Ctrl+C to exit):$(NC)"
	cd backend && MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev

health: ## Check health of services
	@echo "$(BLUE)Checking service health...$(NC)"
	@curl -s http://localhost:3001/api/health 2>/dev/null && echo "$(GREEN)✅ Frontend health OK$(NC)" || echo "$(RED)❌ Frontend health failed$(NC)"
	@curl -s http://localhost:3000/health/ping 2>/dev/null && echo "$(GREEN)✅ Backend health OK$(NC)" || echo "$(RED)❌ Backend health failed$(NC)"

restart: stop start ## Restart both services

dev: start ## Alias for start command