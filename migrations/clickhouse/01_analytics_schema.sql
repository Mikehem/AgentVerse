-- ClickHouse analytics schema for real-time metrics and observability

-- Agent performance metrics
CREATE TABLE agent_metrics (
    timestamp DateTime64(3) DEFAULT now64(),
    project_id String,
    agent_id String,
    agent_name String,
    
    -- Performance metrics
    response_time_ms UInt32,
    token_count UInt32,
    cost_usd Float64,
    success Boolean,
    
    -- Request details
    model_name String,
    input_tokens UInt32,
    output_tokens UInt32,
    
    -- Metadata
    conversation_id String,
    trace_id String,
    span_id String,
    
    -- Dimensions for analysis
    hour UInt8 DEFAULT toHour(timestamp),
    day UInt8 DEFAULT toDayOfMonth(timestamp),
    month UInt8 DEFAULT toMonth(timestamp),
    year UInt16 DEFAULT toYear(timestamp),
    weekday UInt8 DEFAULT toDayOfWeek(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, agent_id, timestamp)
TTL timestamp + INTERVAL 1 YEAR;

-- Conversation analytics
CREATE TABLE conversation_metrics (
    timestamp DateTime64(3) DEFAULT now64(),
    project_id String,
    agent_id String,
    conversation_id String,
    
    -- Conversation metrics
    input_length UInt32,
    output_length UInt32,
    response_time_ms UInt32,
    satisfaction_score Nullable(Float32),
    
    -- Cost tracking
    total_cost Float64,
    model_name String,
    
    -- User interaction
    user_id String DEFAULT '',
    session_id String DEFAULT '',
    
    -- Classification
    intent String DEFAULT '',
    category String DEFAULT '',
    
    -- Time dimensions
    hour UInt8 DEFAULT toHour(timestamp),
    day UInt8 DEFAULT toDayOfMonth(timestamp),
    month UInt8 DEFAULT toMonth(timestamp),
    year UInt16 DEFAULT toYear(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, timestamp, conversation_id)
TTL timestamp + INTERVAL 1 YEAR;

-- Evaluation results analytics
CREATE TABLE evaluation_analytics (
    timestamp DateTime64(3) DEFAULT now64(),
    project_id String,
    evaluation_id String,
    evaluation_name String,
    run_id String,
    
    -- Dataset information
    dataset_id String,
    dataset_name String,
    item_id String,
    
    -- Metric results
    metric_id String,
    metric_name String,
    metric_type String,
    score Float64,
    passed Boolean,
    execution_time_ms UInt32,
    
    -- Aggregation helpers
    hour UInt8 DEFAULT toHour(timestamp),
    day UInt8 DEFAULT toDayOfMonth(timestamp),
    month UInt8 DEFAULT toMonth(timestamp),
    year UInt16 DEFAULT toYear(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, evaluation_id, timestamp)
TTL timestamp + INTERVAL 2 YEARS;

-- Cost analytics aggregated by day
CREATE TABLE daily_cost_summary (
    date Date,
    project_id String,
    agent_id String,
    model_name String,
    
    -- Cost metrics
    total_cost Float64,
    input_tokens UInt64,
    output_tokens UInt64,
    total_tokens UInt64,
    request_count UInt32,
    
    -- Performance
    avg_response_time Float64,
    success_rate Float64,
    
    -- Updated timestamp
    updated_at DateTime64(3) DEFAULT now64()
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, project_id, agent_id, model_name)
TTL date + INTERVAL 2 YEARS;

-- Real-time dashboard materialized views
CREATE MATERIALIZED VIEW agent_performance_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_timestamp)
ORDER BY (hour_timestamp, project_id, agent_id)
AS SELECT
    toStartOfHour(timestamp) as hour_timestamp,
    project_id,
    agent_id,
    agent_name,
    
    -- Aggregated metrics
    count() as request_count,
    avg(response_time_ms) as avg_response_time,
    sum(cost_usd) as total_cost,
    sum(token_count) as total_tokens,
    countIf(success) / count() as success_rate,
    
    -- Performance percentiles
    quantile(0.5)(response_time_ms) as p50_response_time,
    quantile(0.95)(response_time_ms) as p95_response_time,
    quantile(0.99)(response_time_ms) as p99_response_time
FROM agent_metrics
GROUP BY hour_timestamp, project_id, agent_id, agent_name;

-- Evaluation success rate by metric type
CREATE MATERIALIZED VIEW evaluation_success_by_metric
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, project_id, metric_type)
AS SELECT
    toDate(timestamp) as date,
    project_id,
    metric_type,
    
    -- Success metrics
    count() as total_evaluations,
    countIf(passed) as passed_evaluations,
    countIf(passed) / count() as pass_rate,
    avg(score) as avg_score,
    avg(execution_time_ms) as avg_execution_time
FROM evaluation_analytics
GROUP BY date, project_id, metric_type;

-- Cost trending by project and model
CREATE MATERIALIZED VIEW cost_trends_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, project_id, model_name)
AS SELECT
    toDate(timestamp) as date,
    project_id,
    model_name,
    
    -- Cost breakdown
    sum(cost_usd) as total_cost,
    sum(input_tokens) as total_input_tokens,
    sum(output_tokens) as total_output_tokens,
    count() as request_count,
    
    -- Efficiency metrics
    sum(cost_usd) / count() as cost_per_request,
    sum(token_count) / count() as tokens_per_request
FROM agent_metrics
GROUP BY date, project_id, model_name;

-- Functions for analytics queries
-- Get top performing agents by success rate
CREATE OR REPLACE FUNCTION getTopAgentsBySuccessRate(project_id_param String, days_back UInt32)
RETURNS TABLE (
    agent_id String,
    agent_name String,
    success_rate Float64,
    total_requests UInt64,
    avg_response_time Float64
)
AS $$
SELECT 
    agent_id,
    any(agent_name) as agent_name,
    countIf(success) / count() as success_rate,
    count() as total_requests,
    avg(response_time_ms) as avg_response_time
FROM agent_metrics 
WHERE project_id = project_id_param 
    AND timestamp >= now() - INTERVAL days_back DAY
GROUP BY agent_id
HAVING total_requests >= 10
ORDER BY success_rate DESC
LIMIT 10
$$;

-- Get cost analysis by time period
CREATE OR REPLACE FUNCTION getCostAnalysis(project_id_param String, start_date Date, end_date Date)
RETURNS TABLE (
    date Date,
    total_cost Float64,
    request_count UInt64,
    cost_per_request Float64,
    top_model String
)
AS $$
SELECT 
    toDate(timestamp) as date,
    sum(cost_usd) as total_cost,
    count() as request_count,
    sum(cost_usd) / count() as cost_per_request,
    topK(1)(model_name)[1] as top_model
FROM agent_metrics 
WHERE project_id = project_id_param 
    AND toDate(timestamp) BETWEEN start_date AND end_date
GROUP BY date
ORDER BY date
$$;

-- Create users and permissions
CREATE USER IF NOT EXISTS 'sprintlens_analytics' IDENTIFIED BY 'analytics_password';
GRANT SELECT ON sprintlens_analytics.* TO 'sprintlens_analytics';

CREATE USER IF NOT EXISTS 'sprintlens_writer' IDENTIFIED BY 'writer_password';
GRANT INSERT, SELECT ON sprintlens_analytics.* TO 'sprintlens_writer';