import { PythonMetricService } from '../../src/services/PythonMetricService';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  PythonMetricConfig,
  PythonMetricRequest,
  PythonMetricResponse,
  SandboxConfig,
  SecurityValidationResult,
  ExecutionEnvironment,
  PythonDependency,
  ResourceLimits,
} from '../../src/types/automationRules';

// Mock child_process
jest.mock('child_process');
const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

// Mock fs/promises
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('PythonMetricService', () => {
  let pythonMetricService: PythonMetricService;
  let mockChildProcess: any;

  beforeEach(() => {
    jest.clearAllMocks();
    pythonMetricService = new PythonMetricService();

    // Mock child process behavior
    mockChildProcess = {
      stdout: { on: jest.fn(), pipe: jest.fn() },
      stderr: { on: jest.fn(), pipe: jest.fn() },
      stdin: { write: jest.fn(), end: jest.fn() },
      on: jest.fn(),
      kill: jest.fn(),
      pid: 12345,
    };
    mockSpawn.mockReturnValue(mockChildProcess as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Script Execution', () => {
    test('should execute simple Python metric successfully', async () => {
      const config: PythonMetricConfig = {
        script: `
def evaluate(data):
    score = data.get('score', 0)
    return {
        'result': score * 0.8,
        'confidence': 0.95,
        'details': f'Processed score: {score}'
    }
        `,
        timeout: 30,
        dependencies: [],
        allowedImports: ['json', 'math'],
        resourceLimits: {
          maxMemoryMB: 100,
          maxCpuTimeSeconds: 10,
          maxExecutionTimeSeconds: 30,
        },
      };

      const request: PythonMetricRequest = {
        config,
        input: {
          data: { score: 0.85, text: 'Sample input' },
          context: { traceId: 'trace-123' },
        },
        metadata: {
          executionId: 'exec-123',
          workspaceId: 'workspace-123',
        },
      };

      // Mock successful execution
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 100); // Exit code 0
        }
      });

      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from(JSON.stringify({
              result: 0.68,
              confidence: 0.95,
              details: 'Processed score: 0.85',
            })));
          }, 50);
        }
      });

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(0.68);
      expect(result.result.confidence).toBe(0.95);
      expect(result.result.details).toContain('Processed score: 0.85');
      expect(result.metadata.executionTimeMs).toBeLessThan(200);
      expect(result.metadata.exitCode).toBe(0);
    });

    test('should handle complex data processing', async () => {
      const config: PythonMetricConfig = {
        script: `
import json
import math

def evaluate(data):
    scores = data.get('scores', [])
    if not scores:
        return {'result': 0, 'error': 'No scores provided'}
    
    # Calculate statistical metrics
    mean = sum(scores) / len(scores)
    variance = sum((x - mean) ** 2 for x in scores) / len(scores)
    std_dev = math.sqrt(variance)
    
    # Confidence based on consistency
    confidence = max(0, 1 - (std_dev / mean)) if mean > 0 else 0
    
    return {
        'result': mean,
        'confidence': confidence,
        'statistics': {
            'mean': mean,
            'std_dev': std_dev,
            'count': len(scores),
            'min': min(scores),
            'max': max(scores)
        }
    }
        `,
        timeout: 30,
        dependencies: [],
        allowedImports: ['json', 'math', 'statistics'],
      };

      const request: PythonMetricRequest = {
        config,
        input: {
          data: {
            scores: [0.8, 0.85, 0.82, 0.88, 0.79, 0.86, 0.84],
            metadata: { evaluationType: 'quality_assessment' },
          },
        },
      };

      // Mock complex calculation result
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 150);
        }
      });

      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from(JSON.stringify({
              result: 0.835,
              confidence: 0.92,
              statistics: {
                mean: 0.835,
                std_dev: 0.032,
                count: 7,
                min: 0.79,
                max: 0.88,
              },
            })));
          }, 100);
        }
      });

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(true);
      expect(result.result.result).toBeCloseTo(0.835, 2);
      expect(result.result.statistics.count).toBe(7);
      expect(result.result.statistics.min).toBe(0.79);
      expect(result.result.statistics.max).toBe(0.88);
    });

    test('should enforce execution timeout', async () => {
      const config: PythonMetricConfig = {
        script: `
import time
def evaluate(data):
    time.sleep(5)  # Sleep longer than timeout
    return {'result': 1.0}
        `,
        timeout: 2, // 2 second timeout
      };

      const request: PythonMetricRequest = {
        config,
        input: { data: {} },
      };

      // Mock timeout scenario
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          // Never call callback to simulate hanging process
        }
      });

      mockChildProcess.kill.mockReturnValue(true);

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
      expect(result.metadata.timedOut).toBe(true);
      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGKILL');
    });

    test('should handle Python runtime errors', async () => {
      const config: PythonMetricConfig = {
        script: `
def evaluate(data):
    # Intentional error
    return data['nonexistent_key'] / 0
        `,
        timeout: 30,
      };

      const request: PythonMetricRequest = {
        config,
        input: { data: { score: 0.8 } },
      };

      // Mock Python error
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 100); // Exit code 1 (error)
        }
      });

      mockChildProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from(`
Traceback (most recent call last):
  File "<string>", line 3, in evaluate
ZeroDivisionError: division by zero
            `));
          }, 50);
        }
      });

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('ZeroDivisionError');
      expect(result.metadata.exitCode).toBe(1);
      expect(result.metadata.stderr).toContain('division by zero');
    });
  });

  describe('Security and Sandboxing', () => {
    test('should validate script for security violations', async () => {
      const dangerousScripts = [
        'import os\nos.system("rm -rf /")', // System command execution
        'import subprocess\nsubprocess.call(["curl", "evil.com"])', // Network access
        'open("/etc/passwd", "r").read()', // File system access
        'import socket\nsocket.create_connection(("evil.com", 80))', // Network socket
        'eval("__import__(\'os\').system(\'ls\')")', // Dynamic code execution
        '__import__("os").system("whoami")', // Import injection
        'exec("import os; os.system(\'ls\')")', // Code execution
      ];

      for (const script of dangerousScripts) {
        const validation = await pythonMetricService.validateScript(script);
        
        expect(validation.isSecure).toBe(false);
        expect(validation.violations.length).toBeGreaterThan(0);
        expect(validation.severity).toBeGreaterThanOrEqual(5); // Medium to high severity
      }
    });

    test('should allow safe script patterns', async () => {
      const safeScripts = [
        `
def evaluate(data):
    import json
    import math
    score = data.get('score', 0)
    return {'result': math.sqrt(score)}
        `,
        `
def evaluate(data):
    import statistics
    values = data.get('values', [])
    return {
        'mean': statistics.mean(values) if values else 0,
        'stdev': statistics.stdev(values) if len(values) > 1 else 0
    }
        `,
        `
def evaluate(data):
    # Simple computation
    x = data.get('x', 0)
    y = data.get('y', 0)
    return {'result': x + y, 'product': x * y}
        `,
      ];

      for (const script of safeScripts) {
        const validation = await pythonMetricService.validateScript(script);
        
        expect(validation.isSecure).toBe(true);
        expect(validation.violations).toHaveLength(0);
        expect(validation.severity).toBeLessThan(3);
      }
    });

    test('should enforce import restrictions', async () => {
      const config: PythonMetricConfig = {
        script: `
import requests  # Restricted import
import json     # Allowed import

def evaluate(data):
    return {'result': data.get('score', 0)}
        `,
        allowedImports: ['json', 'math', 'statistics'],
        timeout: 30,
      };

      const validation = await pythonMetricService.validateScript(config.script, {
        allowedImports: config.allowedImports,
        restrictedImports: ['requests', 'urllib', 'socket', 'subprocess', 'os'],
      });

      expect(validation.isSecure).toBe(false);
      expect(validation.violations.some(v => v.includes('requests'))).toBe(true);
    });

    test('should create isolated execution environment', async () => {
      const config: PythonMetricConfig = {
        script: 'def evaluate(data): return {"result": 1.0}',
        timeout: 30,
        resourceLimits: {
          maxMemoryMB: 50,
          maxCpuTimeSeconds: 5,
          maxExecutionTimeSeconds: 10,
        },
        sandboxConfig: {
          isolateFileSystem: true,
          isolateNetwork: true,
          restrictSystemCalls: true,
          useContainerization: true,
        },
      };

      mockFs.writeFile.mockResolvedValue();
      mockFs.mkdir.mockResolvedValue('');
      mockFs.readFile.mockResolvedValue('{"result": 1.0}');

      // Mock sandbox environment creation
      const result = await pythonMetricService.createSandboxEnvironment(config);

      expect(result.success).toBe(true);
      expect(result.environment.sandboxPath).toBeDefined();
      expect(result.environment.restrictions.fileSystem).toBe(true);
      expect(result.environment.restrictions.network).toBe(true);
      expect(result.environment.resourceLimits).toEqual(config.resourceLimits);
    });

    test('should monitor resource usage during execution', async () => {
      const config: PythonMetricConfig = {
        script: `
def evaluate(data):
    # Simulate memory and CPU intensive task
    big_list = [i for i in range(100000)]
    result = sum(big_list)
    return {'result': result, 'size': len(big_list)}
        `,
        timeout: 30,
        resourceLimits: {
          maxMemoryMB: 200,
          maxCpuTimeSeconds: 5,
        },
        monitorResources: true,
      };

      const request: PythonMetricRequest = {
        config,
        input: { data: {} },
      };

      // Mock process monitoring
      let monitoringCallback: Function;
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 200);
        } else if (event === 'spawn') {
          monitoringCallback = callback;
        }
      });

      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from(JSON.stringify({
              result: 4999950000,
              size: 100000,
            })));
          }, 150);
        }
      });

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(true);
      expect(result.metadata.resourceUsage).toBeDefined();
      expect(result.metadata.resourceUsage.peakMemoryMB).toBeGreaterThan(0);
      expect(result.metadata.resourceUsage.cpuTimeSeconds).toBeGreaterThan(0);
    });

    test('should terminate execution if resource limits are exceeded', async () => {
      const config: PythonMetricConfig = {
        script: `
def evaluate(data):
    # Memory bomb
    big_lists = []
    for i in range(1000):
        big_lists.append([0] * 1000000)  # 1M integers per list
    return {'result': len(big_lists)}
        `,
        timeout: 30,
        resourceLimits: {
          maxMemoryMB: 50, // Very low limit
          maxCpuTimeSeconds: 5,
        },
      };

      const request: PythonMetricRequest = {
        config,
        input: { data: {} },
      };

      // Mock resource limit exceeded
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(137), 100); // SIGKILL exit code
        }
      });

      mockChildProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from('MemoryError: memory limit exceeded'));
          }, 50);
        }
      });

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('memory limit exceeded');
      expect(result.metadata.resourceLimitExceeded).toBe(true);
    });
  });

  describe('Dependency Management', () => {
    test('should install and manage Python dependencies', async () => {
      const config: PythonMetricConfig = {
        script: `
import numpy as np
import pandas as pd

def evaluate(data):
    arr = np.array(data.get('values', []))
    df = pd.DataFrame({'values': arr})
    return {
        'mean': float(arr.mean()),
        'std': float(arr.std()),
        'shape': arr.shape[0]
    }
        `,
        dependencies: [
          { name: 'numpy', version: '1.21.0', source: 'pypi' },
          { name: 'pandas', version: '1.3.0', source: 'pypi' },
        ],
        timeout: 60,
      };

      // Mock dependency installation
      const installResult = await pythonMetricService.installDependencies(
        config.dependencies,
        '/tmp/sandbox-123'
      );

      expect(installResult.success).toBe(true);
      expect(installResult.installed).toContain('numpy');
      expect(installResult.installed).toContain('pandas');
    });

    test('should validate dependency security', async () => {
      const dependencies: PythonDependency[] = [
        { name: 'numpy', version: '1.21.0', source: 'pypi' }, // Safe
        { name: 'requests', version: '2.25.1', source: 'pypi' }, // Potentially unsafe
        { name: 'suspicious-package', version: '1.0.0', source: 'pypi' }, // Unsafe
      ];

      const validation = await pythonMetricService.validateDependencies(dependencies);

      expect(validation.isSecure).toBe(false);
      expect(validation.blockedPackages).toContain('requests');
      expect(validation.blockedPackages).toContain('suspicious-package');
      expect(validation.allowedPackages).toContain('numpy');
    });

    test('should handle dependency installation failures', async () => {
      const config: PythonMetricConfig = {
        script: 'def evaluate(data): return {"result": 1}',
        dependencies: [
          { name: 'nonexistent-package', version: '1.0.0', source: 'pypi' },
        ],
        timeout: 30,
      };

      // Mock pip install failure
      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(1), 100); // pip failed
        }
      });

      mockChildProcess.stderr.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from('ERROR: Could not find a version that satisfies the requirement nonexistent-package'));
          }, 50);
        }
      });

      const installResult = await pythonMetricService.installDependencies(
        config.dependencies,
        '/tmp/sandbox-test'
      );

      expect(installResult.success).toBe(false);
      expect(installResult.error).toContain('Could not find a version');
      expect(installResult.failedPackages).toContain('nonexistent-package');
    });
  });

  describe('Advanced Features', () => {
    test('should support streaming execution for large datasets', async () => {
      const config: PythonMetricConfig = {
        script: `
def evaluate_batch(data_stream):
    results = []
    for item in data_stream:
        score = item.get('score', 0)
        results.append({'processed_score': score * 1.1})
    return {'batch_results': results, 'count': len(results)}
        `,
        timeout: 60,
        streamingMode: true,
        batchSize: 100,
      };

      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        score: Math.random(),
        id: i,
      }));

      const request: PythonMetricRequest = {
        config,
        input: { data: { items: largeDataset } },
        options: { streaming: true },
      };

      // Mock streaming execution
      let dataChunkCount = 0;
      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          const interval = setInterval(() => {
            if (dataChunkCount < 10) {
              callback(Buffer.from(JSON.stringify({
                chunk: dataChunkCount,
                processed: 100,
                progress: (dataChunkCount + 1) * 10,
              }) + '\n'));
              dataChunkCount++;
            } else {
              clearInterval(interval);
              callback(Buffer.from(JSON.stringify({
                batch_results: [],
                count: 1000,
                final: true,
              })));
            }
          }, 50);
        }
      });

      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 600);
        }
      });

      const result = await pythonMetricService.executeStreamingMetric(request);

      expect(result.success).toBe(true);
      expect(result.streamResults).toBeDefined();
      expect(result.streamResults.chunks).toHaveLength(10);
      expect(result.result.count).toBe(1000);
    });

    test('should provide execution profiling and debugging info', async () => {
      const config: PythonMetricConfig = {
        script: `
import time

def evaluate(data):
    # Simulate various operations with timing
    time.sleep(0.1)  # Simulate I/O
    
    # CPU intensive operation
    result = sum(i ** 2 for i in range(1000))
    
    time.sleep(0.05)  # More I/O
    
    return {
        'result': result,
        'computed_squares': 1000,
    }
        `,
        timeout: 30,
        enableProfiling: true,
        debugMode: true,
      };

      const request: PythonMetricRequest = {
        config,
        input: { data: {} },
      };

      // Mock profiling output
      mockChildProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.from(JSON.stringify({
              result: 332833500,
              computed_squares: 1000,
              __profiling__: {
                total_time: 0.162,
                function_calls: 1001,
                memory_peak: 15.2,
                call_stack: [
                  { function: 'evaluate', time: 0.162, calls: 1 },
                  { function: '<listcomp>', time: 0.012, calls: 1 },
                ],
              },
            })));
          }, 200);
        }
      });

      mockChildProcess.on.mockImplementation((event: string, callback: Function) => {
        if (event === 'close') {
          setTimeout(() => callback(0), 250);
        }
      });

      const result = await pythonMetricService.executeMetric(request);

      expect(result.success).toBe(true);
      expect(result.result.result).toBe(332833500);
      expect(result.metadata.profiling).toBeDefined();
      expect(result.metadata.profiling.totalTime).toBeCloseTo(0.162, 2);
      expect(result.metadata.profiling.functionCalls).toBe(1001);
      expect(result.metadata.profiling.memoryPeak).toBe(15.2);
    });

    test('should handle concurrent executions with resource pooling', async () => {
      const config: PythonMetricConfig = {
        script: 'def evaluate(data): return {"result": data.get("value", 0) * 2}',
        timeout: 10,
        resourceLimits: {
          maxMemoryMB: 50,
          maxCpuTimeSeconds: 2,
        },
      };

      const requests = Array.from({ length: 5 }, (_, i) => ({
        config,
        input: { data: { value: i + 1 } },
        metadata: { executionId: `exec-${i}` },
      }));

      // Mock successful concurrent executions
      let executionCount = 0;
      mockSpawn.mockImplementation(() => {
        const currentCount = ++executionCount;
        const mockProcess = {
          ...mockChildProcess,
          pid: 10000 + currentCount,
        };

        mockProcess.on.mockImplementation((event: string, callback: Function) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 100 + Math.random() * 50);
          }
        });

        mockProcess.stdout.on.mockImplementation((event: string, callback: Function) => {
          if (event === 'data') {
            setTimeout(() => {
              callback(Buffer.from(JSON.stringify({
                result: currentCount * 2,
                execution_id: currentCount,
              })));
            }, 50 + Math.random() * 25);
          }
        });

        return mockProcess as any;
      });

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(req => pythonMetricService.executeMetric(req))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(5);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(300); // Should run concurrently, not sequentially
      expect(mockSpawn).toHaveBeenCalledTimes(5);

      // Verify results are correct
      results.forEach((result, index) => {
        expect(result.result.result).toBe((index + 1) * 2);
      });
    });
  });
});