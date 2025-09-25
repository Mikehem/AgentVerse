import { NextRequest, NextResponse } from 'next/server'

// POST /api/v1/llm-providers/test-config - Test provider configuration before saving
export async function POST(request: NextRequest) {
  try {
    const { type, config, credentials } = await request.json()
    
    if (!type || !config || !credentials) {
      return NextResponse.json(
        {
          success: false,
          error: 'Type, config, and credentials are required'
        },
        { status: 400 }
      )
    }

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
      switch (type) {
        case 'azure_openai':
          testResult = await testAzureOpenAI(config, credentials)
          break
        case 'openai':
          testResult = await testOpenAI(credentials)
          break
        case 'anthropic':
          testResult = await testAnthropic(credentials)
          break
        case 'xai':
          testResult = await testXAI(config, credentials)
          break
        case 'google':
          testResult = await testGoogle(credentials)
          break
        case 'mistral':
          testResult = await testMistral(credentials)
          break
        default:
          throw new Error(`Unsupported provider type: ${type}`)
      }
      
      testResult.latency = Date.now() - startTime

      return NextResponse.json({
        success: true,
        ...testResult
      })

    } catch (error: any) {
      testResult.success = false
      testResult.error = error.message
      testResult.latency = Date.now() - startTime

      return NextResponse.json({
        success: false,
        error: testResult.error,
        latency: testResult.latency
      })
    }

  } catch (error) {
    console.error('Failed to test provider configuration:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test provider configuration'
      },
      { status: 500 }
    )
  }
}

async function testAzureOpenAI(config: any, credentials: any) {
  const { endpoint, deployment_name, api_version = '2023-07-01-preview' } = config
  const { api_key } = credentials
  
  if (!endpoint || !deployment_name || !api_key) {
    throw new Error('Azure OpenAI requires endpoint, deployment_name, and api_key')
  }
  
  const url = `${endpoint}/openai/deployments/${deployment_name}/chat/completions?api-version=${api_version}`
  
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

async function testOpenAI(credentials: any) {
  const { api_key } = credentials
  
  if (!api_key) {
    throw new Error('OpenAI requires api_key')
  }
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
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

async function testAnthropic(credentials: any) {
  const { api_key } = credentials
  
  if (!api_key) {
    throw new Error('Anthropic requires api_key')
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': api_key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
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

async function testXAI(config: any, credentials: any) {
  const { api_key } = credentials
  const { base_url = 'https://api.x.ai/v1' } = config
  
  if (!api_key) {
    throw new Error('xAI Grok requires api_key')
  }
  
  const response = await fetch(`${base_url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: 'grok-beta',
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

async function testGoogle(credentials: any) {
  const { api_key } = credentials
  
  if (!api_key) {
    throw new Error('Google Gemini requires api_key')
  }
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${api_key}`, {
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

async function testMistral(credentials: any) {
  const { api_key } = credentials
  
  if (!api_key) {
    throw new Error('Mistral AI requires api_key')
  }
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${api_key}`
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
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