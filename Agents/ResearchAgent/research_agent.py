#!/usr/bin/env python3
"""
Research Agent with Sprint Agent Lens Integration

A specialized research agent capable of autonomous communication with other agents.
Provides comprehensive research capabilities including web search, data analysis,
and report generation with full Sprint Lens observability.
"""

import asyncio
import os
import sys
import json
import time
import uuid
import requests
import aiohttp
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import logging

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


class ResearchAgent:
    """
    A research agent specialized in autonomous communication and comprehensive research tasks.
    
    Features:
    - Azure OpenAI integration for research analysis
    - Autonomous agent communication via HTTP APIs
    - Web search and data collection capabilities
    - Complete observability and tracing
    - Research report generation
    - Inter-agent communication protocols
    """
    
    def __init__(self, agent_port: int = 8001):
        """Initialize the Research Agent with communication capabilities."""
        self.agent_id = str(uuid.uuid4())
        self.agent_type = "ResearchAgent"
        self.agent_port = agent_port
        self.communication_history = []
        
        # Initialize Azure OpenAI client
        self._setup_azure_openai()
        
        # Initialize Sprint Lens client
        self._setup_sprintlens()
        
        # Agent configuration
        self.system_prompt = """You are a specialized Research Agent with the following capabilities:
        - Conduct comprehensive research on given topics
        - Analyze and synthesize information from multiple sources
        - Generate detailed research reports
        - Communicate autonomously with other agents
        - Provide evidence-based insights and recommendations
        
        Your research should be thorough, accurate, and well-structured. Always cite sources and provide context."""
        
        # Communication endpoints for other agents
        self.known_agents = {}
        
        logger.info(f"ResearchAgent initialized with ID: {self.agent_id} on port {self.agent_port}")
    
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
                project_name="ResearchAgent_Autonomous"
            )
            logger.info("Sprint Lens client configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure Sprint Lens client: {e}")
            self.sprintlens_client = None
    
    async def conduct_research(self, research_topic: str, depth: str = "comprehensive") -> Dict[str, Any]:
        """
        Conduct comprehensive research on a given topic with full tracing.
        
        Args:
            research_topic: The topic to research
            depth: Research depth ('basic', 'comprehensive', 'expert')
            
        Returns:
            Research results with findings and analysis
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for research
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="research_conduct",
                    client=self.sprintlens_client,
                    project_name="ResearchAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "research_depth": depth,
                        "research_topic_length": str(len(research_topic))
                    },
                    metadata={
                        "research_topic": research_topic[:500],
                        "agent_type": self.agent_type,
                        "research_depth": depth
                    },
                    input_data={
                        "research_topic": research_topic,
                        "depth": depth
                    }
                )
                logger.debug(f"Created research trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create research trace: {e}")
                trace = None
        
        try:
            # Prepare research prompt based on depth
            research_prompts = {
                "basic": f"Provide a basic overview and key points about: {research_topic}",
                "comprehensive": f"""Conduct comprehensive research on: {research_topic}
                Include:
                1. Executive summary
                2. Key findings and insights
                3. Current trends and developments
                4. Potential implications and applications
                5. Recommendations for further investigation
                """,
                "expert": f"""Conduct expert-level research and analysis on: {research_topic}
                Provide:
                1. Detailed technical analysis
                2. Critical evaluation of current approaches
                3. Identification of knowledge gaps
                4. Future research directions
                5. Actionable recommendations with implementation details
                """
            }
            
            research_prompt = research_prompts.get(depth, research_prompts["comprehensive"])
            
            # Conduct research using Azure OpenAI
            research_result = await self._analyze_with_openai(research_prompt)
            
            # Generate research metrics
            duration = time.time() - start_time
            
            result = {
                "research_topic": research_topic,
                "research_depth": depth,
                "findings": research_result["content"],
                "model_used": research_result["model"],
                "tokens_used": research_result["usage"]["total_tokens"],
                "prompt_tokens": research_result["usage"]["prompt_tokens"],
                "completion_tokens": research_result["usage"]["completion_tokens"],
                "research_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "agent_id": self.agent_id
            }
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "research_findings_length": len(result["findings"]),
                        "success": True
                    })
                    trace.add_metric("research_duration_seconds", duration)
                    trace.add_metric("prompt_tokens", result["prompt_tokens"])
                    trace.add_metric("completion_tokens", result["completion_tokens"])
                    trace.add_metric("total_tokens", result["tokens_used"])
                    
                    # Calculate research cost
                    estimated_cost = self._calculate_cost(research_result["usage"])
                    trace.add_metric("estimated_cost_usd", estimated_cost)
                    
                    await trace.finish_async()
                    logger.debug("Research trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize research trace: {e}")
            
            logger.info(f"Research completed - Topic: {research_topic[:50]}..., Tokens: {result['tokens_used']}")
            return result
            
        except Exception as e:
            logger.error(f"Research failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in research trace: {trace_error}")
            
            return {
                "research_topic": research_topic,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "agent_id": self.agent_id
            }
    
    async def communicate_with_agent(self, target_agent_url: str, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Communicate with another agent autonomously with full tracing.
        
        Args:
            target_agent_url: URL endpoint of the target agent
            message: Message payload to send
            
        Returns:
            Communication result and response
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for inter-agent communication
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="inter_agent_communication",
                    client=self.sprintlens_client,
                    project_name="ResearchAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "target_agent": target_agent_url,
                        "communication_type": "outbound"
                    },
                    metadata={
                        "target_agent_url": target_agent_url,
                        "message_type": message.get("type", "unknown"),
                        "agent_type": self.agent_type
                    },
                    input_data={
                        "target_agent_url": target_agent_url,
                        "message": message
                    }
                )
                logger.debug(f"Created communication trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create communication trace: {e}")
                trace = None
        
        try:
            # Prepare communication payload
            communication_payload = {
                "from_agent_id": self.agent_id,
                "from_agent_type": self.agent_type,
                "timestamp": datetime.now().isoformat(),
                "message": message
            }
            
            # Send message to target agent
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    target_agent_url,
                    json=communication_payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    response_data = await response.json()
                    
                    duration = time.time() - start_time
                    
                    result = {
                        "target_agent_url": target_agent_url,
                        "message_sent": message,
                        "response_received": response_data,
                        "status_code": response.status,
                        "communication_duration_seconds": duration,
                        "timestamp": datetime.now().isoformat(),
                        "success": response.status == 200,
                        "agent_id": self.agent_id
                    }
                    
                    # Store communication in history
                    self.communication_history.append({
                        "direction": "outbound",
                        "target": target_agent_url,
                        "message": message,
                        "response": response_data,
                        "timestamp": datetime.now().isoformat(),
                        "success": result["success"]
                    })
                    
                    # Add metrics to trace
                    if trace:
                        try:
                            trace.set_output({
                                "communication_success": result["success"],
                                "status_code": response.status
                            })
                            trace.add_metric("communication_duration_seconds", duration)
                            trace.add_metric("response_status_code", response.status)
                            
                            await trace.finish_async()
                            logger.debug("Communication trace completed successfully")
                        except Exception as e:
                            logger.error(f"Failed to finalize communication trace: {e}")
                    
                    logger.info(f"Agent communication - Target: {target_agent_url}, Status: {response.status}")
                    return result
                    
        except Exception as e:
            logger.error(f"Agent communication failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in communication trace: {trace_error}")
            
            return {
                "target_agent_url": target_agent_url,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "agent_id": self.agent_id
            }
    
    async def generate_research_report(self, research_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate a comprehensive research report from multiple research results.
        
        Args:
            research_results: List of research findings to synthesize
            
        Returns:
            Generated research report with analysis
        """
        start_time = time.time()
        
        # Create Sprint Lens trace for report generation
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="research_report_generation",
                    client=self.sprintlens_client,
                    project_name="ResearchAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "research_count": str(len(research_results)),
                        "report_type": "comprehensive"
                    },
                    metadata={
                        "research_results_count": len(research_results),
                        "agent_type": self.agent_type
                    },
                    input_data={
                        "research_results_count": len(research_results),
                        "research_topics": [r.get("research_topic", "unknown") for r in research_results]
                    }
                )
                logger.debug(f"Created report generation trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create report trace: {e}")
                trace = None
        
        try:
            # Prepare report synthesis prompt
            report_prompt = f"""Synthesize the following research findings into a comprehensive report:

Research Results:
{json.dumps([{
    'topic': r.get('research_topic', 'Unknown'),
    'findings': r.get('findings', '')[:1000],  # Truncate for prompt
    'success': r.get('success', False)
} for r in research_results], indent=2)}

Please provide a comprehensive report with:
1. Executive Summary
2. Key Findings Synthesis
3. Cross-Research Analysis
4. Insights and Patterns
5. Recommendations and Next Steps

Ensure the report is well-structured and actionable."""
            
            # Generate report using Azure OpenAI
            report_result = await self._analyze_with_openai(report_prompt)
            
            duration = time.time() - start_time
            
            result = {
                "report_content": report_result["content"],
                "research_results_count": len(research_results),
                "successful_research_count": sum(1 for r in research_results if r.get("success", False)),
                "model_used": report_result["model"],
                "tokens_used": report_result["usage"]["total_tokens"],
                "prompt_tokens": report_result["usage"]["prompt_tokens"],
                "completion_tokens": report_result["usage"]["completion_tokens"],
                "report_generation_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": True,
                "agent_id": self.agent_id
            }
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "report_length": len(result["report_content"]),
                        "success": True
                    })
                    trace.add_metric("report_duration_seconds", duration)
                    trace.add_metric("prompt_tokens", result["prompt_tokens"])
                    trace.add_metric("completion_tokens", result["completion_tokens"])
                    trace.add_metric("total_tokens", result["tokens_used"])
                    trace.add_metric("research_results_processed", len(research_results))
                    
                    # Calculate cost
                    estimated_cost = self._calculate_cost(report_result["usage"])
                    trace.add_metric("estimated_cost_usd", estimated_cost)
                    
                    await trace.finish_async()
                    logger.debug("Report generation trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize report trace: {e}")
            
            logger.info(f"Research report generated - {len(research_results)} sources, Tokens: {result['tokens_used']}")
            return result
            
        except Exception as e:
            logger.error(f"Report generation failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in report trace: {trace_error}")
            
            return {
                "error": str(e),
                "research_results_count": len(research_results),
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
                temperature=0.3,  # Lower temperature for research accuracy
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
    
    async def autonomous_research_task(self, task_description: str, collaboration_agents: List[str] = None) -> Dict[str, Any]:
        """
        Execute an autonomous research task, potentially collaborating with other agents.
        
        Args:
            task_description: Description of the research task
            collaboration_agents: List of agent URLs to collaborate with
            
        Returns:
            Complete task results with all traces
        """
        start_time = time.time()
        
        # Create master trace for the entire autonomous task
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="autonomous_research_task",
                    client=self.sprintlens_client,
                    project_name="ResearchAgent_Autonomous",
                    tags={
                        "agent_id": str(self.agent_id),
                        "task_type": "autonomous_research",
                        "collaboration_count": str(len(collaboration_agents) if collaboration_agents else 0)
                    },
                    metadata={
                        "task_description": task_description[:500],
                        "agent_type": self.agent_type,
                        "collaboration_agents": collaboration_agents
                    },
                    input_data={
                        "task_description": task_description,
                        "collaboration_agents": collaboration_agents
                    }
                )
                logger.debug(f"Created autonomous task trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create autonomous task trace: {e}")
                trace = None
        
        try:
            # Step 1: Conduct initial research
            logger.info(f"Starting autonomous research task: {task_description[:100]}...")
            initial_research = await self.conduct_research(task_description, depth="comprehensive")
            
            research_results = [initial_research] if initial_research["success"] else []
            
            # Step 2: Collaborate with other agents if specified
            collaboration_responses = []
            if collaboration_agents:
                for agent_url in collaboration_agents:
                    collaboration_message = {
                        "type": "research_collaboration",
                        "task_description": task_description,
                        "my_findings": initial_research.get("findings", ""),
                        "requesting_additional_analysis": True
                    }
                    
                    comm_result = await self.communicate_with_agent(agent_url, collaboration_message)
                    collaboration_responses.append(comm_result)
                    
                    # If communication was successful and we got research back
                    if comm_result["success"] and "research_findings" in comm_result.get("response_received", {}):
                        additional_research = {
                            "research_topic": f"Collaboration with {agent_url}",
                            "findings": comm_result["response_received"]["research_findings"],
                            "success": True,
                            "agent_id": agent_url
                        }
                        research_results.append(additional_research)
            
            # Step 3: Generate final report
            final_report = await self.generate_research_report(research_results)
            
            # Compile final results
            duration = time.time() - start_time
            
            result = {
                "task_description": task_description,
                "initial_research": initial_research,
                "collaboration_responses": collaboration_responses,
                "final_report": final_report,
                "total_research_sources": len(research_results),
                "total_tokens_used": sum(r.get("tokens_used", 0) for r in research_results if r.get("success", False)),
                "task_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": final_report.get("success", False),
                "agent_id": self.agent_id
            }
            
            # Add metrics to master trace
            if trace:
                try:
                    trace.set_output({
                        "task_success": result["success"],
                        "research_sources": len(research_results),
                        "collaboration_count": len(collaboration_responses)
                    })
                    trace.add_metric("task_duration_seconds", duration)
                    trace.add_metric("total_tokens_used", result["total_tokens_used"])
                    trace.add_metric("research_sources_count", len(research_results))
                    trace.add_metric("collaboration_count", len(collaboration_responses))
                    
                    await trace.finish_async()
                    logger.debug("Autonomous task trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize autonomous task trace: {e}")
            
            logger.info(f"Autonomous research task completed - Duration: {duration:.2f}s, Sources: {len(research_results)}")
            return result
            
        except Exception as e:
            logger.error(f"Autonomous research task failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in autonomous task trace: {trace_error}")
            
            return {
                "task_description": task_description,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "agent_id": self.agent_id
            }


