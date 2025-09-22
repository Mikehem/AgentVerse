/**
 * Opik-Compatible SDK Integration for Sprint Agent Lens
 * 
 * This module provides Opik-compatible APIs for seamless integration
 * with existing Opik workflows while leveraging Sprint Agent Lens infrastructure.
 */

import { AgentLensClient } from './client'

export interface OpikDatasetItem {
  input_data: Record<string, any>
  expected_output?: Record<string, any>
  metadata?: Record<string, any>
}

export interface OpikDataset {
  id: string
  name: string
  description?: string
  project_id?: string
  project_name?: string
  item_count: number
  created_at: string
  updated_at: string
}

export interface OpikSDKConfig {
  apiKey?: string
  endpoint?: string
  projectName?: string
  workspaceName?: string
}

/**
 * Opik-compatible client wrapper for Sprint Agent Lens
 */
export class OpikClient {
  private client: AgentLensClient
  private config: OpikSDKConfig
  private baseUrl: string

  constructor(config: OpikSDKConfig = {}) {
    this.config = config
    this.baseUrl = config.endpoint || 'http://localhost:3000'
    
    // Initialize underlying Agent Lens client
    this.client = new AgentLensClient({
      serviceName: 'opik-integration',
      version: '1.0.0',
      endpoint: this.baseUrl,
      apiKey: config.apiKey
    })
  }

  /**
   * Get or create a dataset (Opik-compatible method)
   */
  async getOrCreateDataset(name: string, description?: string): Promise<OpikDatasetManager> {
    try {
      // Try to find existing dataset first
      const response = await fetch(`${this.baseUrl}/api/v1/datasets`, {
        headers: this.getHeaders(),
      })
      
      if (response.ok) {
        const result = await response.json()
        const existingDataset = result.data?.find((d: OpikDataset) => d.name === name)
        
        if (existingDataset) {
          return new OpikDatasetManager(existingDataset, this.baseUrl, this.getHeaders())
        }
      }

      // Create new dataset if not found
      const createResponse = await fetch(`${this.baseUrl}/api/v1/datasets`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          name,
          description: description || `Dataset created via Opik integration`,
          project_id: this.config.projectName || 'default',
          metadata: {
            source: 'opik_integration',
            created_by: 'opik_client'
          }
        })
      })

      if (!createResponse.ok) {
        throw new Error(`Failed to create dataset: ${createResponse.statusText}`)
      }

      const createResult = await createResponse.json()
      return new OpikDatasetManager(createResult.data, this.baseUrl, this.getHeaders())
    } catch (error) {
      throw new Error(`Failed to get or create dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * List all datasets
   */
  async listDatasets(): Promise<OpikDataset[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/datasets`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to list datasets: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      throw new Error(`Failed to list datasets: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get dataset by ID
   */
  async getDataset(datasetId: string): Promise<OpikDatasetManager> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/datasets/${datasetId}`, {
        headers: this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`Failed to get dataset: ${response.statusText}`)
      }

      const result = await response.json()
      return new OpikDatasetManager(result.data, this.baseUrl, this.getHeaders())
    } catch (error) {
      throw new Error(`Failed to get dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    return headers
  }
}

/**
 * Dataset manager with Opik-compatible methods
 */
export class OpikDatasetManager {
  private dataset: OpikDataset
  private baseUrl: string
  private headers: Record<string, string>

  constructor(dataset: OpikDataset, baseUrl: string, headers: Record<string, string>) {
    this.dataset = dataset
    this.baseUrl = baseUrl
    this.headers = headers
  }

  /**
   * Get dataset information
   */
  get info(): OpikDataset {
    return this.dataset
  }

  /**
   * Insert items into dataset (Opik-compatible)
   */
  async insert(items: OpikDatasetItem[]): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/datasets/${this.dataset.id}/items`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(items)
      })

      if (!response.ok) {
        throw new Error(`Failed to insert items: ${response.statusText}`)
      }

      // Update item count
      this.dataset.item_count += items.length
    } catch (error) {
      throw new Error(`Failed to insert items: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Insert from JSONL file
   */
  async insertFromJSONL(filePath: string): Promise<void> {
    // This would need to be implemented with file reading capabilities
    throw new Error('JSONL file insertion not yet implemented in browser environment')
  }

  /**
   * Insert from Pandas DataFrame (would need Python bridge)
   */
  async insertFromPandas(data: any[]): Promise<void> {
    // Convert tabular data to OpikDatasetItem format
    const items: OpikDatasetItem[] = data.map(row => ({
      input_data: row.input_data || row,
      expected_output: row.expected_output,
      metadata: row.metadata || {}
    }))

    return this.insert(items)
  }

  /**
   * Get all items from dataset
   */
  async getItems(limit?: number, offset?: number): Promise<OpikDatasetItem[]> {
    try {
      const params = new URLSearchParams()
      if (limit) params.append('limit', limit.toString())
      if (offset) params.append('offset', offset.toString())

      const response = await fetch(`${this.baseUrl}/api/v1/datasets/${this.dataset.id}/items?${params}`, {
        headers: this.headers
      })

      if (!response.ok) {
        throw new Error(`Failed to get items: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      throw new Error(`Failed to get items: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Clear all items from dataset
   */
  async clear(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/datasets/${this.dataset.id}/items`, {
        method: 'DELETE',
        headers: this.headers
      })

      if (!response.ok) {
        throw new Error(`Failed to clear dataset: ${response.statusText}`)
      }

      this.dataset.item_count = 0
    } catch (error) {
      throw new Error(`Failed to clear dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete the dataset
   */
  async delete(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/datasets/${this.dataset.id}`, {
        method: 'DELETE',
        headers: this.headers
      })

      if (!response.ok) {
        throw new Error(`Failed to delete dataset: ${response.statusText}`)
      }
    } catch (error) {
      throw new Error(`Failed to delete dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Download dataset as JSON
   */
  async toJSON(): Promise<OpikDatasetItem[]> {
    return this.getItems()
  }

  /**
   * Get dataset size
   */
  get size(): number {
    return this.dataset.item_count
  }
}

/**
 * Initialize Opik client with configuration
 */
export function initializeOpik(config: OpikSDKConfig = {}): OpikClient {
  return new OpikClient(config)
}

/**
 * Global client instance for convenience
 */
let globalOpikClient: OpikClient | null = null

/**
 * Set global Opik client
 */
export function setGlobalOpikClient(client: OpikClient): void {
  globalOpikClient = client
}

/**
 * Get global Opik client
 */
export function getGlobalOpikClient(): OpikClient {
  if (!globalOpikClient) {
    globalOpikClient = new OpikClient()
  }
  return globalOpikClient
}

/**
 * Convenience function to get or create dataset using global client
 */
export async function getOrCreateDataset(name: string, description?: string): Promise<OpikDatasetManager> {
  const client = getGlobalOpikClient()
  return client.getOrCreateDataset(name, description)
}

// Export types for external use
export type { OpikSDKConfig, OpikDataset, OpikDatasetItem }