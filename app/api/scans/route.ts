import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { getSalesforceAuth } from '@/lib/session';

export async function GET(request: NextRequest) {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get org ID from auth
    // For now, get all scans (would filter by org in production)
    try {
      const scans = await db.query.scans.findMany({
        orderBy: [desc(schema.scans.createdAt)],
        limit: 50,
      });

      return NextResponse.json({ scans });
    } catch (dbError: any) {
      // If tables don't exist, try to initialize
      if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
        const { initializeDatabase } = await import('@/lib/db/init');
        const initialized = await initializeDatabase();
        
        if (initialized) {
          // Retry after initialization
          const scans = await db.query.scans.findMany({
            orderBy: [desc(schema.scans.createdAt)],
            limit: 50,
          });
          return NextResponse.json({ scans });
        }
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Scans list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scans', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
