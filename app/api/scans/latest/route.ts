import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { desc } from 'drizzle-orm';
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

    try {
      // Get only the latest scan with full rawJson
      const latestScan = await db.query.scans.findFirst({
        orderBy: [desc(schema.scans.createdAt)],
      });

      if (!latestScan) {
        return NextResponse.json({ scan: null });
      }

      return NextResponse.json({ scan: latestScan }, {
        headers: {
          'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60, max-age=60',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (dbError: any) {
      // If tables don't exist, try to initialize
      if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
        const { initializeDatabase } = await import('@/lib/db/init');
        const initialized = await initializeDatabase();
        
        if (initialized) {
          // Retry after initialization
          const latestScan = await db.query.scans.findFirst({
            orderBy: [desc(schema.scans.createdAt)],
          });
          return NextResponse.json({ scan: latestScan || null }, {
            headers: {
              'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60, max-age=60',
              'X-Content-Type-Options': 'nosniff',
            },
          });
        }
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Latest scan error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch latest scan', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

