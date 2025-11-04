import { SalesforceAuth, ScanOutput } from '@/lib/types';
import { scanOrgInfo } from './inventory/org';
import { scanSchema, scanPicklists, scanRecordTypes } from './inventory/schema';
import { scanFlows, scanTriggers, scanValidationRules } from './inventory/automation';
import { scanReports, scanDashboards, scanLayouts } from './inventory/reporting';
import { scanProfiles, scanRoles, scanQueues, scanSharingRules } from './inventory/ownership';
import { detectAutonumberBlockers } from './scanners/autonumber';
import { detectAutomationDensityBlockers } from './scanners/automationDensity';
import { detectLargeObjectBlockers } from './scanners/largeObjects';
import { detectProfileMismatchBlockers } from './scanners/profileMismatch';
import { logger } from '@/lib/logger';

export async function composeScan(auth: SalesforceAuth): Promise<ScanOutput> {
  const startTime = Date.now();
  logger.info('Starting org scan');

  try {
    // Run all collectors in parallel where possible
    const [
      orgInfo,
      objects,
      picklists,
      recordTypes,
      flows,
      triggers,
      validationRules,
      profiles,
      roles,
      queues,
      sharingRules,
      reports,
      dashboards,
      layouts,
    ] = await Promise.all([
      scanOrgInfo(auth),
      scanSchema(auth),
      scanPicklists(auth),
      scanRecordTypes(auth),
      scanFlows(auth),
      scanTriggers(auth),
      scanValidationRules(auth),
      scanProfiles(auth),
      scanRoles(auth),
      scanQueues(auth),
      scanSharingRules(auth),
      scanReports(auth),
      scanDashboards(auth),
      scanLayouts(auth),
    ]);

    // Run blocker detection
    const blockers = [
      ...detectAutonumberBlockers(objects),
      ...detectAutomationDensityBlockers(flows, triggers, validationRules),
      ...detectLargeObjectBlockers(objects),
      ...detectProfileMismatchBlockers(profiles),
    ];

    const scanDuration = Date.now() - startTime;
    logger.info({ duration: scanDuration }, 'Org scan completed');

    return {
      orgInfo,
      objects,
      picklists,
      recordTypes,
      flows,
      triggers,
      validationRules,
      profiles,
      roles,
      queues,
      sharingRules,
      reports,
      dashboards,
      layouts,
      blockers,
      scannedAt: new Date().toISOString(),
      scanDuration,
    };
  } catch (error) {
    logger.error({ error }, 'Scan composition failed');
    throw error;
  }
}
