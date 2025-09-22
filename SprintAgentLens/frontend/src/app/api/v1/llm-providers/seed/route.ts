import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'

// POST /api/v1/llm-providers/seed - Seed default Azure OpenAI provider
export async function POST(request: NextRequest) {
  try {
    // Check if Azure OpenAI provider already exists
    const existingProviders = llmProvidersDb.getAll()
    const azureProvider = existingProviders.find(p => p.name === 'azure_openai_default')
    
    if (azureProvider) {
      return NextResponse.json({
        success: true,
        message: 'Azure OpenAI provider already exists',
        provider: azureProvider
      })
    }

    // Create Azure OpenAI provider with provided credentials
    const azureOpenAIProvider = {
      name: 'azure_openai_default',
      type: 'azure_openai',
      display_name: 'Azure OpenAI (Default)',
      description: 'Default Azure OpenAI configuration for prompt testing',
      config: {
        endpoint: 'https://dr-ai-dev-1001.openai.azure.com/',
        deployment_name: 'msgen4o',
        api_version: '2023-07-01-preview',
        model: '2023-07-01-preview',
        api_type: 'azure'
      },
      credentials: {
        api_key: '580d87fc2e114ce6b484e72334dc84e9'
      },
      status: 'active',
      health_status: 'unknown',
      usage_limits: {
        requests_per_minute: 60,
        tokens_per_minute: 40000,
        requests_per_day: 1000
      },
      created_by: 'system',
      updated_by: 'system'
    }

    const provider = llmProvidersDb.create(azureOpenAIProvider)

    return NextResponse.json({
      success: true,
      message: 'Azure OpenAI provider created successfully',
      provider: {
        ...provider,
        config: JSON.parse(provider.config),
        usage_limits: JSON.parse(provider.usage_limits)
        // Note: credentials are not returned for security
      }
    })

  } catch (error) {
    console.error('Failed to seed Azure OpenAI provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to seed Azure OpenAI provider'
      },
      { status: 500 }
    )
  }
}