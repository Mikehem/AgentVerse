'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { 
  Download, 
  Code, 
  FileText, 
  Package,
  Settings,
  Play,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Folder,
  File,
  GitBranch,
  Zap,
  Save,
  RotateCcw,
  Eye,
  Edit
} from 'lucide-react'

interface CodeGenerationConfig {
  projectName: string
  framework: 'langchain' | 'langgraph'
  pythonVersion: string
  packageManager: 'pip' | 'poetry' | 'conda'
  includeTests: boolean
  includeDocumentation: boolean
  includeExamples: boolean
  includeDocker: boolean
  deploymentTarget: 'local' | 'aws' | 'azure' | 'gcp' | 'heroku'
}

interface GeneratedFile {
  path: string
  content: string
  type: 'python' | 'config' | 'documentation' | 'docker' | 'test'
  size: number
}

interface CodeGeneratorProps {
  agent: any
  multiAgentSystem?: any
  onExportComplete: (files: GeneratedFile[]) => void
}

const frameworkTemplates = {
  langchain: {
    dependencies: [
      'langchain>=0.1.0',
      'openai>=1.0.0',
      'anthropic>=0.8.0',
      'python-dotenv>=1.0.0',
      'pydantic>=2.0.0',
      'requests>=2.31.0'
    ],
    imports: [
      'from langchain.agents import initialize_agent, AgentType',
      'from langchain.llms import OpenAI, ChatOpenAI',
      'from langchain.tools import Tool',
      'from langchain.memory import ConversationBufferMemory',
      'from langchain.prompts import PromptTemplate',
      'from langchain.chains import LLMChain'
    ]
  },
  langgraph: {
    dependencies: [
      'langgraph>=0.1.0',
      'langchain>=0.1.0',
      'openai>=1.0.0',
      'anthropic>=0.8.0',
      'python-dotenv>=1.0.0',
      'pydantic>=2.0.0',
      'typing-extensions>=4.0.0'
    ],
    imports: [
      'from langgraph.graph import StateGraph, END',
      'from langgraph.prebuilt import ToolExecutor, ToolInvocation',
      'from langchain.llms import OpenAI, ChatOpenAI',
      'from langchain.tools import Tool',
      'from typing import TypedDict, Annotated, List',
      'import operator'
    ]
  }
}

