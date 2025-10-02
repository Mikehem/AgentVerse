# Opik Metrics Integration Design Document

## Executive Summary

This document outlines the comprehensive integration of Comet Opik's evaluation metrics, particularly hallucination detection, into the Sprint Lens ecosystem. The integration will span backend APIs, SDK enhancements, and frontend UI components to provide enterprise-grade LLM evaluation capabilities.

## Project Scope & Integration Points

### Current Sprint Lens Architecture Analysis

**Existing Components:**
- **Backend**: Next.js API routes with SQLite database
- **SDK**: Comprehensive Python SDK with evaluation framework
- **Frontend**: React-based dashboard with experiment management
- **Database Schema**: Projects → Experiments → Metrics structure
- **Evaluation Framework**: Existing metrics system with BaseMetric interface

**Integration Targets:**
1. **Project Level**: Metric configuration and reporting
2. **Experiment Level**: Evaluation execution and results storage
3. **Trace Level**: Real-time metric computation
4. **SDK Level**: Python client for seamless integration

## Detailed Feature Specification

### 1. Core Opik Metrics Integration

#### 1.1 Hallucination Detection
**Opik Capability:**
- Binary scoring (0 = no hallucination, 1 = hallucination detected)
- LLM-as-a-Judge approach with GPT-4o default
- Context-aware evaluation with detailed reasoning

**Sprint Lens Integration:**
```python
# SDK Usage
from sprintlens.evaluation.metrics import OpikHallucinationMetric

metric = OpikHallucinationMetric(
    model="gpt-4o",  # Configurable evaluation model
    api_key="...",   # OpenAI/provider API key
    custom_prompt=None  # Optional custom evaluation prompt
)

result = metric.evaluate(
    input="What is the capital of France?",
    output="The capital of France is Paris. It has a population of 50 million.",
    context=["France's capital is Paris with ~2.1M people in the city proper."]
)
```

#### 1.2 Additional Opik Metrics
**Comprehensive Metric Suite:**

1. **Heuristic Metrics** (Deterministic)
   - `OpikEqualsMetric`: Exact string matching
   - `OpikContainsMetric`: Substring presence validation
   - `OpikRegexMetric`: Pattern matching validation
   - `OpikJsonValidationMetric`: JSON format validation
   - `OpikLevenshteinMetric`: String distance calculation

2. **LLM-as-Judge Metrics** (AI-Powered)
   - `OpikHallucinationMetric`: Fabricated information detection
   - `OpikRelevanceMetric`: Output relevance assessment
   - `OpikModerationMetric`: Harmful content detection
   - `OpikUsefulnessMetric`: Output utility evaluation
   - `OpikContextRecallMetric`: Context utilization measurement
   - `OpikContextPrecisionMetric`: Context accuracy assessment
   - `OpikCoherenceMetric`: Response coherence evaluation
   - `OpikCompletenessMetric`: Response completeness analysis

### 2. Backend API Architecture

#### 2.1 Database Schema Extensions

```sql
-- Enhanced metrics table for Opik integration
ALTER TABLE metrics ADD COLUMN metric_type VARCHAR(50); -- 'opik_hallucination', 'opik_relevance', etc.
ALTER TABLE metrics ADD COLUMN evaluation_model VARCHAR(100); -- 'gpt-4o', 'claude-3', etc.
ALTER TABLE metrics ADD COLUMN context_data TEXT; -- JSON array of context strings
ALTER TABLE metrics ADD COLUMN reasoning TEXT; -- LLM explanation of evaluation
ALTER TABLE metrics ADD COLUMN confidence_score REAL; -- Confidence in evaluation (0-1)
ALTER TABLE metrics ADD COLUMN evaluation_cost REAL; -- Cost of metric evaluation
ALTER TABLE metrics ADD COLUMN evaluation_latency INTEGER; -- Evaluation time in ms

-- Opik-specific configuration table
CREATE TABLE opik_configs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    model_name TEXT NOT NULL,
    api_key_encrypted TEXT,
    custom_prompt TEXT,
    threshold REAL,
    enabled BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Batch evaluation jobs for async processing
CREATE TABLE evaluation_jobs (
    id TEXT PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    metric_types TEXT, -- JSON array of metric types
    status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    total_items INTEGER,
    processed_items INTEGER DEFAULT 0,
    results TEXT, -- JSON results
    error_message TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);
```

