// Cost calculation service for AI providers and models
// Based on Opik cost tracking specifications

export interface TokenUsage {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
}

export interface ModelConfig {
  inputCostPer1k: number
  outputCostPer1k: number
  provider: string
  modelFamily?: string
}

export interface CostCalculationResult {
  inputCost: number
  outputCost: number
  totalCost: number
  provider: string
  model: string
  currency: 'USD'
}

// Comprehensive model pricing database
const MODEL_PRICING: Record<string, ModelConfig> = {
  // OpenAI Models
  'gpt-4': {
    inputCostPer1k: 0.03,
    outputCostPer1k: 0.06,
    provider: 'openai',
    modelFamily: 'gpt-4'
  },
  'gpt-4-turbo': {
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
    provider: 'openai',
    modelFamily: 'gpt-4'
  },
  'gpt-4o': {
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    provider: 'openai',
    modelFamily: 'gpt-4'
  },
  'gpt-4o-mini': {
    inputCostPer1k: 0.00015,
    outputCostPer1k: 0.0006,
    provider: 'openai',
    modelFamily: 'gpt-4'
  },
  'gpt-3.5-turbo': {
    inputCostPer1k: 0.0015,
    outputCostPer1k: 0.002,
    provider: 'openai',
    modelFamily: 'gpt-3.5'
  },
  'text-embedding-3-small': {
    inputCostPer1k: 0.00002,
    outputCostPer1k: 0,
    provider: 'openai',
    modelFamily: 'embedding'
  },
  'text-embedding-3-large': {
    inputCostPer1k: 0.00013,
    outputCostPer1k: 0,
    provider: 'openai',
    modelFamily: 'embedding'
  },

  // Azure OpenAI Models (typically same pricing as OpenAI)
  'msgen4o': {
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
    provider: 'azure_openai',
    modelFamily: 'gpt-4'
  },
  'gpt-4-32k': {
    inputCostPer1k: 0.06,
    outputCostPer1k: 0.12,
    provider: 'azure_openai',
    modelFamily: 'gpt-4'
  },

  // Anthropic Models
  'claude-3-5-sonnet-20241022': {
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    provider: 'anthropic',
    modelFamily: 'claude-3.5'
  },
  'claude-3-5-haiku-20241022': {
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.005,
    provider: 'anthropic',
    modelFamily: 'claude-3.5'
  },
  'claude-3-opus-20240229': {
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    provider: 'anthropic',
    modelFamily: 'claude-3'
  },
  'claude-3-sonnet-20240229': {
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    provider: 'anthropic',
    modelFamily: 'claude-3'
  },
  'claude-3-haiku-20240307': {
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    provider: 'anthropic',
    modelFamily: 'claude-3'
  },

  // Google AI Models
  'gemini-1.5-pro': {
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
    provider: 'google_ai',
    modelFamily: 'gemini-1.5'
  },
  'gemini-1.5-flash': {
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
    provider: 'google_ai',
    modelFamily: 'gemini-1.5'
  },
  'gemini-1.0-pro': {
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.0015,
    provider: 'google_ai',
    modelFamily: 'gemini-1.0'
  },

  // AWS Bedrock Models
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
    provider: 'aws_bedrock',
    modelFamily: 'claude-3.5'
  },
  'anthropic.claude-3-haiku-20240307-v1:0': {
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.00125,
    provider: 'aws_bedrock',
    modelFamily: 'claude-3'
  },
  'amazon.titan-text-express-v1': {
    inputCostPer1k: 0.0008,
    outputCostPer1k: 0.0016,
    provider: 'aws_bedrock',
    modelFamily: 'titan'
  },

  // Groq Models
  'llama3-8b-8192': {
    inputCostPer1k: 0.00005,
    outputCostPer1k: 0.00008,
    provider: 'groq',
    modelFamily: 'llama3'
  },
  'llama3-70b-8192': {
    inputCostPer1k: 0.00059,
    outputCostPer1k: 0.00079,
    provider: 'groq',
    modelFamily: 'llama3'
  },
  'mixtral-8x7b-32768': {
    inputCostPer1k: 0.00024,
    outputCostPer1k: 0.00024,
    provider: 'groq',
    modelFamily: 'mixtral'
  },

  // Google Vertex AI Models
  'text-bison@001': {
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.001,
    provider: 'google_vertex_ai',
    modelFamily: 'palm'
  },
  'chat-bison@001': {
    inputCostPer1k: 0.0005,
    outputCostPer1k: 0.0005,
    provider: 'google_vertex_ai',
    modelFamily: 'palm'
  }
}

/**
 * Calculate cost for a given model and token usage
 */
