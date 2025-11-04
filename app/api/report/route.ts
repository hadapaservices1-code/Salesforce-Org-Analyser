import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { generateMarkdownRunbook } from '@/server/runbook/generator';
import { generateExcelReport } from '@/server/reports/excelGenerator';
import { ScanOutput } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scanId = searchParams.get('scanId');
    const format = searchParams.get('format') || 'json';
    const allScans = searchParams.get('all') === 'true';

    // Handle "all scans" export
    if (allScans && format === 'xlsx') {
      const scans = await db.query.scans.findMany({
        orderBy: [desc(schema.scans.createdAt)],
        limit: 100,
      });

      if (scans.length === 0) {
        return NextResponse.json(
          { error: 'No scans found' },
          { status: 404 }
        );
      }

      // Generate Excel with all scans
      const { generateAllScansExcel } = await import('@/server/reports/excelGenerator');
      const excelBuffer = generateAllScansExcel(scans.map(s => s.rawJson as ScanOutput));

      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="all-scans-${new Date().toISOString().split('T')[0]}.xlsx"`,
        },
      });
    }

    if (!scanId) {
      return NextResponse.json(
        { error: 'scanId parameter required' },
        { status: 400 }
      );
    }

    const scan = await db.query.scans.findFirst({
      where: eq(schema.scans.id, scanId),
    });

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      );
    }

    const scanOutput = scan.rawJson as ScanOutput;

    if (format === 'md') {
      const markdown = generateMarkdownRunbook(scanOutput);
      return new NextResponse(markdown, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="scan-${scanId}.md"`,
        },
      });
    }

    if (format === 'xlsx') {
      const excelBuffer = generateExcelReport(scanOutput, scanId);
      return new NextResponse(excelBuffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="scan-${scanId}.xlsx"`,
        },
      });
    }

    return NextResponse.json(scanOutput, {
      headers: {
        'Content-Disposition': `attachment; filename="scan-${scanId}.json"`,
      },
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
