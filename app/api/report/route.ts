import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { generateMarkdownRunbook } from '@/server/runbook/generator';
import { ScanOutput } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scanId = searchParams.get('scanId');
    const format = searchParams.get('format') || 'json';

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

    return NextResponse.json(scanOutput, {
      headers: {
        'Content-Disposition': `attachment; filename="scan-${scanId}.json"`,
      },
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
