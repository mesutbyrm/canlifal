import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';
import { recordAudit, getAuditIp } from '@/lib/audit-log';

export const dynamic = 'force-dynamic';

// POST - Add warning
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
    const { reason } = await request.json();

    if (!reason) {
      return NextResponse.json({ error: 'Warning reason required' }, { status: 400 });
    }

    const warning = await prisma.tellerWarning.create({
      data: {
        tellerId,
        reason,
        issuedBy: session.user.id,
      },
    });

    // Get updated warning count
    const warningCount = await prisma.tellerWarning.count({
      where: { tellerId },
    });

    recordAudit({ actorId: session.user.id, action: 'teller_warning_add', targetType: 'live_fortune_teller', targetId: tellerId, ip: getAuditIp(request), metadata: { reason, warningCount } }).catch(() => {});

    return NextResponse.json({ warning, warningCount });
  } catch (error) {
    console.error('Error adding warning:', error);
    return NextResponse.json({ error: 'Uyarı eklenemedi' }, { status: 500 });
  }
}

// DELETE - Remove warning
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tellerId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin' && (session.user as any).role !== 'yonetici' && (session.user as any).role !== 'moderator' && (session.user as any).role !== 'finans') {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const warningId = searchParams.get('warningId');

    if (!warningId) {
      return NextResponse.json({ error: 'Warning ID required' }, { status: 400 });
    }

    await prisma.tellerWarning.delete({
      where: { id: warningId },
    });

    recordAudit({ actorId: session.user.id, action: 'teller_warning_remove', targetType: 'teller_warning', targetId: warningId, ip: getAuditIp(request) }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing warning:', error);
    return NextResponse.json({ error: 'Uyarı kaldırılamadı' }, { status: 500 });
  }
}
