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

// POST: Admin approve, reject, or complete a withdrawal request
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['admin','yonetici','moderator','finans'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { requestId, action, adminNote } = await request.json();

    if (!requestId || !['approve', 'reject', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'Geçersiz parametreler' }, { status: 400 });
    }

    const wr = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
    if (!wr) {
      return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 });
    }

    if (action === 'approve') {
      // Admin can approve from agency_approved status (or pending if no agency)
      if (!['agency_approved', 'pending'].includes(wr.status)) {
        return NextResponse.json({ error: 'Bu talep onaylanamaz (mevcut durum: ' + wr.status + ')' }, { status: 400 });
      }
      // Deduct jetons on admin approval
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
    } else if (action === 'reject') {
      if (['completed', 'rejected'].includes(wr.status)) {
        return NextResponse.json({ error: 'Bu talep zaten işlenmiş' }, { status: 400 });
      }
      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          adminNote: adminNote || null,
          processedBy: session.user.id,
          processedAt: new Date(),
        },
      });
    } else if (action === 'complete') {
      if (wr.status !== 'approved') {
        return NextResponse.json({ error: 'Yalnızca onaylanmış talepler tamamlanabilir' }, { status: 400 });
      }
      await prisma.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'completed',
          adminNote: adminNote || wr.adminNote,
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
