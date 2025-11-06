import { NextRequest } from 'next/server';
import { getSalesforceAuth } from '@/lib/session';
import { composeScan, ScanProgress } from '@/server/composeScan';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { logger } from '@/lib/logger';
import { getActiveScan, setActiveScan, deleteActiveScan } from '@/lib/scanStore';

export async function GET(request: NextRequest) {
  const auth = await getSalesforceAuth();
  
  if (!auth) {
    return new Response('Not authenticated', { status: 401 });
  }

  const scanId = request.nextUrl.searchParams.get('scanId');
  
  if (!scanId) {
    return new Response('Scan ID is required', { status: 400 });
  }

  const activeScan = getActiveScan(scanId);
  
  if (!activeScan) {
    return new Response('Scan not found', { status: 404 });
  }
  
  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let intervalId: NodeJS.Timeout | null = null;
      let isClosed = false;
      
      const sendEvent = (data: any) => {
        // Don't try to send if controller is already closed
        if (isClosed) {
          return;
        }
        try {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch (error) {
          // Controller is closed, mark as closed and stop trying
          isClosed = true;
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      };

      let lastUpdateIndex = 0;
      
      // Send existing progress updates
      if (activeScan.progressUpdates.length > 0) {
        activeScan.progressUpdates.forEach(progress => {
          sendEvent({ type: 'progress', ...progress });
        });
        lastUpdateIndex = activeScan.progressUpdates.length;
      }

      // Poll for new progress updates
      intervalId = setInterval(() => {
        // Don't try to send if already closed
        if (isClosed) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        
        const currentScan = getActiveScan(scanId);
        if (!currentScan) {
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        
        // Send any new progress updates
        if (currentScan.progressUpdates.length > lastUpdateIndex) {
          const newUpdates = currentScan.progressUpdates.slice(lastUpdateIndex);
          newUpdates.forEach(progress => {
            sendEvent({ type: 'progress', ...progress });
          });
          lastUpdateIndex = currentScan.progressUpdates.length;
        }
      }, 500); // Poll every 500ms

      try {
        // Wait for scan to complete
        const result = await activeScan.scanPromise;
        
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        sendEvent({ type: 'complete', result });
        isClosed = true;
        controller.close();
      } catch (error) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        sendEvent({ 
          type: 'error', 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
        isClosed = true;
        controller.close();
      } finally {
        // Ensure interval is always cleared
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        deleteActiveScan(scanId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getSalesforceAuth();
    
    if (!auth) {
      return new Response(
        JSON.stringify({ error: 'Not authenticated. Please connect to Salesforce first.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const scanId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize database if needed
    try {
      await db.query.users.findFirst();
    } catch (dbError: any) {
      if (dbError?.code === '42P01' || dbError?.message?.includes('does not exist')) {
        logger.info('Database tables not found, initializing...');
        const { initializeDatabase } = await import('@/lib/db/init');
        const initialized = await initializeDatabase();
        if (!initialized) {
          return new Response(
            JSON.stringify({ error: 'Failed to initialize database. Please try again.' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
        logger.info('Database initialized successfully');
      } else {
        throw dbError;
      }
    }

    // Start scan with progress tracking
    const progressUpdates: ScanProgress[] = [];
    const abortController = new AbortController();
    
    // Add abort listener to log when scan is cancelled
    abortController.signal.addEventListener('abort', () => {
      logger.info({ scanId }, 'Scan abort signal received');
    });
    
    const scanPromise = (async () => {
      try {
        const scanOutput = await composeScan(auth, {
          abortSignal: abortController.signal,
          onProgress: (progress) => {
            progressUpdates.push(progress);
          },
        });

        // Store scan results
        const orgId = scanOutput.orgInfo.id || 'unknown';
        
        let userRecord = await db.query.users.findFirst({
          where: eq(schema.users.email, 'default@org-analyzer.local'),
        });

        if (!userRecord) {
          try {
            const [newUser] = await db.insert(schema.users).values({
              email: 'default@org-analyzer.local',
            }).returning();
            userRecord = newUser;
          } catch (userError: any) {
            if (userError?.code !== '23505') {
              throw userError;
            }
            userRecord = await db.query.users.findFirst({
              where: eq(schema.users.email, 'default@org-analyzer.local'),
            });
          }
        }

        if (!userRecord) {
          throw new Error('Failed to create or retrieve user record');
        }

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
          } catch (orgError: any) {
            if (orgError?.code !== '23505') {
              throw orgError;
            }
            orgRecord = await db.query.orgs.findFirst({
              where: eq(schema.orgs.orgId, orgId),
            });
          }
        }

        if (!orgRecord) {
          throw new Error('Failed to create or retrieve org record');
        }

        const [newScan] = await db.insert(schema.scans).values({
          orgId: orgRecord.id,
          rawJson: scanOutput as any,
        }).returning();

        return {
          scanId: newScan.id,
          scan: scanOutput,
          success: true,
        };
      } catch (error) {
        if (error instanceof Error && error.message === 'Scan cancelled by user') {
          throw error;
        }
        logger.error({ error }, 'Scan failed');
        throw error;
      }
    })();

    // Store the scan
    setActiveScan(scanId, { abortController, scanPromise, progressUpdates });

    return new Response(
      JSON.stringify({ scanId, message: 'Scan started' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    logger.error({ error }, 'Failed to start scan');
    return new Response(
      JSON.stringify({ 
        error: 'Failed to start scan',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