#### 2.2 API Endpoints

```typescript
// /api/v1/metrics/opik/configure
POST /api/v1/metrics/opik/configure
{
  "project_id": "string",
  "metric_configs": [
    {
      "metric_type": "hallucination",
      "model_name": "gpt-4o",
      "api_key": "string",
      "threshold": 0.5,
      "custom_prompt": "string?",
      "enabled": true
    }
  ]
}

// /api/v1/metrics/opik/evaluate
POST /api/v1/metrics/opik/evaluate
{
  "metric_type": "hallucination",
  "input": "string",
  "output": "string", 
  "context": ["string"],
  "model_override": "string?",
  "trace_id": "string?",
  "experiment_id": "string?"
}

// /api/v1/experiments/{id}/evaluate
POST /api/v1/experiments/{experimentId}/evaluate
{
  "metric_types": ["hallucination", "relevance"],
  "dataset_id": "string",
  "batch_size": 10,
  "async": true
}

// /api/v1/experiments/{id}/metrics/opik
GET /api/v1/experiments/{experimentId}/metrics/opik
// Returns aggregated Opik metric results with trend analysis
```

#### 2.3 Evaluation Service Architecture

```typescript
// services/opikEvaluationService.ts
export class OpikEvaluationService {
  async evaluateHallucination(params: {
    input: string;
    output: string;
    context: string[];
    model?: string;
    projectId: string;
  }): Promise<OpikMetricResult>;

  async batchEvaluate(params: {
    experimentId: string;
    metricTypes: string[];
    datasetId: string;
    batchSize?: number;
  }): Promise<EvaluationJob>;

  async getEvaluationJob(jobId: string): Promise<EvaluationJob>;
  
  private async callOpikAPI(params: any): Promise<any>;
  private async storeMericResult(result: OpikMetricResult): Promise<void>;
}
```

### 3. SDK Enhancements

#### 3.1 New Metric Classes

```python
# src/sprintlens/evaluation/metrics/opik_metrics.py

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from ..metrics import BaseMetric, MetricResult

class OpikBaseMetric(BaseMetric):
    """Base class for all Opik-powered metrics."""
    
    def __init__(
        self,
        model: str = "gpt-4o",
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        custom_prompt: Optional[str] = None,
        temperature: float = 0.0,
        max_tokens: int = 1000,
        timeout: int = 30
    ):
        super().__init__()
        self.model = model
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.api_base = api_base
        self.custom_prompt = custom_prompt
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.timeout = timeout
        
    @abstractmethod
    def _get_system_prompt(self) -> str:
        """Get the system prompt for this metric."""
        pass
        
    @abstractmethod
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """Parse the LLM response into structured result."""
        pass

class OpikHallucinationMetric(OpikBaseMetric):
    """
    Detects hallucination in LLM outputs using Opik's methodology.
    
    Binary classification: 0 (no hallucination) or 1 (hallucination detected)
    """
    
    def _get_system_prompt(self) -> str:
        if self.custom_prompt:
            return self.custom_prompt
            
        return """You are an expert evaluator assessing whether an AI response contains hallucinated information.

        Evaluation Criteria:
        1. Check if the output introduces information not present in the context
        2. Verify the output doesn't contradict the context or well-established facts
        3. Assess accuracy of entities, attributes, and relationships
        4. Consider partial hallucinations as positive cases

        Response Format:
        {
          "score": 0 or 1,
          "reasoning": "Detailed explanation of the evaluation",
          "confidence": 0.0 to 1.0
        }"""

    def evaluate(
        self,
        input: str,
        output: str,
        context: List[str],
        reference: Optional[str] = None
    ) -> MetricResult:
        """
        Evaluate hallucination in the given output.
        
        Args:
            input: The original query/prompt
            output: The AI-generated response to evaluate
            context: List of context documents/passages
            reference: Optional reference answer
            
        Returns:
            MetricResult with score, reasoning, and metadata
        """
        prompt = self._construct_evaluation_prompt(input, output, context)
        
        try:
            response = self._call_llm(prompt)
            parsed = self._parse_response(response)
            
            return MetricResult(
                metric_name="opik_hallucination",
                score=parsed["score"],
                reasoning=parsed["reasoning"],
                confidence=parsed.get("confidence", 1.0),
                metadata={
                    "model": self.model,
                    "context_length": len(context),
                    "output_length": len(output),
                    "evaluation_prompt": prompt
                }
            )
        except Exception as e:
            return MetricResult(
                metric_name="opik_hallucination",
                score=None,
                error=str(e),
                metadata={"model": self.model}
            )

class OpikRelevanceMetric(OpikBaseMetric):
    """Evaluates relevance of output to the input query."""
    # Implementation details...

class OpikModerationMetric(OpikBaseMetric):
    """Detects harmful, toxic, or inappropriate content."""
    # Implementation details...
```

