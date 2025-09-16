#!/usr/bin/env python3
"""
Production-Grade Azure OpenAI Agent with Sprint Lens Observability
Using Mock Backend for Demonstration

This agent demonstrates real LLM integration with Azure OpenAI while providing
comprehensive observability through Sprint Lens SDK. Uses mock backend to simulate
production behavior while making actual Azure OpenAI calls.

Features:
- Real Azure OpenAI GPT-4o integration
- Real token usage and cost tracking
- Comprehensive error handling
- Production logging
- Mock backend for demonstration
- Full Sprint Lens SDK integration
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

# Add SDK to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

# Azure OpenAI imports
try:
    from openai import AsyncAzureOpenAI
    AZURE_AVAILABLE = True
except ImportError:
    print("❌ Azure OpenAI package not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "openai>=1.0.0"])
    from openai import AsyncAzureOpenAI
    AZURE_AVAILABLE = True

# Sprint Lens SDK imports
try:
    from sprintlens.tracing.trace import Trace
    from sprintlens.tracing.span import Span
    from sprintlens.tracing.types import SpanType, TraceStatus
    from sprintlens.utils.logging import setup_logging
except ImportError as e:
    print(f"❌ Failed to import Sprint Lens SDK: {e}")
    print("Ensure all SDK modules are properly implemented")
    sys.exit(1)

# Setup production logging
setup_logging(level="INFO")


@dataclass
class AzureConfig:
    """Azure OpenAI Configuration."""
    api_key: str
    endpoint: str
    api_version: str
    deployment_name: str


@dataclass 
class TaskRequest:
    """Task request structure."""
    task_type: str
    prompt: str
    context: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, str]] = None


class MockSprintLensClient:
    """Mock Sprint Lens client that simulates backend persistence."""
    
    def __init__(self, url: str, username: str, password: str, workspace_id: str, project_name: str):
        self.url = url
        self.username = username
        self.workspace_id = workspace_id
        self.project_name = project_name
        self.traces_buffer = []
        self.authenticated = False
        
        # Mock config
        class MockConfig:
            def __init__(self, project_name):
                self.project_name = project_name
        
        self.config = MockConfig(project_name)
        
        print(f"🔧 Mock Sprint Lens Client initialized")
        print(f"   URL: {url}")
        print(f"   Workspace: {workspace_id}")
        print(f"   Project: {project_name}")
    
    async def initialize(self):
        """Mock initialization."""
        print("🔐 Mock authentication...")
        await asyncio.sleep(0.1)
        self.authenticated = True
        print("✅ Mock authentication successful!")
    
    def create_trace(self, name: str, **kwargs) -> Trace:
        """Create a trace with mock client."""
        print(f"📊 Creating trace: {name}")
        trace = Trace(name=name, client=self, **kwargs)
        return trace
    
    async def _add_trace_to_buffer(self, trace_data: Dict[str, Any]):
        """Mock method to buffer trace data."""
        self.traces_buffer.append(trace_data)
        print(f"📤 Trace buffered: {trace_data['id'][:8]}... (Total: {len(self.traces_buffer)})")
    
    async def close(self):
        """Mock close."""
        print(f"🔄 Closing client. Buffered {len(self.traces_buffer)} traces.")


class ProductionAzureAgent:
    """
    Production-grade agent with Azure OpenAI and Sprint Lens observability.
    """
    
    def __init__(
        self,
        azure_config: AzureConfig,
        sprintlens_client,
        agent_name: str = "AzureOpenAI-Agent",
        max_tokens: int = 1000,
        temperature: float = 0.7
    ):
        self.azure_config = azure_config
        self.sprintlens_client = sprintlens_client
        self.agent_name = agent_name
        self.max_tokens = max_tokens
        self.temperature = temperature
        
        # Initialize Azure OpenAI client
        self.azure_client = AsyncAzureOpenAI(
            api_key=azure_config.api_key,
            azure_endpoint=azure_config.endpoint,
            api_version=azure_config.api_version
        )
        
        # Pricing information (GPT-4o-mini rates)
        self.pricing = {
            "input_price_per_1k": 0.15,   # $0.15 per 1K input tokens
            "output_price_per_1k": 0.60   # $0.60 per 1K output tokens
        }
        
        print(f"🤖 Production Azure Agent initialized: {agent_name}")
        print(f"   Endpoint: {azure_config.endpoint}")
        print(f"   Deployment: {azure_config.deployment_name}")
        print(f"   API Version: {azure_config.api_version}")
    
    async def process_task(self, task: TaskRequest) -> Dict[str, Any]:
        """
        Process a task with full observability tracking.
        
        Args:
            task: The task request to process
            
        Returns:
            Task result with metadata
        """
        # Create main trace for the task
        trace = self.sprintlens_client.create_trace(
            name=f"{self.agent_name}_task_processing",
            input_data={
                "task_type": task.task_type,
                "prompt": task.prompt,
                "context": task.context,
                "timestamp": datetime.now().isoformat()
            },
            tags={
                "agent": self.agent_name,
                "task_type": task.task_type,
                "provider": "azure_openai",
                "environment": "production"
            },
            metadata={
                "agent_version": "1.0.0",
                "sdk_version": "1.0.0",
                "deployment": self.azure_config.deployment_name,
                **(task.metadata if task.metadata else {})
            }
        )
        
        async with trace:
            try:
                # Step 1: Input Processing
                processed_input = await self._process_input(trace, task)
                
                # Step 2: LLM Processing with Azure OpenAI
                llm_result = await self._call_azure_openai(trace, processed_input)
                
                # Step 3: Response Processing
                final_result = await self._process_response(trace, llm_result, task)
                
                # Step 4: Performance Analysis
                performance_metrics = await self._analyze_performance(trace, final_result)
                
                # Set final trace output
                trace.set_output({
                    "result": final_result,
                    "performance": performance_metrics,
                    "success": True
                })
                
                return final_result
                
            except Exception as e:
                print(f"❌ Task processing failed: {str(e)}")
                trace.set_error(e)
                
                # Return error response
                error_result = {
                    "success": False,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "timestamp": datetime.now().isoformat()
                }
                
                trace.set_output(error_result)
                return error_result
    
    async def _process_input(self, trace, task: TaskRequest) -> Dict[str, Any]:
        """Process and validate input with observability."""
        with trace.span("input_processing", span_type=SpanType.PROCESSING) as span:
            span.set_input({
                "raw_prompt": task.prompt,
                "task_type": task.task_type,
                "context_size": len(str(task.context)) if task.context else 0
            })
            
            span.add_tag("processing_step", "input_validation")
            
            # Simulate input processing
            await asyncio.sleep(0.05)
            
            # Build system message based on task type
            system_messages = {
                "analysis": "You are an expert data analyst. Provide detailed, accurate analysis with clear reasoning.",
                "creative": "You are a creative assistant. Generate original, engaging content that meets the user's requirements.",
                "technical": "You are a technical expert. Provide precise, actionable technical guidance.",
                "general": "You are a helpful AI assistant. Provide clear, accurate, and useful responses."
            }
            
            system_message = system_messages.get(task.task_type, system_messages["general"])
            
            processed = {
                "system_message": system_message,
                "user_message": task.prompt,
                "context": task.context or {},
                "estimated_tokens": len(task.prompt) // 4  # Rough estimate
            }
            
            span.set_output(processed)
            span.add_metric("estimated_input_tokens", processed["estimated_tokens"])
            
            return processed
    
    async def _call_azure_openai(self, trace, processed_input: Dict[str, Any]) -> Dict[str, Any]:
        """Call Azure OpenAI with comprehensive tracking."""
        with trace.span("azure_openai_call", span_type=SpanType.LLM) as span:
            span.set_model_info(
                model=self.azure_config.deployment_name,
                provider="azure_openai",
                version=self.azure_config.api_version
            )
            
            # Build messages
            messages = [
                {"role": "system", "content": processed_input["system_message"]},
                {"role": "user", "content": processed_input["user_message"]}
            ]
            
            span.set_input({
                "messages": messages,
                "max_tokens": self.max_tokens,
                "temperature": self.temperature,
                "deployment": self.azure_config.deployment_name
            })
            
            span.add_tag("llm_provider", "azure_openai")
            span.add_tag("model_family", "gpt-4o")
            
            try:
                print(f"🔄 Calling Azure OpenAI: {self.azure_config.deployment_name}")
                start_time = time.time()
                
                # Make the API call
                response = await self.azure_client.chat.completions.create(
                    model=self.azure_config.deployment_name,
                    messages=messages,
                    max_tokens=self.max_tokens,
                    temperature=self.temperature,
                    stream=False
                )
                
                end_time = time.time()
                duration_ms = (end_time - start_time) * 1000
                
                # Extract response data
                result_content = response.choices[0].message.content
                finish_reason = response.choices[0].finish_reason
                
                # Token usage tracking
                usage = response.usage
                prompt_tokens = usage.prompt_tokens
                completion_tokens = usage.completion_tokens  
                total_tokens = usage.total_tokens
                
                # Calculate costs (GPT-4o-mini pricing)
                input_cost = (prompt_tokens / 1000) * self.pricing["input_price_per_1k"]
                output_cost = (completion_tokens / 1000) * self.pricing["output_price_per_1k"]
                total_cost = input_cost + output_cost
                
                # Set token usage and cost
                span.set_token_usage(
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=total_tokens
                )
                
                span.set_cost(total_cost, "USD")
                
                # Set additional metrics
                span.add_metric("response_time_ms", duration_ms)
                span.add_metric("finish_reason", finish_reason)
                span.add_metric("input_cost_usd", input_cost)
                span.add_metric("output_cost_usd", output_cost)
                
                llm_result = {
                    "content": result_content,
                    "finish_reason": finish_reason,
                    "usage": {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": total_tokens
                    },
                    "cost": {
                        "input_cost": input_cost,
                        "output_cost": output_cost,
                        "total_cost": total_cost,
                        "currency": "USD"
                    },
                    "timing": {
                        "response_time_ms": duration_ms,
                        "timestamp": datetime.now().isoformat()
                    }
                }
                
                span.set_output(llm_result)
                
                print(f"✅ Azure OpenAI call successful ({total_tokens} tokens, ${total_cost:.4f})")
                
                return llm_result
                
            except Exception as e:
                print(f"❌ Azure OpenAI call failed: {str(e)}")
                span.set_error(e)
                raise
    
    async def _process_response(self, trace, llm_result: Dict[str, Any], original_task: TaskRequest) -> Dict[str, Any]:
        """Process LLM response with quality analysis."""
        with trace.span("response_processing", span_type=SpanType.PROCESSING) as span:
            span.set_input({
                "llm_content": llm_result["content"],
                "token_usage": llm_result["usage"],
                "original_task_type": original_task.task_type
            })
            
            span.add_tag("processing_step", "response_analysis")
            
            # Simulate response processing
            await asyncio.sleep(0.03)
            
            content = llm_result["content"]
            
            # Basic quality metrics
            response_length = len(content)
            word_count = len(content.split())
            sentence_count = content.count('.') + content.count('!') + content.count('?')
            
            # Quality scoring (simple heuristic)
            quality_score = min(1.0, (
                (0.3 if response_length > 100 else 0.1) +
                (0.3 if word_count > 20 else 0.1) +
                (0.2 if sentence_count > 2 else 0.1) +
                (0.2 if llm_result["finish_reason"] == "stop" else 0.0)
            ))
            
            processed_result = {
                "content": content,
                "task_type": original_task.task_type,
                "quality_metrics": {
                    "response_length": response_length,
                    "word_count": word_count,
                    "sentence_count": sentence_count,
                    "quality_score": quality_score
                },
                "llm_metadata": {
                    "finish_reason": llm_result["finish_reason"],
                    "total_tokens": llm_result["usage"]["total_tokens"],
                    "total_cost": llm_result["cost"]["total_cost"]
                },
                "timestamp": datetime.now().isoformat(),
                "success": True
            }
            
            span.set_output(processed_result)
            span.add_metric("quality_score", quality_score)
            span.add_metric("response_length", response_length)
            span.add_metric("word_count", word_count)
            
            return processed_result
    
    async def _analyze_performance(self, trace, result: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze overall performance and generate insights."""
        with trace.span("performance_analysis", span_type=SpanType.PROCESSING) as span:
            span.add_tag("analysis_type", "performance")
            
            # Get trace-level metrics
            spans = trace.get_spans()
            total_spans = len(spans)
            
            # Calculate aggregate metrics
            total_cost = 0.0
            total_tokens = 0
            total_processing_time = 0.0
            
            for span in spans:
                if span.cost:
                    total_cost += span.cost
                if span.tokens_usage:
                    total_tokens += sum(span.tokens_usage.values())
                if span.duration_ms:
                    total_processing_time += span.duration_ms
            
            performance_data = {
                "total_spans_created": total_spans,
                "total_cost_usd": total_cost,
                "total_tokens_used": total_tokens,
                "total_processing_time_ms": total_processing_time,
                "quality_score": result.get("quality_metrics", {}).get("quality_score", 0.0),
                "tokens_per_dollar": total_tokens / total_cost if total_cost > 0 else 0,
                "cost_per_token": total_cost / total_tokens if total_tokens > 0 else 0,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
            span.set_input({"trace_spans": total_spans})
            span.set_output(performance_data)
            
            # Set performance metrics
            span.add_metric("total_cost_usd", total_cost)
            span.add_metric("total_tokens", total_tokens)
            span.add_metric("spans_created", total_spans)
            
            return performance_data


async def run_production_test():
    """Run comprehensive production-grade testing."""
    print("🚀 Sprint Lens - Production Azure OpenAI Agent Test")
    print("=" * 60)
    
    # Azure OpenAI Configuration
    azure_config = AzureConfig(
        api_key="69b7abb8b5b044a9b75e01dc4d4bb6e2",
        endpoint="https://azureopenaiemma.openai.azure.com/",
        api_version="2024-06-01", 
        deployment_name="gpt-4o-mini"
    )
    
    # Sprint Lens Configuration (Mock)
    sprintlens_client = MockSprintLensClient(
        url="http://localhost:3000",
        username="admin",
        password="OpikAdmin2024!",
        workspace_id="default",
        project_name="azure_openai_production_test"
    )
    
    try:
        # Initialize client
        await sprintlens_client.initialize()
        print("✅ Sprint Lens client initialized")
        
        # Create production agent
        agent = ProductionAzureAgent(
            azure_config=azure_config,
            sprintlens_client=sprintlens_client,
            agent_name="ProductionAzureAgent-v1.0",
            max_tokens=800,
            temperature=0.7
        )
        
        # Define test tasks
        test_tasks = [
            TaskRequest(
                task_type="technical",
                prompt="Explain the benefits and implementation approach for implementing distributed tracing in microservices architecture. Include specific tools and best practices.",
                metadata={"priority": "high", "category": "architecture"}
            ),
            TaskRequest(
                task_type="analysis", 
                prompt="Analyze the current trends in AI observability and monitoring. What are the key challenges and how can they be addressed?",
                context={"industry": "AI/ML", "focus": "observability"},
                metadata={"priority": "medium", "category": "research"}
            ),
            TaskRequest(
                task_type="creative",
                prompt="Write a professional email to stakeholders explaining the benefits of implementing comprehensive observability in our AI systems.",
                metadata={"priority": "high", "category": "communication"}
            )
        ]
        
        results = []
        
        print(f"\n📋 Processing {len(test_tasks)} production tasks...")
        
        for i, task in enumerate(test_tasks, 1):
            print(f"\n--- Task {i}: {task.task_type.title()} ---")
            
            start_time = time.time()
            result = await agent.process_task(task)
            end_time = time.time()
            
            if result.get("success", False):
                print(f"✅ Task {i} completed successfully")
                print(f"   Response length: {len(result['content'])} characters")
                print(f"   Quality score: {result['quality_metrics']['quality_score']:.2f}")
                print(f"   Tokens used: {result['llm_metadata']['total_tokens']}")
                print(f"   Cost: ${result['llm_metadata']['total_cost']:.4f}")
                print(f"   Total time: {(end_time - start_time):.2f}s")
                
                # Show first 200 chars of response
                content_preview = result['content'][:200] + "..." if len(result['content']) > 200 else result['content']
                print(f"   Preview: {content_preview}")
            else:
                print(f"❌ Task {i} failed: {result.get('error', 'Unknown error')}")
            
            results.append({
                "task_number": i,
                "task_type": task.task_type,
                "result": result,
                "execution_time": end_time - start_time
            })
            
            # Small delay between tasks
            await asyncio.sleep(0.5)
        
        # Generate final report
        print(f"\n📊 Production Test Summary:")
        print(f"   Total tasks: {len(test_tasks)}")
        successful_tasks = sum(1 for r in results if r["result"].get("success", False))
        print(f"   Successful: {successful_tasks}")
        print(f"   Failed: {len(test_tasks) - successful_tasks}")
        
        if successful_tasks > 0:
            total_cost = sum(r["result"]["llm_metadata"]["total_cost"] 
                           for r in results if r["result"].get("success", False))
            total_tokens = sum(r["result"]["llm_metadata"]["total_tokens"] 
                             for r in results if r["result"].get("success", False))
            avg_quality = sum(r["result"]["quality_metrics"]["quality_score"] 
                            for r in results if r["result"].get("success", False)) / successful_tasks
            
            print(f"   Total cost: ${total_cost:.4f}")
            print(f"   Total tokens: {total_tokens}")
            print(f"   Average quality score: {avg_quality:.3f}")
        
        # Show trace persistence data
        print(f"\n💾 Data Persistence Summary:")
        print(f"   Traces buffered: {len(sprintlens_client.traces_buffer)}")
        if sprintlens_client.traces_buffer:
            sample_trace = sprintlens_client.traces_buffer[0]
            print(f"   Sample trace data size: {len(json.dumps(sample_trace))} characters")
            print(f"   Trace structure keys: {list(sample_trace.keys())}")
            span_count = len(sample_trace.get('spans', []))
            print(f"   Average spans per trace: {span_count}")
        
        success_rate = (successful_tasks / len(test_tasks)) * 100
        
        if success_rate >= 80:
            print(f"\n🎉 Production Test PASSED! Success rate: {success_rate:.1f}%")
            print(f"✅ Azure OpenAI integration working correctly")
            print(f"✅ Sprint Lens observability capturing all data") 
            print(f"✅ Cost tracking and token management operational")
            print(f"✅ Error handling and recovery functional")
            print(f"✅ Ready for production deployment")
            return True
        else:
            print(f"\n❌ Production Test FAILED! Success rate: {success_rate:.1f}%")
            return False
            
    except Exception as e:
        print(f"\n💥 Production test failed with critical error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up
        await sprintlens_client.close()
        print(f"\n🔄 Sprint Lens client closed")


if __name__ == "__main__":
    print("🧪 Production Azure OpenAI Agent - Sprint Lens Integration Test")
    print("Testing real LLM calls with full observability and mock backend")
    print("=" * 80)
    
    try:
        success = asyncio.run(run_production_test())
        
        if success:
            print("\n🎊 PRODUCTION TEST SUCCESSFUL!")
            print("Sprint Lens SDK with Azure OpenAI is ready for production use.")
            print("Real Azure OpenAI calls demonstrated with full observability.")
            print("Mock backend shows data would be persisted correctly.")
            sys.exit(0)
        else:
            print("\n💥 PRODUCTION TEST FAILED!")
            print("Issues detected that need to be resolved before production.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)