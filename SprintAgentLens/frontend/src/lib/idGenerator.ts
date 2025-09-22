/**
 * Centralized ID Generation Utility
 * 
 * Provides consistent, unique ID generation for all entities in the Agent Lens system.
 * Uses timestamp + random string pattern for guaranteed uniqueness and sortability.
 */

/**
 * Generate a unique ID with a given prefix
 * @param prefix - The prefix for the ID (e.g., 'trace', 'span', 'conv')
 * @param randomLength - Length of the random suffix (default: 8)
 * @returns Unique ID in format: prefix_timestamp_randomString
 */
function generateId(prefix: string, randomLength: number = 8): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 2 + randomLength)
  return `${prefix}_${timestamp}_${randomSuffix}`
}

/**
 * Generate a trace ID
 * @returns Unique trace ID in format: trace_timestamp_randomString
 */
export function generateTraceId(): string {
  return generateId('trace', 8)
}

/**
 * Generate a span ID
 * @returns Unique span ID in format: span_timestamp_randomString
 */
export function generateSpanId(): string {
  return generateId('span', 8)
}

/**
 * Generate a conversation ID
 * @returns Unique conversation ID in format: conv_timestamp_randomString
 */
export function generateConversationId(): string {
  return generateId('conv', 8)
}

/**
 * Generate a run ID
 * @returns Unique run ID in format: run_timestamp_randomString
 */
export function generateRunId(): string {
  return generateId('run', 8)
}

/**
 * Generate a project ID
 * @returns Unique project ID in format: project-timestamp
 */
export function generateProjectId(): string {
  return `project-${Date.now()}`
}

/**
 * Generate an agent ID
 * @param agentType - Type/role of the agent (optional)
 * @returns Unique agent ID in format: agent_type_randomString
 */
export function generateAgentId(agentType?: string): string {
  const typePrefix = agentType ? agentType.toLowerCase().substring(0, 8) : 'agent'
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  return `agent_${typePrefix}_${randomSuffix}`
}

/**
 * Generate a distributed trace ID
 * @returns Unique distributed trace ID in format: dtrace_timestamp_randomString
 */
export function generateDistributedTraceId(): string {
  return generateId('dtrace', 8)
}

/**
 * Generate a distributed span ID
 * @returns Unique distributed span ID in format: dspan_timestamp_randomString
 */
export function generateDistributedSpanId(): string {
  return generateId('dspan', 8)
}

/**
 * Generate an A2A communication ID
 * @returns Unique A2A communication ID in format: a2a_timestamp_randomString
 */
export function generateA2AId(): string {
  return generateId('a2a', 8)
}

/**
 * Generate a metric ID
 * @returns Unique metric ID in format: metric_timestamp_randomString
 */
export function generateMetricId(): string {
  return generateId('metric', 8)
}

/**
 * Generate an experiment ID
 * @returns Unique experiment ID in format: exp_timestamp_randomString
 */
export function generateExperimentId(): string {
  return generateId('exp', 8)
}

/**
 * Generate an execution ID
 * @returns Unique execution ID in format: exec_timestamp_randomString
 */
export function generateExecutionId(): string {
  return generateId('exec', 8)
}

/**
 * Generate a department ID
 * @returns Unique department ID in format: dept-timestamp
 */
export function generateDepartmentId(): string {
  return `dept-${Date.now()}`
}

/**
 * Generate a priority ID
 * @returns Unique priority ID in format: priority-timestamp
 */
export function generatePriorityId(): string {
  return `priority-${Date.now()}`
}

/**
 * Validate if an ID follows the expected format
 * @param id - The ID to validate
 * @param expectedPrefix - The expected prefix
 * @returns True if the ID is valid
 */
export function validateId(id: string, expectedPrefix: string): boolean {
  const pattern = new RegExp(`^${expectedPrefix}_\\d+_[a-z0-9]+$`)
  return pattern.test(id)
}

/**
 * Extract timestamp from a generated ID
 * @param id - The ID to extract timestamp from
 * @returns Timestamp as Date object or null if invalid
 */
export function extractTimestamp(id: string): Date | null {
  const parts = id.split('_')
  if (parts.length >= 2) {
    const timestamp = parseInt(parts[1])
    if (!isNaN(timestamp)) {
      return new Date(timestamp)
    }
  }
  return null
}

/**
 * Generate a hierarchical span ID that includes parent information
 * @param parentSpanId - The parent span ID
 * @param childIndex - Index of this child span (optional)
 * @returns Hierarchical span ID
 */
export function generateChildSpanId(parentSpanId: string, childIndex?: number): string {
  const baseId = generateSpanId()
  const suffix = childIndex !== undefined ? `.${childIndex}` : ''
  return `${baseId}${suffix}`
}

/**
 * Utility object with all ID generators for easy import
 */
export const IdGenerator = {
  trace: generateTraceId,
  span: generateSpanId,
  conversation: generateConversationId,
  run: generateRunId,
  project: generateProjectId,
  agent: generateAgentId,
  distributedTrace: generateDistributedTraceId,
  distributedSpan: generateDistributedSpanId,
  a2a: generateA2AId,
  metric: generateMetricId,
  experiment: generateExperimentId,
  execution: generateExecutionId,
  department: generateDepartmentId,
  priority: generatePriorityId,
  childSpan: generateChildSpanId,
  validate: validateId,
  extractTimestamp: extractTimestamp
}

export default IdGenerator