import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'

// POST /api/v1/llm/execute - Execute prompt with selected LLM provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      providerId, 
      prompt, 
      temperature = 0.7, 
      maxTokens = 1000,
      model 
    } = body

    if (!providerId || !prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider ID and prompt are required'
        },
        { status: 400 }
      )
    }

    // Get provider configuration
    const provider = llmProvidersDb.getById(providerId)
    if (!provider) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found'
        },
        { status: 404 }
      )
    }

    if (provider.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider is not active'
        },
        { status: 400 }
      )
    }

    // Parse provider configuration
    let config, credentials
    try {
      config = typeof provider.config === 'string' ? JSON.parse(provider.config) : provider.config
      credentials = typeof provider.credentials === 'string' ? JSON.parse(provider.credentials) : provider.credentials
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid provider configuration'
        },
        { status: 500 }
      )
    }

    const startTime = Date.now()
    let result

    try {
      // Execute based on provider type
      switch (provider.type) {
        case 'openai':
          result = await executeOpenAI(prompt, model, temperature, maxTokens, credentials)
          break
        case 'azure_openai':
          result = await executeAzureOpenAI(prompt, model, temperature, maxTokens, config, credentials)
          break
        case 'anthropic':
          result = await executeAnthropic(prompt, model, temperature, maxTokens, credentials)
          break
        case 'google':
          result = await executeGoogle(prompt, model, temperature, maxTokens, credentials)
          break
        case 'xai':
          result = await executeXAI(prompt, model, temperature, maxTokens, credentials)
          break
        case 'mistral':
          result = await executeMistral(prompt, model, temperature, maxTokens, credentials)
          break
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`)
      }

      const endTime = Date.now()
      const executionTime = endTime - startTime

      return NextResponse.json({
        success: true,
        output: result.output,
        executionTime,
        tokens: result.tokens,
        cost: result.cost,
        model: result.model
      })

    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        executionTime
      })
    }

  } catch (error) {
    console.error('Failed to execute LLM prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute prompt'
      },
      { status: 500 }
    )
  }
}

// OpenAI execution
async function executeOpenAI(prompt: string, model: string, temperature: number, maxTokens: number, credentials: any) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  const usage = data.usage

  return {
    output: data.choices[0].message.content,
    tokens: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens
    },
    cost: calculateOpenAICost(usage, model),
    model: data.model
  }
}

// Azure OpenAI execution
async function executeAzureOpenAI(prompt: string, model: string, temperature: number, maxTokens: number, config: any, credentials: any) {
  const { endpoint, deployment_name } = config
  const url = `${endpoint}/openai/deployments/${deployment_name}/chat/completions?api-version=2024-02-15-preview`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': credentials.api_key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Azure OpenAI API error')
  }

  const data = await response.json()
  const usage = data.usage

  return {
    output: data.choices[0].message.content,
    tokens: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens
    },
    cost: calculateOpenAICost(usage, model),
    model: deployment_name
  }
}

// Anthropic execution
async function executeAnthropic(prompt: string, model: string, temperature: number, maxTokens: number, credentials: any) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': credentials.api_key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-sonnet-20240229',
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()

  return {
    output: data.content[0].text,
    tokens: {
      input: data.usage.input_tokens,
      output: data.usage.output_tokens,
      total: data.usage.input_tokens + data.usage.output_tokens
    },
    cost: calculateAnthropicCost(data.usage, model),
    model: data.model
  }
}

// Google execution
async function executeGoogle(prompt: string, model: string, temperature: number, maxTokens: number, credentials: any) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${credentials.api_key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens
      }
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google API error')
  }

  const data = await response.json()
  const outputText = data.candidates[0].content.parts[0].text
  
  // Google doesn't provide detailed token usage, so we estimate
  const inputTokens = Math.ceil(prompt.length / 4)
  const outputTokens = Math.ceil(outputText.length / 4)

  return {
    output: outputText,
    tokens: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens
    },
    cost: calculateGoogleCost(inputTokens, outputTokens, model),
    model: model || 'gemini-pro'
  }
}

// xAI execution
async function executeXAI(prompt: string, model: string, temperature: number, maxTokens: number, credentials: any) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'grok-beta',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'xAI API error')
  }

  const data = await response.json()
  const usage = data.usage

  return {
    output: data.choices[0].message.content,
    tokens: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens
    },
    cost: calculateXAICost(usage, model),
    model: data.model
  }
}

// Mistral execution
async function executeMistral(prompt: string, model: string, temperature: number, maxTokens: number, credentials: any) {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model || 'mistral-large-latest',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Mistral API error')
  }

  const data = await response.json()
  const usage = data.usage

  return {
    output: data.choices[0].message.content,
    tokens: {
      input: usage.prompt_tokens,
      output: usage.completion_tokens,
      total: usage.total_tokens
    },
    cost: calculateMistralCost(usage, model),
    model: data.model
  }
}

// Cost calculation functions
function calculateOpenAICost(usage: any, model: string) {
  const pricing = {
    'gpt-4': { input: 0.00003, output: 0.00006 },
    'gpt-4-turbo': { input: 0.00001, output: 0.00003 },
    'gpt-4-turbo-preview': { input: 0.00001, output: 0.00003 },
    'gpt-3.5-turbo': { input: 0.000001, output: 0.000002 }
  }
  
  const rates = pricing[model as keyof typeof pricing] || pricing['gpt-4']
  return usage.prompt_tokens * rates.input + usage.completion_tokens * rates.output
}

function calculateAnthropicCost(usage: any, model: string) {
  const pricing = {
    'claude-3-opus-20240229': { input: 0.000015, output: 0.000075 },
    'claude-3-sonnet-20240229': { input: 0.000003, output: 0.000015 },
    'claude-3-haiku-20240307': { input: 0.00000025, output: 0.00000125 }
  }
  
  const rates = pricing[model as keyof typeof pricing] || pricing['claude-3-sonnet-20240229']
  return usage.input_tokens * rates.input + usage.output_tokens * rates.output
}

function calculateGoogleCost(inputTokens: number, outputTokens: number, model: string) {
  // Google Gemini Pro pricing (estimated)
  const inputRate = 0.000001
  const outputRate = 0.000002
  return inputTokens * inputRate + outputTokens * outputRate
}

function calculateXAICost(usage: any, model: string) {
  // xAI pricing (estimated)
  const inputRate = 0.000001
  const outputRate = 0.000002
  return usage.prompt_tokens * inputRate + usage.completion_tokens * outputRate
}

function calculateMistralCost(usage: any, model: string) {
  const pricing = {
    'mistral-large-latest': { input: 0.000008, output: 0.000024 },
    'mistral-medium-latest': { input: 0.0000027, output: 0.0000081 }
  }
  
  const rates = pricing[model as keyof typeof pricing] || pricing['mistral-large-latest']
  return usage.prompt_tokens * rates.input + usage.completion_tokens * rates.output
}