import Database from 'better-sqlite3'
import { Department, BusinessPriority, Project, Agent } from './types'
import path from 'path'
import { generateSpanId, generateTraceId, generateConversationId, generateMetricId, generateRunId, generateProjectId, generateDepartmentId, generatePriorityId, generateDistributedTraceId, generateDistributedSpanId, generateA2AId } from './idGenerator'

// Database file path
const dbPath = path.join(process.cwd(), 'data', 'sprintlens.db')

// Initialize database
const db = new Database(dbPath)

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL')

// Enable foreign key constraints
db.pragma('foreign_keys = ON')

// Migrate existing tables to add runId columns
const migrateTables = () => {
  try {
    // Check if runId column exists in conversations table
    const conversationColumns = db.prepare("PRAGMA table_info(conversations)").all() as any[]
    const hasRunIdInConversations = conversationColumns.some(col => col.name === 'runId')
    
    if (!hasRunIdInConversations) {
      console.log('📝 Adding runId column to conversations table...')
      db.exec('ALTER TABLE conversations ADD COLUMN runId TEXT')
    }
    
    // Check if runId column exists in metrics table
    const metricColumns = db.prepare("PRAGMA table_info(metrics)").all() as any[]
    const hasRunIdInMetrics = metricColumns.some(col => col.name === 'runId')
    
    if (!hasRunIdInMetrics) {
      console.log('📝 Adding runId column to metrics table...')
      db.exec('ALTER TABLE metrics ADD COLUMN runId TEXT')
    }
    
    // Add Opik-style evaluation fields to metrics table
    const hasEvaluationModel = metricColumns.some(col => col.name === 'evaluationModel')
    if (!hasEvaluationModel) {
      console.log('📝 Adding Opik-style evaluation fields to metrics table...')
      db.exec('ALTER TABLE metrics ADD COLUMN evaluationModel TEXT')
      db.exec('ALTER TABLE metrics ADD COLUMN referenceValue TEXT')
      db.exec('ALTER TABLE metrics ADD COLUMN threshold REAL')
    }
    
    // Check if feedback column exists in conversations table
    const hasFeedbackInConversations = conversationColumns.some(col => col.name === 'feedback')
    if (!hasFeedbackInConversations) {
      console.log('📝 Adding feedback column to conversations table...')
      db.exec('ALTER TABLE conversations ADD COLUMN feedback TEXT')
    }
    
    // Check if tags column exists in conversations table
    const hasTagsInConversations = conversationColumns.some(col => col.name === 'tags')
    if (!hasTagsInConversations) {
      console.log('📝 Adding tags column to conversations table...')
      db.exec('ALTER TABLE conversations ADD COLUMN tags TEXT') // JSON array of strings
    }
    
    // Check if annotations column exists in conversations table
    const hasAnnotationsInConversations = conversationColumns.some(col => col.name === 'annotations')
    if (!hasAnnotationsInConversations) {
      console.log('📝 Adding annotations column to conversations table...')
      db.exec('ALTER TABLE conversations ADD COLUMN annotations TEXT') // JSON object with key-value pairs
    }

    // Check if experiments table exists before migrating
    const experimentsTableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='experiments'").get()
    if (experimentsTableExists) {
      // Check if project_id column exists in experiments table
      const experimentColumns = db.prepare("PRAGMA table_info(experiments)").all() as any[]
      const hasProjectIdInExperiments = experimentColumns.some(col => col.name === 'project_id')
      if (!hasProjectIdInExperiments) {
        console.log('📝 Adding project_id column to experiments table...')
        db.exec('ALTER TABLE experiments ADD COLUMN project_id TEXT')
      }
    }
    
    // Check if runId column exists in traces table
    const traceColumns = db.prepare("PRAGMA table_info(traces)").all() as any[]
    const hasRunIdInTraces = traceColumns.some(col => col.name === 'runId')
    
    if (!hasRunIdInTraces) {
      console.log('📝 Adding runId column to traces table...')
      db.exec('ALTER TABLE traces ADD COLUMN runId TEXT')
    }

    // Enhanced cost tracking fields for traces
    const hasCostFieldsInTraces = traceColumns.some(col => col.name === 'total_cost')
    if (!hasCostFieldsInTraces) {
      console.log('📝 Adding enhanced cost tracking fields to traces table...')
      db.exec('ALTER TABLE traces ADD COLUMN total_cost REAL DEFAULT 0')
      db.exec('ALTER TABLE traces ADD COLUMN input_cost REAL DEFAULT 0')
      db.exec('ALTER TABLE traces ADD COLUMN output_cost REAL DEFAULT 0')
      db.exec('ALTER TABLE traces ADD COLUMN prompt_tokens INTEGER DEFAULT 0')
      db.exec('ALTER TABLE traces ADD COLUMN completion_tokens INTEGER DEFAULT 0')
      db.exec('ALTER TABLE traces ADD COLUMN total_tokens INTEGER DEFAULT 0')
      db.exec('ALTER TABLE traces ADD COLUMN provider TEXT')
      db.exec('ALTER TABLE traces ADD COLUMN model_name TEXT')
      db.exec('ALTER TABLE traces ADD COLUMN cost_calculation_metadata TEXT') // JSON with detailed cost breakdown
    }
    
    // Check if spans table exists
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='spans'").all()
    if (tables.length === 0) {
      console.log('📝 Creating spans table...')
      db.exec(`
        CREATE TABLE spans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          trace_id TEXT NOT NULL,
          parent_span_id TEXT,
          span_id TEXT NOT NULL UNIQUE,
          span_name TEXT NOT NULL,
          span_type TEXT NOT NULL, -- 'llm', 'preprocessing', 'postprocessing', 'custom', 'tool', 'retrieval', 'agent', 'workflow'
          start_time TEXT NOT NULL,
          end_time TEXT,
          duration INTEGER, -- milliseconds
          status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
          error_message TEXT,
          input_data TEXT, -- JSON object
          output_data TEXT, -- JSON object
          metadata TEXT, -- JSON object for additional context
          tags TEXT, -- JSON array of tags
          usage TEXT, -- JSON object with token/cost info
          model_name TEXT, -- AI model used
          model_parameters TEXT, -- JSON object with model parameters
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
        )
      `)
      
      // Create indices for better query performance
      db.exec(`CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_spans_span_id ON spans(span_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time)`)
    }

    // Enhanced cost tracking fields for spans - check each column individually
    const spanColumns = db.prepare("PRAGMA table_info(spans)").all() as any[]
    
    if (!spanColumns.some(col => col.name === 'total_cost')) {
      console.log('📝 Adding enhanced cost tracking fields to spans table...')
      db.exec('ALTER TABLE spans ADD COLUMN total_cost REAL DEFAULT 0')
    }
    if (!spanColumns.some(col => col.name === 'input_cost')) {
      db.exec('ALTER TABLE spans ADD COLUMN input_cost REAL DEFAULT 0')
    }
    if (!spanColumns.some(col => col.name === 'output_cost')) {
      db.exec('ALTER TABLE spans ADD COLUMN output_cost REAL DEFAULT 0')
    }
    if (!spanColumns.some(col => col.name === 'prompt_tokens')) {
      db.exec('ALTER TABLE spans ADD COLUMN prompt_tokens INTEGER DEFAULT 0')
    }
    if (!spanColumns.some(col => col.name === 'completion_tokens')) {
      db.exec('ALTER TABLE spans ADD COLUMN completion_tokens INTEGER DEFAULT 0')
    }
    if (!spanColumns.some(col => col.name === 'total_tokens')) {
      db.exec('ALTER TABLE spans ADD COLUMN total_tokens INTEGER DEFAULT 0')
    }
    if (!spanColumns.some(col => col.name === 'provider')) {
      db.exec('ALTER TABLE spans ADD COLUMN provider TEXT')
    }
    if (!spanColumns.some(col => col.name === 'model_name')) {
      db.exec('ALTER TABLE spans ADD COLUMN model_name TEXT')
    }
    if (!spanColumns.some(col => col.name === 'cost_calculation_metadata')) {
      db.exec('ALTER TABLE spans ADD COLUMN cost_calculation_metadata TEXT') // JSON with detailed cost breakdown
    }

    // Add conversation-specific fields to spans table for conversation-as-span architecture
    if (!spanColumns.some(col => col.name === 'conversation_session_id')) {
      console.log('📝 Adding conversation-specific fields to spans table...')
      db.exec('ALTER TABLE spans ADD COLUMN conversation_session_id TEXT')
      db.exec('ALTER TABLE spans ADD COLUMN conversation_turn INTEGER') // 1, 2, 3... for multi-turn
      db.exec('ALTER TABLE spans ADD COLUMN conversation_role TEXT') // 'user_input', 'assistant_response', 'system_message', 'tool_call'
      db.exec('ALTER TABLE spans ADD COLUMN conversation_context TEXT') // JSON: previous context for this turn
      
      // Create indices for conversation queries
      db.exec('CREATE INDEX IF NOT EXISTS idx_spans_conversation_session ON spans(conversation_session_id)')
      db.exec('CREATE INDEX IF NOT EXISTS idx_spans_conversation_turn ON spans(conversation_turn)')
    }

    // Add project_id and agent_id to spans for direct project+agent linkage
    const hasProjectIdInSpans = spanColumns.some(col => col.name === 'project_id')
    const hasAgentIdInSpans = spanColumns.some(col => col.name === 'agent_id')
    
    if (!hasProjectIdInSpans) {
      console.log('📝 Adding project_id column to spans table for direct project linkage...')
      db.exec('ALTER TABLE spans ADD COLUMN project_id TEXT')
      // Create index for better query performance
      db.exec('CREATE INDEX IF NOT EXISTS idx_spans_project_id ON spans(project_id)')
    }
    
    if (!hasAgentIdInSpans) {
      console.log('📝 Adding agent_id column to spans table for direct agent linkage...')
      db.exec('ALTER TABLE spans ADD COLUMN agent_id TEXT')
      // Create index for better query performance  
      db.exec('CREATE INDEX IF NOT EXISTS idx_spans_agent_id ON spans(agent_id)')
    }

    // Check if conversation_sessions table exists (conversation-as-span architecture)
    const conversationSessionTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='conversation_sessions'").all()
    if (conversationSessionTables.length === 0) {
      console.log('📝 Creating conversation_sessions table for conversation-as-span architecture...')
      db.exec(`
        CREATE TABLE conversation_sessions (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          agent_id TEXT NOT NULL,
          session_id TEXT NOT NULL,  -- Groups related conversations
          thread_id TEXT,            -- For multi-turn conversations
          user_id TEXT,              -- Optional user identifier
          session_name TEXT,         -- Human-readable session name
          status TEXT NOT NULL DEFAULT 'active', -- 'active', 'completed', 'abandoned'
          total_turns INTEGER DEFAULT 0,         -- Number of conversation turns
          total_cost REAL DEFAULT 0,             -- Aggregate cost for session
          total_tokens INTEGER DEFAULT 0,        -- Aggregate tokens for session
          started_at TEXT NOT NULL,              -- First conversation timestamp
          last_activity_at TEXT,                 -- Last conversation timestamp
          metadata TEXT,                         -- JSON object for session metadata
          tags TEXT,                            -- JSON array of session tags
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
          FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        )
      `)
      
      // Create indices for conversation_sessions
      db.exec(`CREATE INDEX IF NOT EXISTS idx_conversation_sessions_project_id ON conversation_sessions(project_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_conversation_sessions_agent_id ON conversation_sessions(agent_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_conversation_sessions_thread_id ON conversation_sessions(thread_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_conversation_sessions_started_at ON conversation_sessions(started_at)`)
    }

    // Check if datasets table exists
    const datasetTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='datasets'").all()
    if (datasetTables.length === 0) {
      console.log('📝 Creating datasets table...')
      db.exec(`
        CREATE TABLE datasets (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          project_id TEXT,
          metadata TEXT, -- JSON object
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
        )
      `)
    }

    // Check if dataset_items table exists
    const datasetItemTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='dataset_items'").all()
    if (datasetItemTables.length === 0) {
      console.log('📝 Creating dataset_items table...')
      db.exec(`
        CREATE TABLE dataset_items (
          id TEXT PRIMARY KEY,
          dataset_id TEXT NOT NULL,
          input_data TEXT NOT NULL, -- JSON object
          expected_output TEXT, -- JSON object
          metadata TEXT, -- JSON object
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        )
      `)
    }

    // Check if experiments table exists
    const experimentTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='experiments'").all()
    if (experimentTables.length === 0) {
      console.log('📝 Creating experiments table...')
      db.exec(`
        CREATE TABLE experiments (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          dataset_id TEXT,
          project_id TEXT,
          configuration TEXT, -- JSON object
          status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
          results TEXT, -- JSON object
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE SET NULL,
          FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
      `)
    }

    // Check if experiment_runs table exists
    const experimentRunTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='experiment_runs'").all()
    if (experimentRunTables.length === 0) {
      console.log('📝 Creating experiment_runs table...')
      db.exec(`
        CREATE TABLE experiment_runs (
          id TEXT PRIMARY KEY,
          experiment_id TEXT NOT NULL,
          prompt_version_id TEXT,
          evaluation_ids TEXT NOT NULL, -- JSON array of evaluation IDs
          status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
          total_items INTEGER DEFAULT 0,
          completed_items INTEGER DEFAULT 0,
          failed_items INTEGER DEFAULT 0,
          aggregate_scores TEXT, -- JSON object with overall metrics
          execution_time INTEGER, -- milliseconds
          error_message TEXT,
          started_at TEXT,
          completed_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
          FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id) ON DELETE SET NULL
        )
      `)
      
      // Create indexes for experiment_runs
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_runs_experiment_id ON experiment_runs(experiment_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_runs_status ON experiment_runs(status)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_runs_created_at ON experiment_runs(created_at)`)
    }

    // Check if experiment_results table exists
    const experimentResultTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='experiment_results'").all()
    if (experimentResultTables.length === 0) {
      console.log('📝 Creating experiment_results table...')
      db.exec(`
        CREATE TABLE experiment_results (
          id TEXT PRIMARY KEY,
          experiment_run_id TEXT NOT NULL,
          dataset_item_id TEXT NOT NULL,
          input_data TEXT NOT NULL, -- JSON object
          generated_output TEXT, -- Generated response
          expected_output TEXT, -- Expected response from dataset
          evaluation_scores TEXT NOT NULL, -- JSON object with scores for each evaluation
          overall_score REAL,
          passed INTEGER NOT NULL DEFAULT 0, -- boolean: 1 for pass, 0 for fail
          execution_time INTEGER, -- milliseconds
          error_message TEXT,
          metadata TEXT, -- JSON object with additional info
          created_at TEXT NOT NULL,
          FOREIGN KEY (experiment_run_id) REFERENCES experiment_runs(id) ON DELETE CASCADE,
          FOREIGN KEY (dataset_item_id) REFERENCES dataset_items(id) ON DELETE CASCADE
        )
      `)
      
      // Create indexes for experiment_results
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_results_run_id ON experiment_results(experiment_run_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_results_dataset_item_id ON experiment_results(dataset_item_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_results_overall_score ON experiment_results(overall_score)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_results_passed ON experiment_results(passed)`)
    }

    // Check if experiment_prompt_links table exists
    const experimentPromptLinkTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='experiment_prompt_links'").all()
    if (experimentPromptLinkTables.length === 0) {
      console.log('📝 Creating experiment_prompt_links table...')
      db.exec(`
        CREATE TABLE experiment_prompt_links (
          id TEXT PRIMARY KEY,
          experiment_id TEXT NOT NULL,
          prompt_version_id TEXT NOT NULL,
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE,
          FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id) ON DELETE CASCADE
        )
      `)
      
      // Create indexes for experiment_prompt_links
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_prompt_links_experiment_id ON experiment_prompt_links(experiment_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_experiment_prompt_links_prompt_version_id ON experiment_prompt_links(prompt_version_id)`)
    }

    // Check if evaluations table exists
    const evaluationTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluations'").all()
    if (evaluationTables.length === 0) {
      console.log('📝 Creating evaluations table...')
      db.exec(`
        CREATE TABLE evaluations (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL, -- 'accuracy', 'hallucination', 'relevance', 'coherence', 'custom'
          configuration TEXT, -- JSON object with evaluation parameters
          project_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
    }

    // Check if evaluation_results table exists
    const evaluationResultTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluation_results'").all()
    if (evaluationResultTables.length === 0) {
      console.log('📝 Creating evaluation_results table...')
      db.exec(`
        CREATE TABLE evaluation_results (
          id TEXT PRIMARY KEY,
          evaluation_id TEXT NOT NULL,
          trace_id TEXT,
          conversation_id TEXT,
          score REAL NOT NULL,
          reason TEXT,
          metadata TEXT, -- JSON object
          created_at TEXT NOT NULL,
          FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
          FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        )
      `)
    }

    // Check if heuristic_metrics table exists
    const heuristicMetricTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='heuristic_metrics'").all()
    if (heuristicMetricTables.length === 0) {
      console.log('📝 Creating heuristic_metrics table...')
      db.exec(`
        CREATE TABLE heuristic_metrics (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          description TEXT,
          type TEXT NOT NULL, -- 'contains', 'equals', 'regex', 'is_json', 'levenshtein'
          config TEXT NOT NULL, -- JSON object with metric-specific parameters
          is_active INTEGER NOT NULL DEFAULT 1,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      
      // Create indexes for heuristic_metrics
      db.exec(`CREATE INDEX IF NOT EXISTS idx_heuristic_metrics_type ON heuristic_metrics(type)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_heuristic_metrics_is_active ON heuristic_metrics(is_active)`)
    }

    // Check if evaluation_runs table exists
    const evaluationRunTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='evaluation_runs'").all()
    if (evaluationRunTables.length === 0) {
      console.log('📝 Creating evaluation_runs table...')
      db.exec(`
        CREATE TABLE evaluation_runs (
          id TEXT PRIMARY KEY,
          evaluation_id TEXT NOT NULL,
          dataset_id TEXT,
          status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
          total_items INTEGER DEFAULT 0,
          processed_items INTEGER DEFAULT 0,
          start_time TEXT,
          end_time TEXT,
          duration INTEGER, -- milliseconds
          metrics_config TEXT, -- JSON array of heuristic metric configs
          summary_stats TEXT, -- JSON object with aggregate results
          error_message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (evaluation_id) REFERENCES evaluations(id) ON DELETE CASCADE,
          FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE SET NULL
        )
      `)
      
      // Create indexes for evaluation_runs
      db.exec(`CREATE INDEX IF NOT EXISTS idx_evaluation_runs_evaluation_id ON evaluation_runs(evaluation_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_evaluation_runs_status ON evaluation_runs(status)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_evaluation_runs_created_at ON evaluation_runs(created_at)`)
    }

    // Check if metric_results table exists
    const metricResultTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='metric_results'").all()
    if (metricResultTables.length === 0) {
      console.log('📝 Creating metric_results table...')
      db.exec(`
        CREATE TABLE metric_results (
          id TEXT PRIMARY KEY,
          evaluation_run_id TEXT NOT NULL,
          dataset_item_id TEXT,
          metric_id TEXT NOT NULL,
          score REAL NOT NULL,
          passed INTEGER NOT NULL, -- boolean: 1 for pass, 0 for fail
          details TEXT, -- JSON object with detailed results
          execution_time INTEGER, -- milliseconds
          created_at TEXT NOT NULL,
          FOREIGN KEY (evaluation_run_id) REFERENCES evaluation_runs(id) ON DELETE CASCADE,
          FOREIGN KEY (dataset_item_id) REFERENCES dataset_items(id) ON DELETE CASCADE,
          FOREIGN KEY (metric_id) REFERENCES heuristic_metrics(id) ON DELETE CASCADE
        )
      `)
      
      // Create indexes for metric_results
      db.exec(`CREATE INDEX IF NOT EXISTS idx_metric_results_evaluation_run_id ON metric_results(evaluation_run_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_metric_results_metric_id ON metric_results(metric_id)`)
      db.exec(`CREATE INDEX IF NOT EXISTS idx_metric_results_passed ON metric_results(passed)`)
    }

    // Check if attachments table exists (for media logging with MinIO support)
    const attachmentTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='attachments'").all()
    if (attachmentTables.length === 0) {
      console.log('📝 Creating attachments table...')
      db.exec(`
        CREATE TABLE attachments (
          id TEXT PRIMARY KEY,
          conversation_id TEXT,
          trace_id TEXT,
          span_id TEXT,
          filename TEXT NOT NULL,
          content_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          storage_path TEXT NOT NULL, -- MinIO object path
          metadata TEXT, -- JSON object
          created_at TEXT NOT NULL,
          FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
          FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE,
          FOREIGN KEY (span_id) REFERENCES spans(span_id) ON DELETE CASCADE
        )
      `)
    }
    
    // Check if feedback_scores table exists
    const feedbackScoresTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback_scores'").all()
    if (feedbackScoresTables.length === 0) {
      console.log('📝 Creating feedback_scores table...')
      db.exec(`
        CREATE TABLE feedback_scores (
          id TEXT PRIMARY KEY,
          trace_id TEXT NOT NULL,
          name TEXT NOT NULL,
          category_name TEXT,
          value REAL NOT NULL,
          reason TEXT,
          source TEXT NOT NULL DEFAULT 'ui', -- 'ui', 'sdk', 'online_scoring'
          created_by TEXT,
          created_at TEXT NOT NULL,
          last_updated_at TEXT NOT NULL,
          FOREIGN KEY (trace_id) REFERENCES traces(id) ON DELETE CASCADE
        )
      `)
    }

    // Check if feedback_definitions table exists
    const feedbackDefinitionsTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='feedback_definitions'").all()
    if (feedbackDefinitionsTables.length === 0) {
      console.log('📝 Creating feedback_definitions table...')
      db.exec(`
        CREATE TABLE feedback_definitions (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          type TEXT NOT NULL CHECK (type IN ('numerical', 'categorical')),
          details TEXT NOT NULL, -- JSON string containing min/max for numerical or categories for categorical
          created_by TEXT,
          created_at TEXT NOT NULL,
          last_updated_at TEXT NOT NULL
        )
      `)
    }

    // Check if variable_definitions column exists in prompt_versions table
    const promptVersionsColumns = db.prepare("PRAGMA table_info(prompt_versions)").all() as any[]
    const hasVariableDefinitions = promptVersionsColumns.some(col => col.name === 'variable_definitions')
    const hasStatus = promptVersionsColumns.some(col => col.name === 'status')
    const hasComments = promptVersionsColumns.some(col => col.name === 'comments')
    
    if (!hasVariableDefinitions) {
      console.log('📝 Adding variable_definitions column to prompt_versions table...')
      db.exec('ALTER TABLE prompt_versions ADD COLUMN variable_definitions TEXT') // JSON array of VariableDefinition objects
    }
    
    if (!hasStatus) {
      console.log('📝 Adding status column to prompt_versions table...')
      db.exec('ALTER TABLE prompt_versions ADD COLUMN status TEXT DEFAULT "draft"') // draft, current, deactivated
    }
    
    if (!hasComments) {
      console.log('📝 Adding comments column to prompt_versions table...')
      db.exec('ALTER TABLE prompt_versions ADD COLUMN comments TEXT') // Comments/notes for this version
    }
    
    console.log('✅ Database migration completed')
  } catch (error) {
    console.error('❌ Database migration failed:', error)
  }
}

// Create tables
const initTables = () => {
  // Departments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      code TEXT NOT NULL UNIQUE,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  // Business Priorities table
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_priorities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      level INTEGER NOT NULL UNIQUE,
      color TEXT NOT NULL,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `)

  // Projects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'folder',
      color TEXT NOT NULL DEFAULT 'primary',
      template TEXT NOT NULL,
      department TEXT,
      priority TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      security_level TEXT NOT NULL,
      data_retention TEXT NOT NULL,
      default_access TEXT NOT NULL,
      pii_handling INTEGER NOT NULL DEFAULT 0,
      compliance_mode INTEGER NOT NULL DEFAULT 0,
      team_members TEXT NOT NULL DEFAULT '[]',
      visibility TEXT NOT NULL DEFAULT 'private',
      status TEXT NOT NULL DEFAULT 'active',
      agents INTEGER NOT NULL DEFAULT 0,
      conversations INTEGER NOT NULL DEFAULT 0,
      success_rate REAL NOT NULL DEFAULT 0.0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
      -- FOREIGN KEY (department) REFERENCES departments(code),
      -- FOREIGN KEY (priority) REFERENCES business_priorities(id)
    )
  `)

  // Agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      role TEXT NOT NULL,
      capabilities TEXT NOT NULL DEFAULT '[]',
      system_prompt TEXT,
      model TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.7,
      max_tokens INTEGER NOT NULL DEFAULT 2000,
      status TEXT NOT NULL DEFAULT 'active',
      is_active INTEGER NOT NULL DEFAULT 1,
      version TEXT NOT NULL DEFAULT '1.0.0',
      conversations INTEGER NOT NULL DEFAULT 0,
      success_rate REAL NOT NULL DEFAULT 0.0,
      avg_response_time INTEGER NOT NULL DEFAULT 0,
      last_active_at TEXT,
      config TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      created_by TEXT NOT NULL DEFAULT 'system'
      -- FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  // Runs table - for grouping related telemetry data in sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      name TEXT NOT NULL, -- Human-readable name for the run
      description TEXT, -- Optional description of what this run does
      status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
      startTime TEXT NOT NULL,
      endTime TEXT,
      duration INTEGER, -- milliseconds
      totalConversations INTEGER NOT NULL DEFAULT 0,
      totalMetrics INTEGER NOT NULL DEFAULT 0,
      totalTraces INTEGER NOT NULL DEFAULT 0,
      avgResponseTime INTEGER DEFAULT 0, -- average response time in ms
      totalTokenUsage INTEGER DEFAULT 0,
      totalCost REAL DEFAULT 0.0,
      successRate REAL DEFAULT 0.0, -- percentage
      errorMessage TEXT, -- if status is 'failed'
      tags TEXT DEFAULT '[]', -- JSON array of tags
      metadata TEXT DEFAULT '{}', -- JSON object for additional context
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      createdBy TEXT NOT NULL DEFAULT 'system',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE
    )
  `)

  // Conversations table - for conversation history and context
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      runId TEXT, -- Links to runs table for session grouping
      userId TEXT, -- Optional user identifier
      sessionId TEXT, -- Group related conversations (legacy)
      input TEXT NOT NULL, -- User input/query
      output TEXT NOT NULL, -- Agent response
      status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'timeout'
      response_time INTEGER NOT NULL, -- milliseconds
      token_usage INTEGER DEFAULT 0, -- tokens consumed
      cost REAL DEFAULT 0.0, -- cost in USD
      feedback TEXT, -- user feedback (thumbs up/down, rating)
      metadata TEXT, -- JSON object for additional context
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (runId) REFERENCES runs(id) ON DELETE SET NULL
    )
  `)

  // Metrics table - for performance and usage metrics
  db.exec(`
    CREATE TABLE IF NOT EXISTS metrics (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      runId TEXT, -- Links to runs table for session grouping
      metricType TEXT NOT NULL, -- 'response_time', 'token_usage', 'cost', 'success_rate', 'throughput'
      value REAL NOT NULL,
      unit TEXT, -- 'ms', 'tokens', 'usd', 'percentage', 'requests_per_minute'
      aggregationType TEXT DEFAULT 'instant', -- 'instant', 'avg', 'sum', 'count'
      timestamp TEXT NOT NULL,
      metadata TEXT, -- JSON object for additional context
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (runId) REFERENCES runs(id) ON DELETE SET NULL
    )
  `)

  // Traces table - for distributed tracing and debugging
  db.exec(`
    CREATE TABLE IF NOT EXISTS traces (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      agent_id TEXT,
      run_id TEXT, -- Links to runs table for session grouping
      conversation_id TEXT, -- Link to conversation if applicable
      parent_trace_id TEXT, -- For nested/child traces
      trace_type TEXT, -- 'conversation', 'task', 'function_call', 'api_request'
      operation_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER, -- milliseconds
      status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
      error_message TEXT,
      input_data TEXT, -- JSON object
      output_data TEXT, -- JSON object
      spans TEXT, -- JSON array of spans for detailed tracing
      metadata TEXT, -- JSON object for additional context
      tags TEXT, -- JSON array for tags
      created_at TEXT NOT NULL,
      -- Enhanced cost tracking columns
      total_cost REAL DEFAULT 0,
      input_cost REAL DEFAULT 0,
      output_cost REAL DEFAULT 0,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      provider TEXT,
      model_name TEXT,
      cost_calculation_metadata TEXT
    )
  `)

  // Distributed Traces table - for distributed tracing across multiple agents/services
  db.exec(`
    CREATE TABLE IF NOT EXISTS distributed_traces (
      id TEXT PRIMARY KEY,
      root_span_id TEXT NOT NULL,
      service_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER, -- milliseconds
      status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
      agent_count INTEGER DEFAULT 0,
      service_count INTEGER DEFAULT 0,
      container_count INTEGER DEFAULT 0,
      total_cost REAL DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      total_requests INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      metadata TEXT -- JSON object for additional trace-level data
    )
  `)

  // Distributed Spans table - for individual spans in distributed traces
  db.exec(`
    CREATE TABLE IF NOT EXISTS distributed_spans (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      parent_span_id TEXT,
      operation_name TEXT NOT NULL,
      service_name TEXT NOT NULL,
      service_version TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER, -- milliseconds
      status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
      tags TEXT, -- JSON object
      logs TEXT, -- JSON array of log entries
      
      -- Agent-specific fields
      agent_id TEXT,
      agent_type TEXT,
      agent_version TEXT,
      
      -- Container/deployment info
      container_id TEXT,
      container_name TEXT,
      hostname TEXT,
      pod_name TEXT,
      namespace TEXT,
      
      -- A2A communication
      source_agent_id TEXT,
      target_agent_id TEXT,
      communication_type TEXT, -- 'http', 'grpc', 'message_queue', 'websocket', 'direct'
      
      -- Cost tracking
      total_cost REAL DEFAULT 0,
      input_cost REAL DEFAULT 0,
      output_cost REAL DEFAULT 0,
      prompt_tokens INTEGER DEFAULT 0,
      completion_tokens INTEGER DEFAULT 0,
      total_tokens INTEGER DEFAULT 0,
      provider TEXT,
      model_name TEXT,
      
      created_at TEXT NOT NULL,
      
      FOREIGN KEY (trace_id) REFERENCES distributed_traces(id) ON DELETE CASCADE
    )
  `)

  // A2A Communications table - for tracking agent-to-agent communications
  db.exec(`
    CREATE TABLE IF NOT EXISTS a2a_communications (
      id TEXT PRIMARY KEY,
      trace_id TEXT NOT NULL,
      source_span_id TEXT NOT NULL,
      target_span_id TEXT NOT NULL,
      source_agent_id TEXT NOT NULL,
      target_agent_id TEXT NOT NULL,
      communication_type TEXT NOT NULL, -- 'http', 'grpc', 'message_queue', 'websocket', 'direct'
      protocol TEXT,
      endpoint TEXT,
      method TEXT,
      payload TEXT, -- JSON
      response TEXT, -- JSON
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER, -- milliseconds
      status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
      error_message TEXT,
      
      -- Network info
      source_host TEXT,
      target_host TEXT,
      source_port INTEGER,
      target_port INTEGER,
      
      created_at TEXT NOT NULL,
      
      FOREIGN KEY (trace_id) REFERENCES distributed_traces(id) ON DELETE CASCADE,
      FOREIGN KEY (source_span_id) REFERENCES distributed_spans(id) ON DELETE CASCADE,
      FOREIGN KEY (target_span_id) REFERENCES distributed_spans(id) ON DELETE CASCADE
    )
  `)

  // Create indexes for better query performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_distributed_spans_trace_id ON distributed_spans(trace_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_distributed_spans_parent_span_id ON distributed_spans(parent_span_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_distributed_spans_agent_id ON distributed_spans(agent_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_distributed_spans_start_time ON distributed_spans(start_time)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_distributed_spans_communication_type ON distributed_spans(communication_type)`)
  
  db.exec(`CREATE INDEX IF NOT EXISTS idx_a2a_communications_trace_id ON a2a_communications(trace_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_a2a_communications_source_agent ON a2a_communications(source_agent_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_a2a_communications_target_agent ON a2a_communications(target_agent_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_a2a_communications_start_time ON a2a_communications(start_time)`)

  // Prompt Management and Provider Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS llm_providers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      config TEXT NOT NULL,
      credentials TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      health_status TEXT DEFAULT 'unknown',
      last_health_check TEXT,
      usage_limits TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_by TEXT
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompts (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      template TEXT NOT NULL,
      variables TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      updated_by TEXT,
      is_archived INTEGER DEFAULT 0,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id TEXT PRIMARY KEY,
      prompt_id TEXT NOT NULL,
      version TEXT NOT NULL,
      template TEXT NOT NULL,
      variables TEXT,
      changelog TEXT,
      is_active INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
      UNIQUE(prompt_id, version)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_tests (
      id TEXT PRIMARY KEY,
      prompt_version_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      model_name TEXT NOT NULL,
      test_inputs TEXT NOT NULL,
      expected_output TEXT,
      actual_output TEXT,
      execution_time_ms INTEGER,
      token_usage TEXT,
      cost REAL,
      status TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT,
      FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_id) REFERENCES llm_providers(id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_prompt_links (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      prompt_version_id TEXT NOT NULL,
      link_type TEXT DEFAULT 'primary',
      is_active INTEGER DEFAULT 1,
      linked_at TEXT DEFAULT CURRENT_TIMESTAMP,
      linked_by TEXT,
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id) ON DELETE CASCADE,
      UNIQUE(agent_id, prompt_version_id, link_type)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_analytics (
      id TEXT PRIMARY KEY,
      prompt_version_id TEXT NOT NULL,
      conversation_id TEXT,
      trace_id TEXT,
      agent_id TEXT,
      provider_id TEXT,
      model_name TEXT,
      input_variables TEXT,
      output TEXT,
      token_usage TEXT,
      cost REAL,
      execution_time_ms INTEGER,
      feedback_score REAL,
      user_rating INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (prompt_version_id) REFERENCES prompt_versions(id),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (trace_id) REFERENCES traces(id),
      FOREIGN KEY (agent_id) REFERENCES agents(id),
      FOREIGN KEY (provider_id) REFERENCES llm_providers(id)
    )
  `)

  // Create indexes for prompt management tables
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompts_project_id ON prompts(project_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompts_created_at ON prompts(created_at)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompt_versions_prompt_id ON prompt_versions(prompt_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompt_versions_is_active ON prompt_versions(is_active)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompt_tests_prompt_version_id ON prompt_tests(prompt_version_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_prompt_links_agent_id ON agent_prompt_links(agent_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_agent_prompt_links_is_active ON agent_prompt_links(is_active)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompt_analytics_prompt_version_id ON prompt_analytics(prompt_version_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_prompt_analytics_created_at ON prompt_analytics(created_at)`)


  // Spans table is created in migration if it doesn't exist
}

// Seed initial data
const seedData = () => {
  const now = new Date().toISOString()

  // Check if data already exists
  const departmentCount = db.prepare('SELECT COUNT(*) as count FROM departments').get() as { count: number }
  const priorityCount = db.prepare('SELECT COUNT(*) as count FROM business_priorities').get() as { count: number }

  // Seed departments if empty
  if (departmentCount.count === 0) {
    const insertDepartment = db.prepare(`
      INSERT INTO departments (id, name, description, code, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    const departments = [
      {
        id: 'dept-001',
        name: 'Customer Service',
        description: 'Customer support and service operations',
        code: 'CUSTOMER_SERVICE',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'dept-002',
        name: 'Sales',
        description: 'Sales and business development',
        code: 'SALES',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'dept-003',
        name: 'Marketing',
        description: 'Marketing and brand management',
        code: 'MARKETING',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'dept-004',
        name: 'Product',
        description: 'Product development and management',
        code: 'PRODUCT',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'dept-005',
        name: 'Engineering',
        description: 'Software development and technical operations',
        code: 'ENGINEERING',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'dept-006',
        name: 'Operations',
        description: 'Business operations and process management',
        code: 'OPERATIONS',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'dept-007',
        name: 'Human Resources',
        description: 'HR and people operations',
        code: 'HUMAN_RESOURCES',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      }
    ]

    for (const dept of departments) {
      insertDepartment.run(
        dept.id,
        dept.name,
        dept.description,
        dept.code,
        dept.isActive,
        dept.createdAt,
        dept.updatedAt
      )
    }

    console.log('✅ Seeded departments data')
  }

  // Seed business priorities if empty
  if (priorityCount.count === 0) {
    const insertPriority = db.prepare(`
      INSERT INTO business_priorities (id, name, description, level, color, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const priorities = [
      {
        id: 'priority-001',
        name: 'Critical - Revenue Impact',
        description: 'Projects that directly impact revenue generation or prevent revenue loss',
        level: 1,
        color: '#DC2626',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'priority-002',
        name: 'High - Strategic Initiative',
        description: 'Strategic projects that align with key business objectives',
        level: 2,
        color: '#EA580C',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'priority-003',
        name: 'Medium - Operational Improvement',
        description: 'Projects that improve operational efficiency and processes',
        level: 3,
        color: '#D97706',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      },
      {
        id: 'priority-004',
        name: 'Low - Experimental',
        description: 'Experimental or research projects with longer-term benefits',
        level: 4,
        color: '#16A34A',
        isActive: 1,
        createdAt: now,
        updatedAt: now
      }
    ]

    for (const priority of priorities) {
      insertPriority.run(
        priority.id,
        priority.name,
        priority.description,
        priority.level,
        priority.color,
        priority.isActive,
        priority.createdAt,
        priority.updatedAt
      )
    }

    console.log('✅ Seeded business priorities data')
  }

  // Seed default heuristic metrics if empty
  const metricCount = db.prepare('SELECT COUNT(*) as count FROM heuristic_metrics').get() as { count: number }
  if (metricCount.count === 0) {
    const insertMetric = db.prepare(`
      INSERT INTO heuristic_metrics (id, name, description, type, config, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)

    const defaultMetrics = [
      {
        id: 'metric_contains_001',
        name: 'Contains Text',
        description: 'Checks if the output contains specific text or phrases',
        type: 'contains',
        config: JSON.stringify({
          case_sensitive: false,
          match_type: 'any' // 'any', 'all'
        }),
        is_active: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: 'metric_equals_001',
        name: 'Exact Match',
        description: 'Checks if the output exactly matches expected text',
        type: 'equals',
        config: JSON.stringify({
          case_sensitive: false,
          trim_whitespace: true
        }),
        is_active: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: 'metric_regex_001',
        name: 'Regex Pattern',
        description: 'Checks if the output matches a regular expression pattern',
        type: 'regex',
        config: JSON.stringify({
          flags: 'i' // case insensitive by default
        }),
        is_active: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: 'metric_json_001',
        name: 'Valid JSON',
        description: 'Checks if the output is valid JSON format',
        type: 'is_json',
        config: JSON.stringify({
          strict: true,
          allow_empty: false
        }),
        is_active: 1,
        created_at: now,
        updated_at: now
      },
      {
        id: 'metric_levenshtein_001',
        name: 'Text Similarity',
        description: 'Measures text similarity using Levenshtein distance',
        type: 'levenshtein',
        config: JSON.stringify({
          threshold: 0.8, // similarity threshold (0-1)
          normalize: true
        }),
        is_active: 1,
        created_at: now,
        updated_at: now
      }
    ]

    for (const metric of defaultMetrics) {
      insertMetric.run(
        metric.id,
        metric.name,
        metric.description,
        metric.type,
        metric.config,
        metric.is_active,
        metric.created_at,
        metric.updated_at
      )
    }

    console.log('✅ Seeded default heuristic metrics')
  }
}

// Database operations for Departments
export const departmentDb = {
  // Get all departments
  getAll: (): Department[] => {
    const stmt = db.prepare('SELECT * FROM departments ORDER BY name')
    const rows = stmt.all() as any[]
    return rows.map(row => ({
      ...row,
      isActive: Boolean(row.isActive)
    }))
  },

  // Get department by ID
  getById: (id: string): Department | null => {
    const stmt = db.prepare('SELECT * FROM departments WHERE id = ?')
    const row = stmt.get(id) as any
    if (!row) return null
    return {
      ...row,
      isActive: Boolean(row.isActive)
    }
  },

  // Create department
  create: (data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Department => {
    const id = `dept-${Date.now()}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO departments (id, name, description, code, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, data.name, data.description, data.code, data.isActive ? 1 : 0, now, now)
    
    return departmentDb.getById(id)!
  },

  // Update department
  update: (id: string, data: Partial<Omit<Department, 'id' | 'createdAt' | 'updatedAt'>>): Department | null => {
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      UPDATE departments 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          code = COALESCE(?, code),
          isActive = COALESCE(?, isActive),
          updatedAt = ?
      WHERE id = ?
    `)
    
    const result = stmt.run(
      data.name || null,
      data.description || null,
      data.code || null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : null,
      now,
      id
    )
    
    if (result.changes === 0) return null
    return departmentDb.getById(id)
  },

  // Delete department
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM departments WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Toggle status
  toggleStatus: (id: string): Department | null => {
    const current = departmentDb.getById(id)
    if (!current) return null
    
    return departmentDb.update(id, { isActive: !current.isActive })
  }
}

// Database operations for Business Priorities
export const businessPriorityDb = {
  // Get all priorities
  getAll: (): BusinessPriority[] => {
    const stmt = db.prepare('SELECT * FROM business_priorities ORDER BY level')
    const rows = stmt.all() as any[]
    return rows.map(row => ({
      ...row,
      isActive: Boolean(row.isActive)
    }))
  },

  // Get priority by ID
  getById: (id: string): BusinessPriority | null => {
    const stmt = db.prepare('SELECT * FROM business_priorities WHERE id = ?')
    const row = stmt.get(id) as any
    if (!row) return null
    return {
      ...row,
      isActive: Boolean(row.isActive)
    }
  },

  // Create priority
  create: (data: Omit<BusinessPriority, 'id' | 'createdAt' | 'updatedAt'>): BusinessPriority => {
    const id = `priority-${Date.now()}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO business_priorities (id, name, description, level, color, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, data.name, data.description, data.level, data.color, data.isActive ? 1 : 0, now, now)
    
    return businessPriorityDb.getById(id)!
  },

  // Update priority
  update: (id: string, data: Partial<Omit<BusinessPriority, 'id' | 'createdAt' | 'updatedAt'>>): BusinessPriority | null => {
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      UPDATE business_priorities 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          level = COALESCE(?, level),
          color = COALESCE(?, color),
          isActive = COALESCE(?, isActive),
          updatedAt = ?
      WHERE id = ?
    `)
    
    const result = stmt.run(
      data.name || null,
      data.description || null,
      data.level || null,
      data.color || null,
      data.isActive !== undefined ? (data.isActive ? 1 : 0) : null,
      now,
      id
    )
    
    if (result.changes === 0) return null
    return businessPriorityDb.getById(id)
  },

  // Delete priority
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM business_priorities WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Toggle status
  toggleStatus: (id: string): BusinessPriority | null => {
    const current = businessPriorityDb.getById(id)
    if (!current) return null
    
    return businessPriorityDb.update(id, { isActive: !current.isActive })
  }
}

// Helper function to transform raw project data
const transformProject = (raw: any): Project => {
  // Safely parse JSON fields with fallbacks
  let tags = []
  let teamMembers = []

  try {
    tags = raw.tags ? JSON.parse(raw.tags) : []
  } catch (e) {
    console.warn('Failed to parse project tags:', raw.tags)
    tags = []
  }

  try {
    teamMembers = raw.teamMembers ? JSON.parse(raw.teamMembers) : []
  } catch (e) {
    console.warn('Failed to parse project teamMembers:', raw.teamMembers)
    teamMembers = []
  }

  return {
    ...raw,
    icon: raw.icon || '📊',
    color: raw.color || '#10B981',
    tags,
    teamMembers: teamMembers || [],
    piiHandling: Boolean(raw.piiHandling),
    complianceMode: Boolean(raw.complianceMode),
    stats: {
      agents: raw.agents || 0,
      conversations: raw.conversations || 0,
      successRate: raw.successRate || 0
    },
    lastUpdated: raw.updatedAt
  }
}

// Project Operations
const projectDb = {
  // Get all projects
  getAll: (): Project[] => {
    const stmt = db.prepare(`
      SELECT 
        id, name, description, template, department, priority, 
        tags, security_level as securityLevel, data_retention as dataRetention, 
        default_access as defaultAccess, pii_handling as piiHandling, 
        compliance_mode as complianceMode, visibility, status, created_at as createdAt, updated_at as updatedAt,
        agents, conversations, success_rate as successRate
      FROM projects 
      ORDER BY created_at DESC
    `)
    const rawResults = stmt.all()
    return rawResults.map(transformProject)
  },

  // Get project by ID
  getById: (id: string): Project | null => {
    const stmt = db.prepare(`
      SELECT 
        id, name, description, template, department, priority, 
        tags, security_level as securityLevel, data_retention as dataRetention, 
        default_access as defaultAccess, pii_handling as piiHandling, 
        compliance_mode as complianceMode, visibility, status, created_at as createdAt, updated_at as updatedAt,
        agents, conversations, success_rate as successRate
      FROM projects 
      WHERE id = ?
    `)
    const raw = stmt.get(id)
    return raw ? transformProject(raw) : null
  },

  // Create project
  create: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stats' | 'lastUpdated'>): Project => {
    const id = `project-${Date.now()}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO projects (
        id, name, description, icon, color, template, department, priority,
        tags, security_level, data_retention, default_access, pii_handling,
        compliance_mode, team_members, visibility, status, created_at, updated_at,
        agents, conversations, success_rate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.name, data.description, data.icon, data.color, data.template,
      data.department || null, data.priority, JSON.stringify(data.tags || []),
      data.securityLevel, data.dataRetention, data.defaultAccess,
      data.piiHandling ? 1 : 0, data.complianceMode ? 1 : 0,
      JSON.stringify(data.teamMembers || []), data.visibility,
      'active', now, now, 0, 0, 0.0
    )
    
    return projectDb.getById(id)!
  },

  // Update project
  update: (id: string, data: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'stats' | 'lastUpdated'>>): Project | null => {
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []
    
    // Build dynamic update query
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.icon !== undefined) { updates.push('icon = ?'); values.push(data.icon) }
    if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color) }
    if (data.template !== undefined) { updates.push('template = ?'); values.push(data.template) }
    if (data.department !== undefined) { updates.push('department = ?'); values.push(data.department) }
    if (data.priority !== undefined) { updates.push('priority = ?'); values.push(data.priority) }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)) }
    if (data.securityLevel !== undefined) { updates.push('security_level = ?'); values.push(data.securityLevel) }
    if (data.dataRetention !== undefined) { updates.push('data_retention = ?'); values.push(data.dataRetention) }
    if (data.defaultAccess !== undefined) { updates.push('default_access = ?'); values.push(data.defaultAccess) }
    if (data.piiHandling !== undefined) { updates.push('pii_handling = ?'); values.push(data.piiHandling ? 1 : 0) }
    if (data.complianceMode !== undefined) { updates.push('compliance_mode = ?'); values.push(data.complianceMode ? 1 : 0) }
    if (data.teamMembers !== undefined) { updates.push('team_members = ?'); values.push(JSON.stringify(data.teamMembers)) }
    if (data.visibility !== undefined) { updates.push('visibility = ?'); values.push(data.visibility) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    
    if (updates.length === 0) return projectDb.getById(id)
    
    updates.push('updatedAt = ?')
    values.push(now, id)
    
    const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return projectDb.getById(id)
  },

  // Delete project
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Update project stats (for when agents, conversations, success rate change)
  updateStats: (id: string, stats: { agents?: number; conversations?: number; successRate?: number }): Project | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (stats.agents !== undefined) { updates.push('agents = ?'); values.push(stats.agents) }
    if (stats.conversations !== undefined) { updates.push('conversations = ?'); values.push(stats.conversations) }
    if (stats.successRate !== undefined) { updates.push('success_rate = ?'); values.push(stats.successRate) }
    
    if (updates.length === 0) return projectDb.getById(id)
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString(), id)
    
    const stmt = db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return projectDb.getById(id)
  }
}

