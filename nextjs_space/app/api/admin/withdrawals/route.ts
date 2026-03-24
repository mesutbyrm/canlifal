import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET: List all withdrawal requests (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;

    const requests = await prisma.withdrawalRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Fetch user info for each request
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
    console.error('Admin fetch withdrawals error:', error);
    return NextResponse.json({ error: 'Veriler alınamadı' }, { status: 500 });
  }
}

// POST: Approve or reject a withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { requestId, action, adminNote } = await request.json();

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!wr || wr.status !== 'pending') {
      return NextResponse.json({ error: 'Request not found or already processed' }, { status: 404 });
    }

    if (action === 'approve') {
      // Deduct jetons on approval
      const user = await prisma.user.findUnique({ where: { id: wr.userId }, select: { jetonBalance: true } });
      if (!user || user.jetonBalance < wr.amount) {
        return NextResponse.json({ error: 'Kullanıcının yeterli jetonu yok' }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: wr.userId },
          data: { jetonBalance: { decrement: wr.amount } },
        }),
        prisma.withdrawalRequest.update({
          where: { id: requestId },
          data: {
            status: 'approved',
            adminNote: adminNote || null,
            processedBy: session.user.id,
            processedAt: new Date(),
          },
        }),
      ]);
    } else {
      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          adminNote: adminNote || null,
          processedBy: session.user.id,
          processedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin withdrawal action error:', error);
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 });
  }
}
