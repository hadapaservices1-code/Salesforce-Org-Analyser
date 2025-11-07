import { SalesforceAuth, OrgInfo } from '@/lib/types';
import { sfGet } from '../salesforce/rest';
import { sfQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';
import { ProgressCallback } from '../composeScan';

const API_VERSION = process.env.API_VERSION || 'v60.0';

export async function scanOrgInfo(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<OrgInfo> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning org information...');
    }

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
        signal: abortSignal,
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
        if (abortSignal?.aborted) {
          throw new Error('Scan cancelled by user');
        }
        const orgQueryResponse = await sfGet(auth, '/query/?q=SELECT+Id+FROM+Organization+LIMIT+1', undefined, abortSignal);
        if (orgQueryResponse?.records && orgQueryResponse.records.length > 0) {
          orgId = orgQueryResponse.records[0].Id || '';
          if (orgId) {
            logger.info({ orgId }, 'Got org ID from REST API query');
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Scan cancelled by user') {
          throw error;
        }
        logger.warn({ error }, 'Failed to get org ID from REST API query');
      }
    }

    // Get organization details - Edition field is not available via SOQL in newer API versions
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    const orgData = await sfQuery(auth, 
      "SELECT Id, Name, OrganizationType, InstanceName FROM Organization LIMIT 1",
      abortSignal
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
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      limitsResponse = await sfGet(auth, '/limits', undefined, abortSignal);
      
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
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      // Use COUNT(Id) instead of COUNT() for better compatibility
      const url = `${auth.instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent("SELECT COUNT(Id) FROM User WHERE IsActive = true")}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: abortSignal,
      });

      if (response.ok) {
        const data = await response.json();
        // COUNT queries return the result in records[0].expr0 or we can use totalSize
        // Try multiple ways to get the count
        if (data.records && data.records.length > 0) {
          const record = data.records[0];
          // Try expr0 first (standard COUNT() result)
          if (typeof record.expr0 === 'number') {
            userCount = record.expr0;
          } else if (typeof record.count === 'number') {
            userCount = record.count;
          } else if (data.totalSize !== undefined && typeof data.totalSize === 'number') {
            userCount = data.totalSize;
          }
        } else if (data.totalSize !== undefined && typeof data.totalSize === 'number') {
          userCount = data.totalSize;
        }
        
        logger.debug({ userCount, data }, 'Retrieved user count');
      } else {
        const errorText = await response.text();
        logger.warn({ status: response.status, error: errorText }, 'Failed to retrieve user count from query');
        
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Scan cancelled by user') {
        throw error;
      }
      logger.warn({ error }, 'Failed to retrieve user count');
      
    }

    // Get license information
    const licenses: Record<string, { Total: number; Used: number }> = {};
    try {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      // UserLicense object query - Name field should be available
      const licenseData = await sfQuery(auth,
        "SELECT Id, Name, Status, UsedLicenses, TotalLicenses FROM UserLicense WHERE Status = 'Active'",
        abortSignal
      );
      
      if (licenseData && licenseData.length > 0) {
        for (const license of licenseData) {
          if (license.Name) {
            licenses[license.Name] = {
              Total: license.TotalLicenses || 0,
              Used: license.UsedLicenses || 0,
            };
            
            // Fallback: If user count is still 0, try to get it from User licenses
            if (userCount === 0 && (license.Name === 'Salesforce' || license.Name === 'Salesforce Platform' || license.Name?.toLowerCase().includes('user'))) {
              // Use UsedLicenses as a proxy for active user count
              if (license.UsedLicenses && license.UsedLicenses > 0) {
                userCount = license.UsedLicenses;
                logger.info({ userCount, licenseName: license.Name }, 'Got user count from license');
              }
            }
          }
        }
      }
      
      // If no licenses found with Name, try alternative approach
      if (Object.keys(licenses).length === 0) {
        try {
          if (abortSignal?.aborted) {
            throw new Error('Scan cancelled by user');
          }
          // Try to get licenses via REST API describe
          const licenseDescribe = await sfGet(auth, '/sobjects/UserLicense/describe', undefined, abortSignal);
          // Then query with all available fields
          const altLicenseData = await sfQuery(auth,
            "SELECT Id, TotalLicenses, UsedLicenses FROM UserLicense WHERE Status = 'Active'",
            abortSignal
          );
          
          for (const license of altLicenseData) {
            if (abortSignal?.aborted) {
              throw new Error('Scan cancelled by user');
            }
            if (license.Id) {
              try {
                // Get individual license details
                const licenseDetail = await sfGet(auth, `/sobjects/UserLicense/${license.Id}`, undefined, abortSignal);
                const licenseName = licenseDetail?.Name || licenseDetail?.MasterLabel || `License-${license.Id.substring(0, 8)}`;
                licenses[licenseName] = {
                  Total: license.TotalLicenses || 0,
                  Used: license.UsedLicenses || 0,
                };
                
                // Fallback: If user count is still 0, try to get it from User licenses
                if (userCount === 0 && (licenseName === 'Salesforce' || licenseName === 'Salesforce Platform' || licenseName?.toLowerCase().includes('user'))) {
                  if (license.UsedLicenses && license.UsedLicenses > 0) {
                    userCount = license.UsedLicenses;
                    logger.info({ userCount, licenseName }, 'Got user count from alternative license query');
                  }
                }
              } catch (e) {
                // Fallback to ID-based name
                const licenseName = `License-${license.Id.substring(0, 8)}`;
                licenses[licenseName] = {
                  Total: license.TotalLicenses || 0,
                  Used: license.UsedLicenses || 0,
                };
                
                // Fallback: If user count is still 0, try to get it from UsedLicenses
                if (userCount === 0 && license.UsedLicenses && license.UsedLicenses > 0) {
                  // Sum all used licenses as a fallback
                  userCount = Math.max(userCount, license.UsedLicenses);
                }
              }
            }
          }
          
          // Final fallback: Sum all used licenses if user count is still 0
          if (userCount === 0 && Object.keys(licenses).length > 0) {
            const totalUsed = Object.values(licenses).reduce((sum, license) => sum + (license.Used || 0), 0);
            if (totalUsed > 0) {
              userCount = totalUsed;
              logger.info({ userCount }, 'Got user count from sum of all used licenses');
            }
          }
        } catch (e) {
          if (e instanceof Error && e.message === 'Scan cancelled by user') {
            throw e;
          }
          logger.warn({ error: e }, 'Alternative license query failed');
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Scan cancelled by user') {
        throw error;
      }
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
