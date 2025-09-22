#!/usr/bin/env python3
"""
E-commerce Multi-Agent Project Setup using Sprint Lens SDK
Uses the new SDK management functionality to create a project and register all agents
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
    
    print("🚀 Setting up E-commerce Multi-Agent Project with SDK...")
    print("=" * 80)
    
    # Configure Sprint Lens client
    client = sprintlens.SprintLensClient(
        url="http://localhost:3000",
        username="admin", 
        password="OpikAdmin2024!",
        workspace_id="default"
    )
    
    try:
        # Initialize the client
        print("📡 Connecting to Sprint Lens backend...")
        await client.initialize()
        
        # Create distributed trace setup helper
        setup = DistributedTraceSetup(client)
        
        # Define custom agents configuration for e-commerce
        agents_config = [
            {
                "name": "Order Coordinator Agent",
                "agent_type": "coordinator",
                "capabilities": [
                    "order_validation",
                    "workflow_orchestration", 
                    "process_coordination",
                    "status_tracking",
                    "error_handling",
                    "distributed_tracing"
                ],
                "metadata": {
                    "role": "Orchestrates complete order processing workflow across all agents",
                    "container_name": "order-coordinator-container",
                    "namespace": "ecommerce-processing",
                    "deployment_type": "containerized",
                    "communication_protocols": ["http", "async", "event_driven"],
                    "resource_requirements": {"cpu": "1", "memory": "1Gi", "storage": "2Gi"}
                }
            },
            {
                "name": "Payment Processor Agent",
                "agent_type": "payment_processor",
                "capabilities": [
                    "payment_validation",
                    "transaction_processing",
                    "fraud_detection", 
                    "refund_processing",
                    "payment_gateway_integration",
                    "pci_compliance"
                ],
                "metadata": {
                    "role": "Handles payment validation, fraud detection, and transaction processing",
                    "container_name": "payment-processor-container",
                    "namespace": "ecommerce-processing",
                    "deployment_type": "containerized",
                    "communication_protocols": ["https", "async"],
                    "resource_requirements": {"cpu": "0.8", "memory": "1Gi", "storage": "1Gi"}
                }
            },
            {
                "name": "Inventory Management Agent",
                "agent_type": "inventory_manager",
                "capabilities": [
                    "inventory_tracking",
                    "stock_management",
                    "availability_checking",
                    "reservation_management",
                    "supplier_integration",
                    "demand_forecasting"
                ],
                "metadata": {
                    "role": "Manages product inventory, stock levels, and availability checking",
                    "container_name": "inventory-manager-container",
                    "namespace": "ecommerce-processing",
                    "deployment_type": "containerized",
                    "communication_protocols": ["http", "database", "event_driven"],
                    "resource_requirements": {"cpu": "0.6", "memory": "768Mi", "storage": "2Gi"}
                }
            },
            {
                "name": "Shipping Management Agent",
                "agent_type": "shipping_manager",
                "capabilities": [
                    "shipping_calculation",
                    "label_generation",
                    "carrier_integration",
                    "tracking_management", 
                    "delivery_optimization",
                    "international_shipping"
                ],
                "metadata": {
                    "role": "Handles shipping logistics, label creation, and delivery tracking",
                    "container_name": "shipping-manager-container",
                    "namespace": "ecommerce-processing",
                    "deployment_type": "containerized",
                    "communication_protocols": ["http", "rest_api", "webhook"],
                    "resource_requirements": {"cpu": "0.5", "memory": "512Mi", "storage": "1Gi"}
                }
            },
            {
                "name": "Notification Service Agent",
                "agent_type": "notification_service",
                "capabilities": [
                    "email_notifications",
                    "sms_notifications", 
                    "push_notifications",
                    "template_management",
                    "delivery_tracking",
                    "preference_management"
                ],
                "metadata": {
                    "role": "Manages customer communications and notifications across multiple channels",
                    "container_name": "notification-service-container",
                    "namespace": "ecommerce-processing",
                    "deployment_type": "containerized",
                    "communication_protocols": ["http", "smtp", "sms_gateway", "push_service"],
                    "resource_requirements": {"cpu": "0.4", "memory": "512Mi", "storage": "1Gi"}
                }
            }
        ]
        
        # Set up the custom e-commerce project
        print(f"🏗️  Creating project and registering {len(agents_config)} agents...")
        project_config = await setup.setup_custom_project(
            project_id="ecommerce_distributed_processing_v3",
            project_name="E-commerce Distributed Order Processing v3",
            project_description="Multi-agent e-commerce order processing system with distributed tracing. Demonstrates real-world agent collaboration across containers with full observability.",
            agents_config=agents_config
        )
        
        print(f"✅ Project created successfully!")
        print(f"   Project ID: {project_config['project_id']}")
        print(f"   Agents registered: {len(project_config['agents'])}")
        
        # Save configuration for agents to use
        config_file = Path(__file__).parent / "ecommerce_project_config.json"
        
        # Enhanced configuration with all necessary details
        enhanced_config = {
            **project_config,
            "setup_timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "base_url": "http://localhost:3000",
            "sdk_version": sprintlens.__version__
        }
        
        with open(config_file, 'w') as f:
            json.dump(enhanced_config, f, indent=2)
        
        print(f"💾 Enhanced configuration saved to: {config_file}")
        
        # Generate Docker Compose configuration
        docker_compose = setup.generate_docker_compose_config(project_config)
        compose_file = Path(__file__).parent / "docker-compose.yml"
        with open(compose_file, 'w') as f:
            f.write(docker_compose)
        
        print(f"🐳 Docker Compose config generated: {compose_file}")
        
        # Generate Kubernetes manifests
        k8s_manifests = setup.generate_kubernetes_manifests(project_config)
        k8s_dir = Path(__file__).parent / "k8s"
        k8s_dir.mkdir(exist_ok=True)
        
        for filename, content in k8s_manifests.items():
            manifest_file = k8s_dir / filename
            with open(manifest_file, 'w') as f:
                f.write(content)
        
        print(f"☸️  Kubernetes manifests generated in: {k8s_dir}")
        
        # Display agent information
        print("\n🤖 Registered Agents:")
        for agent in project_config['agents']:
            # Handle nested agent structure
            agent_data = agent.get('data', agent)
            agent_id = agent.get('id', agent_data.get('id'))
            agent_name = agent_data.get('name', 'Unknown')
            agent_role = agent_data.get('role', 'N/A')
            agent_capabilities = agent_data.get('capabilities', [])
            
            print(f"   • {agent_name} (ID: {agent_id})")
            print(f"     Role: {agent_role}")
            print(f"     Capabilities: {', '.join(agent_capabilities)}")
            print()
        
        print("🎉 Multi-agent project setup complete!")
        print(f"\n📋 Summary:")
        print(f"   Project ID: {project_config['project_id']}")
        print(f"   Project URL: http://localhost:3000/projects/{project_config['project_id']}")
        print(f"   Distributed Traces: http://localhost:3000/distributed-traces")
        print(f"   Agents: {len(project_config['agents'])} containerized agents")
        
        print(f"\n📊 Next steps:")
        print("1. Copy .env file: cp ../SimpleAgent/.env .")
        print("2. Build agent containers: docker-compose build")
        print("3. Start agents: docker-compose up")
        print("4. Monitor traces at: http://localhost:3000/distributed-traces")
        print("5. View agent interactions in real-time")
        
        return project_config
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        await client.close()

async def verify_backend():
    """Verify that the Sprint Lens backend is running"""
    import httpx
    
    try:
        print("🔍 Checking backend connectivity...")
        async with httpx.AsyncClient() as client:
            response = await client.get("http://localhost:3000/api/health", timeout=5)
            if response.status_code == 200:
                print("✅ Sprint Lens backend is accessible")
                return True
            else:
                print(f"❌ Backend returned status {response.status_code}")
                return False
    except Exception as e:
        print(f"❌ Cannot connect to backend: {e}")
        print("   Please ensure the backend is running with: npm run dev")
        return False

async def main():
    """Main setup function"""
    
    # Verify backend is running
    if not await verify_backend():
        print("\n💡 To start the backend:")
        print("   cd SprintAgentLens/frontend")
        print("   npm run dev")
        sys.exit(1)
    
    # Run the setup
    try:
        config = await setup_ecommerce_project()
        
        print(f"\n🎉 E-commerce multi-agent project is ready!")
        print(f"🔗 Access the dashboard: http://localhost:3000")
        print(f"📊 View distributed traces: http://localhost:3000/distributed-traces")
        
        return config
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    config = asyncio.run(main())