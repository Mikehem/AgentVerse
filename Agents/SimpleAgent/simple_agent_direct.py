#!/usr/bin/env python3
"""
Simple Agent with Direct Sprint Agent Lens Integration

A demonstration agent using direct HTTP API calls to Sprint Agent Lens
for reliable cost tracking and observability.
"""

import asyncio
import os
import json
import time
import uuid
import requests
from datetime import datetime
from typing import Dict, List, Optional, Any
import logging

# Environment and configuration
from dotenv import load_dotenv
from openai import AzureOpenAI

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimpleAgentDirect:
    """
    A simple conversational AI agent with direct Sprint Agent Lens HTTP integration.
    
    Features:
    - Azure OpenAI integration
    - Direct HTTP API calls for cost tracking
    - Token and cost tracking
    - Real-time observability
    """
    
    def __init__(self):
        """Initialize the Simple Agent with Azure OpenAI and direct API integration."""
        self.agent_id = str(uuid.uuid4())
        self.session_count = 0
        
        # Sprint Lens configuration
        self.sprintlens_url = os.getenv("SPRINTLENS_URL", "http://localhost:3000")
        self.project_id = os.getenv("SPRINTLENS_PROJECT_ID", "proj_production_demo_001")
        
        # Initialize Azure OpenAI client
        self._setup_azure_openai()
        
        # Agent configuration
        self.system_prompt = """You are a helpful and intelligent AI assistant. 
        You provide clear, accurate, and helpful responses to user questions. 
        Keep your responses concise but informative."""
        
        logger.info(f"SimpleAgentDirect initialized with ID: {self.agent_id}")
    
    def _setup_azure_openai(self):
        """Setup Azure OpenAI client."""
        try:
            self.openai_client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
            )
            self.deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            logger.info("Azure OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Azure OpenAI client: {e}")
            raise
    
    def _calculate_cost_via_api(self, usage: Dict, model: str = "gpt-4") -> float:
        """Calculate cost using the Sprint Lens cost calculation API."""
        try:
            response = requests.post(
                f"{self.sprintlens_url}/api/v1/cost-calculation",
                json={
                    "model": model,
                    "tokenUsage": {
                        "promptTokens": usage.get("prompt_tokens", 0),
                        "completionTokens": usage.get("completion_tokens", 0),
                        "totalTokens": usage.get("total_tokens", 0)
                    },
                    "provider": "azure_openai"
                },
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return result["calculation"]["totalCost"]
            
            logger.warning(f"Cost calculation API failed: {response.status_code}")
            # Fallback calculation
            return (usage.get("prompt_tokens", 0) * 0.03 + usage.get("completion_tokens", 0) * 0.06) / 1000
            
        except Exception as e:
            logger.error(f"Failed to calculate cost via API: {e}")
            # Fallback calculation
            return (usage.get("prompt_tokens", 0) * 0.03 + usage.get("completion_tokens", 0) * 0.06) / 1000
    
    def _create_trace(self, conversation_id: str, user_message: str) -> Optional[str]:
        """Create a trace using direct HTTP API."""
        try:
            trace_data = {
                "id": str(uuid.uuid4()),
                "name": f"SimpleAgent Conversation",
                "projectId": self.project_id,
                "startTime": datetime.now().isoformat(),
                "input": {"user_message": user_message},
                "metadata": {
                    "agent_id": self.agent_id,
                    "conversation_id": conversation_id,
                    "agent_type": "SimpleAgentDirect"
                }
            }
            
            response = requests.post(
                f"{self.sprintlens_url}/api/v1/traces",
                json=trace_data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    logger.info(f"Created trace: {trace_data['id']}")
                    return trace_data['id']
            
            logger.warning(f"Failed to create trace: {response.status_code}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to create trace: {e}")
            return None
    
    def _create_span(self, trace_id: str, span_name: str, span_type: str, input_data: Dict, start_time: float) -> Optional[str]:
        """Create a span using direct HTTP API."""
        try:
            span_data = {
                "id": str(uuid.uuid4()),
                "traceId": trace_id,
                "name": span_name,
                "type": span_type,
                "startTime": datetime.fromtimestamp(start_time).isoformat(),
                "input": input_data,
                "projectId": self.project_id
            }
            
            response = requests.post(
                f"{self.sprintlens_url}/api/v1/spans",
                json=span_data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    return span_data['id']
            
            logger.warning(f"Failed to create span: {response.status_code}")
            return None
            
        except Exception as e:
            logger.error(f"Failed to create span: {e}")
            return None
    
    def _update_span(self, span_id: str, output_data: Dict, end_time: float):
        """Update a span with output data and end time."""
        try:
            update_data = {
                "output": output_data,
                "endTime": datetime.fromtimestamp(end_time).isoformat()
            }
            
            response = requests.patch(
                f"{self.sprintlens_url}/api/v1/spans/{span_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code != 200:
                logger.warning(f"Failed to update span: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to update span: {e}")
    
    def _update_trace(self, trace_id: str, output_data: Dict, usage: Dict, cost: float, end_time: float):
        """Update a trace with final results and cost data."""
        try:
            update_data = {
                "output": output_data,
                "endTime": datetime.fromtimestamp(end_time).isoformat(),
                "totalCost": cost,
                "inputCost": (usage.get("prompt_tokens", 0) / 1000) * 0.03,  # Approximate
                "outputCost": (usage.get("completion_tokens", 0) / 1000) * 0.06,  # Approximate
                "promptTokens": usage.get("prompt_tokens", 0),
                "completionTokens": usage.get("completion_tokens", 0),
                "totalTokens": usage.get("total_tokens", 0),
                "provider": "azure_openai",
                "modelName": self.deployment_name
            }
            
            response = requests.patch(
                f"{self.sprintlens_url}/api/v1/traces/{trace_id}",
                json=update_data,
                headers={"Content-Type": "application/json"},
                timeout=5
            )
            
            if response.status_code == 200:
                logger.info(f"Updated trace {trace_id} with cost ${cost:.4f}")
            else:
                logger.warning(f"Failed to update trace: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to update trace: {e}")
    
    async def chat_completion(self, user_message: str, conversation_history: Optional[List] = None, conversation_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Process a chat completion with full observability and cost tracking.
        
        Args:
            user_message: The user's input message
            conversation_history: Previous conversation messages
            conversation_id: Optional conversation identifier
            
        Returns:
            Dict containing response, usage metrics, and cost information
        """
        start_time = time.time()
        conversation_id = conversation_id or f"conv_{int(start_time)}"
        
        logger.info(f"Processing chat completion for conversation: {conversation_id}")
        
        # Create trace
        trace_id = self._create_trace(conversation_id, user_message)
        
        # Prepare conversation messages
        messages = [{"role": "system", "content": self.system_prompt}]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        try:
            # Create input processing span
            input_span_start = time.time()
            input_span_id = None
            if trace_id:
                input_span_id = self._create_span(
                    trace_id,
                    "input_processing",
                    "preprocessing",
                    {"user_message": user_message, "history_length": len(conversation_history or [])},
                    input_span_start
                )
            
            # Simulate input processing
            await asyncio.sleep(0.05)
            
            if input_span_id:
                self._update_span(
                    input_span_id,
                    {"processed_messages_count": len(messages)},
                    time.time()
                )
            
            # Call Azure OpenAI
            llm_span_start = time.time()
            llm_span_id = None
            if trace_id:
                llm_span_id = self._create_span(
                    trace_id,
                    "llm_call",
                    "llm",
                    {"model": self.deployment_name, "messages_count": len(messages)},
                    llm_span_start
                )
            
            response = self.openai_client.chat.completions.create(
                model=self.deployment_name,
                messages=messages,
                max_tokens=1000,
                temperature=0.7
            )
            
            llm_span_end = time.time()
            
            # Extract response data
            response_content = response.choices[0].message.content
            usage = {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
            
            # Calculate cost
            cost = self._calculate_cost_via_api(usage, self.deployment_name)
            
            if llm_span_id:
                self._update_span(
                    llm_span_id,
                    {
                        "response": response_content[:200],
                        "usage": usage,
                        "cost": cost,
                        "model": self.deployment_name
                    },
                    llm_span_end
                )
            
            # Create response processing span
            response_span_start = time.time()
            response_span_id = None
            if trace_id:
                response_span_id = self._create_span(
                    trace_id,
                    "response_processing",
                    "postprocessing",
                    {"raw_response": response_content[:100], "token_count": usage["total_tokens"]},
                    response_span_start
                )
            
            # Simulate response processing
            await asyncio.sleep(0.03)
            
            if response_span_id:
                self._update_span(
                    response_span_id,
                    {"processed_response_length": len(response_content)},
                    time.time()
                )
            
            # Calculate final metrics
            duration = time.time() - start_time
            
            result = {
                "response": response_content,
                "model": self.deployment_name,
                "tokens_used": usage["total_tokens"],
                "prompt_tokens": usage["prompt_tokens"],
                "completion_tokens": usage["completion_tokens"],
                "duration_seconds": duration,
                "cost_usd": cost,
                "timestamp": datetime.now().isoformat(),
                "conversation_id": conversation_id,
                "trace_id": trace_id,
                "success": True
            }
            
            # Update trace with final results
            if trace_id:
                self._update_trace(
                    trace_id,
                    {
                        "response": response_content,
                        "success": True,
                        "conversation_id": conversation_id
                    },
                    usage,
                    cost,
                    time.time()
                )
            
            logger.info(f"Chat completion successful - Tokens: {usage['total_tokens']}, Cost: ${cost:.4f}, Duration: {duration:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Chat completion failed: {e}")
            
            # Update trace with error if available
            if trace_id:
                try:
                    error_data = {
                        "error": str(e),
                        "success": False,
                        "conversation_id": conversation_id
                    }
                    self._update_trace(trace_id, error_data, {}, 0.0, time.time())
                except Exception as trace_error:
                    logger.error(f"Failed to update trace with error: {trace_error}")
            
            return {
                "response": None,
                "error": str(e),
                "success": False,
                "conversation_id": conversation_id,
                "trace_id": trace_id,
                "timestamp": datetime.now().isoformat()
            }


async def main():
    """Demo of the SimpleAgentDirect with cost tracking."""
    print("🤖 Simple Agent Direct with Sprint Agent Lens Integration")
    print("=" * 60)
    
    try:
        # Initialize agent
        print("Initializing Simple Agent Direct...")
        agent = SimpleAgentDirect()
        print("✅ Agent initialized successfully!")
        
        # Demo questions
        questions = [
            "What is artificial intelligence?",
            "How does machine learning work?",
            "Explain the concept of neural networks."
        ]
        
        print(f"\n🔄 Running conversation session...")
        session_id = f"session_direct_{int(time.time())}"
        
        total_cost = 0.0
        total_tokens = 0
        
        for i, question in enumerate(questions, 1):
            print(f"\nProcessing question {i}/{len(questions)}: {question[:50]}...")
            
            result = await agent.chat_completion(
                user_message=question,
                conversation_id=session_id
            )
            
            if result["success"]:
                cost = result.get("cost_usd", 0.0)
                tokens = result.get("tokens_used", 0)
                duration = result.get("duration_seconds", 0)
                
                total_cost += cost
                total_tokens += tokens
                
                print(f"  ✅ Completed: {tokens} tokens, {duration:.2f}s, ${cost:.4f}")
                print(f"  Response: {result['response'][:100]}...")
            else:
                print(f"  ❌ Failed: {result.get('error', 'Unknown error')}")
        
        print(f"\n📊 Session Summary:")
        print(f"  Total Questions: {len(questions)}")
        print(f"  Total Tokens: {total_tokens}")
        print(f"  Total Cost: ${total_cost:.4f}")
        print(f"  Session ID: {session_id}")
        
        print(f"\n🌐 Check the UI at: http://localhost:3000/projects/{agent.project_id}")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())