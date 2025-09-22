#!/usr/bin/env python3
"""
Launcher for Collaborative Document Processing Scenario
Starts all agents in the correct order with proper configuration
"""

import asyncio
import subprocess
import time
import sys
import os
import signal
from typing import List, Dict

class ScenarioLauncher:
    def __init__(self):
        self.processes: List[subprocess.Popen] = []
        self.agent_configs = [
            {
                "agent_id": "doc-coordinator",
                "agent_type": "coordinator",
                "agent_name": "Document Coordinator",
                "role": "Orchestrates document processing workflow",
                "capabilities": "workflow_management,task_distribution,result_aggregation",
                "hostname": "coordinator-node",
                "port": 8001,
                "delay": 0
            },
            {
                "agent_id": "text-extractor",
                "agent_type": "specialist",
                "agent_name": "Text Extraction Agent",
                "role": "Extracts text content from various document formats",
                "capabilities": "pdf_extraction,ocr,text_parsing,format_detection",
                "hostname": "extractor-node",
                "port": 8002,
                "delay": 2
            },
            {
                "agent_id": "sentiment-analyzer",
                "agent_type": "specialist",
                "agent_name": "Sentiment Analysis Agent",
                "role": "Analyzes sentiment and emotional tone of text",
                "capabilities": "sentiment_analysis,emotion_detection,nlp",
                "hostname": "sentiment-node",
                "port": 8003,
                "delay": 4
            },
            {
                "agent_id": "entity-extractor",
                "agent_type": "specialist",
                "agent_name": "Entity Extraction Agent",
                "role": "Identifies and extracts named entities from text",
                "capabilities": "named_entity_recognition,entity_linking,knowledge_graphs",
                "hostname": "entity-node",
                "port": 8004,
                "delay": 4
            },
            {
                "agent_id": "quality-monitor",
                "agent_type": "monitor",
                "agent_name": "Quality Monitoring Agent",
                "role": "Monitors processing quality and validates results",
                "capabilities": "quality_assessment,validation,error_detection",
                "hostname": "monitor-node",
                "port": 8005,
                "delay": 6
            }
        ]
        
    def signal_handler(self, signum, frame):
        """Handle Ctrl+C gracefully"""
        print("\nStopping all agents...")
        self.stop_all_agents()
        sys.exit(0)
        
    def start_agent(self, config: Dict) -> subprocess.Popen:
        """Start a single agent process"""
        cmd = [
            sys.executable, "agent.py",
            "--agent-id", config["agent_id"],
            "--agent-type", config["agent_type"],
            "--agent-name", config["agent_name"],
            "--role", config["role"],
            "--capabilities", config["capabilities"],
            "--hostname", config["hostname"],
            "--port", str(config["port"]),
            "--namespace", "document-processing",
            "--scenario", "collaborative-document-processing"
        ]
        
        print(f"Starting agent: {config['agent_name']} ({config['agent_id']})")
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
            if process.poll() is None:  # Process is still running
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
        self.processes.clear()
        
    async def run_scenario(self):
        """Run the complete collaborative document processing scenario"""
        print("Starting Collaborative Document Processing Scenario")
        print("=" * 60)
        
        # Register signal handler for graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        
        try:
            # Start agents with delays to simulate realistic deployment
            for config in self.agent_configs:
                if config["delay"] > 0:
                    print(f"Waiting {config['delay']} seconds before starting {config['agent_name']}...")
                    await asyncio.sleep(config["delay"])
                
                process = self.start_agent(config)
                self.processes.append(process)
                
                # Give each agent a moment to initialize
                await asyncio.sleep(1)
            
            print("\nAll agents started! Monitoring execution...")
            print("Press Ctrl+C to stop all agents")
            print("-" * 60)
            
            # Monitor all processes
            while True:
                running_count = 0
                for i, process in enumerate(self.processes):
                    if process.poll() is None:
                        running_count += 1
                    else:
                        # Process has finished
                        config = self.agent_configs[i]
                        return_code = process.returncode
                        
                        if return_code == 0:
                            print(f"✓ Agent {config['agent_name']} completed successfully")
                        else:
                            print(f"✗ Agent {config['agent_name']} failed with code {return_code}")
                            # Print stderr if there was an error
                            stderr_output = process.stderr.read()
                            if stderr_output:
                                print(f"Error output: {stderr_output}")
                
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
    launcher = ScenarioLauncher()
    await launcher.run_scenario()

if __name__ == "__main__":
    asyncio.run(main())