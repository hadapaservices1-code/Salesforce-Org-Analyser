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

      // Filter out scans without valid data
      const validScans = scans
        .map(s => s.rawJson as ScanOutput)
        .filter(scan => scan && scan.orgInfo && scan.orgInfo.id);

      if (validScans.length === 0) {
        return NextResponse.json(
          { error: 'No scans with valid data found' },
          { status: 404 }
        );
      }

      // Generate Excel with all scans
      const { generateAllScansExcel } = await import('@/server/reports/excelGenerator');
      const excelBuffer = generateAllScansExcel(validScans);

      return new NextResponse(new Uint8Array(excelBuffer), {
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

    // Validate scan data
    if (!scanOutput || !scanOutput.orgInfo || !scanOutput.orgInfo.id) {
      return NextResponse.json(
        { error: 'Scan data is incomplete or invalid' },
        { status: 400 }
      );
    }

    if (format === 'md') {
      try {
        const markdown = generateMarkdownRunbook(scanOutput);
        return new NextResponse(markdown, {
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': `attachment; filename="scan-${scanId}.md"`,
          },
        });
      } catch (error) {
        console.error('Markdown generation error:', error);
        return NextResponse.json(
          { error: 'Failed to generate markdown report', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    if (format === 'xlsx') {
      try {
        const excelBuffer = generateExcelReport(scanOutput, scanId);
        return new NextResponse(new Uint8Array(excelBuffer), {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="scan-${scanId}.xlsx"`,
          },
        });
      } catch (error) {
        console.error('Excel generation error:', error);
        return NextResponse.json(
          { error: 'Failed to generate Excel report', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    // JSON format
    return NextResponse.json(scanOutput, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
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
