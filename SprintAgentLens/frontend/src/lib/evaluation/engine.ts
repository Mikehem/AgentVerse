// Evaluation execution engine for running metrics against datasets

import { 
  BaseMetric, 
  MetricFactory, 
  MetricResult, 
  EvaluationContext 
} from './metrics'
import { 
  heuristicMetricsDb, 
  evaluationRunsDb, 
  metricResultsDb 
} from '../database'

export interface EvaluationRunConfig {
  evaluationId: string
  datasetId?: string
  metricIds: string[]
  datasetItems?: DatasetItem[]
  options?: {
    parallel?: boolean
    maxConcurrency?: number
    stopOnFirstFailure?: boolean
    timeout?: number
  }
}

export interface DatasetItem {
  id: string
  input_data: any
  expected_output?: any
  metadata?: any
}

export interface EvaluationProgress {
  runId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalItems: number
  processedItems: number
  currentItem?: string
  startTime?: string
  estimatedCompletion?: string
  errors: string[]
}

export interface EvaluationSummary {
  runId: string
  totalItems: number
  processedItems: number
  passedItems: number
  failedItems: number
  averageScore: number
  executionTime: number
  metricSummaries: MetricSummary[]
}

export interface MetricSummary {
  metricId: string
  metricName: string
  metricType: string
  totalEvaluations: number
  passedEvaluations: number
  averageScore: number
  averageExecutionTime: number
}

export class EvaluationEngine {
  private activeRuns = new Map<string, EvaluationProgress>()
  private progressCallbacks = new Map<string, (progress: EvaluationProgress) => void>()

  async startEvaluationRun(config: EvaluationRunConfig): Promise<string> {
    // Validate configuration
    this.validateConfig(config)

    // Get evaluation details
    const evaluation = await this.getEvaluation(config.evaluationId)
    if (!evaluation) {
      throw new Error(`Evaluation not found: ${config.evaluationId}`)
    }

    // Get metrics
    const metrics = await this.loadMetrics(config.metricIds)
    if (metrics.length === 0) {
      throw new Error('No valid metrics found for evaluation')
    }

    // Get dataset items
    const datasetItems = config.datasetItems || await this.loadDatasetItems(config.datasetId)
    if (datasetItems.length === 0) {
      throw new Error('No dataset items found for evaluation')
    }

    // Create evaluation run record
    const evaluationRun = evaluationRunsDb.create({
      evaluation_id: config.evaluationId,
      dataset_id: config.datasetId,
      total_items: datasetItems.length,
      metrics_config: JSON.stringify({
        metricIds: config.metricIds,
        options: config.options || {}
      })
    })

    if (!evaluationRun) {
      throw new Error('Failed to create evaluation run')
    }

    // Initialize progress tracking
    const progress: EvaluationProgress = {
      runId: evaluationRun.id,
      status: 'pending',
      totalItems: datasetItems.length,
      processedItems: 0,
      errors: []
    }
    
    this.activeRuns.set(evaluationRun.id, progress)

    // Start execution asynchronously
    this.executeEvaluation(evaluationRun.id, metrics, datasetItems, config.options || {})
      .catch(error => {
        console.error('Evaluation execution failed:', error)
        this.updateProgress(evaluationRun.id, { 
          status: 'failed', 
          errors: [error.message] 
        })
      })

    return evaluationRun.id
  }

  async getProgress(runId: string): Promise<EvaluationProgress | null> {
    const progress = this.activeRuns.get(runId)
    if (progress) {
      return { ...progress }
    }

    // Try to get progress from database if not in memory
    const run = evaluationRunsDb.getById(runId)
    if (run) {
      return {
        runId: run.id,
        status: run.status as any,
        totalItems: run.total_items,
        processedItems: run.processed_items,
        startTime: run.start_time,
        errors: run.error_message ? [run.error_message] : []
      }
    }

    return null
  }

  onProgress(runId: string, callback: (progress: EvaluationProgress) => void): void {
    this.progressCallbacks.set(runId, callback)
  }

  async stopEvaluation(runId: string): Promise<boolean> {
    const progress = this.activeRuns.get(runId)
    if (progress && progress.status === 'running') {
      this.updateProgress(runId, { status: 'failed', errors: ['Stopped by user'] })
      this.activeRuns.delete(runId)
      this.progressCallbacks.delete(runId)
      return true
    }
    return false
  }

