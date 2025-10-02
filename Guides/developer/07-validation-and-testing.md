# Sprint Lens SDK Validation and Testing Guide

This guide helps you validate that your Sprint Lens SDK integration is working correctly and traces are appearing in the UI.

## Quick Validation Checklist

### ✅ 1. Environment Configuration

Verify your environment variables are correctly set:

```bash
# Check .env file contains correct values
cat .env

# Expected values (update with your actual IDs):
SPRINTLENS_URL=http://localhost:3001
SPRINTLENS_USERNAME=admin
SPRINTLENS_PASSWORD=MasterAdmin2024!
SPRINTLENS_WORKSPACE_ID=default
SPRINTLENS_PROJECT_NAME=project-1758599350381
AGENT_ID=agent_simpleag_mfw0ut5k
```

### ✅ 2. Backend Connectivity

Ensure Sprint Lens backend is running and accessible:

```bash
# Check if Sprint Lens is running on port 3001
curl http://localhost:3001

# Should return HTML response indicating the frontend is running
```

### ✅ 3. SDK Configuration Test

Use the provided validation script to test your configuration:

```python
# Run the validation script
poetry run python validate_connection.py

# Expected output:
# ✅ Client is properly configured
# ✅ Connection to backend successful
# ✅ Project ID: project-1758599350381
# ✅ Agent ID: agent_simpleag_mfw0ut5k
# 🎉 All validations passed!
```

### ✅ 4. Basic Tracing Test

Test that traces are created and stored:

```python
# Run basic tracing example
poetry run python src/customer_support_agent/examples/basic_tracing.py

# Expected output:
# ✅ Query Result: For billing questions, I'll transfer you to our billing department.
# ✅ Sentiment: {'sentiment': 'positive', 'confidence': 0.25, 'positive_signals': 1, 'negative_signals': 0}
# 🎉 Pattern 1 Complete! Check your Sprint Lens dashboard to see the traces.
```

### ✅ 5. UI Verification

Check that traces appear in the Sprint Lens UI:

1. **Open the traces page**: http://localhost:3001/traces
2. **Open project-specific page**: http://localhost:3001/projects/project-1758599350381
3. **Verify traces are visible** with proper agent tagging

## Troubleshooting Common Issues

### Issue: "No global client configured" Error

**Symptoms**: SDK throws error when using decorators

**Solution**:
```python
# Ensure sprintlens.configure() is called before using decorators
import sprintlens

sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="MasterAdmin2024!",
    workspace_id="default",
    project_name="project-1758599350381"
)

# Now decorators will work
@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k"})
def my_function():
    return "result"
```

### Issue: Traces Created But Not Visible in UI

**Symptoms**: Validation script passes, but UI shows no traces

**Root Cause**: Project ID mismatch between SDK and database

**Solution**:
1. **Check database for correct project ID**:
```bash
# Check traces in database
sqlite3 "/Users/michaeldsouza/Documents/Wordir/AGENT_LENS/AgentVerse/SprintAgentLens/frontend/data/sprintlens.db" \
"SELECT id, project_id, operation_name FROM traces ORDER BY created_at DESC LIMIT 5;"
```

2. **Verify project exists**:
```bash
# Check projects table
sqlite3 "/Users/michaeldsouza/Documents/Wordir/AGENT_LENS/AgentVerse/SprintAgentLens/frontend/data/sprintlens.db" \
"SELECT id, name FROM projects;"
```

3. **Update traces if needed**:
```bash
# Fix project ID mismatch (if traces are under wrong project)
sqlite3 "/Users/michaeldsouza/Documents/Wordir/AGENT_LENS/AgentVerse/SprintAgentLens/frontend/data/sprintlens.db" \
"UPDATE traces SET project_id = 'project-1758599350381' WHERE project_id = 'proj_production_demo_001';"
```

### Issue: Authentication Failures

**Symptoms**: SDK connection fails with auth errors

**Solution**:
```python
# Verify credentials and test connectivity
client = sprintlens.get_client()
if client:
    print(f"✅ Client configured: {client}")
    print(f"✅ Backend URL: {client.config.url}")
    print(f"✅ Username: {client.config.username}")
    print(f"✅ Project: {client.config.project_name}")
else:
    print("❌ Client not configured - check credentials")
```