export function calculateCost(
  model: string,
  tokenUsage: TokenUsage,
  provider?: string
): CostCalculationResult {
  // Normalize model name for lookups
  const normalizedModel = normalizeModelName(model)
  
  // Try to find model in pricing database
  let modelConfig = MODEL_PRICING[normalizedModel]
  
  // If not found, try to infer from provider and use default pricing
  if (!modelConfig && provider) {
    modelConfig = getDefaultPricingForProvider(provider)
  }
  
  // Fallback to generic pricing if model not found
  if (!modelConfig) {
    modelConfig = {
      inputCostPer1k: 0.001, // Default $0.001 per 1k input tokens
      outputCostPer1k: 0.002, // Default $0.002 per 1k output tokens
      provider: provider || 'unknown'
    }
  }

  const promptTokens = tokenUsage.promptTokens || 0
  const completionTokens = tokenUsage.completionTokens || 0

  const inputCost = (promptTokens / 1000) * modelConfig.inputCostPer1k
  const outputCost = (completionTokens / 1000) * modelConfig.outputCostPer1k
  const totalCost = inputCost + outputCost

  return {
    inputCost: Number(inputCost.toFixed(6)),
    outputCost: Number(outputCost.toFixed(6)),
    totalCost: Number(totalCost.toFixed(6)),
    provider: modelConfig.provider,
    model: normalizedModel,
    currency: 'USD'
  }
}

/**
 * Normalize model names for consistent lookup
 */
function normalizeModelName(model: string): string {
  return model.toLowerCase().trim()
}

/**
 * Get default pricing for a provider when specific model is not found
 */
function getDefaultPricingForProvider(provider: string): ModelConfig {
  const defaultPricing: Record<string, ModelConfig> = {
    'openai': {
      inputCostPer1k: 0.001,
      outputCostPer1k: 0.002,
      provider: 'openai'
    },
    'azure_openai': {
      inputCostPer1k: 0.001,
      outputCostPer1k: 0.002,
      provider: 'azure_openai'
    },
    'anthropic': {
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
      provider: 'anthropic'
    },
    'google_ai': {
      inputCostPer1k: 0.001,
      outputCostPer1k: 0.003,
      provider: 'google_ai'
    },
    'aws_bedrock': {
      inputCostPer1k: 0.003,
      outputCostPer1k: 0.015,
      provider: 'aws_bedrock'
    },
    'groq': {
      inputCostPer1k: 0.0001,
      outputCostPer1k: 0.0001,
      provider: 'groq'
    },
    'google_vertex_ai': {
      inputCostPer1k: 0.001,
      outputCostPer1k: 0.001,
      provider: 'google_vertex_ai'
    }
  }

  return defaultPricing[provider.toLowerCase()] || {
    inputCostPer1k: 0.001,
    outputCostPer1k: 0.002,
    provider: provider
  }
}

/**
 * Get all supported providers
 */
export function getSupportedProviders(): string[] {
  return Array.from(new Set(Object.values(MODEL_PRICING).map(config => config.provider)))
}

/**
 * Get all supported models for a provider
 */
export function getModelsForProvider(provider: string): string[] {
  return Object.entries(MODEL_PRICING)
    .filter(([_, config]) => config.provider === provider.toLowerCase())
    .map(([model, _]) => model)
}

/**
 * Estimate cost before making an API call
 */
export function estimateCost(
  model: string,
  estimatedPromptTokens: number,
  estimatedCompletionTokens: number = 0,
  provider?: string
): CostCalculationResult {
  return calculateCost(model, {
    promptTokens: estimatedPromptTokens,
    completionTokens: estimatedCompletionTokens,
    totalTokens: estimatedPromptTokens + estimatedCompletionTokens
  }, provider)
}

/**
 * Calculate cost aggregations for analytics
 */
export interface CostAggregation {
  totalCost: number
  totalInputCost: number
  totalOutputCost: number
  totalTokens: number
  totalPromptTokens: number
  totalCompletionTokens: number
  costByProvider: Record<string, number>
  costByModel: Record<string, number>
  count: number
}

export function aggregateCosts(costs: CostCalculationResult[], tokenUsages: TokenUsage[]): CostAggregation {
  const aggregation: CostAggregation = {
    totalCost: 0,
    totalInputCost: 0,
    totalOutputCost: 0,
    totalTokens: 0,
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    costByProvider: {},
    costByModel: {},
    count: costs.length
  }

  costs.forEach((cost, index) => {
    const tokenUsage = tokenUsages[index] || {}
    
    aggregation.totalCost += cost.totalCost
    aggregation.totalInputCost += cost.inputCost
    aggregation.totalOutputCost += cost.outputCost
    
    aggregation.totalPromptTokens += tokenUsage.promptTokens || 0
    aggregation.totalCompletionTokens += tokenUsage.completionTokens || 0
    aggregation.totalTokens += tokenUsage.totalTokens || 0

    // Aggregate by provider
    if (!aggregation.costByProvider[cost.provider]) {
      aggregation.costByProvider[cost.provider] = 0
    }
    aggregation.costByProvider[cost.provider] += cost.totalCost

    // Aggregate by model
    if (!aggregation.costByModel[cost.model]) {
      aggregation.costByModel[cost.model] = 0
    }
    aggregation.costByModel[cost.model] += cost.totalCost
  })

  // Round aggregated values
  aggregation.totalCost = Number(aggregation.totalCost.toFixed(6))
  aggregation.totalInputCost = Number(aggregation.totalInputCost.toFixed(6))
  aggregation.totalOutputCost = Number(aggregation.totalOutputCost.toFixed(6))

  return aggregation
}