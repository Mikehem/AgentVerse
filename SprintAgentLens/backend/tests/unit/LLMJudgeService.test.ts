import { LLMJudgeService } from '../../src/services/LLMJudgeService';
import type {
  LLMJudgeConfig,
  LLMJudgeRequest,
  LLMJudgeResponse,
  ConsensusResult,
  LLMProvider,
  ConsensusConfig,
  LLMResponse,
  ValidationResult,
  ParsedResponse,
} from '../../src/types/automationRules';

// Mock HTTP client for LLM API calls
global.fetch = jest.fn();

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('LLMJudgeService', () => {
  let llmJudgeService: LLMJudgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    llmJudgeService = new LLMJudgeService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single LLM Evaluation', () => {
    test('should evaluate text with OpenAI GPT-4 successfully', async () => {
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                score: 0.85,
                confidence: 0.9,
                reasoning: 'The response is clear, accurate, and well-structured.',
                category: 'high_quality',
              }),
            },
          },
        ],
        usage: {
          prompt_tokens: 150,
          completion_tokens: 50,
          total_tokens: 200,
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOpenAIResponse),
      });

      const config: LLMJudgeConfig = {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Evaluate the quality of this response on a scale of 0-1',
        temperature: 0.1,
        maxTokens: 500,
        responseFormat: 'json',
        timeout: 30000,
      };

      const request: LLMJudgeRequest = {
        config,
        input: {
          text: 'This is a sample response to evaluate.',
          context: {
            question: 'What is the capital of France?',
            expectedAnswer: 'Paris',
          },
        },
        metadata: {
          traceId: 'trace-123',
          evaluationId: 'eval-123',
        },
      };

      const result = await llmJudgeService.evaluate(request);

      expect(result.success).toBe(true);
      expect(result.result.score).toBe(0.85);
      expect(result.result.confidence).toBe(0.9);
      expect(result.result.reasoning).toContain('well-structured');
      expect(result.metadata.provider).toBe('openai');
      expect(result.metadata.model).toBe('gpt-4');
      expect(result.metadata.tokensUsed).toBe(200);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('Bearer'),
          }),
        })
      );
    });

    test('should evaluate text with Claude successfully', async () => {
      const mockClaudeResponse = {
        content: [
          {
            text: 'Score: 0.92\nConfidence: 0.88\nReasoning: Excellent response with comprehensive coverage.',
          },
        ],
        usage: {
          input_tokens: 140,
          output_tokens: 45,
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockClaudeResponse),
      });

      const config: LLMJudgeConfig = {
        model: 'claude-3-opus',
        provider: 'anthropic',
        prompt: 'Evaluate this response comprehensively',
        temperature: 0.2,
        maxTokens: 400,
        responseFormat: 'text',
      };

      const request: LLMJudgeRequest = {
        config,
        input: {
          text: 'Comprehensive answer about machine learning fundamentals.',
        },
      };

      const result = await llmJudgeService.evaluate(request);

      expect(result.success).toBe(true);
      expect(result.result.score).toBe(0.92);
      expect(result.result.confidence).toBe(0.88);
      expect(result.result.reasoning).toContain('comprehensive coverage');
      expect(result.metadata.provider).toBe('anthropic');
    });

    test('should handle different response formats correctly', async () => {
      const testCases = [
        {
          format: 'json',
          response: '{"score": 0.8, "reasoning": "Good quality"}',
          expected: { score: 0.8, reasoning: 'Good quality' },
        },
        {
          format: 'score',
          response: '0.75',
          expected: { score: 0.75 },
        },
        {
          format: 'classification',
          response: 'high_quality',
          expected: { classification: 'high_quality' },
        },
        {
          format: 'text',
          response: 'Score: 0.9\nThis response is excellent because...',
          expected: { score: 0.9, text: 'Score: 0.9\nThis response is excellent because...' },
        },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          choices: [{ message: { content: testCase.response } }],
          usage: { total_tokens: 100 },
        };

        (fetch as jest.Mock).mockResolvedValue({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        });

        const config: LLMJudgeConfig = {
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          prompt: 'Evaluate',
          responseFormat: testCase.format as any,
        };

        const result = await llmJudgeService.evaluate({
          config,
          input: { text: 'Test input' },
        });

        expect(result.success).toBe(true);
        expect(result.result).toMatchObject(testCase.expected);
      }
    });

    test('should handle API errors gracefully', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Evaluate this',
      };

      // Test network error
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result1 = await llmJudgeService.evaluate({
        config,
        input: { text: 'Test' },
      });

      expect(result1.success).toBe(false);
      expect(result1.error).toContain('Network error');

      // Test API error response
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Rate Limited',
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' },
        }),
      });

      const result2 = await llmJudgeService.evaluate({
        config,
        input: { text: 'Test' },
      });

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Rate limit exceeded');
      expect(result2.metadata?.statusCode).toBe(429);
    });

    test('should implement request timeout', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Evaluate',
        timeout: 1000, // 1 second timeout
      };

      // Mock slow response
      (fetch as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 2000))
      );

      const result = await llmJudgeService.evaluate({
        config,
        input: { text: 'Test' },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    test('should validate and sanitize input', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Evaluate this content',
      };

      // Test with potentially malicious input
      const maliciousInput = {
        text: '<script>alert("xss")</script>DROP TABLE users;',
        context: {
          userInput: '"; DELETE FROM database; --',
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"score": 0.5}' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const result = await llmJudgeService.evaluate({
        config,
        input: maliciousInput,
      });

      expect(result.success).toBe(true);
      // Verify that input was sanitized in the API call
      const fetchCall = (fetch as jest.Mock).mock.calls[0][1];
      const requestBody = JSON.parse(fetchCall.body);
      expect(requestBody.messages[1].content).not.toContain('<script>');
      expect(requestBody.messages[1].content).not.toContain('DROP TABLE');
    });
  });

  describe('Multi-Model Consensus Evaluation', () => {
    test('should achieve consensus with multiple models', async () => {
      const consensusConfig: ConsensusConfig = {
        models: [
          {
            model: 'gpt-4',
            provider: 'openai',
            weight: 0.4,
            prompt: 'Evaluate quality on scale 0-1',
          },
          {
            model: 'claude-3-opus',
            provider: 'anthropic',
            weight: 0.4,
            prompt: 'Rate the response quality',
          },
          {
            model: 'gpt-3.5-turbo',
            provider: 'openai',
            weight: 0.2,
            prompt: 'Score this response',
          },
        ],
        consensusThreshold: 0.7,
        maxDivergence: 0.3,
        requireAllModels: false,
      };

      // Mock responses from different models
      const mockResponses = [
        {
          choices: [{ message: { content: '{"score": 0.85, "confidence": 0.9}' } }],
          usage: { total_tokens: 120 },
        },
        {
          content: [{ text: 'Score: 0.82\nConfidence: 0.88' }],
          usage: { input_tokens: 80, output_tokens: 30 },
        },
        {
          choices: [{ message: { content: '{"score": 0.87, "confidence": 0.85}' } }],
          usage: { total_tokens: 100 },
        },
      ];

      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        const response = mockResponses[callCount++];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        });
      });

      const request: LLMJudgeRequest = {
        config: {
          consensus: consensusConfig,
          responseFormat: 'json',
        },
        input: {
          text: 'Sample response to evaluate with consensus',
        },
      };

      const result = await llmJudgeService.evaluateConsensus(request);

      expect(result.success).toBe(true);
      expect(result.consensus).toBeDefined();
      expect(result.consensus?.achieved).toBe(true);
      expect(result.consensus?.finalScore).toBeCloseTo(0.84, 1); // Weighted average
      expect(result.consensus?.confidence).toBeGreaterThan(0.7);
      expect(result.consensus?.modelResults).toHaveLength(3);
      expect(result.consensus?.agreement).toBeGreaterThan(0.7);
    });

    test('should handle consensus failure when models diverge', async () => {
      const consensusConfig: ConsensusConfig = {
        models: [
          {
            model: 'gpt-4',
            provider: 'openai',
            weight: 0.5,
            prompt: 'Evaluate',
          },
          {
            model: 'claude-3-opus',
            provider: 'anthropic',
            weight: 0.5,
            prompt: 'Evaluate',
          },
        ],
        consensusThreshold: 0.8,
        maxDivergence: 0.2,
        requireAllModels: true,
      };

      // Mock divergent responses
      const mockResponses = [
        {
          choices: [{ message: { content: '{"score": 0.9, "confidence": 0.95}' } }],
          usage: { total_tokens: 100 },
        },
        {
          content: [{ text: 'Score: 0.3\nConfidence: 0.85' }],
          usage: { input_tokens: 80, output_tokens: 30 },
        },
      ];

      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        const response = mockResponses[callCount++];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        });
      });

      const request: LLMJudgeRequest = {
        config: { consensus: consensusConfig },
        input: { text: 'Controversial content' },
      };

      const result = await llmJudgeService.evaluateConsensus(request);

      expect(result.success).toBe(false);
      expect(result.consensus?.achieved).toBe(false);
      expect(result.consensus?.divergence).toBeGreaterThan(0.2);
      expect(result.error).toContain('consensus not achieved');
    });

    test('should handle partial model failures in consensus', async () => {
      const consensusConfig: ConsensusConfig = {
        models: [
          {
            model: 'gpt-4',
            provider: 'openai',
            weight: 0.4,
            prompt: 'Evaluate',
          },
          {
            model: 'claude-3-opus',
            provider: 'anthropic',
            weight: 0.3,
            prompt: 'Evaluate',
          },
          {
            model: 'gpt-3.5-turbo',
            provider: 'openai',
            weight: 0.3,
            prompt: 'Evaluate',
          },
        ],
        consensusThreshold: 0.6,
        requireAllModels: false,
        fallbackOnPartialFailure: true,
      };

      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        if (callCount === 1) {
          // Second call fails
          callCount++;
          return Promise.reject(new Error('API Error'));
        }
        
        const response = {
          choices: [{ message: { content: '{"score": 0.8, "confidence": 0.9}' } }],
          usage: { total_tokens: 100 },
        };
        callCount++;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(response),
        });
      });

      const result = await llmJudgeService.evaluateConsensus({
        config: { consensus: consensusConfig },
        input: { text: 'Test content' },
      });

      expect(result.success).toBe(true);
      expect(result.consensus?.achieved).toBe(true);
      expect(result.consensus?.modelResults).toHaveLength(2); // One failed
      expect(result.consensus?.failedModels).toHaveLength(1);
    });

    test('should implement consensus with different aggregation strategies', async () => {
      const strategies = ['weighted_average', 'median', 'maximum', 'minimum'] as const;

      for (const strategy of strategies) {
        const consensusConfig: ConsensusConfig = {
          models: [
            { model: 'gpt-4', provider: 'openai', weight: 0.5, prompt: 'Evaluate' },
            { model: 'gpt-3.5-turbo', provider: 'openai', weight: 0.5, prompt: 'Evaluate' },
          ],
          aggregationStrategy: strategy,
          consensusThreshold: 0.5,
        };

        // Mock consistent responses
        (fetch as jest.Mock).mockImplementation(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '{"score": 0.8, "confidence": 0.9}' } }],
            usage: { total_tokens: 100 },
          }),
        }));

        const result = await llmJudgeService.evaluateConsensus({
          config: { consensus: consensusConfig },
          input: { text: 'Test' },
        });

        expect(result.success).toBe(true);
        expect(result.consensus?.aggregationStrategy).toBe(strategy);
        expect(result.consensus?.finalScore).toBeDefined();
      }
    });
  });

  describe('Response Parsing and Validation', () => {
    test('should parse JSON responses correctly', async () => {
      const testCases = [
        {
          input: '{"score": 0.85, "confidence": 0.9, "reasoning": "Good quality"}',
          expected: { score: 0.85, confidence: 0.9, reasoning: 'Good quality' },
        },
        {
          input: '{\n  "score": 0.75,\n  "category": "medium_quality"\n}',
          expected: { score: 0.75, category: 'medium_quality' },
        },
        {
          input: 'Score: 0.9', // Fallback parsing for non-JSON
          expected: { score: 0.9 },
        },
      ];

      for (const testCase of testCases) {
        const result = await llmJudgeService.parseResponse(
          testCase.input,
          'json'
        );

        expect(result.success).toBe(true);
        expect(result.parsed).toMatchObject(testCase.expected);
      }
    });

    test('should handle malformed JSON gracefully', async () => {
      const malformedInputs = [
        '{"score": 0.8, "confidence":}', // Incomplete JSON
        '{score: 0.8}', // Invalid JSON syntax
        'Not JSON at all',
        '',
        null,
        undefined,
      ];

      for (const input of malformedInputs) {
        const result = await llmJudgeService.parseResponse(input as string, 'json');
        
        if (input === 'Not JSON at all') {
          // Should attempt fallback parsing
          expect(result.success).toBe(true);
          expect(result.fallbackUsed).toBe(true);
        } else {
          expect(result.success).toBe(false);
          expect(result.error).toBeDefined();
        }
      }
    });

    test('should validate response structure', async () => {
      const validationRules = {
        requiredFields: ['score', 'confidence'],
        scoreRange: { min: 0, max: 1 },
        confidenceRange: { min: 0, max: 1 },
        allowedCategories: ['high', 'medium', 'low'],
      };

      const testCases = [
        {
          response: { score: 0.8, confidence: 0.9 },
          valid: true,
        },
        {
          response: { score: 1.5, confidence: 0.8 }, // Score out of range
          valid: false,
        },
        {
          response: { score: 0.8 }, // Missing confidence
          valid: false,
        },
        {
          response: { score: 0.8, confidence: 0.9, category: 'high' },
          valid: true,
        },
        {
          response: { score: 0.8, confidence: 0.9, category: 'invalid' },
          valid: false,
        },
      ];

      for (const testCase of testCases) {
        const result = await llmJudgeService.validateResponse(
          testCase.response,
          validationRules
        );

        expect(result.valid).toBe(testCase.valid);
        if (!testCase.valid) {
          expect(result.errors).toBeDefined();
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Performance and Reliability', () => {
    test('should handle concurrent evaluations efficiently', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        prompt: 'Quick evaluation',
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"score": 0.8}' } }],
          usage: { total_tokens: 50 },
        }),
      });

      const requests = Array.from({ length: 10 }, (_, i) => ({
        config,
        input: { text: `Test input ${i}` },
      }));

      const startTime = Date.now();
      const results = await Promise.all(
        requests.map(request => llmJudgeService.evaluate(request))
      );
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(fetch).toHaveBeenCalledTimes(10);
    });

    test('should implement rate limiting', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Evaluate',
        rateLimitConfig: {
          requestsPerMinute: 5,
          burstLimit: 2,
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"score": 0.8}' } }],
          usage: { total_tokens: 100 },
        }),
      });

      // Make rapid requests
      const requests = Array.from({ length: 10 }, () => ({
        config,
        input: { text: 'Test' },
      }));

      const results = await Promise.all(
        requests.map(request => llmJudgeService.evaluate(request))
      );

      // Some requests should be rate limited
      const rateLimitedResults = results.filter(r => 
        !r.success && r.error?.includes('rate limit')
      );
      
      expect(rateLimitedResults.length).toBeGreaterThan(0);
    });

    test('should cache similar requests', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-3.5-turbo',
        provider: 'openai',
        prompt: 'Evaluate this text',
        cacheConfig: {
          enabled: true,
          ttlSeconds: 300,
          keyStrategy: 'content_hash',
        },
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"score": 0.85}' } }],
          usage: { total_tokens: 120 },
        }),
      });

      const request = {
        config,
        input: { text: 'Identical content for caching test' },
      };

      // First request
      const result1 = await llmJudgeService.evaluate(request);
      expect(result1.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second identical request should use cache
      const result2 = await llmJudgeService.evaluate(request);
      expect(result2.success).toBe(true);
      expect(result2.metadata?.fromCache).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(1); // No additional API call
    });

    test('should handle token usage tracking', async () => {
      const config: LLMJudgeConfig = {
        model: 'gpt-4',
        provider: 'openai',
        prompt: 'Detailed evaluation',
        trackTokenUsage: true,
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: '{"score": 0.9}' } }],
          usage: {
            prompt_tokens: 200,
            completion_tokens: 50,
            total_tokens: 250,
          },
        }),
      });

      const result = await llmJudgeService.evaluate({
        config,
        input: { text: 'Complex input requiring detailed analysis' },
      });

      expect(result.success).toBe(true);
      expect(result.metadata?.tokensUsed).toBe(250);
      expect(result.metadata?.promptTokens).toBe(200);
      expect(result.metadata?.completionTokens).toBe(50);
      expect(result.metadata?.estimatedCost).toBeDefined();
    });
  });
});