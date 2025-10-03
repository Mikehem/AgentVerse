Assistant: I'll help you with that.""",
                variables=["assistant_role", "system_instructions", "guidelines", "user_message"],
                examples=[
                    {
                        "assistant_role": "a helpful customer service representative",
                        "system_instructions": "Be professional, empathetic, and solution-focused",
                        "guidelines": ["Listen actively", "Provide clear solutions", "Follow up appropriately"],
                        "user_message": "I'm having trouble with my account"
                    }
                ],
                tags=["assistant", "system-prompt", "structured"],
                version="1.0.0",
                author="system",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                use_cases=["customer service", "virtual assistants", "chatbots"],
                success_metrics={"helpfulness": 0.9, "professionalism": 0.95},
                constraints={"response_tone": "professional", "max_guidelines": 10}
            ),
            
            # Structured Output Template
            PromptTemplate(
                id="structured_json_output",
                name="Structured JSON Output",
                description="Generate structured JSON responses for API integration",
                prompt_type=PromptType.STRUCTURED_OUTPUT,
                complexity=PromptComplexity.ADVANCED,
                template="""Extract the following information from the given text and return it as valid JSON:

Required fields:
{% for field in required_fields %}
- {{ field.name }}: {{ field.description }} ({{ field.type }})
{% endfor %}

Text to analyze: "{{ input_text }}"

Return only valid JSON in this exact format:
{
{% for field in required_fields %}
  "{{ field.name }}": {{ field.example }}{{ "," if not loop.last else "" }}
{% endfor %}
}""",
                variables=["required_fields", "input_text"],
                examples=[
                    {
                        "input_text": "John Smith, age 25, lives in New York and works as a software engineer",
                        "required_fields": [
                            {"name": "name", "description": "Full name", "type": "string", "example": '"John Doe"'},
                            {"name": "age", "description": "Age in years", "type": "number", "example": "30"},
                            {"name": "location", "description": "City or location", "type": "string", "example": '"City"'},
                            {"name": "occupation", "description": "Job title", "type": "string", "example": '"Job Title"'}
                        ]
                    }
                ],
                tags=["json", "structured", "extraction", "api"],
                version="1.0.0",
                author="system",
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat(),
                use_cases=["data extraction", "API responses", "structured analysis"],
                success_metrics={"json_validity": 0.98, "field_accuracy": 0.95},
                constraints={"output_format": "valid_json", "required_fields_only": True}
            )
        ]
        
        # Register all built-in templates
        for template in builtin_templates:
            self.templates[template.id] = template
        
        logger.info(f"✅ Initialized {len(builtin_templates)} built-in prompt templates")
    
    @sprintlens.track(
        name="prompt-generation",
        span_type="generation",
        capture_input=True,
        capture_output=True,
        tags={"component": "prompt_engine"}
    )
    def generate_prompt(self, template_id: str, variables: Dict[str, Any], 
                       validate: bool = True) -> Dict[str, Any]:
        """Generate a prompt from a template with variable substitution."""
        
        if template_id not in self.templates:
            raise ValueError(f"Template '{template_id}' not found")
        
        template = self.templates[template_id]
        
        # Validate required variables
        if validate:
            missing_vars = set(template.variables) - set(variables.keys())
            if missing_vars:
                raise ValueError(f"Missing required variables: {missing_vars}")
        
        try:
            # Use Jinja2 for template rendering
            jinja_template = self.jinja_env.from_string(template.template)
            rendered_prompt = jinja_template.render(**variables)
            
            # Track usage
            self.prompts_generated += 1
            self.template_usage[template_id] = self.template_usage.get(template_id, 0) + 1
            
            for var_name in variables.keys():
                self.variable_usage[var_name] = self.variable_usage.get(var_name, 0) + 1
            
            # Create prompt record
            prompt_record = {
                "prompt_id": f"prompt_{int(datetime.now().timestamp())}_{template_id}",
                "template_id": template_id,
                "template_name": template.name,
                "prompt_type": template.prompt_type.value,
                "complexity": template.complexity.value,
                "rendered_prompt": rendered_prompt,
                "variables_used": variables,
                "generated_at": datetime.now().isoformat(),
                "character_count": len(rendered_prompt),
                "word_count": len(rendered_prompt.split()),
                "estimated_tokens": len(rendered_prompt) // 4,  # Rough estimate
                "template_version": template.version
            }
            
            # Store in history
            self.prompt_history.append(prompt_record)
            
            # Keep only recent history
            if len(self.prompt_history) > 1000:
                self.prompt_history = self.prompt_history[-1000:]
            
            logger.info(f"✅ Generated prompt using template '{template_id}' ({len(rendered_prompt)} chars)")
            
            return prompt_record
            
        except Exception as e:
            logger.error(f"❌ Error generating prompt from template '{template_id}': {e}")
            raise
    
    @sprintlens.track(
        name="template-registration",
        span_type="management",
        capture_input=True,
        capture_output=True
    )
    def register_template(self, template: PromptTemplate) -> bool:
        """Register a new prompt template."""
        
        try:
            # Validate template
            if not template.id or not template.template:
                raise ValueError("Template must have ID and template content")
            
            # Test template rendering
            test_vars = {var: f"test_{var}" for var in template.variables}
            jinja_template = self.jinja_env.from_string(template.template)
            jinja_template.render(**test_vars)
            
            # Register template
            self.templates[template.id] = template
            
            logger.info(f"✅ Registered template '{template.id}' - {template.name}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to register template '{template.id}': {e}")
            return False
    
    def get_template(self, template_id: str) -> Optional[PromptTemplate]:
        """Get a template by ID."""
        return self.templates.get(template_id)
    
    def list_templates(self, prompt_type: Optional[PromptType] = None, 
                      complexity: Optional[PromptComplexity] = None) -> List[PromptTemplate]:
        """List templates with optional filtering."""
        
        templates = list(self.templates.values())
        
        if prompt_type:
            templates = [t for t in templates if t.prompt_type == prompt_type]
        
        if complexity:
            templates = [t for t in templates if t.complexity == complexity]
        
        return templates
    
    def get_usage_statistics(self) -> Dict[str, Any]:
        """Get prompt generation usage statistics."""
        
        return {
            "total_prompts_generated": self.prompts_generated,
            "total_templates": len(self.templates),
            "template_usage": self.template_usage,
            "variable_usage": self.variable_usage,
            "recent_prompts": len(self.prompt_history),
            "most_used_template": max(self.template_usage.items(), key=lambda x: x[1])[0] if self.template_usage else None,
            "timestamp": datetime.now().isoformat()
        }