## Database Validation Commands

### Check Trace Storage

```bash
# View recent traces
sqlite3 "/path/to/sprintlens.db" \
"SELECT id, project_id, operation_name, tags, created_at FROM traces ORDER BY created_at DESC LIMIT 10;"

# Count traces by project
sqlite3 "/path/to/sprintlens.db" \
"SELECT project_id, COUNT(*) as trace_count FROM traces GROUP BY project_id;"

# Check for agent-tagged traces
sqlite3 "/path/to/sprintlens.db" \
"SELECT id, tags FROM traces WHERE tags LIKE '%agent_simpleag_mfw0ut5k%';"
```

### Check Project Configuration

```bash
# List all projects
sqlite3 "/path/to/sprintlens.db" \
"SELECT id, name, created_at FROM projects ORDER BY created_at DESC;"

# Verify specific project exists
sqlite3 "/path/to/sprintlens.db" \
"SELECT * FROM projects WHERE id = 'project-1758599350381';"
```

## Integration Test Script

Create a comprehensive test to validate your entire setup:

```python
#!/usr/bin/env python3
"""
Comprehensive Sprint Lens Integration Test
"""
import asyncio
import sprintlens
from datetime import datetime

# Configure Sprint Lens
sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="MasterAdmin2024!",
    workspace_id="default",
    project_name="project-1758599350381"
)

@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k", "test": "integration"})
def test_sync_function():
    """Test synchronous function tracing."""
    return {"status": "sync_success", "timestamp": datetime.now().isoformat()}

@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k", "test": "integration"})
async def test_async_function():
    """Test asynchronous function tracing."""
    await asyncio.sleep(0.1)
    return {"status": "async_success", "timestamp": datetime.now().isoformat()}

async def run_integration_test():
    """Run complete integration test."""
    print("🧪 Starting Sprint Lens Integration Test")
    print("=" * 50)
    
    try:
        # Test 1: Client configuration
        client = sprintlens.get_client()
        assert client is not None, "Client should be configured"
        print("✅ Client configuration: PASS")
        
        # Test 2: Sync function tracing
        sync_result = test_sync_function()
        assert sync_result["status"] == "sync_success"
        print("✅ Sync function tracing: PASS")
        
        # Test 3: Async function tracing
        async_result = await test_async_function()
        assert async_result["status"] == "async_success"
        print("✅ Async function tracing: PASS")
        
        # Test 4: Manual trace creation
        from sprintlens.tracing.trace import Trace
        test_trace = Trace(
            name="integration_test_manual",
            client=client,
            tags={"agent_id": "agent_simpleag_mfw0ut5k", "test": "manual"},
            metadata={"test_type": "integration", "timestamp": datetime.now().isoformat()}
        )
        
        async with test_trace:
            with test_trace.span("test_span") as span:
                span.set_input({"test": "manual_trace"})
                span.set_output({"result": "success"})
        
        print("✅ Manual trace creation: PASS")
        
        print("\n🎉 All Integration Tests Passed!")
        print("🌐 Check UI at: http://localhost:3001/traces")
        print("📊 Check project: http://localhost:3001/projects/project-1758599350381")
        
        return True
        
    except Exception as e:
        print(f"❌ Integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(run_integration_test())
    exit(0 if success else 1)
```

## Best Practices for Validation

1. **Run validation after every SDK update**
2. **Check UI immediately after running traced code**
3. **Use consistent agent tagging across all traces**
4. **Monitor database for trace storage patterns**
5. **Verify project IDs match between configuration and database**
6. **Test both sync and async function tracing**
7. **Validate manual trace creation works**

## Next Steps

Once validation passes:

1. **Explore the UI**: Familiarize yourself with trace visualization
2. **Add more tracing**: Instrument additional functions in your codebase
3. **Set up monitoring**: Configure alerts for trace anomalies
4. **Performance tuning**: Optimize trace collection based on your needs

For more advanced configuration and usage patterns, see:
- [03-sdk-integration-guide.md](./03-sdk-integration-guide.md) - Complete SDK Integration Reference
- [04-langgraph-basics.md](./04-langgraph-basics.md) - LangGraph Integration
- [05-provider-configuration.md](./05-provider-configuration.md) - LLM Provider Setup