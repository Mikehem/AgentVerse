# Customer Support Agent ✅

AI-powered customer support agent built with LangGraph and Sprint Lens SDK integration.

## 🎉 **100% Working Sprint Lens Integration**

All Sprint Lens tracing patterns are fully functional with reliable trace persistence:
- ✅ **Pattern 1**: Automatic Function Tracing (`@sprintlens.track()`)
- ✅ **Pattern 2**: Manual Trace Management (custom spans)  
- ✅ **Pattern 3**: Context Propagation (automatic grouping)
- ✅ **Cross-platform compatibility**: Works across multiple `asyncio.run()` calls
- ✅ **Reliable trace persistence**: All traces successfully sent to backend

## Features

- **Conversational AI** with memory and context management
- **Tool integration** for accessing external APIs
- **Comprehensive tracing** of all agent operations
- **Real-time evaluation** with custom metrics
- **Cost monitoring** and performance analytics

## Quick Start

1. Install dependencies:
```bash
poetry install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

3. Activate virtual environment:
```bash
poetry shell
```

4. Run the agent:
```bash
python src/customer_support_agent/main.py
```

## 🚀 Sprint Lens Examples

Test all three Sprint Lens tracing patterns with our comprehensive examples:

```bash
# Pattern 1: Automatic Function Tracing (simplest)
poetry run python src/customer_support_agent/examples/pattern1_automatic_tracing.py

# Pattern 2: Manual Trace Management (most control)
poetry run python src/customer_support_agent/examples/pattern2_manual_tracing.py

# Pattern 3: Context Propagation (best of both worlds)
poetry run python src/customer_support_agent/examples/pattern3_context_propagation.py

# Compare all patterns side by side
poetry run python src/customer_support_agent/examples/patterns_comparison.py
```

**View Results**: http://localhost:3001/traces (Filter: `agent_id = agent_simpleag_mfw0ut5k`)

See the [examples README](src/customer_support_agent/examples/README.md) for detailed pattern comparison and usage guides.

## Development

- **Format code**: `poetry run black src/ tests/`
- **Lint code**: `poetry run ruff check src/ tests/`
- **Run tests**: `poetry run pytest`
- **Type checking**: `poetry run mypy src/`

## Architecture

Built using:
- **LangGraph** for agent workflow orchestration
- **Agent Lens** for observability and monitoring
- **FastAPI** for API endpoints
- **Pydantic** for data validation

## Documentation

See the [developer guides](../../Guides/developer/) for detailed tutorials and examples.