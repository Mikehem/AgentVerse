import { NextRequest, NextResponse } from 'next/server'
import { llmProvidersDb } from '@/lib/database'
import { LLMEvaluationService } from '@/lib/services/llmEvaluationService'

// POST /api/v1/llm/evaluate - Evaluate content using LLM-based metrics (G-Eval, Hallucination, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      providerId,
      metricType,
      expectedOutput,
      actualOutput,
      query,
      model,
      temperature = 0.1,
      // G-Eval specific fields
      taskIntroduction,
      evaluationCriteria,
      evaluationSteps,
      // Hallucination specific fields
      context
    } = body

    // Validate required fields
    if (!providerId || !metricType || !actualOutput) {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider ID, metric type, and actual output are required'
        },
        { status: 400 }
      )
    }

    // Validate metric-specific requirements
    if (metricType === 'hallucination' && !context) {
      return NextResponse.json(
        {
          success: false,
          error: 'Context is required for hallucination detection'
        },
        { status: 400 }
      )
    }

    if (metricType === 'g_eval' && (!taskIntroduction || !evaluationCriteria)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Task introduction and evaluation criteria are required for G-Eval'
        },
        { status: 400 }
      )
    }

    // Get provider configuration
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

    if (provider.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'Provider is not active'
        },
        { status: 400 }
      )
    }

    // Parse provider configuration
    let config, credentials
    try {
      config = typeof provider.config === 'string' ? JSON.parse(provider.config) : provider.config
      credentials = typeof provider.credentials === 'string' ? JSON.parse(provider.credentials) : provider.credentials
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid provider configuration'
        },
        { status: 500 }
      )
    }

    const startTime = Date.now()

    try {
      // Initialize evaluation service
      const evaluationService = new LLMEvaluationService()
      
      // Prepare evaluation request
      const evaluationRequest = {
        metricType,
        actualOutput,
        expectedOutput,
        query,
        context,
        taskIntroduction,
        evaluationCriteria,
        evaluationSteps,
        model: model || getDefaultModel(provider.type),
        temperature
      }

      // Execute evaluation based on provider type
      let result
      switch (provider.type) {
        case 'openai':
          result = await evaluationService.evaluateWithOpenAI(evaluationRequest, credentials)
          break
        case 'azure_openai':
          result = await evaluationService.evaluateWithAzureOpenAI(evaluationRequest, config, credentials)
          break
        case 'anthropic':
          result = await evaluationService.evaluateWithAnthropic(evaluationRequest, credentials)
          break
        case 'google':
          result = await evaluationService.evaluateWithGoogle(evaluationRequest, credentials)
          break
        case 'xai':
          result = await evaluationService.evaluateWithXAI(evaluationRequest, credentials)
          break
        case 'mistral':
          result = await evaluationService.evaluateWithMistral(evaluationRequest, credentials)
          break
        default:
          throw new Error(`Unsupported provider type for evaluation: ${provider.type}`)
      }

      const endTime = Date.now()
      const executionTime = endTime - startTime

      return NextResponse.json({
        success: true,
        ...result,
        executionTime,
        metadata: {
          provider: provider.name,
          providerType: provider.type,
          metricType,
          model: result.model || model || getDefaultModel(provider.type)
        }
      })

    } catch (error) {
      const endTime = Date.now()
      const executionTime = endTime - startTime

      console.error('Evaluation error:', error)

      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown evaluation error occurred',
        executionTime,
        metricType
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Failed to process evaluation request:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process evaluation request'
      },
      { status: 500 }
    )
  }
}

// GET /api/v1/llm/evaluate - Get supported evaluation metrics
export async function GET() {
  try {
    const supportedMetrics = [
      {
        type: 'g_eval',
        name: 'G-Eval',
        description: 'LLM-based evaluation with Chain of Thought reasoning for task-agnostic assessment',
        requiredFields: ['taskIntroduction', 'evaluationCriteria'],
        optionalFields: ['evaluationSteps']
      },
      {
        type: 'hallucination',
        name: 'Hallucination Detection',
        description: 'Detect hallucinations by comparing output against provided context',
        requiredFields: ['context'],
        optionalFields: []
      }
    ]

    return NextResponse.json({
      success: true,
      metrics: supportedMetrics,
      totalMetrics: supportedMetrics.length
    })

  } catch (error) {
    console.error('Failed to get supported metrics:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get supported metrics'
      },
      { status: 500 }
    )
  }
}

// Helper function to get default model for each provider type
function getDefaultModel(providerType: string): string {
  const defaultModels: { [key: string]: string } = {
    'openai': 'gpt-4',
    'azure_openai': 'gpt-4',
    'anthropic': 'claude-3-sonnet-20240229',
    'google': 'gemini-pro',
    'xai': 'grok-beta',
    'mistral': 'mistral-large-latest'
  }
  
  return defaultModels[providerType] || 'gpt-4'
}