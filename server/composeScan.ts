import { SalesforceAuth, ScanOutput } from '@/lib/types';
import { scanOrgInfo } from './inventory/org';
import { scanSchema, scanPicklists, scanRecordTypes } from './inventory/schema';
import { scanFlows, scanTriggers, scanValidationRules } from './inventory/automation';
import { scanReports, scanDashboards, scanLayouts } from './inventory/reporting';
import { scanProfiles, scanRoles, scanQueues, scanSharingRules, scanPermissionSets } from './inventory/ownership';
import { detectAutonumberBlockers } from './scanners/autonumber';
import { detectAutomationDensityBlockers } from './scanners/automationDensity';
import { detectLargeObjectBlockers } from './scanners/largeObjects';
import { detectProfileMismatchBlockers } from './scanners/profileMismatch';
import { logger } from '@/lib/logger';

export interface ScanProgress {
  step: string;
  progress: number; // 0-100
  currentProcess: string;
}

export type ProgressCallback = (currentProcess: string) => void;

export interface ScanOptions {
  onProgress?: (progress: ScanProgress) => void;
  abortSignal?: AbortSignal;
}

export async function composeScan(
  auth: SalesforceAuth,
  options: ScanOptions = {}
): Promise<ScanOutput> {
  const { onProgress, abortSignal } = options;
  const startTime = Date.now();
  logger.info('Starting org scan');

  const updateProgress = (step: string, progress: number, currentProcess: string) => {
    if (onProgress) {
      onProgress({
        step,
        progress: Math.min(100, Math.max(0, progress)),
        currentProcess,
      });
    }
  };

  const checkAbort = () => {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
  };

  try {
    checkAbort();
    updateProgress('Initializing', 5, 'Preparing scan...');

    // Create a progress callback for scan functions
    const createProgressCallback = (stepName: string, baseProgress: number, progressRange: number) => {
      return (itemName: string) => {
        // This will be used by individual scan functions to report specific items
        updateProgress(stepName, baseProgress, itemName);
      };
    };

    // Define scan steps with their progress ranges
    const scanSteps = [
      { name: 'Org Info', fn: () => scanOrgInfo(auth, abortSignal, createProgressCallback('Org Info', 10, 0)), progress: 10 },
      { name: 'Schema', fn: () => scanSchema(auth, abortSignal, createProgressCallback('Schema', 25, 15)), progress: 25 },
      { name: 'Picklists', fn: () => scanPicklists(auth, abortSignal, createProgressCallback('Picklists', 30, 5)), progress: 30 },
      { name: 'Record Types', fn: () => scanRecordTypes(auth, abortSignal, createProgressCallback('Record Types', 35, 0)), progress: 35 },
      { name: 'Flows', fn: () => scanFlows(auth, abortSignal, createProgressCallback('Flows', 45, 0)), progress: 45 },
      { name: 'Triggers', fn: () => scanTriggers(auth, abortSignal, createProgressCallback('Triggers', 50, 0)), progress: 50 },
      { name: 'Validation Rules', fn: () => scanValidationRules(auth, abortSignal, createProgressCallback('Validation Rules', 55, 0)), progress: 55 },
      { name: 'Profiles', fn: () => scanProfiles(auth, abortSignal, createProgressCallback('Profiles', 65, 0)), progress: 65 },
      { name: 'Roles', fn: () => scanRoles(auth, abortSignal, createProgressCallback('Roles', 70, 0)), progress: 70 },
      { name: 'Queues', fn: () => scanQueues(auth, abortSignal, createProgressCallback('Queues', 75, 0)), progress: 75 },
      { name: 'Sharing Rules', fn: () => scanSharingRules(auth, abortSignal, createProgressCallback('Sharing Rules', 80, 0)), progress: 80 },
      { name: 'Permission Sets', fn: () => scanPermissionSets(auth, abortSignal, createProgressCallback('Permission Sets', 85, 0)), progress: 85 },
      { name: 'Reports', fn: () => scanReports(auth, abortSignal, createProgressCallback('Reports', 90, 0)), progress: 90 },
      { name: 'Dashboards', fn: () => scanDashboards(auth, abortSignal, createProgressCallback('Dashboards', 92, 0)), progress: 92 },
      { name: 'Layouts', fn: () => scanLayouts(auth, abortSignal, createProgressCallback('Layouts', 95, 0)), progress: 95 },
    ];

    // Run scans sequentially to track progress
    const results: any[] = [];
    for (let i = 0; i < scanSteps.length; i++) {
      checkAbort();
      const step = scanSteps[i];
      updateProgress(step.name, step.progress, `Scanning ${step.name.toLowerCase()}...`);
      
      try {
        const result = await step.fn();
        results.push(result);
      } catch (error) {
        // If scan was cancelled, re-throw immediately
        if (error instanceof Error && error.message === 'Scan cancelled by user') {
          throw error;
        }
        logger.error({ step: step.name, error }, `Failed to scan ${step.name}`);
        // Continue with other steps even if one fails
        results.push(null);
      }
    }

    checkAbort();
    updateProgress('Analyzing', 96, 'Detecting migration blockers...');

    // Run blocker detection
    const blockers = [
      ...detectAutonumberBlockers(results[1] || []),
      ...detectAutomationDensityBlockers(results[4] || [], results[5] || [], results[6] || []),
      ...detectLargeObjectBlockers(results[1] || []),
      ...detectProfileMismatchBlockers(results[7] || []),
    ];

    checkAbort();
    updateProgress('Finalizing', 99, 'Completing scan...');

    const scanDuration = Date.now() - startTime;
    logger.info({ duration: scanDuration }, 'Org scan completed');

    updateProgress('Complete', 100, 'Scan completed successfully');

    return {
      orgInfo: results[0],
      objects: results[1] || [],
      picklists: results[2] || [],
      recordTypes: results[3] || [],
      flows: results[4] || [],
      triggers: results[5] || [],
      validationRules: results[6] || [],
      profiles: results[7] || [],
      roles: results[8] || [],
      queues: results[9] || [],
      sharingRules: results[10] || [],
      permissionSets: results[11] || [],
      reports: results[12] || [],
      dashboards: results[13] || [],
      layouts: results[14] || [],
      blockers,
      scannedAt: new Date().toISOString(),
      scanDuration,
    };
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      logger.info('Scan cancelled by user');
      throw error;
    }
    logger.error({ error }, 'Scan composition failed');
    throw error;
  }
}
