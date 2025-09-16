import { AuthenticatedUser } from '../types/auth';

/**
 * Validates if a user has access to a specific workspace
 * @param user - The authenticated user or workspace ID
 * @param targetWorkspaceId - The workspace ID to validate access for
 * @throws Error if access is denied
 */
export async function validateWorkspaceAccess(
  user: AuthenticatedUser | string,
  targetWorkspaceId: string
): Promise<void> {
  const userWorkspaceId = typeof user === 'string' ? user : user.workspaceId;
  
  if (targetWorkspaceId !== userWorkspaceId) {
    throw new Error('Access denied: Resource belongs to different workspace');
  }
}

/**
 * Checks if a user has permission to perform a specific action on a resource
 * @param user - The authenticated user
 * @param action - The action to perform (create, read, update, delete)
 * @param resource - The resource type
 * @returns Promise<boolean> indicating if the user has permission
 */
export async function checkResourcePermission(
  user: AuthenticatedUser,
  action: string,
  resource: string
): Promise<boolean> {
  // Basic role-based permission checking
  switch (user.role) {
    case 'admin':
      return true; // Admins can do everything
    case 'manager':
      return true; // Managers can do everything except admin operations
    case 'member':
      // Members can read and create, but not delete or admin operations
      return action !== 'delete' && action !== 'admin';
    case 'viewer':
      return action === 'read'; // Viewers can only read
    default:
      return false;
  }
}