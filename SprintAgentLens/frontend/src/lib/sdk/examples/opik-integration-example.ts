/**
 * Sprint Agent Lens Opik Integration Example
 * 
 * This example demonstrates how to use the Opik-compatible SDK
 * with Sprint Agent Lens for dataset management.
 */

import {
  initializeOpik,
  getOrCreateDataset,
  type OpikDatasetItem,
  type OpikSDKConfig
} from '../opik-integration'

/**
 * Main example function demonstrating SDK usage
 */
export async function runOpikIntegrationExample(): Promise<void> {
  console.log('🚀 Sprint Agent Lens Opik Integration Example')
  console.log('=' .repeat(50))

  try {
    // 1. Configure the SDK client
    console.log('\n1. Configuring SDK...')
    const config: OpikSDKConfig = {
      endpoint: 'http://localhost:3000',
      projectName: 'sdk_demo_project'
    }
    
    const client = initializeOpik(config)
    console.log('✅ SDK configured successfully')

    // 2. Create or get a dataset
    console.log('\n2. Creating/getting dataset...')
    const dataset = await client.getOrCreateDataset(
      'example_typescript_dataset',
      'Example dataset for TypeScript SDK demonstration'
    )
    console.log(`✅ Dataset ready: ${dataset.info.name} (ID: ${dataset.info.id})`)
    console.log(`   Current size: ${dataset.size} items`)

    // 3. Insert some example data
    console.log('\n3. Inserting example data...')
    const exampleItems: OpikDatasetItem[] = [
      {
        input_data: { question: 'What is TypeScript?' },
        expected_output: { answer: 'TypeScript is a typed superset of JavaScript...' },
        metadata: { category: 'programming', difficulty: 'easy' }
      },
      {
        input_data: { question: 'Explain async/await in JavaScript' },
        expected_output: { answer: 'Async/await is a syntax for handling promises...' },
        metadata: { category: 'javascript', difficulty: 'medium' }
      },
      {
        input_data: { question: 'What is React?' },
        expected_output: { answer: 'React is a JavaScript library for building UIs...' },
        metadata: { category: 'frontend', difficulty: 'easy' }
      }
    ]

    await dataset.insert(exampleItems)
    console.log(`✅ Inserted ${exampleItems.length} items`)

    // 4. Insert more data using various formats
    console.log('\n4. Inserting additional data...')
    const additionalItems: OpikDatasetItem[] = [
      {
        input_data: { question: 'What is Next.js?' },
        expected_output: { answer: 'Next.js is a React framework for production...' },
        metadata: { category: 'frontend', difficulty: 'medium' }
      },
      {
        input_data: { question: 'Explain REST vs GraphQL' },
        expected_output: { answer: 'REST and GraphQL are different API paradigms...' },
        metadata: { category: 'api', difficulty: 'hard' }
      }
    ]

    await dataset.insert(additionalItems)
    console.log(`✅ Inserted ${additionalItems.length} additional items`)
    console.log(`   New dataset size: ${dataset.size} items`)

    // 5. Download dataset data
    console.log('\n5. Downloading dataset data...')
    const allItems = await dataset.getItems()
    console.log(`✅ Downloaded dataset: ${allItems.length} items`)
    console.log('   Sample data:')
    console.log(JSON.stringify(allItems[0], null, 2))

    // 6. List all datasets
    console.log('\n6. Listing all datasets...')
    const allDatasets = await client.listDatasets()
    console.log(`✅ Found ${allDatasets.length} datasets:`)
    allDatasets.forEach(ds => {
      console.log(`   - ${ds.name} (ID: ${ds.id}, Size: ${ds.item_count})`)
    })

    console.log('\n🎉 TypeScript SDK Example completed successfully!')

  } catch (error) {
    console.error('\n❌ Error:', error)
    console.log('\nTroubleshooting:')
    console.log('1. Make sure Sprint Agent Lens is running on http://localhost:3000')
    console.log('2. Check that the database is properly initialized')
    console.log('3. Verify API endpoints are accessible')
  }
}

/**
 * Example of using the global client convenience function
 */
export async function runGlobalClientExample(): Promise<void> {
  console.log('\n🌍 Global Client Example')
  console.log('-'.repeat(30))

  try {
    // Using global convenience function
    const dataset = await getOrCreateDataset(
      'global_client_dataset',
      'Dataset created using global client'
    )

    const items: OpikDatasetItem[] = [
      {
        input_data: { query: 'Global client test' },
        expected_output: { result: 'Success' },
        metadata: { source: 'global_client_example' }
      }
    ]

    await dataset.insert(items)
    console.log(`✅ Global client dataset created with ${dataset.size} items`)

  } catch (error) {
    console.error('❌ Global client example error:', error)
  }
}

/**
 * Example of dataset operations (clear, delete)
 */
export async function runDatasetOperationsExample(): Promise<void> {
  console.log('\n🛠️  Dataset Operations Example')
  console.log('-'.repeat(35))

  try {
    const client = initializeOpik({ endpoint: 'http://localhost:3000' })
    
    // Create a temporary dataset
    const tempDataset = await client.getOrCreateDataset(
      'temp_operations_dataset',
      'Temporary dataset for operations demo'
    )

    // Add some data
    const items: OpikDatasetItem[] = [
      {
        input_data: { test: 'data1' },
        expected_output: { result: 'output1' }
      },
      {
        input_data: { test: 'data2' },
        expected_output: { result: 'output2' }
      }
    ]

    await tempDataset.insert(items)
    console.log(`✅ Created temporary dataset with ${tempDataset.size} items`)

    // Clear the dataset
    await tempDataset.clear()
    console.log('✅ Dataset cleared')

    // Delete the dataset
    await tempDataset.delete()
    console.log('✅ Dataset deleted')

  } catch (error) {
    console.error('❌ Dataset operations error:', error)
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  await runOpikIntegrationExample()
  await runGlobalClientExample()
  await runDatasetOperationsExample()
}

// Export example usage patterns
export const ExampleUsagePatterns = {
  
  basicSetup: `
import { initializeOpik } from '@/lib/sdk'

// Initialize the client
const client = initializeOpik({
  endpoint: 'http://localhost:3000',
  projectName: 'my-project'
})
`,

  datasetCreation: `
// Create or get a dataset
const dataset = await client.getOrCreateDataset(
  'my-dataset',
  'Description of my dataset'
)
`,

  dataInsertion: `
// Insert data items
const items = [
  {
    input_data: { question: 'What is AI?' },
    expected_output: { answer: 'AI is...' },
    metadata: { category: 'general' }
  }
]

await dataset.insert(items)
`,

  dataRetrieval: `
// Get all items
const allItems = await dataset.getItems()

// Get items with pagination
const paginatedItems = await dataset.getItems(10, 0) // limit, offset
`,

  globalClient: `
import { getOrCreateDataset } from '@/lib/sdk'

// Use global client convenience function
const dataset = await getOrCreateDataset('my-dataset')
`
}

// Default export for convenience
export default runAllExamples