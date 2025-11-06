import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuth } from '@/lib/session';
import { composeScan } from '@/server/composeScan';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated. Please connect to Salesforce first.' },
        { status: 401 }
      );
    }

    logger.info('Starting scan request');

    // Initialize database if needed
    try {
      // Test database connection
      await db.query.users.findFirst();
    } catch (dbError: any) {
      if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
        logger.info('Database tables not found, initializing...');
        const { initializeDatabase } = await import('@/lib/db/init');
        const initialized = await initializeDatabase();
        if (!initialized) {
          return NextResponse.json(
            { error: 'Failed to initialize database. Please try again.' },
            { status: 500 }
          );
        }
        logger.info('Database initialized successfully');
      } else {
        throw dbError;
      }
    }

    // Run the scan
    let scanOutput;
    try {
      scanOutput = await composeScan(auth);
      logger.info({ 
        objectsCount: scanOutput.objects.length,
        blockersCount: scanOutput.blockers.length,
        duration: scanOutput.scanDuration 
      }, 'Scan completed successfully');
    } catch (scanError) {
      logger.error({ error: scanError }, 'Scan composition failed');
      return NextResponse.json(
        { 
          error: 'Scan failed',
          details: scanError instanceof Error ? scanError.message : 'Unknown error during scan',
          message: 'Failed to scan Salesforce org. Please check your connection and try again.'
        },
        { status: 500 }
      );
    }

    // Get org info to store
    const orgId = scanOutput.orgInfo.id || 'unknown';
    
    // Find or create user record (simplified - use a default user for now)
    let userRecord = await db.query.users.findFirst({
      where: eq(schema.users.email, 'default@org-analyzer.local'),
    });

    if (!userRecord) {
      try {
        const [newUser] = await db.insert(schema.users).values({
          email: 'default@org-analyzer.local',
        }).returning();
        userRecord = newUser;
        logger.info({ userId: userRecord.id }, 'Created default user');
      } catch (userError: any) {
        // If user already exists (race condition), fetch it
        if (userError?.code !== '23505') {
          throw userError;
        }
        userRecord = await db.query.users.findFirst({
          where: eq(schema.users.email, 'default@org-analyzer.local'),
        });
      }
    }

    if (!userRecord) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve user record' },
        { status: 500 }
      );
    }

    // Find or create org record
    let orgRecord = await db.query.orgs.findFirst({
      where: eq(schema.orgs.orgId, orgId),
    });

    if (!orgRecord) {
      try {
        const [newOrg] = await db.insert(schema.orgs).values({
          orgId,
          orgName: scanOutput.orgInfo.instanceName || 'Unknown',
          instanceUrl: auth.instanceUrl,
          edition: scanOutput.orgInfo.edition || 'Unknown',
          userId: userRecord.id,
        }).returning();
        
        orgRecord = newOrg;
        logger.info({ orgId: orgRecord.id, salesforceOrgId: orgId }, 'Created org record');
      } catch (orgError: any) {
        // If org already exists (race condition), fetch it
        if (orgError?.code !== '23505') {
          throw orgError;
        }
        orgRecord = await db.query.orgs.findFirst({
          where: eq(schema.orgs.orgId, orgId),
        });
      }
    }

    if (!orgRecord) {
      return NextResponse.json(
        { error: 'Failed to create or retrieve org record' },
        { status: 500 }
      );
    }

    // Store scan
    let scan;
    try {
      const [newScan] = await db.insert(schema.scans).values({
        orgId: orgRecord.id,
        rawJson: scanOutput as any,
      }).returning();
      
      scan = newScan;
      logger.info({ scanId: scan.id }, 'Scan stored successfully');
    } catch (scanStoreError: any) {
      logger.error({ error: scanStoreError }, 'Failed to store scan');
      // Still return the scan data even if storage failed
      return NextResponse.json({
        scanId: null,
        scan: scanOutput,
        warning: 'Scan completed but failed to store in database',
        error: scanStoreError?.message || 'Storage error',
      });
    }

    return NextResponse.json({
      scanId: scan.id,
      scan: scanOutput,
      success: true,
      message: 'Scan completed successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Scan request failed');
    return NextResponse.json(
      { 
        error: 'Scan failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'An unexpected error occurred. Please try again.'
      },
      { status: 500 }
    );
  }
}
