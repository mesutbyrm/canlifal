import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'md';

  const allowedFormats: Record<string, { ext: string; contentType: string }> = {
    md: { ext: '.md', contentType: 'text/markdown; charset=utf-8' },
    pdf: { ext: '.pdf', contentType: 'application/pdf' },
    docx: { ext: '.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  };

  const fmt = allowedFormats[format];
  if (!fmt) {
    return NextResponse.json({ error: 'Invalid format. Use md, pdf, or docx' }, { status: 400 });
  }

  const fileName = `FLUTTER_CANLI_FALCILAR_PROMPT${fmt.ext}`;
  const filePath = path.join(process.cwd(), 'public', fileName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': fmt.contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}
