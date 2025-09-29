#!/usr/bin/env python3
"""
Comprehensive System Test for Sprint Lens
Tests traces, spans, conversations, and metrics with validation
"""

import requests
import json
import time
from datetime import datetime, timezone

BASE_URL = "http://localhost:3000"
PROJECT_ID = "project-1758599350381"  # Valid existing project
AGENT_ID = "agent_simpleag_mfw0ut5k"   # Valid existing agent

def test_trace_creation_with_validation():
    """Test 1: Create traces with proper validation"""
    print("🧪 Test 1: Creating traces with validation...")
    
    # Test 1.1: Create a basic trace
    trace_data = {
        "id": f"trace_test_{int(time.time() * 1000)}",
        "project_id": PROJECT_ID,
        "agent_id": AGENT_ID,
        "name": "System Test Trace",
        "start_time": datetime.now(timezone.utc).isoformat(),
        "status": "completed",
        "metadata": {"test": "comprehensive_system_test"},
        "usage": {
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150
        },
        "model": "gpt-4",
        "provider": "openai"
    }
    
    response = requests.post(f"{BASE_URL}/v1/private/traces", json=trace_data)
    
    if response.status_code == 201:
        result = response.json()
        trace_id = result['data']['id']
        print(f"  ✅ Trace created successfully: {trace_id}")
        return trace_id
    else:
        print(f"  ❌ Trace creation failed: {response.status_code} - {response.text}")
        return None

def test_conversation_as_spans(trace_id):
    """Test 2: Create conversation data as specialized spans"""
    print("\n🧪 Test 2: Creating conversation-as-spans...")
    
    if not trace_id:
        print("  ❌ Skipping - no valid trace ID")
        return []
    
    session_id = f"conv_session_{int(time.time() * 1000)}"
    conversation_spans = []
    
    # Create a multi-turn conversation using the spans API
    conversation_turns = [
        {
            "turn": 1,
            "role": "user_input",
            "message": "Hello, I need help with my account settings.",
            "duration": 200
        },
        {
            "turn": 1, 
            "role": "agent_processing",
            "message": "Processing user request for account settings help...",
            "duration": 800,
            "tokens": {"prompt_tokens": 50, "completion_tokens": 20, "total_tokens": 70},
            "cost": 0.003,
            "model": "gpt-4",
            "provider": "openai"
        },
        {
            "turn": 1,
            "role": "assistant_response", 
            "message": "I'd be happy to help you with your account settings. What specific aspect would you like to modify?",
            "duration": 600
        },
        {
            "turn": 2,
            "role": "user_input",
            "message": "I want to change my password and update my email address.",
            "duration": 150
        },
        {
            "turn": 2,
            "role": "assistant_response",
            "message": "I can help you with both of those changes. Let me guide you through the process step by step.",
            "duration": 750,
            "tokens": {"prompt_tokens": 80, "completion_tokens": 30, "total_tokens": 110},
            "cost": 0.005,
            "model": "gpt-4", 
            "provider": "openai"
        }
    ]
    
    for turn_data in conversation_turns:
        span_data = {
            "trace_id": trace_id,
            "span_id": f"span_{turn_data['role']}_{turn_data['turn']}_{int(time.time() * 1000)}",
            "name": f"{turn_data['role'].replace('_', ' ').title()} - Turn {turn_data['turn']}",
            "type": "conversation",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": datetime.now(timezone.utc).isoformat(),
            "duration": turn_data["duration"],
            "status": "completed",
            "conversation_session_id": session_id,
            "conversation_turn": turn_data["turn"],
            "conversation_role": turn_data["role"],
            "conversation_context": json.dumps({
                "previous_turns": turn_data["turn"] - 1 if turn_data["role"] != "user_input" else 0,
                "topic": "account_settings",
                "customer_satisfaction": "high" if "assistant" in turn_data["role"] else None
            }),
            "input": {"message": turn_data["message"]} if "user" in turn_data["role"] else None,
            "output": {"message": turn_data["message"]} if "assistant" in turn_data["role"] else None,
            "metadata": {"test": "conversation_span", "channel": "chat"},
            "project_id": PROJECT_ID,
            "agent_id": AGENT_ID
        }
        
        # Add token usage if present
        if "tokens" in turn_data:
            span_data["token_usage"] = turn_data["tokens"]
            span_data["cost"] = turn_data.get("cost", 0)
            span_data["model"] = turn_data.get("model", "unknown")
            span_data["provider"] = turn_data.get("provider", "unknown")
        
        response = requests.post(f"{BASE_URL}/api/v1/spans", json=span_data)
        
        if response.status_code == 201:
            result = response.json()
            span_id = result['data']['id']
            conversation_spans.append(span_id)
            print(f"  ✅ Conversation span created: {turn_data['role']} (Turn {turn_data['turn']})")
        else:
            print(f"  ❌ Failed to create span for {turn_data['role']}: {response.status_code} - {response.text}")
    
    print(f"  📊 Created {len(conversation_spans)} conversation spans in session {session_id}")
    return conversation_spans

