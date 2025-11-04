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
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    logger.info('Starting scan request');
    const scanOutput = await composeScan(auth);

    // Get org info to store
    const orgId = scanOutput.orgInfo.id;
    
    // Find or create org record
    let orgRecord = await db.query.orgs.findFirst({
      where: eq(schema.orgs.orgId, orgId),
    });

    if (!orgRecord) {
      // Create org record (simplified - would need user context)
      const [newOrg] = await db.insert(schema.orgs).values({
        orgId,
        orgName: scanOutput.orgInfo.instanceName,
        instanceUrl: auth.instanceUrl,
        edition: scanOutput.orgInfo.edition,
        userId: 'temp-user-id', // Would come from session
      }).returning();
      
      orgRecord = newOrg;
    }

    // Store scan
    const [scan] = await db.insert(schema.scans).values({
      orgId: orgRecord.id,
      rawJson: scanOutput as any,
    }).returning();

    logger.info({ scanId: scan.id }, 'Scan stored successfully');

    return NextResponse.json({
      scanId: scan.id,
      scan: scanOutput,
    });
  } catch (error) {
    logger.error({ error }, 'Scan failed');
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Scan failed' },
      { status: 500 }
    );
  }
}
