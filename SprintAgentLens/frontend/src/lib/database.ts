import Database from 'better-sqlite3'
import { Department, BusinessPriority, Project, Agent } from './types'
import path from 'path'

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

    // Check if project_id column exists in experiments table
    const experimentColumns = db.prepare("PRAGMA table_info(experiments)").all() as any[]
    const hasProjectIdInExperiments = experimentColumns.some(col => col.name === 'project_id')
    if (!hasProjectIdInExperiments) {
      console.log('📝 Adding project_id column to experiments table...')
      db.exec('ALTER TABLE experiments ADD COLUMN project_id TEXT')
    }
    
    // Check if runId column exists in traces table
    const traceColumns = db.prepare("PRAGMA table_info(traces)").all() as any[]
    const hasRunIdInTraces = traceColumns.some(col => col.name === 'runId')
    
    if (!hasRunIdInTraces) {
      console.log('📝 Adding runId column to traces table...')
      db.exec('ALTER TABLE traces ADD COLUMN runId TEXT')
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
      securityLevel TEXT NOT NULL,
      dataRetention TEXT NOT NULL,
      defaultAccess TEXT NOT NULL,
      piiHandling INTEGER NOT NULL DEFAULT 0,
      complianceMode INTEGER NOT NULL DEFAULT 0,
      teamMembers TEXT NOT NULL DEFAULT '[]',
      visibility TEXT NOT NULL DEFAULT 'private',
      status TEXT NOT NULL DEFAULT 'active',
      agents INTEGER NOT NULL DEFAULT 0,
      conversations INTEGER NOT NULL DEFAULT 0,
      successRate REAL NOT NULL DEFAULT 0.0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (department) REFERENCES departments(code),
      FOREIGN KEY (priority) REFERENCES business_priorities(id)
    )
  `)

  // Agents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      projectId TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL,
      role TEXT NOT NULL,
      capabilities TEXT NOT NULL DEFAULT '[]',
      systemPrompt TEXT,
      model TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.7,
      maxTokens INTEGER NOT NULL DEFAULT 2000,
      status TEXT NOT NULL DEFAULT 'active',
      isActive INTEGER NOT NULL DEFAULT 1,
      version TEXT NOT NULL DEFAULT '1.0.0',
      conversations INTEGER NOT NULL DEFAULT 0,
      successRate REAL NOT NULL DEFAULT 0.0,
      avgResponseTime INTEGER NOT NULL DEFAULT 0,
      lastActiveAt TEXT,
      config TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      createdBy TEXT NOT NULL DEFAULT 'system',
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
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
      projectId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      runId TEXT, -- Links to runs table for session grouping
      userId TEXT, -- Optional user identifier
      sessionId TEXT, -- Group related conversations (legacy)
      input TEXT NOT NULL, -- User input/query
      output TEXT NOT NULL, -- Agent response
      status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'timeout'
      responseTime INTEGER NOT NULL, -- milliseconds
      tokenUsage INTEGER DEFAULT 0, -- tokens consumed
      cost REAL DEFAULT 0.0, -- cost in USD
      feedback TEXT, -- user feedback (thumbs up/down, rating)
      metadata TEXT, -- JSON object for additional context
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
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
      projectId TEXT NOT NULL,
      agentId TEXT NOT NULL,
      runId TEXT, -- Links to runs table for session grouping
      conversationId TEXT, -- Link to conversation if applicable
      parentTraceId TEXT, -- For nested/child traces
      traceType TEXT NOT NULL, -- 'conversation', 'task', 'function_call', 'api_request'
      operationName TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT,
      duration INTEGER, -- milliseconds
      status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'error', 'timeout'
      errorMessage TEXT,
      inputData TEXT, -- JSON object
      outputData TEXT, -- JSON object
      spans TEXT, -- JSON array of spans for detailed tracing
      metadata TEXT, -- JSON object for additional context
      createdAt TEXT NOT NULL,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
      FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
      FOREIGN KEY (runId) REFERENCES runs(id) ON DELETE SET NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE SET NULL
    )
  `)

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
export const projectDb = {
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
        tags, securityLevel, dataRetention, defaultAccess, piiHandling,
        complianceMode, teamMembers, visibility, status, createdAt, updatedAt,
        agents, conversations, successRate
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
    if (data.securityLevel !== undefined) { updates.push('securityLevel = ?'); values.push(data.securityLevel) }
    if (data.dataRetention !== undefined) { updates.push('dataRetention = ?'); values.push(data.dataRetention) }
    if (data.defaultAccess !== undefined) { updates.push('defaultAccess = ?'); values.push(data.defaultAccess) }
    if (data.piiHandling !== undefined) { updates.push('piiHandling = ?'); values.push(data.piiHandling ? 1 : 0) }
    if (data.complianceMode !== undefined) { updates.push('complianceMode = ?'); values.push(data.complianceMode ? 1 : 0) }
    if (data.teamMembers !== undefined) { updates.push('teamMembers = ?'); values.push(JSON.stringify(data.teamMembers)) }
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
    if (stats.successRate !== undefined) { updates.push('successRate = ?'); values.push(stats.successRate) }
    
    if (updates.length === 0) return projectDb.getById(id)
    
    updates.push('updatedAt = ?')
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
export const agentDb = {
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
        id, projectId, name, description, type, role, capabilities, systemPrompt,
        model, temperature, maxTokens, status, isActive, version, conversations,
        successRate, avgResponseTime, lastActiveAt, config, tags, createdAt, updatedAt, createdBy
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
        id, projectId, agentId, input, output, status,
        responseTime, tokenUsage, cost, metadata, runId, feedback, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
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
      data.runId || null,                                                                                   // runId
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
    const stmt = db.prepare('SELECT * FROM traces ORDER BY startTime DESC')
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
        id, project_id, conversation_id, name, start_time, end_time, duration, 
        status, metadata, tags, runId, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      id, 
      projectId, 
      data.conversationId || data.conversation_id || null, 
      data.name || data.operationName || 'operation',
      data.startTime || data.start_time || now, 
      data.endTime || data.end_time || null,
      data.duration || null, 
      data.status || 'running', 
      typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {}),
      typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || []),
      data.runId || null,
      data.createdAt || data.created_at || now
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
        model_name, model_parameters, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    const spanId = data.spanId || data.span_id || `span_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    
    const result = stmt.run(
      data.traceId || data.trace_id,                                                              // trace_id
      data.parentSpanId || data.parent_span_id || null,                                         // parent_span_id  
      spanId,                                                                                     // span_id
      data.spanName || data.name,                                                               // span_name
      data.spanType || data.type || 'function',                                                // span_type
      data.startTime || data.start_time || now,                                                // start_time
      data.endTime || data.end_time || null,                                                   // end_time
      data.duration || null,                                                                     // duration
      data.status || 'success',                                                                 // status
      data.error_message || null,                                                               // error_message
      typeof data.inputData === 'string' ? data.inputData : JSON.stringify(data.inputData || data.input || {}),     // input_data
      typeof data.outputData === 'string' ? data.outputData : JSON.stringify(data.outputData || data.output || {}), // output_data
      typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata || {}), // metadata
      typeof data.tags === 'string' ? data.tags : JSON.stringify(data.tags || []),            // tags
      typeof data.usage === 'string' ? data.usage : JSON.stringify(data.usage || data.tokenUsage || data.token_usage || {}), // usage
      data.model_name || data.modelName || null,                                               // model_name
      typeof data.model_parameters === 'string' ? data.model_parameters : JSON.stringify(data.model_parameters || data.modelParameters || {}), // model_parameters
      now,                                                                                       // created_at
      now                                                                                        // updated_at
    )
    
    return spansDb.getBySpanId(spanId)
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

// Initialize on module load
initDatabase()

// Export database instances
export { db, feedbackScoresDb, feedbackDefinitionsDb }
export default db