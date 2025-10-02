import time
import asyncio
import logging
from typing import Dict, Any, List
import sprintlens

# Enable info level logging to see key events without debug noise
logging.basicConfig(level=logging.INFO)

# Configure Sprint Lens before using any decorators
sprintlens.configure(
    url="http://localhost:3001",
    username="admin",
    password="MasterAdmin2024!",
    workspace_id="default",
    project_name="project-1758599350381"
)

print("🔧 Sprint Lens SDK configured successfully")

# Initialize the client to ensure it's ready for decorators
client = sprintlens.get_client()
print(f"✅ Client instance: {client}")
print(f"✅ Backend URL: http://localhost:3001")
print(f"✅ Project: project-1758599350381")
print()

# Simple function tracing with agent tagging and auto_flush
@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k"}, auto_flush=True)
def process_customer_query(query: str) -> str:
    """Process a customer query and return a response."""
    # Simulate processing time
    time.sleep(0.1)
    
    # Simple response logic
    if "account" in query.lower():
        return "I can help you with your account. Please provide your account number."
    elif "billing" in query.lower():
        return "For billing questions, I'll transfer you to our billing department."
    else:
        return "Thank you for your query. Let me find the best way to help you."

# Async function tracing with agent tagging and auto_flush
@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k"}, auto_flush=True)
async def async_sentiment_analysis(text: str) -> Dict[str, Any]:
    """Analyze sentiment of customer text asynchronously."""
    # Simulate async API call
    await asyncio.sleep(0.2)
    
    # Simple sentiment analysis
    positive_words = ["good", "great", "excellent", "happy", "satisfied"]
    negative_words = ["bad", "terrible", "awful", "angry", "frustrated"]
    
    text_lower = text.lower()
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    if positive_count > negative_count:
        sentiment = "positive"
    elif negative_count > positive_count:
        sentiment = "negative"
    else:
        sentiment = "neutral"
    
    return {
        "sentiment": sentiment,
        "confidence": abs(positive_count - negative_count) / max(len(text.split()), 1),
        "positive_signals": positive_count,
        "negative_signals": negative_count
    }

# Function with complex input/output and agent tagging and auto_flush
@sprintlens.track(tags={"agent_id": "agent_simpleag_mfw0ut5k"}, auto_flush=True)
def analyze_customer_profile(customer_data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze customer profile for personalized support."""
    
    # Extract key information
    tier = customer_data.get("tier", "standard")
    history = customer_data.get("support_history", [])
    preferences = customer_data.get("preferences", {})
    
    # Simulate analysis
    time.sleep(0.05)
    
    # Calculate support priority
    priority_score = 0
    if tier == "premium":
        priority_score += 10
    elif tier == "gold":
        priority_score += 5
    
    # Consider history
    recent_issues = len([issue for issue in history if issue.get("recent", False)])
    priority_score += recent_issues * 2
    
    # Determine priority level
    if priority_score >= 15:
        priority = "high"
    elif priority_score >= 8:
        priority = "medium"
    else:
        priority = "low"
    
    return {
        "priority": priority,
        "priority_score": priority_score,
        "tier": tier,
        "recent_issues": recent_issues,
        "recommended_agent": "senior" if priority == "high" else "standard"
    }

if __name__ == "__main__":
    print("🚀 Testing Pattern 1: Automatic Function Tracing")
    print("=" * 50)
    
    # Test 1: Simple function tracing
    print("📍 Testing synchronous function with agent tagging...")
    result1 = process_customer_query("I have a billing question")
    print(f"✅ Query Result: {result1}")
    print(f"🏷️  Trace tagged with: agent_simpleag_mfw0ut5k")
    print()
    
    # Test 2: Async function tracing
    print("📍 Testing asynchronous function with agent tagging...")
    import asyncio
    result2 = asyncio.run(async_sentiment_analysis("This service is great!"))
    print(f"✅ Sentiment: {result2}")
    print(f"🏷️  Trace tagged with: agent_simpleag_mfw0ut5k")
    print()
    
    # Test 3: Complex function with detailed input/output
    print("📍 Testing complex function with customer profile...")
    customer_data = {
        "tier": "premium",
        "support_history": [{"recent": True}, {"recent": True}],
        "preferences": {"channel": "email"}
    }
    result3 = analyze_customer_profile(customer_data)
    print(f"✅ Profile Analysis: {result3}")
    print(f"🏷️  Trace tagged with: agent_simpleag_mfw0ut5k")
    print()
    
    print("🎉 Pattern 1 Complete! Check your Sprint Lens dashboard to see the traces.")
    print("🌐 UI Links:")
    print("   📊 All traces: http://localhost:3001/traces")
    print("   📁 Project traces: http://localhost:3001/projects/project-1758599350381")
    print(f"   🔍 Agent traces: Filter by agent_id = agent_simpleag_mfw0ut5k")