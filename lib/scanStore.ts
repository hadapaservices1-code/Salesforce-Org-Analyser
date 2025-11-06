export interface ActiveScan {
  abortController: AbortController;
  scanPromise: Promise<any>;
  progressUpdates: any[];
}

// Shared store for active scans
const activeScans = new Map<string, ActiveScan>();

export function getActiveScan(scanId: string): ActiveScan | undefined {
  return activeScans.get(scanId);
}

export function setActiveScan(scanId: string, scan: ActiveScan): void {
  activeScans.set(scanId, scan);
}

export function deleteActiveScan(scanId: string): void {
  activeScans.delete(scanId);
}

export function getAllActiveScans(): Map<string, ActiveScan> {
  return activeScans;
}

