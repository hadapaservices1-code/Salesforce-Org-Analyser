import { SalesforceAuth } from '@/lib/types';
import { logger } from '@/lib/logger';

const API_VERSION = process.env.API_VERSION || 'v60.0';

export async function sfQuery(
  auth: SalesforceAuth,
  soql: string
): Promise<any[]> {
  const url = `${auth.instanceUrl}/services/data/${API_VERSION}/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ soql, status: response.status, error }, 'Salesforce SOQL query error');
    throw new Error(`SOQL query error: ${response.status} ${error}`);
  }

  const data = await response.json();
  const records: any[] = data.records || [];

  // Handle pagination
  if (data.nextRecordsUrl) {
    const nextUrl = `${auth.instanceUrl}${data.nextRecordsUrl}`;
    const nextResponse = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (nextResponse.ok) {
      const nextData = await nextResponse.json();
      records.push(...(nextData.records || []));
    }
  }

  return records;
}

export async function sfToolingQuery(
  auth: SalesforceAuth,
  soql: string
): Promise<any[]> {
  const url = `${auth.instanceUrl}/services/data/${API_VERSION}/tooling/query?q=${encodeURIComponent(soql)}`;

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ soql, status: response.status, error }, 'Salesforce Tooling API query error');
    throw new Error(`Tooling API query error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.records || [];
}
