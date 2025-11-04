import { ObjectMetadata, MigrationBlocker } from '@/lib/types';

const LARGE_OBJECT_THRESHOLD = 100000;

export function detectLargeObjectBlockers(objects: ObjectMetadata[]): MigrationBlocker[] {
  const blockers: MigrationBlocker[] = [];

  for (const obj of objects) {
    if (obj.recordCount > LARGE_OBJECT_THRESHOLD) {
      blockers.push({
        type: 'large_object',
        severity: obj.recordCount > 1000000 ? 'high' : 'medium',
        object: obj.name,
        message: `Object ${obj.label} contains ${obj.recordCount.toLocaleString()} records, exceeding migration threshold.`,
        recommendation: `Plan for data migration strategy including data extraction, transformation, and loading. Consider data archiving or purging strategies. Estimate migration time and resource requirements.`,
      });
    }
  }

  return blockers;
}
