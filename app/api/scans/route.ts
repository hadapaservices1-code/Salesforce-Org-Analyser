import { NextRequest, NextResponse } from 'next/server';
import { db, schema, dbClient } from '@/lib/db';
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
      // Use optimized query to check if rawJson exists without loading the full data
      // This is much faster than loading potentially large JSONB columns (can be several MB per scan)
      // Using raw SQL to avoid loading the entire rawJson column into memory
      const scans = await dbClient`
        SELECT 
          id,
          org_id as "orgId",
          created_at as "createdAt",
          CASE 
            WHEN raw_json IS NOT NULL AND raw_json::text != 'null' AND raw_json::text != '{}' THEN true 
            ELSE false 
          END as "hasData"
        FROM scans
        ORDER BY created_at DESC
        LIMIT 50
      `;

      console.log(`[Scans API] Found ${scans.length} scans in database`);

      // Transform to match expected format
      const scansWithFlag = scans.map((scan: any) => ({
        id: scan.id,
        orgId: scan.orgId,
        createdAt: scan.createdAt,
        hasData: scan.hasData,
      }));

      console.log(`[Scans API] Returning ${scansWithFlag.length} scans, ${scansWithFlag.filter(s => s.hasData).length} with data`);

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
          // Retry after initialization with optimized query
          const scans = await dbClient`
            SELECT 
              id,
              org_id as "orgId",
              created_at as "createdAt",
              CASE 
                WHEN raw_json IS NOT NULL AND raw_json::text != 'null' AND raw_json::text != '{}' THEN true 
                ELSE false 
              END as "hasData"
            FROM scans
            ORDER BY created_at DESC
            LIMIT 50
          `;
          
          const scansWithFlag = scans.map((scan: any) => ({
            id: scan.id,
            orgId: scan.orgId,
            createdAt: scan.createdAt,
            hasData: scan.hasData,
          }));
          
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
