# Sprint Lens Tracing Examples ✅

This directory contains clear, separate examples for all Sprint Lens tracing patterns. Each script is self-contained and demonstrates a specific approach to observability.

## 🎉 **100% Working Solution**

All examples have been thoroughly tested and verified to work correctly:
- ✅ **All traces persist to backend successfully**
- ✅ **Cross-platform event loop compatibility**
- ✅ **Reliable sync/async function tracing**
- ✅ **Production-ready implementation**

## 📁 Example Scripts

### 🔹 Basic Patterns (Start Here!)

| Script | Pattern | Description | Best For |
|--------|---------|-------------|----------|
| **`basic_tracing.py`** | Combined | Original combined example | Learning progression |
| **`pattern1_automatic_tracing.py`** | 🏷️ **Pattern 1** | Automatic function tracing with `@track()` | Independent functions |
| **`pattern2_manual_tracing.py`** | 🎯 **Pattern 2** | Manual trace and span management | Complex workflows |
| **`pattern3_context_propagation.py`** | 🔗 **Pattern 3** | Context propagation with automatic grouping | Production workflows |

### 🔹 Advanced Examples

| Script | Description | Use Case |
|--------|-------------|----------|
| **`patterns_comparison.py`** | Side-by-side comparison of all patterns | Understanding differences |

## 🚀 Quick Start

### Run Individual Patterns

```bash
# Pattern 1: Automatic function tracing (simplest)
poetry run python src/customer_support_agent/examples/pattern1_automatic_tracing.py

# Pattern 2: Manual trace management (most control)
poetry run python src/customer_support_agent/examples/pattern2_manual_tracing.py

# Pattern 3: Context propagation (best of both worlds)
poetry run python src/customer_support_agent/examples/pattern3_context_propagation.py

# Compare all patterns side by side
poetry run python src/customer_support_agent/examples/patterns_comparison.py
```

### View Results

After running any script, view your traces in the Sprint Lens Dashboard:

- **📊 All traces**: http://localhost:3001/traces
- **📁 Project traces**: http://localhost:3001/projects/project-1758599350381
- **🔍 Filter by agent**: `agent_id = agent_simpleag_mfw0ut5k`
- **🏷️ Filter by pattern**: `pattern = 1`, `pattern = 2`, or `pattern = 3`

## 📊 Pattern Comparison

### Pattern 1: Automatic Function Tracing ✨

```python
@sprintlens.track(tags={"agent_id": "xyz"}, auto_flush=True)
def my_function(data):
    return process(data)
```

**✅ Pros:**
- Minimal setup - just add decorator
- Automatic input/output capture
- Perfect for getting started

**❌ Cons:**
- Creates separate traces for each function
- Less organized for complex workflows

**🎯 Best for:** Independent functions, quick monitoring, getting started

### Pattern 2: Manual Trace Management 🎯

```python
async with trace:
    with trace.span("step1") as span:
        result = do_work()
        span.set_output(result)
```

**✅ Pros:**
- Complete control over trace structure
- Perfect workflow organization
- Custom metadata and tags

**❌ Cons:**
- More code to write
- Manual span management

**🎯 Best for:** Complex workflows, business process monitoring, when you need precise control

### Pattern 3: Context Propagation 🔗

```python
async with trace:
    # These @track() functions automatically become child spans
    result1 = decorated_function1()
    result2 = decorated_function2()
```

**✅ Pros:**
- Best of both worlds
- Automatic grouping + decorator simplicity
- Reusable functions across workflows

**❌ Cons:**
- Requires understanding of trace context
- More complex setup

**🎯 Best for:** Production applications, reusable functions, complex systems

## 🛠️ Configuration

All examples use the same Sprint Lens configuration:

```python
sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="OpikAdmin2024!",
    workspace_id="default",
    project_name="project-1758599350381"
)
```

Make sure your Sprint Lens backend is running on `http://localhost:3001` before running the examples.

## 🏷️ Tags and Metadata

All examples use consistent tagging:

- **`agent_id`**: `agent_simpleag_mfw0ut5k` (for filtering)
- **`pattern`**: `1`, `2`, or `3` (identifies which pattern)
- **`component`**: Function category (e.g., `data_access`, `processing`)
- **`workflow`**: Workflow type (e.g., `customer_support`)

## 🧪 Testing Your Setup

1. **Run Pattern 1** first to verify basic functionality
2. **Check the dashboard** to see traces appearing
3. **Run the comparison script** to see all patterns side by side
4. **Experiment** with your own functions using the patterns

## 📖 Learning Path

### 👶 New to Sprint Lens?
1. Start with `pattern1_automatic_tracing.py`
2. Run it and check the dashboard
3. Read the code comments to understand `@track()`

### 🏃 Ready for More?
1. Try `pattern2_manual_tracing.py`
2. Compare the dashboard results with Pattern 1
3. Notice how spans are organized differently

### 🎯 Production Ready?
1. Use `pattern3_context_propagation.py`
2. See how to combine automatic tracing with workflow organization
3. Apply this pattern to your real applications

### 🔬 Want to Compare?
- Run `patterns_comparison.py` to see all patterns with the same scenario
- Perfect for understanding when to use each approach

## 🔧 Troubleshooting

### Common Issues

1. **"Client not initialized" error**
   - Make sure Sprint Lens backend is running
   - Check your configuration parameters

2. **No traces appearing in dashboard**
   - Verify the project ID: `project-1758599350381`
   - Check the backend logs for errors

3. **Authentication failures**
   - Ensure credentials: admin / OpikAdmin2024!
   - Check backend connectivity

### Getting Help

- Check the logs in the console output
- Look for HTTP request logs (200 = success, 404/500 = errors)
- Filter traces by `agent_id = agent_simpleag_mfw0ut5k` in the dashboard

## 🎉 Next Steps

After mastering these patterns:

1. **Integrate with your real application**
2. **Choose the right pattern** for your use case
3. **Add custom tags and metadata** for better filtering
4. **Set up monitoring and alerts** based on trace data

Happy tracing! 🚀