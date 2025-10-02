"""
Advanced Metrics Integration Example

This example demonstrates how to use the enhanced Sprint Lens SDK with 
advanced LLM-based metrics including hallucination detection, relevance 
assessment, and batch evaluation capabilities.
"""

import asyncio
import os
from typing import List, Dict, Any

import sprintlens
from sprintlens import (
    # Basic SDK functionality
    configure, track,
    # Advanced metrics
    EvaluationModel, MetricType, BatchEvaluationConfig,
    EnhancedHallucinationMetric, EnhancedRelevanceMetric,
    AdvancedBatchEvaluator, AdvancedMetricsClient,
    evaluate_hallucination_sync, evaluate_hallucination
)


def setup_sdk():
    """Configure the Sprint Lens SDK."""
    sprintlens.configure(
        url="http://localhost:3001",  # Frontend URL
        project_id="project-1758599350381",  # Your project ID
        api_key=os.getenv("SPRINTLENS_API_KEY", "demo-key")
    )


@track
def ai_chatbot_response(user_query: str, context: str = None) -> str:
    """Simulated AI chatbot that might hallucinate."""
    
    # Simulate different types of responses
    if "weather" in user_query.lower():
        # Good response
        return "I'd be happy to help with weather information. However, I don't have access to real-time weather data. Please check a reliable weather service like weather.com or your local meteorological service."
    
    elif "python" in user_query.lower():
        # Response with potential hallucination
        return "Python was invented in 1995 by Guido van Rossum at Microsoft. It's primarily used for machine learning and has built-in support for quantum computing."
    
    elif "capital" in user_query.lower():
        # Factually incorrect response
        return "The capital of France is Lyon, which is located in the southern region of the country."
    
    else:
        # Generic response
        return "That's an interesting question. Based on my training data, I can provide some general information, though I'd recommend verifying with authoritative sources."


async def example_single_evaluation():
    """Example of single response evaluation."""
    print("🔍 Single Response Evaluation Example")
    print("=" * 50)
    
    # Test cases with expected hallucinations
    test_cases = [
        {
            "query": "Tell me about Python programming",
            "response": ai_chatbot_response("Tell me about Python programming"),
            "context": "Python is a programming language created by Guido van Rossum at CWI in the Netherlands, first released in 1991."
        },
        {
            "query": "What's the capital of France?", 
            "response": ai_chatbot_response("What's the capital of France?"),
            "context": "France is a country in Western Europe with Paris as its capital."
        }
    ]
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}:")
        print(f"Query: {test_case['query']}")
        print(f"Response: {test_case['response']}")
        print(f"Context: {test_case['context']}")
        
        # Evaluate for hallucination
        result = await evaluate_hallucination(
            input_text=test_case['query'],
            output_text=test_case['response'],
            context=test_case['context']
        )
        
        if result.get("success"):
            data = result["data"]
            print(f"🎯 Hallucination Score: {data['score']:.2f}")
            print(f"💡 Reasoning: {data['reasoning']}")
            print(f"🎯 Confidence: {data['confidence']:.2f}")
            print(f"💰 Cost: ${data['cost']:.4f}")
            print(f"⏱️ Latency: {data['latency']}ms")
        else:
            print(f"❌ Error: {result.get('error')}")


async def example_enhanced_metrics():
    """Example of using enhanced metrics classes."""
    print("\n🚀 Enhanced Metrics Example")
    print("=" * 50)
    
    # Create enhanced metrics
    hallucination_metric = EnhancedHallucinationMetric(
        model=EvaluationModel(
            name="gpt-4o",
            provider="openai",
            temperature=0.0,
            max_tokens=500
        )
    )
    
    relevance_metric = EnhancedRelevanceMetric(
        model=EvaluationModel(
            name="claude-3-sonnet-20240229",
            provider="anthropic",
            temperature=0.0
        )
    )
    
    # Test data
    queries = [
        "How's the weather today?",
        "Tell me about Python",
        "What's the capital of France?"
    ]
    
    responses = [ai_chatbot_response(q) for q in queries]
    contexts = [
        "Weather information requires real-time data access.",
        "Python is a programming language created in 1991.",
        "France is a country with Paris as its capital."
    ]
    
    print(f"\n🧪 Testing {len(queries)} responses...")
    
    # Evaluate hallucination
    print("\n📊 Hallucination Detection:")
    hall_result = await hallucination_metric.evaluate_async(
        predictions=responses,
        ground_truth=queries,
        contexts=contexts
    )
    
    print(f"Average Hallucination Score: {hall_result.value:.3f}")
    print(f"Total Cost: ${hall_result.details['total_cost']:.4f}")
    print(f"Success Rate: {hall_result.details['successful_evaluations']}/{hall_result.details['total_items']}")
    
    # Evaluate relevance
    print("\n🎯 Relevance Assessment:")
    rel_result = await relevance_metric.evaluate_async(
        predictions=responses,
        ground_truth=queries,
        contexts=contexts
    )
    
    print(f"Average Relevance Score: {rel_result.value:.3f}")
    print(f"Total Cost: ${rel_result.details['total_cost']:.4f}")


