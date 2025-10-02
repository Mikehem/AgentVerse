#!/usr/bin/env python3
"""
Agent Orchestrator for Autonomous Communication

Orchestrates communication between multiple agents to accomplish complex tasks.
Provides comprehensive Sprint Lens tracing for all inter-agent interactions.
"""

import asyncio
import os
import sys
import json
import time
import uuid
import signal
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import logging
import subprocess
import threading

# Environment and configuration
from dotenv import load_dotenv

# Add Sprint Lens SDK to path (for local development)
sdk_path = Path(__file__).parent.parent.parent / "Sprint_Lens_SDK" / "src"
sys.path.insert(0, str(sdk_path))

# Sprint Lens SDK imports
import sprintlens
from sprintlens import track, Trace, SprintLensClient

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Orchestrator for managing autonomous agent communications.
    
    Features:
    - Launch and manage multiple agents
    - Coordinate inter-agent communication
    - Task delegation and result aggregation
    - Comprehensive Sprint Lens tracing
    - Agent health monitoring
    """
    
    def __init__(self):
        """Initialize the Agent Orchestrator."""
        self.orchestrator_id = str(uuid.uuid4())
        self.running_agents = {}
        self.communication_log = []
        self.task_history = []
        
        # Initialize Sprint Lens client
        self._setup_sprintlens()
        
        # Agent configurations
        self.agent_configs = {
            "research": {
                "script_path": Path(__file__).parent / "ResearchAgent" / "research_agent.py",
                "port": 8001,
                "url": "http://localhost:8001",
                "process": None
            },
            "analysis": {
                "script_path": Path(__file__).parent / "AnalysisAgent" / "analysis_agent.py",
                "port": 8002,
                "url": "http://localhost:8002/analyze",
                "process": None
            }
        }
        
        logger.info(f"AgentOrchestrator initialized with ID: {self.orchestrator_id}")
    
    def _setup_sprintlens(self):
        """Setup Sprint Lens client for observability."""
        try:
            self.sprintlens_client = sprintlens.configure(
                url=os.getenv("SPRINTLENS_URL", "http://localhost:3000"),
                username=os.getenv("SPRINTLENS_USERNAME", "admin"),
                password=os.getenv("SPRINTLENS_PASSWORD", "MasterAdmin2024!"),
                workspace_id=os.getenv("SPRINTLENS_WORKSPACE_ID", "default"),
                project_name="AgentOrchestrator_Autonomous"
            )
            logger.info("Sprint Lens client configured successfully")
        except Exception as e:
            logger.error(f"Failed to configure Sprint Lens client: {e}")
            self.sprintlens_client = None
    
    async def start_agent(self, agent_name: str) -> bool:
        """
        Start an agent process with full tracing.
        
        Args:
            agent_name: Name of the agent to start
            
        Returns:
            True if agent started successfully
        """
        if agent_name not in self.agent_configs:
            logger.error(f"Unknown agent: {agent_name}")
            return False
        
        start_time = time.time()
        
        # Create Sprint Lens trace for agent startup
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="agent_startup",
                    client=self.sprintlens_client,
                    project_name="AgentOrchestrator_Autonomous",
                    tags={
                        "orchestrator_id": str(self.orchestrator_id),
                        "agent_name": agent_name,
                        "startup_type": "subprocess"
                    },
                    metadata={
                        "agent_name": agent_name,
                        "agent_port": self.agent_configs[agent_name]["port"],
                        "orchestrator_type": "AgentOrchestrator"
                    },
                    input_data={
                        "agent_name": agent_name,
                        "script_path": str(self.agent_configs[agent_name]["script_path"])
                    }
                )
                logger.debug(f"Created agent startup trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create agent startup trace: {e}")
                trace = None
        
        try:
            config = self.agent_configs[agent_name]
            
            # Check if agent is already running
            if agent_name in self.running_agents:
                logger.warning(f"Agent {agent_name} is already running")
                if trace:
                    trace.set_output({"startup_success": True, "already_running": True})
                    await trace.finish_async()
                return True
            
            # Start the agent process
            process = subprocess.Popen([
                sys.executable,
                str(config["script_path"])
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            # Wait a moment for the process to start
            await asyncio.sleep(2)
            
            # Check if process is still running
            if process.poll() is None:
                self.running_agents[agent_name] = {
                    "process": process,
                    "start_time": datetime.now().isoformat(),
                    "port": config["port"],
                    "url": config["url"]
                }
                
                duration = time.time() - start_time
                
                # Add metrics to trace
                if trace:
                    try:
                        trace.set_output({
                            "startup_success": True,
                            "agent_pid": process.pid,
                            "agent_port": config["port"]
                        })
                        trace.add_metric("startup_duration_seconds", duration)
                        trace.add_metric("agent_pid", process.pid)
                        trace.add_metric("agent_port", config["port"])
                        
                        await trace.finish_async()
                        logger.debug("Agent startup trace completed successfully")
                    except Exception as e:
                        logger.error(f"Failed to finalize agent startup trace: {e}")
                
                logger.info(f"Agent {agent_name} started successfully (PID: {process.pid})")
                return True
            else:
                stdout, stderr = process.communicate()
                error_msg = f"Agent {agent_name} failed to start. STDERR: {stderr}"
                logger.error(error_msg)
                
                if trace:
                    trace.set_error(Exception(error_msg))
                    await trace.finish_async()
                
                return False
                
        except Exception as e:
            logger.error(f"Failed to start agent {agent_name}: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in agent startup trace: {trace_error}")
            
            return False
    
    async def stop_agent(self, agent_name: str) -> bool:
        """
        Stop an agent process with full tracing.
        
        Args:
            agent_name: Name of the agent to stop
            
        Returns:
            True if agent stopped successfully
        """
        if agent_name not in self.running_agents:
            logger.warning(f"Agent {agent_name} is not running")
            return True
        
        start_time = time.time()
        
        # Create Sprint Lens trace for agent shutdown
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="agent_shutdown",
                    client=self.sprintlens_client,
                    project_name="AgentOrchestrator_Autonomous",
                    tags={
                        "orchestrator_id": str(self.orchestrator_id),
                        "agent_name": agent_name,
                        "shutdown_type": "graceful"
                    },
                    metadata={
                        "agent_name": agent_name,
                        "orchestrator_type": "AgentOrchestrator"
                    },
                    input_data={
                        "agent_name": agent_name
                    }
                )
                logger.debug(f"Created agent shutdown trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create agent shutdown trace: {e}")
                trace = None
        
        try:
            agent_info = self.running_agents[agent_name]
            process = agent_info["process"]
            
            # Graceful shutdown
            process.terminate()
            
            # Wait for graceful shutdown
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                # Force kill if graceful shutdown fails
                process.kill()
                process.wait()
            
            # Remove from running agents
            del self.running_agents[agent_name]
            
            duration = time.time() - start_time
            
            # Add metrics to trace
            if trace:
                try:
                    trace.set_output({
                        "shutdown_success": True,
                        "graceful_shutdown": True
                    })
                    trace.add_metric("shutdown_duration_seconds", duration)
                    
                    await trace.finish_async()
                    logger.debug("Agent shutdown trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize agent shutdown trace: {e}")
            
            logger.info(f"Agent {agent_name} stopped successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop agent {agent_name}: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in agent shutdown trace: {trace_error}")
            
            return False
    
    async def orchestrate_collaborative_task(self, task_description: str) -> Dict[str, Any]:
        """
        Orchestrate a collaborative task between Research and Analysis agents.
        
        Args:
            task_description: Description of the task to accomplish
            
        Returns:
            Complete task results with all agent interactions
        """
        start_time = time.time()
        task_id = str(uuid.uuid4())
        
        # Create master trace for the entire collaborative task
        trace = None
        if self.sprintlens_client:
            try:
                from sprintlens.tracing.trace import Trace
                trace = Trace(
                    name="collaborative_task_orchestration",
                    client=self.sprintlens_client,
                    project_name="AgentOrchestrator_Autonomous",
                    tags={
                        "orchestrator_id": str(self.orchestrator_id),
                        "task_id": task_id,
                        "collaboration_type": "research_analysis",
                        "agents_involved": "2"
                    },
                    metadata={
                        "task_description": task_description[:500],
                        "orchestrator_type": "AgentOrchestrator",
                        "agents_involved": ["research", "analysis"]
                    },
                    input_data={
                        "task_description": task_description,
                        "task_id": task_id
                    }
                )
                logger.debug(f"Created collaborative task trace: {trace.id}")
            except Exception as e:
                logger.error(f"Failed to create collaborative task trace: {e}")
                trace = None
        
        try:
            logger.info(f"Starting collaborative task: {task_description[:100]}...")
            
            # Step 1: Start both agents if not already running
            logger.info("Starting required agents...")
            research_started = await self.start_agent("research")
            analysis_started = await self.start_agent("analysis")
            
            if not research_started or not analysis_started:
                raise Exception("Failed to start required agents")
            
            # Wait for agents to be fully initialized
            await asyncio.sleep(3)
            
            # Step 2: Execute Research Agent's autonomous research task
            logger.info("Executing research phase...")
            from ResearchAgent.research_agent import ResearchAgent
            
            research_agent = ResearchAgent(agent_port=8001)
            research_result = await research_agent.autonomous_research_task(
                task_description=task_description,
                collaboration_agents=["http://localhost:8002/analyze"]
            )
            
            # Step 3: Log all communications
            research_communications = research_agent.get_communication_history()
            self.communication_log.extend(research_communications)
            
            # Step 4: Compile final results
            duration = time.time() - start_time
            
            result = {
                "task_id": task_id,
                "task_description": task_description,
                "orchestrator_id": self.orchestrator_id,
                "research_results": research_result,
                "inter_agent_communications": len(research_communications),
                "agents_involved": ["research", "analysis"],
                "total_tokens_used": research_result.get("total_tokens_used", 0),
                "task_duration_seconds": duration,
                "timestamp": datetime.now().isoformat(),
                "success": research_result.get("success", False)
            }
            
            # Store task in history
            self.task_history.append(result)
            
            # Add metrics to master trace
            if trace:
                try:
                    trace.set_output({
                        "task_success": result["success"],
                        "agents_involved": len(result["agents_involved"]),
                        "communications_count": result["inter_agent_communications"]
                    })
                    trace.add_metric("task_duration_seconds", duration)
                    trace.add_metric("total_tokens_used", result["total_tokens_used"])
                    trace.add_metric("communications_count", result["inter_agent_communications"])
                    trace.add_metric("agents_involved_count", len(result["agents_involved"]))
                    
                    await trace.finish_async()
                    logger.debug("Collaborative task trace completed successfully")
                except Exception as e:
                    logger.error(f"Failed to finalize collaborative task trace: {e}")
            
            logger.info(f"Collaborative task completed - Duration: {duration:.2f}s, Communications: {result['inter_agent_communications']}")
            return result
            
        except Exception as e:
            logger.error(f"Collaborative task failed: {e}")
            
            if trace:
                try:
                    trace.set_error(e)
                    await trace.finish_async()
                except Exception as trace_error:
                    logger.error(f"Failed to set error in collaborative task trace: {trace_error}")
            
            return {
                "task_id": task_id,
                "task_description": task_description,
                "error": str(e),
                "duration_seconds": time.time() - start_time,
                "timestamp": datetime.now().isoformat(),
                "success": False,
                "orchestrator_id": self.orchestrator_id
            }
    
    def get_running_agents(self) -> Dict[str, Any]:
        """Get status of all running agents."""
        return {
            name: {
                "start_time": info["start_time"],
                "port": info["port"],
                "url": info["url"],
                "pid": info["process"].pid,
                "is_running": info["process"].poll() is None
            }
            for name, info in self.running_agents.items()
        }
    
    def get_orchestrator_stats(self) -> Dict[str, Any]:
        """Get orchestrator statistics."""
        return {
            "orchestrator_id": self.orchestrator_id,
            "running_agents_count": len(self.running_agents),
            "total_communications": len(self.communication_log),
            "tasks_completed": len(self.task_history),
            "successful_tasks": sum(1 for task in self.task_history if task.get("success", False)),
            "sprintlens_connected": self.sprintlens_client is not None,
            "timestamp": datetime.now().isoformat()
        }
    
    async def shutdown_all(self):
        """Shutdown all running agents gracefully."""
        logger.info("Shutting down all agents...")
        
        for agent_name in list(self.running_agents.keys()):
            await self.stop_agent(agent_name)
        
        logger.info("All agents shut down successfully")


async def main():
    """Main function to demonstrate autonomous agent communication."""
    print("🤖 Autonomous Agent Communication System")
    print("=" * 60)
    
    orchestrator = None
    
    def signal_handler(signum, frame):
        """Handle shutdown signals gracefully."""
        print("\n⚠️ Received shutdown signal...")
        if orchestrator:
            asyncio.create_task(orchestrator.shutdown_all())
        sys.exit(0)
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        # Initialize orchestrator
        print("Initializing Agent Orchestrator...")
        orchestrator = AgentOrchestrator()
        print("✅ Orchestrator initialized successfully!")
        
        # Execute collaborative task
        print("\n🔄 Starting collaborative research task...")
        task_result = await orchestrator.orchestrate_collaborative_task(
            task_description="Analyze the current trends and future implications of artificial intelligence in healthcare, including challenges and opportunities"
        )
        
        if task_result["success"]:
            print("✅ Collaborative task completed successfully!")
            print(f"   Task Duration: {task_result['task_duration_seconds']:.2f}s")
            print(f"   Inter-agent Communications: {task_result['inter_agent_communications']}")
            print(f"   Total Tokens Used: {task_result['total_tokens_used']}")
        else:
            print(f"⚠️ Collaborative task had issues: {task_result.get('error', 'Unknown error')}")
        
        # Display orchestrator statistics
        stats = orchestrator.get_orchestrator_stats()
        print(f"\n📈 Orchestrator Statistics:")
        print(f"   Orchestrator ID: {stats['orchestrator_id']}")
        print(f"   Running Agents: {stats['running_agents_count']}")
        print(f"   Total Communications: {stats['total_communications']}")
        print(f"   Tasks Completed: {stats['tasks_completed']}")
        print(f"   Successful Tasks: {stats['successful_tasks']}")
        print(f"   Sprint Lens: {'✅ Connected' if stats['sprintlens_connected'] else '❌ Not connected'}")
        
        # Display running agents
        running_agents = orchestrator.get_running_agents()
        print(f"\n🤖 Running Agents:")
        for name, info in running_agents.items():
            print(f"   {name}: PID {info['pid']}, Port {info['port']}, {'✅ Running' if info['is_running'] else '❌ Stopped'}")
        
        print(f"\n🎉 Autonomous agent communication demonstration completed!")
        print(f"   Check the Sprint Agent Lens dashboard for comprehensive traces.")
        
        # Keep agents running for a bit to allow trace completion
        print(f"\n⏳ Keeping agents running for 10 seconds to complete trace uploads...")
        await asyncio.sleep(10)
        
    except Exception as e:
        print(f"❌ Error in orchestrator: {e}")
        logger.error(f"Main execution failed: {e}", exc_info=True)
        return 1
    finally:
        # Cleanup
        if orchestrator:
            await orchestrator.shutdown_all()
    
    return 0


if __name__ == "__main__":
    # Run the main function
    exit_code = asyncio.run(main())
    sys.exit(exit_code)