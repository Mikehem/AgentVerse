"""
Project Manager - Handles project creation and management
"""

import time
import logging
from typing import Dict, Any, Optional, List
import httpx

logger = logging.getLogger(__name__)

class ProjectManager:
    """Manages project lifecycle operations"""
    
    def __init__(self, client):
        self.client = client
        self.http_client = client.http_client if hasattr(client, 'http_client') else None
        
    async def find_project_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Find project by name"""
        
        try:
            projects = await self.list_projects()
            for project in projects:
                project_data = project.get("data", project) if "data" in project else project
                if project_data.get("name") == name:
                    # Return the project with the real ID extracted
                    return {
                        "project": project,
                        "project_id": project_data.get("id"),
                        "project_data": project_data
                    }
            return None
        except Exception as e:
            logger.error(f"Error finding project by name {name}: {e}")
            return None
    
    async def create_or_get_project(
        self,
        project_id: str,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new project or get existing one by name"""
        
        # First check if project with this name already exists
        existing_project = await self.find_project_by_name(name)
        if existing_project:
            logger.info(f"Found existing project: {name} (ID: {existing_project['project_id']})")
            return existing_project
            
        # If not found, create new project
        new_project = await self.create_project(project_id, name, description, metadata)
        # Format the response to match existing project structure
        return {
            "project": new_project,
            "project_id": new_project.get("data", {}).get("id") if "data" in new_project else new_project.get("id"),
            "project_data": new_project.get("data", new_project)
        }
    
    async def create_project(
        self,
        project_id: str,
        name: str,
        description: str = "",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new project"""
        
        project_data = {
            "name": name,
            "description": description,
            "metadata": metadata or {}
        }
        
        try:
            # Use direct HTTP call if http_client not available
            if self.http_client:
                response = await self.http_client.post(
                    f"/api/v1/projects",
                    json={"id": project_id, **project_data}
                )
            else:
                # Fallback to direct httpx call
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        f"{self.client.config.url}/api/v1/projects",
                        json={"id": project_id, **project_data},
                        headers={"Content-Type": "application/json"}
                    )
                    
            if response.status_code == 201:
                result = response.json()
                logger.info(f"Created project: {project_id}")
                return result
            else:
                error_msg = f"Failed to create project: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error creating project {project_id}: {e}")
            raise
            
    async def get_project(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Get project by ID"""
        
        try:
            if self.http_client:
                response = await self.http_client.get(f"/api/v1/projects/{project_id}")
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.client.config.url}/api/v1/projects/{project_id}"
                    )
                    
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            else:
                error_msg = f"Failed to get project: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error getting project {project_id}: {e}")
            raise
            
    async def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects"""
        
        try:
            if self.http_client:
                response = await self.http_client.get("/api/v1/projects")
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{self.client.config.url}/api/v1/projects")
                    
            if response.status_code == 200:
                result = response.json()
                return result.get('data', [])
            else:
                error_msg = f"Failed to list projects: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error listing projects: {e}")
            raise
            
    async def update_project(
        self, 
        project_id: str, 
        name: Optional[str] = None,
        description: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Update project information"""
        
        update_data = {}
        if name is not None:
            update_data["name"] = name
        if description is not None:
            update_data["description"] = description
        if metadata is not None:
            update_data["metadata"] = metadata
            
        try:
            if self.http_client:
                response = await self.http_client.put(
                    f"/api/v1/projects/{project_id}",
                    json=update_data
                )
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.put(
                        f"{self.client.config.url}/api/v1/projects/{project_id}",
                        json=update_data,
                        headers={"Content-Type": "application/json"}
                    )
                    
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Updated project: {project_id}")
                return result
            else:
                error_msg = f"Failed to update project: {response.status_code} - {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)
                
        except Exception as e:
            logger.error(f"Error updating project {project_id}: {e}")
            raise
            
    async def delete_project(self, project_id: str) -> bool:
        """Delete a project"""
        
        try:
            if self.http_client:
                response = await self.http_client.delete(f"/api/v1/projects/{project_id}")
            else:
                async with httpx.AsyncClient() as client:
                    response = await client.delete(
                        f"{self.client.config.url}/api/v1/projects/{project_id}"
                    )
                    
            if response.status_code == 200:
                logger.info(f"Deleted project: {project_id}")
                return True
            else:
                error_msg = f"Failed to delete project: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return False
                
        except Exception as e:
            logger.error(f"Error deleting project {project_id}: {e}")
            raise