#### 3.2 Batch Evaluation Integration

```python
# src/sprintlens/evaluation/batch_opik.py

from typing import List, Dict, Any
from .batch import BatchEvaluator
from .metrics.opik_metrics import OpikHallucinationMetric, OpikRelevanceMetric

class OpikBatchEvaluator(BatchEvaluator):
    """Specialized batch evaluator for Opik metrics with optimizations."""
    
    def __init__(
        self,
        metrics: List[OpikBaseMetric],
        concurrency: int = 5,
        rate_limit: int = 60,  # requests per minute
        cost_tracking: bool = True
    ):
        super().__init__(metrics)
        self.concurrency = concurrency
        self.rate_limit = rate_limit
        self.cost_tracking = cost_tracking
        
    async def evaluate_experiment(
        self,
        experiment_id: str,
        dataset_id: str,
        progress_callback: Optional[Callable] = None
    ) -> Dict[str, Any]:
        """
        Evaluate an entire experiment using Opik metrics.
        
        Returns:
            {
                "experiment_id": str,
                "total_items": int,
                "results": List[Dict],
                "summary": {
                    "hallucination_rate": float,
                    "avg_relevance": float,
                    "total_cost": float,
                    "avg_latency": float
                }
            }
        """
        # Implementation with async processing, rate limiting, and cost tracking
```

#### 3.3 Integration with Existing Framework

```python
# Enhanced evaluation framework integration
from sprintlens.evaluation import Evaluator
from sprintlens.evaluation.metrics import OpikHallucinationMetric, OpikRelevanceMetric

# Seamless integration with existing evaluation workflow
evaluator = Evaluator(
    metrics=[
        OpikHallucinationMetric(model="gpt-4o"),
        OpikRelevanceMetric(model="claude-3-sonnet"),
        # Mix with existing metrics
        AccuracyMetric(),
        F1Metric()
    ]
)

# Automatic Sprint Lens backend integration
evaluator.configure_backend(
    url="http://localhost:3001",
    project_id="proj_123",
    experiment_id="exp_456"
)

results = evaluator.evaluate_dataset(dataset_id="dataset_789")
```

### 4. Frontend UI Components

#### 4.1 Metrics Configuration Dashboard

```typescript
// components/metrics/OpikMetricsConfig.tsx
interface OpikMetricsConfigProps {
  projectId: string;
  onConfigSave: (config: OpikConfig[]) => void;
}

export function OpikMetricsConfig({ projectId, onConfigSave }: OpikMetricsConfigProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900">
            Opik Evaluation Metrics Configuration
          </h3>
          
          {/* Hallucination Detection */}
          <MetricConfigCard
            title="Hallucination Detection"
            description="Detect fabricated or inaccurate information in AI responses"
            metricType="hallucination"
            defaultModel="gpt-4o"
            supportedModels={["gpt-4o", "gpt-4", "claude-3-sonnet"]}
          />
          
          {/* Relevance Assessment */}
          <MetricConfigCard
            title="Relevance Assessment"
            description="Evaluate how relevant the response is to the input query"
            metricType="relevance"
            defaultModel="gpt-4o"
          />
          
          {/* Content Moderation */}
          <MetricConfigCard
            title="Content Moderation"
            description="Detect harmful, toxic, or inappropriate content"
            metricType="moderation"
            defaultModel="gpt-4o"
          />
        </div>
      </div>
    </div>
  );
}
```

