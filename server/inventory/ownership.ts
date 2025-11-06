import { SalesforceAuth, ProfileMetadata, RoleMetadata, QueueMetadata, SharingRuleMetadata, PermissionSetMetadata } from '@/lib/types';
import { sfQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';
import { ProgressCallback } from '../composeScan';

export async function scanProfiles(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<ProfileMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning profiles...');
    }
    const profiles = await sfQuery(auth,
      "SELECT Id, Name, UserLicenseId FROM Profile WHERE UserType = 'Standard'",
      abortSignal
    );

    const profileList: ProfileMetadata[] = [];

    for (const profile of profiles) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      try {
        // Get object permissions (simplified - would need describe call for full details)
        profileList.push({
          id: profile.Id,
          name: profile.Name,
          userLicense: profile.UserLicenseId || 'Unknown',
          objectPermissions: {}, // Would need additional API calls to populate
        });
      } catch (error) {
        logger.debug({ profile, error }, 'Failed to process profile');
      }
    }

    return profileList;
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan profiles');
    return [];
  }
}

export async function scanRoles(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<RoleMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning roles...');
    }
    const roles = await sfQuery(auth,
      "SELECT Id, Name, ParentRoleId FROM UserRole",
      abortSignal
    );

    const roleList: RoleMetadata[] = [];

    for (const role of roles) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      try {
        // Count users in this role
        const userCount = await sfQuery(auth,
          `SELECT COUNT() FROM User WHERE UserRoleId = '${role.Id}' AND IsActive = true`,
          abortSignal
        );

        roleList.push({
          id: role.Id,
          name: role.Name,
          parentRole: role.ParentRoleId,
          userCount: userCount?.[0]?.expr0 || 0,
        });
      } catch (error) {
        logger.debug({ role, error }, 'Failed to process role');
      }
    }

    return roleList;
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan roles');
    return [];
  }
}

export async function scanQueues(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<QueueMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning queues...');
    }
    const queues = await sfQuery(auth,
      "SELECT Id, Name, SObjectType FROM Group WHERE Type = 'Queue'",
      abortSignal
    );

    const queueList: QueueMetadata[] = [];

    for (const queue of queues) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      try {
        // Count queue members
        const memberCount = await sfQuery(auth,
          `SELECT COUNT() FROM GroupMember WHERE GroupId = '${queue.Id}'`,
          abortSignal
        );

        queueList.push({
          id: queue.Id,
          name: queue.Name,
          objectType: queue.SObjectType || 'All',
          memberCount: memberCount?.[0]?.expr0 || 0,
        });
      } catch (error) {
        logger.debug({ queue, error }, 'Failed to process queue');
      }
    }

    return queueList;
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan queues');
    return [];
  }
}

export async function scanSharingRules(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<SharingRuleMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning sharing rules...');
    }
    // Sharing rules are metadata, so we'd need to use Metadata API
    // For now, return empty array - would need additional implementation
    return [];
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan sharing rules');
    return [];
  }
}

export async function scanPermissionSets(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<PermissionSetMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning permission sets...');
    }
    const permissionSets = await sfQuery(auth,
      "SELECT Id, Name, Label, Description, LicenseId FROM PermissionSet WHERE IsCustom = true",
      abortSignal
    );

    const permissionSetList: PermissionSetMetadata[] = [];

    for (const ps of permissionSets) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      try {
        // Count users assigned to this permission set
        let userCount = 0;
        try {
          const userCountQuery = await sfQuery(auth,
            `SELECT COUNT() FROM PermissionSetAssignment WHERE PermissionSetId = '${ps.Id}' AND Assignee.IsActive = true`,
            abortSignal
          );
          userCount = userCountQuery?.[0]?.expr0 || 0;
        } catch (error) {
          logger.debug({ permissionSet: ps.Id, error }, 'Failed to count permission set users');
        }

        permissionSetList.push({
          id: ps.Id,
          name: ps.Name,
          label: ps.Label || ps.Name,
          description: ps.Description || undefined,
          userCount,
          license: ps.LicenseId || undefined,
        });
      } catch (error) {
        logger.debug({ permissionSet: ps, error }, 'Failed to process permission set');
      }
    }

    return permissionSetList;
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan permission sets');
    return [];
  }
}
