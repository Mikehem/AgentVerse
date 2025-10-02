# Sprint Lens SDK Integration Guide

This guide provides comprehensive information about all types of integrations available in the Sprint Lens SDK, including decorators, tracing patterns, evaluation framework, and usage examples based on the actual SDK implementation.

## Table of Contents

1. [Core SDK Components](#core-sdk-components)
2. [Tracing Integrations](#tracing-integrations)
3. [Evaluation Framework](#evaluation-framework)
4. [LLM Provider Integrations](#llm-provider-integrations)
5. [Management Utilities](#management-utilities)
6. [Complete Integration Examples](#complete-integration-examples)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

## Core SDK Components

### 1. Client Configuration

```python
import sprintlens

# Method 1: Direct configuration
sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="MasterAdmin2024!",
    workspace_id="default",
    project_name="my-ai-project"
)

# Method 2: Using SprintLensClient directly
from sprintlens import SprintLensClient

client = SprintLensClient(
    url="http://localhost:3001",
    username="admin", 
    password="MasterAdmin2024!",
    workspace_id="default",
    project_name="my-ai-project"
)
await client.initialize()
```

### 2. Environment Variables

```bash
# Connection settings
export SPRINTLENS_URL="http://localhost:3001"
export SPRINTLENS_USERNAME="admin"
export SPRINTLENS_PASSWORD="MasterAdmin2024!"
export SPRINTLENS_WORKSPACE_ID="default"
export SPRINTLENS_PROJECT_NAME="project-1758599350381"

# Optional settings
export SPRINTLENS_API_KEY="your-api-key"  # Alternative to username/password
export SPRINTLENS_DEBUG="true"
export SPRINTLENS_TRACING_ENABLED="true"
# Enable detailed logging for debugging
export SPRINTLENS_LOG_LEVEL="DEBUG"
export SPRINTLENS_ENABLE_LOGGING="true"
```

## Tracing Integrations

### 1. @track Decorator (Primary Integration)

The `@track` decorator automatically creates spans for function calls:

```python
import sprintlens

# Basic usage
@sprintlens.track
def my_function(x, y):
    return x + y

# Advanced configuration
@sprintlens.track(
    name="custom-operation",
    span_type="processing",
    capture_input=True,
    capture_output=True,
    capture_exception=True,
    tags={"environment": "production", "version": "1.0"},
    metadata={"model": "gpt-4", "temperature": 0.7},
    project_name="my-specific-project",
    auto_flush=False
)
def complex_ai_function(prompt: str, context: dict) -> str:
    # Your AI logic here
    return "AI response"

# Async functions are automatically supported
@sprintlens.track(span_type="llm")
async def async_llm_call(messages: list) -> str:
    # Async AI operation
    return "Async AI response"
```

#### Span Types Available

```python
from sprintlens.tracing.types import SpanType

# Available span types:
SpanType.LLM          # For LLM/AI model calls
SpanType.RETRIEVAL    # For data retrieval operations
SpanType.EMBEDDING    # For embedding generation
SpanType.PROCESSING   # For data processing
SpanType.DATABASE     # For database operations
SpanType.HTTP         # For HTTP requests
SpanType.CUSTOM       # For custom operations (default)
```

### 2. Manual Trace and Span Creation

```python
import sprintlens
from sprintlens.tracing.types import SpanType
from sprintlens.tracing.trace import Trace

# Get the configured client
client = sprintlens.get_client()

# Create a trace manually using the Trace constructor
trace = Trace(
    name="manual-workflow",
    client=client,
    project_name="my-project",
    tags={"workflow": "data-processing"},
    metadata={"version": "2.0"}
)

# Use trace as context manager
async with trace:
    # Create spans within the trace
    with trace.span("data-preparation", span_type=SpanType.PROCESSING) as span:
        span.set_input({"raw_data": raw_data})
        processed_data = prepare_data(raw_data)
        span.set_output({"processed_data": processed_data})
        span.add_tag("status", "success")
        span.add_metric("processing_time", 1.5)

    with trace.span("llm-inference", span_type=SpanType.LLM) as span:
        span.set_input({"prompt": prompt, "model": "gpt-4"})
        response = call_llm(prompt)
        span.set_output({"response": response})
        span.add_metric("tokens_used", 150)
        span.add_metric("cost", 0.003)
        span.set_model_info(model="gpt-4", provider="openai")
```

### 3. Context Management

```python
from sprintlens.tracing.context import (
    get_current_trace, set_current_trace,
    get_current_span, TraceContext
)
from sprintlens.tracing.trace import Trace

# Working with trace context
client = sprintlens.get_client()
trace = Trace(name="context-example", client=client)

# Method 1: Using async context manager
async with trace:
    # Any @track decorated functions within this context
    # will automatically be added to this trace
    current_trace = get_current_trace()  # Returns the active trace
    result = my_tracked_function()  # Automatically added to trace

# Method 2: Using TraceContext explicitly
with TraceContext(trace):
    current_trace = get_current_trace()
    result = my_tracked_function()
```

## Evaluation Framework

### 1. Built-in Metrics

```python
from sprintlens.evaluation import (
    AccuracyMetric, PrecisionMetric, RecallMetric, F1Metric,
    ExactMatchMetric, SimilarityMetric, ContainmentMetric,
    Evaluator
)

# Initialize metrics
metrics = [
    AccuracyMetric(),
    F1Metric(average='weighted'),
    ExactMatchMetric(),
    SimilarityMetric(threshold=0.8)
]

# Create evaluator
evaluator = Evaluator(metrics)

# Evaluate predictions
predictions = ["hello world", "goodbye world"]
ground_truth = ["hello world", "farewell world"]

result = await evaluator.evaluate_async(predictions, ground_truth)
print(f"Overall score: {result.overall_score}")
print(f"Accuracy: {result.get_metric_score('accuracy')}")
print(f"F1 Score: {result.get_metric_score('f1')}")
```

### 2. LLM-based Metrics

```python
from sprintlens.evaluation import (
    RelevanceMetric, FactualConsistencyMetric, CoherenceMetric,
    HallucinationMetric, ToxicityMetric, BiasMetric,
    LLMAsJudgeMetric
)

# LLM-based evaluation metrics
llm_metrics = [
    RelevanceMetric(llm_provider=openai_provider),
    FactualConsistencyMetric(llm_provider=openai_provider),
    CoherenceMetric(llm_provider=openai_provider),
    HallucinationMetric(llm_provider=openai_provider, threshold=0.3),
    ToxicityMetric(llm_provider=openai_provider),
]

evaluator = Evaluator(llm_metrics)
result = await evaluator.evaluate_async(ai_responses, reference_texts)
```

### 3. Custom Metrics

```python
from sprintlens.evaluation import CustomMetric, MetricResult

class CustomAccuracyMetric(CustomMetric):
    def __init__(self, case_sensitive=False):
        super().__init__(name="custom_accuracy")
        self.case_sensitive = case_sensitive
    
    def evaluate(self, predictions, ground_truth, **kwargs):
        if len(predictions) != len(ground_truth):
            return MetricResult(
                name=self.name,
                error="Predictions and ground truth must have same length"
            )
        
        correct = 0
        for pred, truth in zip(predictions, ground_truth):
            if not self.case_sensitive:
                pred, truth = pred.lower(), truth.lower()
            if pred == truth:
                correct += 1
        
        accuracy = correct / len(predictions)
        
        return MetricResult(
            name=self.name,
            value=accuracy,
            details={
                "correct": correct,
                "total": len(predictions),
                "case_sensitive": self.case_sensitive
            }
        )

# Use custom metric
custom_metric = CustomAccuracyMetric(case_sensitive=False)
evaluator = Evaluator([custom_metric])
```

### 4. Batch Evaluation

```python
from sprintlens.evaluation import BatchEvaluator, EvaluationDataset, DatasetItem

# Create dataset
dataset_items = [
    DatasetItem(
        input={"question": "What is AI?"},
        expected_output="Artificial Intelligence is...",
        metadata={"category": "definition"}
    ),
    DatasetItem(
        input={"question": "How does ML work?"},
        expected_output="Machine Learning works by...",
        metadata={"category": "explanation"}
    )
]

dataset = EvaluationDataset("ai-qa-dataset", dataset_items)

# Batch evaluation
batch_evaluator = BatchEvaluator(
    metrics=[AccuracyMetric(), F1Metric()],
    batch_size=10,
    parallel_workers=4
)

# Your AI function to evaluate
@sprintlens.track(span_type="llm")
def ai_qa_function(question: str) -> str:
    # Your AI logic here
    return f"AI answer to: {question}"

# Run batch evaluation
results = await batch_evaluator.evaluate_function_async(
    func=ai_qa_function,
    dataset=dataset,
    input_mapping=lambda item: item.input["question"],
    expected_mapping=lambda item: item.expected_output
)
```

## LLM Provider Integrations

### 1. Provider Setup

```python
from sprintlens.llm import OpenAIProvider, AzureOpenAIProvider

# OpenAI Provider
openai_provider = OpenAIProvider(
    api_key="your-openai-api-key"
)

# Azure OpenAI Provider
azure_provider = AzureOpenAIProvider(
    api_key="your-azure-api-key",
    endpoint="https://your-resource.openai.azure.com",
    api_version="2024-02-15-preview"
)

# Use provider with evaluation metrics
relevance_metric = RelevanceMetric(llm_provider=openai_provider)
```

### 2. Custom Provider Implementation

```python
from sprintlens.llm import LLMProvider

class CustomLLMProvider(LLMProvider):
    def __init__(self, api_key: str, base_url: str):
        self.api_key = api_key
        self.base_url = base_url
    
    async def generate_async(
        self,
        messages: list,
        model: str = None,
        temperature: float = 0.7,
        max_tokens: int = None,
        **kwargs
    ) -> str:
        # Implement your LLM API integration
        # Return the generated response
        return "Custom LLM response"

# Use custom provider
custom_provider = CustomLLMProvider("api-key", "https://api.custom-llm.com")
```

## Management Utilities

### 1. Project Management

```python
from sprintlens.management import ProjectManager

project_manager = ProjectManager(client)

# Create project
project = await project_manager.create_project(
    name="AI Chatbot Project",
    description="Customer support chatbot with RAG",
    tags={"team": "ai", "product": "chatbot"}
)

# List projects
projects = await project_manager.list_projects()

# Get project details
project_details = await project_manager.get_project(project.id)
```

### 2. Agent Management

```python
from sprintlens.management import AgentManager

agent_manager = AgentManager(client)

# Create agent
agent = await agent_manager.create_agent(
    name="Support Agent",
    project_id=project.id,
    agent_type="conversational",
    description="Customer support agent with knowledge base",
    configuration={
        "model": "gpt-4",
        "temperature": 0.3,
        "max_tokens": 1000,
        "system_prompt": "You are a helpful customer support agent..."
    }
)

# List agents
agents = await agent_manager.list_agents(project_id=project.id)
```

### 3. Distributed Tracing Setup

```python
from sprintlens.management import DistributedTraceSetup

# Configure distributed tracing for multi-service architecture
dist_setup = DistributedTraceSetup(client)

# Setup trace propagation
trace_context = await dist_setup.create_distributed_context(
    service_name="api-gateway",
    trace_id="custom-trace-id",
    parent_span_id="parent-span-id"
)

# Use in microservice
@sprintlens.track(span_type="http")
def microservice_call(data):
    # This span will be part of the distributed trace
    return process_data(data)
```

## Complete Integration Examples

### 1. AI Customer Support Agent

```python
import sprintlens
from sprintlens.evaluation import AccuracyMetric, RelevanceMetric, CoherenceMetric
from sprintlens.llm import OpenAIProvider

# Configure SDK
sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="MasterAdmin2024!",
    project_name="customer-support-agent"
)

# Setup LLM provider for evaluation
openai_provider = OpenAIProvider(api_key="your-api-key")

class CustomerSupportAgent:
    def __init__(self):
        self.knowledge_base = self._load_knowledge_base()
        
        # Setup evaluation metrics
        self.evaluator = sprintlens.Evaluator([
            AccuracyMetric(),
            RelevanceMetric(llm_provider=openai_provider),
            CoherenceMetric(llm_provider=openai_provider)
        ])
    
    @sprintlens.track(
        name="knowledge-retrieval",
        span_type="retrieval",
        tags={"component": "knowledge-base"}
    )
    def retrieve_knowledge(self, query: str) -> list:
        """Retrieve relevant knowledge from knowledge base."""
        # Knowledge retrieval logic
        relevant_docs = self.knowledge_base.search(query)
        return relevant_docs
    
    @sprintlens.track(
        name="llm-response-generation", 
        span_type="llm",
        tags={"model": "gpt-4", "component": "response-generator"},
        metadata={"temperature": 0.3, "max_tokens": 500}
    )
    async def generate_response(self, query: str, context: list) -> str:
        """Generate response using LLM with retrieved context."""
        prompt = self._build_prompt(query, context)
        
        # Simulate LLM call
        response = await self._call_llm(prompt)
        return response
    
    @sprintlens.track(
        name="customer-support-workflow",
        span_type="custom",
        tags={"workflow": "customer-support", "version": "1.0"},
        auto_flush=True
    )
    async def handle_customer_query(self, query: str) -> dict:
        """Complete customer support workflow."""
        
        # Step 1: Retrieve relevant knowledge
        relevant_docs = self.retrieve_knowledge(query)
        
        # Step 2: Generate response
        response = await self.generate_response(query, relevant_docs)
        
        # Step 3: Evaluate response quality (optional)
        if hasattr(self, 'ground_truth_response'):
            eval_result = await self.evaluator.evaluate_async(
                [response], 
                [self.ground_truth_response]
            )
            
            # Add evaluation metrics to current span
            current_span = sprintlens.get_current_span()
            if current_span:
                current_span.add_metric("relevance_score", eval_result.get_metric_score('relevance'))
                current_span.add_metric("coherence_score", eval_result.get_metric_score('coherence'))
        
        return {
            "query": query,
            "response": response,
            "knowledge_sources": [doc.id for doc in relevant_docs],
            "timestamp": datetime.now().isoformat()
        }

# Usage
agent = CustomerSupportAgent()
result = await agent.handle_customer_query("How do I reset my password?")
```

### 2. Multi-Agent RAG System

```python
import sprintlens
from sprintlens.management import AgentManager, ProjectManager

# Setup project and agents
client = sprintlens.get_client()
project_manager = ProjectManager(client)
agent_manager = AgentManager(client)

# Create project
project = await project_manager.create_project(
    name="Multi-Agent RAG System",
    description="Collaborative agents for complex query answering"
)

class MultiAgentRAGSystem:
    def __init__(self, project_id: str):
        self.project_id = project_id
    
    @sprintlens.track(
        name="query-router",
        span_type="processing",
        tags={"agent": "router", "component": "query-analysis"}
    )
    def route_query(self, query: str) -> str:
        """Route query to appropriate specialist agent."""
        # Query classification logic
        if "technical" in query.lower():
            return "technical_agent"
        elif "billing" in query.lower():
            return "billing_agent"
        else:
            return "general_agent"
    
    @sprintlens.track(
        name="specialist-agent-processing",
        span_type="llm",
        tags={"component": "specialist-processing"}
    )
    async def process_with_specialist(self, query: str, agent_type: str) -> str:
        """Process query with specialist agent."""
        
        # Get current span to add agent-specific metadata
        current_span = sprintlens.get_current_span()
        if current_span:
            current_span.add_tag("specialist_agent", agent_type)
            current_span.set_metadata("routing_decision", agent_type)
        
        # Specialist processing logic
        response = await self._call_specialist_agent(query, agent_type)
        return response
    
    @sprintlens.track(
        name="response-synthesis",
        span_type="processing",
        tags={"component": "synthesis", "stage": "final"}
    )
    def synthesize_response(self, specialist_responses: list) -> str:
        """Synthesize responses from multiple agents."""
        # Response synthesis logic
        final_response = self._combine_responses(specialist_responses)
        return final_response
    
    @sprintlens.track(
        name="multi-agent-rag-workflow",
        span_type="custom",
        tags={"workflow": "multi-agent-rag", "system": "collaborative"},
        auto_flush=True
    )
    async def process_query(self, query: str) -> dict:
        """Complete multi-agent RAG workflow."""
        
        # Route query
        agent_type = self.route_query(query)
        
        # Process with specialist
        specialist_response = await self.process_with_specialist(query, agent_type)
        
        # Synthesize final response
        final_response = self.synthesize_response([specialist_response])
        
        return {
            "query": query,
            "routed_to": agent_type,
            "response": final_response,
            "workflow_id": sprintlens.get_current_trace().id
        }

# Usage
rag_system = MultiAgentRAGSystem(project.id)
result = await rag_system.process_query("How do I configure technical settings for billing?")
```

## Common Patterns

### 1. Error Handling with Tracing

```python
@sprintlens.track(
    name="error-handling-example",
    capture_exception=True,
    tags={"pattern": "error-handling"}
)
def function_with_error_handling():
    try:
        # Your logic here
        result = risky_operation()
        return result
    except SpecificException as e:
        # Current span will automatically capture the exception
        # Add additional context
        current_span = sprintlens.get_current_span()
        if current_span:
            current_span.add_tag("error_type", "specific_error")
            current_span.set_metadata("error_context", {"operation": "risky_operation"})
        raise
    except Exception as e:
        # Generic error handling
        current_span = sprintlens.get_current_span()
        if current_span:
            current_span.add_tag("error_type", "generic_error")
        raise
```

### 2. Conditional Tracing

```python
import os

# Enable tracing only in specific environments
ENABLE_TRACING = os.getenv("ENABLE_TRACING", "true").lower() == "true"

def conditional_track(**kwargs):
    """Decorator that conditionally applies tracking."""
    def decorator(func):
        if ENABLE_TRACING:
            return sprintlens.track(**kwargs)(func)
        else:
            return func
    return decorator

@conditional_track(
    name="production-function",
    span_type="processing"
)
def my_function():
    # This will only be traced if ENABLE_TRACING is true
    return "result"
```

### 3. Custom Span Attributes

```python
@sprintlens.track(span_type="custom")
def function_with_custom_attributes(user_id: str, operation: str):
    span = sprintlens.get_current_span()
    
    # Add dynamic attributes
    span.add_tag("user_id", user_id)
    span.add_tag("operation_type", operation)
    span.set_metadata("execution_context", {
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("ENVIRONMENT", "development")
    })
    
    # Add performance metrics
    start_time = time.time()
    result = perform_operation()
    execution_time = time.time() - start_time
    
    span.add_metric("execution_time_seconds", execution_time)
    span.add_metric("result_size_bytes", len(str(result)))
    
    return result
```

## Troubleshooting

### Common Issues and Solutions

1. **"No global client configured" Error**
   ```python
   # Solution: Ensure sprintlens.configure() is called before using decorators
   sprintlens.configure(url="http://localhost:3001", username="admin", password="MasterAdmin2024!")
   ```

2. **Authentication Errors**
   ```python
   # Check credentials and backend connectivity
   client = sprintlens.get_client()
   if client:
       print("Client configured successfully")
   else:
       print("Client not configured - check your credentials")
   ```

3. **Traces Not Visible in UI**
   ```python
   # Issue: Traces created but not visible in the Sprint Lens UI
   # Root Cause: Project ID mismatch between SDK configuration and backend
   
   # Solution 1: Verify project ID configuration
   # Check .env file has correct project ID
   SPRINTLENS_PROJECT_NAME=project-1758599350381  # Use actual project ID
   
   # Solution 2: Check traces in database are using correct project ID
   # Use validation script to verify configuration
   poetry run python validate_connection.py
   
   # Solution 3: Add agent tagging to traces
   @sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k"})
   def my_function():
       return "result"
   ```

4. **Spans Not Appearing**
   ```python
   # Ensure auto_flush=True or manually flush traces
   @sprintlens.track(auto_flush=True)
   def my_function():
       return "result"
   
   # Or manually flush
   trace = sprintlens.get_current_trace()
   if trace:
       await trace.finish()
   ```

5. **Performance Issues**
   ```python
   # Use async operations and configure buffering
   sprintlens.configure(
       url="http://localhost:3001",
       username="admin",
       password="MasterAdmin2024!",
       batch_size=100,  # Increase batch size
       flush_interval=30.0,  # Increase flush interval
       async_mode=True  # Enable async processing
   )
   ```

6. **Memory Issues with Large Data**
   ```python
   # Configure data size limits
   @sprintlens.track(
       capture_input=False,  # Disable for large inputs
       capture_output=False  # Disable for large outputs
   )
   def function_with_large_data():
       # Or capture only metadata
       span = sprintlens.get_current_span()
       span.set_metadata("input_size", len(input_data))
       span.set_metadata("output_type", type(output_data).__name__)
   ```

### Best Practices

1. **Use appropriate span types** - Choose the most specific span type for better categorization
2. **Add meaningful tags** - Use consistent tagging for easier filtering and analysis
3. **Capture relevant metrics** - Add custom metrics that matter for your use case
4. **Handle errors gracefully** - Always use `capture_exception=True` for critical functions
5. **Use async when possible** - Async operations provide better performance
6. **Configure appropriate flush settings** - Balance between real-time visibility and performance
7. **Use evaluation framework** - Regularly evaluate your AI components for quality assurance

This guide covers all major integration patterns available in the Sprint Lens SDK. For specific use cases or advanced configurations, refer to the individual component documentation or contact the development team.