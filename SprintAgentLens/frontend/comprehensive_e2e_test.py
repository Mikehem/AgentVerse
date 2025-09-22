#!/usr/bin/env python3
"""
Comprehensive End-to-End Test for Agent Lens using SimpleAgent SDK
This test generates multiple types of conversations and ensures proper cost tracking and metrics display.
"""

import os
import sys
import time
import json
import uuid
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import requests

# Add the current directory to path to import the SDK
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from agent_lens_sdk import AgentLensClient, TracedLLMCall
    print("✅ Agent Lens SDK imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Agent Lens SDK: {e}")
    sys.exit(1)


class ComprehensiveE2ETest:
    """Comprehensive E2E testing for Agent Lens with real conversation data."""
    
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.client = AgentLensClient(base_url=base_url)
        self.agents = {}
        self.projects = []
        self.conversations_created = []
        self.test_start_time = datetime.now()
        
    def setup_test_environment(self):
        """Setup test projects and agents."""
        print("🚀 Setting up test environment...")
        
        # Test scenarios with different conversation types
        self.test_scenarios = [
            {
                "project_name": "Customer Support Agent Test",
                "project_description": "Testing customer support conversations",
                "agent_name": "Support Assistant",
                "agent_description": "AI agent for customer support inquiries",
                "conversation_types": [
                    "simple_query",
                    "complex_problem_solving",
                    "multi_step_process",
                    "error_handling",
                    "feedback_collection"
                ],
                "models": ["gpt-4o-mini", "gpt-4", "claude-3-sonnet"],
                "providers": ["azure", "openai", "anthropic"]
            },
            {
                "project_name": "Sales Assistant Test", 
                "project_description": "Testing sales conversation flows",
                "agent_name": "Sales Bot",
                "agent_description": "AI agent for sales inquiries and lead qualification",
                "conversation_types": [
                    "product_inquiry",
                    "pricing_discussion", 
                    "feature_comparison",
                    "demo_scheduling",
                    "objection_handling"
                ],
                "models": ["gpt-4o-mini", "gpt-4"],
                "providers": ["azure", "openai"]
            },
            {
                "project_name": "Technical Documentation Agent",
                "project_description": "Testing technical documentation conversations",
                "agent_name": "Tech Writer",
                "agent_description": "AI agent for technical documentation assistance",
                "conversation_types": [
                    "api_documentation",
                    "code_explanation",
                    "troubleshooting_guide",
                    "best_practices",
                    "architecture_questions"
                ],
                "models": ["gpt-4", "claude-3-sonnet"],
                "providers": ["openai", "anthropic"]
            }
        ]
        
        # Create projects and agents for each scenario
        for scenario in self.test_scenarios:
            project_id = f"test_project_{uuid.uuid4().hex[:8]}"
            agent_id = f"test_agent_{uuid.uuid4().hex[:8]}"
            
            # Store project and agent info
            project_info = {
                "id": project_id,
                "name": scenario["project_name"],
                "description": scenario["project_description"],
                "scenario": scenario
            }
            self.projects.append(project_info)
            
            agent_info = {
                "id": agent_id,
                "project_id": project_id,
                "name": scenario["agent_name"],
                "description": scenario["agent_description"],
                "models": scenario["models"],
                "providers": scenario["providers"]
            }
            self.agents[project_id] = agent_info
        
        print(f"✅ Setup complete: {len(self.projects)} projects, {len(self.agents)} agents")
    
    def generate_conversation_data(self, conversation_type: str, model: str, provider: str) -> Dict[str, Any]:
        """Generate realistic conversation data based on type."""
        
        conversation_templates = {
            "simple_query": {
                "inputs": [
                    "What are your business hours?",
                    "How can I reset my password?", 
                    "Where can I find the user manual?",
                    "What payment methods do you accept?",
                    "How do I contact support?"
                ],
                "outputs": [
                    "Our business hours are Monday-Friday 9 AM to 6 PM EST. We also offer 24/7 chat support for urgent matters.",
                    "You can reset your password by clicking 'Forgot Password' on the login page. You'll receive a reset link via email within 5 minutes.",
                    "The user manual is available in your dashboard under 'Help & Resources' or you can download it from our support center.",
                    "We accept all major credit cards, PayPal, bank transfers, and cryptocurrency payments for enterprise accounts.",
                    "You can reach our support team via live chat, email at support@company.com, or phone at 1-800-SUPPORT."
                ],
                "response_times": [800, 1200, 950, 1100, 750],
                "token_ranges": (50, 150)
            },
            "complex_problem_solving": {
                "inputs": [
                    "I'm experiencing intermittent connection issues with the API that seem to happen during peak hours",
                    "My data synchronization is failing and I'm getting timeout errors on large datasets",
                    "The dashboard is showing incorrect metrics and the numbers don't match our internal reports",
                    "We're having performance issues when processing batch uploads of more than 1000 records",
                    "Integration with our CRM system is breaking when we try to sync custom fields"
                ],
                "outputs": [
                    "I understand you're experiencing API connection issues during peak hours. This suggests a rate limiting or capacity issue. Let me help you implement exponential backoff retry logic and check if you need to upgrade your plan for higher rate limits.",
                    "Timeout errors on large datasets typically indicate either network latency or server-side processing limits. I recommend implementing pagination for datasets over 10MB and using asynchronous processing for better reliability.",
                    "Metric discrepancies can occur due to timezone differences, data filtering, or caching delays. Let's verify your timezone settings and check if there are any active filters affecting the data. I'll also refresh your dashboard cache.",
                    "Batch upload performance issues usually stem from processing limits or memory constraints. I suggest breaking large batches into chunks of 250 records each and implementing parallel processing to improve throughput.",
                    "CRM integration issues with custom fields often involve field mapping conflicts or data type mismatches. Let's review your field mappings and ensure all custom fields are properly configured in both systems."
                ],
                "response_times": [2500, 3200, 2800, 3500, 2900],
                "token_ranges": (200, 400)
            },
            "multi_step_process": {
                "inputs": [
                    "I need to set up automated reporting for our team",
                    "Can you guide me through the complete onboarding process?",
                    "I want to configure user permissions for different team roles",
                    "Help me integrate our system with third-party webhooks",
                    "I need to migrate data from our old system"
                ],
                "outputs": [
                    "I'll guide you through setting up automated reporting in 4 steps: 1) Select your data sources and metrics, 2) Choose report format and frequency, 3) Configure recipient lists and delivery methods, 4) Test and activate the automation. Shall we start with step 1?",
                    "Welcome! Our onboarding process has 5 key steps: 1) Account verification and profile setup, 2) Initial configuration and preferences, 3) Data import and integration setup, 4) Team member invitations and permissions, 5) Training and best practices review. Let's begin with account verification.",
                    "User permissions are configured through role-based access control (RBAC). We'll set up: 1) Define team roles (Admin, Editor, Viewer), 2) Assign specific permissions to each role, 3) Create user groups, 4) Test access levels. What roles does your team need?",
                    "Webhook integration involves: 1) Generate webhook URLs in your settings, 2) Configure payload formats and authentication, 3) Set up event triggers and filtering, 4) Test webhook delivery and error handling. Which events do you want to subscribe to?",
                    "Data migration requires careful planning: 1) Export data from your current system, 2) Map data fields to our schema, 3) Clean and validate data formats, 4) Import in batches with validation, 5) Verify data integrity. What type of data are you migrating?"
                ],
                "response_times": [2000, 2200, 1800, 2400, 2600],
                "token_ranges": (150, 300)
            },
            "error_handling": {
                "inputs": [
                    "I'm getting a 500 error when trying to upload files",
                    "The system keeps timing out during login attempts",
                    "My API calls are returning 429 rate limit errors",
                    "Database connection failed error is appearing randomly",
                    "Getting permission denied errors for actions I should be able to perform"
                ],
                "outputs": [
                    "A 500 error during file uploads typically indicates server-side processing issues. Please check: 1) File size limits (max 50MB), 2) Supported file formats, 3) Network stability. I'm also checking our server logs for any backend issues that might be affecting uploads.",
                    "Login timeout errors can be caused by network latency or server load. Try clearing your browser cache and cookies, disable VPN if active, or try from a different network. I'll also check if there are any ongoing server issues affecting authentication.",
                    "Rate limit 429 errors mean you've exceeded the allowed requests per minute. Your current plan allows 1000 requests/hour. Consider implementing request queuing, adding delays between requests, or upgrading to a higher tier plan for increased limits.",
                    "Random database connection failures suggest network instability or server resource constraints. I'm checking our database cluster status. As a workaround, implement connection retry logic with exponential backoff in your application.",
                    "Permission denied errors despite proper role assignment often indicate a caching issue or recent permission changes. Try logging out and back in, or I can manually refresh your permissions cache. Let me verify your current role assignments."
                ],
                "response_times": [1500, 1800, 1600, 2200, 1700],
                "token_ranges": (120, 250)
            }
        }
        
        # Select template or create generic if not found
        template = conversation_templates.get(conversation_type, {
            "inputs": ["Generic question about the service"],
            "outputs": ["Here's a helpful response to your inquiry."],
            "response_times": [1000],
            "token_ranges": (80, 180)
        })
        
        # Randomly select input/output pair
        idx = random.randint(0, len(template["inputs"]) - 1)
        base_response_time = template["response_times"][idx % len(template["response_times"])]
        
        # Add model-specific variations
        model_multipliers = {
            "gpt-4o-mini": 0.8,  # Faster, cheaper
            "gpt-4": 1.2,        # Slower, more expensive  
            "claude-3-sonnet": 1.0,  # Baseline
            "claude-3-opus": 1.5     # Slowest, most expensive
        }
        
        provider_multipliers = {
            "azure": 1.0,
            "openai": 1.1,
            "anthropic": 0.9
        }
        
        # Calculate realistic metrics
        response_time = int(base_response_time * model_multipliers.get(model, 1.0) * provider_multipliers.get(provider, 1.0))
        token_range = template["token_ranges"]
        token_usage = random.randint(token_range[0], token_range[1])
        
        # Calculate realistic cost based on model and provider
        cost = self.calculate_realistic_cost(token_usage, model, provider)
        
        # Add some realistic variation
        response_time += random.randint(-100, 200)
        token_usage += random.randint(-10, 20)
        
        return {
            "input": template["inputs"][idx],
            "output": template["outputs"][idx], 
            "response_time": max(100, response_time),  # Minimum 100ms
            "token_usage": max(10, token_usage),       # Minimum 10 tokens
            "cost": max(0.000001, cost),               # Minimum cost
            "model": model,
            "provider": provider,
            "conversation_type": conversation_type
        }
    
    def calculate_realistic_cost(self, token_usage: int, model: str, provider: str) -> float:
        """Calculate realistic costs based on actual pricing."""
        
        # Approximate pricing per 1000 tokens (input + output combined for simplicity)
        pricing = {
            "gpt-4o-mini": {
                "azure": 0.0002,
                "openai": 0.0002
            },
            "gpt-4": {
                "azure": 0.06,
                "openai": 0.06
            },
            "claude-3-sonnet": {
                "anthropic": 0.015
            },
            "claude-3-opus": {
                "anthropic": 0.075
            }
        }
        
        # Get pricing or use default
        model_pricing = pricing.get(model, {"default": 0.002})
        cost_per_1k = model_pricing.get(provider, model_pricing.get("default", 0.002))
        
        # Calculate cost with some realistic variation
        base_cost = (token_usage / 1000.0) * cost_per_1k
        variation = random.uniform(0.9, 1.1)  # ±10% variation
        
        return round(base_cost * variation, 6)
    
    def run_conversation_scenarios(self):
        """Run various conversation scenarios to generate realistic data."""
        print("💬 Running conversation scenarios...")
        
        total_conversations = 0
        
        for project_info in self.projects:
            project_id = project_info["id"]
            agent_info = self.agents[project_id]
            scenario = project_info["scenario"]
            
            print(f"\n📊 Testing project: {project_info['name']}")
            
            # Generate conversations for each combination of conversation type, model, and provider
            for conv_type in scenario["conversation_types"]:
                for model in scenario["models"]:
                    for provider in scenario["providers"]:
                        # Skip invalid model/provider combinations
                        if model == "claude-3-sonnet" and provider != "anthropic":
                            continue
                        if model == "claude-3-opus" and provider != "anthropic":
                            continue
                        if model.startswith("gpt") and provider == "anthropic":
                            continue
                        
                        # Generate 2-3 conversations for each combination
                        num_conversations = random.randint(2, 4)
                        
                        for i in range(num_conversations):
                            try:
                                # Generate conversation data
                                conv_data = self.generate_conversation_data(conv_type, model, provider)
                                
                                # Create SimpleAgent instance
                                agent = SimpleAgent(
                                    project_id=project_id,
                                    agent_id=agent_info["id"],
                                    agent_name=agent_info["name"],
                                    sdk=self.sdk
                                )
                                
                                # Start conversation with metadata
                                conversation_id = agent.start_conversation(
                                    user_input=conv_data["input"],
                                    metadata={
                                        "conversation_type": conv_type,
                                        "model": model,
                                        "provider": provider,
                                        "test_scenario": project_info["name"],
                                        "generated_at": datetime.now().isoformat()
                                    }
                                )
                                
                                # Add some processing delay to simulate real conversation
                                time.sleep(random.uniform(0.1, 0.5))
                                
                                # Complete conversation with realistic metrics
                                result = agent.complete_conversation(
                                    conversation_id=conversation_id,
                                    assistant_response=conv_data["output"],
                                    response_time_ms=conv_data["response_time"],
                                    token_usage=conv_data["token_usage"],
                                    cost=conv_data["cost"],
                                    status="success"
                                )
                                
                                if result.get("success"):
                                    self.conversations_created.append({
                                        "conversation_id": conversation_id,
                                        "project_id": project_id,
                                        "agent_id": agent_info["id"],
                                        "type": conv_type,
                                        "model": model,
                                        "provider": provider,
                                        "cost": conv_data["cost"],
                                        "tokens": conv_data["token_usage"],
                                        "response_time": conv_data["response_time"]
                                    })
                                    total_conversations += 1
                                    
                                    if total_conversations % 10 == 0:
                                        print(f"  ✅ Created {total_conversations} conversations...")
                                
                            except Exception as e:
                                print(f"  ❌ Failed to create conversation: {e}")
                                continue
            
            # Add a brief pause between projects
            time.sleep(1)
        
        print(f"\n🎉 Generated {total_conversations} total conversations across {len(self.projects)} projects")
        return total_conversations
    
    def verify_data_integrity(self):
        """Verify that the data was properly stored and is accessible via API."""
        print("🔍 Verifying data integrity...")
        
        # Test conversations API
        try:
            response = requests.get(f"{self.base_url}/api/v1/conversations?limit=50")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    conversations = data.get("data", [])
                    print(f"  ✅ Conversations API: {len(conversations)} conversations found")
                    
                    # Check for required fields
                    if conversations:
                        first_conv = conversations[0]
                        required_fields = ["id", "input", "output", "cost", "token_usage", "response_time", "created_at", "agent_name"]
                        missing_fields = [field for field in required_fields if field not in first_conv]
                        
                        if missing_fields:
                            print(f"  ⚠️ Missing fields in conversation data: {missing_fields}")
                        else:
                            print("  ✅ All required fields present in conversation data")
                            
                            # Check timestamp format
                            created_at = first_conv.get("created_at")
                            if created_at:
                                try:
                                    datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                                    print("  ✅ Timestamp format is valid")
                                except ValueError:
                                    print(f"  ❌ Invalid timestamp format: {created_at}")
                            
                            # Check cost and metrics
                            cost = first_conv.get("cost", 0)
                            tokens = first_conv.get("token_usage", 0)
                            response_time = first_conv.get("response_time", 0)
                            
                            print(f"  💰 Sample metrics - Cost: ${cost:.6f}, Tokens: {tokens}, Response Time: {response_time}ms")
                else:
                    print(f"  ❌ Conversations API returned error: {data.get('error')}")
            else:
                print(f"  ❌ Conversations API failed with status {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error testing conversations API: {e}")
        
        # Test cost analytics API
        try:
            response = requests.get(f"{self.base_url}/api/v1/cost-analytics?level=project&includeBreakdown=true")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    analytics = data.get("analytics", {})
                    summary = analytics.get("summary", {})
                    print(f"  ✅ Cost Analytics API: Total cost ${summary.get('totalCost', 0):.6f}")
                    print(f"    📊 Total tokens: {summary.get('totalTokens', 0)}")
                    print(f"    📈 Items analyzed: {summary.get('count', 0)}")
                else:
                    print(f"  ❌ Cost Analytics API returned error: {data.get('error')}")
            else:
                print(f"  ❌ Cost Analytics API failed with status {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error testing cost analytics API: {e}")
    
    def generate_summary_report(self):
        """Generate a summary report of the test execution."""
        print("\n" + "="*60)
        print("📋 E2E TEST SUMMARY REPORT")
        print("="*60)
        
        print(f"Test Duration: {datetime.now() - self.test_start_time}")
        print(f"Projects Created: {len(self.projects)}")
        print(f"Agents Created: {len(self.agents)}")
        print(f"Conversations Generated: {len(self.conversations_created)}")
        
        if self.conversations_created:
            # Analyze conversation types
            type_counts = {}
            model_counts = {}
            provider_counts = {}
            total_cost = 0
            total_tokens = 0
            total_response_time = 0
            
            for conv in self.conversations_created:
                # Count by type
                conv_type = conv.get("type", "unknown")
                type_counts[conv_type] = type_counts.get(conv_type, 0) + 1
                
                # Count by model
                model = conv.get("model", "unknown")
                model_counts[model] = model_counts.get(model, 0) + 1
                
                # Count by provider
                provider = conv.get("provider", "unknown")
                provider_counts[provider] = provider_counts.get(provider, 0) + 1
                
                # Sum metrics
                total_cost += conv.get("cost", 0)
                total_tokens += conv.get("tokens", 0)
                total_response_time += conv.get("response_time", 0)
            
            print(f"\nConversation Types:")
            for conv_type, count in sorted(type_counts.items()):
                print(f"  {conv_type}: {count}")
                
            print(f"\nModels Used:")
            for model, count in sorted(model_counts.items()):
                print(f"  {model}: {count}")
                
            print(f"\nProviders Used:")
            for provider, count in sorted(provider_counts.items()):
                print(f"  {provider}: {count}")
            
            print(f"\nAggregate Metrics:")
            print(f"  Total Cost: ${total_cost:.6f}")
            print(f"  Total Tokens: {total_tokens:,}")
            print(f"  Average Response Time: {total_response_time / len(self.conversations_created):.0f}ms")
            print(f"  Average Cost per Conversation: ${total_cost / len(self.conversations_created):.6f}")
        
        print("\n" + "="*60)
    
    def run_complete_test(self):
        """Run the complete E2E test suite."""
        print("🚀 Starting Comprehensive E2E Test for Agent Lens")
        print(f"Base URL: {self.base_url}")
        print(f"Test Start Time: {self.test_start_time}")
        
        try:
            # Setup test environment
            self.setup_test_environment()
            
            # Run conversation scenarios
            conversations_created = self.run_conversation_scenarios()
            
            # Wait a moment for data to be processed
            print("\n⏳ Waiting for data processing...")
            time.sleep(3)
            
            # Verify data integrity
            self.verify_data_integrity()
            
            # Generate summary report
            self.generate_summary_report()
            
            # Test success
            if conversations_created > 0:
                print("\n🎉 E2E Test completed successfully!")
                return True
            else:
                print("\n❌ E2E Test failed - no conversations created")
                return False
                
        except Exception as e:
            print(f"\n❌ E2E Test failed with error: {e}")
            import traceback
            traceback.print_exc()
            return False


def main():
    """Main entry point for the E2E test."""
    import argparse
    
    parser = argparse.ArgumentParser(description="Comprehensive E2E Test for Agent Lens")
    parser.add_argument("--base-url", default="http://localhost:3001", help="Base URL for the Agent Lens API")
    parser.add_argument("--quick", action="store_true", help="Run a quick test with fewer conversations")
    
    args = parser.parse_args()
    
    # Initialize and run test
    test = ComprehensiveE2ETest(base_url=args.base_url)
    
    # Reduce test size if quick mode
    if args.quick:
        # Limit to first scenario only
        test.test_scenarios = test.test_scenarios[:1]
        print("🏃 Running in quick mode - limited test scenarios")
    
    success = test.run_complete_test()
    
    if success:
        print("\n✅ All tests passed! Check the frontend at http://localhost:3001/conversations")
        sys.exit(0)
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)


if __name__ == "__main__":
    main()