async def main():
    """Main function to demonstrate the Research Agent."""
    print("🔬 Research Agent with Sprint Agent Lens Integration")
    print("=" * 60)
    
    try:
        # Initialize the research agent
        print("Initializing Research Agent...")
        research_agent = ResearchAgent(agent_port=8001)
        print("✅ Research Agent initialized successfully!")
        
        # Register known agents for collaboration
        research_agent.register_known_agent("AnalysisAgent", "http://localhost:8002/analyze")
        
        # Execute autonomous research task
        print("\n🔄 Executing autonomous research task...")
        task_result = await research_agent.autonomous_research_task(
            task_description="Analyze the current state and future trends of artificial intelligence in healthcare",
            collaboration_agents=["http://localhost:8002/analyze"]  # Will communicate with Analysis Agent
        )
        
        if task_result["success"]:
            print("✅ Autonomous research task completed successfully!")
            print(f"   Research sources: {task_result['total_research_sources']}")
            print(f"   Total tokens used: {task_result['total_tokens_used']}")
        else:
            print(f"⚠️ Research task had issues: {task_result.get('error', 'Unknown error')}")
        
        # Display communication history
        comm_history = research_agent.get_communication_history()
        print(f"\n📡 Communication History: {len(comm_history)} interactions")
        
        # Summary
        print(f"\n📈 Research Agent Summary:")
        print(f"   Agent ID: {research_agent.agent_id}")
        print(f"   Agent Type: {research_agent.agent_type}")
        print(f"   Known Agents: {len(research_agent.known_agents)}")
        print(f"   Sprint Lens client: {'✅ Connected' if research_agent.sprintlens_client else '❌ Not connected'}")
        
        print(f"\n🎉 Research Agent demonstration completed!")
        print(f"   Check the Sprint Agent Lens dashboard for detailed traces and metrics.")
        
    except Exception as e:
        print(f"❌ Error running Research Agent: {e}")
        logger.error(f"Main execution failed: {e}", exc_info=True)
        return 1
    
    return 0


if __name__ == "__main__":
    # Run the main function
    exit_code = asyncio.run(main())
    sys.exit(exit_code)