// Helper function to transform raw agent data
const transformAgent = (raw: any): Agent => {
  // Safely parse JSON fields with fallbacks
  let capabilities = []
  let config = { timeout: 30000, retries: 2, rateLimitPerMinute: 60, priority: 5 }
  let tags = []

  try {
    capabilities = raw.capabilities ? JSON.parse(raw.capabilities) : []
  } catch (e) {
    console.warn('Failed to parse agent capabilities:', raw.capabilities)
    capabilities = []
  }

  try {
    config = raw.config ? JSON.parse(raw.config) : { timeout: 30000, retries: 2, rateLimitPerMinute: 60, priority: 5 }
  } catch (e) {
    console.warn('Failed to parse agent config:', raw.config)
    config = { timeout: 30000, retries: 2, rateLimitPerMinute: 60, priority: 5 }
  }

  try {
    tags = raw.tags ? JSON.parse(raw.tags) : []
  } catch (e) {
    console.warn('Failed to parse agent tags:', raw.tags)
    tags = []
  }

  return {
    ...raw,
    capabilities,
    config,
    tags,
    isActive: Boolean(raw.isActive),
    temperature: parseFloat(raw.temperature) || 0.7,
    successRate: parseFloat(raw.successRate) || 0,
    avgResponseTime: parseInt(raw.avgResponseTime) || 0
  }
}

