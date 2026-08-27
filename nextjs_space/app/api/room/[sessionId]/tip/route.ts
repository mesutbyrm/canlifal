import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';
import { processAgencyCommission } from '@/lib/agency-commission';
import { getCachedPlatformSetting } from '@/lib/cache';
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger';
import { recordContribution } from '@/lib/supporter-level';
import { recordTeamPoints } from '@/lib/team-points';
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency';

export const dynamic = 'force-dynamic';

// Send a tip to the teller during live session
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  let idemRecord: string | null = null;
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const { amount } = await request.json();
    
    // Validate amount
    const validAmounts = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500];
    if (!validAmounts.includes(amount)) {
      return NextResponse.json({ error: 'Geçersiz bahşiş miktarı' }, { status: 400 });
    }

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { 
        teller: { include: { user: { select: { id: true, name: true } } } },
        user: { select: { id: true, name: true, jetonBalance: true } }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Seans bulunamadı' }, { status: 404 });
    }

    // Only user (fal baktıran) can tip
    if (liveSession.userId !== authUser.id) {
      return NextResponse.json({ error: 'Sadece kullanıcı bahşiş verebilir' }, { status: 403 });
    }

    // Check if tipper is staff
    const tipperUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { role: true }
    });
    const tipperIsStaff = tipperUser?.role === 'yonetici';

    // Check jeton balance (staff skip)
    if (!tipperIsStaff && (liveSession.user.jetonBalance ?? 0) < amount) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 });
    }

    // Get commission rate (cached)
    const commRateStr = await getCachedPlatformSetting('commission_rate', '20');
    const commissionRate = parseInt(commRateStr);
    const commissionAmount = Math.floor(amount * commissionRate / 100);
    const tellerEarnings = amount - commissionAmount;

    // Process agency commission if teller's user is in an agency (staff skip financial)
    if (!tipperIsStaff && tellerEarnings > 0) {
      processAgencyCommission({
        userId: liveSession.teller.userId || '',
        earnedAmount: tellerEarnings,
        sourceType: 'tip',
        sourceId: params.sessionId,
      }).catch(err => console.error('[Tip] Agency commission error:', err));
    }

    // Idempotency: reserved after validation
    const idem = await beginIdempotent(request, 'tip', authUser.id);
    if (idem.response) return idem.response;
    idemRecord = idem.record;

    // Transaction: deduct jetons, add to teller earnings, create system messages
    const tipTx: any[] = [
      // Create tip message for teller (shows popup on teller's screen)
      prisma.liveSessionMessage.create({
        data: {
          sessionId: params.sessionId,
          senderId: 'system',
          message: `[TIP:${amount}:${liveSession.user.name || 'Kullanıcı'}]`
        }
      }),
      // Create thank you message for user (shows popup on user's screen)
      prisma.liveSessionMessage.create({
        data: {
          sessionId: params.sessionId,
          senderId: 'system',
          message: `[TIP_THANKS:${amount}:${liveSession.teller.user.name || 'Falcı'}]`
        }
      })
    ];
    if (!tipperIsStaff) {
      tipTx.unshift(
        prisma.user.update({
          where: { id: liveSession.userId },
          data: { jetonBalance: { decrement: amount } }
        }),
        prisma.liveFortuneTeller.update({
          where: { id: liveSession.tellerId },
          data: { totalEarnings: { increment: tellerEarnings } }
        })
      );
    }
    await prisma.$transaction(tipTx);

    // ── Immutable ledger (fire-and-forget) ──
    if (!tipperIsStaff) {
      const legs: LedgerLeg[] = [
        {
          accountType: 'user_jeton',
          accountId: liveSession.userId,
          direction: 'debit',
          amount,
          balanceBefore: liveSession.user.jetonBalance ?? 0,
          balanceAfter: (liveSession.user.jetonBalance ?? 0) - amount,
        },
      ];
      if (tellerEarnings > 0) {
        legs.push({
          accountType: 'teller_earning',
          accountId: liveSession.tellerId,
          direction: 'credit',
          amount: tellerEarnings,
        });
      }
      if (commissionAmount > 0) {
        legs.push({
          accountType: 'platform_jeton',
          accountId: 'platform',
          direction: 'credit',
          amount: commissionAmount,
        });
      }
      recordMultiLeg({
        legs,
        category: 'tip',
        currency: 'jeton',
        description: `Fal seansı bahşişi`,
        referenceType: 'LiveSession',
        referenceId: params.sessionId,
        actorId: authUser.id,
        metadata: { tellerId: liveSession.tellerId, commissionRate },
      }).catch((e) => console.error('[Ledger][tip]', e));
      recordContribution(authUser.id, liveSession.tellerId, amount).catch(() => {});
      recordTeamPoints(authUser.id, amount).catch(() => {});
    }

    // Get updated balance
    const updatedUser = await prisma.user.findUnique({
      where: { id: liveSession.userId },
      select: { jetonBalance: true }
    });

    const responseBody = { success: true, amount, jetonsRemaining: updatedUser?.jetonBalance ?? 0 };
    completeIdempotent(idemRecord, 200, responseBody).catch(() => {});
    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Tip error:', error);
    releaseIdempotent(idemRecord).catch(() => {});
    return NextResponse.json({ error: 'Bahşiş gönderilemedi' }, { status: 500 });
  }
}
