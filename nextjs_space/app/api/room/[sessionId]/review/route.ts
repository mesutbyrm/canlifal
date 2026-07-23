import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { authenticateRequest } from '@/lib/mobile-auth';
import prisma from '@/lib/db';
import { createNotificationWithPush } from '@/lib/notify';

export const dynamic = 'force-dynamic';

/**
 * GET /api/room/[sessionId]/review
 * Returns the existing review for a session (if any). Dual-auth.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const userId = mobileUser?.id || webSession?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const review = await prisma.liveTellerReview.findUnique({
      where: { sessionId: params.sessionId },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });

    return NextResponse.json({ review: review || null });
  } catch (error) {
    console.error('Get review error:', error);
    return NextResponse.json({ error: 'Değerlendirme alınamadı' }, { status: 500 });
  }
}

/**
 * POST /api/room/[sessionId]/review
 * Body: { rating: 1..5, comment?: string }
 *
 * Lets the client (danışan) leave a star rating and a written comment for the
 * teller after the session ends. Dual-auth (mobile JWT or web session) so the
 * Flutter app and the web behave identically. One review per session (upsert).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const userId = mobileUser?.id || webSession?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const rating = parseInt(body.rating);
    const comment: string | null = typeof body.comment === 'string' && body.comment.trim().length > 0
      ? body.comment.trim().slice(0, 1000)
      : null;

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Geçerli bir puan (1-5) verin' }, { status: 400 });
    }

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { teller: { select: { id: true, userId: true, displayName: true } } },
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Only the client (danışan) of this session may rate the teller
    if (liveSession.userId !== userId) {
      return NextResponse.json({ error: 'Bu seansı yalnızca danışan değerlendirebilir' }, { status: 403 });
    }

    const existing = await prisma.liveTellerReview.findUnique({
      where: { sessionId: params.sessionId },
      select: { id: true },
    });

    const review = existing
      ? await prisma.liveTellerReview.update({
          where: { sessionId: params.sessionId },
          data: { rating, comment },
        })
      : await prisma.liveTellerReview.create({
          data: {
            tellerId: liveSession.tellerId,
            sessionId: params.sessionId,
            rating,
            comment,
          },
        });

    // Recompute teller's aggregate rating so the profile stays in sync
    try {
      const agg = await prisma.liveTellerReview.aggregate({
        where: { tellerId: liveSession.tellerId },
        _avg: { rating: true },
        _count: { id: true },
      });
      await prisma.liveFortuneTeller.update({
        where: { id: liveSession.tellerId },
        data: {
          rating: agg._avg.rating || 0,
          totalReviews: agg._count.id,
        },
      });
    } catch (aggErr) {
      console.error('Teller rating aggregate error:', aggErr);
    }

    // Notify the teller about the new review (only on first submission)
    if (!existing) {
      createNotificationWithPush({
        userId: liveSession.teller.userId,
        type: 'teller_review',
        title: 'Yeni Değerlendirme ⭐',
        message: `Bir danışan seansınıza ${rating} yıldız verdi.`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, review: { rating: review.rating, comment: review.comment } });
  } catch (error) {
    console.error('Submit review error:', error);
    return NextResponse.json({ error: 'Değerlendirme kaydedilemedi' }, { status: 500 });
  }
}