// Agent Operations
const agentDb = {
  // Get all agents
  getAll: (): Agent[] => {
    const stmt = db.prepare(`
      SELECT * FROM agents 
      ORDER BY created_at DESC
    `)
    const rawResults = stmt.all()
    return rawResults.map(transformAgent)
  },

  // Get agents by project ID
  getByProjectId: (projectId: string): Agent[] => {
    const stmt = db.prepare(`
      SELECT * FROM agents 
      WHERE project_id = ?
      ORDER BY created_at ASC
    `)
    const rawResults = stmt.all(projectId)
    return rawResults.map(transformAgent)
  },

  // Get agent by ID
  getById: (id: string): Agent | null => {
    const stmt = db.prepare(`
      SELECT * FROM agents 
      WHERE id = ?
    `)
    const raw = stmt.get(id)
    return raw ? transformAgent(raw) : null
  },

  // Create agent
  create: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'conversations' | 'successRate' | 'avgResponseTime' | 'lastActiveAt'>): Agent => {
    // Generate a readable hash ID for the agent based on name and timestamp
    const generateAgentId = (name: string): string => {
      const timestamp = Date.now()
      const nameHash = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 8)
      const timeHash = timestamp.toString(36).substring(-6)
      return `agent_${nameHash}_${timeHash}`
    }

    const id = generateAgentId(data.name)
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO agents (
        id, project_id, name, description, type, role, capabilities, system_prompt,
        model, temperature, max_tokens, status, is_active, version, conversations,
        success_rate, avg_response_time, last_active_at, config, tags, created_at, updated_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.projectId, data.name, data.description, data.type, data.role,
      JSON.stringify(data.capabilities || []), data.systemPrompt || null,
      data.model, data.temperature, data.maxTokens, data.status, data.isActive ? 1 : 0,
      data.version, 0, 0.0, 0, null,
      JSON.stringify(data.config), JSON.stringify(data.tags || []),
      now, now, data.createdBy
    )
    
    // Update project agent count
    const agentCount = agentDb.getByProjectId(data.projectId).length
    projectDb.updateStats(data.projectId, { agents: agentCount })
    
    return agentDb.getById(id)!
  },

  // Update agent
  update: (id: string, data: Partial<Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>>): Agent | null => {
    const now = new Date().toISOString()
    const updates: string[] = []
    const values: any[] = []
    
    // Build dynamic update query
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type) }
    if (data.role !== undefined) { updates.push('role = ?'); values.push(data.role) }
    if (data.capabilities !== undefined) { updates.push('capabilities = ?'); values.push(JSON.stringify(data.capabilities)) }
    if (data.systemPrompt !== undefined) { updates.push('systemPrompt = ?'); values.push(data.systemPrompt) }
    if (data.model !== undefined) { updates.push('model = ?'); values.push(data.model) }
    if (data.temperature !== undefined) { updates.push('temperature = ?'); values.push(data.temperature) }
    if (data.maxTokens !== undefined) { updates.push('maxTokens = ?'); values.push(data.maxTokens) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.isActive !== undefined) { updates.push('isActive = ?'); values.push(data.isActive ? 1 : 0) }
    if (data.version !== undefined) { updates.push('version = ?'); values.push(data.version) }
    if (data.conversations !== undefined) { updates.push('conversations = ?'); values.push(data.conversations) }
    if (data.successRate !== undefined) { updates.push('successRate = ?'); values.push(data.successRate) }
    if (data.avgResponseTime !== undefined) { updates.push('avgResponseTime = ?'); values.push(data.avgResponseTime) }
    if (data.lastActiveAt !== undefined) { updates.push('lastActiveAt = ?'); values.push(data.lastActiveAt) }
    if (data.config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(data.config)) }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)) }
    if (data.createdBy !== undefined) { updates.push('createdBy = ?'); values.push(data.createdBy) }
    
    if (updates.length === 0) return agentDb.getById(id)
    
    updates.push('updatedAt = ?')
    values.push(now, id)
    
    const stmt = db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return agentDb.getById(id)
  },

  // Delete agent
  delete: (id: string): boolean => {
    const agent = agentDb.getById(id)
    if (!agent) return false
    
    const stmt = db.prepare('DELETE FROM agents WHERE id = ?')
    const result = stmt.run(id)
    
    if (result.changes > 0) {
      // Update project agent count
      const agentCount = agentDb.getByProjectId(agent.projectId).length
      projectDb.updateStats(agent.projectId, { agents: agentCount })
      return true
    }
    
    return false
  },

  // Update agent stats
  updateStats: (id: string, stats: { conversations?: number; successRate?: number; avgResponseTime?: number }): Agent | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (stats.conversations !== undefined) { updates.push('conversations = ?'); values.push(stats.conversations) }
    if (stats.successRate !== undefined) { updates.push('successRate = ?'); values.push(stats.successRate) }
    if (stats.avgResponseTime !== undefined) { updates.push('avgResponseTime = ?'); values.push(stats.avgResponseTime) }
    
    if (updates.length === 0) return agentDb.getById(id)
    
    updates.push('lastActiveAt = ?', 'updatedAt = ?')
    const now = new Date().toISOString()
    values.push(now, now, id)
    
    const stmt = db.prepare(`UPDATE agents SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return agentDb.getById(id)
  },

  // Toggle agent status
  toggleStatus: (id: string): Agent | null => {
    const current = agentDb.getById(id)
    if (!current) return null
    
    return agentDb.update(id, { isActive: !current.isActive })
  }
}

// Database operations for Runs
export const runDb = {
  // Get all runs
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM runs ORDER BY startTime DESC')
    return stmt.all()
  },

  // Get run by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM runs WHERE id = ?')
    return stmt.get(id) as any
  },

  // Create run
  create: (data: any): any => {
    const id = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO runs (
        id, projectId, agentId, name, description, status, startTime, endTime,
        duration, totalConversations, totalMetrics, totalTraces, avgResponseTime,
        totalTokenUsage, totalCost, successRate, errorMessage, tags, metadata,
        createdAt, updatedAt, createdBy
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.projectId, data.agentId, data.name, data.description || null,
      data.status || 'running', data.startTime || now, data.endTime || null,
      data.duration || null, data.totalConversations || 0, data.totalMetrics || 0,
      data.totalTraces || 0, data.avgResponseTime || 0, data.totalTokenUsage || 0,
      data.totalCost || 0.0, data.successRate || 0.0, data.errorMessage || null,
      data.tags || '[]', data.metadata || '{}', data.createdAt || now, data.updatedAt || now,
      data.createdBy || 'system'
    )
    
    return runDb.getById(id)
  },

  // Update run
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.endTime !== undefined) { updates.push('endTime = ?'); values.push(data.endTime) }
    if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration) }
    if (data.totalConversations !== undefined) { updates.push('totalConversations = ?'); values.push(data.totalConversations) }
    if (data.totalMetrics !== undefined) { updates.push('totalMetrics = ?'); values.push(data.totalMetrics) }
    if (data.totalTraces !== undefined) { updates.push('totalTraces = ?'); values.push(data.totalTraces) }
    if (data.avgResponseTime !== undefined) { updates.push('avgResponseTime = ?'); values.push(data.avgResponseTime) }
    if (data.totalTokenUsage !== undefined) { updates.push('totalTokenUsage = ?'); values.push(data.totalTokenUsage) }
    if (data.totalCost !== undefined) { updates.push('totalCost = ?'); values.push(data.totalCost) }
    if (data.successRate !== undefined) { updates.push('successRate = ?'); values.push(data.successRate) }
    if (data.errorMessage !== undefined) { updates.push('errorMessage = ?'); values.push(data.errorMessage) }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(data.tags) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(data.metadata) }
    
    if (updates.length === 0) return runDb.getById(id)
    
    updates.push('updatedAt = ?')
    values.push(new Date().toISOString(), id)
    
    const stmt = db.prepare(`UPDATE runs SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return runDb.getById(id)
  },

  // Delete run
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM runs WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Complete a run with stats
  complete: (id: string, stats?: any): any | null => {
    const endTime = new Date().toISOString()
    const run = runDb.getById(id)
    if (!run) return null
    
    const startTime = new Date(run.startTime)
    const duration = Date.now() - startTime.getTime()
    
    const updateData: any = {
      status: 'completed',
      endTime,
      duration,
      ...stats
    }
    
    return runDb.update(id, updateData)
  },

  // Fail a run
  fail: (id: string, errorMessage: string): any | null => {
    return runDb.update(id, {
      status: 'failed',
      endTime: new Date().toISOString(),
      errorMessage
    })
  }
}

