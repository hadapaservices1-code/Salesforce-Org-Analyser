import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/server/salesforce/auth';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const isSandbox = searchParams.get('sandbox') === 'true';
    
    if (!process.env.SF_CLIENT_ID) {
      return NextResponse.json(
        { error: 'SF_CLIENT_ID not configured' },
        { status: 500 }
      );
    }
    
    const authUrl = getAuthUrl(isSandbox);
    console.log('Generated auth URL:', authUrl.substring(0, 100) + '...');
    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate auth URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
