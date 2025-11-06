import { SalesforceAuth, FlowMetadata, TriggerMetadata, ValidationRuleMetadata } from '@/lib/types';
import { sfToolingQuery } from '../salesforce/tooling';
import { logger } from '@/lib/logger';
import { ProgressCallback } from '../composeScan';

export async function scanFlows(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<FlowMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning flows...');
    }
    const flows = await sfToolingQuery(auth,
      "SELECT Id, MasterLabel, DeveloperName, Status, VersionNumber FROM Flow WHERE IsActive = true",
      abortSignal
    );

    return flows.map((flow: any) => ({
      id: flow.Id,
      name: flow.DeveloperName || flow.MasterLabel,
      label: flow.MasterLabel || flow.DeveloperName,
      status: flow.Status || 'Unknown',
      version: flow.VersionNumber || 1,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan flows');
    return [];
  }
}

export async function scanTriggers(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<TriggerMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning triggers...');
    }
    const triggers = await sfToolingQuery(auth,
      "SELECT Name, TableEnumOrId, Status, BodyLength FROM ApexTrigger WHERE Status = 'Active'",
      abortSignal
    );

    return triggers.map((trigger: any) => ({
      name: trigger.Name,
      object: trigger.TableEnumOrId,
      status: trigger.Status || 'Active',
      bodyLength: trigger.BodyLength || 0,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan triggers');
    return [];
  }
}

export async function scanValidationRules(auth: SalesforceAuth, abortSignal?: AbortSignal, onProgress?: ProgressCallback): Promise<ValidationRuleMetadata[]> {
  try {
    if (abortSignal?.aborted) {
      throw new Error('Scan cancelled by user');
    }
    if (onProgress) {
      onProgress('Scanning validation rules...');
    }
    const rules = await sfToolingQuery(auth,
      "SELECT DeveloperName, EntityDefinition.QualifiedApiName, ValidationName, Active, ErrorMessage FROM ValidationRule WHERE Active = true",
      abortSignal
    );

    return rules.map((rule: any) => ({
      name: rule.DeveloperName || rule.ValidationName,
      object: rule.EntityDefinition?.QualifiedApiName || 'Unknown',
      active: rule.Active !== false,
      errorMessage: rule.ErrorMessage || '',
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Scan cancelled by user') {
      throw error;
    }
    logger.error({ error }, 'Failed to scan validation rules');
    return [];
  }
}
