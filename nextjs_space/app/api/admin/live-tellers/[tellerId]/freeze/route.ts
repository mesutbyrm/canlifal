import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { recordAudit, getAuditIp } from '@/lib/audit-log';
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

// POST - Freeze or unfreeze teller earnings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getHybridSession(request);
    
    if (!session || !(await staffCan(session.user.role, (session?.user as any)?.id, 'content.teller.manage', ['admin','yonetici','moderator','finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { tellerId } = await params;
    const { action, reason } = await request.json(); // action: 'freeze' | 'unfreeze'

    if (!['freeze', 'unfreeze'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }

    const updateData = action === 'freeze'
      ? {
          isFrozen: true,
          freezeReason: reason || 'İnceleme altında',
          frozenAt: new Date(),
        }
      : {
          isFrozen: false,
          freezeReason: null,
          frozenAt: null,
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
    console.error('Error processing freeze:', error);
    return NextResponse.json({ error: 'Dondurma işlemi başarısız' }, { status: 500 });
  }
}
