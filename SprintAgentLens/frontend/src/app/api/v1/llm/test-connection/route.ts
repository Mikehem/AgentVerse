import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'

// POST /api/v1/llm/test-connection - Test connection to LLM provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { providerId } = body

    if (!providerId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider ID is required'
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

    try {
      // Test connection based on provider type
      let result
      switch (provider.type) {
        case 'openai':
          result = await testOpenAIConnection(credentials)
          break
        case 'azure_openai':
          result = await testAzureOpenAIConnection(config, credentials)
          break
        case 'anthropic':
          result = await testAnthropicConnection(credentials)
          break
        case 'google':
          result = await testGoogleConnection(credentials)
          break
        case 'xai':
          result = await testXAIConnection(credentials)
          break
        case 'mistral':
          result = await testMistralConnection(credentials)
          break
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`)
      }

      const endTime = Date.now()
      const responseTime = endTime - startTime

      return NextResponse.json({
        success: true,
        message: result.message,
        responseTime,
        details: result.details
      })

    } catch (error) {
      const endTime = Date.now()
      const responseTime = endTime - startTime

      console.error('Connection test failed:', error)
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed',
        responseTime,
        debug: process.env.NODE_ENV === 'development' ? {
          provider: provider?.type,
          providerId: providerId,
          errorStack: error instanceof Error ? error.stack : null
        } : undefined
      })
    }

  } catch (error) {
    console.error('Failed to test provider connection:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test connection'
      },
      { status: 500 }
    )
  }
}

// Test OpenAI connection
async function testOpenAIConnection(credentials: any) {
  const response = await fetch('https://api.openai.com/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API connection failed')
  }

  const data = await response.json()
  const modelCount = data.data?.length || 0

  return {
    message: 'OpenAI connection successful',
    details: {
      modelsAvailable: modelCount,
      endpoint: 'https://api.openai.com/v1'
    }
  }
}

// Test Azure OpenAI connection
async function testAzureOpenAIConnection(config: any, credentials: any) {
  const { endpoint, deployment_name } = config
  
  if (!endpoint) {
    throw new Error('Azure OpenAI endpoint is required in configuration')
  }
  
  if (!deployment_name) {
    throw new Error('Azure OpenAI deployment_name is required in configuration')
  }
  
  if (!credentials.api_key) {
    throw new Error('Azure OpenAI api_key is required in credentials')
  }

  const url = `${endpoint}/openai/deployments/${deployment_name}/chat/completions?api-version=2024-02-15-preview`

  // Test with a minimal request
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'api-key': credentials.api_key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    })
  })

  if (!response.ok) {
    let errorMessage = `Azure OpenAI API connection failed (${response.status})`
    try {
      const error = await response.json()
      errorMessage = error.error?.message || error.message || errorMessage
    } catch (parseError) {
      errorMessage = `${errorMessage}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  return {
    message: 'Azure OpenAI connection successful',
    details: {
      endpoint: endpoint,
      deployment: deployment_name,
      statusCode: response.status
    }
  }
}

// Test Anthropic connection
async function testAnthropicConnection(credentials: any) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': credentials.api_key,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'test' }]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API connection failed')
  }

  return {
    message: 'Anthropic connection successful',
    details: {
      endpoint: 'https://api.anthropic.com/v1'
    }
  }
}

// Test Google connection
async function testGoogleConnection(credentials: any) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${credentials.api_key}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Google API connection failed')
  }

  const data = await response.json()
  const modelCount = data.models?.length || 0

  return {
    message: 'Google connection successful',
    details: {
      modelsAvailable: modelCount,
      endpoint: 'https://generativelanguage.googleapis.com'
    }
  }
}

// Test xAI connection
async function testXAIConnection(credentials: any) {
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'grok-beta',
      messages: [{ role: 'user', content: 'test' }],
      max_tokens: 1
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'xAI API connection failed')
  }

  return {
    message: 'xAI connection successful',
    details: {
      endpoint: 'https://api.x.ai/v1'
    }
  }
}

// Test Mistral connection
async function testMistralConnection(credentials: any) {
  const response = await fetch('https://api.mistral.ai/v1/models', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${credentials.api_key}`,
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Mistral API connection failed')
  }

  const data = await response.json()
  const modelCount = data.data?.length || 0

  return {
    message: 'Mistral connection successful',
    details: {
      modelsAvailable: modelCount,
      endpoint: 'https://api.mistral.ai/v1'
    }
  }
}