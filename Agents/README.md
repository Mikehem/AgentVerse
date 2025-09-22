# Agent Lens - Distributed Tracing Test Agents

This directory contains test agents that demonstrate distributed tracing capabilities with Agent-to-Agent (A2A) communication patterns for autonomous multi-agent scenarios.

## Overview

The test agents are designed to work with the Agent Lens distributed tracing system, showcasing:

- **Distributed trace context propagation** across multiple agents
- **Agent-to-Agent (A2A) communication tracking** with various protocols
- **Multi-container/deployment support** for realistic distributed scenarios
- **Cost and performance metrics collection** across agent interactions
- **Hierarchical trace visualization** showing parent-child relationships

## Test Agent Types

### 1. DistributedTestAgent
**Location**: `DistributedTestAgent/`

Implements the **Collaborative Document Processing** scenario with the following agents:

- **Document Coordinator** (`doc-coordinator`) - Orchestrates workflow
- **Text Extraction Agent** (`text-extractor`) - Extracts text from documents
- **Sentiment Analysis Agent** (`sentiment-analyzer`) - Analyzes text sentiment
- **Entity Extraction Agent** (`entity-extractor`) - Identifies named entities
- **Quality Monitor** (`quality-monitor`) - Validates processing quality

**Communication Patterns**:
- HTTP request-response for coordination
- Message queue for async processing
- WebSocket for real-time monitoring

### 2. DataPipelineAgent
**Location**: `DataPipelineAgent/`

Implements the **Distributed Data Processing Pipeline** scenario:

- **Pipeline Orchestrator** (`pipeline-orchestrator`) - Manages data distribution
- **Data Workers** (`data-worker-1,2,3`) - Process data chunks in parallel
- **Result Aggregator** (`result-aggregator`) - Combines worker results

**Communication Patterns**:
- gRPC for high-performance data transfer
- Streaming for continuous result updates

## Prerequisites

1. **Agent Lens Frontend** running on `http://localhost:3000`
2. **Python 3.8+** with required packages
3. **Database** initialized with distributed tracing tables

## Installation

1. Navigate to the agent directory:
```bash
cd /path/to/AgentVerse/Agents/
```

2. Install Python dependencies:
```bash
# For DistributedTestAgent
cd DistributedTestAgent
pip install -r requirements.txt

# For DataPipelineAgent  
cd ../DataPipelineAgent
pip install aiohttp requests asyncio
```

## Running Test Scenarios

### Collaborative Document Processing

1. **Start Agent Lens frontend** (ensure it's running on localhost:3000)

2. **Run the scenario**:
```bash
cd DistributedTestAgent
python run_collaborative_scenario.py
```

This will:
- Start all 5 agents in the correct order
- Create a distributed trace with proper parent-child relationships
- Simulate document processing workflow with A2A communications
- Generate cost and performance metrics
- Gracefully handle shutdown with Ctrl+C

3. **View results** in Agent Lens:
- Navigate to `http://localhost:3000/distributed-traces`
- Select the trace to see the complete workflow visualization
- Explore service dependency graphs and communication patterns

### Distributed Data Pipeline

1. **Run the pipeline scenario**:
```bash
cd DataPipelineAgent
python run_pipeline_scenario.py
```

This demonstrates:
- Parallel data processing across multiple workers
- Load balancing and work distribution
- Result aggregation and streaming
- Container-aware deployment tracking

## Individual Agent Usage

You can also run individual agents manually for testing:

```bash
# Start a single document coordinator
cd DistributedTestAgent
python agent.py \
  --agent-id "doc-coordinator" \
  --agent-type "coordinator" \
  --agent-name "Document Coordinator" \
  --role "Orchestrates document processing workflow" \
  --capabilities "workflow_management,task_distribution,result_aggregation" \
  --hostname "coordinator-node" \
  --port 8001 \
  --namespace "document-processing"

# Start a data worker
cd DataPipelineAgent  
python agent.py \
  --agent-id "data-worker-1" \
  --agent-type "worker" \
  --api-url "http://localhost:3000"
```

## Monitoring and Visualization

### Real-time Monitoring

1. **Distributed Traces Dashboard**: `http://localhost:3000/distributed-traces`
   - View active traces and select for detailed analysis
   - See trace tree hierarchies with span relationships
   - Monitor A2A communications in real-time

2. **Service Dependency Graph**:
   - Interactive visualization of agent communication patterns
   - Node colors indicate health status (green=healthy, red=errors)
   - Edge thickness shows communication frequency

3. **Performance Analysis**:
   - Bottleneck detection (slowest spans, highest costs)
   - Critical path analysis for optimization
   - Cross-container communication patterns

### Key Metrics Tracked

- **Trace Metrics**: Duration, span count, success rate, error count
- **Cost Tracking**: Token usage, model costs, provider information  
- **Performance**: Response times, throughput, resource utilization
- **Communication**: Message counts, protocols, failure rates
- **Container Info**: Deployment topology, cross-container calls

## Scenario Configuration

### Custom Scenarios

You can create custom scenarios by:

1. **Defining agent configurations** in the launcher scripts
2. **Implementing communication patterns** between agents
3. **Adding custom spans** for specific operations
4. **Including cost tracking** for AI model usage

Example agent configuration:
```python
{
    "agent_id": "custom-agent",
    "agent_type": "specialist", 
    "agent_name": "Custom Processing Agent",
    "role": "Performs custom data processing",
    "capabilities": "custom_processing,data_validation",
    "hostname": "custom-node",
    "port": 9001,
    "namespace": "custom-scenario"
}
```

### Container Deployment

For realistic distributed testing:

1. **Set container information**:
```python
config = AgentConfig(
    container_id="agent-container-123",
    namespace="production", 
    hostname="worker-node-05",
    port=8080
)
```

2. **Track cross-container communications** automatically
3. **Visualize deployment topology** in service graphs

## Troubleshooting

### Common Issues

1. **Connection Refused**: Ensure Agent Lens frontend is running on localhost:3000
2. **Database Errors**: Verify distributed tracing tables are created
3. **Agent Startup Failures**: Check Python dependencies and permissions

### Debug Mode

Enable detailed logging:
```bash
export PYTHONPATH=/path/to/agents
python -u agent.py --agent-id test --agent-type worker --verbose
```

### Verification

Test the API endpoints directly:
```bash
# Check if distributed tracing API is available
curl http://localhost:3000/api/v1/distributed-traces

# Verify span creation
curl -X POST http://localhost:3000/api/v1/distributed-traces/spans \
  -H "Content-Type: application/json" \
  -d '{"operationName":"test","serviceName":"test-service"}'
```

## Next Steps

1. **Explore the visualization**: Use the distributed traces dashboard to understand agent interactions
2. **Analyze bottlenecks**: Check the performance analysis tabs for optimization opportunities  
3. **Create custom scenarios**: Implement your own multi-agent workflows
4. **Scale testing**: Add more agents and containers to test larger scenarios

For more advanced usage and API documentation, see the main Agent Lens documentation.