// Database operations for Conversations
export const conversationDb = {
  // Get all conversations
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM conversations ORDER BY createdAt DESC')
    return stmt.all()
  },

  // Get conversation by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?')
    return stmt.get(id) as any
  },

  // Create conversation
  create: (data: any): any => {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    // Get fallback project and agent if not provided
    let projectId = data.projectId || data.project_id
    let agentId = data.agentId || data.agent_id
    
    if (!projectId) {
      // Get first available project
      const projects = db.prepare('SELECT id FROM projects LIMIT 1').all()
      projectId = projects.length > 0 ? projects[0].id : 'test_project'
    }
    
    if (!agentId) {
      // Get first available agent for this project
      console.log(`Looking for agents with project_id: ${projectId}`)
      const agents = db.prepare('SELECT id FROM agents WHERE project_id = ? LIMIT 1').all(projectId)
      console.log(`Found ${agents.length} agents:`, agents)
      agentId = agents.length > 0 ? agents[0].id : null
      
      // Fallback: get any agent if no project-specific agent found
      if (!agentId) {
        console.log('No project-specific agent found, getting any agent as fallback')
        const anyAgents = db.prepare('SELECT id FROM agents LIMIT 1').all()
        agentId = anyAgents.length > 0 ? anyAgents[0].id : null
        console.log(`Fallback agent: ${agentId}`)
      }
    }
    
    console.log(`Final agentId: ${agentId}`)
    
    const stmt = db.prepare(`
      INSERT INTO conversations (
        id, project_id, agent_id, input, output, status,
        response_time, token_usage, cost, metadata, runId, feedback, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    // Get agent name if agentId is available, always ensure we have a non-null agent_name
    let agentName = data.agent_name || data.agentName || 'Unknown Agent'
    if (agentId) {
      try {
        const agent = db.prepare('SELECT name FROM agents WHERE id = ?').get(agentId) as any
        if (agent && agent.name) agentName = agent.name
      } catch (e) {
        console.warn('Could not fetch agent name:', e)
      }
    }
    
    // Ensure we always have a valid agent_name
    if (!agentName || agentName.trim() === '') {
      agentName = 'Unknown Agent'
    }
    
    stmt.run(
      id,                                                                                                   // id
      projectId,                                                                                            // projectId
      agentId,                                                                                              // agentId
      data.input || '',                                                                                     // input
      data.output || '',                                                                                    // output
      data.status || 'success',                                                                             // status
      data.responseTime || data.response_time || 0,                                                        // responseTime
      data.tokenUsage || data.token_usage || 0,                                                            // tokenUsage
      data.cost || 0.0,                                                                                     // cost
      typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {}),           // metadata
      data.runId || data.run_id || null,                                                                   // runId
      data.feedback || null,                                                                                // feedback
      data.createdAt || data.created_at || now                                                             // createdAt
    )
    
    return conversationDb.getById(id)
  },

  // Update conversation
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.feedback !== undefined) { updates.push('feedback = ?'); values.push(data.feedback) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(data.metadata) }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(data.tags) }
    if (data.annotations !== undefined) { updates.push('annotations = ?'); values.push(data.annotations) }
    
    if (updates.length === 0) return conversationDb.getById(id)
    
    values.push(id)
    const stmt = db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return conversationDb.getById(id)
  },

  // Delete conversation
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM conversations WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Metrics
export const metricsDb = {
  // Get all metrics
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM metrics ORDER BY timestamp DESC')
    return stmt.all()
  },

  // Get metric by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM metrics WHERE id = ?')
    return stmt.get(id) as any
  },

  // Create metric
  create: (data: any): any => {
    const id = `metric_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO metrics (
        id, projectId, agentId, runId, metricType, value, unit, aggregationType,
        timestamp, metadata, evaluationModel, referenceValue, threshold, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.projectId, data.agentId, data.runId || null, data.metricType, data.value, data.unit || null,
      data.aggregationType || 'instant', data.timestamp || now, data.metadata || null, 
      data.evaluationModel || null, data.referenceValue || null, data.threshold || null, data.createdAt || now
    )
    
    return metricsDb.getById(id)
  },

  // Update metric
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.value !== undefined) { updates.push('value = ?'); values.push(data.value) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(data.metadata) }
    
    if (updates.length === 0) return metricsDb.getById(id)
    
    values.push(id)
    const stmt = db.prepare(`UPDATE metrics SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return metricsDb.getById(id)
  },

  // Delete metric
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM metrics WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Traces
export const tracesDb = {
  // Get all traces
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM traces ORDER BY start_time DESC')
    return stmt.all()
  },

  // Get trace by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM traces WHERE id = ?')
    return stmt.get(id) as any
  },

  // Create trace
  create: (data: any): any => {
    const id = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    // Get fallback project if not provided
    let projectId = data.projectId || data.project_id
    
    if (!projectId) {
      // Get first available project
      const projects = db.prepare('SELECT id FROM projects LIMIT 1').all()
      projectId = projects.length > 0 ? projects[0].id : 'test_project'
    }
    
    const stmt = db.prepare(`
      INSERT INTO traces (
        id, project_id, agent_id, conversation_id, operation_name, start_time, end_time, duration, 
        status, metadata, tags, run_id, created_at,
        input_data, output_data, spans, error_message,
        total_cost, input_cost, output_cost, prompt_tokens, completion_tokens, total_tokens,
        provider, model_name, cost_calculation_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, 
      projectId, 
      data.agent_id || data.agentId || null,
      data.conversationId || data.conversation_id || null, 
      data.name || data.operationName || data.operation_name || 'operation',
      data.startTime || data.start_time || now, 
      data.endTime || data.end_time || null,
      data.duration || null, 
      data.status || 'running', 
      typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {}),
      typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || []),
      data.runId || data.run_id || null,
      data.createdAt || data.created_at || now,
      // Data fields
      data.input_data || null,
      data.output_data || null, 
      data.spans || null,
      data.error_message || null,
      // Cost tracking fields
      data.total_cost || 0,
      data.input_cost || 0,
      data.output_cost || 0,
      data.prompt_tokens || 0,
      data.completion_tokens || 0,
      data.total_tokens || 0,
      data.provider || null,
      data.model_name || null,
      data.cost_calculation_metadata || null
    )
    
    return tracesDb.getById(id)
  },

  // Update trace
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.endTime !== undefined) { updates.push('endTime = ?'); values.push(data.endTime) }
    if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.errorMessage !== undefined) { updates.push('errorMessage = ?'); values.push(data.errorMessage) }
    if (data.outputData !== undefined) { updates.push('outputData = ?'); values.push(data.outputData) }
    if (data.spans !== undefined) { updates.push('spans = ?'); values.push(data.spans) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(data.metadata) }
    
    if (updates.length === 0) return tracesDb.getById(id)
    
    values.push(id)
    const stmt = db.prepare(`UPDATE traces SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return tracesDb.getById(id)
  },

  // Delete trace
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM traces WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Spans
export const spansDb = {
  // Get all spans
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM spans ORDER BY start_time ASC')
    return stmt.all()
  },

  // Get span by database ID
  getById: (id: number): any | null => {
    const stmt = db.prepare('SELECT * FROM spans WHERE id = ?')
    return stmt.get(id) as any
  },

  // Get span by span_id
  getBySpanId: (spanId: string): any | null => {
    const stmt = db.prepare('SELECT * FROM spans WHERE span_id = ?')
    return stmt.get(spanId) as any
  },

  // Get spans by trace ID
  getByTraceId: (traceId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time ASC')
    return stmt.all(traceId)
  },

  // Create span
  create: (data: any): any => {
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO spans (
        trace_id, parent_span_id, span_id, span_name, span_type,
        start_time, end_time, duration, status, error_message,
        input_data, output_data, metadata, tags, usage,
        model_name, model_parameters, created_at, updated_at,
        total_cost, input_cost, output_cost, prompt_tokens, completion_tokens, total_tokens, provider, cost_calculation_metadata,
        conversation_session_id, conversation_turn, conversation_role, conversation_context,
        project_id, agent_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      data.trace_id,                                                                            // trace_id
      data.parent_span_id || null,                                                             // parent_span_id  
      data.span_id || generateSpanId(),                                                        // span_id
      data.span_name || data.name,                                                             // span_name
      data.span_type || data.type || 'custom',                                                 // span_type
      data.start_time || now,                                                                  // start_time
      data.end_time || null,                                                                   // end_time
      data.duration || null,                                                                   // duration
      data.status || 'running',                                                                // status
      data.error_message || null,                                                              // error_message
      data.input_data || data.input || null,                                                   // input_data
      data.output_data || data.output || null,                                                 // output_data
      data.metadata || null,                                                                   // metadata
      data.tags || null,                                                                       // tags
      data.usage || null,                                                                      // usage
      data.model_name || null,                                                                 // model_name
      data.model_parameters || null,                                                           // model_parameters
      data.created_at || now,                                                                  // created_at
      now,                                                                                     // updated_at
      data.total_cost || 0,                                                                    // total_cost
      data.input_cost || 0,                                                                    // input_cost
      data.output_cost || 0,                                                                   // output_cost
      data.prompt_tokens || 0,                                                                 // prompt_tokens
      data.completion_tokens || 0,                                                             // completion_tokens
      data.total_tokens || 0,                                                                  // total_tokens
      data.provider || null,                                                                   // provider
      data.cost_calculation_metadata || null,                                                  // cost_calculation_metadata
      data.conversation_session_id || null,                                                    // conversation_session_id
      data.conversation_turn || null,                                                          // conversation_turn
      data.conversation_role || null,                                                          // conversation_role
      data.conversation_context || null,                                                       // conversation_context
      data.project_id || null,                                                              // project_id
      data.agent_id || null                                                                 // agent_id
    )
    
    return spansDb.getById(result.lastInsertRowid as number)
  },

  // Update span by span_id
  updateBySpanId: (spanId: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.end_time !== undefined) { updates.push('end_time = ?'); values.push(data.end_time) }
    if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.error_message !== undefined) { updates.push('error_message = ?'); values.push(data.error_message) }
    if (data.output_data !== undefined) { updates.push('output_data = ?'); values.push(data.output_data) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(data.metadata) }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(data.tags) }
    if (data.token_usage !== undefined) { updates.push('token_usage = ?'); values.push(data.token_usage) }
    if (data.cost !== undefined) { updates.push('cost = ?'); values.push(data.cost) }
    if (data.updated_at !== undefined) { updates.push('updated_at = ?'); values.push(data.updated_at) }
    
    if (updates.length === 0) return spansDb.getBySpanId(spanId)
    
    values.push(spanId)
    const stmt = db.prepare(`UPDATE spans SET ${updates.join(', ')} WHERE span_id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return spansDb.getBySpanId(spanId)
  },

  // Delete span
  delete: (id: number): boolean => {
    const stmt = db.prepare('DELETE FROM spans WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Delete span by span_id
  deleteBySpanId: (spanId: string): boolean => {
    const stmt = db.prepare('DELETE FROM spans WHERE span_id = ?')
    const result = stmt.run(spanId)
    return result.changes > 0
  }
}

// Feedback Scores Database Operations
const feedbackScoresDb = {
  // Create feedback score
  create: (data: any) => {
    const stmt = db.prepare(`
      INSERT INTO feedback_scores (
        id, trace_id, name, category_name, value, reason, source, created_by, created_at, last_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const result = stmt.run(
      data.id,
      data.trace_id,
      data.name,
      data.category_name,
      data.value,
      data.reason,
      data.source,
      data.created_by,
      data.created_at,
      data.last_updated_at
    )
    
    return { ...data, id: data.id }
  },

  // Find feedback scores by trace ID
  findByTraceId: (traceId: string) => {
    const stmt = db.prepare('SELECT * FROM feedback_scores WHERE trace_id = ? ORDER BY created_at DESC')
    return stmt.all(traceId)
  },

  // Find all feedback scores with filtering
  findMany: (options: { where?: any, limit?: number, offset?: number, orderBy?: any } = {}) => {
    let query = 'SELECT * FROM feedback_scores'
    const params: any[] = []
    
    if (options.where) {
      const conditions = Object.entries(options.where).map(([key, value]) => {
        params.push(value)
        return `${key} = ?`
      })
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
      }
    }
    
    if (options.orderBy) {
      const orderClauses = Object.entries(options.orderBy).map(([key, direction]) => `${key} ${direction}`)
      query += ` ORDER BY ${orderClauses.join(', ')}`
    } else {
      query += ' ORDER BY created_at DESC'
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`
    }
    
    const stmt = db.prepare(query)
    return stmt.all(...params)
  },

  // Execute custom query
  query: (sql: string, params: any[] = []) => {
    const stmt = db.prepare(sql)
    return stmt.all(...params)
  },

  // Update feedback score
  update: (id: string, data: any) => {
    const updates: string[] = []
    const values: any[] = []

    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'id') {
        updates.push(`${key} = ?`)
        values.push(value)
      }
    })
    
    if (updates.length === 0) return null
    
    values.push(id)
    const stmt = db.prepare(`UPDATE feedback_scores SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    
    const getStmt = db.prepare('SELECT * FROM feedback_scores WHERE id = ?')
    return getStmt.get(id)
  },

  // Delete feedback score
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM feedback_scores WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Get feedback score by ID
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM feedback_scores WHERE id = ?')
    return stmt.get(id)
  }
}

// Initialize database
const initDatabase = () => {
  try {
    // Ensure data directory exists
    const fs = require('fs')
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    initTables()
    migrateTables()
    // seedData() - Disabled to remove mock data
    console.log('✅ Database initialized successfully')
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    throw error
  }
}

// Feedback Definitions Database Operations
const feedbackDefinitionsDb = {
  // Create feedback definition
  create: (data: any) => {
    const stmt = db.prepare(`
      INSERT INTO feedback_definitions (
        id, name, description, type, details, created_by, created_at, last_updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      data.id,
      data.name,
      data.description,
      data.type,
      data.details,
      data.created_by,
      data.created_at,
      data.last_updated_at
    )
    
    return feedbackDefinitionsDb.getById(data.id)
  },

  // Get feedback definition by ID
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM feedback_definitions WHERE id = ?')
    return stmt.get(id)
  },

  // Find many feedback definitions
  findMany: (options: any = {}) => {
    let query = 'SELECT * FROM feedback_definitions'
    const params: any[] = []
    
    if (options.where) {
      const conditions = []
      if (options.where.type) {
        conditions.push('type = ?')
        params.push(options.where.type)
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ')
      }
    }
    
    if (options.orderBy) {
      const orderBy = Object.entries(options.orderBy)[0]
      if (orderBy) {
        query += ` ORDER BY ${orderBy[0]} ${orderBy[1]?.toUpperCase() || 'ASC'}`
      }
    } else {
      query += ' ORDER BY created_at DESC'
    }
    
    if (options.limit) {
      query += ` LIMIT ${options.limit}`
    }
    
    if (options.offset) {
      query += ` OFFSET ${options.offset}`
    }
    
    const stmt = db.prepare(query)
    return stmt.all(...params)
  },

  // Update feedback definition
  update: (id: string, data: any) => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.type !== undefined) { updates.push('type = ?'); values.push(data.type) }
    if (data.details !== undefined) { updates.push('details = ?'); values.push(data.details) }
    if (data.last_updated_at !== undefined) { updates.push('last_updated_at = ?'); values.push(data.last_updated_at) }
    
    if (updates.length === 0) return null
    
    values.push(id)
    const stmt = db.prepare(`UPDATE feedback_definitions SET ${updates.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    
    return feedbackDefinitionsDb.getById(id)
  },

  // Delete feedback definition
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM feedback_definitions WHERE id = ?')
    stmt.run(id)
    return true
  },

  // Raw query
  query: (sql: string, params: any[] = []) => {
    const stmt = db.prepare(sql)
    return stmt.all(...params)
  }
}

// Database operations for Distributed Traces
const distributedTracesDb = {
  // Get all distributed traces
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM distributed_traces ORDER BY start_time DESC')
    return stmt.all()
  },

  // Get distributed trace by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM distributed_traces WHERE id = ?')
    return stmt.get(id) as any
  },

  // Create distributed trace
  create: (data: any): any => {
    const id = data.id || `dtrace_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO distributed_traces (
        id, root_span_id, service_name, start_time, end_time, duration, status,
        agent_count, service_count, container_count, total_cost, total_tokens,
        total_requests, error_count, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      data.root_span_id || data.rootSpanId,
      data.service_name || data.serviceName,
      data.start_time || data.startTime || now,
      data.end_time || data.endTime || null,
      data.duration || null,
      data.status || 'running',
      data.agent_count || data.agentCount || 0,
      data.service_count || data.serviceCount || 0,
      data.container_count || data.containerCount || 0,
      data.total_cost || data.totalCost || 0,
      data.total_tokens || data.totalTokens || 0,
      data.total_requests || data.totalRequests || 0,
      data.error_count || data.errorCount || 0,
      data.created_at || data.createdAt || now,
      typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {})
    )
    
    return distributedTracesDb.getById(id)
  },

  // Update distributed trace
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.end_time !== undefined) { updates.push('end_time = ?'); values.push(data.end_time || data.endTime) }
    if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.agent_count !== undefined) { updates.push('agent_count = ?'); values.push(data.agent_count || data.agentCount) }
    if (data.service_count !== undefined) { updates.push('service_count = ?'); values.push(data.service_count || data.serviceCount) }
    if (data.container_count !== undefined) { updates.push('container_count = ?'); values.push(data.container_count || data.containerCount) }
    if (data.total_cost !== undefined) { updates.push('total_cost = ?'); values.push(data.total_cost || data.totalCost) }
    if (data.total_tokens !== undefined) { updates.push('total_tokens = ?'); values.push(data.total_tokens || data.totalTokens) }
    if (data.total_requests !== undefined) { updates.push('total_requests = ?'); values.push(data.total_requests || data.totalRequests) }
    if (data.error_count !== undefined) { updates.push('error_count = ?'); values.push(data.error_count || data.errorCount) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata)) }
    
    if (updates.length === 0) return distributedTracesDb.getById(id)
    
    values.push(id)
    const stmt = db.prepare(`UPDATE distributed_traces SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return distributedTracesDb.getById(id)
  },

  // Delete distributed trace
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM distributed_traces WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Distributed Spans
const distributedSpansDb = {
  // Get all distributed spans
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM distributed_spans ORDER BY start_time ASC')
    return stmt.all()
  },

  // Get distributed span by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM distributed_spans WHERE id = ?')
    return stmt.get(id) as any
  },

  // Get spans by trace ID
  getByTraceId: (traceId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM distributed_spans WHERE trace_id = ? ORDER BY start_time ASC')
    return stmt.all(traceId)
  },

  // Create distributed span
  create: (data: any): any => {
    const id = data.id || `dspan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO distributed_spans (
        id, trace_id, parent_span_id, operation_name, service_name, service_version,
        start_time, end_time, duration, status, tags, logs,
        agent_id, agent_type, agent_version,
        container_id, container_name, hostname, pod_name, namespace,
        source_agent_id, target_agent_id, communication_type,
        total_cost, input_cost, output_cost, prompt_tokens, completion_tokens, total_tokens,
        provider, model_name, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      data.trace_id || data.traceId,
      data.parent_span_id || data.parentSpanId || null,
      data.operation_name || data.operationName,
      data.service_name || data.serviceName,
      data.service_version || data.serviceVersion || null,
      data.start_time || data.startTime || now,
      data.end_time || data.endTime || null,
      data.duration || null,
      data.status || 'running',
      typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || {}),
      typeof data.logs === 'string' ? data.logs : JSON.stringify(data.logs || []),
      data.agent_id || data.agentId || null,
      data.agent_type || data.agentType || null,
      data.agent_version || data.agentVersion || null,
      data.container_id || data.containerId || null,
      data.container_name || data.containerName || null,
      data.hostname || null,
      data.pod_name || data.podName || null,
      data.namespace || null,
      data.source_agent_id || data.sourceAgentId || null,
      data.target_agent_id || data.targetAgentId || null,
      data.communication_type || data.communicationType || 'direct',
      data.total_cost || data.totalCost || 0,
      data.input_cost || data.inputCost || 0,
      data.output_cost || data.outputCost || 0,
      data.prompt_tokens || data.promptTokens || 0,
      data.completion_tokens || data.completionTokens || 0,
      data.total_tokens || data.totalTokens || 0,
      data.provider || null,
      data.model_name || data.modelName || null,
      data.created_at || data.createdAt || now
    )
    
    return distributedSpansDb.getById(id)
  },

  // Update distributed span
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.end_time !== undefined) { updates.push('end_time = ?'); values.push(data.end_time || data.endTime) }
    if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags)) }
    if (data.logs !== undefined) { updates.push('logs = ?'); values.push(typeof data.logs === 'string' ? data.logs : JSON.stringify(data.logs)) }
    if (data.total_cost !== undefined) { updates.push('total_cost = ?'); values.push(data.total_cost || data.totalCost) }
    if (data.input_cost !== undefined) { updates.push('input_cost = ?'); values.push(data.input_cost || data.inputCost) }
    if (data.output_cost !== undefined) { updates.push('output_cost = ?'); values.push(data.output_cost || data.outputCost) }
    if (data.prompt_tokens !== undefined) { updates.push('prompt_tokens = ?'); values.push(data.prompt_tokens || data.promptTokens) }
    if (data.completion_tokens !== undefined) { updates.push('completion_tokens = ?'); values.push(data.completion_tokens || data.completionTokens) }
    if (data.total_tokens !== undefined) { updates.push('total_tokens = ?'); values.push(data.total_tokens || data.totalTokens) }
    if (data.provider !== undefined) { updates.push('provider = ?'); values.push(data.provider) }
    if (data.model_name !== undefined) { updates.push('model_name = ?'); values.push(data.model_name || data.modelName) }
    
    if (updates.length === 0) return distributedSpansDb.getById(id)
    
    values.push(id)
    const stmt = db.prepare(`UPDATE distributed_spans SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return distributedSpansDb.getById(id)
  },

  // Delete distributed span
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM distributed_spans WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for A2A Communications
const a2aCommunicationsDb = {
  // Get all A2A communications
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM a2a_communications ORDER BY start_time DESC')
    return stmt.all()
  },

  // Get A2A communication by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM a2a_communications WHERE id = ?')
    return stmt.get(id) as any
  },

  // Get A2A communications by trace ID
  getByTraceId: (traceId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM a2a_communications WHERE trace_id = ? ORDER BY start_time ASC')
    return stmt.all(traceId)
  },

  // Create A2A communication
  create: (data: any): any => {
    const id = data.id || `a2a_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO a2a_communications (
        id, trace_id, source_span_id, target_span_id, source_agent_id, target_agent_id,
        communication_type, protocol, endpoint, method, payload, response,
        start_time, end_time, duration, status, error_message,
        source_host, target_host, source_port, target_port, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      data.trace_id || data.traceId,
      data.source_span_id || data.sourceSpanId,
      data.target_span_id || data.targetSpanId,
      data.source_agent_id || data.sourceAgentId,
      data.target_agent_id || data.targetAgentId,
      data.communication_type || data.communicationType,
      data.protocol || null,
      data.endpoint || null,
      data.method || null,
      typeof data.payload === 'string' ? data.payload : JSON.stringify(data.payload || {}),
      typeof data.response === 'string' ? data.response : JSON.stringify(data.response || {}),
      data.start_time || data.startTime || now,
      data.end_time || data.endTime || null,
      data.duration || null,
      data.status || 'running',
      data.error_message || data.errorMessage || null,
      data.source_host || data.sourceHost || null,
      data.target_host || data.targetHost || null,
      data.source_port || data.sourcePort || null,
      data.target_port || data.targetPort || null,
      data.created_at || data.createdAt || now
    )
    
    return a2aCommunicationsDb.getById(id)
  },

  // Update A2A communication
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.end_time !== undefined) { updates.push('end_time = ?'); values.push(data.end_time || data.endTime) }
    if (data.duration !== undefined) { updates.push('duration = ?'); values.push(data.duration) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.error_message !== undefined) { updates.push('error_message = ?'); values.push(data.error_message || data.errorMessage) }
    if (data.response !== undefined) { updates.push('response = ?'); values.push(typeof data.response === 'string' ? data.response : JSON.stringify(data.response)) }
    
    if (updates.length === 0) return a2aCommunicationsDb.getById(id)
    
    values.push(id)
    const stmt = db.prepare(`UPDATE a2a_communications SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return a2aCommunicationsDb.getById(id)
  },

  // Delete A2A communication
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM a2a_communications WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for LLM Providers
const llmProvidersDb = {
  // Get all providers
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    } else {
      const stmt = db.prepare('SELECT * FROM llm_providers ORDER BY created_at DESC')
      return stmt.all()
    }
  },

  // Get provider by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM llm_providers WHERE id = ?')
    return stmt.get(id) || null
  },

  // Create new provider
  create: (data: any): any => {
    const id = data.id || generateSpanId()
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO llm_providers (
        id, name, type, display_name, description, config, credentials, 
        status, health_status, usage_limits, created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.name, data.type, data.display_name, data.description,
      JSON.stringify(data.config), JSON.stringify(data.credentials),
      data.status || 'active', data.health_status || 'unknown',
      JSON.stringify(data.usage_limits || {}), now, now, data.created_by, data.updated_by
    )
    
    return llmProvidersDb.getById(id)
  },

  // Update provider
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.display_name !== undefined) { updates.push('display_name = ?'); values.push(data.display_name) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.config !== undefined) { updates.push('config = ?'); values.push(JSON.stringify(data.config)) }
    if (data.credentials !== undefined) { updates.push('credentials = ?'); values.push(JSON.stringify(data.credentials)) }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status) }
    if (data.health_status !== undefined) { updates.push('health_status = ?'); values.push(data.health_status) }
    if (data.usage_limits !== undefined) { updates.push('usage_limits = ?'); values.push(JSON.stringify(data.usage_limits)) }
    if (data.updated_by !== undefined) { updates.push('updated_by = ?'); values.push(data.updated_by) }
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    
    if (updates.length === 1) return llmProvidersDb.getById(id) // Only updated_at was added
    
    values.push(id)
    const stmt = db.prepare(`UPDATE llm_providers SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return llmProvidersDb.getById(id)
  },

  // Delete provider
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM llm_providers WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Prompts
const promptsDb = {
  // Get all prompts
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    } else {
      const stmt = db.prepare('SELECT * FROM prompts ORDER BY created_at DESC')
      return stmt.all()
    }
  },

  // Get prompt by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM prompts WHERE id = ?')
    return stmt.get(id) || null
  },

  // Create new prompt
  create: (data: any): any => {
    const id = data.id || generateSpanId()
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO prompts (
        id, name, description, project_id, template, variables, metadata, created_at, updated_at, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.name, data.description, data.project_id,
      data.template || '',
      JSON.stringify(data.variables || {}),
      JSON.stringify(data.metadata || {}),
      now, now, data.created_by, data.updated_by
    )
    
    return promptsDb.getById(id)
  },

  // Update prompt
  update: (id: string, data: any): any | null => {
    const updates: string[] = []
    const values: any[] = []
    
    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name) }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description) }
    if (data.template !== undefined) { updates.push('template = ?'); values.push(data.template) }
    if (data.variables !== undefined) { updates.push('variables = ?'); values.push(JSON.stringify(data.variables)) }
    if (data.metadata !== undefined) { updates.push('metadata = ?'); values.push(JSON.stringify(data.metadata)) }
    if (data.updated_by !== undefined) { updates.push('updated_by = ?'); values.push(data.updated_by) }
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    
    if (updates.length === 1) return promptsDb.getById(id) // Only updated_at was added
    
    values.push(id)
    const stmt = db.prepare(`UPDATE prompts SET ${updates.join(', ')} WHERE id = ?`)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return promptsDb.getById(id)
  },

  // Delete prompt
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM prompts WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Prompt Versions
const promptVersionsDb = {
  // Get all versions
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    } else {
      const stmt = db.prepare('SELECT * FROM prompt_versions ORDER BY created_at DESC')
      return stmt.all()
    }
  },

  // Get version by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM prompt_versions WHERE id = ?')
    return stmt.get(id) || null
  },

  // Get versions by prompt ID
  getByPromptId: (promptId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM prompt_versions WHERE prompt_id = ? ORDER BY version DESC')
    return stmt.all(promptId)
  },

  // Get active version for prompt
  getActiveVersion: (promptId: string): any | null => {
    const stmt = db.prepare('SELECT * FROM prompt_versions WHERE prompt_id = ? AND is_active = 1')
    return stmt.get(promptId) || null
  },

  // Create new version
  create: (data: any): any => {
    // Validate version uniqueness
    if (promptVersionsDb.versionExists(data.prompt_id, data.version)) {
      throw new Error(`Version ${data.version} already exists for this prompt`)
    }
    
    const id = data.id || generateSpanId()
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO prompt_versions (
        id, prompt_id, version, template, variables, is_active, changelog, 
        variable_definitions, status, comments, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.prompt_id, data.version, data.template,
      JSON.stringify(data.variables || {}), data.is_active ? 1 : 0,
      data.changelog,
      JSON.stringify(data.variable_definitions || []),
      data.status || 'draft',
      data.comments || '',
      now, data.created_by
    )
    
    return promptVersionsDb.getById(id)
  },

  // Activate version (deactivates others)
  activate: (id: string): any | null => {
    const version = promptVersionsDb.getById(id)
    if (!version) return null
    
    // Deactivate all versions for this prompt
    const deactivateStmt = db.prepare('UPDATE prompt_versions SET is_active = 0 WHERE prompt_id = ?')
    deactivateStmt.run(version.prompt_id)
    
    // Activate this version
    const activateStmt = db.prepare('UPDATE prompt_versions SET is_active = 1, updated_at = ? WHERE id = ?')
    activateStmt.run(new Date().toISOString(), id)
    
    return promptVersionsDb.getById(id)
  },

  // Delete version
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM prompt_versions WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Get current version for a prompt
  getCurrentVersion: (promptId: string): any | null => {
    const stmt = db.prepare('SELECT * FROM prompt_versions WHERE prompt_id = ? AND status = "current" ORDER BY created_at DESC LIMIT 1')
    return stmt.get(promptId) || null
  },

  // Set version as current (and deactivate previous current)
  setAsCurrent: (id: string): any | null => {
    const version = promptVersionsDb.getById(id)
    if (!version) return null

    // Start transaction
    db.exec('BEGIN TRANSACTION')
    
    try {
      // Deactivate all current versions for this prompt
      const deactivateStmt = db.prepare('UPDATE prompt_versions SET status = "deactivated" WHERE prompt_id = ? AND status = "current"')
      deactivateStmt.run(version.prompt_id)
      
      // Set this version as current and active
      const setCurrentStmt = db.prepare('UPDATE prompt_versions SET status = "current", is_active = 1 WHERE id = ?')
      setCurrentStmt.run(id)
      
      db.exec('COMMIT')
      return promptVersionsDb.getById(id)
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  },

  // Update version
  update: (id: string, data: any): any | null => {
    const fields = []
    const values = []
    
    if (data.version !== undefined) {
      fields.push('version = ?')
      values.push(data.version)
    }
    if (data.template !== undefined) {
      fields.push('template = ?')
      values.push(data.template)
    }
    if (data.variables !== undefined) {
      fields.push('variables = ?')
      values.push(JSON.stringify(data.variables))
    }
    if (data.variable_definitions !== undefined) {
      fields.push('variable_definitions = ?')
      values.push(JSON.stringify(data.variable_definitions))
    }
    if (data.changelog !== undefined) {
      fields.push('changelog = ?')
      values.push(data.changelog)
    }
    if (data.status !== undefined) {
      fields.push('status = ?')
      values.push(data.status)
    }
    if (data.comments !== undefined) {
      fields.push('comments = ?')
      values.push(data.comments)
    }
    
    if (fields.length === 0) return promptVersionsDb.getById(id)
    
    fields.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    const stmt = db.prepare(`UPDATE prompt_versions SET ${fields.join(', ')} WHERE id = ?`)
    stmt.run(...values)
    
    return promptVersionsDb.getById(id)
  },

  // Check if version already exists for a prompt
  versionExists: (promptId: string, version: string): boolean => {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM prompt_versions WHERE prompt_id = ? AND version = ?')
    const result = stmt.get(promptId, version) as { count: number }
    return result.count > 0
  },

  // Generate next version number based on change type
  generateNextVersion: (promptId: string, changeType: 'major' | 'minor' | 'patch'): string => {
    const versions = promptVersionsDb.getByPromptId(promptId)
    
    if (versions.length === 0) {
      return '1.0.0'
    }
    
    // Find the highest version number
    let highestVersion = { major: 0, minor: 0, patch: 0 }
    
    versions.forEach(version => {
      const versionParts = version.version.split('.').map(Number)
      const [major, minor, patch] = versionParts
      
      if (major > highestVersion.major || 
          (major === highestVersion.major && minor > highestVersion.minor) ||
          (major === highestVersion.major && minor === highestVersion.minor && patch > highestVersion.patch)) {
        highestVersion = { major, minor, patch }
      }
    })
    
    // Increment based on change type and ensure uniqueness
    let newVersion: string
    switch (changeType) {
      case 'major':
        newVersion = `${highestVersion.major + 1}.0.0`
        break
      case 'minor':
        newVersion = `${highestVersion.major}.${highestVersion.minor + 1}.0`
        break
      case 'patch':
      default:
        newVersion = `${highestVersion.major}.${highestVersion.minor}.${highestVersion.patch + 1}`
        break
    }
    
    // Double-check uniqueness (should not happen with proper sequencing, but safety check)
    while (promptVersionsDb.versionExists(promptId, newVersion)) {
      const parts = newVersion.split('.').map(Number)
      newVersion = `${parts[0]}.${parts[1]}.${parts[2] + 1}`
    }
    
    return newVersion
  },

  // Get suggested version increments
  getSuggestedVersions: (promptId: string): { major: string, minor: string, patch: string } => {
    return {
      major: promptVersionsDb.generateNextVersion(promptId, 'major'),
      minor: promptVersionsDb.generateNextVersion(promptId, 'minor'),
      patch: promptVersionsDb.generateNextVersion(promptId, 'patch')
    }
  }
}

