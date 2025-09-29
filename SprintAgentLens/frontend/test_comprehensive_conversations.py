#!/usr/bin/env python3
"""
Comprehensive Conversation-as-Span Testing
Tests multiple scenarios and API endpoints to demonstrate the architecture
"""

import requests
import json
import time
from datetime import datetime, timezone

# Configuration
BASE_URL = "http://localhost:3000"
PROJECT_ID = "SimpleAgent"  # Using the SimpleAgent project that has most data
AGENT_ID = "agent_simpleag_mfw0ut5k"

def create_conversation_test_data():
    """Create test conversation data in different projects"""
    print("🔧 Creating comprehensive conversation test data...")
    
    projects_to_test = [
        {"id": "project-1758599350381", "name": "Simple Agent Test"},
        {"id": "test", "name": "Test Project"},
        {"id": "conversation_demo", "name": "Conversation Demo"},
    ]
    
    results = []
    
    for project in projects_to_test:
        session_id = f"conv_session_{project['id']}_{int(time.time() * 1000)}"
        trace_id = f"trace_{project['id']}_{int(time.time() * 1000)}"
        
        # Create a multi-turn conversation trace
        conversation_trace = {
            "id": trace_id,
            "project_id": project["id"],  # Use project_id instead of project_name
            "project_name": project["id"], 
            "agent_id": AGENT_ID,
            "name": f"Multi-turn Conversation Test - {project['name']}",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "status": "completed",
            "metadata": {
                "conversation_session_id": session_id,
                "conversation_type": "customer_support",
                "customer_tier": "premium",
                "test_scenario": f"comprehensive_test_{project['id']}"
            },
            "tags": {
                "conversation": "true",
                "support_category": "technical",
                "agent_id": AGENT_ID,
                "test": "comprehensive"
            },
            "spans": [
                # Turn 1: User Question
                {
                    "id": f"span_user_1_{int(time.time() * 1000)}",
                    "name": "User Question - Turn 1",
                    "span_type": "conversation",
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "duration": 150,
                    "status": "completed",
                    "input": {
                        "role": "user",
                        "message": f"Hello, I'm having trouble with {project['name']}. The system seems slow today."
                    },
                    "conversation_session_id": session_id,
                    "conversation_turn": 1,
                    "conversation_role": "user_input",
                    "conversation_context": {
                        "previous_turns": 0,
                        "topic": "performance_issue",
                        "customer_emotion": "frustrated",
                        "project": project["name"]
                    },
                    "metadata": {
                        "input_length": 65,
                        "channel": "chat",
                        "test_data": True
                    }
                },
                
                # Turn 1: Agent Processing
                {
                    "id": f"span_agent_process_1_{int(time.time() * 1000)}",
                    "name": "Agent Processing - Turn 1", 
                    "span_type": "conversation",
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "duration": 1200,
                    "status": "completed",
                    "input": {
                        "customer_query": "Performance issue report",
                        "system_context": project["name"]
                    },
                    "output": {
                        "analysis": "System performance issue detected",
                        "priority": "medium",
                        "suggested_actions": ["check_server_load", "review_logs"]
                    },
                    "conversation_session_id": session_id,
                    "conversation_turn": 1,
                    "conversation_role": "agent_processing",
                    "conversation_context": {
                        "previous_turns": 1,
                        "classified_intent": "technical_support",
                        "confidence": 0.92
                    },
                    "tokens_usage": {
                        "prompt_tokens": 180,
                        "completion_tokens": 120,
                        "total_tokens": 300
                    },
                    "cost": 0.015,
                    "model": "gpt-4",
                    "provider": "openai"
                },
                
                # Turn 1: Agent Response
                {
                    "id": f"span_agent_response_1_{int(time.time() * 1000)}",
                    "name": "Agent Response - Turn 1",
                    "span_type": "conversation", 
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "duration": 800,
                    "status": "completed",
                    "output": {
                        "role": "assistant",
                        "message": f"I understand you're experiencing performance issues with {project['name']}. Let me check the system status and help resolve this for you."
                    },
                    "conversation_session_id": session_id,
                    "conversation_turn": 1,
                    "conversation_role": "assistant_response",
                    "conversation_context": {
                        "previous_turns": 1,
                        "response_type": "acknowledgment_and_action",
                        "escalation_needed": False
                    },
                    "metadata": {
                        "response_length": 127,
                        "response_time_ms": 800,
                        "satisfaction_predicted": 0.85
                    }
                },
                
                # Turn 2: User Follow-up
                {
                    "id": f"span_user_2_{int(time.time() * 1000)}",
                    "name": "User Follow-up - Turn 2",
                    "span_type": "conversation",
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "duration": 200,
                    "status": "completed",
                    "input": {
                        "role": "user",
                        "message": "Thank you! It started around 2 PM and affects mainly the dashboard loading times."
                    },
                    "conversation_session_id": session_id,
                    "conversation_turn": 2,
                    "conversation_role": "user_input",
                    "conversation_context": {
                        "previous_turns": 1,
                        "provided_details": ["time_onset", "affected_component"],
                        "customer_emotion": "cooperative"
                    },
                    "metadata": {
                        "input_length": 89,
                        "contains_time_reference": True,
                        "contains_component_reference": True
                    }
                },
                
                # Turn 2: Agent Final Response
                {
                    "id": f"span_agent_response_2_{int(time.time() * 1000)}",
                    "name": "Agent Response - Turn 2 (Resolution)",
                    "span_type": "conversation",
                    "start_time": datetime.now(timezone.utc).isoformat(),
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "duration": 1500,
                    "status": "completed",
                    "output": {
                        "role": "assistant", 
                        "message": "Perfect! I can see there was a temporary load spike around 2 PM affecting dashboard performance. I've optimized the server configuration and the issue should be resolved. Please try refreshing your dashboard now."
                    },
                    "conversation_session_id": session_id,
                    "conversation_turn": 2,
                    "conversation_role": "assistant_response",
                    "conversation_context": {
                        "previous_turns": 2,
                        "resolution_status": "resolved",
                        "customer_satisfaction_expected": "high",
                        "issue_resolved": True
                    },
                    "tokens_usage": {
                        "prompt_tokens": 350,
                        "completion_tokens": 200,
                        "total_tokens": 550
                    },
                    "cost": 0.0275,
                    "model": "gpt-4",
                    "provider": "openai",
                    "metadata": {
                        "response_length": 198,
                        "response_time_ms": 1500,
                        "resolution_provided": True,
                        "follow_up_needed": False
                    }
                }
            ]
        }
        
        # Submit the conversation trace
        print(f"📤 Submitting conversation for project '{project['id']}'...")
        response = requests.post(f"{BASE_URL}/v1/private/traces", json=conversation_trace)
        
        if response.status_code == 201:
            result_data = response.json()
            created_trace_id = result_data['data']['id']
            spans_created = result_data['data']['spans_created']
            
            results.append({
                "project_id": project["id"],
                "project_name": project["name"], 
                "trace_id": created_trace_id,
                "session_id": session_id,
                "spans_created": spans_created,
                "success": True
            })
            
            print(f"✅ Created conversation in project '{project['id']}':")
            print(f"   Trace ID: {created_trace_id}")
            print(f"   Session ID: {session_id}")
            print(f"   Spans Created: {spans_created}")
        else:
            print(f"❌ Failed to create conversation in project '{project['id']}': {response.status_code}")
            print(f"   Response: {response.text}")
            results.append({
                "project_id": project["id"],
                "success": False,
                "error": response.text
            })
    
    return results

