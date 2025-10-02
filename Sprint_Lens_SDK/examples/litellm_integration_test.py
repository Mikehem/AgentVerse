#!/usr/bin/env python3
"""
LiteLLM Integration Test for AgentLens Custom Models

This test validates that the LiteLLM integration works correctly with 
the AgentLens evaluation framework.
"""

import os
import sys
import asyncio
from typing import Dict, List

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import (
    EvaluationModel, MetricType,
    EnhancedHallucinationMetric, EnhancedRelevanceMetric, UsefulnessMetric,
    LiteLLMChatModel
)

async def test_litellm_integration():
    """Test LiteLLM integration with AgentLens evaluation metrics."""
    
    print("🧪 LiteLLM Integration Test for AgentLens")
    print("=" * 50)
    
    # Configure AgentLens
    sprintlens.configure(
        url="http://localhost:3000",
        username="admin",
        password="admin123"
    )
    
    # Check if OpenAI API key is available
    openai_key = os.getenv("OPENAI_API_KEY")
    if not openai_key:
        print("❌ OPENAI_API_KEY environment variable not set")
        print("Please set the OpenAI API key to test LiteLLM integration")
        return False
    
    print(f"✅ OpenAI API key found: {openai_key[:10]}...")
    
    # Test data
    test_cases = [
        {
            "name": "Factual Question",
            "input": "What is the capital of France?",
            "output": "The capital of France is Paris, a beautiful city known for its art, culture, and the iconic Eiffel Tower.",
            "context": ["France is a country in Western Europe. Its capital and largest city is Paris."],
            "expected_hallucination": 0.1,  # Low hallucination
            "expected_relevance": 0.9       # High relevance
        },
        {
            "name": "Scientific Explanation",
            "input": "How does photosynthesis work?",
            "output": "Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen using chlorophyll in their leaves.",
            "context": ["Photosynthesis is a biological process where plants use sunlight to produce energy from CO2 and water."],
            "expected_hallucination": 0.1,  # Low hallucination
            "expected_relevance": 0.9       # High relevance
        },
        {
            "name": "Hallucinated Information",
            "input": "Tell me about the weather today",
            "output": "Today in Paris it will be sunny with temperatures reaching 25°C. Tomorrow will be rainy with thunderstorms expected in the evening.",
            "context": ["Weather information is not available in the current context."],
            "expected_hallucination": 0.8,  # High hallucination
            "expected_relevance": 0.7       # Medium relevance
        }
    ]
    
    try:
        # Create LiteLLM model
        print("\n🔧 Creating LiteLLM model...")
        litellm_model = LiteLLMChatModel(
            model_name="gpt-4o-mini",
            api_key=openai_key,
            temperature=0.1,
            max_tokens=500
        )
        
        # Create evaluation model configuration
        eval_model = EvaluationModel(
            name="gpt-4o-mini-evaluator",
            provider="litellm",
            custom_model=litellm_model,
            temperature=0.1,
            max_tokens=500
        )
        
        print(f"✅ LiteLLM model created: {eval_model.name}")
        
        # Test different metrics
        metrics_to_test = [
            ("Hallucination Detection", EnhancedHallucinationMetric, "expected_hallucination"),
            ("Relevance Assessment", EnhancedRelevanceMetric, "expected_relevance"),
            ("Usefulness Evaluation", UsefulnessMetric, "expected_relevance")  # Using relevance as proxy
        ]
        
        results = {}
        
        for metric_name, metric_class, expected_key in metrics_to_test:
            print(f"\n🎯 Testing {metric_name}...")
            print("-" * 40)
            
            metric = metric_class(model=eval_model)
            test_results = []
            
            for i, test_case in enumerate(test_cases):
                print(f"\n📝 Test Case {i+1}: {test_case['name']}")
                
                try:
                    if metric_name == "Hallucination Detection":
                        result = await metric.evaluate_async(
                            predictions=[test_case["output"]],
                            ground_truth=[test_case["input"]],
                            contexts=[test_case["context"]]
                        )
                        # For hallucination, higher result value means more hallucination
                        score = result.value
                        expected = test_case[expected_key]
                    else:
                        result = await metric.evaluate_async(
                            predictions=[test_case["output"]],
                            ground_truth=[test_case["input"]],
                            contexts=[test_case["context"]]
                        )
                        score = result.value
                        expected = test_case[expected_key]
                    
                    if result.details and result.details.get('individual_results'):
                        individual = result.details['individual_results'][0]
                        print(f"   Score: {score:.2f} (expected ~{expected:.1f})")
                        print(f"   Reasoning: {individual.get('reasoning', 'N/A')[:100]}...")
                        print(f"   Cost: ${individual.get('cost', 0):.4f}")
                        print(f"   Latency: {individual.get('latency', 0)}ms")
                        print(f"   Model: {individual.get('model', 'unknown')}")
                        
                        test_results.append({
                            "case": test_case['name'],
                            "score": score,
                            "expected": expected,
                            "reasoning": individual.get('reasoning', 'N/A'),
                            "cost": individual.get('cost', 0),
                            "latency": individual.get('latency', 0)
                        })
                    else:
                        print(f"   ❌ No detailed results available")
                        test_results.append({
                            "case": test_case['name'],
                            "score": score,
                            "expected": expected,
                            "error": "No detailed results"
                        })
                
                except Exception as e:
                    print(f"   ❌ Test failed: {e}")
                    test_results.append({
                        "case": test_case['name'],
                        "error": str(e)
                    })
            
            results[metric_name] = test_results
        
        # Summary
        print(f"\n" + "=" * 50)
        print("📊 LiteLLM Integration Test Summary")
        print("=" * 50)
        
        total_tests = 0
        successful_tests = 0
        total_cost = 0.0
        
        for metric_name, test_results in results.items():
            print(f"\n🎯 {metric_name}:")
            for result in test_results:
                total_tests += 1
                if 'error' not in result:
                    successful_tests += 1
                    total_cost += result.get('cost', 0)
                    print(f"   ✅ {result['case']}: {result['score']:.2f}")
                else:
                    print(f"   ❌ {result['case']}: {result['error']}")
        
        success_rate = successful_tests / total_tests if total_tests > 0 else 0
        print(f"\n📈 Overall Results:")
        print(f"   Success Rate: {success_rate:.1%} ({successful_tests}/{total_tests})")
        print(f"   Total Cost: ${total_cost:.4f}")
        
        if success_rate >= 0.8:
            print(f"🎉 LiteLLM integration test PASSED!")
            return True
        else:
            print(f"⚠️ LiteLLM integration test FAILED (success rate below 80%)")
            return False
        
    except Exception as e:
        print(f"\n❌ LiteLLM integration test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Cleanup
        if 'litellm_model' in locals():
            await litellm_model.close()

if __name__ == "__main__":
    # Set the OpenAI API key
    if len(sys.argv) > 1:
        os.environ["OPENAI_API_KEY"] = sys.argv[1]
        print(f"🔑 Using provided OpenAI API key")
    
    success = asyncio.run(test_litellm_integration())
    if success:
        print(f"\n🏆 All tests passed! LiteLLM integration is working correctly.")
        sys.exit(0)
    else:
        print(f"\n💥 Tests failed! Check the errors above.")
        sys.exit(1)