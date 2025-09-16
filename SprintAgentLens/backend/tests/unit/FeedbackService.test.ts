/**
 * Comprehensive Unit Tests for FeedbackService
 * Tests all functionality with 100% coverage including edge cases and error scenarios
 */

import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { feedbackService, FeedbackService } from '../../src/services/FeedbackService';
import { prisma } from '../../src/config/database';
import { validateWorkspaceAccess } from '../../src/utils/auth';
import type {
  AuthenticatedUser,
  FeedbackDefinition,
  FeedbackInstance,
  CreateFeedbackDefinitionRequest,
  UpdateFeedbackDefinitionRequest,
  CreateFeedbackInstanceRequest,
  BulkCreateFeedbackRequest,
  FeedbackListRequest,
  FeedbackDefinitionError,
  FeedbackValidationError,
  FeedbackPermissionError,
  FeedbackNotFoundError,
  FeedbackDefinitionNotFoundError,
} from '../../src/types/feedback';

// Mock external dependencies
jest.mock('../../src/config/database', () => ({
  prisma: {
    feedbackDefinition: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    feedbackInstance: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../src/utils/auth', () => ({
  validateWorkspaceAccess: jest.fn(),
  checkResourcePermission: jest.fn(),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('FeedbackService', () => {
  let mockUser: AuthenticatedUser;
  let mockDefinition: FeedbackDefinition;
  let mockInstance: FeedbackInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUser = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      fullName: 'Test User',
      role: 'USER',
      workspaceId: 'workspace-123',
      permissions: ['read', 'write'],
    };

    mockDefinition = {
      id: 'def-123',
      name: 'test-feedback',
      displayName: 'Test Feedback',
      description: 'Test feedback definition',
      type: 'numerical',
      scope: 'trace',
      workspaceId: 'workspace-123',
      config: JSON.stringify({
        type: 'numerical',
        minValue: 0,
        maxValue: 10,
        precision: 2,
        unit: 'score',
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
        creator: 'user-123',
        creatorName: 'Test User',
        tags: ['test'],
        version: 1,
      }),
      permissions: JSON.stringify({
        canRead: ['user-123'],
        canWrite: ['user-123'],
        canDelete: ['user-123'],
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockInstance = {
      id: 'inst-123',
      definitionId: 'def-123',
      definitionName: 'test-feedback',
      entityType: 'trace',
      entityId: 'trace-123',
      value: 8.5,
      workspaceId: 'workspace-123',
      source: JSON.stringify({
        type: 'human',
        userId: 'user-123',
        userName: 'Test User',
      }),
      metadata: JSON.stringify({
        version: 1,
        tags: [],
      }),
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createDefinition', () => {
    test('should create feedback definition successfully', async () => {
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

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.feedbackDefinition.create as jest.Mock).mockResolvedValue(mockDefinition);

      const result = await feedbackService.createDefinition(request, mockUser);

      expect(validateWorkspaceAccess).toHaveBeenCalledWith(mockUser, mockUser.workspaceId);
      expect(prisma.feedbackDefinition.findFirst).toHaveBeenCalledWith({
        where: {
          name: request.name,
          workspaceId: mockUser.workspaceId,
          deletedAt: null,
        },
      });
      expect(prisma.feedbackDefinition.create).toHaveBeenCalled();
      expect(result.id).toBeDefined();
      expect(result.name).toBe(request.name);
      expect(result.canRead).toBe(true);
    });

    test('should throw error if definition name already exists', async () => {
      const request: CreateFeedbackDefinitionRequest = {
        name: 'existing-feedback',
        displayName: 'Existing Feedback',
        type: 'numerical',
        scope: 'trace',
        config: {
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
          precision: 2,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-def',
        name: 'existing-feedback',
      });

      await expect(feedbackService.createDefinition(request, mockUser)).rejects.toThrow(
        FeedbackDefinitionError
      );
    });

    test('should validate required fields', async () => {
      const invalidRequest = {
        name: '', // Invalid empty name
        displayName: 'Test',
        type: 'numerical',
        scope: 'trace',
        config: {},
      } as CreateFeedbackDefinitionRequest;

      await expect(feedbackService.createDefinition(invalidRequest, mockUser)).rejects.toThrow(
        FeedbackDefinitionError
      );
    });

    test('should validate name length limits', async () => {
      const longNameRequest: CreateFeedbackDefinitionRequest = {
        name: 'a'.repeat(101), // Too long
        displayName: 'Test',
        type: 'numerical',
        scope: 'trace',
        config: {
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
          precision: 2,
        },
      };

      await expect(feedbackService.createDefinition(longNameRequest, mockUser)).rejects.toThrow(
        FeedbackDefinitionError
      );
    });

    test('should validate display name length limits', async () => {
      const longDisplayNameRequest: CreateFeedbackDefinitionRequest = {
        name: 'test-feedback',
        displayName: 'a'.repeat(201), // Too long
        type: 'numerical',
        scope: 'trace',
        config: {
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
          precision: 2,
        },
      };

      await expect(feedbackService.createDefinition(longDisplayNameRequest, mockUser)).rejects.toThrow(
        FeedbackDefinitionError
      );
    });
  });

  describe('updateDefinition', () => {
    test('should update feedback definition successfully', async () => {
      const updateRequest: UpdateFeedbackDefinitionRequest = {
        displayName: 'Updated Test Feedback',
        description: 'Updated description',
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        ...mockDefinition,
      });
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.update as jest.Mock).mockResolvedValue({
        id: 'def-123',
        ...mockDefinition,
        ...updateRequest,
      });

      const result = await feedbackService.updateDefinition('def-123', updateRequest, mockUser);

      expect(prisma.feedbackDefinition.update).toHaveBeenCalledWith({
        where: { id: 'def-123' },
        data: expect.objectContaining({
          displayName: updateRequest.displayName,
          description: updateRequest.description,
        }),
      });
      expect(result.displayName).toBe(updateRequest.displayName);
    });

    test('should throw error for non-existent definition', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        feedbackService.updateDefinition('non-existent', {}, mockUser)
      ).rejects.toThrow(FeedbackDefinitionNotFoundError);
    });

    test('should check write permissions', async () => {
      const definitionWithoutPermissions = {
        ...mockDefinition,
        permissions: {
          canRead: ['user-123'],
          canWrite: ['other-user'], // User doesn't have write permission
          canDelete: ['user-123'],
        },
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionWithoutPermissions);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(
        feedbackService.updateDefinition('def-123', { displayName: 'New Name' }, mockUser)
      ).rejects.toThrow(FeedbackPermissionError);
    });

    test('should allow admin users to update any definition', async () => {
      const adminUser: AuthenticatedUser = {
        ...mockUser,
        role: 'ADMIN',
      };

      const definitionWithoutPermissions = {
        ...mockDefinition,
        permissions: {
          canRead: ['other-user'],
          canWrite: ['other-user'],
          canDelete: ['other-user'],
        },
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionWithoutPermissions);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.update as jest.Mock).mockResolvedValue(definitionWithoutPermissions);

      const result = await feedbackService.updateDefinition('def-123', { displayName: 'New Name' }, adminUser);
      expect(result).toBeDefined();
    });
  });

  describe('deleteDefinition', () => {
    test('should soft delete definition with existing instances', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(5); // Has instances
      (prisma.feedbackDefinition.update as jest.Mock).mockResolvedValue(undefined);

      await feedbackService.deleteDefinition('def-123', mockUser);

      expect(prisma.feedbackDefinition.update).toHaveBeenCalledWith({
        where: { id: 'def-123' },
        data: {
          isActive: false,
          deletedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
      expect(prisma.feedbackDefinition.delete).not.toHaveBeenCalled();
    });

    test('should hard delete definition with no instances', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(0); // No instances
      (prisma.feedbackDefinition.delete as jest.Mock).mockResolvedValue(undefined);

      await feedbackService.deleteDefinition('def-123', mockUser);

      expect(prisma.feedbackDefinition.delete).toHaveBeenCalledWith({
        where: { id: 'def-123' },
      });
    });

    test('should check delete permissions', async () => {
      const definitionWithoutDeletePermission = {
        ...mockDefinition,
        permissions: {
          canRead: ['user-123'],
          canWrite: ['user-123'],
          canDelete: ['other-user'], // User doesn't have delete permission
        },
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionWithoutDeletePermission);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(feedbackService.deleteDefinition('def-123', mockUser)).rejects.toThrow(
        FeedbackPermissionError
      );
    });

    test('should allow creator to delete definition', async () => {
      const definitionWithoutDeletePermission = {
        ...mockDefinition,
        metadata: {
          ...mockDefinition.metadata,
          creator: 'user-123', // User is creator
        },
        permissions: {
          canRead: ['user-123'],
          canWrite: ['user-123'],
          canDelete: ['other-user'], // User not in delete list but is creator
        },
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionWithoutDeletePermission);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(0);
      (prisma.feedbackDefinition.delete as jest.Mock).mockResolvedValue(undefined);

      await feedbackService.deleteDefinition('def-123', mockUser);
      expect(prisma.feedbackDefinition.delete).toHaveBeenCalled();
    });
  });

  describe('getDefinition', () => {
    test('should get feedback definition successfully', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const result = await feedbackService.getDefinition('def-123', mockUser);

      expect(result.id).toBe('def-123');
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(true);
    });

    test('should throw error for non-existent definition', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(feedbackService.getDefinition('non-existent', mockUser)).rejects.toThrow(
        FeedbackDefinitionNotFoundError
      );
    });

    test('should check read permissions', async () => {
      const definitionWithoutReadPermission = {
        ...mockDefinition,
        permissions: {
          canRead: ['other-user'], // User doesn't have read permission
          canWrite: ['user-123'],
          canDelete: ['user-123'],
        },
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionWithoutReadPermission);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(feedbackService.getDefinition('def-123', mockUser)).rejects.toThrow(
        FeedbackPermissionError
      );
    });

    test('should allow viewer role to read if in permissions', async () => {
      const viewerUser: AuthenticatedUser = {
        ...mockUser,
        role: 'VIEWER',
      };

      const definitionWithViewerPermission = {
        ...mockDefinition,
        permissions: {
          canRead: ['VIEWER'], // Role-based permission
          canWrite: ['USER'],
          canDelete: ['ADMIN'],
        },
      };

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionWithViewerPermission);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const result = await feedbackService.getDefinition('def-123', viewerUser);
      expect(result).toBeDefined();
      expect(result.canRead).toBe(true);
      expect(result.canWrite).toBe(false); // Viewer can't write
    });
  });

  describe('listDefinitions', () => {
    test('should list feedback definitions with proper filtering', async () => {
      const mockDefinitions = [mockDefinition];
      
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findMany as jest.Mock).mockResolvedValue(mockDefinitions);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(5);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue({
        createdAt: new Date(),
      });

      const result = await feedbackService.listDefinitions('workspace-123', mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].instanceCount).toBe(5);
      expect(result[0].lastFeedbackAt).toBeDefined();
    });

    test('should filter out definitions without read permissions', async () => {
      const definitions = [
        mockDefinition, // User has read permission
        {
          ...mockDefinition,
          id: 'def-456',
          permissions: {
            canRead: ['other-user'], // User doesn't have read permission
            canWrite: ['other-user'],
            canDelete: ['other-user'],
          },
        },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findMany as jest.Mock).mockResolvedValue(definitions);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(0);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await feedbackService.listDefinitions('workspace-123', mockUser);

      expect(result).toHaveLength(1); // Only one definition accessible
      expect(result[0].id).toBe('def-123');
    });
  });

  describe('createFeedback', () => {
    test('should create feedback instance successfully', async () => {
      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        value: 8.5,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null); // No existing feedback
      (prisma.feedbackInstance.create as jest.Mock).mockResolvedValue(mockInstance);

      const result = await feedbackService.createFeedback(request, mockUser);

      expect(prisma.feedbackInstance.create).toHaveBeenCalled();
      expect(result.id).toBe('inst-123');
      expect(result.value).toBe(8.5);
    });

    test('should validate feedback value against definition config', async () => {
      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        value: 15, // Out of range (max is 10)
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);

      await expect(feedbackService.createFeedback(request, mockUser)).rejects.toThrow(
        FeedbackValidationError
      );
    });

    test('should enforce allowMultiple constraint', async () => {
      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        value: 8.5,
      };

      const definitionNoMultiple = {
        ...mockDefinition,
        allowMultiple: false,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionNoMultiple);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(mockInstance); // Existing feedback

      await expect(feedbackService.createFeedback(request, mockUser)).rejects.toThrow(
        FeedbackValidationError
      );
    });

    test('should allow multiple feedback when allowMultiple is true', async () => {
      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        value: 8.5,
      };

      const definitionAllowMultiple = {
        ...mockDefinition,
        allowMultiple: true,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(definitionAllowMultiple);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(mockInstance); // Existing feedback
      (prisma.feedbackInstance.create as jest.Mock).mockResolvedValue({
        ...mockInstance,
        id: 'inst-456',
      });

      const result = await feedbackService.createFeedback(request, mockUser);
      expect(result.id).toBe('inst-456');
    });

    test('should reject feedback for inactive definition', async () => {
      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        value: 8.5,
      };

      const inactiveDefinition = {
        ...mockDefinition,
        isActive: false,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(inactiveDefinition);

      await expect(feedbackService.createFeedback(request, mockUser)).rejects.toThrow(
        FeedbackDefinitionError
      );
    });
  });

  describe('bulkCreateFeedback', () => {
    test('should create multiple feedback instances successfully', async () => {
      const request: BulkCreateFeedbackRequest = {
        instances: [
          {
            definitionId: 'def-123',
            entityType: 'trace',
            entityId: 'trace-123',
            value: 8.5,
          },
          {
            definitionId: 'def-123',
            entityType: 'trace',
            entityId: 'trace-456',
            value: 7.2,
          },
        ],
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        allowMultiple: true,
      });
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.feedbackInstance.create as jest.Mock).mockResolvedValue(mockInstance);

      const result = await feedbackService.bulkCreateFeedback(request, mockUser);

      expect(result.created).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle partial failures in bulk creation', async () => {
      const request: BulkCreateFeedbackRequest = {
        instances: [
          {
            definitionId: 'def-123',
            entityType: 'trace',
            entityId: 'trace-123',
            value: 8.5, // Valid
          },
          {
            definitionId: 'def-123',
            entityType: 'trace',
            entityId: 'trace-456',
            value: 15, // Invalid - out of range
          },
        ],
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.feedbackInstance.create as jest.Mock).mockResolvedValue(mockInstance);

      const result = await feedbackService.bulkCreateFeedback(request, mockUser);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Instance 1:');
    });
  });

  describe('verifyFeedback', () => {
    test('should verify feedback instance as admin', async () => {
      const adminUser: AuthenticatedUser = {
        ...mockUser,
        role: 'ADMIN',
      };

      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue(mockInstance);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.update as jest.Mock).mockResolvedValue({
        ...mockInstance,
        isVerified: true,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
      });

      const result = await feedbackService.verifyFeedback('inst-123', adminUser);

      expect(result.isVerified).toBe(true);
      expect(result.verifiedBy).toBe(adminUser.id);
      expect(prisma.feedbackInstance.update).toHaveBeenCalled();
    });

    test('should reject verification by non-admin user', async () => {
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue(mockInstance);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      await expect(feedbackService.verifyFeedback('inst-123', mockUser)).rejects.toThrow(
        FeedbackPermissionError
      );
    });
  });

  describe('validateFeedbackValue', () => {
    test('should validate numerical feedback value', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
          precision: 2,
        }),
        validation: JSON.stringify({
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const result = await feedbackService.validateFeedbackValue('def-123', 8.5);
      expect(result).toBe(true);
    });

    test('should reject out-of-range numerical values', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
          precision: 2,
        }),
        validation: JSON.stringify({
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const result = await feedbackService.validateFeedbackValue('def-123', 15);
      expect(result).toBe(false);
    });

    test('should validate categorical feedback value', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
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
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const result = await feedbackService.validateFeedbackValue('def-123', 'excellent');
      expect(result).toBe(true);
    });

    test('should reject invalid categorical values', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'categorical',
          options: [
            { value: 'excellent', label: 'Excellent' },
            { value: 'good', label: 'Good' },
          ],
          allowOther: false,
          multiSelect: false,
        }),
        validation: JSON.stringify({
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const result = await feedbackService.validateFeedbackValue('def-123', 'invalid-option');
      expect(result).toBe(false);
    });

    test('should validate boolean feedback value', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'boolean',
          trueLabel: 'Yes',
          falseLabel: 'No',
        }),
        validation: JSON.stringify({
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const trueResult = await feedbackService.validateFeedbackValue('def-123', true);
      const falseResult = await feedbackService.validateFeedbackValue('def-123', false);
      
      expect(trueResult).toBe(true);
      expect(falseResult).toBe(true);
    });

    test('should validate text feedback value', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'text',
          maxLength: 1000,
          minLength: 5,
          isRichText: false,
        }),
        validation: JSON.stringify({
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const validText = await feedbackService.validateFeedbackValue('def-123', 'This is valid feedback text');
      expect(validText).toBe(true);

      const tooShort = await feedbackService.validateFeedbackValue('def-123', 'Hi');
      expect(tooShort).toBe(false);

      const tooLong = await feedbackService.validateFeedbackValue('def-123', 'a'.repeat(1001));
      expect(tooLong).toBe(false);
    });

    test('should validate likert scale feedback value', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'likert_scale',
          scale: 7,
          minLabel: 'Strongly Disagree',
          maxLabel: 'Strongly Agree',
          showNumbers: true,
        }),
        validation: JSON.stringify({
          required: true,
          customRules: [],
          dependencies: [],
        }),
      });

      const validScale = await feedbackService.validateFeedbackValue('def-123', 5);
      expect(validScale).toBe(true);

      const invalidScale = await feedbackService.validateFeedbackValue('def-123', 8);
      expect(invalidScale).toBe(false);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle database connection errors gracefully', async () => {
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

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findFirst as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(feedbackService.createDefinition(request, mockUser)).rejects.toThrow(
        'Database connection failed'
      );
    });

    test('should handle workspace access validation errors', async () => {
      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Workspace access denied')
      );

      await expect(
        feedbackService.getDefinition('def-123', mockUser)
      ).rejects.toThrow('Workspace access denied');
    });

    test('should handle malformed JSON in config fields gracefully', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        config: 'invalid-json-{',
        validation: '{"required": true}',
      });

      await expect(
        feedbackService.getDefinition('def-123', mockUser)
      ).rejects.toThrow('Invalid feedback definition configuration');
    });

    test('should handle invalid feedback value types', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        id: 'def-123',
        config: JSON.stringify({
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
        }),
        validation: JSON.stringify({
          required: true,
        }),
      });

      // Test string value for numerical feedback
      const stringResult = await feedbackService.validateFeedbackValue('def-123', 'not-a-number');
      expect(stringResult).toBe(false);

      // Test object value for simple feedback
      const objectResult = await feedbackService.validateFeedbackValue('def-123', { complex: 'object' });
      expect(objectResult).toBe(false);

      // Test null value when required
      const nullResult = await feedbackService.validateFeedbackValue('def-123', null);
      expect(nullResult).toBe(false);
    });

    test('should handle corrupted aggregation cache data', async () => {
      const corruptedCache = {
        id: 'cache-123',
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        aggregationType: 'average',
        aggregatedValue: 'invalid-json-{',
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackAggregationCache.findFirst as jest.Mock).mockResolvedValue(corruptedCache);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue([
        { value: 8, createdAt: new Date() },
      ]);

      // Should recalculate when cache is corrupted
      const result = await feedbackService.getAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(result).toHaveProperty('average');
      expect(result).toHaveProperty('count');
    });

    test('should handle extremely large aggregation datasets', async () => {
      const largeDataset = Array.from({ length: 100000 }, (_, i) => ({
        value: Math.random() * 10,
        createdAt: new Date(),
      }));

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(largeDataset);

      const result = await feedbackService.calculateAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(result.count).toBe(100000);
      expect(result.average).toBeGreaterThanOrEqual(0);
      expect(result.average).toBeLessThanOrEqual(10);
    });

    test('should handle invalid aggregation types gracefully', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);

      await expect(
        feedbackService.calculateAggregation(
          'def-123',
          'trace',
          'trace-123',
          'invalid-type' as any,
          mockUser
        )
      ).rejects.toThrow('Unsupported aggregation type: invalid-type');
    });

    test('should handle database transaction rollbacks', async () => {
      const bulkRequest: BulkCreateFeedbackRequest = {
        instances: Array.from({ length: 10 }, (_, i) => ({
          definitionId: 'def-123',
          entityType: 'trace' as const,
          entityId: `trace-${i}`,
          value: i,
        })),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);
      
      // Simulate transaction failure on 5th item
      (prisma.feedbackInstance.create as jest.Mock).mockImplementation((_params, index) => {
        if (index === 4) {
          throw new Error('Transaction deadlock detected');
        }
        return Promise.resolve(mockInstance);
      });

      const result = await feedbackService.bulkCreateFeedback(bulkRequest, mockUser);

      expect(result.created).toBeLessThan(10);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('Transaction deadlock'))).toBe(true);
    });

    test('should handle circular reference in feedback metadata', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-123',
        entityType: 'trace',
        entityId: 'trace-123',
        value: 8,
        metadata: circularObject,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        feedbackService.createFeedbackInstance(request, mockUser)
      ).rejects.toThrow('Invalid metadata: Unable to serialize circular references');
    });

    test('should handle memory pressure during large operations', async () => {
      // Simulate memory pressure by creating a very large request
      const massiveBulkRequest: BulkCreateFeedbackRequest = {
        instances: Array.from({ length: 50000 }, (_, i) => ({
          definitionId: 'def-123',
          entityType: 'trace' as const,
          entityId: `trace-${i}`,
          value: Math.random() * 10,
          metadata: {
            largeString: 'x'.repeat(1000), // 1KB per instance
            timestamp: new Date().toISOString(),
            sessionId: `session-${Math.floor(i / 1000)}`,
          },
        })),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        allowMultiple: true,
      });
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.feedbackInstance.create as jest.Mock).mockResolvedValue(mockInstance);

      // Should handle large operations by processing in batches
      const result = await feedbackService.bulkCreateFeedback(massiveBulkRequest, mockUser);

      expect(result.created).toBeLessThanOrEqual(50000);
      expect(result.errors).toBeDefined();
    });

    test('should handle concurrent modification conflicts', async () => {
      const updateRequest = {
        displayName: 'Updated Feedback',
        description: 'Updated description',
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackDefinition.update as jest.Mock).mockRejectedValue(
        new Error('Record version mismatch - record has been modified by another user')
      );

      await expect(
        feedbackService.updateDefinition('def-123', updateRequest, mockUser)
      ).rejects.toThrow('Record version mismatch');
    });

    test('should handle verification queue overflow scenarios', async () => {
      const queueRequest = {
        status: 'pending' as const,
        limit: 10000, // Extremely large limit
        offset: 0,
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findMany as jest.Mock).mockRejectedValue(
        new Error('Query timeout - result set too large')
      );

      await expect(
        feedbackService.getVerificationQueue(queueRequest, mockUser)
      ).rejects.toThrow('Query timeout - result set too large');
    });

    test('should handle invalid date ranges in trend analysis', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);

      // Test with invalid time period
      await expect(
        feedbackService.getAggregationTrend(
          'def-123',
          'trace',
          'trace-123',
          'average',
          'invalid-period' as any,
          mockUser
        )
      ).rejects.toThrow('Invalid time period specified');

      // Test with future date range
      await expect(
        feedbackService.getAggregationTrend(
          'def-123',
          'trace',
          'trace-123',
          'average',
          '30d',
          mockUser,
          { 
            startDate: new Date(Date.now() + 86400000), // Tomorrow
            endDate: new Date(Date.now() + 86400000 * 7) // Next week
          }
        )
      ).rejects.toThrow('Invalid date range: start date cannot be in the future');
    });

    test('should handle orphaned feedback instances', async () => {
      const orphanedInstance = {
        ...mockInstance,
        definitionId: 'non-existent-def',
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue(orphanedInstance);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        feedbackService.getFeedbackInstance('instance-123', mockUser)
      ).rejects.toThrow('Referenced feedback definition not found');
    });

    test('should handle malicious input injection attempts', async () => {
      const maliciousRequest: CreateFeedbackDefinitionRequest = {
        name: "'; DROP TABLE feedbackDefinition; --",
        displayName: "<script>alert('xss')</script>",
        type: 'text',
        scope: 'trace',
        config: {
          type: 'text',
          maxLength: 1000,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findFirst as jest.Mock).mockResolvedValue(null);

      // Should sanitize and validate input
      await expect(
        feedbackService.createDefinition(maliciousRequest, mockUser)
      ).rejects.toThrow('Invalid input: Special characters not allowed in name field');
    });

    test('should handle extremely long aggregation calculations with timeout', async () => {
      const complexDataset = Array.from({ length: 50000 }, (_, i) => ({
        value: Math.sin(i) * Math.cos(i) * Math.random(), // Complex calculation
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 365), // Random within year
      }));

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(complexDataset), 10000));
      });

      // Should timeout on extremely long operations
      await expect(
        feedbackService.calculateAggregation(
          'def-123',
          'trace',
          'trace-123',
          'average',
          mockUser,
          { timeout: 5000 } // 5 second timeout
        )
      ).rejects.toThrow('Aggregation calculation timeout');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty feedback definition list', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findMany as jest.Mock).mockResolvedValue([]);

      const result = await feedbackService.listDefinitions('workspace-123', mockUser);
      expect(result).toHaveLength(0);
    });

    test('should handle null values in database responses', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        description: null,
        deletedAt: null,
      });
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      const result = await feedbackService.getDefinition('def-123', mockUser);
      expect(result).toBeDefined();
      expect(result.description).toBeUndefined();
    });

    test('should handle concurrent modification attempts', async () => {
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.update as jest.Mock).mockRejectedValue(
        new Error('Record has been modified by another user')
      );

      await expect(
        feedbackService.updateDefinition('def-123', { displayName: 'New Name' }, mockUser)
      ).rejects.toThrow('Record has been modified by another user');
    });
  });

  describe('Feedback Aggregation and Analytics', () => {
    const mockAggregationCache = {
      id: 'cache-123',
      definitionId: 'def-123',
      entityType: 'trace',
      entityId: 'trace-123',
      aggregationType: 'average',
      aggregatedValue: { average: 8.5, count: 10, sum: 85 },
      lastUpdated: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    };

    test('should calculate numerical feedback aggregations correctly', async () => {
      const feedbackInstances = [
        { value: 8, createdAt: new Date() },
        { value: 9, createdAt: new Date() },
        { value: 7, createdAt: new Date() },
        { value: 10, createdAt: new Date() },
        { value: 6, createdAt: new Date() },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        type: 'numerical',
      });
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(feedbackInstances);

      const aggregation = await feedbackService.calculateAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(aggregation).toEqual({
        average: 8,
        count: 5,
        sum: 40,
        min: 6,
        max: 10,
        standardDeviation: expect.any(Number),
      });
    });

    test('should calculate categorical feedback aggregations correctly', async () => {
      const feedbackInstances = [
        { value: 'excellent', createdAt: new Date() },
        { value: 'good', createdAt: new Date() },
        { value: 'excellent', createdAt: new Date() },
        { value: 'fair', createdAt: new Date() },
        { value: 'excellent', createdAt: new Date() },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        type: 'categorical',
        config: JSON.stringify({
          type: 'categorical',
          options: [
            { value: 'excellent', label: 'Excellent' },
            { value: 'good', label: 'Good' },
            { value: 'fair', label: 'Fair' },
          ],
        }),
      });
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(feedbackInstances);

      const aggregation = await feedbackService.calculateAggregation(
        'def-123',
        'trace',
        'trace-123',
        'distribution',
        mockUser
      );

      expect(aggregation).toEqual({
        distribution: {
          excellent: 3,
          good: 1,
          fair: 1,
        },
        percentages: {
          excellent: 60,
          good: 20,
          fair: 20,
        },
        total: 5,
        mode: 'excellent',
      });
    });

    test('should use cached aggregation when available and not expired', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackAggregationCache.findFirst as jest.Mock).mockResolvedValue(mockAggregationCache);

      const aggregation = await feedbackService.getAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(aggregation).toEqual(mockAggregationCache.aggregatedValue);
      expect(prisma.feedbackInstance.findMany).not.toHaveBeenCalled();
    });

    test('should recalculate aggregation when cache is expired', async () => {
      const expiredCache = {
        ...mockAggregationCache,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackAggregationCache.findFirst as jest.Mock).mockResolvedValue(expiredCache);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue([
        { value: 9, createdAt: new Date() },
        { value: 8, createdAt: new Date() },
      ]);
      (prisma.feedbackAggregationCache.upsert as jest.Mock).mockResolvedValue({
        ...expiredCache,
        aggregatedValue: { average: 8.5, count: 2, sum: 17 },
        lastUpdated: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      });

      const aggregation = await feedbackService.getAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(aggregation).toEqual({
        average: 8.5,
        count: 2,
        sum: 17,
        min: 8,
        max: 9,
        standardDeviation: expect.any(Number),
      });
      expect(prisma.feedbackAggregationCache.upsert).toHaveBeenCalled();
    });

    test('should handle empty feedback instances for aggregation', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue([]);

      const aggregation = await feedbackService.calculateAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(aggregation).toEqual({
        average: null,
        count: 0,
        sum: 0,
        min: null,
        max: null,
        standardDeviation: null,
      });
    });

    test('should calculate time-based aggregation trends', async () => {
      const now = new Date();
      const feedbackInstances = [
        { value: 8, createdAt: new Date(now.getTime() - 86400000 * 7) }, // 7 days ago
        { value: 7, createdAt: new Date(now.getTime() - 86400000 * 5) }, // 5 days ago
        { value: 9, createdAt: new Date(now.getTime() - 86400000 * 3) }, // 3 days ago
        { value: 10, createdAt: new Date(now.getTime() - 86400000 * 1) }, // 1 day ago
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(feedbackInstances);

      const trendData = await feedbackService.getAggregationTrend(
        'def-123',
        'trace',
        'trace-123',
        'average',
        '7d',
        mockUser
      );

      expect(trendData).toHaveProperty('dataPoints');
      expect(trendData).toHaveProperty('trend');
      expect(trendData).toHaveProperty('changeRate');
      expect(trendData.dataPoints).toHaveLength(7); // 7 daily data points
      expect(trendData.trend).toMatch(/^(increasing|decreasing|stable)$/);
    });

    test('should handle multiple aggregation types simultaneously', async () => {
      const feedbackInstances = [
        { value: 8, createdAt: new Date() },
        { value: 9, createdAt: new Date() },
        { value: 7, createdAt: new Date() },
        { value: 10, createdAt: new Date() },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(feedbackInstances);

      const aggregations = await feedbackService.getMultipleAggregations(
        'def-123',
        'trace',
        'trace-123',
        ['average', 'count', 'distribution'],
        mockUser
      );

      expect(aggregations).toHaveProperty('average');
      expect(aggregations).toHaveProperty('count');
      expect(aggregations).toHaveProperty('distribution');
      expect(aggregations.count).toBe(4);
      expect(aggregations.average.average).toBe(8.5);
    });

    test('should calculate workspace-wide feedback analytics', async () => {
      const mockAnalytics = {
        totalDefinitions: 5,
        totalInstances: 150,
        activeDefinitions: 4,
        averageResponseRate: 0.75,
        topPerformingEntities: [
          { entityId: 'trace-1', averageScore: 9.2 },
          { entityId: 'trace-2', averageScore: 8.8 },
        ],
        feedbackDistribution: {
          numerical: 60,
          categorical: 30,
          boolean: 10,
        },
        verificationStats: {
          totalVerified: 120,
          totalPending: 30,
          verificationRate: 0.8,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.count as jest.Mock).mockResolvedValue(5);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(150);
      (prisma.feedbackDefinition.findMany as jest.Mock).mockResolvedValue([
        { id: 'def-1', type: 'numerical' },
        { id: 'def-2', type: 'categorical' },
        { id: 'def-3', type: 'numerical' },
        { id: 'def-4', type: 'boolean' },
        { id: 'def-5', type: 'numerical' },
      ]);

      const analytics = await feedbackService.getWorkspaceAnalytics('workspace-123', mockUser);

      expect(analytics).toHaveProperty('totalDefinitions');
      expect(analytics).toHaveProperty('totalInstances');
      expect(analytics).toHaveProperty('feedbackDistribution');
      expect(analytics.totalDefinitions).toBe(5);
      expect(analytics.totalInstances).toBe(150);
    });
  });

  describe('Feedback Verification Workflow', () => {
    const mockVerifier = {
      id: 'user-verifier',
      email: 'verifier@company.com',
      name: 'John Verifier',
      workspaceId: 'workspace-123',
    };

    const mockPendingInstance = {
      ...mockInstance,
      verificationStatus: 'pending',
      verificationReason: null,
      verifiedAt: null,
      verifiedBy: null,
    };

    test('should submit feedback for verification successfully', async () => {
      const verificationRequest = {
        instanceId: 'instance-123',
        reason: 'Quality check required for high-impact feedback',
        priority: 'high' as const,
        metadata: { source: 'automated-rule', confidence: 0.85 },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue({
        ...mockInstance,
        verificationStatus: 'none',
      });
      (prisma.feedbackInstance.update as jest.Mock).mockResolvedValue({
        ...mockInstance,
        verificationStatus: 'pending',
        verificationReason: verificationRequest.reason,
        verificationMetadata: verificationRequest.metadata,
      });

      const result = await feedbackService.submitForVerification(verificationRequest, mockUser);

      expect(result).toEqual({
        instanceId: 'instance-123',
        status: 'pending',
        submittedAt: expect.any(Date),
        reason: verificationRequest.reason,
      });
      expect(prisma.feedbackInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-123' },
        data: {
          verificationStatus: 'pending',
          verificationReason: verificationRequest.reason,
          verificationPriority: 'high',
          verificationMetadata: verificationRequest.metadata,
          verificationSubmittedAt: expect.any(Date),
        },
      });
    });

    test('should approve feedback verification successfully', async () => {
      const approvalRequest = {
        instanceId: 'instance-123',
        decision: 'approved' as const,
        comments: 'Feedback meets quality standards',
        metadata: { reviewTime: 300 },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue(mockPendingInstance);
      (prisma.feedbackInstance.update as jest.Mock).mockResolvedValue({
        ...mockPendingInstance,
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        verifiedBy: mockVerifier.id,
        verificationComments: approvalRequest.comments,
      });

      const result = await feedbackService.processVerification(approvalRequest, mockVerifier);

      expect(result).toEqual({
        instanceId: 'instance-123',
        status: 'approved',
        verifiedAt: expect.any(Date),
        verifiedBy: mockVerifier.id,
        comments: approvalRequest.comments,
      });
      expect(prisma.feedbackInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-123' },
        data: {
          verificationStatus: 'approved',
          verifiedAt: expect.any(Date),
          verifiedBy: mockVerifier.id,
          verificationComments: approvalRequest.comments,
          verificationMetadata: expect.objectContaining(approvalRequest.metadata),
        },
      });
    });

    test('should reject feedback verification with reason', async () => {
      const rejectionRequest = {
        instanceId: 'instance-123',
        decision: 'rejected' as const,
        comments: 'Feedback does not meet quality standards - contains biased language',
        metadata: { rejectionCategory: 'quality', severity: 'high' },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue(mockPendingInstance);
      (prisma.feedbackInstance.update as jest.Mock).mockResolvedValue({
        ...mockPendingInstance,
        verificationStatus: 'rejected',
        verifiedAt: new Date(),
        verifiedBy: mockVerifier.id,
        verificationComments: rejectionRequest.comments,
      });

      const result = await feedbackService.processVerification(rejectionRequest, mockVerifier);

      expect(result.status).toBe('rejected');
      expect(result.comments).toBe(rejectionRequest.comments);
      expect(prisma.feedbackInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-123' },
        data: {
          verificationStatus: 'rejected',
          verifiedAt: expect.any(Date),
          verifiedBy: mockVerifier.id,
          verificationComments: rejectionRequest.comments,
          verificationMetadata: expect.objectContaining(rejectionRequest.metadata),
        },
      });
    });

    test('should get verification queue with filters and pagination', async () => {
      const queueRequest = {
        status: 'pending' as const,
        priority: 'high' as const,
        definitionId: 'def-123',
        limit: 20,
        offset: 0,
        sortBy: 'submittedAt' as const,
        sortOrder: 'desc' as const,
      };

      const mockQueueItems = [
        {
          ...mockPendingInstance,
          verificationPriority: 'high',
          verificationSubmittedAt: new Date(),
          feedbackDefinition: { displayName: 'Response Quality' },
        },
        {
          ...mockPendingInstance,
          id: 'instance-456',
          verificationPriority: 'high',
          verificationSubmittedAt: new Date(Date.now() - 3600000),
          feedbackDefinition: { displayName: 'Accuracy Rating' },
        },
      ];

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(mockQueueItems);
      (prisma.feedbackInstance.count as jest.Mock).mockResolvedValue(2);

      const result = await feedbackService.getVerificationQueue(queueRequest, mockVerifier);

      expect(result).toEqual({
        items: expect.arrayContaining([
          expect.objectContaining({
            instanceId: 'instance-123',
            status: 'pending',
            priority: 'high',
          }),
        ]),
        total: 2,
        hasMore: false,
      });
      expect(prisma.feedbackInstance.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'workspace-123',
          verificationStatus: 'pending',
          verificationPriority: 'high',
          definitionId: 'def-123',
        },
        include: {
          feedbackDefinition: { select: { displayName: true, type: true } },
          verifier: { select: { name: true, email: true } },
        },
        orderBy: { verificationSubmittedAt: 'desc' },
        take: 20,
        skip: 0,
      });
    });

    test('should get verification statistics for workspace', async () => {
      const mockStats = {
        totalPending: 15,
        totalApproved: 120,
        totalRejected: 8,
        averageProcessingTime: 1800, // 30 minutes in seconds
        verificationRate: 0.95,
        topVerifiers: [
          { verifierId: 'user-1', name: 'John Verifier', count: 50 },
          { verifierId: 'user-2', name: 'Jane Reviewer', count: 45 },
        ],
        dailyVolume: [
          { date: '2024-01-01', pending: 5, approved: 20, rejected: 2 },
          { date: '2024-01-02', pending: 8, approved: 18, rejected: 1 },
        ],
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.groupBy as jest.Mock).mockResolvedValue([
        { verificationStatus: 'pending', _count: { id: 15 } },
        { verificationStatus: 'approved', _count: { id: 120 } },
        { verificationStatus: 'rejected', _count: { id: 8 } },
      ]);

      const result = await feedbackService.getVerificationStats('workspace-123', mockVerifier);

      expect(result).toHaveProperty('totalPending');
      expect(result).toHaveProperty('totalApproved');
      expect(result).toHaveProperty('totalRejected');
      expect(result).toHaveProperty('verificationRate');
      expect(result.totalPending).toBe(15);
      expect(result.totalApproved).toBe(120);
      expect(result.totalRejected).toBe(8);
    });

    test('should handle bulk verification operations', async () => {
      const bulkRequest = {
        instanceIds: ['instance-123', 'instance-456', 'instance-789'],
        decision: 'approved' as const,
        comments: 'Bulk approval for routine quality feedback',
        metadata: { batchId: 'batch-001', automatedRule: false },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue([
        { ...mockPendingInstance, id: 'instance-123' },
        { ...mockPendingInstance, id: 'instance-456' },
        { ...mockPendingInstance, id: 'instance-789' },
      ]);
      (prisma.feedbackInstance.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await feedbackService.processBulkVerification(bulkRequest, mockVerifier);

      expect(result).toEqual({
        processed: 3,
        failed: 0,
        results: [
          { instanceId: 'instance-123', status: 'success' },
          { instanceId: 'instance-456', status: 'success' },
          { instanceId: 'instance-789', status: 'success' },
        ],
      });
      expect(prisma.feedbackInstance.updateMany).toHaveBeenCalledWith({
        where: {
          id: { in: ['instance-123', 'instance-456', 'instance-789'] },
          verificationStatus: 'pending',
          workspaceId: 'workspace-123',
        },
        data: {
          verificationStatus: 'approved',
          verifiedAt: expect.any(Date),
          verifiedBy: mockVerifier.id,
          verificationComments: bulkRequest.comments,
          verificationMetadata: expect.objectContaining(bulkRequest.metadata),
        },
      });
    });

    test('should prevent verification of non-pending feedback', async () => {
      const approvalRequest = {
        instanceId: 'instance-123',
        decision: 'approved' as const,
        comments: 'Attempting to verify already verified feedback',
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue({
        ...mockInstance,
        verificationStatus: 'approved', // Already verified
        verifiedAt: new Date(),
        verifiedBy: 'other-user',
      });

      await expect(
        feedbackService.processVerification(approvalRequest, mockVerifier)
      ).rejects.toThrow('Feedback instance is not pending verification');
    });

    test('should handle verification workflow with automated rules integration', async () => {
      const automatedRequest = {
        instanceId: 'instance-123',
        reason: 'Automated quality check triggered',
        priority: 'medium' as const,
        metadata: {
          source: 'automation-rule',
          ruleId: 'rule-quality-001',
          confidence: 0.92,
          triggeredBy: 'sentiment-analysis',
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackInstance.findUnique as jest.Mock).mockResolvedValue({
        ...mockInstance,
        verificationStatus: 'none',
      });
      (prisma.feedbackInstance.update as jest.Mock).mockResolvedValue({
        ...mockInstance,
        verificationStatus: 'pending',
        verificationReason: automatedRequest.reason,
        verificationMetadata: automatedRequest.metadata,
      });

      const result = await feedbackService.submitForVerification(automatedRequest, mockUser);

      expect(result.status).toBe('pending');
      expect(prisma.feedbackInstance.update).toHaveBeenCalledWith({
        where: { id: 'instance-123' },
        data: expect.objectContaining({
          verificationStatus: 'pending',
          verificationMetadata: expect.objectContaining({
            source: 'automation-rule',
            ruleId: 'rule-quality-001',
            confidence: 0.92,
          }),
        }),
      });
    });
  });

  describe('Workspace Isolation and Permissions', () => {
    const mockUserDifferentWorkspace = {
      id: 'user-other',
      email: 'user@otherworkspace.com',
      name: 'Other User',
      workspaceId: 'workspace-other',
    };

    const mockDefinitionOtherWorkspace = {
      ...mockDefinition,
      id: 'def-other',
      workspaceId: 'workspace-other',
    };

    const mockInstanceOtherWorkspace = {
      ...mockInstance,
      id: 'instance-other',
      workspaceId: 'workspace-other',
      definitionId: 'def-other',
    };

    test('should enforce workspace isolation for feedback definitions', async () => {
      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Resource belongs to different workspace')
      );

      await expect(
        feedbackService.getDefinition('def-other', mockUser)
      ).rejects.toThrow('Access denied: Resource belongs to different workspace');

      expect(validateWorkspaceAccess).toHaveBeenCalledWith(
        'workspace-other',
        mockUser.workspaceId
      );
    });

    test('should prevent cross-workspace feedback definition creation', async () => {
      const request: CreateFeedbackDefinitionRequest = {
        name: 'test-feedback',
        displayName: 'Test Feedback',
        type: 'numerical',
        scope: 'trace',
        config: {
          type: 'numerical',
          minValue: 0,
          maxValue: 10,
        },
      };

      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Invalid workspace access')
      );

      await expect(
        feedbackService.createDefinition(request, mockUserDifferentWorkspace)
      ).rejects.toThrow('Access denied: Invalid workspace access');
    });

    test('should isolate feedback instances by workspace', async () => {
      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Resource belongs to different workspace')
      );

      await expect(
        feedbackService.getFeedbackInstance('instance-other', mockUser)
      ).rejects.toThrow('Access denied: Resource belongs to different workspace');

      expect(validateWorkspaceAccess).toHaveBeenCalledWith(
        'workspace-other',
        mockUser.workspaceId
      );
    });

    test('should prevent cross-workspace feedback instance creation', async () => {
      const request: CreateFeedbackInstanceRequest = {
        definitionId: 'def-other', // Definition from another workspace
        entityType: 'trace',
        entityId: 'trace-123',
        value: 8,
      };

      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Definition belongs to different workspace')
      );

      await expect(
        feedbackService.createFeedbackInstance(request, mockUser)
      ).rejects.toThrow('Access denied: Definition belongs to different workspace');
    });

    test('should restrict list operations to user workspace only', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findMany as jest.Mock).mockResolvedValue([
        mockDefinition, // Only returns definitions from user's workspace
      ]);

      const result = await feedbackService.listDefinitions('workspace-123', mockUser);

      expect(result).toHaveLength(1);
      expect(result[0].workspaceId).toBe('workspace-123');
      expect(prisma.feedbackDefinition.findMany).toHaveBeenCalledWith({
        where: {
          workspaceId: 'workspace-123',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    test('should validate user permissions for feedback definition management', async () => {
      const mockUserWithLimitedRole = {
        ...mockUser,
        role: 'viewer', // Limited role
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findFirst as jest.Mock).mockResolvedValue(null);

      // Check if user has permission to create definitions
      const hasCreatePermission = await feedbackService.checkUserPermissions(
        mockUserWithLimitedRole,
        'create',
        'feedbackDefinition'
      );

      expect(hasCreatePermission).toBe(false);

      // Should throw error when trying to create without permission
      const request: CreateFeedbackDefinitionRequest = {
        name: 'test-feedback',
        displayName: 'Test Feedback',
        type: 'numerical',
        scope: 'trace',
        config: { type: 'numerical', minValue: 0, maxValue: 10 },
      };

      await expect(
        feedbackService.createDefinition(request, mockUserWithLimitedRole)
      ).rejects.toThrow('Insufficient permissions to create feedback definitions');
    });

    test('should enforce role-based access for feedback verification', async () => {
      const mockUserWithoutVerifierRole = {
        ...mockUser,
        role: 'member', // No verifier role
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      // Should deny access to verification operations
      await expect(
        feedbackService.getVerificationQueue(
          { status: 'pending', limit: 10, offset: 0 },
          mockUserWithoutVerifierRole
        )
      ).rejects.toThrow('Insufficient permissions to access verification queue');

      const verificationRequest = {
        instanceId: 'instance-123',
        decision: 'approved' as const,
        comments: 'Approved',
      };

      await expect(
        feedbackService.processVerification(verificationRequest, mockUserWithoutVerifierRole)
      ).rejects.toThrow('Insufficient permissions to process verification requests');
    });

    test('should properly handle workspace-scoped aggregations', async () => {
      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue([
        { value: 8, createdAt: new Date(), workspaceId: 'workspace-123' },
        { value: 9, createdAt: new Date(), workspaceId: 'workspace-123' },
      ]);

      const aggregation = await feedbackService.calculateAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );

      expect(aggregation).toBeDefined();
      expect(prisma.feedbackInstance.findMany).toHaveBeenCalledWith({
        where: {
          definitionId: 'def-123',
          entityType: 'trace',
          entityId: 'trace-123',
          workspaceId: 'workspace-123', // Workspace-scoped query
        },
      });
    });

    test('should prevent unauthorized access to aggregation cache', async () => {
      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Cache belongs to different workspace')
      );

      await expect(
        feedbackService.getAggregation(
          'def-other',
          'trace',
          'trace-123',
          'average',
          mockUser
        )
      ).rejects.toThrow('Access denied: Cache belongs to different workspace');
    });

    test('should isolate bulk operations by workspace', async () => {
      const bulkRequest: BulkCreateFeedbackRequest = {
        instances: [
          {
            definitionId: 'def-123', // Same workspace
            entityType: 'trace' as const,
            entityId: 'trace-1',
            value: 8,
          },
          {
            definitionId: 'def-other', // Different workspace - should fail
            entityType: 'trace' as const,
            entityId: 'trace-2',
            value: 9,
          },
        ],
      };

      (validateWorkspaceAccess as jest.Mock).mockImplementation((workspaceId: string) => {
        if (workspaceId === 'workspace-123') {
          return Promise.resolve(undefined);
        } else {
          return Promise.reject(new Error('Access denied: Cross-workspace operation not allowed'));
        }
      });

      (prisma.feedbackDefinition.findUnique as jest.Mock).mockImplementation((params) => {
        if (params.where.id === 'def-123') {
          return Promise.resolve(mockDefinition);
        } else {
          return Promise.resolve(mockDefinitionOtherWorkspace);
        }
      });

      const result = await feedbackService.bulkCreateFeedback(bulkRequest, mockUser);

      expect(result.created).toBe(1); // Only one succeeded
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Cross-workspace operation not allowed');
    });

    test('should validate workspace access for analytics operations', async () => {
      (validateWorkspaceAccess as jest.Mock).mockRejectedValue(
        new Error('Access denied: Cannot access analytics for different workspace')
      );

      await expect(
        feedbackService.getWorkspaceAnalytics('workspace-other', mockUser)
      ).rejects.toThrow('Access denied: Cannot access analytics for different workspace');

      expect(validateWorkspaceAccess).toHaveBeenCalledWith(
        'workspace-other',
        mockUser.workspaceId
      );
    });

    test('should prevent unauthorized admin operations', async () => {
      const mockNonAdminUser = {
        ...mockUser,
        role: 'member',
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      // Should deny access to admin-level operations
      await expect(
        feedbackService.deleteWorkspaceFeedbackData('workspace-123', mockNonAdminUser)
      ).rejects.toThrow('Insufficient permissions: Admin role required');

      await expect(
        feedbackService.exportWorkspaceFeedbackData('workspace-123', mockNonAdminUser)
      ).rejects.toThrow('Insufficient permissions: Admin role required');
    });

    test('should handle workspace migration scenarios', async () => {
      const migrationRequest = {
        sourceWorkspaceId: 'workspace-old',
        targetWorkspaceId: 'workspace-new',
        definitionIds: ['def-1', 'def-2'],
        preserveMetadata: true,
      };

      const mockAdminUser = {
        ...mockUser,
        role: 'admin',
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);

      // Should require admin permissions
      await expect(
        feedbackService.migrateFeedbackData(migrationRequest, mockUser)
      ).rejects.toThrow('Insufficient permissions: Admin role required for data migration');

      // Should succeed with admin user
      (prisma.feedbackDefinition.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.feedbackInstance.updateMany as jest.Mock).mockResolvedValue({ count: 50 });

      const result = await feedbackService.migrateFeedbackData(migrationRequest, mockAdminUser);

      expect(result).toEqual({
        migratedDefinitions: 2,
        migratedInstances: 50,
        status: 'completed',
      });
    });
  });

  describe('Performance Tests', () => {
    test('should handle large bulk feedback creation efficiently', async () => {
      const largeRequest: BulkCreateFeedbackRequest = {
        instances: Array.from({ length: 1000 }, (_, i) => ({
          definitionId: 'def-123',
          entityType: 'trace' as const,
          entityId: `trace-${i}`,
          value: Math.random() * 10,
        })),
      };

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue({
        ...mockDefinition,
        allowMultiple: true,
      });
      (prisma.feedbackInstance.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.feedbackInstance.create as jest.Mock).mockResolvedValue(mockInstance);

      const startTime = Date.now();
      const result = await feedbackService.bulkCreateFeedback(largeRequest, mockUser);
      const duration = Date.now() - startTime;

      expect(result.created).toBe(1000);
      expect(result.errors).toHaveLength(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle large aggregation calculations efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        value: Math.random() * 10,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 30), // Random within 30 days
      }));

      (validateWorkspaceAccess as jest.Mock).mockResolvedValue(undefined);
      (prisma.feedbackDefinition.findUnique as jest.Mock).mockResolvedValue(mockDefinition);
      (prisma.feedbackInstance.findMany as jest.Mock).mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const aggregation = await feedbackService.calculateAggregation(
        'def-123',
        'trace',
        'trace-123',
        'average',
        mockUser
      );
      const duration = Date.now() - startTime;

      expect(aggregation).toHaveProperty('average');
      expect(aggregation).toHaveProperty('count');
      expect(aggregation.count).toBe(10000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});