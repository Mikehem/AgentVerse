"""
Base Agent class using Sprint Lens SDK for distributed tracing
All e-commerce agents inherit from this base class
"""

import asyncio
import json
import logging
import time
import uuid
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pathlib import Path
import sys

# Add the SDK to the path
sdk_path = Path(__file__).parent.parent.parent / "Sprint_Lens_SDK" / "src"
sys.path.insert(0, str(sdk_path))

import sprintlens
from sprintlens import SprintLensClient, track, Trace

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

class BaseEcommerceAgent(ABC):
    """Base class for all e-commerce agents with Sprint Lens integration"""
    
    def __init__(self, agent_id: str, agent_name: str, agent_type: str, project_id: str):
        self.agent_id = agent_id
        self.agent_name = agent_name
        self.agent_type = agent_type
        self.project_id = project_id
        
        # Sprint Lens client
        self.sprintlens_client: Optional[SprintLensClient] = None
        self.logger = logging.getLogger(f"{agent_type}.{agent_id}")
        
        # Agent state
        self.is_running = False
        self.processed_orders = []
        self.metrics = {
            "orders_processed": 0,
            "success_rate": 0.0,
            "avg_processing_time": 0.0,
            "total_cost": 0.0
        }
        
        # Load configuration
        self.config = self._load_configuration()
        
    def _load_configuration(self) -> Dict[str, Any]:
        """Load agent configuration from environment and config file"""
        
        # Try to load from config file first
        config_file = Path(__file__).parent / "ecommerce_project_config.json"
        config = {}
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                project_config = json.load(f)
                
            # Extract agent-specific config
            agents_detail = project_config.get("agents_detail", {})
            if self.agent_type in agents_detail:
                config = agents_detail[self.agent_type]
        
        # Override with environment variables
        config.update({
            "sprintlens_url": os.getenv("SPRINT_LENS_URL", "http://localhost:3000"),
            "sprintlens_username": os.getenv("SPRINT_LENS_USERNAME", "admin"),
            "sprintlens_password": os.getenv("SPRINT_LENS_PASSWORD", "OpikAdmin2024!"),
            "workspace_id": os.getenv("WORKSPACE_ID", "default"),
            
            # Azure OpenAI configuration
            "azure_openai_endpoint": os.getenv("AZURE_OPENAI_ENDPOINT"),
            "azure_openai_api_key": os.getenv("AZURE_OPENAI_API_KEY"),
            "azure_openai_api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
            "azure_openai_deployment": os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4"),
            
            # Agent specific
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "agent_type": self.agent_type,
            "project_id": self.project_id
        })
        
        return config
    
    async def initialize(self):
        """Initialize the agent and Sprint Lens client"""
        
        self.logger.info(f"Initializing {self.agent_name}...")
        
        try:
            # Initialize Sprint Lens client
            self.sprintlens_client = SprintLensClient(
                url=self.config["sprintlens_url"],
                username=self.config["sprintlens_username"],
                password=self.config["sprintlens_password"],
                workspace_id=self.config["workspace_id"],
                project_name=self.project_id
            )
            
            await self.sprintlens_client.initialize()
            self.logger.info("✅ Sprint Lens client initialized")
            
            # Configure global client for decorators
            sprintlens.configure(
                url=self.config["sprintlens_url"],
                username=self.config["sprintlens_username"],
                password=self.config["sprintlens_password"],
                workspace_id=self.config["workspace_id"]
            )
            
            # Initialize agent-specific components
            await self._initialize_agent()
            
            self.is_running = True
            self.logger.info(f"✅ {self.agent_name} initialized successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize {self.agent_name}: {e}")
            raise
    
    @abstractmethod
    async def _initialize_agent(self):
        """Initialize agent-specific components (to be implemented by subclasses)"""
        pass
    
    @abstractmethod
    async def process_order(self, order: Dict[str, Any], trace_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Process an order (to be implemented by subclasses)"""
        pass
    
    @track
    async def handle_order_request(self, order: Dict[str, Any], trace_context: Optional[Dict] = None) -> Dict[str, Any]:
        """Main order handling method with automatic tracing"""
        
        start_time = time.time()
        order_id = order.get("order_id", str(uuid.uuid4()))
        
        self.logger.info(f"Processing order {order_id}")
        
        try:
            # Set trace metadata
            current_trace = sprintlens.get_current_trace()
            if current_trace:
                current_trace.update(
                    name=f"{self.agent_type}_process_order",
                    metadata={
                        "agent_id": self.agent_id,
                        "agent_name": self.agent_name,
                        "agent_type": self.agent_type,
                        "order_id": order_id,
                        "project_id": self.project_id
                    },
                    tags={
                        "agent": self.agent_type,
                        "operation": "process_order",
                        "order_id": order_id
                    }
                )
            
            # Process the order
            result = await self.process_order(order, trace_context)
            
            # Update metrics
            processing_time = time.time() - start_time
            self.metrics["orders_processed"] += 1
            self.metrics["avg_processing_time"] = (
                (self.metrics["avg_processing_time"] * (self.metrics["orders_processed"] - 1) + processing_time) 
                / self.metrics["orders_processed"]
            )
            
            # Calculate cost (mock calculation)
            estimated_cost = processing_time * 0.001  # $0.001 per second
            self.metrics["total_cost"] += estimated_cost
            
            # Update trace with metrics
            if current_trace:
                current_trace.update(
                    output=result,
                    metrics={
                        "processing_time_seconds": processing_time,
                        "estimated_cost_usd": estimated_cost,
                        "success": True
                    }
                )
            
            # Log A2A communication if this was a cross-agent call
            if trace_context:
                await self._log_a2a_communication(trace_context, order, result)
            
            self.processed_orders.append({
                "order_id": order_id,
                "processed_at": time.time(),
                "processing_time": processing_time,
                "result": result
            })
            
            self.logger.info(f"✅ Successfully processed order {order_id} in {processing_time:.2f}s")
            return result
            
        except Exception as e:
            # Update trace with error
            if current_trace:
                current_trace.update(
                    output={"error": str(e)},
                    metrics={
                        "processing_time_seconds": time.time() - start_time,
                        "success": False,
                        "error": str(e)
                    }
                )
            
            self.logger.error(f"❌ Failed to process order {order_id}: {e}")
            raise
    
    async def _log_a2a_communication(self, trace_context: Dict, request: Dict, response: Dict):
        """Log Agent-to-Agent communication"""
        
        if not self.sprintlens_client:
            return
        
        try:
            # Create A2A communication record
            a2a_data = {
                "from_agent_id": trace_context.get("source_agent_id"),
                "to_agent_id": self.agent_id,
                "trace_id": trace_context.get("trace_id"),
                "span_id": trace_context.get("span_id"),
                "communication_type": "http_request",
                "request_data": request,
                "response_data": response,
                "timestamp": time.time(),
                "metadata": {
                    "project_id": self.project_id,
                    "order_id": request.get("order_id"),
                    "communication_pattern": "synchronous"
                }
            }
            
            # Send to backend (this would be implemented in the SDK)
            self.logger.info(f"📡 A2A communication logged: {trace_context.get('source_agent_id')} -> {self.agent_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to log A2A communication: {e}")
    
    async def call_agent(self, target_agent_type: str, target_agent_url: str, data: Dict[str, Any], operation: str = "process") -> Dict[str, Any]:
        """Make a call to another agent with trace context propagation"""
        
        import httpx
        
        # Create trace context for propagation
        current_trace = sprintlens.get_current_trace()
        trace_context = {
            "source_agent_id": self.agent_id,
            "source_agent_type": self.agent_type,
            "trace_id": current_trace.trace_id if current_trace else str(uuid.uuid4()),
            "span_id": str(uuid.uuid4()),
            "project_id": self.project_id
        }
        
        # Add trace context to the request
        request_data = {
            **data,
            "_trace_context": trace_context
        }
        
        self.logger.info(f"🔗 Calling {target_agent_type} at {target_agent_url}")
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{target_agent_url}/{operation}",
                    json=request_data,
                    timeout=30.0
                )
                
                response.raise_for_status()
                result = response.json()
                
                self.logger.info(f"✅ Received response from {target_agent_type}")
                return result
                
        except Exception as e:
            self.logger.error(f"❌ Failed to call {target_agent_type}: {e}")
            raise
    
    async def start_http_server(self, port: int = 8080):
        """Start HTTP server for receiving requests"""
        
        from aiohttp import web, web_runner
        
        app = web.Application()
        
        # Add routes
        app.router.add_post('/process', self._handle_http_request)
        app.router.add_get('/health', self._handle_health_check)
        app.router.add_get('/metrics', self._handle_metrics)
        
        runner = web_runner.AppRunner(app)
        await runner.setup()
        
        site = web_runner.TCPSite(runner, '0.0.0.0', port)
        await site.start()
        
        self.logger.info(f"🌐 HTTP server started on port {port}")
        
        return runner
    
    async def _handle_http_request(self, request):
        """Handle incoming HTTP requests"""
        
        from aiohttp import web
        
        try:
            data = await request.json()
            
            # Extract trace context if present
            trace_context = data.pop("_trace_context", None)
            
            # Process the request
            result = await self.handle_order_request(data, trace_context)
            
            return web.json_response(result)
            
        except Exception as e:
            self.logger.error(f"Error handling HTTP request: {e}")
            return web.json_response(
                {"error": str(e)}, 
                status=500
            )
    
    async def _handle_health_check(self, request):
        """Health check endpoint"""
        
        from aiohttp import web
        
        return web.json_response({
            "status": "healthy" if self.is_running else "unhealthy",
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "agent_type": self.agent_type,
            "project_id": self.project_id,
            "uptime": time.time(),
            "metrics": self.metrics
        })
    
    async def _handle_metrics(self, request):
        """Metrics endpoint"""
        
        from aiohttp import web
        
        return web.json_response({
            "agent_metrics": self.metrics,
            "processed_orders_count": len(self.processed_orders),
            "last_processed": self.processed_orders[-1] if self.processed_orders else None
        })
    
    async def shutdown(self):
        """Shutdown the agent gracefully"""
        
        self.logger.info(f"Shutting down {self.agent_name}...")
        
        self.is_running = False
        
        if self.sprintlens_client:
            await self.sprintlens_client.close()
        
        self.logger.info(f"✅ {self.agent_name} shutdown complete")