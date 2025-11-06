import { SalesforceAuth, ObjectMetadata, FieldMetadata, RelationshipMetadata } from '@/lib/types';
import { describeGlobal, describeSObject } from '../salesforce/metadata';
import { sfQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';
import { ProgressCallback } from '../composeScan';

export async function scanSchema(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<ObjectMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    const objectNames = await describeGlobal(auth, abortSignal);
    const objects: ObjectMetadata[] = [];

    logger.info({ totalObjects: objectNames.length }, 'Scanning all objects');

    // Scan all objects (no limit)
    for (const objectName of objectNames) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      if (onProgress) {
        onProgress(`Scanning ${objectName}`);
      }
      try {
        const describe = await describeSObject(auth, objectName, abortSignal);
        
        // Get record count
        let recordCount = 0;
        try {
          const countQuery = await sfQuery(auth, `SELECT COUNT() FROM ${objectName}`, abortSignal);
          recordCount = countQuery?.[0]?.expr0 || 0;
        } catch (error) {
          if (error instanceof Error && error.message === 'Scan cancelled by user') {
            throw error;
          }
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
        if (error instanceof Error && error.message === 'Scan cancelled by user') {
          throw error;
        }
        logger.debug({ objectName, error }, 'Failed to describe object');
      }
    }

    return objects;
  } catch (error) {
    logger.error({ error }, 'Failed to scan schema');
    throw error;
  }
}

export async function scanPicklists(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<Record<string, string[]>> {
  const picklists: Record<string, string[]> = {};
  
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    const objects = await describeGlobal(auth, abortSignal);
    
    logger.info({ totalObjects: objects.length }, 'Scanning picklists for all objects');
    
    // Scan picklists for all objects (no limit)
    for (const objectName of objects) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      if (onProgress) {
        onProgress(`Scanning picklists for ${objectName}`);
      }
      try {
        const describe = await describeSObject(auth, objectName, abortSignal);
        
        for (const field of describe.fields || []) {
          if (field.type === 'picklist' && field.picklistValues) {
            const key = `${objectName}.${field.name}`;
            picklists[key] = field.picklistValues.map((pv: any) => pv.value);
          }
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Scan cancelled by user') {
          throw error;
        }
        logger.debug({ objectName, error }, 'Failed to get picklists for object');
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan picklists');
  }

  return picklists;
}

export async function scanRecordTypes(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<Record<string, string[]>> {
  const recordTypes: Record<string, string[]> = {};
  
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning record types...');
    }
    const rtData = await sfQuery(auth,
      "SELECT SObjectType, DeveloperName FROM RecordType WHERE IsActive = true",
      abortSignal
    );

    for (const rt of rtData) {
      if (abortSignal?.aborted) {
        throw new Error('Scan cancelled by user');
      }
      if (!recordTypes[rt.SObjectType]) {
        recordTypes[rt.SObjectType] = [];
      }
      recordTypes[rt.SObjectType].push(rt.DeveloperName);
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan record types');
  }

  return recordTypes;
}
