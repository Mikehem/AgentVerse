#!/usr/bin/env python3
"""
Answer Relevance Integration Example for Sprint Lens SDK

This example demonstrates how to use the new Answer Relevance metrics integration
for evaluating how relevant and appropriate AI responses are to input questions.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import AnswerRelevanceMetric, evaluate_answer_relevance, evaluate_answer_relevance_sync

def main():
    """Main example function demonstrating Answer Relevance usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🎯 Answer Relevance Assessment Integration Example")
    print("=" * 55)
    
    # Example 1: Highly Relevant Responses
    print("\n⭐ Example 1: Highly Relevant and Appropriate Responses")
    print("-" * 45)
    
    # Create Answer Relevance metric
    relevance_metric = AnswerRelevanceMetric()
    
    # Sample questions and their highly relevant responses
    questions = [
        "What is the capital of France?",
        "How do I center a div in CSS?",
        "What are the symptoms of diabetes?",
        "How does machine learning work?",
        "What is the formula for calculating compound interest?"
    ]
    
    highly_relevant_responses = [
        "The capital of France is Paris. It is located in north-central France and is the country's largest city and economic center.",
        
        """To center a div in CSS, you can use several methods:
        1. Flexbox: `display: flex; justify-content: center; align-items: center;`
        2. CSS Grid: `display: grid; place-items: center;`
        3. Absolute positioning: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);`
        Flexbox is generally recommended for modern browsers.""",
        
        """Common symptoms of diabetes include:
        - Increased thirst and frequent urination
        - Extreme fatigue and weakness
        - Blurred vision
        - Slow-healing cuts and bruises
        - Unexplained weight loss (Type 1)
        - Tingling or numbness in hands/feet
        If you experience these symptoms, consult a healthcare professional for proper diagnosis.""",
        
        """Machine learning is a subset of artificial intelligence where computers learn patterns from data to make predictions or decisions without being explicitly programmed. The process involves:
        1. Training on large datasets
        2. Identifying patterns and relationships
        3. Creating mathematical models
        4. Making predictions on new, unseen data
        Common types include supervised, unsupervised, and reinforcement learning.""",
        
        """The compound interest formula is: A = P(1 + r/n)^(nt)
        Where:
        - A = final amount
        - P = principal (initial amount)
        - r = annual interest rate (as decimal)
        - n = number of times interest compounds per year
        - t = time in years
        Example: $1000 at 5% annually for 3 years = $1000(1.05)³ = $1,157.63"""
    ]
    
    print(f"Evaluating {len(highly_relevant_responses)} highly relevant responses...")
    
    try:
        result = relevance_metric.evaluate(
            predictions=highly_relevant_responses,
            ground_truth=questions
        )
        
        print(f"\n📊 Overall Relevance Score: {result.value:.2f}/1.0")
        if result.details:
            dist = result.details['relevance_distribution']
            print(f"📈 Relevance Distribution:")
            print(f"   Highly Relevant (≥0.8): {dist['highly_relevant']} responses")
            print(f"   Somewhat Relevant (0.5-0.8): {dist['somewhat_relevant']} responses") 
            print(f"   Not Relevant (<0.5): {dist['not_relevant']} responses")
            print(f"💰 Total Cost: ${result.details['total_cost']:.4f}")
            print(f"⏱️ Average Latency: {result.details['avg_latency']:.0f}ms")
            print(f"🎯 Relevance Rate: {result.details['relevance_rate']:.1%}")
            
            # Show one detailed analysis
            if result.details['individual_results']:
                first_result = result.details['individual_results'][0]
                print(f"\n🔍 Sample Analysis (Question 1):")
                print(f"   Score: {first_result['score']:.2f}")
                print(f"   Reasoning: {first_result['reasoning'][:150]}...")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 2: Mixed Relevance Quality Responses
    print("\n" + "=" * 55)
    print("📊 Example 2: Mixed Relevance Quality Responses")
    print("-" * 45)
    
    mixed_questions = [
        "How do I lose weight effectively?",
        "What programming language should I learn first?",
        "How do I fix a leaky faucet?",
        "What's the best way to study for exams?"
    ]
    
    mixed_responses = [
        # Highly relevant response
        """To lose weight effectively, follow these evidence-based strategies:
        1. Create a moderate caloric deficit (300-500 calories below maintenance)
        2. Focus on whole foods: lean proteins, vegetables, fruits, whole grains
        3. Include regular exercise: combination of cardio and strength training
        4. Stay hydrated and get adequate sleep (7-9 hours)
        5. Track progress through measurements, not just scale weight
        6. Be consistent and patient - aim for 1-2 pounds per week
        Consult a healthcare provider before starting any weight loss program.""",
        
        # Somewhat relevant response
        "Python is generally recommended as a first programming language because it has simple syntax and is widely used in many fields.",
        
        # Somewhat relevant but incomplete response
        "Turn off the water supply and check if the washer needs replacement.",
        
        # Not very relevant response
        "Studying is important for academic success. Try to focus and work hard."
    ]
    
    print(f"Evaluating {len(mixed_responses)} responses of varying relevance...")
    
    try:
        mixed_result = relevance_metric.evaluate(
            predictions=mixed_responses,
            ground_truth=mixed_questions
        )
        
        print(f"\n📊 Overall Relevance Score: {mixed_result.value:.2f}/1.0")
        if mixed_result.details:
            dist = mixed_result.details['relevance_distribution']
            print(f"📈 Quality Distribution:")
            print(f"   Highly Relevant: {dist['highly_relevant']} responses")
            print(f"   Somewhat Relevant: {dist['somewhat_relevant']} responses")
            print(f"   Not Relevant: {dist['not_relevant']} responses")
            
            # Show individual scores
            print(f"\n🔍 Individual Response Analysis:")
            for i, individual in enumerate(mixed_result.details['individual_results']):
                relevance_level = "Highly Relevant" if individual['score'] >= 0.8 else "Somewhat Relevant" if individual['score'] >= 0.5 else "Not Relevant"
                print(f"   Response {i+1}: {individual['score']:.2f} ({relevance_level})")
        
    except Exception as e:
        print(f"❌ Mixed evaluation failed: {e}")
    
    # Example 3: Quick Single Response Evaluation
    print("\n" + "=" * 55)
    print("⚡ Example 3: Quick Single Response Evaluation")
    print("-" * 45)
    
    question = "What are the health benefits of regular exercise?"
    response = """Regular exercise provides numerous health benefits:
    
    Physical Benefits:
    • Strengthens cardiovascular system and improves heart health
    • Builds and maintains muscle mass and bone density
    • Helps control weight and improves metabolism
    • Boosts immune system function
    • Improves sleep quality and energy levels
    
    Mental Benefits:
    • Reduces stress, anxiety, and symptoms of depression
    • Enhances cognitive function and memory
    • Increases self-esteem and confidence
    • Promotes better mood through endorphin release
    
    Long-term Benefits:
    • Reduces risk of chronic diseases (diabetes, heart disease, cancer)
    • Increases longevity and quality of life
    • Maintains independence in older age
    
    Aim for at least 150 minutes of moderate-intensity exercise per week."""
    
    try:
        single_result = evaluate_answer_relevance_sync(
            input_text=question,
            output_text=response
        )
        
        print(f"Question: \"{question}\"")
        print(f"Relevance Score: {single_result['data']['score']:.2f}/1.0")
        print(f"Reasoning: {single_result['data']['reasoning']}")
        print(f"Confidence: {single_result['data']['confidence']:.2f}")
        print(f"Cost: ${single_result['data']['cost']:.4f}")
        
    except Exception as e:
        print(f"❌ Single evaluation failed: {e}")
    
    # Example 4: Off-topic and Irrelevant Responses
    print("\n" + "=" * 55)
    print("❌ Example 4: Off-topic and Irrelevant Responses")
    print("-" * 45)
    
    offtopic_scenarios = [
        ("How do I bake a chocolate cake?", "The weather today is sunny and pleasant. Birds are singing outside."),
        ("What is quantum computing?", "I like pizza and my favorite color is blue. Dogs are great pets."),
        ("How can I improve my credit score?", "Artificial intelligence is transforming many industries including healthcare and finance."),
        ("What are the causes of climate change?", "My grandmother used to tell interesting stories when I was young.")
    ]
    
    print(f"Evaluating {len(offtopic_scenarios)} clearly off-topic responses...")
    
    try:
        questions = [scenario[0] for scenario in offtopic_scenarios]
        responses = [scenario[1] for scenario in offtopic_scenarios]
        
        offtopic_result = relevance_metric.evaluate(
            predictions=responses,
            ground_truth=questions
        )
        
        print(f"\n📊 Off-topic Responses Relevance Score: {offtopic_result.value:.2f}/1.0")
        if offtopic_result.details:
            dist = offtopic_result.details['relevance_distribution']
            print(f"📈 Response Analysis:")
            print(f"   Highly Relevant: {dist['highly_relevant']} responses")
            print(f"   Somewhat Relevant: {dist['somewhat_relevant']} responses")
            print(f"   Not Relevant: {dist['not_relevant']} responses")
            
            # Show worst performing response
            scores = [(i, r['score']) for i, r in enumerate(offtopic_result.details['individual_results'])]
            scores.sort(key=lambda x: x[1])
            
            print(f"\n🔍 Most Irrelevant Response Analysis:")
            worst_idx, worst_score = scores[0]
            worst_result = offtopic_result.details['individual_results'][worst_idx]
            print(f"   Question: \"{questions[worst_idx]}\"")
            print(f"   Response: \"{responses[worst_idx]}\"")
            print(f"   Score: {worst_score:.2f}")
            print(f"   Reasoning: {worst_result['reasoning'][:200]}...")
        
    except Exception as e:
        print(f"❌ Off-topic evaluation failed: {e}")
    
    # Example 5: Context-Dependent Relevance
    print("\n" + "=" * 55)
    print("🧠 Example 5: Context-Dependent Relevance")
    print("-" * 45)
    
    context_scenarios = [
        {
            "question": "How do I handle exceptions?",
            "response": "Use try-catch blocks to handle exceptions gracefully in your code.",
            "context": "I'm learning Java programming and working on error handling."
        },
        {
            "question": "What's the best framework to use?",
            "response": "React is excellent for building interactive user interfaces with component-based architecture.",
            "context": "I'm building a web application frontend."
        },
        {
            "question": "How do I optimize performance?",
            "response": "Use indexing on frequently queried columns and optimize your SQL queries.",
            "context": "I'm working with a PostgreSQL database."
        }
    ]
    
    print(f"Evaluating {len(context_scenarios)} context-dependent responses...")
    
    try:
        questions = [s["question"] for s in context_scenarios]
        responses = [s["response"] for s in context_scenarios]
        contexts = [s["context"] for s in context_scenarios]
        
        context_result = relevance_metric.evaluate(
            predictions=responses,
            ground_truth=questions,
            contexts=contexts
        )
        
        print(f"\n📊 Context-Aware Relevance Score: {context_result.value:.2f}/1.0")
        if context_result.details:
            print(f"🎯 Relevance Rate: {context_result.details['relevance_rate']:.1%}")
            print(f"💰 Total Cost: ${context_result.details['total_cost']:.4f}")
            
            print(f"\n🔍 Context-Dependent Analysis:")
            for i, result in enumerate(context_result.details['individual_results']):
                print(f"   Scenario {i+1}: Score {result['score']:.2f}")
                print(f"   Question: \"{questions[i]}\"")
                print(f"   Context: \"{contexts[i]}\"")
                print(f"   Relevance: {result['reasoning'][:100]}...")
                print()
        
    except Exception as e:
        print(f"❌ Context evaluation failed: {e}")
    
    print("\n" + "=" * 55)
    print("✅ Answer Relevance Assessment Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Automated response relevance scoring (0.0-1.0 scale)")
    print("   • Detailed reasoning for relevance assessments")
    print("   • Quality distribution analysis (Highly/Somewhat/Not Relevant)")
    print("   • Batch evaluation for multiple question-answer pairs")
    print("   • Context-aware relevance evaluation")
    print("   • Cost and performance tracking")
    print("   • Real-world scenario testing")
    print("\n🎯 Evaluation Criteria:")
    print("   • Alignment - Does response align with the original question?")
    print("   • Directness - Does it directly address key query points?")
    print("   • Focus - Does it minimize extraneous or off-topic information?")
    print("   • Appropriateness - Is the response suitable for the context?")
    print("\n💡 Use Cases:")
    print("   • AI assistant response quality monitoring")
    print("   • FAQ relevance assessment")
    print("   • Customer support answer evaluation")
    print("   • Educational content appropriateness checking")
    print("   • Search result relevance optimization")
    print("   • Chatbot response quality improvement")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: AnswerRelevanceMetric, evaluate_answer_relevance, evaluate_answer_relevance_sync")
    print("   • UI Components: Response relevance dashboard integration")

if __name__ == "__main__":
    main()