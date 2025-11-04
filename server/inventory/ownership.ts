import { SalesforceAuth, ProfileMetadata, RoleMetadata, QueueMetadata, SharingRuleMetadata } from '@/lib/types';
import { sfQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';

export async function scanProfiles(auth: SalesforceAuth): Promise<ProfileMetadata[]> {
  try {
    const profiles = await sfQuery(auth,
      "SELECT Id, Name, UserLicenseId FROM Profile WHERE UserType = 'Standard'"
    );

    const profileList: ProfileMetadata[] = [];

    for (const profile of profiles) {
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
    logger.error({ error }, 'Failed to scan profiles');
    return [];
  }
}

export async function scanRoles(auth: SalesforceAuth): Promise<RoleMetadata[]> {
  try {
    const roles = await sfQuery(auth,
      "SELECT Id, Name, ParentRoleId FROM UserRole"
    );

    const roleList: RoleMetadata[] = [];

    for (const role of roles) {
      try {
        // Count users in this role
        const userCount = await sfQuery(auth,
          `SELECT COUNT() FROM User WHERE UserRoleId = '${role.Id}' AND IsActive = true`
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
    logger.error({ error }, 'Failed to scan roles');
    return [];
  }
}

export async function scanQueues(auth: SalesforceAuth): Promise<QueueMetadata[]> {
  try {
    const queues = await sfQuery(auth,
      "SELECT Id, Name, SObjectType FROM Group WHERE Type = 'Queue'"
    );

    const queueList: QueueMetadata[] = [];

    for (const queue of queues) {
      try {
        // Count queue members
        const memberCount = await sfQuery(auth,
          `SELECT COUNT() FROM GroupMember WHERE GroupId = '${queue.Id}'`
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
    logger.error({ error }, 'Failed to scan queues');
    return [];
  }
}

export async function scanSharingRules(auth: SalesforceAuth): Promise<SharingRuleMetadata[]> {
  try {
    // Sharing rules are metadata, so we'd need to use Metadata API
    // For now, return empty array - would need additional implementation
    return [];
  } catch (error) {
    logger.error({ error }, 'Failed to scan sharing rules');
    return [];
  }
}
