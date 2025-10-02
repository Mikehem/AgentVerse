#!/usr/bin/env python3
"""
Usefulness Assessment Integration Example for Sprint Lens SDK

This example demonstrates how to use the new Usefulness metrics integration
for evaluating the helpfulness and utility of AI responses.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import UsefulnessMetric, evaluate_usefulness, evaluate_usefulness_sync

def main():
    """Main example function demonstrating Usefulness usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("💡 Usefulness Assessment Integration Example")
    print("=" * 50)
    
    # Example 1: Highly Useful Technical Responses
    print("\n⭐ Example 1: Highly Useful Technical Responses")
    print("-" * 40)
    
    # Create Usefulness metric
    usefulness_metric = UsefulnessMetric()
    
    # Sample queries and their useful responses
    queries = [
        "How can I optimize my Python web application performance?",
        "What are the best practices for database indexing?",
        "How do I implement JWT authentication in a REST API?",
        "What's the difference between synchronous and asynchronous programming?",
        "How can I debug memory leaks in my Node.js application?"
    ]
    
    useful_responses = [
        """Here are 5 actionable strategies to optimize your Python web application:
        1. Use caching (Redis/Memcached) for frequently accessed data
        2. Optimize database queries with proper indexing and connection pooling
        3. Implement async programming with asyncio for I/O-bound operations
        4. Use a CDN for static assets and enable gzip compression
        5. Profile your code with tools like cProfile to identify bottlenecks
        Each strategy can improve performance by 20-50% when properly implemented.""",
        
        """Database indexing best practices:
        1. Create indexes on frequently queried columns (WHERE, JOIN, ORDER BY)
        2. Use composite indexes for multi-column queries
        3. Avoid over-indexing as it slows INSERT/UPDATE operations
        4. Monitor index usage with database-specific tools
        5. Consider partial indexes for large tables with filtered queries
        Remember: indexes improve read performance but require storage space and maintenance overhead.""",
        
        """JWT authentication implementation steps:
        1. Install required library (jsonwebtoken for Node.js, PyJWT for Python)
        2. Create secret key for signing tokens
        3. Generate token on successful login with user payload
        4. Send token in Authorization header: 'Bearer <token>'
        5. Verify token on protected routes using middleware
        6. Handle token expiration and refresh logic
        Include proper error handling and token validation for security.""",
        
        """Key differences between synchronous and asynchronous programming:
        
        Synchronous: Code executes line by line, blocking until each operation completes
        - Pros: Simple to understand and debug
        - Cons: Poor performance for I/O operations, resource wastage
        
        Asynchronous: Non-blocking execution, operations run concurrently
        - Pros: Better resource utilization, improved performance for I/O
        - Cons: Complex debugging, potential callback hell
        
        Use async for: File I/O, network requests, database operations
        Use sync for: CPU-intensive calculations, simple sequential tasks""",
        
        """Node.js memory leak debugging approach:
        1. Use --inspect flag and Chrome DevTools for heap snapshots
        2. Monitor with process.memoryUsage() and external tools like clinic.js
        3. Common causes: Event listeners not removed, closures holding references, global variables
        4. Use WeakMap/WeakSet for object references that should be garbage collected
        5. Implement proper cleanup in error handlers and process termination
        6. Profile with 'node --prof' and analyze with '--prof-process'
        Regular monitoring and proactive cleanup prevent most memory issues."""
    ]
    
    print(f"Evaluating {len(useful_responses)} highly detailed technical responses...")
    
    try:
        result = usefulness_metric.evaluate(
            predictions=useful_responses,
            ground_truth=queries
        )
        
        print(f"\n📊 Overall Usefulness Score: {result.value:.2f}/1.0")
        if result.details:
            dist = result.details['usefulness_distribution']
            print(f"📈 Usefulness Distribution:")
            print(f"   Very Useful (≥0.8): {dist['very_useful']} responses")
            print(f"   Somewhat Useful (0.5-0.8): {dist['somewhat_useful']} responses") 
            print(f"   Not Useful (<0.5): {dist['not_useful']} responses")
            print(f"💰 Total Cost: ${result.details['total_cost']:.4f}")
            print(f"⏱️ Average Latency: {result.details['avg_latency']:.0f}ms")
            
            # Show one detailed analysis
            if result.details['individual_results']:
                first_result = result.details['individual_results'][0]
                print(f"\n🔍 Sample Analysis (Query 1):")
                print(f"   Score: {first_result['score']:.2f}")
                print(f"   Reasoning: {first_result['reasoning'][:150]}...")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 2: Mixed Quality Responses
    print("\n" + "=" * 50)
    print("📊 Example 2: Mixed Quality Responses")
    print("-" * 40)
    
    mixed_queries = [
        "How do I fix a 404 error on my website?",
        "What is machine learning?",
        "How can I improve my team's productivity?"
    ]
    
    mixed_responses = [
        # Very useful response
        """To fix a 404 error, follow these steps:
        1. Check if the URL is correct and the file exists on your server
        2. Verify your web server configuration (Apache .htaccess, Nginx config)
        3. Ensure proper file permissions (644 for files, 755 for directories)
        4. Check for case sensitivity issues in file names
        5. Update any hardcoded links in your HTML/templates
        6. Set up proper redirects for moved content
        7. Use server logs to identify the exact issue
        Test your fixes thoroughly and consider implementing custom 404 pages for better UX.""",
        
        # Somewhat useful response
        "Machine learning is a type of artificial intelligence where computers learn from data to make predictions or decisions without being explicitly programmed for each task.",
        
        # Not very useful response
        "I'm not sure about productivity improvements. You could try some productivity tools maybe."
    ]
    
    print(f"Evaluating {len(mixed_responses)} responses of varying quality...")
    
    try:
        mixed_result = usefulness_metric.evaluate(
            predictions=mixed_responses,
            ground_truth=mixed_queries
        )
        
        print(f"\n📊 Overall Usefulness Score: {mixed_result.value:.2f}/1.0")
        if mixed_result.details:
            dist = mixed_result.details['usefulness_distribution']
            print(f"📈 Quality Distribution:")
            print(f"   Very Useful: {dist['very_useful']} responses")
            print(f"   Somewhat Useful: {dist['somewhat_useful']} responses")
            print(f"   Not Useful: {dist['not_useful']} responses")
            
            # Show individual scores
            print(f"\n🔍 Individual Response Analysis:")
            for i, individual in enumerate(mixed_result.details['individual_results']):
                quality = "Very Useful" if individual['score'] >= 0.8 else "Somewhat Useful" if individual['score'] >= 0.5 else "Not Useful"
                print(f"   Response {i+1}: {individual['score']:.2f} ({quality})")
        
    except Exception as e:
        print(f"❌ Mixed evaluation failed: {e}")
    
    # Example 3: Quick Single Response Evaluation
    print("\n" + "=" * 50)
    print("⚡ Example 3: Quick Single Response Evaluation")
    print("-" * 40)
    
    query = "How do I center a div in CSS?"
    response = """To center a div in CSS, here are the most effective methods:
    
    1. Flexbox (recommended):
    ```css
    .parent { display: flex; justify-content: center; align-items: center; }
    ```
    
    2. CSS Grid:
    ```css
    .parent { display: grid; place-items: center; }
    ```
    
    3. Absolute positioning:
    ```css
    .child { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
    ```
    
    Choose flexbox for most cases as it's widely supported and flexible."""
    
    try:
        single_result = evaluate_usefulness_sync(
            input_text=query,
            output_text=response
        )
        
        print(f"Query: \"{query}\"")
        print(f"Usefulness Score: {single_result['data']['score']:.2f}/1.0")
        print(f"Reasoning: {single_result['data']['reasoning']}")
        print(f"Confidence: {single_result['data']['confidence']:.2f}")
        print(f"Cost: ${single_result['data']['cost']:.4f}")
        
    except Exception as e:
        print(f"❌ Single evaluation failed: {e}")
    
    # Example 4: AI Assistant Response Quality Assessment
    print("\n" + "=" * 50)
    print("🤖 Example 4: AI Assistant Response Quality Assessment")
    print("-" * 40)
    
    assistant_scenarios = [
        ("What's the weather like today?", "I don't have access to real-time weather data. Please check a weather app or website like weather.com for current conditions in your area."),
        ("How do I bake chocolate chip cookies?", "Here's a simple recipe: Mix 2¼ cups flour, 1 tsp salt, 1 tsp baking soda. Cream 1 cup butter with ¾ cup each brown and white sugar. Add 2 eggs and 2 tsp vanilla. Combine wet and dry ingredients, fold in 2 cups chocolate chips. Bake at 375°F for 9-11 minutes."),
        ("Can you help me with my homework?", "I'd be happy to help guide you through your homework! Please share the specific question or topic you're working on, and I'll provide explanations and guidance to help you understand the concepts."),
        ("What time is it?", "I don't have access to real-time information. Please check your device's clock or search 'current time' in your web browser."),
        ("Tell me a joke", "Why don't scientists trust atoms? Because they make up everything!")
    ]
    
    print(f"Evaluating {len(assistant_scenarios)} AI assistant interactions...")
    
    try:
        queries = [scenario[0] for scenario in assistant_scenarios]
        responses = [scenario[1] for scenario in assistant_scenarios]
        
        assistant_result = usefulness_metric.evaluate(
            predictions=responses,
            ground_truth=queries
        )
        
        print(f"\n📊 AI Assistant Usefulness Score: {assistant_result.value:.2f}/1.0")
        if assistant_result.details:
            dist = assistant_result.details['usefulness_distribution']
            print(f"📈 Response Quality Analysis:")
            print(f"   Very Useful: {dist['very_useful']} responses")
            print(f"   Somewhat Useful: {dist['somewhat_useful']} responses")
            print(f"   Not Useful: {dist['not_useful']} responses")
            
            # Identify best and worst responses
            scores = [(i, r['score']) for i, r in enumerate(assistant_result.details['individual_results'])]
            scores.sort(key=lambda x: x[1], reverse=True)
            
            print(f"\n🏆 Most Useful Response: Scenario {scores[0][0]+1} (Score: {scores[0][1]:.2f})")
            print(f"🔧 Needs Improvement: Scenario {scores[-1][0]+1} (Score: {scores[-1][1]:.2f})")
        
    except Exception as e:
        print(f"❌ Assistant evaluation failed: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Usefulness Assessment Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Automated response usefulness scoring (0.0-1.0 scale)")
    print("   • Detailed reasoning for usefulness assessments")
    print("   • Quality distribution analysis (Very/Somewhat/Not Useful)")
    print("   • Batch evaluation for multiple responses")
    print("   • Cost and performance tracking")
    print("   • Real-world scenario testing")
    print("\n💡 Evaluation Criteria:")
    print("   • Actionability - Does it provide actionable information?")
    print("   • Completeness - Is the information comprehensive?")
    print("   • Clarity - Is the response clear and well-structured?")
    print("   • Goal Achievement - Does it help users achieve their goals?")
    print("\n🎯 Use Cases:")
    print("   • AI assistant response quality monitoring")
    print("   • Customer support answer evaluation")
    print("   • Educational content usefulness assessment")
    print("   • Documentation quality improvement")
    print("   • FAQ effectiveness measurement")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: UsefulnessMetric, evaluate_usefulness, evaluate_usefulness_sync")
    print("   • UI Components: Response quality dashboard integration")

if __name__ == "__main__":
    main()