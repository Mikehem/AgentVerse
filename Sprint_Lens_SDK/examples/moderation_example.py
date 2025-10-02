#!/usr/bin/env python3
"""
Content Moderation Integration Example for Sprint Lens SDK

This example demonstrates how to use the new Moderation metrics integration
for content safety assessment using LLM-based evaluation.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import ModerationMetric, evaluate_moderation, evaluate_moderation_sync

def main():
    """Main example function demonstrating Moderation usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🛡️ Content Moderation Integration Example")
    print("=" * 50)
    
    # Example 1: Basic Content Moderation for Safe Content
    print("\n✅ Example 1: Safe Content Evaluation")
    print("-" * 30)
    
    # Create Moderation metric
    moderation_metric = ModerationMetric()
    
    # Sample safe content
    safe_content = [
        "Welcome to our platform! We're excited to help you with your questions.",
        "The weather today is sunny with a high of 75 degrees.",
        "Here's a recipe for chocolate chip cookies that everyone will love.",
        "Our customer support team is available 24/7 to assist you.",
        "Machine learning is a fascinating field with many applications."
    ]
    
    print(f"Evaluating {len(safe_content)} pieces of safe content...")
    
    try:
        result = moderation_metric.evaluate(predictions=safe_content)
        
        print(f"\n📊 Overall Safety Score: {result.value:.3f} (0 = safe, 1 = unsafe)")
        if result.details:
            print(f"🛡️ Safety Rate: {result.details['safety_rate']:.1%}")
            print(f"⚠️ Unsafe Content Count: {result.details['unsafe_content_count']}")
            print(f"💰 Total Cost: ${result.details['total_cost']:.4f}")
            print(f"⏱️ Average Latency: {result.details['avg_latency']:.0f}ms")
            
            # Show individual results
            for i, individual in enumerate(result.details['individual_results'][:2]):
                print(f"\n📝 Content {i+1} Analysis:")
                print(f"   Score: {individual['score']:.3f}")
                print(f"   Reasoning: {individual['reasoning'][:100]}...")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 2: Potentially Problematic Content
    print("\n" + "=" * 50)
    print("⚠️ Example 2: Potentially Problematic Content")
    print("-" * 30)
    
    problematic_content = [
        "This content contains hate speech and inflammatory language targeting specific groups.",
        "Instructions on how to cause harm to others.",
        "Content promoting illegal activities and dangerous behavior.",
        "I love learning about artificial intelligence and its applications.",  # Safe content mixed in
        "Inappropriate sexual content and explicit material."
    ]
    
    print(f"Evaluating {len(problematic_content)} pieces of mixed content...")
    
    try:
        problem_result = moderation_metric.evaluate(predictions=problematic_content)
        
        print(f"\n📊 Overall Safety Score: {problem_result.value:.3f} (0 = safe, 1 = unsafe)")
        if problem_result.details:
            print(f"🛡️ Safety Rate: {problem_result.details['safety_rate']:.1%}")
            print(f"⚠️ Unsafe Content Count: {problem_result.details['unsafe_content_count']}")
            print(f"💰 Total Cost: ${problem_result.details['total_cost']:.4f}")
            
            # Show breakdown of unsafe vs safe content
            unsafe_items = [r for r in problem_result.details['individual_results'] if r['score'] >= 0.5]
            safe_items = [r for r in problem_result.details['individual_results'] if r['score'] < 0.5]
            
            print(f"\n🔍 Content Analysis Breakdown:")
            print(f"   Unsafe items: {len(unsafe_items)}")
            print(f"   Safe items: {len(safe_items)}")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 3: Single Content Evaluation using Utility Function
    print("\n" + "=" * 50)
    print("🔍 Example 3: Single Content Quick Evaluation")
    print("-" * 30)
    
    single_content = "This is a neutral technology discussion about machine learning algorithms."
    
    try:
        # Use the utility function for quick evaluation
        single_result = evaluate_moderation_sync(output_text=single_content)
        
        print(f"Content: \"{single_content}\"")
        print(f"Safety Score: {single_result['data']['score']:.3f}")
        print(f"Reasoning: {single_result['data']['reasoning']}")
        print(f"Confidence: {single_result['data']['confidence']:.3f}")
        print(f"Cost: ${single_result['data']['cost']:.4f}")
        
    except Exception as e:
        print(f"❌ Single evaluation failed: {e}")
    
    # Example 4: Batch Content Moderation
    print("\n" + "=" * 50)
    print("📦 Example 4: Batch Content Moderation")
    print("-" * 30)
    
    batch_content = [
        "Hello everyone! Welcome to our community guidelines discussion.",
        "Here are some tips for effective communication in our forum.",
        "Content that promotes violence and harmful activities should not be posted.",  # Meta-content about rules
        "Please be respectful to all community members.",
        "Our AI assistant is here to help with your technical questions."
    ]
    
    print(f"Processing batch of {len(batch_content)} community messages...")
    
    try:
        batch_result = moderation_metric.evaluate(predictions=batch_content)
        
        print(f"\n📋 Batch Moderation Results:")
        print(f"   Overall Safety Score: {batch_result.value:.3f}")
        if batch_result.details:
            print(f"   Safety Rate: {batch_result.details['safety_rate']:.1%}")
            print(f"   Processing Time: {batch_result.details['avg_latency']:.0f}ms per item")
            print(f"   Total Cost: ${batch_result.details['total_cost']:.4f}")
            
            # Flag any concerning content
            concerning_items = []
            for i, item in enumerate(batch_result.details['individual_results']):
                if item['score'] >= 0.3:  # Lower threshold for flagging
                    concerning_items.append((i, item))
            
            if concerning_items:
                print(f"\n🚨 Flagged {len(concerning_items)} items for review:")
                for idx, item in concerning_items:
                    print(f"   Item {idx+1}: Score {item['score']:.3f}")
            else:
                print("\n✅ All content passed safety checks!")
        
    except Exception as e:
        print(f"❌ Batch evaluation failed: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Content Moderation Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Automated content safety assessment")
    print("   • Real-time moderation scoring (0-1 scale)")
    print("   • Detailed reasoning for moderation decisions")
    print("   • Batch processing for multiple content items")
    print("   • Cost and performance tracking")
    print("   • Safety rate calculation and reporting")
    print("\n🛡️ Use Cases:")
    print("   • User-generated content moderation")
    print("   • AI assistant response safety checks")
    print("   • Community forum content filtering")
    print("   • Automated content policy enforcement")
    print("   • Real-time chat moderation")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: ModerationMetric, evaluate_moderation, evaluate_moderation_sync")
    print("   • UI Components: Content safety dashboard integration")

if __name__ == "__main__":
    main()