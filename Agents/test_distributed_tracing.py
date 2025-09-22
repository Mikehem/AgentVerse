#!/usr/bin/env python3
"""
Test script for Agent Lens Distributed Tracing System
Validates that all APIs and components are working correctly
"""

import asyncio
import aiohttp
import json
import time
import sys
from typing import Dict, List, Optional

class DistributedTracingTester:
    def __init__(self, api_base_url: str = "http://localhost:3000"):
        self.api_base_url = api_base_url
        self.session = None
        self.test_results = []
        
    async def initialize(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup(self):
        """Clean up resources"""
        if self.session:
            await self.session.close()
            
    async def test_api_endpoint(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict:
        """Test a single API endpoint"""
        url = f"{self.api_base_url}{endpoint}"
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url) as response:
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status": response.status,
                        "success": response.status < 400,
                        "data": await response.json() if response.content_type == 'application/json' else None
                    }
            elif method.upper() == "POST":
                async with self.session.post(url, json=data, headers={"Content-Type": "application/json"}) as response:
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status": response.status,
                        "success": response.status < 400,
                        "data": await response.json() if response.content_type == 'application/json' else None
                    }
            elif method.upper() == "PUT":
                async with self.session.put(url, json=data, headers={"Content-Type": "application/json"}) as response:
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status": response.status,
                        "success": response.status < 400,
                        "data": await response.json() if response.content_type == 'application/json' else None
                    }
            else:
                result = {
                    "endpoint": endpoint,
                    "method": method,
                    "status": 405,
                    "success": False,
                    "error": f"Unsupported method: {method}"
                }
                
        except Exception as e:
            result = {
                "endpoint": endpoint,
                "method": method,
                "status": 0,
                "success": False,
                "error": str(e)
            }
            
        self.test_results.append(result)
        return result
        
    async def test_trace_creation(self) -> str:
        """Test creating a new distributed trace"""
        print("🧪 Testing trace creation...")
        
        trace_data = {
            "serviceName": "test-service",
            "agentCount": 1,
            "serviceCount": 1,
            "containerCount": 1,
            "metadata": {
                "test": True,
                "scenario": "api-test"
            }
        }
        
        result = await self.test_api_endpoint("POST", "/api/v1/distributed-traces", trace_data)
        
        if result["success"]:
            trace_id = result["data"]["data"]["id"]
            print(f"✅ Trace created successfully: {trace_id}")
            return trace_id
        else:
            print(f"❌ Failed to create trace: {result.get('error', 'Unknown error')}")
            return None
            
    async def test_span_creation(self, trace_id: str) -> str:
        """Test creating a span within a trace"""
        print("🧪 Testing span creation...")
        
        span_data = {
            "traceId": trace_id,
            "operationName": "test-operation",
            "serviceName": "test-service",
            "agentId": "test-agent",
            "agentType": "worker",
            "communicationType": "direct",
            "tags": {
                "test.operation": "api-test",
                "test.version": "1.0.0"
            }
        }
        
        result = await self.test_api_endpoint("POST", "/api/v1/distributed-traces/spans", span_data)
        
        if result["success"]:
            span_id = result["data"]["data"]["id"]
            print(f"✅ Span created successfully: {span_id}")
            return span_id
        else:
            print(f"❌ Failed to create span: {result.get('error', 'Unknown error')}")
            return None
            
    async def test_a2a_communication(self, trace_id: str, source_span_id: str) -> str:
        """Test creating A2A communication"""
        print("🧪 Testing A2A communication...")
        
        a2a_data = {
            "traceId": trace_id,
            "sourceSpanId": source_span_id,
            "sourceAgentId": "test-agent-1",
            "targetAgentId": "test-agent-2",
            "communicationType": "http",
            "protocol": "http",
            "messageType": "test-message",
            "payload": {
                "test": True,
                "message": "Hello from test agent 1"
            }
        }
        
        result = await self.test_api_endpoint("POST", "/api/v1/distributed-traces/a2a", a2a_data)
        
        if result["success"]:
            a2a_id = result["data"]["data"]["id"]
            print(f"✅ A2A communication created successfully: {a2a_id}")
            return a2a_id
        else:
            print(f"❌ Failed to create A2A communication: {result.get('error', 'Unknown error')}")
            return None
            
    async def test_span_completion(self, span_id: str):
        """Test completing a span with metrics"""
        print("🧪 Testing span completion...")
        
        update_data = {
            "id": span_id,
            "status": "success",
            "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "totalCost": 0.025,
            "inputCost": 0.01,
            "outputCost": 0.015,
            "promptTokens": 100,
            "completionTokens": 50,
            "totalTokens": 150,
            "provider": "test-provider",
            "modelName": "test-model-v1"
        }
        
        result = await self.test_api_endpoint("PUT", "/api/v1/distributed-traces/spans", update_data)
        
        if result["success"]:
            print("✅ Span completed successfully")
        else:
            print(f"❌ Failed to complete span: {result.get('error', 'Unknown error')}")
            
    async def test_a2a_completion(self, a2a_id: str):
        """Test completing A2A communication"""
        print("🧪 Testing A2A communication completion...")
        
        update_data = {
            "id": a2a_id,
            "status": "success",
            "response": {
                "message": "Hello back from test agent 2",
                "processed": True
            },
            "endTime": time.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "duration": 150
        }
        
        result = await self.test_api_endpoint("PUT", "/api/v1/distributed-traces/a2a", update_data)
        
        if result["success"]:
            print("✅ A2A communication completed successfully")
        else:
            print(f"❌ Failed to complete A2A communication: {result.get('error', 'Unknown error')}")
            
    async def test_trace_retrieval(self, trace_id: str):
        """Test retrieving trace data"""
        print("🧪 Testing trace retrieval...")
        
        # Test getting traces list
        result = await self.test_api_endpoint("GET", "/api/v1/distributed-traces?includeMetrics=true")
        
        if result["success"]:
            traces = result["data"]["data"]
            print(f"✅ Retrieved {len(traces)} traces")
        else:
            print(f"❌ Failed to retrieve traces: {result.get('error', 'Unknown error')}")
            
        # Test getting spans for trace
        result = await self.test_api_endpoint("GET", f"/api/v1/distributed-traces/spans?traceId={trace_id}&includeA2A=true")
        
        if result["success"]:
            spans = result["data"]["data"]
            print(f"✅ Retrieved {len(spans)} spans for trace")
        else:
            print(f"❌ Failed to retrieve spans: {result.get('error', 'Unknown error')}")
            
        # Test getting A2A communications
        result = await self.test_api_endpoint("GET", f"/api/v1/distributed-traces/a2a?traceId={trace_id}")
        
        if result["success"]:
            a2a_comms = result["data"]["data"]
            print(f"✅ Retrieved {len(a2a_comms)} A2A communications for trace")
        else:
            print(f"❌ Failed to retrieve A2A communications: {result.get('error', 'Unknown error')}")
            
    async def test_trace_correlation(self, trace_id: str):
        """Test trace correlation and analysis"""
        print("🧪 Testing trace correlation...")
        
        result = await self.test_api_endpoint("GET", f"/api/v1/distributed-traces/correlations?traceId={trace_id}&analysisType=all")
        
        if result["success"]:
            correlation_data = result["data"]
            print("✅ Trace correlation analysis successful")
            
            if "traceTree" in correlation_data:
                print(f"   📊 Trace tree has {len(correlation_data['traceTree'])} root nodes")
                
            if "patterns" in correlation_data:
                patterns = correlation_data["patterns"]
                print(f"   🔗 Found {len(patterns.get('agentInteractions', {}))} agent interactions")
                
            if "bottlenecks" in correlation_data:
                bottlenecks = correlation_data["bottlenecks"]
                print(f"   🐌 Identified {len(bottlenecks.get('slowestSpans', []))} slow spans")
                
            if "serviceDependencies" in correlation_data:
                deps = correlation_data["serviceDependencies"]
                print(f"   🏗️ Service graph has {len(deps.get('nodes', []))} nodes and {len(deps.get('edges', []))} edges")
                
        else:
            print(f"❌ Failed to perform trace correlation: {result.get('error', 'Unknown error')}")
            
    async def run_comprehensive_test(self):
        """Run comprehensive test of distributed tracing system"""
        print("🚀 Starting comprehensive distributed tracing test")
        print("=" * 60)
        
        try:
            # Test 1: Create trace
            trace_id = await self.test_trace_creation()
            if not trace_id:
                print("❌ Cannot continue without a valid trace ID")
                return False
                
            await asyncio.sleep(0.5)  # Small delay between operations
            
            # Test 2: Create span
            span_id = await self.test_span_creation(trace_id)
            if not span_id:
                print("❌ Cannot continue without a valid span ID")
                return False
                
            await asyncio.sleep(0.5)
            
            # Test 3: Create A2A communication
            a2a_id = await self.test_a2a_communication(trace_id, span_id)
            if not a2a_id:
                print("❌ Cannot continue without a valid A2A communication ID")
                return False
                
            await asyncio.sleep(0.5)
            
            # Test 4: Complete A2A communication
            await self.test_a2a_completion(a2a_id)
            await asyncio.sleep(0.5)
            
            # Test 5: Complete span
            await self.test_span_completion(span_id)
            await asyncio.sleep(0.5)
            
            # Test 6: Retrieve trace data
            await self.test_trace_retrieval(trace_id)
            await asyncio.sleep(0.5)
            
            # Test 7: Test trace correlation
            await self.test_trace_correlation(trace_id)
            
            return True
            
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            return False
            
    def print_test_summary(self):
        """Print summary of all test results"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r["success"]])
        failed_tests = total_tests - successful_tests
        
        print(f"Total tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success rate: {(successful_tests/total_tests)*100:.1f}%" if total_tests > 0 else "No tests run")
        
        if failed_tests > 0:
            print("\n❌ Failed tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   {result['method']} {result['endpoint']}: {result.get('error', f'HTTP {result['status']}')}")
                    
        print("\n✅ All API endpoints tested successfully!" if failed_tests == 0 else f"\n⚠️  {failed_tests} test(s) failed")

async def main():
    print("🧪 Agent Lens Distributed Tracing System Test")
    print("=" * 60)
    
    # Check if API URL is provided
    api_url = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"
    print(f"🌐 Testing API at: {api_url}")
    
    tester = DistributedTracingTester(api_url)
    
    try:
        await tester.initialize()
        
        # Run comprehensive test
        success = await tester.run_comprehensive_test()
        
        # Print summary
        tester.print_test_summary()
        
        if success:
            print("\n🎉 All tests completed successfully!")
            print("\n📋 Next steps:")
            print("1. Navigate to the distributed traces dashboard")
            print("2. View the test trace and its spans")
            print("3. Explore trace correlation and visualization features")
            return 0
        else:
            print("\n💥 Some tests failed. Check the output above for details.")
            return 1
            
    except Exception as e:
        print(f"\n💥 Test suite failed: {e}")
        return 1
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)