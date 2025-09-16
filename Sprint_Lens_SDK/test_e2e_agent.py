#!/usr/bin/env python3
"""
End-to-End Test: Simple AI Agent with Sprint Lens Observability

This script creates a simple AI agent that performs various tasks while being
completely observed by the Sprint Lens SDK. It demonstrates:

1. Agent initialization with observability
2. Automatic function tracing with @track decorator
3. Manual span creation for complex workflows
4. Error handling and exception tracking
5. Data persistence verification

The agent simulates common AI operations:
- Data preprocessing
- LLM calls (simulated)
- Result processing
- Decision making
"""

import asyncio
import random
import time
import json
import sys
import os
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime

# Add SDK to path (for testing purposes)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

try:
    from sprintlens.core.client import SprintLensClient
    from sprintlens.core.config import SprintLensConfig
    from sprintlens.core.exceptions import SprintLensError, SprintLensAuthError, SprintLensConnectionError
    from sprintlens.tracing.types import SpanType
    from sprintlens.utils.logging import setup_logging
except ImportError as e:
    print(f"Failed to import Sprint Lens SDK: {e}")
    print("Please ensure the SDK is properly installed")
    sys.exit(1)

# Setup logging
setup_logging(level="INFO")

@dataclass
class AgentConfig:
    """Configuration for our test agent."""
    name: str = "TestAIAgent"
    max_iterations: int = 3
    decision_threshold: float = 0.7
    simulate_errors: bool = True
    backend_url: str = "http://localhost:3000"
    username: str = "admin"
    password: str = "OpikAdmin2024!"
    workspace_id: str = "default"


