#!/usr/bin/env python3
"""
Base Agent Class for E-commerce Order Processing
Uses Sprint Lens SDK for distributed tracing and observability
"""

import os
import sys
import asyncio
import json
import uuid
import time
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import traceback

# Add Sprint Lens SDK to path
sys.path.append('/Users/michaeldsouza/Documents/Wordir/AGENT_LENS/AgentVerse/Sprint_Lens_SDK/src')

from sprintlens import SprintLensClient
from sprintlens.types import TraceMetadata, ConversationTurn

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@dataclass
class AgentConfig:
    agent_id: str
    agent_name: str
    agent_type: str
    role: str
    capabilities: List[str]
    container_id: Optional[str] = None
    container_name: Optional[str] = None
    namespace: Optional[str] = None

@dataclass
class OrderContext:
    order_id: str
    customer_id: str
    items: List[Dict]
    total_amount: float
    payment_method: str
    shipping_address: Dict
    status: str = "pending"
    created_at: str = None
    
    def __post_init__(self):
        if not self.created_at:
            self.created_at = time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

class BaseEcommerceAgent:
    def __init__(self, config: AgentConfig, project_id: str = None):
        self.config = config
        self.project_id = project_id or os.getenv('SPRINTLENS_PROJECT_ID', 'proj_ecommerce_distributed_001')
        self.logger = logging.getLogger(f"{config.agent_type}_{config.agent_id}")
        
        # Initialize Sprint Lens client
        self.client = SprintLensClient(
            base_url=os.getenv('SPRINTLENS_URL', 'http://localhost:3000')
        )
        
        # Current conversation context
        self.current_conversation_id = None
        self.current_trace_id = None
        self.agent_instance_id = f"{config.agent_id}_{uuid.uuid4().hex[:8]}"
        
        self.logger.info(f"Initialized {config.agent_type} agent: {config.agent_name}")
        
    async def initialize(self):
        """Initialize the agent and ensure project exists"""
        try:
            # Ensure project exists
            await self.ensure_project_exists()
            
            # Register agent instance
            await self.register_agent()
            
            self.logger.info(f"Agent {self.config.agent_name} initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize agent: {e}")
            raise
            
    async def ensure_project_exists(self):
        """Ensure the distributed tracing project exists"""
        try:
            # Try to get the project
            project = await self.client.get_project(self.project_id)
            if project:
                self.logger.info(f"Using existing project: {self.project_id}")
                return
        except:
            pass
            
        # Create the project if it doesn't exist
        try:
            project_data = {
                "name": "E-commerce Distributed Order Processing",
                "description": "Multi-agent e-commerce order processing with distributed tracing",
                "metadata": {
                    "scenario": "ecommerce_multi_agent",
                    "agent_count": 5,
                    "container_orchestration": "docker",
                    "use_case": "distributed_order_processing"
                }
            }
            
            project = await self.client.create_project(
                project_id=self.project_id,
                **project_data
            )
            self.logger.info(f"Created new project: {self.project_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to create project: {e}")
            raise
            
    async def register_agent(self):
        """Register this agent instance in the project"""
        try:
            agent_data = {
                "name": self.config.agent_name,
                "type": self.config.agent_type,
                "version": "1.0.0",
                "capabilities": self.config.capabilities,
                "metadata": {
                    "role": self.config.role,
                    "instance_id": self.agent_instance_id,
                    "container_id": self.config.container_id,
                    "container_name": self.config.container_name,
                    "namespace": self.config.namespace,
                    "startup_time": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                }
            }
            
            agent = await self.client.create_agent(
                project_id=self.project_id,
                agent_id=f"{self.config.agent_id}_{uuid.uuid4().hex[:8]}",
                **agent_data
            )
            
            self.logger.info(f"Registered agent in project: {agent}")
            
        except Exception as e:
            self.logger.error(f"Failed to register agent: {e}")
            # Don't fail initialization if agent registration fails
            
    async def start_conversation(self, conversation_name: str, order_context: OrderContext) -> str:
        """Start a new conversation for order processing"""
        try:
            conversation_id = f"order_{order_context.order_id}_{uuid.uuid4().hex[:8]}"
            
            conversation = await self.client.create_conversation(
                project_id=self.project_id,
                conversation_id=conversation_id,
                name=conversation_name,
                metadata={
                    "order_id": order_context.order_id,
                    "customer_id": order_context.customer_id,
                    "total_amount": order_context.total_amount,
                    "agent_orchestrator": self.config.agent_id,
                    "distributed_tracing": True,
                    "container_id": self.config.container_id,
                    **asdict(order_context)
                }
            )
            
            self.current_conversation_id = conversation_id
            self.logger.info(f"Started conversation: {conversation_id} for order {order_context.order_id}")
            
            return conversation_id
            
        except Exception as e:
            self.logger.error(f"Failed to start conversation: {e}")
            raise
            
    async def log_agent_action(
        self, 
        action: str, 
        input_data: Dict, 
        output_data: Dict, 
        success: bool = True,
        error_message: Optional[str] = None,
        cost_data: Optional[Dict] = None
    ):
        """Log an agent action as a conversation turn"""
        if not self.current_conversation_id:
            self.logger.warning("No active conversation to log action")
            return
            
        try:
            turn_data = {
                "input": json.dumps(input_data),
                "output": json.dumps(output_data),
                "metadata": {
                    "agent_id": self.config.agent_id,
                    "agent_name": self.config.agent_name,
                    "agent_type": self.config.agent_type,
                    "action": action,
                    "success": success,
                    "instance_id": self.agent_instance_id,
                    "container_id": self.config.container_id,
                    "namespace": self.config.namespace,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                }
            }
            
            if error_message:
                turn_data["metadata"]["error"] = error_message
                
            if cost_data:
                turn_data.update(cost_data)
                
            turn = await self.client.log_conversation_turn(
                project_id=self.project_id,
                conversation_id=self.current_conversation_id,
                **turn_data
            )
            
            self.logger.info(f"Logged action '{action}' for conversation {self.current_conversation_id}")
            return turn
            
        except Exception as e:
            self.logger.error(f"Failed to log agent action: {e}")
            
    async def send_message_to_agent(
        self, 
        target_agent_id: str, 
        message_type: str, 
        payload: Dict,
        timeout: float = 30.0
    ) -> Dict:
        """Send a message to another agent and log the A2A communication"""
        start_time = time.time()
        
        # Log outgoing message
        await self.log_agent_action(
            action=f"send_to_{target_agent_id}",
            input_data={
                "target_agent": target_agent_id,
                "message_type": message_type,
                "payload": payload
            },
            output_data={"status": "sent", "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")}
        )
        
        try:
            # Simulate inter-agent communication
            # In a real system, this would be HTTP/gRPC/message queue call
            response = await self.simulate_agent_communication(target_agent_id, message_type, payload)
            
            duration = time.time() - start_time
            
            # Log successful communication
            await self.log_agent_action(
                action=f"received_from_{target_agent_id}",
                input_data={
                    "source_agent": target_agent_id,
                    "message_type": f"{message_type}_response",
                    "duration": duration
                },
                output_data=response
            )
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            
            # Log failed communication
            await self.log_agent_action(
                action=f"failed_communication_{target_agent_id}",
                input_data={
                    "target_agent": target_agent_id,
                    "message_type": message_type,
                    "duration": duration
                },
                output_data={"error": str(e)},
                success=False,
                error_message=str(e)
            )
            
            raise
            
    async def simulate_agent_communication(self, target_agent_id: str, message_type: str, payload: Dict) -> Dict:
        """Simulate communication with another agent"""
        # Add realistic latency based on message type
        if message_type in ["validate_payment", "check_inventory"]:
            await asyncio.sleep(0.5 + (0.3 * len(str(payload)) / 1000))  # 500ms + payload size factor
        elif message_type in ["process_shipping", "send_notification"]:
            await asyncio.sleep(0.2 + (0.1 * len(str(payload)) / 1000))  # 200ms + payload size factor
        else:
            await asyncio.sleep(0.1)
            
        # Simulate occasional failures (5% failure rate)
        if time.time() % 100 < 5:
            raise Exception(f"Simulated communication failure with {target_agent_id}")
            
        # Generate realistic response
        return {
            "status": "success",
            "message_type": f"{message_type}_response",
            "source_agent": self.config.agent_id,
            "target_agent": target_agent_id,
            "processed_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "response_data": self.generate_response_data(message_type, payload)
        }
        
    def generate_response_data(self, message_type: str, payload: Dict) -> Dict:
        """Generate realistic response data based on message type"""
        if message_type == "validate_payment":
            return {
                "payment_valid": True,
                "transaction_id": f"txn_{uuid.uuid4().hex[:12]}",
                "payment_method": payload.get("payment_method", "credit_card"),
                "amount_authorized": payload.get("amount", 0)
            }
        elif message_type == "check_inventory":
            return {
                "items_available": True,
                "inventory_status": [
                    {
                        "item_id": item.get("id"),
                        "available_quantity": item.get("quantity", 1) + 10,
                        "reserved_quantity": item.get("quantity", 1)
                    }
                    for item in payload.get("items", [])
                ]
            }
        elif message_type == "process_shipping":
            return {
                "shipping_label_created": True,
                "tracking_number": f"TRK{uuid.uuid4().hex[:10].upper()}",
                "estimated_delivery": "2024-01-25T18:00:00Z",
                "shipping_cost": 12.99
            }
        elif message_type == "send_notification":
            return {
                "notification_sent": True,
                "notification_id": f"notif_{uuid.uuid4().hex[:8]}",
                "channel": payload.get("channel", "email"),
                "recipient": payload.get("recipient")
            }
        else:
            return {"processed": True, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")}
            
    async def finalize_conversation(self, success: bool = True, final_status: str = "completed"):
        """Finalize the current conversation"""
        if not self.current_conversation_id:
            return
            
        try:
            # Log final status
            await self.log_agent_action(
                action="finalize_order",
                input_data={"conversation_id": self.current_conversation_id},
                output_data={
                    "final_status": final_status,
                    "success": success,
                    "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                },
                success=success
            )
            
            self.logger.info(f"Finalized conversation: {self.current_conversation_id} with status: {final_status}")
            
            # Clear current context
            self.current_conversation_id = None
            self.current_trace_id = None
            
        except Exception as e:
            self.logger.error(f"Failed to finalize conversation: {e}")
            
    def get_container_info(self) -> Dict:
        """Get container information from environment"""
        return {
            "container_id": os.getenv("HOSTNAME", self.config.container_id),
            "container_name": os.getenv("CONTAINER_NAME", self.config.container_name),
            "namespace": os.getenv("POD_NAMESPACE", self.config.namespace),
            "pod_name": os.getenv("POD_NAME"),
            "node_name": os.getenv("NODE_NAME"),
            "agent_instance": self.agent_instance_id
        }
        
    async def health_check(self) -> Dict:
        """Perform health check"""
        return {
            "status": "healthy",
            "agent_id": self.config.agent_id,
            "agent_name": self.config.agent_name,
            "instance_id": self.agent_instance_id,
            "project_id": self.project_id,
            "active_conversation": self.current_conversation_id,
            "container_info": self.get_container_info(),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        }