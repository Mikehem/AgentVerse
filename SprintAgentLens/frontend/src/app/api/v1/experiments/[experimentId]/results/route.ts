import { NextRequest, NextResponse } from 'next/server'
import Database from 'better-sqlite3'
import path from 'path'

// Database connection
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')
const db = new Database(dbPath)

// GET /api/v1/experiments/[experimentId]/results - Get experiment results
export async function GET(
  request: NextRequest,
  { params }: { params: { experimentId: string } }
) {
  try {
    const { experimentId } = params
    const { searchParams } = new URL(request.url)
    const runId = searchParams.get('runId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get experiment runs
    let runsQuery = `
      SELECT 
        er.*,
        e.name as experiment_name,
        pv.version as prompt_version,
        p.name as prompt_name
      FROM experiment_runs er
      LEFT JOIN experiments e ON er.experiment_id = e.id
      LEFT JOIN prompt_versions pv ON er.prompt_version_id = pv.id
      LEFT JOIN prompts p ON pv.prompt_id = p.id
      WHERE er.experiment_id = ?
    `
    const runsParams = [experimentId]

    if (runId) {
      runsQuery += ' AND er.id = ?'
      runsParams.push(runId)
    }

    runsQuery += ' ORDER BY er.created_at DESC'

    const runs = db.prepare(runsQuery).all(...runsParams)

    if (runs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No experiment runs found'
      }, { status: 404 })
    }

    // For each run, get detailed results
    const runsWithResults = runs.map(run => {
      // Get aggregate scores
      const aggregateScores = run.aggregate_scores ? JSON.parse(run.aggregate_scores) : {}
      
      // Get evaluation IDs
      const evaluationIds = run.evaluation_ids ? JSON.parse(run.evaluation_ids) : []
      
      // Get detailed results
      const resultsQuery = `
        SELECT 
          r.*,
          di.input_data as dataset_input,
          di.expected_output as dataset_expected_output
        FROM experiment_results r
        LEFT JOIN dataset_items di ON r.dataset_item_id = di.id
        WHERE r.experiment_run_id = ?
        ORDER BY r.created_at ASC
        LIMIT ? OFFSET ?
      `
      
      const results = db.prepare(resultsQuery).all(run.id, limit, offset)
      
      // Get total count
      const totalResults = db.prepare(`
        SELECT COUNT(*) as count FROM experiment_results WHERE experiment_run_id = ?
      `).get(run.id) as { count: number }

      // Parse JSON fields in results
      const parsedResults = results.map(result => ({
        ...result,
        input_data: result.input_data ? JSON.parse(result.input_data) : {},
        expected_output: result.expected_output ? JSON.parse(result.expected_output) : null,
        evaluation_scores: result.evaluation_scores ? JSON.parse(result.evaluation_scores) : {},
        dataset_input: result.dataset_input ? JSON.parse(result.dataset_input) : {},
        dataset_expected_output: result.dataset_expected_output ? JSON.parse(result.dataset_expected_output) : null,
        metadata: result.metadata ? JSON.parse(result.metadata) : {}
      }))

      return {
        ...run,
        evaluation_ids: evaluationIds,
        aggregate_scores: aggregateScores,
        results: parsedResults,
        results_pagination: {
          total: totalResults.count,
          limit,
          offset,
          hasNext: offset + limit < totalResults.count,
          hasPrev: offset > 0
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: runsWithResults
    })

  } catch (error) {
    console.error('Error fetching experiment results:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch experiment results'
    }, { status: 500 })
  }
}

// GET /api/v1/experiments/[experimentId]/results/summary - Get experiment results summary
export async function POST(
  request: NextRequest,
  { params }: { params: { experimentId: string } }
) {
  try {
    const { experimentId } = params
    
    // Get experiment with latest run
    const experiment = db.prepare(`
      SELECT e.*, er.id as latest_run_id, er.status as run_status,
             er.aggregate_scores, er.total_items, er.completed_items, 
             er.failed_items, er.execution_time
      FROM experiments e
      LEFT JOIN experiment_runs er ON e.id = er.experiment_id
      WHERE e.id = ?
      ORDER BY er.created_at DESC
      LIMIT 1
    `).get(experimentId)

    if (!experiment) {
      return NextResponse.json({
        success: false,
        error: 'Experiment not found'
      }, { status: 404 })
    }

    // Get all runs for this experiment
    const allRuns = db.prepare(`
      SELECT id, status, created_at, completed_at, total_items, 
             completed_items, failed_items, execution_time, aggregate_scores
      FROM experiment_runs 
      WHERE experiment_id = ?
      ORDER BY created_at DESC
    `).all(experimentId)

    // Calculate summary statistics
    const summary = {
      experiment: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status,
        created_at: experiment.created_at
      },
      latest_run: experiment.latest_run_id ? {
        id: experiment.latest_run_id,
        status: experiment.run_status,
        total_items: experiment.total_items,
        completed_items: experiment.completed_items,
        failed_items: experiment.failed_items,
        execution_time: experiment.execution_time,
        aggregate_scores: experiment.aggregate_scores ? JSON.parse(experiment.aggregate_scores) : {}
      } : null,
      run_history: allRuns.map(run => ({
        ...run,
        aggregate_scores: run.aggregate_scores ? JSON.parse(run.aggregate_scores) : {}
      })),
      statistics: {
        total_runs: allRuns.length,
        successful_runs: allRuns.filter(run => run.status === 'completed').length,
        failed_runs: allRuns.filter(run => run.status === 'failed').length,
        average_execution_time: allRuns.length > 0 
          ? allRuns.reduce((sum, run) => sum + (run.execution_time || 0), 0) / allRuns.length 
          : 0
      }
    }

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    console.error('Error fetching experiment summary:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch experiment summary'
    }, { status: 500 })
  }
}