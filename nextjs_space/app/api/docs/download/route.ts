import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get('file');
  
  if (!file) {
    return NextResponse.json({ error: 'file parametresi gerekli' }, { status: 400 });
  }

  // Güvenlik: sadece docs klasöründen dosya sunulmasına izin ver
  const safeName = path.basename(file);
  const allowedExtensions = ['.md', '.txt'];
  const ext = path.extname(safeName).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return NextResponse.json({ error: 'Desteklenmeyen dosya formatı' }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), 'public', 'docs', safeName);
  
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 });
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const contentType = ext === '.md' ? 'text/markdown' : 'text/plain';

  return new NextResponse(fileContent, {
    status: 200,
    headers: {
      'Content-Type': `${contentType}; charset=utf-8`,
      'Content-Disposition': `attachment; filename="${safeName}"`,
    },
  });
}
