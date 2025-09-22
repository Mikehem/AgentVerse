#!/usr/bin/env python3
"""
Simple End-to-End Test for Agent Lens using AgentLensClient
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
    from agent_lens_sdk import AgentLensClient
    print("✅ Agent Lens SDK imported successfully")
except ImportError as e:
    print(f"❌ Failed to import Agent Lens SDK: {e}")
    sys.exit(1)


class SimpleE2ETest:
    """Simple E2E testing for Agent Lens with real conversation data."""
    
    def __init__(self, base_url: str = "http://localhost:3001"):
        self.base_url = base_url
        self.client = AgentLensClient(base_url=base_url)
        self.conversations_created = []
        self.test_start_time = datetime.now()
        
        # Simple test data
        self.test_conversations = [
            {
                "input": "What are your business hours?",
                "output": "Our business hours are Monday-Friday 9 AM to 6 PM EST. We also offer 24/7 chat support for urgent matters.",
                "model": "gpt-4o-mini",
                "provider": "azure",
                "response_time": 850,
                "prompt_tokens": 25,
                "completion_tokens": 45
            },
            {
                "input": "How can I integrate the API with my application?",
                "output": "You can integrate our API by following these steps: 1) Get your API key from the dashboard, 2) Install our SDK or use direct HTTP requests, 3) Authenticate using the API key in headers, 4) Make your first test call to verify the connection.",
                "model": "gpt-4",
                "provider": "openai", 
                "response_time": 1200,
                "prompt_tokens": 35,
                "completion_tokens": 85
            },
            {
                "input": "I'm getting timeout errors when processing large datasets",
                "output": "Timeout errors on large datasets typically indicate either network latency or server-side processing limits. I recommend implementing pagination for datasets over 10MB and using asynchronous processing for better reliability.",
                "model": "claude-3-sonnet",
                "provider": "anthropic",
                "response_time": 1800,
                "prompt_tokens": 40,
                "completion_tokens": 95
            },
            {
                "input": "Can you help me understand the pricing model?",
                "output": "Our pricing is based on usage with three tiers: Starter ($29/month for up to 10K requests), Professional ($99/month for up to 100K requests), and Enterprise (custom pricing for higher volumes). All plans include 24/7 support and a 14-day free trial.",
                "model": "gpt-4o-mini",
                "provider": "azure",
                "response_time": 950,
                "prompt_tokens": 30,
                "completion_tokens": 75
            },
            {
                "input": "How do I set up webhook notifications for my application?",
                "output": "To set up webhooks: 1) Go to your dashboard settings, 2) Add a webhook endpoint URL, 3) Select which events to subscribe to, 4) Configure authentication if needed, 5) Test the webhook with a sample payload. Webhooks are sent as POST requests with JSON payloads.",
                "model": "gpt-4",
                "provider": "openai",
                "response_time": 1400,
                "prompt_tokens": 45,
                "completion_tokens": 110
            }
        ]
    
    def calculate_cost(self, prompt_tokens: int, completion_tokens: int, model: str, provider: str) -> float:
        """Calculate realistic costs based on token usage."""
        
        # Approximate pricing per 1000 tokens
        pricing = {
            "gpt-4o-mini": {"input": 0.00015, "output": 0.0006},
            "gpt-4": {"input": 0.03, "output": 0.06},
            "claude-3-sonnet": {"input": 0.003, "output": 0.015}
        }
        
        model_pricing = pricing.get(model, {"input": 0.001, "output": 0.002})
        
        input_cost = (prompt_tokens / 1000.0) * model_pricing["input"]
        output_cost = (completion_tokens / 1000.0) * model_pricing["output"]
        
        return round(input_cost + output_cost, 6)
    
    def create_conversation_direct_api(self, conv_data: Dict[str, Any], project_id: str, agent_id: str) -> str:
        """Create conversation using direct API calls."""
        
        # Calculate cost
        cost = self.calculate_cost(
            conv_data["prompt_tokens"], 
            conv_data["completion_tokens"],
            conv_data["model"],
            conv_data["provider"]
        )
        
        total_tokens = conv_data["prompt_tokens"] + conv_data["completion_tokens"]
        
        # Prepare conversation data
        conversation_payload = {
            "projectId": project_id,
            "agentId": agent_id, 
            "input": conv_data["input"],
            "output": conv_data["output"],
            "status": "success",
            "responseTime": conv_data["response_time"],
            "tokenUsage": total_tokens,
            "cost": cost,
            "metadata": {
                "model": conv_data["model"],
                "provider": conv_data["provider"],
                "prompt_tokens": conv_data["prompt_tokens"],
                "completion_tokens": conv_data["completion_tokens"],
                "test_generated": True,
                "generated_at": datetime.now().isoformat()
            }
        }
        
        try:
            # Create conversation via API
            response = requests.post(
                f"{self.base_url}/api/v1/conversations",
                json=conversation_payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                if result.get("success"):
                    conv_id = result["data"]["id"]
                    print(f"  ✅ Created conversation: {conv_id}")
                    return conv_id
                else:
                    print(f"  ❌ API returned error: {result.get('error')}")
                    return None
            else:
                print(f"  ❌ HTTP error {response.status_code}: {response.text}")
                return None
                
        except Exception as e:
            print(f"  ❌ Exception creating conversation: {e}")
            return None
    
    def create_trace_for_conversation(self, conversation_id: str, conv_data: Dict[str, Any], project_id: str, agent_id: str):
        """Create a corresponding trace for the conversation."""
        
        cost = self.calculate_cost(
            conv_data["prompt_tokens"], 
            conv_data["completion_tokens"],
            conv_data["model"],
            conv_data["provider"]
        )
        
        total_tokens = conv_data["prompt_tokens"] + conv_data["completion_tokens"]
        
        trace_payload = {
            "projectId": project_id,
            "agentId": agent_id,
            "conversationId": conversation_id,
            "traceType": "conversation",
            "operationName": "chat_completion",
            "startTime": (datetime.now() - timedelta(milliseconds=conv_data["response_time"])).isoformat() + "Z",
            "endTime": datetime.now().isoformat() + "Z",
            "duration": conv_data["response_time"],
            "status": "success",
            "inputData": {"user_message": conv_data["input"]},
            "outputData": {"assistant_message": conv_data["output"]},
            "metadata": {
                "model": conv_data["model"],
                "provider": conv_data["provider"],
                "conversation_type": "single_turn"
            },
            "provider": conv_data["provider"],
            "model": conv_data["model"],
            "usage": {
                "promptTokens": conv_data["prompt_tokens"],
                "completionTokens": conv_data["completion_tokens"],
                "totalTokens": total_tokens
            }
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/api/v1/traces",
                json=trace_payload,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            
            if response.status_code == 201:
                result = response.json()
                if result.get("success"):
                    trace_id = result["data"]["id"]
                    print(f"    📊 Created trace: {trace_id}")
                    return trace_id
                else:
                    print(f"    ❌ Trace API error: {result.get('error')}")
            else:
                print(f"    ❌ Trace HTTP error {response.status_code}")
                
        except Exception as e:
            print(f"    ❌ Exception creating trace: {e}")
        
        return None
    
    def run_test_scenarios(self):
        """Run test scenarios to generate realistic data."""
        print("💬 Running test scenarios...")
        
        # Use default project and agent IDs for simplicity
        project_id = "project-1758184210123"  # From existing data
        agent_id = "agent_primarya_mfp5hex7"   # From existing data
        
        total_conversations = 0
        
        for i, conv_data in enumerate(self.test_conversations):
            print(f"\n📝 Creating conversation {i+1}/{len(self.test_conversations)}")
            print(f"  Model: {conv_data['model']} ({conv_data['provider']})")
            
            # Create conversation
            conversation_id = self.create_conversation_direct_api(conv_data, project_id, agent_id)
            
            if conversation_id:
                # Create corresponding trace
                trace_id = self.create_trace_for_conversation(conversation_id, conv_data, project_id, agent_id)
                
                self.conversations_created.append({
                    "conversation_id": conversation_id,
                    "trace_id": trace_id,
                    "project_id": project_id,
                    "agent_id": agent_id,
                    "model": conv_data["model"],
                    "provider": conv_data["provider"],
                    "cost": self.calculate_cost(
                        conv_data["prompt_tokens"], 
                        conv_data["completion_tokens"],
                        conv_data["model"],
                        conv_data["provider"]
                    ),
                    "tokens": conv_data["prompt_tokens"] + conv_data["completion_tokens"],
                    "response_time": conv_data["response_time"]
                })
                total_conversations += 1
            
            # Brief pause between requests
            time.sleep(0.5)
        
        print(f"\n🎉 Generated {total_conversations} conversations successfully")
        return total_conversations
    
    def verify_data_integrity(self):
        """Verify that the data was properly stored and is accessible via API."""
        print("\n🔍 Verifying data integrity...")
        
        # Test conversations API
        try:
            response = requests.get(f"{self.base_url}/api/v1/conversations?limit=10")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    conversations = data.get("data", [])
                    print(f"  ✅ Conversations API: {len(conversations)} conversations found")
                    
                    # Check for required fields and valid data
                    if conversations:
                        first_conv = conversations[0]
                        cost = first_conv.get("cost", 0)
                        tokens = first_conv.get("token_usage", 0)
                        response_time = first_conv.get("response_time", 0)
                        agent_name = first_conv.get("agent_name", "Unknown")
                        created_at = first_conv.get("created_at", "")
                        
                        print(f"  💰 Sample data - Cost: ${cost:.6f}, Tokens: {tokens}, Response Time: {response_time}ms")
                        print(f"  👤 Agent: {agent_name}")
                        print(f"  📅 Created: {created_at}")
                        
                        # Verify timestamp is valid
                        if created_at and created_at != "Invalid Date":
                            print("  ✅ Timestamp format appears valid")
                        else:
                            print("  ❌ Timestamp issue detected")
                else:
                    print(f"  ❌ Conversations API error: {data.get('error')}")
            else:
                print(f"  ❌ Conversations API failed: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error testing conversations API: {e}")
        
        # Test cost analytics API
        try:
            response = requests.get(f"{self.base_url}/api/v1/cost-analytics?level=project")
            if response.status_code == 200:
                data = response.json()
                if data.get("success"):
                    analytics = data.get("analytics", {})
                    summary = analytics.get("summary", {})
                    total_cost = summary.get("totalCost", 0)
                    total_tokens = summary.get("totalTokens", 0)
                    count = summary.get("count", 0)
                    
                    print(f"  ✅ Cost Analytics: ${total_cost:.6f} total cost")
                    print(f"  📊 Analytics: {total_tokens} tokens, {count} items")
                    
                    if total_cost > 0 and total_tokens > 0:
                        print("  ✅ Cost metrics are populated correctly")
                    else:
                        print("  ⚠️ Cost metrics appear to be zero or missing")
                else:
                    print(f"  ❌ Cost Analytics API error: {data.get('error')}")
            else:
                print(f"  ❌ Cost Analytics API failed: {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ Error testing cost analytics API: {e}")
    
    def generate_summary_report(self):
        """Generate a summary report of the test execution."""
        print("\n" + "="*60)
        print("📋 SIMPLE E2E TEST SUMMARY")
        print("="*60)
        
        print(f"Test Duration: {datetime.now() - self.test_start_time}")
        print(f"Conversations Generated: {len(self.conversations_created)}")
        
        if self.conversations_created:
            # Calculate totals
            total_cost = sum(conv.get("cost", 0) for conv in self.conversations_created)
            total_tokens = sum(conv.get("tokens", 0) for conv in self.conversations_created)
            total_response_time = sum(conv.get("response_time", 0) for conv in self.conversations_created)
            
            # Count models and providers
            models = {}
            providers = {}
            
            for conv in self.conversations_created:
                model = conv.get("model", "unknown")
                provider = conv.get("provider", "unknown")
                models[model] = models.get(model, 0) + 1
                providers[provider] = providers.get(provider, 0) + 1
            
            print(f"\nModels Used:")
            for model, count in models.items():
                print(f"  {model}: {count}")
                
            print(f"\nProviders Used:")
            for provider, count in providers.items():
                print(f"  {provider}: {count}")
            
            print(f"\nAggregate Metrics:")
            print(f"  Total Cost: ${total_cost:.6f}")
            print(f"  Total Tokens: {total_tokens:,}")
            print(f"  Average Response Time: {total_response_time / len(self.conversations_created):.0f}ms")
            print(f"  Average Cost per Conversation: ${total_cost / len(self.conversations_created):.6f}")
        
        print("\n" + "="*60)
    
    def run_complete_test(self):
        """Run the complete E2E test suite."""
        print("🚀 Starting Simple E2E Test for Agent Lens")
        print(f"Base URL: {self.base_url}")
        print(f"Test Start Time: {self.test_start_time}")
        
        try:
            # Run test scenarios
            conversations_created = self.run_test_scenarios()
            
            # Wait a moment for data to be processed
            print("\n⏳ Waiting for data processing...")
            time.sleep(2)
            
            # Verify data integrity
            self.verify_data_integrity()
            
            # Generate summary report
            self.generate_summary_report()
            
            # Test success
            if conversations_created > 0:
                print("\n🎉 E2E Test completed successfully!")
                print("✅ Check the frontend at http://localhost:3001/conversations")
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
    
    parser = argparse.ArgumentParser(description="Simple E2E Test for Agent Lens")
    parser.add_argument("--base-url", default="http://localhost:3001", help="Base URL for the Agent Lens API")
    
    args = parser.parse_args()
    
    # Initialize and run test
    test = SimpleE2ETest(base_url=args.base_url)
    success = test.run_complete_test()
    
    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()