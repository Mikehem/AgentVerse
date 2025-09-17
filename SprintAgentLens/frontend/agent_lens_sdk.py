#!/usr/bin/env python3
"""
Agent Lens SDK - Comprehensive Cost Tracking Integration
Based on Opik cost tracking specifications with enhanced features
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, asdict
import requests


@dataclass
class TokenUsage:
    """Token usage information for cost calculation"""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class CostCalculation:
    """Detailed cost calculation result"""
    input_cost: float
    output_cost: float
    total_cost: float
    provider: str
    model: str
    currency: str = 'USD'


class AgentLensClient:
    """
    Agent Lens SDK Client with comprehensive cost tracking
    Follows Opik cost tracking patterns with enhanced features
    """
    
    def __init__(self, 
                 base_url: str = "http://localhost:3000",
                 project_id: str = "simple_agent_prod",
                 agent_id: str = "enhanced_agent_prod"):
        self.base_url = base_url.rstrip('/')
        self.project_id = project_id
        self.agent_id = agent_id
        self.session = requests.Session()
        
        # Current trace and span context
        self.current_trace_id: Optional[str] = None
        self.current_span_id: Optional[str] = None
        self.spans_stack: List[str] = []
        
    def create_trace(self,
                    name: str,
                    operation_name: str = None,
                    input_data: Dict = None,
                    metadata: Dict = None,
                    tags: List[str] = None,
                    trace_id: str = None) -> str:
        """
        Create a new trace with automatic cost tracking support
        
        Args:
            name: Trace name
            operation_name: Operation being traced
            input_data: Input data for the operation
            metadata: Additional metadata
            tags: Tags for categorization
            trace_id: Optional custom trace ID
            
        Returns:
            str: Created trace ID
        """
        
        if trace_id is None:
            trace_id = f"trace_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
            
        payload = {
            "id": trace_id,
            "name": operation_name or name,
            "project_id": self.project_id,
            "agent_id": self.agent_id,
            "start_time": datetime.utcnow().isoformat() + "Z",
            "status": "running",
            "input": input_data or {},
            "metadata": {
                **(metadata or {}),
                "agent_type": "enhanced_simple_agent",
                "has_context": len(input_data or {}) > 0,
                "message_length": len(str(input_data or {}))
            },
            "tags": tags or ["enhanced", "traced"]
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/traces",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                self.current_trace_id = trace_id
                print(f"✅ Created trace: {trace_id}")
                return trace_id
            else:
                print(f"❌ Failed to create trace: {response.status_code} - {response.text}")
                return trace_id  # Return anyway to continue execution
                
        except Exception as e:
            print(f"❌ Error creating trace: {e}")
            return trace_id
    
    def create_span(self,
                   name: str,
                   span_type: str = "custom",
                   input_data: Dict = None,
                   output_data: Dict = None,
                   metadata: Dict = None,
                   tags: List[str] = None,
                   model: str = None,
                   provider: str = None,
                   token_usage: TokenUsage = None,
                   span_id: str = None,
                   parent_span_id: str = None) -> str:
        """
        Create a new span with automatic cost calculation
        
        Args:
            name: Span name
            span_type: Type of span (llm, preprocessing, postprocessing, custom, tool, retrieval)
            input_data: Input data
            output_data: Output data
            metadata: Additional metadata
            tags: Tags for categorization
            model: Model name for cost calculation
            provider: Provider name for cost calculation
            token_usage: Token usage for cost calculation
            span_id: Optional custom span ID
            parent_span_id: Parent span ID
            
        Returns:
            str: Created span ID
        """
        
        if span_id is None:
            span_id = f"span_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
            
        if self.current_trace_id is None:
            raise ValueError("No active trace. Create a trace first.")
            
        # Use current span as parent if not specified
        if parent_span_id is None and self.spans_stack:
            parent_span_id = self.spans_stack[-1]
            
        payload = {
            "id": span_id,
            "trace_id": self.current_trace_id,
            "parent_span_id": parent_span_id,
            "name": name,
            "type": span_type,
            "start_time": datetime.utcnow().isoformat() + "Z",
            "input": input_data or {},
            "output": output_data or {},
            "metadata": {
                **(metadata or {}),
                **({"model": model} if model else {}),
                **({"provider": provider} if provider else {})
            },
            "tags": tags or [],
            "status": "running"
        }
        
        # Add model and provider at top level for cost calculation
        if model:
            payload["model"] = model
            payload["model_name"] = model
        if provider:
            payload["provider"] = provider
            
        # Add token usage for automatic cost calculation
        if token_usage:
            payload["token_usage"] = asdict(token_usage)
            
        try:
            response = self.session.post(
                f"{self.base_url}/api/v1/spans",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 201:
                self.current_span_id = span_id
                self.spans_stack.append(span_id)
                print(f"✅ Created span: {span_id} (type: {span_type})")
                return span_id
            else:
                print(f"❌ Failed to create span: {response.status_code} - {response.text}")
                return span_id
                
        except Exception as e:
            print(f"❌ Error creating span: {e}")
            return span_id
    
    def update_span(self,
                   span_id: str,
                   output_data: Dict = None,
                   status: str = "success",
                   error_message: str = None,
                   token_usage: TokenUsage = None,
                   cost: float = None,
                   metadata: Dict = None):
        """
        Update an existing span with results and cost information
        
        Args:
            span_id: Span ID to update
            output_data: Output data from the operation
            status: Final status (success, error, timeout)
            error_message: Error message if status is error
            token_usage: Final token usage for cost calculation
            cost: Manual cost override
            metadata: Additional metadata to merge
        """
        
        payload = {
            "spanId": span_id,
            "endTime": datetime.utcnow().isoformat() + "Z",
            "status": status,
        }
        
        if output_data:
            payload["outputData"] = output_data
        if error_message:
            payload["errorMessage"] = error_message
        if token_usage:
            payload["tokenUsage"] = asdict(token_usage)
        if cost is not None:
            payload["cost"] = cost
        if metadata:
            payload["metadata"] = metadata
            
        try:
            response = self.session.put(
                f"{self.base_url}/api/v1/spans",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                print(f"✅ Updated span: {span_id}")
                # Remove from stack if it's the current span
                if self.current_span_id == span_id:
                    if self.spans_stack and self.spans_stack[-1] == span_id:
                        self.spans_stack.pop()
                    self.current_span_id = self.spans_stack[-1] if self.spans_stack else None
            else:
                print(f"❌ Failed to update span: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error updating span: {e}")
    
    def finish_trace(self,
                    output_data: Dict = None,
                    status: str = "success",
                    error_message: str = None,
                    metadata: Dict = None):
        """
        Finish the current trace
        
        Args:
            output_data: Final output data
            status: Final status
            error_message: Error message if failed
            metadata: Additional metadata
        """
        
        if self.current_trace_id is None:
            print("⚠️ No active trace to finish")
            return
            
        payload = {
            "id": self.current_trace_id,
            "endTime": datetime.utcnow().isoformat() + "Z",
            "status": status
        }
        
        if output_data:
            payload["outputData"] = output_data
        if error_message:
            payload["errorMessage"] = error_message
        if metadata:
            payload["metadata"] = metadata
            
        try:
            response = self.session.put(
                f"{self.base_url}/api/v1/traces",
                json=payload,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                print(f"✅ Finished trace: {self.current_trace_id}")
            else:
                print(f"❌ Failed to finish trace: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"❌ Error finishing trace: {e}")
        finally:
            # Reset context
            self.current_trace_id = None
            self.current_span_id = None
            self.spans_stack = []
    
    def get_cost_analytics(self,
                          project_id: str = None,
                          level: str = "project",
                          start_date: str = None,
                          end_date: str = None,
                          include_breakdown: bool = True) -> Dict:
        """
        Get cost analytics from the backend
        
        Args:
            project_id: Project ID to analyze
            level: Analysis level (project, trace, span)
            start_date: Start date filter
            end_date: End date filter
            include_breakdown: Include time-series breakdown
            
        Returns:
            Dict: Cost analytics data
        """
        
        params = {
            "projectId": project_id or self.project_id,
            "level": level,
            "includeBreakdown": str(include_breakdown).lower()
        }
        
        if start_date:
            params["startDate"] = start_date
        if end_date:
            params["endDate"] = end_date
            
        try:
            response = self.session.get(
                f"{self.base_url}/api/v1/cost-analytics",
                params=params,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"❌ Failed to get cost analytics: {response.status_code} - {response.text}")
                return {"success": False, "error": "Failed to fetch analytics"}
                
        except Exception as e:
            print(f"❌ Error getting cost analytics: {e}")
            return {"success": False, "error": str(e)}


class TracedLLMCall:
    """
    Context manager for automatically traced LLM calls with cost tracking
    """
    
    def __init__(self,
                 client: AgentLensClient,
                 model: str,
                 provider: str,
                 operation_name: str = "llm_completion",
                 input_data: Dict = None):
        self.client = client
        self.model = model
        self.provider = provider
        self.operation_name = operation_name
        self.input_data = input_data or {}
        self.span_id = None
        
    def __enter__(self):
        self.span_id = self.client.create_span(
            name=self.operation_name,
            span_type="llm",
            input_data=self.input_data,
            model=self.model,
            provider=self.provider,
            metadata={
                "model": self.model,
                "provider": self.provider,
                "estimated_cost_before": 0
            }
        )
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            self.client.update_span(
                self.span_id,
                status="error",
                error_message=str(exc_val)
            )
        else:
            self.client.update_span(
                self.span_id,
                status="success"
            )
    
    def set_output(self, output_data: Dict, token_usage: TokenUsage = None):
        """Set the output data and token usage for cost calculation"""
        self.client.update_span(
            self.span_id,
            output_data=output_data,
            token_usage=token_usage,
            status="success"
        )


# Example usage demonstrating comprehensive cost tracking
def example_usage():
    """
    Example showing how to use the Agent Lens SDK for cost tracking
    """
    
    # Initialize client
    client = AgentLensClient()
    
    # Create a trace for the entire conversation
    trace_id = client.create_trace(
        name="enhanced_chat_completion",
        input_data={
            "user_message": "Explain the benefits of using AI agents with comprehensive observability and tracing.",
            "conversation_history_length": 0,
            "agent_id": "enhanced_agent_prod"
        },
        metadata={
            "model": "gpt-4o",
            "agent_type": "enhanced_simple_agent",
            "has_context": False
        },
        tags=["chat", "azure-openai", "enhanced", "traced"]
    )
    
    try:
        # Input processing span
        input_span_id = client.create_span(
            name="input_processing",
            span_type="preprocessing",
            input_data={
                "raw_message": "Explain the benefits of using AI agents with comprehensive observability and tracing.",
                "context_messages": 0,
                "preprocessing_steps": ["context_assembly", "token_estimation", "safety_check"]
            },
            metadata={
                "input_length": 85,
                "total_messages": 2,
                "estimated_tokens": 92
            }
        )
        
        # Simulate processing time
        time.sleep(0.1)
        
        client.update_span(
            input_span_id,
            output_data={"processed_input": "validated and ready"},
            status="success"
        )
        
        # LLM call with automatic cost tracking
        with TracedLLMCall(
            client, 
            model="gpt-4o", 
            provider="azure_openai",
            operation_name="azure_openai_completion",
            input_data={
                "model": "gpt-4o",
                "messages": [
                    {"role": "system", "content": "You are an advanced AI assistant..."},
                    {"role": "user", "content": "Explain the benefits of using AI agents..."}
                ],
                "parameters": {"temperature": 0.7, "max_tokens": 1000, "top_p": 0.9}
            }
        ) as llm_call:
            
            # Simulate LLM response with token usage
            simulated_response = "AI agents with comprehensive observability offer several benefits..."
            
            llm_call.set_output(
                output_data={
                    "response": simulated_response,
                    "finish_reason": "stop"
                },
                token_usage=TokenUsage(
                    prompt_tokens=95,
                    completion_tokens=359,
                    total_tokens=454
                )
            )
        
        # Response processing span
        response_span_id = client.create_span(
            name="response_processing",
            span_type="postprocessing",
            input_data={
                "raw_response": simulated_response[:50] + "...",
                "processing_steps": ["content_validation", "safety_check", "formatting"]
            },
            metadata={
                "response_length": len(simulated_response),
                "completion_tokens": 359
            }
        )
        
        time.sleep(0.1)
        
        client.update_span(
            response_span_id,
            output_data={
                "final_response": simulated_response,
                "safety_passed": True,
                "formatting_applied": True
            },
            status="success"
        )
        
        # Finish the trace
        client.finish_trace(
            output_data={
                "response": simulated_response,
                "total_tokens": 454,
                "estimated_cost": 0.002725  # Example cost
            },
            status="success"
        )
        
        # Get cost analytics
        print("\n📊 Getting cost analytics...")
        analytics = client.get_cost_analytics(
            level="project",
            include_breakdown=True
        )
        
        if analytics.get("success"):
            summary = analytics.get("analytics", {}).get("summary", {})
            print(f"💰 Total project cost: ${summary.get('totalCost', 0):.6f}")
            print(f"🔢 Total tokens: {summary.get('totalTokens', 0)}")
            print(f"📈 Cost by provider: {summary.get('costByProvider', {})}")
        
    except Exception as e:
        print(f"❌ Error in example: {e}")
        client.finish_trace(
            status="error",
            error_message=str(e)
        )


if __name__ == "__main__":
    print("🚀 Agent Lens SDK - Cost Tracking Example")
    print("=" * 50)
    example_usage()
    print("\n✅ Example completed!")