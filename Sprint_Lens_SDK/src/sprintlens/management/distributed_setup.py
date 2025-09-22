"""
Distributed Trace Setup - Simplified setup for multi-agent distributed tracing
"""

import logging
from typing import Dict, Any, List, Optional
from .project_manager import ProjectManager
from .agent_manager import AgentManager

logger = logging.getLogger(__name__)

class DistributedTraceSetup:
    """Simplified setup for multi-agent distributed tracing scenarios"""
    
    def __init__(self, client):
        self.client = client
        self.project_manager = ProjectManager(client)
        self.agent_manager = AgentManager(client)
        
    async def setup_ecommerce_project(
        self,
        project_id: str = "ecommerce_multi_agent",
        project_name: str = "E-commerce Multi-Agent System",
        agents_config: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """Set up a complete e-commerce multi-agent project with all agents"""
        
        if agents_config is None:
            agents_config = [
                {
                    "name": "Customer Service Agent",
                    "agent_type": "customer_service",
                    "capabilities": ["customer_inquiries", "order_tracking", "returns"],
                    "metadata": {"department": "customer_service", "priority": "high"}
                },
                {
                    "name": "Inventory Manager Agent", 
                    "agent_type": "inventory_manager",
                    "capabilities": ["stock_management", "reorder_alerts", "supplier_coordination"],
                    "metadata": {"department": "operations", "priority": "medium"}
                },
                {
                    "name": "Shipping Manager Agent",
                    "agent_type": "shipping_manager", 
                    "capabilities": ["shipping_coordination", "logistics_optimization", "delivery_tracking"],
                    "metadata": {"department": "logistics", "priority": "medium"}
                },
                {
                    "name": "Notification Service Agent",
                    "agent_type": "notification_service",
                    "capabilities": ["email_notifications", "sms_alerts", "push_notifications"],
                    "metadata": {"department": "communications", "priority": "low"}
                }
            ]
        
        try:
            # Create or get existing project
            logger.info(f"Creating or getting project: {project_name}")
            project = await self.project_manager.create_or_get_project(
                project_id=project_id,
                name=project_name,
                description="Multi-agent e-commerce system for distributed tracing demonstration",
                metadata={
                    "scenario": "distributed_tracing",
                    "agent_count": len(agents_config),
                    "communication_pattern": "agent_to_agent"
                }
            )
            
            # Use the real project ID from the response
            real_project_id = project.get("project_id") or project_id
            
            # Register all agents (or get existing ones)
            registered_agents = []
            for agent_config in agents_config:
                logger.info(f"Creating or getting agent: {agent_config['name']}")
                agent = await self.agent_manager.create_or_get_agent(
                    project_id=real_project_id,
                    name=agent_config["name"],
                    agent_type=agent_config["agent_type"],
                    capabilities=agent_config.get("capabilities", []),
                    metadata=agent_config.get("metadata", {})
                )
                registered_agents.append(agent)
            
            setup_result = {
                "project": project,
                "agents": registered_agents,
                "project_id": real_project_id,
                "agent_ids": [agent["id"] for agent in registered_agents],
                "status": "success"
            }
            
            logger.info(f"Successfully set up multi-agent project with {len(registered_agents)} agents")
            return setup_result
            
        except Exception as e:
            logger.error(f"Failed to setup e-commerce project: {e}")
            raise
            
    async def setup_custom_project(
        self,
        project_id: str,
        project_name: str,
        project_description: str = "",
        agents_config: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Set up a custom multi-agent project"""
        
        if not agents_config:
            raise ValueError("agents_config is required for custom project setup")
        
        try:
            # Create or get existing project
            logger.info(f"Creating or getting custom project: {project_name}")
            project = await self.project_manager.create_or_get_project(
                project_id=project_id,
                name=project_name,
                description=project_description,
                metadata={
                    "scenario": "custom_distributed_tracing",
                    "agent_count": len(agents_config)
                }
            )
            
            # Use the real project ID from the response
            real_project_id = project.get("project_id") or project_id
            
            # Register all agents (or get existing ones)
            registered_agents = []
            for agent_config in agents_config:
                logger.info(f"Creating or getting agent: {agent_config['name']}")
                agent = await self.agent_manager.create_or_get_agent(
                    project_id=real_project_id,
                    **agent_config
                )
                registered_agents.append(agent)
            
            setup_result = {
                "project": project,
                "agents": registered_agents,
                "project_id": real_project_id,
                "agent_ids": [agent["id"] for agent in registered_agents],
                "status": "success"
            }
            
            logger.info(f"Successfully set up custom project with {len(registered_agents)} agents")
            return setup_result
            
        except Exception as e:
            logger.error(f"Failed to setup custom project: {e}")
            raise
            
    async def get_project_configuration(self, project_id: str) -> Dict[str, Any]:
        """Get complete project configuration including all agents"""
        
        try:
            # Get project details
            project = await self.project_manager.get_project(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            
            # Get all agents in the project
            agents = await self.agent_manager.list_agents(project_id=project_id)
            
            return {
                "project": project,
                "agents": agents,
                "project_id": project_id,
                "agent_ids": [agent["id"] for agent in agents],
                "agent_count": len(agents)
            }
            
        except Exception as e:
            logger.error(f"Failed to get project configuration: {e}")
            raise
            
    def generate_docker_compose_config(
        self, 
        project_config: Dict[str, Any],
        base_port: int = 8080
    ) -> str:
        """Generate Docker Compose configuration for multi-agent deployment"""
        
        project_id = project_config["project_id"]
        agents = project_config["agents"]
        
        compose_config = f"""version: '3.8'

services:
"""
        
        for i, agent in enumerate(agents):
            # Handle nested agent structure
            agent_data = agent.get("data", agent)
            agent_id = agent.get("id", agent_data.get("id"))
            agent_name = agent_data.get("name", "unknown").lower().replace(" ", "_")
            agent_type = agent_data.get("type", "agent")
            port = base_port + i
            
            compose_config += f"""  {agent_name}:
    build:
      context: ./Agents/EcommerceAgents
      dockerfile: Dockerfile.{agent_type}
    environment:
      - PROJECT_ID={project_id}
      - AGENT_ID={agent_id}
      - AGENT_NAME={agent_data.get("name", "Unknown Agent")}
      - AGENT_TYPE={agent_type}
      - SPRINT_LENS_URL=http://host.docker.internal:3000
    ports:
      - "{port}:{port}"
    networks:
      - ecommerce_network
    depends_on:
      - sprintlens_backend

"""
        
        compose_config += """  sprintlens_backend:
    image: sprintlens/backend:latest
    ports:
      - "3000:3000"
    networks:
      - ecommerce_network

networks:
  ecommerce_network:
    driver: bridge
"""
        
        return compose_config
        
    def generate_kubernetes_manifests(
        self, 
        project_config: Dict[str, Any],
        namespace: str = "ecommerce-agents"
    ) -> Dict[str, str]:
        """Generate Kubernetes manifests for multi-agent deployment"""
        
        project_id = project_config["project_id"]
        agents = project_config["agents"]
        manifests = {}
        
        # Namespace
        manifests["namespace.yaml"] = f"""apiVersion: v1
kind: Namespace
metadata:
  name: {namespace}
"""
        
        # ConfigMap for shared configuration
        manifests["configmap.yaml"] = f"""apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-config
  namespace: {namespace}
data:
  PROJECT_ID: "{project_id}"
  SPRINT_LENS_URL: "http://sprintlens-backend:3000"
"""
        
        # Deployments for each agent
        for agent in agents:
            # Handle nested agent structure
            agent_data = agent.get("data", agent)
            agent_id = agent.get("id", agent_data.get("id"))
            agent_name = agent_data.get("name", "unknown").lower().replace(" ", "-")
            agent_type = agent_data.get("type", "agent")
            
            manifests[f"{agent_name}-deployment.yaml"] = f"""apiVersion: apps/v1
kind: Deployment
metadata:
  name: {agent_name}
  namespace: {namespace}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: {agent_name}
  template:
    metadata:
      labels:
        app: {agent_name}
        agent-type: {agent_type}
    spec:
      containers:
      - name: {agent_name}
        image: ecommerce-agents:{agent_type}
        env:
        - name: AGENT_ID
          value: "{agent_id}"
        - name: AGENT_NAME
          value: "{agent["name"]}"
        - name: AGENT_TYPE
          value: "{agent_type}"
        envFrom:
        - configMapRef:
            name: agent-config
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: {agent_name}-service
  namespace: {namespace}
spec:
  selector:
    app: {agent_name}
  ports:
  - port: 80
    targetPort: 8080
"""
        
        return manifests