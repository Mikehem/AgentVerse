import { NextRequest, NextResponse } from 'next/server'
import { promptsDb, promptVersionsDb } from '@/lib/database'

// GET /api/v1/prompts/[id]/versions - Get all versions for a prompt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const promptId = resolvedParams.id

    // Verify prompt exists
    const prompt = promptsDb.getById(promptId)
    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt not found'
        },
        { status: 404 }
      )
    }

    const versions = promptVersionsDb.getByPromptId(promptId)

    // Parse JSON fields
    const enhancedVersions = versions.map(version => ({
      ...version,
      variables: version.variables ? JSON.parse(version.variables) : [],
      metadata: version.metadata ? JSON.parse(version.metadata) : {},
      is_active: Boolean(version.is_active)
    }))

    return NextResponse.json({
      success: true,
      versions: enhancedVersions
    })

  } catch (error) {
    console.error('Failed to fetch prompt versions:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch prompt versions'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts/[id]/versions - Create new version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolvedParams = await params
    const promptId = resolvedParams.id
    const body = await request.json()
    const { template, variables, commitMessage, metadata, createdBy } = body

    if (!template) {
      return NextResponse.json(
        {
          success: false,
          error: 'Template is required'
        },
        { status: 400 }
      )
    }

    // Verify prompt exists
    const prompt = promptsDb.getById(promptId)
    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt not found'
        },
        { status: 404 }
      )
    }

    // Get next version number
    const existingVersions = promptVersionsDb.getByPromptId(promptId)
    const maxVersion = existingVersions.length > 0 
      ? Math.max(...existingVersions.map(v => v.version_number))
      : 0
    const nextVersion = maxVersion + 1

    // Create new version (not active by default)
    const version = promptVersionsDb.create({
      prompt_id: promptId,
      version_number: nextVersion,
      template,
      variables: variables || [],
      is_active: false,
      commit_message: commitMessage || `Version ${nextVersion}`,
      metadata: metadata || {},
      created_by: createdBy,
      updated_by: createdBy
    })

    // Parse JSON fields for response
    const result = {
      ...version,
      variables: version.variables ? JSON.parse(version.variables) : [],
      metadata: version.metadata ? JSON.parse(version.metadata) : {},
      is_active: Boolean(version.is_active)
    }

    return NextResponse.json({
      success: true,
      version: result
    })

  } catch (error) {
    console.error('Failed to create prompt version:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create prompt version'
      },
      { status: 500 }
    )
  }
}