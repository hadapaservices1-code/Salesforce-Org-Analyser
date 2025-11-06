import { SalesforceAuth } from '@/lib/types';
import { logger } from '@/lib/logger';
import { sfPost } from './rest';

const API_VERSION = process.env.API_VERSION || 'v60.0';

export async function describeGlobal(auth: SalesforceAuth, abortSignal?: AbortSignal): Promise<string[]> {
  if (abortSignal?.aborted) {
    throw new Error('Scan cancelled by user');
  }

  const url = `${auth.instanceUrl}/services/data/${API_VERSION}/sobjects/`;
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    signal: abortSignal,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, 'Failed to describe global');
    throw new Error(`Describe global error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.sobjects?.map((obj: any) => obj.name) || [];
}

export async function describeSObject(auth: SalesforceAuth, sobject: string, abortSignal?: AbortSignal): Promise<any> {
  if (abortSignal?.aborted) {
    throw new Error('Scan cancelled by user');
  }

  const url = `${auth.instanceUrl}/services/data/${API_VERSION}/sobjects/${sobject}/describe/`;
  
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    signal: abortSignal,
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ sobject, status: response.status, error }, 'Failed to describe sObject');
    throw new Error(`Describe sObject error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function listMetadata(
  auth: SalesforceAuth,
  metadataType: string,
  folder?: string,
  abortSignal?: AbortSignal
): Promise<any[]> {
  if (abortSignal?.aborted) {
    throw new Error('Scan cancelled by user');
  }

  const body = {
    type: metadataType,
    ...(folder && { folder }),
  };

  try {
    const response = await sfPost(auth, '/services/data/v60.0/tooling/sobjects/MetadataContainer/', {
      method: 'listMetadata',
      ...body,
    }, abortSignal);
    return response || [];
  } catch (error) {
    // Fallback to REST API if Tooling API fails
    logger.warn({ metadataType, error }, 'Tooling API listMetadata failed, using REST fallback');
    return [];
  }
}
