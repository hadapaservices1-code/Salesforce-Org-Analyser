import { NextResponse } from 'next/server';
import { getSalesforceAuth } from '@/lib/session';
import { sfGet } from '@/server/salesforce/rest';

// Cache status for 2 minutes to reduce API calls
const CACHE_TTL = 120000; // 2 minutes
let cachedStatus: { data: any; timestamp: number } | null = null;

export async function GET() {
  // Return cached response if still valid
  if (cachedStatus && Date.now() - cachedStatus.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedStatus.data, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  }
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      const response = {
        connected: false,
        message: 'Not connected to Salesforce',
      };
      cachedStatus = { data: response, timestamp: Date.now() };
      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
        },
      });
    }

    // Test the connection by making a simple API call
    try {
      // Use REST API to get organization info - more reliable than SOQL
      // First try a simple query to verify connection
      const sfQuery = await import('@/server/salesforce/tooling');
      const orgData = await sfQuery.sfQuery(auth, 'SELECT Id, Name, OrganizationType, InstanceName FROM Organization LIMIT 1');
      
      if (orgData && orgData.length > 0) {
        const org = orgData[0];
        
        // Try to get edition from REST API describe endpoint
        let edition = 'Unknown';
        try {
          const { sfGet } = await import('@/server/salesforce/rest');
          const describe = await sfGet(auth, '/sobjects/Organization/describe');
          // Edition might be in the describe response or we can get it from limits
        } catch (e) {
          // Ignore describe errors
        }
        
        const response = {
          connected: true,
          instanceUrl: auth.instanceUrl,
          orgId: org.Id || 'Unknown',
          orgName: org.Name || org.InstanceName || 'Salesforce Org',
          edition: edition,
          organizationType: org.OrganizationType || 'Unknown',
          message: 'Successfully connected to Salesforce',
        };
        cachedStatus = { data: response, timestamp: Date.now() };
        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
          },
        });
      } else {
        // Even if we can't get org details, connection is valid
        const response = {
          connected: true,
          instanceUrl: auth.instanceUrl,
          orgName: 'Salesforce Org',
          message: 'Successfully connected to Salesforce',
        };
        cachedStatus = { data: response, timestamp: Date.now() };
        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
          },
        });
      }
    } catch (error: any) {
      // Check if it's a field error vs actual auth error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If it's just a field error but we have auth, still consider it connected
      if (errorMessage.includes('INVALID_FIELD') || errorMessage.includes('No such column')) {
        const response = {
          connected: true,
          instanceUrl: auth.instanceUrl,
          orgName: 'Salesforce Org',
          message: 'Successfully connected to Salesforce (some org details unavailable)',
        };
        cachedStatus = { data: response, timestamp: Date.now() };
        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
          },
        });
      }
      
      // Token might be expired or invalid
      const errorResponse = {
        connected: false,
        message: 'Connection test failed. Token may be expired.',
        error: errorMessage,
      };
      cachedStatus = { data: errorResponse, timestamp: Date.now() };
      return NextResponse.json(errorResponse, { 
        status: 401,
        headers: {
          'Cache-Control': 'public, s-maxage=60',
        },
      });
    }
  } catch (error) {
    const errorResponse = {
      connected: false,
      message: 'Error checking connection status',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    cachedStatus = { data: errorResponse, timestamp: Date.now() };
    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'public, s-maxage=60',
      },
    });
  }
}
