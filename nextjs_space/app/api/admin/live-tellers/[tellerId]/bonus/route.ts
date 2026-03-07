import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Give bonus credits to teller
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tellerId } = await params;
    const { amount, reason } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid amount required' }, { status: 400 });
    }

    // Get teller to find userId
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: tellerId },
      select: { userId: true },
    });

    if (!teller) {
      return NextResponse.json({ error: 'Teller not found' }, { status: 404 });
    }

    // Update both teller bonus and user credits
    const [updatedTeller] = await prisma.$transaction([
      prisma.liveFortuneTeller.update({
        where: { id: tellerId },
        data: {
          bonusCredits: { increment: amount },
        },
        include: {
          user: { select: { id: true, email: true, name: true, credits: true } },
        },
      }),
      prisma.user.update({
        where: { id: teller.userId },
        data: {
          credits: { increment: amount },
        },
      }),
    ]);

    return NextResponse.json({ 
      teller: updatedTeller,
      message: `${amount} kredi bonus olarak eklendi. Sebep: ${reason || 'Belirtilmedi'}`,
    });
  } catch (error) {
    console.error('Error giving bonus:', error);
    return NextResponse.json({ error: 'Failed to give bonus' }, { status: 500 });
  }
}
