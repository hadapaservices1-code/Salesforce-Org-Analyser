import { NextResponse } from 'next/server';
import { getSalesforceAuth } from '@/lib/session';
import { sfGet } from '@/server/salesforce/rest';

export async function GET() {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return NextResponse.json({
        connected: false,
        message: 'Not connected to Salesforce',
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
        
        return NextResponse.json({
          connected: true,
          instanceUrl: auth.instanceUrl,
          orgId: org.Id || 'Unknown',
          orgName: org.Name || org.InstanceName || 'Salesforce Org',
          edition: edition,
          organizationType: org.OrganizationType || 'Unknown',
          message: 'Successfully connected to Salesforce',
        });
      } else {
        // Even if we can't get org details, connection is valid
        return NextResponse.json({
          connected: true,
          instanceUrl: auth.instanceUrl,
          orgName: 'Salesforce Org',
          message: 'Successfully connected to Salesforce',
        });
      }
    } catch (error: any) {
      // Check if it's a field error vs actual auth error
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // If it's just a field error but we have auth, still consider it connected
      if (errorMessage.includes('INVALID_FIELD') || errorMessage.includes('No such column')) {
        return NextResponse.json({
          connected: true,
          instanceUrl: auth.instanceUrl,
          orgName: 'Salesforce Org',
          message: 'Successfully connected to Salesforce (some org details unavailable)',
        });
      }
      
      // Token might be expired or invalid
      return NextResponse.json({
        connected: false,
        message: 'Connection test failed. Token may be expired.',
        error: errorMessage,
      }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({
      connected: false,
      message: 'Error checking connection status',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
