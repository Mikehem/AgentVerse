#!/usr/bin/env python3
"""
Context Precision Integration Example for Sprint Lens SDK

This example demonstrates how to use the new Context Precision metrics integration
for evaluating the accuracy and relevance of AI responses based on provided context.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import ContextPrecisionMetric, evaluate_context_precision, evaluate_context_precision_sync

def main():
    """Main example function demonstrating Context Precision usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🎯 Context Precision Assessment Integration Example")
    print("=" * 58)
    
    # Example 1: High Precision - Accurate Responses Based on Context
    print("\n⭐ Example 1: High Precision Responses Based on Context")
    print("-" * 48)
    
    # Create Context Precision metric
    precision_metric = ContextPrecisionMetric()
    
    # Sample contexts and their accurate responses
    context_scenarios = [
        {
            "input": "What is the capital of France?",
            "context": "France is a country in Western Europe. Its capital is Paris, which is located in the north-central part of the country and has a population of over 2 million people.",
            "response": "The capital of France is Paris, located in the north-central part of the country.",
            "expected": "Paris"
        },
        {
            "input": "When was the company founded?", 
            "context": "TechCorp was founded in 1995 by Sarah Johnson and Mike Chen in Silicon Valley. The company started as a small software development firm and has grown to over 500 employees.",
            "response": "TechCorp was founded in 1995 by Sarah Johnson and Mike Chen in Silicon Valley.",
            "expected": "1995"
        },
        {
            "input": "What are the main features of this product?",
            "context": "The SmartWatch Pro includes GPS tracking, heart rate monitoring, sleep analysis, water resistance up to 50 meters, and a battery life of up to 7 days. It supports both iOS and Android devices.",
            "response": "The SmartWatch Pro features GPS tracking, heart rate monitoring, sleep analysis, 50-meter water resistance, and 7-day battery life, with support for iOS and Android.",
            "expected": "GPS tracking, heart rate monitoring, sleep analysis, water resistance, 7-day battery"
        },
        {
            "input": "What is the recommended dosage?",
            "context": "For adults over 18 years: Take one 500mg tablet twice daily with meals. Do not exceed 2 tablets in 24 hours. Consult your doctor if symptoms persist for more than 3 days.",
            "response": "The recommended dosage for adults is one 500mg tablet twice daily with meals, not exceeding 2 tablets in 24 hours.",
            "expected": "500mg twice daily"
        },
        {
            "input": "What time does the store close?",
            "context": "Our store hours are Monday through Friday 9 AM to 8 PM, Saturday 10 AM to 6 PM, and Sunday 12 PM to 5 PM. We are closed on major holidays.",
            "response": "Our store closes at 8 PM Monday through Friday, 6 PM on Saturday, and 5 PM on Sunday.",
            "expected": "8 PM weekdays, 6 PM Saturday, 5 PM Sunday"
        }
    ]
    
    print(f"Evaluating {len(context_scenarios)} high-precision responses...")
    
    try:
        predictions = [s["response"] for s in context_scenarios]
        expected_outputs = [s["expected"] for s in context_scenarios]
        contexts = [s["context"] for s in context_scenarios]
        
        result = precision_metric.evaluate(
            predictions=predictions,
            ground_truth=expected_outputs,
            contexts=contexts
        )
        
        print(f"\n📊 Overall Precision Score: {result.value:.2f}/1.0")
        if result.details:
            dist = result.details['precision_distribution']
            print(f"📈 Precision Distribution:")
            print(f"   High Precision (≥0.8): {dist['high_precision']} responses")
            print(f"   Medium Precision (0.5-0.8): {dist['medium_precision']} responses") 
            print(f"   Low Precision (<0.5): {dist['low_precision']} responses")
            print(f"💰 Total Cost: ${result.details['total_cost']:.4f}")
            print(f"⏱️ Average Latency: {result.details['avg_latency']:.0f}ms")
            print(f"🎯 Precision Rate: {result.details['precision_rate']:.1%}")
            
            # Show one detailed analysis
            if result.details['individual_results']:
                first_result = result.details['individual_results'][0]
                print(f"\n🔍 Sample Analysis (Scenario 1):")
                print(f"   Score: {first_result['score']:.2f}")
                print(f"   Reasoning: {first_result['reasoning'][:150]}...")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 2: Mixed Precision Quality Responses
    print("\n" + "=" * 58)
    print("📊 Example 2: Mixed Precision Quality Responses")
    print("-" * 48)
    
    mixed_scenarios = [
        {
            "input": "What are the side effects?",
            "context": "Common side effects include nausea, dizziness, and headache. Rare side effects may include allergic reactions. Contact your doctor immediately if you experience difficulty breathing.",
            "response": "Common side effects include nausea, dizziness, and headache. Severe side effects may include allergic reactions.",
            "expected": "nausea, dizziness, headache"
        },
        {
            "input": "What is the weather forecast?",
            "context": "Tomorrow's forecast: Sunny with temperatures reaching 75°F (24°C). Light winds from the west at 5-10 mph. No precipitation expected.",
            "response": "Tomorrow will be sunny with highs around 75°F and light westerly winds.",
            "expected": "Sunny, 75°F"
        },
        {
            "input": "How do I reset the device?",
            "context": "To reset the device: Hold the power button for 10 seconds until the screen turns off. Wait 5 seconds, then press the power button again to restart.",
            "response": "Hold the power button for about 10 seconds until it shuts down, then turn it back on after a few seconds.",
            "expected": "Hold power button 10 seconds"
        },
        {
            "input": "What are the system requirements?",
            "context": "Minimum requirements: Windows 10, 8GB RAM, Intel i5 processor, 50GB free disk space, DirectX 11 compatible graphics card.",
            "response": "You need Windows 10, at least 4GB RAM, and a decent processor to run this software.",
            "expected": "Windows 10, 8GB RAM, Intel i5"
        }
    ]
    
    print(f"Evaluating {len(mixed_scenarios)} responses of varying precision...")
    
    try:
        mixed_predictions = [s["response"] for s in mixed_scenarios]
        mixed_expected = [s["expected"] for s in mixed_scenarios]
        mixed_contexts = [s["context"] for s in mixed_scenarios]
        
        mixed_result = precision_metric.evaluate(
            predictions=mixed_predictions,
            ground_truth=mixed_expected,
            contexts=mixed_contexts
        )
        
        print(f"\n📊 Overall Precision Score: {mixed_result.value:.2f}/1.0")
        if mixed_result.details:
            dist = mixed_result.details['precision_distribution']
            print(f"📈 Quality Distribution:")
            print(f"   High Precision: {dist['high_precision']} responses")
            print(f"   Medium Precision: {dist['medium_precision']} responses")
            print(f"   Low Precision: {dist['low_precision']} responses")
            
            # Show individual scores
            print(f"\n🔍 Individual Response Analysis:")
            for i, individual in enumerate(mixed_result.details['individual_results']):
                precision_level = "High" if individual['score'] >= 0.8 else "Medium" if individual['score'] >= 0.5 else "Low"
                print(f"   Response {i+1}: {individual['score']:.2f} ({precision_level} Precision)")
        
    except Exception as e:
        print(f"❌ Mixed evaluation failed: {e}")
    
    # Example 3: Quick Single Response Evaluation
    print("\n" + "=" * 58)
    print("⚡ Example 3: Quick Single Response Evaluation")
    print("-" * 48)
    
    single_input = "What are the ingredients?"
    single_context = "This recipe contains flour, eggs, milk, sugar, baking powder, vanilla extract, and a pinch of salt. Serves 4 people."
    single_response = "The ingredients are flour, eggs, milk, sugar, baking powder, vanilla extract, and salt."
    single_expected = "flour, eggs, milk, sugar, baking powder, vanilla, salt"
    
    try:
        print("Attempting single evaluation...")
        single_result = evaluate_context_precision_sync(
            input_text=single_input,
            output_text=single_response,
            context=single_context,
            expected_output=single_expected
        )
        
        print(f"Input: \"{single_input}\"")
        print(f"Context: \"{single_context[:80]}...\"")
        print(f"Response: \"{single_response}\"")
        print(f"Precision Score: {single_result['data']['score']:.2f}/1.0")
        print(f"Reasoning: {single_result['data']['reasoning']}")
        print(f"Confidence: {single_result['data']['confidence']:.2f}")
        print(f"Cost: ${single_result['data']['cost']:.4f}")
        
    except Exception as e:
        print(f"❌ Single evaluation failed: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        
        # Try a simpler test case
        try:
            print("Attempting simpler test case...")
            simple_result = evaluate_context_precision_sync(
                input_text="What is 2+2?",
                output_text="2+2 equals 4",
                context="The answer to 2+2 is 4."
            )
            print(f"Simple test succeeded: {simple_result['data']['score']}")
        except Exception as simple_e:
            print(f"Simple test also failed: {simple_e}")
    
    # Example 4: Hallucination Detection - Low Precision Responses
    print("\n" + "=" * 58)
    print("🚨 Example 4: Hallucination Detection - Low Precision")
    print("-" * 48)
    
    hallucination_scenarios = [
        {
            "input": "What is the population of the city?",
            "context": "Springfield has a population of 45,000 residents according to the 2020 census. The city covers an area of 25 square miles.",
            "response": "Springfield has approximately 120,000 residents and is one of the fastest-growing cities in the region.",
            "expected": "45,000"
        },
        {
            "input": "What are the business hours?",
            "context": "We are open Monday through Friday from 9 AM to 5 PM. Closed on weekends and holidays.",
            "response": "We're open 24/7 every day of the week, including holidays, to serve our customers.",
            "expected": "Monday-Friday 9 AM to 5 PM"
        },
        {
            "input": "What is included in the warranty?",
            "context": "The product comes with a 1-year limited warranty covering manufacturing defects. Water damage and accidental damage are not covered.",
            "response": "The product has a comprehensive 3-year warranty that covers everything including water damage and accidental drops.",
            "expected": "1-year warranty, manufacturing defects only"
        }
    ]
    
    print(f"Evaluating {len(hallucination_scenarios)} responses with hallucinations...")
    
    try:
        hall_predictions = [s["response"] for s in hallucination_scenarios]
        hall_expected = [s["expected"] for s in hallucination_scenarios]
        hall_contexts = [s["context"] for s in hallucination_scenarios]
        
        hall_result = precision_metric.evaluate(
            predictions=hall_predictions,
            ground_truth=hall_expected,
            contexts=hall_contexts
        )
        
        print(f"\n📊 Hallucination Detection Score: {hall_result.value:.2f}/1.0")
        if hall_result.details:
            dist = hall_result.details['precision_distribution']
            print(f"📈 Precision Analysis:")
            print(f"   High Precision: {dist['high_precision']} responses")
            print(f"   Medium Precision: {dist['medium_precision']} responses")
            print(f"   Low Precision: {dist['low_precision']} responses")
            
            # Show worst performing response
            scores = [(i, r['score']) for i, r in enumerate(hall_result.details['individual_results'])]
            scores.sort(key=lambda x: x[1])
            
            print(f"\n🔍 Most Inaccurate Response Analysis:")
            worst_idx, worst_score = scores[0]
            worst_result = hall_result.details['individual_results'][worst_idx]
            print(f"   Input: \"{hallucination_scenarios[worst_idx]['input']}\"")
            print(f"   Context: \"{hallucination_scenarios[worst_idx]['context'][:100]}...\"")
            print(f"   Response: \"{hallucination_scenarios[worst_idx]['response'][:100]}...\"")
            print(f"   Score: {worst_score:.2f}")
            print(f"   Reasoning: {worst_result['reasoning'][:200]}...")
        
    except Exception as e:
        print(f"❌ Hallucination evaluation failed: {e}")
    
    # Example 5: Technical Documentation Precision
    print("\n" + "=" * 58)
    print("📚 Example 5: Technical Documentation Precision")
    print("-" * 48)
    
    tech_scenarios = [
        {
            "input": "How do I configure the database connection?",
            "context": "Configure database connection in config.json: Set 'host' to your database server, 'port' to 5432 for PostgreSQL, 'database' to your DB name, and provide 'username' and 'password' credentials.",
            "response": "To configure the database connection, edit the config.json file with your database host, port (5432 for PostgreSQL), database name, username, and password.",
            "expected": "Edit config.json with host, port 5432, database name, credentials"
        },
        {
            "input": "What is the API rate limit?",
            "context": "The API has a rate limit of 1000 requests per hour per API key. Exceeding this limit will result in a 429 status code. Premium accounts have a limit of 5000 requests per hour.",
            "response": "The API rate limit is 1000 requests per hour for standard accounts and 5000 requests per hour for premium accounts.",
            "expected": "1000 requests/hour standard, 5000 requests/hour premium"
        },
        {
            "input": "Which Python version is required?",
            "context": "This package requires Python 3.8 or higher. It has been tested with Python 3.8, 3.9, 3.10, and 3.11. Python 2.x is not supported.",
            "response": "The package requires Python 3.8 or higher and has been tested up to Python 3.11. Python 2.x is not supported.",
            "expected": "Python 3.8 or higher"
        }
    ]
    
    print(f"Evaluating {len(tech_scenarios)} technical documentation responses...")
    
    try:
        tech_predictions = [s["response"] for s in tech_scenarios]
        tech_expected = [s["expected"] for s in tech_scenarios]
        tech_contexts = [s["context"] for s in tech_scenarios]
        
        tech_result = precision_metric.evaluate(
            predictions=tech_predictions,
            ground_truth=tech_expected,
            contexts=tech_contexts
        )
        
        print(f"\n📊 Technical Documentation Precision Score: {tech_result.value:.2f}/1.0")
        if tech_result.details:
            print(f"🎯 Precision Rate: {tech_result.details['precision_rate']:.1%}")
            print(f"💰 Total Cost: ${tech_result.details['total_cost']:.4f}")
            
            print(f"\n🔍 Technical Documentation Analysis:")
            for i, result in enumerate(tech_result.details['individual_results']):
                print(f"   Scenario {i+1}: Score {result['score']:.2f}")
                print(f"   Input: \"{tech_scenarios[i]['input']}\"")
                print(f"   Precision: {result['reasoning'][:100]}...")
                print()
        
    except Exception as e:
        print(f"❌ Technical evaluation failed: {e}")
    
    print("\n" + "=" * 58)
    print("✅ Context Precision Assessment Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Automated context precision scoring (0.0-1.0 scale)")
    print("   • Detailed reasoning for precision assessments")
    print("   • Quality distribution analysis (High/Medium/Low Precision)")
    print("   • Batch evaluation for multiple context-response pairs")
    print("   • Hallucination detection capabilities")
    print("   • Cost and performance tracking")
    print("   • Real-world scenario testing")
    print("\n🎯 Evaluation Criteria:")
    print("   • Factual Accuracy - Is the response factually correct per context?")
    print("   • Context Alignment - Does response align with provided context?")
    print("   • Completeness - Does response appropriately use context information?")
    print("   • Hallucination Detection - Any information not in context?")
    print("\n💡 Use Cases:")
    print("   • RAG (Retrieval-Augmented Generation) quality assessment")
    print("   • Factual accuracy verification")
    print("   • Hallucination detection in AI responses")
    print("   • Knowledge base consistency checking")
    print("   • Technical documentation accuracy")
    print("   • Customer support response validation")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: ContextPrecisionMetric, evaluate_context_precision, evaluate_context_precision_sync")
    print("   • UI Components: Context precision dashboard integration")

if __name__ == "__main__":
    main()