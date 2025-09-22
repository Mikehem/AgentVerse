import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'

// GET /api/v1/llm-providers/[id] - Get specific provider
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = params.id
    const { searchParams } = new URL(request.url)
    const includeCredentials = searchParams.get('includeCredentials') === 'true'

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

    // Parse JSON fields
    const result: any = {
      ...provider,
      config: JSON.parse(provider.config),
      usage_limits: JSON.parse(provider.usage_limits)
    }

    // Handle credentials based on request
    if (includeCredentials && provider.credentials) {
      result.credentials = JSON.parse(provider.credentials)
    } else {
      // Remove credentials from response for security
      delete result.credentials
    }

    return NextResponse.json({
      success: true,
      provider: result
    })

  } catch (error) {
    console.error('Failed to fetch provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch provider'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/llm-providers/[id] - Update provider
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = params.id
    const body = await request.json()
    const { 
      name, 
      displayName, 
      description, 
      config, 
      credentials, 
      status,
      usageLimits,
      updatedBy 
    } = body

    const updated = llmProvidersDb.update(providerId, {
      name,
      display_name: displayName,
      description,
      config,
      credentials,
      status,
      usage_limits: usageLimits,
      updated_by: updatedBy
    })

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found'
        },
        { status: 404 }
      )
    }

    // Parse JSON fields for response (without credentials)
    const result = {
      ...updated,
      config: JSON.parse(updated.config),
      usage_limits: JSON.parse(updated.usage_limits)
    }
    delete result.credentials

    return NextResponse.json({
      success: true,
      provider: result
    })

  } catch (error) {
    console.error('Failed to update provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update provider'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/llm-providers/[id] - Delete provider
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const providerId = params.id

    // TODO: Check if provider is being used by any prompts
    // This would require checking the prompt_tests table or other usage tracking

    const deleted = llmProvidersDb.delete(providerId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Provider deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete provider:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete provider'
      },
      { status: 500 }
    )
  }
}