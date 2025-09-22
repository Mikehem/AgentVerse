// Unit tests for heuristic metrics

import { 
  ContainsMetric,
  EqualsMetric,
  RegexMetric,
  IsJsonMetric,
  LevenshteinMetric,
  MetricFactory,
  EvaluationContext
} from '../metrics'

describe('ContainsMetric', () => {
  it('should pass when output contains all required text (matchType: all)', async () => {
    const metric = new ContainsMetric(
      'test-contains',
      'Contains Test',
      'Test contains metric',
      { 
        expectedText: ['hello', 'world'],
        matchType: 'all',
        caseSensitive: false
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello beautiful world'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.foundCount).toBe(2)
    expect(result.details.totalCount).toBe(2)
  })

  it('should pass when output contains any required text (matchType: any)', async () => {
    const metric = new ContainsMetric(
      'test-contains',
      'Contains Test',
      'Test contains metric',
      { 
        expectedText: ['hello', 'missing'],
        matchType: 'any',
        caseSensitive: false
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello world'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.foundCount).toBe(1)
  })

  it('should respect case sensitivity', async () => {
    const metric = new ContainsMetric(
      'test-contains',
      'Contains Test',
      'Test contains metric',
      { 
        expectedText: ['Hello'],
        caseSensitive: true
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'hello world'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.score).toBe(0)
  })

  it('should find multiple positions of the same text', async () => {
    const metric = new ContainsMetric(
      'test-contains',
      'Contains Test',
      'Test contains metric',
      { 
        expectedText: ['test'],
        caseSensitive: false
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'test this test case'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.details.matches[0].positions).toHaveLength(2)
    expect(result.details.matches[0].positions).toEqual([0, 10])
  })
})

describe('EqualsMetric', () => {
  it('should pass when output exactly matches expected output', async () => {
    const metric = new EqualsMetric(
      'test-equals',
      'Equals Test',
      'Test equals metric',
      { 
        caseSensitive: false,
        trimWhitespace: true
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: '  Hello World  ',
      expectedOutput: 'hello world'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.similarity).toBe(1)
  })

  it('should fail when output does not match expected output', async () => {
    const metric = new EqualsMetric(
      'test-equals',
      'Equals Test',
      'Test equals metric',
      { caseSensitive: false }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello World',
      expectedOutput: 'Goodbye World'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.score).toBe(0)
    expect(result.details.similarity).toBeLessThan(1)
  })

  it('should normalize whitespace when configured', async () => {
    const metric = new EqualsMetric(
      'test-equals',
      'Equals Test',
      'Test equals metric',
      { 
        normalizeWhitespace: true,
        trimWhitespace: true
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello    \n  World',
      expectedOutput: 'Hello World'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
  })
})

describe('RegexMetric', () => {
  it('should pass when pattern matches (test mode)', async () => {
    const metric = new RegexMetric(
      'test-regex',
      'Regex Test',
      'Test regex metric',
      { 
        pattern: '\\d{3}-\\d{3}-\\d{4}',
        matchType: 'test'
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Call me at 123-456-7890'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.matchCount).toBeGreaterThan(0)
  })

  it('should find multiple matches (matchAll mode)', async () => {
    const metric = new RegexMetric(
      'test-regex',
      'Regex Test',
      'Test regex metric',
      { 
        pattern: '\\d+',
        matchType: 'matchAll',
        flags: 'g'
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'I have 5 apples and 3 oranges'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.details.matchCount).toBe(2)
    expect(result.details.matches).toHaveLength(2)
  })

  it('should handle minimum matches requirement', async () => {
    const metric = new RegexMetric(
      'test-regex',
      'Regex Test',
      'Test regex metric',
      { 
        pattern: '\\d+',
        matchType: 'matchAll',
        flags: 'g',
        minMatches: 3
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'I have 5 apples and 3 oranges'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.score).toBeLessThan(1)
    expect(result.details.matchCount).toBe(2)
  })

  it('should throw error for invalid regex pattern', async () => {
    const metric = new RegexMetric(
      'test-regex',
      'Regex Test',
      'Test regex metric',
      { pattern: '[invalid' }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'test output'
    }

    await expect(metric.evaluate(context)).rejects.toThrow('Invalid regex pattern')
  })
})

describe('IsJsonMetric', () => {
  it('should pass for valid JSON object', async () => {
    const metric = new IsJsonMetric(
      'test-json',
      'JSON Test',
      'Test JSON metric',
      { strict: true }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: '{"name": "John", "age": 30}'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.isValidJson).toBe(true)
    expect(result.details.keyCount).toBe(2)
    expect(result.details.jsonType).toBe('object')
  })

  it('should fail for non-object JSON in strict mode', async () => {
    const metric = new IsJsonMetric(
      'test-json',
      'JSON Test',
      'Test JSON metric',
      { strict: true }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: '[1, 2, 3]'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.details.jsonType).toBe('object') // arrays are typeof 'object'
    expect(result.details.validationErrors).toContain('JSON cannot be an array when strict mode is enabled')
  })

  it('should validate schema when provided', async () => {
    const metric = new IsJsonMetric(
      'test-json',
      'JSON Test',
      'Test JSON metric',
      { 
        strict: true,
        expectedSchema: {
          name: 'string',
          age: 'number'
        }
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: '{"name": "John", "age": "thirty"}'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.details.validationErrors).toContain('Field age should be number, got string')
  })

  it('should handle minimum keys requirement', async () => {
    const metric = new IsJsonMetric(
      'test-json',
      'JSON Test',
      'Test JSON metric',
      { 
        strict: true,
        minKeys: 3
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: '{"name": "John"}'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.details.keyCount).toBe(1)
    expect(result.details.validationErrors).toContain('JSON object must have at least 3 keys, found 1')
  })

  it('should fail for invalid JSON', async () => {
    const metric = new IsJsonMetric(
      'test-json',
      'JSON Test',
      'Test JSON metric',
      {}
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: '{"name": John}'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.score).toBe(0)
    expect(result.details.isValidJson).toBe(false)
    expect(result.details.validationErrors[0]).toContain('Invalid JSON')
  })
})

describe('LevenshteinMetric', () => {
  it('should pass when strings are identical', async () => {
    const metric = new LevenshteinMetric(
      'test-levenshtein',
      'Levenshtein Test',
      'Test Levenshtein metric',
      { threshold: 0.8 }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello World',
      expectedOutput: 'Hello World'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.similarity).toBe(1)
    expect(result.details.distance).toBe(0)
  })

  it('should calculate similarity correctly', async () => {
    const metric = new LevenshteinMetric(
      'test-levenshtein',
      'Levenshtein Test',
      'Test Levenshtein metric',
      { threshold: 0.7 }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello World',
      expectedOutput: 'Hello Word' // missing 'l'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true) // similarity should be > 0.7
    expect(result.score).toBeGreaterThan(0.7)
    expect(result.details.distance).toBe(1)
    expect(result.details.similarity).toBeCloseTo(0.91, 2) // 10/11
  })

  it('should fail when similarity is below threshold', async () => {
    const metric = new LevenshteinMetric(
      'test-levenshtein',
      'Levenshtein Test',
      'Test Levenshtein metric',
      { threshold: 0.9 }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'Hello World',
      expectedOutput: 'Goodbye Universe'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(false)
    expect(result.score).toBeLessThan(0.9)
    expect(result.details.distance).toBeGreaterThan(1)
  })

  it('should handle case sensitivity', async () => {
    const metric = new LevenshteinMetric(
      'test-levenshtein',
      'Levenshtein Test',
      'Test Levenshtein metric',
      { 
        threshold: 1.0,
        caseSensitive: false
      }
    )

    const context: EvaluationContext = {
      input: 'test input',
      output: 'HELLO WORLD',
      expectedOutput: 'hello world'
    }

    const result = await metric.evaluate(context)
    
    expect(result.passed).toBe(true)
    expect(result.score).toBe(1)
    expect(result.details.similarity).toBe(1)
  })
})

describe('MetricFactory', () => {
  it('should create metric instances correctly', () => {
    const metric = MetricFactory.createMetric(
      'contains',
      'test-id',
      'Test Metric',
      'Test description',
      { expectedText: ['test'] }
    )

    expect(metric).toBeInstanceOf(ContainsMetric)
    expect(metric.id).toBe('test-id')
    expect(metric.name).toBe('Test Metric')
    expect(metric.description).toBe('Test description')
  })

  it('should throw error for unknown metric type', () => {
    expect(() => {
      MetricFactory.createMetric(
        'unknown',
        'test-id',
        'Test Metric',
        'Test description',
        {}
      )
    }).toThrow('Unknown metric type: unknown')
  })

  it('should return supported metric types', () => {
    const types = MetricFactory.getSupportedTypes()
    expect(types).toContain('contains')
    expect(types).toContain('equals')
    expect(types).toContain('regex')
    expect(types).toContain('is_json')
    expect(types).toContain('levenshtein')
  })

  it('should return metric type information', () => {
    const info = MetricFactory.getMetricTypeInfo()
    expect(info.contains).toBeDefined()
    expect(info.contains.name).toBe('Contains Text')
    expect(info.contains.configSchema).toBeDefined()
    expect(info.contains.configSchema.expectedText).toBeDefined()
  })
})

// Integration test with all metrics
describe('Metrics Integration', () => {
  it('should handle realistic evaluation scenarios', async () => {
    const scenarios = [
      {
        metric: new ContainsMetric('1', 'Contains', 'desc', { expectedText: ['error', 'success'] }),
        context: { input: 'test', output: 'The operation was successful' },
        shouldPass: true
      },
      {
        metric: new EqualsMetric('2', 'Equals', 'desc', { caseSensitive: false }),
        context: { input: 'test', output: 'YES', expectedOutput: 'yes' },
        shouldPass: true
      },
      {
        metric: new RegexMetric('3', 'Regex', 'desc', { pattern: '^[A-Z]+$' }),
        context: { input: 'test', output: 'VALID' },
        shouldPass: true
      },
      {
        metric: new IsJsonMetric('4', 'JSON', 'desc', { strict: true }),
        context: { input: 'test', output: '{"result": "success"}' },
        shouldPass: true
      },
      {
        metric: new LevenshteinMetric('5', 'Similarity', 'desc', { threshold: 0.8 }),
        context: { input: 'test', output: 'Hello World', expectedOutput: 'Hello Word' },
        shouldPass: true
      }
    ]

    for (const scenario of scenarios) {
      const result = await scenario.metric.evaluate(scenario.context)
      expect(result.passed).toBe(scenario.shouldPass)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
      expect(result.executionTime).toBeGreaterThan(0)
      expect(result.details).toBeDefined()
    }
  })
})