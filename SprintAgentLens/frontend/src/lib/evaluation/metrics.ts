// Core heuristic metrics implementation for evaluation system

export interface MetricConfig {
  [key: string]: any
}

export interface MetricResult {
  score: number
  passed: boolean
  details: Record<string, any>
  executionTime: number
}

export interface EvaluationContext {
  input: string
  output: string
  expectedOutput?: string
  metadata?: Record<string, any>
}

export abstract class BaseMetric {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly config: MetricConfig
  ) {}

  abstract evaluate(context: EvaluationContext): Promise<MetricResult>

  protected createResult(
    score: number,
    passed: boolean,
    details: Record<string, any> = {},
    executionTime: number
  ): MetricResult {
    return {
      score: Math.max(0, Math.min(1, score)), // Clamp between 0 and 1
      passed,
      details,
      executionTime
    }
  }
}

// Contains Text Metric
export class ContainsMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output } = context
    const { 
      expectedText = [], 
      case_sensitive = false, 
      match_type = 'any' 
    } = this.config

    if (!Array.isArray(expectedText) || expectedText.length === 0) {
      throw new Error('ContainsMetric requires expectedText array in config')
    }

    const searchText = case_sensitive ? output : output.toLowerCase()
    const searchTargets = expectedText.map((text: string) => 
      case_sensitive ? text : text.toLowerCase()
    )

    const matches = searchTargets.map(target => ({
      text: target,
      found: searchText.includes(target),
      positions: this.findAllOccurrences(searchText, target)
    }))

    const foundCount = matches.filter(m => m.found).length
    const totalCount = matches.length

    let passed: boolean
    let score: number

    if (match_type === 'all') {
      passed = foundCount === totalCount
      score = foundCount / totalCount
    } else { // 'any'
      passed = foundCount > 0
      score = foundCount > 0 ? 1 : 0
    }

    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      matches,
      foundCount,
      totalCount,
      match_type,
      case_sensitive
    }, executionTime)
  }

  private findAllOccurrences(text: string, target: string): number[] {
    const positions: number[] = []
    let position = 0
    
    while ((position = text.indexOf(target, position)) !== -1) {
      positions.push(position)
      position += target.length
    }
    
    return positions
  }
}

// Exact Match Metric
export class EqualsMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output, expectedOutput } = context
    const { 
      caseSensitive = false, 
      trimWhitespace = true,
      normalizeWhitespace = false
    } = this.config

    if (!expectedOutput) {
      throw new Error('EqualsMetric requires expectedOutput in context')
    }

    let actualOutput = output
    let expectedText = expectedOutput

    if (trimWhitespace) {
      actualOutput = actualOutput.trim()
      expectedText = expectedText.trim()
    }

    if (normalizeWhitespace) {
      actualOutput = actualOutput.replace(/\s+/g, ' ')
      expectedText = expectedText.replace(/\s+/g, ' ')
    }

    if (!caseSensitive) {
      actualOutput = actualOutput.toLowerCase()
      expectedText = expectedText.toLowerCase()
    }

    const matches = actualOutput === expectedText
    const score = matches ? 1 : 0
    const similarity = this.calculateSimilarity(actualOutput, expectedText)

    const executionTime = performance.now() - startTime

    return this.createResult(score, matches, {
      actualOutput,
      expectedText,
      similarity,
      caseSensitive,
      trimWhitespace,
      normalizeWhitespace
    }, executionTime)
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2
    const shorter = str1.length > str2.length ? str2 : str1
    
    if (longer.length === 0) return 1
    
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }
}

// Regex Pattern Metric
export class RegexMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output } = context
    const { 
      pattern,
      flags = 'i',
      matchType = 'test', // 'test', 'match', 'matchAll'
      minMatches = 1
    } = this.config

    if (!pattern) {
      throw new Error('RegexMetric requires pattern in config')
    }

    let regex: RegExp
    try {
      regex = new RegExp(pattern, flags)
    } catch (error) {
      throw new Error(`Invalid regex pattern: ${pattern}`)
    }

    let matches: any[] = []
    let passed = false
    let score = 0

    switch (matchType) {
      case 'test':
        passed = regex.test(output)
        score = passed ? 1 : 0
        matches = passed ? [{ match: true }] : []
        break

      case 'match':
        const matchResult = output.match(regex)
        matches = matchResult ? [matchResult] : []
        passed = matches.length >= minMatches
        score = passed ? 1 : 0
        break

      case 'matchAll':
        matches = Array.from(output.matchAll(new RegExp(pattern, flags + 'g')))
        passed = matches.length >= minMatches
        score = Math.min(matches.length / minMatches, 1)
        break

      default:
        throw new Error(`Invalid matchType: ${matchType}`)
    }

    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      pattern,
      flags,
      matchType,
      matches: matches.map(m => ({
        match: m[0] || m,
        index: m.index,
        groups: m.groups
      })),
      matchCount: matches.length,
      minMatches
    }, executionTime)
  }
}

