import { NextRequest, NextResponse } from 'next/server'
import { agentPromptLinksDb, agentDb, promptVersionsDb } from '@/lib/database'

// GET /api/v1/agent-prompt-links - Get agent-prompt links
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const promptId = searchParams.get('promptId')
    const isActive = searchParams.get('isActive')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    let query = 'SELECT * FROM agent_prompt_links WHERE 1=1'
    let params: any[] = []

    if (agentId) {
      query += ' AND agent_id = ?'
      params.push(agentId)
    }

    if (isActive !== null) {
      query += ' AND is_active = ?'
      params.push(isActive === 'true' ? 1 : 0)
    }

    query += ' ORDER BY linked_at DESC'

    let links = agentPromptLinksDb.getAll(query, params)

    // Filter by promptId if provided (requires joining with prompt_versions)
    if (promptId) {
      const versionQuery = 'SELECT id FROM prompt_versions WHERE prompt_id = ?'
      const versions = promptVersionsDb.getAll(versionQuery, [promptId])
      const versionIds = versions.map(v => v.id)
      
      links = links.filter(link => versionIds.includes(link.prompt_version_id))
    }

    // Enhance with details if requested
    if (includeDetails) {
      const enhancedLinks = links.map(link => {
        const result: any = { ...link }
        
        // Get agent details
        const agent = agentDb.getById(link.agent_id)
        if (agent) {
          result.agent = {
            id: agent.id,
            name: agent.name,
            description: agent.description
          }
        }
        
        // Get prompt version details
        const version = promptVersionsDb.getById(link.prompt_version_id)
        if (version) {
          result.promptVersion = {
            id: version.id,
            prompt_id: version.prompt_id,
            version_number: version.version_number,
            template: version.template,
            variables: version.variables ? JSON.parse(version.variables) : [],
            commit_message: version.commit_message
          }
        }
        
        result.is_active = Boolean(result.is_active)
        return result
      })
      
      return NextResponse.json({
        success: true,
        links: enhancedLinks
      })
    }

    // Convert is_active to boolean
    const formattedLinks = links.map(link => ({
      ...link,
      is_active: Boolean(link.is_active)
    }))

    return NextResponse.json({
      success: true,
      links: formattedLinks
    })

  } catch (error) {
    console.error('Failed to fetch agent-prompt links:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch agent-prompt links'
      },
      { status: 500 }
    )
  }
}

// POST /api/v1/agent-prompt-links - Create new agent-prompt link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, promptVersionId, isActive = false, linkedBy } = body

    if (!agentId || !promptVersionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent ID and prompt version ID are required'
        },
        { status: 400 }
      )
    }

    // Verify agent exists
    const agent = agentDb.getById(agentId)
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Agent not found'
        },
        { status: 404 }
      )
    }

    // Verify prompt version exists
    const version = promptVersionsDb.getById(promptVersionId)
    if (!version) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prompt version not found'
        },
        { status: 404 }
      )
    }

    // Check if link already exists
    const existingQuery = 'SELECT * FROM agent_prompt_links WHERE agent_id = ? AND prompt_version_id = ?'
    const existing = agentPromptLinksDb.getAll(existingQuery, [agentId, promptVersionId])
    
    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Link between agent and prompt version already exists'
        },
        { status: 400 }
      )
    }

    const link = agentPromptLinksDb.create({
      agent_id: agentId,
      prompt_version_id: promptVersionId,
      is_active: isActive,
      linked_by: linkedBy
    })

    // If this link is set as active, deactivate others for the same agent
    if (isActive) {
      agentPromptLinksDb.activate(link.id)
    }

    const result = {
      ...link,
      is_active: Boolean(link.is_active)
    }

    return NextResponse.json({
      success: true,
      link: result
    })

  } catch (error) {
    console.error('Failed to create agent-prompt link:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create agent-prompt link'
      },
      { status: 500 }
    )
  }
}