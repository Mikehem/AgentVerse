/**
 * Predefined Multi-Agent Scenarios for Agent Lens
 * Ready-to-use scenarios demonstrating different agent communication patterns
 */

import { AgentScenarioConfig } from './multi-agent-scenarios'

/**
 * Collaborative Document Processing Scenario
 * Multiple agents work together to process documents with different specializations
 */
export const collaborativeDocumentProcessing: AgentScenarioConfig = {
  scenarioId: 'collab-doc-processing',
  name: 'Collaborative Document Processing',
  description: 'Multiple specialized agents collaborate to analyze and process documents',
  agents: [
    {
      id: 'doc-coordinator',
      type: 'coordinator',
      name: 'Document Coordinator',
      role: 'Orchestrates document processing workflow',
      capabilities: ['workflow_management', 'task_distribution', 'result_aggregation'],
      resources: { cpu: '1', memory: '512Mi', storage: '1Gi' },
      deployment: {
        namespace: 'document-processing',
        hostname: 'coordinator-node',
        port: 8001
      },
      dependencies: [],
      maxConcurrentTasks: 10
    },
    {
      id: 'text-extractor',
      type: 'specialist',
      name: 'Text Extraction Agent',
      role: 'Extracts text content from various document formats',
      capabilities: ['pdf_extraction', 'ocr', 'text_parsing', 'format_detection'],
      resources: { cpu: '2', memory: '1Gi', storage: '2Gi' },
      deployment: {
        namespace: 'document-processing',
        hostname: 'extractor-node',
        port: 8002
      },
      dependencies: ['doc-coordinator'],
      maxConcurrentTasks: 5
    },
    {
      id: 'sentiment-analyzer',
      type: 'specialist',
      name: 'Sentiment Analysis Agent',
      role: 'Analyzes sentiment and emotional tone of text',
      capabilities: ['sentiment_analysis', 'emotion_detection', 'nlp'],
      resources: { cpu: '1', memory: '2Gi', storage: '1Gi' },
      deployment: {
        namespace: 'document-processing',
        hostname: 'sentiment-node',
        port: 8003
      },
      dependencies: ['text-extractor'],
      maxConcurrentTasks: 3
    },
    {
      id: 'entity-extractor',
      type: 'specialist',
      name: 'Entity Extraction Agent',
      role: 'Identifies and extracts named entities from text',
      capabilities: ['named_entity_recognition', 'entity_linking', 'knowledge_graphs'],
      resources: { cpu: '1.5', memory: '1.5Gi', storage: '1Gi' },
      deployment: {
        namespace: 'document-processing',
        hostname: 'entity-node',
        port: 8004
      },
      dependencies: ['text-extractor'],
      maxConcurrentTasks: 4
    },
    {
      id: 'quality-monitor',
      type: 'monitor',
      name: 'Quality Monitoring Agent',
      role: 'Monitors processing quality and validates results',
      capabilities: ['quality_assessment', 'validation', 'error_detection'],
      resources: { cpu: '0.5', memory: '512Mi', storage: '500Mi' },
      deployment: {
        namespace: 'document-processing',
        hostname: 'monitor-node',
        port: 8005
      },
      dependencies: ['sentiment-analyzer', 'entity-extractor'],
      maxConcurrentTasks: 2
    }
  ],
  communicationPatterns: [
    {
      id: 'coord-to-extractor',
      source: 'doc-coordinator',
      target: 'text-extractor',
      type: 'request-response',
      protocol: 'http',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 30000,
      retryPolicy: { maxRetries: 3, backoffStrategy: 'exponential', baseDelay: 1000, maxDelay: 5000 }
    },
    {
      id: 'extractor-to-sentiment',
      source: 'text-extractor',
      target: 'sentiment-analyzer',
      type: 'event-driven',
      protocol: 'message_queue',
      frequency: 'on-demand',
      priority: 'medium',
      timeout: 15000,
      retryPolicy: { maxRetries: 2, backoffStrategy: 'linear', baseDelay: 2000, maxDelay: 6000 }
    },
    {
      id: 'extractor-to-entity',
      source: 'text-extractor',
      target: 'entity-extractor',
      type: 'event-driven',
      protocol: 'message_queue',
      frequency: 'on-demand',
      priority: 'medium',
      timeout: 20000,
      retryPolicy: { maxRetries: 2, backoffStrategy: 'linear', baseDelay: 2000, maxDelay: 6000 }
    },
    {
      id: 'results-to-monitor',
      source: 'sentiment-analyzer',
      target: 'quality-monitor',
      type: 'event-driven',
      protocol: 'websocket',
      frequency: 'on-demand',
      priority: 'low',
      timeout: 10000
    },
    {
      id: 'entities-to-monitor',
      source: 'entity-extractor',
      target: 'quality-monitor',
      type: 'event-driven',
      protocol: 'websocket',
      frequency: 'on-demand',
      priority: 'low',
      timeout: 10000
    },
    {
      id: 'monitor-to-coord',
      source: 'quality-monitor',
      target: 'doc-coordinator',
      type: 'request-response',
      protocol: 'http',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 5000
    }
  ],
  environment: {
    containerOrchestration: 'kubernetes',
    networkTopology: 'tree',
    loadBalancing: true,
    serviceDiscovery: true,
    monitoring: true
  },
  constraints: {
    maxExecutionTime: 300000, // 5 minutes
    maxCost: 10.0,
    maxAgents: 10,
    resourceLimits: {
      cpu: '8',
      memory: '8Gi',
      bandwidth: '1Gbps'
    }
  }
}

