/**
 * Comprehensive Integration Tests for FeedbackController
 * Tests all API endpoints with real HTTP requests and database interactions
 */

import { jest, describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { build } from '../../src/app';
import { prisma } from '../../src/config/database';
import type {
  AuthenticatedUser,
  FeedbackDefinition,
  CreateFeedbackDefinitionRequest,
  UpdateFeedbackDefinitionRequest,
  CreateFeedbackInstanceRequest,
  BulkCreateFeedbackRequest,
} from '../../src/types/feedback';

describe('FeedbackController Integration Tests', () => {
  let app: FastifyInstance;
  let mockUser: AuthenticatedUser;
  let adminUser: AuthenticatedUser;
  let viewerUser: AuthenticatedUser;
  let authToken: string;
  let adminToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = build({ logger: false });
    await app.ready();
    
    // Clean test database
    await cleanDatabase();
    
    // Setup test users
    mockUser = {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'USER',
      workspaceId: 'test-workspace-123',
      permissions: ['read', 'write'],
    };

    adminUser = {
      id: 'admin-user-123',
      username: 'adminuser',
      email: 'admin@example.com',
      fullName: 'Admin User',
      role: 'ADMIN',
      workspaceId: 'test-workspace-123',
      permissions: ['*'],
    };

    viewerUser = {
      id: 'viewer-user-123',
      username: 'vieweruser',
      email: 'viewer@example.com',
      fullName: 'Viewer User',
      role: 'VIEWER',
      workspaceId: 'test-workspace-123',
      permissions: ['read'],
    };

    // Generate auth tokens (mock implementation)
    authToken = generateMockToken(mockUser);
    adminToken = generateMockToken(adminUser);
    viewerToken = generateMockToken(viewerUser);
  });

  afterAll(async () => {
    await cleanDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Feedback Definition Endpoints', () => {
    describe('POST /api/v1/feedback/definitions', () => {
      test('should create feedback definition successfully', async () => {
        const request: CreateFeedbackDefinitionRequest = {
          name: 'test-numerical-feedback',
          displayName: 'Test Numerical Feedback',
          description: 'A test numerical feedback definition',
          type: 'numerical',
          scope: 'trace',
          config: {
            type: 'numerical',
            minValue: 0,
            maxValue: 10,
            precision: 2,
            unit: 'score',
          },
          isRequired: false,
          allowMultiple: false,
          metadata: {
            tags: ['test', 'numerical'],
            category: 'quality',
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.id).toBeDefined();
        expect(data.data.name).toBe(request.name);
        expect(data.data.type).toBe(request.type);
        expect(data.data.canRead).toBe(true);
        expect(data.data.canWrite).toBe(true);
        expect(data.data.canDelete).toBe(true);
      });

      test('should validate required fields', async () => {
        const invalidRequest = {
          displayName: 'Invalid Request',
          // Missing required fields: name, type, scope, config
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: invalidRequest,
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      });

      test('should prevent duplicate definition names in workspace', async () => {
        const request: CreateFeedbackDefinitionRequest = {
          name: 'duplicate-name',
          displayName: 'Duplicate Name Test',
          type: 'numerical',
          scope: 'trace',
          config: {
            type: 'numerical',
            minValue: 0,
            maxValue: 10,
            precision: 2,
          },
        };

        // Create first definition
        const firstResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(firstResponse.statusCode).toBe(201);

        // Try to create duplicate
        const duplicateResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(duplicateResponse.statusCode).toBe(400);
        const data = JSON.parse(duplicateResponse.payload);
        expect(data.success).toBe(false);
        expect(data.error.message).toContain('already exists');
      });

      test('should require authentication', async () => {
        const request: CreateFeedbackDefinitionRequest = {
          name: 'test-feedback',
          displayName: 'Test Feedback',
          type: 'numerical',
          scope: 'trace',
          config: {
            type: 'numerical',
            minValue: 0,
            maxValue: 10,
            precision: 2,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/definitions',
          payload: request,
        });

        expect(response.statusCode).toBe(401);
      });

      test('should validate feedback config by type', async () => {
        const categoricalRequest: CreateFeedbackDefinitionRequest = {
          name: 'test-categorical',
          displayName: 'Test Categorical',
          type: 'categorical',
          scope: 'trace',
          config: {
            type: 'categorical',
            options: [
              { value: 'excellent', label: 'Excellent' },
              { value: 'good', label: 'Good' },
              { value: 'poor', label: 'Poor' },
            ],
            allowOther: false,
            multiSelect: false,
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: categoricalRequest,
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.payload);
        expect(data.data.config.options).toHaveLength(3);
      });
    });

    describe('GET /api/v1/feedback/definitions', () => {
      beforeEach(async () => {
        // Create test definitions
        await createTestDefinitions();
      });

      test('should list feedback definitions for workspace', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);
        expect(data.count).toBe(data.data.length);
      });

      test('should include instance count and last feedback date', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.data[0].instanceCount).toBeDefined();
        expect(data.data[0].lastFeedbackAt).toBeDefined();
      });

      test('should filter by workspace ID', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/definitions?workspaceId=${mockUser.workspaceId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        data.data.forEach((def: any) => {
          expect(def.workspaceId).toBe(mockUser.workspaceId);
        });
      });

      test('should enforce read permissions', async () => {
        // Create definition with restricted read access
        const restrictedDef = await createRestrictedDefinition();

        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/definitions',
          headers: {
            authorization: `Bearer ${viewerToken}`, // Viewer without explicit permission
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        const restrictedDefInResults = data.data.find((def: any) => def.id === restrictedDef.id);
        expect(restrictedDefInResults).toBeUndefined();
      });
    });

    describe('GET /api/v1/feedback/definitions/:id', () => {
      let testDefinitionId: string;

      beforeEach(async () => {
        const testDef = await createTestDefinition();
        testDefinitionId = testDef.id;
      });

      test('should get feedback definition by ID', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/definitions/${testDefinitionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.id).toBe(testDefinitionId);
        expect(data.data.canRead).toBe(true);
      });

      test('should return 404 for non-existent definition', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/definitions/non-existent-id',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(404);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(false);
        expect(data.error.type).toBe('FeedbackDefinitionNotFoundError');
      });

      test('should enforce read permissions', async () => {
        const restrictedDef = await createRestrictedDefinition();

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/definitions/${restrictedDef.id}`,
          headers: {
            authorization: `Bearer ${viewerToken}`, // No read permission
          },
        });

        expect(response.statusCode).toBe(403);
        const data = JSON.parse(response.payload);
        expect(data.error.type).toBe('FeedbackPermissionError');
      });

      test('should allow admin to read any definition', async () => {
        const restrictedDef = await createRestrictedDefinition();

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/definitions/${restrictedDef.id}`,
          headers: {
            authorization: `Bearer ${adminToken}`, // Admin can read everything
          },
        });

        expect(response.statusCode).toBe(200);
      });
    });

    describe('PATCH /api/v1/feedback/definitions/:id', () => {
      let testDefinitionId: string;

      beforeEach(async () => {
        const testDef = await createTestDefinition();
        testDefinitionId = testDef.id;
      });

      test('should update feedback definition', async () => {
        const updateRequest: UpdateFeedbackDefinitionRequest = {
          displayName: 'Updated Display Name',
          description: 'Updated description',
          metadata: {
            tags: ['updated', 'test'],
          },
        };

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/feedback/definitions/${testDefinitionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: updateRequest,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.displayName).toBe(updateRequest.displayName);
        expect(data.data.description).toBe(updateRequest.description);
      });

      test('should increment version on update', async () => {
        const updateRequest: UpdateFeedbackDefinitionRequest = {
          displayName: 'Version Test',
        };

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/feedback/definitions/${testDefinitionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: updateRequest,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.data.metadata.version).toBeGreaterThan(1);
      });

      test('should enforce write permissions', async () => {
        const restrictedDef = await createRestrictedDefinition();

        const response = await app.inject({
          method: 'PATCH',
          url: `/api/v1/feedback/definitions/${restrictedDef.id}`,
          headers: {
            authorization: `Bearer ${viewerToken}`,
          },
          payload: { displayName: 'Unauthorized Update' },
        });

        expect(response.statusCode).toBe(403);
        const data = JSON.parse(response.payload);
        expect(data.error.type).toBe('FeedbackPermissionError');
      });
    });

    describe('DELETE /api/v1/feedback/definitions/:id', () => {
      test('should delete feedback definition with no instances', async () => {
        const testDef = await createTestDefinition();

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/definitions/${testDef.id}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);

        // Verify deletion
        const checkResponse = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/definitions/${testDef.id}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(checkResponse.statusCode).toBe(404);
      });

      test('should soft delete definition with existing instances', async () => {
        const testDef = await createTestDefinition();
        await createTestFeedbackInstance(testDef.id);

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/definitions/${testDef.id}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);

        // Verify soft deletion - should still exist but be inactive
        const checkResponse = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/definitions/${testDef.id}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(checkResponse.statusCode).toBe(200);
        const data = JSON.parse(checkResponse.payload);
        expect(data.data.isActive).toBe(false);
        expect(data.data.deletedAt).toBeDefined();
      });

      test('should enforce delete permissions', async () => {
        const restrictedDef = await createRestrictedDefinition();

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/definitions/${restrictedDef.id}`,
          headers: {
            authorization: `Bearer ${viewerToken}`,
          },
        });

        expect(response.statusCode).toBe(403);
      });

      test('should allow creator to delete definition', async () => {
        const testDef = await createTestDefinition();

        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/definitions/${testDef.id}`,
          headers: {
            authorization: `Bearer ${authToken}`, // Creator
          },
        });

        expect(response.statusCode).toBe(200);
      });
    });
  });

  describe('Feedback Instance Endpoints', () => {
    let testDefinitionId: string;

    beforeEach(async () => {
      const testDef = await createTestDefinition();
      testDefinitionId = testDef.id;
    });

    describe('POST /api/v1/feedback/instances', () => {
      test('should create feedback instance successfully', async () => {
        const request: CreateFeedbackInstanceRequest = {
          definitionId: testDefinitionId,
          entityType: 'trace',
          entityId: 'trace-123',
          value: 8.5,
          confidence: 0.9,
          metadata: {
            tags: ['test', 'api'],
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.id).toBeDefined();
        expect(data.data.value).toBe(request.value);
        expect(data.data.confidence).toBe(request.confidence);
        expect(data.data.source.type).toBe('human');
        expect(data.data.source.userId).toBe(mockUser.id);
      });

      test('should validate feedback value against definition', async () => {
        const request: CreateFeedbackInstanceRequest = {
          definitionId: testDefinitionId,
          entityType: 'trace',
          entityId: 'trace-123',
          value: 15, // Out of range (max is 10)
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(false);
        expect(data.error.type).toBe('FeedbackValidationError');
      });

      test('should enforce allowMultiple constraint', async () => {
        const singleDef = await createSingleFeedbackDefinition();

        // Create first feedback
        const firstRequest: CreateFeedbackInstanceRequest = {
          definitionId: singleDef.id,
          entityType: 'trace',
          entityId: 'trace-123',
          value: 8.0,
        };

        const firstResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: firstRequest,
        });

        expect(firstResponse.statusCode).toBe(201);

        // Try to create second feedback for same entity
        const secondRequest: CreateFeedbackInstanceRequest = {
          definitionId: singleDef.id,
          entityType: 'trace',
          entityId: 'trace-123',
          value: 9.0,
        };

        const secondResponse = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: secondRequest,
        });

        expect(secondResponse.statusCode).toBe(400);
        const data = JSON.parse(secondResponse.payload);
        expect(data.error.message).toContain('Multiple feedback instances not allowed');
      });

      test('should reject feedback for inactive definition', async () => {
        const inactiveDef = await createInactiveDefinition();

        const request: CreateFeedbackInstanceRequest = {
          definitionId: inactiveDef.id,
          entityType: 'trace',
          entityId: 'trace-123',
          value: 8.5,
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(400);
        const data = JSON.parse(response.payload);
        expect(data.error.message).toContain('inactive definition');
      });
    });

    describe('POST /api/v1/feedback/instances/bulk', () => {
      test('should create multiple feedback instances', async () => {
        const multipleDef = await createMultipleFeedbackDefinition();

        const request: BulkCreateFeedbackRequest = {
          instances: [
            {
              definitionId: multipleDef.id,
              entityType: 'trace',
              entityId: 'trace-123',
              value: 8.5,
            },
            {
              definitionId: multipleDef.id,
              entityType: 'trace',
              entityId: 'trace-456',
              value: 7.2,
            },
            {
              definitionId: multipleDef.id,
              entityType: 'trace',
              entityId: 'trace-789',
              value: 9.1,
            },
          ],
          batchMetadata: {
            name: 'Test Batch',
            description: 'Test bulk feedback creation',
          },
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances/bulk',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.created).toBe(3);
        expect(data.data.errors).toHaveLength(0);
      });

      test('should handle partial failures in bulk creation', async () => {
        const request: BulkCreateFeedbackRequest = {
          instances: [
            {
              definitionId: testDefinitionId,
              entityType: 'trace',
              entityId: 'trace-123',
              value: 8.5, // Valid
            },
            {
              definitionId: testDefinitionId,
              entityType: 'trace',
              entityId: 'trace-456',
              value: 15, // Invalid - out of range
            },
            {
              definitionId: 'non-existent',
              entityType: 'trace',
              entityId: 'trace-789',
              value: 7.0, // Invalid - definition doesn't exist
            },
          ],
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/instances/bulk',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(201);
        const data = JSON.parse(response.payload);
        expect(data.data.created).toBe(1);
        expect(data.data.errors).toHaveLength(2);
      });
    });

    describe('GET /api/v1/feedback/instances', () => {
      beforeEach(async () => {
        await createTestFeedbackInstances(testDefinitionId);
      });

      test('should list feedback instances with filtering', async () => {
        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/instances?definitionId=${testDefinitionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.pagination).toBeDefined();
        expect(data.aggregations).toBeDefined();
      });

      test('should support entity type filtering', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/instances?entityType=trace',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        data.data.forEach((instance: any) => {
          expect(instance.entityType).toBe('trace');
        });
      });

      test('should support value range filtering', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/instances?valueRange=8-10',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        data.data.forEach((instance: any) => {
          expect(instance.value).toBeGreaterThanOrEqual(8);
          expect(instance.value).toBeLessThanOrEqual(10);
        });
      });

      test('should support time range filtering', async () => {
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const endTime = new Date().toISOString();

        const response = await app.inject({
          method: 'GET',
          url: `/api/v1/feedback/instances?startTime=${startTime}&endTime=${endTime}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
      });

      test('should support pagination', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/instances?page=1&limit=5',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.limit).toBe(5);
        expect(data.data.length).toBeLessThanOrEqual(5);
      });

      test('should support sorting', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/instances?sortBy=created_at&sortOrder=desc',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        
        // Verify descending order
        for (let i = 1; i < data.data.length; i++) {
          const prev = new Date(data.data[i - 1].createdAt);
          const curr = new Date(data.data[i].createdAt);
          expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
        }
      });
    });

    describe('PUT /api/v1/feedback/instances/:id/verify', () => {
      let testInstanceId: string;

      beforeEach(async () => {
        const instance = await createTestFeedbackInstance(testDefinitionId);
        testInstanceId = instance.id;
      });

      test('should verify feedback instance as admin', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v1/feedback/instances/${testInstanceId}/verify`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.isVerified).toBe(true);
        expect(data.data.verifiedBy).toBe(adminUser.id);
        expect(data.data.verifiedAt).toBeDefined();
      });

      test('should reject verification by non-admin user', async () => {
        const response = await app.inject({
          method: 'PUT',
          url: `/api/v1/feedback/instances/${testInstanceId}/verify`,
          headers: {
            authorization: `Bearer ${authToken}`, // Regular user
          },
        });

        expect(response.statusCode).toBe(403);
        const data = JSON.parse(response.payload);
        expect(data.error.type).toBe('FeedbackPermissionError');
      });
    });

    describe('DELETE /api/v1/feedback/instances/:id/verify', () => {
      let verifiedInstanceId: string;

      beforeEach(async () => {
        const instance = await createVerifiedFeedbackInstance(testDefinitionId);
        verifiedInstanceId = instance.id;
      });

      test('should unverify feedback instance as admin', async () => {
        const response = await app.inject({
          method: 'DELETE',
          url: `/api/v1/feedback/instances/${verifiedInstanceId}/verify`,
          headers: {
            authorization: `Bearer ${adminToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.isVerified).toBe(false);
        expect(data.data.verifiedBy).toBeNull();
        expect(data.data.verifiedAt).toBeNull();
      });
    });
  });

  describe('Aggregation and Analytics Endpoints', () => {
    let numericalDefId: string;
    let categoricalDefId: string;

    beforeEach(async () => {
      // Create test definitions and instances for aggregation
      const numericalDef = await createNumericalDefinition();
      const categoricalDef = await createCategoricalDefinition();
      
      numericalDefId = numericalDef.id;
      categoricalDefId = categoricalDef.id;

      await createAggregationTestData(numericalDefId, categoricalDefId);
    });

    describe('POST /api/v1/feedback/aggregate', () => {
      test('should aggregate numerical feedback', async () => {
        const request = {
          definitionIds: [numericalDefId],
          aggregationTypes: ['average', 'count', 'min', 'max'],
          includeStatistics: true,
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/aggregate',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.results).toBeDefined();
        expect(data.summary).toBeDefined();
        expect(data.insights).toBeDefined();

        const avgResult = data.data.results.find((r: any) => r.aggregationType === 'average');
        expect(avgResult).toBeDefined();
        expect(typeof avgResult.value).toBe('number');
      });

      test('should aggregate categorical feedback', async () => {
        const request = {
          definitionIds: [categoricalDefId],
          aggregationTypes: ['count', 'distribution'],
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/aggregate',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        
        const distResult = data.data.results.find((r: any) => r.aggregationType === 'distribution');
        expect(distResult).toBeDefined();
        expect(distResult.value.buckets).toBeDefined();
        expect(Array.isArray(distResult.value.buckets)).toBe(true);
      });

      test('should support entity filtering in aggregation', async () => {
        const request = {
          definitionIds: [numericalDefId],
          aggregationTypes: ['average'],
          entityType: 'trace',
          entityIds: ['trace-123', 'trace-456'],
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/aggregate',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
      });

      test('should support time window aggregation', async () => {
        const request = {
          definitionIds: [numericalDefId],
          aggregationTypes: ['average'],
          timeWindows: [
            {
              name: 'last_hour',
              duration: 3600000,
              label: 'Last Hour',
            },
          ],
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/feedback/aggregate',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.data.results[0].timeWindow).toBeDefined();
      });
    });

    describe('GET /api/v1/feedback/insights/:entityType/:entityId', () => {
      test('should generate insights for entity', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/insights/trace/trace-123',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.count).toBe(data.data.length);
      });

      test('should include actionable insights', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/insights/trace/trace-123',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        
        if (data.data.length > 0) {
          const insight = data.data[0];
          expect(insight.type).toBeDefined();
          expect(insight.title).toBeDefined();
          expect(insight.confidence).toBeDefined();
          expect(typeof insight.confidence).toBe('number');
        }
      });
    });

    describe('GET /api/v1/feedback/summary/:entityType/:entityId', () => {
      test('should get entity feedback summary', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/summary/trace/trace-123',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.entityType).toBe('trace');
        expect(data.data.entityId).toBe('trace-123');
        expect(data.data.totalFeedback).toBeDefined();
        expect(data.data.definitionCount).toBeDefined();
        expect(data.data.summaries).toBeDefined();
      });
    });
  });

  describe('Utility Endpoints', () => {
    describe('GET /api/v1/feedback/types', () => {
      test('should return available feedback types', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/types',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
        expect(data.data.length).toBeGreaterThan(0);

        const numericalType = data.data.find((t: any) => t.value === 'numerical');
        expect(numericalType).toBeDefined();
        expect(numericalType.label).toBeDefined();
        expect(numericalType.description).toBeDefined();
      });
    });

    describe('GET /api/v1/feedback/scopes', () => {
      test('should return available feedback scopes', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/v1/feedback/scopes',
          headers: {
            authorization: `Bearer ${authToken}`,
          },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);

        const traceScope = data.data.find((s: any) => s.value === 'trace');
        expect(traceScope).toBeDefined();
        expect(traceScope.label).toBeDefined();
      });
    });

    describe('POST /api/v1/feedback/validate/:definitionId', () => {
      let testDefinitionId: string;

      beforeEach(async () => {
        const testDef = await createTestDefinition();
        testDefinitionId = testDef.id;
      });

      test('should validate feedback value', async () => {
        const request = {
          value: 8.5,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/feedback/validate/${testDefinitionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.isValid).toBe(true);
      });

      test('should reject invalid feedback value', async () => {
        const request = {
          value: 15, // Out of range
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/v1/feedback/validate/${testDefinitionId}`,
          headers: {
            authorization: `Bearer ${authToken}`,
          },
          payload: request,
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.success).toBe(true);
        expect(data.data.isValid).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON requests', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/feedback/definitions',
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
        },
        payload: '{ invalid json }',
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle missing required headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/feedback/definitions',
        // No authorization header
      });

      expect(response.statusCode).toBe(401);
    });

    test('should handle invalid authorization token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/feedback/definitions',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large feedback lists efficiently', async () => {
      const testDef = await createTestDefinition();
      
      // Create many feedback instances
      const instances = Array.from({ length: 100 }, (_, i) => ({
        definitionId: testDef.id,
        entityType: 'trace' as const,
        entityId: `trace-${i}`,
        value: Math.random() * 10,
      }));

      await app.inject({
        method: 'POST',
        url: '/api/v1/feedback/instances/bulk',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
        payload: { instances },
      });

      const startTime = Date.now();
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/feedback/instances?definitionId=${testDef.id}&limit=100`,
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });
      const duration = Date.now() - startTime;

      expect(response.statusCode).toBe(200);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  // Helper functions
  async function cleanDatabase(): Promise<void> {
    await prisma.$transaction([
      prisma.feedbackInstance.deleteMany(),
      prisma.feedbackDefinition.deleteMany(),
      // Clean other related tables if needed
    ]);
  }

  async function cleanTestData(): Promise<void> {
    await prisma.$transaction([
      prisma.feedbackInstance.deleteMany({
        where: { workspaceId: 'test-workspace-123' },
      }),
      prisma.feedbackDefinition.deleteMany({
        where: { workspaceId: 'test-workspace-123' },
      }),
    ]);
  }

  function generateMockToken(user: AuthenticatedUser): string {
    // In a real implementation, this would generate a proper JWT token
    return Buffer.from(JSON.stringify(user)).toString('base64');
  }

  async function createTestDefinition(): Promise<any> {
    const definition = {
      id: `test-def-${Date.now()}`,
      name: `test-feedback-${Date.now()}`,
      displayName: 'Test Numerical Feedback',
      type: 'numerical',
      scope: 'trace',
      workspaceId: 'test-workspace-123',
      config: JSON.stringify({
        type: 'numerical',
        minValue: 0,
        maxValue: 10,
        precision: 2,
      }),
      validation: JSON.stringify({
        required: false,
        customRules: [],
        dependencies: [],
      }),
      aggregation: JSON.stringify({
        enableAggregation: true,
        aggregationTypes: ['average', 'count'],
        timeWindows: [],
        groupBy: [],
        filters: [],
      }),
      isActive: true,
      isRequired: false,
      allowMultiple: false,
      metadata: JSON.stringify({
        creator: mockUser.id,
        creatorName: mockUser.fullName,
        tags: ['test'],
        version: 1,
      }),
      permissions: JSON.stringify({
        canRead: [mockUser.id],
        canWrite: [mockUser.id],
        canDelete: [mockUser.id],
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await prisma.feedbackDefinition.create({ data: definition });
    return definition;
  }

  async function createTestDefinitions(): Promise<void> {
    for (let i = 0; i < 3; i++) {
      await createTestDefinition();
    }
  }

  async function createRestrictedDefinition(): Promise<any> {
    const definition = {
      id: `restricted-def-${Date.now()}`,
      name: `restricted-feedback-${Date.now()}`,
      displayName: 'Restricted Feedback',
      type: 'numerical',
      scope: 'trace',
      workspaceId: 'test-workspace-123',
      config: JSON.stringify({
        type: 'numerical',
        minValue: 0,
        maxValue: 10,
        precision: 2,
      }),
      validation: JSON.stringify({
        required: false,
        customRules: [],
        dependencies: [],
      }),
      aggregation: JSON.stringify({
        enableAggregation: true,
        aggregationTypes: ['average'],
        timeWindows: [],
        groupBy: [],
        filters: [],
      }),
      isActive: true,
      isRequired: false,
      allowMultiple: false,
      metadata: JSON.stringify({
        creator: 'other-user',
        creatorName: 'Other User',
        tags: ['restricted'],
        version: 1,
      }),
      permissions: JSON.stringify({
        canRead: ['other-user'], // Viewer doesn't have permission
        canWrite: ['other-user'],
        canDelete: ['other-user'],
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await prisma.feedbackDefinition.create({ data: definition });
    return definition;
  }

  async function createTestFeedbackInstance(definitionId: string): Promise<any> {
    const instance = {
      id: `test-inst-${Date.now()}`,
      definitionId,
      definitionName: 'test-feedback',
      entityType: 'trace',
      entityId: 'trace-123',
      value: JSON.stringify(8.5),
      workspaceId: 'test-workspace-123',
      source: JSON.stringify({
        type: 'human',
        userId: mockUser.id,
        userName: mockUser.fullName,
      }),
      metadata: JSON.stringify({
        version: 1,
        tags: [],
      }),
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await prisma.feedbackInstance.create({ data: instance });
    return instance;
  }

  async function createSingleFeedbackDefinition(): Promise<any> {
    const definition = await createTestDefinition();
    await prisma.feedbackDefinition.update({
      where: { id: definition.id },
      data: { allowMultiple: false },
    });
    return definition;
  }

  async function createMultipleFeedbackDefinition(): Promise<any> {
    const definition = await createTestDefinition();
    await prisma.feedbackDefinition.update({
      where: { id: definition.id },
      data: { allowMultiple: true },
    });
    return definition;
  }

  async function createInactiveDefinition(): Promise<any> {
    const definition = await createTestDefinition();
    await prisma.feedbackDefinition.update({
      where: { id: definition.id },
      data: { isActive: false },
    });
    return definition;
  }

  async function createNumericalDefinition(): Promise<any> {
    return createTestDefinition(); // Already numerical
  }

  async function createCategoricalDefinition(): Promise<any> {
    const definition = {
      id: `cat-def-${Date.now()}`,
      name: `categorical-feedback-${Date.now()}`,
      displayName: 'Test Categorical Feedback',
      type: 'categorical',
      scope: 'trace',
      workspaceId: 'test-workspace-123',
      config: JSON.stringify({
        type: 'categorical',
        options: [
          { value: 'excellent', label: 'Excellent' },
          { value: 'good', label: 'Good' },
          { value: 'poor', label: 'Poor' },
        ],
        allowOther: false,
        multiSelect: false,
      }),
      validation: JSON.stringify({
        required: false,
        customRules: [],
        dependencies: [],
      }),
      aggregation: JSON.stringify({
        enableAggregation: true,
        aggregationTypes: ['count', 'distribution'],
        timeWindows: [],
        groupBy: [],
        filters: [],
      }),
      isActive: true,
      isRequired: false,
      allowMultiple: true,
      metadata: JSON.stringify({
        creator: mockUser.id,
        creatorName: mockUser.fullName,
        tags: ['test', 'categorical'],
        version: 1,
      }),
      permissions: JSON.stringify({
        canRead: [mockUser.id],
        canWrite: [mockUser.id],
        canDelete: [mockUser.id],
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await prisma.feedbackDefinition.create({ data: definition });
    return definition;
  }

  async function createTestFeedbackInstances(definitionId: string): Promise<void> {
    const instances = Array.from({ length: 10 }, (_, i) => ({
      id: `test-inst-${Date.now()}-${i}`,
      definitionId,
      definitionName: 'test-feedback',
      entityType: 'trace',
      entityId: `trace-${i}`,
      value: JSON.stringify(Math.random() * 10),
      workspaceId: 'test-workspace-123',
      source: JSON.stringify({
        type: 'human',
        userId: mockUser.id,
        userName: mockUser.fullName,
      }),
      metadata: JSON.stringify({
        version: 1,
        tags: [],
      }),
      isVerified: false,
      createdAt: new Date(Date.now() - i * 60000), // Spread over time
      updatedAt: new Date(Date.now() - i * 60000),
    }));

    for (const instance of instances) {
      await prisma.feedbackInstance.create({ data: instance });
    }
  }

  async function createVerifiedFeedbackInstance(definitionId: string): Promise<any> {
    const instance = await createTestFeedbackInstance(definitionId);
    await prisma.feedbackInstance.update({
      where: { id: instance.id },
      data: {
        isVerified: true,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
      },
    });
    return instance;
  }

  async function createAggregationTestData(numericalDefId: string, categoricalDefId: string): Promise<void> {
    // Create numerical feedback instances
    for (let i = 0; i < 20; i++) {
      await prisma.feedbackInstance.create({
        data: {
          id: `num-inst-${i}`,
          definitionId: numericalDefId,
          definitionName: 'numerical-test',
          entityType: 'trace',
          entityId: `trace-${i % 5}`, // 5 different traces
          value: JSON.stringify(Math.random() * 10),
          workspaceId: 'test-workspace-123',
          source: JSON.stringify({
            type: 'human',
            userId: mockUser.id,
            userName: mockUser.fullName,
          }),
          metadata: JSON.stringify({
            version: 1,
            tags: [],
          }),
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Create categorical feedback instances
    const categories = ['excellent', 'good', 'poor'];
    for (let i = 0; i < 15; i++) {
      await prisma.feedbackInstance.create({
        data: {
          id: `cat-inst-${i}`,
          definitionId: categoricalDefId,
          definitionName: 'categorical-test',
          entityType: 'trace',
          entityId: `trace-${i % 3}`, // 3 different traces
          value: JSON.stringify(categories[i % 3]),
          workspaceId: 'test-workspace-123',
          source: JSON.stringify({
            type: 'human',
            userId: mockUser.id,
            userName: mockUser.fullName,
          }),
          metadata: JSON.stringify({
            version: 1,
            tags: [],
          }),
          isVerified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
});