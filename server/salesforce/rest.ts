import { SalesforceAuth } from '@/lib/types';
import { logger } from '@/lib/logger';

const API_VERSION = process.env.API_VERSION || 'v60.0';

export async function sfGet(
  auth: SalesforceAuth,
  endpoint: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(`${auth.instanceUrl}/services/data/${API_VERSION}${endpoint}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ endpoint, status: response.status, error }, 'Salesforce REST API error');
    throw new Error(`Salesforce API error: ${response.status} ${error}`);
  }

  return response.json();
}

export async function sfPost(
  auth: SalesforceAuth,
  endpoint: string,
  body: any
): Promise<any> {
  const url = `${auth.instanceUrl}/services/data/${API_VERSION}${endpoint}`;

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ endpoint, status: response.status, error }, 'Salesforce REST API error');
    throw new Error(`Salesforce API error: ${response.status} ${error}`);
  }

  return response.json();
}
