import { NextRequest, NextResponse } from 'next/server';
import { getSalesforceAuth } from '@/lib/session';
import { logger } from '@/lib/logger';
import { getActiveScan, deleteActiveScan } from '@/lib/scanStore';

export async function POST(request: NextRequest) {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { scanId } = body;

    if (!scanId) {
      return NextResponse.json(
        { error: 'Scan ID is required' },
        { status: 400 }
      );
    }

    const scan = getActiveScan(scanId);
    
    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found or already completed' },
        { status: 404 }
      );
    }

    // Abort the scan
    scan.abortController.abort();
    
    logger.info({ scanId }, 'Scan stopped by user - abort signal sent');

    // Wait for the scan promise to handle the abort and reject/complete
    // This ensures the scan process actually stops before we return
    try {
      await Promise.race([
        scan.scanPromise.catch((error) => {
          // Log if it was cancelled or if there was another error
          if (error instanceof Error && error.message === 'Scan cancelled by user') {
            logger.info({ scanId }, 'Scan promise rejected with cancellation');
          } else {
            logger.warn({ scanId, error }, 'Scan promise rejected with unexpected error');
          }
        }),
        new Promise(resolve => setTimeout(resolve, 3000)) // Wait up to 3 seconds
      ]);
    } catch (error) {
      // Ignore errors - we're just waiting for the promise to handle the abort
      logger.debug({ scanId, error }, 'Error while waiting for scan promise to reject');
    }
    
    // Delete the scan from store after waiting for it to stop
    // Even if it didn't reject within 3 seconds, the abort signal is sent
    // and all fetch requests should be cancelled
    deleteActiveScan(scanId);
    logger.info({ scanId }, 'Scan removed from store');

    return NextResponse.json({
      success: true,
      message: 'Scan stopped successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Failed to stop scan');
    return NextResponse.json(
      { 
        error: 'Failed to stop scan',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

