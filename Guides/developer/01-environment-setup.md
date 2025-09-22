# Part 1: Environment Setup

Setting up your development environment for building AI agents with Agent Lens integration.

## 🎯 What You'll Learn

- Install and configure uv and poetry for Python dependency management
- Set up your Python development environment
- Verify Agent Lens backend connectivity
- Configure environment variables for secure development

## 📋 Prerequisites

- Python 3.9 or higher
- Agent Lens backend running (assumed working)
- Git for version control
- Code editor (VS Code recommended)

## 🛠️ Installation Steps

### Step 1: Install uv (Universal Python Package Installer)

uv is a fast Python package installer and resolver, perfect for our agent development.

```bash
# Install uv via curl (macOS/Linux)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or via brew (macOS)
brew install uv

# Or via pip
pip install uv
```

Verify installation:
```bash
uv --version
# Should output: uv 0.4.0 (or later)
```

### Step 2: Install Poetry

Poetry manages Python dependencies and virtual environments elegantly.

```bash
# Install poetry via official installer
curl -sSL https://install.python-poetry.org | python3 -

# Or via pip
pip install poetry
```

Verify installation:
```bash
poetry --version
# Should output: Poetry (version 1.7.0 or later)
```

### Step 3: Create Your Agent Project

```bash
# Create project directory
mkdir customer-support-agent
cd customer-support-agent

# Initialize poetry project
poetry init --name customer-support-agent --description "AI Customer Support Agent with Agent Lens" --author "Your Name <your.email@example.com>" --python "^3.9"

# Create virtual environment
poetry install
```

### Step 4: Configure Poetry for uv Integration

Create `pyproject.toml` with optimized configuration:

```toml
[tool.poetry]
name = "customer-support-agent"
version = "0.1.0"
description = "AI Customer Support Agent with Agent Lens integration"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"
packages = [{include = "customer_support_agent", from = "src"}]

[tool.poetry.dependencies]
python = "^3.9"
sprintlens = "^1.0.0"
langgraph = "^0.2.0"
langchain = "^0.3.0"
langchain-openai = "^0.2.0"
python-dotenv = "^1.0.0"
pydantic = "^2.8.0"
httpx = "^0.27.0"
uvicorn = "^0.30.0"
fastapi = "^0.115.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.3.0"
pytest-asyncio = "^0.24.0"
black = "^24.8.0"
ruff = "^0.6.0"
mypy = "^1.11.0"
jupyter = "^1.1.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"

[tool.ruff]
line-length = 88
target-version = "py39"

[tool.black]
line-length = 88
target-version = ['py39']

[tool.mypy]
python_version = "3.9"
disallow_untyped_defs = true
strict = true
```

### Step 5: Create Project Structure

```bash
# Create source directory structure
mkdir -p src/customer_support_agent/{agents,tools,utils,config}
mkdir -p tests/{unit,integration}
mkdir -p data/{datasets,prompts}
mkdir -p docs
mkdir -p scripts

# Create __init__.py files
touch src/customer_support_agent/__init__.py
touch src/customer_support_agent/agents/__init__.py
touch src/customer_support_agent/tools/__init__.py
touch src/customer_support_agent/utils/__init__.py
touch src/customer_support_agent/config/__init__.py
touch tests/__init__.py
```

Your project structure should look like:

```
customer-support-agent/
├── src/
│   └── customer_support_agent/
│       ├── __init__.py
│       ├── agents/
│       ├── tools/
│       ├── utils/
│       └── config/
├── tests/
│   ├── unit/
│   └── integration/
├── data/
│   ├── datasets/
│   └── prompts/
├── docs/
├── scripts/
├── pyproject.toml
└── README.md
```

### Step 6: Configure Environment Variables

Create `.env` file for secure configuration:

```bash
# Create environment file
touch .env
```

Add the following to `.env`:

```env
# Agent Lens Configuration
AGENT_LENS_URL=http://localhost:3000
AGENT_LENS_USERNAME=your_username
AGENT_LENS_PASSWORD=your_password
AGENT_LENS_PROJECT_ID=your_project_id

# LLM Provider Configuration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini

# Agent Configuration
AGENT_NAME=customer-support-agent
AGENT_VERSION=1.0.0
ENVIRONMENT=development

# Logging Configuration
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance Configuration
MAX_RETRIES=3
TIMEOUT_SECONDS=30
```

Create `.env.example` for team sharing:

```bash
cp .env .env.example
# Edit .env.example to remove sensitive values
```

### Step 7: Install Dependencies

```bash
# Install all dependencies using poetry with uv
poetry config installer.modern-installation false
poetry install

# Activate virtual environment
poetry shell
```

### Step 8: Verify Installation

Create `scripts/verify_setup.py`:

