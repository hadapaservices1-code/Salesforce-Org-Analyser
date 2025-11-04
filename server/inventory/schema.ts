import { SalesforceAuth, ObjectMetadata, FieldMetadata, RelationshipMetadata } from '@/lib/types';
import { describeGlobal, describeSObject } from '../salesforce/metadata';
import { sfQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';

export async function scanSchema(auth: SalesforceAuth): Promise<ObjectMetadata[]> {
  try {
    const objectNames = await describeGlobal(auth);
    const objects: ObjectMetadata[] = [];

    // Limit to first 100 objects to avoid timeout
    const objectsToScan = objectNames.slice(0, 100);

    for (const objectName of objectsToScan) {
      try {
        const describe = await describeSObject(auth, objectName);
        
        // Get record count
        let recordCount = 0;
        try {
          const countQuery = await sfQuery(auth, `SELECT COUNT() FROM ${objectName}`);
          recordCount = countQuery?.[0]?.expr0 || 0;
        } catch (error) {
          // Some objects may not be queryable
          logger.debug({ objectName, error }, 'Could not count records');
        }

        const fields: FieldMetadata[] = describe.fields?.map((field: any) => ({
          name: field.name,
          label: field.label,
          type: field.type,
          required: !field.nillable && field.defaultedOnCreate === false,
          unique: field.unique || field.externalId || false,
          lookupTarget: field.referenceTo?.[0],
          picklistValues: field.picklistValues?.map((pv: any) => pv.value),
        })) || [];

        const relationships: RelationshipMetadata[] = describe.childRelationships?.map((rel: any) => ({
          name: rel.relationshipName,
          type: 'child',
          childObject: rel.childSObject,
          field: rel.field,
        })) || [];

        objects.push({
          name: objectName,
          label: describe.label || objectName,
          keyPrefix: describe.keyPrefix || '',
          recordCount: typeof recordCount === 'number' ? recordCount : 0,
          fields,
          relationships,
        });
      } catch (error) {
        logger.debug({ objectName, error }, 'Failed to describe object');
      }
    }

    return objects;
  } catch (error) {
    logger.error({ error }, 'Failed to scan schema');
    throw error;
  }
}

export async function scanPicklists(auth: SalesforceAuth): Promise<Record<string, string[]>> {
  const picklists: Record<string, string[]> = {};
  
  try {
    const objects = await describeGlobal(auth);
    
    for (const objectName of objects.slice(0, 50)) {
      try {
        const describe = await describeSObject(auth, objectName);
        
        for (const field of describe.fields || []) {
          if (field.type === 'picklist' && field.picklistValues) {
            const key = `${objectName}.${field.name}`;
            picklists[key] = field.picklistValues.map((pv: any) => pv.value);
          }
        }
      } catch (error) {
        logger.debug({ objectName, error }, 'Failed to get picklists for object');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to scan picklists');
  }

  return picklists;
}

export async function scanRecordTypes(auth: SalesforceAuth): Promise<Record<string, string[]>> {
  const recordTypes: Record<string, string[]> = {};
  
  try {
    const rtData = await sfQuery(auth,
      "SELECT SObjectType, DeveloperName FROM RecordType WHERE IsActive = true"
    );

    for (const rt of rtData) {
      if (!recordTypes[rt.SObjectType]) {
        recordTypes[rt.SObjectType] = [];
      }
      recordTypes[rt.SObjectType].push(rt.DeveloperName);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to scan record types');
  }

  return recordTypes;
}
