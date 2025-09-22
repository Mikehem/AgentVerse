#!/usr/bin/env python3
"""
Launcher for Distributed Data Pipeline Scenario
Demonstrates parallel data processing with distributed tracing
"""

import asyncio
import subprocess
import time
import sys
import signal
from typing import List, Dict

class PipelineScenarioLauncher:
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.trace_id = None
        
    def signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully"""
        print("\nStopping all agents...")
        self.stop_all_agents()
        sys.exit(0)
        
    def start_agent(self, agent_id: str, agent_type: str, delay: int = 0) -> subprocess.Popen:
        """Start a single agent process"""
        cmd = [
            sys.executable, "agent.py",
            "--agent-id", agent_id,
            "--agent-type", agent_type
        ]
        
        if self.trace_id:
            cmd.extend(["--trace-id", self.trace_id])
            
        print(f"Starting {agent_type} agent: {agent_id}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        return process
        
    def stop_all_agents(self):
        """Stop all running agent processes"""
        for process in self.processes:
            if process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
        self.processes.clear()
        
    async def run_scenario(self):
        """Run the distributed data pipeline scenario"""
        print("Starting Distributed Data Pipeline Scenario")
        print("=" * 60)
        
        signal.signal(signal.SIGINT, self.signal_handler)
        
        try:
            # Start orchestrator first
            print("Starting pipeline orchestrator...")
            orchestrator = self.start_agent("pipeline-orchestrator", "orchestrator")
            self.processes.append(orchestrator)
            await asyncio.sleep(2)
            
            # Start workers in parallel
            print("Starting data workers...")
            for i in range(1, 4):
                worker = self.start_agent(f"data-worker-{i}", "worker")
                self.processes.append(worker)
                await asyncio.sleep(1)
            
            # Start aggregator
            print("Starting result aggregator...")
            await asyncio.sleep(2)
            aggregator = self.start_agent("result-aggregator", "aggregator")
            self.processes.append(aggregator)
            
            print("\nAll agents started! Monitoring execution...")
            print("Press Ctrl+C to stop all agents")
            print("-" * 60)
            
            # Monitor processes
            while True:
                running_count = 0
                for process in self.processes:
                    if process.poll() is None:
                        running_count += 1
                    else:
                        return_code = process.returncode
                        if return_code == 0:
                            print(f"✓ Agent completed successfully")
                        else:
                            print(f"✗ Agent failed with code {return_code}")
                
                if running_count == 0:
                    print("\nAll agents have completed execution!")
                    break
                    
                await asyncio.sleep(2)
                
        except KeyboardInterrupt:
            print("\nReceived interrupt signal")
        finally:
            self.stop_all_agents()
            print("All agents stopped.")

async def main():
    launcher = PipelineScenarioLauncher()
    await launcher.run_scenario()

if __name__ == "__main__":
    asyncio.run(main())