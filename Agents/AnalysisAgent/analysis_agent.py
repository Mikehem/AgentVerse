#!/usr/bin/env python3
"""
Analysis Agent with Sprint Agent Lens Integration

A specialized analysis agent capable of autonomous communication with other agents.
Provides comprehensive data analysis, statistical analysis, pattern recognition,
and insights generation with full Sprint Lens observability.
"""

import asyncio
import os
import sys
import json
import time
import uuid
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import logging
import numpy as np
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Environment and configuration
from dotenv import load_dotenv
from openai import AzureOpenAI

# Add Sprint Lens SDK to path (for local development)
sdk_path = Path(__file__).parent.parent.parent / "Sprint_Lens_SDK" / "src"
sys.path.insert(0, str(sdk_path))

# Sprint Lens SDK imports
import sprintlens
from sprintlens import track, Trace, SprintLensClient
from sprintlens.evaluation import AccuracyMetric, RelevanceMetric, Evaluator

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AnalysisAgent:
    """
    An analysis agent specialized in autonomous communication and comprehensive data analysis.
    
    Features:
    - Azure OpenAI integration for advanced analysis
    - Statistical analysis and pattern recognition
    - Autonomous agent communication via HTTP APIs
    - Complete observability and tracing
    - Insights generation and recommendations
    - Inter-agent communication protocols with HTTP server
    """
    
    def __init__(self, agent_port: int = 8002):
        """Initialize the Analysis Agent with communication capabilities."""
        self.agent_id = str(uuid.uuid4())
        self.agent_type = "AnalysisAgent"
        self.agent_port = agent_port
        self.communication_history = []
        
        # Initialize Azure OpenAI client
        self._setup_azure_openai()
        
        # Initialize Sprint Lens client
        self._setup_sprintlens()
        
        # Agent configuration
        self.system_prompt = """You are a specialized Analysis Agent with the following capabilities:
        - Perform comprehensive statistical and data analysis
        - Identify patterns, trends, and anomalies in data
        - Generate actionable insights and recommendations
        - Communicate autonomously with other agents
        - Synthesize information from multiple sources
        - Provide evidence-based analysis with confidence intervals
        
        Your analysis should be thorough, statistically sound, and actionable. Always provide context and explain your methodologies."""
        
        # Communication endpoints for other agents
        self.known_agents = {}
        
        # FastAPI server for receiving communications
        self.app = FastAPI(title="Analysis Agent", version="1.0.0")
        self._setup_fastapi_routes()
        
        logger.info(f"AnalysisAgent initialized with ID: {self.agent_id} on port {self.agent_port}")
    
    def _setup_azure_openai(self):
        """Setup Azure OpenAI client."""
        try:
            self.openai_client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
            )
            self.deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            logger.info("Azure OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Azure OpenAI client: {e}")
            raise
    
    def _setup_sprintlens(self):
        """Setup Sprint Lens client for observability."""
        try:
            self.sprintlens_client = sprintlens.configure(
                url=os.getenv("SPRINTLENS_URL", "http://localhost:3000"),
                username=os.getenv("SPRINTLENS_USERNAME", "admin"),
                password=os.getenv("SPRINTLENS_PASSWORD", "MasterAdmin2024!"),
                workspace_id=os.getenv("SPRINTLENS_WORKSPACE_ID", "default"),
                project_name="AnalysisAgent_Autonomous"
            )
            logger.info("Sprint Lens client configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure Sprint Lens client: {e}")
            self.sprintlens_client = None
    
    def _setup_fastapi_routes(self):
        """Setup FastAPI routes for inter-agent communication."""
        
        # Add CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        @self.app.post("/analyze")
        async def receive_analysis_request(request_data: Dict[str, Any]):
            """Receive analysis requests from other agents."""
            return await self._handle_incoming_communication(request_data)
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {
                "status": "healthy",
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "timestamp": datetime.now().isoformat()
            }
        
        @self.app.get("/status")
        async def get_status():
            """Get agent status and metrics."""
            return {
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "known_agents": len(self.known_agents),
                "communication_history_count": len(self.communication_history),
                "sprintlens_connected": self.sprintlens_client is not None,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _handle_incoming_communication(self, request_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle incoming communication from other agents with full tracing.
        
        Args:
            request_data: Communication payload from another agent
            
        Returns:
            Analysis response with findings
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for incoming communication
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="incoming_agent_communication",
                    client=self.sprintlens_client,
                    project_name="AnalysisAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "from_agent": request_data.get("from_agent_id", "unknown"),
                        "communication_type": "inbound"
                    },
                    metadata={
                        "from_agent_id": request_data.get("from_agent_id"),
                        "from_agent_type": request_data.get("from_agent_type"),
                        "message_type": request_data.get("message", {}).get("type", "unknown"),
                        "agent_type": self.agent_type
                    },
                    input_data=request_data
                )
                logger.debug(f"Created incoming communication trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create incoming communication trace: {e}")
                trace = None
        
        try:
            message = request_data.get("message", {})
            message_type = message.get("type", "unknown")
            
            # Store communication in history
            self.communication_history.append({
                "direction": "inbound",
                "from_agent": request_data.get("from_agent_id", "unknown"),
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "success": True
            })
            
            # Handle different types of incoming messages
            if message_type == "research_collaboration":
                # Research collaboration request
                task_description = message.get("task_description", "")
                research_findings = message.get("my_findings", "")
                
                # Perform additional analysis on the research
                analysis_result = await self.analyze_research_findings(
                    task_description, research_findings
                )
                
                response = {
                    "status": "success",
                    "agent_id": self.agent_id,
                    "agent_type": self.agent_type,
                    "message_type": "research_analysis_response",
                    "research_findings": analysis_result.get("analysis_content", ""),
                    "analysis_confidence": analysis_result.get("confidence_score", 0.0),
                    "insights": analysis_result.get("insights", []),
                    "timestamp": datetime.now().isoformat()
                }
                
            elif message_type == "data_analysis":
                # Data analysis request
                data = message.get("data", {})
                analysis_type = message.get("analysis_type", "general")
                
                analysis_result = await self.perform_data_analysis(data, analysis_type)
                
                response = {
                    "status": "success",
                    "agent_id": self.agent_id,
                    "agent_type": self.agent_type,
                    "message_type": "data_analysis_response",
                    "analysis_results": analysis_result.get("analysis_content", ""),
                    "statistical_metrics": analysis_result.get("metrics", {}),
                    "timestamp": datetime.now().isoformat()
                }
                
            else:
                # Generic analysis request
                content = message.get("content", str(message))
                
                analysis_result = await self.perform_general_analysis(content)
                
                response = {
                    "status": "success",
                    "agent_id": self.agent_id,
                    "agent_type": self.agent_type,
                    "message_type": "general_analysis_response",
                    "analysis": analysis_result.get("analysis_content", ""),
                    "timestamp": datetime.now().isoformat()
                }
            
            duration = time.time() - start_time
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "communication_success": True,
                        "response_type": response.get("message_type", "unknown")
                    })
                    trace.add_metric("communication_duration_seconds", duration)
                    trace.add_metric("response_length", len(str(response)))
                    
                    await trace.finish_async()
                    logger.debug("Incoming communication trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize incoming communication trace: {e}")
            
            logger.info(f"Handled incoming communication from {request_data.get('from_agent_id', 'unknown')}")
            return response
            
        except Exception as e:
            logger.error(f"Failed to handle incoming communication: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in incoming communication trace: {trace_error}")
            
            return {
                "status": "error",
                "agent_id": self.agent_id,
                "agent_type": self.agent_type,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def analyze_research_findings(self, task_description: str, research_findings: str) -> Dict[str, Any]:
        """
        Analyze research findings with comprehensive insights generation.
        
        Args:
            task_description: The original research task
            research_findings: Research findings to analyze
            
        Returns:
            Analysis results with insights and confidence scores
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for research analysis
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="research_findings_analysis",
                    client=self.sprintlens_client,
                    project_name="AnalysisAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "analysis_type": "research_findings",
                        "findings_length": str(len(research_findings))
                    },
                    metadata={
                        "task_description": task_description[:500],
                        "research_findings_length": len(research_findings),
                        "agent_type": self.agent_type
                    },
                    input_data={
                        "task_description": task_description,
                        "research_findings": research_findings[:1000]  # Truncate for safety
                    }
                )
                logger.debug(f"Created research analysis trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create research analysis trace: {e}")
                trace = None
        
        try:
            # Prepare analysis prompt
            analysis_prompt = f"""Analyze the following research findings for the task: "{task_description}"

Research Findings:
{research_findings}

Provide comprehensive analysis including:
1. Key insights and patterns identified
2. Quality assessment of the research
3. Gap analysis - what's missing or needs deeper investigation
4. Confidence assessment of findings (0.0-1.0 scale)
5. Recommendations for additional research directions
6. Critical evaluation of methodology or approach
7. Potential biases or limitations identified

Please be thorough and provide actionable insights."""
            
            # Perform analysis using Azure OpenAI
            analysis_result = await self._analyze_with_openai(analysis_prompt)
            
            # Extract insights (simplified for demo)
            insights = [
                "Quality assessment completed",
                "Gap analysis performed",
                "Confidence scoring applied",
                "Additional research directions identified"
            ]
            
            duration = time.time() - start_time
            
            result = {
                "task_description": task_description,
                "analysis_content": analysis_result["content"],
                "confidence_score": 0.85,  # Simplified for demo
                "insights": insights,
                "model_used": analysis_result["model"],
                "tokens_used": analysis_result["usage"]["total_tokens"],
                "prompt_tokens": analysis_result["usage"]["prompt_tokens"],
                "completion_tokens": analysis_result["usage"]["completion_tokens"],
                "analysis_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "agent_id": self.agent_id
            }
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "analysis_success": True,
                        "confidence_score": result["confidence_score"],
                        "insights_count": len(insights)
                    })
                    trace.add_metric("analysis_duration_seconds", duration)
                    trace.add_metric("prompt_tokens", result["prompt_tokens"])
                    trace.add_metric("completion_tokens", result["completion_tokens"])
                    trace.add_metric("total_tokens", result["tokens_used"])
                    trace.add_metric("confidence_score", result["confidence_score"])
                    
                    # Calculate cost
                    estimated_cost = self._calculate_cost(analysis_result["usage"])
                    trace.add_metric("estimated_cost_usd", estimated_cost)
                    
                    await trace.finish_async()
                    logger.debug("Research analysis trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize research analysis trace: {e}")
            
            logger.info(f"Research findings analysis completed - Confidence: {result['confidence_score']:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Research findings analysis failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in research analysis trace: {trace_error}")
            
            return {
                "task_description": task_description,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "agent_id": self.agent_id
            }
    
    async def perform_data_analysis(self, data: Dict[str, Any], analysis_type: str = "general") -> Dict[str, Any]:
        """
        Perform comprehensive data analysis with statistical methods.
        
        Args:
            data: Data to analyze
            analysis_type: Type of analysis to perform
            
        Returns:
            Analysis results with statistical metrics
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for data analysis
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="data_analysis",
                    client=self.sprintlens_client,
                    project_name="AnalysisAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "analysis_type": analysis_type,
                        "data_size": str(len(str(data)))
                    },
                    metadata={
                        "analysis_type": analysis_type,
                        "data_keys": list(data.keys()) if isinstance(data, dict) else [],
                        "agent_type": self.agent_type
                    },
                    input_data={
                        "analysis_type": analysis_type,
                        "data_summary": str(data)[:500]  # Truncate for safety
                    }
                )
                logger.debug(f"Created data analysis trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create data analysis trace: {e}")
                trace = None
        
        try:
            # Prepare data analysis prompt
            data_summary = json.dumps(data, indent=2) if isinstance(data, (dict, list)) else str(data)
            
            analysis_prompt = f"""Perform {analysis_type} data analysis on the following dataset:

Data:
{data_summary}

Please provide:
1. Data structure and quality assessment
2. Statistical summary and key metrics
3. Pattern identification and trend analysis
4. Anomaly detection results
5. Data insights and interpretation
6. Recommendations based on findings
7. Confidence intervals where applicable

Be thorough and provide actionable insights with statistical backing."""
            
            # Perform analysis using Azure OpenAI
            analysis_result = await self._analyze_with_openai(analysis_prompt)
            
            # Generate mock statistical metrics (in real implementation, use actual statistical libraries)
            statistical_metrics = {
                "data_points": len(str(data)),
                "analysis_confidence": 0.87,
                "quality_score": 0.92,
                "anomaly_count": 2,
                "trend_strength": 0.74
            }
            
            duration = time.time() - start_time
            
            result = {
                "analysis_type": analysis_type,
                "analysis_content": analysis_result["content"],
                "metrics": statistical_metrics,
                "model_used": analysis_result["model"],
                "tokens_used": analysis_result["usage"]["total_tokens"],
                "prompt_tokens": analysis_result["usage"]["prompt_tokens"],
                "completion_tokens": analysis_result["usage"]["completion_tokens"],
                "analysis_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "agent_id": self.agent_id
            }
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "analysis_success": True,
                        "statistical_metrics": statistical_metrics
                    })
                    trace.add_metric("analysis_duration_seconds", duration)
                    trace.add_metric("prompt_tokens", result["prompt_tokens"])
                    trace.add_metric("completion_tokens", result["completion_tokens"])
                    trace.add_metric("total_tokens", result["tokens_used"])
                    trace.add_metric("analysis_confidence", statistical_metrics["analysis_confidence"])
                    
                    # Calculate cost
                    estimated_cost = self._calculate_cost(analysis_result["usage"])
                    trace.add_metric("estimated_cost_usd", estimated_cost)
                    
                    await trace.finish_async()
                    logger.debug("Data analysis trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize data analysis trace: {e}")
            
            logger.info(f"Data analysis completed - Type: {analysis_type}, Confidence: {statistical_metrics['analysis_confidence']:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Data analysis failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in data analysis trace: {trace_error}")
            
            return {
                "analysis_type": analysis_type,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "agent_id": self.agent_id
            }
    
    async def perform_general_analysis(self, content: str) -> Dict[str, Any]:
        """
        Perform general analysis on provided content.
        
        Args:
            content: Content to analyze
            
        Returns:
            General analysis results
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for general analysis
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="general_analysis",
                    client=self.sprintlens_client,
                    project_name="AnalysisAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "analysis_type": "general",
                        "content_length": str(len(content))
                    },
                    metadata={
                        "content_length": len(content),
                        "agent_type": self.agent_type
                    },
                    input_data={
                        "content": content[:500]  # Truncate for safety
                    }
                )
                logger.debug(f"Created general analysis trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create general analysis trace: {e}")
                trace = None
        
        try:
            # Prepare general analysis prompt
            analysis_prompt = f"""Perform comprehensive analysis on the following content:

Content:
{content}

Please provide:
1. Content structure and organization assessment
2. Key themes and concepts identified
3. Sentiment and tone analysis
4. Quality and credibility evaluation
5. Insights and interpretations
6. Recommendations for improvement or next steps

Provide thorough and actionable analysis."""
            
            # Perform analysis using Azure OpenAI
            analysis_result = await self._analyze_with_openai(analysis_prompt)
            
            duration = time.time() - start_time
            
            result = {
                "analysis_content": analysis_result["content"],
                "content_length": len(content),
                "model_used": analysis_result["model"],
                "tokens_used": analysis_result["usage"]["total_tokens"],
                "prompt_tokens": analysis_result["usage"]["prompt_tokens"],
                "completion_tokens": analysis_result["usage"]["completion_tokens"],
                "analysis_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "agent_id": self.agent_id
            }
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "analysis_success": True,
                        "content_analyzed": len(content)
                    })
                    trace.add_metric("analysis_duration_seconds", duration)
                    trace.add_metric("prompt_tokens", result["prompt_tokens"])
                    trace.add_metric("completion_tokens", result["completion_tokens"])
                    trace.add_metric("total_tokens", result["tokens_used"])
                    trace.add_metric("content_length", len(content))
                    
                    # Calculate cost
                    estimated_cost = self._calculate_cost(analysis_result["usage"])
                    trace.add_metric("estimated_cost_usd", estimated_cost)
                    
                    await trace.finish_async()
                    logger.debug("General analysis trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize general analysis trace: {e}")
            
            logger.info(f"General analysis completed - Content length: {len(content)}")
            return result
            
        except Exception as e:
            logger.error(f"General analysis failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in general analysis trace: {trace_error}")
            
            return {
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "agent_id": self.agent_id
            }
    
    async def _analyze_with_openai(self, prompt: str) -> Dict[str, Any]:
        """
        Analyze text using Azure OpenAI with detailed tracing.
        
        Args:
            prompt: The analysis prompt
            
        Returns:
            Analysis result from Azure OpenAI
        """
        try:
            # Get current trace for adding metadata
            current_trace = sprintlens.get_current_trace()
            if current_trace:
                current_trace.add_tag("llm_provider", "azure_openai")
                current_trace.add_tag("model", self.deployment_name)
                current_trace.add_tag("agent_type", self.agent_type)
            
            # Prepare messages
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": prompt}
            ]
            
            # Make the API call
            response = self.openai_client.chat.completions.create(
                model=self.deployment_name,
                messages=messages,
                temperature=0.2,  # Lower temperature for analysis precision
                max_tokens=2000
            )
            
            # Extract response data
            result = {
                "content": response.choices[0].message.content,
                "model": response.model,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                },
                "finish_reason": response.choices[0].finish_reason
            }
            
            # Add trace metadata
            if current_trace:
                current_trace.set_metadata("llm_response", result)
                current_trace.add_metric("prompt_tokens", result["usage"]["prompt_tokens"])
                current_trace.add_metric("completion_tokens", result["usage"]["completion_tokens"])
                current_trace.add_metric("total_tokens", result["usage"]["total_tokens"])
                
                # Estimate cost
                estimated_cost = self._calculate_cost(result["usage"])
                current_trace.add_metric("estimated_cost_usd", estimated_cost)
            
            return result
            
        except Exception as e:
            if current_trace:
                current_trace.set_error(e)
            raise
    
    def _calculate_cost(self, usage: Dict[str, int]) -> float:
        """Calculate estimated cost for Azure OpenAI usage."""
        # Approximate Azure OpenAI GPT-4 pricing
        prompt_cost_per_1k = 0.03
        completion_cost_per_1k = 0.06
        
        prompt_cost = (usage["prompt_tokens"] / 1000) * prompt_cost_per_1k
        completion_cost = (usage["completion_tokens"] / 1000) * completion_cost_per_1k
        
        return round(prompt_cost + completion_cost, 6)
    
    def register_known_agent(self, agent_name: str, agent_url: str):
        """Register a known agent for communication."""
        self.known_agents[agent_name] = agent_url
        logger.info(f"Registered agent: {agent_name} at {agent_url}")
    
    def get_communication_history(self) -> List[Dict[str, Any]]:
        """Get the complete communication history."""
        return self.communication_history.copy()
    
    async def start_server(self):
        """Start the FastAPI server for receiving communications."""
        config = uvicorn.Config(
            self.app,
            host="0.0.0.0",
            port=self.agent_port,
            log_level="info"
        )
        server = uvicorn.Server(config)
        await server.serve()


async def main():
    """Main function to demonstrate the Analysis Agent."""
    print("📊 Analysis Agent with Sprint Agent Lens Integration")
    print("=" * 60)
    
    try:
        # Initialize the analysis agent
        print("Initializing Analysis Agent...")
        analysis_agent = AnalysisAgent(agent_port=8002)
        print("✅ Analysis Agent initialized successfully!")
        
        # Register known agents for collaboration
        analysis_agent.register_known_agent("ResearchAgent", "http://localhost:8001")
        
        # Test local analysis capabilities
        print("\n🔄 Testing analysis capabilities...")
        
        # Test research findings analysis
        sample_research = """
        Recent studies show that AI adoption in healthcare has increased by 300% over the past 2 years.
        Key areas include diagnostic imaging, drug discovery, and patient monitoring systems.
        Major challenges remain around data privacy, regulatory compliance, and integration with existing systems.
        """
        
        analysis_result = await analysis_agent.analyze_research_findings(
            task_description="AI in healthcare trends analysis",
            research_findings=sample_research
        )
        
        if analysis_result["success"]:
            print("✅ Research analysis completed successfully!")
            print(f"   Confidence score: {analysis_result.get('confidence_score', 0):.2f}")
            print(f"   Tokens used: {analysis_result['tokens_used']}")
        else:
            print(f"⚠️ Research analysis had issues: {analysis_result.get('error', 'Unknown error')}")
        
        # Display communication history
        comm_history = analysis_agent.get_communication_history()
        print(f"\n📡 Communication History: {len(comm_history)} interactions")
        
        # Summary
        print(f"\n📈 Analysis Agent Summary:")
        print(f"   Agent ID: {analysis_agent.agent_id}")
        print(f"   Agent Type: {analysis_agent.agent_type}")
        print(f"   Server Port: {analysis_agent.agent_port}")
        print(f"   Known Agents: {len(analysis_agent.known_agents)}")
        print(f"   Sprint Lens client: {'✅ Connected' if analysis_agent.sprintlens_client else '❌ Not connected'}")
        
        print(f"\n🚀 Starting Analysis Agent server on port {analysis_agent.agent_port}...")
        print(f"   Health check: http://localhost:{analysis_agent.agent_port}/health")
        print(f"   Status endpoint: http://localhost:{analysis_agent.agent_port}/status")
        print(f"   Analysis endpoint: http://localhost:{analysis_agent.agent_port}/analyze")
        
        # Start the server
        await analysis_agent.start_server()
        
    except Exception as e:
        print(f"❌ Error running Analysis Agent: {e}")
        logger.error(f"Main execution failed: {e}", exc_info=True)
        return 1
    
    return 0


if __name__ == "__main__":
    # Run the main function
    exit_code = asyncio.run(main())
    sys.exit(exit_code)