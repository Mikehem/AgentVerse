import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'

// POST /api/v1/llm-providers/[id]/test - Test provider connection
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const providerId = id
    const { model } = await request.json()
    
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
    const config = JSON.parse(provider.config)
    const credentials = JSON.parse(provider.credentials || '{}')

    let testResult = {
      success: false,
      response: '',
      error: '',
      latency: 0,
      timestamp: new Date().toISOString()
    }

    const startTime = Date.now()

    try {
      // Test based on provider type
      switch (provider.type) {
        case 'azure_openai':
          testResult = await testAzureOpenAI(config, credentials, model)
          break
        case 'openai':
          testResult = await testOpenAI(credentials, model)
          break
        case 'anthropic':
          testResult = await testAnthropic(credentials, model)
          break
        case 'xai':
          testResult = await testXAI(config, credentials, model)
          break
        case 'google':
          testResult = await testGoogle(credentials, model)
          break
        case 'mistral':
          testResult = await testMistral(credentials, model)
          break
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`)
      }
      
      testResult.latency = Date.now() - startTime

      // Update provider health status
      const healthStatus = testResult.success ? 'healthy' : 'unhealthy'
      llmProvidersDb.update(providerId, {
        health_status: healthStatus,
        last_health_check: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        testResult
      })

    } catch (error: any) {
      testResult.success = false
      testResult.error = error.message
      testResult.latency = Date.now() - startTime

      // Update provider as unhealthy
      llmProvidersDb.update(providerId, {
        health_status: 'unhealthy',
        last_health_check: new Date().toISOString()
      })

      return NextResponse.json({
        success: true,
        testResult
      })
    }

  } catch (error) {
    console.error('Failed to test provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test provider connection'
      },
      { status: 500 }
    )
  }
}

async function testAzureOpenAI(config: any, credentials: any, model?: string) {
  const { endpoint, deployment_name, api_version } = config
  const { api_key } = credentials
  
  const testModel = model || deployment_name || 'msgen4o'
  
  const url = `${endpoint}/openai/deployments/${testModel}/chat/completions?api-version=${api_version}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': api_key
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: 'Hello! This is a connection test. Please respond with "Connection successful".' }
      ],
      max_tokens: 50,
      temperature: 0
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'Test completed successfully',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function testOpenAI(credentials: any, model?: string) {
  const { api_key } = credentials
  const testModel = model || 'gpt-3.5-turbo'
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: testModel,
      messages: [
        { role: 'user', content: 'Hello! This is a connection test. Please respond with "Connection successful".' }
      ],
      max_tokens: 50,
      temperature: 0
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'Test completed successfully',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function testAnthropic(credentials: any, model?: string) {
  const { api_key } = credentials
  const testModel = model || 'claude-3-haiku-20240307'
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': api_key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: testModel,
      max_tokens: 50,
      messages: [
        { role: 'user', content: 'Hello! This is a connection test. Please respond with "Connection successful".' }
      ]
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Anthropic API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.content?.[0]?.text || 'Test completed successfully',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function testXAI(config: any, credentials: any, model?: string) {
  const { api_key } = credentials
  const { base_url = 'https://api.x.ai/v1' } = config
  const testModel = model || 'grok-beta'
  
  const response = await fetch(`${base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: testModel,
      messages: [
        { role: 'user', content: 'Hello! This is a connection test. Please respond with "Connection successful".' }
      ],
      max_tokens: 50,
      temperature: 0
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`xAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'Test completed successfully',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function testGoogle(credentials: any, model?: string) {
  const { api_key } = credentials
  const testModel = model || 'gemini-pro'
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${api_key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: 'Hello! This is a connection test. Please respond with "Connection successful".'
        }]
      }],
      generationConfig: {
        maxOutputTokens: 50,
        temperature: 0
      }
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Google API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'Test completed successfully',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function testMistral(credentials: any, model?: string) {
  const { api_key } = credentials
  const testModel = model || 'mistral-small-latest'
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: testModel,
      messages: [
        { role: 'user', content: 'Hello! This is a connection test. Please respond with "Connection successful".' }
      ],
      max_tokens: 50,
      temperature: 0
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Mistral API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'Test completed successfully',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}