"""
Advanced LLM-as-Judge Metrics with Backend Integration

This module provides advanced evaluation metrics that integrate with the
Sprint Lens backend LLM evaluation service for enterprise-grade metrics.
"""

import asyncio
import json
import time
from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Union
from enum import Enum

import httpx

from .metrics.base import BaseMetric, MetricResult
from ..utils.logging import get_logger

logger = get_logger(__name__)


class MetricType(Enum):
    """Supported advanced metric types."""
    HALLUCINATION = "hallucination"
    RELEVANCE = "relevance"
    ANSWER_RELEVANCE = "answer_relevance"
    CONTEXT_PRECISION = "context_precision"
    CONTEXT_RECALL = "context_recall"
    MODERATION = "moderation"
    USEFULNESS = "usefulness"
    COHERENCE = "coherence"
    G_EVAL = "g_eval"
    CONVERSATIONAL_COHERENCE = "conversational_coherence"
    SESSION_COMPLETENESS_QUALITY = "session_completeness_quality"
    USER_FRUSTRATION = "user_frustration"


@dataclass
class EvaluationModel:
    """Configuration for evaluation model."""
    name: str
    provider: str = "openai"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    max_tokens: Optional[int] = 1000
    temperature: Optional[float] = 0.0
    custom_model: Optional[Any] = None  # For AgentLensBaseModel instances


@dataclass
class BatchEvaluationConfig:
    """Configuration for batch evaluation."""
    metric_types: List[MetricType]
    dataset_id: Optional[str] = None
    batch_size: int = 10
    async_mode: bool = True
    model: Optional[EvaluationModel] = None


