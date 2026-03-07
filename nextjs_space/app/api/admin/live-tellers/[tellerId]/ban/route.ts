import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// POST - Ban or unban teller
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
    const { action, reason } = await request.json(); // action: 'ban' | 'unban'

    if (!['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updateData = action === 'ban'
      ? {
          isBanned: true,
          banReason: reason || 'Politika ihlali',
          bannedAt: new Date(),
          isOnline: false,
          isActive: false,
        }
      : {
          isBanned: false,
          banReason: null,
          bannedAt: null,
          isActive: true,
        };

    const teller = await prisma.liveFortuneTeller.update({
      where: { id: tellerId },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    return NextResponse.json({ teller });
  } catch (error) {
    console.error('Error processing ban:', error);
    return NextResponse.json({ error: 'Failed to process ban' }, { status: 500 });
  }
}