  async getEvaluationSummary(runId: string): Promise<EvaluationSummary | null> {
    const run = evaluationRunsDb.getById(runId)
    if (!run) return null

    const results = metricResultsDb.getByRunId(runId)
    const stats = metricResultsDb.getRunStats(runId)

    // Group results by metric
    const metricGroups = new Map<string, any[]>()
    results.forEach(result => {
      if (!metricGroups.has(result.metric_id)) {
        metricGroups.set(result.metric_id, [])
      }
      metricGroups.get(result.metric_id)!.push(result)
    })

    // Calculate metric summaries
    const metricSummaries: MetricSummary[] = []
    for (const [metricId, metricResults] of metricGroups) {
      const metric = heuristicMetricsDb.getById(metricId)
      const passedCount = metricResults.filter(r => r.passed).length
      const totalScore = metricResults.reduce((sum, r) => sum + r.score, 0)
      const totalTime = metricResults.reduce((sum, r) => sum + (r.execution_time || 0), 0)

      metricSummaries.push({
        metricId,
        metricName: metric?.name || 'Unknown',
        metricType: metric?.type || 'unknown',
        totalEvaluations: metricResults.length,
        passedEvaluations: passedCount,
        averageScore: metricResults.length > 0 ? totalScore / metricResults.length : 0,
        averageExecutionTime: metricResults.length > 0 ? totalTime / metricResults.length : 0
      })
    }

    const executionTime = run.start_time && run.end_time 
      ? new Date(run.end_time).getTime() - new Date(run.start_time).getTime()
      : 0

    return {
      runId,
      totalItems: run.total_items,
      processedItems: run.processed_items,
      passedItems: stats?.passed_count || 0,
      failedItems: (stats?.total_results || 0) - (stats?.passed_count || 0),
      averageScore: stats?.avg_score || 0,
      executionTime,
      metricSummaries
    }
  }

  private async executeEvaluation(
    runId: string,
    metrics: BaseMetric[],
    datasetItems: DatasetItem[],
    options: any
  ): Promise<void> {
    const startTime = new Date().toISOString()
    
    // Update run status to running
    evaluationRunsDb.updateProgress(runId, {
      status: 'running',
      start_time: startTime
    })

    this.updateProgress(runId, { 
      status: 'running', 
      startTime 
    })

    const { 
      parallel = false, 
      maxConcurrency = 5, 
      stopOnFirstFailure = false,
      timeout = 30000 
    } = options

    try {
      if (parallel) {
        await this.executeParallel(runId, metrics, datasetItems, maxConcurrency, stopOnFirstFailure, timeout)
      } else {
        await this.executeSequential(runId, metrics, datasetItems, stopOnFirstFailure, timeout)
      }

      // Mark as completed
      const endTime = new Date().toISOString()
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
      
      evaluationRunsDb.updateProgress(runId, {
        status: 'completed',
        end_time: endTime,
        duration
      })

      this.updateProgress(runId, { status: 'completed' })

    } catch (error) {
      const endTime = new Date().toISOString()
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime()
      
      evaluationRunsDb.updateProgress(runId, {
        status: 'failed',
        end_time: endTime,
        duration,
        error_message: error.message
      })

      this.updateProgress(runId, { 
        status: 'failed', 
        errors: [error.message] 
      })
    } finally {
      // Clean up
      setTimeout(() => {
        this.activeRuns.delete(runId)
        this.progressCallbacks.delete(runId)
      }, 60000) // Keep for 1 minute after completion
    }
  }

  private async executeSequential(
    runId: string,
    metrics: BaseMetric[],
    datasetItems: DatasetItem[],
    stopOnFirstFailure: boolean,
    timeout: number
  ): Promise<void> {
    let processedItems = 0

    for (const item of datasetItems) {
      // Check if run was stopped
      const progress = this.activeRuns.get(runId)
      if (!progress || progress.status !== 'running') {
        throw new Error('Evaluation run was stopped')
      }

      this.updateProgress(runId, { 
        currentItem: item.id,
        processedItems 
      })

      await this.evaluateItem(runId, item, metrics, timeout, stopOnFirstFailure)
      
      processedItems++
      evaluationRunsDb.updateProgress(runId, { processed_items: processedItems })
      this.updateProgress(runId, { processedItems })
    }
  }

  private async executeParallel(
    runId: string,
    metrics: BaseMetric[],
    datasetItems: DatasetItem[],
    maxConcurrency: number,
    stopOnFirstFailure: boolean,
    timeout: number
  ): Promise<void> {
    let processedItems = 0
    const semaphore = new Semaphore(maxConcurrency)

    const promises = datasetItems.map(async (item) => {
      await semaphore.acquire()
      
      try {
        // Check if run was stopped
        const progress = this.activeRuns.get(runId)
        if (!progress || progress.status !== 'running') {
          throw new Error('Evaluation run was stopped')
        }

        await this.evaluateItem(runId, item, metrics, timeout, stopOnFirstFailure)
        
        processedItems++
        evaluationRunsDb.updateProgress(runId, { processed_items: processedItems })
        this.updateProgress(runId, { processedItems })
        
      } finally {
        semaphore.release()
      }
    })

    await Promise.all(promises)
  }

