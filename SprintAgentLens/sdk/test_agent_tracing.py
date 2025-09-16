#!/usr/bin/env python3
"""
Test script for SprintAgentLens Tracing SDK with AI agents.
Demonstrates comprehensive end-to-end tracing scenarios.
"""

import asyncio
import json
import random
import time
from typing import Dict, List, Any, Optional
import sys
import os

# Add the SDK to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sprint_trace import (
    configure, track, trace_context_manager, async_trace_context_manager,
    TraceType, Environment, add_trace_feedback, update_trace_usage,
    update_current_trace, get_client
)


# Configure the tracing client
configure(
    base_url="http://localhost:3001",
    batch_size=5,
    flush_interval=10.0,
    async_mode=True
)


class MockOpenAI:
    """Mock OpenAI client for testing."""
    
    @track(
        trace_type=TraceType.LLM_CHAIN,
        model_name="gpt-4",
        tags=["openai", "llm"]
    )
    def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: str = "gpt-4",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        project_id: str = "proj_production_demo_001",
        agent_id: str = "agent_customer_support_001"
    ) -> Dict[str, Any]:
        """Mock chat completion with realistic response times and costs."""
        
        # Simulate processing time
        processing_time = random.uniform(0.5, 2.0)
        time.sleep(processing_time)
        
        # Calculate mock token usage
        prompt_tokens = sum(len(msg["content"].split()) for msg in messages) * 1.3
        completion_tokens = random.randint(50, 200)
        
        # Update usage and model parameters
        update_trace_usage(
            prompt_tokens=int(prompt_tokens),
            completion_tokens=completion_tokens,
            cost=round((prompt_tokens * 0.03 + completion_tokens * 0.06) / 1000, 4)
        )
        
        update_current_trace(
            model_parameters={"temperature": temperature, "max_tokens": max_tokens},
            latency_ms=processing_time * 1000
        )
        
        # Mock response
        responses = [
            "I understand your concern and I'm here to help resolve this issue for you.",
            "Let me check your account details and provide you with the best solution.",
            "Thank you for bringing this to my attention. I'll investigate this immediately.",
            "I apologize for the inconvenience. Let me walk you through the solution step by step.",
            "Based on your description, I can see the issue. Here's how we can fix this..."
        ]
        
        response = {
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": random.choice(responses)
                    },
                    "finish_reason": "stop"
                }
            ],
            "usage": {
                "prompt_tokens": int(prompt_tokens),
                "completion_tokens": completion_tokens,
                "total_tokens": int(prompt_tokens) + completion_tokens
            },
            "model": model
        }
        
        return response


class MockRetriever:
    """Mock retrieval system for RAG testing."""
    
    @track(
        trace_type=TraceType.RETRIEVAL,
        tags=["rag", "vector_search"]
    )
    def retrieve_context(
        self, 
        query: str, 
        top_k: int = 5,
        threshold: float = 0.7,
        project_id: str = "proj_production_demo_001",
        agent_id: str = "agent_customer_support_001"
    ) -> List[Dict[str, Any]]:
        """Mock context retrieval with relevance scoring."""
        
        # Simulate search time
        search_time = random.uniform(0.1, 0.5)
        time.sleep(search_time)
        
        contexts = [
            {
                "id": "doc_1",
                "content": "Our customer support team is available 24/7 to assist with any issues.",
                "score": 0.95,
                "metadata": {"source": "support_docs", "section": "availability"}
            },
            {
                "id": "doc_2", 
                "content": "For billing inquiries, please provide your account number and billing period.",
                "score": 0.87,
                "metadata": {"source": "billing_docs", "section": "requirements"}
            },
            {
                "id": "doc_3",
                "content": "Technical issues can be resolved by following our troubleshooting guide.",
                "score": 0.82,
                "metadata": {"source": "tech_docs", "section": "troubleshooting"}
            }
        ]
        
        # Filter by threshold and top_k
        relevant_contexts = [
            ctx for ctx in contexts[:top_k] 
            if ctx["score"] >= threshold
        ]
        
        # Update trace with retrieval metrics
        update_current_trace(
            latency_ms=search_time * 1000,
            metadata={
                "retrieved_count": len(relevant_contexts),
                "threshold": threshold,
                "top_k": top_k,
                "avg_relevance": sum(ctx["score"] for ctx in relevant_contexts) / len(relevant_contexts) if relevant_contexts else 0
            }
        )
        
        return relevant_contexts