export function CodeGenerator({ agent, multiAgentSystem, onExportComplete }: CodeGeneratorProps) {
  const [config, setConfig] = useState<CodeGenerationConfig>({
    projectName: agent?.name?.replace(/\s+/g, '_').toLowerCase() || 'my_agent',
    framework: agent?.framework || 'langchain',
    pythonVersion: '3.9',
    packageManager: 'pip',
    includeTests: true,
    includeDocumentation: true,
    includeExamples: true,
    includeDocker: false,
    deploymentTarget: 'local'
  })

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<GeneratedFile | null>(null)
  const [activeTab, setActiveTab] = useState('config')

  const generateMainAgentFile = useCallback(() => {
    const template = frameworkTemplates[config.framework]
    const agentName = config.projectName.replace(/[^a-zA-Z0-9]/g, '_')
    const className = agentName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')

    if (config.framework === 'langchain') {
      return `"""
${className} - Generated LangChain Agent
${agent?.description || 'AI Agent built with LangChain framework'}
"""

import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv

${template.imports.join('\n')}

# Load environment variables
load_dotenv()

class ${className}:
    """Main agent class implementing ${agent?.description || 'AI agent functionality'}"""
    
    def __init__(self, 
                 temperature: float = ${agent?.config?.temperature || 0.7},
                 max_tokens: int = ${agent?.config?.maxTokens || 1000},
                 model: str = "${agent?.config?.model || 'gpt-4'}",
                 verbose: bool = True):
        """
        Initialize the ${className} agent
        
        Args:
            temperature: LLM temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            model: LLM model to use
            verbose: Enable verbose logging
        """
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.model = model
        self.verbose = verbose
        
        # Initialize LLM
        self.llm = self._initialize_llm()
        
        # Initialize tools
        self.tools = self._initialize_tools()
        
        # Initialize memory
        self.memory = self._initialize_memory()
        
        # Initialize agent
        self.agent = self._initialize_agent()
    
    def _initialize_llm(self):
        """Initialize the language model"""
        llm_provider = "${agent?.config?.llmProvider || 'openai'}"
        
        if llm_provider == "openai":
            return ChatOpenAI(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
        elif llm_provider == "anthropic":
            from langchain.llms import Anthropic
            return Anthropic(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_provider}")
    
    def _initialize_tools(self) -> List[Tool]:
        """Initialize agent tools"""
        tools = []
        
        ${agent?.tools?.map((tool: any) => `
        # ${tool.name} Tool
        def ${tool.name.replace(/\s+/g, '_').toLowerCase()}_tool(query: str) -> str:
            """${tool.description || `Execute ${tool.name} functionality`}"""
            # TODO: Implement ${tool.name} logic
            return f"${tool.name} executed with query: {query}"
        
        tools.append(Tool(
            name="${tool.name}",
            description="${tool.description || `Tool for ${tool.name.toLowerCase()}`}",
            func=${tool.name.replace(/\s+/g, '_').toLowerCase()}_tool
        ))`).join('\n        ') || '        # No tools configured'}
        
        return tools
    
    def _initialize_memory(self):
        """Initialize agent memory"""
        return ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            output_key="output"
        )
    
    def _initialize_agent(self):
        """Initialize the main agent"""
        return initialize_agent(
            tools=self.tools,
            llm=self.llm,
            agent=AgentType.CONVERSATIONAL_REACT_DESCRIPTION,
            memory=self.memory,
            verbose=self.verbose,
            handle_parsing_errors=True,
            max_iterations=3
        )
    
    def run(self, input_text: str) -> str:
        """
        Run the agent with the given input
        
        Args:
            input_text: Input message for the agent
            
        Returns:
            Agent response
        """
        try:
            response = self.agent.run(input_text)
            return response
        except Exception as e:
            if self.verbose:
                print(f"Error running agent: {e}")
            return f"I apologize, but I encountered an error processing your request: {str(e)}"
    
    def reset_memory(self):
        """Reset the agent's conversation memory"""
        self.memory.clear()
    
    def get_memory_summary(self) -> Dict[str, Any]:
        """Get a summary of the agent's memory"""
        return {
            "message_count": len(self.memory.chat_memory.messages),
            "memory_type": type(self.memory).__name__
        }

# Example usage
if __name__ == "__main__":
    # Create agent instance
    agent = ${className}()
    
    # Example conversation
    print("${className} Agent Started!")
    print("Type 'quit' to exit\\n")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() in ['quit', 'exit', 'bye']:
            break
        
        response = agent.run(user_input)
        print(f"Agent: {response}\\n")
    
    print("Agent session ended.")
`
    } else {
      return `"""
${className} - Generated LangGraph Agent
${agent?.description || 'AI Agent built with LangGraph framework'}
"""

import os
from typing import List, Dict, Any, Optional, TypedDict, Annotated
from dotenv import load_dotenv
import operator

${template.imports.join('\n')}

# Load environment variables
load_dotenv()

# Define agent state
class AgentState(TypedDict):
    """State passed between nodes in the agent graph"""
    messages: Annotated[List[str], operator.add]
    current_tool: Optional[str]
    tool_results: List[str]
    error_message: Optional[str]
    iteration_count: int

class ${className}:
    """Main agent class implementing LangGraph-based agent"""
    
    def __init__(self, 
                 temperature: float = ${agent?.config?.temperature || 0.7},
                 max_tokens: int = ${agent?.config?.maxTokens || 1000},
                 model: str = "${agent?.config?.model || 'gpt-4'}",
                 verbose: bool = True):
        """
        Initialize the ${className} agent
        
        Args:
            temperature: LLM temperature (0.0 to 1.0)
            max_tokens: Maximum tokens in response
            model: LLM model to use
            verbose: Enable verbose logging
        """
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.model = model
        self.verbose = verbose
        
        # Initialize LLM
        self.llm = self._initialize_llm()
        
        # Initialize tools
        self.tools = self._initialize_tools()
        
        # Build graph
        self.app = self._build_graph()
    
    def _initialize_llm(self):
        """Initialize the language model"""
        llm_provider = "${agent?.config?.llmProvider || 'openai'}"
        
        if llm_provider == "openai":
            return ChatOpenAI(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                openai_api_key=os.getenv("OPENAI_API_KEY")
            )
        elif llm_provider == "anthropic":
            from langchain.llms import Anthropic
            return Anthropic(
                model=self.model,
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_provider}")
    
    def _initialize_tools(self) -> List[Tool]:
        """Initialize agent tools"""
        tools = []
        
        ${agent?.tools?.map((tool: any) => `
        # ${tool.name} Tool
        def ${tool.name.replace(/\s+/g, '_').toLowerCase()}_tool(query: str) -> str:
            """${tool.description || `Execute ${tool.name} functionality`}"""
            # TODO: Implement ${tool.name} logic
            return f"${tool.name} executed with query: {query}"
        
        tools.append(Tool(
            name="${tool.name}",
            description="${tool.description || `Tool for ${tool.name.toLowerCase()}`}",
            func=${tool.name.replace(/\s+/g, '_').toLowerCase()}_tool
        ))`).join('\n        ') || '        # No tools configured'}
        
        return tools
    
    def _agent_node(self, state: AgentState) -> AgentState:
        """Main agent reasoning node"""
        try:
            # Get the latest message
            latest_message = state["messages"][-1] if state["messages"] else ""
            
            # Create system prompt
            system_prompt = """${agent?.config?.systemPrompt || 'You are a helpful AI assistant.'}
            
Available tools: ${agent?.tools?.map((tool: any) => tool.name).join(', ') || 'None'}

Process the user's request and determine if you need to use any tools or if you can respond directly.
"""
            
            # Generate response
            prompt = f"{system_prompt}\\n\\nUser: {latest_message}"
            response = self.llm.predict(prompt)
            
            return {
                **state,
                "messages": [response],
                "iteration_count": state.get("iteration_count", 0) + 1
            }
        except Exception as e:
            return {
                **state,
                "error_message": str(e),
                "messages": [f"Error in agent processing: {str(e)}"]
            }
    
    def _tool_node(self, state: AgentState) -> AgentState:
        """Tool execution node"""
        try:
            tool_name = state.get("current_tool")
            if not tool_name:
                return state
            
            # Find and execute the tool
            tool = next((t for t in self.tools if t.name == tool_name), None)
            if tool:
                latest_message = state["messages"][-1] if state["messages"] else ""
                result = tool.func(latest_message)
                return {
                    **state,
                    "tool_results": [result],
                    "current_tool": None
                }
            else:
                return {
                    **state,
                    "error_message": f"Tool {tool_name} not found"
                }
        except Exception as e:
            return {
                **state,
                "error_message": str(e)
            }
    
    def _should_continue(self, state: AgentState) -> str:
        """Determine next step in the graph"""
        if state.get("error_message"):
            return "end"
        
        if state.get("iteration_count", 0) >= 3:
            return "end"
        
        # Simple logic: if we have a tool result, go to agent, otherwise end
        if state.get("tool_results"):
            return "agent"
        
        return "end"
    
    def _build_graph(self):
        """Build the LangGraph execution graph"""
        # Create the graph
        graph = StateGraph(AgentState)
        
        # Add nodes
        graph.add_node("agent", self._agent_node)
        graph.add_node("tools", self._tool_node)
        
        # Set entry point
        graph.set_entry_point("agent")
        
        # Add conditional edges
        graph.add_conditional_edges(
            "agent",
            self._should_continue,
            {
                "agent": "agent",
                "tools": "tools",
                "end": END
            }
        )
        
        graph.add_edge("tools", "agent")
        
        # Compile the graph
        return graph.compile()
    
    def run(self, input_text: str) -> str:
        """
        Run the agent with the given input
        
        Args:
            input_text: Input message for the agent
            
        Returns:
            Agent response
        """
        try:
            # Initialize state
            initial_state = {
                "messages": [input_text],
                "current_tool": None,
                "tool_results": [],
                "error_message": None,
                "iteration_count": 0
            }
            
            # Run the graph
            result = self.app.invoke(initial_state)
            
            # Return the last message
            if result.get("error_message"):
                return f"Error: {result['error_message']}"
            
            return result["messages"][-1] if result["messages"] else "No response generated"
            
        except Exception as e:
            if self.verbose:
                print(f"Error running agent: {e}")
            return f"I apologize, but I encountered an error processing your request: {str(e)}"

# Example usage
if __name__ == "__main__":
    # Create agent instance
    agent = ${className}()
    
    # Example conversation
    print("${className} Agent Started!")
    print("Type 'quit' to exit\\n")
    
    while True:
        user_input = input("You: ")
        if user_input.lower() in ['quit', 'exit', 'bye']:
            break
        
        response = agent.run(user_input)
        print(f"Agent: {response}\\n")
    
    print("Agent session ended.")
`
    }
  }, [agent, config])

  const generateConfigFiles = useCallback(() => {
    const files: GeneratedFile[] = []
    
    // requirements.txt or pyproject.toml
    if (config.packageManager === 'pip') {
      const requirements = frameworkTemplates[config.framework].dependencies.join('\n')
      files.push({
        path: 'requirements.txt',
        content: requirements,
        type: 'config',
        size: requirements.length
      })
    } else if (config.packageManager === 'poetry') {
      files.push({
        path: 'pyproject.toml',
        content: `[tool.poetry]
name = "${config.projectName}"
version = "0.1.0"
description = "${agent?.description || 'AI Agent project'}"
authors = ["Your Name <your.email@example.com>"]
readme = "README.md"

[tool.poetry.dependencies]
python = "^${config.pythonVersion}"
${frameworkTemplates[config.framework].dependencies.map(dep => {
  const [name, version] = dep.split('>=')
  return `${name} = "^${version}"`
}).join('\n')}

[tool.poetry.group.dev.dependencies]
pytest = "^7.0.0"
black = "^23.0.0"
flake8 = "^6.0.0"
mypy = "^1.0.0"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
`,
        type: 'config',
        size: 500
      })
    }

    // .env.example
    files.push({
      path: '.env.example',
      content: `# Environment Configuration
# Copy this file to .env and fill in your actual values

# LLM API Keys
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here

# Agent Configuration
AGENT_NAME=${config.projectName}
AGENT_TEMPERATURE=${agent?.config?.temperature || 0.7}
AGENT_MAX_TOKENS=${agent?.config?.maxTokens || 1000}
AGENT_MODEL=${agent?.config?.model || 'gpt-4'}

# Logging
LOG_LEVEL=INFO
VERBOSE=true
`,
      type: 'config',
      size: 400
    })

    // setup.py
    files.push({
      path: 'setup.py',
      content: `from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="${config.projectName}",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="${agent?.description || 'AI Agent project'}",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/${config.projectName}",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.${config.pythonVersion.split('.')[1]}",
    ],
    python_requires=">=${config.pythonVersion}",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "${config.projectName}=${config.projectName}.main:main",
        ],
    },
)
`,
      type: 'config',
      size: 800
    })

    return files
  }, [config, agent])

  const generateDocumentation = useCallback(() => {
    const files: GeneratedFile[] = []

    // README.md
    files.push({
      path: 'README.md',
      content: `# ${config.projectName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

${agent?.description || 'AI Agent built with LangChain/LangGraph framework'}

## Overview

This project contains an AI agent built using the ${config.framework === 'langchain' ? 'LangChain' : 'LangGraph'} framework. The agent is designed to ${agent?.description?.toLowerCase() || 'assist users with various tasks'}.

## Features

- **Framework**: ${config.framework === 'langchain' ? 'LangChain' : 'LangGraph'}
- **LLM Provider**: ${agent?.config?.llmProvider || 'OpenAI'}
- **Model**: ${agent?.config?.model || 'gpt-4'}
- **Tools**: ${agent?.tools?.length || 0} integrated tools
- **Memory**: Conversation history and context management

### Available Tools

${agent?.tools?.map((tool: any) => `- **${tool.name}**: ${tool.description || 'Tool functionality'}`).join('\n') || 'No tools configured'}

## Installation

### Using pip

\`\`\`bash
pip install -r requirements.txt
\`\`\`

### Using Poetry

\`\`\`bash
poetry install
\`\`\`

## Configuration

1. Copy the environment template:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Edit \`.env\` and add your API keys:
   \`\`\`
   OPENAI_API_KEY=your_api_key_here
   # Add other required keys...
   \`\`\`

## Usage

### Basic Usage

\`\`\`python
from ${config.projectName}.main import ${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}

# Create agent instance
agent = ${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}()

# Run a query
response = agent.run("Hello, how can you help me?")
print(response)
\`\`\`

### Command Line Interface

\`\`\`bash
python -m ${config.projectName}.main
\`\`\`

## Project Structure

\`\`\`
${config.projectName}/
├── ${config.projectName}/
│   ├── __init__.py
│   ├── main.py              # Main agent implementation
│   ├── tools/               # Custom tools
│   └── config/              # Configuration files
├── tests/                   # Test files
├── examples/                # Usage examples
├── requirements.txt         # Dependencies
├── .env.example            # Environment template
└── README.md               # This file
\`\`\`

## Development

### Running Tests

\`\`\`bash
pytest tests/
\`\`\`

### Code Formatting

\`\`\`bash
black ${config.projectName}/
\`\`\`

### Type Checking

\`\`\`bash
mypy ${config.projectName}/
\`\`\`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please open an issue on the GitHub repository.
`,
      type: 'documentation',
      size: 2000
    })

    // API Documentation
    files.push({
      path: 'docs/api.md',
      content: `# API Documentation

## ${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')} Class

Main agent class that handles all interactions and tool usage.

### Constructor

\`\`\`python
${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}(
    temperature: float = ${agent?.config?.temperature || 0.7},
    max_tokens: int = ${agent?.config?.maxTokens || 1000},
    model: str = "${agent?.config?.model || 'gpt-4'}",
    verbose: bool = True
)
\`\`\`

**Parameters:**
- \`temperature\`: Controls randomness in responses (0.0 to 1.0)
- \`max_tokens\`: Maximum tokens in generated responses
- \`model\`: LLM model to use
- \`verbose\`: Enable detailed logging

### Methods

#### run(input_text: str) -> str

Execute the agent with the given input text.

**Parameters:**
- \`input_text\`: The user's input message

**Returns:**
- String response from the agent

**Example:**
\`\`\`python
agent = ${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}()
response = agent.run("What can you help me with?")
print(response)
\`\`\`

${config.framework === 'langchain' ? `
#### reset_memory()

Reset the agent's conversation memory.

#### get_memory_summary() -> Dict[str, Any]

Get a summary of the agent's current memory state.

**Returns:**
- Dictionary containing memory statistics
` : ''}

## Tools

${agent?.tools?.map((tool: any) => `
### ${tool.name}

${tool.description || 'Tool functionality description'}

**Usage:** Automatically invoked by the agent when relevant to the user's query.
`).join('\n') || 'No tools configured'}

## Error Handling

The agent includes comprehensive error handling:

- **API Errors**: Gracefully handles LLM API failures
- **Tool Errors**: Continues operation if individual tools fail
- **Input Validation**: Validates inputs before processing
- **Rate Limiting**: Respects API rate limits

## Configuration Options

All configuration can be set via environment variables or constructor parameters:

| Parameter | Environment Variable | Default | Description |
|-----------|---------------------|---------|-------------|
| temperature | AGENT_TEMPERATURE | ${agent?.config?.temperature || 0.7} | Response randomness |
| max_tokens | AGENT_MAX_TOKENS | ${agent?.config?.maxTokens || 1000} | Maximum response length |
| model | AGENT_MODEL | ${agent?.config?.model || 'gpt-4'} | LLM model |
| verbose | VERBOSE | true | Enable logging |
`,
      type: 'documentation',
      size: 1500
    })

    return files
  }, [config, agent])

  const generateTestFiles = useCallback(() => {
    const files: GeneratedFile[] = []
    const className = config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')

    files.push({
      path: 'tests/test_agent.py',
      content: `import pytest
import os
from unittest.mock import Mock, patch
from ${config.projectName}.main import ${className}

@pytest.fixture
def agent():
    """Create a test agent instance"""
    return ${className}(temperature=0.5, max_tokens=100, verbose=False)

@pytest.fixture
def mock_llm_response():
    """Mock LLM response for testing"""
    return "This is a test response from the agent."

class TestAgent:
    """Test cases for the ${className} agent"""
    
    def test_agent_initialization(self, agent):
        """Test that agent initializes correctly"""
        assert agent.temperature == 0.5
        assert agent.max_tokens == 100
        assert agent.model == "${agent?.config?.model || 'gpt-4'}"
        assert not agent.verbose
    
    @patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
    def test_llm_initialization(self, agent):
        """Test that LLM is initialized correctly"""
        llm = agent._initialize_llm()
        assert llm is not None
    
    def test_tools_initialization(self, agent):
        """Test that tools are initialized correctly"""
        tools = agent._initialize_tools()
        assert isinstance(tools, list)
        assert len(tools) == ${agent?.tools?.length || 0}
    
    ${config.framework === 'langchain' ? `
    def test_memory_initialization(self, agent):
        """Test that memory is initialized correctly"""
        memory = agent._initialize_memory()
        assert memory is not None
    
    def test_reset_memory(self, agent):
        """Test memory reset functionality"""
        agent.reset_memory()
        summary = agent.get_memory_summary()
        assert summary["message_count"] == 0
    ` : ''}
    
    @patch('${config.projectName}.main.${className}._initialize_llm')
    def test_agent_run_success(self, mock_llm, agent, mock_llm_response):
        """Test successful agent execution"""
        # Mock the LLM response
        mock_llm.return_value.predict.return_value = mock_llm_response
        
        response = agent.run("Test input")
        assert isinstance(response, str)
        assert len(response) > 0
    
    @patch('${config.projectName}.main.${className}._initialize_llm')
    def test_agent_run_error_handling(self, mock_llm, agent):
        """Test agent error handling"""
        # Mock an exception
        mock_llm.return_value.predict.side_effect = Exception("Test error")
        
        response = agent.run("Test input")
        assert "error" in response.lower()
    
    ${agent?.tools?.map((tool: any) => `
    def test_${tool.name.replace(/\s+/g, '_').toLowerCase()}_tool(self, agent):
        """Test ${tool.name} tool functionality"""
        tools = agent._initialize_tools()
        tool = next((t for t in tools if t.name == "${tool.name}"), None)
        assert tool is not None
        
        result = tool.func("test query")
        assert isinstance(result, str)
        assert len(result) > 0
    `).join('\n    ') || ''}

class TestIntegration:
    """Integration tests for the agent"""
    
    @pytest.mark.integration
    @patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"})
    def test_full_conversation_flow(self):
        """Test a complete conversation flow"""
        agent = ${className}(verbose=False)
        
        # Test multiple interactions
        responses = []
        test_inputs = [
            "Hello, how are you?",
            "What can you help me with?",
            "Thank you for your help"
        ]
        
        for input_text in test_inputs:
            response = agent.run(input_text)
            responses.append(response)
            assert isinstance(response, str)
            assert len(response) > 0
        
        # Verify responses are different (basic check)
        assert len(set(responses)) > 1  # At least some variety in responses

# Test configuration and setup
class TestConfiguration:
    """Test configuration handling"""
    
    def test_environment_variable_override(self):
        """Test that environment variables override defaults"""
        with patch.dict(os.environ, {
            "AGENT_TEMPERATURE": "0.9",
            "AGENT_MAX_TOKENS": "2000"
        }):
            # Test would check if env vars are properly loaded
            pass
    
    def test_invalid_configuration(self):
        """Test handling of invalid configuration"""
        with pytest.raises(ValueError):
            ${className}(temperature=2.0)  # Invalid temperature
        
        with pytest.raises(ValueError):
            ${className}(max_tokens=-1)  # Invalid max_tokens

# Performance tests
class TestPerformance:
    """Performance-related tests"""
    
    @pytest.mark.slow
    def test_response_time(self, agent):
        """Test that responses are generated within reasonable time"""
        import time
        
        start_time = time.time()
        response = agent.run("Quick test")
        end_time = time.time()
        
        # Should respond within 30 seconds (adjust as needed)
        assert (end_time - start_time) < 30
        assert isinstance(response, str)
`,
      type: 'test',
      size: 2500
    })

    // Test configuration
    files.push({
      path: 'tests/conftest.py',
      content: `import pytest
import os
from unittest.mock import patch

@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment with mock API keys"""
    test_env = {
        "OPENAI_API_KEY": "test_openai_key",
        "ANTHROPIC_API_KEY": "test_anthropic_key",
        "AZURE_OPENAI_API_KEY": "test_azure_key",
        "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com/",
    }
    
    with patch.dict(os.environ, test_env):
        yield

@pytest.fixture
def mock_api_response():
    """Mock API response for testing"""
    return {
        "choices": [
            {
                "message": {
                    "content": "This is a mocked response for testing purposes."
                }
            }
        ],
        "usage": {
            "total_tokens": 50,
            "prompt_tokens": 20,
            "completion_tokens": 30
        }
    }

# Pytest configuration
def pytest_configure(config):
    """Configure pytest with custom markers"""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
`,
      type: 'test',
      size: 800
    })

    return files
  }, [config, agent])

  const generateExampleFiles = useCallback(() => {
    const files: GeneratedFile[] = []
    const className = config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')

    files.push({
      path: 'examples/basic_usage.py',
      content: `"""
Basic usage example for ${className}
"""

import os
from dotenv import load_dotenv
from ${config.projectName}.main import ${className}

# Load environment variables
load_dotenv()

def main():
    """Demonstrate basic agent usage"""
    print("${className} - Basic Usage Example")
    print("=" * 50)
    
    # Create agent instance
    agent = ${className}(
        temperature=0.7,
        max_tokens=1000,
        verbose=True
    )
    
    # Example queries
    examples = [
        "Hello! What can you help me with?",
        "Explain what you do in simple terms",
        ${agent?.tools?.map((tool: any) => `"Use ${tool.name.toLowerCase()} to help me"`).join(',\n        ') || '"Tell me about your capabilities"'},
        "Thank you for the demonstration"
    ]
    
    print("Running example queries...")
    print()
    
    for i, query in enumerate(examples, 1):
        print(f"Example {i}: {query}")
        print("-" * 30)
        
        try:
            response = agent.run(query)
            print(f"Response: {response}")
        except Exception as e:
            print(f"Error: {e}")
        
        print()
    
    ${config.framework === 'langchain' ? `
    # Memory demonstration
    print("Memory Summary:")
    summary = agent.get_memory_summary()
    print(f"Total messages in memory: {summary['message_count']}")
    print(f"Memory type: {summary['memory_type']}")
    ` : ''}
    
    print("Basic usage example completed!")

if __name__ == "__main__":
    main()
`,
      type: 'python',
      size: 1200
    })

    files.push({
      path: 'examples/interactive_chat.py',
      content: `"""
Interactive chat example for ${className}
"""

import os
import sys
from dotenv import load_dotenv
from ${config.projectName}.main import ${className}

# Load environment variables
load_dotenv()

def main():
    """Run an interactive chat session with the agent"""
    print("${className} - Interactive Chat")
    print("=" * 50)
    print("Type 'quit', 'exit', or 'bye' to end the session")
    print("Type 'help' for available commands")
    print("Type 'reset' to clear conversation memory")
    print()
    
    # Create agent instance
    try:
        agent = ${className}(verbose=True)
        print("Agent initialized successfully!")
    except Exception as e:
        print(f"Error initializing agent: {e}")
        sys.exit(1)
    
    print("Starting chat session...")
    print()
    
    while True:
        try:
            # Get user input
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
            
            # Handle special commands
            if user_input.lower() in ['quit', 'exit', 'bye']:
                print("Goodbye!")
                break
            
            elif user_input.lower() == 'help':
                print("Available commands:")
                print("- quit/exit/bye: End the session")
                print("- help: Show this help message")
                print("- reset: Clear conversation memory")
                print("- status: Show agent status")
                continue
            
            elif user_input.lower() == 'reset':
                ${config.framework === 'langchain' ? 'agent.reset_memory()' : '# Memory reset not implemented for LangGraph'}
                print("Conversation memory cleared!")
                continue
            
            elif user_input.lower() == 'status':
                print(f"Agent Status:")
                print(f"- Model: {agent.model}")
                print(f"- Temperature: {agent.temperature}")
                print(f"- Max Tokens: {agent.max_tokens}")
                ${config.framework === 'langchain' ? `
                memory_summary = agent.get_memory_summary()
                print(f"- Messages in memory: {memory_summary['message_count']}")
                ` : ''}
                continue
            
            # Get agent response
            print("Agent: ", end="", flush=True)
            response = agent.run(user_input)
            print(response)
            print()
            
        except KeyboardInterrupt:
            print("\\n\\nSession interrupted by user. Goodbye!")
            break
        except Exception as e:
            print(f"\\nError: {e}")
            print("Please try again or type 'quit' to exit.\\n")

if __name__ == "__main__":
    main()
`,
      type: 'python',
      size: 1500
    })

    return files
  }, [config, agent])

  const generateAllFiles = useCallback(async () => {
    setIsGenerating(true)
    setGenerationProgress(0)
    
    const allFiles: GeneratedFile[] = []
    
    try {
      // Generate main agent file
      const mainContent = generateMainAgentFile()
      allFiles.push({
        path: `${config.projectName}/main.py`,
        content: mainContent,
        type: 'python',
        size: mainContent.length
      })
      setGenerationProgress(20)
      
      // Generate __init__.py
      allFiles.push({
        path: `${config.projectName}/__init__.py`,
        content: `"""
${config.projectName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
${agent?.description || 'AI Agent package'}
"""

from .main import ${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}

__version__ = "0.1.0"
__author__ = "Your Name"
__email__ = "your.email@example.com"

__all__ = ["${config.projectName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}"]
`,
        type: 'python',
        size: 200
      })
      setGenerationProgress(30)
      
      // Generate config files
      const configFiles = generateConfigFiles()
      allFiles.push(...configFiles)
      setGenerationProgress(50)
      
      // Generate documentation
      if (config.includeDocumentation) {
        const docFiles = generateDocumentation()
        allFiles.push(...docFiles)
      }
      setGenerationProgress(70)
      
      // Generate tests
      if (config.includeTests) {
        const testFiles = generateTestFiles()
        allFiles.push(...testFiles)
      }
      setGenerationProgress(85)
      
      // Generate examples
      if (config.includeExamples) {
        const exampleFiles = generateExampleFiles()
        allFiles.push(...exampleFiles)
      }
      setGenerationProgress(95)
      
      // Generate Dockerfile if requested
      if (config.includeDocker) {
        allFiles.push({
          path: 'Dockerfile',
          content: `FROM python:${config.pythonVersion}-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "-m", "${config.projectName}.main"]
`,
          type: 'docker',
          size: 200
        })
      }
      
      setGenerationProgress(100)
      setGeneratedFiles(allFiles)
      onExportComplete(allFiles)
      
    } catch (error) {
      console.error('Error generating files:', error)
    } finally {
      setIsGenerating(false)
    }
  }, [config, agent, generateMainAgentFile, generateConfigFiles, generateDocumentation, generateTestFiles, generateExampleFiles, onExportComplete])

  const downloadZip = useCallback(async () => {
    if (generatedFiles.length === 0) {
      await generateAllFiles()
    }
    
    // Create ZIP file (this would be implemented with a proper ZIP library in production)
    const zipContent = generatedFiles.map(file => `${file.path}:\n${file.content}\n\n`).join('---\n\n')
    const blob = new Blob([zipContent], { type: 'application/zip' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.projectName}_agent_project.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [generatedFiles, generateAllFiles, config.projectName])

  const getFileIcon = (type: GeneratedFile['type']) => {
    switch (type) {
      case 'python': return <Code className="w-4 h-4 text-blue-600" />
      case 'config': return <Settings className="w-4 h-4 text-gray-600" />
      case 'documentation': return <FileText className="w-4 h-4 text-green-600" />
      case 'test': return <CheckCircle className="w-4 h-4 text-purple-600" />
      case 'docker': return <Package className="w-4 h-4 text-orange-600" />
      default: return <File className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Code Generator</h2>
          <p className="text-gray-600">Generate production-ready Python code for your agent</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={generateAllFiles}
            disabled={isGenerating}
            className="bg-sage-600 hover:bg-sage-700"
          >
            {isGenerating ? (
              <Clock className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Code className="w-4 h-4 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Code'}
          </Button>
          <Button 
            onClick={downloadZip}
            disabled={isGenerating}
            variant="outline"
          >
            <Download className="w-4 h-4 mr-2" />
            Download ZIP
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="files">Generated Files</TabsTrigger>
          <TabsTrigger value="preview">Code Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Configuration</CardTitle>
              <CardDescription>
                Configure how your agent code will be generated
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={config.projectName}
                    onChange={(e) => setConfig(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder="my_agent_project"
                  />
                </div>
                <div>
                  <Label htmlFor="python-version">Python Version</Label>
                  <Select 
                    value={config.pythonVersion}
                    onValueChange={(value) => setConfig(prev => ({ ...prev, pythonVersion: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3.8">Python 3.8</SelectItem>
                      <SelectItem value="3.9">Python 3.9</SelectItem>
                      <SelectItem value="3.10">Python 3.10</SelectItem>
                      <SelectItem value="3.11">Python 3.11</SelectItem>
                      <SelectItem value="3.12">Python 3.12</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="package-manager">Package Manager</Label>
                  <Select 
                    value={config.packageManager}
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, packageManager: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pip">pip</SelectItem>
                      <SelectItem value="poetry">Poetry</SelectItem>
                      <SelectItem value="conda">Conda</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="deployment-target">Deployment Target</Label>
                  <Select 
                    value={config.deploymentTarget}
                    onValueChange={(value: any) => setConfig(prev => ({ ...prev, deploymentTarget: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Development</SelectItem>
                      <SelectItem value="aws">AWS</SelectItem>
                      <SelectItem value="azure">Azure</SelectItem>
                      <SelectItem value="gcp">Google Cloud</SelectItem>
                      <SelectItem value="heroku">Heroku</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Include Optional Files</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-tests">Unit Tests</Label>
                    <Switch
                      id="include-tests"
                      checked={config.includeTests}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeTests: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-docs">Documentation</Label>
                    <Switch
                      id="include-docs"
                      checked={config.includeDocumentation}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeDocumentation: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-examples">Examples</Label>
                    <Switch
                      id="include-examples"
                      checked={config.includeExamples}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeExamples: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="include-docker">Dockerfile</Label>
                    <Switch
                      id="include-docker"
                      checked={config.includeDocker}
                      onCheckedChange={(checked) => setConfig(prev => ({ ...prev, includeDocker: checked }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {isGenerating && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="w-5 h-5 animate-spin text-sage-600" />
                  <span className="font-medium">Generating project files...</span>
                </div>
                <Progress value={generationProgress} className="w-full" />
                <p className="text-sm text-gray-600 mt-2">
                  {generationProgress}% complete
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Structure</CardTitle>
              <CardDescription>
                {generatedFiles.length} files generated ({Math.round(generatedFiles.reduce((sum, f) => sum + f.size, 0) / 1024)} KB total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedFiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No files generated yet</p>
                  <p className="text-sm">Click "Generate Code" to create project files</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {generatedFiles.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                        selectedFile?.path === file.path ? 'bg-sage-50 border-sage-300' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedFile(file)}
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.type)}
                        <div>
                          <p className="font-medium text-sm">{file.path}</p>
                          <p className="text-xs text-gray-600">
                            {file.type} • {Math.round(file.size / 1024)} KB
                          </p>
                        </div>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Code Preview</CardTitle>
                  <CardDescription>
                    {selectedFile ? `Viewing ${selectedFile.path}` : 'Select a file to preview its contents'}
                  </CardDescription>
                </div>
                {selectedFile && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedFile ? (
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm overflow-x-auto max-h-96">
                  <pre>{selectedFile.content}</pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Code className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No file selected</p>
                  <p className="text-sm">Select a file from the "Generated Files" tab to preview</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}