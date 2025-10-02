#!/usr/bin/env python3
"""
Comprehensive RAG (Retrieval-Augmented Generation) Tracing Test

This test demonstrates Master-style tracing for complex LLM applications involving:
- Document retrieval and ranking
- Pre-processing and context preparation
- LLM generation with multiple attempts
- Post-processing and response validation
- Error handling and retries

The test showcases the full pipeline of a production RAG system with proper 
tracing at each step to identify bottlenecks and issues.
"""

import asyncio
import time
import json
import random
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sprint_trace import SprintTraceClient, TraceContext, TraceType, track

@dataclass
class Document:
    """Represents a document in our knowledge base."""
    id: str
    title: str
    content: str
    metadata: Dict[str, Any]
    embedding_vector: List[float] = None

@dataclass
class RetrievalResult:
    """Result from document retrieval."""
    documents: List[Document]
    scores: List[float]
    query_embedding: List[float]
    total_searched: int

class MockVectorDatabase:
    """Mock vector database for document retrieval."""
    
    def __init__(self):
        self.documents = self._create_sample_documents()
    
    def _create_sample_documents(self) -> List[Document]:
        """Create sample documents for testing."""
        sample_docs = [
            Document(
                id="doc_1",
                title="Customer Support Best Practices",
                content="Customer support agents should always acknowledge the customer's concern first. Use empathetic language and provide clear step-by-step solutions.",
                metadata={"category": "support", "last_updated": "2024-01-15", "priority": "high"}
            ),
            Document(
                id="doc_2", 
                title="Product Return Policy",
                content="Returns are accepted within 30 days of purchase. Items must be in original packaging and condition. Refunds are processed within 5-7 business days.",
                metadata={"category": "policy", "last_updated": "2024-02-01", "priority": "medium"}
            ),
            Document(
                id="doc_3",
                title="Technical Troubleshooting Guide",
                content="Common issues include network connectivity, authentication failures, and data synchronization problems. Check system logs first.",
                metadata={"category": "technical", "last_updated": "2024-01-20", "priority": "high"}
            ),
            Document(
                id="doc_4",
                title="Account Management Procedures",
                content="Account creation requires email verification. Password reset can be done via security questions or SMS. Account suspension requires manager approval.",
                metadata={"category": "account", "last_updated": "2024-01-10", "priority": "medium"}
            )
        ]
        
        # Add mock embeddings
        for doc in sample_docs:
            doc.embedding_vector = [random.uniform(-1, 1) for _ in range(384)]
        
        return sample_docs
    
    @track(name="vector_search")
    async def search(self, query: str, top_k: int = 3) -> RetrievalResult:
        """Simulate vector search with realistic latency."""
        await asyncio.sleep(random.uniform(0.1, 0.3))  # Simulate search latency
        
        # Mock query embedding
        query_embedding = [random.uniform(-1, 1) for _ in range(384)]
        
        # Calculate mock similarity scores
        scored_docs = []
        for doc in self.documents:
            # Simulate semantic similarity based on keyword matching
            score = 0.0
            query_words = query.lower().split()
            content_words = doc.content.lower().split()
            title_words = doc.title.lower().split()
            
            for word in query_words:
                if word in content_words:
                    score += 0.3
                if word in title_words:
                    score += 0.5
                if word in str(doc.metadata.get('category', '')):
                    score += 0.2
            
            # Add some randomness to simulate vector similarity
            score += random.uniform(0.0, 0.4)
            scored_docs.append((doc, score))
        
        # Sort by score and return top_k
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        top_docs = scored_docs[:top_k]
        
        documents = [doc for doc, score in top_docs]
        scores = [score for doc, score in top_docs]
        
        # Add trace metadata
        TraceContext.get_current_trace().add_metadata({
            "query": query,
            "top_k": top_k,
            "total_documents": len(self.documents),
            "retrieved_count": len(documents),
            "max_score": max(scores) if scores else 0,
            "min_score": min(scores) if scores else 0
        })
        
        return RetrievalResult(
            documents=documents,
            scores=scores,
            query_embedding=query_embedding,
            total_searched=len(self.documents)
        )