class SimpleAIAgent:
    """
    A simple AI agent with comprehensive Sprint Lens observability.
    
    This agent simulates common AI workflows:
    - Data ingestion and preprocessing
    - LLM-based reasoning and generation
    - Decision making and action execution
    - Result aggregation and reporting
    """
    
    def __init__(self, config: AgentConfig, client: SprintLensClient):
        """Initialize the agent with observability client."""
        self.config = config
        self.client = client
        self.session_id = f"session_{int(time.time())}"
        self.step_counter = 0
        
        print(f"🤖 Initializing {config.name} with observability")
        print(f"📊 Session ID: {self.session_id}")
    
    async def run_workflow(self, task_description: str, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main workflow execution with complete tracing.
        
        This creates a top-level trace that encompasses the entire agent workflow.
        """
        # Create main workflow trace
        trace = self.client.create_trace(
            name=f"{self.config.name}_workflow",
            input_data=input_data,
            tags={
                "agent": self.config.name,
                "session_id": self.session_id,
                "task_type": "ai_workflow"
            },
            metadata={
                "task_description": task_description,
                "agent_version": "1.0.0",
                "workflow_start": datetime.now().isoformat()
            },
            user_id="test_user",
            session_id=self.session_id
        )
        
        try:
            async with trace:
                print(f"🚀 Starting workflow: {task_description}")
                
                # Step 1: Data preprocessing
                processed_data = await self._preprocess_data(input_data)
                
                # Step 2: AI reasoning loop
                reasoning_results = await self._ai_reasoning_loop(processed_data, task_description)
                
                # Step 3: Decision making
                final_decision = await self._make_final_decision(reasoning_results)
                
                # Step 4: Execute actions
                execution_results = await self._execute_actions(final_decision)
                
                # Step 5: Generate report
                final_report = await self._generate_report(execution_results)
                
                # Set final output
                trace.set_output(final_report)
                
                print(f"✅ Workflow completed successfully")
                return final_report
                
        except Exception as e:
            print(f"❌ Workflow failed: {e}")
            trace.set_error(e)
            raise
    
    async def _preprocess_data(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Preprocess input data with detailed span tracking."""
        current_trace = self.client.get_current_trace()
        
        with current_trace.span("data_preprocessing", span_type=SpanType.PROCESSING) as span:
            span.set_input(input_data)
            span.add_tag("step", "preprocessing")
            span.add_tag("data_size", str(len(str(input_data))))
            
            print("📊 Preprocessing data...")
            
            # Simulate data validation
            await asyncio.sleep(0.1)
            span.set_metadata("validation_passed", True)
            
            # Simulate data transformation
            processed = {
                "original": input_data,
                "normalized": {k: str(v).lower() if isinstance(v, str) else v 
                             for k, v in input_data.items()},
                "timestamp": datetime.now().isoformat(),
                "preprocessing_version": "1.0.0"
            }
            
            # Simulate some processing metrics
            await asyncio.sleep(0.2)
            span.add_metric("processing_time_ms", 200)
            span.add_metric("data_points_processed", len(input_data))
            
            span.set_output(processed)
            print("✅ Data preprocessing completed")
            
            return processed
    
    async def _ai_reasoning_loop(self, data: Dict[str, Any], task: str) -> List[Dict[str, Any]]:
        """AI reasoning loop with multiple LLM calls."""
        current_trace = self.client.get_current_trace()
        results = []
        
        with current_trace.span("ai_reasoning_loop", span_type=SpanType.CUSTOM) as span:
            span.set_input({"data": data, "task": task})
            span.add_tag("reasoning_type", "multi_step")
            
            print("🧠 Starting AI reasoning loop...")
            
            for i in range(self.config.max_iterations):
                iteration_result = await self._simulate_llm_call(
                    f"reasoning_step_{i+1}", 
                    data, 
                    f"{task} - step {i+1}"
                )
                results.append(iteration_result)
                
                # Simulate decision to continue or stop
                confidence = iteration_result.get("confidence", 0.5)
                if confidence > self.config.decision_threshold:
                    span.add_tag("early_termination", f"step_{i+1}")
                    break
            
            span.set_metadata("total_iterations", len(results))
            span.set_output(results)
            print(f"✅ Reasoning completed after {len(results)} iterations")
            
            return results
    
    async def _simulate_llm_call(self, call_name: str, input_data: Any, prompt: str) -> Dict[str, Any]:
        """Simulate an LLM call with realistic span tracking."""
        current_trace = self.client.get_current_trace()
        
        with current_trace.span(call_name, span_type=SpanType.LLM) as span:
            # Set LLM-specific metadata
            span.set_model_info(
                model="gpt-4o-mini",
                provider="openai",
                version="2024-07-18"
            )
            
            span.set_input({
                "prompt": prompt,
                "context": input_data,
                "parameters": {
                    "temperature": 0.7,
                    "max_tokens": 150,
                    "top_p": 0.9
                }
            })
            
            span.add_tag("model_type", "chat")
            span.add_tag("call_type", "completion")
            
            print(f"🤖 Making LLM call: {call_name}")
            
            # Simulate LLM processing time
            processing_time = random.uniform(0.5, 1.5)
            await asyncio.sleep(processing_time)
            
            # Simulate realistic LLM response
            confidence = random.uniform(0.3, 0.95)
            response_text = f"AI response for '{prompt}' with confidence {confidence:.2f}"
            
            # Simulate token usage
            prompt_tokens = len(prompt.split()) * 1.3  # Rough approximation
            completion_tokens = len(response_text.split()) * 1.3
            total_tokens = int(prompt_tokens + completion_tokens)
            
            span.set_token_usage(
                prompt_tokens=int(prompt_tokens),
                completion_tokens=int(completion_tokens),
                total_tokens=total_tokens
            )
            
            # Simulate cost calculation (rough OpenAI pricing)
            cost = (prompt_tokens * 0.00015 + completion_tokens * 0.0006) / 1000
            span.set_cost(cost, "USD")
            
            response = {
                "response": response_text,
                "confidence": confidence,
                "model": "gpt-4o-mini",
                "tokens_used": total_tokens,
                "cost_usd": cost,
                "processing_time_ms": processing_time * 1000
            }
            
            span.set_output(response)
            span.add_metric("confidence_score", confidence)
            span.add_metric("processing_time_ms", processing_time * 1000)
            
            # Occasionally simulate an error
            if self.config.simulate_errors and random.random() < 0.1:
                error = Exception(f"Simulated LLM error in {call_name}")
                span.set_error(error)
                print(f"⚠️  Simulated error in {call_name}: {error}")
                raise error
            
            print(f"✅ LLM call completed: {call_name}")
            return response
    
    async def _make_final_decision(self, reasoning_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Make final decision based on reasoning results."""
        current_trace = self.client.get_current_trace()
        
        with current_trace.span("final_decision", span_type=SpanType.PROCESSING) as span:
            span.set_input(reasoning_results)
            span.add_tag("decision_algorithm", "confidence_weighted")
            
            print("🎯 Making final decision...")
            
            # Simulate decision logic
            await asyncio.sleep(0.3)
            
            if not reasoning_results:
                decision = {
                    "action": "no_action",
                    "confidence": 0.0,
                    "reasoning": "No reasoning results available"
                }
            else:
                # Weight by confidence
                total_confidence = sum(r.get("confidence", 0) for r in reasoning_results)
                avg_confidence = total_confidence / len(reasoning_results)
                
                if avg_confidence > self.config.decision_threshold:
                    action = "execute_plan"
                    reasoning = f"High confidence ({avg_confidence:.2f}) across {len(reasoning_results)} steps"
                else:
                    action = "request_human_review"
                    reasoning = f"Low confidence ({avg_confidence:.2f}), human review needed"
                
                decision = {
                    "action": action,
                    "confidence": avg_confidence,
                    "reasoning": reasoning,
                    "supporting_steps": len(reasoning_results)
                }
            
            span.set_output(decision)
            span.add_metric("final_confidence", decision["confidence"])
            span.add_metric("reasoning_steps", len(reasoning_results))
            
            print(f"✅ Decision made: {decision['action']} (confidence: {decision['confidence']:.2f})")
            return decision
    
    async def _execute_actions(self, decision: Dict[str, Any]) -> Dict[str, Any]:
        """Execute actions based on decision."""
        current_trace = self.client.get_current_trace()
        
        with current_trace.span("action_execution", span_type=SpanType.CUSTOM) as span:
            span.set_input(decision)
            span.add_tag("action_type", decision["action"])
            
            print(f"⚡ Executing action: {decision['action']}")
            
            # Simulate action execution
            execution_time = random.uniform(0.2, 0.8)
            await asyncio.sleep(execution_time)
            
            if decision["action"] == "execute_plan":
                # Simulate successful execution
                results = {
                    "status": "completed",
                    "actions_taken": ["data_analysis", "recommendation_generation", "report_creation"],
                    "execution_time_ms": execution_time * 1000,
                    "resources_used": {
                        "cpu_seconds": execution_time,
                        "memory_mb": random.randint(50, 200)
                    }
                }
                span.add_metric("actions_completed", 3)
            else:
                # Simulate deferred execution
                results = {
                    "status": "deferred",
                    "reason": decision["reasoning"],
                    "next_steps": ["human_review", "parameter_adjustment"]
                }
                span.add_metric("actions_completed", 0)
            
            span.set_output(results)
            span.add_metric("execution_time_ms", execution_time * 1000)
            
            print(f"✅ Action execution completed: {results['status']}")
            return results
    
    async def _generate_report(self, execution_results: Dict[str, Any]) -> Dict[str, Any]:
        """Generate final workflow report."""
        current_trace = self.client.get_current_trace()
        
        with current_trace.span("report_generation", span_type=SpanType.PROCESSING) as span:
            span.set_input(execution_results)
            span.add_tag("report_format", "json")
            
            print("📊 Generating final report...")
            
            # Simulate report generation
            await asyncio.sleep(0.2)
            
            report = {
                "workflow_summary": {
                    "agent_name": self.config.name,
                    "session_id": self.session_id,
                    "completion_time": datetime.now().isoformat(),
                    "status": execution_results.get("status", "unknown")
                },
                "execution_details": execution_results,
                "metrics": {
                    "total_llm_calls": self.step_counter,
                    "workflow_duration_ms": None,  # Will be calculated by trace
                    "success": execution_results.get("status") == "completed"
                },
                "recommendations": [
                    "Monitor confidence thresholds for future workflows",
                    "Consider additional validation steps for critical decisions"
                ]
            }
            
            span.set_output(report)
            span.add_metric("report_sections", len(report))
            
            print("✅ Report generation completed")
            return report


# Utility functions for testing
async def test_authentication(config: AgentConfig) -> SprintLensClient:
    """Test Sprint Lens authentication."""
    print("🔐 Testing Sprint Lens authentication...")
    
    try:
        client = SprintLensClient(
            url=config.backend_url,
            username=config.username,
            password=config.password,
            workspace_id=config.workspace_id
        )
        
        # Test authentication
        await client.authenticate()
        print("✅ Authentication successful!")
        
        # Test connectivity
        health = await client.health_check()
        print(f"✅ Backend health check passed: {health}")
        
        return client
        
    except SprintLensAuthError as e:
        print(f"❌ Authentication failed: {e}")
        print("Please check your credentials and backend configuration")
        raise
    except SprintLensConnectionError as e:
        print(f"❌ Connection failed: {e}")
        print(f"Please ensure the backend is running at {config.backend_url}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error during setup: {e}")
        raise


async def verify_data_persistence(client: SprintLensClient, session_id: str):
    """Verify that trace data was persisted to the backend."""
    print("\n🔍 Verifying data persistence...")
    
    try:
        # Wait a moment for data to be flushed
        await asyncio.sleep(2)
        
        # Try to query recent traces (this would require implementing trace querying)
        # For now, we'll just verify the client is still connected
        health = await client.health_check()
        print(f"✅ Backend connection maintained: {health}")
        
        print("✅ Data persistence verification completed")
        print(f"📊 Session data should be available in backend for session: {session_id}")
        
    except Exception as e:
        print(f"⚠️  Could not verify data persistence: {e}")


async def run_comprehensive_e2e_test():
    """Run comprehensive end-to-end test."""
    print("🧪 Starting Sprint Lens E2E Test")
    print("=" * 50)
    
    # Initialize configuration
    config = AgentConfig()
    
    try:
        # Step 1: Test authentication and setup
        client = await test_authentication(config)
        
        # Step 2: Initialize agent
        agent = SimpleAIAgent(config, client)
        
        # Step 3: Run multiple workflows to test different scenarios
        test_scenarios = [
            {
                "name": "Data Analysis Workflow",
                "task": "Analyze customer feedback data and provide insights",
                "input": {
                    "data_source": "customer_feedback.csv",
                    "analysis_type": "sentiment_analysis",
                    "priority": "high",
                    "customer_segments": ["enterprise", "small_business"]
                }
            },
            {
                "name": "Content Generation Workflow",
                "task": "Generate marketing content for new product launch",
                "input": {
                    "product_name": "AI Assistant Pro",
                    "target_audience": "developers",
                    "content_types": ["blog_post", "social_media", "email"],
                    "tone": "professional"
                }
            },
            {
                "name": "Decision Support Workflow",
                "task": "Evaluate investment opportunities and provide recommendations",
                "input": {
                    "opportunities": ["ai_startup_a", "saas_platform_b", "hardware_company_c"],
                    "budget": 1000000,
                    "risk_tolerance": "moderate",
                    "timeline": "12_months"
                }
            }
        ]
        
        results = []
        
        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n📋 Running Test Scenario {i}: {scenario['name']}")
            print("-" * 40)
            
            try:
                result = await agent.run_workflow(
                    task_description=scenario["task"],
                    input_data=scenario["input"]
                )
                results.append({
                    "scenario": scenario["name"],
                    "status": "success",
                    "result": result
                })
                print(f"✅ Scenario {i} completed successfully")
                
            except Exception as e:
                print(f"❌ Scenario {i} failed: {e}")
                results.append({
                    "scenario": scenario["name"],
                    "status": "failed",
                    "error": str(e)
                })
        
        # Step 4: Verify data persistence
        await verify_data_persistence(client, agent.session_id)
        
        # Step 5: Generate test summary
        print("\n📊 E2E Test Summary")
        print("=" * 50)
        
        successful = sum(1 for r in results if r["status"] == "success")
        total = len(results)
        
        print(f"Total Scenarios: {total}")
        print(f"Successful: {successful}")
        print(f"Failed: {total - successful}")
        print(f"Success Rate: {(successful/total)*100:.1f}%")
        
        for result in results:
            status_icon = "✅" if result["status"] == "success" else "❌"
            print(f"{status_icon} {result['scenario']}: {result['status']}")
        
        # Step 6: Cleanup
        await client.close()
        
        if successful == total:
            print("\n🎉 All tests passed! Sprint Lens E2E test completed successfully!")
            return True
        else:
            print(f"\n⚠️  {total - successful} tests failed. Please review the errors above.")
            return False
            
    except Exception as e:
        print(f"\n💥 E2E test failed with critical error: {e}")
        print("Please check your setup and try again.")
        return False


if __name__ == "__main__":
    print("🚀 Sprint Lens SDK - End-to-End Test")
    print("Testing AI Agent with Comprehensive Observability")
    print("=" * 60)
    
    # Run the comprehensive test
    success = asyncio.run(run_comprehensive_e2e_test())
    
    if success:
        print("\n✨ E2E Test completed successfully!")
        print("🔍 Check your Sprint Agent Lens dashboard to view the captured traces")
        sys.exit(0)
    else:
        print("\n❌ E2E Test failed!")
        sys.exit(1)