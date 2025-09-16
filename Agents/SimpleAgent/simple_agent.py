#!/usr/bin/env python3
"""
Simple Agent with Sprint Agent Lens Integration

A demonstration agent that showcases comprehensive observability,
tracing, and evaluation using Azure OpenAI and Sprint Agent Lens.
"""

import asyncio
import os
import sys
import json
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import logging

# Environment and configuration
from dotenv import load_dotenv
from openai import AzureOpenAI

# Add Sprint Lens SDK to path (for local development)
sdk_path = Path(__file__).parent.parent.parent / "Sprint_Lens_SDK" / "src"
sys.path.insert(0, str(sdk_path))

# Sprint Lens SDK imports
import sprintlens
from sprintlens import track, Trace, SprintLensClient
from sprintlens.evaluation import AccuracyMetric, RelevanceMetric, Evaluator

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SimpleAgent:
    """
    A simple conversational AI agent with full Sprint Agent Lens integration.
    
    Features:
    - Azure OpenAI integration
    - Complete observability and tracing
    - Automatic metrics collection
    - Token and cost tracking
    - Evaluation capabilities
    """
    
    def __init__(self):
        """Initialize the Simple Agent with Azure OpenAI and Sprint Lens."""
        self.agent_id = str(uuid.uuid4())
        self.session_count = 0
        
        # Initialize Azure OpenAI client
        self._setup_azure_openai()
        
        # Initialize Sprint Lens client
        self._setup_sprintlens()
        
        # Agent configuration
        self.system_prompt = """You are a helpful and intelligent AI assistant. 
        You provide clear, accurate, and helpful responses to user questions. 
        Keep your responses concise but informative."""
        
        logger.info(f"SimpleAgent initialized with ID: {self.agent_id}")
    
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
    
    def _setup_sprintlens(self):
        """Setup Sprint Lens client for observability."""
        try:
            # Configure Sprint Lens with only relevant parameters (no Azure OpenAI configs)
            self.sprintlens_client = sprintlens.configure(
                url=os.getenv("SPRINTLENS_URL", "http://localhost:3000"),
                username=os.getenv("SPRINTLENS_USERNAME", "admin"),
                password=os.getenv("SPRINTLENS_PASSWORD", "OpikAdmin2024!"),
                workspace_id=os.getenv("SPRINTLENS_WORKSPACE_ID", "default"),
                project_name=os.getenv("SPRINTLENS_PROJECT_NAME", "SimpleAgent")
            )
            logger.info("Sprint Lens client configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure Sprint Lens client: {e}")
            # Continue without Sprint Lens if configuration fails
            self.sprintlens_client = None
    
    async def chat_completion(self, user_message: str, conversation_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Generate a chat completion with full observability.
        
        Args:
            user_message: The user's input message
            conversation_history: Previous conversation messages
            
        Returns:
            Dictionary containing response and metadata
        """
        start_time = time.time()
        
        # Create Sprint Lens trace if client is available
        trace = None
        if self.sprintlens_client:
            try:
                # Initialize client if not already done
                if not self.sprintlens_client.is_initialized:
                    await self.sprintlens_client.initialize()
                
                # Create a new trace for this chat completion using the Trace class directly
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="agent_chat_completion",
                    client=self.sprintlens_client,
                    project_name="SimpleAgent",
                    tags={"agent_id": str(self.agent_id), "user_message_length": str(len(user_message))},
                    metadata={
                        "user_message": user_message[:500],  # Truncate for safety
                        "has_conversation_history": bool(conversation_history),
                        "agent_type": "SimpleAgent"
                    },
                    input_data={"user_message": user_message, "conversation_history": conversation_history}
                )
                logger.debug(f"Created Sprint Lens trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create Sprint Lens trace: {e}")
                trace = None
        
        # Prepare conversation messages
        messages = [{"role": "system", "content": self.system_prompt}]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        try:
            # Create spans for detailed tracing
            if trace:
                # Span 1: Input Processing
                input_span_start = time.time()
                trace.add_span(
                    name="input_processing",
                    span_type="preprocessing",
                    start_time=input_span_start,
                    input_data={"user_message": user_message, "history_length": len(conversation_history or [])},
                    metadata={"message_length": len(user_message), "has_history": bool(conversation_history)}
                )
                await asyncio.sleep(0.05)  # Simulate processing time
                trace.finish_span("input_processing", end_time=time.time(), 
                                output_data={"processed_messages_count": len(messages)})

            # Call Azure OpenAI with tracing
            llm_call_start = time.time()
            response = await self._call_azure_openai(messages, trace)
            llm_call_duration = time.time() - llm_call_start
            
            if trace:
                # Span 2: Response Processing
                response_span_start = time.time()
                trace.add_span(
                    name="response_processing", 
                    span_type="postprocessing",
                    start_time=response_span_start,
                    input_data={"raw_response": response["content"][:100], "token_count": response["usage"]["total_tokens"]},
                    metadata={"model": response["model"], "finish_reason": response["finish_reason"]}
                )
                await asyncio.sleep(0.03)  # Simulate processing time
                trace.finish_span("response_processing", end_time=time.time(),
                                output_data={"processed_response_length": len(response["content"])})
                
            # Calculate metrics
            duration = time.time() - start_time
            
            result = {
                "response": response["content"],
                "model": response["model"],
                "tokens_used": response["usage"]["total_tokens"],
                "prompt_tokens": response["usage"]["prompt_tokens"],
                "completion_tokens": response["usage"]["completion_tokens"],
                "duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": True
            }
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({"response_length": len(result["response"]), "success": True})
                    trace.add_metric("prompt_tokens", result["prompt_tokens"])
                    trace.add_metric("completion_tokens", result["completion_tokens"])
                    trace.add_metric("total_tokens", result["tokens_used"])
                    trace.add_metric("duration_seconds", duration)
                    
                    # Calculate cost
                    estimated_cost = self._calculate_cost(response["usage"])
                    trace.add_metric("estimated_cost_usd", estimated_cost)
                    
                    # Mark trace as successful and send to backend
                    await trace.finish_async()
                    logger.debug("Sprint Lens trace completed and sent to backend")
                except Exception as e:
                    logger.error(f"Failed to finalize Sprint Lens trace: {e}")
            
            logger.info(f"Chat completion successful - Tokens: {result['tokens_used']}, Duration: {duration:.2f}s")
            return result
            
        except Exception as e:
            logger.error(f"Chat completion failed: {e}")
            
            # Set error in trace if available
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                    logger.debug("Sprint Lens trace completed with error")
                except Exception as trace_error:
                    logger.error(f"Failed to set error in Sprint Lens trace: {trace_error}")
            
            return {
                "response": None,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False
            }
    
    async def _call_azure_openai(self, messages: List[Dict], trace: Optional['Trace'] = None) -> Dict[str, Any]:
        """
        Make a call to Azure OpenAI with detailed tracing.
        
        Args:
            messages: List of conversation messages
            trace: Current trace for span creation
            
        Returns:
            Response data from Azure OpenAI
        """
        try:
            # Create LLM call span
            if trace:
                llm_span_start = time.time()
                trace.add_span(
                    name="azure_openai_call",
                    span_type="llm",
                    start_time=llm_span_start,
                    input_data={"messages": messages, "model": self.deployment_name, "temperature": 0.7, "max_tokens": 1000},
                    metadata={
                        "provider": "azure_openai",
                        "model": self.deployment_name,
                        "temperature": 0.7,
                        "max_tokens": 1000,
                        "messages_count": len(messages)
                    }
                )
            
            # Make the API call
            response = self.openai_client.chat.completions.create(
                model=self.deployment_name,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            # Extract response data
            result = {
                "content": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "finish_reason": response.choices[0].finish_reason
            }
            
            # Complete LLM span with results
            if trace:
                # Estimate cost (approximate Azure OpenAI pricing)
                estimated_cost = self._calculate_cost(result["usage"])
                
                trace.finish_span("azure_openai_call", 
                    end_time=time.time(),
                    output_data={
                        "response_content": result["content"][:200],  # Truncate for safety
                        "usage": result["usage"],
                        "finish_reason": result["finish_reason"],
                        "estimated_cost": estimated_cost
                    }
                )
            
            return result
            
        except Exception as e:
            if trace:
                trace.finish_span("azure_openai_call", end_time=time.time(), error=str(e))
            raise
    
    def _calculate_cost(self, usage: Dict[str, int]) -> float:
        """
        Calculate estimated cost for Azure OpenAI usage.
        
        Args:
            usage: Token usage information
            
        Returns:
            Estimated cost in USD
        """
        # Approximate Azure OpenAI GPT-4 pricing (as of 2024)
        prompt_cost_per_1k = 0.03  # $0.03 per 1K prompt tokens
        completion_cost_per_1k = 0.06  # $0.06 per 1K completion tokens
        
        prompt_cost = (usage["prompt_tokens"] / 1000) * prompt_cost_per_1k
        completion_cost = (usage["completion_tokens"] / 1000) * completion_cost_per_1k
        
        return round(prompt_cost + completion_cost, 6)
    
    async def run_conversation_session(self, num_interactions: int = 3) -> Dict[str, Any]:
        """
        Run a complete conversation session with multiple interactions.
        
        Args:
            num_interactions: Number of Q&A interactions to perform
            
        Returns:
            Session results and metrics
        """
        self.session_count += 1
        session_id = f"session_{self.session_count}_{int(time.time())}"
        
        logger.info(f"Starting conversation session: {session_id}")
        
        # Sample questions for demonstration
        demo_questions = [
            "What is artificial intelligence?",
            "How does machine learning work?",
            "Explain the difference between AI and machine learning.",
            "What are the benefits of using AI in business?",
            "What are some ethical considerations in AI development?"
        ]
        
        session_results = {
            "session_id": session_id,
            "agent_id": self.agent_id,
            "start_time": datetime.now().isoformat(),
            "interactions": [],
            "total_tokens": 0,
            "total_cost": 0.0,
            "success_count": 0
        }
        
        conversation_history = []
        
        # Run the specified number of interactions
        for i in range(min(num_interactions, len(demo_questions))):
            question = demo_questions[i]
            logger.info(f"Processing question {i+1}/{num_interactions}: {question[:50]}...")
            
            # Get response from agent
            result = await self.chat_completion(question, conversation_history.copy())
            
            interaction = {
                "interaction_id": i + 1,
                "question": question,
                "result": result
            }
            
            session_results["interactions"].append(interaction)
            
            if result["success"]:
                session_results["success_count"] += 1
                session_results["total_tokens"] += result.get("tokens_used", 0)
                
                # Update conversation history (keep last 4 messages for context)
                conversation_history.append({"role": "user", "content": question})
                conversation_history.append({"role": "assistant", "content": result["response"]})
                if len(conversation_history) > 8:  # Keep last 4 exchanges
                    conversation_history = conversation_history[-8:]
            
            # Small delay between interactions
            await asyncio.sleep(0.5)
        
        session_results["end_time"] = datetime.now().isoformat()
        session_results["success_rate"] = session_results["success_count"] / num_interactions
        
        logger.info(f"Session {session_id} completed - Success rate: {session_results['success_rate']:.2f}")
        
        return session_results
    
    async def run_evaluation(self) -> Dict[str, Any]:
        """
        Run an evaluation of the agent's responses using Sprint Lens evaluation framework.
        
        Returns:
            Evaluation results and metrics
        """
        logger.info("Starting agent evaluation...")
        
        # Test data for evaluation
        test_cases = [
            {
                "question": "What is Python?",
                "expected_topics": ["programming", "language", "code"]
            },
            {
                "question": "Explain machine learning",
                "expected_topics": ["algorithm", "data", "learning", "AI"]
            },
            {
                "question": "How do neural networks work?",
                "expected_topics": ["network", "neuron", "artificial", "learning"]
            }
        ]
        
        predictions = []
        ground_truths = []
        
        # Generate responses for evaluation
        for test_case in test_cases:
            result = await self.chat_completion(test_case["question"])
            
            if result["success"]:
                predictions.append(result["response"])
                # For demonstration, we'll use topic presence as ground truth
                ground_truths.append("relevant")  # Simplified for demo
            else:
                predictions.append("error")
                ground_truths.append("irrelevant")
        
        # Run evaluation using Sprint Lens evaluation framework
        try:
            # Create evaluator with relevant metrics
            evaluator = Evaluator([
                AccuracyMetric(),
                # RelevanceMetric() would require LLM provider setup
            ])
            
            # For demo purposes, create simple ground truth
            simple_ground_truth = ["response"] * len(predictions)
            evaluation_result = await evaluator.evaluate_async(predictions, simple_ground_truth)
            
            eval_summary = {
                "evaluation_id": evaluation_result.evaluation_id,
                "overall_score": evaluation_result.overall_score,
                "metrics": {name: result.value for name, result in evaluation_result.metrics.items()},
                "item_count": evaluation_result.item_count,
                "duration_ms": evaluation_result.duration_ms,
                "timestamp": evaluation_result.timestamp
            }
            
            logger.info(f"Evaluation completed - Overall score: {evaluation_result.overall_score:.3f}")
            return eval_summary
            
        except Exception as e:
            logger.error(f"Evaluation failed: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }


async def main():
    """Main function to demonstrate the Simple Agent."""
    print("🤖 Simple Agent with Sprint Agent Lens Integration")
    print("=" * 60)
    
    try:
        # Initialize the agent
        print("Initializing Simple Agent...")
        agent = SimpleAgent()
        print("✅ Agent initialized successfully!")
        
        # Run a conversation session
        print("\n🔄 Running conversation session...")
        session_result = await agent.run_conversation_session(num_interactions=3)
        print(f"✅ Session completed! Success rate: {session_result['success_rate']:.2f}")
        print(f"   Total tokens used: {session_result['total_tokens']}")
        
        # Run evaluation
        print("\n📊 Running agent evaluation...")
        eval_result = await agent.run_evaluation()
        if "error" not in eval_result:
            print(f"✅ Evaluation completed! Overall score: {eval_result['overall_score']:.3f}")
        else:
            print(f"⚠️ Evaluation had issues: {eval_result['error']}")
        
        # Summary
        print(f"\n📈 Session Summary:")
        print(f"   Agent ID: {agent.agent_id}")
        print(f"   Sessions run: {agent.session_count}")
        print(f"   Sprint Lens client: {'✅ Connected' if agent.sprintlens_client else '❌ Not connected'}")
        
        print(f"\n🎉 Simple Agent demonstration completed successfully!")
        print(f"   Check the Sprint Agent Lens dashboard for detailed traces and metrics.")
        
    except Exception as e:
        print(f"❌ Error running Simple Agent: {e}")
        logger.error(f"Main execution failed: {e}", exc_info=True)
        return 1
    
    return 0


if __name__ == "__main__":
    # Run the main function
    exit_code = asyncio.run(main())
    sys.exit(exit_code)