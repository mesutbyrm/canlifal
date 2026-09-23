import { NextResponse } from 'next/server';
import { getCachedPlatformSetting } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const value = await getCachedPlatformSetting('jeton_unit_price', '0.50');
    const unitPrice = parseFloat(value);
    return NextResponse.json({ unitPrice, currency: 'TRY' });
  } catch {
    return NextResponse.json({ unitPrice: 0.50, currency: 'TRY' });
  }
}
