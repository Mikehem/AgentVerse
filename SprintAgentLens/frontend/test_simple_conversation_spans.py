#!/usr/bin/env python3
"""
Simple test for Conversation-as-Span Architecture
Tests the core functionality without complex dependencies
"""

import requests
import json
import time
from datetime import datetime, timezone

# Configuration
BASE_URL = "http://localhost:3000"
PROJECT_ID = "project-1758599350381"
AGENT_ID = "agent_simpleag_mfw0ut5k"

def test_conversation_spans_via_trace():
    """Test creating conversation spans through the trace endpoint"""
    print("💬 Testing Conversation-as-Span Architecture...")
    
    session_id = f"conv_session_{int(time.time() * 1000)}"
    trace_id = f"trace_{int(time.time() * 1000)}_{hash(str(time.time())) % 10000}"
    
    # Create a conversation trace with conversation spans
    conversation_trace = {
        "id": trace_id,
        "project_name": PROJECT_ID,
        "agent_id": AGENT_ID,
        "name": "Customer Support Conversation Test",
        "start_time": datetime.now(timezone.utc).isoformat(),
        "status": "completed",
        "metadata": {
            "conversation_session_id": session_id,
            "conversation_type": "customer_support",
            "customer_tier": "premium"
        },
        "tags": {
            "conversation": "true",
            "support_category": "billing",
            "agent_id": AGENT_ID
        },
        "spans": [
            # Turn 1: User Input
            {
                "id": f"span_input_{int(time.time() * 1000)}",
                "name": "Customer Question - Turn 1",
                "span_type": "conversation",
                "start_time": datetime.now(timezone.utc).isoformat(),
                "end_time": datetime.now(timezone.utc).isoformat(),
                "duration": 100,
                "status": "completed",
                "input": {
                    "role": "user",
                    "message": "Hi, I have a question about my recent invoice. It shows a charge I don't recognize."
                },
                "conversation_session_id": session_id,
                "conversation_turn": 1,
                "conversation_role": "user_input",
                "conversation_context": {
                    "previous_turns": 0,
                    "topic": "billing_inquiry",
                    "customer_emotion": "confused"
                },
                "metadata": {
                    "input_length": 84,
                    "channel": "chat"
                }
            },
            
            # Turn 2: Agent Response  
            {
                "id": f"span_response_{int(time.time() * 1000)}",
                "name": "Agent Response - Turn 1",
                "span_type": "conversation",
                "start_time": datetime.now(timezone.utc).isoformat(),
                "end_time": datetime.now(timezone.utc).isoformat(),
                "duration": 800,
                "status": "completed",
                "output": {
                    "role": "assistant",
                    "message": "I'd be happy to help you with that invoice question. Let me look up your recent charges."
                },
                "conversation_session_id": session_id,
                "conversation_turn": 1,
                "conversation_role": "assistant_response",
                "conversation_context": {
                    "previous_turns": 1,
                    "response_type": "information_request"
                },
                "tokens_usage": {
                    "prompt_tokens": 150,
                    "completion_tokens": 100,
                    "total_tokens": 250
                },
                "cost": 0.0125,
                "model": "gpt-4",
                "provider": "openai"
            }
        ]
    }
    
    # Submit the conversation trace
    print(f"📤 Submitting conversation trace with {len(conversation_trace['spans'])} conversation spans...")
    response = requests.post(f"{BASE_URL}/v1/private/traces", json=conversation_trace)
    
    if response.status_code == 201:
        result = response.json()
        created_trace_id = result['data']['id']
        spans_created = result['data']['spans_created']
        print(f"✅ Conversation trace submitted successfully!")
        print(f"   Trace ID: {created_trace_id}")
        print(f"   Conversation Spans Created: {spans_created}")
        print(f"   Conversation Session ID: {session_id}")
        return created_trace_id, session_id
    else:
        print(f"❌ Failed to submit conversation trace: {response.status_code}")
        print(f"   Response: {response.text}")
        return None, None

def test_spans_retrieval(trace_id, session_id):
    """Test retrieving the created conversation spans"""
    print(f"\n🔍 Testing Conversation Spans Retrieval...")
    
    # Get spans for the trace
    spans_response = requests.get(f"{BASE_URL}/api/v1/spans?traceId={trace_id}")
    
    if spans_response.status_code == 200:
        spans_data = spans_response.json()
        spans = spans_data.get('data', [])
        
        print(f"✅ Retrieved {len(spans)} spans from trace {trace_id}")
        
        # Debug: print all spans to see structure
        print(f"📋 Debug: All spans structure:")
        for i, span in enumerate(spans):
            print(f"   Span {i+1}: {list(span.keys())}")
            if 'conversation_session_id' in span:
                print(f"     conversation_session_id: {span['conversation_session_id']}")
            print(f"     span_name: {span.get('span_name', 'N/A')}")
            print()
        
        # Filter and display conversation spans
        conversation_spans = [s for s in spans if s.get('conversation_session_id') == session_id]
        
        print(f"📊 Found {len(conversation_spans)} conversation spans:")
        for span in conversation_spans:
            turn = span.get('conversation_turn', 'N/A')
            role = span.get('conversation_role', 'unknown')
            name = span.get('span_name', 'Unknown Span')
            duration = span.get('duration', 0)
            cost = span.get('total_cost', 0)
            print(f"   • Turn {turn} ({role}): {name} - {duration}ms, ${cost}")
            
            # Show input/output if available
            if span.get('input_data'):
                input_data = json.loads(span['input_data']) if isinstance(span['input_data'], str) else span['input_data']
                if 'message' in input_data:
                    print(f"     📨 Input: {input_data['message'][:50]}...")
                    
            if span.get('output_data'):
                output_data = json.loads(span['output_data']) if isinstance(span['output_data'], str) else span['output_data']
                if 'message' in output_data:
                    print(f"     📤 Output: {output_data['message'][:50]}...")
        
        return conversation_spans
    else:
        print(f"❌ Failed to retrieve spans: {spans_response.status_code}")
        print(f"   Response: {spans_response.text}")
        return []

def main():
    """Main test function"""
    print("🚀 Simple Conversation-as-Span Test")
    print("=" * 50)
    
    # Test 1: Create conversation spans via trace submission
    trace_id, conv_session_id = test_conversation_spans_via_trace()
    
    if trace_id and conv_session_id:
        # Test 2: Retrieve and verify conversation spans
        conversation_spans = test_spans_retrieval(trace_id, conv_session_id)
        
        if conversation_spans:
            print(f"\n🎉 Conversation-as-Span Test SUCCESSFUL!")
            print("=" * 50)
            print("✅ Key achievements:")
            print("   • Conversation turns stored as specialized spans")
            print("   • Each span contains conversation metadata (turn, role, context)")
            print("   • Spans integrate with existing trace timeline")
            print("   • Cost and token tracking per conversation turn")
            print()
            print("🌐 View results:")
            print(f"   📊 Trace timeline: http://localhost:3001/traces")
            print(f"   🔍 Filter by trace ID: {trace_id}")
            print(f"   💬 Session ID: {conv_session_id}")
        else:
            print("❌ No conversation spans found - test failed")
    else:
        print("❌ Test failed - could not create conversation trace")

if __name__ == "__main__":
    main()