```python
#!/usr/bin/env python3
"""
Verify that the development environment is properly set up.
"""

import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check Python version compatibility."""
    version = sys.version_info
    if version.major != 3 or version.minor < 9:
        print("❌ Python 3.9+ required")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro}")
    return True

def check_package(package_name: str) -> bool:
    """Check if a package is importable."""
    try:
        __import__(package_name)
        print(f"✅ {package_name}")
        return True
    except ImportError:
        print(f"❌ {package_name}")
        return False

def check_environment():
    """Check environment variables."""
    env_file = Path(".env")
    if not env_file.exists():
        print("❌ .env file not found")
        return False
    print("✅ .env file exists")
    return True

def main():
    """Run all verification checks."""
    print("🔍 Verifying Agent Development Environment\n")
    
    checks = [
        check_python_version(),
        check_package("sprintlens"),
        check_package("langgraph"), 
        check_package("langchain"),
        check_package("openai"),
        check_package("dotenv"),
        check_environment()
    ]
    
    if all(checks):
        print("\n🎉 Environment setup complete! Ready to build agents.")
        return 0
    else:
        print("\n❌ Setup incomplete. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
```

Run verification:

```bash
poetry run python scripts/verify_setup.py
```

### Step 9: Create Basic Configuration

Create `src/customer_support_agent/config/settings.py`:

```python
"""
Configuration settings for the customer support agent.
"""

import os
from pathlib import Path
from pydantic import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class AgentLensSettings(BaseSettings):
    """Agent Lens configuration settings."""
    
    url: str = os.getenv("AGENT_LENS_URL", "http://localhost:3000")
    username: str = os.getenv("AGENT_LENS_USERNAME", "")
    password: str = os.getenv("AGENT_LENS_PASSWORD", "")
    project_id: str = os.getenv("AGENT_LENS_PROJECT_ID", "")
    
    class Config:
        env_prefix = "AGENT_LENS_"

class LLMSettings(BaseSettings):
    """LLM provider configuration."""
    
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    class Config:
        env_prefix = "OPENAI_"

class AgentSettings(BaseSettings):
    """Agent-specific configuration."""
    
    name: str = os.getenv("AGENT_NAME", "customer-support-agent")
    version: str = os.getenv("AGENT_VERSION", "1.0.0")
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # Performance settings
    max_retries: int = int(os.getenv("MAX_RETRIES", "3"))
    timeout_seconds: int = int(os.getenv("TIMEOUT_SECONDS", "30"))
    
    class Config:
        env_prefix = "AGENT_"

# Global settings instances
agent_lens_settings = AgentLensSettings()
llm_settings = LLMSettings()
agent_settings = AgentSettings()

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DATASETS_DIR = DATA_DIR / "datasets"
PROMPTS_DIR = DATA_DIR / "prompts"
```

## 🧪 Testing Your Setup

Create `tests/test_environment.py`:

```python
"""
Test environment setup and configuration.
"""

import pytest
from customer_support_agent.config.settings import (
    agent_lens_settings,
    llm_settings,
    agent_settings
)

def test_agent_lens_configuration():
    """Test Agent Lens configuration is loaded."""
    assert agent_lens_settings.url
    assert agent_lens_settings.project_id

def test_llm_configuration():
    """Test LLM configuration is loaded."""
    assert llm_settings.openai_api_key
    assert llm_settings.openai_model

def test_agent_configuration():
    """Test agent configuration is loaded."""
    assert agent_settings.name
    assert agent_settings.version
    assert agent_settings.environment

@pytest.mark.asyncio
async def test_import_dependencies():
    """Test that all required dependencies can be imported."""
    import sprintlens
    import langgraph
    import langchain
    
    # Test basic imports work
    assert sprintlens.__version__
    assert hasattr(langgraph, 'StateGraph')
    assert hasattr(langchain, 'LLMChain')
```

Run tests:

```bash
poetry run pytest tests/test_environment.py -v
```

## 📝 Development Workflow

### Daily Development Commands

```bash
# Activate virtual environment
poetry shell

# Install new dependencies
poetry add package-name

# Run tests
poetry run pytest

# Format code
poetry run black src/ tests/

# Lint code
poetry run ruff check src/ tests/

# Type checking
poetry run mypy src/
```

### Environment Management

```bash
# Show virtual environment info
poetry env info

# Remove virtual environment
poetry env remove python

# Recreate virtual environment
poetry install

# Export requirements for production
poetry export -f requirements.txt --output requirements.txt
```

## ⚠️ Important Security Notes

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Rotate API keys regularly** in production
4. **Use separate environments** for dev/staging/production

Create `.gitignore`:

```bash
# Environment files
.env
.env.local

# Python
__pycache__/
*.py[cod]
*$py.class
.pytest_cache/
.coverage
htmlcov/

# Poetry
poetry.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Data (optional - depending on data sensitivity)
data/datasets/*.csv
data/datasets/*.json
```

## 🎯 Next Steps

Your development environment is now ready! In the next tutorial, we'll:

1. Install and configure the Agent Lens SDK
2. Test connectivity to your Agent Lens backend
3. Create your first traced function

Continue to [02-sdk-installation.md](./02-sdk-installation.md) →

## 📚 Additional Resources

- [Poetry Documentation](https://python-poetry.org/docs/)
- [uv Documentation](https://github.com/astral-sh/uv)
- [Pydantic Settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/)
- [Python Environment Best Practices](https://docs.python.org/3/tutorial/venv.html)

---

**Troubleshooting:**

- **Poetry not found**: Make sure to restart your terminal after installation
- **Python version issues**: Use `poetry env use python3.9` to specify version
- **Permission errors**: Use `--user` flag or check folder permissions
- **Environment variables not loading**: Verify `.env` file location and format