def test_api_endpoints(results):
    """Test various API endpoints to retrieve conversation data"""
    print(f"\n🧪 Testing API Endpoints...")
    
    for result in results:
        if not result.get("success"):
            continue
            
        project_id = result["project_id"]
        trace_id = result["trace_id"]
        session_id = result["session_id"]
        
        print(f"\n📊 Testing APIs for project '{project_id}':")
        
        # Test 1: Spans API (should work)
        print("  🔍 Testing spans API...")
        spans_response = requests.get(f"{BASE_URL}/api/v1/spans?traceId={trace_id}")
        if spans_response.status_code == 200:
            spans_data = spans_response.json()
            spans = spans_data.get('data', [])
            conversation_spans = [s for s in spans if s.get('conversation_session_id') == session_id]
            print(f"     ✅ Retrieved {len(spans)} total spans, {len(conversation_spans)} conversation spans")
        else:
            print(f"     ❌ Spans API failed: {spans_response.status_code}")
        
        # Test 2: Conversations API (may be empty - uses old architecture)  
        print("  💬 Testing conversations API...")
        conv_response = requests.get(f"{BASE_URL}/api/v1/conversations?projectId={project_id}")
        if conv_response.status_code == 200:
            conv_data = conv_response.json()
            conversations = conv_data.get('data', [])
            print(f"     ⚠️  Old conversations API returned {len(conversations)} conversations")
        else:
            print(f"     ❌ Conversations API failed: {conv_response.status_code}")
            
        # Test 3: Traces API (should show conversation traces)
        print("  🔗 Testing traces API...")
        traces_response = requests.get(f"{BASE_URL}/api/v1/traces?projectId={project_id}&limit=5")
        if traces_response.status_code == 200:
            traces_data = traces_response.json()
            traces = traces_data.get('data', [])
            conv_traces = [t for t in traces if 'conversation' in str(t.get('tags', '')).lower()]
            print(f"     ✅ Retrieved {len(traces)} total traces, ~{len(conv_traces)} conversation-related traces")
        else:
            print(f"     ❌ Traces API failed: {traces_response.status_code}")

def main():
    """Main comprehensive test"""
    print("🚀 Comprehensive Conversation-as-Span Testing")
    print("=" * 60)
    
    # Create test data across multiple projects
    results = create_conversation_test_data()
    
    # Test API endpoints
    test_api_endpoints(results)
    
    # Summary
    print(f"\n🎉 Comprehensive Test Results:")
    print("=" * 60)
    
    successful_projects = [r for r in results if r.get("success")]
    failed_projects = [r for r in results if not r.get("success")]
    
    print(f"✅ Successfully created conversations in {len(successful_projects)} projects:")
    for result in successful_projects:
        print(f"   • {result['project_id']}: {result['spans_created']} spans, session {result['session_id']}")
    
    if failed_projects:
        print(f"❌ Failed to create conversations in {len(failed_projects)} projects:")
        for result in failed_projects:
            print(f"   • {result['project_id']}: {result.get('error', 'Unknown error')}")
    
    print(f"\n🌐 View conversation data:")
    for result in successful_projects:
        pid = result['project_id']
        tid = result['trace_id']
        print(f"   📊 Project {pid}: http://localhost:3000/traces?projectId={pid}")
        print(f"   🔍 Specific trace: http://localhost:3000/traces/{tid}")
    
    print(f"\n💡 Key Findings:")
    print("   • Conversation data is stored as specialized spans")
    print("   • Use spans API to retrieve conversation data")
    print("   • Old conversations API may be empty (different architecture)")
    print("   • Each conversation turn has rich metadata and context")

if __name__ == "__main__":
    main()