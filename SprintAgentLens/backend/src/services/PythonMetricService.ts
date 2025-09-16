/**
 * Python Metric Service for automation rule evaluations
 * Provides secure Python script execution for custom metrics with sandboxing
 */

import { spawn, exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import type {
  AuthenticatedUser,
  PythonMetricConfig,
  EvaluatorResult,
  RuleExecution
} from '../types/automationRules';

export interface PythonMetricRequest {
  config: PythonMetricConfig;
  inputData: any;
  context: {
    ruleId: string;
    executionId: string;
    workspaceId: string;
  };
  user: AuthenticatedUser;
}

export interface PythonMetricResponse {
  value: any;
  output: string;
  error?: string;
  metadata: {
    exitCode: number;
    executionTime: number;
    memoryUsage: number;
    pythonVersion: string;
    scriptPath: string;
  };
}

export class PythonMetricService {
  private readonly scriptsDir: string;
  private readonly sandboxDir: string;
  private readonly maxExecutionTime: number = 30000; // 30 seconds
  private readonly maxMemoryMB: number = 512; // 512 MB
  
  constructor() {
    this.scriptsDir = path.join(process.cwd(), 'python_scripts');
    this.sandboxDir = path.join(process.cwd(), 'python_sandbox');
    this.ensureDirectories();
  }

  async evaluateWithPython(request: PythonMetricRequest): Promise<EvaluatorResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting Python metric evaluation', {
        ruleId: request.context.ruleId,
        executionId: request.context.executionId,
        scriptPath: request.config.scriptPath,
        functionName: request.config.functionName,
        sandboxed: request.config.sandboxed,
      });

      // Validate and prepare the script
      await this.validateScript(request.config);

      // Create sandbox environment if needed
      const workingDir = request.config.sandboxed 
        ? await this.createSandboxEnvironment(request)
        : request.config.workingDirectory || process.cwd();

      // Prepare input data
      const inputFile = await this.createInputFile(request.inputData, request.config, workingDir);

      // Execute Python script
      const response = await this.executePythonScript(request, workingDir, inputFile);

      // Clean up
      if (request.config.sandboxed) {
        await this.cleanupSandboxEnvironment(workingDir);
      }
      await this.cleanupInputFile(inputFile);

      const duration = Date.now() - startTime;

      return {
        evaluatorId: 'python_metric',
        evaluatorName: `Python Metric (${request.config.functionName})`,
        status: response.error ? 'failed' : 'completed',
        value: response.value,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        metadata: {
          pythonResponse: response,
          scriptPath: request.config.scriptPath,
          functionName: request.config.functionName,
          sandboxed: request.config.sandboxed,
          memoryUsage: response.metadata.memoryUsage,
        },
        ...(response.error && { error: response.error }),
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('Python metric evaluation failed', {
        error: error.message,
        stack: error.stack,
        ruleId: request.context.ruleId,
        executionId: request.context.executionId,
        duration,
      });

      return {
        evaluatorId: 'python_metric',
        evaluatorName: `Python Metric (${request.config.functionName})`,
        status: 'failed',
        value: null,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        error: error.message,
        warnings: ['Python script execution failed'],
      };
    }
  }

  private async validateScript(config: PythonMetricConfig): Promise<void> {
    // Check if script file exists
    const scriptPath = path.resolve(this.scriptsDir, config.scriptPath);
    
    try {
      await fs.access(scriptPath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Python script not found or not readable: ${config.scriptPath}`);
    }

    // Read and validate script content
    const scriptContent = await fs.readFile(scriptPath, 'utf-8');
    
    // Security checks
    if (config.restrictedImports) {
      for (const restrictedImport of config.restrictedImports) {
        if (scriptContent.includes(`import ${restrictedImport}`) || 
            scriptContent.includes(`from ${restrictedImport}`)) {
          throw new Error(`Script contains restricted import: ${restrictedImport}`);
        }
      }
    }

    // Check for dangerous operations if sandboxed
    if (config.sandboxed) {
      const dangerousPatterns = [
        /import\s+os/,
        /import\s+sys/,
        /import\s+subprocess/,
        /exec\s*\(/,
        /eval\s*\(/,
        /__import__\s*\(/,
        /open\s*\(/,
      ];

      for (const pattern of dangerousPatterns) {
        if (pattern.test(scriptContent)) {
          logger.warn('Potentially dangerous operation detected in sandboxed script', {
            pattern: pattern.toString(),
            scriptPath: config.scriptPath,
          });
        }
      }
    }

    // Validate function exists
    if (!scriptContent.includes(`def ${config.functionName}(`)) {
      throw new Error(`Function '${config.functionName}' not found in script`);
    }
  }

  private async createSandboxEnvironment(request: PythonMetricRequest): Promise<string> {
    const sandboxId = crypto.randomUUID();
    const sandboxPath = path.join(this.sandboxDir, sandboxId);
    
    // Create sandbox directory
    await fs.mkdir(sandboxPath, { recursive: true });
    
    // Copy script to sandbox
    const originalScript = path.resolve(this.scriptsDir, request.config.scriptPath);
    const sandboxScript = path.join(sandboxPath, 'script.py');
    await fs.copyFile(originalScript, sandboxScript);
    
    // Create requirements.txt if needed
    if (request.config.requirements && request.config.requirements.length > 0) {
      const requirementsContent = request.config.requirements.join('\n');
      await fs.writeFile(path.join(sandboxPath, 'requirements.txt'), requirementsContent);
    }
    
    // Install requirements in sandbox virtual environment
    if (request.config.requirements && request.config.requirements.length > 0) {
      await this.installRequirementsInSandbox(sandboxPath, request.config);
    }
    
    logger.info('Created sandbox environment', {
      sandboxId,
      sandboxPath,
      requirements: request.config.requirements?.length || 0,
    });
    
    return sandboxPath;
  }

  private async installRequirementsInSandbox(sandboxPath: string, config: PythonMetricConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Requirements installation timed out'));
      }, 120000); // 2 minutes timeout

      const pythonCmd = config.pythonVersion || 'python3';
      
      // Create virtual environment
      exec(`${pythonCmd} -m venv venv`, { cwd: sandboxPath }, (error) => {
        if (error) {
          clearTimeout(timeout);
          reject(new Error(`Failed to create virtual environment: ${error.message}`));
          return;
        }

        // Install requirements
        const pipCmd = process.platform === 'win32' 
          ? `venv\\Scripts\\pip install -r requirements.txt`
          : `. venv/bin/activate && pip install -r requirements.txt`;

        exec(pipCmd, { cwd: sandboxPath }, (error) => {
          clearTimeout(timeout);
          if (error) {
            reject(new Error(`Failed to install requirements: ${error.message}`));
          } else {
            resolve();
          }
        });
      });
    });
  }

  private async createInputFile(
    inputData: any,
    config: PythonMetricConfig,
    workingDir: string
  ): Promise<string> {
    const inputFile = path.join(workingDir, `input_${crypto.randomUUID()}.json`);
    
    // Map input data according to configuration
    let mappedData = inputData;
    if (config.inputMapping) {
      mappedData = {};
      for (const [targetKey, sourcePath] of Object.entries(config.inputMapping)) {
        mappedData[targetKey] = this.getNestedValue(inputData, sourcePath);
      }
    }
    
    await fs.writeFile(inputFile, JSON.stringify(mappedData, null, 2));
    return inputFile;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private async executePythonScript(
    request: PythonMetricRequest,
    workingDir: string,
    inputFile: string
  ): Promise<PythonMetricResponse> {
    
    return new Promise((resolve, reject) => {
      const config = request.config;
      const startTime = Date.now();
      
      // Build Python execution command
      let pythonCmd = config.pythonVersion || 'python3';
      
      // Use virtual environment if in sandbox
      if (config.sandboxed) {
        pythonCmd = process.platform === 'win32'
          ? path.join(workingDir, 'venv', 'Scripts', 'python')
          : path.join(workingDir, 'venv', 'bin', 'python');
      }

      // Create wrapper script that calls the function
      const wrapperScript = this.createWrapperScript(config, inputFile);
      const wrapperPath = path.join(workingDir, 'wrapper.py');
      
      fs.writeFile(wrapperPath, wrapperScript).then(() => {
        const pythonProcess = spawn(pythonCmd, [wrapperPath], {
          cwd: workingDir,
          env: {
            ...process.env,
            ...config.environmentVariables,
            PYTHONPATH: workingDir,
          },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let memoryUsage = 0;

        // Collect output
        pythonProcess.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        pythonProcess.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        // Monitor memory usage
        const memoryMonitor = setInterval(() => {
          try {
            const usage = process.memoryUsage();
            memoryUsage = Math.max(memoryUsage, usage.heapUsed / 1024 / 1024); // MB
          } catch (error) {
            // Ignore memory monitoring errors
          }
        }, 1000);

        // Set execution timeout
        const timeout = setTimeout(() => {
          pythonProcess.kill('SIGKILL');
          clearInterval(memoryMonitor);
          reject(new Error(`Python script execution timed out after ${this.maxExecutionTime}ms`));
        }, config.timeoutMs || this.maxExecutionTime);

        // Handle process completion
        pythonProcess.on('close', (code) => {
          clearTimeout(timeout);
          clearInterval(memoryMonitor);
          
          const executionTime = Date.now() - startTime;
          
          // Clean up wrapper script
          fs.unlink(wrapperPath).catch(() => {});

          if (code === 0) {
            try {
              // Parse the result from stdout
              const result = this.parseScriptOutput(stdout, config);
              
              resolve({
                value: result,
                output: stdout,
                metadata: {
                  exitCode: code,
                  executionTime,
                  memoryUsage,
                  pythonVersion: config.pythonVersion || 'python3',
                  scriptPath: config.scriptPath,
                },
              });
              
            } catch (parseError) {
              resolve({
                value: null,
                output: stdout,
                error: `Failed to parse script output: ${parseError.message}`,
                metadata: {
                  exitCode: code,
                  executionTime,
                  memoryUsage,
                  pythonVersion: config.pythonVersion || 'python3',
                  scriptPath: config.scriptPath,
                },
              });
            }
          } else {
            resolve({
              value: null,
              output: stdout,
              error: stderr || `Script exited with code ${code}`,
              metadata: {
                exitCode: code,
                executionTime,
                memoryUsage,
                pythonVersion: config.pythonVersion || 'python3',
                scriptPath: config.scriptPath,
              },
            });
          }
        });

        pythonProcess.on('error', (error) => {
          clearTimeout(timeout);
          clearInterval(memoryMonitor);
          reject(new Error(`Failed to start Python process: ${error.message}`));
        });

        // Check memory limits
        const memoryCheck = setInterval(() => {
          if (memoryUsage > (config.memoryLimitMB || this.maxMemoryMB)) {
            pythonProcess.kill('SIGKILL');
            clearInterval(memoryCheck);
            clearInterval(memoryMonitor);
            clearTimeout(timeout);
            reject(new Error(`Python script exceeded memory limit: ${memoryUsage}MB`));
          }
        }, 5000);

        pythonProcess.on('close', () => {
          clearInterval(memoryCheck);
        });

      }).catch(reject);
    });
  }

  private createWrapperScript(config: PythonMetricConfig, inputFile: string): string {
    return `
import json
import sys
import traceback
from pathlib import Path

# Add script directory to path
script_dir = Path("${config.scriptPath}").parent
sys.path.insert(0, str(script_dir))

try:
    # Import the target module
    module_name = Path("${config.scriptPath}").stem
    module = __import__(module_name)
    
    # Get the target function
    func = getattr(module, "${config.functionName}")
    
    # Load input data
    with open("${inputFile}", 'r') as f:
        input_data = json.load(f)
    
    # Execute function
    if isinstance(input_data, dict):
        result = func(**input_data)
    else:
        result = func(input_data)
    
    # Output result as JSON
    output = {
        "success": True,
        "result": result,
        "type": type(result).__name__
    }
    
    print(json.dumps(output, default=str, indent=2))
    
except Exception as e:
    error_output = {
        "success": False,
        "error": str(e),
        "traceback": traceback.format_exc(),
        "type": "error"
    }
    
    print(json.dumps(error_output, indent=2), file=sys.stderr)
    sys.exit(1)
`;
  }

  private parseScriptOutput(output: string, config: PythonMetricConfig): any {
    try {
      const parsed = JSON.parse(output.trim());
      
      if (parsed.success) {
        let result = parsed.result;
        
        // Apply output mapping if configured
        if (config.outputMapping) {
          const mappedResult = {};
          for (const [targetKey, sourcePath] of Object.entries(config.outputMapping)) {
            mappedResult[targetKey] = this.getNestedValue(result, sourcePath);
          }
          result = mappedResult;
        }
        
        return result;
      } else {
        throw new Error(parsed.error || 'Script execution failed');
      }
      
    } catch (error) {
      // If JSON parsing fails, try to extract numeric or simple values
      const lines = output.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      
      // Try to parse as number
      const numMatch = lastLine.match(/^-?\d*\.?\d+$/);
      if (numMatch) {
        return parseFloat(numMatch[0]);
      }
      
      // Try to parse as boolean
      if (lastLine.toLowerCase() === 'true') return true;
      if (lastLine.toLowerCase() === 'false') return false;
      
      // Return as string
      return lastLine;
    }
  }

  private async cleanupSandboxEnvironment(sandboxPath: string): Promise<void> {
    try {
      await fs.rm(sandboxPath, { recursive: true, force: true });
      logger.info('Cleaned up sandbox environment', { sandboxPath });
    } catch (error) {
      logger.warn('Failed to cleanup sandbox environment', {
        sandboxPath,
        error: error.message,
      });
    }
  }

  private async cleanupInputFile(inputFile: string): Promise<void> {
    try {
      await fs.unlink(inputFile);
    } catch (error) {
      // Ignore cleanup errors for temporary files
    }
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.scriptsDir, { recursive: true });
      await fs.mkdir(this.sandboxDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create Python service directories', {
        error: error.message,
        scriptsDir: this.scriptsDir,
        sandboxDir: this.sandboxDir,
      });
    }
  }

  // Utility methods for script management
  async listAvailableScripts(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.scriptsDir);
      return files.filter(file => file.endsWith('.py'));
    } catch (error) {
      logger.error('Failed to list Python scripts', {
        error: error.message,
        scriptsDir: this.scriptsDir,
      });
      return [];
    }
  }

  async validateScriptFunction(scriptPath: string, functionName: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.scriptsDir, scriptPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return content.includes(`def ${functionName}(`);
    } catch (error) {
      return false;
    }
  }

  async getScriptInfo(scriptPath: string): Promise<any> {
    try {
      const fullPath = path.join(this.scriptsDir, scriptPath);
      const content = await fs.readFile(fullPath, 'utf-8');
      
      // Extract docstring and function definitions
      const functions = [];
      const funcMatches = content.matchAll(/def\s+(\w+)\s*\([^)]*\):\s*"""([^"]+)"""/g);
      
      for (const match of funcMatches) {
        functions.push({
          name: match[1],
          docstring: match[2].trim(),
        });
      }
      
      return {
        path: scriptPath,
        functions,
        lines: content.split('\n').length,
        size: content.length,
      };
      
    } catch (error) {
      throw new Error(`Failed to get script info: ${error.message}`);
    }
  }
}

// Export singleton instance
export const pythonMetricService = new PythonMetricService();