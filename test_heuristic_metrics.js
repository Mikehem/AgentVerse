#!/usr/bin/env node
/**
 * Test Heuristic Metrics on Real Project Data
 * 
 * This script tests the heuristic evaluation metrics using actual data
 * from project-1758269313646 to verify the evaluation system works.
 */

const { MetricFactory } = require('./SprintAgentLens/frontend/src/lib/evaluation/metrics.ts');

async function testHeuristicMetrics() {
    console.log('🧪 Testing Heuristic Metrics on Real Project Data');
    console.log('=' .repeat(60));
    
    try {
        // Test data from actual agent metadata
        const testOutput = JSON.stringify({
            agent_id: "agent_ordercoo_mfqmq9mc",
            agent_name: "Order Coordinator Agent", 
            agent_role: "orchestrator",
            status: "payment approved",
            workflow: "shipping coordinated"
        });
        
        console.log('📋 Test Output:', testOutput);
        console.log();
        
        // Test 1: Contains Metric
        console.log('🔍 Test 1: Contains Metric');
        const containsMetric = MetricFactory.createMetric(
            'contains',
            'test_contains',
            'Test Contains Metric',
            'Tests if output contains expected terms',
            {
                expectedText: ['agent', 'coordinator', 'approved'],
                caseSensitive: false,
                matchType: 'any'
            }
        );
        
        const containsResult = await containsMetric.evaluate({
            input: 'test input',
            output: testOutput
        });
        
        console.log('   Result:', {
            score: containsResult.score,
            passed: containsResult.passed,
            foundCount: containsResult.details.foundCount,
            totalCount: containsResult.details.totalCount
        });
        console.log();
        
        // Test 2: Regex Metric  
        console.log('🔍 Test 2: Regex Metric');
        const regexMetric = MetricFactory.createMetric(
            'regex',
            'test_regex',
            'Test Regex Metric', 
            'Tests regex pattern matching',
            {
                pattern: 'agent_\\w+',
                flags: 'gi',
                matchType: 'matchAll',
                minMatches: 1
            }
        );
        
        const regexResult = await regexMetric.evaluate({
            input: 'test input',
            output: testOutput
        });
        
        console.log('   Result:', {
            score: regexResult.score,
            passed: regexResult.passed,
            matchCount: regexResult.details.matchCount,
            pattern: regexResult.details.pattern
        });
        console.log();
        
        // Test 3: JSON Validation Metric
        console.log('🔍 Test 3: JSON Validation Metric');
        const jsonMetric = MetricFactory.createMetric(
            'is_json',
            'test_json',
            'Test JSON Metric',
            'Tests if output is valid JSON',
            {
                strict: true,
                allowEmpty: false,
                minKeys: 3
            }
        );
        
        const jsonResult = await jsonMetric.evaluate({
            input: 'test input', 
            output: testOutput
        });
        
        console.log('   Result:', {
            score: jsonResult.score,
            passed: jsonResult.passed,
            isValidJson: jsonResult.details.isValidJson,
            keyCount: jsonResult.details.keyCount
        });
        console.log();
        
        // Summary
        const allTestsPassed = containsResult.passed && regexResult.passed && jsonResult.passed;
        
        console.log('📊 Test Summary:');
        console.log('   Contains Test:', containsResult.passed ? '✅ PASSED' : '❌ FAILED');
        console.log('   Regex Test:', regexResult.passed ? '✅ PASSED' : '❌ FAILED'); 
        console.log('   JSON Test:', jsonResult.passed ? '✅ PASSED' : '❌ FAILED');
        console.log();
        console.log('🎉 Overall Result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');
        
        return allTestsPassed;
        
    } catch (error) {
        console.error('❌ Error testing heuristic metrics:', error.message);
        return false;
    }
}

// Run the test
if (require.main === module) {
    testHeuristicMetrics()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { testHeuristicMetrics };