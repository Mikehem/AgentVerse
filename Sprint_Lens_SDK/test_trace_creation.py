#!/usr/bin/env python3
"""
Test trace creation to verify agent_id extraction and data field fixes
"""

import json
import requests

# Direct test of the /v1/private/traces endpoint
def test_trace_endpoint():
    url = "http://localhost:3001/v1/private/traces"
    
    # Test payload mimicking what SDK should send
    test_payload = {
        "id": "trace_test_12345",
        "name": "test_function",
        "start_time": "2025-09-24T06:20:00.000Z",
        "end_time": "2025-09-24T06:20:01.000Z",
        "project_id": "project-1758599350381",
        "tags": {
            "agent_id": "test_agent_from_tags",
            "pattern": "test"
        },
        "input": {"query": "test input"},
        "output": {"result": "test output"},
        "spans": [
            {
                "id": "span_test_123",
                "name": "test_span",
                "start_time": "2025-09-24T06:20:00.500Z",
                "end_time": "2025-09-24T06:20:00.800Z"
            }
        ],
        "metadata": {"test": "metadata"}
    }
    
    print("🧪 Testing trace endpoint with test payload...")
    print(f"📤 Payload: {json.dumps(test_payload, indent=2)}")
    
    try:
        response = requests.post(url, json=test_payload)
        print(f"📥 Response status: {response.status_code}")
        print(f"📥 Response body: {response.text}")
        
        if response.status_code == 201:
            print("✅ Test trace created successfully!")
            return True
        else:
            print("❌ Test trace creation failed!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False

if __name__ == "__main__":
    test_trace_endpoint()