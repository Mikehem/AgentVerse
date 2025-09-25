import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

// POST /api/v1/experiments/[experimentId]/run - Start experiment execution
export async function POST(
  request: NextRequest,
  { params }: { params: { experimentId: string } }
) {
  try {
    const { experimentId } = params
    
    // Get experiment details
    const experiment = db.prepare(`
      SELECT e.*, d.name as dataset_name 
      FROM experiments e
      LEFT JOIN datasets d ON e.dataset_id = d.id
      WHERE e.id = ?
    `).get(experimentId)

    if (!experiment) {
      return NextResponse.json({
        success: false,
        error: 'Experiment not found'
      }, { status: 404 })
    }

    // Parse configuration
    const config = experiment.configuration ? JSON.parse(experiment.configuration) : {}
    
    if (!config.prompt_version_id || !config.evaluation_ids) {
      return NextResponse.json({
        success: false,
        error: 'Experiment configuration is incomplete'
      }, { status: 400 })
    }

    // Get dataset items
    const datasetItems = db.prepare(`
      SELECT * FROM dataset_items WHERE dataset_id = ?
    `).all(experiment.dataset_id)

    if (datasetItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No dataset items found'
      }, { status: 400 })
    }

    // Get prompt version
    const promptVersion = db.prepare(`
      SELECT * FROM prompt_versions WHERE id = ?
    `).get(config.prompt_version_id)

    if (!promptVersion) {
      return NextResponse.json({
        success: false,
        error: 'Prompt version not found'
      }, { status: 400 })
    }

    // Get evaluations
    const evaluations = db.prepare(`
      SELECT * FROM evaluations WHERE id IN (${config.evaluation_ids.map(() => '?').join(',')})
    `).all(...config.evaluation_ids)

    if (evaluations.length !== config.evaluation_ids.length) {
      return NextResponse.json({
        success: false,
        error: 'Some evaluations not found'
      }, { status: 400 })
    }

    // Create experiment run
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()

    const runStmt = db.prepare(`
      INSERT INTO experiment_runs (
        id, experiment_id, prompt_version_id, evaluation_ids, 
        status, total_items, completed_items, failed_items,
        created_at, updated_at, started_at
      )
      VALUES (?, ?, ?, ?, 'running', ?, 0, 0, ?, ?, ?)
    `)

    runStmt.run(
      runId,
      experimentId,
      config.prompt_version_id,
      JSON.stringify(config.evaluation_ids),
      datasetItems.length,
      now,
      now,
      now
    )

    // Update experiment status
    db.prepare(`
      UPDATE experiments 
      SET status = 'running', updated_at = ?
      WHERE id = ?
    `).run(now, experimentId)

    // Start processing in background (simulate for now)
    // In a real implementation, this would be queued to a background job system
    processExperimentRun(runId, experiment, promptVersion, evaluations, datasetItems)

    return NextResponse.json({
      success: true,
      data: {
        runId,
        status: 'running',
        totalItems: datasetItems.length,
        message: 'Experiment execution started'
      }
    })

  } catch (error) {
    console.error('Error starting experiment run:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to start experiment execution'
    }, { status: 500 })
  }
}

