import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { recordAudit, getAuditIp } from '@/lib/audit-log';
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

// POST - Approve or reject application
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
    const { action, note } = await request.json(); // action: 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }

    const updateData = action === 'approve'
      ? {
          applicationStatus: 'approved',
          approvedAt: new Date(),
          applicationNote: note || null,
          isActive: true,
        }
      : {
          applicationStatus: 'rejected',
          rejectedAt: new Date(),
          applicationNote: note || null,
          isActive: false,
        };

    const teller = await prisma.liveFortuneTeller.update({
      where: { id: tellerId },
      data: updateData,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    recordAudit({ actorId: session.user.id, action: `teller_${action}`, targetType: 'live_fortune_teller', targetId: tellerId, ip: getAuditIp(request), metadata: { note } }).catch(() => {});

    return NextResponse.json({ teller });
  } catch (error) {
    console.error('Error processing application:', error);
    return NextResponse.json({ error: 'Başvuru işlenemedi' }, { status: 500 });
  }
}
