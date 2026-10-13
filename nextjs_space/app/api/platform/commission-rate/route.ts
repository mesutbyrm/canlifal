import { NextResponse } from 'next/server';
import { getCachedPlatformSetting } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const val = await getCachedPlatformSetting('commission_rate', '20');
    const commissionRate = parseInt(val);
    return NextResponse.json({ commissionRate });
  } catch (error: any) {
    console.error('Commission rate fetch error:', error);
    return NextResponse.json({ commissionRate: 20 });
  }
}
