/**
 * Comprehensive Integration Tests for All API Endpoints
 * Tests full request/response cycles with real database integration
 * Covers authentication, authorization, and cross-system interactions
 */

import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';
import { AuthService } from '../../src/services/AuthService';

describe('Comprehensive API Integration Tests', () => {
  // Test users with different roles
  let adminUser: any;
  let regularUser: any;
  let viewerUser: any;
  let adminToken: string;
  let regularToken: string;
  let viewerToken: string;
  
  // Test workspace
  let testWorkspace: any;
  
  // Test data
  let testProject: any;
  let testDataset: any;

  beforeAll(async () => {
    // Create test workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Integration Test Workspace',
        slug: 'integration-test-workspace',
        description: 'Workspace for API integration tests',
      },
    });

    // Create test users with different roles
    const salt = await AuthService.generateSalt();
    const hashedPassword = await AuthService.hashPassword('testpassword123', salt);

    adminUser = await prisma.user.create({
      data: {
        username: 'admin-integration',
        email: 'admin@integration.test',
        passwordHash: hashedPassword,
        salt,
        fullName: 'Admin User',
        role: 'ADMIN',
        workspaceId: testWorkspace.id,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        username: 'user-integration',
        email: 'user@integration.test',
        passwordHash: hashedPassword,
        salt,
        fullName: 'Regular User',
        role: 'USER',
        workspaceId: testWorkspace.id,
      },
    });

    viewerUser = await prisma.user.create({
      data: {
        username: 'viewer-integration',
        email: 'viewer@integration.test',
        passwordHash: hashedPassword,
        salt,
        fullName: 'Viewer User',
        role: 'VIEWER',
        workspaceId: testWorkspace.id,
      },
    });

    // Authenticate users and get tokens
    const adminAuth = await request(app)
      .post('/v1/enterprise/auth/login')
      .send({
        username: 'admin-integration',
        password: 'testpassword123',
      });
    adminToken = adminAuth.body.token;

    const regularAuth = await request(app)
      .post('/v1/enterprise/auth/login')
      .send({
        username: 'user-integration',
        password: 'testpassword123',
      });
    regularToken = regularAuth.body.token;

    const viewerAuth = await request(app)
      .post('/v1/enterprise/auth/login')
      .send({
        username: 'viewer-integration',
        password: 'testpassword123',
      });
    viewerToken = viewerAuth.body.token;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        workspaceId: testWorkspace.id,
      },
    });
    
    await prisma.workspace.delete({
      where: { id: testWorkspace.id },
    });

    await prisma.$disconnect();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /v1/enterprise/auth/login', () => {
      it('should authenticate valid user credentials', async () => {
        const response = await request(app)
          .post('/v1/enterprise/auth/login')
          .send({
            username: 'admin-integration',
            password: 'testpassword123',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user.username).toBe('admin-integration');
        expect(response.body.user.role).toBe('ADMIN');
      });

      it('should reject invalid credentials', async () => {
        const response = await request(app)
          .post('/v1/enterprise/auth/login')
          .send({
            username: 'admin-integration',
            password: 'wrongpassword',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject non-existent users', async () => {
        const response = await request(app)
          .post('/v1/enterprise/auth/login')
          .send({
            username: 'nonexistent',
            password: 'anypassword',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /v1/enterprise/auth/me', () => {
      it('should return current user info with valid token', async () => {
        const response = await request(app)
          .get('/v1/enterprise/auth/me')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.username).toBe('admin-integration');
        expect(response.body.role).toBe('ADMIN');
        expect(response.body.workspaceId).toBe(testWorkspace.id);
      });

      it('should reject requests without token', async () => {
        const response = await request(app)
          .get('/v1/enterprise/auth/me');

        expect(response.status).toBe(401);
      });

      it('should reject requests with invalid token', async () => {
        const response = await request(app)
          .get('/v1/enterprise/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Project Management Endpoints', () => {
    beforeEach(async () => {
      // Clean up projects before each test
      await prisma.project.deleteMany({
        where: { workspaceId: testWorkspace.id },
      });
    });

    describe('POST /v1/private/projects', () => {
      it('should create project as admin user', async () => {
        const projectData = {
          name: 'Integration Test Project',
          description: 'A project for integration testing',
          workspaceId: testWorkspace.id,
        };

        const response = await request(app)
          .post('/v1/private/projects')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(projectData);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(projectData.name);
        expect(response.body.description).toBe(projectData.description);
        expect(response.body.workspaceId).toBe(testWorkspace.id);

        testProject = response.body;
      });

      it('should create project as regular user', async () => {
        const projectData = {
          name: 'User Project',
          description: 'A project created by regular user',
          workspaceId: testWorkspace.id,
        };

        const response = await request(app)
          .post('/v1/private/projects')
          .set('Authorization', `Bearer ${regularToken}`)
          .send(projectData);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(projectData.name);
        expect(response.body.createdBy).toBe(regularUser.id);
      });

      it('should reject project creation as viewer', async () => {
        const projectData = {
          name: 'Viewer Project',
          description: 'This should fail',
          workspaceId: testWorkspace.id,
        };

        const response = await request(app)
          .post('/v1/private/projects')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send(projectData);

        expect(response.status).toBe(403);
      });

      it('should reject project creation without authentication', async () => {
        const projectData = {
          name: 'Unauthenticated Project',
          description: 'This should fail',
          workspaceId: testWorkspace.id,
        };

        const response = await request(app)
          .post('/v1/private/projects')
          .send(projectData);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /v1/private/projects', () => {
      beforeEach(async () => {
        // Create test projects
        await prisma.project.create({
          data: {
            name: 'Admin Project',
            description: 'Project created by admin',
            workspaceId: testWorkspace.id,
            createdBy: adminUser.id,
          },
        });

        await prisma.project.create({
          data: {
            name: 'User Project',
            description: 'Project created by user',
            workspaceId: testWorkspace.id,
            createdBy: regularUser.id,
          },
        });
      });

      it('should list all projects for admin user', async () => {
        const response = await request(app)
          .get('/v1/private/projects')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.projects).toHaveLength(2);
        expect(response.body.pagination.total).toBe(2);
      });

      it('should list projects with workspace isolation', async () => {
        const response = await request(app)
          .get('/v1/private/projects')
          .set('Authorization', `Bearer ${regularToken}`);

        expect(response.status).toBe(200);
        // Should only see projects in the same workspace
        response.body.projects.forEach((project: any) => {
          expect(project.workspaceId).toBe(testWorkspace.id);
        });
      });

      it('should support pagination', async () => {
        const response = await request(app)
          .get('/v1/private/projects?page=1&limit=1')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.projects).toHaveLength(1);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(1);
        expect(response.body.pagination.totalPages).toBe(2);
      });
    });

    describe('GET /v1/private/projects/:id', () => {
      beforeEach(async () => {
        testProject = await prisma.project.create({
          data: {
            name: 'Specific Project',
            description: 'Project for specific tests',
            workspaceId: testWorkspace.id,
            createdBy: regularUser.id,
          },
        });
      });

      it('should get specific project with valid permissions', async () => {
        const response = await request(app)
          .get(`/v1/private/projects/${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.id).toBe(testProject.id);
        expect(response.body.name).toBe('Specific Project');
      });

      it('should reject access to non-existent project', async () => {
        const response = await request(app)
          .get('/v1/private/projects/non-existent-id')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Dataset Management Endpoints', () => {
    beforeEach(async () => {
      // Create a test project first
      testProject = await prisma.project.create({
        data: {
          name: 'Dataset Test Project',
          description: 'Project for dataset tests',
          workspaceId: testWorkspace.id,
          createdBy: adminUser.id,
        },
      });

      // Clean up datasets
      await prisma.dataset.deleteMany({
        where: { projectId: testProject.id },
      });
    });

    describe('POST /v1/private/datasets', () => {
      it('should create dataset with proper project association', async () => {
        const datasetData = {
          name: 'Integration Test Dataset',
          description: 'Dataset for integration testing',
          projectId: testProject.id,
          workspaceId: testWorkspace.id,
        };

        const response = await request(app)
          .post('/v1/private/datasets')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(datasetData);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(datasetData.name);
        expect(response.body.projectId).toBe(testProject.id);
        expect(response.body.workspaceId).toBe(testWorkspace.id);

        testDataset = response.body;
      });

      it('should enforce workspace isolation for datasets', async () => {
        const datasetData = {
          name: 'Cross Workspace Dataset',
          description: 'This should fail',
          projectId: testProject.id,
          workspaceId: 'different-workspace-id',
        };

        const response = await request(app)
          .post('/v1/private/datasets')
          .set('Authorization', `Bearer ${regularToken}`)
          .send(datasetData);

        expect(response.status).toBe(403);
      });
    });

    describe('GET /v1/private/datasets', () => {
      beforeEach(async () => {
        await prisma.dataset.create({
          data: {
            name: 'Test Dataset 1',
            description: 'First dataset',
            projectId: testProject.id,
            workspaceId: testWorkspace.id,
            createdBy: adminUser.id,
          },
        });

        await prisma.dataset.create({
          data: {
            name: 'Test Dataset 2',
            description: 'Second dataset',
            projectId: testProject.id,
            workspaceId: testWorkspace.id,
            createdBy: regularUser.id,
          },
        });
      });

      it('should list datasets with project filtering', async () => {
        const response = await request(app)
          .get(`/v1/private/datasets?projectId=${testProject.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.datasets).toHaveLength(2);
        response.body.datasets.forEach((dataset: any) => {
          expect(dataset.projectId).toBe(testProject.id);
        });
      });

      it('should enforce workspace isolation in dataset listing', async () => {
        const response = await request(app)
          .get('/v1/private/datasets')
          .set('Authorization', `Bearer ${viewerToken}`);

        expect(response.status).toBe(200);
        response.body.datasets.forEach((dataset: any) => {
          expect(dataset.workspaceId).toBe(testWorkspace.id);
        });
      });
    });
  });

  describe('Background Jobs Endpoints', () => {
    describe('POST /v1/private/jobs', () => {
      it('should create background job with proper authentication', async () => {
        const jobData = {
          name: 'Integration Test Job',
          type: 'data_export',
          workspaceId: testWorkspace.id,
          payload: {
            format: 'csv',
            datasetId: 'test-dataset-id',
          },
        };

        const response = await request(app)
          .post('/v1/private/jobs')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(jobData);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(jobData.name);
        expect(response.body.type).toBe(jobData.type);
        expect(response.body.workspaceId).toBe(testWorkspace.id);
        expect(response.body.createdBy).toBe(adminUser.id);
      });

      it('should enforce workspace isolation for job creation', async () => {
        const jobData = {
          name: 'Cross Workspace Job',
          type: 'data_export',
          workspaceId: 'different-workspace-id',
          payload: { format: 'json' },
        };

        const response = await request(app)
          .post('/v1/private/jobs')
          .set('Authorization', `Bearer ${regularToken}`)
          .send(jobData);

        expect(response.status).toBe(403);
      });
    });

    describe('GET /v1/private/jobs', () => {
      it('should list jobs with workspace isolation', async () => {
        const response = await request(app)
          .get('/v1/private/jobs')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('jobs');
        expect(response.body).toHaveProperty('pagination');
      });

      it('should support job type filtering', async () => {
        const response = await request(app)
          .get('/v1/private/jobs?type=data_export')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        if (response.body.jobs.length > 0) {
          response.body.jobs.forEach((job: any) => {
            expect(job.type).toBe('data_export');
          });
        }
      });
    });
  });

  describe('Feedback System Endpoints', () => {
    beforeEach(async () => {
      // Create test project and dataset for feedback tests
      if (!testProject) {
        testProject = await prisma.project.create({
          data: {
            name: 'Feedback Test Project',
            description: 'Project for feedback tests',
            workspaceId: testWorkspace.id,
            createdBy: adminUser.id,
          },
        });
      }
    });

    describe('POST /v1/private/feedback/definitions', () => {
      it('should create feedback definition with proper validation', async () => {
        const feedbackDefData = {
          name: 'Quality Rating',
          description: 'Rate the quality of responses',
          type: 'numerical',
          workspaceId: testWorkspace.id,
          config: {
            min: 1,
            max: 5,
            step: 1,
          },
        };

        const response = await request(app)
          .post('/v1/private/feedback/definitions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(feedbackDefData);

        expect(response.status).toBe(201);
        expect(response.body.name).toBe(feedbackDefData.name);
        expect(response.body.type).toBe(feedbackDefData.type);
        expect(response.body.workspaceId).toBe(testWorkspace.id);
      });

      it('should reject invalid feedback definition types', async () => {
        const invalidFeedbackDef = {
          name: 'Invalid Feedback',
          description: 'This should fail',
          type: 'invalid_type',
          workspaceId: testWorkspace.id,
          config: {},
        };

        const response = await request(app)
          .post('/v1/private/feedback/definitions')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(invalidFeedbackDef);

        expect(response.status).toBe(400);
      });
    });

    describe('GET /v1/private/feedback/definitions', () => {
      it('should list feedback definitions with workspace isolation', async () => {
        const response = await request(app)
          .get('/v1/private/feedback/definitions')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('definitions');
        response.body.definitions.forEach((def: any) => {
          expect(def.workspaceId).toBe(testWorkspace.id);
        });
      });
    });
  });

  describe('Cross-System Integration', () => {
    it('should create complete workflow: project → dataset → job → feedback', async () => {
      // 1. Create project
      const projectResponse = await request(app)
        .post('/v1/private/projects')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Workflow Test Project',
          description: 'Full workflow integration test',
          workspaceId: testWorkspace.id,
        });
      expect(projectResponse.status).toBe(201);
      const project = projectResponse.body;

      // 2. Create dataset
      const datasetResponse = await request(app)
        .post('/v1/private/datasets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Workflow Dataset',
          description: 'Dataset for workflow test',
          projectId: project.id,
          workspaceId: testWorkspace.id,
        });
      expect(datasetResponse.status).toBe(201);
      const dataset = datasetResponse.body;

      // 3. Create background job
      const jobResponse = await request(app)
        .post('/v1/private/jobs')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Workflow Processing Job',
          type: 'dataset_processing',
          workspaceId: testWorkspace.id,
          payload: {
            datasetId: dataset.id,
            operation: 'analyze',
          },
        });
      expect(jobResponse.status).toBe(201);
      const job = jobResponse.body;

      // 4. Create feedback definition
      const feedbackResponse = await request(app)
        .post('/v1/private/feedback/definitions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Workflow Quality',
          description: 'Quality assessment for workflow',
          type: 'categorical',
          workspaceId: testWorkspace.id,
          config: {
            options: ['excellent', 'good', 'fair', 'poor'],
          },
        });
      expect(feedbackResponse.status).toBe(201);

      // Verify all resources are properly linked and isolated to workspace
      expect(project.workspaceId).toBe(testWorkspace.id);
      expect(dataset.workspaceId).toBe(testWorkspace.id);
      expect(dataset.projectId).toBe(project.id);
      expect(job.workspaceId).toBe(testWorkspace.id);
      expect(feedbackResponse.body.workspaceId).toBe(testWorkspace.id);
    });
  });

  describe('Authorization Matrix Testing', () => {
    const testEndpoints = [
      { method: 'GET', path: '/v1/private/projects', adminOK: true, userOK: true, viewerOK: true },
      { method: 'POST', path: '/v1/private/projects', adminOK: true, userOK: true, viewerOK: false },
      { method: 'GET', path: '/v1/private/datasets', adminOK: true, userOK: true, viewerOK: true },
      { method: 'POST', path: '/v1/private/datasets', adminOK: true, userOK: true, viewerOK: false },
      { method: 'GET', path: '/v1/private/jobs', adminOK: true, userOK: true, viewerOK: true },
      { method: 'POST', path: '/v1/private/jobs', adminOK: true, userOK: true, viewerOK: false },
    ];

    testEndpoints.forEach(({ method, path, adminOK, userOK, viewerOK }) => {
      describe(`${method} ${path}`, () => {
        it(`should ${adminOK ? 'allow' : 'deny'} admin access`, async () => {
          const response = await request(app)
            [method.toLowerCase() as keyof request.SuperTest<request.Test>](path)
            .set('Authorization', `Bearer ${adminToken}`)
            .send({});

          if (adminOK) {
            expect(response.status).not.toBe(403);
          } else {
            expect(response.status).toBe(403);
          }
        });

        it(`should ${userOK ? 'allow' : 'deny'} user access`, async () => {
          const response = await request(app)
            [method.toLowerCase() as keyof request.SuperTest<request.Test>](path)
            .set('Authorization', `Bearer ${regularToken}`)
            .send({});

          if (userOK) {
            expect(response.status).not.toBe(403);
          } else {
            expect(response.status).toBe(403);
          }
        });

        it(`should ${viewerOK ? 'allow' : 'deny'} viewer access`, async () => {
          const response = await request(app)
            [method.toLowerCase() as keyof request.SuperTest<request.Test>](path)
            .set('Authorization', `Bearer ${viewerToken}`)
            .send({});

          if (viewerOK) {
            expect(response.status).not.toBe(403);
          } else {
            expect(response.status).toBe(403);
          }
        });
      });
    });
  });
});