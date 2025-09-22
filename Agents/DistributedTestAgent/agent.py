#!/usr/bin/env python3
"""
Distributed Test Agent for Agent Lens
Demonstrates distributed tracing with A2A communication patterns
"""

import asyncio
import json
import time
import uuid
import requests
import aiohttp
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import argparse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class AgentConfig:
    agent_id: str
    agent_type: str
    agent_name: str
    role: str
    capabilities: List[str]
    api_base_url: str = "http://localhost:3000"
    container_id: Optional[str] = None
    namespace: Optional[str] = None
    hostname: Optional[str] = None
    port: Optional[int] = None

@dataclass
class TraceContext:
    trace_id: str
    span_id: str
    parent_span_id: Optional[str] = None

class DistributedTestAgent:
    def __init__(self, config: AgentConfig):
        self.config = config
        self.active_traces: Dict[str, TraceContext] = {}
        self.session = None
        
    async def initialize(self):
        """Initialize the agent and create HTTP session"""
        self.session = aiohttp.ClientSession()
        logger.info(f"Initialized agent {self.config.agent_id}")
        
    async def cleanup(self):
        """Cleanup resources"""
        if self.session:
            await self.session.close()
            
    async def start_distributed_trace(self, operation_name: str, scenario_id: Optional[str] = None) -> TraceContext:
        """Start a new distributed trace"""
        trace_data = {
            "serviceName": f"agent_{self.config.agent_id}",
            "agentCount": 1,
            "serviceCount": 1,
            "containerCount": 1 if self.config.container_id else 0,
            "metadata": {
                "scenario_id": scenario_id,
                "agent_id": self.config.agent_id,
                "agent_type": self.config.agent_type,
                "operation": operation_name
            }
        }
        
        try:
            async with self.session.post(
                f"{self.config.api_base_url}/api/v1/distributed-traces",
                json=trace_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 201:
                    result = await response.json()
                    trace_id = result["data"]["id"]
                    
                    # Create root span
                    span_context = await self.create_span(
                        trace_id=trace_id,
                        operation_name=operation_name,
                        parent_span_id=None
                    )
                    
                    return span_context
                else:
                    logger.error(f"Failed to create distributed trace: {response.status}")
                    raise Exception(f"Failed to create trace: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error creating distributed trace: {e}")
            raise
            
    async def create_span(
        self, 
        trace_id: str, 
        operation_name: str, 
        parent_span_id: Optional[str] = None,
        communication_type: str = "direct"
    ) -> TraceContext:
        """Create a new span within a trace"""
        span_data = {
            "traceId": trace_id,
            "parentSpanId": parent_span_id,
            "operationName": operation_name,
            "serviceName": f"agent_{self.config.agent_id}",
            "serviceVersion": "1.0.0",
            "agentId": self.config.agent_id,
            "agentType": self.config.agent_type,
            "communicationType": communication_type,
            "tags": {
                "agent.role": self.config.role,
                "agent.capabilities": ",".join(self.config.capabilities)
            },
            "containerId": self.config.container_id,
            "namespace": self.config.namespace,
            "hostname": self.config.hostname
        }
        
        try:
            async with self.session.post(
                f"{self.config.api_base_url}/api/v1/distributed-traces/spans",
                json=span_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 201:
                    result = await response.json()
                    span_id = result["data"]["id"]
                    
                    context = TraceContext(
                        trace_id=trace_id,
                        span_id=span_id,
                        parent_span_id=parent_span_id
                    )
                    
                    self.active_traces[span_id] = context
                    return context
                else:
                    logger.error(f"Failed to create span: {response.status}")
                    raise Exception(f"Failed to create span: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error creating span: {e}")
            raise
            
    async def finish_span(
        self, 
        span_id: str, 
        status: str = "success", 
        error_message: Optional[str] = None,
        cost_data: Optional[Dict] = None
    ):
        """Finish a span with optional cost and error data"""
        update_data = {
            "id": span_id,
            "status": status,
            "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }
        
        if error_message:
            update_data["errorMessage"] = error_message
            
        if cost_data:
            update_data.update(cost_data)
            
        try:
            async with self.session.put(
                f"{self.config.api_base_url}/api/v1/distributed-traces/spans",
                json=update_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    if span_id in self.active_traces:
                        del self.active_traces[span_id]
                    logger.info(f"Finished span {span_id} with status {status}")
                else:
                    logger.error(f"Failed to finish span: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error finishing span: {e}")
            
    async def send_a2a_message(
        self,
        target_agent_id: str,
        message_type: str,
        payload: Dict,
        communication_type: str = "http",
        protocol: str = "http",
        timeout: int = 30
    ) -> Dict:
        """Send A2A message to another agent with distributed tracing"""
        
        # Get current trace context (use the first active trace if available)
        current_context = None
        if self.active_traces:
            current_context = list(self.active_traces.values())[0]
            
        # Create A2A communication record
        a2a_data = {
            "sourceAgentId": self.config.agent_id,
            "targetAgentId": target_agent_id,
            "communicationType": communication_type,
            "protocol": protocol,
            "messageType": message_type,
            "payload": payload,
            "sourceHost": self.config.hostname,
            "targetHost": None,  # Will be determined by target agent
            "sourcePort": self.config.port
        }
        
        if current_context:
            a2a_data["traceId"] = current_context.trace_id
            a2a_data["sourceSpanId"] = current_context.span_id
            
        try:
            # Record A2A communication start
            async with self.session.post(
                f"{self.config.api_base_url}/api/v1/distributed-traces/a2a",
                json=a2a_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 201:
                    a2a_result = await response.json()
                    a2a_id = a2a_result["data"]["id"]
                    
                    # Simulate message sending (in real implementation, this would be actual HTTP/gRPC call)
                    await asyncio.sleep(0.1 + (0.05 * len(str(payload))))  # Simulate network latency
                    
                    # Simulate response
                    response_data = {
                        "success": True,
                        "message": f"Message {message_type} processed by {target_agent_id}",
                        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                        "processingTime": 100 + (10 * len(str(payload)))
                    }
                    
                    # Update A2A communication with response
                    await self.session.put(
                        f"{self.config.api_base_url}/api/v1/distributed-traces/a2a",
                        json={
                            "id": a2a_id,
                            "status": "success",
                            "response": response_data,
                            "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                            "duration": response_data["processingTime"]
                        },
                        headers={"Content-Type": "application/json"}
                    )
                    
                    return response_data
                else:
                    logger.error(f"Failed to record A2A communication: {response.status}")
                    raise Exception(f"Failed to record A2A communication: {response.status}")
                    
        except Exception as e:
            logger.error(f"Error in A2A communication: {e}")
            raise
            
    async def run_collaborative_document_processing(self):
        """Run the collaborative document processing scenario"""
        logger.info(f"Starting collaborative document processing scenario")
        
        # Start distributed trace
        trace_context = await self.start_distributed_trace(
            operation_name="collaborative_document_processing",
            scenario_id="collab-doc-processing"
        )
        
        try:
            if self.config.agent_id == "doc-coordinator":
                await self.run_coordinator_workflow(trace_context)
            elif self.config.agent_id == "text-extractor":
                await self.run_text_extractor_workflow(trace_context)
            elif self.config.agent_id == "sentiment-analyzer":
                await self.run_sentiment_analyzer_workflow(trace_context)
            elif self.config.agent_id == "entity-extractor":
                await self.run_entity_extractor_workflow(trace_context)
            elif self.config.agent_id == "quality-monitor":
                await self.run_quality_monitor_workflow(trace_context)
                
        except Exception as e:
            logger.error(f"Error in scenario execution: {e}")
            await self.finish_span(trace_context.span_id, status="error", error_message=str(e))
            raise
        else:
            await self.finish_span(trace_context.span_id, status="success")
            
    async def run_coordinator_workflow(self, trace_context: TraceContext):
        """Document coordinator workflow"""
        logger.info("Running document coordinator workflow")
        
        # Simulate receiving documents
        documents = [
            {"id": "doc1", "type": "pdf", "size": 1024000},
            {"id": "doc2", "type": "txt", "size": 512000},
            {"id": "doc3", "type": "docx", "size": 2048000}
        ]
        
        for doc in documents:
            # Create span for document processing
            doc_span = await self.create_span(
                trace_id=trace_context.trace_id,
                operation_name=f"process_document_{doc['id']}",
                parent_span_id=trace_context.span_id
            )
            
            try:
                # Send to text extractor
                response = await self.send_a2a_message(
                    target_agent_id="text-extractor",
                    message_type="extract_text",
                    payload={"document": doc},
                    communication_type="http"
                )
                
                logger.info(f"Document {doc['id']} sent to text extractor")
                await asyncio.sleep(0.5)  # Simulate processing time
                
                await self.finish_span(doc_span.span_id, status="success")
                
            except Exception as e:
                await self.finish_span(doc_span.span_id, status="error", error_message=str(e))
                
    async def run_text_extractor_workflow(self, trace_context: TraceContext):
        """Text extractor workflow"""
        logger.info("Running text extractor workflow")
        
        # Simulate waiting for documents from coordinator
        await asyncio.sleep(1)
        
        # Simulate text extraction
        extraction_span = await self.create_span(
            trace_id=trace_context.trace_id,
            operation_name="extract_text_content",
            parent_span_id=trace_context.span_id
        )
        
        try:
            # Simulate extraction processing
            await asyncio.sleep(2)
            
            extracted_text = {
                "text": "This is extracted text content from the document...",
                "metadata": {"pages": 10, "words": 1500, "language": "en"}
            }
            
            # Send to sentiment analyzer
            await self.send_a2a_message(
                target_agent_id="sentiment-analyzer",
                message_type="analyze_sentiment",
                payload={"extracted_text": extracted_text},
                communication_type="message_queue"
            )
            
            # Send to entity extractor
            await self.send_a2a_message(
                target_agent_id="entity-extractor",
                message_type="extract_entities",
                payload={"extracted_text": extracted_text},
                communication_type="message_queue"
            )
            
            await self.finish_span(extraction_span.span_id, status="success")
            
        except Exception as e:
            await self.finish_span(extraction_span.span_id, status="error", error_message=str(e))
            
    async def run_sentiment_analyzer_workflow(self, trace_context: TraceContext):
        """Sentiment analyzer workflow"""
        logger.info("Running sentiment analyzer workflow")
        
        await asyncio.sleep(2)  # Wait for text extraction
        
        analysis_span = await self.create_span(
            trace_id=trace_context.trace_id,
            operation_name="sentiment_analysis",
            parent_span_id=trace_context.span_id
        )
        
        try:
            # Simulate sentiment analysis with cost tracking
            await asyncio.sleep(1.5)
            
            sentiment_results = {
                "overall_sentiment": "positive",
                "confidence": 0.85,
                "emotions": ["joy", "confidence", "satisfaction"]
            }
            
            # Send results to quality monitor
            await self.send_a2a_message(
                target_agent_id="quality-monitor",
                message_type="validate_sentiment",
                payload={"sentiment_results": sentiment_results},
                communication_type="websocket"
            )
            
            # Simulate cost data
            cost_data = {
                "totalCost": 0.05,
                "inputCost": 0.02,
                "outputCost": 0.03,
                "promptTokens": 500,
                "completionTokens": 200,
                "totalTokens": 700,
                "provider": "openai",
                "modelName": "gpt-4"
            }
            
            await self.finish_span(analysis_span.span_id, status="success", cost_data=cost_data)
            
        except Exception as e:
            await self.finish_span(analysis_span.span_id, status="error", error_message=str(e))
            
    async def run_entity_extractor_workflow(self, trace_context: TraceContext):
        """Entity extractor workflow"""
        logger.info("Running entity extractor workflow")
        
        await asyncio.sleep(2.5)  # Wait for text extraction
        
        extraction_span = await self.create_span(
            trace_id=trace_context.trace_id,
            operation_name="entity_extraction",
            parent_span_id=trace_context.span_id
        )
        
        try:
            # Simulate entity extraction
            await asyncio.sleep(1.8)
            
            entity_results = {
                "persons": ["John Doe", "Jane Smith"],
                "organizations": ["Acme Corp", "TechStartup Inc"],
                "locations": ["New York", "San Francisco"],
                "dates": ["2024-01-15", "2024-02-20"]
            }
            
            # Send results to quality monitor
            await self.send_a2a_message(
                target_agent_id="quality-monitor",
                message_type="validate_entities",
                payload={"entity_results": entity_results},
                communication_type="websocket"
            )
            
            # Simulate cost data
            cost_data = {
                "totalCost": 0.08,
                "inputCost": 0.03,
                "outputCost": 0.05,
                "promptTokens": 800,
                "completionTokens": 300,
                "totalTokens": 1100,
                "provider": "openai",
                "modelName": "gpt-4"
            }
            
            await self.finish_span(extraction_span.span_id, status="success", cost_data=cost_data)
            
        except Exception as e:
            await self.finish_span(extraction_span.span_id, status="error", error_message=str(e))
            
    async def run_quality_monitor_workflow(self, trace_context: TraceContext):
        """Quality monitor workflow"""
        logger.info("Running quality monitor workflow")
        
        await asyncio.sleep(4)  # Wait for analysis results
        
        validation_span = await self.create_span(
            trace_id=trace_context.trace_id,
            operation_name="quality_validation",
            parent_span_id=trace_context.span_id
        )
        
        try:
            # Simulate quality validation
            await asyncio.sleep(1)
            
            validation_results = {
                "quality_score": 0.92,
                "confidence_threshold_met": True,
                "issues_found": [],
                "recommendation": "Results are high quality and ready for use"
            }
            
            # Report back to coordinator
            await self.send_a2a_message(
                target_agent_id="doc-coordinator",
                message_type="quality_report",
                payload={"validation_results": validation_results},
                communication_type="http"
            )
            
            await self.finish_span(validation_span.span_id, status="success")
            
        except Exception as e:
            await self.finish_span(validation_span.span_id, status="error", error_message=str(e))

async def main():
    parser = argparse.ArgumentParser(description="Distributed Test Agent for Agent Lens")
    parser.add_argument("--agent-id", required=True, help="Agent ID")
    parser.add_argument("--agent-type", default="specialist", help="Agent type")
    parser.add_argument("--agent-name", required=True, help="Agent name")
    parser.add_argument("--role", required=True, help="Agent role")
    parser.add_argument("--capabilities", required=True, help="Comma-separated capabilities")
    parser.add_argument("--api-url", default="http://localhost:3000", help="API base URL")
    parser.add_argument("--container-id", help="Container ID")
    parser.add_argument("--namespace", help="Kubernetes namespace")
    parser.add_argument("--hostname", help="Hostname")
    parser.add_argument("--port", type=int, help="Port number")
    parser.add_argument("--scenario", default="collaborative-document-processing", 
                       help="Scenario to run")
    
    args = parser.parse_args()
    
    config = AgentConfig(
        agent_id=args.agent_id,
        agent_type=args.agent_type,
        agent_name=args.agent_name,
        role=args.role,
        capabilities=args.capabilities.split(","),
        api_base_url=args.api_url,
        container_id=args.container_id,
        namespace=args.namespace,
        hostname=args.hostname,
        port=args.port
    )
    
    agent = DistributedTestAgent(config)
    
    try:
        await agent.initialize()
        
        if args.scenario == "collaborative-document-processing":
            await agent.run_collaborative_document_processing()
        else:
            logger.error(f"Unknown scenario: {args.scenario}")
            return
            
        logger.info(f"Agent {config.agent_id} completed scenario successfully")
        
    except Exception as e:
        logger.error(f"Agent {config.agent_id} failed: {e}")
        raise
    finally:
        await agent.cleanup()

if __name__ == "__main__":
    asyncio.run(main())