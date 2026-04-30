import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List withdrawal requests for agency owner/manager
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    // Check if user is agency owner or manager
    const membership = await prisma.agencyUser.findFirst({
      where: { userId: session.user.id, isActive: true, role: { in: ['owner', 'manager'] } },
      select: { agencyId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Ajans yönetici yetkiniz yok' }, { status: 403 });
    }

    const requests = await prisma.withdrawalRequest.findMany({
      where: { agencyId: membership.agencyId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch user info
    const userIds = [...new Set(requests.map((r: { userId: string }) => r.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true, jetonBalance: true },
    });
    const userMap = Object.fromEntries(users.map((u: { id: string }) => [u.id, u]));

    const enrichedRequests = requests.map((r: { userId: string; [key: string]: unknown }) => ({
      ...r,
      user: userMap[r.userId] || null,
    }));

    return NextResponse.json({ requests: enrichedRequests });
  } catch (error) {
    console.error('Agency fetch withdrawals error:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST: Agency owner/manager approves or rejects withdrawal
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const membership = await prisma.agencyUser.findFirst({
      where: { userId: session.user.id, isActive: true, role: { in: ['owner', 'manager'] } },
      select: { agencyId: true, role: true },
    });
    if (!membership) {
      return NextResponse.json({ error: 'Ajans yönetici yetkiniz yok' }, { status: 403 });
    }

    const { requestId, action, note } = await request.json();
    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametreler' }, { status: 400 });
    }

    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!wr || wr.agencyId !== membership.agencyId || wr.status !== 'pending') {
      return NextResponse.json({ error: 'Talep bulunamadı veya zaten işlenmiş' }, { status: 404 });
    }

    if (action === 'approve') {
      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'agency_approved',
          agencyApprovedBy: session.user.id,
          agencyApprovedAt: new Date(),
          agencyNote: note || null,
        },
      });
    } else {
      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          agencyNote: note || 'Ajans tarafından reddedildi',
          agencyApprovedBy: session.user.id,
          agencyApprovedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Agency withdrawal action error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
