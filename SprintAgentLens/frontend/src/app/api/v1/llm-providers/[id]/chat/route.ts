import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'

// POST /api/v1/llm-providers/[id]/chat - Send chat message to provider
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const providerId = id
    const { model, message, maxTokens = 1000, temperature = 0.7 } = await request.json()
    
    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Message is required'
        },
        { status: 400 }
      )
    }
    
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

    let chatResult = {
      success: false,
      response: '',
      error: '',
      latency: 0,
      timestamp: new Date().toISOString()
    }

    const startTime = Date.now()

    try {
      // Call LLM based on provider type
      switch (provider.type) {
        case 'azure_openai':
          chatResult = await callAzureOpenAI(config, credentials, model, message, maxTokens, temperature)
          break
        case 'openai':
          chatResult = await callOpenAI(credentials, model, message, maxTokens, temperature)
          break
        case 'anthropic':
          chatResult = await callAnthropic(credentials, model, message, maxTokens, temperature)
          break
        case 'xai':
          chatResult = await callXAI(config, credentials, model, message, maxTokens, temperature)
          break
        case 'google':
          chatResult = await callGoogle(credentials, model, message, maxTokens, temperature)
          break
        case 'mistral':
          chatResult = await callMistral(credentials, model, message, maxTokens, temperature)
          break
        default:
          throw new Error(`Unsupported provider type: ${provider.type}`)
      }
      
      chatResult.latency = Date.now() - startTime

      return NextResponse.json({
        success: true,
        chatResult
      })

    } catch (error: any) {
      chatResult.success = false
      chatResult.error = error.message
      chatResult.latency = Date.now() - startTime

      return NextResponse.json({
        success: true,
        chatResult
      })
    }

  } catch (error) {
    console.error('Failed to call provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to call provider'
      },
      { status: 500 }
    )
  }
}

async function callAzureOpenAI(config: any, credentials: any, model: string, message: string, maxTokens: number, temperature: number) {
  const { endpoint, deployment_name, api_version } = config
  const { api_key } = credentials
  
  const targetModel = model || deployment_name || 'msgen4o'
  
  const url = `${endpoint}/openai/deployments/${targetModel}/chat/completions?api-version=${api_version}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': api_key
    },
    body: JSON.stringify({
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Azure OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'No response generated',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function callOpenAI(credentials: any, model: string, message: string, maxTokens: number, temperature: number) {
  const { api_key } = credentials
  const targetModel = model || 'gpt-3.5-turbo'
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'No response generated',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function callAnthropic(credentials: any, model: string, message: string, maxTokens: number, temperature: number) {
  const { api_key } = credentials
  const targetModel = model || 'claude-3-haiku-20240307'
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': api_key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: targetModel,
      max_tokens: maxTokens,
      temperature: temperature,
      messages: [
        { role: 'user', content: message }
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
    response: data.content?.[0]?.text || 'No response generated',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function callXAI(config: any, credentials: any, model: string, message: string, maxTokens: number, temperature: number) {
  const { api_key } = credentials
  const { base_url = 'https://api.x.ai/v1' } = config
  const targetModel = model || 'grok-beta'
  
  const response = await fetch(`${base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`xAI API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'No response generated',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function callGoogle(credentials: any, model: string, message: string, maxTokens: number, temperature: number) {
  const { api_key } = credentials
  const targetModel = model || 'gemini-pro'
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${api_key}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: message
        }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature
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
    response: data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}

async function callMistral(credentials: any, model: string, message: string, maxTokens: number, temperature: number) {
  const { api_key } = credentials
  const targetModel = model || 'mistral-small-latest'
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: targetModel,
      messages: [
        { role: 'user', content: message }
      ],
      max_tokens: maxTokens,
      temperature: temperature
    })
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Mistral API error: ${response.status} - ${errorData}`)
  }

  const data = await response.json()
  
  return {
    success: true,
    response: data.choices?.[0]?.message?.content || 'No response generated',
    error: '',
    latency: 0,
    timestamp: new Date().toISOString()
  }
}