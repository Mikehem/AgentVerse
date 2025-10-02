#!/usr/bin/env python3
"""
G-Eval Integration Example for Sprint Lens SDK

This example demonstrates how to use the new G-Eval metrics integration
with Chain of Thought reasoning for task-agnostic evaluation.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import GEvalMetric, evaluate_g_eval, evaluate_g_eval_sync

def main():
    """Main example function demonstrating G-Eval usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🚀 G-Eval Integration Example")
    print("=" * 50)
    
    # Example 1: Basic G-Eval for Summarization Quality
    print("\n📝 Example 1: Summarization Quality Evaluation")
    print("-" * 30)
    
    # Define the evaluation task
    task_introduction = "Evaluate the quality of a text summarization task."
    evaluation_criteria = """
    A good summary should be:
    1. Accurate - Contains no factual errors
    2. Concise - Captures key points without unnecessary details
    3. Coherent - Ideas flow logically and clearly
    4. Complete - Covers all important aspects of the original text
    """
    
    evaluation_steps = [
        "Read the original text carefully to understand its main points",
        "Examine the summary to identify what key information it includes",
        "Check for any factual errors or misrepresentations",
        "Assess whether the summary is concise yet comprehensive",
        "Evaluate the logical flow and coherence of the summary"
    ]
    
    # Sample data
    original_text = """
    Artificial Intelligence (AI) has revolutionized various industries in recent years. 
    From healthcare where AI assists in medical diagnosis to finance where it detects 
    fraudulent transactions, the applications are vast. Machine learning, a subset of AI, 
    enables systems to learn from data without explicit programming. Deep learning, 
    another subset, uses neural networks to process complex patterns. However, AI also 
    raises ethical concerns about job displacement and privacy. Despite these challenges, 
    AI continues to advance rapidly with breakthrough developments in natural language 
    processing and computer vision.
    """
    
    ai_summary = """
    AI has transformed multiple industries including healthcare and finance through 
    applications like medical diagnosis and fraud detection. Machine learning allows 
    systems to learn from data automatically, while deep learning uses neural networks 
    for complex pattern recognition. Although AI raises ethical concerns about employment 
    and privacy, it continues advancing in areas like natural language processing 
    and computer vision.
    """
    
    # Create G-Eval metric
    g_eval_metric = GEvalMetric(
        task_introduction=task_introduction,
        evaluation_criteria=evaluation_criteria,
        evaluation_steps=evaluation_steps
    )
    
    print(f"Original text length: {len(original_text)} characters")
    print(f"Summary length: {len(ai_summary)} characters")
    print(f"Compression ratio: {len(ai_summary)/len(original_text):.2%}")
    
    # Evaluate the summary
    try:
        result = g_eval_metric.evaluate(
            predictions=[ai_summary],
            ground_truth=[original_text]
        )
        
        print(f"\n✅ G-Eval Score: {result.value:.2f}")
        if result.details and 'individual_results' in result.details:
            reasoning = result.details['individual_results'][0].get('reasoning', 'No reasoning provided')
            print(f"📊 Reasoning: {reasoning}")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 2: Question Answering Quality
    print("\n" + "=" * 50)
    print("❓ Example 2: Question Answering Quality")
    print("-" * 30)
    
    qa_metric = GEvalMetric(
        task_introduction="Evaluate the quality of an AI assistant's answer to a question.",
        evaluation_criteria="""
        A good answer should be:
        1. Accurate - Factually correct and truthful
        2. Relevant - Directly addresses the question asked
        3. Complete - Provides sufficient detail to be helpful
        4. Clear - Easy to understand and well-structured
        """,
        evaluation_steps=[
            "Analyze the question to understand what information is being requested",
            "Examine the answer for factual accuracy",
            "Check if the answer directly addresses the question",
            "Assess the completeness and clarity of the response"
        ]
    )
    
    question = "What are the main benefits of renewable energy sources?"
    
    answer = """
    Renewable energy sources offer several key benefits:
    1. Environmental impact: They produce little to no greenhouse gas emissions during operation
    2. Sustainability: Unlike fossil fuels, renewable sources are naturally replenishing
    3. Economic advantages: Long-term cost savings and job creation in green industries
    4. Energy security: Reduces dependence on imported fuels and price volatility
    5. Health benefits: Cleaner air and water compared to fossil fuel alternatives
    """
    
    try:
        qa_result = qa_metric.evaluate(
            predictions=[answer],
            ground_truth=[question]
        )
        
        print(f"Question: {question}")
        print(f"Answer quality score: {qa_result.value:.2f}")
        if qa_result.details and 'individual_results' in qa_result.details:
            reasoning = qa_result.details['individual_results'][0].get('reasoning', 'No reasoning provided')
            print(f"Reasoning: {reasoning}")
        
    except Exception as e:
        print(f"❌ QA Evaluation failed: {e}")
    
    # Example 3: Using async evaluation functions
    print("\n" + "=" * 50)
    print("⚡ Example 3: Async G-Eval Evaluation")
    print("-" * 30)
    
    try:
        # Use the utility function for quick evaluation
        async_result = evaluate_g_eval_sync(
            input_text="Write an engaging opening for a dystopian story.",
            output_text="""
            The last library on Earth stood empty, its books gathering dust in the 
            perpetual twilight of a world where reading had been forgotten. Maya 
            discovered it by accident, stumbling through a hidden door while 
            exploring the ruins of what her grandmother called 'the old city.'
            """,
            task_introduction="Evaluate the creativity of a story opening.",
            evaluation_criteria="The opening should be engaging, original, and set up an interesting premise.",
            evaluation_steps=[
                "Assess the uniqueness of the premise",
                "Evaluate how engaging the opening is",
                "Check if it establishes compelling characters or setting"
            ]
        )
        
        print(f"Story opening creativity score: {async_result['data']['score']:.2f}")
        print(f"Evaluation reasoning: {async_result['data']['reasoning']}")
        
    except Exception as e:
        print(f"❌ Async evaluation failed: {e}")
    
    print("\n" + "=" * 50)
    print("✅ G-Eval Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Custom task introduction and evaluation criteria")
    print("   • Step-by-step evaluation process")
    print("   • Chain of Thought reasoning")
    print("   • Task-agnostic evaluation framework")
    print("   • Both synchronous and asynchronous evaluation")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: GEvalMetric, evaluate_g_eval, evaluate_g_eval_sync")
    print("   • UI Components: ProjectMetrics with G-Eval option")

if __name__ == "__main__":
    main()