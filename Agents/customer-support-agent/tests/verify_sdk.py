#!/usr/bin/env python3
"""
Verify Sprint Lens SDK installation and features.
"""

import sys
from typing import Dict, Any

def test_core_imports() -> bool:
    """Test core SDK imports."""
    try:
        import sprintlens
        from sprintlens import configure, track, Trace, Span, get_client
        from sprintlens.core.client import SprintLensClient
        from sprintlens.tracing.context import set_current_trace, get_current_trace
        print(f"✅ Core SDK imported (version: {sprintlens.__version__})")
        return True
    except ImportError as e:
        print(f"❌ Core SDK import failed: {e}")
        return False

def test_evaluation_imports() -> bool:
    """Test evaluation framework imports."""
    try:
        from sprintlens.evaluation import (
            Evaluator, EvaluationDataset, BaseMetric,
            AccuracyMetric, SimilarityMetric, EvaluationResult,
            DatasetItem, BatchEvaluator
        )
        print("✅ Evaluation framework imported")
        return True
    except ImportError as e:
        print(f"❌ Evaluation framework import failed: {e}")
        return False

def test_llm_integrations() -> bool:
    """Test LLM provider integrations."""
    try:
        from sprintlens.llm import LLMProvider, OpenAIProvider, AzureOpenAIProvider
        print("✅ LLM integrations imported")
        return True
    except ImportError as e:
        print(f"❌ LLM integrations import failed: {e}")
        return False

def test_management_utilities() -> bool:
    """Test management utilities."""
    try:
        from sprintlens.management import ProjectManager, AgentManager, DistributedTraceSetup
        print("✅ Management utilities imported")
        return True
    except ImportError as e:
        print(f"❌ Management utilities import failed: {e}")
        return False

def main() -> int:
    """Run all SDK verification tests."""
    print("🔍 Verifying Sprint Lens SDK Installation\n")
    
    tests = [
        test_core_imports(),
        test_evaluation_imports(),
        test_llm_integrations(),
        test_management_utilities()
    ]
    
    if all(tests):
        print("\n🎉 SDK installation verified successfully!")
        return 0
    else:
        print("\n❌ SDK installation has issues. Please reinstall.")
        return 1

if __name__ == "__main__":
    sys.exit(main())