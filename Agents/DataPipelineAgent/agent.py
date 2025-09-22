#!/usr/bin/env python3
"""
Data Pipeline Agent for Distributed Processing
Demonstrates parallel data processing with distributed tracing
"""

import asyncio
import json
import time
import uuid
import random
import aiohttp
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import argparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class DataChunk:
    id: str
    data: List[Dict]
    size: int
    timestamp: str

@dataclass
class ProcessingResult:
    chunk_id: str
    processed_count: int
    filtered_count: int
    aggregated_values: Dict
    processing_time: float
    status: str

class DataPipelineAgent:
    def __init__(self, agent_id: str, agent_type: str, api_base_url: str = "http://localhost:3000"):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.api_base_url = api_base_url
        self.session = None
        self.active_traces = {}
        
    async def initialize(self):
        """Initialize the agent"""
        self.session = aiohttp.ClientSession()
        logger.info(f"Initialized {self.agent_type} agent {self.agent_id}")
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            
    async def create_span(
        self, 
        trace_id: str, 
        operation_name: str, 
        parent_span_id: Optional[str] = None
    ) -> str:
        """Create a new span"""
        span_data = {
            "traceId": trace_id,
            "parentSpanId": parent_span_id,
            "operationName": operation_name,
            "serviceName": f"data_pipeline_{self.agent_id}",
            "agentId": self.agent_id,
            "agentType": self.agent_type,
            "communicationType": "grpc",
            "tags": {
                "pipeline.stage": self.agent_type,
                "pipeline.worker_id": self.agent_id
            },
            "containerId": f"{self.agent_id}-container",
            "namespace": "data-pipeline"
        }
        
        async with self.session.post(
            f"{self.api_base_url}/api/v1/distributed-traces/spans",
            json=span_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 201:
                result = await response.json()
                span_id = result["data"]["id"]
                self.active_traces[span_id] = trace_id
                return span_id
            else:
                raise Exception(f"Failed to create span: {response.status}")
                
    async def finish_span(self, span_id: str, status: str = "success", error_message: Optional[str] = None, cost_data: Optional[Dict] = None):
        """Finish a span"""
        update_data = {
            "id": span_id,
            "status": status,
            "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
        
        if error_message:
            update_data["errorMessage"] = error_message
        if cost_data:
            update_data.update(cost_data)
            
        async with self.session.put(
            f"{self.api_base_url}/api/v1/distributed-traces/spans",
            json=update_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                if span_id in self.active_traces:
                    del self.active_traces[span_id]
                    
    async def send_a2a_message(self, target_agent_id: str, message_type: str, payload: Dict) -> Dict:
        """Send A2A message with tracing"""
        current_trace_id = None
        current_span_id = None
        
        if self.active_traces:
            current_span_id = list(self.active_traces.keys())[0]
            current_trace_id = self.active_traces[current_span_id]
            
        a2a_data = {
            "sourceAgentId": self.agent_id,
            "targetAgentId": target_agent_id,
            "communicationType": "grpc",
            "protocol": "grpc",
            "messageType": message_type,
            "payload": payload
        }
        
        if current_trace_id:
            a2a_data["traceId"] = current_trace_id
            a2a_data["sourceSpanId"] = current_span_id
            
        async with self.session.post(
            f"{self.api_base_url}/api/v1/distributed-traces/a2a",
            json=a2a_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 201:
                a2a_result = await response.json()
                a2a_id = a2a_result["data"]["id"]
                
                # Simulate message processing
                await asyncio.sleep(0.1)
                
                response_data = {
                    "success": True,
                    "message": f"Message {message_type} processed",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                }
                
                # Update A2A communication
                await self.session.put(
                    f"{self.api_base_url}/api/v1/distributed-traces/a2a",
                    json={
                        "id": a2a_id,
                        "status": "success",
                        "response": response_data,
                        "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                        "duration": 100
                    },
                    headers={"Content-Type": "application/json"}
                )
                
                return response_data
                
    async def run_orchestrator(self, trace_id: str):
        """Run orchestrator workflow"""
        logger.info("Starting pipeline orchestrator")
        
        span_id = await self.create_span(trace_id, "orchestrate_pipeline")
        
        try:
            # Generate sample data chunks
            data_chunks = []
            for i in range(3):
                chunk_data = []
                for j in range(1000):
                    chunk_data.append({
                        "id": f"record_{i}_{j}",
                        "value": random.randint(1, 1000),
                        "category": random.choice(["A", "B", "C", "D"]),
                        "timestamp": time.time() + j
                    })
                
                chunk = DataChunk(
                    id=f"chunk_{i}",
                    data=chunk_data,
                    size=len(chunk_data),
                    timestamp=time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                )
                data_chunks.append(chunk)
            
            # Distribute work to workers
            workers = ["data-worker-1", "data-worker-2", "data-worker-3"]
            
            for i, chunk in enumerate(data_chunks):
                worker_id = workers[i % len(workers)]
                
                logger.info(f"Sending chunk {chunk.id} to {worker_id}")
                await self.send_a2a_message(
                    target_agent_id=worker_id,
                    message_type="process_chunk",
                    payload={"chunk": asdict(chunk)}
                )
                
                await asyncio.sleep(0.5)
            
            await self.finish_span(span_id, "success")
            
        except Exception as e:
            await self.finish_span(span_id, "error", str(e))
            raise
            
    async def run_worker(self, trace_id: str, worker_id: str):
        """Run data worker workflow"""
        logger.info(f"Starting data worker {worker_id}")
        
        # Wait for work distribution
        await asyncio.sleep(2)
        
        # Simulate processing multiple chunks
        for chunk_num in range(1):  # Each worker processes 1 chunk
            process_span_id = await self.create_span(
                trace_id, 
                f"process_data_chunk_{chunk_num}",
            )
            
            try:
                # Simulate data processing
                processing_time = 2 + random.uniform(0, 1)
                await asyncio.sleep(processing_time)
                
                # Generate processing results
                result = ProcessingResult(
                    chunk_id=f"chunk_{chunk_num}",
                    processed_count=1000,
                    filtered_count=50,
                    aggregated_values={
                        "sum": random.randint(400000, 600000),
                        "avg": random.uniform(400, 600),
                        "max": random.randint(900, 1000),
                        "min": random.randint(1, 100)
                    },
                    processing_time=processing_time,
                    status="completed"
                )
                
                # Send results to aggregator
                await self.send_a2a_message(
                    target_agent_id="result-aggregator",
                    message_type="aggregate_results",
                    payload={"result": asdict(result)}
                )
                
                # Add some cost tracking for processing
                cost_data = {
                    "totalCost": 0.02,
                    "inputCost": 0.01,
                    "outputCost": 0.01,
                    "promptTokens": 200,
                    "completionTokens": 100,
                    "totalTokens": 300,
                    "provider": "compute",
                    "modelName": "data-processor-v1"
                }
                
                await self.finish_span(process_span_id, "success", cost_data=cost_data)
                
            except Exception as e:
                await self.finish_span(process_span_id, "error", str(e))
                
    async def run_aggregator(self, trace_id: str):
        """Run result aggregator workflow"""
        logger.info("Starting result aggregator")
        
        # Wait for worker results
        await asyncio.sleep(5)
        
        aggregate_span_id = await self.create_span(trace_id, "aggregate_final_results")
        
        try:
            # Simulate aggregation processing
            await asyncio.sleep(2)
            
            # Generate final aggregated results
            final_results = {
                "total_records_processed": 3000,
                "total_records_filtered": 150,
                "processing_time": 8.5,
                "final_aggregations": {
                    "global_sum": 1500000,
                    "global_avg": 500,
                    "global_max": 1000,
                    "global_min": 1
                },
                "quality_metrics": {
                    "accuracy": 0.98,
                    "completeness": 1.0,
                    "consistency": 0.95
                }
            }
            
            # Report completion back to orchestrator
            await self.send_a2a_message(
                target_agent_id="pipeline-orchestrator",
                message_type="pipeline_complete",
                payload={"final_results": final_results}
            )
            
            await self.finish_span(aggregate_span_id, "success")
            
        except Exception as e:
            await self.finish_span(aggregate_span_id, "error", str(e))

async def main():
    parser = argparse.ArgumentParser(description="Data Pipeline Agent")
    parser.add_argument("--agent-id", required=True, help="Agent ID")
    parser.add_argument("--agent-type", required=True, help="Agent type (orchestrator, worker, aggregator)")
    parser.add_argument("--api-url", default="http://localhost:3000", help="API base URL")
    parser.add_argument("--trace-id", help="Existing trace ID to join")
    
    args = parser.parse_args()
    
    agent = DataPipelineAgent(args.agent_id, args.agent_type, args.api_url)
    
    try:
        await agent.initialize()
        
        # Create or join a trace
        if args.trace_id:
            trace_id = args.trace_id
        else:
            # Start new distributed trace
            trace_data = {
                "serviceName": "data_pipeline_orchestrator",
                "agentCount": 5,
                "serviceCount": 1,
                "containerCount": 5,
                "metadata": {
                    "scenario": "distributed-data-pipeline",
                    "pipeline_type": "batch_processing"
                }
            }
            
            async with agent.session.post(
                f"{args.api_url}/api/v1/distributed-traces",
                json=trace_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 201:
                    result = await response.json()
                    trace_id = result["data"]["id"]
                    logger.info(f"Created new trace: {trace_id}")
                else:
                    raise Exception(f"Failed to create trace: {response.status}")
        
        # Run appropriate workflow based on agent type
        if args.agent_type == "orchestrator":
            await agent.run_orchestrator(trace_id)
        elif args.agent_type == "worker":
            await agent.run_worker(trace_id, args.agent_id)
        elif args.agent_type == "aggregator":
            await agent.run_aggregator(trace_id)
        else:
            logger.error(f"Unknown agent type: {args.agent_type}")
            return
            
        logger.info(f"Agent {args.agent_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Agent {args.agent_id} failed: {e}")
        raise
    finally:
        await agent.cleanup()

if __name__ == "__main__":
    asyncio.run(main())