#!/usr/bin/env python3
"""
Custom Model Integration Example for AgentLens SDK

This example demonstrates how to integrate custom language models with the AgentLens
evaluation framework, including LiteLLM models, OpenAI-compatible APIs, and Hugging Face models.
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
    LiteLLMChatModel, CustomOpenAICompatibleModel, HuggingFaceModel,
    AgentLensBaseModel, ModelResponse
)

class MockCustomModel(AgentLensBaseModel):
    """
    Example of a completely custom model implementation.
    
    This demonstrates how to create a custom model that doesn't rely on
    external APIs, useful for testing or specialized model integrations.
    """
    
    def __init__(self, model_name: str = "mock-evaluator", **kwargs):
        super().__init__(model_name, **kwargs)
        self.response_templates = {
            MetricType.HALLUCINATION: {
                "score": 0.1,
                "reasoning": "The response appears to be factually grounded in the provided context with minimal hallucination detected.",
                "confidence": 0.9
            },
            MetricType.RELEVANCE: {
                "score": 0.85,
                "reasoning": "The response directly addresses the input query with relevant information and maintains focus on the topic.",
                "confidence": 0.9
            },
            MetricType.USEFULNESS: {
                "score": 0.8,
                "reasoning": "The response provides actionable and helpful information that addresses the user's needs effectively.",
                "confidence": 0.85
            }
        }
    
    async def generate_string(self, input_text: str, **kwargs) -> str:
        """Generate a simple string response."""
        return f"Mock evaluation response for: {input_text[:50]}..."
    
    async def generate_provider_response(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        """Generate a mock evaluation response."""
        import time
        import json
        
        start_time = time.time()
        
        # Simulate processing time
        await asyncio.sleep(0.1)
        
        # Extract evaluation context from the prompt
        prompt = messages[0].get("content", "")
        
        # Determine metric type from prompt
        metric_type = MetricType.RELEVANCE  # Default
        if "hallucination" in prompt.lower():
            metric_type = MetricType.HALLUCINATION
        elif "usefulness" in prompt.lower():
            metric_type = MetricType.USEFULNESS
        
        # Get template response
        template = self.response_templates.get(metric_type, self.response_templates[MetricType.RELEVANCE])
        
        # Create response
        response_data = {
            "score": template["score"],
            "reasoning": template["reasoning"],
            "confidence": template["confidence"]
        }
        
        content = json.dumps(response_data, indent=2)
        latency = time.time() - start_time
        
        return ModelResponse(
            content=content,
            model=self.model_name,
            usage={"total_tokens": len(content.split())},
            metadata={"provider": "mock", "type": "evaluation"},
            latency=latency,
            cost=0.0  # Free for mock model
        )


async def main():
    """Main example function demonstrating custom model integration."""
    
    # Configure AgentLens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🤖 Custom Model Integration Example for AgentLens")
    print("=" * 58)
    
    # Sample data for evaluation
    sample_data = [
        {
            "input": "What is the capital of France?",
            "output": "The capital of France is Paris, a beautiful city known for its art, culture, and the iconic Eiffel Tower.",
            "context": ["France is a country in Western Europe. Its capital and largest city is Paris."],
            "reference": "Paris"
        },
        {
            "input": "Explain how photosynthesis works",
            "output": "Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen using chlorophyll.",
            "context": ["Photosynthesis is a biological process where plants use sunlight to produce energy."],
            "reference": "Process where plants convert light energy into chemical energy"
        }
    ]
    
    # Example 1: Mock Custom Model Integration
    print("\n🎭 Example 1: Mock Custom Model")
    print("-" * 40)
    
    # Create mock custom model
    mock_model = MockCustomModel()
    
    # Create evaluation model configuration with custom model
    mock_eval_model = EvaluationModel(
        name="mock-evaluator-v1",
        provider="custom",
        custom_model=mock_model,
        temperature=0.0,
        max_tokens=500
    )
    
    # Test different metrics with mock model
    print("Testing hallucination detection with mock model...")
    hallucination_metric = EnhancedHallucinationMetric(model=mock_eval_model)
    
    try:
        result = await hallucination_metric.evaluate_async(
            predictions=[sample_data[0]["output"]],
            ground_truth=[sample_data[0]["reference"]],
            contexts=[sample_data[0]["context"]]
        )
        
        print(f"📊 Hallucination Score: {result.value:.2f}")
        if result.details and result.details['individual_results']:
            first_result = result.details['individual_results'][0]
            print(f"💭 Reasoning: {first_result['reasoning'][:100]}...")
            print(f"💰 Cost: ${first_result.get('cost', 0.0):.4f}")
            print(f"⏱️ Latency: {first_result.get('latency', 0)}ms")
        
    except Exception as e:
        print(f"❌ Mock model evaluation failed: {e}")
    
    # Example 2: LiteLLM Integration (requires litellm package)
    print("\n" + "=" * 58)
    print("🔗 Example 2: LiteLLM Model Integration")
    print("-" * 40)
    
    try:
        # Create LiteLLM model (example with OpenAI GPT-4)
        litellm_model = LiteLLMChatModel(
            model_name="gpt-4o-mini",  # Use a smaller model for testing
            api_key=os.getenv("OPENAI_API_KEY"),  # Set your API key
            temperature=0.1,
            max_tokens=300
        )
        
        if os.getenv("OPENAI_API_KEY"):
            litellm_eval_model = EvaluationModel(
                name="gpt-4o-mini-evaluator",
                provider="litellm",
                custom_model=litellm_model,
                temperature=0.1,
                max_tokens=300
            )
            
            print("Testing relevance evaluation with LiteLLM...")
            relevance_metric = EnhancedRelevanceMetric(model=litellm_eval_model)
            
            result = await relevance_metric.evaluate_async(
                predictions=[sample_data[1]["output"]],
                ground_truth=[sample_data[1]["input"]],
                contexts=[sample_data[1]["context"]]
            )
            
            print(f"📊 Relevance Score: {result.value:.2f}")
            if result.details and result.details['individual_results']:
                first_result = result.details['individual_results'][0]
                print(f"💭 Reasoning: {first_result['reasoning'][:150]}...")
                print(f"💰 Cost: ${first_result.get('cost', 0.0):.4f}")
                print(f"⏱️ Latency: {first_result.get('latency', 0)}ms")
                print(f"🤖 Model: {first_result.get('model', 'unknown')}")
        else:
            print("⚠️ OPENAI_API_KEY not set, skipping LiteLLM example")
    
    except ImportError:
        print("⚠️ LiteLLM not installed. Install with: pip install litellm")
    except Exception as e:
        print(f"❌ LiteLLM evaluation failed: {e}")
    
    # Example 3: Custom OpenAI-Compatible API
    print("\n" + "=" * 58)
    print("🔧 Example 3: Custom OpenAI-Compatible API")
    print("-" * 40)
    
    try:
        # Create custom OpenAI-compatible model
        # This example shows how to connect to local models like Ollama, vLLM, etc.
        custom_openai_model = CustomOpenAICompatibleModel(
            model_name="llama2",  # Example model name
            api_key="dummy-key",  # Some local APIs require any key
            base_url="http://localhost:11434",  # Example Ollama URL
            temperature=0.2,
            max_tokens=400,
            timeout=30.0
        )
        
        custom_openai_eval_model = EvaluationModel(
            name="llama2-evaluator",
            provider="custom_openai",
            custom_model=custom_openai_model,
            temperature=0.2,
            max_tokens=400
        )
        
        print("Testing usefulness evaluation with custom OpenAI-compatible model...")
        print("⚠️ Note: This requires a running local model server (e.g., Ollama)")
        
        # This would work if you have a local model server running
        # usefulness_metric = UsefulnessMetric(model=custom_openai_eval_model)
        # result = await usefulness_metric.evaluate_async(...)
        
        print("✅ Custom OpenAI-compatible model configured successfully")
        print("📝 To test: Start a local model server and uncomment the evaluation code")
        
    except Exception as e:
        print(f"⚠️ Custom OpenAI-compatible model setup: {e}")
    
    # Example 4: Hugging Face Model Integration
    print("\n" + "=" * 58)
    print("🤗 Example 4: Hugging Face Model Integration")
    print("-" * 40)
    
    try:
        # Create Hugging Face model
        hf_model = HuggingFaceModel(
            model_name="microsoft/DialoGPT-medium",
            api_key=os.getenv("HUGGINGFACE_TOKEN"),  # Set your HF token
            max_new_tokens=200,
            temperature=0.3
        )
        
        if os.getenv("HUGGINGFACE_TOKEN"):
            hf_eval_model = EvaluationModel(
                name="dialogpt-evaluator",
                provider="huggingface",
                custom_model=hf_model,
                temperature=0.3,
                max_tokens=200
            )
            
            print("Testing direct model response with Hugging Face...")
            
            # Test direct model call
            response = await hf_model.generate_provider_response(
                messages=[{"role": "user", "content": "Evaluate this response quality: Hello, how are you?"}]
            )
            
            print(f"📝 HF Model Response: {response.content[:100]}...")
            print(f"⏱️ Latency: {response.latency:.2f}s")
            print(f"💰 Cost: ${response.cost:.4f}")
        else:
            print("⚠️ HUGGINGFACE_TOKEN not set, skipping Hugging Face example")
    
    except Exception as e:
        print(f"❌ Hugging Face model integration failed: {e}")
    
    # Example 5: Comparison Across Models
    print("\n" + "=" * 58)
    print("⚖️ Example 5: Model Comparison")
    print("-" * 40)
    
    print("Comparing evaluation results across different custom models...")
    
    models_to_compare = [
        ("Mock Model", mock_eval_model),
    ]
    
    # Add LiteLLM if available
    if os.getenv("OPENAI_API_KEY"):
        try:
            litellm_model = LiteLLMChatModel(
                model_name="gpt-4o-mini",
                api_key=os.getenv("OPENAI_API_KEY"),
                temperature=0.0
            )
            litellm_eval_model = EvaluationModel(
                name="gpt-4o-mini",
                provider="litellm",
                custom_model=litellm_model
            )
            models_to_compare.append(("LiteLLM GPT-4o-mini", litellm_eval_model))
        except:
            pass
    
    comparison_input = "What are the benefits of renewable energy?"
    comparison_output = "Renewable energy sources like solar and wind power provide clean electricity, reduce carbon emissions, and help combat climate change while creating jobs."
    comparison_context = ["Renewable energy comes from natural sources that replenish themselves, such as sunlight, wind, and water."]
    
    print(f"\nEvaluating: '{comparison_output[:50]}...'")
    print("-" * 50)
    
    for model_name, eval_model in models_to_compare:
        try:
            relevance_metric = EnhancedRelevanceMetric(model=eval_model)
            result = await relevance_metric.evaluate_async(
                predictions=[comparison_output],
                ground_truth=[comparison_input],
                contexts=[comparison_context]
            )
            
            print(f"{model_name}: {result.value:.2f}/1.0")
            if result.details and result.details['individual_results']:
                first_result = result.details['individual_results'][0]
                print(f"  Cost: ${first_result.get('cost', 0.0):.4f}, Latency: {first_result.get('latency', 0)}ms")
        
        except Exception as e:
            print(f"{model_name}: Failed - {e}")
    
    # Example 6: Best Practices and Tips
    print("\n" + "=" * 58)
    print("💡 Best Practices for Custom Model Integration")
    print("-" * 50)
    
    print("""
    ✅ Custom Model Integration Tips:

    1. 🎯 Model Selection:
       • Choose models appropriate for evaluation tasks
       • Consider latency vs. quality trade-offs
       • Test with small batches first

    2. 🔧 Implementation:
       • Always inherit from AgentLensBaseModel
       • Implement proper error handling
       • Return structured ModelResponse objects

    3. 💰 Cost Management:
       • Monitor API costs for external models
       • Use caching for repeated evaluations
       • Consider local models for high-volume tasks

    4. 🚀 Performance:
       • Use async methods for better throughput
       • Implement connection pooling for HTTP clients
       • Batch requests when possible

    5. 🔒 Security:
       • Store API keys securely (environment variables)
       • Validate inputs before sending to models
       • Handle authentication errors gracefully

    6. 📊 Monitoring:
       • Track evaluation costs and latency
       • Log model responses for debugging
       • Monitor evaluation quality over time
    """)
    
    # Cleanup
    await mock_model.close()
    if 'litellm_model' in locals():
        await litellm_model.close()
    if 'custom_openai_model' in locals():
        await custom_openai_model.close()
    if 'hf_model' in locals():
        await hf_model.close()
    
    print("\n" + "=" * 58)
    print("✅ Custom Model Integration Example Complete!")
    print("\n🔗 Integration Points:")
    print("   • AgentLensBaseModel: Abstract base for custom models")
    print("   • LiteLLMChatModel: Integration with 100+ LLM providers")
    print("   • CustomOpenAICompatibleModel: Local/custom API integration")
    print("   • HuggingFaceModel: Hugging Face Inference API support")
    print("   • EvaluationModel.custom_model: Seamless metric integration")


if __name__ == "__main__":
    asyncio.run(main())