class ContextProcessor:
    """Handles pre-processing of retrieved documents."""
    
    @track(name="context_preprocessing")
    def prepare_context(self, retrieval_result: RetrievalResult, query: str) -> Dict[str, Any]:
        """Pre-process retrieved documents into LLM context."""
        time.sleep(random.uniform(0.05, 0.15))  # Simulate processing time
        
        # Rank documents by relevance and recency
        ranked_docs = self._rank_documents(retrieval_result.documents, retrieval_result.scores)
        
        # Create context string
        context_parts = []
        for i, (doc, score) in enumerate(ranked_docs):
            context_parts.append(f"Document {i+1} (Score: {score:.3f}):")
            context_parts.append(f"Title: {doc.title}")
            context_parts.append(f"Content: {doc.content}")
            context_parts.append(f"Category: {doc.metadata.get('category', 'unknown')}")
            context_parts.append("---")
        
        context_string = "\n".join(context_parts)
        
        # Calculate context statistics
        total_chars = len(context_string)
        total_tokens = len(context_string.split())  # Rough token estimate
        
        processed_context = {
            "context_string": context_string,
            "document_count": len(ranked_docs),
            "total_characters": total_chars,
            "estimated_tokens": total_tokens,
            "query": query,
            "document_ids": [doc.id for doc, _ in ranked_docs],
            "relevance_scores": [score for _, score in ranked_docs]
        }
        
        # Add trace metadata
        TraceContext.get_current_trace().add_metadata({
            "context_length": total_chars,
            "estimated_tokens": total_tokens,
            "document_count": len(ranked_docs),
            "processing_method": "ranked_concatenation"
        })
        
        return processed_context
    
    @track(name="document_ranking")
    def _rank_documents(self, documents: List[Document], scores: List[float]) -> List[tuple]:
        """Rank documents considering both relevance and recency."""
        scored_docs = []
        
        for doc, score in zip(documents, scores):
            # Boost score based on priority and recency
            priority_boost = 0.1 if doc.metadata.get('priority') == 'high' else 0.0
            
            # Parse last_updated date (simplified)
            last_updated = doc.metadata.get('last_updated', '2024-01-01')
            recency_boost = 0.05 if '2024-02' in last_updated else 0.0
            
            final_score = score + priority_boost + recency_boost
            scored_docs.append((doc, final_score))
        
        return sorted(scored_docs, key=lambda x: x[1], reverse=True)