class CustomerSupportAgent:
    """Enhanced customer support agent with comprehensive tracing."""
    
    def __init__(self):
        self.openai = MockOpenAI()
        self.retriever = MockRetriever()
        self.conversation_history = []
        
    @track(
        trace_type=TraceType.PREPROCESSING,
        tags=["preprocessing", "validation"]
    )
    def preprocess_query(
        self, 
        user_input: str,
        project_id: str = "proj_production_demo_001",
        agent_id: str = "agent_customer_support_001"
    ) -> Dict[str, Any]:
        """Preprocess and validate user input."""
        
        # Simulate preprocessing
        processing_time = random.uniform(0.05, 0.2)
        time.sleep(processing_time)
        
        # Extract intent and entities (mock)
        intents = ["billing", "technical", "general", "complaint"]
        entities = ["account_number", "product_name", "date", "email"]
        
        processed = {
            "cleaned_input": user_input.strip().lower(),
            "intent": random.choice(intents),
            "entities": random.sample(entities, random.randint(0, 2)),
            "confidence": random.uniform(0.7, 0.95),
            "language": "en",
            "urgency": random.choice(["low", "medium", "high"])
        }
        
        update_current_trace(
            latency_ms=processing_time * 1000,
            quality_score=processed["confidence"]
        )
        
        return processed
    
    @track(
        trace_type=TraceType.CONVERSATION,
        tags=["customer_support", "rag"]
    )
    def handle_customer_query(
        self, 
        user_input: str, 
        customer_id: str = "customer_123",
        session_id: str = None,
        project_id: str = "proj_production_demo_001",
        agent_id: str = "agent_customer_support_001"
    ) -> Dict[str, Any]:
        """Main handler for customer queries with full tracing."""
        
        # Set session context
        if session_id:
            update_current_trace(session_id=session_id, user_id=customer_id)
        
        try:
            # Step 1: Preprocess the query
            processed_input = self.preprocess_query(user_input)
            
            # Step 2: Retrieve relevant context
            context_docs = self.retriever.retrieve_context(
                query=processed_input["cleaned_input"],
                threshold=0.75
            )
            
            # Step 3: Build messages for LLM
            system_message = {
                "role": "system",
                "content": "You are a helpful customer support agent. Use the provided context to answer customer questions accurately and professionally."
            }
            
            context_content = "\n".join([doc["content"] for doc in context_docs])
            user_message = {
                "role": "user", 
                "content": f"Context: {context_content}\n\nCustomer Query: {user_input}"
            }
            
            messages = [system_message] + self.conversation_history[-4:] + [user_message]
            
            # Step 4: Get LLM response
            response = self.openai.chat_completion(
                messages=messages,
                temperature=0.7,
                max_tokens=500
            )
            
            assistant_message = response["choices"][0]["message"]["content"]
            
            # Update conversation history
            self.conversation_history.extend([user_message, {"role": "assistant", "content": assistant_message}])
            
            # Calculate quality metrics
            relevance_score = sum(doc["score"] for doc in context_docs) / len(context_docs) if context_docs else 0.5
            factuality_score = random.uniform(0.8, 0.95)  # Mock factuality check
            
            update_current_trace(
                relevance_score=relevance_score,
                factuality_score=factuality_score,
                metadata={
                    "context_used": len(context_docs),
                    "intent": processed_input["intent"],
                    "urgency": processed_input["urgency"]
                }
            )
            
            result = {
                "response": assistant_message,
                "intent": processed_input["intent"],
                "context_docs": context_docs,
                "confidence": processed_input["confidence"],
                "usage": response["usage"]
            }
            
            return result
            
        except Exception as e:
            # Error handling with trace update
            update_current_trace(
                error_type="CustomerSupportError",
                error_code="PROCESSING_FAILED"
            )
            raise


