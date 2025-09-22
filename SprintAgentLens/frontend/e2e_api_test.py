#!/usr/bin/env python3
"""
E2E test using direct API calls to generate realistic conversation data with proper cost tracking
"""
import requests
import json
import time
import uuid
from datetime import datetime, timedelta

def test_e2e_api_conversations():
    print("🚀 E2E Test: Direct API → Agent Lens Integration")
    print("=" * 70)
    
    # Configuration
    project_id = "project-1758184210123"
    agent_id = "agent_e2e_api_01"
    base_url = "http://localhost:3000"
    
    print(f"📝 Project ID: {project_id}")
    print(f"🤖 Agent ID: {agent_id}")
    print(f"🌐 Base URL: {base_url}")
    
    # Test scenarios with realistic conversation patterns
    test_scenarios = [
        {
            "name": "Customer Support Chat",
            "input": "Hi, I'm having trouble connecting to your API. I keep getting timeout errors when trying to authenticate.",
            "output": "I understand you're experiencing timeout errors during authentication. Let me help you troubleshoot this issue. First, please check if you're using the correct endpoint URL: https://api.example.com/auth. Make sure your API key is properly formatted and hasn't expired. Also, verify that your network allows outbound HTTPS connections on port 443. If the issue persists, try increasing your connection timeout to 30 seconds.",
            "category": "technical_support",
            "expected_response_time": 2400,
            "model": "gpt-4o-mini",
            "provider": "azure"
        },
        {
            "name": "Product Information Inquiry",
            "input": "What are the different pricing tiers for your AI platform and what features are included in each?",
            "output": "Great question! We offer three main pricing tiers:\n\n1. **Starter Plan** ($29/month): Up to 10,000 API calls, basic analytics, email support\n2. **Professional Plan** ($99/month): Up to 100,000 API calls, advanced analytics, priority support, custom integrations\n3. **Enterprise Plan** (Custom pricing): Unlimited API calls, dedicated account manager, SLA guarantees, on-premise deployment options\n\nAll plans include our core AI features, real-time monitoring, and 99.9% uptime guarantee. Would you like me to schedule a demo for any specific tier?",
            "category": "sales_inquiry",
            "expected_response_time": 3200,
            "model": "gpt-4o-mini",
            "provider": "azure"
        },
        {
            "name": "Integration Guidance",
            "input": "I need help integrating your SDK with my Python Flask application. What's the best approach?",
            "output": "Excellent! Integrating our SDK with Flask is straightforward. Here's the recommended approach:\n\n1. **Install the SDK**: `pip install agent-lens-sdk`\n2. **Basic Setup**: Initialize the client in your Flask app factory\n3. **Configuration**: Set environment variables for API key and project ID\n4. **Middleware**: Add our Flask middleware for automatic request tracking\n5. **Error Handling**: Implement proper exception handling for API calls\n\nI can provide you with a complete code example and our Flask integration guide. Would you like me to send those resources to your email?",
            "category": "technical_integration",
            "expected_response_time": 2800,
            "model": "gpt-4o-mini", 
            "provider": "azure"
        },
        {
            "name": "Billing and Usage Query",
            "input": "Can you help me understand my current usage and how the billing calculations work?",
            "output": "Of course! Let me break down your usage and billing:\n\n**Current Month Usage:**\n- API Calls: 45,230 out of 100,000 (Professional Plan)\n- Token Usage: 2.3M tokens processed\n- Data Transfer: 1.2GB\n\n**Billing Details:**\n- Base subscription: $99/month\n- Overage charges: $0 (within limits)\n- Total this month: $99\n\n**How billing works:**\n- Fixed monthly fee for your tier\n- Overage charges apply if you exceed your plan limits\n- Tokens are counted for both input and output\n- Data transfer charges apply for large file uploads\n\nYou're currently at 45% of your monthly limit with 12 days remaining. You're well within your allowance!",
            "category": "billing_support",
            "expected_response_time": 1900,
            "model": "gpt-4o-mini",
            "provider": "azure"
        },
        {
            "name": "Feature Request Discussion",
            "input": "Do you have plans to add real-time streaming support for chat completions? This would be really useful for our customer service chatbot.",
            "output": "That's an excellent suggestion! Real-time streaming is indeed on our roadmap and is one of our most requested features. Here's what I can share:\n\n**Current Status:**\n- In active development for Q2 2024\n- Beta testing with select enterprise customers\n- Focus on low-latency streaming with WebSocket support\n\n**Planned Features:**\n- Server-sent events (SSE) support\n- WebSocket streaming API\n- Token-by-token response streaming\n- Connection multiplexing for multiple conversations\n\n**For your chatbot use case:**\n- Reduced perceived latency for users\n- Better user experience with progressive responses\n- Lower bandwidth usage with incremental updates\n\nWould you be interested in joining our beta program when it's available? I can add you to our early access list.",
            "category": "product_feedback",
            "expected_response_time": 3500,
            "model": "gpt-4o-mini",
            "provider": "azure"
        }
    ]
    
    print(f"\n🧪 Creating realistic conversations with cost tracking...")
    
    successful_conversations = 0
    total_cost = 0.0
    total_tokens = 0
    
    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\n{i}. {scenario['name']}")
        print(f"   Category: {scenario['category']}")
        
        try:
            # Calculate realistic token counts
            input_tokens = len(scenario['input'].split()) * 1.3  # Approximation
            output_tokens = len(scenario['output'].split()) * 1.3
            total_tokens_conv = int(input_tokens + output_tokens)
            
            # Calculate cost based on GPT-4o-mini pricing
            input_cost = (input_tokens / 1000) * 0.000150  # $0.150 per 1K input tokens
            output_cost = (output_tokens / 1000) * 0.000600  # $0.600 per 1K output tokens
            conversation_cost = input_cost + output_cost
            
            # Create trace first
            trace_data = {
                "projectId": project_id,
                "agentId": agent_id,
                "operationName": f"E2E Test: {scenario['name']}",
                "traceType": "conversation",
                "status": "success",
                "startTime": (datetime.now() - timedelta(milliseconds=scenario['expected_response_time'])).isoformat(),
                "endTime": datetime.now().isoformat(),
                "usage": {
                    "promptTokens": int(input_tokens),
                    "completionTokens": int(output_tokens),
                    "totalTokens": total_tokens_conv
                },
                "model": scenario['model'],
                "provider": scenario['provider'],
                "metadata": {
                    "category": scenario['category'],
                    "test_type": "e2e_api",
                    "response_time_ms": scenario['expected_response_time']
                }
            }
            
            trace_resp = requests.post(f"{base_url}/api/v1/traces", json=trace_data)
            if trace_resp.status_code == 201:
                trace = trace_resp.json()["data"]
                print(f"   ✅ Trace created: {trace['id']}")
                
                # Create conversation
                conversation_data = {
                    "projectId": project_id,
                    "agentId": agent_id,
                    "runId": trace['id'],  # Link to trace
                    "input": scenario['input'],
                    "output": scenario['output'],
                    "status": "success",
                    "responseTime": scenario['expected_response_time'],
                    "tokenUsage": total_tokens_conv,
                    "cost": conversation_cost,
                    "metadata": {
                        "model": scenario['model'],
                        "provider": scenario['provider'],
                        "category": scenario['category'],
                        "input_tokens": int(input_tokens),
                        "output_tokens": int(output_tokens),
                        "input_cost": input_cost,
                        "output_cost": output_cost,
                        "test_type": "e2e_api"
                    }
                }
                
                conv_resp = requests.post(f"{base_url}/api/v1/conversations", json=conversation_data)
                if conv_resp.status_code == 201:
                    conversation = conv_resp.json()["data"]
                    print(f"   ✅ Conversation created: {conversation['id']}")
                    print(f"   📊 Tokens: {total_tokens_conv} (input: {int(input_tokens)}, output: {int(output_tokens)})")
                    print(f"   💰 Cost: ${conversation_cost:.6f}")
                    print(f"   ⏱️  Response time: {scenario['expected_response_time']}ms")
                    
                    successful_conversations += 1
                    total_cost += conversation_cost
                    total_tokens += total_tokens_conv
                else:
                    print(f"   ❌ Conversation failed: {conv_resp.status_code} - {conv_resp.text}")
            else:
                print(f"   ❌ Trace failed: {trace_resp.status_code} - {trace_resp.text}")
                
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            continue
            
        # Small delay between requests
        time.sleep(0.3)
    
    print(f"\n{'='*70}")
    print("📈 E2E API TEST SUMMARY")
    print(f"{'='*70}")
    print(f"✅ Successful conversations: {successful_conversations}/{len(test_scenarios)}")
    print(f"📊 Total tokens processed: {total_tokens:,}")
    print(f"💰 Total cost incurred: ${total_cost:.6f}")
    print(f"📝 Average cost per conversation: ${total_cost/max(successful_conversations,1):.6f}")
    print(f"⚡ Average tokens per conversation: {total_tokens//max(successful_conversations,1):,}")
    
    # Verify data in Agent Lens UI
    print(f"\n🔍 Verifying data appears correctly in Agent Lens...")
    
    try:
        # Check conversations endpoint
        conv_resp = requests.get(f"{base_url}/api/v1/conversations?projectId={project_id}")
        if conv_resp.status_code == 200:
            conversations = conv_resp.json().get("data", [])
            e2e_conversations = [c for c in conversations if c.get('metadata') and 'test_type' in json.loads(c.get('metadata', '{}'))]
            print(f"   ✅ Found {len(conversations)} total conversations ({len(e2e_conversations)} from E2E test)")
        else:
            print(f"   ❌ Failed to fetch conversations: {conv_resp.status_code}")
            
        # Check cost analytics
        cost_resp = requests.get(f"{base_url}/api/v1/cost-analytics?projectId={project_id}&level=trace&includeBreakdown=true")
        if cost_resp.status_code == 200:
            analytics = cost_resp.json().get("analytics", {})
            summary = analytics.get("summary", {})
            ui_total_cost = summary.get("totalCost", 0)
            print(f"   ✅ Cost analytics working: ${ui_total_cost:.6f} total cost shown in UI")
            
            # Check if our test data contributes to the total
            if ui_total_cost >= total_cost:
                print(f"   ✅ Cost tracking includes our test data (expected: ${total_cost:.6f})")
            else:
                print(f"   ⚠️  UI cost lower than expected (UI: ${ui_total_cost:.6f}, Expected: ${total_cost:.6f})")
        else:
            print(f"   ❌ Failed to fetch cost analytics: {cost_resp.status_code}")
            
        # Check traces endpoint  
        traces_resp = requests.get(f"{base_url}/api/v1/traces?projectId={project_id}&includeAnalytics=true")
        if traces_resp.status_code == 200:
            data = traces_resp.json()
            traces = data.get("data", [])
            analytics = data.get("analytics", {})
            print(f"   ✅ Found {len(traces)} traces with analytics enabled")
        else:
            print(f"   ❌ Failed to fetch traces: {traces_resp.status_code}")
            
    except Exception as e:
        print(f"   ❌ Error verifying data: {e}")
    
    print(f"\n🌐 View results at: {base_url}/projects/{project_id}")
    print("   - Check conversations tab for new entries")
    print("   - Verify cost metrics in analytics")
    print("   - Confirm timestamps display correctly (no 'Invalid Date')")
    print("\n🎉 E2E API test completed!")
    
    return successful_conversations == len(test_scenarios)

if __name__ == "__main__":
    try:
        success = test_e2e_api_conversations()
        if success:
            print("\n✨ All E2E API tests passed!")
        else:
            print("\n⚠️  Some E2E API tests failed!")
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Test failed with error: {e}")
        import traceback
        traceback.print_exc()