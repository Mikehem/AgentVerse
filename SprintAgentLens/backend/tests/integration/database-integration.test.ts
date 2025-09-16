/**
 * Database Integration Tests
 * Tests database operations, transactions, constraints, and data integrity
 */

import { PrismaClient } from '@prisma/client';
import { AuthService } from '../../src/services/AuthService';

// Use a separate test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL?.replace('opik_db', 'opik_test_db') || 'mysql://test:test@localhost:3306/opik_test_db',
    },
  },
});

describe('Database Integration Tests', () => {
  let testWorkspace: any;
  let testUsers: any[] = [];

  beforeAll(async () => {
    // Connect and ensure clean state
    await prisma.$connect();
  });

  afterAll(async () => {
    // Clean up and disconnect
    await cleanup();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanup();
    await setupTestData();
  });

  async function cleanup() {
    // Clean up in reverse order of dependencies
    await prisma.feedbackScore.deleteMany();
    await prisma.feedbackDefinition.deleteMany();
    await prisma.automationRule.deleteMany();
    await prisma.dataset.deleteMany();
    await prisma.project.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.workspace.deleteMany();
  }

  async function setupTestData() {
    // Create test workspace
    testWorkspace = await prisma.workspace.create({
      data: {
        name: 'Database Test Workspace',
        slug: 'db-test-workspace',
        description: 'Workspace for database integration tests',
      },
    });

    // Create test users
    const salt = await AuthService.generateSalt();
    const hashedPassword = await AuthService.hashPassword('testpassword123', salt);

    const adminUser = await prisma.user.create({
      data: {
        username: 'db-admin',
        email: 'admin@dbtest.com',
        passwordHash: hashedPassword,
        salt,
        fullName: 'Database Admin',
        role: 'ADMIN',
        workspaceId: testWorkspace.id,
      },
    });

    const regularUser = await prisma.user.create({
      data: {
        username: 'db-user',
        email: 'user@dbtest.com',
        passwordHash: hashedPassword,
        salt,
        fullName: 'Database User',
        role: 'USER',
        workspaceId: testWorkspace.id,
      },
    });

    testUsers = [adminUser, regularUser];
  }

  describe('User Management', () => {
    it('should enforce unique username constraints', async () => {
      const salt = await AuthService.generateSalt();
      const hashedPassword = await AuthService.hashPassword('password123', salt);

      await expect(
        prisma.user.create({
          data: {
            username: 'db-admin', // Same as existing user
            email: 'duplicate@test.com',
            passwordHash: hashedPassword,
            salt,
            fullName: 'Duplicate User',
            role: 'USER',
            workspaceId: testWorkspace.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique email constraints', async () => {
      const salt = await AuthService.generateSalt();
      const hashedPassword = await AuthService.hashPassword('password123', salt);

      await expect(
        prisma.user.create({
          data: {
            username: 'different-username',
            email: 'admin@dbtest.com', // Same as existing user
            passwordHash: hashedPassword,
            salt,
            fullName: 'Duplicate Email User',
            role: 'USER',
            workspaceId: testWorkspace.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should maintain referential integrity with workspace', async () => {
      const salt = await AuthService.generateSalt();
      const hashedPassword = await AuthService.hashPassword('password123', salt);

      await expect(
        prisma.user.create({
          data: {
            username: 'invalid-workspace-user',
            email: 'invalid@test.com',
            passwordHash: hashedPassword,
            salt,
            fullName: 'Invalid Workspace User',
            role: 'USER',
            workspaceId: 'non-existent-workspace',
          },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete users when workspace is deleted', async () => {
      const userCountBefore = await prisma.user.count({
        where: { workspaceId: testWorkspace.id },
      });
      expect(userCountBefore).toBeGreaterThan(0);

      await prisma.workspace.delete({
        where: { id: testWorkspace.id },
      });

      const userCountAfter = await prisma.user.count({
        where: { workspaceId: testWorkspace.id },
      });
      expect(userCountAfter).toBe(0);
    });
  });

  describe('Project Management', () => {
    it('should create projects with proper workspace association', async () => {
      const project = await prisma.project.create({
        data: {
          name: 'Database Test Project',
          description: 'Project for database testing',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
        },
      });

      expect(project.workspaceId).toBe(testWorkspace.id);
      expect(project.createdBy).toBe(testUsers[0].id);

      // Verify the project can be retrieved with workspace filtering
      const projects = await prisma.project.findMany({
        where: { workspaceId: testWorkspace.id },
      });
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(project.id);
    });

    it('should enforce workspace-project referential integrity', async () => {
      await expect(
        prisma.project.create({
          data: {
            name: 'Invalid Workspace Project',
            description: 'This should fail',
            workspaceId: 'non-existent-workspace',
            createdBy: testUsers[0].id,
          },
        })
      ).rejects.toThrow();
    });

    it('should enforce user-project referential integrity', async () => {
      await expect(
        prisma.project.create({
          data: {
            name: 'Invalid User Project',
            description: 'This should fail',
            workspaceId: testWorkspace.id,
            createdBy: 'non-existent-user',
          },
        })
      ).rejects.toThrow();
    });

    it('should track project creation and update timestamps', async () => {
      const beforeCreate = new Date();
      
      const project = await prisma.project.create({
        data: {
          name: 'Timestamp Test Project',
          description: 'Testing timestamps',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
        },
      });

      const afterCreate = new Date();

      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
      expect(project.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(project.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('Dataset Management', () => {
    let testProject: any;

    beforeEach(async () => {
      testProject = await prisma.project.create({
        data: {
          name: 'Dataset Test Project',
          description: 'Project for dataset tests',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
        },
      });
    });

    it('should create datasets with proper project association', async () => {
      const dataset = await prisma.dataset.create({
        data: {
          name: 'Test Dataset',
          description: 'Dataset for testing',
          projectId: testProject.id,
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
        },
      });

      expect(dataset.projectId).toBe(testProject.id);
      expect(dataset.workspaceId).toBe(testWorkspace.id);

      // Verify dataset is linked to project
      const projectWithDatasets = await prisma.project.findUnique({
        where: { id: testProject.id },
        include: { datasets: true },
      });
      expect(projectWithDatasets?.datasets).toHaveLength(1);
      expect(projectWithDatasets?.datasets[0].id).toBe(dataset.id);
    });

    it('should enforce project-dataset referential integrity', async () => {
      await expect(
        prisma.dataset.create({
          data: {
            name: 'Invalid Project Dataset',
            description: 'This should fail',
            projectId: 'non-existent-project',
            workspaceId: testWorkspace.id,
            createdBy: testUsers[0].id,
          },
        })
      ).rejects.toThrow();
    });

    it('should cascade delete datasets when project is deleted', async () => {
      await prisma.dataset.create({
        data: {
          name: 'Cascade Test Dataset',
          description: 'Will be deleted with project',
          projectId: testProject.id,
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
        },
      });

      const datasetCountBefore = await prisma.dataset.count({
        where: { projectId: testProject.id },
      });
      expect(datasetCountBefore).toBe(1);

      await prisma.project.delete({
        where: { id: testProject.id },
      });

      const datasetCountAfter = await prisma.dataset.count({
        where: { projectId: testProject.id },
      });
      expect(datasetCountAfter).toBe(0);
    });
  });

  describe('Feedback System', () => {
    it('should create feedback definitions with proper configuration', async () => {
      const numericalFeedback = await prisma.feedbackDefinition.create({
        data: {
          name: 'Quality Rating',
          description: 'Rate response quality',
          type: 'numerical',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
          config: {
            min: 1,
            max: 5,
            step: 1,
          },
        },
      });

      expect(numericalFeedback.type).toBe('numerical');
      expect(numericalFeedback.config).toHaveProperty('min', 1);
      expect(numericalFeedback.config).toHaveProperty('max', 5);

      const categoricalFeedback = await prisma.feedbackDefinition.create({
        data: {
          name: 'Response Category',
          description: 'Categorize response type',
          type: 'categorical',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
          config: {
            options: ['helpful', 'neutral', 'unhelpful'],
          },
        },
      });

      expect(categoricalFeedback.type).toBe('categorical');
      expect(categoricalFeedback.config).toHaveProperty('options');
      expect((categoricalFeedback.config as any).options).toHaveLength(3);
    });

    it('should create feedback scores linked to definitions', async () => {
      const feedbackDef = await prisma.feedbackDefinition.create({
        data: {
          name: 'Score Test Definition',
          description: 'For testing scores',
          type: 'numerical',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
          config: { min: 0, max: 10, step: 0.1 },
        },
      });

      const feedbackScore = await prisma.feedbackScore.create({
        data: {
          value: 8.5,
          source: 'human',
          entityType: 'trace',
          entityId: 'trace-123',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
          feedbackDefinitionId: feedbackDef.id,
        },
      });

      expect(feedbackScore.value).toBe(8.5);
      expect(feedbackScore.feedbackDefinitionId).toBe(feedbackDef.id);

      // Verify the relationship
      const definitionWithScores = await prisma.feedbackDefinition.findUnique({
        where: { id: feedbackDef.id },
        include: { scores: true },
      });
      expect(definitionWithScores?.scores).toHaveLength(1);
      expect(definitionWithScores?.scores[0].id).toBe(feedbackScore.id);
    });
  });

  describe('Automation Rules', () => {
    it('should create automation rules with complex configurations', async () => {
      const automationRule = await prisma.automationRule.create({
        data: {
          name: 'Quality Assessment Rule',
          description: 'Automatically assess response quality',
          type: 'evaluation',
          trigger: 'trace_completed',
          isActive: true,
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
          configuration: {
            conditions: [
              {
                field: 'trace.duration',
                operator: 'less_than',
                value: 5000,
              },
            ],
            actions: [
              {
                type: 'llm_judge_evaluation',
                config: {
                  model: 'gpt-4',
                  prompt: 'Evaluate response quality',
                  criteria: ['accuracy', 'helpfulness'],
                },
              },
            ],
          },
          schedule: {
            type: 'trigger',
            enabled: true,
          },
        },
      });

      expect(automationRule.type).toBe('evaluation');
      expect(automationRule.isActive).toBe(true);
      expect(automationRule.configuration).toHaveProperty('conditions');
      expect(automationRule.configuration).toHaveProperty('actions');
    });

    it('should enforce automation rule workspace isolation', async () => {
      const rule = await prisma.automationRule.create({
        data: {
          name: 'Workspace Isolation Test Rule',
          description: 'Testing workspace isolation',
          type: 'evaluation',
          trigger: 'dataset_created',
          isActive: true,
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
          configuration: { conditions: [], actions: [] },
          schedule: { type: 'manual', enabled: false },
        },
      });

      // Verify only rules from the same workspace are returned
      const workspaceRules = await prisma.automationRule.findMany({
        where: { workspaceId: testWorkspace.id },
      });
      expect(workspaceRules).toHaveLength(1);
      expect(workspaceRules[0].id).toBe(rule.id);
    });
  });

  describe('Transaction Testing', () => {
    it('should handle transaction rollback on failure', async () => {
      const initialProjectCount = await prisma.project.count();

      try {
        await prisma.$transaction(async (tx) => {
          // Create a valid project
          const project = await tx.project.create({
            data: {
              name: 'Transaction Test Project',
              description: 'Testing transaction rollback',
              workspaceId: testWorkspace.id,
              createdBy: testUsers[0].id,
            },
          });

          // Attempt to create dataset with invalid project ID (should fail)
          await tx.dataset.create({
            data: {
              name: 'Invalid Transaction Dataset',
              description: 'This should cause rollback',
              projectId: 'invalid-project-id', // This will fail
              workspaceId: testWorkspace.id,
              createdBy: testUsers[0].id,
            },
          });
        });
      } catch (error) {
        // Expected to fail
      }

      // Verify project was not created due to transaction rollback
      const finalProjectCount = await prisma.project.count();
      expect(finalProjectCount).toBe(initialProjectCount);
    });

    it('should commit successful transactions', async () => {
      const initialProjectCount = await prisma.project.count();
      const initialDatasetCount = await prisma.dataset.count();

      await prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name: 'Successful Transaction Project',
            description: 'Testing successful transaction',
            workspaceId: testWorkspace.id,
            createdBy: testUsers[0].id,
          },
        });

        await tx.dataset.create({
          data: {
            name: 'Successful Transaction Dataset',
            description: 'Part of successful transaction',
            projectId: project.id,
            workspaceId: testWorkspace.id,
            createdBy: testUsers[0].id,
          },
        });
      });

      // Verify both entities were created
      const finalProjectCount = await prisma.project.count();
      const finalDatasetCount = await prisma.dataset.count();
      expect(finalProjectCount).toBe(initialProjectCount + 1);
      expect(finalDatasetCount).toBe(initialDatasetCount + 1);
    });
  });

  describe('Complex Queries and Performance', () => {
    beforeEach(async () => {
      // Create test data for performance testing
      const project = await prisma.project.create({
        data: {
          name: 'Performance Test Project',
          description: 'Project for performance testing',
          workspaceId: testWorkspace.id,
          createdBy: testUsers[0].id,
        },
      });

      // Create multiple datasets
      await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          prisma.dataset.create({
            data: {
              name: `Performance Dataset ${i + 1}`,
              description: `Dataset ${i + 1} for performance testing`,
              projectId: project.id,
              workspaceId: testWorkspace.id,
              createdBy: testUsers[i % 2].id,
            },
          })
        )
      );

      // Create feedback definitions
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          prisma.feedbackDefinition.create({
            data: {
              name: `Feedback Definition ${i + 1}`,
              description: `Definition ${i + 1} for performance testing`,
              type: i % 2 === 0 ? 'numerical' : 'categorical',
              workspaceId: testWorkspace.id,
              createdBy: testUsers[i % 2].id,
              config: i % 2 === 0 
                ? { min: 0, max: 10, step: 1 }
                : { options: ['option1', 'option2', 'option3'] },
            },
          })
        )
      );
    });

    it('should efficiently query with joins and filtering', async () => {
      const startTime = Date.now();

      const projectsWithDatasets = await prisma.project.findMany({
        where: { workspaceId: testWorkspace.id },
        include: {
          datasets: {
            include: {
              createdByUser: {
                select: { id: true, username: true, fullName: true },
              },
            },
          },
          createdByUser: {
            select: { id: true, username: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(projectsWithDatasets).toBeDefined();
      expect(projectsWithDatasets.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify data structure
      projectsWithDatasets.forEach(project => {
        expect(project.datasets).toBeDefined();
        project.datasets.forEach(dataset => {
          expect(dataset.createdByUser).toHaveProperty('username');
        });
      });
    });

    it('should handle complex aggregation queries', async () => {
      const stats = await prisma.$queryRaw`
        SELECT 
          w.name as workspace_name,
          COUNT(DISTINCT p.id) as project_count,
          COUNT(DISTINCT d.id) as dataset_count,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT f.id) as feedback_definition_count
        FROM workspaces w
        LEFT JOIN projects p ON w.id = p.workspace_id
        LEFT JOIN datasets d ON w.id = d.workspace_id
        LEFT JOIN users u ON w.id = u.workspace_id
        LEFT JOIN feedback_definitions f ON w.id = f.workspace_id
        WHERE w.id = ${testWorkspace.id}
        GROUP BY w.id, w.name
      `;

      expect(Array.isArray(stats)).toBe(true);
      expect((stats as any)[0]).toHaveProperty('workspace_name');
      expect((stats as any)[0]).toHaveProperty('project_count');
      expect((stats as any)[0]).toHaveProperty('dataset_count');
    });

    it('should handle pagination efficiently', async () => {
      const pageSize = 5;
      const page1 = await prisma.dataset.findMany({
        where: { workspaceId: testWorkspace.id },
        take: pageSize,
        skip: 0,
        orderBy: { createdAt: 'desc' },
      });

      const page2 = await prisma.dataset.findMany({
        where: { workspaceId: testWorkspace.id },
        take: pageSize,
        skip: pageSize,
        orderBy: { createdAt: 'desc' },
      });

      expect(page1).toHaveLength(pageSize);
      expect(page2).toHaveLength(pageSize);
      
      // Verify no overlap
      const page1Ids = page1.map(d => d.id);
      const page2Ids = page2.map(d => d.id);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  describe('Data Consistency and Constraints', () => {
    it('should maintain workspace isolation across all tables', async () => {
      // Create another workspace
      const otherWorkspace = await prisma.workspace.create({
        data: {
          name: 'Other Workspace',
          slug: 'other-workspace',
          description: 'Different workspace for isolation testing',
        },
      });

      const salt = await AuthService.generateSalt();
      const hashedPassword = await AuthService.hashPassword('password123', salt);

      const otherUser = await prisma.user.create({
        data: {
          username: 'other-user',
          email: 'other@test.com',
          passwordHash: hashedPassword,
          salt,
          fullName: 'Other User',
          role: 'USER',
          workspaceId: otherWorkspace.id,
        },
      });

      // Create resources in other workspace
      const otherProject = await prisma.project.create({
        data: {
          name: 'Other Project',
          description: 'Project in other workspace',
          workspaceId: otherWorkspace.id,
          createdBy: otherUser.id,
        },
      });

      // Verify isolation - queries should not return cross-workspace data
      const testWorkspaceProjects = await prisma.project.findMany({
        where: { workspaceId: testWorkspace.id },
      });

      const testWorkspaceProjectIds = testWorkspaceProjects.map(p => p.id);
      expect(testWorkspaceProjectIds).not.toContain(otherProject.id);

      // Clean up
      await prisma.project.delete({ where: { id: otherProject.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
      await prisma.workspace.delete({ where: { id: otherWorkspace.id } });
    });

    it('should enforce data type constraints', async () => {
      // Test enum constraints
      const salt = await AuthService.generateSalt();
      const hashedPassword = await AuthService.hashPassword('password123', salt);

      await expect(
        prisma.user.create({
          data: {
            username: 'invalid-role-user',
            email: 'invalid@test.com',
            passwordHash: hashedPassword,
            salt,
            fullName: 'Invalid Role User',
            role: 'INVALID_ROLE' as any, // Invalid enum value
            workspaceId: testWorkspace.id,
          },
        })
      ).rejects.toThrow();
    });

    it('should handle concurrent operations safely', async () => {
      const projectName = 'Concurrent Test Project';

      // Attempt to create multiple projects concurrently
      const createPromises = Array.from({ length: 5 }, (_, i) =>
        prisma.project.create({
          data: {
            name: `${projectName} ${i}`,
            description: `Concurrent project ${i}`,
            workspaceId: testWorkspace.id,
            createdBy: testUsers[0].id,
          },
        })
      );

      const results = await Promise.all(createPromises);
      expect(results).toHaveLength(5);

      // Verify all projects were created with unique IDs
      const projectIds = results.map(p => p.id);
      const uniqueIds = [...new Set(projectIds)];
      expect(uniqueIds).toHaveLength(5);
    });
  });
});