// JSON Validation Metric
export class IsJsonMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output } = context
    const { 
      strict = true, 
      allowEmpty = false,
      expectedSchema = null,
      minKeys = 0
    } = this.config

    let passed = false
    let score = 0
    let parsedJson: any = null
    let validationErrors: string[] = []

    try {
      if (!allowEmpty && output.trim() === '') {
        validationErrors.push('Empty output not allowed')
      } else {
        parsedJson = JSON.parse(output)
        
        if (strict && typeof parsedJson !== 'object') {
          validationErrors.push('JSON must be an object when strict mode is enabled')
        } else if (parsedJson === null) {
          validationErrors.push('JSON cannot be null')
        } else if (Array.isArray(parsedJson) && strict) {
          validationErrors.push('JSON cannot be an array when strict mode is enabled')
        } else {
          // Valid JSON object
          passed = true
          score = 1

          // Additional validations
          if (typeof parsedJson === 'object' && parsedJson !== null) {
            const keyCount = Object.keys(parsedJson).length
            
            if (keyCount < minKeys) {
              validationErrors.push(`JSON object must have at least ${minKeys} keys, found ${keyCount}`)
              passed = false
              score = keyCount / minKeys
            }

            // Schema validation if provided
            if (expectedSchema && passed) {
              const schemaValidation = this.validateSchema(parsedJson, expectedSchema)
              if (!schemaValidation.valid) {
                validationErrors.push(...schemaValidation.errors)
                passed = false
                score = schemaValidation.score
              }
            }
          }
        }
      }
    } catch (error) {
      validationErrors.push(`Invalid JSON: ${error.message}`)
    }

    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      isValidJson: validationErrors.length === 0,
      parsedJson,
      validationErrors,
      strict,
      allowEmpty,
      keyCount: parsedJson && typeof parsedJson === 'object' ? Object.keys(parsedJson).length : 0,
      jsonType: Array.isArray(parsedJson) ? 'array' : typeof parsedJson
    }, executionTime)
  }

  private validateSchema(json: any, schema: any): { valid: boolean; errors: string[]; score: number } {
    const errors: string[] = []
    let validFields = 0
    let totalFields = 0

    for (const [key, expectedType] of Object.entries(schema)) {
      totalFields++
      
      if (!(key in json)) {
        errors.push(`Missing required field: ${key}`)
      } else if (typeof json[key] !== expectedType) {
        errors.push(`Field ${key} should be ${expectedType}, got ${typeof json[key]}`)
      } else {
        validFields++
      }
    }

    const score = totalFields > 0 ? validFields / totalFields : 1
    return {
      valid: errors.length === 0,
      errors,
      score
    }
  }
}

// Levenshtein Distance/Similarity Metric
export class LevenshteinMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output, expectedOutput } = context
    const { 
      threshold = 0.8, 
      normalize = true,
      caseSensitive = false,
      trimWhitespace = true
    } = this.config

    if (!expectedOutput) {
      throw new Error('LevenshteinMetric requires expectedOutput in context')
    }

    let str1 = output
    let str2 = expectedOutput

    if (trimWhitespace) {
      str1 = str1.trim()
      str2 = str2.trim()
    }

    if (!caseSensitive) {
      str1 = str1.toLowerCase()
      str2 = str2.toLowerCase()
    }

    const distance = this.calculateLevenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    
    let similarity: number
    if (normalize && maxLength > 0) {
      similarity = 1 - (distance / maxLength)
    } else {
      similarity = maxLength === 0 ? 1 : 1 - (distance / maxLength)
    }

    const passed = similarity >= threshold
    const score = similarity

    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      distance,
      similarity,
      threshold,
      maxLength,
      str1Length: str1.length,
      str2Length: str2.length,
      normalize,
      caseSensitive,
      trimWhitespace
    }, executionTime)
  }

  private calculateLevenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }
}

