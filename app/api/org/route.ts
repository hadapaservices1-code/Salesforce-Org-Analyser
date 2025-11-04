import { NextResponse } from 'next/server';
import { getSalesforceAuth } from '@/lib/session';
import { scanOrgInfo } from '@/server/inventory/org';

export async function GET() {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const orgInfo = await scanOrgInfo(auth);
    
    // Validate required fields
    if (!orgInfo.id) {
      console.warn('Org info missing ID:', orgInfo);
    }
    
    return NextResponse.json({ orgInfo });
  } catch (error) {
    console.error('Org info fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch org information',
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}
