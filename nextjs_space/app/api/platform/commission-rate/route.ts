import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const setting = await prisma.platformSettings.findUnique({
      where: { key: 'commission_rate' }
    });
    const commissionRate = setting ? parseInt(setting.value) : 20;
    return NextResponse.json({ commissionRate });
  } catch (error: any) {
    console.error('Commission rate fetch error:', error);
    return NextResponse.json({ commissionRate: 20 });
  }
}