// Database operations for Agent-Prompt Links
const agentPromptLinksDb = {
  // Get all links
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    } else {
      const stmt = db.prepare('SELECT * FROM agent_prompt_links ORDER BY linked_at DESC')
      return stmt.all()
    }
  },

  // Get link by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM agent_prompt_links WHERE id = ?')
    return stmt.get(id) || null
  },

  // Get links by agent ID
  getByAgentId: (agentId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM agent_prompt_links WHERE agent_id = ? ORDER BY linked_at DESC')
    return stmt.all(agentId)
  },

  // Get active link for agent
  getActiveLink: (agentId: string): any | null => {
    const stmt = db.prepare('SELECT * FROM agent_prompt_links WHERE agent_id = ? AND is_active = 1')
    return stmt.get(agentId) || null
  },

  // Create new link
  create: (data: any): any => {
    const id = data.id || generateSpanId()
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO agent_prompt_links (
        id, agent_id, prompt_version_id, is_active, linked_at, linked_by
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, data.agent_id, data.prompt_version_id, 
      data.is_active ? 1 : 0, now, data.linked_by
    )
    
    return agentPromptLinksDb.getById(id)
  },

  // Activate link (deactivates others for same agent)
  activate: (id: string): any | null => {
    const link = agentPromptLinksDb.getById(id)
    if (!link) return null
    
    // Deactivate all links for this agent
    const deactivateStmt = db.prepare('UPDATE agent_prompt_links SET is_active = 0 WHERE agent_id = ?')
    deactivateStmt.run(link.agent_id)
    
    // Activate this link
    const activateStmt = db.prepare('UPDATE agent_prompt_links SET is_active = 1 WHERE id = ?')
    activateStmt.run(id)
    
    return agentPromptLinksDb.getById(id)
  },

  // Delete link
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM agent_prompt_links WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Heuristic Metrics
export const heuristicMetricsDb = {
  // Get all metrics
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM heuristic_metrics ORDER BY created_at DESC')
    return stmt.all()
  },

  // Get active metrics only
  getActive: () => {
    const stmt = db.prepare('SELECT * FROM heuristic_metrics WHERE is_active = 1 ORDER BY name')
    return stmt.all()
  },

  // Get by ID
  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM heuristic_metrics WHERE id = ?')
    return stmt.get(id)
  },

  // Get by type
  getByType: (type: string) => {
    const stmt = db.prepare('SELECT * FROM heuristic_metrics WHERE type = ? AND is_active = 1')
    return stmt.all(type)
  },

  // Create new metric
  create: (data: {
    name: string
    description?: string
    type: string
    config: string
  }) => {
    const id = `metric_${data.type}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO heuristic_metrics (id, name, description, type, config, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, data.name, data.description, data.type, data.config, 1, now, now)
    return heuristicMetricsDb.getById(id)
  },

  // Update metric
  update: (id: string, data: {
    name?: string
    description?: string
    config?: string
    is_active?: number
  }) => {
    const updates = []
    const values = []
    
    if (data.name !== undefined) {
      updates.push('name = ?')
      values.push(data.name)
    }
    if (data.description !== undefined) {
      updates.push('description = ?')
      values.push(data.description)
    }
    if (data.config !== undefined) {
      updates.push('config = ?')
      values.push(data.config)
    }
    if (data.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(data.is_active)
    }
    
    if (updates.length === 0) return null
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    const sql = `UPDATE heuristic_metrics SET ${updates.join(', ')} WHERE id = ?`
    const stmt = db.prepare(sql)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return heuristicMetricsDb.getById(id)
  },

  // Delete metric
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM heuristic_metrics WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Evaluation Runs
export const evaluationRunsDb = {
  // Get all runs
  getAll: () => {
    const stmt = db.prepare(`
      SELECT er.*, e.name as evaluation_name, d.name as dataset_name
      FROM evaluation_runs er
      LEFT JOIN evaluations e ON er.evaluation_id = e.id
      LEFT JOIN datasets d ON er.dataset_id = d.id
      ORDER BY er.created_at DESC
    `)
    return stmt.all()
  },

  // Get by ID
  getById: (id: string) => {
    const stmt = db.prepare(`
      SELECT er.*, e.name as evaluation_name, d.name as dataset_name
      FROM evaluation_runs er
      LEFT JOIN evaluations e ON er.evaluation_id = e.id
      LEFT JOIN datasets d ON er.dataset_id = d.id
      WHERE er.id = ?
    `)
    return stmt.get(id)
  },

  // Get by evaluation ID
  getByEvaluationId: (evaluationId: string) => {
    const stmt = db.prepare(`
      SELECT er.*, d.name as dataset_name
      FROM evaluation_runs er
      LEFT JOIN datasets d ON er.dataset_id = d.id
      WHERE er.evaluation_id = ?
      ORDER BY er.created_at DESC
    `)
    return stmt.all(evaluationId)
  },

  // Create new run
  create: (data: {
    evaluation_id: string
    dataset_id?: string
    total_items?: number
    metrics_config: string
  }) => {
    const id = `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO evaluation_runs (id, evaluation_id, dataset_id, status, total_items, processed_items, metrics_config, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(id, data.evaluation_id, data.dataset_id, 'pending', data.total_items || 0, 0, data.metrics_config, now, now)
    return evaluationRunsDb.getById(id)
  },

  // Update run status and progress
  updateProgress: (id: string, data: {
    status?: string
    processed_items?: number
    start_time?: string
    end_time?: string
    duration?: number
    summary_stats?: string
    error_message?: string
  }) => {
    const updates = []
    const values = []
    
    if (data.status !== undefined) {
      updates.push('status = ?')
      values.push(data.status)
    }
    if (data.processed_items !== undefined) {
      updates.push('processed_items = ?')
      values.push(data.processed_items)
    }
    if (data.start_time !== undefined) {
      updates.push('start_time = ?')
      values.push(data.start_time)
    }
    if (data.end_time !== undefined) {
      updates.push('end_time = ?')
      values.push(data.end_time)
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?')
      values.push(data.duration)
    }
    if (data.summary_stats !== undefined) {
      updates.push('summary_stats = ?')
      values.push(data.summary_stats)
    }
    if (data.error_message !== undefined) {
      updates.push('error_message = ?')
      values.push(data.error_message)
    }
    
    if (updates.length === 0) return null
    
    updates.push('updated_at = ?')
    values.push(new Date().toISOString())
    values.push(id)
    
    const sql = `UPDATE evaluation_runs SET ${updates.join(', ')} WHERE id = ?`
    const stmt = db.prepare(sql)
    const result = stmt.run(...values)
    
    if (result.changes === 0) return null
    return evaluationRunsDb.getById(id)
  },

  // Delete run
  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM evaluation_runs WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}

