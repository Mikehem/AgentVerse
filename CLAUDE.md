# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (Next.js)
```bash
cd SprintAgentLens/frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend (Fastify + TypeScript)
```bash
cd SprintAgentLens/backend
npm run dev      # Start development server with watch mode
npm run build    # Build TypeScript to JavaScript
npm run start    # Start production server
npm run test     # Run all tests
npm run test:unit            # Unit tests only
npm run test:integration     # Integration tests only
npm run test:e2e            # End-to-end tests
npm run test:coverage       # Tests with coverage report
npm run lint                # ESLint
npm run lint:fix            # Auto-fix ESLint issues
npm run typecheck           # TypeScript type checking
npm run format              # Prettier formatting
npm run validate            # Run typecheck + lint + unit tests

# Database operations
npm run db:generate         # Generate Prisma client
npm run db:migrate          # Run database migrations
npm run db:seed            # Seed database with test data
npm run db:studio          # Open Prisma Studio
npm run db:reset           # Reset database and re-run migrations
```

### Sprint Lens SDK (Python)
```bash
cd Sprint_Lens_SDK
pip install -e .            # Install in development mode
pip install -e ".[dev]"     # Install with dev dependencies
pip install -e ".[all]"     # Install with all optional dependencies

# Testing and Quality
pytest                      # Run tests
pytest -m "not slow"       # Skip slow tests
pytest --cov=sprintlens    # Run with coverage
black src/ tests/          # Format code
ruff check src/ tests/     # Lint code
mypy src/                  # Type checking
```

## Architecture Overview

### Three-Tier System
1. **SprintAgentLens Backend**: Enterprise-grade observability platform (Node.js/Fastify)
2. **SprintAgentLens Frontend**: React dashboard for monitoring and analytics (Next.js)
3. **Sprint Lens SDK**: Python SDK for agent instrumentation and data collection

### Backend Architecture (`SprintAgentLens/backend/`)
- **Framework**: Fastify with TypeScript
- **Database**: Prisma ORM with MySQL + ClickHouse for analytics
- **Authentication**: JWT-based with enterprise features
- **API**: RESTful with OpenAPI/Swagger documentation
- **Monitoring**: OpenTelemetry integration
- **Background Jobs**: Bull queue system
- **Entry Point**: `src/server.ts`
- **Routes**: Organized in `src/routes/`
- **Middleware**: Authentication, security, logging in `src/middleware/`

### Frontend Architecture (`SprintAgentLens/frontend/`)
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS + shadcn/ui components
- **Database**: SQLite for local data (better-sqlite3)
- **State Management**: React hooks and context
- **Charts**: Recharts for data visualization
- **Key Pages**:
  - `/projects/[id]` - Project dashboard
  - `/conversations` - Conversation monitoring
  - `/traces` - Distributed tracing view
  - `/datasets` - Dataset management

### SDK Architecture (`Sprint_Lens_SDK/`)
- **Core**: Client and tracing in `src/sprintlens/core/`
- **Integrations**: LLM providers (OpenAI, Anthropic, Azure) and frameworks (LangChain, LlamaIndex)
- **Evaluation**: Built-in metrics and custom evaluators
- **CLI**: Command-line interface via `sprintlens` command
- **Distribution**: Hatch-based build system

## Database Architecture

### Backend Database (Prisma)
- **Primary**: MySQL for core data (users, projects, traces)
- **Analytics**: ClickHouse for time-series metrics and large-scale analytics
- **Schema**: `SprintAgentLens/backend/prisma/schema.prisma`

### Frontend Database
- **SQLite**: Local development database in `data/sprintlens.db`
- **Purpose**: Caching and local state management

## Environment Configuration

### Backend Environment Variables
Required for backend development:
```bash
DATABASE_URL="mysql://..."
CLICKHOUSE_URL="http://..."
REDIS_URL="redis://..."
JWT_SECRET="..."
```

For development, empty password environment can be used:
```bash
MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev
```

### Agent Environment Variables
Agents typically require:
```bash
# Azure OpenAI
AZURE_OPENAI_API_KEY="..."
AZURE_OPENAI_ENDPOINT="..."
AZURE_OPENAI_DEPLOYMENT="..."
AZURE_OPENAI_API_VERSION="2024-02-15-preview"

# Sprint Lens Integration
SPRINTLENS_URL="http://localhost:3000"
SPRINTLENS_USERNAME="admin"
SPRINTLENS_PASSWORD="MasterAdmin2024!"
SPRINTLENS_PROJECT_NAME="..."
```

## Testing Strategy

### Backend Testing
- **Unit Tests**: Individual function/class testing
- **Integration Tests**: API endpoint testing with test database
- **E2E Tests**: Full workflow testing
- **Performance Tests**: Load and stress testing
- **Coverage Target**: Maintain >80% code coverage

### SDK Testing
- **Pytest**: Primary testing framework
- **Markers**: Use `@pytest.mark.slow` for tests >1s
- **Integration**: Tests requiring backend use `@pytest.mark.requires_backend`
- **Mocking**: Extensive use of pytest-mock for external dependencies

## Key Patterns

### Error Handling
- Backend uses structured error responses with proper HTTP status codes
- SDK uses tenacity for retry logic with exponential backoff
- All errors are logged with structured logging (Pino/structlog)

### Authentication Flow
- JWT tokens for API authentication
- Workspace-based isolation for multi-tenancy
- Role-based access control (RBAC)

### Data Flow
1. Agents use SDK to collect traces/metrics
2. SDK sends data to backend via REST API
3. Backend stores in MySQL/ClickHouse
4. Frontend queries backend and displays in dashboard

### Code Organization
- **Backend**: Feature-based organization (`routes/`, `services/`, `middleware/`)
- **Frontend**: Page-based routing with shared components
- **SDK**: Layered architecture (core → integrations → high-level APIs)