async def example_batch_evaluation():
    """Example of batch evaluation with job tracking."""
    print("\n⚡ Batch Evaluation Example")
    print("=" * 50)
    
    # Create batch evaluator
    batch_evaluator = AdvancedBatchEvaluator()
    
    # Configure batch evaluation
    config = BatchEvaluationConfig(
        metric_types=[MetricType.HALLUCINATION, MetricType.RELEVANCE, MetricType.COHERENCE],
        batch_size=5,
        async_mode=True,
        model=EvaluationModel(
            name="gpt-4o",
            provider="openai",
            temperature=0.0
        )
    )
    
    experiment_id = "project-1758599350381"  # Use your experiment ID
    
    try:
        print(f"🚀 Starting batch evaluation for experiment: {experiment_id}")
        
        # Start evaluation job
        job_id = await batch_evaluator.start_evaluation(experiment_id, config)
        print(f"📋 Job started with ID: {job_id}")
        
        # Monitor progress (with timeout)
        print("⏳ Waiting for completion...")
        try:
            results = await batch_evaluator.wait_for_completion(
                experiment_id, job_id, timeout_seconds=60, poll_interval=3
            )
            
            print("✅ Batch evaluation completed!")
            print(f"📊 Total Items: {results['totalItems']}")
            print(f"✅ Processed: {results['processedItems']}")
            print(f"📈 Results: {len(results['results'])} evaluations")
            
        except TimeoutError:
            print("⏰ Evaluation is taking longer than expected...")
            # Get current status
            current_status = await batch_evaluator.get_results(experiment_id, job_id)
            print(f"📊 Current Status: {current_status['status']}")
            print(f"📈 Progress: {current_status['processedItems']}/{current_status['totalItems']}")
            
    except Exception as e:
        print(f"❌ Batch evaluation failed: {e}")
    
    finally:
        await batch_evaluator.close()


async def example_metrics_configuration():
    """Example of configuring metrics for a project."""
    print("\n⚙️  Metrics Configuration Example")
    print("=" * 50)
    
    client = AdvancedMetricsClient()
    project_id = "project-1758599350381"  # Your project ID
    
    try:
        # Configure metrics for the project
        metric_configs = [
            {
                "metricType": "hallucination",
                "modelName": "gpt-4o",
                "apiKey": os.getenv("OPENAI_API_KEY"),
                "threshold": 0.8,
                "enabled": True
            },
            {
                "metricType": "relevance",
                "modelName": "claude-3-sonnet-20240229",
                "apiKey": os.getenv("ANTHROPIC_API_KEY"),
                "threshold": 0.7,
                "enabled": True
            }
        ]
        
        print(f"🔧 Configuring metrics for project: {project_id}")
        config_result = await client.configure_metrics(project_id, metric_configs)
        
        if config_result.get("success"):
            data = config_result["data"]
            print(f"✅ Configured {data['configuredMetrics']} metrics")
            print(f"📋 Config IDs: {data['configIds']}")
        else:
            print(f"❌ Configuration failed: {config_result.get('error')}")
        
        # Get current configuration
        print(f"\n📖 Current configuration:")
        current_config = await client.get_metrics_config(project_id)
        
        if current_config.get("success"):
            configs = current_config["data"]
            print(f"📊 Found {len(configs)} metric configurations:")
            for config in configs:
                print(f"  - {config['metricType']}: {config['modelName']} (enabled: {config['enabled']})")
        
    except Exception as e:
        print(f"❌ Configuration failed: {e}")
    
    finally:
        await client.close()


async def main():
    """Main example function."""
    print("🎯 Sprint Lens Advanced Metrics Integration Demo")
    print("=" * 60)
    
    # Setup SDK
    setup_sdk()
    
    # Run examples
    try:
        await example_single_evaluation()
        await example_enhanced_metrics()
        await example_batch_evaluation()
        await example_metrics_configuration()
        
        print("\n🎉 All examples completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Example failed: {e}")
        import traceback
        traceback.print_exc()


def sync_example():
    """Synchronous example for basic usage."""
    print("\n🔄 Synchronous Usage Example")
    print("=" * 50)
    
    setup_sdk()
    
    # Simple synchronous evaluation
    result = evaluate_hallucination_sync(
        input_text="What's the weather like?",
        output_text="It's sunny and 72°F with clear skies today.",
        context="I don't have access to real-time weather data."
    )
    
    if result.get("success"):
        data = result["data"]
        print(f"🎯 Hallucination Score: {data['score']:.2f}")
        print(f"💡 Reasoning: {data['reasoning']}")
    else:
        print(f"❌ Error: {result.get('error')}")


if __name__ == "__main__":
    print("🚀 Starting Advanced Metrics Examples...")
    
    # Run synchronous example first
    sync_example()
    
    # Run async examples
    asyncio.run(main())