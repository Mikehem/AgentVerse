#!/usr/bin/env python3
"""
Test runner for the Simple Agent.

This script runs the agent multiple times to generate traces and test
the Sprint Agent Lens integration thoroughly.
"""

import asyncio
import time
import sys
from pathlib import Path
from simple_agent import SimpleAgent
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def run_multiple_sessions(agent: SimpleAgent, num_sessions: int = 3, interactions_per_session: int = 2):
    """
    Run multiple agent sessions for comprehensive testing.
    
    Args:
        agent: The SimpleAgent instance
        num_sessions: Number of sessions to run
        interactions_per_session: Number of interactions per session
    """
    logger.info(f"Running {num_sessions} sessions with {interactions_per_session} interactions each...")
    
    session_results = []
    
    for session_num in range(1, num_sessions + 1):
        logger.info(f"Starting session {session_num}/{num_sessions}")
        
        try:
            # Run a conversation session
            result = await agent.run_conversation_session(num_interactions=interactions_per_session)
            session_results.append(result)
            
            logger.info(f"Session {session_num} completed - Success rate: {result['success_rate']:.2f}")
            
            # Wait between sessions
            if session_num < num_sessions:
                await asyncio.sleep(2)
                
        except Exception as e:
            logger.error(f"Session {session_num} failed: {e}")
    
    # Summary
    successful_sessions = len([r for r in session_results if r.get('success_rate', 0) > 0])
    total_interactions = sum(len(r.get('interactions', [])) for r in session_results)
    total_tokens = sum(r.get('total_tokens', 0) for r in session_results)
    
    logger.info(f"Test run completed:")
    logger.info(f"  Successful sessions: {successful_sessions}/{num_sessions}")
    logger.info(f"  Total interactions: {total_interactions}")
    logger.info(f"  Total tokens used: {total_tokens}")
    
    return session_results


async def test_individual_features(agent: SimpleAgent):
    """Test individual agent features."""
    logger.info("Testing individual agent features...")
    
    # Test single chat completion
    logger.info("Testing single chat completion...")
    result = await agent.chat_completion("Hello, how are you?")
    logger.info(f"Single chat result: {'✅ Success' if result['success'] else '❌ Failed'}")
    
    # Test with conversation history
    logger.info("Testing with conversation history...")
    history = [
        {"role": "user", "content": "My name is John"},
        {"role": "assistant", "content": "Nice to meet you, John!"}
    ]
    result = await agent.chat_completion("What's my name?", conversation_history=history)
    logger.info(f"History chat result: {'✅ Success' if result['success'] else '❌ Failed'}")
    
    # Test evaluation
    logger.info("Testing evaluation framework...")
    eval_result = await agent.run_evaluation()
    eval_success = "error" not in eval_result
    logger.info(f"Evaluation result: {'✅ Success' if eval_success else '❌ Failed'}")
    
    return {
        "single_chat": result.get('success', False),
        "history_chat": result.get('success', False),
        "evaluation": eval_success
    }


async def main():
    """Main test function."""
    print("🧪 Simple Agent Test Runner")
    print("=" * 50)
    
    try:
        # Initialize agent
        print("Initializing agent...")
        agent = SimpleAgent()
        print("✅ Agent initialized!")
        
        # Test individual features
        print("\n🔧 Testing individual features...")
        feature_results = await test_individual_features(agent)
        
        # Run multiple sessions
        print("\n🔄 Running multiple sessions...")
        session_results = await run_multiple_sessions(
            agent, 
            num_sessions=3, 
            interactions_per_session=2
        )
        
        # Final summary
        print("\n📊 Test Summary")
        print("-" * 30)
        print(f"Agent ID: {agent.agent_id}")
        print(f"Sprint Lens: {'✅ Connected' if agent.sprintlens_client else '❌ Not connected'}")
        print(f"Sessions completed: {len(session_results)}")
        print(f"Feature tests: {sum(feature_results.values())}/{len(feature_results)} passed")
        
        print(f"\n🎉 Testing completed! Check the Sprint Agent Lens dashboard at:")
        print(f"   {agent.sprintlens_client.url if agent.sprintlens_client else 'N/A'}")
        
        return 0
        
    except Exception as e:
        logger.error(f"Test run failed: {e}", exc_info=True)
        print(f"❌ Test run failed: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)