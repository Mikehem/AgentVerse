# AgentVerse

A comprehensive AI agent development and observability platform featuring Sprint Agent Lens integration.

## 📁 Project Structure

```
AgentVerse/
├── SprintAgentLens/          # Backend observability platform
│   ├── backend/              # Node.js backend with enterprise auth
│   └── frontend/             # React frontend dashboard
│
├── Sprint_Lens_SDK/          # Python SDK for observability
│   ├── src/sprintlens/       # SDK source code
│   ├── tests/                # Comprehensive test suite
│   └── docs/                 # SDK documentation
│
└── Agents/                   # AI agent implementations
    └── SimpleAgent/          # Demo agent with full observability
        ├── simple_agent.py   # Main agent implementation
        ├── test_agent.py     # Test runner
        ├── requirements.txt  # Python dependencies
        ├── .env.example      # Environment template
        └── README.md         # Agent documentation
```

## 🚀 Quick Start

1. **Start the Backend:**
   ```bash
   cd SprintAgentLens/backend
   MYSQL_PASSWORD="" CLICKHOUSE_PASSWORD="" REDIS_PASSWORD="" npm run dev
   ```

2. **Set up the Simple Agent:**
   ```bash
   cd Agents/SimpleAgent
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your Azure OpenAI credentials
   ```

3. **Run the Agent:**
   ```bash
   python simple_agent.py
   ```

## 🔧 Environment Configuration

The Simple Agent requires the following environment variables:

### Azure OpenAI Configuration
- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT`: Your deployment name (e.g., "gpt-4")
- `AZURE_OPENAI_API_VERSION`: API version (e.g., "2024-02-15-preview")

### Sprint Agent Lens Configuration
- `SPRINTLENS_URL`: Backend URL (default: "http://localhost:3000")
- `SPRINTLENS_USERNAME`: Username (default: "admin")
- `SPRINTLENS_PASSWORD`: Password (default: "MasterAdmin2024!")
- `SPRINTLENS_WORKSPACE_ID`: Workspace ID (default: "default")
- `SPRINTLENS_PROJECT_NAME`: Project name (default: "SimpleAgent")

## 🎯 Features

- **🤖 AI Agents**: Build sophisticated AI agents with Azure OpenAI
- **📊 Full Observability**: Complete tracing with Sprint Agent Lens
- **🔍 Detailed Metrics**: Token usage, costs, performance monitoring
- **📈 Evaluation Framework**: Comprehensive agent evaluation tools
- **🔐 Enterprise Security**: JWT authentication and workspace isolation
- **🎛️ Dashboard**: Web-based monitoring and analytics
- **🔄 Batch Processing**: Handle multiple conversations efficiently
- **📊 Statistical Analysis**: Advanced evaluation analytics

## 🏗️ Architecture

The AgentVerse platform consists of three main components:

1. **Sprint Agent Lens Backend**: Enterprise observability platform
2. **Sprint Lens SDK**: Python SDK for agent integration
3. **AI Agents**: Individual agent implementations with full observability

All components work together to provide comprehensive AI agent development, monitoring, and evaluation capabilities.