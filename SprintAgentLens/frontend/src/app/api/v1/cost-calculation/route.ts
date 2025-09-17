import { NextRequest, NextResponse } from 'next/server'
import { calculateCost } from '@/lib/costCalculation'

export async function POST(request: NextRequest) {
  try {
    const { model, tokenUsage, provider } = await request.json()

    // Validate input
    if (!model || !tokenUsage) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: model and tokenUsage'
      }, { status: 400 })
    }

    if (!tokenUsage.promptTokens || !tokenUsage.completionTokens) {
      return NextResponse.json({
        success: false,
        error: 'Missing token usage fields: promptTokens and completionTokens'
      }, { status: 400 })
    }

    // Calculate cost using our enhanced cost calculation
    const costResult = calculateCost(model, tokenUsage, provider)

    return NextResponse.json({
      success: true,
      calculation: costResult,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Cost calculation API error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error calculating cost'
    }, { status: 500 })
  }
}