// Sentence BLEU Metric
export class SentenceBLEUMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output, expectedOutput } = context
    const { 
      smoothing = true,
      weights = [0.25, 0.25, 0.25, 0.25] // default uniform weights for 1-4 grams
    } = this.config

    if (!expectedOutput) {
      throw new Error('SentenceBLEUMetric requires expectedOutput in context')
    }

    // Simple BLEU implementation (for full implementation, you'd use a proper BLEU library)
    const candidateTokens = output.toLowerCase().split(/\s+/)
    const referenceTokens = expectedOutput.toLowerCase().split(/\s+/)
    
    // Calculate n-gram precision for n=1 to 4
    const precisions: number[] = []
    for (let n = 1; n <= 4; n++) {
      const candidateNgrams = this.getNgrams(candidateTokens, n)
      const referenceNgrams = this.getNgrams(referenceTokens, n)
      
      if (candidateNgrams.length === 0) {
        precisions.push(0)
        continue
      }
      
      let matches = 0
      const refCounts = this.countNgrams(referenceNgrams)
      
      for (const ngram of candidateNgrams) {
        if (refCounts[ngram] > 0) {
          matches++
          refCounts[ngram]--
        }
      }
      
      const precision = matches / candidateNgrams.length
      precisions.push(smoothing && precision === 0 ? 1e-7 : precision)
    }
    
    // Calculate brevity penalty
    const candLength = candidateTokens.length
    const refLength = referenceTokens.length
    const brevityPenalty = candLength >= refLength ? 1 : Math.exp(1 - refLength / candLength)
    
    // Calculate weighted geometric mean
    const logSum = precisions.reduce((sum, p, i) => sum + weights[i] * Math.log(p), 0)
    const score = brevityPenalty * Math.exp(logSum)
    
    const passed = score >= (this.config.threshold || 0.5)
    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      precisions,
      brevityPenalty,
      candidateLength: candLength,
      referenceLength: refLength,
      smoothing,
      weights
    }, executionTime)
  }

  private getNgrams(tokens: string[], n: number): string[] {
    const ngrams: string[] = []
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '))
    }
    return ngrams
  }

  private countNgrams(ngrams: string[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const ngram of ngrams) {
      counts[ngram] = (counts[ngram] || 0) + 1
    }
    return counts
  }
}

// Corpus BLEU Metric
export class CorpusBLEUMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output, expectedOutput } = context
    const { 
      smoothing = true,
      weights = [0.25, 0.25, 0.25, 0.25]
    } = this.config

    if (!expectedOutput) {
      throw new Error('CorpusBLEUMetric requires expectedOutput in context')
    }

    // For corpus BLEU, we'd typically have multiple candidates and references
    // This is a simplified version treating single sentence as corpus
    const candidateTokens = output.toLowerCase().split(/\s+/)
    const referenceTokens = expectedOutput.toLowerCase().split(/\s+/)
    
    let totalCandLength = candidateTokens.length
    let totalRefLength = referenceTokens.length
    const ngramCounts: number[] = [0, 0, 0, 0]
    const ngramTotals: number[] = [0, 0, 0, 0]
    
    for (let n = 1; n <= 4; n++) {
      const candidateNgrams = this.getNgrams(candidateTokens, n)
      const referenceNgrams = this.getNgrams(referenceTokens, n)
      
      ngramTotals[n-1] += candidateNgrams.length
      
      const refCounts = this.countNgrams(referenceNgrams)
      for (const ngram of candidateNgrams) {
        if (refCounts[ngram] > 0) {
          ngramCounts[n-1]++
          refCounts[ngram]--
        }
      }
    }
    
    const precisions = ngramCounts.map((count, i) => 
      ngramTotals[i] > 0 ? count / ngramTotals[i] : (smoothing ? 1e-7 : 0)
    )
    
    const brevityPenalty = totalCandLength >= totalRefLength ? 1 : Math.exp(1 - totalRefLength / totalCandLength)
    const logSum = precisions.reduce((sum, p, i) => sum + weights[i] * Math.log(p), 0)
    const score = brevityPenalty * Math.exp(logSum)
    
    const passed = score >= (this.config.threshold || 0.5)
    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      precisions,
      brevityPenalty,
      totalCandidateLength: totalCandLength,
      totalReferenceLength: totalRefLength,
      ngramCounts,
      ngramTotals
    }, executionTime)
  }

  private getNgrams(tokens: string[], n: number): string[] {
    const ngrams: string[] = []
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '))
    }
    return ngrams
  }

  private countNgrams(ngrams: string[]): Record<string, number> {
    const counts: Record<string, number> = {}
    for (const ngram of ngrams) {
      counts[ngram] = (counts[ngram] || 0) + 1
    }
    return counts
  }
}