// Database operations for Metric Results
export const metricResultsDb = {
  // Get results by run ID
  getByRunId: (runId: string) => {
    const stmt = db.prepare(`
      SELECT mr.*, hm.name as metric_name, hm.type as metric_type, di.input_data
      FROM metric_results mr
      LEFT JOIN heuristic_metrics hm ON mr.metric_id = hm.id
      LEFT JOIN dataset_items di ON mr.dataset_item_id = di.id
      WHERE mr.evaluation_run_id = ?
      ORDER BY mr.created_at
    `)
    return stmt.all(runId)
  },

  // Get results by metric ID
  getByMetricId: (metricId: string) => {
    const stmt = db.prepare(`
      SELECT mr.*, er.evaluation_id, di.input_data
      FROM metric_results mr
      LEFT JOIN evaluation_runs er ON mr.evaluation_run_id = er.id
      LEFT JOIN dataset_items di ON mr.dataset_item_id = di.id
      WHERE mr.metric_id = ?
      ORDER BY mr.created_at DESC
    `)
    return stmt.all(metricId)
  },

  // Create result
  create: (data: {
    evaluation_run_id: string
    dataset_item_id?: string
    metric_id: string
    score: number
    passed: number
    details?: string
    execution_time?: number
  }) => {
    const id = `result_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO metric_results (id, evaluation_run_id, dataset_item_id, metric_id, score, passed, details, execution_time, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      data.evaluation_run_id,
      data.dataset_item_id,
      data.metric_id,
      data.score,
      data.passed,
      data.details,
      data.execution_time,
      now
    )
    
    return { id, ...data, created_at: now }
  },

  // Get aggregate stats for a run
  getRunStats: (runId: string) => {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total_results,
        SUM(passed) as passed_count,
        AVG(score) as avg_score,
        MIN(score) as min_score,
        MAX(score) as max_score,
        AVG(execution_time) as avg_execution_time
      FROM metric_results 
      WHERE evaluation_run_id = ?
    `)
    return stmt.get(runId)
  },

  // Delete results by run ID
  deleteByRunId: (runId: string) => {
    const stmt = db.prepare('DELETE FROM metric_results WHERE evaluation_run_id = ?')
    const result = stmt.run(runId)
    return result.changes > 0
  }
}

