import { SalesforceAuth, ReportMetadata, DashboardMetadata, LayoutMetadata } from '@/lib/types';
import { sfQuery, sfToolingQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';
import { ProgressCallback } from '../composeScan';

export async function scanReports(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<ReportMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning reports...');
    }
    const reports = await sfQuery(auth,
      "SELECT Id, Name, FolderName, Type FROM Report WHERE IsDeleted = false",
      abortSignal
    );

    return reports.map((report: any) => ({
      id: report.Id,
      name: report.Name,
      folder: report.FolderName || 'Unfiled Public Reports',
      type: report.Type || 'Unknown',
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan reports');
    return [];
  }
}

export async function scanDashboards(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<DashboardMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning dashboards...');
    }
    const dashboards = await sfQuery(auth,
      "SELECT Id, Title, FolderName FROM Dashboard WHERE IsDeleted = false",
      abortSignal
    );

    return dashboards.map((dashboard: any) => ({
      id: dashboard.Id,
      name: dashboard.Title,
      folder: dashboard.FolderName || 'Unfiled Public Dashboards',
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan dashboards');
    return [];
  }
}

export async function scanLayouts(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<LayoutMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning layouts...');
    }
    const layouts = await sfToolingQuery(auth,
      "SELECT FullName, Metadata FROM Layout LIMIT 1000",
      abortSignal
    );

    const layoutList: LayoutMetadata[] = [];
    
    for (const layout of layouts) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      try {
        const parts = layout.FullName?.split('-') || [];
        if (parts.length >= 2) {
          layoutList.push({
            name: layout.FullName,
            object: parts[0],
            recordType: parts.length > 2 ? parts.slice(1, -1).join('-') : undefined,
          });
        }
      } catch (error) {
        logger.debug({ layout, error }, 'Failed to parse layout');
      }
    }

    return layoutList;
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan layouts');
    return [];
  }
}
