#!/usr/bin/env python3
"""
Conversation Thread Metrics Integration Example for Sprint Lens SDK

This example demonstrates how to use the new conversation thread metrics integration
for evaluating conversational coherence, session completeness quality, and user frustration.
"""

import os
import sys

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import (
    ConversationalCoherenceMetric, SessionCompletenessQuality, UserFrustrationMetric,
    evaluate_conversational_coherence, evaluate_conversational_coherence_sync,
    evaluate_session_completeness_quality, evaluate_session_completeness_quality_sync,
    evaluate_user_frustration, evaluate_user_frustration_sync
)

def main():
    """Main example function demonstrating conversation thread metrics usage."""
    
    # Configure Sprint Lens (adjust URL and credentials as needed)
    sprintlens.configure(
        url="http://localhost:3000",  # Adjust to your backend URL
        username="admin",
        password="admin123"
    )
    
    print("🗣️ Conversation Thread Metrics Integration Example")
    print("=" * 58)
    
    # Example 1: High Coherence Conversation - Customer Support
    print("\n⭐ Example 1: High Coherence Customer Support Conversation")
    print("-" * 58)
    
    coherent_conversations = [
        [
            {"role": "user", "content": "Hi, I'm having trouble logging into my account. It says my password is incorrect."},
            {"role": "assistant", "content": "I'd be happy to help you with your login issue. Can you confirm the email address associated with your account?"},
            {"role": "user", "content": "Yes, it's john.smith@email.com"},
            {"role": "assistant", "content": "Thank you. I can see your account. For security, I'll send a password reset link to john.smith@email.com. Please check your email and follow the instructions to create a new password."},
            {"role": "user", "content": "Perfect, I received the email and was able to reset my password. I'm logged in now. Thank you!"},
            {"role": "assistant", "content": "Excellent! I'm glad we could resolve your login issue quickly. Is there anything else I can help you with today?"},
            {"role": "user", "content": "No, that's all. Thank you for your help!"},
            {"role": "assistant", "content": "You're very welcome! Have a great day, and don't hesitate to reach out if you need any further assistance."}
        ],
        [
            {"role": "user", "content": "What are your business hours?"},
            {"role": "assistant", "content": "Our customer service is available Monday through Friday from 9 AM to 6 PM EST, and Saturday from 10 AM to 4 PM EST. We're closed on Sundays and major holidays."},
            {"role": "user", "content": "Great! Can I schedule a callback for tomorrow at 2 PM?"},
            {"role": "assistant", "content": "Absolutely! I can schedule a callback for tomorrow at 2 PM EST. May I have your phone number and a brief description of what you'd like to discuss?"},
            {"role": "user", "content": "Sure, it's 555-123-4567. I want to discuss upgrading my service plan."},
            {"role": "assistant", "content": "Perfect! I've scheduled a callback for tomorrow at 2 PM EST to 555-123-4567 regarding service plan upgrades. You'll receive a confirmation email shortly."},
            {"role": "user", "content": "Thank you so much!"},
            {"role": "assistant", "content": "You're welcome! Our specialist will call you tomorrow at 2 PM to help with your service plan upgrade. Have a wonderful day!"}
        ]
    ]
    
    # Evaluate conversational coherence
    coherence_metric = ConversationalCoherenceMetric()
    print(f"Evaluating {len(coherent_conversations)} high-coherence conversations...")
    
    try:
        coherence_result = coherence_metric.evaluate(coherent_conversations)
        
        print(f"\n📊 Overall Coherence Score: {coherence_result.value:.2f}/1.0")
        if coherence_result.details:
            dist = coherence_result.details['coherence_distribution']
            print(f"📈 Coherence Distribution:")
            print(f"   High Coherence (≥0.8): {dist['high_coherence']} conversations")
            print(f"   Medium Coherence (0.5-0.8): {dist['medium_coherence']} conversations")
            print(f"   Low Coherence (<0.5): {dist['low_coherence']} conversations")
            print(f"💰 Total Cost: ${coherence_result.details['total_cost']:.4f}")
            print(f"⏱️ Average Latency: {coherence_result.details['avg_latency']:.0f}ms")
            print(f"🎯 Coherence Rate: {coherence_result.details['coherence_rate']:.1%}")
            
            # Show one detailed analysis
            if coherence_result.details['individual_results']:
                first_result = coherence_result.details['individual_results'][0]
                print(f"\n🔍 Sample Analysis (Conversation 1):")
                print(f"   Score: {first_result['score']:.2f}")
                print(f"   Reasoning: {first_result['reasoning'][:150]}...")
        
    except Exception as e:
        print(f"❌ Coherence evaluation failed: {e}")
    
    # Example 2: Session Completeness Quality - Complete vs Incomplete Sessions
    print("\n" + "=" * 58)
    print("📋 Example 2: Session Completeness Quality Assessment")
    print("-" * 58)
    
    complete_sessions = [
        [
            {"role": "user", "content": "I need to return a product I bought online."},
            {"role": "assistant", "content": "I'd be happy to help with your return. Can you provide your order number and tell me which item you'd like to return?"},
            {"role": "user", "content": "Order #12345, and I want to return the blue sweater."},
            {"role": "assistant", "content": "I found your order. The blue sweater is eligible for return within 30 days. Would you like me to email you a prepaid return label?"},
            {"role": "user", "content": "Yes, please send it to my email."},
            {"role": "assistant", "content": "I've sent the return label to your email address. Package the sweater, attach the label, and drop it off at any UPS location. You'll receive a refund within 5-7 business days after we receive it."},
            {"role": "user", "content": "Perfect, thank you for the complete instructions!"},
            {"role": "assistant", "content": "You're welcome! Is there anything else I can help you with regarding your return or any other questions?"},
            {"role": "user", "content": "No, that covers everything. Thanks!"}
        ]
    ]
    
    incomplete_sessions = [
        [
            {"role": "user", "content": "I want to cancel my subscription."},
            {"role": "assistant", "content": "I can help with that. What's your account email?"},
            {"role": "user", "content": "jane.doe@email.com"},
            {"role": "assistant", "content": "I see your account. Can you tell me why you want to cancel?"},
            {"role": "user", "content": "I'm not using the service anymore."},
            {"role": "assistant", "content": "I understand. Let me see what options we have."},
            {"role": "user", "content": "Hello? Are you still there?"},
            {"role": "assistant", "content": "Yes, sorry for the delay. I'm looking into this."}
        ]
    ]
    
    # Test session completeness with user intentions
    user_intentions = [
        "Complete product return process with clear instructions",
        "Cancel subscription efficiently"
    ]
    
    completeness_metric = SessionCompletenessQuality()
    
    print("Testing complete sessions:")
    try:
        complete_result = completeness_metric.evaluate(complete_sessions, user_intentions[:1])
        print(f"📊 Complete Session Score: {complete_result.value:.2f}/1.0")
        if complete_result.details:
            print(f"✅ Completeness Rate: {complete_result.details['completeness_rate']:.1%}")
    except Exception as e:
        print(f"❌ Complete session evaluation failed: {e}")
    
    print("\nTesting incomplete sessions:")
    try:
        incomplete_result = completeness_metric.evaluate(incomplete_sessions, user_intentions[1:])
        print(f"📊 Incomplete Session Score: {incomplete_result.value:.2f}/1.0")
        if incomplete_result.details:
            print(f"❌ Completeness Rate: {incomplete_result.details['completeness_rate']:.1%}")
    except Exception as e:
        print(f"❌ Incomplete session evaluation failed: {e}")
    
    # Example 3: User Frustration Detection
    print("\n" + "=" * 58)
    print("😤 Example 3: User Frustration Detection")
    print("-" * 58)
    
    frustrating_conversations = [
        [
            {"role": "user", "content": "I've been trying to get help for over an hour. This is ridiculous."},
            {"role": "assistant", "content": "I apologize for the wait. How can I help you today?"},
            {"role": "user", "content": "I already explained this to three other agents! My order is missing items."},
            {"role": "assistant", "content": "I understand your frustration. Can you provide your order number?"},
            {"role": "user", "content": "I've given this information multiple times already! Order #67890."},
            {"role": "assistant", "content": "Let me look that up for you."},
            {"role": "user", "content": "How long is this going to take? I'm getting really annoyed."},
            {"role": "assistant", "content": "I'm working on it as quickly as possible."}
        ],
        [
            {"role": "user", "content": "Why doesn't anything work on your website?"},
            {"role": "assistant", "content": "I'm sorry you're having trouble. What specific issue are you experiencing?"},
            {"role": "user", "content": "I can't log in, I can't reset my password, nothing works!"},
            {"role": "assistant", "content": "That must be very frustrating. Let me help you with the login issue first."},
            {"role": "user", "content": "I've tried everything already. This is a waste of time."},
            {"role": "assistant", "content": "I want to make sure we resolve this for you. Let's try a different approach."},
            {"role": "user", "content": "Fine, but this better work or I'm canceling my account."}
        ]
    ]
    
    smooth_conversations = [
        [
            {"role": "user", "content": "Hi, I have a quick question about my bill."},
            {"role": "assistant", "content": "Hello! I'd be happy to help with your billing question. What would you like to know?"},
            {"role": "user", "content": "I see a charge I don't recognize. Can you explain it?"},
            {"role": "assistant", "content": "Absolutely. Can you tell me the amount and date of the charge you're asking about?"},
            {"role": "user", "content": "It's $15.99 from last Tuesday."},
            {"role": "assistant", "content": "That charge is for your premium subscription upgrade that was activated last Tuesday. Would you like me to send you the detailed invoice?"},
            {"role": "user", "content": "Oh yes, I remember now. Thank you for clarifying!"},
            {"role": "assistant", "content": "You're very welcome! Is there anything else I can help you with today?"}
        ]
    ]
    
    frustration_metric = UserFrustrationMetric()
    
    print("Testing frustrating conversations:")
    try:
        frustration_result = frustration_metric.evaluate(frustrating_conversations)
        print(f"📊 Frustration Score: {frustration_result.value:.2f}/1.0")
        if frustration_result.details:
            dist = frustration_result.details['frustration_distribution']
            print(f"📈 Frustration Analysis:")
            print(f"   High Frustration (≥0.7): {dist['high_frustration']} conversations")
            print(f"   Medium Frustration (0.3-0.7): {dist['medium_frustration']} conversations")
            print(f"   Low Frustration (<0.3): {dist['low_frustration']} conversations")
            print(f"🚨 High Frustration Rate: {frustration_result.details['high_frustration_rate']:.1%}")
            
            # Show common frustration indicators
            if frustration_result.details['common_frustration_indicators']:
                print(f"\n🔍 Common Frustration Indicators:")
                for indicator, count in frustration_result.details['common_frustration_indicators'].items():
                    print(f"   {indicator}: {count} occurrences")
    except Exception as e:
        print(f"❌ Frustration evaluation failed: {e}")
    
    print("\nTesting smooth conversations:")
    try:
        smooth_result = frustration_metric.evaluate(smooth_conversations)
        print(f"📊 Frustration Score: {smooth_result.value:.2f}/1.0")
        if smooth_result.details:
            print(f"😊 High Frustration Rate: {smooth_result.details['high_frustration_rate']:.1%}")
    except Exception as e:
        print(f"❌ Smooth conversation evaluation failed: {e}")
    
    # Example 4: Quick Single Conversation Evaluations
    print("\n" + "=" * 58)
    print("⚡ Example 4: Quick Single Conversation Evaluations")
    print("-" * 58)
    
    sample_conversation = [
        {"role": "user", "content": "Can you help me track my package?"},
        {"role": "assistant", "content": "Of course! I'd be happy to help you track your package. Could you please provide your tracking number?"},
        {"role": "user", "content": "It's 1Z999AA1234567890"},
        {"role": "assistant", "content": "Thank you! Let me look that up for you. Your package is currently out for delivery and should arrive today by 6 PM."},
        {"role": "user", "content": "Great! Will I need to be home to sign for it?"},
        {"role": "assistant", "content": "For this shipment, a signature is required. If you won't be home, you can redirect it to a UPS Store or have it held for pickup."},
        {"role": "user", "content": "Perfect, thank you for the information!"},
        {"role": "assistant", "content": "You're welcome! Is there anything else I can help you with regarding your shipment?"}
    ]
    
    print("Testing single conversation evaluations...")
    
    # Test conversational coherence
    try:
        coherence_single = evaluate_conversational_coherence_sync(sample_conversation)
        print(f"🎯 Coherence Score: {coherence_single['data']['score']:.2f}/1.0")
        print(f"💭 Reasoning: {coherence_single['data']['reasoning'][:100]}...")
    except Exception as e:
        print(f"❌ Single coherence evaluation failed: {e}")
    
    # Test session completeness quality
    try:
        completeness_single = evaluate_session_completeness_quality_sync(
            sample_conversation, 
            user_intention="Track package status and delivery requirements"
        )
        print(f"📋 Completeness Score: {completeness_single['data']['score']:.2f}/1.0")
        print(f"💭 Reasoning: {completeness_single['data']['reasoning'][:100]}...")
    except Exception as e:
        print(f"❌ Single completeness evaluation failed: {e}")
    
    # Test user frustration
    try:
        frustration_single = evaluate_user_frustration_sync(sample_conversation)
        print(f"😤 Frustration Score: {frustration_single['data']['score']:.2f}/1.0")
        print(f"💭 Reasoning: {frustration_single['data']['reasoning'][:100]}...")
    except Exception as e:
        print(f"❌ Single frustration evaluation failed: {e}")
    
    # Example 5: E-commerce Conversation Analysis
    print("\n" + "=" * 58)
    print("🛒 Example 5: E-commerce Conversation Analysis")
    print("-" * 58)
    
    ecommerce_conversations = [
        [
            {"role": "user", "content": "I want to buy the wireless headphones but I have questions about battery life."},
            {"role": "assistant", "content": "Great choice! Our wireless headphones offer up to 30 hours of battery life with the charging case. Would you like to know about any other features?"},
            {"role": "user", "content": "How long does it take to charge them?"},
            {"role": "assistant", "content": "The headphones charge to 80% in about 15 minutes and fully charge in 1 hour. The case takes about 2 hours to fully charge."},
            {"role": "user", "content": "Perfect! What colors are available?"},
            {"role": "assistant", "content": "We have them in black, white, and navy blue. All colors are currently in stock and ready to ship."},
            {"role": "user", "content": "I'll take the black ones. How do I proceed with the order?"},
            {"role": "assistant", "content": "Excellent choice! I can help you place the order right now. Would you like to create an account or check out as a guest?"},
            {"role": "user", "content": "I'll create an account."},
            {"role": "assistant", "content": "Perfect! I'll guide you through the account creation and checkout process. First, let's set up your account with your email address..."}
        ]
    ]
    
    ecommerce_intentions = ["Purchase wireless headphones with complete product information"]
    
    print("Analyzing e-commerce conversation quality...")
    
    try:
        # Comprehensive analysis of the e-commerce conversation
        ecommerce_coherence = coherence_metric.evaluate(ecommerce_conversations)
        ecommerce_completeness = completeness_metric.evaluate(ecommerce_conversations, ecommerce_intentions)
        ecommerce_frustration = frustration_metric.evaluate(ecommerce_conversations)
        
        print(f"\n📊 E-commerce Conversation Analysis:")
        print(f"   Coherence: {ecommerce_coherence.value:.2f}/1.0")
        print(f"   Completeness: {ecommerce_completeness.value:.2f}/1.0") 
        print(f"   Frustration: {ecommerce_frustration.value:.2f}/1.0")
        
        # Overall conversation quality score
        overall_quality = (ecommerce_coherence.value + ecommerce_completeness.value + (1 - ecommerce_frustration.value)) / 3
        print(f"   Overall Quality: {overall_quality:.2f}/1.0")
        
        if overall_quality >= 0.8:
            print("✅ Excellent conversation quality!")
        elif overall_quality >= 0.6:
            print("👍 Good conversation quality")
        else:
            print("⚠️ Conversation quality needs improvement")
        
    except Exception as e:
        print(f"❌ E-commerce analysis failed: {e}")
    
    print("\n" + "=" * 58)
    print("✅ Conversation Thread Metrics Integration Example Complete!")
    print("\n📚 Key Features Demonstrated:")
    print("   • Conversational coherence assessment (0.0-1.0 scale)")
    print("   • Session completeness quality evaluation")
    print("   • User frustration detection and analysis")
    print("   • Batch evaluation for multiple conversation threads")
    print("   • Individual conversation analysis")
    print("   • Conversation quality scoring and recommendations")
    print("\n🎯 Evaluation Criteria:")
    print("   • Coherence: Consistency, logical flow, context maintenance")
    print("   • Completeness: Intention recognition, information completeness, resolution")
    print("   • Frustration: Confusion indicators, repetition patterns, emotional signals")
    print("\n💡 Use Cases:")
    print("   • Customer service quality assessment")
    print("   • Chatbot conversation evaluation")
    print("   • Support agent performance measurement")
    print("   • User experience optimization")
    print("   • Conversation flow improvement")
    print("   • Training data quality assessment")
    print("\n🔗 Integration Points:")
    print("   • Backend API: /api/v1/llm/evaluate")
    print("   • SDK Classes: ConversationalCoherenceMetric, SessionCompletenessQuality, UserFrustrationMetric")
    print("   • Utility Functions: evaluate_conversational_coherence, evaluate_session_completeness_quality, evaluate_user_frustration")
    print("   • UI Components: Conversation metrics dashboard integration")

if __name__ == "__main__":
    main()