# Building GenAI LLM Prompts with Sprint Lens

## 🎯 Objective

Learn to build sophisticated **GenAI LLM prompts** with comprehensive observability, evaluation, and optimization using Sprint Lens. This guide covers prompt engineering, LLM integration, chain-of-thought reasoning, and production deployment.

## 📋 Prerequisites

Before starting, ensure you have completed:
- ✅ [08-simple-agent-build.md](./08-simple-agent-build.md) - Simple agent implementation
- ✅ [03-basic-integration.md](./03-basic-integration.md) - Basic SDK integration
- ✅ **LLM Provider Access**: OpenAI, Anthropic, or Azure OpenAI account

## 🏗️ What We'll Build

A **Comprehensive GenAI Prompt System** featuring:
- **🎨 Advanced Prompt Engineering**: Templates, variables, chain-of-thought
- **🧠 Multi-LLM Integration**: OpenAI, Anthropic, Azure OpenAI support
- **📊 Prompt Evaluation**: Automatic quality assessment and optimization
- **🔄 A/B Testing**: Statistical prompt comparison and improvement
- **📈 Performance Analytics**: Cost tracking, latency monitoring, success rates
- **🛠️ Production Tools**: Prompt versioning, deployment, and monitoring

## 🔧 Step 1: Project Setup

### 1.1 Create Prompt Engineering Project

```bash
# Create project directory
mkdir genai-prompt-engineering
cd genai-prompt-engineering

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install sprintlens openai anthropic azure-openai tiktoken jinja2 tenacity
```

### 1.2 Project Structure

```bash
# Create comprehensive project structure
mkdir -p prompts/{templates,examples,chains}
mkdir -p evaluators/{quality,safety,performance}
mkdir -p llm_providers/{openai,anthropic,azure}
mkdir -p optimization/{ab_testing,analytics}
mkdir -p production/{deployment,monitoring}
mkdir -p tests
mkdir -p data/{inputs,outputs,evaluations}

# Create main files
touch main.py
touch prompt_engine.py
touch llm_manager.py
touch evaluation_framework.py
touch optimization_suite.py
```

### 1.3 Environment Configuration

Create `.env`:

```bash
cat > .env << EOF
# Sprint Lens Configuration
SPRINTLENS_URL=http://localhost:3000
SPRINTLENS_USERNAME=admin
SPRINTLENS_PASSWORD=MasterAdmin2024!
SPRINTLENS_PROJECT_NAME=genai-prompt-engineering

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_ORG_ID=your-org-id  # Optional

# Anthropic Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-azure-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# System Configuration
DEFAULT_LLM_PROVIDER=openai
DEFAULT_MODEL=gpt-4
MAX_TOKENS=2000
TEMPERATURE=0.7
ENABLE_CACHING=true
EVALUATION_MODE=comprehensive
EOF
```

## 🔧 Step 2: Core Prompt Engineering Framework

### 2.1 Advanced Prompt Template System

Create `prompt_engine.py`:

