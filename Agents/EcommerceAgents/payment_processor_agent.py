#!/usr/bin/env python3
"""
Payment Processor Agent - Handles payment validation and processing
"""

import asyncio
import json
import uuid
import time
import random
from typing import Dict, List
from base_agent import BaseEcommerceAgent, AgentConfig, OrderContext

class PaymentProcessorAgent(BaseEcommerceAgent):
    def __init__(self, container_id: str = None):
        config = AgentConfig(
            agent_id="payment_processor",
            agent_name="Payment Processor Agent",
            agent_type="specialist",
            role="Handles payment validation and transaction processing",
            capabilities=[
                "payment_validation",
                "transaction_processing",
                "fraud_detection", 
                "refund_processing",
                "payment_gateway_integration"
            ],
            container_id=container_id or f"payment-processor-{uuid.uuid4().hex[:8]}",
            container_name="payment-processor-container",
            namespace="ecommerce-processing"
        )
        super().__init__(config)
        
    async def validate_payment(self, payment_request: Dict) -> Dict:
        """Validate payment details and process transaction"""
        
        order_id = payment_request["order_id"]
        payment_method = payment_request["payment_method"]
        amount = payment_request["amount"]
        customer_id = payment_request["customer_id"]
        
        self.logger.info(f"Processing payment validation for order {order_id}")
        
        # Start conversation for payment processing
        conversation_id = await self.start_conversation(
            f"Payment Processing - {order_id}",
            OrderContext(
                order_id=order_id,
                customer_id=customer_id,
                items=[],  # Will be filled by coordinator
                total_amount=amount,
                payment_method=payment_method,
                shipping_address={}
            )
        )
        
        try:
            # Step 1: Log payment request received
            await self.log_agent_action(
                action="payment_request_received",
                input_data=payment_request,
                output_data={
                    "order_id": order_id,
                    "payment_method": payment_method,
                    "amount": amount,
                    "status": "validating"
                }
            )
            
            # Step 2: Simulate fraud detection
            await asyncio.sleep(0.8)  # Simulate processing time
            fraud_score = await self.perform_fraud_detection(customer_id, amount, payment_method)
            
            await self.log_agent_action(
                action="fraud_detection",
                input_data={
                    "customer_id": customer_id,
                    "amount": amount,
                    "payment_method": payment_method
                },
                output_data={
                    "fraud_score": fraud_score,
                    "fraud_threshold": 0.7,
                    "fraud_check_passed": fraud_score < 0.7
                },
                cost_data={
                    "total_cost": 0.02,
                    "input_cost": 0.01,
                    "output_cost": 0.01,
                    "total_tokens": 350,
                    "prompt_tokens": 250,
                    "completion_tokens": 100,
                    "provider": "azure_openai",
                    "model": "gpt-4"
                }
            )
            
            if fraud_score >= 0.7:
                raise Exception(f"Transaction flagged for fraud (score: {fraud_score:.2f})")
                
            # Step 3: Validate payment method
            await asyncio.sleep(0.5)
            payment_validation = await self.validate_payment_method(payment_method, amount)
            
            await self.log_agent_action(
                action="payment_method_validation",
                input_data={
                    "payment_method": payment_method,
                    "amount": amount
                },
                output_data=payment_validation
            )
            
            if not payment_validation["valid"]:
                raise Exception(f"Payment method validation failed: {payment_validation['error']}")
                
            # Step 4: Process transaction
            await asyncio.sleep(1.2)  # Simulate gateway processing time
            transaction_result = await self.process_transaction(order_id, amount, payment_method)
            
            # Step 5: Log successful payment
            final_result = {
                "payment_valid": True,
                "transaction_id": transaction_result["transaction_id"],
                "payment_method": payment_method,
                "amount_authorized": amount,
                "fraud_score": fraud_score,
                "processing_time": 2.5,
                "gateway_response": transaction_result,
                "processed_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
            
            await self.log_agent_action(
                action="payment_processed_successfully", 
                input_data=payment_request,
                output_data=final_result,
                cost_data={
                    "total_cost": 0.04,
                    "input_cost": 0.025,
                    "output_cost": 0.015,
                    "total_tokens": 500,
                    "prompt_tokens": 350,
                    "completion_tokens": 150,
                    "provider": "azure_openai",
                    "model": "gpt-4"
                }
            )
            
            await self.finalize_conversation(success=True, final_status="payment_approved")
            
            self.logger.info(f"Payment processed successfully for order {order_id}")
            return final_result
            
        except Exception as e:
            self.logger.error(f"Payment processing failed for order {order_id}: {e}")
            
            # Log payment failure
            error_result = {
                "payment_valid": False,
                "error": str(e),
                "payment_method": payment_method,
                "amount": amount,
                "failed_at": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            }
            
            await self.log_agent_action(
                action="payment_processing_failed",
                input_data=payment_request,
                output_data=error_result,
                success=False,
                error_message=str(e)
            )
            
            await self.finalize_conversation(success=False, final_status="payment_declined")
            
            return error_result
            
    async def perform_fraud_detection(self, customer_id: str, amount: float, payment_method: str) -> float:
        """Perform fraud detection analysis"""
        # Simulate AI-based fraud detection
        base_score = random.uniform(0.1, 0.6)
        
        # Increase fraud score for suspicious patterns
        if amount > 1000:
            base_score += 0.1
        if payment_method == "new_card":
            base_score += 0.15
        if "TEST" in customer_id.upper():
            base_score += 0.05
            
        return min(base_score, 1.0)
        
    async def validate_payment_method(self, payment_method: str, amount: float) -> Dict:
        """Validate the payment method"""
        # Simulate different payment method validations
        validation_results = {
            "credit_card": {"valid": True, "daily_limit": 5000},
            "debit_card": {"valid": True, "daily_limit": 2000}, 
            "paypal": {"valid": True, "daily_limit": 10000},
            "apple_pay": {"valid": True, "daily_limit": 3000},
            "google_pay": {"valid": True, "daily_limit": 3000}
        }
        
        method_info = validation_results.get(payment_method, {"valid": False, "error": "Unsupported payment method"})
        
        if method_info["valid"] and amount > method_info.get("daily_limit", 1000):
            return {"valid": False, "error": f"Amount exceeds daily limit for {payment_method}"}
            
        return method_info
        
    async def process_transaction(self, order_id: str, amount: float, payment_method: str) -> Dict:
        """Process the actual transaction with payment gateway"""
        # Simulate occasional payment gateway failures (3% failure rate)
        if random.random() < 0.03:
            raise Exception("Payment gateway timeout")
            
        transaction_id = f"TXN_{int(time.time())}_{uuid.uuid4().hex[:8].upper()}"
        
        return {
            "transaction_id": transaction_id,
            "status": "approved",
            "authorization_code": f"AUTH{uuid.uuid4().hex[:6].upper()}",
            "gateway": "payment_gateway_pro",
            "gateway_transaction_id": f"GTW_{uuid.uuid4().hex[:12]}",
            "processing_fee": round(amount * 0.029 + 0.30, 2),  # 2.9% + $0.30
            "approved_amount": amount,
            "currency": "USD"
        }
        
    async def run_payment_service(self):
        """Run as a continuous payment processing service"""
        self.logger.info("Payment processor service started - waiting for payment requests...")
        
        # In a real system, this would listen to message queues or HTTP requests
        # For demo, we'll simulate some payment processing
        
        sample_payments = [
            {
                "order_id": "ORD001",
                "customer_id": "CUST001", 
                "amount": 1059.97,
                "payment_method": "credit_card"
            },
            {
                "order_id": "ORD002",
                "customer_id": "CUST002",
                "amount": 719.98,
                "payment_method": "paypal"
            },
            {
                "order_id": "ORD003", 
                "customer_id": "CUST003",
                "amount": 188.96,
                "payment_method": "apple_pay"
            }
        ]
        
        for payment_request in sample_payments:
            self.logger.info(f"Processing payment request: {payment_request['order_id']}")
            result = await self.validate_payment(payment_request)
            self.logger.info(f"Payment result: {result['payment_valid']}")
            
            # Wait before processing next payment
            await asyncio.sleep(3)

async def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Payment Processor Agent")
    parser.add_argument("--container-id", help="Container ID for this agent instance")
    parser.add_argument("--service", action="store_true", help="Run as continuous service")
    
    args = parser.parse_args()
    
    # Create and initialize agent
    agent = PaymentProcessorAgent(container_id=args.container_id)
    
    try:
        await agent.initialize()
        
        if args.service:
            await agent.run_payment_service()
        else:
            # Process a single test payment
            test_payment = {
                "order_id": "ORD_TEST",
                "customer_id": "CUST_TEST",
                "amount": 99.99,
                "payment_method": "credit_card"
            }
            
            result = await agent.validate_payment(test_payment)
            print(json.dumps(result, indent=2))
            
    except Exception as e:
        print(f"Payment processor failed: {e}")
        raise
        
if __name__ == "__main__":
    asyncio.run(main())