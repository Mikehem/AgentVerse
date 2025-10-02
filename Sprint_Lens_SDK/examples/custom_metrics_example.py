#!/usr/bin/env python3
"""
Custom Metrics Example for AgentLens SDK

This example demonstrates how to create and use custom evaluation metrics
with the AgentLens evaluation framework, including:

1. Simple custom metrics
2. LLM-as-a-judge metrics  
3. Multi-score metrics
4. Domain-specific evaluation criteria
"""

import os
import sys
import asyncio
from typing import Dict, List, Union, Optional

# Add the SDK to path for local testing
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

import sprintlens
from sprintlens.evaluation import (
    BaseMetric, CustomMetric, CometStyleCustomMetric, CometLLMJudgeMetric, ScoreResult, MetricResult,
    Evaluator, EvaluationResult
)


# Example 1: Simple Custom Metric
class SentimentPositivityMetric(CometStyleCustomMetric):
    """
    Custom metric that evaluates the positivity of a response.
    
    This demonstrates a simple rule-based custom metric that doesn't
    require external APIs or complex computations.
    """
    
    def __init__(self, name: str = "sentiment_positivity"):
        super().__init__(name)
        
        # Define positive and negative word lists
        self.positive_words = {
            "excellent", "great", "amazing", "wonderful", "fantastic", 
            "good", "positive", "helpful", "useful", "beneficial",
            "successful", "effective", "valuable", "outstanding"
        }
        
        self.negative_words = {
            "terrible", "awful", "bad", "negative", "harmful", "useless",
            "failed", "ineffective", "disappointing", "poor", "worst"
        }
    
    def score(self, input: str = "", output: str = "", **kwargs) -> ScoreResult:
        """Calculate sentiment positivity score."""
        words = output.lower().split()
        
        positive_count = sum(1 for word in words if word in self.positive_words)
        negative_count = sum(1 for word in words if word in self.negative_words)
        total_sentiment_words = positive_count + negative_count
        
        if total_sentiment_words == 0:
            # Neutral if no sentiment words found
            positivity_score = 0.5
            reason = "No clear sentiment indicators found"
        else:
            positivity_score = positive_count / total_sentiment_words
            reason = f"Found {positive_count} positive and {negative_count} negative sentiment words"
        
        return ScoreResult(
            value=positivity_score,
            name=self.name,
            reason=reason
        )


# Example 2: Domain-Specific Custom Metric
class CodeQualityMetric(CometStyleCustomMetric):
    """
    Custom metric for evaluating code quality in AI-generated responses.
    
    This demonstrates a domain-specific metric that evaluates code
    based on best practices and common patterns.
    """
    
    def __init__(self, name: str = "code_quality"):
        super().__init__(name)
        
        self.quality_indicators = {
            "comments": ["#", "//", "/*", "\"\"\""],
            "error_handling": ["try", "except", "catch", "error", "exception"],
            "functions": ["def ", "function ", "=>", "lambda"],
            "documentation": ["docstring", "/**", "@param", "@return"],
            "clean_code": ["return", "if", "else", "for", "while"]
        }
        
        self.anti_patterns = {
            "magic_numbers": r"\b\d{2,}\b",  # Numbers with 2+ digits
            "long_lines": 100,  # Line length threshold
            "deep_nesting": 4   # Maximum nesting levels
        }
    
    def score(self, input: str = "", output: str = "", **kwargs) -> ScoreResult:
        """Evaluate code quality."""
        lines = output.split('\n')
        total_score = 0.0
        quality_features = []
        
        # Check for quality indicators
        for category, indicators in self.quality_indicators.items():
            found = any(indicator in output.lower() for indicator in indicators)
            if found:
                total_score += 0.2
                quality_features.append(category)
        
        # Penalize anti-patterns
        penalties = []
        
        # Check line length
        long_lines = sum(1 for line in lines if len(line) > self.anti_patterns["long_lines"])
        if long_lines > 0:
            total_score -= 0.1
            penalties.append(f"{long_lines} long lines")
        
        # Simple nesting check (count leading spaces)
        max_nesting = 0
        for line in lines:
            if line.strip():
                leading_spaces = len(line) - len(line.lstrip())
                nesting_level = leading_spaces // 4  # Assuming 4-space indentation
                max_nesting = max(max_nesting, nesting_level)
        
        if max_nesting > self.anti_patterns["deep_nesting"]:
            total_score -= 0.1
            penalties.append(f"deep nesting ({max_nesting} levels)")
        
        # Normalize score to [0, 1]
        final_score = max(0.0, min(1.0, total_score))
        
        reason = f"Quality features: {', '.join(quality_features) if quality_features else 'none'}"
        if penalties:
            reason += f". Penalties: {', '.join(penalties)}"
        
        return ScoreResult(
            value=final_score,
            name=self.name,
            reason=reason
        )


