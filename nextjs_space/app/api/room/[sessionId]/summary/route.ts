import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { authenticateRequest } from '@/lib/mobile-auth';
import prisma from '@/lib/db';
import { getCachedPlatformSetting } from '@/lib/cache';

export const dynamic = 'force-dynamic';

/**
 * GET /api/room/[sessionId]/summary
 *
 * End-of-session summary for a live fortune-teller session. Dual-auth (mobile
 * JWT or web session) so the Flutter app and the web share identical numbers.
 *
 * Returns, computed from the SAME LiveSession record both platforms use:
 *   - role            : 'teller' | 'user'
 *   - minutesUsed, creditsPerMinute
 *   - creditsCharged  : total jeton spent by the client ("harcanan jeton")
 *   - clientSpentTl   : monetary value of what the client spent ("ücret")
 *   - tellerEarnings  : jeton the teller earned after commission ("alınan jeton")
 *   - tellerEarningsTl: monetary value the teller earned ("ne kadar tutuyor")
 *   - commissionAmount, commissionRate, jetonTlRate
 *   - canReview       : whether the caller (client) may still rate/comment
 *   - review          : existing review (rating + comment) if any
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

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: {
        teller: {
          select: {
            id: true,
            displayName: true,
            userId: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
        user: { select: { id: true, name: true, image: true } },
        review: { select: { id: true, rating: true, comment: true, createdAt: true } },
      },
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isUser = liveSession.userId === userId;
    const isTeller = liveSession.teller.userId === userId;
    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    const commRateStr = await getCachedPlatformSetting('commission_rate', '20');
    const commissionRate = parseInt(commRateStr) || 20;
    const jetonTlRateStr = await getCachedPlatformSetting('jeton_tl_rate', '0.5');
    const jetonTlRate = parseFloat(jetonTlRateStr) || 0.5;

    const creditsCharged = liveSession.creditsCharged || 0;
    const commissionAmount = Math.floor(creditsCharged * commissionRate / 100);
    const tellerEarnings = creditsCharged - commissionAmount;
    const tellerEarningsTl = Math.round(tellerEarnings * jetonTlRate * 100) / 100;
    const clientSpentTl = Math.round(creditsCharged * jetonTlRate * 100) / 100;

    return NextResponse.json({
      sessionId: liveSession.id,
      status: liveSession.status,
      role: isTeller ? 'teller' : 'user',
      fortuneType: liveSession.fortuneType,
      minutesUsed: liveSession.minutesUsed,
      creditsPerMinute: liveSession.creditsPerMinute,
      creditsCharged,
      clientSpentTl,
      tellerEarnings,
      tellerEarningsTl,
      commissionAmount,
      commissionRate,
      jetonTlRate,
      teller: {
        id: liveSession.teller.id,
        displayName: liveSession.teller.displayName,
        image: liveSession.teller.user?.image || null,
      },
      user: {
        id: liveSession.user.id,
        name: liveSession.user.name,
        image: liveSession.user.image || null,
      },
      canReview: isUser && !liveSession.review,
      review: liveSession.review
        ? {
            rating: liveSession.review.rating,
            comment: liveSession.review.comment,
            createdAt: liveSession.review.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    console.error('Session summary error:', error);
    return NextResponse.json({ error: 'Özet alınamadı' }, { status: 500 });
  }
}
