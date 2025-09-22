import { NextRequest, NextResponse } from 'next/server'
import { promptVersionsDb } from '@/lib/database'

// POST /api/v1/prompts/[id]/versions/[versionId]/activate - Activate version
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const versionId = params.versionId

    const activated = promptVersionsDb.activate(versionId)

    if (!activated) {
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
      ...activated,
      variables: activated.variables ? JSON.parse(activated.variables) : [],
      metadata: activated.metadata ? JSON.parse(activated.metadata) : {},
      is_active: Boolean(activated.is_active)
    }

    return NextResponse.json({
      success: true,
      version: result,
      message: 'Version activated successfully'
    })

  } catch (error) {
    console.error('Failed to activate prompt version:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to activate prompt version'
      },
      { status: 500 }
    )
  }
}