# Example 3: Multi-Score Custom Metric
class ComprehensiveResponseMetric(CometStyleCustomMetric):
    """
    Custom metric that returns multiple scores for different aspects
    of a response (completeness, accuracy, clarity).
    """
    
    def __init__(self, name: str = "comprehensive_response"):
        super().__init__(name)
    
    def score(self, input: str = "", output: str = "", context: str = "", **kwargs) -> List[ScoreResult]:
        """Return multiple scores for different response aspects."""
        scores = []
        
        # 1. Completeness Score
        input_keywords = set(input.lower().split())
        output_keywords = set(output.lower().split())
        keyword_coverage = len(input_keywords.intersection(output_keywords)) / len(input_keywords) if input_keywords else 0
        
        scores.append(ScoreResult(
            value=keyword_coverage,
            name="completeness",
            reason=f"Covers {keyword_coverage:.1%} of input keywords"
        ))
        
        # 2. Length Appropriateness Score
        word_count = len(output.split())
        if word_count < 10:
            length_score = 0.3  # Too short
        elif word_count > 200:
            length_score = 0.7  # Too long
        else:
            length_score = 1.0  # Appropriate length
        
        scores.append(ScoreResult(
            value=length_score,
            name="length_appropriateness",
            reason=f"Response length: {word_count} words"
        ))
        
        # 3. Structure Score
        has_paragraphs = '\n\n' in output or len(output.split('.')) > 2
        has_formatting = any(marker in output for marker in ['*', '-', '1.', '2.', ':'])
        structure_score = (0.5 if has_paragraphs else 0) + (0.5 if has_formatting else 0)
        
        scores.append(ScoreResult(
            value=structure_score,
            name="structure",
            reason=f"Structure elements: paragraphs={has_paragraphs}, formatting={has_formatting}"
        ))
        
        return scores


# Example 4: Business KPI Metric
class CustomerSatisfactionMetric(CometStyleCustomMetric):
    """
    Custom metric aligned with business KPIs for customer service responses.
    """
    
    def __init__(self, name: str = "customer_satisfaction"):
        super().__init__(name)
        
        # Business-specific criteria
        self.satisfaction_indicators = {
            "acknowledgment": ["understand", "hear", "acknowledge", "recognize"],
            "empathy": ["sorry", "apologize", "understand how you feel", "frustrating"],
            "solution_oriented": ["help", "solve", "resolve", "fix", "assist"],
            "professionalism": ["please", "thank you", "appreciate", "happy to"],
            "follow_up": ["follow up", "contact", "reach out", "let us know"]
        }
    
    def score(self, input: str = "", output: str = "", **kwargs) -> ScoreResult:
        """Calculate customer satisfaction score."""
        output_lower = output.lower()
        satisfaction_score = 0.0
        found_criteria = []
        
        for criterion, keywords in self.satisfaction_indicators.items():
            if any(keyword in output_lower for keyword in keywords):
                satisfaction_score += 0.2
                found_criteria.append(criterion)
        
        # Bonus for polite language
        polite_phrases = ["please", "thank you", "you're welcome", "my pleasure"]
        if any(phrase in output_lower for phrase in polite_phrases):
            satisfaction_score += 0.1
            found_criteria.append("politeness")
        
        # Cap at 1.0
        satisfaction_score = min(1.0, satisfaction_score)
        
        return ScoreResult(
            value=satisfaction_score,
            name=self.name,
            reason=f"Satisfaction criteria met: {', '.join(found_criteria) if found_criteria else 'none'}"
        )


