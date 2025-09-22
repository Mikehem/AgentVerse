#!/usr/bin/env python3
"""
E-commerce Multi-Agent Project Setup
Uses the Sprint Lens SDK management functionality to create a project and register all agents
"""

import asyncio
import json
import sys
import os
import time
from pathlib import Path

# Add the SDK to the path
sdk_path = Path(__file__).parent.parent.parent / "Sprint_Lens_SDK" / "src"
sys.path.insert(0, str(sdk_path))

import sprintlens
from sprintlens import DistributedTraceSetup

async def setup_ecommerce_project():
    """Set up the e-commerce multi-agent project using SDK management functionality"""
    
    print("🚀 Setting up E-commerce Multi-Agent Project...")
    print("=" * 80)
    
    # Configure Sprint Lens client
    client = sprintlens.SprintLensClient(
        url="http://localhost:3000",
        username="admin", 
        password="OpikAdmin2024!",
        workspace_id="default"
    )
        
    async def initialize(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
            
    async def create_project(self) -> str:
        """Create the e-commerce distributed processing project"""
        
        # Generate a unique project ID
        project_id = f"proj_ecommerce_distributed_{int(time.time())}"
        
        project_data = {
            "name": "E-commerce Distributed Order Processing",
            "description": "Multi-agent e-commerce order processing system with distributed tracing. Demonstrates real-world agent collaboration across containers with full observability.",
            "metadata": {
                "scenario_type": "multi_agent_ecommerce",
                "agent_count": 5,
                "container_orchestration": "docker",
                "use_case": "distributed_order_processing",
                "tracing_enabled": True,
                "cost_tracking": True,
                "created_by": "distributed_tracing_demo",
                "version": "1.0.0"
            }
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/v1/projects",
                json={
                    "id": project_id,
                    **project_data
                },
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 201:
                    result = await response.json()
                    self.project_id = project_id
                    print(f"✅ Created project: {project_id}")
                    print(f"   Name: {project_data['name']}")
                    return project_id
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to create project: {response.status} - {error_text}")
                    raise Exception(f"Failed to create project: {response.status}")
                    
        except Exception as e:
            print(f"❌ Error creating project: {e}")
            raise
            
    async def register_agent(self, agent_config: Dict) -> str:
        """Register a single agent in the project"""
        
        if not self.project_id:
            raise Exception("Project must be created first")
            
        # Generate unique agent ID
        agent_id = f"agent_{agent_config['type']}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
        
        agent_data = {
            "name": agent_config["name"],
            "type": agent_config["type"],
            "version": "1.0.0",
            "capabilities": agent_config["capabilities"],
            "metadata": {
                "role": agent_config["role"],
                "container_name": agent_config["container_name"],
                "namespace": "ecommerce-processing",
                "deployment_type": "containerized",
                "communication_protocols": agent_config.get("protocols", ["http", "async"]),
                "resource_requirements": agent_config.get("resources", {
                    "cpu": "0.5",
                    "memory": "512Mi",
                    "storage": "1Gi"
                }),
                "registered_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
        }
        
        try:
            async with self.session.post(
                f"{self.base_url}/api/v1/agents",
                json={
                    "id": agent_id,
                    "projectId": self.project_id,
                    **agent_data
                },
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 201:
                    result = await response.json()
                    self.agent_ids[agent_config["type"]] = agent_id
                    print(f"✅ Registered agent: {agent_config['name']} ({agent_id})")
                    return agent_id
                else:
                    error_text = await response.text()
                    print(f"❌ Failed to register agent {agent_config['name']}: {response.status} - {error_text}")
                    raise Exception(f"Failed to register agent: {response.status}")
                    
        except Exception as e:
            print(f"❌ Error registering agent {agent_config['name']}: {e}")
            raise
            
    async def setup_complete_project(self) -> Dict:
        """Setup the complete e-commerce project with all agents"""
        
        print("🚀 Setting up E-commerce Multi-Agent Distributed Processing Project")
        print("=" * 80)
        
        # Step 1: Create the project
        print("\n📁 Creating project...")
        project_id = await self.create_project()
        
        # Step 2: Define all agents
        agents_config = [
            {
                "type": "coordinator",
                "name": "Order Coordinator Agent",
                "role": "Orchestrates complete order processing workflow across all agents",
                "capabilities": [
                    "order_validation",
                    "workflow_orchestration", 
                    "process_coordination",
                    "status_tracking",
                    "error_handling",
                    "distributed_tracing"
                ],
                "container_name": "order-coordinator-container",
                "protocols": ["http", "async", "event_driven"],
                "resources": {"cpu": "1", "memory": "1Gi", "storage": "2Gi"}
            },
            {
                "type": "payment_processor",
                "name": "Payment Processor Agent",
                "role": "Handles payment validation, fraud detection, and transaction processing",
                "capabilities": [
                    "payment_validation",
                    "transaction_processing",
                    "fraud_detection", 
                    "refund_processing",
                    "payment_gateway_integration",
                    "pci_compliance"
                ],
                "container_name": "payment-processor-container",
                "protocols": ["https", "async"],
                "resources": {"cpu": "0.8", "memory": "1Gi", "storage": "1Gi"}
            },
            {
                "type": "inventory_manager",
                "name": "Inventory Management Agent", 
                "role": "Manages product inventory, stock levels, and availability checking",
                "capabilities": [
                    "inventory_tracking",
                    "stock_management",
                    "availability_checking",
                    "reservation_management",
                    "supplier_integration",
                    "demand_forecasting"
                ],
                "container_name": "inventory-manager-container",
                "protocols": ["http", "database", "event_driven"],
                "resources": {"cpu": "0.6", "memory": "768Mi", "storage": "2Gi"}
            },
            {
                "type": "shipping_manager",
                "name": "Shipping Management Agent",
                "role": "Handles shipping logistics, label creation, and delivery tracking",
                "capabilities": [
                    "shipping_calculation",
                    "label_generation",
                    "carrier_integration",
                    "tracking_management", 
                    "delivery_optimization",
                    "international_shipping"
                ],
                "container_name": "shipping-manager-container",
                "protocols": ["http", "rest_api", "webhook"],
                "resources": {"cpu": "0.5", "memory": "512Mi", "storage": "1Gi"}
            },
            {
                "type": "notification_service",
                "name": "Notification Service Agent",
                "role": "Manages customer communications and notifications across multiple channels",
                "capabilities": [
                    "email_notifications",
                    "sms_notifications", 
                    "push_notifications",
                    "template_management",
                    "delivery_tracking",
                    "preference_management"
                ],
                "container_name": "notification-service-container", 
                "protocols": ["http", "smtp", "sms_gateway", "push_service"],
                "resources": {"cpu": "0.4", "memory": "512Mi", "storage": "1Gi"}
            }
        ]
        
        # Step 3: Register all agents
        print(f"\n🤖 Registering {len(agents_config)} agents...")
        
        for agent_config in agents_config:
            await self.register_agent(agent_config)
            await asyncio.sleep(0.5)  # Small delay between registrations
            
        # Step 4: Create configuration file for agents
        config_data = {
            "project_id": self.project_id,
            "project_name": "E-commerce Distributed Order Processing",
            "base_url": self.base_url,
            "agent_ids": self.agent_ids,
            "setup_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "agents": {
                agent_config["type"]: {
                    "id": self.agent_ids[agent_config["type"]],
                    "name": agent_config["name"],
                    "role": agent_config["role"],
                    "container_name": agent_config["container_name"],
                    "capabilities": agent_config["capabilities"]
                }
                for agent_config in agents_config
            }
        }
        
        # Save configuration to file
        with open("ecommerce_project_config.json", "w") as f:
            json.dump(config_data, f, indent=2)
            
        print(f"\n💾 Configuration saved to: ecommerce_project_config.json")
        
        # Step 5: Display summary
        print(f"\n🎉 Project setup complete!")
        print(f"📋 Summary:")
        print(f"   Project ID: {self.project_id}")
        print(f"   Project URL: {self.base_url}/projects/{self.project_id}")
        print(f"   Agents registered: {len(self.agent_ids)}")
        print(f"   Distributed tracing: Enabled")
        
        print(f"\n🔗 Registered Agents:")
        for agent_type, agent_id in self.agent_ids.items():
            agent_info = next(a for a in agents_config if a["type"] == agent_type)
            print(f"   • {agent_info['name']}")
            print(f"     ID: {agent_id}")
            print(f"     Container: {agent_info['container_name']}")
            
        print(f"\n📊 Next steps:")
        print(f"   1. Run individual agents with the generated agent IDs")
        print(f"   2. View distributed traces at: {self.base_url}/distributed-traces")
        print(f"   3. Monitor agent interactions in real-time")
        print(f"   4. Analyze cross-agent communication patterns")
        
        return config_data
        
    async def verify_setup(self) -> bool:
        """Verify that the project and agents were created successfully"""
        
        if not self.project_id:
            print("❌ No project ID to verify")
            return False
            
        print(f"\n🔍 Verifying project setup...")
        
        try:
            # Check project
            async with self.session.get(f"{self.base_url}/api/v1/projects/{self.project_id}") as response:
                if response.status == 200:
                    project = await response.json()
                    print(f"✅ Project verified: {project.get('name', 'Unknown')}")
                else:
                    print(f"❌ Project verification failed: {response.status}")
                    return False
                    
            # Check agents
            async with self.session.get(f"{self.base_url}/api/v1/agents?projectId={self.project_id}") as response:
                if response.status == 200:
                    agents = await response.json()
                    agent_count = len(agents.get('data', []))
                    print(f"✅ Agents verified: {agent_count} agents found")
                    
                    if agent_count != len(self.agent_ids):
                        print(f"⚠️  Warning: Expected {len(self.agent_ids)} agents, found {agent_count}")
                        
                else:
                    print(f"❌ Agent verification failed: {response.status}")
                    return False
                    
            print(f"✅ Setup verification complete")
            return True
            
        except Exception as e:
            print(f"❌ Verification error: {e}")
            return False

async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup E-commerce Multi-Agent Project")
    parser.add_argument("--base-url", default="http://localhost:3000", help="Agent Lens API base URL")
    parser.add_argument("--verify", action="store_true", help="Verify setup after creation")
    
    args = parser.parse_args()
    
    setup = EcommerceProjectSetup(args.base_url)
    
    try:
        await setup.initialize()
        
        # Setup the complete project
        config = await setup.setup_complete_project()
        
        # Verify if requested
        if args.verify:
            success = await setup.verify_setup()
            if not success:
                print("❌ Setup verification failed")
                sys.exit(1)
                
        print(f"\n🎉 E-commerce multi-agent project is ready for distributed tracing!")
        
        # Return the configuration for other scripts to use
        return config
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)
        
    finally:
        await setup.cleanup()

if __name__ == "__main__":
    config = asyncio.run(main())