class LLMGenerator:
    """Simulates LLM generation with multiple providers and fallback."""
    
    def __init__(self):
        self.providers = ["openai-gpt4", "anthropic-claude", "google-gemini"]
        self.current_provider = 0
    
    @track(name="llm_generation")
    async def generate(self, context: Dict[str, Any], query: str, max_retries: int = 2) -> Dict[str, Any]:
        """Generate response using LLM with fallback providers."""
        
        for attempt in range(max_retries + 1):
            provider = self.providers[self.current_provider % len(self.providers)]
            
            try:
                result = await self._call_llm(provider, context, query)
                
                # Add successful generation metadata
                TraceContext.get_current_trace().add_metadata({
                    "provider": provider,
                    "attempt": attempt + 1,
                    "success": True,
                    "context_tokens": context["estimated_tokens"],
                    "response_length": len(result["response"])
                })
                
                return result
                
            except Exception as e:
                # Add failure metadata
                TraceContext.get_current_trace().add_metadata({
                    "provider": provider,
                    "attempt": attempt + 1,
                    "success": False,
                    "error": str(e)
                })
                
                if attempt < max_retries:
                    self.current_provider += 1  # Try next provider
                    await asyncio.sleep(0.1)  # Brief delay before retry
                else:
                    raise
    
    @track(name="llm_api_call")
    async def _call_llm(self, provider: str, context: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Simulate LLM API call."""
        
        # Simulate different provider characteristics
        if provider == "openai-gpt4":
            latency = random.uniform(1.5, 3.0)  # OpenAI tends to be slower but high quality
            failure_rate = 0.05
        elif provider == "anthropic-claude":  
            latency = random.uniform(1.0, 2.5)  # Claude is fairly fast and reliable
            failure_rate = 0.03
        elif provider == "google-gemini":
            latency = random.uniform(0.8, 2.0)  # Gemini is fast but occasionally fails
            failure_rate = 0.08
        
        await asyncio.sleep(latency)
        
        # Simulate random failures
        if random.random() < failure_rate:
            raise Exception(f"{provider} API temporarily unavailable")
        
        # Generate mock response based on context
        response = self._generate_mock_response(context, query, provider)
        
        # Calculate token usage
        prompt_tokens = context["estimated_tokens"] + len(query.split())
        completion_tokens = len(response.split())
        total_tokens = prompt_tokens + completion_tokens
        
        TraceContext.get_current_trace().add_metadata({
            "provider": provider,
            "latency_ms": latency * 1000,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens
        })
        
        return {
            "response": response,
            "provider": provider,
            "usage": {
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens
            },
            "latency_ms": latency * 1000
        }
    
    def _generate_mock_response(self, context: Dict[str, Any], query: str, provider: str) -> str:
        """Generate a mock response based on the context and query."""
        
        # Simple keyword-based response generation for demo
        if "return" in query.lower() or "refund" in query.lower():
            return "Based on our return policy, returns are accepted within 30 days of purchase. Items must be in original packaging and condition. Refunds are processed within 5-7 business days. Would you like me to help you initiate a return?"
        
        elif "technical" in query.lower() or "troubleshoot" in query.lower():
            return "I can help you troubleshoot the technical issue. Common problems include network connectivity, authentication failures, and data synchronization issues. Let's start by checking your system logs. Can you tell me what specific error message you're seeing?"
        
        elif "account" in query.lower():
            return "For account-related questions, I can assist you with account creation, password resets, or account management. Account creation requires email verification, and password resets can be done via security questions or SMS. What specific account issue are you experiencing?"
        
        else:
            return f"Thank you for your question. Based on the information available, I recommend reviewing our documentation for detailed guidance. Our support team is here to help if you need further assistance. Is there a specific aspect you'd like me to elaborate on?"

class ResponseValidator:
    """Post-processes and validates LLM responses."""
    
    @track(name="response_validation")
    def validate_response(self, response: Dict[str, Any], context: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Validate and enhance the LLM response."""
        time.sleep(random.uniform(0.02, 0.08))  # Validation processing time
        
        response_text = response["response"]
        
        # Perform various validation checks
        validation_results = {
            "length_check": self._check_response_length(response_text),
            "relevance_check": self._check_relevance(response_text, query),
            "safety_check": self._check_safety(response_text),
            "citation_check": self._check_citations(response_text, context),
            "completeness_check": self._check_completeness(response_text, query)
        }
        
        # Calculate overall confidence score
        confidence_score = sum(validation_results.values()) / len(validation_results)
        
        # Add validation metadata
        TraceContext.get_current_trace().add_metadata({
            "validation_results": validation_results,
            "confidence_score": confidence_score,
            "response_length": len(response_text),
            "word_count": len(response_text.split())
        })
        
        # Enhance response with metadata
        enhanced_response = {
            **response,
            "validation": validation_results,
            "confidence_score": confidence_score,
            "enhanced": True
        }
        
        return enhanced_response
    
    @track(name="length_validation")
    def _check_response_length(self, response: str) -> float:
        """Check if response length is appropriate."""
        word_count = len(response.split())
        if 20 <= word_count <= 200:
            return 1.0  # Optimal length
        elif word_count < 20:
            return 0.6  # Too short
        else:
            return 0.8  # Acceptable but long
    
    @track(name="relevance_validation")
    def _check_relevance(self, response: str, query: str) -> float:
        """Check if response is relevant to the query."""
        query_words = set(query.lower().split())
        response_words = set(response.lower().split())
        
        # Simple keyword overlap metric
        overlap = len(query_words.intersection(response_words))
        relevance_score = min(1.0, overlap / len(query_words) if query_words else 0)
        
        return max(0.3, relevance_score)  # Minimum baseline relevance
    
    def _check_safety(self, response: str) -> float:
        """Check response for safety issues."""
        # Simple safety check (in production, use proper safety models)
        unsafe_patterns = ["private information", "confidential", "hack", "exploit"]
        
        for pattern in unsafe_patterns:
            if pattern in response.lower():
                return 0.2
        
        return 1.0
    
    def _check_citations(self, response: str, context: Dict[str, Any]) -> float:
        """Check if response properly references source documents."""
        # Check if response mentions document information
        doc_ids = context.get("document_ids", [])
        
        # Simple heuristic: look for document-related terms
        citation_terms = ["based on", "according to", "documentation", "policy"]
        has_citations = any(term in response.lower() for term in citation_terms)
        
        return 0.9 if has_citations else 0.6
    
    def _check_completeness(self, response: str, query: str) -> float:
        """Check if response adequately addresses the query."""
        # Simple completeness check
        if "?" in response:  # Asks follow-up questions
            return 0.9
        elif len(response.split()) > 30:  # Substantial response
            return 0.8
        else:
            return 0.7

class ComprehensiveRAGSystem:
    """Complete RAG system with full tracing."""
    
    def __init__(self):
        self.vector_db = MockVectorDatabase()
        self.context_processor = ContextProcessor()
        self.llm_generator = LLMGenerator()
        self.response_validator = ResponseValidator()
    
    @track(name="rag_pipeline", trace_type=TraceType.CONVERSATION)
    async def process_query(self, query: str, project_id: str = "proj_production_demo_001") -> Dict[str, Any]:
        """Process a complete RAG query with full pipeline tracing."""
        
        # Set project context
        TraceContext.get_current_trace().add_metadata({
            "project_id": project_id,
            "pipeline_type": "rag",
            "query": query
        })
        
        start_time = time.time()
        
        try:
            # Step 1: Retrieval
            print(f"🔍 Retrieving documents for: {query}")
            retrieval_result = await self.vector_db.search(query, top_k=3)
            
            # Step 2: Context preprocessing  
            print(f"⚙️ Processing context...")
            context = self.context_processor.prepare_context(retrieval_result, query)
            
            # Step 3: LLM Generation
            print(f"🤖 Generating response...")
            llm_response = await self.llm_generator.generate(context, query)
            
            # Step 4: Response validation and post-processing
            print(f"✅ Validating response...")
            final_response = self.response_validator.validate_response(llm_response, context, query)
            
            # Calculate end-to-end metrics
            total_time = time.time() - start_time
            
            # Final pipeline metadata
            TraceContext.get_current_trace().add_metadata({
                "total_pipeline_time_ms": total_time * 1000,
                "retrieved_documents": len(retrieval_result.documents),
                "context_tokens": context["estimated_tokens"],
                "final_confidence": final_response["confidence_score"],
                "provider_used": final_response["provider"]
            })
            
            print(f"✨ Pipeline completed in {total_time:.2f}s")
            
            return {
                "query": query,
                "response": final_response["response"],
                "confidence": final_response["confidence_score"],
                "metadata": {
                    "retrieval": {
                        "document_count": len(retrieval_result.documents),
                        "scores": retrieval_result.scores
                    },
                    "generation": {
                        "provider": final_response["provider"],
                        "tokens": final_response["usage"]
                    },
                    "validation": final_response["validation"],
                    "timing": {
                        "total_ms": total_time * 1000
                    }
                }
            }
            
        except Exception as e:
            # Mark trace as error
            TraceContext.get_current_trace().set_status("error")
            TraceContext.get_current_trace().add_metadata({
                "error_type": type(e).__name__,
                "error_message": str(e),
                "pipeline_stage": "unknown"
            })
            raise

async def run_comprehensive_rag_tests():
    """Run comprehensive RAG tracing tests."""
    
    print("🚀 Starting Comprehensive RAG Tracing Tests")
    print("=" * 60)
    
    # Initialize tracer
    tracer = SprintTraceClient(
        base_url="http://localhost:3001"
    )
    
    # Initialize RAG system
    rag_system = ComprehensiveRAGSystem()
    
    # Test scenarios representing different types of customer queries
    test_queries = [
        "How can I return a product I bought last week?",
        "My account login is not working, can you help?", 
        "I'm having technical issues with data sync",
        "What's your customer support policy?",
        "Can you explain the account creation process?",
        "I need help with troubleshooting network problems"
    ]
    
    results = []
    
    for i, query in enumerate(test_queries):
        print(f"\n📋 Test Case {i+1}: {query}")
        print("-" * 50)
        
        try:
            # Process query through full RAG pipeline
            result = await rag_system.process_query(
                query=query,
                project_id="proj_production_demo_001"
            )
            
            results.append(result)
            
            print(f"💬 Response: {result['response'][:100]}...")
            print(f"🎯 Confidence: {result['confidence']:.2f}")
            print(f"⏱️ Time: {result['metadata']['timing']['total_ms']:.1f}ms")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            results.append({"error": str(e), "query": query})
        
        # Brief delay between tests
        await asyncio.sleep(1.0)
    
    # Flush any pending traces
    await tracer.flush()
    
    print(f"\n✅ Completed {len(results)} RAG pipeline tests")
    print("🔍 Check the project traces view to see detailed tracing data!")
    
    return results

if __name__ == "__main__":
    # Run the comprehensive tests
    asyncio.run(run_comprehensive_rag_tests())