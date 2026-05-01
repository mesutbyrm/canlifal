import { prisma } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'jeton_unit_price' }
    });
    const unitPrice = parseFloat(setting?.value || '0.50');
    return NextResponse.json({ unitPrice, currency: 'TRY' });
  } catch {
    return NextResponse.json({ unitPrice: 0.50, currency: 'TRY' });
  }
}
