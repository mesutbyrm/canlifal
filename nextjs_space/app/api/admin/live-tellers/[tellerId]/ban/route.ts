import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { recordAudit, getAuditIp } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// POST - Ban or unban teller
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { tellerId } = await params;
    const { action, reason } = await request.json(); // action: 'ban' | 'unban'

    if (!['ban', 'unban'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
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

    recordAudit({ actorId: session.user.id, action: `teller_${action}`, targetType: 'live_fortune_teller', targetId: tellerId, ip: getAuditIp(request), metadata: { reason } }).catch(() => {});

    return NextResponse.json({ teller });
  } catch (error) {
    console.error('Error processing ban:', error);
    return NextResponse.json({ error: 'Yasaklama işlemi başarısız' }, { status: 500 });
  }
}
