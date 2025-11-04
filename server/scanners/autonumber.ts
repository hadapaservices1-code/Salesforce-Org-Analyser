import { ObjectMetadata, MigrationBlocker } from '@/lib/types';

export function detectAutonumberBlockers(objects: ObjectMetadata[]): MigrationBlocker[] {
  const blockers: MigrationBlocker[] = [];

  for (const obj of objects) {
    const autonumberFields = obj.fields.filter(
      (field) => field.type === 'autonumber' && obj.recordCount > 0
    );

    if (autonumberFields.length > 0) {
      blockers.push({
        type: 'autonumber',
        severity: 'high',
        object: obj.name,
        message: `Object ${obj.label} has ${autonumberFields.length} autonumber field(s) with ${obj.recordCount} existing records. Autonumber sequences cannot be preserved during migration.`,
        recommendation: `Consider using external ID fields or custom numbering logic. Plan for data migration strategy that handles autonumber field values.`,
      });
    }
  }

  return blockers;
}