#### 4.2 Real-time Metrics Dashboard

```typescript
// components/experiments/OpikMetricsDashboard.tsx
export function OpikMetricsDashboard({ experimentId }: { experimentId: string }) {
  const { data: metrics, isLoading } = useOpikMetrics(experimentId);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Hallucination Rate Card */}
      <MetricCard
        title="Hallucination Rate"
        value={`${(metrics?.hallucination_rate * 100)?.toFixed(1)}%`}
        trend={metrics?.hallucination_trend}
        color={metrics?.hallucination_rate > 0.1 ? "red" : "green"}
        icon={<ExclamationTriangleIcon />}
      />
      
      {/* Relevance Score Card */}
      <MetricCard
        title="Avg Relevance Score"
        value={metrics?.avg_relevance?.toFixed(2)}
        trend={metrics?.relevance_trend}
        color="blue"
        icon={<CheckCircleIcon />}
      />
      
      {/* Content Safety Card */}
      <MetricCard
        title="Content Safety"
        value={`${((1 - metrics?.toxicity_rate) * 100)?.toFixed(1)}%`}
        trend={metrics?.safety_trend}
        color={metrics?.toxicity_rate > 0.05 ? "orange" : "green"}
        icon={<ShieldCheckIcon />}
      />
      
      {/* Detailed Results Table */}
      <div className="col-span-full">
        <OpikMetricsTable data={metrics?.detailed_results} />
      </div>
    </div>
  );
}
```

#### 4.3 Experiment Evaluation Interface

```typescript
// components/experiments/ExperimentEvaluation.tsx
export function ExperimentEvaluation({ experiment }: { experiment: Experiment }) {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [evaluationJob, setEvaluationJob] = useState<EvaluationJob | null>(null);
  
  const handleStartEvaluation = async () => {
    const job = await api.post(`/api/v1/experiments/${experiment.id}/evaluate`, {
      metric_types: selectedMetrics,
      dataset_id: experiment.dataset_id,
      batch_size: 10,
      async: true
    });
    setEvaluationJob(job.data);
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium mb-4">Run Opik Evaluation</h3>
        
        <OpikMetricsSelector
          selectedMetrics={selectedMetrics}
          onSelectionChange={setSelectedMetrics}
          projectConfig={experiment.project.opik_config}
        />
        
        <div className="mt-4">
          <Button
            onClick={handleStartEvaluation}
            disabled={selectedMetrics.length === 0 || evaluationJob?.status === 'running'}
            className="bg-blue-600 text-white"
          >
            {evaluationJob?.status === 'running' ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Evaluating... ({evaluationJob.processed_items}/{evaluationJob.total_items})
              </>
            ) : (
              'Start Evaluation'
            )}
          </Button>
        </div>
        
        {evaluationJob && (
          <EvaluationJobStatus job={evaluationJob} />
        )}
      </div>
    </div>
  );
}
```

### 5. Enterprise Features

#### 5.1 Cost Management & Optimization

```python
# Cost tracking and optimization
class OpikCostManager:
    def __init__(self, budget_limit: float = None):
        self.budget_limit = budget_limit
        self.current_spend = 0.0
        
    def estimate_evaluation_cost(
        self,
        metric_types: List[str],
        dataset_size: int,
        model: str = "gpt-4o"
    ) -> float:
        """Estimate cost before running evaluation."""
        # Cost calculation based on model pricing and dataset size
        
    def track_evaluation_cost(self, result: MetricResult) -> None:
        """Track actual cost after evaluation."""
        
    def optimize_batch_size(self, available_budget: float) -> int:
        """Recommend optimal batch size for given budget."""
```

#### 5.2 Advanced Analytics & Reporting

