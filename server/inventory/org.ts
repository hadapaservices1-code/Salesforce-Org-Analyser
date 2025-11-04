import { SalesforceAuth, OrgInfo } from '@/lib/types';
import { sfGet } from '../salesforce/rest';
import { sfQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';

export async function scanOrgInfo(auth: SalesforceAuth): Promise<OrgInfo> {
  try {
    // First, try to get org ID from identity endpoint (most reliable)
    let orgId = '';
    let orgName = '';
    let organizationType = 'Unknown';
    let instanceName = '';
    
    try {
      // Get user info which includes organization_id (most reliable source)
      const identityUrl = `${auth.instanceUrl}/services/oauth2/userinfo`;
      const identityResponse = await fetch(identityUrl, {
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (identityResponse.ok) {
        const identityData = await identityResponse.json();
        orgId = identityData.organization_id || identityData.organizationId || '';
        if (orgId) {
          logger.info({ orgId }, 'Got org ID from identity endpoint');
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to get org ID from identity endpoint');
    }
    
    // Alternative: Try to get org ID from REST API query
    if (!orgId) {
      try {
        const orgQueryResponse = await sfGet(auth, '/query/?q=SELECT+Id+FROM+Organization+LIMIT+1');
        if (orgQueryResponse?.records && orgQueryResponse.records.length > 0) {
          orgId = orgQueryResponse.records[0].Id || '';
          if (orgId) {
            logger.info({ orgId }, 'Got org ID from REST API query');
          }
        }
      } catch (error) {
        logger.warn({ error }, 'Failed to get org ID from REST API query');
      }
    }

    // Get organization details - Edition field is not available via SOQL in newer API versions
    const orgData = await sfQuery(auth, 
      "SELECT Id, Name, OrganizationType, InstanceName FROM Organization LIMIT 1"
    );
    
    if (!orgData || orgData.length === 0) {
      throw new Error('Failed to retrieve organization information');
    }

    const org = orgData[0];
    
    // Use org ID from identity endpoint if available, otherwise use from query
    orgId = orgId || org.Id || '';
    orgName = org.Name || '';
    organizationType = org.OrganizationType || 'Unknown';
    instanceName = org.InstanceName || org.Name || '';
    
    logger.info({ 
      orgId, 
      orgIdFromQuery: org.Id,
      orgName,
      organizationType,
      instanceName 
    }, 'Organization details retrieved');

    // Get limits - Salesforce returns limits in format: { "DailyApiRequests": { "Max": 5000, "Remaining": 4500 } }
    let limitsResponse: any = {};
    let edition = 'Unknown';
    
    try {
      limitsResponse = await sfGet(auth, '/limits');
      
      // Try to infer edition from available limits or other indicators
      // Different editions have different limits available
      if (limitsResponse) {
        // Check for edition-specific limits
        if (limitsResponse.DailyWorkflowEmails) {
          edition = 'Enterprise or Higher';
        } else if (limitsResponse.DailyApiRequests) {
          edition = 'Professional or Higher';
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to retrieve limits');
    }

    // Normalize limits structure to ensure it has Max and Remaining
    const limits: Record<string, { Max: number; Remaining: number }> = {};
    if (limitsResponse && typeof limitsResponse === 'object') {
      Object.entries(limitsResponse).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object') {
          limits[key] = {
            Max: value.Max || value.max || 0,
            Remaining: value.Remaining || value.remaining || 0,
          };
        }
      });
    }

    // Get user count
    let userCount = 0;
    try {
      const userData = await sfQuery(auth, 
        "SELECT COUNT() FROM User WHERE IsActive = true"
      );
      userCount = typeof userData?.[0]?.expr0 === 'number' ? userData[0].expr0 : 0;
    } catch (error) {
      logger.warn({ error }, 'Failed to retrieve user count');
    }

    // Get license information
    const licenses: Record<string, { Total: number; Used: number }> = {};
    try {
      // UserLicense object query - Name field should be available
      const licenseData = await sfQuery(auth,
        "SELECT Id, Name, Status, UsedLicenses, TotalLicenses FROM UserLicense WHERE Status = 'Active'"
      );
      
      if (licenseData && licenseData.length > 0) {
        for (const license of licenseData) {
          if (license.Name) {
            licenses[license.Name] = {
              Total: license.TotalLicenses || 0,
              Used: license.UsedLicenses || 0,
            };
          }
        }
      }
      
      // If no licenses found with Name, try alternative approach
      if (Object.keys(licenses).length === 0) {
        try {
          // Try to get licenses via REST API describe
          const licenseDescribe = await sfGet(auth, '/sobjects/UserLicense/describe');
          // Then query with all available fields
          const altLicenseData = await sfQuery(auth,
            "SELECT Id, TotalLicenses, UsedLicenses FROM UserLicense WHERE Status = 'Active'"
          );
          
          for (const license of altLicenseData) {
            if (license.Id) {
              try {
                // Get individual license details
                const licenseDetail = await sfGet(auth, `/sobjects/UserLicense/${license.Id}`);
                const licenseName = licenseDetail?.Name || licenseDetail?.MasterLabel || `License-${license.Id.substring(0, 8)}`;
                licenses[licenseName] = {
                  Total: license.TotalLicenses || 0,
                  Used: license.UsedLicenses || 0,
                };
              } catch (e) {
                // Fallback to ID-based name
                licenses[`License-${license.Id.substring(0, 8)}`] = {
                  Total: license.TotalLicenses || 0,
                  Used: license.UsedLicenses || 0,
                };
              }
            }
          }
        } catch (e) {
          logger.warn({ error: e }, 'Alternative license query failed');
        }
      }
    } catch (error) {
      logger.warn({ error }, 'Failed to retrieve license information');
    }

    // Ensure we have a valid org ID
    const finalOrgId = orgId || org.Id || '';
    
    if (!finalOrgId) {
      logger.warn('No organization ID found from any source');
    }
    
    return {
      id: finalOrgId || 'Unknown',
      organizationType: organizationType,
      edition: edition,
      instanceName: instanceName || orgName || 'Unknown',
      limits,
      licenses,
      userCount: typeof userCount === 'number' ? userCount : 0,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to scan org info');
    throw error;
  }
}
