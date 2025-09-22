import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'
import { generateSpanId } from '@/lib/idGenerator'

// GET /api/v1/llm-providers - Get all LLM providers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // active, inactive
    const type = searchParams.get('type') // azure_openai, openai, anthropic, etc.
    const includeCredentials = searchParams.get('includeCredentials') === 'true'

    let query = 'SELECT * FROM llm_providers WHERE 1=1'
    let params: any[] = []

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    if (type) {
      query += ' AND type = ?'
      params.push(type)
    }

    query += ' ORDER BY created_at DESC'

    const providers = llmProvidersDb.getAll(query, params)

    // Enhance providers with parsed JSON fields
    const enhancedProviders = providers.map(provider => {
      const result: any = { ...provider }
      
      // Parse JSON fields
      if (provider.config) result.config = JSON.parse(provider.config)
      if (provider.usage_limits) result.usage_limits = JSON.parse(provider.usage_limits)
      
      // Handle credentials based on request
      if (includeCredentials && provider.credentials) {
        result.credentials = JSON.parse(provider.credentials)
      } else {
        // Remove credentials from response for security
        delete result.credentials
      }
      
      return result
    })

    return NextResponse.json({
      success: true,
      providers: enhancedProviders
    })

  } catch (error) {
    console.error('Failed to fetch LLM providers:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch LLM providers'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/llm-providers - Create new LLM provider
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      name, 
      type, 
      displayName, 
      description, 
      config, 
      credentials, 
      status = 'active',
      usageLimits,
      createdBy 
    } = body

    if (!name || !type || !displayName || !config || !credentials) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name, type, display name, config, and credentials are required'
        },
        { status: 400 }
      )
    }

    // Validate config based on provider type
    const validationResult = validateProviderConfig(type, config, credentials)
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validationResult.error
        },
        { status: 400 }
      )
    }

    const provider = llmProvidersDb.create({
      name,
      type,
      display_name: displayName,
      description,
      config,
      credentials,
      status,
      usage_limits: usageLimits || {},
      created_by: createdBy,
      updated_by: createdBy
    })

    // Parse JSON fields for response (without credentials)
    const result = {
      ...provider,
      config: JSON.parse(provider.config),
      usage_limits: JSON.parse(provider.usage_limits)
    }
    delete result.credentials

    return NextResponse.json({
      success: true,
      provider: result
    })

  } catch (error) {
    console.error('Failed to create LLM provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create LLM provider'
      },
      { status: 500 }
    )
  }
}

// Validate provider configuration based on type
function validateProviderConfig(type: string, config: any, credentials: any) {
  switch (type) {
    case 'azure_openai':
      if (!config.endpoint || !config.deployment_name || !credentials.api_key) {
        return {
          valid: false,
          error: 'Azure OpenAI requires endpoint, deployment_name in config and api_key in credentials'
        }
      }
      break
    
    case 'openai':
      if (!credentials.api_key) {
        return {
          valid: false,
          error: 'OpenAI requires api_key in credentials'
        }
      }
      break
    
    case 'anthropic':
      if (!credentials.api_key) {
        return {
          valid: false,
          error: 'Anthropic requires api_key in credentials'
        }
      }
      break
      
    case 'xai':
      if (!credentials.api_key) {
        return {
          valid: false,
          error: 'xAI Grok requires api_key in credentials'
        }
      }
      break
      
    case 'google':
      if (!credentials.api_key) {
        return {
          valid: false,
          error: 'Google Gemini requires api_key in credentials'
        }
      }
      break
      
    case 'mistral':
      if (!credentials.api_key) {
        return {
          valid: false,
          error: 'Mistral AI requires api_key in credentials'
        }
      }
      break
    
    default:
      if (!credentials.api_key) {
        return {
          valid: false,
          error: 'Provider requires api_key in credentials'
        }
      }
  }
  
  return { valid: true }
}