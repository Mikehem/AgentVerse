import { NextRequest, NextResponse } from 'next/server'

interface RouteParams {
  params: Promise<{ ruleId: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ruleId } = await params
    
    // In a real implementation, fetch from database
    // For now, return mock data
    return NextResponse.json({
      success: true,
      data: {
        id: ruleId,
        name: 'Sample Rule',
        status: 'active'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { ruleId } = await params
    const body = await request.json()
    
    // In a real implementation, update in database
    console.log(`Updating rule ${ruleId} with:`, body)
    
    return NextResponse.json({
      success: true,
      data: {
        id: ruleId,
        ...body,
        updated_at: new Date().toISOString()
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { ruleId } = await params
    
    // In a real implementation, delete from database
    console.log(`Deleting rule ${ruleId}`)
    
    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 })
  }
}