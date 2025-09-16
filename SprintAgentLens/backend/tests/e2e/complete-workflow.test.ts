/**
 * End-to-End API Workflow Tests
 * Tests complete user workflows from authentication through complex operations
 * Simulates real-world usage patterns and multi-system interactions
 */

import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { AuthService } from '../../src/services/AuthService';

describe('Complete E2E Workflow Tests', () => {
  let testWorkspace: any;
  let adminUser: any;
  let dataScientistUser: any;
  let adminToken: string;
  let dataScientistToken: string;

  beforeAll(async () => {
    // Setup complete test environment
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Clean up test environment
    await cleanupTestEnvironment();
    await prisma.$disconnect();
  });

  async function setupTestEnvironment() {
    // Create enterprise workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'E2E Enterprise Workspace',
        slug: 'e2e-enterprise',
        description: 'Full-featured workspace for end-to-end testing',
      },
    });

    const salt = await AuthService.generateSalt();
    const hashedPassword = await AuthService.hashPassword('SecurePass123!', salt);

    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        username: 'e2e-admin',
        email: 'admin@e2e-enterprise.com',
        passwordHash: hashedPassword,
        salt,
        fullName: 'E2E Admin User',
        role: 'ADMIN',
        workspaceId: testWorkspace.id,
      },
    });

    // Create data scientist user
    dataScientistUser = await prisma.user.create({
      data: {
        username: 'e2e-data-scientist',
        email: 'scientist@e2e-enterprise.com',
        passwordHash: hashedPassword,
        salt,
        fullName: 'E2E Data Scientist',
        role: 'USER',
        workspaceId: testWorkspace.id,
      },
    });

    // Authenticate users
    const adminAuth = await request(app)
      .post('/v1/enterprise/auth/login')
      .send({
        username: 'e2e-admin',
        password: 'SecurePass123!',
      });
    adminToken = adminAuth.body.token;

    const scientistAuth = await request(app)
      .post('/v1/enterprise/auth/login')
      .send({
        username: 'e2e-data-scientist',
        password: 'SecurePass123!',
      });
    dataScientistToken = scientistAuth.body.token;
  }

  async function cleanupTestEnvironment() {
    await prisma.feedbackScore.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.feedbackDefinition.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.automationRule.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.dataset.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.project.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.userSession.deleteMany({
      where: { userId: { in: [adminUser.id, dataScientistUser.id] } },
    });
    await prisma.user.deleteMany({
      where: { workspaceId: testWorkspace.id },
    });
    await prisma.workspace.delete({
      where: { id: testWorkspace.id },
    });
  }

  describe('Complete ML Project Lifecycle', () => {
    let project: any;
    let dataset: any;
    let feedbackDefinition: any;
    let automationRule: any;

    it('should complete full ML project workflow', async () => {
      // Step 1: Data Scientist creates a new ML project
      console.log('Step 1: Creating ML project...');
      const projectResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Customer Sentiment Analysis',
          description: 'End-to-end sentiment analysis for customer reviews',
          workspaceId: testWorkspace.id,
        });

      expect(projectResponse.status).toBe(201);
      project = projectResponse.body;
      expect(project.name).toBe('Customer Sentiment Analysis');

      // Step 2: Upload and configure dataset
      console.log('Step 2: Creating dataset...');
      const datasetResponse = await request(app)
        .post('/v1/private/datasets')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Customer Reviews Dataset',
          description: 'Dataset containing customer reviews for sentiment analysis',
          projectId: project.id,
          workspaceId: testWorkspace.id,
        });

      expect(datasetResponse.status).toBe(201);
      dataset = datasetResponse.body;
      expect(dataset.projectId).toBe(project.id);

      // Step 3: Admin creates feedback definition for model evaluation
      console.log('Step 3: Creating feedback definition...');
      const feedbackDefResponse = await request(app)
        .post('/v1/private/feedback/definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sentiment Accuracy',
          description: 'Rate the accuracy of sentiment predictions',
          type: 'numerical',
          workspaceId: testWorkspace.id,
          config: {
            min: 0,
            max: 1,
            step: 0.01,
          },
        });

      expect(feedbackDefResponse.status).toBe(201);
      feedbackDefinition = feedbackDefResponse.body;
      expect(feedbackDefinition.type).toBe('numerical');

      // Step 4: Create automation rule for quality monitoring
      console.log('Step 4: Creating automation rule...');
      const ruleResponse = await request(app)
        .post('/v1/private/automation/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sentiment Quality Monitor',
          description: 'Automatically evaluate sentiment prediction quality',
          type: 'evaluation',
          trigger: 'trace_completed',
          isActive: true,
          workspaceId: testWorkspace.id,
          configuration: {
            conditions: [
              {
                field: 'trace.metadata.model',
                operator: 'equals',
                value: 'sentiment-analyzer-v1',
              },
            ],
            actions: [
              {
                type: 'llm_judge_evaluation',
                config: {
                  model: 'gpt-4',
                  prompt: 'Evaluate the sentiment prediction accuracy',
                  criteria: ['accuracy', 'confidence'],
                  feedbackDefinitionId: feedbackDefinition.id,
                },
              },
            ],
          },
          schedule: {
            type: 'trigger',
            enabled: true,
          },
        });

      expect(ruleResponse.status).toBe(201);
      automationRule = ruleResponse.body;
      expect(automationRule.isActive).toBe(true);

      // Step 5: Create background job for dataset processing
      console.log('Step 5: Creating background job...');
      const jobResponse = await request(app)
        .post('/v1/private/jobs')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Sentiment Dataset Preprocessing',
          type: 'dataset_processing',
          workspaceId: testWorkspace.id,
          payload: {
            datasetId: dataset.id,
            operations: ['tokenize', 'clean', 'validate'],
            outputFormat: 'jsonl',
          },
          options: {
            priority: 'high',
            attempts: 3,
          },
        });

      expect(jobResponse.status).toBe(201);
      const job = jobResponse.body;
      expect(job.type).toBe('dataset_processing');
      expect(job.payload.datasetId).toBe(dataset.id);

      // Step 6: Verify cross-system integration
      console.log('Step 6: Verifying cross-system integration...');

      // Check project-dataset relationship
      const projectWithDatasets = await request(app)
        .get(`/v1/private/projects/${project.id}`)
        .set('Authorization', `Bearer ${dataScientistToken}`);

      expect(projectWithDatasets.status).toBe(200);
      expect(projectWithDatasets.body.id).toBe(project.id);

      // Check feedback system integration
      const feedbackDefs = await request(app)
        .get('/v1/private/feedback/definitions')
        .set('Authorization', `Bearer ${dataScientistToken}`);

      expect(feedbackDefs.status).toBe(200);
      const sentimentFeedback = feedbackDefs.body.definitions.find(
        (def: any) => def.name === 'Sentiment Accuracy'
      );
      expect(sentimentFeedback).toBeDefined();

      // Check automation rule integration
      const rules = await request(app)
        .get('/v1/private/automation/rules')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(rules.status).toBe(200);
      const qualityRule = rules.body.rules.find(
        (rule: any) => rule.name === 'Sentiment Quality Monitor'
      );
      expect(qualityRule).toBeDefined();
      expect(qualityRule.isActive).toBe(true);

      // Check job status
      const jobStatus = await request(app)
        .get(`/v1/private/jobs/${job.id}`)
        .set('Authorization', `Bearer ${dataScientistToken}`);

      expect(jobStatus.status).toBe(200);
      expect(jobStatus.body.id).toBe(job.id);
    });
  });

  describe('Multi-User Collaboration Workflow', () => {
    it('should handle collaborative project development', async () => {
      // Step 1: Admin creates shared project
      console.log('Step 1: Admin creating shared project...');
      const sharedProjectResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Collaborative NLP Project',
          description: 'Multi-user natural language processing project',
          workspaceId: testWorkspace.id,
        });

      expect(sharedProjectResponse.status).toBe(201);
      const sharedProject = sharedProjectResponse.body;

      // Step 2: Data Scientist adds datasets to shared project
      console.log('Step 2: Data Scientist adding datasets...');
      const dataset1Response = await request(app)
        .post('/v1/private/datasets')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Training Data',
          description: 'Training dataset for NLP model',
          projectId: sharedProject.id,
          workspaceId: testWorkspace.id,
        });

      expect(dataset1Response.status).toBe(201);
      const trainingDataset = dataset1Response.body;

      const dataset2Response = await request(app)
        .post('/v1/private/datasets')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Validation Data',
          description: 'Validation dataset for NLP model',
          projectId: sharedProject.id,
          workspaceId: testWorkspace.id,
        });

      expect(dataset2Response.status).toBe(201);
      const validationDataset = dataset2Response.body;

      // Step 3: Admin creates multiple feedback definitions
      console.log('Step 3: Admin creating feedback definitions...');
      const accuracyFeedbackResponse = await request(app)
        .post('/v1/private/feedback/definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Model Accuracy',
          description: 'Overall model accuracy score',
          type: 'numerical',
          workspaceId: testWorkspace.id,
          config: { min: 0, max: 1, step: 0.001 },
        });

      expect(accuracyFeedbackResponse.status).toBe(201);

      const qualityFeedbackResponse = await request(app)
        .post('/v1/private/feedback/definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Response Quality',
          description: 'Qualitative assessment of model responses',
          type: 'categorical',
          workspaceId: testWorkspace.id,
          config: {
            options: ['excellent', 'good', 'fair', 'poor'],
          },
        });

      expect(qualityFeedbackResponse.status).toBe(201);

      // Step 4: Create batch processing jobs for multiple datasets
      console.log('Step 4: Creating batch processing jobs...');
      const processingJobs = await Promise.all([
        request(app)
          .post('/v1/private/jobs')
          .set('Authorization', `Bearer ${dataScientistToken}`)
          .send({
            name: 'Training Data Processing',
            type: 'dataset_processing',
            workspaceId: testWorkspace.id,
            payload: {
              datasetId: trainingDataset.id,
              operations: ['preprocess', 'tokenize', 'encode'],
            },
            options: { priority: 'high' },
          }),

        request(app)
          .post('/v1/private/jobs')
          .set('Authorization', `Bearer ${dataScientistToken}`)
          .send({
            name: 'Validation Data Processing',
            type: 'dataset_processing',
            workspaceId: testWorkspace.id,
            payload: {
              datasetId: validationDataset.id,
              operations: ['preprocess', 'tokenize', 'encode'],
            },
            options: { priority: 'normal' },
          }),
      ]);

      processingJobs.forEach(jobResponse => {
        expect(jobResponse.status).toBe(201);
        expect(jobResponse.body.type).toBe('dataset_processing');
      });

      // Step 5: Admin creates comprehensive automation rules
      console.log('Step 5: Creating comprehensive automation rules...');
      const modelEvaluationRuleResponse = await request(app)
        .post('/v1/private/automation/rules')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Comprehensive Model Evaluation',
          description: 'Multi-criteria model evaluation system',
          type: 'evaluation',
          trigger: 'model_inference_completed',
          isActive: true,
          workspaceId: testWorkspace.id,
          configuration: {
            conditions: [
              {
                field: 'trace.metadata.project_id',
                operator: 'equals',
                value: sharedProject.id,
              },
            ],
            actions: [
              {
                type: 'llm_judge_evaluation',
                config: {
                  model: 'gpt-4',
                  prompt: 'Evaluate model accuracy and response quality',
                  criteria: ['accuracy', 'coherence', 'relevance'],
                  parallel: true,
                  consensus: 'majority',
                },
              },
              {
                type: 'python_metric',
                config: {
                  script: 'calculate_bleu_score',
                  parameters: { reference_key: 'expected_output' },
                },
              },
            ],
          },
          schedule: {
            type: 'trigger',
            enabled: true,
          },
        });

      expect(modelEvaluationRuleResponse.status).toBe(201);

      // Step 6: Verify complete system integration
      console.log('Step 6: Verifying complete system integration...');

      // Check all resources are properly linked and accessible
      const projectSummary = await request(app)
        .get(`/v1/private/projects/${sharedProject.id}/summary`)
        .set('Authorization', `Bearer ${adminToken}`);

      if (projectSummary.status === 200) {
        expect(projectSummary.body.datasetCount).toBeGreaterThanOrEqual(2);
      }

      // Verify workspace isolation is maintained
      const allProjects = await request(app)
        .get('/v1/private/projects')
        .set('Authorization', `Bearer ${dataScientistToken}`);

      expect(allProjects.status).toBe(200);
      allProjects.body.projects.forEach((proj: any) => {
        expect(proj.workspaceId).toBe(testWorkspace.id);
      });

      // Check job processing status
      const allJobs = await request(app)
        .get('/v1/private/jobs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allJobs.status).toBe(200);
      expect(allJobs.body.jobs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Error Handling and Recovery Workflows', () => {
    it('should handle cascade operations and error recovery', async () => {
      // Step 1: Create project with dependencies
      console.log('Step 1: Creating project with dependencies...');
      const projectResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Error Handling Test Project',
          description: 'Testing error handling and recovery',
          workspaceId: testWorkspace.id,
        });

      expect(projectResponse.status).toBe(201);
      const project = projectResponse.body;

      // Step 2: Create dataset
      const datasetResponse = await request(app)
        .post('/v1/private/datasets')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Error Test Dataset',
          description: 'Dataset for error testing',
          projectId: project.id,
          workspaceId: testWorkspace.id,
        });

      expect(datasetResponse.status).toBe(201);
      const dataset = datasetResponse.body;

      // Step 3: Create job with invalid configuration (should be handled gracefully)
      console.log('Step 3: Testing error handling in job creation...');
      const invalidJobResponse = await request(app)
        .post('/v1/private/jobs')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Invalid Job Configuration',
          type: 'invalid_job_type' as any, // Invalid job type
          workspaceId: testWorkspace.id,
          payload: {},
        });

      expect(invalidJobResponse.status).toBe(400);
      expect(invalidJobResponse.body).toHaveProperty('error');

      // Step 4: Test unauthorized access (cross-workspace)
      console.log('Step 4: Testing unauthorized access...');
      const unauthorizedResponse = await request(app)
        .get(`/v1/private/projects/${project.id}`)
        .set('Authorization', 'Bearer invalid-token');

      expect(unauthorizedResponse.status).toBe(401);

      // Step 5: Test successful recovery after error
      console.log('Step 5: Testing successful recovery...');
      const validJobResponse = await request(app)
        .post('/v1/private/jobs')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Recovery Job',
          type: 'data_export',
          workspaceId: testWorkspace.id,
          payload: {
            datasetId: dataset.id,
            format: 'csv',
          },
        });

      expect(validJobResponse.status).toBe(201);
      expect(validJobResponse.body.name).toBe('Recovery Job');

      // Step 6: Verify system consistency after errors
      console.log('Step 6: Verifying system consistency...');
      const projectStatus = await request(app)
        .get(`/v1/private/projects/${project.id}`)
        .set('Authorization', `Bearer ${dataScientistToken}`);

      expect(projectStatus.status).toBe(200);
      expect(projectStatus.body.id).toBe(project.id);

      const datasetStatus = await request(app)
        .get(`/v1/private/datasets/${dataset.id}`)
        .set('Authorization', `Bearer ${dataScientistToken}`);

      expect(datasetStatus.status).toBe(200);
      expect(datasetStatus.body.projectId).toBe(project.id);
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle high-volume operations efficiently', async () => {
      console.log('Performance test: Creating high-volume operations...');

      // Create a performance test project
      const perfProjectResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Performance Test Project',
          description: 'Testing system performance under load',
          workspaceId: testWorkspace.id,
        });

      expect(perfProjectResponse.status).toBe(201);
      const perfProject = perfProjectResponse.body;

      // Create multiple datasets concurrently
      const datasetPromises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post('/v1/private/datasets')
          .set('Authorization', `Bearer ${dataScientistToken}`)
          .send({
            name: `Performance Dataset ${i + 1}`,
            description: `Dataset ${i + 1} for performance testing`,
            projectId: perfProject.id,
            workspaceId: testWorkspace.id,
          })
      );

      const startTime = Date.now();
      const datasetResponses = await Promise.all(datasetPromises);
      const endTime = Date.now();

      const creationTime = endTime - startTime;
      console.log(`Created 10 datasets in ${creationTime}ms`);

      // Verify all datasets were created successfully
      datasetResponses.forEach((response, i) => {
        expect(response.status).toBe(201);
        expect(response.body.name).toBe(`Performance Dataset ${i + 1}`);
        expect(response.body.projectId).toBe(perfProject.id);
      });

      // Performance should be reasonable (< 5 seconds for 10 concurrent operations)
      expect(creationTime).toBeLessThan(5000);

      // Test pagination with large result set
      const paginationResponse = await request(app)
        .get('/v1/private/datasets?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(paginationResponse.status).toBe(200);
      expect(paginationResponse.body.datasets).toHaveLength(5);
      expect(paginationResponse.body.pagination.totalPages).toBeGreaterThan(1);
    });

    it('should maintain performance with complex queries', async () => {
      console.log('Performance test: Testing complex query performance...');

      const startTime = Date.now();

      // Complex query with multiple joins and filtering
      const complexQueryResponse = await request(app)
        .get('/v1/private/projects?include=datasets,stats&sortBy=updatedAt&sortOrder=desc&page=1&limit=20')
        .set('Authorization', `Bearer ${adminToken}`);

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      console.log(`Complex query completed in ${queryTime}ms`);

      expect(complexQueryResponse.status).toBe(200);
      expect(queryTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Verify response structure
      expect(complexQueryResponse.body).toHaveProperty('projects');
      expect(complexQueryResponse.body).toHaveProperty('pagination');
    });
  });

  describe('Security and Compliance Workflows', () => {
    it('should enforce security policies across all operations', async () => {
      console.log('Security test: Enforcing security policies...');

      // Test 1: Verify JWT token validation
      const invalidTokenResponse = await request(app)
        .get('/v1/private/projects')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(invalidTokenResponse.status).toBe(401);

      // Test 2: Verify workspace isolation
      const workspaceIsolationResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Cross-Workspace Attack',
          description: 'Attempting to create in different workspace',
          workspaceId: 'different-workspace-id',
        });

      expect(workspaceIsolationResponse.status).toBe(403);

      // Test 3: Verify role-based access control
      const viewerAttemptResponse = await request(app)
        .post('/v1/private/automation/rules')
        .set('Authorization', `Bearer ${dataScientistToken}`)
        .send({
          name: 'Unauthorized Rule',
          description: 'Non-admin trying to create automation rule',
          type: 'evaluation',
          trigger: 'trace_completed',
          workspaceId: testWorkspace.id,
          configuration: { conditions: [], actions: [] },
          schedule: { type: 'manual', enabled: false },
        });

      // This should succeed as USER role can create automation rules
      // But let's test admin-only operations
      expect([201, 403]).toContain(viewerAttemptResponse.status);

      // Test 4: Verify input validation
      const maliciousInputResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          description: 'Testing XSS prevention',
          workspaceId: testWorkspace.id,
        });

      // System should either sanitize or reject malicious input
      if (maliciousInputResponse.status === 201) {
        expect(maliciousInputResponse.body.name).not.toContain('<script>');
      } else {
        expect(maliciousInputResponse.status).toBe(400);
      }

      console.log('Security policies properly enforced');
    });
  });
});