// Conversation Sessions Database Operations (conversation-as-span architecture)
const conversationSessionsDb = {
  // Get all conversation sessions
  getAll: (query?: string, params?: any[]): any[] => {
    if (query && params) {
      const stmt = db.prepare(query)
      return stmt.all(...params)
    }
    const stmt = db.prepare('SELECT * FROM conversation_sessions ORDER BY started_at DESC')
    return stmt.all()
  },

  // Get session by ID
  getById: (id: string): any | null => {
    const stmt = db.prepare('SELECT * FROM conversation_sessions WHERE id = ?')
    return stmt.get(id) as any
  },

  // Get sessions by project ID
  getByProjectId: (projectId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM conversation_sessions WHERE project_id = ? ORDER BY started_at DESC')
    return stmt.all(projectId)
  },

  // Get sessions by agent ID
  getByAgentId: (agentId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM conversation_sessions WHERE agent_id = ? ORDER BY started_at DESC')
    return stmt.all(agentId)
  },

  // Get sessions by session ID (groups related conversations)
  getBySessionId: (sessionId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM conversation_sessions WHERE session_id = ? ORDER BY started_at DESC')
    return stmt.all(sessionId)
  },

  // Get sessions by thread ID (multi-turn conversations)
  getByThreadId: (threadId: string): any[] => {
    const stmt = db.prepare('SELECT * FROM conversation_sessions WHERE thread_id = ? ORDER BY started_at DESC')
    return stmt.all(threadId)
  },

  // Create new conversation session
  create: (data: any): any => {
    const id = data.id || generateConversationId()
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      INSERT INTO conversation_sessions 
      (id, project_id, agent_id, session_id, thread_id, user_id, session_name, status, 
       total_turns, total_cost, total_tokens, started_at, last_activity_at, metadata, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id,
      data.project_id,
      data.agent_id,
      data.session_id,
      data.thread_id || null,
      data.user_id || null,
      data.session_name || null,
      data.status || 'active',
      data.total_turns || 0,
      data.total_cost || 0,
      data.total_tokens || 0,
      data.started_at || now,
      data.last_activity_at || now,
      data.metadata || null,
      data.tags || null,
      now,
      now
    )
    
    return { id, ...data, created_at: now, updated_at: now }
  },

  // Update conversation session
  update: (id: string, data: any): boolean => {
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      UPDATE conversation_sessions 
      SET session_name = ?, status = ?, total_turns = ?, total_cost = ?, total_tokens = ?,
          last_activity_at = ?, metadata = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `)
    
    const result = stmt.run(
      data.session_name,
      data.status,
      data.total_turns,
      data.total_cost,
      data.total_tokens,
      data.last_activity_at || now,
      data.metadata,
      data.tags,
      now,
      id
    )
    
    return result.changes > 0
  },

  // Increment session metrics (turns, cost, tokens)
  incrementMetrics: (id: string, turnIncrement: number = 1, costIncrement: number = 0, tokenIncrement: number = 0): boolean => {
    const now = new Date().toISOString()
    
    const stmt = db.prepare(`
      UPDATE conversation_sessions 
      SET total_turns = total_turns + ?, 
          total_cost = total_cost + ?, 
          total_tokens = total_tokens + ?,
          last_activity_at = ?,
          updated_at = ?
      WHERE id = ?
    `)
    
    const result = stmt.run(turnIncrement, costIncrement, tokenIncrement, now, now, id)
    return result.changes > 0
  },

  // Delete conversation session
  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM conversation_sessions WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  },

  // Get conversation spans for a session
  getConversationSpans: (sessionId: string): any[] => {
    const stmt = db.prepare(`
      SELECT s.*, t.operation_name as trace_operation 
      FROM spans s
      LEFT JOIN traces t ON s.trace_id = t.id
      WHERE s.conversation_session_id = ?
      ORDER BY s.conversation_turn ASC, s.start_time ASC
    `)
    return stmt.all(sessionId)
  },

  // Get session statistics
  getSessionStats: (projectId?: string, agentId?: string): any => {
    let query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        AVG(total_turns) as avg_turns_per_session,
        AVG(total_cost) as avg_cost_per_session,
        AVG(total_tokens) as avg_tokens_per_session,
        SUM(total_cost) as total_session_cost,
        SUM(total_tokens) as total_session_tokens
      FROM conversation_sessions
      WHERE 1=1
    `
    
    const params: any[] = []
    
    if (projectId) {
      query += ' AND project_id = ?'
      params.push(projectId)
    }
    
    if (agentId) {
      query += ' AND agent_id = ?'
      params.push(agentId)
    }
    
    const stmt = db.prepare(query)
    return params.length > 0 ? stmt.get(...params) : stmt.get()
  }
}

// Initialize on module load
initDatabase()

// Export database instances
export { db, feedbackScoresDb, feedbackDefinitionsDb, distributedTracesDb, distributedSpansDb, a2aCommunicationsDb, llmProvidersDb, promptsDb, promptVersionsDb, agentPromptLinksDb, conversationSessionsDb, projectDb, agentDb }
export default db