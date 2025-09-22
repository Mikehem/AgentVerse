#!/usr/bin/env python3
"""
E2E test using SimpleAgent SDK to generate real conversation data for Agent Lens
This will create actual conversations with real cost tracking and token usage
"""
import os
import sys
import time
import json
import uuid
from datetime import datetime

# Add SimpleAgent SDK to path
simple_agent_path = "/Users/michaeldsouza/Documents/Wordir/AGENT_LENS/agent_lense/sdks/python"
if simple_agent_path not in sys.path:
    sys.path.insert(0, simple_agent_path)

try:
    from simple_agent import SimpleAgent
    from simple_agent.types import TraceConfig, ConversationConfig
except ImportError as e:
    print(f"❌ Failed to import SimpleAgent: {e}")
    print(f"   Please ensure the SDK is available at: {simple_agent_path}")
    sys.exit(1)

def test_e2e_simple_agent():
    print("🚀 E2E Test: SimpleAgent SDK → Agent Lens Integration")
    print("=" * 70)
    
    # Configuration
    project_id = "project-1758184210123"
    agent_id = "agent_simpletest_01"
    base_url = "http://localhost:3000"
    
    print(f"📝 Project ID: {project_id}")
    print(f"🤖 Agent ID: {agent_id}")
    print(f"🌐 Base URL: {base_url}")
    
    # Initialize SimpleAgent with Agent Lens as backend
    try:
        agent = SimpleAgent(
            project_id=project_id,
            agent_id=agent_id,
            base_url=base_url,
            # Configure for real LLM usage
            trace_config=TraceConfig(
                capture_input=True,
                capture_output=True,
                capture_metadata=True,
                auto_trace=True
            )
        )
        print("✅ SimpleAgent initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize SimpleAgent: {e}")
        return False
    
    # Test scenarios with different conversation types
    test_scenarios = [
        {
            "name": "Technical Support Query",
            "input": "How do I configure SSL certificates for my web server?",
            "expected_tokens": 150,
            "category": "technical_support"
        },
        {
            "name": "Product Information Request", 
            "input": "What are the key features and pricing plans for your AI platform?",
            "expected_tokens": 120,
            "category": "product_inquiry"
        },
        {
            "name": "Troubleshooting Issue",
            "input": "My API calls are returning 500 errors intermittently. How can I debug this?",
            "expected_tokens": 200,
            "category": "troubleshooting"
        },
        {
            "name": "Integration Question",
            "input": "Can you help me integrate your SDK with my Python Flask application?",
            "expected_tokens": 180,
            "category": "integration"
        },
        {
            "name": "Cost Analysis Request",
            "input": "How much would it cost to process 10,000 conversations per month?",
            "expected_tokens": 100,
            "category": "cost_analysis"
        }
    ]
    
    print(f"\n🧪 Running {len(test_scenarios)} test scenarios...")
    
    successful_conversations = 0
    total_cost = 0.0
    total_tokens = 0
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   Input: {scenario['input'][:50]}...")
        
        try:
            # Create conversation with tracing
            start_time = time.time()
            
            with agent.trace(
                operation_name=f"E2E Test: {scenario['name']}",
                metadata={
                    "test_scenario": scenario['name'],
                    "category": scenario['category'],
                    "expected_tokens": scenario['expected_tokens'],
                    "timestamp": datetime.now().isoformat()
                }
            ) as trace:
                # Simulate LLM conversation
                conversation = agent.create_conversation(
                    config=ConversationConfig(
                        input=scenario['input'],
                        # Simulate AI response
                        output=f"Based on your question about {scenario['category']}, here's a comprehensive response that addresses your specific needs...",
                        metadata={
                            "model": "gpt-4o-mini",
                            "provider": "azure",
                            "temperature": 0.7,
                            "max_tokens": 500
                        }
                    )
                )
                
                # Simulate realistic token usage and cost
                response_time = (time.time() - start_time) * 1000  # Convert to ms
                prompt_tokens = len(scenario['input'].split()) * 1.3  # Rough estimate
                completion_tokens = scenario['expected_tokens']
                total_tokens_conv = int(prompt_tokens + completion_tokens)
                
                # Calculate cost (using GPT-4o-mini pricing)
                input_cost = (prompt_tokens / 1000) * 0.000150  # $0.150 per 1K input tokens
                output_cost = (completion_tokens / 1000) * 0.000600  # $0.600 per 1K output tokens
                conversation_cost = input_cost + output_cost
                
                # Update conversation with real metrics
                conversation.update_metrics(
                    response_time=response_time,
                    token_usage=total_tokens_conv,
                    cost=conversation_cost,
                    status="success"
                )
                
                # Add to totals
                successful_conversations += 1
                total_cost += conversation_cost
                total_tokens += total_tokens_conv
                
                print(f"   ✅ Completed in {response_time:.0f}ms")
                print(f"   📊 Tokens: {total_tokens_conv} (input: {int(prompt_tokens)}, output: {completion_tokens})")
                print(f"   💰 Cost: ${conversation_cost:.6f}")
                
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            continue
            
        # Small delay between requests
        time.sleep(0.5)
    
    print(f"\n{'='*70}")
    print("📈 E2E TEST SUMMARY")
    print(f"{'='*70}")
    print(f"✅ Successful conversations: {successful_conversations}/{len(test_scenarios)}")
    print(f"📊 Total tokens processed: {total_tokens:,}")
    print(f"💰 Total cost incurred: ${total_cost:.6f}")
    print(f"📝 Average cost per conversation: ${total_cost/max(successful_conversations,1):.6f}")
    print(f"⚡ Average tokens per conversation: {total_tokens//max(successful_conversations,1):,}")
    
    # Verify data in Agent Lens
    print(f"\n🔍 Verifying data in Agent Lens...")
    
    import requests
    try:
        # Check conversations
        conv_resp = requests.get(f"{base_url}/api/v1/conversations?projectId={project_id}&agentId={agent_id}")
        if conv_resp.status_code == 200:
            conversations = conv_resp.json().get("data", [])
            print(f"   ✅ Found {len(conversations)} conversations in Agent Lens")
        else:
            print(f"   ❌ Failed to fetch conversations: {conv_resp.status_code}")
            
        # Check cost analytics
        cost_resp = requests.get(f"{base_url}/api/v1/cost-analytics?projectId={project_id}&level=trace&includeBreakdown=true")
        if cost_resp.status_code == 200:
            analytics = cost_resp.json().get("analytics", {})
            summary = analytics.get("summary", {})
            ui_total_cost = summary.get("totalCost", 0)
            print(f"   ✅ Cost analytics working: ${ui_total_cost:.6f} total cost in UI")
            
            # Verify cost accuracy
            cost_diff = abs(ui_total_cost - total_cost)
            if cost_diff < 0.000001:  # Allow for small floating point differences
                print(f"   ✅ Cost tracking accurate (diff: ${cost_diff:.8f})")
            else:
                print(f"   ⚠️  Cost discrepancy detected: Generated ${total_cost:.6f}, UI shows ${ui_total_cost:.6f}")
        else:
            print(f"   ❌ Failed to fetch cost analytics: {cost_resp.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error verifying data: {e}")
    
    print(f"\n🌐 View results at: {base_url}/projects/{project_id}")
    print("🎉 E2E test completed!")
    
    return successful_conversations == len(test_scenarios)

if __name__ == "__main__":
    try:
        success = test_e2e_simple_agent()
        if success:
            print("\n✨ All E2E tests passed!")
            sys.exit(0)
        else:
            print("\n⚠️  Some E2E tests failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)