import { NextRequest, NextResponse } from 'next/server';
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db';
import { recordAudit } from '@/lib/audit-log';
import { staffCan } from '@/lib/permissions'
import { notifyWithdrawalStatus } from '@/lib/withdrawal-notify'

export const dynamic = 'force-dynamic';

// GET: List all withdrawal requests (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.withdrawal.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const requests = await prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch user info and agency info
    const userIds = [...new Set(requests.map((r: { userId: string }) => r.userId))];
    const agencyIds = [...new Set(requests.map((r: { agencyId: string | null }) => r.agencyId).filter(Boolean))] as string[];

    const [users, agencies] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, image: true, jetonBalance: true },
      }),
      agencyIds.length > 0 ? prisma.agency.findMany({
        where: { id: { in: agencyIds } },
        select: { id: true, name: true },
      }) : Promise.resolve([]),
    ]);

    const userMap = Object.fromEntries(users.map((u: { id: string }) => [u.id, u]));
    const agencyMap = Object.fromEntries(agencies.map((a: { id: string }) => [a.id, a]));

    const enrichedRequests = requests.map((r: { userId: string; agencyId: string | null; [key: string]: unknown }) => ({
      ...r,
      user: userMap[r.userId] || null,
      agency: r.agencyId ? agencyMap[r.agencyId] || null : null,
    }));

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    console.error('Admin fetch withdrawals error:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST: Admin approve, reject, cancel, or complete a withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getStaffSession();
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'finance.withdrawal.view', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { requestId, action, adminNote } = await request.json();

    if (!requestId || !['approve', 'reject', 'complete', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametreler' }, { status: 400 });
    }

    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!wr) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    }

    // Durum geçişleri transaction içinde KOŞULLU yapılır: aynı anda gelen iki
    // onay ya da onay+ret yarışında yalnızca biri kazanır; jeton bir kez düşer.
    const actorId = session.user.id
    const now = new Date()
    const conflict = () => NextResponse.json(
      { error: 'Talep bu sırada başka bir işlemle güncellendi; listeyi yenileyin' },
      { status: 409 },
    )
    let outcome: 'ok' | 'conflict' | 'insufficient' = 'ok'

    if (action === 'approve') {
      // Admin can approve from agency_approved status (or pending if no agency)
      if (!['agency_approved', 'pending'].includes(wr.status)) {
        return NextResponse.json({ error: 'Bu talep onaylanamaz (mevcut durum: ' + wr.status + ')' }, { status: 400 });
      }
      outcome = await prisma.$transaction(async (tx: any) => {
        const moved = await tx.withdrawalRequest.updateMany({
          where: { id: requestId, status: { in: ['agency_approved', 'pending'] } },
          data: { status: 'approved', adminNote: adminNote || null, processedBy: actorId, processedAt: now },
        })
        if (moved.count !== 1) throw new Error('CONFLICT')
        // Deduct jetons on admin approval — yalnızca bakiye yeterliyse.
        const debited = await tx.user.updateMany({
          where: { id: wr.userId, jetonBalance: { gte: wr.amount } },
          data: { jetonBalance: { decrement: wr.amount } },
        })
        if (debited.count !== 1) throw new Error('INSUFFICIENT')
        return 'ok' as const
      }).catch((e: any) => {
        const m = String(e?.message)
        if (m.includes('CONFLICT')) return 'conflict' as const
        if (m.includes('INSUFFICIENT')) return 'insufficient' as const
        throw e
      })
      if (outcome === 'insufficient') {
        return NextResponse.json({ error: 'Kullanıcının yeterli jetonu yok' }, { status: 400 });
      }
    } else if (action === 'reject' || action === 'cancel') {
      // Ret/iptal yalnızca jeton henüz düşülmemiş (bekleyen) taleplerde.
      // Onaylanmış talebin jetonu düşmüştür; onu iptal etmek ikinci bir
      // bakiye hareketi gerektirir → bu akışta izin verilmez.
      if (!['pending', 'agency_approved'].includes(wr.status)) {
        return NextResponse.json({ error: 'Yalnızca bekleyen talepler ' + (action === 'cancel' ? 'iptal edilebilir' : 'reddedilebilir') + ' (mevcut durum: ' + wr.status + ')' }, { status: 400 });
      }
      const moved = await prisma.withdrawalRequest.updateMany({
        where: { id: requestId, status: { in: ['pending', 'agency_approved'] } },
        data: {
          status: action === 'cancel' ? 'cancelled' : 'rejected',
          adminNote: action === 'cancel'
            ? `[İptal — yönetici] ${adminNote || 'Gerekçe belirtilmedi'}`
            : (adminNote || null),
          processedBy: actorId,
          processedAt: now,
        },
      })
      if (moved.count !== 1) outcome = 'conflict'
    } else if (action === 'complete') {
      if (wr.status !== 'approved') {
        return NextResponse.json({ error: 'Yalnızca onaylanmış talepler tamamlanabilir' }, { status: 400 });
      }
      const moved = await prisma.withdrawalRequest.updateMany({
        where: { id: requestId, status: 'approved' },
        data: {
          status: 'completed',
          adminNote: adminNote || wr.adminNote,
          processedBy: actorId,
          processedAt: now,
        },
      })
      if (moved.count !== 1) outcome = 'conflict'
    }
    if (outcome === 'conflict') return conflict()

    // Kullanıcıya durum bildirimi (uygulama içi + push + e-posta)
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action === 'cancel' ? 'cancelled' : 'completed'
    notifyWithdrawalStatus({
      userId: wr.userId,
      status: newStatus as any,
      amount: wr.amount,
      amountTL: wr.amountTL,
      note: adminNote || null,
    }).catch(e => console.error('[Admin Withdrawal] notify error:', e))

    // Audit: record admin withdrawal action
    recordAudit({
      actorId: session.user.id,
      actorRole: (session.user as any).role || 'admin',
      action: `withdrawal_${action}`,
      targetType: 'WithdrawalRequest',
      targetId: requestId,
      before: { status: wr.status },
      after: { status: newStatus, adminNote },
      description: `Çekim talebi ${action}: ${wr.amount} jeton (${wr.amountTL} TL)`,
    }).catch(e => console.error('[Audit] withdrawal action error:', e))

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin withdrawal action error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
