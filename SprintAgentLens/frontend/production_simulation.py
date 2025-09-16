#!/usr/bin/env python3
"""
Production-Grade Agent Lens Simulation

This script simulates a realistic production scenario with:
- Customer support agent handling various conversation types
- Technical support agent with complex problem-solving scenarios
- Sales assistant with lead qualification and product demos
- Different conversation patterns: single-turn, multi-turn, error cases
- Realistic response times, token usage, and costs
- Production-grade observability with traces and spans
"""

import os
import sys
import time
import random
import json
import asyncio
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any
from dataclasses import dataclass

# Add the SDK path (adjust as needed)
sdk_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'agent_lense', 'sdks', 'python')
sys.path.append(sdk_path)

try:
    from agent_lens import AgentLens, trace, span
except ImportError:
    print("⚠️ Agent Lens SDK not found. Please ensure the SDK is properly installed.")
    print("Creating mock decorators for simulation...")
    
    # Mock decorators for testing
    def trace(name: str = None, **kwargs):
        def decorator(func):
            return func
        return decorator
    
    def span(name: str = None, **kwargs):
        def decorator(func):
            return func
        return decorator

# Configuration
API_BASE = "http://localhost:3000/api/v1"
PROJECT_NAME = "Customer Experience Platform"
PROJECT_CODE = "CEP"

@dataclass
class ConversationScenario:
    type: str
    user_input: str
    expected_response_type: str
    complexity_level: int  # 1-5, affects response time and token usage
    error_probability: float  # 0.0-1.0
    multi_turn_probability: float  # 0.0-1.0

# Production-Grade Conversation Scenarios
CUSTOMER_SUPPORT_SCENARIOS = [
    ConversationScenario(
        type="account_issue",
        user_input="I can't log into my account. I keep getting an 'invalid credentials' error even though I'm sure my password is correct.",
        expected_response_type="troubleshooting",
        complexity_level=3,
        error_probability=0.05,
        multi_turn_probability=0.8
    ),
    ConversationScenario(
        type="billing_inquiry",
        user_input="Why was I charged $49.99 last month? I thought my subscription was only $29.99.",
        expected_response_type="billing_explanation",
        complexity_level=2,
        error_probability=0.03,
        multi_turn_probability=0.6
    ),
    ConversationScenario(
        type="feature_request",
        user_input="Can you add a dark mode to the mobile app? The current interface is too bright for night use.",
        expected_response_type="feature_acknowledgment",
        complexity_level=1,
        error_probability=0.01,
        multi_turn_probability=0.3
    ),
    ConversationScenario(
        type="technical_issue",
        user_input="The app crashes every time I try to export my data. I'm using iPhone 15 Pro with iOS 17.2.",
        expected_response_type="technical_support",
        complexity_level=4,
        error_probability=0.1,
        multi_turn_probability=0.9
    ),
    ConversationScenario(
        type="cancellation_request",
        user_input="I want to cancel my subscription. I'm not using the service enough to justify the cost.",
        expected_response_type="retention_attempt",
        complexity_level=3,
        error_probability=0.02,
        multi_turn_probability=0.7
    )
]

TECHNICAL_SUPPORT_SCENARIOS = [
    ConversationScenario(
        type="api_integration",
        user_input="I'm having trouble integrating your REST API. The webhook endpoints are returning 500 errors intermittently.",
        expected_response_type="technical_troubleshooting",
        complexity_level=5,
        error_probability=0.15,
        multi_turn_probability=0.95
    ),
    ConversationScenario(
        type="performance_issue",
        user_input="Our application response times have increased significantly since the last update. Database queries are taking 3x longer.",
        expected_response_type="performance_analysis",
        complexity_level=4,
        error_probability=0.08,
        multi_turn_probability=0.85
    ),
    ConversationScenario(
        type="security_concern",
        user_input="We're seeing suspicious login attempts from multiple IP addresses. Can you help us implement additional security measures?",
        expected_response_type="security_guidance",
        complexity_level=5,
        error_probability=0.05,
        multi_turn_probability=0.9
    )
]

