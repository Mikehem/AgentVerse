#!/usr/bin/env python3
"""
Simple Agent for AgentVerse - Enhanced with Agent Lens SDK
This agent demonstrates how to send metrics, traces, and conversations to the backend
using the new run-based tracking system with multiturn conversation support.
"""

import time
import random
from typing import Dict, Any, List, Optional
from agent_lens_sdk import AgentLens, create_conversation, create_metric, ConversationStatus

class SimpleAgent:
    def __init__(self, project_id: str, agent_id: str, backend_url: str = "http://localhost:3000"):
        self.project_id = project_id
        self.agent_id = agent_id
        self.backend_url = backend_url
        
        # Initialize Agent Lens SDK with auto-run disabled (we'll manage runs manually)
        self.lens = AgentLens(
            project_id=project_id,
            agent_id=agent_id,
            backend_url=backend_url,
            auto_start_run=False  # We'll manage runs manually
        )
        
        # Conversation tracking
        self.current_thread_id = None
        
        print(f"🤖 Simple Agent initialized with Agent Lens SDK:")
        print(f"   Project ID: {self.project_id}")
        print(f"   Agent ID: {self.agent_id}")
        print(f"   Backend URL: {self.backend_url}")
    
    def start_run(self, name: str, description: str = None, tags: List[str] = None, metadata: Dict = None) -> str:
        """Start a new run session using Agent Lens SDK"""
        return self.lens.start_run(
            name=name,
            description=description,
            tags=tags,
            metadata=metadata
        )
    
    def complete_run(self, stats: Dict = None, success_rate: float = None) -> bool:
        """Complete the current run with final stats using Agent Lens SDK"""
        return self.lens.complete_run(final_stats=stats, success_rate=success_rate)
    
    def fail_run(self, error_message: str, error_details: Dict = None) -> bool:
        """Fail the current run with an error message using Agent Lens SDK"""
        return self.lens.fail_run(error_message=error_message, error_details=error_details)
    
    def send_metric(self, metric_type: str, value: float, unit: str = None, metadata: Dict = None, **kwargs) -> bool:
        """Send a metric using Agent Lens SDK"""
        metric_data = create_metric(
            metric_type=metric_type,
            value=value,
            unit=unit,
            metadata=metadata or {},
            **kwargs
        )
        return self.lens.log_metric(metric_data)
    
    def send_conversation(self, user_input: str, agent_output: str, response_time: int, 
                         status: str = "success", token_usage: int = 0, cost: float = 0.0,
                         feedback: str = None, metadata: Dict = None, thread_id: str = None) -> str:
        """Send a conversation using Agent Lens SDK with optional multiturn support"""
        # Convert status string to enum
        status_enum = ConversationStatus.SUCCESS
        if status == "error":
            status_enum = ConversationStatus.ERROR
        elif status == "timeout":
            status_enum = ConversationStatus.TIMEOUT
        
        # Use current thread if provided, otherwise use self.current_thread_id
        effective_thread_id = thread_id or self.current_thread_id
        
        conversation_data = create_conversation(
            input_text=user_input,
            output_text=agent_output,
            response_time=response_time,
            status=status_enum,
            token_usage=token_usage,
            cost=cost,
            feedback=feedback,
            thread_id=effective_thread_id,
            metadata=metadata or {}
        )
        
        return self.lens.log_conversation(conversation_data)
    
    def start_trace(self, trace_type: str, operation_name: str, conversation_id: str = None,
                   parent_trace_id: str = None, input_data: Dict = None, metadata: Dict = None) -> str:
        """Start a new trace using Agent Lens SDK"""
        return self.lens.start_trace(
            trace_type=trace_type,
            operation_name=operation_name,
            conversation_id=conversation_id,
            parent_trace_id=parent_trace_id,
            input_data=input_data,
            metadata=metadata
        )
    
    def complete_trace(self, trace_id: str, status: str = "success", output_data: Dict = None,
                      error_message: str = None, spans: List = None, metadata: Dict = None) -> bool:
        """Complete a trace using Agent Lens SDK"""
        return self.lens.complete_trace(
            trace_id=trace_id,
            status=status,
            output_data=output_data,
            error_message=error_message,
            spans=spans,
            metadata=metadata
        )
    
    def start_conversation_thread(self, thread_id: str = None) -> str:
        """Start a new conversation thread for multiturn conversations"""
        thread_id = self.lens.start_conversation_thread(thread_id)
        self.current_thread_id = thread_id
        return thread_id
    
    def simulate_conversation(self, user_input: str, use_thread: bool = False) -> str:
        """Simulate a conversation with enhanced SDK tracking"""
        
        # Start conversation trace
        trace_id = self.start_trace(
            trace_type="conversation",
            operation_name="process_user_input",
            input_data={"input": user_input, "input_length": len(user_input)}
        )
        
        start_time = time.time()
        
        # Simulate processing time (200-2000ms)
        processing_time = random.uniform(0.2, 2.0)
        time.sleep(processing_time)
        
        # Generate simulated response
        responses = [
            f"I understand you're asking about '{user_input}'. Let me help you with that.",
            f"That's an interesting question about '{user_input}'. Here's what I think...",
            f"Based on your input '{user_input}', I can provide the following information...",
            f"Thank you for asking about '{user_input}'. Here's my response...",
            f"I've processed your request about '{user_input}' and here's what I found..."
        ]
        
        agent_output = random.choice(responses)
        response_time_ms = int((time.time() - start_time) * 1000)
        
        # Simulate token usage and cost
        token_usage = len(user_input) + len(agent_output) + random.randint(10, 50)
        cost = token_usage * 0.00002  # Rough estimate
        
        # Send conversation (with thread support if enabled)
        conversation_id = self.send_conversation(
            user_input=user_input,
            agent_output=agent_output,
            response_time=response_time_ms,
            status="success",
            token_usage=token_usage,
            cost=cost,
            metadata={"operation": "conversation", "use_thread": use_thread},
            thread_id=self.current_thread_id if use_thread else None
        )
        
        # Complete trace
        if trace_id:
            self.complete_trace(
                trace_id=trace_id,
                status="success",
                output_data={"output": agent_output, "response_time_ms": response_time_ms},
                metadata={"conversation_id": conversation_id, "token_usage": token_usage, "cost": cost}
            )
        
        # Send metrics
        self.send_metric("response_time", response_time_ms, "ms", {"operation": "conversation"})
        self.send_metric("token_usage", token_usage, "tokens", {"conversation_id": conversation_id})
        self.send_metric("cost", cost, "usd", {"conversation_id": conversation_id})
        
        # Send evaluation metrics (Master-style)
        self.send_metric("answer_relevance", random.uniform(0.7, 0.98), "score", 
                        evaluation_model="gpt-4o", threshold=0.8)
        self.send_metric("coherence_score", random.uniform(0.75, 0.95), "score")
        self.send_metric("hallucination_score", random.uniform(0.05, 0.3), "score",
                        evaluation_model="claude-3-sonnet", threshold=0.3)
        
        return agent_output
    
    def run_demo(self, num_conversations: int = 5, include_multiturn: bool = True):
        """Run an enhanced demo with single and multiturn conversations"""
        print(f"\n🚀 Starting enhanced demo with {num_conversations} conversations...\n")
        
        # Start a new run
        run_id = self.start_run(
            name=f"Enhanced Demo Run - {num_conversations} conversations",
            description=f"Enhanced demo with SDK v1.0 featuring multiturn conversations and Master-style evaluation",
            tags=["demo", "enhanced", "multiturn", "sdk-v1", "Master-style"],
            metadata={
                "num_conversations": num_conversations, 
                "include_multiturn": include_multiturn,
                "sdk_version": "1.0.0"
            }
        )
        
        if not run_id:
            print("❌ Failed to start run. Proceeding without run tracking.")
        
        try:
            demo_inputs = [
                "What is artificial intelligence?",
                "How do you process natural language?", 
                "Can you explain machine learning?",
                "What are the benefits of AI agents?",
                "How do you handle user queries?",
                "What is your training data?",
                "How accurate are your responses?",
                "Can you learn from conversations?",
                "What are your capabilities?",
                "How do you ensure data privacy?"
            ]
            
            # Multiturn conversation inputs
            multiturn_conversations = [
                [
                    "Hello, I need help with Python programming",
                    "Can you explain list comprehensions?",
                    "Show me an example with filtering"
                ],
                [
                    "I'm working on a machine learning project",
                    "What's the difference between supervised and unsupervised learning?",
                    "Which one should I use for image classification?"
                ],
                [
                    "I want to build a chatbot",
                    "What technologies should I consider?",
                    "How do I handle context in conversations?"
                ]
            ]
            
            conversation_count = 0
            
            # Single-turn conversations
            single_turn_count = num_conversations // 2 if include_multiturn else num_conversations
            for i in range(single_turn_count):
                user_input = random.choice(demo_inputs)
                print(f"\n--- Single Conversation {i+1}/{single_turn_count} ---")
                print(f"User: {user_input}")
                
                agent_response = self.simulate_conversation(user_input, use_thread=False)
                print(f"Agent: {agent_response}")
                conversation_count += 1
                
                # Wait between conversations
                time.sleep(random.uniform(0.5, 1.5))
            
            # Multiturn conversations
            if include_multiturn:
                multiturn_count = num_conversations - single_turn_count
                for i in range(multiturn_count):
                    if i < len(multiturn_conversations):
                        thread_inputs = multiturn_conversations[i]
                    else:
                        # Generate random multiturn conversation
                        thread_inputs = random.sample(demo_inputs, 3)
                    
                    print(f"\n--- Multiturn Thread {i+1}/{multiturn_count} ---")
                    
                    # Start a new conversation thread
                    thread_id = self.start_conversation_thread()
                    print(f"🧵 Thread ID: {thread_id}")
                    
                    for j, user_input in enumerate(thread_inputs):
                        print(f"\nTurn {j+1}/{len(thread_inputs)} in Thread {i+1}:")
                        print(f"User: {user_input}")
                        
                        agent_response = self.simulate_conversation(user_input, use_thread=True)
                        print(f"Agent: {agent_response}")
                        conversation_count += 1
                        
                        # Shorter wait between turns in same thread
                        time.sleep(random.uniform(0.2, 0.8))
                    
                    # Wait between different threads
                    time.sleep(random.uniform(1, 2))
            
            # Send summary metrics
            self.send_metric("success_rate", 100.0, "percentage", 
                           metadata={"total_conversations": conversation_count})
            self.send_metric("throughput", conversation_count / 60.0, "conversations_per_minute", 
                           metadata={"demo_type": "enhanced"})
            self.send_metric("multiturn_ratio", 
                           (conversation_count - single_turn_count) / conversation_count if include_multiturn else 0.0, 
                           "percentage")
            
            # Complete the run with final stats
            if run_id:
                self.complete_run(
                    final_stats={
                        "demo_type": "enhanced",
                        "single_turn_conversations": single_turn_count,
                        "multiturn_conversations": conversation_count - single_turn_count,
                        "threads_created": multiturn_count if include_multiturn else 0
                    },
                    success_rate=100.0
                )
            
            print(f"\n✅ Enhanced demo completed!")
            print(f"   📊 Total conversations: {conversation_count}")
            print(f"   🔄 Single-turn: {single_turn_count}")
            print(f"   🧵 Multiturn: {conversation_count - single_turn_count}")
            print(f"   🎯 Check the frontend at {self.backend_url} to view the telemetry data.")
            
        except Exception as e:
            print(f"\n❌ Demo failed with error: {str(e)}")
            if run_id:
                self.fail_run(f"Enhanced demo failed: {str(e)}")
            raise