def test_additional_spans(trace_id):
    """Test 3: Create additional technical spans"""
    print("\n🧪 Test 3: Creating additional technical spans...")
    
    if not trace_id:
        print("  ❌ Skipping - no valid trace ID")
        return []
    
    technical_spans = [
        {
            "name": "Database Query",
            "type": "custom",
            "duration": 50,
            "metadata": {"query": "SELECT * FROM users WHERE id = ?", "table": "users"}
        },
        {
            "name": "API Call to External Service",
            "type": "tool", 
            "duration": 300,
            "metadata": {"endpoint": "https://api.example.com/verify", "method": "POST"}
        },
        {
            "name": "Data Processing",
            "type": "preprocessing",
            "duration": 120,
            "metadata": {"records_processed": 150, "processing_type": "validation"}
        }
    ]
    
    created_spans = []
    for span_config in technical_spans:
        span_data = {
            "trace_id": trace_id,
            "span_id": f"span_{span_config['type']}_{int(time.time() * 1000)}",
            "name": span_config["name"],
            "type": span_config["type"],
            "start_time": datetime.now(timezone.utc).isoformat(),
            "end_time": datetime.now(timezone.utc).isoformat(), 
            "duration": span_config["duration"],
            "status": "completed",
            "metadata": span_config["metadata"],
            "project_id": PROJECT_ID,
            "agent_id": AGENT_ID
        }
        
        response = requests.post(f"{BASE_URL}/api/v1/spans", json=span_data)
        
        if response.status_code == 201:
            result = response.json()
            created_spans.append(result['data']['id'])
            print(f"  ✅ Technical span created: {span_config['name']}")
        else:
            print(f"  ❌ Failed to create span {span_config['name']}: {response.status_code}")
    
    return created_spans

def test_data_retrieval():
    """Test 4: Retrieve and verify created data"""
    print("\n🧪 Test 4: Testing data retrieval...")
    
    # Test traces API
    print("  📥 Testing traces retrieval...")
    response = requests.get(f"{BASE_URL}/api/v1/traces?projectId={PROJECT_ID}&limit=5")
    if response.status_code == 200:
        traces = response.json()['data']
        print(f"    ✅ Retrieved {len(traces)} traces")
    else:
        print(f"    ❌ Failed to retrieve traces: {response.status_code}")
    
    # Test spans API  
    print("  📥 Testing spans retrieval...")
    response = requests.get(f"{BASE_URL}/api/v1/spans?limit=10")
    if response.status_code == 200:
        spans = response.json()['data'] 
        conversation_spans = [s for s in spans if s.get('conversation_session_id')]
        technical_spans = [s for s in spans if not s.get('conversation_session_id')]
        print(f"    ✅ Retrieved {len(spans)} spans ({len(conversation_spans)} conversation, {len(technical_spans)} technical)")
    else:
        print(f"    ❌ Failed to retrieve spans: {response.status_code}")
    
    # Test conversations API
    print("  📥 Testing conversations retrieval...")
    response = requests.get(f"{BASE_URL}/api/v1/conversations?projectId={PROJECT_ID}&limit=5")
    if response.status_code == 200:
        conversations = response.json()['data']
        print(f"    ✅ Retrieved {len(conversations)} conversations") 
    else:
        print(f"    ❌ Failed to retrieve conversations: {response.status_code}")

