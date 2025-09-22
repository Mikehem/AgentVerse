"""
Agent Manager - Handles agent registration and management
"""

import time
import logging
import uuid
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger(__name__)

class AgentManager:
    """Manages agent lifecycle operations"""
    
    def __init__(self, client):
        self.client = client
        self.http_client = client.http_client if hasattr(client, 'http_client') else None
        
    async def find_agent_by_name_and_project(self, project_id: str, name: str) -> Optional[Dict[str, Any]]:
        """Find agent by name within a project"""
        
        try:
            agents = await self.list_agents(project_id=project_id)
            for agent in agents:
                if agent.get("name") == name:
                    return agent
            return None
        except Exception as e:
            logger.error(f"Error finding agent by name {name} in project {project_id}: {e}")
            return None
    
    async def create_or_get_agent(
        self,
        project_id: str,
        agent_id: Optional[str] = None,
        name: str = "",
        agent_type: str = "worker",
        version: str = "1.0.0",
        capabilities: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new agent or get existing one by name and project"""
        
        # First check if agent with this name already exists in the project
        existing_agent = await self.find_agent_by_name_and_project(project_id, name)
        if existing_agent:
            logger.info(f"Found existing agent: {name} in project {project_id}")
            return existing_agent
            
        # If not found, create new agent
        return await self.create_agent(project_id, agent_id, name, agent_type, version, capabilities, metadata)
    
    async def create_agent(
        self,
        project_id: str,
        agent_id: Optional[str] = None,
        name: str = "",
        agent_type: str = "worker",
        version: str = "1.0.0",
        capabilities: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create/register a new agent in the project"""
        
        if not agent_id:
            agent_id = f"agent_{agent_type}_{int(time.time())}_{uuid.uuid4().hex[:6]}"
            
        agent_data = {
            "name": name,
            "description": f"Auto-generated agent: {name}",
            "projectId": project_id,
            "type": "specialist" if agent_type in ["payment_processor", "inventory_manager", "shipping_manager", "notification_service"] else "orchestrator",
            "role": agent_type.replace("_", " ").title(),
            "capabilities": capabilities or [agent_type],
            "model": "gpt-4",
            "temperature": 0.7,
            "maxTokens": 2000,
            "systemPrompt": f"You are a {name} responsible for {agent_type} operations.",
            "config": {
                "timeout": 30000,
                "retries": 2,
                "rateLimitPerMinute": 60,
                "priority": 5
            },
            "tags": [agent_type, "distributed_tracing"],
            "isActive": True,
            "version": version,
            "metadata": metadata or {}
        }
        
        try:
            # Use direct HTTP call
            if self.http_client:
                response = await self.http_client.post(
                    f"/api/v1/agents",
                    json={"id": agent_id, "projectId": project_id, **agent_data}
                )
            else:
                # Fallback to direct httpx call
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.client.config.url}/api/v1/agents",
                        json={"id": agent_id, "projectId": project_id, **agent_data},
                        headers={"Content-Type": "application/json"}
                    )
                    
            if response.status_code == 201:
                result = response.json()
                logger.info(f"Created agent: {name} ({agent_id}) in project {project_id}")
                return {**result, "id": agent_id}
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.content)
                error_msg = f"Failed to create agent: {response.status_code} - {error_text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error creating agent {name}: {e}")
            raise
            
    async def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get agent by ID"""
        
        try:
            if self.http_client:
                response = await self.http_client.get(f"/api/v1/agents/{agent_id}")
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.client.config.url}/api/v1/agents/{agent_id}"
                    )
                    
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.content)
                error_msg = f"Failed to get agent: {response.status_code} - {error_text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error getting agent {agent_id}: {e}")
            raise
            
    async def list_agents(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List agents, optionally filtered by project"""
        
        try:
            url = "/api/v1/agents"
            if project_id:
                url += f"?projectId={project_id}"
                
            if self.http_client:
                response = await self.http_client.get(url)
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{self.client.config.url}{url}")
                    
            if response.status_code == 200:
                result = response.json()
                return result.get('data', [])
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.content)
                error_msg = f"Failed to list agents: {response.status_code} - {error_text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error listing agents: {e}")
            raise
            
    async def update_agent(
        self,
        agent_id: str,
        name: Optional[str] = None,
        agent_type: Optional[str] = None,
        version: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Update agent information"""
        
        update_data = {}
        if name is not None:
            update_data["name"] = name
        if agent_type is not None:
            update_data["type"] = agent_type
        if version is not None:
            update_data["version"] = version
        if capabilities is not None:
            update_data["capabilities"] = capabilities
        if metadata is not None:
            update_data["metadata"] = metadata
            
        try:
            if self.http_client:
                response = await self.http_client.put(
                    f"/api/v1/agents/{agent_id}",
                    json=update_data
                )
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.put(
                        f"{self.client.config.url}/api/v1/agents/{agent_id}",
                        json=update_data,
                        headers={"Content-Type": "application/json"}
                    )
                    
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Updated agent: {agent_id}")
                return result
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.content)
                error_msg = f"Failed to update agent: {response.status_code} - {error_text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error updating agent {agent_id}: {e}")
            raise
            
    async def delete_agent(self, agent_id: str) -> bool:
        """Delete an agent"""
        
        try:
            if self.http_client:
                response = await self.http_client.delete(f"/api/v1/agents/{agent_id}")
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.delete(
                        f"{self.client.config.url}/api/v1/agents/{agent_id}"
                    )
                    
            if response.status_code == 200:
                logger.info(f"Deleted agent: {agent_id}")
                return True
            else:
                error_text = response.text if hasattr(response, 'text') else str(response.content)
                error_msg = f"Failed to delete agent: {response.status_code} - {error_text}"
                logger.error(error_msg)
                return False
                
        except Exception as e:
            logger.error(f"Error deleting agent {agent_id}: {e}")
            raise
            
    def generate_agent_id(self, agent_type: str, prefix: str = "agent") -> str:
        """Generate a unique agent ID"""
        return f"{prefix}_{agent_type}_{int(time.time())}_{uuid.uuid4().hex[:6]}"