// Sentiment Metric
export class SentimentMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output } = context
    const { 
      expectedSentiment = 'positive',
      threshold = 0.7
    } = this.config

    // Simple sentiment analysis using keyword matching
    // In a real implementation, you'd use a proper sentiment analysis library
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'happy', 'pleased']
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'dislike', 'angry', 'sad', 'disappointed', 'frustrated']
    
    const text = output.toLowerCase()
    const words = text.split(/\s+/)
    
    let positiveCount = 0
    let negativeCount = 0
    
    for (const word of words) {
      if (positiveWords.some(pos => word.includes(pos))) {
        positiveCount++
      }
      if (negativeWords.some(neg => word.includes(neg))) {
        negativeCount++
      }
    }
    
    const totalSentimentWords = positiveCount + negativeCount
    let sentimentScore = 0.5 // neutral
    let detectedSentiment = 'neutral'
    
    if (totalSentimentWords > 0) {
      sentimentScore = positiveCount / totalSentimentWords
      if (sentimentScore > 0.6) {
        detectedSentiment = 'positive'
      } else if (sentimentScore < 0.4) {
        detectedSentiment = 'negative'
      }
    }
    
    const matches = detectedSentiment === expectedSentiment
    const score = matches ? sentimentScore : 1 - sentimentScore
    const passed = score >= threshold
    
    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      detectedSentiment,
      expectedSentiment,
      sentimentScore,
      positiveCount,
      negativeCount,
      totalWords: words.length,
      sentimentWords: totalSentimentWords
    }, executionTime)
  }
}

// ROUGE Metric
export class ROUGEMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { output, expectedOutput } = context
    const { 
      rougeType = 'rouge-1', // rouge-1, rouge-2, rouge-l
      beta = 1.2 // F-score beta parameter
    } = this.config

    if (!expectedOutput) {
      throw new Error('ROUGEMetric requires expectedOutput in context')
    }

    const candidateTokens = output.toLowerCase().split(/\s+/)
    const referenceTokens = expectedOutput.toLowerCase().split(/\s+/)
    
    let score = 0
    let precision = 0
    let recall = 0
    let details: any = {}
    
    switch (rougeType) {
      case 'rouge-1':
        ({ score, precision, recall, details } = this.calculateRouge1(candidateTokens, referenceTokens, beta))
        break
      case 'rouge-2':
        ({ score, precision, recall, details } = this.calculateRouge2(candidateTokens, referenceTokens, beta))
        break
      case 'rouge-l':
        ({ score, precision, recall, details } = this.calculateRougeL(candidateTokens, referenceTokens, beta))
        break
      default:
        throw new Error(`Unsupported ROUGE type: ${rougeType}`)
    }
    
    const passed = score >= (this.config.threshold || 0.5)
    const executionTime = performance.now() - startTime

    return this.createResult(score, passed, {
      rougeType,
      precision,
      recall,
      fScore: score,
      beta,
      ...details
    }, executionTime)
  }

  private calculateRouge1(candidate: string[], reference: string[], beta: number) {
    const candidateSet = new Set(candidate)
    const referenceSet = new Set(reference)
    
    const overlap = [...candidateSet].filter(token => referenceSet.has(token)).length
    
    const precision = candidateSet.size > 0 ? overlap / candidateSet.size : 0
    const recall = referenceSet.size > 0 ? overlap / referenceSet.size : 0
    
    const fScore = this.calculateFScore(precision, recall, beta)
    
    return {
      score: fScore,
      precision,
      recall,
      details: {
        overlap,
        candidateUnigrams: candidateSet.size,
        referenceUnigrams: referenceSet.size
      }
    }
  }

  private calculateRouge2(candidate: string[], reference: string[], beta: number) {
    const candidateBigrams = this.getNgrams(candidate, 2)
    const referenceBigrams = this.getNgrams(reference, 2)
    
    const candidateSet = new Set(candidateBigrams)
    const referenceSet = new Set(referenceBigrams)
    
    const overlap = [...candidateSet].filter(bigram => referenceSet.has(bigram)).length
    
    const precision = candidateSet.size > 0 ? overlap / candidateSet.size : 0
    const recall = referenceSet.size > 0 ? overlap / referenceSet.size : 0
    
    const fScore = this.calculateFScore(precision, recall, beta)
    
    return {
      score: fScore,
      precision,
      recall,
      details: {
        overlap,
        candidateBigrams: candidateSet.size,
        referenceBigrams: referenceSet.size
      }
    }
  }

  private calculateRougeL(candidate: string[], reference: string[], beta: number) {
    const lcs = this.longestCommonSubsequence(candidate, reference)
    
    const precision = candidate.length > 0 ? lcs / candidate.length : 0
    const recall = reference.length > 0 ? lcs / reference.length : 0
    
    const fScore = this.calculateFScore(precision, recall, beta)
    
    return {
      score: fScore,
      precision,
      recall,
      details: {
        lcsLength: lcs,
        candidateLength: candidate.length,
        referenceLength: reference.length
      }
    }
  }

  private calculateFScore(precision: number, recall: number, beta: number): number {
    if (precision + recall === 0) return 0
    return (1 + beta * beta) * precision * recall / (beta * beta * precision + recall)
  }

  private getNgrams(tokens: string[], n: number): string[] {
    const ngrams: string[] = []
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '))
    }
    return ngrams
  }

  private longestCommonSubsequence(seq1: string[], seq2: string[]): number {
    const m = seq1.length
    const n = seq2.length
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (seq1[i - 1] === seq2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        }
      }
    }
    
    return dp[m][n]
  }
}