```python
# Advanced analytics for Opik metrics
class OpikAnalytics:
    def generate_hallucination_report(
        self,
        experiment_ids: List[str],
        time_range: Tuple[datetime, datetime]
    ) -> Dict[str, Any]:
        """
        Generate comprehensive hallucination analysis report.
        
        Returns:
            {
                "overall_rate": float,
                "trend_analysis": Dict,
                "pattern_analysis": Dict,
                "recommendations": List[str]
            }
        """
        
    def compare_experiments(
        self,
        experiment_ids: List[str],
        metrics: List[str] = ["hallucination", "relevance"]
    ) -> Dict[str, Any]:
        """Compare Opik metrics across multiple experiments."""
        
    def generate_model_comparison(
        self,
        models: List[str],
        metric_type: str = "hallucination"
    ) -> Dict[str, Any]:
        """Compare performance of different evaluation models."""
```

#### 5.3 Integration with External Systems

```python
# Slack/Teams integration for alerts
class OpikAlertManager:
    def setup_hallucination_alerts(
        self,
        threshold: float = 0.15,
        channels: List[str] = None
    ) -> None:
        """Send alerts when hallucination rate exceeds threshold."""
        
    def setup_evaluation_reports(
        self,
        schedule: str = "daily",
        recipients: List[str] = None
    ) -> None:
        """Schedule automated evaluation reports."""

# Weights & Biases integration
class OpikWandbIntegration:
    def log_metrics_to_wandb(
        self,
        experiment_id: str,
        run_name: str = None
    ) -> None:
        """Log Opik metrics to Weights & Biases."""
```

### 6. Implementation Roadmap

#### Phase 1: Core Backend Integration (Week 1-2)
- [ ] Database schema updates
- [ ] Basic Opik API integration service
- [ ] Hallucination metric endpoint
- [ ] Configuration management API

#### Phase 2: SDK Development (Week 2-3)
- [ ] OpikBaseMetric implementation
- [ ] OpikHallucinationMetric class
- [ ] Batch evaluation framework
- [ ] Error handling and retry logic

#### Phase 3: Frontend Components (Week 3-4)
- [ ] Metrics configuration dashboard
- [ ] Real-time metrics display
- [ ] Experiment evaluation interface
- [ ] Results visualization

#### Phase 4: Advanced Features (Week 4-5)
- [ ] Additional Opik metrics (relevance, moderation)
- [ ] Cost tracking and optimization
- [ ] Analytics and reporting
- [ ] Alert system integration

#### Phase 5: Enterprise Features (Week 5-6)
- [ ] Multi-model support
- [ ] Custom prompt templates
- [ ] Advanced analytics dashboard
- [ ] External integrations (Slack, W&B)

### 7. Technical Considerations

#### 7.1 Security & Privacy
- **API Key Management**: Encrypted storage of evaluation model API keys
- **Data Privacy**: Optional on-premise evaluation model deployment
- **Audit Logging**: Comprehensive logging of all evaluation activities
- **Access Control**: Role-based access to metric configuration and results

#### 7.2 Performance & Scalability
- **Async Processing**: Background job processing for large-scale evaluations
- **Rate Limiting**: Respect API limits of evaluation model providers
- **Caching**: Cache evaluation results to avoid redundant API calls
- **Batch Optimization**: Dynamic batch sizing based on API limits and costs

#### 7.3 Reliability & Monitoring
- **Error Handling**: Graceful handling of API failures and timeouts
- **Retry Logic**: Exponential backoff for transient failures
- **Health Checks**: Monitor evaluation service health and model availability
- **Performance Metrics**: Track evaluation latency and success rates

### 8. Success Metrics

#### 8.1 Adoption Metrics
- Number of projects using Opik metrics
- Volume of evaluations performed daily/weekly
- User engagement with metrics dashboards

#### 8.2 Quality Metrics
- Accuracy of hallucination detection vs manual review
- Correlation between Opik scores and business outcomes
- User satisfaction with evaluation insights

#### 8.3 Operational Metrics
- Evaluation latency (target: <30 seconds for single evaluation)
- Cost per evaluation (target: <$0.10 for hallucination detection)
- System uptime and reliability (target: 99.9%)

## Conclusion

This comprehensive integration of Opik metrics into Sprint Lens will provide enterprise customers with state-of-the-art LLM evaluation capabilities. The phased implementation approach ensures we can deliver value incrementally while building toward a robust, scalable solution that seamlessly integrates with existing workflows.

The combination of real-time evaluation, batch processing, cost optimization, and enterprise features positions Sprint Lens as a leading platform for responsible AI deployment and monitoring.