"""
Simple Advanced Metrics Test

This test verifies the enhanced SDK functionality without requiring
a backend connection, testing the imports and basic structure.
"""

import asyncio
import sys
import os

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

def test_imports():
    """Test that all advanced metrics components can be imported."""
    print("🧪 Testing imports...")
    
    try:
        import sprintlens
        print("✅ Base sprintlens import successful")
        
        from sprintlens import (
            MetricType, EvaluationModel, BatchEvaluationConfig,
            EnhancedHallucinationMetric, EnhancedRelevanceMetric,
            AdvancedBatchEvaluator, AdvancedMetricsClient
        )
        print("✅ Advanced metrics imports successful")
        
        # Test enum values
        assert MetricType.HALLUCINATION.value == "hallucination"
        assert MetricType.RELEVANCE.value == "relevance"
        assert MetricType.COHERENCE.value == "coherence"
        print("✅ MetricType enum values correct")
        
        # Test creating model config
        model = EvaluationModel(
            name="gpt-4o",
            provider="openai",
            temperature=0.0
        )
        assert model.name == "gpt-4o"
        assert model.provider == "openai"
        print("✅ EvaluationModel creation successful")
        
        # Test batch config
        config = BatchEvaluationConfig(
            metric_types=[MetricType.HALLUCINATION, MetricType.RELEVANCE],
            batch_size=5,
            model=model
        )
        assert len(config.metric_types) == 2
        assert config.batch_size == 5
        print("✅ BatchEvaluationConfig creation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_client_creation():
    """Test creating advanced metrics client."""
    print("\n🔧 Testing client creation...")
    
    try:
        from sprintlens import AdvancedMetricsClient
        
        # Create client with explicit base URL (no backend required)
        client = AdvancedMetricsClient(base_url="http://localhost:3001")
        assert client.base_url == "http://localhost:3001"
        assert client.session is None
        print("✅ AdvancedMetricsClient creation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Client creation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_metric_creation():
    """Test creating metric instances."""
    print("\n📊 Testing metric creation...")
    
    try:
        from sprintlens import (
            EnhancedHallucinationMetric, EnhancedRelevanceMetric, 
            EvaluationModel
        )
        
        # Create model config
        model = EvaluationModel(
            name="gpt-4o",
            provider="openai"
        )
        
        # Create hallucination metric
        hall_metric = EnhancedHallucinationMetric(
            model=model,
            custom_prompt="Test if this response contains hallucinations."
        )
        assert hall_metric.name == "enhanced_hallucination"
        assert hall_metric.model == model
        print("✅ EnhancedHallucinationMetric creation successful")
        
        # Create relevance metric
        rel_metric = EnhancedRelevanceMetric(model=model)
        assert rel_metric.name == "enhanced_relevance"
        print("✅ EnhancedRelevanceMetric creation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Metric creation test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_batch_evaluator():
    """Test batch evaluator creation."""
    print("\n⚡ Testing batch evaluator...")
    
    try:
        from sprintlens import AdvancedBatchEvaluator
        
        evaluator = AdvancedBatchEvaluator()
        assert evaluator is not None
        print("✅ AdvancedBatchEvaluator creation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Batch evaluator test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_evaluation_structure():
    """Test the evaluation structure without backend calls."""
    print("\n🔍 Testing evaluation structure...")
    
    try:
        from sprintlens import (
            EnhancedHallucinationMetric, EvaluationModel
        )
        
        # Create metric
        model = EvaluationModel(name="gpt-4o", provider="openai")
        metric = EnhancedHallucinationMetric(model=model)
        
        # Test that the metric has the required methods
        assert hasattr(metric, 'evaluate')
        assert hasattr(metric, 'evaluate_async')
        assert hasattr(metric, 'metrics_client')
        print("✅ Metric structure validation successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Evaluation structure test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("🎯 Enhanced SDK Advanced Metrics Integration Test")
    print("=" * 60)
    
    tests = [
        ("Import Test", test_imports),
        ("Client Creation Test", test_client_creation),
        ("Metric Creation Test", test_metric_creation),
        ("Batch Evaluator Test", test_batch_evaluator),
    ]
    
    results = []
    
    # Run synchronous tests
    for test_name, test_func in tests:
        print(f"\n🚀 Running {test_name}...")
        success = test_func()
        results.append((test_name, success))
    
    # Run async tests
    print(f"\n🚀 Running Evaluation Structure Test...")
    async_success = asyncio.run(test_evaluation_structure())
    results.append(("Evaluation Structure Test", async_success))
    
    # Print summary
    print("\n" + "=" * 60)
    print("📋 Test Summary:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if success:
            passed += 1
    
    print(f"\n🎯 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Advanced metrics integration is working correctly.")
        return True
    else:
        print("⚠️ Some tests failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)