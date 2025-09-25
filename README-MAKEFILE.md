# Agent Lens Solution - Makefile Commands

A comprehensive Makefile for managing the entire Agent Lens solution with single commands.

## 🚀 Quick Start

```bash
# Complete setup from scratch
make setup

# Start all services
make start

# Stop all services  
make stop
```

## 📋 All Available Commands

### 🛠️ Setup & Installation

| Command | Description |
|---------|-------------|
| `make setup` | **Complete setup** - Install dependencies, configure environment, setup databases |
| `make install` | Install all dependencies only |
| `make config` | Configure environment files |
| `make check-deps` | Check system dependencies |

### 🚀 Service Management

| Command | Description |
|---------|-------------|
| `make start` | **Start all services** (backend, frontend, databases) |
| `make stop` | **Stop all services** |
| `make restart` | **Restart all services** |
| `make dev` | Start development environment with hot reload |

### 📊 Monitoring & Logs

| Command | Description |
|---------|-------------|
| `make status` | Check status of all services |
| `make logs` | Show logs from all services |
| `make logs-backend` | Show backend logs only |
| `make logs-frontend` | Show frontend logs only |
| `make health` | Run comprehensive health checks |

### 🧪 Development

| Command | Description |
|---------|-------------|
| `make test` | Run all tests |
| `make build` | Build all components |
| `make lint` | Run linting on all code |
| `make format` | Format all code |

### 🧹 Maintenance

| Command | Description |
|---------|-------------|
| `make clean` | Clean build artifacts and temporary files |
| `make reset` | Reset all data and configurations |
| `make kill-all` | Emergency stop - kill all related processes |

### 🚢 Deployment

| Command | Description |
|---------|-------------|
| `make deploy` | Deploy to production |
| `make deploy-staging` | Deploy to staging |

## 🔧 System Requirements

The Makefile automatically checks for:

- **Node.js** 18+
- **npm** (latest)
- **Python** 3.9+
- **Docker** & **Docker Compose**

## 📁 Project Structure

```
AgentVerse/
├── Makefile                    # Main management commands
├── docker-compose.yml          # Database services
├── .env.example               # Environment template
├── SprintAgentLens/
│   ├── backend/               # Backend service
│   ├── frontend/              # Frontend service
│   └── logs/                  # Service logs
└── Sprint_Lens_SDK/           # Python SDK
```

## 🌐 Service URLs

After running `make start`:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Database Admin** (optional): http://localhost:8080
- **Redis Admin** (optional): http://localhost:8081

## 🎯 Common Workflows

### First Time Setup
```bash
# 1. Clone and navigate to project
cd AgentVerse

# 2. Complete setup
make setup

# 3. Start services
make start
```

### Daily Development
```bash
# Start development environment
make dev

# Check service status
make status

# View logs
make logs

# Stop when done
make stop
```

### Troubleshooting
```bash
# Check what's running
make status

# View recent logs
make logs

# Health check all services
make health

# Emergency stop everything
make kill-all

# Clean and restart
make clean
make restart
```

### Testing & Building
```bash
# Run all tests
make test

# Lint and format code
make lint
make format

# Build for production
make build
```

## 🔒 Environment Configuration

The `make setup` command creates environment files:

- `.env` - Main environment configuration
- `SprintAgentLens/backend/.env` - Backend specific
- `SprintAgentLens/frontend/.env.local` - Frontend specific

### Default Database Configuration

| Service | Port | Credentials |
|---------|------|-------------|
| MySQL | 3306 | `agent_lens` / `agent_lens_pass` |
| ClickHouse | 8123, 9000 | `agent_lens` / `agent_lens_click` |
| Redis | 6379 | Password: `agent_lens_redis` |

## 🆘 Emergency Commands

If services become unresponsive:

```bash
# Nuclear option - kill everything
make kill-all

# Clean all artifacts
make clean

# Full reset (⚠️ deletes all data)
make reset

# Setup from scratch
make setup
```

## 🔍 Monitoring

### Real-time Status
```bash
# Check all service status
make status

# Monitor logs in real-time
make logs-backend    # Backend only
make logs-frontend   # Frontend only
```

### Process Management
```bash
# Show running processes
make ps

# Environment information
make env-info
```

## 🎨 Output Colors

The Makefile uses colored output:
- 🟢 **Green**: Success messages
- 🔵 **Blue**: Information
- 🟡 **Yellow**: Warnings
- 🔴 **Red**: Errors

## 📝 Notes

- **Logs Directory**: `SprintAgentLens/logs/` (created automatically)
- **PID Files**: Service PIDs stored in logs directory for clean shutdown
- **Database Data**: Persisted in Docker volumes
- **Hot Reload**: `make dev` enables hot reload for both frontend and backend

## 🤝 Contributing

When adding new services or features:

1. Update the Makefile with relevant commands
2. Add service to docker-compose.yml if needed
3. Update this README with new commands
4. Test all make commands work correctly

## 📞 Help

Run `make help` or just `make` to see all available commands with descriptions.