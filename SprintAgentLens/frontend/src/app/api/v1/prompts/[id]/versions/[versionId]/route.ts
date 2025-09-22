import { NextRequest, NextResponse } from 'next/server'
import { promptVersionsDb, agentPromptLinksDb } from '@/lib/database'

// GET /api/v1/prompts/[id]/versions/[versionId] - Get specific version
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const versionId = params.versionId

    const version = promptVersionsDb.getById(versionId)
    
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: 'Version not found'
        },
        { status: 404 }
      )
    }

    // Parse JSON fields
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
    console.error('Failed to fetch prompt version:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch prompt version'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/prompts/[id]/versions/[versionId] - Update version (mainly for metadata)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const versionId = params.versionId
    const body = await request.json()
    const { commitMessage, metadata, updatedBy } = body

    const updated = promptVersionsDb.update?.(versionId, {
      commit_message: commitMessage,
      metadata,
      updated_by: updatedBy
    })

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: 'Version not found'
        },
        { status: 404 }
      )
    }

    // Parse JSON fields for response
    const result = {
      ...updated,
      variables: updated.variables ? JSON.parse(updated.variables) : [],
      metadata: updated.metadata ? JSON.parse(updated.metadata) : {},
      is_active: Boolean(updated.is_active)
    }

    return NextResponse.json({
      success: true,
      version: result
    })

  } catch (error) {
    console.error('Failed to update prompt version:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update prompt version'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/prompts/[id]/versions/[versionId] - Delete version
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const versionId = params.versionId

    // Check if version is active or has agent links
    const version = promptVersionsDb.getById(versionId)
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: 'Version not found'
        },
        { status: 404 }
      )
    }

    if (version.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete active version. Please activate another version first.'
        },
        { status: 400 }
      )
    }

    // Check for agent links
    const linksQuery = 'SELECT COUNT(*) as count FROM agent_prompt_links WHERE prompt_version_id = ?'
    const links = agentPromptLinksDb.getAll(linksQuery, [versionId])[0]
    
    if (links.count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete version with agent links. Please remove all agent links first.'
        },
        { status: 400 }
      )
    }

    const deleted = promptVersionsDb.delete(versionId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Version not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Version deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete prompt version:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete prompt version'
      },
      { status: 500 }
    )
  }
}