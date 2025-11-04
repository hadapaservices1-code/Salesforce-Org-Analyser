import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { getSalesforceAuth } from '@/lib/session';
import { ScanOutput } from '@/lib/types';

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
      // Get the latest scan
      const latestScan = await db.query.scans.findFirst({
        orderBy: [desc(schema.scans.createdAt)],
      });

      if (!latestScan || !latestScan.rawJson) {
        return NextResponse.json({
          security: null,
          message: 'No scan data available. Please run a scan first.',
        });
      }

      const scanData = latestScan.rawJson as ScanOutput;

      // Extract security-related data
      const securityData = {
        profiles: scanData.profiles || [],
        roles: scanData.roles || [],
        queues: scanData.queues || [],
        sharingRules: scanData.sharingRules || [],
        permissionSets: scanData.permissionSets || [],
        blockers: scanData.blockers?.filter(b => 
          b.type === 'profile_mismatch' || 
          b.type === 'automation_density'
        ) || [],
        // Security statistics
        stats: {
          totalProfiles: scanData.profiles?.length || 0,
          totalRoles: scanData.roles?.length || 0,
          totalQueues: scanData.queues?.length || 0,
          totalSharingRules: scanData.sharingRules?.length || 0,
          totalPermissionSets: scanData.permissionSets?.length || 0,
          totalUsers: scanData.orgInfo?.userCount || 0,
          securityBlockers: scanData.blockers?.filter(b => 
            b.type === 'profile_mismatch'
          ).length || 0,
        },
        scannedAt: scanData.scannedAt,
      };

      return NextResponse.json({ security: securityData });
    } catch (dbError: any) {
      // If tables don't exist, try to initialize
      if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
        const { initializeDatabase } = await import('@/lib/db/init');
        const initialized = await initializeDatabase();
        
        if (initialized) {
          return NextResponse.json({
            security: null,
            message: 'Database initialized. Please run a scan to view security data.',
          });
        }
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Security data error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch security data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

