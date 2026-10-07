import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { recordAudit } from '@/lib/audit-log';
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

export const dynamic = 'force-dynamic';

const REFUND_ADMIN_ROLES = ['admin', 'yonetici', 'finans'];

async function getAdmin(req?: Request) {
  const session = await getHybridSession(req);
  const role = (session?.user as any)?.role as string | undefined;
  if (!session?.user?.id || !(await staffCan(role || '', (session?.user as any)?.id, 'payment.refund', REFUND_ADMIN_ROLES))) return null;
  return { id: session.user.id, role: role as string };
}

// Admin: iade taleplerini listeler (status ile filtrelenebilir).
export async function GET(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 401 });

  const status = request.nextUrl.searchParams.get('status') || undefined;
  const refunds = await prisma.refundRequest.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  return NextResponse.json({ success: true, refunds });
}

// Admin: iade talebini onaylar/reddeder/işler.
export async function PATCH(request: NextRequest) {
  const admin = await getAdmin(request);
  if (!admin) return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = (body?.id || '').toString();
  const action = (body?.action || '').toString(); // approve | reject | process
  const adminNote = body?.adminNote ? String(body.adminNote) : null;
  if (!id || !['approve', 'reject', 'process'].includes(action)) {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  const refund = await prisma.refundRequest.findUnique({ where: { id } });
  if (!refund) return NextResponse.json({ error: 'İade talebi bulunamadı' }, { status: 404 });

  const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'processed';

  const updated = await prisma.$transaction(async (tx) => {
    const r = await tx.refundRequest.update({
      where: { id },
      data: { status: nextStatus, adminNote, resolvedBy: admin.id, resolvedAt: new Date() },
    });
    // İşlendi olarak işaretlenirse ilgili ödemeyi 'refunded' yap
    if (nextStatus === 'processed' && refund.paymentId) {
      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'refunded' } }).catch(() => null);
    }
    if (nextStatus === 'processed' && refund.storePurchaseId) {
      await tx.storePurchase.update({ where: { id: refund.storePurchaseId }, data: { status: 'refunded' } }).catch(() => null);
    }
    return r;
  });

  await recordAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: 'refund_' + action,
    targetType: 'RefundRequest',
    targetId: id,
    before: { status: refund.status },
    after: { status: nextStatus },
    description: adminNote || undefined,
  });

  return NextResponse.json({ success: true, refund: updated });
}