  private async evaluateItem(
    runId: string,
    item: DatasetItem,
    metrics: BaseMetric[],
    timeout: number,
    stopOnFirstFailure: boolean
  ): Promise<void> {
    const context: EvaluationContext = {
      input: this.extractInput(item.input_data),
      output: this.extractOutput(item.input_data),
      expectedOutput: item.expected_output,
      metadata: item.metadata
    }

    for (const metric of metrics) {
      try {
        const result = await Promise.race([
          metric.evaluate(context),
          this.timeoutPromise(timeout)
        ])

        // Store result
        metricResultsDb.create({
          evaluation_run_id: runId,
          dataset_item_id: item.id,
          metric_id: metric.id,
          score: result.score,
          passed: result.passed ? 1 : 0,
          details: JSON.stringify(result.details),
          execution_time: result.executionTime
        })

        // Stop on first failure if configured
        if (stopOnFirstFailure && !result.passed) {
          throw new Error(`Evaluation failed on metric ${metric.name}: score ${result.score}`)
        }

      } catch (error) {
        // Store failed result
        metricResultsDb.create({
          evaluation_run_id: runId,
          dataset_item_id: item.id,
          metric_id: metric.id,
          score: 0,
          passed: 0,
          details: JSON.stringify({ error: error.message }),
          execution_time: 0
        })

        if (stopOnFirstFailure) {
          throw error
        }
      }
    }
  }

  private extractInput(inputData: any): string {
    if (typeof inputData === 'string') return inputData
    if (inputData && typeof inputData === 'object') {
      return inputData.input || inputData.prompt || inputData.text || JSON.stringify(inputData)
    }
    return String(inputData)
  }

  private extractOutput(inputData: any): string {
    if (inputData && typeof inputData === 'object') {
      return inputData.output || inputData.response || inputData.result || ''
    }
    return ''
  }

  private async timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Evaluation timeout after ${ms}ms`)), ms)
    })
  }

  private updateProgress(runId: string, updates: Partial<EvaluationProgress>): void {
    const progress = this.activeRuns.get(runId)
    if (progress) {
      Object.assign(progress, updates)
      
      const callback = this.progressCallbacks.get(runId)
      if (callback) {
        callback({ ...progress })
      }
    }
  }

  private validateConfig(config: EvaluationRunConfig): void {
    if (!config.evaluationId) {
      throw new Error('evaluationId is required')
    }
    if (!config.metricIds || config.metricIds.length === 0) {
      throw new Error('At least one metric ID is required')
    }
    if (!config.datasetId && !config.datasetItems) {
      throw new Error('Either datasetId or datasetItems is required')
    }
  }

  private async getEvaluation(evaluationId: string): Promise<any> {
    // Query the evaluations table from the database
    try {
      const response = await fetch(`/api/v1/evaluations?id=${evaluationId}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch evaluation ${evaluationId}`)
      }
      const result = await response.json()
      if (result.success && result.data.length > 0) {
        return result.data[0]
      }
      throw new Error(`Evaluation ${evaluationId} not found`)
    } catch (error) {
      console.error('Error fetching evaluation:', error)
      throw error
    }
  }

  private async loadMetrics(metricIds: string[]): Promise<BaseMetric[]> {
    const metrics: BaseMetric[] = []
    
    for (const metricId of metricIds) {
      const metricData = heuristicMetricsDb.getById(metricId)
      if (metricData) {
        try {
          const config = JSON.parse(metricData.config)
          const metric = MetricFactory.createMetric(
            metricData.type,
            metricData.id,
            metricData.name,
            metricData.description,
            config
          )
          metrics.push(metric)
        } catch (error) {
          console.error(`Failed to load metric ${metricId}:`, error)
        }
      }
    }
    
    return metrics
  }

  private async loadDatasetItems(datasetId?: string): Promise<DatasetItem[]> {
    if (!datasetId) return []
    
    // This would query the dataset_items table
    // For now, return empty array
    return []
  }
}

// Semaphore for controlling concurrency
class Semaphore {
  private permits: number
  private waiting: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return Promise.resolve()
    }

    return new Promise(resolve => {
      this.waiting.push(resolve)
    })
  }

  release(): void {
    this.permits++
    const next = this.waiting.shift()
    if (next) {
      this.permits--
      next()
    }
  }
}

// Export singleton instance
export const evaluationEngine = new EvaluationEngine()