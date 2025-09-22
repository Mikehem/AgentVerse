#!/usr/bin/env python3
"""
Order Coordinator Agent - Orchestrates the entire order processing workflow
"""

import asyncio
import json
import uuid
import time
from typing import Dict, List
from base_agent import BaseEcommerceAgent, AgentConfig, OrderContext

class OrderCoordinatorAgent(BaseEcommerceAgent):
    def __init__(self, container_id: str = None):
        config = AgentConfig(
            agent_id="order_coordinator",
            agent_name="Order Coordinator Agent",
            agent_type="coordinator",
            role="Orchestrates complete order processing workflow",
            capabilities=[
                "order_validation",
                "workflow_orchestration", 
                "process_coordination",
                "status_tracking",
                "error_handling"
            ],
            container_id=container_id or f"order-coordinator-{uuid.uuid4().hex[:8]}",
            container_name="order-coordinator-container",
            namespace="ecommerce-processing"
        )
        super().__init__(config)
        
    async def process_order(self, order_data: Dict) -> Dict:
        """Main order processing workflow"""
        
        # Create order context
        order_context = OrderContext(
            order_id=order_data.get("order_id", f"ORD{int(time.time())}"),
            customer_id=order_data["customer_id"],
            items=order_data["items"],
            total_amount=float(order_data["total_amount"]),
            payment_method=order_data["payment_method"],
            shipping_address=order_data["shipping_address"]
        )
        
        self.logger.info(f"Starting order processing for order {order_context.order_id}")
        
        # Start conversation for this order
        conversation_id = await self.start_conversation(
            f"Order Processing - {order_context.order_id}",
            order_context
        )
        
        try:
            # Step 1: Log order received
            await self.log_agent_action(
                action="order_received",
                input_data=order_data,
                output_data={
                    "order_id": order_context.order_id,
                    "status": "processing_started",
                    "workflow_steps": [
                        "payment_validation",
                        "inventory_check", 
                        "shipping_setup",
                        "customer_notification",
                        "order_completion"
                    ]
                }
            )
            
            # Step 2: Validate payment with Payment Agent
            self.logger.info(f"Validating payment for order {order_context.order_id}")
            payment_response = await self.send_message_to_agent(
                target_agent_id="payment_processor",
                message_type="validate_payment",
                payload={
                    "order_id": order_context.order_id,
                    "payment_method": order_context.payment_method,
                    "amount": order_context.total_amount,
                    "customer_id": order_context.customer_id
                }
            )
            
            if not payment_response["response_data"]["payment_valid"]:
                raise Exception("Payment validation failed")
                
            # Step 3: Check inventory with Inventory Agent
            self.logger.info(f"Checking inventory for order {order_context.order_id}")
            inventory_response = await self.send_message_to_agent(
                target_agent_id="inventory_manager",
                message_type="check_inventory",
                payload={
                    "order_id": order_context.order_id,
                    "items": order_context.items
                }
            )
            
            if not inventory_response["response_data"]["items_available"]:
                raise Exception("Insufficient inventory")
                
            # Step 4: Setup shipping with Shipping Agent
            self.logger.info(f"Setting up shipping for order {order_context.order_id}")
            shipping_response = await self.send_message_to_agent(
                target_agent_id="shipping_manager",
                message_type="process_shipping",
                payload={
                    "order_id": order_context.order_id,
                    "items": order_context.items,
                    "shipping_address": order_context.shipping_address,
                    "shipping_method": "standard"
                }
            )
            
            # Step 5: Send confirmation with Notification Agent
            self.logger.info(f"Sending confirmation for order {order_context.order_id}")
            notification_response = await self.send_message_to_agent(
                target_agent_id="notification_service",
                message_type="send_notification",
                payload={
                    "order_id": order_context.order_id,
                    "customer_id": order_context.customer_id,
                    "notification_type": "order_confirmed",
                    "channel": "email",
                    "data": {
                        "tracking_number": shipping_response["response_data"]["tracking_number"],
                        "estimated_delivery": shipping_response["response_data"]["estimated_delivery"]
                    }
                }
            )
            
            # Step 6: Finalize order
            final_result = {
                "order_id": order_context.order_id,
                "status": "completed",
                "payment_transaction_id": payment_response["response_data"]["transaction_id"],
                "tracking_number": shipping_response["response_data"]["tracking_number"],
                "estimated_delivery": shipping_response["response_data"]["estimated_delivery"],
                "notification_id": notification_response["response_data"]["notification_id"],
                "total_processing_time": time.time() - time.mktime(time.strptime(order_context.created_at, "%Y-%m-%dT%H:%M:%S.%fZ")),
                "completed_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
            
            await self.log_agent_action(
                action="order_completed",
                input_data={"order_id": order_context.order_id},
                output_data=final_result,
                cost_data={
                    "total_cost": 0.15,  # Estimated cost for all agent operations
                    "input_cost": 0.08,
                    "output_cost": 0.07,
                    "total_tokens": 2500,
                    "prompt_tokens": 1800,
                    "completion_tokens": 700,
                    "provider": "azure_openai",
                    "model": "gpt-4"
                }
            )
            
            await self.finalize_conversation(success=True, final_status="completed")
            
            self.logger.info(f"Order {order_context.order_id} processed successfully")
            return final_result
            
        except Exception as e:
            self.logger.error(f"Order processing failed for {order_context.order_id}: {e}")
            
            # Log failure
            await self.log_agent_action(
                action="order_failed",
                input_data={"order_id": order_context.order_id},
                output_data={
                    "error": str(e),
                    "status": "failed",
                    "failed_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
                },
                success=False,
                error_message=str(e)
            )
            
            await self.finalize_conversation(success=False, final_status="failed")
            
            return {
                "order_id": order_context.order_id,
                "status": "failed",
                "error": str(e)
            }
            
    async def run_continuous_processing(self):
        """Run continuous order processing simulation"""
        self.logger.info("Starting continuous order processing...")
        
        # Sample orders to process
        sample_orders = [
            {
                "customer_id": "CUST001",
                "items": [
                    {"id": "PROD001", "name": "Laptop", "price": 999.99, "quantity": 1},
                    {"id": "PROD002", "name": "Mouse", "price": 29.99, "quantity": 2}
                ],
                "total_amount": 1059.97,
                "payment_method": "credit_card",
                "shipping_address": {
                    "street": "123 Main St",
                    "city": "Anytown", 
                    "state": "CA",
                    "zip": "12345",
                    "country": "USA"
                }
            },
            {
                "customer_id": "CUST002", 
                "items": [
                    {"id": "PROD003", "name": "Smartphone", "price": 699.99, "quantity": 1},
                    {"id": "PROD004", "name": "Case", "price": 19.99, "quantity": 1}
                ],
                "total_amount": 719.98,
                "payment_method": "paypal",
                "shipping_address": {
                    "street": "456 Oak Ave",
                    "city": "Somewhere",
                    "state": "NY", 
                    "zip": "67890",
                    "country": "USA"
                }
            },
            {
                "customer_id": "CUST003",
                "items": [
                    {"id": "PROD005", "name": "Headphones", "price": 149.99, "quantity": 1},
                    {"id": "PROD006", "name": "Cable", "price": 12.99, "quantity": 3}
                ],
                "total_amount": 188.96,
                "payment_method": "apple_pay",
                "shipping_address": {
                    "street": "789 Pine Rd",
                    "city": "Elsewhere",
                    "state": "TX",
                    "zip": "54321", 
                    "country": "USA"
                }
            }
        ]
        
        results = []
        
        for i, order_data in enumerate(sample_orders):
            self.logger.info(f"Processing order {i+1}/{len(sample_orders)}")
            
            # Add some delay between orders to simulate realistic timing
            if i > 0:
                await asyncio.sleep(5)
                
            result = await self.process_order(order_data)
            results.append(result)
            
        self.logger.info(f"Completed processing {len(results)} orders")
        return results

async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Order Coordinator Agent")
    parser.add_argument("--container-id", help="Container ID for this agent instance")
    parser.add_argument("--continuous", action="store_true", help="Run continuous processing")
    
    args = parser.parse_args()
    
    # Create and initialize agent
    agent = OrderCoordinatorAgent(container_id=args.container_id)
    
    try:
        await agent.initialize()
        
        if args.continuous:
            await agent.run_continuous_processing()
        else:
            # Process a single test order
            test_order = {
                "customer_id": "CUST_TEST",
                "items": [
                    {"id": "PROD_TEST", "name": "Test Product", "price": 99.99, "quantity": 1}
                ],
                "total_amount": 99.99,
                "payment_method": "credit_card",
                "shipping_address": {
                    "street": "123 Test St",
                    "city": "Test City",
                    "state": "TC",
                    "zip": "12345",
                    "country": "USA"
                }
            }
            
            result = await agent.process_order(test_order)
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        print(f"Agent failed: {e}")
        raise
        
if __name__ == "__main__":
    asyncio.run(main())