/**
 * Distributed Data Processing Pipeline
 * Agents work in parallel to process large datasets
 */
export const distributedDataPipeline: AgentScenarioConfig = {
  scenarioId: 'distributed-data-pipeline',
  name: 'Distributed Data Processing Pipeline',
  description: 'Parallel data processing with multiple worker agents and centralized coordination',
  agents: [
    {
      id: 'pipeline-orchestrator',
      type: 'coordinator',
      name: 'Pipeline Orchestrator',
      role: 'Manages data pipeline execution and worker coordination',
      capabilities: ['job_scheduling', 'load_balancing', 'fault_tolerance', 'metrics_collection'],
      resources: { cpu: '2', memory: '1Gi', storage: '2Gi' },
      deployment: {
        namespace: 'data-pipeline',
        hostname: 'orchestrator-node',
        port: 9001
      },
      dependencies: [],
      maxConcurrentTasks: 50
    },
    {
      id: 'data-worker-1',
      type: 'worker',
      name: 'Data Worker 1',
      role: 'Processes data chunks in parallel',
      capabilities: ['data_transformation', 'filtering', 'aggregation', 'validation'],
      resources: { cpu: '4', memory: '2Gi', storage: '1Gi' },
      deployment: {
        containerId: 'worker-container-1',
        namespace: 'data-pipeline',
        hostname: 'worker-node-1',
        port: 9002
      },
      dependencies: ['pipeline-orchestrator'],
      maxConcurrentTasks: 10
    },
    {
      id: 'data-worker-2',
      type: 'worker',
      name: 'Data Worker 2',
      role: 'Processes data chunks in parallel',
      capabilities: ['data_transformation', 'filtering', 'aggregation', 'validation'],
      resources: { cpu: '4', memory: '2Gi', storage: '1Gi' },
      deployment: {
        containerId: 'worker-container-2',
        namespace: 'data-pipeline',
        hostname: 'worker-node-2',
        port: 9003
      },
      dependencies: ['pipeline-orchestrator'],
      maxConcurrentTasks: 10
    },
    {
      id: 'data-worker-3',
      type: 'worker',
      name: 'Data Worker 3',
      role: 'Processes data chunks in parallel',
      capabilities: ['data_transformation', 'filtering', 'aggregation', 'validation'],
      resources: { cpu: '4', memory: '2Gi', storage: '1Gi' },
      deployment: {
        containerId: 'worker-container-3',
        namespace: 'data-pipeline',
        hostname: 'worker-node-3',
        port: 9004
      },
      dependencies: ['pipeline-orchestrator'],
      maxConcurrentTasks: 10
    },
    {
      id: 'result-aggregator',
      type: 'specialist',
      name: 'Result Aggregator',
      role: 'Combines and finalizes processed data from workers',
      capabilities: ['result_merging', 'deduplication', 'sorting', 'output_formatting'],
      resources: { cpu: '2', memory: '4Gi', storage: '5Gi' },
      deployment: {
        namespace: 'data-pipeline',
        hostname: 'aggregator-node',
        port: 9005
      },
      dependencies: ['data-worker-1', 'data-worker-2', 'data-worker-3'],
      maxConcurrentTasks: 5
    }
  ],
  communicationPatterns: [
    {
      id: 'orchestrator-broadcast',
      source: 'pipeline-orchestrator',
      target: 'data-worker-1',
      type: 'broadcast',
      protocol: 'grpc',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 5000
    },
    {
      id: 'orchestrator-to-worker2',
      source: 'pipeline-orchestrator',
      target: 'data-worker-2',
      type: 'request-response',
      protocol: 'grpc',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 5000
    },
    {
      id: 'orchestrator-to-worker3',
      source: 'pipeline-orchestrator',
      target: 'data-worker-3',
      type: 'request-response',
      protocol: 'grpc',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 5000
    },
    {
      id: 'worker1-to-aggregator',
      source: 'data-worker-1',
      target: 'result-aggregator',
      type: 'streaming',
      protocol: 'grpc',
      frequency: 'continuous',
      priority: 'medium',
      timeout: 30000
    },
    {
      id: 'worker2-to-aggregator',
      source: 'data-worker-2',
      target: 'result-aggregator',
      type: 'streaming',
      protocol: 'grpc',
      frequency: 'continuous',
      priority: 'medium',
      timeout: 30000
    },
    {
      id: 'worker3-to-aggregator',
      source: 'data-worker-3',
      target: 'result-aggregator',
      type: 'streaming',
      protocol: 'grpc',
      frequency: 'continuous',
      priority: 'medium',
      timeout: 30000
    },
    {
      id: 'aggregator-status',
      source: 'result-aggregator',
      target: 'pipeline-orchestrator',
      type: 'event-driven',
      protocol: 'websocket',
      frequency: 'periodic',
      priority: 'low',
      timeout: 10000
    }
  ],
  environment: {
    containerOrchestration: 'kubernetes',
    networkTopology: 'star',
    loadBalancing: true,
    serviceDiscovery: true,
    monitoring: true
  },
  constraints: {
    maxExecutionTime: 600000, // 10 minutes
    maxCost: 25.0,
    maxAgents: 20,
    resourceLimits: {
      cpu: '20',
      memory: '20Gi',
      bandwidth: '10Gbps'
    }
  }
}