// Aggregated Metric
export class AggregatedMetric extends BaseMetric {
  async evaluate(context: EvaluationContext): Promise<MetricResult> {
    const startTime = performance.now()
    
    const { 
      metrics = [],
      aggregationMethod = 'mean', // mean, weighted_mean, min, max
      weights = []
    } = this.config

    if (!metrics || metrics.length === 0) {
      throw new Error('AggregatedMetric requires metrics array in config')
    }

    const results: any[] = []
    const scores: number[] = []
    
    // Execute each metric
    for (let i = 0; i < metrics.length; i++) {
      const metricConfig = metrics[i]
      const MetricClass = this.getMetricClass(metricConfig.type)
      
      if (!MetricClass) {
        throw new Error(`Unknown metric type: ${metricConfig.type}`)
      }
      
      const metric = new MetricClass(
        `${this.id}_${metricConfig.type}_${i}`,
        metricConfig.name || metricConfig.type,
        metricConfig.description || '',
        metricConfig.config || {}
      )
      
      const result = await metric.evaluate(context)
      results.push(result)
      scores.push(result.score)
    }
    
    // Aggregate scores
    let aggregatedScore: number
    switch (aggregationMethod) {
      case 'mean':
        aggregatedScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
        break
      case 'weighted_mean':
        if (weights.length !== scores.length) {
          throw new Error('Weights array must have same length as metrics array')
        }
        const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
        aggregatedScore = scores.reduce((sum, score, i) => sum + score * weights[i], 0) / weightSum
        break
      case 'min':
        aggregatedScore = Math.min(...scores)
        break
      case 'max':
        aggregatedScore = Math.max(...scores)
        break
      default:
        throw new Error(`Unknown aggregation method: ${aggregationMethod}`)
    }
    
    const passed = aggregatedScore >= (this.config.threshold || 0.5)
    const executionTime = performance.now() - startTime

    return this.createResult(aggregatedScore, passed, {
      aggregationMethod,
      individualResults: results,
      individualScores: scores,
      weights: weights.length > 0 ? weights : undefined,
      metricsCount: metrics.length
    }, executionTime)
  }

