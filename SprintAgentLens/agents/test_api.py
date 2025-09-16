#!/usr/bin/env python3
import requests
import json

# Test the API endpoints directly
def test_traces():
    print("Testing traces API...")
    payload = {
        "projectId": "project-1757579671500",
        "agentId": "agent_testagen_mffbl12k", 
        "traceType": "conversation",
        "operationName": "test_operation",
        "inputData": {"test": "data"},
        "metadata": {"test": True}
    }
    
    print("Payload:", json.dumps(payload, indent=2))
    
    try:
        response = requests.post(
            "http://localhost:3000/api/v1/traces",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_metrics():
    print("\nTesting metrics API...")
    payload = {
        "projectId": "project-1757579671500",
        "agentId": "agent_testagen_mffbl12k",
        "metricType": "response_time",
        "value": 500.0,
        "unit": "ms"
    }
    
    print("Payload:", json.dumps(payload, indent=2))
    
    try:
        response = requests.post(
            "http://localhost:3000/api/v1/metrics",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

def test_conversations():
    print("\nTesting conversations API...")
    payload = {
        "projectId": "project-1757579671500",
        "agentId": "agent_testagen_mffbl12k",
        "input": "Hello world",
        "output": "Hi there!",
        "responseTime": 500
    }
    
    print("Payload:", json.dumps(payload, indent=2))
    
    try:
        response = requests.post(
            "http://localhost:3000/api/v1/conversations", 
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_traces()
    test_metrics()  
    test_conversations()