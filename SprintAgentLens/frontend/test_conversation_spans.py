#!/usr/bin/env python3
"""
Test script for Conversation-as-Span Architecture

This script demonstrates how conversations are now stored as specialized spans
within the trace/span hierarchy, providing better observability and analytics.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:3000"
PROJECT_ID = "project-1758599350381"
AGENT_ID = "agent_simpleag_mfw0ut5k"

def generate_conversation_session_id():
    """Generate a unique conversation session ID"""
    return f"conv_session_{int(time.time() * 1000)}"

def generate_trace_id():
    """Generate a unique trace ID"""
    return f"trace_{int(time.time() * 1000)}_{hash(str(time.time())) % 10000}"

def generate_span_id():
    """Generate a unique span ID"""
    return f"span_{int(time.time() * 1000)}_{hash(str(time.time())) % 10000}"

def test_conversation_session_creation():
    """Test creating a conversation session"""
    print("🔧 Testing Conversation Session Creation...")
    
    session_id = generate_conversation_session_id()
    session_data = {
        "project_id": PROJECT_ID,
        "agent_id": AGENT_ID,
        "session_id": session_id,
        "thread_id": f"thread_{int(time.time())}",
        "user_id": "user_12345",
        "session_name": "Customer Support Conversation Test",
        "status": "active",
        "metadata": {
            "customer_tier": "premium",
            "support_category": "billing",
            "initial_query": "I have a question about my invoice"
        },
        "tags": ["billing", "premium-customer", "conversation-test"]
    }
    
    response = requests.post(f"{BASE_URL}/api/v1/conversation-sessions", json=session_data)
    
    if response.status_code == 201:
        session = response.json()['data']
        print(f"✅ Conversation session created: {session['id']}")
        print(f"   Session ID: {session['session_id']}")
        print(f"   Thread ID: {session['thread_id']}")
        return session
    else:
        print(f"❌ Failed to create conversation session: {response.status_code}")
        print(f"   Response: {response.text}")
        return None

def test_conversation_spans_via_trace():
    """Test creating conversation spans through the trace endpoint (SDK simulation)"""
    print("\n💬 Testing Conversation-as-Span via Trace Submission...")
    
    session_id = generate_conversation_session_id()
    trace_id = generate_trace_id()
    
    # Simulate a multi-turn conversation as spans within a trace
    conversation_trace = {
        "id": trace_id,
        "project_name": "project-1758599350381",
        "agent_id": AGENT_ID,
        "name": "Customer Support Conversation",
        "start_time": datetime.utcnow().isoformat() + "Z",
        "end_time": None,
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
                "id": generate_span_id(),
                "name": "Customer Input - Turn 1",
                "span_type": "conversation",
                "start_time": datetime.utcnow().isoformat() + "Z",
                "end_time": datetime.utcnow().isoformat() + "Z",
                "duration": 100,
                "status": "completed",
                "input": {
                    "role": "user",
                    "message": "Hi, I have a question about my recent invoice. It shows a charge I don't recognize."
                },
                "output": {},
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
                    "channel": "chat",
                    "timestamp": datetime.utcnow().isoformat()
                }
            },
            
            # Turn 2: Agent Processing
            {
                "id": generate_span_id(),
                "name": "Agent Processing - Turn 1",
                "span_type": "conversation",
                "start_time": datetime.utcnow().isoformat() + "Z",
                "end_time": datetime.utcnow().isoformat() + "Z",
                "duration": 2500,
                "status": "completed",
                "input": {
                    "customer_query": "Invoice question about unrecognized charge",
                    "customer_data": {
                        "tier": "premium",
                        "account_id": "ACC_12345"
                    }
                },
                "output": {
                    "classification": "billing_inquiry",
                    "priority": "high",
                    "suggested_actions": ["check_recent_charges", "review_account_activity"]
                },
                "conversation_session_id": session_id,
                "conversation_turn": 1,
                "conversation_role": "agent_processing",
                "conversation_context": {
                    "previous_turns": 1,
                    "classified_intent": "billing_inquiry",
                    "confidence": 0.95
                },
                "tokens_usage": {
                    "prompt_tokens": 150,
                    "completion_tokens": 200,
                    "total_tokens": 350
                },
                "cost": 0.0175,
                "model": "gpt-4",
                "provider": "openai"
            },
            
            # Turn 3: Agent Response
            {
                "id": generate_span_id(),
                "name": "Agent Response - Turn 1",
                "span_type": "conversation",
                "start_time": datetime.utcnow().isoformat() + "Z",
                "end_time": datetime.utcnow().isoformat() + "Z",
                "duration": 800,
                "status": "completed",
                "input": {},
                "output": {
                    "role": "assistant",
                    "message": "I'd be happy to help you with that invoice question. Let me look up your recent charges. Can you please provide me with the invoice number or the approximate date of the charge you're asking about?"
                },
                "conversation_session_id": session_id,
                "conversation_turn": 1,
                "conversation_role": "assistant_response",
                "conversation_context": {
                    "previous_turns": 1,
                    "response_type": "information_request",
                    "next_expected": "user_details"
                },
                "metadata": {
                    "response_length": 168,
                    "response_time_ms": 800,
                    "satisfaction_score": None
                }
            },
            
            # Turn 4: User Follow-up Input
            {
                "id": generate_span_id(),
                "name": "Customer Input - Turn 2",
                "span_type": "conversation",
                "start_time": datetime.utcnow().isoformat() + "Z",
                "end_time": datetime.utcnow().isoformat() + "Z",
                "duration": 150,
                "status": "completed",
                "input": {
                    "role": "user",
                    "message": "The invoice number is INV-2024-001234, dated January 15th. The charge is for $49.99 labeled as 'Premium Service Upgrade'."
                },
                "output": {},
                "conversation_session_id": session_id,
                "conversation_turn": 2,
                "conversation_role": "user_input",
                "conversation_context": {
                    "previous_turns": 1,
                    "provided_details": ["invoice_number", "date", "amount", "description"],
                    "customer_emotion": "neutral"
                },
                "metadata": {
                    "input_length": 118,
                    "contains_structured_data": True,
                    "extracted_entities": {
                        "invoice_number": "INV-2024-001234",
                        "date": "January 15th",
                        "amount": "$49.99",
                        "service": "Premium Service Upgrade"
                    }
                }
            },
            
            # Turn 5: Final Agent Response
            {
                "id": generate_span_id(),
                "name": "Agent Response - Turn 2 (Resolution)",
                "span_type": "conversation",
                "start_time": datetime.utcnow().isoformat() + "Z",
                "end_time": datetime.utcnow().isoformat() + "Z",
                "duration": 1200,
                "status": "completed",
                "input": {
                    "invoice_lookup": "INV-2024-001234",
                    "customer_tier": "premium"
                },
                "output": {
                    "role": "assistant",
                    "message": "I found that charge! The $49.99 'Premium Service Upgrade' was applied on January 15th when you upgraded to our Premium Support plan, which includes 24/7 priority support and extended warranty coverage. This upgrade was activated through your account portal. Would you like me to send you the details of what's included in this upgrade?"
                },
                "conversation_session_id": session_id,
                "conversation_turn": 2,
                "conversation_role": "assistant_response",
                "conversation_context": {
                    "previous_turns": 2,
                    "resolution_status": "resolved",
                    "customer_satisfaction_expected": "high"
                },
                "tokens_usage": {
                    "prompt_tokens": 300,
                    "completion_tokens": 180,
                    "total_tokens": 480
                },
                "cost": 0.024,
                "model": "gpt-4",
                "provider": "openai",
                "metadata": {
                    "response_length": 228,
                    "response_time_ms": 1200,
                    "resolution_provided": True,
                    "follow_up_offered": True
                }
            }
        ]
    }
    
    # Submit the conversation trace with spans
    response = requests.post(f"{BASE_URL}/v1/private/traces", json=conversation_trace)
    
    if response.status_code == 201:
        result = response.json()
        trace_id = result['data']['id']
        spans_created = result['data']['spans_created']
        print(f"✅ Conversation trace submitted successfully!")
        print(f"   Trace ID: {trace_id}")
        print(f"   Conversation Spans Created: {spans_created}")
        print(f"   Conversation Session ID: {session_id}")
        return trace_id, session_id
    else:
        print(f"❌ Failed to submit conversation trace: {response.status_code}")
        print(f"   Response: {response.text}")
        return None, None

def test_conversation_spans_retrieval(trace_id, session_id):
    """Test retrieving conversation spans through various endpoints"""
    print(f"\n🔍 Testing Conversation Spans Retrieval...")
    
    # Test 1: Get spans for the trace
    print("📊 Getting spans for trace...")
    spans_response = requests.get(f"{BASE_URL}/api/v1/spans?traceId={trace_id}")
    
    if spans_response.status_code == 200:
        spans_data = spans_response.json()
        spans = spans_data.get('data', [])
        conversation_spans = [s for s in spans if s.get('conversation_session_id') == session_id]
        
        print(f"✅ Retrieved {len(spans)} total spans, {len(conversation_spans)} conversation spans")
        
        # Display conversation spans details
        for span in conversation_spans:
            turn = span.get('conversation_turn', 'N/A')
            role = span.get('conversation_role', 'unknown')
            name = span.get('span_name', 'Unknown Span')
            print(f"   • Turn {turn} ({role}): {name}")
        
    else:
        print(f"❌ Failed to retrieve spans: {spans_response.status_code}")
    
    # Test 2: Get conversation session (if it exists)
    print(f"\n📞 Getting conversation session...")
    session_response = requests.get(f"{BASE_URL}/api/v1/conversation-sessions?projectId={PROJECT_ID}&includeSpans=true")
    
    if session_response.status_code == 200:
        sessions_data = session_response.json()
        sessions = sessions_data.get('data', [])
        target_session = None
        
        # Look for our session by session_id in spans
        for session in sessions:
            conv_spans = session.get('conversation_spans', [])
            if any(span.get('conversation_session_id') == session_id for span in conv_spans):
                target_session = session
                break
        
        if target_session:
            print(f"✅ Found related conversation session data")
            conv_spans = target_session.get('conversation_spans', [])
            print(f"   • Conversation spans in session: {len(conv_spans)}")
        else:
            print(f"ℹ️  No formal conversation session found (spans created independently)")
    else:
        print(f"❌ Failed to retrieve conversation sessions: {session_response.status_code}")

def main():
    """Main test function"""
    print("🚀 Testing Conversation-as-Span Architecture")
    print("=" * 50)
    
    # Test 1: Create a formal conversation session
    session = test_conversation_session_creation()
    
    # Test 2: Create conversation spans via trace submission (simulating SDK usage)
    trace_id, conv_session_id = test_conversation_spans_via_trace()
    
    if trace_id and conv_session_id:
        # Test 3: Retrieve and verify conversation spans
        test_conversation_spans_retrieval(trace_id, conv_session_id)
        
        print(f"\n🎉 Conversation-as-Span Test Complete!")
        print("=" * 50)
        print("📈 What you can now see:")
        print("   • Conversation turns as specialized spans in trace timeline")
        print("   • Each turn with input/output, timing, and context")
        print("   • Conversation-specific metadata and analytics")
        print("   • Integration with existing trace/span infrastructure")
        print()
        print("🌐 View your conversation spans:")
        print(f"   📊 Trace timeline: http://localhost:3001/traces")
        print(f"   💬 Conversation view: http://localhost:3001/conversations")
        print(f"   🔍 Filter by: conversation_session_id = {conv_session_id}")
    else:
        print("❌ Test failed - could not create conversation spans")

if __name__ == "__main__":
    main()