```python
"""
Advanced Prompt Engineering Framework
Supports templates, variables, chain-of-thought, and dynamic prompt generation.
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, asdict
from enum import Enum
import logging
from jinja2 import Environment, BaseLoader, Template
from dotenv import load_dotenv

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# Load environment
load_dotenv()
logger = logging.getLogger(__name__)

class PromptType(Enum):
    """Types of prompts supported by the system."""
    SIMPLE = "simple"
    CHAIN_OF_THOUGHT = "chain_of_thought"
    FEW_SHOT = "few_shot"
    SYSTEM_USER = "system_user"
    MULTI_TURN = "multi_turn"
    STRUCTURED_OUTPUT = "structured_output"

class PromptComplexity(Enum):
    """Complexity levels for prompts."""
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"

@dataclass
class PromptTemplate:
    """Comprehensive prompt template with metadata and validation."""
    
    id: str
    name: str
    description: str
    prompt_type: PromptType
    complexity: PromptComplexity
    template: str
    variables: List[str]
    examples: List[Dict[str, Any]]
    tags: List[str]
    version: str
    author: str
    created_at: str
    updated_at: str
    use_cases: List[str]
    success_metrics: Dict[str, Any]
    constraints: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        data = asdict(self)
        data['prompt_type'] = self.prompt_type.value
        data['complexity'] = self.complexity.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PromptTemplate':
        """Create from dictionary."""
        data['prompt_type'] = PromptType(data['prompt_type'])
        data['complexity'] = PromptComplexity(data['complexity'])
        return cls(**data)

class PromptEngine:
    """
    Advanced prompt engineering engine with template management,
    variable substitution, and dynamic prompt generation.
    """
    
    def __init__(self):
        self.templates: Dict[str, PromptTemplate] = {}
        self.jinja_env = Environment(loader=BaseLoader())
        self.prompt_history: List[Dict[str, Any]] = []
        
        # Performance tracking
        self.prompts_generated = 0
        self.template_usage = {}
        self.variable_usage = {}
        
        # Initialize with built-in templates
        self._initialize_builtin_templates()
        
        logger.info("🎨 Prompt Engine initialized with built-in templates")
    
    def _initialize_builtin_templates(self):
        """Initialize the engine with high-quality built-in templates."""
        
        builtin_templates = [
            # Simple Q&A Template
            PromptTemplate(
                id="simple_qa",
                name="Simple Question Answering",
                description="Basic question-answering prompt for general queries",
                prompt_type=PromptType.SIMPLE,
                complexity=PromptComplexity.BASIC,
                template="Question: {{ question }}\n\nPlease provide a clear and accurate answer to this question.",
                variables=["question"],
                examples=[
                    {"question": "What is the capital of France?", "expected_answer": "Paris"}
                ],
                tags=["qa", "general", "simple"],
                version="1.0.0",
                author="system",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                use_cases=["customer support", "education", "general queries"],
                success_metrics={"accuracy": 0.9, "relevance": 0.85},
                constraints={"max_length": 500, "language": "english"}
            ),
            
            # Chain of Thought Template
            PromptTemplate(
                id="chain_of_thought",
                name="Chain of Thought Reasoning",
                description="Structured reasoning prompt that breaks down complex problems",
                prompt_type=PromptType.CHAIN_OF_THOUGHT,
                complexity=PromptComplexity.INTERMEDIATE,
                template="""Problem: {{ problem }}

Let's think through this step by step:

1. First, I need to understand what is being asked
2. Then, I'll identify the key information and constraints
3. Next, I'll work through the logic systematically
4. Finally, I'll provide a clear conclusion

Step-by-step reasoning:
""",
                variables=["problem"],
                examples=[
                    {
                        "problem": "If a train travels 120 miles in 2 hours, what is its average speed?",
                        "expected_reasoning": "Need to calculate speed = distance/time"
                    }
                ],
                tags=["reasoning", "analysis", "step-by-step"],
                version="1.0.0",
                author="system",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                use_cases=["problem solving", "analysis", "education"],
                success_metrics={"logical_consistency": 0.9, "completeness": 0.8},
                constraints={"reasoning_steps": {"min": 3, "max": 10}}
            ),
            
            # Few-Shot Learning Template
            PromptTemplate(
                id="few_shot_classification",
                name="Few-Shot Text Classification",
                description="Classification prompt with examples for learning patterns",
                prompt_type=PromptType.FEW_SHOT,
                complexity=PromptComplexity.INTERMEDIATE,
                template="""Classify the following text into one of these categories: {{ categories }}

Examples:
{% for example in examples %}
Text: "{{ example.text }}"
Category: {{ example.category }}

{% endfor %}
Now classify this text:
Text: "{{ text_to_classify }}"
Category:""",
                variables=["categories", "examples", "text_to_classify"],
                examples=[
                    {
                        "text_to_classify": "I love this new restaurant!",
                        "categories": "positive, negative, neutral",
                        "examples": [
                            {"text": "This is amazing!", "category": "positive"},
                            {"text": "This is terrible", "category": "negative"}
                        ]
                    }
                ],
                tags=["classification", "few-shot", "machine-learning"],
                version="1.0.0",
                author="system",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                use_cases=["content moderation", "sentiment analysis", "categorization"],
                success_metrics={"accuracy": 0.85, "consistency": 0.9},
                constraints={"min_examples": 2, "max_examples": 10}
            ),
            
            # System + User Template
            PromptTemplate(
                id="system_user_assistant",
                name="System + User Assistant",
                description="Structured system and user message format for assistants",
                prompt_type=PromptType.SYSTEM_USER,
                complexity=PromptComplexity.ADVANCED,
                template="""System: You are {{ assistant_role }}. {{ system_instructions }}

Key guidelines:
{% for guideline in guidelines %}
- {{ guideline }}
{% endfor %}

User: {{ user_message }}