/**
 * Real-time Trading System
 * High-frequency agent communication for financial trading
 */
export const realtimeTradingSystem: AgentScenarioConfig = {
  scenarioId: 'realtime-trading',
  name: 'Real-time Trading System',
  description: 'High-frequency trading system with multiple specialized trading agents',
  agents: [
    {
      id: 'market-data-feed',
      type: 'specialist',
      name: 'Market Data Feed Agent',
      role: 'Streams real-time market data to trading agents',
      capabilities: ['market_data_ingestion', 'data_normalization', 'real_time_streaming'],
      resources: { cpu: '2', memory: '1Gi', storage: '500Mi' },
      deployment: {
        namespace: 'trading-system',
        hostname: 'market-data-node',
        port: 7001
      },
      dependencies: [],
      maxConcurrentTasks: 100
    },
    {
      id: 'risk-manager',
      type: 'monitor',
      name: 'Risk Management Agent',
      role: 'Monitors and manages trading risks in real-time',
      capabilities: ['risk_assessment', 'position_monitoring', 'limit_enforcement'],
      resources: { cpu: '1', memory: '512Mi', storage: '250Mi' },
      deployment: {
        namespace: 'trading-system',
        hostname: 'risk-node',
        port: 7002
      },
      dependencies: ['market-data-feed'],
      maxConcurrentTasks: 50
    },
    {
      id: 'momentum-trader',
      type: 'specialist',
      name: 'Momentum Trading Agent',
      role: 'Executes momentum-based trading strategies',
      capabilities: ['momentum_analysis', 'trend_detection', 'order_execution'],
      resources: { cpu: '3', memory: '1.5Gi', storage: '1Gi' },
      deployment: {
        containerId: 'momentum-trader-container',
        namespace: 'trading-system',
        hostname: 'momentum-node',
        port: 7003
      },
      dependencies: ['market-data-feed', 'risk-manager'],
      maxConcurrentTasks: 20
    },
    {
      id: 'arbitrage-trader',
      type: 'specialist',
      name: 'Arbitrage Trading Agent',
      role: 'Identifies and exploits arbitrage opportunities',
      capabilities: ['arbitrage_detection', 'multi_exchange_trading', 'latency_optimization'],
      resources: { cpu: '3', memory: '1.5Gi', storage: '1Gi' },
      deployment: {
        containerId: 'arbitrage-trader-container',
        namespace: 'trading-system',
        hostname: 'arbitrage-node',
        port: 7004
      },
      dependencies: ['market-data-feed', 'risk-manager'],
      maxConcurrentTasks: 15
    },
    {
      id: 'execution-manager',
      type: 'coordinator',
      name: 'Execution Management Agent',
      role: 'Coordinates trade execution and order management',
      capabilities: ['order_routing', 'execution_optimization', 'settlement'],
      resources: { cpu: '2', memory: '1Gi', storage: '2Gi' },
      deployment: {
        namespace: 'trading-system',
        hostname: 'execution-node',
        port: 7005
      },
      dependencies: ['momentum-trader', 'arbitrage-trader'],
      maxConcurrentTasks: 100
    }
  ],
  communicationPatterns: [
    {
      id: 'market-data-stream',
      source: 'market-data-feed',
      target: 'momentum-trader',
      type: 'streaming',
      protocol: 'websocket',
      frequency: 'continuous',
      priority: 'critical',
      timeout: 1000
    },
    {
      id: 'market-data-to-arbitrage',
      source: 'market-data-feed',
      target: 'arbitrage-trader',
      type: 'streaming',
      protocol: 'websocket',
      frequency: 'continuous',
      priority: 'critical',
      timeout: 1000
    },
    {
      id: 'market-data-to-risk',
      source: 'market-data-feed',
      target: 'risk-manager',
      type: 'streaming',
      protocol: 'websocket',
      frequency: 'continuous',
      priority: 'critical',
      timeout: 1000
    },
    {
      id: 'momentum-risk-check',
      source: 'momentum-trader',
      target: 'risk-manager',
      type: 'request-response',
      protocol: 'http',
      frequency: 'on-demand',
      priority: 'critical',
      timeout: 100,
      retryPolicy: { maxRetries: 1, backoffStrategy: 'linear', baseDelay: 50, maxDelay: 100 }
    },
    {
      id: 'arbitrage-risk-check',
      source: 'arbitrage-trader',
      target: 'risk-manager',
      type: 'request-response',
      protocol: 'http',
      frequency: 'on-demand',
      priority: 'critical',
      timeout: 100,
      retryPolicy: { maxRetries: 1, backoffStrategy: 'linear', baseDelay: 50, maxDelay: 100 }
    },
    {
      id: 'momentum-execution',
      source: 'momentum-trader',
      target: 'execution-manager',
      type: 'event-driven',
      protocol: 'grpc',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 500
    },
    {
      id: 'arbitrage-execution',
      source: 'arbitrage-trader',
      target: 'execution-manager',
      type: 'event-driven',
      protocol: 'grpc',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 500
    }
  ],
  environment: {
    containerOrchestration: 'kubernetes',
    networkTopology: 'mesh',
    loadBalancing: false, // Low latency requirement
    serviceDiscovery: true,
    monitoring: true
  },
  constraints: {
    maxExecutionTime: 86400000, // 24 hours
    maxCost: 100.0,
    maxAgents: 15,
    resourceLimits: {
      cpu: '15',
      memory: '10Gi',
      bandwidth: '100Gbps'
    }
  }
}

