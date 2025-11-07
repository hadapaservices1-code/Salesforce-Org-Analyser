import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { desc, eq, sql } from 'drizzle-orm';
import { getSalesforceAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get all scans ordered by creation date (newest first)
    const allScans = await db.query.scans.findMany({
      orderBy: [desc(schema.scans.createdAt)],
    });

    if (allScans.length <= 3) {
      return NextResponse.json({
        message: 'No scans to delete. Only 3 or fewer scans exist.',
        totalScans: allScans.length,
        deleted: 0,
      });
    }

    // Get the IDs of the 3 most recent scans to keep
    const scansToKeep = allScans.slice(0, 3);
    const keepIds = scansToKeep.map(scan => scan.id);

    // Get IDs of scans to delete (all except the 3 most recent)
    const scansToDelete = allScans.slice(3);
    const deleteIds = scansToDelete.map(scan => scan.id);

    // Delete scans one by one (drizzle-orm doesn't have a simple notInArray for delete)
    let deletedCount = 0;
    
    for (const scanId of deleteIds) {
      try {
        await db.delete(schema.scans).where(eq(schema.scans.id, scanId));
        deletedCount++;
      } catch (deleteError) {
        logger.error({ scanId, error: deleteError }, 'Failed to delete scan');
      }
    }

    logger.info({ 
      totalScans: allScans.length, 
      kept: keepIds.length, 
      deleted: deletedCount 
    }, 'Cleaned up old scans, kept only the 3 most recent');

    return NextResponse.json({
      message: `Successfully deleted ${deletedCount} scan(s). Kept the 3 most recent scans.`,
      totalScans: allScans.length,
      kept: keepIds.length,
      deleted: deletedCount,
      keptScanIds: keepIds,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to cleanup scans');
    return NextResponse.json(
      { 
        error: 'Failed to cleanup scans', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