// Background processing function (simplified simulation)
async function processExperimentRun(
  runId: string,
  experiment: any,
  promptVersion: any,
  evaluations: any[],
  datasetItems: any[]
) {
  try {
    const startTime = Date.now()
    let completedItems = 0
    let failedItems = 0
    const aggregateScores: any = {}

    // Initialize aggregate scores
    evaluations.forEach(eval => {
      aggregateScores[eval.id] = {
        name: eval.name,
        type: eval.type,
        scores: [],
        averageScore: 0,
        passRate: 0
      }
    })

    // Process each dataset item
    for (const item of datasetItems) {
      try {
        const itemInput = JSON.parse(item.input_data)
        const expectedOutput = item.expected_output ? JSON.parse(item.expected_output) : null

        // Simulate prompt processing (replace with actual LLM call)
        const generatedOutput = await simulatePromptExecution(promptVersion.template, itemInput)

        // Run evaluations
        const evaluationScores: any = {}
        let overallScore = 0
        let passed = true

        for (const evaluation of evaluations) {
          const score = await simulateEvaluation(evaluation, generatedOutput, expectedOutput, itemInput)
          evaluationScores[evaluation.id] = score
          
          aggregateScores[evaluation.id].scores.push(score.value)
          
          if (score.value < 0.7) { // Threshold for pass/fail
            passed = false
          }
          
          overallScore += score.value
        }

        overallScore = overallScore / evaluations.length

        // Save result
        const resultId = `result_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        db.prepare(`
          INSERT INTO experiment_results (
            id, experiment_run_id, dataset_item_id, input_data, 
            generated_output, expected_output, evaluation_scores,
            overall_score, passed, execution_time, created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          resultId,
          runId,
          item.id,
          JSON.stringify(itemInput),
          generatedOutput,
          expectedOutput ? JSON.stringify(expectedOutput) : null,
          JSON.stringify(evaluationScores),
          overallScore,
          passed ? 1 : 0,
          100 + Math.random() * 500, // Simulate execution time
          new Date().toISOString()
        )

        completedItems++

        // Update progress
        db.prepare(`
          UPDATE experiment_runs 
          SET completed_items = ?, updated_at = ?
          WHERE id = ?
        `).run(completedItems, new Date().toISOString(), runId)

      } catch (error) {
        console.error('Error processing item:', error)
        failedItems++
        
        db.prepare(`
          UPDATE experiment_runs 
          SET failed_items = ?, updated_at = ?
          WHERE id = ?
        `).run(failedItems, new Date().toISOString(), runId)
      }
    }

    // Calculate final aggregate scores
    for (const evalId in aggregateScores) {
      const scores = aggregateScores[evalId].scores
      aggregateScores[evalId].averageScore = scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length
      aggregateScores[evalId].passRate = scores.filter((score: number) => score >= 0.7).length / scores.length
    }

    const executionTime = Date.now() - startTime

    // Mark run as completed
    db.prepare(`
      UPDATE experiment_runs 
      SET status = 'completed', aggregate_scores = ?, execution_time = ?, 
          completed_at = ?, updated_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify(aggregateScores),
      executionTime,
      new Date().toISOString(),
      new Date().toISOString(),
      runId
    )

    // Update experiment status
    db.prepare(`
      UPDATE experiments 
      SET status = 'completed', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), experiment.id)

  } catch (error) {
    console.error('Error in experiment processing:', error)
    
    // Mark run as failed
    db.prepare(`
      UPDATE experiment_runs 
      SET status = 'failed', error_message = ?, updated_at = ?
      WHERE id = ?
    `).run(error.message, new Date().toISOString(), runId)

    // Update experiment status
    db.prepare(`
      UPDATE experiments 
      SET status = 'failed', updated_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), experiment.id)
  }
}

// Simulate prompt execution (replace with actual LLM integration)
async function simulatePromptExecution(template: string, input: any): Promise<string> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
  
  // Simple template replacement
  let processedTemplate = template
  for (const [key, value] of Object.entries(input)) {
    processedTemplate = processedTemplate.replace(new RegExp(`{${key}}`, 'g'), String(value))
  }
  
  // Generate simulated response
  const responses = [
    "This is a comprehensive response addressing the query with detailed analysis and recommendations.",
    "Based on the input provided, here are the key insights and actionable steps forward.",
    "The analysis reveals several important factors that should be considered in the decision-making process.",
    "After careful evaluation, the recommended approach involves a multi-step strategy for optimal results.",
    "The data suggests a clear pattern that can be leveraged to achieve the desired outcomes."
  ]
  
  return responses[Math.floor(Math.random() * responses.length)]
}

// Simulate evaluation execution
async function simulateEvaluation(
  evaluation: any, 
  generatedOutput: string, 
  expectedOutput: any, 
  input: any
): Promise<{ value: number; passed: boolean; details: any }> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))
  
  // Generate realistic scores based on evaluation type
  let score = 0.5 + Math.random() * 0.5 // Base score 0.5-1.0
  
  switch (evaluation.type) {
    case 'accuracy':
      score = 0.7 + Math.random() * 0.3
      break
    case 'relevance':
      score = 0.6 + Math.random() * 0.4
      break
    case 'coherence':
      score = 0.8 + Math.random() * 0.2
      break
    case 'hallucination':
      score = Math.random() * 0.3 // Lower is better for hallucination
      break
    default:
      score = 0.5 + Math.random() * 0.5
  }
  
  const passed = score >= 0.7
  
  return {
    value: Math.round(score * 100) / 100, // Round to 2 decimal places
    passed,
    details: {
      evaluation_type: evaluation.type,
      execution_time: Math.round(50 + Math.random() * 100),
      confidence: Math.round((0.8 + Math.random() * 0.2) * 100) / 100
    }
  }
}