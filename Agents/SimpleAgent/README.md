# Simple Agent with Sprint Agent Lens Integration

A demonstration agent that showcases Sprint Agent Lens observability, tracing, and evaluation capabilities using Azure OpenAI as the LLM provider.

## Features

- 🤖 **Simple AI Agent**: Basic conversational AI agent
- 🔍 **Full Observability**: Complete tracing with Sprint Agent Lens
- ⚡ **Azure OpenAI**: Production-ready LLM integration
- 📊 **Automatic Metrics**: Token usage, cost tracking, performance monitoring
- 🔄 **Evaluation Ready**: Built-in evaluation and feedback collection

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables (see `.env.example`)

3. Run the agent:
   ```bash
   python simple_agent.py
   ```

## Environment Variables Required

Please provide the following environment variables:

- `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
- `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
- `AZURE_OPENAI_DEPLOYMENT`: Your deployment name (e.g., "gpt-4")
- `AZURE_OPENAI_API_VERSION`: API version (e.g., "2024-02-15-preview")
- `SPRINTLENS_URL`: Sprint Agent Lens backend URL (e.g., "http://localhost:3000")
- `SPRINTLENS_USERNAME`: Username for authentication
- `SPRINTLENS_PASSWORD`: Password for authentication
- `SPRINTLENS_WORKSPACE_ID`: Workspace ID (e.g., "default")
- `SPRINTLENS_PROJECT_NAME`: Project name for organizing traces