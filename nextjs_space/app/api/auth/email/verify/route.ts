import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// E-posta doğrulama tokenını tüketir ve kullanıcının emailVerified alanını ayarlar.
// Kimlik doğrulaması gerektirmez: token gizli anahtar görevi görür (şifre sıfırlama ile aynı model).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = (body?.token || '').toString().trim();
    if (!token) {
      return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
    }

    const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record || record.used || record.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş bağlantı' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } }),
      prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
    ]);

    return NextResponse.json({ success: true, message: 'E-posta adresiniz doğrulandı.' });
  } catch (error) {
    console.error('email verify error:', error);
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 });
  }
}

// GET ile de doğrulanabilsin (e-posta bağlantısından doğrudan tıklama için kolaylık).
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() || '';
  if (!token) {
    return NextResponse.json({ error: 'Token gerekli' }, { status: 400 });
  }
  const record = await prisma.emailVerificationToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş bağlantı' }, { status: 400 });
  }
  await prisma.$transaction([
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { used: true } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerified: new Date() } }),
  ]);
  return NextResponse.json({ success: true, message: 'E-posta adresiniz doğrulandı.' });
}
