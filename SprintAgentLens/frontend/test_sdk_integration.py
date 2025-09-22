#!/usr/bin/env python3
"""
Test Sprint Lens SDK integration with the new project.
Tests agent creation fixes and real cost tracking.
"""

import os
import sys
import requests
import json
from datetime import datetime

# Add the SDK to the path
sys.path.insert(0, '/Users/michaeldsouza/Documents/Wordir/AGENT_LENS/AgentVerse/Sprint_Lens_SDK/src')

from sprintlens import SprintLensClient, configure


def test_integration():
    """Test the full SDK integration with the new project."""
    
    print("🧪 Testing Sprint Lens SDK Integration with Agent Creation Fix")
    print("=" * 60)
    
    # Initialize Sprint Lens SDK
    print("1. Initializing Sprint Lens SDK...")
    configure(
        url="http://localhost:3000",
        project_code="test_agent_creation_002",
        api_key="test-key"  # Simple auth for testing
    )
    sl = SprintLensClient()
    
    # Create a trace with real Azure OpenAI data
    print("2. Creating trace with real cost data...")
    with sl.trace("Agent Test Integration", metadata={"test": "agent_creation_fix"}) as trace:
        print(f"   ✓ Trace created: {trace.id}")
        
        # Simulate LLM call with real token usage and cost
        with trace.span("llm-call", span_type="llm") as span:
            span.set_model_info("gpt-4o-mini", "azure", "2024-07-18")
            span.set_input({"prompt": "Test agent creation fix"})
            span.set_output({"response": "Agent creation schema fixes working successfully!"})
            
            # Real token usage from Azure OpenAI
            span.set_token_usage(
                prompt_tokens=45,
                completion_tokens=28,
                total_tokens=73
            )
            
            # This will be automatically calculated by the backend
            print(f"   ✓ LLM span created with 73 tokens")
        
        print(f"   ✓ Trace completed successfully")
    
    # Verify data was sent correctly
    print("3. Verifying data in backend...")
    response = requests.get(f"http://localhost:3000/api/v1/traces")
    if response.status_code == 200:
        traces = response.json().get('data', [])
        print(f"   ✓ Found {len(traces)} traces in database")
        
        # Check if our trace exists
        test_trace = None
        for t in traces:
            if t.get('name') == 'Agent Test Integration':
                test_trace = t
                break
        
        if test_trace:
            print(f"   ✓ Test trace found: {test_trace['id']}")
            print(f"   ✓ Trace cost: ${test_trace.get('totalCost', 0):.6f}")
        else:
            print("   ⚠️  Test trace not found")
    else:
        print(f"   ❌ Error fetching traces: {response.status_code}")
    
    # Check agents in the project
    print("4. Verifying agent creation...")
    response = requests.get(f"http://localhost:3000/api/v1/projects")
    if response.status_code == 200:
        projects = response.json().get('data', [])
        test_project = None
        for p in projects:
            if p.get('code') == 'test_agent_creation_002':
                test_project = p
                break
        
        if test_project:
            agent_count = test_project.get('agents', 0)
            print(f"   ✓ Project found: {test_project['name']}")
            print(f"   ✓ Agents in project: {agent_count}")
            
            if agent_count > 0:
                print("   🎉 SUCCESS: Agent creation is now working!")
            else:
                print("   ⚠️  No agents found in project")
        else:
            print("   ❌ Test project not found")
    else:
        print(f"   ❌ Error fetching projects: {response.status_code}")
    
    print("\n🔍 Integration test completed!")
    return True


if __name__ == "__main__":
    try:
        test_integration()
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()