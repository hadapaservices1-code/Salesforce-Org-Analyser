import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { ScanOutput } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scanId1 = searchParams.get('scanId1');
    const scanId2 = searchParams.get('scanId2');

    if (!scanId1 || !scanId2) {
      return NextResponse.json(
        { error: 'Both scanId1 and scanId2 parameters required' },
        { status: 400 }
      );
    }

    const [scan1, scan2] = await Promise.all([
      db.query.scans.findFirst({
        where: eq(schema.scans.id, scanId1),
      }),
      db.query.scans.findFirst({
        where: eq(schema.scans.id, scanId2),
      }),
    ]);

    if (!scan1 || !scan2) {
      return NextResponse.json(
        { error: 'One or both scans not found' },
        { status: 404 }
      );
    }

    const output1 = scan1.rawJson as ScanOutput;
    const output2 = scan2.rawJson as ScanOutput;

    // Compare key metrics
    const comparison = {
      orgInfo: {
        scan1: {
          edition: output1.orgInfo.edition,
          userCount: output1.orgInfo.userCount,
          instanceName: output1.orgInfo.instanceName,
        },
        scan2: {
          edition: output2.orgInfo.edition,
          userCount: output2.orgInfo.userCount,
          instanceName: output2.orgInfo.instanceName,
        },
        changes: {
          userCountDelta: output2.orgInfo.userCount - output1.orgInfo.userCount,
        },
      },
      objects: {
        scan1: output1.objects.length,
        scan2: output2.objects.length,
        delta: output2.objects.length - output1.objects.length,
      },
      flows: {
        scan1: output1.flows.length,
        scan2: output2.flows.length,
        delta: output2.flows.length - output1.flows.length,
      },
      triggers: {
        scan1: output1.triggers.length,
        scan2: output2.triggers.length,
        delta: output2.triggers.length - output1.triggers.length,
      },
      blockers: {
        scan1: output1.blockers.length,
        scan2: output2.blockers.length,
        delta: output2.blockers.length - output1.blockers.length,
        highSeverity: {
          scan1: output1.blockers.filter((b) => b.severity === 'high').length,
          scan2: output2.blockers.filter((b) => b.severity === 'high').length,
        },
      },
      recordCounts: {
        // Compare top objects
        topObjects: compareTopObjects(output1.objects, output2.objects),
      },
    };

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Compare error:', error);
    return NextResponse.json(
      { error: 'Failed to compare scans' },
      { status: 500 }
    );
  }
}

function compareTopObjects(
  objects1: ScanOutput['objects'],
  objects2: ScanOutput['objects']
) {
  const map1 = new Map(objects1.map((obj) => [obj.name, obj.recordCount]));
  const map2 = new Map(objects2.map((obj) => [obj.name, obj.recordCount]));

  const allObjects = new Set([...map1.keys(), ...map2.keys()]);
  const changes: Array<{
    object: string;
    scan1: number;
    scan2: number;
    delta: number;
  }> = [];

  for (const objName of allObjects) {
    const count1 = map1.get(objName) || 0;
    const count2 = map2.get(objName) || 0;
    const delta = count2 - count1;

    if (delta !== 0 || count1 > 10000) {
      changes.push({
        object: objName,
        scan1: count1,
        scan2: count2,
        delta,
      });
    }
  }

  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 20);
}
