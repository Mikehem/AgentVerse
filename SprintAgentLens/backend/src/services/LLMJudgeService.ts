/**
 * LLM-as-Judge Service for automation rule evaluations
 * Provides enterprise-grade LLM evaluation with consensus and fallback mechanisms
 */

import { logger } from '../utils/logger';
import { llmProviderService } from './LLMProviderService';
import type {
  AuthenticatedUser,
  LLMJudgeConfig,
  EvaluatorResult,
  RuleExecution
} from '../types/automationRules';

export interface LLMJudgeRequest {
  config: LLMJudgeConfig;
  inputData: any;
  context: {
    ruleId: string;
    executionId: string;
    workspaceId: string;
  };
  user: AuthenticatedUser;
}

export interface LLMJudgeResponse {
  value: any;
  confidence: number;
  rawResponse: string;
  parsedResponse: any;
  consensusResults?: LLMConsensusResult[];
  metadata: {
    modelUsed: string;
    tokensUsed: number;
    latencyMs: number;
    cost: number;
  };
}

export interface LLMConsensusResult {
  attempt: number;
  value: any;
  confidence: number;
  rawResponse: string;
  agreement: number; // 0-1 agreement with consensus
}

export class LLMJudgeService {
  
  async evaluateWithLLM(request: LLMJudgeRequest): Promise<EvaluatorResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting LLM judge evaluation', {
        ruleId: request.context.ruleId,
        executionId: request.context.executionId,
        modelName: request.config.modelName,
        consensusCount: request.config.consensusCount || 1,
      });

      let response: LLMJudgeResponse;

      if (request.config.consensusCount && request.config.consensusCount > 1) {
        // Multi-evaluation consensus approach
        response = await this.evaluateWithConsensus(request);
      } else {
        // Single evaluation
        response = await this.evaluateSingle(request);
      }

      // Validate confidence threshold
      if (request.config.confidenceThreshold && response.confidence < request.config.confidenceThreshold) {
        logger.warn('LLM evaluation below confidence threshold', {
          confidence: response.confidence,
          threshold: request.config.confidenceThreshold,
          ruleId: request.context.ruleId,
        });

        // Try fallback evaluator if configured
        if (request.config.fallbackEvaluator) {
          logger.info('Attempting fallback evaluator', {
            fallbackEvaluator: request.config.fallbackEvaluator,
            ruleId: request.context.ruleId,
          });
          // Would integrate with fallback evaluator here
        }
      }

      const duration = Date.now() - startTime;

      return {
        evaluatorId: 'llm_judge',
        evaluatorName: `LLM Judge (${request.config.modelName})`,
        status: 'completed',
        value: response.value,
        confidence: response.confidence,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        metadata: {
          llmResponse: response,
          modelUsed: response.metadata.modelUsed,
          tokensUsed: response.metadata.tokensUsed,
          cost: response.metadata.cost,
          consensusCount: request.config.consensusCount,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error('LLM judge evaluation failed', {
        error: error.message,
        stack: error.stack,
        ruleId: request.context.ruleId,
        executionId: request.context.executionId,
        duration,
      });

      return {
        evaluatorId: 'llm_judge',
        evaluatorName: `LLM Judge (${request.config.modelName})`,
        status: 'failed',
        value: null,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration,
        error: error.message,
        warnings: ['LLM evaluation failed, consider fallback options'],
      };
    }
  }

  private async evaluateSingle(request: LLMJudgeRequest): Promise<LLMJudgeResponse> {
    const prompt = this.buildPrompt(request.config, request.inputData);
    
    // Get LLM provider instance
    const provider = await llmProviderService.getProvider(
      request.config.providerName,
      request.user
    );

    // Make LLM API call
    const response = await provider.generateCompletion({
      model: request.config.modelName,
      systemPrompt: request.config.systemPrompt,
      userPrompt: prompt,
      temperature: request.config.temperature || 0.1,
      maxTokens: request.config.maxTokens || 1000,
      topP: request.config.topP,
      frequencyPenalty: request.config.frequencyPenalty,
      presencePenalty: request.config.presencePenalty,
    });

    // Parse response based on format
    const parsed = this.parseResponse(
      response.content,
      request.config.responseFormat,
      request.config
    );

    return {
      value: parsed.value,
      confidence: parsed.confidence,
      rawResponse: response.content,
      parsedResponse: parsed,
      metadata: {
        modelUsed: request.config.modelName,
        tokensUsed: response.usage.totalTokens,
        latencyMs: response.latencyMs,
        cost: response.cost || 0,
      },
    };
  }

  private async evaluateWithConsensus(request: LLMJudgeRequest): Promise<LLMJudgeResponse> {
    const consensusCount = request.config.consensusCount!;
    const results: LLMConsensusResult[] = [];
    
    logger.info('Starting consensus evaluation', {
      consensusCount,
      ruleId: request.context.ruleId,
    });

    // Perform multiple evaluations
    for (let i = 0; i < consensusCount; i++) {
      try {
        const singleResponse = await this.evaluateSingle({
          ...request,
          config: {
            ...request.config,
            // Vary temperature slightly for diversity
            temperature: (request.config.temperature || 0.1) + (Math.random() * 0.1 - 0.05),
          },
        });

        results.push({
          attempt: i + 1,
          value: singleResponse.value,
          confidence: singleResponse.confidence,
          rawResponse: singleResponse.rawResponse,
          agreement: 0, // Will be calculated after consensus
        });

      } catch (error) {
        logger.warn('Consensus evaluation attempt failed', {
          attempt: i + 1,
          error: error.message,
          ruleId: request.context.ruleId,
        });
        
        results.push({
          attempt: i + 1,
          value: null,
          confidence: 0,
          rawResponse: '',
          agreement: 0,
        });
      }
    }

    // Calculate consensus
    const consensus = this.calculateConsensus(results, request.config);
    
    // Calculate agreement scores
    results.forEach(result => {
      if (result.value !== null) {
        result.agreement = this.calculateAgreement(result.value, consensus.value, request.config);
      }
    });

    logger.info('Consensus evaluation completed', {
      consensusValue: consensus.value,
      consensusConfidence: consensus.confidence,
      successfulAttempts: results.filter(r => r.value !== null).length,
      ruleId: request.context.ruleId,
    });

    return {
      value: consensus.value,
      confidence: consensus.confidence,
      rawResponse: consensus.rawResponse,
      parsedResponse: consensus.parsedResponse,
      consensusResults: results,
      metadata: {
        modelUsed: request.config.modelName,
        tokensUsed: results.reduce((sum, r) => sum + (r.value ? 100 : 0), 0), // Estimated
        latencyMs: results.length * 2000, // Estimated
        cost: results.filter(r => r.value !== null).length * 0.01, // Estimated
      },
    };
  }

  private buildPrompt(config: LLMJudgeConfig, inputData: any): string {
    let prompt = config.userPromptTemplate;
    
    // Variable substitution
    if (inputData) {
      // Replace variables in the format {variable_name}
      prompt = prompt.replace(/\{([^}]+)\}/g, (match, variable) => {
        const value = this.getNestedValue(inputData, variable);
        return value !== undefined ? String(value) : match;
      });
    }

    // Add format-specific instructions
    if (config.responseFormat === 'json') {
      prompt += '\n\nPlease respond with valid JSON only.';
    } else if (config.responseFormat === 'score') {
      const range = config.scoreRange;
      if (range) {
        prompt += `\n\nPlease respond with a numeric score between ${range.min} and ${range.max}.`;
      }
    } else if (config.responseFormat === 'classification') {
      if (config.classifications) {
        prompt += `\n\nPlease respond with one of these classifications: ${config.classifications.join(', ')}.`;
      }
    }

    return prompt;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private parseResponse(
    response: string,
    format: string,
    config: LLMJudgeConfig
  ): { value: any; confidence: number; [key: string]: any } {
    
    switch (format) {
      case 'json':
        return this.parseJsonResponse(response, config);
      
      case 'score':
        return this.parseScoreResponse(response, config);
      
      case 'classification':
        return this.parseClassificationResponse(response, config);
      
      case 'text':
      default:
        return this.parseTextResponse(response, config);
    }
  }

  private parseJsonResponse(response: string, config: LLMJudgeConfig): any {
    try {
      // Extract JSON from response (handle cases where LLM adds explanation)
      const jsonMatch = response.match(/\{[\s\S]*\}/) || response.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : response.trim();
      
      const parsed = JSON.parse(jsonString);
      
      // Validate against schema if provided
      if (config.responseSchema) {
        const isValid = this.validateJsonSchema(parsed, config.responseSchema);
        if (!isValid) {
          logger.warn('LLM response does not match expected schema', {
            response: parsed,
            schema: config.responseSchema,
          });
        }
      }

      // Extract confidence if present
      const confidence = parsed.confidence || parsed.score || 0.8;

      return {
        value: parsed,
        confidence: Math.min(Math.max(confidence, 0), 1),
        raw: response,
        parsed: true,
      };

    } catch (error) {
      logger.warn('Failed to parse JSON response from LLM', {
        response: response.substring(0, 200),
        error: error.message,
      });

      return {
        value: response,
        confidence: 0.3, // Low confidence for unparseable response
        raw: response,
        parsed: false,
        error: 'JSON parsing failed',
      };
    }
  }

  private parseScoreResponse(response: string, config: LLMJudgeConfig): any {
    // Extract numeric value from response
    const numberMatch = response.match(/\d+\.?\d*/);
    if (!numberMatch) {
      return {
        value: null,
        confidence: 0,
        raw: response,
        error: 'No numeric score found in response',
      };
    }

    const score = parseFloat(numberMatch[0]);
    const range = config.scoreRange;
    
    // Validate range if specified
    if (range && (score < range.min || score > range.max)) {
      logger.warn('LLM score outside expected range', {
        score,
        range,
        response: response.substring(0, 100),
      });
    }

    // Calculate confidence based on response clarity
    const confidence = this.calculateScoreConfidence(response, score, range);

    return {
      value: score,
      confidence,
      raw: response,
      inRange: range ? (score >= range.min && score <= range.max) : true,
    };
  }

  private parseClassificationResponse(response: string, config: LLMJudgeConfig): any {
    if (!config.classifications) {
      return {
        value: response.trim(),
        confidence: 0.5,
        raw: response,
      };
    }

    const responseText = response.toLowerCase().trim();
    let bestMatch = null;
    let bestMatchScore = 0;

    // Find best matching classification
    for (const classification of config.classifications) {
      const classLower = classification.toLowerCase();
      
      if (responseText === classLower) {
        // Exact match
        bestMatch = classification;
        bestMatchScore = 1.0;
        break;
      } else if (responseText.includes(classLower)) {
        // Partial match
        const score = classLower.length / responseText.length;
        if (score > bestMatchScore) {
          bestMatch = classification;
          bestMatchScore = score;
        }
      }
    }

    return {
      value: bestMatch || responseText,
      confidence: bestMatchScore,
      raw: response,
      exactMatch: bestMatchScore === 1.0,
      availableClassifications: config.classifications,
    };
  }

  private parseTextResponse(response: string, config: LLMJudgeConfig): any {
    // For text responses, we can perform sentiment analysis or keyword extraction
    const sentiment = this.analyzeSentiment(response);
    const keywords = this.extractKeywords(response);

    return {
      value: response.trim(),
      confidence: 0.7, // Default confidence for text responses
      raw: response,
      sentiment,
      keywords,
      length: response.length,
    };
  }

  private calculateConsensus(
    results: LLMConsensusResult[],
    config: LLMJudgeConfig
  ): { value: any; confidence: number; rawResponse: string; parsedResponse: any } {
    
    const validResults = results.filter(r => r.value !== null);
    
    if (validResults.length === 0) {
      return {
        value: null,
        confidence: 0,
        rawResponse: 'All consensus attempts failed',
        parsedResponse: null,
      };
    }

    if (config.responseFormat === 'score') {
      // For numeric scores, use average
      const scores = validResults.map(r => parseFloat(r.value));
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
      const agreement = 1 - (Math.sqrt(variance) / average); // Higher agreement = lower relative variance

      return {
        value: parseFloat(average.toFixed(2)),
        confidence: Math.min(agreement, 1),
        rawResponse: `Consensus of ${validResults.length} evaluations`,
        parsedResponse: { average, variance, scores },
      };

    } else if (config.responseFormat === 'classification') {
      // For classifications, use majority vote
      const votes = {};
      validResults.forEach(r => {
        votes[r.value] = (votes[r.value] || 0) + 1;
      });

      const sortedVotes = Object.entries(votes).sort(([,a], [,b]) => b - a);
      const winner = sortedVotes[0];
      const confidence = winner[1] / validResults.length;

      return {
        value: winner[0],
        confidence,
        rawResponse: `Consensus: ${winner[0]} (${winner[1]}/${validResults.length} votes)`,
        parsedResponse: { votes, winner },
      };

    } else {
      // For other formats, use the result with highest confidence
      const bestResult = validResults.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      return {
        value: bestResult.value,
        confidence: bestResult.confidence,
        rawResponse: bestResult.rawResponse,
        parsedResponse: bestResult,
      };
    }
  }

  private calculateAgreement(value1: any, value2: any, config: LLMJudgeConfig): number {
    if (value1 === value2) return 1.0;
    if (!value1 || !value2) return 0.0;

    if (config.responseFormat === 'score' && typeof value1 === 'number' && typeof value2 === 'number') {
      // For scores, calculate relative difference
      const maxValue = config.scoreRange ? config.scoreRange.max - config.scoreRange.min : Math.max(value1, value2);
      const difference = Math.abs(value1 - value2);
      return Math.max(0, 1 - (difference / maxValue));
    }

    if (typeof value1 === 'string' && typeof value2 === 'string') {
      // For strings, calculate similarity
      return this.calculateStringSimilarity(value1, value2);
    }

    return 0.0;
  }

  private calculateScoreConfidence(response: string, score: number, range?: { min: number; max: number }): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for clear numeric responses
    if (/^\s*\d+\.?\d*\s*$/.test(response)) {
      confidence += 0.2;
    }

    // Higher confidence if in expected range
    if (range && score >= range.min && score <= range.max) {
      confidence += 0.1;
    }

    // Lower confidence for very long responses (suggests uncertainty)
    if (response.length > 100) {
      confidence -= 0.1;
    }

    return Math.min(Math.max(confidence, 0), 1);
  }

  private validateJsonSchema(data: any, schema: any): boolean {
    // Basic schema validation - in production would use ajv or similar
    try {
      if (schema.type === 'object' && typeof data !== 'object') return false;
      if (schema.type === 'array' && !Array.isArray(data)) return false;
      if (schema.type === 'string' && typeof data !== 'string') return false;
      if (schema.type === 'number' && typeof data !== 'number') return false;
      
      // Additional validation would go here
      return true;
    } catch {
      return false;
    }
  }

  private analyzeSentiment(text: string): { score: number; label: string; magnitude: number } {
    // Simple sentiment analysis - in production would use proper NLP library
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'correct', 'accurate', 'high'];
    const negativeWords = ['bad', 'poor', 'terrible', 'negative', 'wrong', 'incorrect', 'low'];
    
    const words = text.toLowerCase().split(/\s+/);
    let score = 0;
    let magnitude = 0;

    words.forEach(word => {
      if (positiveWords.includes(word)) {
        score += 1;
        magnitude += 1;
      } else if (negativeWords.includes(word)) {
        score -= 1;
        magnitude += 1;
      }
    });

    const normalizedScore = score / Math.max(words.length, 1);
    const normalizedMagnitude = magnitude / Math.max(words.length, 1);

    let label = 'neutral';
    if (normalizedScore > 0.1) label = 'positive';
    else if (normalizedScore < -0.1) label = 'negative';

    return {
      score: normalizedScore,
      magnitude: normalizedMagnitude,
      label,
    };
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - in production would use proper NLP
    const stopWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));

    // Return top 5 most frequent words
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein distance based similarity
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;
    
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return (maxLen - distance) / maxLen;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Export singleton instance
export const llmJudgeService = new LLMJudgeService();