def test_cost_analytics():
    """Test 5: Test cost analytics and metrics"""
    print("\n🧪 Test 5: Testing cost analytics and metrics...")
    
    # Test trace-level cost analytics
    print("  💰 Testing trace-level cost analytics...")
    response = requests.get(f"{BASE_URL}/api/v1/cost-analytics?projectId={PROJECT_ID}&level=trace&includeBreakdown=true")
    if response.status_code == 200:
        analytics = response.json()
        print(f"    ✅ Retrieved cost analytics: ${analytics.get('data', {}).get('total_cost', 0):.4f} total cost")
    else:
        print(f"    ❌ Failed to retrieve cost analytics: {response.status_code}")
    
    # Test conversation-level cost analytics
    print("  💰 Testing conversation-level cost analytics...")
    response = requests.get(f"{BASE_URL}/api/v1/cost-analytics?projectId={PROJECT_ID}&level=conversation&includeBreakdown=true")
    if response.status_code == 200:
        analytics = response.json()
        print(f"    ✅ Retrieved conversation cost analytics")
    else:
        print(f"    ❌ Failed to retrieve conversation cost analytics: {response.status_code}")

def test_project_conversations_ui():
    """Test 6: Test the project conversations UI data"""
    print("\n🧪 Test 6: Testing project conversations UI integration...")
    
    # Simulate fetching data for project conversations UI
    response = requests.get(f"{BASE_URL}/api/v1/spans?limit=500")
    if response.status_code == 200:
        spans_data = response.json()
        all_spans = spans_data.get('data', [])
        
        # Filter conversation spans for our project
        conversation_spans = [
            span for span in all_spans 
            if span.get('project_id') == PROJECT_ID 
            and span.get('conversation_session_id') 
            and span.get('conversation_role')
        ]
        
        # Group by session
        sessions = {}
        for span in conversation_spans:
            session_id = span['conversation_session_id']
            if session_id not in sessions:
                sessions[session_id] = []
            sessions[session_id].append(span)
        
        print(f"    ✅ Found {len(conversation_spans)} conversation spans in {len(sessions)} sessions")
        
        for session_id, spans in sessions.items():
            turns = max(span.get('conversation_turn', 1) for span in spans)
            total_cost = sum(span.get('total_cost', 0) for span in spans)
            print(f"      📞 Session {session_id[:20]}...: {len(spans)} spans, {turns} turns, ${total_cost:.4f}")
        
    else:
        print(f"    ❌ Failed to retrieve spans for UI test: {response.status_code}")

def run_comprehensive_test():
    """Run all tests"""
    print("🚀 Starting Comprehensive System Test")
    print("=" * 60)
    
    # Test 1: Create trace with validation
    trace_id = test_trace_creation_with_validation()
    
    # Test 2: Create conversation spans
    conversation_spans = test_conversation_as_spans(trace_id)
    
    # Test 3: Create technical spans
    technical_spans = test_additional_spans(trace_id)
    
    # Test 4: Retrieve data
    test_data_retrieval()
    
    # Test 5: Cost analytics
    test_cost_analytics()
    
    # Test 6: UI integration
    test_project_conversations_ui()
    
    # Summary
    print(f"\n🎉 Comprehensive Test Summary:")
    print("=" * 60)
    if trace_id:
        print(f"✅ Trace created: {trace_id}")
    print(f"✅ Conversation spans created: {len(conversation_spans)}")
    print(f"✅ Technical spans created: {len(technical_spans)}")
    print(f"✅ All APIs tested for data retrieval")
    print(f"✅ Cost analytics tested")
    print(f"✅ UI integration tested")
    
    print(f"\n🌐 View your data at:")
    print(f"   📊 Project Dashboard: http://localhost:3000/projects/{PROJECT_ID}")
    print(f"   🔗 Traces: http://localhost:3000/traces?projectId={PROJECT_ID}")
    print(f"   💬 Conversations: http://localhost:3000/projects/{PROJECT_ID}/conversations")
    
    if trace_id:
        print(f"   🔍 Specific trace: http://localhost:3000/traces/{trace_id}")

if __name__ == "__main__":
    run_comprehensive_test()