  private getMetricClass(type: string): any {
    const metricTypes: Record<string, any> = {
      'contains': ContainsMetric,
      'equals': EqualsMetric,
      'regex': RegexMetric,
      'regexmatch': RegexMetric,
      'is_json': IsJsonMetric,
      'isjson': IsJsonMetric,
      'levenshtein': LevenshteinMetric,
      'levenshteinratio': LevenshteinMetric,
      'sentencebleu': SentenceBLEUMetric,
      'corpusbleu': CorpusBLEUMetric,
      'sentiment': SentimentMetric,
      'rouge': ROUGEMetric
    }
    return metricTypes[type.toLowerCase()]
  }
}

// Metric Factory
export class MetricFactory {
  private static readonly metricTypes = {
    'contains': ContainsMetric,
    'equals': EqualsMetric,
    'regex': RegexMetric,
    'regexmatch': RegexMetric, // Opik standard name
    'is_json': IsJsonMetric,
    'isjson': IsJsonMetric, // Opik standard name
    'levenshtein': LevenshteinMetric,
    'levenshteinratio': LevenshteinMetric, // Opik standard name
    'sentencebleu': SentenceBLEUMetric, // Opik metric
    'corpusbleu': CorpusBLEUMetric, // Opik metric
    'sentiment': SentimentMetric, // Opik metric
    'rouge': ROUGEMetric, // Opik metric
    'aggregatedmetric': AggregatedMetric // Opik metric
  }

  static createMetric(
    type: string,
    id: string,
    name: string,
    description: string,
    config: MetricConfig
  ): BaseMetric {
    const MetricClass = this.metricTypes[type as keyof typeof this.metricTypes]
    
    if (!MetricClass) {
      throw new Error(`Unknown metric type: ${type}`)
    }

    return new MetricClass(id, name, description, config)
  }

  static getSupportedTypes(): string[] {
    return Object.keys(this.metricTypes)
  }