/**
 * IoT Device Management Network
 * Distributed agent network for managing IoT devices
 */
export const iotDeviceManagement: AgentScenarioConfig = {
  scenarioId: 'iot-device-management',
  name: 'IoT Device Management Network',
  description: 'Distributed network of agents managing IoT devices across multiple locations',
  agents: [
    {
      id: 'central-controller',
      type: 'coordinator',
      name: 'Central Controller Agent',
      role: 'Central coordination and policy management',
      capabilities: ['device_registry', 'policy_enforcement', 'global_orchestration'],
      resources: { cpu: '1', memory: '1Gi', storage: '5Gi' },
      deployment: {
        namespace: 'iot-management',
        hostname: 'central-controller',
        port: 6001
      },
      dependencies: [],
      maxConcurrentTasks: 1000
    },
    {
      id: 'edge-gateway-north',
      type: 'coordinator',
      name: 'North Edge Gateway',
      role: 'Manages devices in northern region',
      capabilities: ['device_monitoring', 'local_processing', 'data_aggregation'],
      resources: { cpu: '0.5', memory: '512Mi', storage: '1Gi' },
      deployment: {
        containerId: 'edge-gateway-north-container',
        namespace: 'iot-edge-north',
        hostname: 'edge-north',
        port: 6002
      },
      dependencies: ['central-controller'],
      maxConcurrentTasks: 100
    },
    {
      id: 'edge-gateway-south',
      type: 'coordinator',
      name: 'South Edge Gateway',
      role: 'Manages devices in southern region',
      capabilities: ['device_monitoring', 'local_processing', 'data_aggregation'],
      resources: { cpu: '0.5', memory: '512Mi', storage: '1Gi' },
      deployment: {
        containerId: 'edge-gateway-south-container',
        namespace: 'iot-edge-south',
        hostname: 'edge-south',
        port: 6003
      },
      dependencies: ['central-controller'],
      maxConcurrentTasks: 100
    },
    {
      id: 'device-health-monitor',
      type: 'monitor',
      name: 'Device Health Monitor',
      role: 'Monitors device health and performance',
      capabilities: ['health_monitoring', 'anomaly_detection', 'predictive_maintenance'],
      resources: { cpu: '1', memory: '1Gi', storage: '2Gi' },
      deployment: {
        namespace: 'iot-management',
        hostname: 'health-monitor',
        port: 6004
      },
      dependencies: ['edge-gateway-north', 'edge-gateway-south'],
      maxConcurrentTasks: 500
    },
    {
      id: 'security-agent',
      type: 'monitor',
      name: 'Security Monitoring Agent',
      role: 'Monitors security across the IoT network',
      capabilities: ['security_monitoring', 'intrusion_detection', 'compliance_checking'],
      resources: { cpu: '1', memory: '512Mi', storage: '1Gi' },
      deployment: {
        namespace: 'iot-security',
        hostname: 'security-monitor',
        port: 6005
      },
      dependencies: ['central-controller'],
      maxConcurrentTasks: 200
    }
  ],
  communicationPatterns: [
    {
      id: 'central-to-north-edge',
      source: 'central-controller',
      target: 'edge-gateway-north',
      type: 'request-response',
      protocol: 'http',
      frequency: 'periodic',
      priority: 'medium',
      timeout: 5000
    },
    {
      id: 'central-to-south-edge',
      source: 'central-controller',
      target: 'edge-gateway-south',
      type: 'request-response',
      protocol: 'http',
      frequency: 'periodic',
      priority: 'medium',
      timeout: 5000
    },
    {
      id: 'north-edge-telemetry',
      source: 'edge-gateway-north',
      target: 'device-health-monitor',
      type: 'streaming',
      protocol: 'message_queue',
      frequency: 'continuous',
      priority: 'low',
      timeout: 30000
    },
    {
      id: 'south-edge-telemetry',
      source: 'edge-gateway-south',
      target: 'device-health-monitor',
      type: 'streaming',
      protocol: 'message_queue',
      frequency: 'continuous',
      priority: 'low',
      timeout: 30000
    },
    {
      id: 'health-alerts',
      source: 'device-health-monitor',
      target: 'central-controller',
      type: 'event-driven',
      protocol: 'websocket',
      frequency: 'on-demand',
      priority: 'high',
      timeout: 3000
    },
    {
      id: 'security-monitoring',
      source: 'security-agent',
      target: 'central-controller',
      type: 'event-driven',
      protocol: 'grpc',
      frequency: 'on-demand',
      priority: 'critical',
      timeout: 2000
    },
    {
      id: 'security-to-edges',
      source: 'security-agent',
      target: 'edge-gateway-north',
      type: 'broadcast',
      protocol: 'message_queue',
      frequency: 'periodic',
      priority: 'medium',
      timeout: 10000
    }
  ],
  environment: {
    containerOrchestration: 'docker',
    networkTopology: 'tree',
    loadBalancing: true,
    serviceDiscovery: true,
    monitoring: true
  },
  constraints: {
    maxExecutionTime: 0, // Continuous operation
    maxCost: 50.0,
    maxAgents: 100,
    resourceLimits: {
      cpu: '5',
      memory: '5Gi',
      bandwidth: '1Gbps'
    }
  }
}

// Export all predefined scenarios
export const predefinedScenarios = {
  collaborativeDocumentProcessing,
  distributedDataPipeline,
  realtimeTradingSystem,
  iotDeviceManagement
}

export const scenarioCategories = {
  'Document Processing': [collaborativeDocumentProcessing],
  'Data Pipeline': [distributedDataPipeline],
  'Financial Trading': [realtimeTradingSystem],
  'IoT Management': [iotDeviceManagement]
}