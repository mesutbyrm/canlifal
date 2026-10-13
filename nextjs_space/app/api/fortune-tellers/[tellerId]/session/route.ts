import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { authenticateRequest } from '@/lib/mobile-auth';
import { createNotificationWithPush } from '@/lib/notify';
import { getCachedPlatformSetting } from '@/lib/cache';
import { emitTellerEvent } from '@/lib/room-events';

export const dynamic = 'force-dynamic';

// Request a session with a fortune teller
export async function POST(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { fortuneType } = body;
    // Sözleşme `maxMinutes` der (mobil); web `duration` gönderir. Varsayılan 10 dk.
    const rawDuration = Number(body.maxMinutes ?? body.duration ?? 10);
    const duration = Number.isFinite(rawDuration)
      ? Math.min(60, Math.max(1, Math.round(rawDuration)))
      : 10;

    // Get teller
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId }
    });

    if (!teller || !teller.isActive || !teller.isVerified) {
      return NextResponse.json({ error: 'Teller not available' }, { status: 400 });
    }

    // Get credits per minute from platform settings (cached)
    const cpmStr = await getCachedPlatformSetting('credits_per_minute', '10');
    const creditsPerMinute = parseInt(cpmStr);
    
    // Calculate total cost based on duration
    const totalCost = duration * creditsPerMinute;

    // Check user jeton balance (live sessions require jetons)
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { jetonBalance: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 });
    }

    // Sahte/gerçek jeton seçimi: sahte ödemede falcıya kazanç yazılmaz.
    const spendPlan = await resolveJetonSpend(authUser.id, totalCost, parseJetonSource(body?.jetonSource));
    const isStaff = spendPlan.skipDeduction;
    const chargeCounts = spendPlan.countsAsFinance;

    if (!isStaff && (spendPlan.source === 'fake' ? spendPlan.fakeBalance : (user.jetonBalance ?? 0)) < totalCost) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 });
    }

    // Get user info for notification
    const fullUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { name: true, email: true }
    });

    // Create session with duration and deduct credits (staff skip deduction)
    const txOps: any[] = [
      prisma.liveSession.create({
        data: {
          tellerId: teller.id,
          userId: authUser.id,
          fortuneType: fortuneType || 'general',
          creditsCharged: chargeCounts ? totalCost : 0,
          maxMinutes: duration,
          creditsPerMinute: creditsPerMinute,
          status: 'pending'
        }
      })
    ];
    if (!isStaff) {
      txOps.push(
        atomicDebitJeton(prisma, authUser.id, totalCost, spendPlan.source)
      );
    }
    const [liveSession] = await prisma.$transaction(txOps);

    // Send notification to the fortune teller
    const fortuneTypeNames: Record<string, string> = {
      coffee: 'Kahve Falı',
      tarot: 'Tarot',
      astrology: 'Astroloji',
      palmistry: 'El Falı',
      numerology: 'Numeroloji',
      general: 'Genel Danışmanlık'
    };

    const ftName = fortuneTypeNames[fortuneType || 'general'] || fortuneTypeNames['general'];
    
    // Falcının SSE akışına anında düşür (bildirim/push'u beklemeden).
    emitTellerEvent(teller.id, 'session_request', {
      sessionId: liveSession.id,
      userId: authUser.id,
      userName: fullUser?.name,
      fortuneType: fortuneType || 'general',
      duration,
      creditsCharged: isStaff ? 0 : totalCost,
      createdAt: liveSession.createdAt
    });

    void createNotificationWithPush({
      userId: teller.userId,
      type: 'session_request',
      title: 'Yeni Randevu Talebi',
      message: `${fullUser?.name || 'Bir kullanıcı'} sizden ${ftName} için ${duration} dakikalık randevu talep etti.`,
      fromUserId: authUser.id,
      fromUserName: fullUser?.name || undefined,
      data: JSON.stringify({
        sessionId: liveSession.id,
        fortuneType: fortuneType || 'general',
        userName: fullUser?.name,
        creditsCharged: totalCost,
        duration: duration
      })
    }).catch((e) => console.error('[tellerId/session] notify error:', e));

    return NextResponse.json({ 
      success: true, 
      sessionId: liveSession.id,
      session: liveSession 
    }, { status: 201 });
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Create session error:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

// Get sessions for this teller (for teller's dashboard)
export async function GET(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const authUser = await authenticateRequest(request)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    // Verify ownership
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId }
    });

    if (!teller || teller.userId !== authUser.id) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    const sessions = await prisma.liveSession.findMany({
      where: { tellerId: params.tellerId },
      include: {
        user: { select: { name: true, image: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json(sessions);
  } catch (error) {
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json({ error: 'Yetersiz bakiye', code: 'INSUFFICIENT_BALANCE' }, { status: 400 })
    }
    console.error('Get sessions error:', error);
    return NextResponse.json([]);
  }
}