class TechnicalSupportAgent:
    """Technical support agent with diagnostic tracing."""
    
    def __init__(self):
        self.openai = MockOpenAI()
        
    @track(
        trace_type=TraceType.TASK,
        tags=["technical_support", "diagnostics"]
    )
    def diagnose_issue(
        self, 
        issue_description: str,
        system_info: Dict[str, Any],
        project_id: str = "proj_production_demo_001",
        agent_id: str = "agent_technical_support_001"
    ) -> Dict[str, Any]:
        """Diagnose technical issues with detailed tracing."""
        
        # Simulate diagnostic steps
        diagnostic_steps = [
            "Analyzing system information",
            "Checking error logs", 
            "Validating configuration",
            "Testing connectivity",
            "Generating solution"
        ]
        
        results = []
        for i, step in enumerate(diagnostic_steps):
            # Create span for each diagnostic step
            current_trace = get_client()._trace_buffer[-1] if get_client()._trace_buffer else None
            if current_trace:
                span = current_trace.start_span(
                    name=step,
                    input_data={"step": i+1, "description": step}
                )
                
                # Simulate step processing
                step_time = random.uniform(0.2, 0.8)
                time.sleep(step_time)
                
                step_result = {
                    "step": step,
                    "status": random.choice(["passed", "warning", "failed"]),
                    "details": f"Step {i+1} completed with diagnostic information",
                    "duration_ms": step_time * 1000
                }
                results.append(step_result)
                
                current_trace.end_span(output_data=step_result)
        
        # Generate final diagnosis
        messages = [
            {
                "role": "system",
                "content": "You are a technical support specialist. Analyze the provided information and provide a detailed diagnosis."
            },
            {
                "role": "user",
                "content": f"Issue: {issue_description}\nSystem Info: {json.dumps(system_info)}\nDiagnostic Results: {json.dumps(results)}"
            }
        ]
        
        response = self.openai.chat_completion(messages=messages, model="gpt-4")
        
        diagnosis = {
            "issue_summary": issue_description,
            "diagnostic_steps": results,
            "recommendation": response["choices"][0]["message"]["content"],
            "severity": random.choice(["low", "medium", "high", "critical"]),
            "estimated_resolution_time": random.randint(15, 240)  # minutes
        }
        
        # Update trace with diagnostic metrics
        success_rate = len([r for r in results if r["status"] == "passed"]) / len(results)
        update_current_trace(
            quality_score=success_rate,
            metadata={
                "diagnostic_success_rate": success_rate,
                "total_steps": len(results),
                "severity": diagnosis["severity"]
            }
        )
        
        return diagnosis


class SalesAssistantAgent:
    """Sales assistant with lead qualification tracing."""
    
    def __init__(self):
        self.openai = MockOpenAI()
    
    @track(
        trace_type=TraceType.LLM_CHAIN,
        tags=["sales", "lead_qualification"]
    )
    def qualify_lead(
        self, 
        inquiry: str,
        company_info: Dict[str, Any],
        project_id: str = "proj_production_demo_001",
        agent_id: str = "agent_sales_assistant_001"
    ) -> Dict[str, Any]:
        """Qualify sales leads with comprehensive scoring."""
        
        # Qualification criteria
        criteria = {
            "budget": random.uniform(0.3, 1.0),
            "timeline": random.uniform(0.4, 1.0), 
            "authority": random.uniform(0.5, 1.0),
            "need": random.uniform(0.6, 1.0),
            "fit": random.uniform(0.4, 0.9)
        }
        
        # Overall qualification score
        qualification_score = sum(criteria.values()) / len(criteria)
        
        # Generate personalized response
        messages = [
            {
                "role": "system",
                "content": "You are a sales assistant. Provide a professional response to the sales inquiry and suggest next steps."
            },
            {
                "role": "user",
                "content": f"Inquiry: {inquiry}\nCompany: {json.dumps(company_info)}\nQualification Score: {qualification_score:.2f}"
            }
        ]
        
        response = self.openai.chat_completion(messages=messages)
        
        lead_data = {
            "inquiry": inquiry,
            "company_info": company_info,
            "qualification_criteria": criteria,
            "qualification_score": qualification_score,
            "recommendation": "qualified" if qualification_score > 0.6 else "needs_nurturing",
            "response": response["choices"][0]["message"]["content"],
            "next_steps": [
                "Schedule demo" if qualification_score > 0.8 else "Send additional information",
                "Connect with technical team" if qualification_score > 0.7 else "Follow up in 2 weeks"
            ]
        }
        
        # Update trace with sales metrics
        update_current_trace(
            quality_score=qualification_score,
            metadata={
                "lead_score": qualification_score,
                "recommendation": lead_data["recommendation"],
                "company_size": company_info.get("size", "unknown")
            }
        )
        
        # Add feedback based on qualification
        add_trace_feedback(
            name="lead_quality",
            value=qualification_score,
            category="sales",
            reason=f"Lead scored {qualification_score:.2f} on qualification criteria"
        )
        
        return lead_data


