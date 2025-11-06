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
      // Fetch scans with rawJson to check if data exists, but exclude it from response
      const scans = await db.query.scans.findMany({
        orderBy: [desc(schema.scans.createdAt)],
        limit: 50,
      });

      // Transform to include hasData flag without sending full rawJson
      const scansWithFlag = scans.map(scan => {
        const rawJson = scan.rawJson as any;
        // Check if rawJson exists and has the required structure
        const hasData = !!rawJson && (
          rawJson.orgInfo !== undefined ||
          (rawJson.objects && Array.isArray(rawJson.objects)) ||
          (rawJson.scannedAt !== undefined)
        );
        return {
          id: scan.id,
          orgId: scan.orgId,
          createdAt: scan.createdAt,
          hasData,
        };
      });

      return NextResponse.json({ scans: scansWithFlag }, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
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
          const scans = await db.query.scans.findMany({
            orderBy: [desc(schema.scans.createdAt)],
            limit: 50,
          });
          
          const scansWithFlag = scans.map(scan => {
            const rawJson = scan.rawJson as any;
            // Check if rawJson exists and has the required structure
            const hasData = !!rawJson && (
              rawJson.orgInfo !== undefined ||
              (rawJson.objects && Array.isArray(rawJson.objects)) ||
              (rawJson.scannedAt !== undefined)
            );
            return {
              id: scan.id,
              orgId: scan.orgId,
              createdAt: scan.createdAt,
              hasData,
            };
          });
          
          return NextResponse.json({ scans: scansWithFlag }, {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Content-Type-Options': 'nosniff',
            },
          });
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