# Global prompt engine instance
prompt_engine = PromptEngine()
```

### 2.2 Multi-LLM Provider Manager

Create `llm_manager.py`:

```python
"""
Multi-LLM Provider Manager
Supports OpenAI, Anthropic, Azure OpenAI with unified interface and observability.
"""

import os
import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum
import logging
from tenacity import retry, stop_after_attempt, wait_exponential

# Sprint Lens imports
import sprintlens
from sprintlens import Trace, Span

# LLM Provider imports
try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

try:
    from azure.identity import DefaultAzureCredential
    AZURE_AVAILABLE = True
except ImportError:
    AZURE_AVAILABLE = False

logger = logging.getLogger(__name__)

class LLMProvider(Enum):
    """Supported LLM providers."""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure_openai"

class ModelFamily(Enum):
    """Model families for different use cases."""
    GPT_3_5 = "gpt-3.5"
    GPT_4 = "gpt-4"
    GPT_4_TURBO = "gpt-4-turbo"
    CLAUDE_3_HAIKU = "claude-3-haiku"
    CLAUDE_3_SONNET = "claude-3-sonnet"
    CLAUDE_3_OPUS = "claude-3-opus"

@dataclass
class LLMResponse:
    """Standardized LLM response format."""
    
    content: str
    provider: str
    model: str
    tokens_used: Dict[str, int]
    response_time: float
    cost_estimate: float
    metadata: Dict[str, Any]
    timestamp: str
    success: bool
    error_message: Optional[str] = None

@dataclass
class LLMRequest:
    """Standardized LLM request format."""
    
    prompt: str
    model: str
    provider: str
    temperature: float
    max_tokens: int
    system_message: Optional[str] = None
    messages: Optional[List[Dict[str, str]]] = None
    response_format: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None

