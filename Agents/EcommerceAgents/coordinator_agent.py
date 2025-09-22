"""
Order Coordinator Agent - Orchestrates the complete order processing workflow
Demonstrates distributed tracing with multiple agent interactions
"""

import asyncio
import time
import uuid
from typing import Dict, Any, Optional
from base_agent_sdk import BaseEcommerceAgent

class OrderCoordinatorAgent(BaseEcommerceAgent):
    """
    Order Coordinator Agent - Main orchestrator for distributed order processing
    
    This agent demonstrates:
    - Creating root distributed traces
    - Coordinating multiple downstream agents
    - Propagating trace context across agent boundaries
    - Collecting and correlating responses from multiple agents
    """
    
    def __init__(self, agent_id: str, project_id: str):
        super().__init__(
            agent_id=agent_id,
            agent_name="Order Coordinator Agent",
            agent_type="coordinator",
            project_id=project_id
        )
        
        # Downstream agent configurations
        self.downstream_agents = {
            "payment_processor": {"url": "http://payment-processor:8080", "port": 8081},
            "inventory_manager": {"url": "http://inventory-manager:8080", "port": 8082},
            "shipping_manager": {"url": "http://shipping-manager:8080", "port": 8083},
            "notification_service": {"url": "http://notification-service:8080", "port": 8084}
        }
        
        # For local development, use localhost
        if "localhost" in self.config.get("sprintlens_url", ""):
            for agent_type, config in self.downstream_agents.items():
                config["url"] = f"http://localhost:{config['port']}"
    
    async def _initialize_agent(self):
        """Initialize coordinator-specific components"""
        self.logger.info("Initializing Order Coordinator...")
        
        # Test connectivity to downstream agents
        await self._test_downstream_connectivity()
    
    async def _test_downstream_connectivity(self):
        """Test connectivity to all downstream agents"""
        
        import httpx
        
        for agent_type, config in self.downstream_agents.items():
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{config['url']}/health", timeout=5)
                    if response.status_code == 200:
                        self.logger.info(f"✅ Connected to {agent_type}")
                    else:
                        self.logger.warning(f"⚠️  {agent_type} unhealthy: {response.status_code}")
            except Exception as e:
                self.logger.warning(f"⚠️  Cannot reach {agent_type}: {e}")
    
    async def process_order(self, order: Dict[str, Any], trace_context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Process a complete order through the distributed system
        
        This method demonstrates the full distributed tracing workflow:
        1. Creates a root distributed trace
        2. Calls multiple downstream agents in parallel and sequence
        3. Correlates all responses
        4. Logs detailed A2A communications
        """
        
        order_id = order.get("order_id", str(uuid.uuid4()))
        customer_id = order.get("customer_id", "unknown")
        items = order.get("items", [])
        
        self.logger.info(f"🎯 Starting distributed order processing for order {order_id}")
        
        # Create distributed trace context
        distributed_trace_id = str(uuid.uuid4())
        root_span_id = str(uuid.uuid4())
        
        trace_context = {
            "distributed_trace_id": distributed_trace_id,
            "parent_span_id": root_span_id,
            "source_agent_id": self.agent_id,
            "source_agent_type": self.agent_type,
            "order_id": order_id,
            "project_id": self.project_id,
            "trace_hierarchy": [self.agent_id]
        }
        
        # Track order processing stages
        processing_stages = {
            "validation": {"status": "pending", "start_time": None, "end_time": None},
            "payment": {"status": "pending", "start_time": None, "end_time": None},
            "inventory": {"status": "pending", "start_time": None, "end_time": None},
            "shipping": {"status": "pending", "start_time": None, "end_time": None},
            "notification": {"status": "pending", "start_time": None, "end_time": None}
        }
        
        try:
            # Stage 1: Order Validation
            self.logger.info("📋 Stage 1: Order Validation")
            processing_stages["validation"]["start_time"] = time.time()
            
            validation_result = await self._validate_order(order, trace_context)
            processing_stages["validation"]["end_time"] = time.time()
            processing_stages["validation"]["status"] = "completed"
            
            if not validation_result["valid"]:
                raise Exception(f"Order validation failed: {validation_result['reason']}")
            
            # Stage 2: Parallel Processing - Payment and Inventory Check
            self.logger.info("⚡ Stage 2: Parallel Payment & Inventory Processing")
            
            # Create child spans for parallel operations
            payment_span_id = str(uuid.uuid4())
            inventory_span_id = str(uuid.uuid4())
            
            payment_context = {
                **trace_context,
                "span_id": payment_span_id,
                "parent_span_id": root_span_id,
                "operation": "payment_processing"
            }
            
            inventory_context = {
                **trace_context,
                "span_id": inventory_span_id,
                "parent_span_id": root_span_id,
                "operation": "inventory_check"
            }
            
            # Execute in parallel
            processing_stages["payment"]["start_time"] = time.time()
            processing_stages["inventory"]["start_time"] = time.time()
            
            payment_task = self._process_payment(order, payment_context)
            inventory_task = self._check_inventory(order, inventory_context)
            
            payment_result, inventory_result = await asyncio.gather(
                payment_task, inventory_task, return_exceptions=True
            )
            
            processing_stages["payment"]["end_time"] = time.time()
            processing_stages["inventory"]["end_time"] = time.time()
            
            # Handle any exceptions from parallel processing
            if isinstance(payment_result, Exception):
                processing_stages["payment"]["status"] = "failed"
                raise payment_result
            if isinstance(inventory_result, Exception):
                processing_stages["inventory"]["status"] = "failed"
                raise inventory_result
                
            processing_stages["payment"]["status"] = "completed"
            processing_stages["inventory"]["status"] = "completed"
            
            # Stage 3: Shipping Coordination (depends on successful payment & inventory)
            self.logger.info("🚚 Stage 3: Shipping Coordination")
            processing_stages["shipping"]["start_time"] = time.time()
            
            shipping_span_id = str(uuid.uuid4())
            shipping_context = {
                **trace_context,
                "span_id": shipping_span_id,
                "parent_span_id": root_span_id,
                "operation": "shipping_coordination",
                "dependencies": [payment_span_id, inventory_span_id]
            }
            
            shipping_result = await self._coordinate_shipping(order, shipping_context, payment_result, inventory_result)
            processing_stages["shipping"]["end_time"] = time.time()
            processing_stages["shipping"]["status"] = "completed"
            
            # Stage 4: Customer Notification
            self.logger.info("📧 Stage 4: Customer Notification")
            processing_stages["notification"]["start_time"] = time.time()
            
            notification_span_id = str(uuid.uuid4())
            notification_context = {
                **trace_context,
                "span_id": notification_span_id,
                "parent_span_id": root_span_id,
                "operation": "customer_notification",
                "dependencies": [shipping_span_id]
            }
            
            notification_result = await self._send_notifications(order, notification_context, {
                "payment": payment_result,
                "inventory": inventory_result,
                "shipping": shipping_result
            })
            processing_stages["notification"]["end_time"] = time.time()
            processing_stages["notification"]["status"] = "completed"
            
            # Calculate total processing time
            total_processing_time = time.time() - processing_stages["validation"]["start_time"]
            
            # Create comprehensive result
            result = {
                "order_id": order_id,
                "status": "completed",
                "distributed_trace_id": distributed_trace_id,
                "processing_stages": processing_stages,
                "results": {
                    "validation": validation_result,
                    "payment": payment_result,
                    "inventory": inventory_result,
                    "shipping": shipping_result,
                    "notification": notification_result
                },
                "metrics": {
                    "total_processing_time_seconds": total_processing_time,
                    "stages_completed": len([s for s in processing_stages.values() if s["status"] == "completed"]),
                    "parallel_efficiency": self._calculate_parallel_efficiency(processing_stages)
                },
                "trace_metadata": {
                    "agent_interactions": 4,
                    "parallel_operations": 2,
                    "sequential_dependencies": 2,
                    "total_spans": 5
                }
            }
            
            self.logger.info(f"✅ Order {order_id} completed successfully in {total_processing_time:.2f}s")
            self.logger.info(f"📊 Distributed trace: {distributed_trace_id}")
            
            return result
            
        except Exception as e:
            # Mark failed stages
            for stage, info in processing_stages.items():
                if info["status"] == "pending":
                    info["status"] = "failed"
                    if info["start_time"] and not info["end_time"]:
                        info["end_time"] = time.time()
            
            error_result = {
                "order_id": order_id,
                "status": "failed",
                "error": str(e),
                "distributed_trace_id": distributed_trace_id,
                "processing_stages": processing_stages,
                "partial_results": {},
                "failure_point": self._identify_failure_point(processing_stages)
            }
            
            self.logger.error(f"❌ Order {order_id} failed: {e}")
            raise Exception(f"Order processing failed: {e}")
    
    async def _validate_order(self, order: Dict[str, Any], trace_context: Dict) -> Dict[str, Any]:
        """Validate order before processing"""
        
        await asyncio.sleep(0.1)  # Simulate processing time
        
        # Basic validation logic
        required_fields = ["customer_id", "items"]
        missing_fields = [field for field in required_fields if not order.get(field)]
        
        if missing_fields:
            return {
                "valid": False,
                "reason": f"Missing required fields: {missing_fields}",
                "validation_time": 0.1
            }
        
        items = order.get("items", [])
        if not items or len(items) == 0:
            return {
                "valid": False,
                "reason": "No items in order",
                "validation_time": 0.1
            }
        
        # Validate each item
        for i, item in enumerate(items):
            if not item.get("product_id") or not item.get("quantity"):
                return {
                    "valid": False,
                    "reason": f"Item {i} missing product_id or quantity",
                    "validation_time": 0.1
                }
        
        return {
            "valid": True,
            "validated_items": len(items),
            "customer_id": order.get("customer_id"),
            "validation_time": 0.1
        }
    
    async def _process_payment(self, order: Dict[str, Any], trace_context: Dict) -> Dict[str, Any]:
        """Process payment through Payment Processor Agent"""
        
        return await self.call_agent(
            target_agent_type="payment_processor",
            target_agent_url=self.downstream_agents["payment_processor"]["url"],
            data={
                "order_id": order.get("order_id"),
                "customer_id": order.get("customer_id"),
                "amount": sum(item.get("price", 10.0) * item.get("quantity", 1) for item in order.get("items", [])),
                "payment_method": order.get("payment_method", "credit_card"),
                "trace_context": trace_context
            },
            operation="process"
        )
    
    async def _check_inventory(self, order: Dict[str, Any], trace_context: Dict) -> Dict[str, Any]:
        """Check inventory through Inventory Manager Agent"""
        
        return await self.call_agent(
            target_agent_type="inventory_manager",
            target_agent_url=self.downstream_agents["inventory_manager"]["url"],
            data={
                "order_id": order.get("order_id"),
                "items": order.get("items", []),
                "trace_context": trace_context
            },
            operation="process"
        )
    
    async def _coordinate_shipping(self, order: Dict[str, Any], trace_context: Dict, payment_result: Dict, inventory_result: Dict) -> Dict[str, Any]:
        """Coordinate shipping through Shipping Manager Agent"""
        
        return await self.call_agent(
            target_agent_type="shipping_manager",
            target_agent_url=self.downstream_agents["shipping_manager"]["url"],
            data={
                "order_id": order.get("order_id"),
                "customer_id": order.get("customer_id"),
                "items": order.get("items", []),
                "shipping_address": order.get("shipping_address", {}),
                "payment_confirmed": payment_result.get("status") == "approved",
                "inventory_reserved": inventory_result.get("all_available", False),
                "trace_context": trace_context
            },
            operation="process"
        )
    
    async def _send_notifications(self, order: Dict[str, Any], trace_context: Dict, processing_results: Dict) -> Dict[str, Any]:
        """Send notifications through Notification Service Agent"""
        
        return await self.call_agent(
            target_agent_type="notification_service",
            target_agent_url=self.downstream_agents["notification_service"]["url"],
            data={
                "order_id": order.get("order_id"),
                "customer_id": order.get("customer_id"),
                "notification_type": "order_confirmation",
                "order_details": order,
                "processing_summary": processing_results,
                "trace_context": trace_context
            },
            operation="process"
        )
    
    def _calculate_parallel_efficiency(self, processing_stages: Dict) -> float:
        """Calculate efficiency gained from parallel processing"""
        
        payment_time = processing_stages["payment"]["end_time"] - processing_stages["payment"]["start_time"]
        inventory_time = processing_stages["inventory"]["end_time"] - processing_stages["inventory"]["start_time"]
        
        sequential_time = payment_time + inventory_time
        parallel_time = max(payment_time, inventory_time)
        
        if sequential_time > 0:
            return round((sequential_time - parallel_time) / sequential_time * 100, 2)
        return 0.0
    
    def _identify_failure_point(self, processing_stages: Dict) -> str:
        """Identify where in the pipeline the failure occurred"""
        
        for stage_name, stage_info in processing_stages.items():
            if stage_info["status"] == "failed":
                return stage_name
        return "unknown"

async def main():
    """Run the Order Coordinator Agent"""
    
    import os
    import signal
    
    # Get configuration from environment
    agent_id = os.getenv("AGENT_ID", "coordinator_001")
    project_id = os.getenv("PROJECT_ID", "ecommerce_distributed_processing_v3")
    port = int(os.getenv("PORT", "8080"))
    
    # Create and initialize agent
    agent = OrderCoordinatorAgent(agent_id, project_id)
    
    try:
        await agent.initialize()
        
        # Start HTTP server
        runner = await agent.start_http_server(port)
        
        print(f"🎯 Order Coordinator Agent running on port {port}")
        print(f"📊 Agent ID: {agent_id}")
        print(f"📁 Project ID: {project_id}")
        print("🔗 Endpoints:")
        print(f"   POST http://localhost:{port}/process - Process orders")
        print(f"   GET  http://localhost:{port}/health  - Health check")
        print(f"   GET  http://localhost:{port}/metrics - Agent metrics")
        
        # Keep running
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n⏹️  Shutting down...")
        
    except Exception as e:
        print(f"❌ Failed to start agent: {e}")
        raise
    finally:
        await agent.shutdown()

if __name__ == "__main__":
    asyncio.run(main())