  static getMetricTypeInfo() {
    return {
      contains: {
        name: 'Contains Text',
        description: 'Checks if the output contains specific text or phrases',
        configSchema: {
          expectedText: { type: 'array', required: true, description: 'Array of text strings to search for' },
          caseSensitive: { type: 'boolean', default: false, description: 'Whether search is case sensitive' },
          matchType: { type: 'string', enum: ['any', 'all'], default: 'any', description: 'Whether any or all text must be found' }
        }
      },
      equals: {
        name: 'Exact Match',
        description: 'Checks if the output exactly matches expected text',
        configSchema: {
          caseSensitive: { type: 'boolean', default: false, description: 'Whether comparison is case sensitive' },
          trimWhitespace: { type: 'boolean', default: true, description: 'Whether to trim whitespace before comparison' },
          normalizeWhitespace: { type: 'boolean', default: false, description: 'Whether to normalize whitespace' }
        }
      },
      regex: {
        name: 'Regex Pattern',
        description: 'Checks if the output matches a regular expression pattern',
        configSchema: {
          pattern: { type: 'string', required: true, description: 'Regular expression pattern' },
          flags: { type: 'string', default: 'i', description: 'Regex flags (i, g, m, etc.)' },
          matchType: { type: 'string', enum: ['test', 'match', 'matchAll'], default: 'test', description: 'Type of regex matching' },
          minMatches: { type: 'number', default: 1, description: 'Minimum number of matches required' }
        }
      },
      regexmatch: {
        name: 'Regex Match (Opik)',
        description: 'Checks if the output matches a regular expression pattern (Opik standard)',
        configSchema: {
          pattern: { type: 'string', required: true, description: 'Regular expression pattern' },
          flags: { type: 'string', default: 'i', description: 'Regex flags (i, g, m, etc.)' },
          matchType: { type: 'string', enum: ['test', 'match', 'matchAll'], default: 'test', description: 'Type of regex matching' },
          minMatches: { type: 'number', default: 1, description: 'Minimum number of matches required' }
        }
      },
      is_json: {
        name: 'Valid JSON',
        description: 'Checks if the output is valid JSON format',
        configSchema: {
          strict: { type: 'boolean', default: true, description: 'Whether JSON must be an object' },
          allowEmpty: { type: 'boolean', default: false, description: 'Whether empty output is allowed' },
          expectedSchema: { type: 'object', description: 'Expected JSON schema for validation' },
          minKeys: { type: 'number', default: 0, description: 'Minimum number of keys required' }
        }
      },
      isjson: {
        name: 'Is JSON (Opik)',
        description: 'Checks if the output is valid JSON format (Opik standard)',
        configSchema: {
          strict: { type: 'boolean', default: true, description: 'Whether JSON must be an object' },
          allowEmpty: { type: 'boolean', default: false, description: 'Whether empty output is allowed' },
          expectedSchema: { type: 'object', description: 'Expected JSON schema for validation' },
          minKeys: { type: 'number', default: 0, description: 'Minimum number of keys required' }
        }
      },
      levenshtein: {
        name: 'Text Similarity',
        description: 'Measures text similarity using Levenshtein distance',
        configSchema: {
          threshold: { type: 'number', default: 0.8, min: 0, max: 1, description: 'Similarity threshold (0-1)' },
          normalize: { type: 'boolean', default: true, description: 'Whether to normalize the similarity score' },
          caseSensitive: { type: 'boolean', default: false, description: 'Whether comparison is case sensitive' },
          trimWhitespace: { type: 'boolean', default: true, description: 'Whether to trim whitespace before comparison' }
        }
      },
      levenshteinratio: {
        name: 'Levenshtein Ratio (Opik)',
        description: 'Measures text similarity using Levenshtein distance (Opik standard)',
        configSchema: {
          threshold: { type: 'number', default: 0.8, min: 0, max: 1, description: 'Similarity threshold (0-1)' },
          normalize: { type: 'boolean', default: true, description: 'Whether to normalize the similarity score' },
          caseSensitive: { type: 'boolean', default: false, description: 'Whether comparison is case sensitive' },
          trimWhitespace: { type: 'boolean', default: true, description: 'Whether to trim whitespace before comparison' }
        }
      },
      sentencebleu: {
        name: 'Sentence BLEU',
        description: 'Measures text similarity using BLEU score for single sentences',
        configSchema: {
          threshold: { type: 'number', default: 0.5, min: 0, max: 1, description: 'BLEU score threshold (0-1)' },
          smoothing: { type: 'boolean', default: true, description: 'Whether to apply smoothing for zero precision' },
          weights: { type: 'array', default: '[0.25, 0.25, 0.25, 0.25]', description: 'N-gram weights (comma-separated)' }
        }
      },
      corpusbleu: {
        name: 'Corpus BLEU',
        description: 'Measures text similarity using BLEU score for corpus-level evaluation',
        configSchema: {
          threshold: { type: 'number', default: 0.5, min: 0, max: 1, description: 'BLEU score threshold (0-1)' },
          smoothing: { type: 'boolean', default: true, description: 'Whether to apply smoothing for zero precision' },
          weights: { type: 'array', default: '[0.25, 0.25, 0.25, 0.25]', description: 'N-gram weights (comma-separated)' }
        }
      },
      sentiment: {
        name: 'Sentiment Analysis',
        description: 'Analyzes sentiment of the output text',
        configSchema: {
          expectedSentiment: { type: 'select', enum: ['positive', 'negative', 'neutral'], default: 'positive', description: 'Expected sentiment' },
          threshold: { type: 'number', default: 0.7, min: 0, max: 1, description: 'Confidence threshold (0-1)' }
        }
      },
      rouge: {
        name: 'ROUGE Score',
        description: 'Measures text similarity using ROUGE metrics',
        configSchema: {
          rougeType: { type: 'select', enum: ['rouge-1', 'rouge-2', 'rouge-l'], default: 'rouge-1', description: 'ROUGE variant to use' },
          threshold: { type: 'number', default: 0.5, min: 0, max: 1, description: 'ROUGE score threshold (0-1)' },
          beta: { type: 'number', default: 1.2, min: 0, max: 10, step: 0.1, description: 'F-score beta parameter' }
        }
      },
      aggregatedmetric: {
        name: 'Aggregated Metric',
        description: 'Combines multiple metrics using various aggregation methods',
        configSchema: {
          aggregationMethod: { type: 'select', enum: ['mean', 'weighted_mean', 'min', 'max'], default: 'mean', description: 'Aggregation method' },
          threshold: { type: 'number', default: 0.5, min: 0, max: 1, description: 'Combined score threshold (0-1)' },
          metrics: { type: 'text', description: 'JSON array of metric configurations', required: true }
        }
      }
    }
  }
}