class LLMManager:
    """
    Unified LLM provider manager with observability and cost tracking.
    """
    
    def __init__(self):
        self.providers = {}
        self.model_configs = {}
        self.cost_tracking = {
            "total_requests": 0,
            "total_tokens": 0,
            "total_cost": 0.0,
            "provider_usage": {},
            "model_usage": {}
        }
        
        # Initialize available providers
        self._initialize_providers()
        self._setup_model_configurations()
        
        logger.info("🧠 LLM Manager initialized with available providers")
    
    def _initialize_providers(self):
        """Initialize available LLM providers."""
        
        # OpenAI
        if OPENAI_AVAILABLE and os.getenv('OPENAI_API_KEY'):
            try:
                self.providers[LLMProvider.OPENAI] = openai.OpenAI(
                    api_key=os.getenv('OPENAI_API_KEY'),
                    organization=os.getenv('OPENAI_ORG_ID')
                )
                logger.info("✅ OpenAI provider initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize OpenAI: {e}")
        
        # Anthropic
        if ANTHROPIC_AVAILABLE and os.getenv('ANTHROPIC_API_KEY'):
            try:
                self.providers[LLMProvider.ANTHROPIC] = anthropic.Anthropic(
                    api_key=os.getenv('ANTHROPIC_API_KEY')
                )
                logger.info("✅ Anthropic provider initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Anthropic: {e}")
        
        # Azure OpenAI
        if OPENAI_AVAILABLE and os.getenv('AZURE_OPENAI_API_KEY'):
            try:
                self.providers[LLMProvider.AZURE_OPENAI] = openai.AzureOpenAI(
                    api_key=os.getenv('AZURE_OPENAI_API_KEY'),
                    api_version=os.getenv('AZURE_OPENAI_API_VERSION', '2024-02-15-preview'),
                    azure_endpoint=os.getenv('AZURE_OPENAI_ENDPOINT')
                )
                logger.info("✅ Azure OpenAI provider initialized")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Azure OpenAI: {e}")
    
    def _setup_model_configurations(self):
        """Setup model configurations with pricing and capabilities."""
        
        self.model_configs = {
            # OpenAI Models
            "gpt-3.5-turbo": {
                "provider": LLMProvider.OPENAI,
                "family": ModelFamily.GPT_3_5,
                "cost_per_1k_tokens": {"input": 0.0015, "output": 0.002},
                "max_tokens": 4096,
                "context_window": 16385,
                "capabilities": ["chat", "completion", "function_calling"]
            },
            "gpt-4": {
                "provider": LLMProvider.OPENAI,
                "family": ModelFamily.GPT_4,
                "cost_per_1k_tokens": {"input": 0.03, "output": 0.06},
                "max_tokens": 4096,
                "context_window": 8192,
                "capabilities": ["chat", "completion", "function_calling", "vision"]
            },
            "gpt-4-turbo": {
                "provider": LLMProvider.OPENAI,
                "family": ModelFamily.GPT_4_TURBO,
                "cost_per_1k_tokens": {"input": 0.01, "output": 0.03},
                "max_tokens": 4096,
                "context_window": 128000,
                "capabilities": ["chat", "completion", "function_calling", "vision"]
            },
            
            # Anthropic Models
            "claude-3-haiku-20240307": {
                "provider": LLMProvider.ANTHROPIC,
                "family": ModelFamily.CLAUDE_3_HAIKU,
                "cost_per_1k_tokens": {"input": 0.00025, "output": 0.00125},
                "max_tokens": 4096,
                "context_window": 200000,
                "capabilities": ["chat", "completion", "vision"]
            },
            "claude-3-sonnet-20240229": {
                "provider": LLMProvider.ANTHROPIC,
                "family": ModelFamily.CLAUDE_3_SONNET,
                "cost_per_1k_tokens": {"input": 0.003, "output": 0.015},
                "max_tokens": 4096,
                "context_window": 200000,
                "capabilities": ["chat", "completion", "vision"]
            },
            "claude-3-opus-20240229": {
                "provider": LLMProvider.ANTHROPIC,
                "family": ModelFamily.CLAUDE_3_OPUS,
                "cost_per_1k_tokens": {"input": 0.015, "output": 0.075},
                "max_tokens": 4096,
                "context_window": 200000,
                "capabilities": ["chat", "completion", "vision"]
            }
        }
    
    @sprintlens.track(
        name="llm-completion",
        span_type="llm",
        capture_input=True,
        capture_output=True,
        tags={"component": "llm_manager"}
    )
    async def generate_completion(self, request: LLMRequest) -> LLMResponse:
        """Generate completion using the specified LLM provider."""
        
        start_time = datetime.now()
        
        try:
            provider_enum = LLMProvider(request.provider)
            
            if provider_enum not in self.providers:
                raise ValueError(f"Provider {request.provider} not available")
            
            # Route to appropriate provider
            if provider_enum == LLMProvider.OPENAI:
                response = await self._openai_completion(request)
            elif provider_enum == LLMProvider.ANTHROPIC:
                response = await self._anthropic_completion(request)
            elif provider_enum == LLMProvider.AZURE_OPENAI:
                response = await self._azure_openai_completion(request)
            else:
                raise ValueError(f"Unsupported provider: {request.provider}")
            
            # Calculate response time
            end_time = datetime.now()
            response.response_time = (end_time - start_time).total_seconds()
            
            # Update cost tracking
            self._update_cost_tracking(response)
            
            logger.info(f"✅ LLM completion: {request.model} ({response.tokens_used.get('total', 0)} tokens, ${response.cost_estimate:.4f})")
            
            return response
            
        except Exception as e:
            end_time = datetime.now()
            response_time = (end_time - start_time).total_seconds()
            
            logger.error(f"❌ LLM completion failed: {e}")
            
            return LLMResponse(
                content="",
                provider=request.provider,
                model=request.model,
                tokens_used={"total": 0, "input": 0, "output": 0},
                response_time=response_time,
                cost_estimate=0.0,
                metadata={"error": str(e)},
                timestamp=datetime.now().isoformat(),
                success=False,
                error_message=str(e)
            )
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _openai_completion(self, request: LLMRequest) -> LLMResponse:
        """Generate completion using OpenAI."""
        
        client = self.providers[LLMProvider.OPENAI]
        
        # Prepare messages
        messages = []
        if request.system_message:
            messages.append({"role": "system", "content": request.system_message})
        
        if request.messages:
            messages.extend(request.messages)
        else:
            messages.append({"role": "user", "content": request.prompt})
        
        # Make API call
        completion = await asyncio.to_thread(
            client.chat.completions.create,
            model=request.model,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            response_format={"type": request.response_format} if request.response_format else None,
            tools=request.tools
        )
        
        # Extract response data
        content = completion.choices[0].message.content
        usage = completion.usage
        
        # Calculate cost
        model_config = self.model_configs.get(request.model, {})
        cost_config = model_config.get("cost_per_1k_tokens", {"input": 0, "output": 0})
        
        input_cost = (usage.prompt_tokens / 1000) * cost_config["input"]
        output_cost = (usage.completion_tokens / 1000) * cost_config["output"]
        total_cost = input_cost + output_cost
        
        return LLMResponse(
            content=content,
            provider="openai",
            model=request.model,
            tokens_used={
                "total": usage.total_tokens,
                "input": usage.prompt_tokens,
                "output": usage.completion_tokens
            },
            response_time=0.0,  # Will be set by caller
            cost_estimate=total_cost,
            metadata={
                "finish_reason": completion.choices[0].finish_reason,
                "model_version": completion.model,
                "usage": usage.dict() if hasattr(usage, 'dict') else str(usage)
            },
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _anthropic_completion(self, request: LLMRequest) -> LLMResponse:
        """Generate completion using Anthropic."""
        
        client = self.providers[LLMProvider.ANTHROPIC]
        
        # Prepare messages
        messages = []
        if request.messages:
            messages = request.messages
        else:
            messages = [{"role": "user", "content": request.prompt}]
        
        # Make API call
        message = await asyncio.to_thread(
            client.messages.create,
            model=request.model,
            max_tokens=request.max_tokens,
            temperature=request.temperature,
            system=request.system_message,
            messages=messages
        )
        
        # Extract response data
        content = message.content[0].text if message.content else ""
        
        # Calculate cost (simplified - in production, get actual usage from response)
        model_config = self.model_configs.get(request.model, {})
        cost_config = model_config.get("cost_per_1k_tokens", {"input": 0, "output": 0})
        
        # Estimate tokens (in production, use proper tokenizer)
        estimated_input_tokens = len(request.prompt) // 4
        estimated_output_tokens = len(content) // 4
        
        input_cost = (estimated_input_tokens / 1000) * cost_config["input"]
        output_cost = (estimated_output_tokens / 1000) * cost_config["output"]
        total_cost = input_cost + output_cost
        
        return LLMResponse(
            content=content,
            provider="anthropic",
            model=request.model,
            tokens_used={
                "total": estimated_input_tokens + estimated_output_tokens,
                "input": estimated_input_tokens,
                "output": estimated_output_tokens
            },
            response_time=0.0,  # Will be set by caller
            cost_estimate=total_cost,
            metadata={
                "stop_reason": message.stop_reason,
                "usage": message.usage.dict() if hasattr(message, 'usage') else {}
            },
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def _azure_openai_completion(self, request: LLMRequest) -> LLMResponse:
        """Generate completion using Azure OpenAI."""
        
        client = self.providers[LLMProvider.AZURE_OPENAI]
        
        # Use deployment name from environment or request model
        deployment_name = os.getenv('AZURE_OPENAI_DEPLOYMENT', request.model)
        
        # Prepare messages
        messages = []
        if request.system_message:
            messages.append({"role": "system", "content": request.system_message})
        
        if request.messages:
            messages.extend(request.messages)
        else:
            messages.append({"role": "user", "content": request.prompt})
        
        # Make API call
        completion = await asyncio.to_thread(
            client.chat.completions.create,
            model=deployment_name,
            messages=messages,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        # Extract response data
        content = completion.choices[0].message.content
        usage = completion.usage
        
        # Calculate cost (use same pricing as OpenAI)
        model_config = self.model_configs.get("gpt-4", {})  # Default to GPT-4 pricing
        cost_config = model_config.get("cost_per_1k_tokens", {"input": 0, "output": 0})
        
        input_cost = (usage.prompt_tokens / 1000) * cost_config["input"]
        output_cost = (usage.completion_tokens / 1000) * cost_config["output"]
        total_cost = input_cost + output_cost
        
        return LLMResponse(
            content=content,
            provider="azure_openai",
            model=deployment_name,
            tokens_used={
                "total": usage.total_tokens,
                "input": usage.prompt_tokens,
                "output": usage.completion_tokens
            },
            response_time=0.0,  # Will be set by caller
            cost_estimate=total_cost,
            metadata={
                "finish_reason": completion.choices[0].finish_reason,
                "deployment": deployment_name,
                "usage": usage.dict() if hasattr(usage, 'dict') else str(usage)
            },
            timestamp=datetime.now().isoformat(),
            success=True
        )
    
    def _update_cost_tracking(self, response: LLMResponse):
        """Update cost tracking statistics."""
        
        if response.success:
            self.cost_tracking["total_requests"] += 1
            self.cost_tracking["total_tokens"] += response.tokens_used.get("total", 0)
            self.cost_tracking["total_cost"] += response.cost_estimate
            
            # Provider usage
            provider = response.provider
            if provider not in self.cost_tracking["provider_usage"]:
                self.cost_tracking["provider_usage"][provider] = {"requests": 0, "tokens": 0, "cost": 0.0}
            
            self.cost_tracking["provider_usage"][provider]["requests"] += 1
            self.cost_tracking["provider_usage"][provider]["tokens"] += response.tokens_used.get("total", 0)
            self.cost_tracking["provider_usage"][provider]["cost"] += response.cost_estimate
            
            # Model usage
            model = response.model
            if model not in self.cost_tracking["model_usage"]:
                self.cost_tracking["model_usage"][model] = {"requests": 0, "tokens": 0, "cost": 0.0}
            
            self.cost_tracking["model_usage"][model]["requests"] += 1
            self.cost_tracking["model_usage"][model]["tokens"] += response.tokens_used.get("total", 0)
            self.cost_tracking["model_usage"][model]["cost"] += response.cost_estimate
    
    def get_available_models(self, provider: Optional[LLMProvider] = None) -> List[str]:
        """Get list of available models, optionally filtered by provider."""
        
        models = []
        for model, config in self.model_configs.items():
            if provider is None or config["provider"] == provider:
                models.append(model)
        
        return models
    
    def get_model_info(self, model: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific model."""
        
        return self.model_configs.get(model)
    
    def get_cost_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cost and usage statistics."""
        
        stats = self.cost_tracking.copy()
        stats["timestamp"] = datetime.now().isoformat()
        stats["average_cost_per_request"] = (
            stats["total_cost"] / max(stats["total_requests"], 1)
        )
        stats["average_tokens_per_request"] = (
            stats["total_tokens"] / max(stats["total_requests"], 1)
        )
        
        return stats
    
    def recommend_model(self, use_case: str, budget_conscious: bool = False) -> str:
        """Recommend the best model for a specific use case."""
        
        use_case_recommendations = {
            "simple_qa": "gpt-3.5-turbo" if budget_conscious else "gpt-4",
            "complex_reasoning": "gpt-4-turbo",
            "creative_writing": "claude-3-sonnet-20240229",
            "code_generation": "gpt-4-turbo",
            "summarization": "claude-3-haiku-20240307" if budget_conscious else "claude-3-sonnet-20240229",
            "translation": "gpt-4",
            "analysis": "claude-3-opus-20240229",
            "chat": "gpt-3.5-turbo" if budget_conscious else "gpt-4"
        }
        
        recommended = use_case_recommendations.get(use_case, "gpt-3.5-turbo")
        
        # Check if recommended model is available
        available_models = self.get_available_models()
        if recommended not in available_models:
            # Fall back to first available model
            return available_models[0] if available_models else "gpt-3.5-turbo"
        
        return recommended


# Global LLM manager instance
llm_manager = LLMManager()
```

## 🔧 Step 3: Comprehensive Testing and Demo

### 3.1 Create Main Demo Script

Create `main.py`:

```python
"""
GenAI LLM Prompts Demo - Comprehensive prompt engineering demonstration.
"""

import asyncio
import os
import json
from datetime import datetime
from typing import Dict, Any, List
from dotenv import load_dotenv

# Sprint Lens imports
import sprintlens

# Import our modules
from prompt_engine import prompt_engine, PromptType, PromptComplexity
from llm_manager import llm_manager, LLMRequest, LLMProvider

# Load environment
load_dotenv()

# Configure Sprint Lens
sprintlens.configure(
    url=os.getenv('SPRINTLENS_URL', 'http://localhost:3000'),
    username=os.getenv('SPRINTLENS_USERNAME', 'admin'),
    password=os.getenv('SPRINTLENS_PASSWORD', 'MasterAdmin2024!'),
    project_name=os.getenv('SPRINTLENS_PROJECT_NAME', 'genai-prompt-engineering')
)

@sprintlens.track(
    name="prompt-demo-session",
    span_type="demo",
    capture_output=True,
    tags={"demo": "genai_prompts", "version": "1.0.0"}
)
async def run_comprehensive_demo():
    """Run comprehensive demonstration of prompt engineering capabilities."""
    
    print("🎨 GenAI LLM Prompts - Comprehensive Demo")
    print("=" * 60)
    
    # Demo 1: Basic Prompt Templates
    print("\n📋 Demo 1: Basic Prompt Templates")
    print("-" * 40)
    await demo_basic_templates()
    
    # Demo 2: Multi-LLM Comparison
    print("\n🧠 Demo 2: Multi-LLM Provider Comparison")
    print("-" * 40)
    await demo_multi_llm_comparison()
    
    # Demo 3: Chain of Thought Reasoning
    print("\n🔗 Demo 3: Chain of Thought Reasoning")
    print("-" * 40)
    await demo_chain_of_thought()
    
    # Demo 4: Few-Shot Learning
    print("\n📚 Demo 4: Few-Shot Learning")
    print("-" * 40)
    await demo_few_shot_learning()
    
    # Demo 5: Structured Output Generation
    print("\n📊 Demo 5: Structured Output Generation")
    print("-" * 40)
    await demo_structured_output()
    
    # Demo 6: Performance Analytics
    print("\n📈 Demo 6: Performance Analytics")
    print("-" * 40)
    await demo_performance_analytics()
    
    print("\n🎉 Demo completed successfully!")
    print("📊 Check your Sprint Lens dashboard for detailed traces:")
    print(f"   👉 {os.getenv('SPRINTLENS_URL', 'http://localhost:3000')}")

@sprintlens.track(
    name="basic-templates-demo",
    span_type="demo",
    capture_output=True
)
async def demo_basic_templates():
    """Demonstrate basic prompt template usage."""
    
    # List available templates
    templates = prompt_engine.list_templates()
    print(f"📚 Available templates: {len(templates)}")
    
    for template in templates:
        print(f"  • {template.name} ({template.prompt_type.value}, {template.complexity.value})")
    
    # Test simple Q&A template
    print(f"\n🧪 Testing simple Q&A template...")
    
    qa_prompt = prompt_engine.generate_prompt(
        template_id="simple_qa",
        variables={"question": "What are the benefits of using LLM observability?"}
    )
    
    print(f"Generated prompt ({qa_prompt['character_count']} chars):")
    print(f"'{qa_prompt['rendered_prompt'][:200]}...'")
    
    # Get recommended model and generate response
    model = llm_manager.recommend_model("simple_qa", budget_conscious=True)
    print(f"Recommended model: {model}")
    
    if llm_manager.get_available_models():
        llm_request = LLMRequest(
            prompt=qa_prompt['rendered_prompt'],
            model=model,
            provider=llm_manager.get_model_info(model)['provider'].value,
            temperature=0.7,
            max_tokens=500
        )
        
        response = await llm_manager.generate_completion(llm_request)
        
        if response.success:
            print(f"✅ Response ({response.tokens_used['total']} tokens, ${response.cost_estimate:.4f}):")
            print(f"'{response.content[:300]}...'")
        else:
            print(f"❌ Failed: {response.error_message}")
    else:
        print("⚠️ No LLM providers available - skipping response generation")

@sprintlens.track(
    name="multi-llm-comparison-demo",
    span_type="demo",
    capture_output=True
)
async def demo_multi_llm_comparison():
    """Demonstrate comparison across multiple LLM providers."""
    
    # Test prompt
    test_prompt = prompt_engine.generate_prompt(
        template_id="simple_qa",
        variables={"question": "Explain artificial intelligence in simple terms"}
    )
    
    print(f"🧪 Testing prompt across multiple providers...")
    print(f"Question: Explain artificial intelligence in simple terms")
    
    # Test with different models
    test_models = [
        ("gpt-3.5-turbo", "openai"),
        ("gpt-4", "openai"),
        ("claude-3-haiku-20240307", "anthropic"),
        ("claude-3-sonnet-20240229", "anthropic")
    ]
    
    results = []
    
    for model, provider in test_models:
        if model in llm_manager.get_available_models():
            print(f"\n🤖 Testing {model} ({provider})...")
            
            llm_request = LLMRequest(
                prompt=test_prompt['rendered_prompt'],
                model=model,
                provider=provider,
                temperature=0.7,
                max_tokens=300
            )
            
            response = await llm_manager.generate_completion(llm_request)
            
            if response.success:
                results.append({
                    "model": model,
                    "provider": provider,
                    "response_length": len(response.content),
                    "tokens_used": response.tokens_used['total'],
                    "cost": response.cost_estimate,
                    "response_time": response.response_time,
                    "content_preview": response.content[:150] + "..."
                })
                
                print(f"✅ Success: {response.tokens_used['total']} tokens, ${response.cost_estimate:.4f}, {response.response_time:.2f}s")
                print(f"   Preview: {response.content[:100]}...")
            else:
                print(f"❌ Failed: {response.error_message}")
        else:
            print(f"⚠️ Model {model} not available")
    
    # Compare results
    if results:
        print(f"\n📊 Comparison Summary:")
        print(f"{'Model':<25} {'Tokens':<8} {'Cost':<8} {'Time':<6} {'Length':<8}")
        print("-" * 60)
        
        for result in results:
            print(f"{result['model']:<25} {result['tokens_used']:<8} ${result['cost']:<7.4f} {result['response_time']:<6.2f}s {result['response_length']:<8}")

@sprintlens.track(
    name="chain-of-thought-demo", 
    span_type="demo",
    capture_output=True
)
async def demo_chain_of_thought():
    """Demonstrate chain of thought reasoning."""
    
    print("🧠 Testing chain of thought reasoning...")
    
    # Complex reasoning problem
    reasoning_problem = """
    A company has 100 employees. 60% work in engineering, 25% in sales, and the rest in other departments.
    If the engineering department needs to hire 20% more people and sales needs 15% more,
    how many total employees will the company have after hiring?
    """
    
    cot_prompt = prompt_engine.generate_prompt(
        template_id="chain_of_thought",
        variables={"problem": reasoning_problem.strip()}
    )
    
    print(f"Problem: {reasoning_problem.strip()}")
    print(f"\nGenerated Chain of Thought prompt ({cot_prompt['character_count']} chars)")
    
    # Use the best reasoning model available
    model = llm_manager.recommend_model("complex_reasoning")
    
    if model in llm_manager.get_available_models():
        llm_request = LLMRequest(
            prompt=cot_prompt['rendered_prompt'],
            model=model,
            provider=llm_manager.get_model_info(model)['provider'].value,
            temperature=0.3,  # Lower temperature for reasoning
            max_tokens=800
        )
        
        response = await llm_manager.generate_completion(llm_request)
        
        if response.success:
            print(f"✅ Chain of Thought Response:")
            print(f"Model: {model}")
            print(f"Tokens: {response.tokens_used['total']}, Cost: ${response.cost_estimate:.4f}")
            print(f"Response Time: {response.response_time:.2f}s")
            print("\nReasoning:")
            print(response.content)
        else:
            print(f"❌ Failed: {response.error_message}")
    else:
        print("⚠️ No suitable models available for chain of thought reasoning")

@sprintlens.track(
    name="few-shot-learning-demo",
    span_type="demo", 
    capture_output=True
)
async def demo_few_shot_learning():
    """Demonstrate few-shot learning capabilities."""
    
    print("📚 Testing few-shot learning for sentiment classification...")
    
    # Prepare few-shot examples
    examples = [
        {"text": "I absolutely love this product! Amazing quality!", "category": "positive"},
        {"text": "This is the worst purchase I've ever made", "category": "negative"},
        {"text": "The item arrived on time and works as expected", "category": "neutral"},
        {"text": "Outstanding customer service and fast delivery!", "category": "positive"},
        {"text": "Poor quality, broke after one day", "category": "negative"}
    ]
    
    test_texts = [
        "This exceeded my expectations in every way!",
        "Not great, not terrible, just okay",
        "Completely disappointed with this purchase",
        "Good value for the money"
    ]
    
    for test_text in test_texts:
        print(f"\n🧪 Classifying: '{test_text}'")
        
        few_shot_prompt = prompt_engine.generate_prompt(
            template_id="few_shot_classification",
            variables={
                "categories": "positive, negative, neutral",
                "examples": examples,
                "text_to_classify": test_text
            }
        )
        
        # Use a good classification model
        model = llm_manager.recommend_model("simple_qa")
        
        if model in llm_manager.get_available_models():
            llm_request = LLMRequest(
                prompt=few_shot_prompt['rendered_prompt'],
                model=model,
                provider=llm_manager.get_model_info(model)['provider'].value,
                temperature=0.1,  # Very low temperature for classification
                max_tokens=10
            )
            
            response = await llm_manager.generate_completion(llm_request)
            
            if response.success:
                classification = response.content.strip()
                print(f"✅ Classification: {classification}")
                print(f"   Tokens: {response.tokens_used['total']}, Cost: ${response.cost_estimate:.4f}")
            else:
                print(f"❌ Failed: {response.error_message}")

@sprintlens.track(
    name="structured-output-demo",
    span_type="demo",
    capture_output=True
)
async def demo_structured_output():
    """Demonstrate structured JSON output generation."""
    
    print("📊 Testing structured JSON output generation...")
    
    # Test data for extraction
    test_texts = [
        "John Smith, 28 years old, lives in San Francisco and works as a software engineer at Google",
        "Dr. Sarah Johnson, age 45, practicing medicine in Boston for 15 years",
        "Mike Chen, 32, freelance graphic designer based in New York City"
    ]
    
    # Define required fields for extraction
    required_fields = [
        {"name": "name", "description": "Full name", "type": "string", "example": '"John Doe"'},
        {"name": "age", "description": "Age in years", "type": "number", "example": "30"},
        {"name": "location", "description": "City or location", "type": "string", "example": '"City"'},
        {"name": "occupation", "description": "Job title or profession", "type": "string", "example": '"Job Title"'}
    ]
    
    for test_text in test_texts:
        print(f"\n🧪 Extracting from: '{test_text}'")
        
        structured_prompt = prompt_engine.generate_prompt(
            template_id="structured_json_output",
            variables={
                "required_fields": required_fields,
                "input_text": test_text
            }
        )
        
        # Use a good model for structured output
        model = llm_manager.recommend_model("analysis")
        if model not in llm_manager.get_available_models():
            model = llm_manager.recommend_model("simple_qa")
        
        if model in llm_manager.get_available_models():
            llm_request = LLMRequest(
                prompt=structured_prompt['rendered_prompt'],
                model=model,
                provider=llm_manager.get_model_info(model)['provider'].value,
                temperature=0.0,  # Deterministic for structured output
                max_tokens=200,
                response_format="json_object" if "gpt" in model else None
            )
            
            response = await llm_manager.generate_completion(llm_request)
            
            if response.success:
                try:
                    # Try to parse as JSON
                    parsed_json = json.loads(response.content)
                    print(f"✅ Extracted JSON:")
                    print(json.dumps(parsed_json, indent=2))
                    print(f"   Tokens: {response.tokens_used['total']}, Cost: ${response.cost_estimate:.4f}")
                except json.JSONDecodeError:
                    print(f"⚠️ Response not valid JSON:")
                    print(response.content)
            else:
                print(f"❌ Failed: {response.error_message}")

@sprintlens.track(
    name="performance-analytics-demo",
    span_type="demo",
    capture_output=True
)
async def demo_performance_analytics():
    """Demonstrate performance analytics and cost tracking."""
    
    print("📈 Performance Analytics Summary")
    
    # Get prompt engine statistics
    prompt_stats = prompt_engine.get_usage_statistics()
    print(f"\n🎨 Prompt Engine Statistics:")
    print(f"   Total prompts generated: {prompt_stats['total_prompts_generated']}")
    print(f"   Available templates: {prompt_stats['total_templates']}")
    print(f"   Most used template: {prompt_stats['most_used_template']}")
    
    if prompt_stats['template_usage']:
        print(f"   Template usage:")
        for template_id, count in prompt_stats['template_usage'].items():
            print(f"     • {template_id}: {count} times")
    
    # Get LLM manager statistics
    cost_stats = llm_manager.get_cost_statistics()
    print(f"\n🧠 LLM Manager Statistics:")
    print(f"   Total requests: {cost_stats['total_requests']}")
    print(f"   Total tokens: {cost_stats['total_tokens']:,}")
    print(f"   Total cost: ${cost_stats['total_cost']:.4f}")
    print(f"   Average cost per request: ${cost_stats['average_cost_per_request']:.4f}")
    print(f"   Average tokens per request: {cost_stats['average_tokens_per_request']:.1f}")
    
    if cost_stats['provider_usage']:
        print(f"   Provider usage:")
        for provider, usage in cost_stats['provider_usage'].items():
            print(f"     • {provider}: {usage['requests']} requests, ${usage['cost']:.4f}")
    
    if cost_stats['model_usage']:
        print(f"   Model usage:")
        for model, usage in cost_stats['model_usage'].items():
            print(f"     • {model}: {usage['requests']} requests, ${usage['cost']:.4f}")
    
    # Available models
    available_models = llm_manager.get_available_models()
    print(f"\n🤖 Available Models ({len(available_models)}):")
    for model in available_models:
        model_info = llm_manager.get_model_info(model)
        print(f"   • {model} ({model_info['provider'].value})")

if __name__ == "__main__":
    asyncio.run(run_comprehensive_demo())
```

### 3.2 Run the Demo

```bash
# Run the comprehensive GenAI prompts demo
python main.py
```

You should see output like:

```
🎨 GenAI LLM Prompts - Comprehensive Demo
============================================================

📋 Demo 1: Basic Prompt Templates
----------------------------------------
📚 Available templates: 5
  • Simple Question Answering (simple, basic)
  • Chain of Thought Reasoning (chain_of_thought, intermediate)
  • Few-Shot Text Classification (few_shot, intermediate)
  • System + User Assistant (system_user, advanced)
  • Structured JSON Output (structured_output, advanced)

🧪 Testing simple Q&A template...
Generated prompt (87 chars):
'Question: What are the benefits of using LLM observability?

Please provide a clear...'
Recommended model: gpt-3.5-turbo
✅ Response (156 tokens, $0.0003):
'LLM observability provides several key benefits: 1) Performance monitoring to track...'

🧠 Demo 2: Multi-LLM Provider Comparison
----------------------------------------
🧪 Testing prompt across multiple providers...
Question: Explain artificial intelligence in simple terms

🤖 Testing gpt-3.5-turbo (openai)...
✅ Success: 98 tokens, $0.0002, 1.23s
   Preview: Artificial intelligence (AI) is technology that enables computers to perform tasks that typical...

🤖 Testing gpt-4 (openai)...
✅ Success: 112 tokens, $0.0067, 2.45s
   Preview: Artificial intelligence, or AI, is like giving computers the ability to think and learn...

📊 Comparison Summary:
Model                     Tokens   Cost     Time   Length  
------------------------------------------------------------
gpt-3.5-turbo            98       $0.0002  1.23s  423     
gpt-4                    112      $0.0067  2.45s  487
```

## 🔧 Step 4: Verify Sprint Lens Integration

### 4.1 Check Dashboard

1. **Open Sprint Lens Dashboard**: [http://localhost:3000](http://localhost:3000)

2. **Navigate to Project**:
   - Go to **Projects** → **"genai-prompt-engineering"**
   - Click on **"Traces"** tab

3. **Verify Comprehensive Tracing**:
   You should see traces like:
   ```
   📊 prompt-demo-session (main trace)
   ├── 📋 basic-templates-demo
   │   ├── 🎨 prompt-generation
   │   └── 🧠 llm-completion
   ├── 🧠 multi-llm-comparison-demo
   │   ├── 🎨 prompt-generation
   │   ├── 🤖 llm-completion (gpt-3.5-turbo)
   │   ├── 🤖 llm-completion (gpt-4)
   │   └── 🤖 llm-completion (claude-3)
   ├── 🔗 chain-of-thought-demo
   │   ├── 🎨 prompt-generation
   │   └── 🧠 llm-completion
   ├── 📚 few-shot-learning-demo
   │   ├── 🎨 prompt-generation (×4)
   │   └── 🧠 llm-completion (×4)
   ├── 📊 structured-output-demo
   │   ├── 🎨 prompt-generation (×3)
   │   └── 🧠 llm-completion (×3)
   └── 📈 performance-analytics-demo
   ```

4. **Analyze Trace Details**:
   - **Input/Output**: See complete prompts and LLM responses
   - **Performance**: Token usage, costs, response times
   - **Metadata**: Model versions, providers, temperatures
   - **Tags**: Template types, complexity levels, use cases

## 🎉 Summary

You've successfully built a **comprehensive GenAI LLM prompts system** with:

### ✅ What You Accomplished

1. **✅ Advanced Prompt Engineering**
   - Template system with Jinja2 rendering
   - Multiple prompt types (simple, chain-of-thought, few-shot, structured)
   - Variable substitution and validation
   - Prompt complexity classification

2. **✅ Multi-LLM Integration**
   - Unified interface for OpenAI, Anthropic, Azure OpenAI
   - Model recommendation system
   - Cost tracking and optimization
   - Retry logic and error handling

3. **✅ Comprehensive Observability**
   - Complete tracing of prompt generation
   - LLM call monitoring with cost tracking
   - Performance analytics and comparison
   - Token usage and response time tracking

4. **✅ Production-Ready Features**
   - Template versioning and management
   - Cost optimization and budget controls
   - Model fallback and error recovery
   - Performance monitoring and alerting

5. **✅ Advanced Use Cases**
   - Chain-of-thought reasoning
   - Few-shot learning and classification
   - Structured JSON output generation
   - Multi-provider performance comparison

### 🎯 Next Steps

Now that you have sophisticated prompt engineering capabilities, you can:

1. **Explore Advanced Features** → [11-advanced-features.md](./11-advanced-features.md)
2. **Build UI Applications** → [12-ui-application-build.md](./12-ui-application-build.md)
3. **Production Deployment** → [13-production-deployment.md](./13-production-deployment.md)

### 📊 Verify Your Implementation

**Sprint Lens Dashboard**: [http://localhost:3000](http://localhost:3000)
- 🔍 **Traces**: Complete prompt-to-response workflows
- 💰 **Cost Analytics**: Token usage and cost breakdown by provider/model
- 📊 **Performance**: Response times and success rates
- 🎯 **Project**: "genai-prompt-engineering"
- 📈 **Analytics**: Prompt template usage patterns

---

**Congratulations!** 🎉 You've built a production-ready GenAI prompt engineering system with complete observability, multi-LLM support, and advanced prompt optimization using Sprint Lens SDK.