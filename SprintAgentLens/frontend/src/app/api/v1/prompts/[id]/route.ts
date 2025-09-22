import { NextRequest, NextResponse } from 'next/server'
import { promptsDb, promptVersionsDb, agentPromptLinksDb } from '@/lib/database'

// Helper function to safely parse JSON
function safeParseJSON(jsonString: any, defaultValue: any = null) {
  if (!jsonString || jsonString === null || jsonString === undefined) {
    return defaultValue
  }
  
  if (typeof jsonString !== 'string') {
    return jsonString
  }
  
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    console.warn('Failed to parse JSON:', jsonString, error)
    return defaultValue
  }
}

// GET /api/v1/prompts/[id] - Get specific prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const promptId = id
    const { searchParams } = new URL(request.url)
    const includeVersions = searchParams.get('includeVersions') === 'true'
    const includeAgentLinks = searchParams.get('includeAgentLinks') === 'true'

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

    // Parse JSON fields
    const result: any = {
      ...prompt,
      tags: safeParseJSON(prompt.tags, []),
      metadata: safeParseJSON(prompt.metadata, {})
    }

    if (includeVersions) {
      result.versions = promptVersionsDb.getByPromptId(promptId)
      result.activeVersion = promptVersionsDb.getActiveVersion(promptId)
    }

    if (includeAgentLinks) {
      // Get all agents linked to any version of this prompt
      const allVersions = promptVersionsDb.getByPromptId(promptId)
      const versionIds = allVersions.map(v => v.id)
      
      if (versionIds.length > 0) {
        const linksQuery = `
          SELECT apl.*, agents.name as agent_name 
          FROM agent_prompt_links apl 
          LEFT JOIN agents ON apl.agent_id = agents.id 
          WHERE apl.prompt_version_id IN (${versionIds.map(() => '?').join(',')})
          ORDER BY apl.linked_at DESC
        `
        result.agentLinks = agentPromptLinksDb.getAll(linksQuery, versionIds)
      } else {
        result.agentLinks = []
      }
    }

    return NextResponse.json({
      success: true,
      prompt: result
    })

  } catch (error) {
    console.error('Failed to fetch prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch prompt'
      },
      { status: 500 }
    )
  }
}

// PUT /api/v1/prompts/[id] - Create new version of prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const promptId = id
    const body = await request.json()
    const { name, description, template, variables, variableDefinitions, commitMessage, versionNumber, versionType, status, comments, updatedBy } = body

    // Check if prompt exists
    const existingPrompt = promptsDb.getById(promptId)
    if (!existingPrompt) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt not found'
        },
        { status: 404 }
      )
    }

    // Update prompt basic info if changed
    if (name || description) {
      promptsDb.update(promptId, {
        name,
        description,
        updated_by: updatedBy
      })
    }

    // Determine version number
    let version: string
    if (versionNumber) {
      version = versionNumber
    } else if (versionType) {
      version = promptVersionsDb.generateNextVersion(promptId, versionType)
    } else {
      version = promptVersionsDb.generateNextVersion(promptId, 'patch')
    }

    // Validate version uniqueness
    if (promptVersionsDb.versionExists(promptId, version)) {
      return NextResponse.json(
        {
          success: false,
          error: `Version ${version} already exists for this prompt`
        },
        { status: 400 }
      )
    }

    // Check for current status conflicts
    if (status === 'current') {
      const currentVersion = promptVersionsDb.getCurrentVersion(promptId)
      if (currentVersion) {
        // This will be handled by setAsCurrent method
      }
    }

    // Create new version
    const versionStatus = status || 'draft'
    const newVersion = promptVersionsDb.create({
      prompt_id: promptId,
      version,
      template,
      variables: variables || {},
      variable_definitions: variableDefinitions || [],
      is_active: versionStatus === 'current',
      status: versionStatus,
      comments: comments || '',
      changelog: commitMessage || `Updated to version ${version}`,
      created_by: updatedBy
    })

    // Handle status transitions
    if (versionStatus === 'current') {
      promptVersionsDb.setAsCurrent(newVersion.id)
    }

    // Get updated prompt with new version
    const updatedPrompt = promptsDb.getById(promptId)
    const result = {
      ...updatedPrompt,
      variables: safeParseJSON(updatedPrompt.variables, {}),
      metadata: safeParseJSON(updatedPrompt.metadata, {}),
      tags: safeParseJSON(updatedPrompt.tags, []),
      activeVersion: newVersion
    }

    return NextResponse.json({
      success: true,
      prompt: result
    })

  } catch (error) {
    console.error('Failed to update prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update prompt'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/prompts/[id] - Delete prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const promptId = id

    // Check if prompt has active agent links
    const allVersions = promptVersionsDb.getByPromptId(promptId)
    const versionIds = allVersions.map(v => v.id)
    
    if (versionIds.length > 0) {
      const activeLinksQuery = `
        SELECT COUNT(*) as count 
        FROM agent_prompt_links 
        WHERE prompt_version_id IN (${versionIds.map(() => '?').join(',')}) 
        AND is_active = 1
      `
      const activeLinks = agentPromptLinksDb.getAll(activeLinksQuery, versionIds)[0]
      
      if (activeLinks.count > 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot delete prompt with active agent links. Please deactivate all agent links first.'
          },
          { status: 400 }
        )
      }
    }

    const deleted = promptsDb.delete(promptId)

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt not found'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Prompt deleted successfully'
    })

  } catch (error) {
    console.error('Failed to delete prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete prompt'
      },
      { status: 500 }
    )
  }
}