# Example 5: LLM-Powered Custom Metric
class CreativityMetric(CometLLMJudgeMetric):
    """
    Custom metric that uses an LLM to evaluate creativity and originality.
    """
    
    def __init__(self, api_key: Optional[str] = None, name: str = "creativity"):
        prompt_template = """You are an expert evaluator of creative content. Please evaluate the following response for creativity and originality.

Consider these aspects:
- Novel ideas or unique perspectives
- Creative use of language or metaphors
- Original solutions or approaches
- Imaginative elements

Input: {input}
Output: {output}
Context: {context}

Rate the creativity on a scale from 0.0 to 1.0 where:
- 0.0 = Very generic, no creativity
- 0.5 = Some creative elements
- 1.0 = Highly creative and original

Respond in JSON format:
{{
  "score": <float between 0.0 and 1.0>,
  "reason": "<explanation focusing on creative elements found or lacking>"
}}"""
        
        super().__init__(
            name=name,
            api_key=api_key,
            prompt_template=prompt_template,
            scoring_criteria="Creativity and originality of the response"
        )


async def main():
    """Main example function demonstrating custom metrics."""
    
    print("🎨 Custom Metrics Example for AgentLens")
    print("=" * 50)
    
    # Sample data for testing different metrics
    test_cases = [
        {
            "name": "Customer Service Response",
            "input": "I'm having trouble with my order and need help",
            "output": "I understand how frustrating this must be for you. I'm sorry for the inconvenience with your order. I'd be happy to help resolve this issue right away. Could you please provide your order number so I can look into this for you? Thank you for your patience.",
            "context": "Customer support interaction for e-commerce platform"
        },
        {
            "name": "Code Review Response", 
            "output": """Here's an improved version of your function:

def calculate_average(numbers):
    \"\"\"Calculate the average of a list of numbers.\"\"\"
    if not numbers:  # Handle empty list
        return 0
    
    try:
        total = sum(numbers)
        count = len(numbers)
        return total / count
    except TypeError as e:
        print(f"Error: Invalid input type - {e}")
        return None

# Example usage
scores = [85, 92, 78, 96]
avg = calculate_average(scores)
print(f"Average score: {avg}")""",
            "input": "How can I improve this function?",
            "context": "Code review for Python function"
        },
        {
            "name": "Creative Writing Response",
            "input": "Write about a day in the life of a cloud",
            "output": "I drift lazily across the azure canvas, my cotton-white form dancing with the wind's invisible symphony. Below, tiny humans scurry like ants, unaware that I'm painting temporary shadows across their world. Sometimes I gather my siblings for a thunderous applause, releasing silver tears of joy upon the earth. Today, I decide to shape-shift into a dragon, just to see if any dreamers below still believe in magic.",
            "context": "Creative writing exercise"
        }
    ]
    
    # Initialize custom metrics
    metrics = [
        SentimentPositivityMetric(),
        CodeQualityMetric(),
        ComprehensiveResponseMetric(),
        CustomerSatisfactionMetric()
    ]
    
    # Add LLM-powered metric if API key is available
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        metrics.append(CreativityMetric(api_key=openai_key))
        print("✅ Including LLM-powered creativity metric")
    else:
        print("⚠️ OPENAI_API_KEY not set, skipping LLM-powered metric")
    
    # Evaluate each test case with relevant metrics
    print(f"\n🧪 Testing {len(test_cases)} scenarios with {len(metrics)} custom metrics")
    print("-" * 50)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📝 Test Case {i}: {test_case['name']}")
        print(f"Input: {test_case['input'][:60]}...")
        print(f"Output: {test_case['output'][:80]}...")
        print()
        
        for metric in metrics:
            try:
                # Use appropriate parameters for each metric
                kwargs = {
                    "input": test_case["input"],
                    "output": test_case["output"],
                    "context": test_case.get("context", "")
                }
                
                # For Comet-style metrics, call the score method directly
                if hasattr(metric, 'score'):
                    if asyncio.iscoroutinefunction(metric.score_async):
                        score_result = await metric.score_async(**kwargs)
                    else:
                        score_result = metric.score(**kwargs)
                    
                    # Convert ScoreResult to MetricResult
                    if isinstance(score_result, list):
                        # Multi-score metric
                        primary_score = score_result[0] if score_result else None
                        result = MetricResult(
                            name=metric.name,
                            value=primary_score.value if primary_score else 0.0,
                            details={
                                "reason": primary_score.reason if primary_score else "No results",
                                "scores": [{"name": sr.name, "value": sr.value, "reason": sr.reason} for sr in score_result]
                            }
                        )
                    else:
                        # Single score metric
                        result = MetricResult(
                            name=metric.name,
                            value=score_result.value,
                            details={"reason": score_result.reason}
                        )
                else:
                    # Fall back to legacy interface
                    if asyncio.iscoroutinefunction(metric.evaluate_async):
                        result = await metric.evaluate_async(
                            predictions=[test_case["output"]],
                            ground_truth=[test_case["input"]]
                        )
                    else:
                        result = metric.evaluate(
                            predictions=[test_case["output"]],
                            ground_truth=[test_case["input"]]
                        )
                
                print(f"  🎯 {metric.name}: {result.value:.2f}")
                print(f"     Reason: {result.details.get('reason', 'No reason provided')}")
                
                # Show multi-score details if available
                if result.details and "scores" in result.details:
                    print(f"     Sub-scores:")
                    for score_detail in result.details["scores"]:
                        print(f"       - {score_detail['name']}: {score_detail['value']:.2f}")
                
            except Exception as e:
                print(f"  ❌ {metric.name}: Error - {e}")
        
        print("-" * 30)
    
    # Example 6: Using Custom Metrics with Evaluator
    print(f"\n🔬 Advanced Usage: Integration with Evaluator")
    print("-" * 50)
    
    # Configure AgentLens
    sprintlens.configure(
        url="http://localhost:3000",
        username="admin",
        password="admin123"
    )
    
    try:
        evaluator = Evaluator()
        
        # Add custom metrics to evaluator
        for metric in metrics:
            evaluator.add_metric(metric)
        
        # Evaluate a single case
        test_case = test_cases[0]  # Customer service case
        
        evaluation_result = await evaluator.evaluate_async(
            inputs=[test_case["input"]],
            outputs=[test_case["output"]],
            metadata={"test_case": test_case["name"]}
        )
        
        print(f"✅ Evaluation completed!")
        print(f"   Evaluation ID: {evaluation_result.evaluation_id}")
        print(f"   Overall Score: {evaluation_result.overall_score:.2f}")
        print(f"   Metrics evaluated: {len(evaluation_result.metrics)}")
        
        for metric_name, metric_result in evaluation_result.metrics.items():
            print(f"   - {metric_name}: {metric_result.value:.2f}")
    
    except Exception as e:
        print(f"⚠️ Evaluator integration example failed: {e}")
        print(f"   This is expected if backend is not running")
    
    # Example 7: Best Practices Summary
    print(f"\n💡 Custom Metrics Best Practices")
    print("-" * 50)
    print("""
    ✅ Custom Metric Development Tips:

    1. 🎯 Domain Alignment:
       • Create metrics that align with your specific use case
       • Consider business KPIs and user experience goals
       • Include domain expert knowledge in metric design

    2. 🔧 Implementation Patterns:
       • Subclass CustomMetric for simple rule-based metrics
       • Use LLMAsJudgeMetric for complex, nuanced evaluation
       • Return List[ScoreResult] for multi-dimensional scoring
       • Include detailed reasoning in ScoreResult.reason

    3. 🧪 Testing and Validation:
       • Test metrics with known good and bad examples
       • Validate against human judgment when possible
       • Consider edge cases (empty inputs, long outputs, etc.)
       • Monitor metric performance over time

    4. 🚀 Performance Considerations:
       • Cache expensive computations when possible
       • Use async methods for I/O operations
       • Consider rate limiting for API-based metrics
       • Implement graceful degradation for failures

    5. 🔒 Security and Privacy:
       • Validate inputs before processing
       • Handle API keys securely (environment variables)
       • Be mindful of data sent to external services
       • Implement appropriate error handling

    6. 📊 Integration Tips:
       • Use with Evaluator for comprehensive assessment
       • Combine multiple custom metrics for holistic evaluation
       • Export results for analysis and reporting
       • Consider metric weights for overall scoring
    """)
    
    print("\n" + "=" * 50)
    print("✅ Custom Metrics Example Complete!")
    print("\n🔗 Key Components Demonstrated:")
    print("   • BaseMetric: Abstract base for all metrics")
    print("   • CustomMetric: Simple rule-based custom metrics")
    print("   • LLMAsJudgeMetric: LLM-powered evaluation")
    print("   • ScoreResult: Individual score with reasoning")
    print("   • Multi-score metrics: Complex evaluation dimensions")


if __name__ == "__main__":
    asyncio.run(main())