class AdvancedMetricsClient:
    """Client for advanced LLM-based metrics evaluation."""
    
    def __init__(self, base_url: Optional[str] = None):
        """Initialize the advanced metrics client."""
        self.base_url = base_url
        self.session = None
        self._client = None
    
    def _get_client(self):
        """Lazy load the Sprint Lens client to avoid circular imports."""
        if self._client is None:
            from ..core.client import get_client
            self._client = get_client()
        return self._client
    
    def _get_base_url(self):
        """Get the base URL, using client config if not provided."""
        if self.base_url:
            return self.base_url
        return self._get_client().config.url
    
    async def _get_session(self) -> httpx.AsyncClient:
        """Get or create HTTP session."""
        if self.session is None:
            client = self._get_client()
            headers = {
                "Content-Type": "application/json"
            }
            if client.config.api_key:
                headers["Authorization"] = f"Bearer {client.config.api_key}"
            
            self.session = httpx.AsyncClient(
                base_url=self._get_base_url(),
                timeout=httpx.Timeout(30.0),
                headers=headers
            )
        return self.session
    
    async def evaluate_single(
        self,
        input_text: str,
        output_text: str,
        metric_type: MetricType,
        context: Optional[List[str]] = None,
        reference: Optional[str] = None,
        model: Optional[EvaluationModel] = None,
        custom_prompt: Optional[str] = None,
        trace_id: Optional[str] = None,
        experiment_id: Optional[str] = None,
        task_introduction: Optional[str] = None,
        evaluation_criteria: Optional[str] = None,
        evaluation_steps: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Evaluate a single response using advanced LLM metrics."""
        # Check if we should use a custom model
        if model and model.custom_model:
            return await self._evaluate_with_custom_model(
                input_text=input_text,
                output_text=output_text,
                metric_type=metric_type,
                context=context,
                reference=reference,
                model=model,
                custom_prompt=custom_prompt,
                task_introduction=task_introduction,
                evaluation_criteria=evaluation_criteria,
                evaluation_steps=evaluation_steps
            )
        
        # Use standard backend evaluation
        session = await self._get_session()
        
        payload = {
            "providerId": "span_1758599279713_5c9x432u",  # Use existing Azure OpenAI provider
            "metricType": metric_type.value,
            "actualOutput": output_text,
            "query": input_text,
            "expectedOutput": reference,
            "context": context
        }
        
        # Add G-eval specific fields if provided
        if task_introduction:
            payload["taskIntroduction"] = task_introduction
        if evaluation_criteria:
            payload["evaluationCriteria"] = evaluation_criteria
        if evaluation_steps:
            payload["evaluationSteps"] = evaluation_steps
        
        if model:
            payload["model"] = model.name
            if model.temperature is not None:
                payload["temperature"] = model.temperature
        
        try:
            response = await session.post("/api/v1/llm/evaluate", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Evaluation request failed: {e}")
            raise
    
    async def start_batch_evaluation(
        self,
        experiment_id: str,
        config: BatchEvaluationConfig
    ) -> Dict[str, Any]:
        """Start a batch evaluation job."""
        session = await self._get_session()
        
        payload = {
            "metricTypes": [mt.value for mt in config.metric_types],
            "datasetId": config.dataset_id,
            "batchSize": config.batch_size,
            "async": config.async_mode
        }
        
        if config.model:
            payload["model"] = {
                "name": config.model.name,
                "provider": config.model.provider,
                "apiKey": config.model.api_key,
                "baseUrl": config.model.base_url,
                "maxTokens": config.model.max_tokens,
                "temperature": config.model.temperature
            }
        
        try:
            response = await session.post(
                f"/api/v1/experiments/{experiment_id}/evaluate",
                json=payload
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Batch evaluation request failed: {e}")
            raise
    
    async def get_evaluation_status(
        self,
        experiment_id: str,
        job_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get evaluation job status."""
        session = await self._get_session()
        
        url = f"/api/v1/experiments/{experiment_id}/evaluate"
        if job_id:
            url += f"?jobId={job_id}"
        
        try:
            response = await session.get(url)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Status request failed: {e}")
            raise
    
    async def configure_metrics(
        self,
        project_id: str,
        metric_configs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Configure metrics for a project."""
        session = await self._get_session()
        
        payload = {
            "projectId": project_id,
            "metricConfigs": metric_configs
        }
        
        try:
            response = await session.post("/api/v1/metrics/config", json=payload)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Configuration request failed: {e}")
            raise
    
    async def get_metrics_config(
        self,
        project_id: str
    ) -> Dict[str, Any]:
        """Get metrics configuration for a project."""
        session = await self._get_session()
        
        try:
            response = await session.get(f"/api/v1/metrics/config?projectId={project_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            logger.error(f"Get configuration request failed: {e}")
            raise
    
    async def _evaluate_with_custom_model(
        self,
        input_text: str,
        output_text: str,
        metric_type: MetricType,
        context: Optional[List[str]] = None,
        reference: Optional[str] = None,
        model: Optional[EvaluationModel] = None,
        custom_prompt: Optional[str] = None,
        task_introduction: Optional[str] = None,
        evaluation_criteria: Optional[str] = None,
        evaluation_steps: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Evaluate using a custom model."""
        from .models import AgentLensBaseModel
        
        if not model or not model.custom_model:
            raise ValueError("Custom model is required for custom evaluation")
        
        if not isinstance(model.custom_model, AgentLensBaseModel):
            raise ValueError("Custom model must be an instance of AgentLensBaseModel")
        
        custom_model = model.custom_model
        
        try:
            # Build evaluation prompt
            if custom_prompt:
                prompt = custom_prompt
            else:
                prompt = self._build_evaluation_prompt(
                    input_text=input_text,
                    output_text=output_text,
                    metric_type=metric_type,
                    context=context,
                    reference=reference,
                    task_introduction=task_introduction,
                    evaluation_criteria=evaluation_criteria,
                    evaluation_steps=evaluation_steps
                )
            
            # Call custom model
            start_time = time.time()
            response = await custom_model.generate_provider_response(
                messages=[{"role": "user", "content": prompt}],
                temperature=model.temperature,
                max_tokens=model.max_tokens
            )
            
            # Parse response
            try:
                # Try to parse as JSON first
                import json
                if response.content.strip().startswith('{'):
                    parsed_response = json.loads(response.content)
                    score = parsed_response.get("score", 0.0)
                    reasoning = parsed_response.get("reasoning", "No reasoning provided")
                    confidence = parsed_response.get("confidence", 1.0)
                else:
                    # Fallback: extract score from text
                    score, reasoning, confidence = self._extract_score_from_text(response.content)
            except (json.JSONDecodeError, ValueError):
                # Fallback parsing
                score, reasoning, confidence = self._extract_score_from_text(response.content)
            
            return {
                "data": {
                    "score": score,
                    "reasoning": reasoning,
                    "confidence": confidence,
                    "cost": response.cost or 0.0,
                    "latency": int((response.latency or 0.0) * 1000),  # Convert to ms
                    "model": model.name,
                    "provider": "custom"
                }
            }
            
        except Exception as e:
            logger.error(f"Custom model evaluation failed: {e}")
            return {
                "data": {
                    "score": 0.0,
                    "reasoning": f"Evaluation failed: {str(e)}",
                    "confidence": 0.0,
                    "cost": 0.0,
                    "latency": 0,
                    "model": model.name,
                    "provider": "custom"
                }
            }
    
    def _build_evaluation_prompt(
        self,
        input_text: str,
        output_text: str,
        metric_type: MetricType,
        context: Optional[List[str]] = None,
        reference: Optional[str] = None,
        task_introduction: Optional[str] = None,
        evaluation_criteria: Optional[str] = None,
        evaluation_steps: Optional[List[str]] = None
    ) -> str:
        """Build evaluation prompt for custom models."""
        # Use basic prompt construction (frontend service integration can be added later)
        return self._build_basic_prompt(
            input_text, output_text, metric_type, context, reference
        )
    
    def _build_basic_prompt(
        self,
        input_text: str,
        output_text: str,
        metric_type: MetricType,
        context: Optional[List[str]] = None,
        reference: Optional[str] = None
    ) -> str:
        """Build basic evaluation prompt as fallback."""
        prompts = {
            MetricType.HALLUCINATION: "Evaluate if the output contains hallucinated information not present in the context. Respond with JSON: {\"score\": 0 or 1, \"reasoning\": \"explanation\", \"confidence\": 0.0-1.0}",
            MetricType.RELEVANCE: "Rate the relevance of the output to the input on a scale of 0.0 to 1.0. Respond with JSON: {\"score\": 0.0-1.0, \"reasoning\": \"explanation\", \"confidence\": 0.0-1.0}",
            MetricType.USEFULNESS: "Rate the usefulness of the output on a scale of 0.0 to 1.0. Respond with JSON: {\"score\": 0.0-1.0, \"reasoning\": \"explanation\", \"confidence\": 0.0-1.0}"
        }
        
        system_prompt = prompts.get(metric_type, "Evaluate the quality of the output.")
        if context:
            # Handle both string lists and nested lists
            if isinstance(context[0], list):
                context_str = "\n".join(["\n".join(ctx) if isinstance(ctx, list) else str(ctx) for ctx in context])
            else:
                context_str = "\n".join([str(ctx) for ctx in context])
        else:
            context_str = "No context provided"
        
        return f"""
{system_prompt}

Input: {input_text}
Output: {output_text}
Context: {context_str}
{f"Reference: {reference}" if reference else ""}

Provide your evaluation in JSON format.
"""
    
    def _extract_score_from_text(self, text: str) -> tuple:
        """Extract score, reasoning, and confidence from text response."""
        import re
        
        # Try to find score patterns
        score_patterns = [
            r'score["\']?\s*:\s*([0-9.]+)',
            r'Score:\s*([0-9.]+)',
            r'([0-9.]+)/1\.0',
            r'([0-9.]+)\s*out\s*of\s*[0-9.]+'
        ]
        
        score = 0.0
        for pattern in score_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    score = float(match.group(1))
                    break
                except ValueError:
                    continue
        
        # Extract reasoning (take first sentence or up to 200 chars)
        reasoning = text[:200] + "..." if len(text) > 200 else text
        
        # Default confidence
        confidence = 0.8 if score > 0 else 0.5
        
        return score, reasoning, confidence
    
    async def close(self):
        """Close the HTTP session."""
        if self.session:
            await self.session.aclose()
            self.session = None


class EnhancedHallucinationMetric(BaseMetric):
    """Enhanced hallucination detection metric with backend integration."""
    
    def __init__(
        self,
        model: Optional[EvaluationModel] = None,
        custom_prompt: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            name="enhanced_hallucination",
            description="Advanced LLM-based hallucination detection with backend integration",
            **kwargs
        )
        self.model = model
        self.custom_prompt = custom_prompt
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Asynchronous evaluation using backend service."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            results = []
            for i, (pred, gt) in enumerate(zip(predictions, ground_truth)):
                context = contexts[i] if contexts and i < len(contexts) else None
                
                response = await self.metrics_client.evaluate_single(
                    input_text=gt,
                    output_text=pred,
                    metric_type=MetricType.HALLUCINATION,
                    context=[context] if context else None,
                    model=self.model,
                    custom_prompt=self.custom_prompt,
                    trace_id=kwargs.get("trace_id"),
                    experiment_id=kwargs.get("experiment_id")
                )
                
                # Handle both backend and custom model responses
                if response.get("data"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data.get("score", 0.0),
                        "reasoning": result_data.get("reasoning", "No reasoning provided"),
                        "confidence": result_data.get("confidence", 1.0),
                        "cost": result_data.get("cost", 0.0),
                        "latency": result_data.get("latency", 0),
                        "model": result_data.get("model", "unknown")
                    })
                elif response.get("success"):
                    # Legacy backend response format
                    result_data = response["data"]
                    results.append({
                        "score": result_data["score"],
                        "reasoning": result_data["reasoning"],
                        "confidence": result_data["confidence"],
                        "cost": result_data["cost"],
                        "latency": result_data["latency"],
                        "model": result_data["model"]
                    })
                else:
                    results.append({
                        "score": 0.0,
                        "error": response.get("error", "Unknown error"),
                        "reasoning": "Evaluation failed",
                        "confidence": 0.0
                    })
            
            # Calculate aggregate metrics
            scores = [r["score"] for r in results if "score" in r]
            avg_score = sum(scores) / len(scores) if scores else 0.0
            
            # Higher score means less hallucination, so invert for traditional hallucination metric
            hallucination_score = 1.0 - avg_score
            
            details = {
                "individual_results": results,
                "average_score": avg_score,
                "hallucination_score": hallucination_score,
                "total_items": len(predictions),
                "successful_evaluations": len([r for r in results if "error" not in r]),
                "total_cost": sum(r.get("cost", 0) for r in results),
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=hallucination_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Enhanced hallucination evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


class EnhancedRelevanceMetric(BaseMetric):
    """Enhanced relevance metric with backend integration."""
    
    def __init__(
        self,
        model: Optional[EvaluationModel] = None,
        custom_prompt: Optional[str] = None,
        **kwargs
    ):
        super().__init__(
            name="enhanced_relevance",
            description="Advanced LLM-based relevance assessment with backend integration",
            **kwargs
        )
        self.model = model
        self.custom_prompt = custom_prompt
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Asynchronous evaluation using backend service."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            results = []
            for i, (pred, gt) in enumerate(zip(predictions, ground_truth)):
                context = contexts[i] if contexts and i < len(contexts) else None
                
                response = await self.metrics_client.evaluate_single(
                    input_text=gt,
                    output_text=pred,
                    metric_type=MetricType.RELEVANCE,
                    context=[context] if context else None,
                    reference=gt,
                    model=self.model,
                    custom_prompt=self.custom_prompt,
                    trace_id=kwargs.get("trace_id"),
                    experiment_id=kwargs.get("experiment_id")
                )
                
                # Handle both backend and custom model responses
                if response.get("data"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data.get("score", 0.0),
                        "reasoning": result_data.get("reasoning", "No reasoning provided"),
                        "confidence": result_data.get("confidence", 1.0),
                        "cost": result_data.get("cost", 0.0),
                        "latency": result_data.get("latency", 0),
                        "model": result_data.get("model", "unknown")
                    })
                elif response.get("success"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data["score"],
                        "reasoning": result_data["reasoning"],
                        "confidence": result_data["confidence"],
                        "cost": result_data["cost"],
                        "latency": result_data["latency"],
                        "model": result_data["model"]
                    })
                else:
                    results.append({
                        "score": 0.0,
                        "error": response.get("error", "Unknown error"),
                        "reasoning": "Evaluation failed",
                        "confidence": 0.0
                    })
            
            # Calculate aggregate metrics
            scores = [r["score"] for r in results if "score" in r]
            avg_score = sum(scores) / len(scores) if scores else 0.0
            
            details = {
                "individual_results": results,
                "average_score": avg_score,
                "total_items": len(predictions),
                "successful_evaluations": len([r for r in results if "error" not in r]),
                "total_cost": sum(r.get("cost", 0) for r in results),
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Enhanced relevance evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


class BatchEvaluator:
    """Batch evaluator for multiple metrics with job tracking."""
    
    def __init__(self):
        self.metrics_client = AdvancedMetricsClient()
    
    async def start_evaluation(
        self,
        experiment_id: str,
        config: BatchEvaluationConfig
    ) -> str:
        """Start a batch evaluation job and return job ID."""
        try:
            response = await self.metrics_client.start_batch_evaluation(experiment_id, config)
            if response.get("success"):
                return response["data"]["jobId"]
            else:
                raise ValueError(f"Batch evaluation failed: {response.get('error')}")
        except Exception as e:
            logger.error(f"Failed to start batch evaluation: {e}")
            raise
    
    async def wait_for_completion(
        self,
        experiment_id: str,
        job_id: str,
        timeout_seconds: int = 300,
        poll_interval: int = 5
    ) -> Dict[str, Any]:
        """Wait for batch evaluation to complete."""
        start_time = time.time()
        
        while time.time() - start_time < timeout_seconds:
            try:
                response = await self.metrics_client.get_evaluation_status(experiment_id, job_id)
                # Handle both backend and custom model responses
                if response.get("data"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data.get("score", 0.0),
                        "reasoning": result_data.get("reasoning", "No reasoning provided"),
                        "confidence": result_data.get("confidence", 1.0),
                        "cost": result_data.get("cost", 0.0),
                        "latency": result_data.get("latency", 0),
                        "model": result_data.get("model", "unknown")
                    })
                elif response.get("success"):
                    job_data = response["data"]
                    status = job_data["status"]
                    
                    if status == "completed":
                        return job_data
                    elif status == "failed":
                        raise ValueError(f"Evaluation job failed: {job_data.get('errorMessage')}")
                    
                    # Still running, wait before next poll
                    await asyncio.sleep(poll_interval)
                else:
                    raise ValueError(f"Status check failed: {response.get('error')}")
                    
            except Exception as e:
                logger.error(f"Error checking evaluation status: {e}")
                raise
        
        raise TimeoutError(f"Evaluation job {job_id} did not complete within {timeout_seconds} seconds")
    
    async def get_results(
        self,
        experiment_id: str,
        job_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get evaluation results for an experiment."""
        try:
            response = await self.metrics_client.get_evaluation_status(experiment_id, job_id)
            if response.get("success"):
                return response["data"]
            else:
                raise ValueError(f"Failed to get results: {response.get('error')}")
        except Exception as e:
            logger.error(f"Failed to get evaluation results: {e}")
            raise
    
    async def close(self):
        """Close the metrics client."""
        await self.metrics_client.close()


# Utility function for easy evaluation
async def evaluate_hallucination(
    input_text: str,
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick hallucination evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text=input_text,
            output_text=output_text,
            metric_type=MetricType.HALLUCINATION,
            context=[context] if context else None,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


# Synchronous wrapper
def evaluate_hallucination_sync(
    input_text: str,
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous hallucination evaluation function."""
    return asyncio.run(evaluate_hallucination(
        input_text, output_text, context, model, trace_id, experiment_id
    ))


class GEvalMetric(BaseMetric):
    """G-Eval metric with Chain of Thought reasoning for task-agnostic evaluation."""
    
    def __init__(
        self,
        task_introduction: str,
        evaluation_criteria: str,
        evaluation_steps: Optional[List[str]] = None,
        model: Optional[EvaluationModel] = None,
        **kwargs
    ):
        super().__init__(
            name="g_eval",
            description="G-Eval: LLM-based evaluation with Chain of Thought reasoning",
            **kwargs
        )
        self.task_introduction = task_introduction
        self.evaluation_criteria = evaluation_criteria
        self.evaluation_steps = evaluation_steps
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Asynchronous G-Eval evaluation using backend service."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            results = []
            for i, (pred, gt) in enumerate(zip(predictions, ground_truth)):
                context = contexts[i] if contexts and i < len(contexts) else None
                
                response = await self.metrics_client.evaluate_single(
                    input_text=gt,
                    output_text=pred,
                    metric_type=MetricType.G_EVAL,
                    context=[context] if context else None,
                    model=self.model,
                    trace_id=kwargs.get("trace_id"),
                    experiment_id=kwargs.get("experiment_id"),
                    task_introduction=self.task_introduction,
                    evaluation_criteria=self.evaluation_criteria,
                    evaluation_steps=self.evaluation_steps
                )
                
                # Handle both backend and custom model responses
                if response.get("data"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data.get("score", 0.0),
                        "reasoning": result_data.get("reasoning", "No reasoning provided"),
                        "confidence": result_data.get("confidence", 1.0),
                        "cost": result_data.get("cost", 0.0),
                        "latency": result_data.get("latency", 0),
                        "model": result_data.get("model", "unknown")
                    })
                elif response.get("success"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data["score"],
                        "reasoning": result_data["reasoning"],
                        "confidence": result_data["confidence"],
                        "cost": result_data["cost"],
                        "latency": result_data["latency"],
                        "model": result_data["model"]
                    })
                else:
                    results.append({
                        "score": 0.0,
                        "error": response.get("error", "Unknown error"),
                        "reasoning": "Evaluation failed",
                        "confidence": 0.0
                    })
            
            # Calculate aggregate metrics
            scores = [r["score"] for r in results if "score" in r]
            avg_score = sum(scores) / len(scores) if scores else 0.0
            
            details = {
                "individual_results": results,
                "average_score": avg_score,
                "total_items": len(predictions),
                "successful_evaluations": len([r for r in results if "error" not in r]),
                "total_cost": sum(r.get("cost", 0) for r in results),
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default",
                "task_introduction": self.task_introduction,
                "evaluation_criteria": self.evaluation_criteria
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"G-Eval evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async G-Eval evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


# G-Eval utility functions
async def evaluate_g_eval(
    input_text: str,
    output_text: str,
    task_introduction: str,
    evaluation_criteria: str,
    evaluation_steps: Optional[List[str]] = None,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick G-Eval evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text=input_text,
            output_text=output_text,
            metric_type=MetricType.G_EVAL,
            context=[context] if context else None,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id,
            task_introduction=task_introduction,
            evaluation_criteria=evaluation_criteria,
            evaluation_steps=evaluation_steps
        )
        return result
    finally:
        await client.close()


def evaluate_g_eval_sync(
    input_text: str,
    output_text: str,
    task_introduction: str,
    evaluation_criteria: str,
    evaluation_steps: Optional[List[str]] = None,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous G-Eval evaluation function."""
    return asyncio.run(evaluate_g_eval(
        input_text, output_text, task_introduction, evaluation_criteria,
        evaluation_steps, context, model, trace_id, experiment_id
    ))


class ModerationMetric(BaseMetric):
    """Content moderation metric with backend integration."""
    
    def __init__(
        self,
        model: Optional[EvaluationModel] = None,
        **kwargs
    ):
        super().__init__(
            name="moderation",
            description="LLM-based content moderation for safety assessment",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: Optional[List[str]] = None,
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Asynchronous moderation evaluation using backend service."""
        start_time = time.time()
        
        try:
            # Moderation doesn't require ground truth, so we can use empty list if not provided
            if ground_truth is None:
                ground_truth = [""] * len(predictions)
            
            self._validate_inputs(predictions, ground_truth)
            
            results = []
            for i, pred in enumerate(predictions):
                context = contexts[i] if contexts and i < len(contexts) else None
                
                response = await self.metrics_client.evaluate_single(
                    input_text="",  # Moderation typically doesn't need input text
                    output_text=pred,
                    metric_type=MetricType.MODERATION,
                    context=[context] if context else None,
                    model=self.model,
                    trace_id=kwargs.get("trace_id"),
                    experiment_id=kwargs.get("experiment_id")
                )
                
                # Handle both backend and custom model responses
                if response.get("data"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data.get("score", 0.0),
                        "reasoning": result_data.get("reasoning", "No reasoning provided"),
                        "confidence": result_data.get("confidence", 1.0),
                        "cost": result_data.get("cost", 0.0),
                        "latency": result_data.get("latency", 0),
                        "model": result_data.get("model", "unknown")
                    })
                elif response.get("success"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data["score"],
                        "reasoning": result_data["reasoning"],
                        "confidence": result_data["confidence"],
                        "cost": result_data["cost"],
                        "latency": result_data["latency"],
                        "model": result_data["model"]
                    })
                else:
                    results.append({
                        "score": 0.0,
                        "error": response.get("error", "Unknown error"),
                        "reasoning": "Evaluation failed",
                        "confidence": 0.0
                    })
            
            # Calculate aggregate metrics
            scores = [r["score"] for r in results if "score" in r]
            avg_score = sum(scores) / len(scores) if scores else 0.0
            
            # Count unsafe content (score >= 0.5)
            unsafe_count = len([s for s in scores if s >= 0.5])
            safety_rate = 1.0 - (unsafe_count / len(predictions)) if predictions else 1.0
            
            details = {
                "individual_results": results,
                "average_score": avg_score,
                "safety_rate": safety_rate,
                "unsafe_content_count": unsafe_count,
                "total_items": len(predictions),
                "successful_evaluations": len([r for r in results if "error" not in r]),
                "total_cost": sum(r.get("cost", 0) for r in results),
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Moderation evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: Optional[List[str]] = None,
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async moderation evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


# Moderation utility functions
async def evaluate_moderation(
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick moderation evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text="",  # Moderation doesn't require input text
            output_text=output_text,
            metric_type=MetricType.MODERATION,
            context=[context] if context else None,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_moderation_sync(
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous moderation evaluation function."""
    return asyncio.run(evaluate_moderation(
        output_text, context, model, trace_id, experiment_id
    ))


class UsefulnessMetric(BaseMetric):
    """Usefulness assessment metric with backend integration."""
    
    def __init__(
        self,
        model: Optional[EvaluationModel] = None,
        **kwargs
    ):
        super().__init__(
            name="usefulness",
            description="LLM-based usefulness and helpfulness assessment",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Asynchronous usefulness evaluation using backend service."""
        start_time = time.time()
        
        try:
            self._validate_inputs(predictions, ground_truth)
            
            results = []
            for i, (pred, gt) in enumerate(zip(predictions, ground_truth)):
                context = contexts[i] if contexts and i < len(contexts) else None
                
                response = await self.metrics_client.evaluate_single(
                    input_text=gt,  # Use ground truth as input/query
                    output_text=pred,
                    metric_type=MetricType.USEFULNESS,
                    context=[context] if context else None,
                    model=self.model,
                    trace_id=kwargs.get("trace_id"),
                    experiment_id=kwargs.get("experiment_id")
                )
                
                # Handle both backend and custom model responses
                if response.get("data"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data.get("score", 0.0),
                        "reasoning": result_data.get("reasoning", "No reasoning provided"),
                        "confidence": result_data.get("confidence", 1.0),
                        "cost": result_data.get("cost", 0.0),
                        "latency": result_data.get("latency", 0),
                        "model": result_data.get("model", "unknown")
                    })
                elif response.get("success"):
                    result_data = response["data"]
                    results.append({
                        "score": result_data["score"],
                        "reasoning": result_data["reasoning"],
                        "confidence": result_data["confidence"],
                        "cost": result_data["cost"],
                        "latency": result_data["latency"],
                        "model": result_data["model"]
                    })
                else:
                    results.append({
                        "score": 0.0,
                        "error": response.get("error", "Unknown error"),
                        "reasoning": "Evaluation failed",
                        "confidence": 0.0
                    })
            
            # Calculate aggregate metrics
            scores = [r["score"] for r in results if "score" in r]
            avg_score = sum(scores) / len(scores) if scores else 0.0
            
            # Categorize usefulness levels
            very_useful_count = len([s for s in scores if s >= 0.8])
            somewhat_useful_count = len([s for s in scores if 0.5 <= s < 0.8])
            not_useful_count = len([s for s in scores if s < 0.5])
            
            details = {
                "individual_results": results,
                "average_score": avg_score,
                "usefulness_distribution": {
                    "very_useful": very_useful_count,
                    "somewhat_useful": somewhat_useful_count,
                    "not_useful": not_useful_count
                },
                "total_items": len(predictions),
                "successful_evaluations": len([r for r in results if "error" not in r]),
                "total_cost": sum(r.get("cost", 0) for r in results),
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Usefulness evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async usefulness evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


# Usefulness utility functions
async def evaluate_usefulness(
    input_text: str,
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick usefulness evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text=input_text,
            output_text=output_text,
            metric_type=MetricType.USEFULNESS,
            context=[context] if context else None,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_usefulness_sync(
    input_text: str,
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous usefulness evaluation function."""
    return asyncio.run(evaluate_usefulness(
        input_text, output_text, context, model, trace_id, experiment_id
    ))


class AnswerRelevanceMetric(BaseMetric):
    """
    Answer Relevance Metric for evaluating how relevant and appropriate 
    the LLM's response is to the given input question or prompt.
    
    This metric assesses:
    - Alignment with user's original input
    - Direct addressing of key query points
    - Minimizing extraneous or off-topic information
    
    Scoring:
    - 0.0: Completely irrelevant
    - 1.0: Highly relevant and appropriate
    """
    
    def __init__(self, model: Optional[EvaluationModel] = None, **kwargs):
        super().__init__(
            name="answer_relevance",
            description="LLM-based assessment of response relevance to the input query",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """
        Evaluate answer relevance for multiple prediction-query pairs.
        
        Args:
            predictions: List of model outputs/responses to evaluate
            ground_truth: List of original queries/questions
            contexts: Optional list of additional context for each query
            **kwargs: Additional arguments passed to the evaluation
        
        Returns:
            MetricResult with aggregated relevance scores and detailed analysis
        """
        start_time = time.time()
        
        if len(predictions) != len(ground_truth):
            return self._create_result(
                error="Number of predictions must match number of queries",
                start_time=start_time
            )
        
        try:
            results = []
            total_cost = 0.0
            
            # Evaluate each prediction-query pair
            for i, (prediction, query) in enumerate(zip(predictions, ground_truth)):
                context = contexts[i] if contexts and i < len(contexts) else None
                
                try:
                    result = await self.metrics_client.evaluate_single(
                        input_text=query,
                        output_text=prediction,
                        metric_type=MetricType.ANSWER_RELEVANCE,
                        context=[context] if context else None,
                        model=self.model
                    )
                    
                    # Extract score and details from result
                    score = result.get("data", {}).get("score", 0.0)
                    reasoning = result.get("data", {}).get("reasoning", "No reasoning provided")
                    confidence = result.get("data", {}).get("confidence", 1.0)
                    cost = result.get("data", {}).get("cost", 0.0)
                    latency = result.get("data", {}).get("latency", 0)
                    
                    total_cost += cost
                    
                    results.append({
                        "score": score,
                        "reasoning": reasoning,
                        "confidence": confidence,
                        "cost": cost,
                        "latency": latency,
                        "query": query,
                        "response": prediction[:100] + "..." if len(prediction) > 100 else prediction
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to evaluate answer relevance for pair {i}: {e}")
                    results.append({
                        "score": 0.0,
                        "reasoning": f"Evaluation failed: {str(e)}",
                        "confidence": 0.0,
                        "cost": 0.0,
                        "latency": 0,
                        "query": query,
                        "response": prediction[:100] + "..." if len(prediction) > 100 else prediction
                    })
            
            if not results:
                return self._create_result(
                    error="No successful evaluations completed",
                    start_time=start_time
                )
            
            # Calculate aggregated metrics
            scores = [r["score"] for r in results]
            avg_score = sum(scores) / len(scores)
            
            # Categorize relevance levels
            highly_relevant = sum(1 for score in scores if score >= 0.8)
            somewhat_relevant = sum(1 for score in scores if 0.5 <= score < 0.8)
            not_relevant = sum(1 for score in scores if score < 0.5)
            
            details = {
                "individual_results": results,
                "total_evaluations": len(results),
                "relevance_distribution": {
                    "highly_relevant": highly_relevant,
                    "somewhat_relevant": somewhat_relevant,
                    "not_relevant": not_relevant
                },
                "relevance_rate": highly_relevant / len(results),
                "total_cost": total_cost,
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Answer relevance evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async answer relevance evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


# Answer Relevance utility functions
async def evaluate_answer_relevance(
    input_text: str,
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick answer relevance evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text=input_text,
            output_text=output_text,
            metric_type=MetricType.ANSWER_RELEVANCE,
            context=[context] if context else None,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_answer_relevance_sync(
    input_text: str,
    output_text: str,
    context: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous answer relevance evaluation function."""
    return asyncio.run(evaluate_answer_relevance(
        input_text, output_text, context, model, trace_id, experiment_id
    ))


class ContextPrecisionMetric(BaseMetric):
    """
    Context Precision Metric for evaluating the accuracy and relevance
    of an LLM's response based on provided context.
    
    This metric assesses:
    - Alignment with provided context
    - Factual accuracy against context
    - Relevance to the context information
    - Identification of potential hallucinations
    
    Scoring:
    - 0.0: Completely inaccurate/irrelevant to context
    - 1.0: Perfectly accurate and aligned with context
    """
    
    def __init__(self, model: Optional[EvaluationModel] = None, **kwargs):
        super().__init__(
            name="context_precision",
            description="LLM-based assessment of response accuracy and relevance to provided context",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """
        Evaluate context precision for multiple prediction-context pairs.
        
        Args:
            predictions: List of model outputs/responses to evaluate
            ground_truth: List of expected outputs or queries
            contexts: List of context information for each prediction (required)
            **kwargs: Additional arguments passed to the evaluation
        
        Returns:
            MetricResult with aggregated precision scores and detailed analysis
        """
        start_time = time.time()
        
        if len(predictions) != len(ground_truth):
            return self._create_result(
                error="Number of predictions must match number of ground truth items",
                start_time=start_time
            )
        
        if not contexts or len(contexts) != len(predictions):
            return self._create_result(
                error="Context is required for each prediction in Context Precision evaluation",
                start_time=start_time
            )
        
        try:
            results = []
            total_cost = 0.0
            
            # Evaluate each prediction-context pair
            for i, (prediction, expected, context) in enumerate(zip(predictions, ground_truth, contexts)):
                try:
                    result = await self.metrics_client.evaluate_single(
                        input_text=expected,
                        output_text=prediction,
                        metric_type=MetricType.CONTEXT_PRECISION,
                        context=[context],
                        reference=expected,
                        model=self.model
                    )
                    
                    # Extract score and details from result
                    score = result.get("data", {}).get("score", 0.0)
                    reasoning = result.get("data", {}).get("reasoning", "No reasoning provided")
                    confidence = result.get("data", {}).get("confidence", 1.0)
                    cost = result.get("data", {}).get("cost", 0.0)
                    latency = result.get("data", {}).get("latency", 0)
                    
                    total_cost += cost
                    
                    results.append({
                        "score": score,
                        "reasoning": reasoning,
                        "confidence": confidence,
                        "cost": cost,
                        "latency": latency,
                        "prediction": prediction[:100] + "..." if len(prediction) > 100 else prediction,
                        "expected": expected[:100] + "..." if len(expected) > 100 else expected,
                        "context": context[:100] + "..." if len(context) > 100 else context
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to evaluate context precision for pair {i}: {e}")
                    results.append({
                        "score": 0.0,
                        "reasoning": f"Evaluation failed: {str(e)}",
                        "confidence": 0.0,
                        "cost": 0.0,
                        "latency": 0,
                        "prediction": prediction[:100] + "..." if len(prediction) > 100 else prediction,
                        "expected": expected[:100] + "..." if len(expected) > 100 else expected,
                        "context": context[:100] + "..." if len(context) > 100 else context
                    })
            
            if not results:
                return self._create_result(
                    error="No successful evaluations completed",
                    start_time=start_time
                )
            
            # Calculate aggregated metrics
            scores = [r["score"] for r in results]
            avg_score = sum(scores) / len(scores)
            
            # Categorize precision levels
            high_precision = sum(1 for score in scores if score >= 0.8)
            medium_precision = sum(1 for score in scores if 0.5 <= score < 0.8)
            low_precision = sum(1 for score in scores if score < 0.5)
            
            details = {
                "individual_results": results,
                "total_evaluations": len(results),
                "precision_distribution": {
                    "high_precision": high_precision,
                    "medium_precision": medium_precision,
                    "low_precision": low_precision
                },
                "precision_rate": high_precision / len(results),
                "total_cost": total_cost,
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Context precision evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async context precision evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


# Context Precision utility functions
async def evaluate_context_precision(
    input_text: str,
    output_text: str,
    context: str,
    expected_output: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick context precision evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text=input_text,
            output_text=output_text,
            metric_type=MetricType.CONTEXT_PRECISION,
            context=[context],
            reference=expected_output,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_context_precision_sync(
    input_text: str,
    output_text: str,
    context: str,
    expected_output: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous context precision evaluation function."""
    return asyncio.run(evaluate_context_precision(
        input_text, output_text, context, expected_output, model, trace_id, experiment_id
    ))


class ContextRecallMetric(BaseMetric):
    """
    Context Recall Metric for evaluating how well an LLM's response
    recalls and utilizes the relevant information from provided context.
    
    This metric assesses:
    - Completeness of information retrieval from context
    - Relevance of recalled information to the query
    - Accuracy of context utilization in the response
    - Coverage of key points from the context
    
    Scoring:
    - 0.0: Response misses all relevant context information
    - 1.0: Response perfectly recalls and utilizes all relevant context
    """
    
    def __init__(self, model: Optional[EvaluationModel] = None, **kwargs):
        super().__init__(
            name="context_recall",
            description="LLM-based assessment of how well response recalls and utilizes context information",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """
        Evaluate context recall for multiple prediction-context pairs.
        
        Args:
            predictions: List of model outputs/responses to evaluate
            ground_truth: List of expected outputs or queries
            contexts: List of context information for each prediction (required)
            **kwargs: Additional arguments passed to the evaluation
        
        Returns:
            MetricResult with aggregated recall scores and detailed analysis
        """
        start_time = time.time()
        
        if len(predictions) != len(ground_truth):
            return self._create_result(
                error="Number of predictions must match number of ground truth items",
                start_time=start_time
            )
        
        if not contexts or len(contexts) != len(predictions):
            return self._create_result(
                error="Context is required for each prediction in Context Recall evaluation",
                start_time=start_time
            )
        
        try:
            results = []
            total_cost = 0.0
            
            # Evaluate each prediction-context pair
            for i, (prediction, expected, context) in enumerate(zip(predictions, ground_truth, contexts)):
                try:
                    result = await self.metrics_client.evaluate_single(
                        input_text=expected,
                        output_text=prediction,
                        metric_type=MetricType.CONTEXT_RECALL,
                        context=[context],
                        reference=expected,
                        model=self.model
                    )
                    
                    # Extract score and details from result
                    score = result.get("data", {}).get("score", 0.0)
                    reasoning = result.get("data", {}).get("reasoning", "No reasoning provided")
                    confidence = result.get("data", {}).get("confidence", 1.0)
                    cost = result.get("data", {}).get("cost", 0.0)
                    latency = result.get("data", {}).get("latency", 0)
                    
                    total_cost += cost
                    
                    results.append({
                        "score": score,
                        "reasoning": reasoning,
                        "confidence": confidence,
                        "cost": cost,
                        "latency": latency,
                        "prediction": prediction[:100] + "..." if len(prediction) > 100 else prediction,
                        "expected": expected[:100] + "..." if len(expected) > 100 else expected,
                        "context": context[:100] + "..." if len(context) > 100 else context
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to evaluate context recall for pair {i}: {e}")
                    results.append({
                        "score": 0.0,
                        "reasoning": f"Evaluation failed: {str(e)}",
                        "confidence": 0.0,
                        "cost": 0.0,
                        "latency": 0,
                        "prediction": prediction[:100] + "..." if len(prediction) > 100 else prediction,
                        "expected": expected[:100] + "..." if len(expected) > 100 else expected,
                        "context": context[:100] + "..." if len(context) > 100 else context
                    })
            
            if not results:
                return self._create_result(
                    error="No successful evaluations completed",
                    start_time=start_time
                )
            
            # Calculate aggregated metrics
            scores = [r["score"] for r in results]
            avg_score = sum(scores) / len(scores)
            
            # Categorize recall levels
            high_recall = sum(1 for score in scores if score >= 0.8)
            medium_recall = sum(1 for score in scores if 0.5 <= score < 0.8)
            low_recall = sum(1 for score in scores if score < 0.5)
            
            details = {
                "individual_results": results,
                "total_evaluations": len(results),
                "recall_distribution": {
                    "high_recall": high_recall,
                    "medium_recall": medium_recall,
                    "low_recall": low_recall
                },
                "recall_rate": high_recall / len(results),
                "total_cost": total_cost,
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Context recall evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        predictions: List[str],
        ground_truth: List[str],
        contexts: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async context recall evaluation."""
        return asyncio.run(self.evaluate_async(predictions, ground_truth, contexts, **kwargs))


# Context Recall utility functions
async def evaluate_context_recall(
    input_text: str,
    output_text: str,
    context: str,
    expected_output: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick context recall evaluation function."""
    client = AdvancedMetricsClient()
    try:
        result = await client.evaluate_single(
            input_text=input_text,
            output_text=output_text,
            metric_type=MetricType.CONTEXT_RECALL,
            context=[context],
            reference=expected_output,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_context_recall_sync(
    input_text: str,
    output_text: str,
    context: str,
    expected_output: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous context recall evaluation function."""
    return asyncio.run(evaluate_context_recall(
        input_text, output_text, context, expected_output, model, trace_id, experiment_id
    ))


# ======================== Conversation Thread Metrics ========================


class ConversationalCoherenceMetric(BaseMetric):
    """
    Conversational Coherence Metric for evaluating the coherence and logical
    flow of a conversation thread between user and assistant.
    
    This metric assesses:
    - Consistency in responses across dialogue turns
    - Logical flow and context maintenance throughout conversation
    - Relevance of each response to the conversation thread
    - Overall coherence of the conversation
    
    Scoring:
    - 0.0: Poor coherence, disjointed conversation
    - 1.0: Excellent coherence, smooth logical flow
    """
    
    def __init__(self, model: Optional[EvaluationModel] = None, **kwargs):
        super().__init__(
            name="conversational_coherence",
            description="LLM-based assessment of conversation coherence and logical flow",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        conversations: List[List[Dict[str, str]]],
        **kwargs
    ) -> MetricResult:
        """
        Evaluate conversational coherence for multiple conversation threads.
        
        Args:
            conversations: List of conversation threads, each containing messages
                          with 'role' and 'content' keys
            **kwargs: Additional arguments passed to the evaluation
        
        Returns:
            MetricResult with aggregated coherence scores and detailed analysis
        """
        start_time = time.time()
        
        if not conversations:
            return self._create_result(
                error="No conversation threads provided",
                start_time=start_time
            )
        
        try:
            results = []
            total_cost = 0.0
            
            # Evaluate each conversation thread
            for i, conversation in enumerate(conversations):
                try:
                    if not conversation or len(conversation) < 2:
                        results.append({
                            "score": 0.0,
                            "reasoning": "Conversation too short for coherence evaluation",
                            "confidence": 1.0,
                            "cost": 0.0,
                            "latency": 0,
                            "conversation_length": len(conversation)
                        })
                        continue
                    
                    # Convert conversation to a single string for evaluation
                    conversation_text = self._format_conversation(conversation)
                    
                    result = await self.metrics_client.evaluate_single(
                        input_text="Evaluate conversation coherence",
                        output_text=conversation_text,
                        metric_type=MetricType.CONVERSATIONAL_COHERENCE,
                        model=self.model
                    )
                    
                    # Extract score and details from result
                    score = result.get("data", {}).get("score", 0.0)
                    reasoning = result.get("data", {}).get("reasoning", "No reasoning provided")
                    confidence = result.get("data", {}).get("confidence", 1.0)
                    cost = result.get("data", {}).get("cost", 0.0)
                    latency = result.get("data", {}).get("latency", 0)
                    
                    total_cost += cost
                    
                    results.append({
                        "score": score,
                        "reasoning": reasoning,
                        "confidence": confidence,
                        "cost": cost,
                        "latency": latency,
                        "conversation_length": len(conversation),
                        "conversation_preview": conversation_text[:200] + "..."
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to evaluate conversational coherence for thread {i}: {e}")
                    results.append({
                        "score": 0.0,
                        "reasoning": f"Evaluation failed: {str(e)}",
                        "confidence": 0.0,
                        "cost": 0.0,
                        "latency": 0,
                        "conversation_length": len(conversation) if conversation else 0,
                        "conversation_preview": "Error processing conversation"
                    })
            
            if not results:
                return self._create_result(
                    error="No successful evaluations completed",
                    start_time=start_time
                )
            
            # Calculate aggregated metrics
            scores = [r["score"] for r in results]
            avg_score = sum(scores) / len(scores)
            
            # Categorize coherence levels
            high_coherence = sum(1 for score in scores if score >= 0.8)
            medium_coherence = sum(1 for score in scores if 0.5 <= score < 0.8)
            low_coherence = sum(1 for score in scores if score < 0.5)
            
            details = {
                "individual_results": results,
                "total_evaluations": len(results),
                "coherence_distribution": {
                    "high_coherence": high_coherence,
                    "medium_coherence": medium_coherence,
                    "low_coherence": low_coherence
                },
                "coherence_rate": high_coherence / len(results),
                "avg_conversation_length": sum(r.get("conversation_length", 0) for r in results) / len(results),
                "total_cost": total_cost,
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Conversational coherence evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        conversations: List[List[Dict[str, str]]],
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async conversational coherence evaluation."""
        return asyncio.run(self.evaluate_async(conversations, **kwargs))
    
    def _format_conversation(self, conversation: List[Dict[str, str]]) -> str:
        """Format conversation thread into a readable string."""
        formatted_lines = []
        for i, message in enumerate(conversation):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            formatted_lines.append(f"Turn {i+1} [{role.title()}]: {content}")
        return "\n".join(formatted_lines)


class SessionCompletenessQuality(BaseMetric):
    """
    Session Completeness Quality Metric for evaluating how thoroughly a conversation
    session addresses the user's intentions and requirements.
    
    This metric assesses:
    - Whether user intentions were identified and addressed
    - Completeness of information provided
    - Resolution of user queries and concerns
    - Overall session effectiveness
    
    Scoring:
    - 0.0: User intentions poorly addressed or ignored
    - 1.0: All user intentions thoroughly addressed
    """
    
    def __init__(self, model: Optional[EvaluationModel] = None, **kwargs):
        super().__init__(
            name="session_completeness_quality",
            description="LLM-based assessment of how thoroughly a session addresses user intentions",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        conversations: List[List[Dict[str, str]]],
        user_intentions: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """
        Evaluate session completeness quality for multiple conversation threads.
        
        Args:
            conversations: List of conversation threads, each containing messages
                          with 'role' and 'content' keys
            user_intentions: Optional list of explicit user intentions for each session
            **kwargs: Additional arguments passed to the evaluation
        
        Returns:
            MetricResult with aggregated completeness scores and detailed analysis
        """
        start_time = time.time()
        
        if not conversations:
            return self._create_result(
                error="No conversation threads provided",
                start_time=start_time
            )
        
        try:
            results = []
            total_cost = 0.0
            
            # Evaluate each conversation thread
            for i, conversation in enumerate(conversations):
                try:
                    if not conversation or len(conversation) < 2:
                        results.append({
                            "score": 0.0,
                            "reasoning": "Conversation too short for completeness evaluation",
                            "confidence": 1.0,
                            "cost": 0.0,
                            "latency": 0,
                            "conversation_length": len(conversation),
                            "user_intention": "Unknown - conversation too short"
                        })
                        continue
                    
                    # Convert conversation to a single string for evaluation
                    conversation_text = self._format_conversation(conversation)
                    
                    # Add user intention context if provided
                    evaluation_input = "Evaluate session completeness quality"
                    if user_intentions and i < len(user_intentions):
                        evaluation_input += f"\nUser Intention: {user_intentions[i]}"
                    
                    result = await self.metrics_client.evaluate_single(
                        input_text=evaluation_input,
                        output_text=conversation_text,
                        metric_type=MetricType.SESSION_COMPLETENESS_QUALITY,
                        model=self.model
                    )
                    
                    # Extract score and details from result
                    score = result.get("data", {}).get("score", 0.0)
                    reasoning = result.get("data", {}).get("reasoning", "No reasoning provided")
                    confidence = result.get("data", {}).get("confidence", 1.0)
                    cost = result.get("data", {}).get("cost", 0.0)
                    latency = result.get("data", {}).get("latency", 0)
                    
                    total_cost += cost
                    
                    results.append({
                        "score": score,
                        "reasoning": reasoning,
                        "confidence": confidence,
                        "cost": cost,
                        "latency": latency,
                        "conversation_length": len(conversation),
                        "user_intention": user_intentions[i] if user_intentions and i < len(user_intentions) else "Not specified",
                        "conversation_preview": conversation_text[:200] + "..."
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to evaluate session completeness for thread {i}: {e}")
                    results.append({
                        "score": 0.0,
                        "reasoning": f"Evaluation failed: {str(e)}",
                        "confidence": 0.0,
                        "cost": 0.0,
                        "latency": 0,
                        "conversation_length": len(conversation) if conversation else 0,
                        "user_intention": user_intentions[i] if user_intentions and i < len(user_intentions) else "Not specified",
                        "conversation_preview": "Error processing conversation"
                    })
            
            if not results:
                return self._create_result(
                    error="No successful evaluations completed",
                    start_time=start_time
                )
            
            # Calculate aggregated metrics
            scores = [r["score"] for r in results]
            avg_score = sum(scores) / len(scores)
            
            # Categorize completeness levels
            high_completeness = sum(1 for score in scores if score >= 0.8)
            medium_completeness = sum(1 for score in scores if 0.5 <= score < 0.8)
            low_completeness = sum(1 for score in scores if score < 0.5)
            
            details = {
                "individual_results": results,
                "total_evaluations": len(results),
                "completeness_distribution": {
                    "high_completeness": high_completeness,
                    "medium_completeness": medium_completeness,
                    "low_completeness": low_completeness
                },
                "completeness_rate": high_completeness / len(results),
                "avg_conversation_length": sum(r.get("conversation_length", 0) for r in results) / len(results),
                "total_cost": total_cost,
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"Session completeness evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        conversations: List[List[Dict[str, str]]],
        user_intentions: Optional[List[str]] = None,
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async session completeness evaluation."""
        return asyncio.run(self.evaluate_async(conversations, user_intentions, **kwargs))
    
    def _format_conversation(self, conversation: List[Dict[str, str]]) -> str:
        """Format conversation thread into a readable string."""
        formatted_lines = []
        for i, message in enumerate(conversation):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            formatted_lines.append(f"Turn {i+1} [{role.title()}]: {content}")
        return "\n".join(formatted_lines)


class UserFrustrationMetric(BaseMetric):
    """
    User Frustration Metric for detecting and evaluating user frustration levels
    during conversation sessions.
    
    This metric assesses:
    - Signs of user confusion or misunderstanding
    - Repeated requests or clarifications
    - Expressions of annoyance or dissatisfaction
    - Escalation patterns in user language
    
    Scoring:
    - 0.0: No frustration detected, smooth interaction
    - 1.0: High frustration detected, poor user experience
    """
    
    def __init__(self, model: Optional[EvaluationModel] = None, **kwargs):
        super().__init__(
            name="user_frustration",
            description="LLM-based detection and assessment of user frustration levels",
            **kwargs
        )
        self.model = model
        self.metrics_client = AdvancedMetricsClient()
    
    async def evaluate_async(
        self,
        conversations: List[List[Dict[str, str]]],
        **kwargs
    ) -> MetricResult:
        """
        Evaluate user frustration levels for multiple conversation threads.
        
        Args:
            conversations: List of conversation threads, each containing messages
                          with 'role' and 'content' keys
            **kwargs: Additional arguments passed to the evaluation
        
        Returns:
            MetricResult with aggregated frustration scores and detailed analysis
        """
        start_time = time.time()
        
        if not conversations:
            return self._create_result(
                error="No conversation threads provided",
                start_time=start_time
            )
        
        try:
            results = []
            total_cost = 0.0
            
            # Evaluate each conversation thread
            for i, conversation in enumerate(conversations):
                try:
                    if not conversation or len(conversation) < 2:
                        results.append({
                            "score": 0.0,
                            "reasoning": "Conversation too short for frustration evaluation",
                            "confidence": 1.0,
                            "cost": 0.0,
                            "latency": 0,
                            "conversation_length": len(conversation),
                            "frustration_indicators": []
                        })
                        continue
                    
                    # Convert conversation to a single string for evaluation
                    conversation_text = self._format_conversation(conversation)
                    
                    result = await self.metrics_client.evaluate_single(
                        input_text="Evaluate user frustration level",
                        output_text=conversation_text,
                        metric_type=MetricType.USER_FRUSTRATION,
                        model=self.model
                    )
                    
                    # Extract score and details from result
                    score = result.get("data", {}).get("score", 0.0)
                    reasoning = result.get("data", {}).get("reasoning", "No reasoning provided")
                    confidence = result.get("data", {}).get("confidence", 1.0)
                    cost = result.get("data", {}).get("cost", 0.0)
                    latency = result.get("data", {}).get("latency", 0)
                    
                    total_cost += cost
                    
                    # Extract frustration indicators from reasoning
                    frustration_indicators = self._extract_frustration_indicators(reasoning)
                    
                    results.append({
                        "score": score,
                        "reasoning": reasoning,
                        "confidence": confidence,
                        "cost": cost,
                        "latency": latency,
                        "conversation_length": len(conversation),
                        "frustration_indicators": frustration_indicators,
                        "conversation_preview": conversation_text[:200] + "..."
                    })
                    
                except Exception as e:
                    logger.warning(f"Failed to evaluate user frustration for thread {i}: {e}")
                    results.append({
                        "score": 0.0,
                        "reasoning": f"Evaluation failed: {str(e)}",
                        "confidence": 0.0,
                        "cost": 0.0,
                        "latency": 0,
                        "conversation_length": len(conversation) if conversation else 0,
                        "frustration_indicators": [],
                        "conversation_preview": "Error processing conversation"
                    })
            
            if not results:
                return self._create_result(
                    error="No successful evaluations completed",
                    start_time=start_time
                )
            
            # Calculate aggregated metrics
            scores = [r["score"] for r in results]
            avg_score = sum(scores) / len(scores)
            
            # Categorize frustration levels
            high_frustration = sum(1 for score in scores if score >= 0.7)
            medium_frustration = sum(1 for score in scores if 0.3 <= score < 0.7)
            low_frustration = sum(1 for score in scores if score < 0.3)
            
            # Collect all frustration indicators
            all_indicators = []
            for result in results:
                all_indicators.extend(result.get("frustration_indicators", []))
            
            details = {
                "individual_results": results,
                "total_evaluations": len(results),
                "frustration_distribution": {
                    "high_frustration": high_frustration,
                    "medium_frustration": medium_frustration,
                    "low_frustration": low_frustration
                },
                "high_frustration_rate": high_frustration / len(results),
                "avg_conversation_length": sum(r.get("conversation_length", 0) for r in results) / len(results),
                "common_frustration_indicators": self._get_common_indicators(all_indicators),
                "total_cost": total_cost,
                "avg_latency": sum(r.get("latency", 0) for r in results) / len(results),
                "model_used": self.model.name if self.model else "default"
            }
            
            return self._create_result(
                value=avg_score,
                details=details,
                start_time=start_time
            )
            
        except Exception as e:
            logger.error(f"User frustration evaluation failed: {e}")
            return self._create_result(error=str(e), start_time=start_time)
        finally:
            await self.metrics_client.close()
    
    def evaluate(
        self,
        conversations: List[List[Dict[str, str]]],
        **kwargs
    ) -> MetricResult:
        """Synchronous wrapper for async user frustration evaluation."""
        return asyncio.run(self.evaluate_async(conversations, **kwargs))
    
    def _format_conversation(self, conversation: List[Dict[str, str]]) -> str:
        """Format conversation thread into a readable string."""
        formatted_lines = []
        for i, message in enumerate(conversation):
            role = message.get("role", "unknown")
            content = message.get("content", "")
            formatted_lines.append(f"Turn {i+1} [{role.title()}]: {content}")
        return "\n".join(formatted_lines)
    
    def _extract_frustration_indicators(self, reasoning: str) -> List[str]:
        """Extract frustration indicators from the evaluation reasoning."""
        indicators = []
        common_patterns = [
            "repeated questions", "confusion", "impatience", "escalation",
            "dissatisfaction", "annoyance", "repetition", "misunderstanding",
            "frustration", "complaint", "demand", "urgency"
        ]
        
        reasoning_lower = reasoning.lower()
        for pattern in common_patterns:
            if pattern in reasoning_lower:
                indicators.append(pattern)
        
        return indicators
    
    def _get_common_indicators(self, all_indicators: List[str]) -> Dict[str, int]:
        """Get frequency count of common frustration indicators."""
        indicator_counts = {}
        for indicator in all_indicators:
            indicator_counts[indicator] = indicator_counts.get(indicator, 0) + 1
        
        # Sort by frequency and return top 5
        sorted_indicators = sorted(indicator_counts.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_indicators[:5])


# ================== Conversation Thread Metrics Utility Functions ==================


async def evaluate_conversational_coherence(
    conversation: List[Dict[str, str]],
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick conversational coherence evaluation function."""
    client = AdvancedMetricsClient()
    try:
        # Format conversation for evaluation
        formatted_conversation = "\n".join([
            f"Turn {i+1} [{msg.get('role', 'unknown').title()}]: {msg.get('content', '')}"
            for i, msg in enumerate(conversation)
        ])
        
        result = await client.evaluate_single(
            input_text="Evaluate conversation coherence",
            output_text=formatted_conversation,
            metric_type=MetricType.CONVERSATIONAL_COHERENCE,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_conversational_coherence_sync(
    conversation: List[Dict[str, str]],
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous conversational coherence evaluation function."""
    return asyncio.run(evaluate_conversational_coherence(
        conversation, model, trace_id, experiment_id
    ))


async def evaluate_session_completeness_quality(
    conversation: List[Dict[str, str]],
    user_intention: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick session completeness quality evaluation function."""
    client = AdvancedMetricsClient()
    try:
        # Format conversation for evaluation
        formatted_conversation = "\n".join([
            f"Turn {i+1} [{msg.get('role', 'unknown').title()}]: {msg.get('content', '')}"
            for i, msg in enumerate(conversation)
        ])
        
        # Add user intention context if provided
        evaluation_input = "Evaluate session completeness quality"
        if user_intention:
            evaluation_input += f"\nUser Intention: {user_intention}"
        
        result = await client.evaluate_single(
            input_text=evaluation_input,
            output_text=formatted_conversation,
            metric_type=MetricType.SESSION_COMPLETENESS_QUALITY,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_session_completeness_quality_sync(
    conversation: List[Dict[str, str]],
    user_intention: Optional[str] = None,
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous session completeness quality evaluation function."""
    return asyncio.run(evaluate_session_completeness_quality(
        conversation, user_intention, model, trace_id, experiment_id
    ))


async def evaluate_user_frustration(
    conversation: List[Dict[str, str]],
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Quick user frustration evaluation function."""
    client = AdvancedMetricsClient()
    try:
        # Format conversation for evaluation
        formatted_conversation = "\n".join([
            f"Turn {i+1} [{msg.get('role', 'unknown').title()}]: {msg.get('content', '')}"
            for i, msg in enumerate(conversation)
        ])
        
        result = await client.evaluate_single(
            input_text="Evaluate user frustration level",
            output_text=formatted_conversation,
            metric_type=MetricType.USER_FRUSTRATION,
            model=model,
            trace_id=trace_id,
            experiment_id=experiment_id
        )
        return result
    finally:
        await client.close()


def evaluate_user_frustration_sync(
    conversation: List[Dict[str, str]],
    model: Optional[EvaluationModel] = None,
    trace_id: Optional[str] = None,
    experiment_id: Optional[str] = None
) -> Dict[str, Any]:
    """Synchronous user frustration evaluation function."""
    return asyncio.run(evaluate_user_frustration(
        conversation, model, trace_id, experiment_id
    ))