#!/usr/bin/env python3
"""
Context Recall Integration Example for Sprint Lens SDK

This example demonstrates how to use the new Context Recall metrics integration
for evaluating how well AI responses recall and utilize relevant information from provided context.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import ContextRecallMetric, evaluate_context_recall, evaluate_context_recall_sync

def main():
    """Main example function demonstrating Context Recall usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🧠 Context Recall Assessment Integration Example")
    print("=" * 56)
    
    # Example 1: High Recall - Complete Information Utilization
    print("\n⭐ Example 1: High Recall - Complete Information Utilization")
    print("-" * 50)
    
    # Create Context Recall metric
    recall_metric = ContextRecallMetric()
    
    # Sample contexts and responses that effectively recall information
    high_recall_scenarios = [
        {
            "input": "What are the key features of our product?",
            "context": "Our SmartWatch Pro features GPS tracking, heart rate monitoring, sleep analysis, water resistance up to 50 meters, 7-day battery life, and compatibility with both iOS and Android devices. It also includes music storage for 500 songs.",
            "response": "The SmartWatch Pro includes GPS tracking, heart rate monitoring, sleep analysis, water resistance up to 50 meters, 7-day battery life, iOS and Android compatibility, and music storage for 500 songs.",
            "expected": "GPS tracking, heart rate monitoring, sleep analysis, water resistance, 7-day battery, iOS/Android compatibility, music storage"
        },
        {
            "input": "What are the business hours and contact information?", 
            "context": "Our store is open Monday through Friday from 9 AM to 8 PM, Saturday from 10 AM to 6 PM, and Sunday from 12 PM to 5 PM. You can reach us at (555) 123-4567 or email support@store.com. We're located at 123 Main Street, Downtown.",
            "response": "We're open Monday-Friday 9 AM to 8 PM, Saturday 10 AM to 6 PM, and Sunday 12 PM to 5 PM. Contact us at (555) 123-4567, support@store.com, or visit us at 123 Main Street, Downtown.",
            "expected": "Hours: M-F 9-8, Sat 10-6, Sun 12-5; Phone: (555) 123-4567; Email: support@store.com; Address: 123 Main Street"
        },
        {
            "input": "What are the system requirements for installation?",
            "context": "Minimum system requirements: Windows 10 or macOS 10.15, 8GB RAM, Intel Core i5 or AMD Ryzen 5 processor, 50GB free disk space, DirectX 11 compatible graphics card, and broadband internet connection for activation and updates.",
            "response": "System requirements include Windows 10 or macOS 10.15, 8GB RAM, Intel Core i5 or AMD Ryzen 5 processor, 50GB free disk space, DirectX 11 compatible graphics card, and broadband internet for activation and updates.",
            "expected": "Windows 10/macOS 10.15, 8GB RAM, Intel i5/AMD Ryzen 5, 50GB space, DirectX 11 graphics, broadband internet"
        },
        {
            "input": "What are the warranty terms and coverage?",
            "context": "The product includes a 2-year manufacturer warranty covering defects in materials and workmanship. The warranty does not cover damage from accidents, misuse, water damage, or normal wear and tear. Extended warranty options are available for purchase.",
            "response": "The product has a 2-year manufacturer warranty that covers defects in materials and workmanship, but excludes accidents, misuse, water damage, and normal wear. Extended warranty options can be purchased separately.",
            "expected": "2-year warranty, covers material/workmanship defects, excludes accidents/misuse/water damage/wear, extended warranty available"
        },
        {
            "input": "What are the shipping and return policies?",
            "context": "We offer free standard shipping on orders over $75, with delivery in 5-7 business days. Express shipping is available for $15 with 2-3 day delivery. Returns are accepted within 30 days of purchase with original packaging and receipt. Return shipping costs $10 unless the item was defective.",
            "response": "Free standard shipping on orders over $75 (5-7 days), express shipping for $15 (2-3 days). Returns accepted within 30 days with original packaging and receipt. Return shipping costs $10 unless item was defective.",
            "expected": "Free shipping >$75 (5-7 days), express $15 (2-3 days), 30-day returns with packaging/receipt, $10 return shipping unless defective"
        }
    ]
    
    print(f"Evaluating {len(high_recall_scenarios)} high-recall responses...")
    
    try:
        predictions = [s["response"] for s in high_recall_scenarios]
        expected_outputs = [s["expected"] for s in high_recall_scenarios]
        contexts = [s["context"] for s in high_recall_scenarios]
        
        result = recall_metric.evaluate(
            predictions=predictions,
            ground_truth=expected_outputs,
            contexts=contexts
        )
        
        print(f"\n📊 Overall Recall Score: {result.value:.2f}/1.0")
        if result.details:
            dist = result.details['recall_distribution']
            print(f"📈 Recall Distribution:")
            print(f"   High Recall (≥0.8): {dist['high_recall']} responses")
            print(f"   Medium Recall (0.5-0.8): {dist['medium_recall']} responses") 
            print(f"   Low Recall (<0.5): {dist['low_recall']} responses")
            print(f"💰 Total Cost: ${result.details['total_cost']:.4f}")
            print(f"⏱️ Average Latency: {result.details['avg_latency']:.0f}ms")
            print(f"🎯 Recall Rate: {result.details['recall_rate']:.1%}")
            
            # Show one detailed analysis
            if result.details['individual_results']:
                first_result = result.details['individual_results'][0]
                print(f"\n🔍 Sample Analysis (Scenario 1):")
                print(f"   Score: {first_result['score']:.2f}")
                print(f"   Reasoning: {first_result['reasoning'][:150]}...")
        
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
    
    # Example 2: Mixed Recall Quality Responses
    print("\n" + "=" * 56)
    print("📊 Example 2: Mixed Recall Quality Responses")
    print("-" * 50)
    
    mixed_scenarios = [
        {
            "input": "What are the available payment methods?",
            "context": "We accept Visa, MasterCard, American Express, Discover, PayPal, Apple Pay, Google Pay, and bank transfers. We also offer financing options through Affirm with 0% APR for qualified customers.",
            "response": "We accept all major credit cards including Visa, MasterCard, American Express, and Discover. We also accept PayPal and financing through Affirm.",
            "expected": "Visa, MasterCard, Amex, Discover, PayPal, Apple Pay, Google Pay, bank transfers, Affirm financing"
        },
        {
            "input": "What are the side effects of this medication?",
            "context": "Common side effects include nausea, dizziness, headache, and drowsiness. Rare but serious side effects may include allergic reactions, difficulty breathing, and irregular heartbeat. Contact your doctor immediately if you experience severe symptoms.",
            "response": "Common side effects include nausea, dizziness, and headache. Contact your doctor if you experience any severe symptoms.",
            "expected": "Common: nausea, dizziness, headache, drowsiness; Rare: allergic reactions, breathing difficulty, irregular heartbeat"
        },
        {
            "input": "What's included in the premium subscription?",
            "context": "Premium subscription includes unlimited downloads, ad-free streaming, offline mode, high-quality audio, exclusive content, early access to new features, and priority customer support. The subscription costs $9.99/month or $99/year.",
            "response": "Premium includes unlimited downloads, ad-free streaming, and offline mode for $9.99/month.",
            "expected": "Unlimited downloads, ad-free, offline mode, high-quality audio, exclusive content, early access, priority support, $9.99/month or $99/year"
        },
        {
            "input": "What are the environmental benefits?",
            "context": "Our eco-friendly packaging is made from 100% recycled materials and is fully biodegradable. The product itself uses 40% less energy than traditional models, has a carbon-neutral manufacturing process, and includes a take-back program for end-of-life recycling.",
            "response": "The product uses eco-friendly packaging and is more energy efficient than traditional models.",
            "expected": "100% recycled biodegradable packaging, 40% less energy, carbon-neutral manufacturing, take-back recycling program"
        }
    ]
    
    print(f"Evaluating {len(mixed_scenarios)} responses of varying recall quality...")
    
    try:
        mixed_predictions = [s["response"] for s in mixed_scenarios]
        mixed_expected = [s["expected"] for s in mixed_scenarios]
        mixed_contexts = [s["context"] for s in mixed_scenarios]
        
        mixed_result = recall_metric.evaluate(
            predictions=mixed_predictions,
            ground_truth=mixed_expected,
            contexts=mixed_contexts
        )
        
        print(f"\n📊 Overall Recall Score: {mixed_result.value:.2f}/1.0")
        if mixed_result.details:
            dist = mixed_result.details['recall_distribution']
            print(f"📈 Quality Distribution:")
            print(f"   High Recall: {dist['high_recall']} responses")
            print(f"   Medium Recall: {dist['medium_recall']} responses")
            print(f"   Low Recall: {dist['low_recall']} responses")
            
            # Show individual scores
            print(f"\n🔍 Individual Response Analysis:")
            for i, individual in enumerate(mixed_result.details['individual_results']):
                recall_level = "High" if individual['score'] >= 0.8 else "Medium" if individual['score'] >= 0.5 else "Low"
                print(f"   Response {i+1}: {individual['score']:.2f} ({recall_level} Recall)")
        
    except Exception as e:
        print(f"❌ Mixed evaluation failed: {e}")
    
    # Example 3: Quick Single Response Evaluation
    print("\n" + "=" * 56)
    print("⚡ Example 3: Quick Single Response Evaluation")
    print("-" * 50)
    
    single_input = "What are the course requirements?"
    single_context = "The Data Science course requires a bachelor's degree in a related field, basic knowledge of Python or R programming, understanding of statistics and linear algebra, and completion of our introductory math assessment. The course duration is 12 weeks with both online and in-person components."
    single_response = "The course requires a bachelor's degree, Python or R knowledge, statistics and linear algebra understanding, completion of a math assessment, and runs for 12 weeks with online and in-person components."
    single_expected = "Bachelor's degree, Python/R programming, statistics, linear algebra, math assessment, 12 weeks, online/in-person"
    
    try:
        print("Attempting single evaluation...")
        single_result = evaluate_context_recall_sync(
            input_text=single_input,
            output_text=single_response,
            context=single_context,
            expected_output=single_expected
        )
        
        print(f"Input: \"{single_input}\"")
        print(f"Context: \"{single_context[:80]}...\"")
        print(f"Response: \"{single_response}\"")
        print(f"Recall Score: {single_result['data']['score']:.2f}/1.0")
        print(f"Reasoning: {single_result['data']['reasoning']}")
        print(f"Confidence: {single_result['data']['confidence']:.2f}")
        print(f"Cost: ${single_result['data']['cost']:.4f}")
        
    except Exception as e:
        print(f"❌ Single evaluation failed: {e}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
    
    # Example 4: Low Recall - Incomplete Information Retrieval
    print("\n" + "=" * 56)
    print("📉 Example 4: Low Recall - Incomplete Information Retrieval")
    print("-" * 50)
    
    low_recall_scenarios = [
        {
            "input": "What are all the available colors and sizes?",
            "context": "Available in sizes XS, S, M, L, XL, XXL and colors: Black, White, Navy Blue, Charcoal Gray, Forest Green, Burgundy, Royal Blue. Each color is available in all sizes except XXL, which is only available in Black and Navy Blue.",
            "response": "Available in multiple sizes and colors including Black, White, and Blue.",
            "expected": "Sizes: XS-XXL, Colors: Black, White, Navy, Gray, Green, Burgundy, Royal Blue, XXL limited to Black/Navy"
        },
        {
            "input": "What are the complete technical specifications?",
            "context": "Processor: Intel Core i7-12700H, RAM: 16GB DDR4, Storage: 512GB NVMe SSD, Graphics: NVIDIA RTX 3060 6GB, Display: 15.6\" 1080p 144Hz, Battery: 6-cell 80Wh, Ports: 3x USB-A, 2x USB-C, HDMI, Ethernet, Weight: 4.2 lbs.",
            "response": "Features Intel i7 processor, 16GB RAM, and NVIDIA graphics.",
            "expected": "i7-12700H, 16GB DDR4, 512GB NVMe, RTX 3060 6GB, 15.6\" 1080p 144Hz, 80Wh battery, multiple ports, 4.2 lbs"
        },
        {
            "input": "What are the complete pricing and package details?",
            "context": "Basic package: $299/month includes 10 users, 100GB storage, email support. Professional: $599/month includes 50 users, 500GB storage, phone support, advanced analytics. Enterprise: $1299/month includes unlimited users, 2TB storage, dedicated support, custom integrations, SLA guarantee.",
            "response": "We offer multiple pricing tiers starting at $299 per month.",
            "expected": "Basic $299 (10 users, 100GB, email), Pro $599 (50 users, 500GB, phone, analytics), Enterprise $1299 (unlimited, 2TB, dedicated, integrations, SLA)"
        }
    ]
    
    print(f"Evaluating {len(low_recall_scenarios)} responses with poor information recall...")
    
    try:
        low_predictions = [s["response"] for s in low_recall_scenarios]
        low_expected = [s["expected"] for s in low_recall_scenarios]
        low_contexts = [s["context"] for s in low_recall_scenarios]
        
        low_result = recall_metric.evaluate(
            predictions=low_predictions,
            ground_truth=low_expected,
            contexts=low_contexts
        )
        
        print(f"\n📊 Low Recall Detection Score: {low_result.value:.2f}/1.0")
        if low_result.details:
            dist = low_result.details['recall_distribution']
            print(f"📈 Recall Analysis:")
            print(f"   High Recall: {dist['high_recall']} responses")
            print(f"   Medium Recall: {dist['medium_recall']} responses")
            print(f"   Low Recall: {dist['low_recall']} responses")
            
            # Show worst performing response
            scores = [(i, r['score']) for i, r in enumerate(low_result.details['individual_results'])]
            scores.sort(key=lambda x: x[1])
            
            print(f"\n🔍 Poorest Recall Response Analysis:")
            worst_idx, worst_score = scores[0]
            worst_result = low_result.details['individual_results'][worst_idx]
            print(f"   Input: \"{low_recall_scenarios[worst_idx]['input']}\"")
            print(f"   Context: \"{low_recall_scenarios[worst_idx]['context'][:100]}...\"")
            print(f"   Response: \"{low_recall_scenarios[worst_idx]['response']}\"")
            print(f"   Score: {worst_score:.2f}")
            print(f"   Reasoning: {worst_result['reasoning'][:200]}...")
        
    except Exception as e:
        print(f"❌ Low recall evaluation failed: {e}")
    
    # Example 5: Knowledge Base and FAQ Recall
    print("\n" + "=" * 56)
    print("📚 Example 5: Knowledge Base and FAQ Recall")
    print("-" * 50)
    
    kb_scenarios = [
        {
            "input": "How do I reset my password?",
            "context": "To reset your password: 1) Go to the login page and click 'Forgot Password', 2) Enter your email address, 3) Check your email for a reset link, 4) Click the link and enter a new password, 5) Confirm the new password. Password must be at least 8 characters with one uppercase, one lowercase, one number, and one special character.",
            "response": "To reset your password, go to the login page, click 'Forgot Password', enter your email, check for a reset link, and follow the instructions to create a new password with at least 8 characters including uppercase, lowercase, number, and special character.",
            "expected": "5 steps: forgot password link, enter email, check email, click reset link, create new password (8+ chars, upper/lower/number/special)"
        },
        {
            "input": "What are the data backup and recovery procedures?",
            "context": "Automated backups run daily at 2 AM EST, with full backups weekly on Sundays and incremental backups Monday-Saturday. Backups are stored in geographically distributed data centers with 99.9% uptime guarantee. Recovery options include point-in-time restore, full system restore, and individual file recovery. Recovery time is typically 15 minutes for files, 2 hours for full system restore.",
            "response": "We perform automated daily backups at 2 AM with weekly full backups and daily incremental backups. Backups are stored in distributed data centers with high uptime. Recovery options include point-in-time, full system, and individual file recovery with 15 minutes to 2 hours recovery time.",
            "expected": "Daily 2AM backups, weekly full Sunday, incremental M-Sat, distributed storage, 99.9% uptime, point-in-time/full/file recovery, 15min-2hr recovery time"
        },
        {
            "input": "What are the API rate limits and usage policies?",
            "context": "API rate limits: Free tier 100 requests/hour, Basic plan 1,000 requests/hour, Pro plan 10,000 requests/hour, Enterprise unlimited. Rate limit resets hourly. Exceeded limits return 429 status code. Usage policies prohibit scraping, abuse, and commercial resale of data. Fair use policy applies to all tiers.",
            "response": "API rate limits vary by plan: Free (100/hour), Basic (1,000/hour), Pro (10,000/hour), Enterprise (unlimited). Limits reset hourly and exceeded requests get 429 status. Fair use policies apply and prohibit scraping and data resale.",
            "expected": "Rate limits: Free 100/hr, Basic 1K/hr, Pro 10K/hr, Enterprise unlimited, hourly reset, 429 on exceed, no scraping/abuse/resale, fair use"
        }
    ]
    
    print(f"Evaluating {len(kb_scenarios)} knowledge base responses...")
    
    try:
        kb_predictions = [s["response"] for s in kb_scenarios]
        kb_expected = [s["expected"] for s in kb_scenarios]
        kb_contexts = [s["context"] for s in kb_scenarios]
        
        kb_result = recall_metric.evaluate(
            predictions=kb_predictions,
            ground_truth=kb_expected,
            contexts=kb_contexts
        )
        
        print(f"\n📊 Knowledge Base Recall Score: {kb_result.value:.2f}/1.0")
        if kb_result.details:
            print(f"🎯 Recall Rate: {kb_result.details['recall_rate']:.1%}")
            print(f"💰 Total Cost: ${kb_result.details['total_cost']:.4f}")
            
            print(f"\n🔍 Knowledge Base Analysis:")
            for i, result in enumerate(kb_result.details['individual_results']):
                print(f"   Scenario {i+1}: Score {result['score']:.2f}")
                print(f"   Input: \"{kb_scenarios[i]['input']}\"")
                print(f"   Recall Quality: {result['reasoning'][:100]}...")
                print()
        
    except Exception as e:
        print(f"❌ Knowledge base evaluation failed: {e}")
    
    print("\n" + "=" * 56)
    print("✅ Context Recall Assessment Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Automated context recall scoring (0.0-1.0 scale)")
    print("   • Detailed reasoning for recall assessments")
    print("   • Quality distribution analysis (High/Medium/Low Recall)")
    print("   • Batch evaluation for multiple context-response pairs")
    print("   • Information completeness detection")
    print("   • Cost and performance tracking")
    print("   • Real-world scenario testing")
    print("\n🎯 Evaluation Criteria:")
    print("   • Completeness - Does response include all relevant context information?")
    print("   • Coverage - How well does response cover key context points?")
    print("   • Information Retrieval - Does response recall important details?")
    print("   • Relevance - Is recalled information relevant to the query?")
    print("\n💡 Use Cases:")
    print("   • RAG (Retrieval-Augmented Generation) system evaluation")
    print("   • Knowledge base response completeness assessment")
    print("   • FAQ system quality monitoring")
    print("   • Information extraction validation")
    print("   • Customer support response completeness")
    print("   • Documentation coverage analysis")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: ContextRecallMetric, evaluate_context_recall, evaluate_context_recall_sync")
    print("   • UI Components: Context recall dashboard integration")

if __name__ == "__main__":
    main()