def main():
    """Main function to run the enhanced simple agent"""
    # Configuration from user requirements
    PROJECT_ID = "project-1757579671500"
    AGENT_ID = "agent_testagen_mffbl12k"
    BACKEND_URL = "http://localhost:3000"
    
    # Create and run the agent
    agent = SimpleAgent(
        project_id=PROJECT_ID,
        agent_id=AGENT_ID,
        backend_url=BACKEND_URL
    )
    
    try:
        print("🤖 Enhanced Simple Agent with SDK v1.0")
        print("   - Run-based session tracking")
        print("   - Multiturn conversation support")
        print("   - Master-style evaluation metrics")
        print("   - Thread-based conversation grouping")
        print()
        
        # Run enhanced demo with both single and multiturn conversations
        agent.run_demo(num_conversations=8, include_multiturn=True)
        
    except KeyboardInterrupt:
        print("\n🛑 Demo interrupted by user")
        # Ensure run is properly failed if interrupted
        if agent.lens.current_run_id:
            agent.lens.fail_run("Demo interrupted by user")
    except Exception as e:
        print(f"❌ Demo failed with error: {str(e)}")
        # Ensure run is properly failed on error
        if agent.lens.current_run_id:
            agent.lens.fail_run(f"Demo failed: {str(e)}")


if __name__ == "__main__":
    main()