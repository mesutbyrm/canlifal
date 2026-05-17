import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'FLUTTER_API_DOKUMANTASYONU.txt');
    const content = fs.readFileSync(filePath, 'utf-8');
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="FLUTTER_API_DOKUMANTASYONU.md"',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
  }
}