async def run_comprehensive_test():
    """Run comprehensive test scenarios with all agents."""
    
    print("🚀 Starting SprintAgentLens Tracing SDK Test")
    print("=" * 60)
    
    # Initialize agents
    customer_agent = CustomerSupportAgent()
    technical_agent = TechnicalSupportAgent()
    sales_agent = SalesAssistantAgent()
    
    # Test 1: Customer Support Conversation Flow
    print("\n📞 Test 1: Customer Support Conversation Flow")
    print("-" * 50)
    
    customer_queries = [
        "I'm having trouble accessing my account after the recent update",
        "My billing shows a charge I don't recognize",
        "The mobile app keeps crashing when I try to upload photos",
        "Can you help me upgrade my subscription plan?"
    ]
    
    session_id = f"session_{int(time.time())}"
    
    for i, query in enumerate(customer_queries):
        print(f"Query {i+1}: {query[:50]}...")
        
        with trace_context_manager(
            name=f"customer_query_{i+1}",
            project_id="proj_production_demo_001", 
            agent_id="agent_customer_support_001",
            trace_type=TraceType.CONVERSATION,
            session_id=session_id,
            conversation_id=f"conv_{session_id}_{i+1}",
            tags=["customer_support", "multi_turn"],
            environment=Environment.PRODUCTION
        ) as trace:
            
            result = customer_agent.handle_customer_query(
                query, 
                customer_id="customer_demo_001",
                session_id=session_id
            )
            
            # Add realistic feedback
            satisfaction_score = random.uniform(0.7, 1.0)
            add_trace_feedback(
                name="customer_satisfaction",
                value=satisfaction_score,
                category="user_experience",
                reason="Customer feedback on response quality"
            )
            
            print(f"  ✅ Response generated (satisfaction: {satisfaction_score:.2f})")
        
        await asyncio.sleep(0.5)  # Realistic delay between interactions
    
    # Test 2: Technical Support Diagnostic Flow
    print("\n🔧 Test 2: Technical Support Diagnostic Flow")
    print("-" * 50)
    
    technical_issues = [
        {
            "description": "API integration is failing with 429 rate limit errors",
            "system_info": {
                "platform": "Linux",
                "api_version": "v2.1", 
                "request_rate": "800/min",
                "error_rate": "15%"
            }
        },
        {
            "description": "Database connection timeouts during peak hours",
            "system_info": {
                "database": "PostgreSQL 14",
                "connection_pool": "50",
                "peak_concurrent_users": "2000",
                "avg_response_time": "3.5s"
            }
        }
    ]
    
    for i, issue in enumerate(technical_issues):
        print(f"Issue {i+1}: {issue['description'][:50]}...")
        
        diagnosis = technical_agent.diagnose_issue(
            issue["description"],
            issue["system_info"]
        )
        
        print(f"  ✅ Diagnosis completed (severity: {diagnosis['severity']})")
        await asyncio.sleep(0.3)
    
    # Test 3: Sales Lead Qualification Flow
    print("\n💼 Test 3: Sales Lead Qualification Flow")
    print("-" * 50)
    
    sales_inquiries = [
        {
            "inquiry": "We're interested in your Enterprise plan for our 500-person fintech company",
            "company_info": {
                "name": "FinTech Solutions Inc",
                "size": "500",
                "industry": "Financial Services",
                "revenue": "$50M",
                "current_solution": "Manual processes"
            }
        },
        {
            "inquiry": "Looking for a solution to help our startup scale our customer support",
            "company_info": {
                "name": "StartupCo",
                "size": "25", 
                "industry": "Technology",
                "revenue": "$2M",
                "current_solution": "Email only"
            }
        }
    ]
    
    for i, inquiry_data in enumerate(sales_inquiries):
        print(f"Lead {i+1}: {inquiry_data['company_info']['name']}")
        
        qualification = sales_agent.qualify_lead(
            inquiry_data["inquiry"],
            inquiry_data["company_info"]
        )
        
        print(f"  ✅ Lead qualified (score: {qualification['qualification_score']:.2f}, recommendation: {qualification['recommendation']})")
        await asyncio.sleep(0.3)
    
    # Test 4: Error Handling and Edge Cases
    print("\n⚠️  Test 4: Error Handling and Edge Cases")
    print("-" * 50)
    
    # Simulate various error conditions
    error_scenarios = [
        {"type": "timeout", "description": "Simulated API timeout"},
        {"type": "invalid_input", "description": "Invalid user input"},
        {"type": "service_unavailable", "description": "External service down"}
    ]
    
    for scenario in error_scenarios:
        print(f"Testing {scenario['type']}: {scenario['description']}")
        
        try:
            with trace_context_manager(
                name=f"error_test_{scenario['type']}",
                project_id="proj_production_demo_001",
                agent_id="agent_test_001",
                trace_type=TraceType.TASK,
                tags=["error_testing", scenario['type']]
            ) as trace:
                
                # Simulate different types of errors
                if scenario['type'] == "timeout":
                    time.sleep(0.1)  # Short delay then raise timeout
                    raise TimeoutError("Simulated API timeout")
                elif scenario['type'] == "invalid_input":
                    raise ValueError("Invalid input format provided")
                elif scenario['type'] == "service_unavailable":
                    raise ConnectionError("External service unavailable")
                    
        except Exception as e:
            print(f"  ✅ Error handled: {type(e).__name__}")
    
    # Test 5: Async Operations and Concurrency
    print("\n🔄 Test 5: Async Operations and Concurrency")
    print("-" * 50)
    
    async def async_agent_operation(agent_id: str, operation_id: int):
        """Simulate async agent operation."""
        async with async_trace_context_manager(
            name=f"async_operation_{operation_id}",
            project_id="proj_production_demo_001",
            agent_id=agent_id,
            trace_type=TraceType.TASK,
            tags=["async", "concurrent"],
            metadata={"operation_id": operation_id}
        ) as trace:
            
            # Simulate async work
            await asyncio.sleep(random.uniform(0.1, 0.5))
            
            result = {
                "operation_id": operation_id,
                "agent_id": agent_id,
                "status": "completed",
                "timestamp": time.time()
            }
            
            trace.set_output(result)
            return result
    
    # Run concurrent operations
    tasks = []
    for i in range(5):
        agent_id = f"agent_async_{i % 3 + 1:03d}"
        tasks.append(async_agent_operation(agent_id, i))
    
    results = await asyncio.gather(*tasks)
    print(f"  ✅ Completed {len(results)} concurrent operations")
    
    # Flush any remaining traces
    print("\n📤 Flushing remaining traces...")
    get_client().flush()
    await asyncio.sleep(1)  # Allow flush to complete
    
    print("\n🎉 All tests completed successfully!")
    print("   Check the SprintAgentLens UI for trace visualization")
    print("   API endpoint: http://localhost:3001/api/v1/traces")


if __name__ == "__main__":
    # Run the comprehensive test
    asyncio.run(run_comprehensive_test())