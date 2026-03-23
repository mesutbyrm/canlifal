import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Validate a referral code
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json({ valid: false, error: 'No code provided' });
    }

    const referrer = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true, name: true }
    });

    if (!referrer) {
      return NextResponse.json({ valid: false, error: 'Geçersiz davet kodu' });
    }

    return NextResponse.json({ 
      valid: true, 
      referrerName: referrer.name 
    });
  } catch (error) {
    console.error('Referral validation error:', error);
    return NextResponse.json({ valid: false, error: 'Validation failed' });
  }
}