SALES_SCENARIOS = [
    ConversationScenario(
        type="lead_qualification",
        user_input="Hi, I'm interested in your enterprise plan. Our company has about 500 employees and we need advanced analytics features.",
        expected_response_type="qualification_questions",
        complexity_level=2,
        error_probability=0.02,
        multi_turn_probability=0.8
    ),
    ConversationScenario(
        type="pricing_inquiry",
        user_input="What's the difference between your Professional and Enterprise tiers? Is there a discount for annual payments?",
        expected_response_type="pricing_explanation",
        complexity_level=2,
        error_probability=0.01,
        multi_turn_probability=0.5
    ),
    ConversationScenario(
        type="product_demo",
        user_input="Can you show me how the real-time dashboard works? We need to monitor key metrics 24/7.",
        expected_response_type="demo_scheduling",
        complexity_level=3,
        error_probability=0.03,
        multi_turn_probability=0.7
    )
]

class ProductionAgentSimulator:
    def __init__(self):
        self.project_id = None
        self.agents = {}
        self.conversation_count = 0
        
    async def setup_project_and_agents(self):
        """Create a realistic project with multiple specialized agents"""
        print("🏗️  Setting up production-grade project and agents...")
        
        # Create project via API (simplified for simulation)
        project_data = {
            "name": PROJECT_NAME,
            "code": PROJECT_CODE,
            "description": "Enterprise customer experience platform with AI-powered support, technical assistance, and sales automation",
            "template": "autonomous",  # Multi-agent setup
        }
        
        # For simulation, we'll use a mock project ID
        self.project_id = "proj_prod_sim_001"
        print(f"📁 Project created: {PROJECT_NAME} (ID: {self.project_id})")
        
        # Create specialized agents
        agents_config = [
            {
                "id": "agent_customer_support",
                "name": "Customer Support Assistant",
                "role": "Primary customer support agent handling account issues, billing, and general inquiries",
                "capabilities": ["natural_language", "knowledge_base", "escalation_management"],
                "model": "gpt-4"
            },
            {
                "id": "agent_technical_support", 
                "name": "Technical Support Specialist",
                "role": "Advanced technical support for API, integration, and performance issues",
                "capabilities": ["technical_analysis", "code_review", "system_diagnostics"],
                "model": "claude-3-opus"
            },
            {
                "id": "agent_sales_assistant",
                "name": "Sales Development Assistant", 
                "role": "Lead qualification, product demos, and pricing discussions",
                "capabilities": ["lead_scoring", "product_knowledge", "proposal_generation"],
                "model": "gpt-4"
            }
        ]
        
        for agent_config in agents_config:
            self.agents[agent_config["id"]] = agent_config
            print(f"🤖 Agent registered: {agent_config['name']} ({agent_config['id']})")
        
        print("✅ Project and agents setup complete!")
        
    @trace(name="customer_support_conversation", project_id=PROJECT_CODE)
    async def simulate_customer_support_conversation(self, scenario: ConversationScenario):
        """Simulate a customer support conversation with realistic patterns"""
        
        @span(name="input_analysis", span_type="analysis")
        def analyze_input(user_input: str) -> Dict[str, Any]:
            """Analyze user input to determine intent and sentiment"""
            # Simulate AI processing time
            time.sleep(random.uniform(0.1, 0.3))
            
            return {
                "intent": scenario.type,
                "sentiment": random.choice(["positive", "neutral", "negative", "frustrated"]),
                "urgency": random.choice(["low", "medium", "high"]),
                "complexity": scenario.complexity_level,
                "entities": ["account", "billing", "subscription"] if "billing" in scenario.type else ["technical", "app", "feature"]
            }
        
        @span(name="knowledge_base_search", span_type="retrieval")
        def search_knowledge_base(intent: str, entities: List[str]) -> Dict[str, Any]:
            """Search internal knowledge base for relevant information"""
            # Simulate knowledge base search time
            search_time = random.uniform(0.2, 0.8)
            time.sleep(search_time)
            
            return {
                "relevant_articles": random.randint(3, 8),
                "confidence_score": random.uniform(0.7, 0.95),
                "search_time_ms": int(search_time * 1000)
            }
        
        @span(name="response_generation", span_type="llm")
        def generate_response(analysis: Dict, knowledge: Dict) -> Dict[str, Any]:
            """Generate contextual response based on analysis and knowledge"""
            # Simulate LLM response time based on complexity
            base_time = 0.8
            complexity_multiplier = scenario.complexity_level * 0.3
            response_time = base_time + complexity_multiplier + random.uniform(0, 0.5)
            time.sleep(response_time)
            
            # Simulate error condition
            if random.random() < scenario.error_probability:
                raise Exception(f"LLM timeout error - response generation failed after {response_time:.1f}s")
            
            # Calculate realistic token usage
            base_tokens = 150
            complexity_tokens = scenario.complexity_level * 50
            total_tokens = base_tokens + complexity_tokens + random.randint(-30, 80)
            
            responses = {
                "account_issue": "I understand you're having trouble logging in. Let me help you resolve this. First, let's verify your account details and check if there might be a temporary lock.",
                "billing_inquiry": "I can see the confusion about your billing. Let me review your account and explain the charges. The $49.99 charge includes the base subscription plus additional usage fees.",
                "feature_request": "Thank you for the feedback about dark mode! This is a popular request that our product team is actively considering. I'll make sure to add your vote to the feature request.",
                "technical_issue": "I'm sorry you're experiencing crashes with data export. This appears to be related to a known issue with iOS 17.2. Let me provide you with a workaround and escalate this to our development team.",
                "cancellation_request": "I understand you're considering canceling. Before we proceed, I'd like to discuss some options that might better fit your usage pattern, including our scaled-down plans."
            }
            
            return {
                "response_text": responses.get(scenario.type, "I'm here to help you with your inquiry."),
                "token_usage": total_tokens,
                "processing_time_ms": int(response_time * 1000),
                "model_used": self.agents["agent_customer_support"]["model"],
                "cost_usd": total_tokens * 0.00003  # ~$0.03 per 1K tokens
            }
        
        # Execute conversation flow
        start_time = time.time()
        
        try:
            print(f"💬 Processing customer support: {scenario.type}")
            
            # Step 1: Analyze input
            analysis = analyze_input(scenario.user_input)
            
            # Step 2: Search knowledge base
            knowledge = search_knowledge_base(analysis["intent"], analysis["entities"])
            
            # Step 3: Generate response  
            response = generate_response(analysis, knowledge)
            
            # Step 4: Handle multi-turn if needed
            turn_count = 1
            if random.random() < scenario.multi_turn_probability:
                turn_count = random.randint(2, 5)
                print(f"  🔄 Multi-turn conversation detected: {turn_count} turns")
                
                for turn in range(2, turn_count + 1):
                    # Simulate follow-up responses (shorter)
                    time.sleep(random.uniform(0.3, 0.8))
                    additional_tokens = random.randint(50, 150)
                    response["token_usage"] += additional_tokens
                    response["cost_usd"] += additional_tokens * 0.00003
            
            total_time = time.time() - start_time
            
            # Create conversation record
            conversation_data = {
                "id": f"conv_cs_{self.conversation_count:04d}",
                "project_id": self.project_id,
                "agent_id": "agent_customer_support",
                "agent_name": self.agents["agent_customer_support"]["name"],
                "input": scenario.user_input,
                "output": response["response_text"],
                "status": "success",
                "response_time": int(total_time * 1000),
                "token_usage": response["token_usage"],
                "cost": response["cost_usd"],
                "turn_count": turn_count,
                "is_thread": turn_count > 1,
                "metadata": {
                    "scenario_type": scenario.type,
                    "intent": analysis["intent"],
                    "sentiment": analysis["sentiment"], 
                    "urgency": analysis["urgency"],
                    "model": response["model_used"],
                    "knowledge_articles": knowledge["relevant_articles"]
                },
                "created_at": datetime.now().isoformat(),
            }
            
            self.conversation_count += 1
            print(f"  ✅ Conversation completed: {response['token_usage']} tokens, {total_time:.2f}s, ${response['cost_usd']:.4f}")
            
            return conversation_data
            
        except Exception as e:
            # Handle error scenarios
            total_time = time.time() - start_time
            error_conversation = {
                "id": f"conv_cs_error_{self.conversation_count:04d}",
                "project_id": self.project_id,
                "agent_id": "agent_customer_support", 
                "agent_name": self.agents["agent_customer_support"]["name"],
                "input": scenario.user_input,
                "output": f"Error: {str(e)}",
                "status": "error",
                "response_time": int(total_time * 1000),
                "token_usage": 0,
                "cost": 0,
                "turn_count": 1,
                "is_thread": False,
                "metadata": {
                    "scenario_type": scenario.type,
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                },
                "created_at": datetime.now().isoformat(),
            }
            
            self.conversation_count += 1
            print(f"  ❌ Conversation failed: {str(e)}")
            
            return error_conversation
    
    @trace(name="technical_support_conversation", project_id=PROJECT_CODE)
    async def simulate_technical_support_conversation(self, scenario: ConversationScenario):
        """Simulate technical support with complex troubleshooting"""
        
        @span(name="issue_classification", span_type="analysis")
        def classify_technical_issue(user_input: str) -> Dict[str, Any]:
            time.sleep(random.uniform(0.2, 0.5))
            
            return {
                "category": scenario.type,
                "severity": random.choice(["low", "medium", "high", "critical"]),
                "affected_systems": random.choice([
                    ["api", "database"],
                    ["frontend", "cdn"],
                    ["authentication", "security"],
                    ["monitoring", "alerts"]
                ]),
                "estimated_resolution_time": random.randint(30, 240)  # minutes
            }
        
        @span(name="diagnostic_analysis", span_type="analysis")
        def run_diagnostics(classification: Dict) -> Dict[str, Any]:
            # Longer processing for technical issues
            diagnostic_time = random.uniform(1.0, 3.0)
            time.sleep(diagnostic_time)
            
            return {
                "logs_analyzed": random.randint(500, 5000),
                "error_patterns": random.randint(3, 15),
                "system_health_score": random.uniform(0.6, 0.9),
                "diagnostic_time_ms": int(diagnostic_time * 1000)
            }
        
        @span(name="solution_generation", span_type="llm")
        def generate_technical_solution(classification: Dict, diagnostics: Dict) -> Dict[str, Any]:
            # Technical responses are typically longer and more complex
            response_time = random.uniform(1.5, 4.0)
            time.sleep(response_time)
            
            if random.random() < scenario.error_probability:
                raise Exception("Technical analysis timeout - complex issue requires escalation")
            
            # Higher token usage for technical responses
            base_tokens = 400
            complexity_tokens = scenario.complexity_level * 150
            total_tokens = base_tokens + complexity_tokens + random.randint(-100, 200)
            
            solutions = {
                "api_integration": "I've analyzed your webhook integration issue. The 500 errors appear to be related to request timeout handling. Here's a detailed solution with code examples and best practices for robust error handling.",
                "performance_issue": "Based on the diagnostic analysis, the performance degradation is caused by inefficient database queries after the recent schema changes. I'll provide you with optimized queries and indexing recommendations.",
                "security_concern": "The login attempts you're seeing match known attack patterns. I'll help you implement rate limiting, IP blocking, and enhanced monitoring. Here's a comprehensive security enhancement plan."
            }
            
            return {
                "response_text": solutions.get(scenario.type, "Let me analyze this technical issue and provide you with a detailed solution."),
                "token_usage": total_tokens,
                "processing_time_ms": int(response_time * 1000),
                "model_used": self.agents["agent_technical_support"]["model"],
                "cost_usd": total_tokens * 0.000075,  # Higher cost for Claude Opus
                "code_examples_included": True,
                "documentation_links": random.randint(3, 8)
            }
        
        start_time = time.time()
        
        try:
            print(f"🔧 Processing technical support: {scenario.type}")
            
            classification = classify_technical_issue(scenario.user_input)
            diagnostics = run_diagnostics(classification)
            solution = generate_technical_solution(classification, diagnostics)
            
            # Technical issues almost always multi-turn
            turn_count = random.randint(3, 8)
            print(f"  🔄 Complex technical conversation: {turn_count} turns")
            
            for turn in range(2, turn_count + 1):
                time.sleep(random.uniform(0.5, 1.5))
                additional_tokens = random.randint(200, 500)
                solution["token_usage"] += additional_tokens
                solution["cost_usd"] += additional_tokens * 0.000075
            
            total_time = time.time() - start_time
            
            conversation_data = {
                "id": f"conv_tech_{self.conversation_count:04d}",
                "project_id": self.project_id,
                "agent_id": "agent_technical_support",
                "agent_name": self.agents["agent_technical_support"]["name"],
                "input": scenario.user_input,
                "output": solution["response_text"],
                "status": "success",
                "response_time": int(total_time * 1000),
                "token_usage": solution["token_usage"],
                "cost": solution["cost_usd"],
                "turn_count": turn_count,
                "is_thread": True,
                "metadata": {
                    "scenario_type": scenario.type,
                    "severity": classification["severity"],
                    "affected_systems": classification["affected_systems"],
                    "logs_analyzed": diagnostics["logs_analyzed"],
                    "model": solution["model_used"],
                    "code_examples": solution["code_examples_included"]
                },
                "created_at": datetime.now().isoformat(),
            }
            
            self.conversation_count += 1
            print(f"  ✅ Technical conversation completed: {solution['token_usage']} tokens, {total_time:.2f}s, ${solution['cost_usd']:.4f}")
            
            return conversation_data
            
        except Exception as e:
            total_time = time.time() - start_time
            error_conversation = {
                "id": f"conv_tech_error_{self.conversation_count:04d}",
                "project_id": self.project_id,
                "agent_id": "agent_technical_support",
                "agent_name": self.agents["agent_technical_support"]["name"],
                "input": scenario.user_input,
                "output": f"Technical analysis failed: {str(e)}",
                "status": "error", 
                "response_time": int(total_time * 1000),
                "token_usage": 0,
                "cost": 0,
                "turn_count": 1,
                "is_thread": False,
                "metadata": {
                    "scenario_type": scenario.type,
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                },
                "created_at": datetime.now().isoformat(),
            }
            
            self.conversation_count += 1
            print(f"  ❌ Technical conversation failed: {str(e)}")
            
            return error_conversation
    
    @trace(name="sales_conversation", project_id=PROJECT_CODE)
    async def simulate_sales_conversation(self, scenario: ConversationScenario):
        """Simulate sales conversations with lead qualification"""
        
        @span(name="lead_scoring", span_type="analysis")
        def score_lead(user_input: str) -> Dict[str, Any]:
            time.sleep(random.uniform(0.1, 0.4))
            
            return {
                "lead_score": random.randint(40, 95),
                "company_size": random.choice(["startup", "smb", "mid-market", "enterprise"]),
                "budget_indicator": random.choice(["low", "medium", "high", "enterprise"]),
                "urgency": random.choice(["low", "medium", "high"]),
                "fit_score": random.uniform(0.6, 0.95)
            }
        
        @span(name="product_matching", span_type="recommendation") 
        def match_products(lead_data: Dict) -> Dict[str, Any]:
            time.sleep(random.uniform(0.3, 0.7))
            
            return {
                "recommended_tier": random.choice(["Professional", "Business", "Enterprise"]),
                "features_highlighted": random.randint(4, 10),
                "pricing_tier": random.choice(["standard", "premium", "custom"]),
                "estimated_value": random.randint(5000, 50000)
            }
        
        @span(name="sales_response", span_type="llm")
        def generate_sales_response(lead_data: Dict, products: Dict) -> Dict[str, Any]:
            response_time = random.uniform(0.6, 2.0)
            time.sleep(response_time)
            
            if random.random() < scenario.error_probability:
                raise Exception("Sales system integration error - CRM connection failed")
            
            base_tokens = 250
            complexity_tokens = scenario.complexity_level * 75
            total_tokens = base_tokens + complexity_tokens + random.randint(-50, 150)
            
            responses = {
                "lead_qualification": "Thank you for your interest in our enterprise plan! With 500 employees, you'll definitely benefit from our advanced analytics. Let me ask a few questions to recommend the best solution for your needs.",
                "pricing_inquiry": "Great question about our pricing tiers! The Professional plan includes core analytics, while Enterprise adds advanced security, custom integrations, and dedicated support. Annual payments receive a 20% discount.",
                "product_demo": "I'd be happy to show you our real-time dashboard! It's perfect for 24/7 monitoring. Let me schedule a personalized demo where I can show you exactly how it would work with your use case."
            }
            
            return {
                "response_text": responses.get(scenario.type, "I'm excited to help you find the perfect solution for your business needs."),
                "token_usage": total_tokens,
                "processing_time_ms": int(response_time * 1000),
                "model_used": self.agents["agent_sales_assistant"]["model"],
                "cost_usd": total_tokens * 0.00003,
                "follow_up_scheduled": random.choice([True, False]),
                "crm_updated": True
            }
        
        start_time = time.time()
        
        try:
            print(f"💰 Processing sales conversation: {scenario.type}")
            
            lead_data = score_lead(scenario.user_input)
            products = match_products(lead_data)
            response = generate_sales_response(lead_data, products)
            
            # Sales conversations vary in length
            turn_count = 1
            if random.random() < scenario.multi_turn_probability:
                turn_count = random.randint(2, 6)
                print(f"  🔄 Sales conversation: {turn_count} turns")
                
                for turn in range(2, turn_count + 1):
                    time.sleep(random.uniform(0.4, 1.0))
                    additional_tokens = random.randint(100, 300)
                    response["token_usage"] += additional_tokens
                    response["cost_usd"] += additional_tokens * 0.00003
            
            total_time = time.time() - start_time
            
            conversation_data = {
                "id": f"conv_sales_{self.conversation_count:04d}",
                "project_id": self.project_id,
                "agent_id": "agent_sales_assistant",
                "agent_name": self.agents["agent_sales_assistant"]["name"],
                "input": scenario.user_input,
                "output": response["response_text"],
                "status": "success",
                "response_time": int(total_time * 1000),
                "token_usage": response["token_usage"],
                "cost": response["cost_usd"],
                "turn_count": turn_count,
                "is_thread": turn_count > 1,
                "metadata": {
                    "scenario_type": scenario.type,
                    "lead_score": lead_data["lead_score"],
                    "company_size": lead_data["company_size"],
                    "recommended_tier": products["recommended_tier"],
                    "estimated_value": products["estimated_value"],
                    "model": response["model_used"],
                    "follow_up_scheduled": response["follow_up_scheduled"]
                },
                "created_at": datetime.now().isoformat(),
            }
            
            self.conversation_count += 1
            print(f"  ✅ Sales conversation completed: {response['token_usage']} tokens, {total_time:.2f}s, ${response['cost_usd']:.4f}")
            
            return conversation_data
            
        except Exception as e:
            total_time = time.time() - start_time
            error_conversation = {
                "id": f"conv_sales_error_{self.conversation_count:04d}",
                "project_id": self.project_id,
                "agent_id": "agent_sales_assistant",
                "agent_name": self.agents["agent_sales_assistant"]["name"],
                "input": scenario.user_input,
                "output": f"Sales system error: {str(e)}",
                "status": "error",
                "response_time": int(total_time * 1000),
                "token_usage": 0,
                "cost": 0,
                "turn_count": 1,
                "is_thread": False,
                "metadata": {
                    "scenario_type": scenario.type,
                    "error_type": type(e).__name__,
                    "error_message": str(e)
                },
                "created_at": datetime.now().isoformat(),
            }
            
            self.conversation_count += 1
            print(f"  ❌ Sales conversation failed: {str(e)}")
            
            return error_conversation
    
    async def run_production_simulation(self, duration_minutes: int = 30, conversations_per_minute: float = 2.0):
        """Run a full production simulation with realistic conversation patterns"""
        
        print(f"🚀 Starting production simulation...")
        print(f"   Duration: {duration_minutes} minutes")
        print(f"   Rate: {conversations_per_minute} conversations/minute")
        print(f"   Expected total: {int(duration_minutes * conversations_per_minute)} conversations")
        print()
        
        await self.setup_project_and_agents()
        print()
        
        all_conversations = []
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)
        
        conversation_interval = 60.0 / conversations_per_minute  # seconds between conversations
        
        while time.time() < end_time:
            # Randomly select conversation type based on realistic distribution
            conversation_type = random.choices(
                ["customer_support", "technical_support", "sales"],
                weights=[0.6, 0.25, 0.15]  # Customer support is most common
            )[0]
            
            try:
                if conversation_type == "customer_support":
                    scenario = random.choice(CUSTOMER_SUPPORT_SCENARIOS)
                    conversation = await self.simulate_customer_support_conversation(scenario)
                elif conversation_type == "technical_support":
                    scenario = random.choice(TECHNICAL_SUPPORT_SCENARIOS)
                    conversation = await self.simulate_technical_support_conversation(scenario)
                else:  # sales
                    scenario = random.choice(SALES_SCENARIOS)
                    conversation = await self.simulate_sales_conversation(scenario)
                
                all_conversations.append(conversation)
                
            except Exception as e:
                print(f"❌ Simulation error: {str(e)}")
            
            # Wait for next conversation (with some randomness)
            wait_time = conversation_interval * random.uniform(0.5, 1.5)
            if time.time() + wait_time < end_time:
                time.sleep(wait_time)
            else:
                break
        
        # Generate final report
        total_time = time.time() - start_time
        await self.generate_final_report(all_conversations, total_time)
        
        return all_conversations
    
    async def generate_final_report(self, conversations: List[Dict], total_time: float):
        """Generate comprehensive production simulation report"""
        
        print("\n" + "="*80)
        print("📊 PRODUCTION SIMULATION REPORT")
        print("="*80)
        
        # Basic statistics
        total_conversations = len(conversations)
        successful_conversations = len([c for c in conversations if c["status"] == "success"])
        error_conversations = len([c for c in conversations if c["status"] == "error"])
        
        print(f"📈 CONVERSATION METRICS")
        print(f"   Total Conversations: {total_conversations}")
        print(f"   Successful: {successful_conversations} ({successful_conversations/total_conversations*100:.1f}%)")
        print(f"   Errors: {error_conversations} ({error_conversations/total_conversations*100:.1f}%)")
        print(f"   Simulation Time: {total_time/60:.1f} minutes")
        print(f"   Rate: {total_conversations/(total_time/60):.1f} conversations/minute")
        
        # Performance metrics
        if successful_conversations > 0:
            response_times = [c["response_time"] for c in conversations if c["status"] == "success"]
            token_usage = [c["token_usage"] for c in conversations if c["status"] == "success"]
            costs = [c["cost"] for c in conversations if c["status"] == "success"]
            
            print(f"\n🔧 PERFORMANCE METRICS")
            print(f"   Avg Response Time: {sum(response_times)/len(response_times):.0f}ms")
            print(f"   Min Response Time: {min(response_times)}ms")
            print(f"   Max Response Time: {max(response_times)}ms")
            print(f"   Total Tokens: {sum(token_usage):,}")
            print(f"   Avg Tokens/Conv: {sum(token_usage)/len(token_usage):.0f}")
            print(f"   Total Cost: ${sum(costs):.3f}")
            print(f"   Avg Cost/Conv: ${sum(costs)/len(costs):.4f}")
        
        # Conversation type breakdown
        conversation_types = {}
        for conv in conversations:
            scenario_type = conv.get("metadata", {}).get("scenario_type", "unknown")
            if scenario_type not in conversation_types:
                conversation_types[scenario_type] = {"count": 0, "success": 0, "error": 0}
            conversation_types[scenario_type]["count"] += 1
            if conv["status"] == "success":
                conversation_types[scenario_type]["success"] += 1
            else:
                conversation_types[scenario_type]["error"] += 1
        
        print(f"\n📋 CONVERSATION TYPE BREAKDOWN")
        for conv_type, stats in conversation_types.items():
            success_rate = stats["success"] / stats["count"] * 100 if stats["count"] > 0 else 0
            print(f"   {conv_type.replace('_', ' ').title()}: {stats['count']} total, {success_rate:.1f}% success")
        
        # Agent performance
        agent_stats = {}
        for conv in conversations:
            agent_id = conv["agent_id"]
            if agent_id not in agent_stats:
                agent_stats[agent_id] = {"conversations": 0, "total_tokens": 0, "total_cost": 0, "avg_response_time": []}
            
            agent_stats[agent_id]["conversations"] += 1
            agent_stats[agent_id]["total_tokens"] += conv["token_usage"]
            agent_stats[agent_id]["total_cost"] += conv["cost"]
            if conv["status"] == "success":
                agent_stats[agent_id]["avg_response_time"].append(conv["response_time"])
        
        print(f"\n🤖 AGENT PERFORMANCE")
        for agent_id, stats in agent_stats.items():
            agent_name = self.agents[agent_id]["name"]
            avg_response = sum(stats["avg_response_time"]) / len(stats["avg_response_time"]) if stats["avg_response_time"] else 0
            print(f"   {agent_name}:")
            print(f"     Conversations: {stats['conversations']}")
            print(f"     Avg Response Time: {avg_response:.0f}ms")
            print(f"     Total Tokens: {stats['total_tokens']:,}")
            print(f"     Total Cost: ${stats['total_cost']:.3f}")
        
        # Save detailed data for analysis
        output_file = f"production_simulation_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w') as f:
            json.dump({
                "simulation_metadata": {
                    "duration_minutes": total_time / 60,
                    "total_conversations": total_conversations,
                    "success_rate": successful_conversations / total_conversations,
                    "conversations_per_minute": total_conversations / (total_time / 60)
                },
                "conversations": conversations,
                "agents": self.agents,
                "project_id": self.project_id
            }, f, indent=2)
        
        print(f"\n💾 Detailed simulation data saved to: {output_file}")
        print(f"\n✅ Production simulation completed successfully!")
        
        # Instructions for next steps
        print(f"\n🎯 NEXT STEPS")
        print(f"   1. Upload this data to your Agent Lens dashboard")
        print(f"   2. Navigate to {API_BASE.replace('/api/v1', '')}/projects/{self.project_id}/conversations")
        print(f"   3. Verify observability features with real production-grade data")
        print(f"   4. Test filtering, search, and analytics capabilities")

async def main():
    """Main execution function"""
    simulator = ProductionAgentSimulator()
    
    # Run simulation (adjust parameters as needed)
    conversations = await simulator.run_production_simulation(
        duration_minutes=10,  # Run for 10 minutes
        conversations_per_minute=3.0  # 3 conversations per minute
    )
    
    print(f"\n🎉 Simulation generated {len(conversations)} conversations for testing!")

if __name__ == "__main__":
    print("🏭 Agent Lens Production Simulation")
    print("=====================================")
    asyncio.run(main())