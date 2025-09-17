import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Simple authentication for development - accept any credentials
    // In production this should validate against actual user database
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: 'Username and password required'
      }, { status: 400 })
    }
    
    // Generate a simple token for development
    const token = `sl_token_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    return NextResponse.json({
      success: true,
      token: token,
      user: {
        id: 'dev_user',
        username: username,
        role: 'developer'
      },
      expires_in: 3600
    })
    
  } catch (error) {
    console.error('Authentication error:', error)
    return NextResponse.json({
      success: false,
      error: 'Authentication failed'
    }, { status: 500 })
  }
}