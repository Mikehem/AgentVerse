import { NextRequest, NextResponse } from 'next/server'
import { promptsDb, promptVersionsDb, agentPromptLinksDb } from '@/lib/database'
import { generateSpanId } from '@/lib/idGenerator'

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

// GET /api/v1/prompts - Get all prompts for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const agentId = searchParams.get('agentId')
    const includeVersions = searchParams.get('includeVersions') === 'true'
    const includeActiveVersion = searchParams.get('includeActiveVersion') === 'true'

    let query = 'SELECT * FROM prompts WHERE 1=1'
    let params: any[] = []

    if (projectId) {
      query += ' AND project_id = ?'
      params.push(projectId)
    }

    query += ' ORDER BY created_at DESC'

    const prompts = promptsDb.getAll(query, params)

    // Enhance prompts with additional data if requested
    const enhancedPrompts = prompts.map(prompt => {
      const result: any = { ...prompt }
      
      if (includeVersions) {
        const versions = promptVersionsDb.getByPromptId(prompt.id)
        result.versions = versions.map((version: any) => ({
          ...version,
          variables: safeParseJSON(version.variables, []),
          metadata: safeParseJSON(version.metadata, {}),
          is_active: Boolean(version.is_active)
        }))
      }
      
      if (includeActiveVersion) {
        const activeVersion = promptVersionsDb.getActiveVersion(prompt.id)
        if (activeVersion) {
          result.activeVersion = {
            ...activeVersion,
            variables: safeParseJSON(activeVersion.variables, []),
            metadata: safeParseJSON(activeVersion.metadata, {}),
            is_active: Boolean(activeVersion.is_active)
          }
        }
      }
      
      // Parse JSON fields
      if (prompt.tags) result.tags = JSON.parse(prompt.tags)
      if (prompt.metadata) result.metadata = JSON.parse(prompt.metadata)
      
      return result
    })

    return NextResponse.json({
      success: true,
      prompts: enhancedPrompts
    })

  } catch (error) {
    console.error('Failed to fetch prompts:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch prompts'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/prompts - Create new prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, projectId, metadata, template, variables, variableDefinitions, commitMessage, versionNumber, status, comments, createdBy } = body

    if (!name || !projectId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Name and project ID are required'
        },
        { status: 400 }
      )
    }

    // Create the prompt
    const prompt = promptsDb.create({
      name,
      description,
      project_id: projectId,
      template: template || '',
      variables: variables || {},
      metadata: metadata || {},
      created_by: createdBy,
      updated_by: createdBy
    })

    // Create initial version if template is provided
    let promptVersion = null
    if (template) {
      const version = versionNumber || '1.0.0'
      const versionStatus = status || 'draft'
      
      promptVersion = promptVersionsDb.create({
        prompt_id: prompt.id,
        version,
        template,
        variables: variables || {},
        variable_definitions: variableDefinitions || [],
        is_active: versionStatus === 'current',
        status: versionStatus,
        comments: comments || '',
        changelog: commitMessage || 'Initial version',
        created_by: createdBy
      })
      
      // If setting as current, handle the status transition
      if (versionStatus === 'current') {
        promptVersionsDb.setAsCurrent(promptVersion.id)
      }
    }

    // Parse JSON fields for response
    const result = {
      ...prompt,
      variables: safeParseJSON(prompt.variables, {}),
      metadata: safeParseJSON(prompt.metadata, {}),
      activeVersion: promptVersion
    }

    return NextResponse.json({
      success: true,
      prompt: result
    })

  } catch (error) {
    console.error('Failed to create prompt:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create prompt'
      },
      { status: 500 }
    )
  }
}