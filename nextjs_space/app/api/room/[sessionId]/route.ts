import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get room/session info
export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: {
        teller: {
          include: {
            user: {
              select: { id: true, name: true, image: true }
            }
          }
        },
        user: {
          select: { id: true, name: true, image: true, jetonBalance: true, membership: true }
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is part of this session
    const isUser = liveSession.userId === session.user.id;
    const isTeller = liveSession.teller.userId === session.user.id;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get session duration settings
    const durationSetting = await prisma.platformSettings.findUnique({
      where: { key: 'session_duration_minutes' }
    });
    const defaultDuration = durationSetting ? parseInt(durationSetting.value) : 5;

    // Get credits per minute setting
    const creditsPerMinuteSetting = await prisma.platformSettings.findUnique({
      where: { key: 'credits_per_minute' }
    });
    const creditsPerMinute = creditsPerMinuteSetting ? parseInt(creditsPerMinuteSetting.value) : 10;

    // Calculate max minutes based on user's membership and jetons
    let maxMinutes = defaultDuration;
    if (isUser) {
      const userJetons = liveSession.user.jetonBalance ?? 0;
      const membership = liveSession.user.membership;
      
      // Membership bonuses
      if (membership === 'gold') {
        maxMinutes = defaultDuration + 10; // Gold gets +10 minutes
      } else if (membership === 'premium') {
        maxMinutes = defaultDuration + 5; // Premium gets +5 minutes
      }
      
      // Can extend with jetons
      const extraMinutesFromJetons = Math.floor(userJetons / creditsPerMinute);
      // Allow unlimited extension based on jetons
      maxMinutes += extraMinutesFromJetons;
    }

    return NextResponse.json({
      ...liveSession,
      maxMinutes,
      creditsPerMinute,
      isUser,
      isTeller,
      peerId: isUser ? liveSession.teller.userId : liveSession.userId,
      timerStarted: liveSession.timerStarted,
      timerStartedAt: liveSession.timerStartedAt
    });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Failed to get room' }, { status: 500 });
  }
}

// Update room state (ping, extend time, end session)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, minutes } = body;

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { teller: true, user: true }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isUser = liveSession.userId === session.user.id;
    const isTeller = liveSession.teller.userId === session.user.id;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    switch (action) {
      case 'ping': {
        // Only count time if timer has been started by teller
        if (!liveSession.timerStarted) {
          return NextResponse.json({ minutesUsed: 0, timerStarted: false });
        }

        // Update last ping and increment minutes used every minute
        const now = new Date();
        const lastPing = liveSession.lastPingAt || liveSession.timerStartedAt;
        let newMinutesUsed = liveSession.minutesUsed;
        
        if (lastPing) {
          const diffMs = now.getTime() - lastPing.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);
          if (diffMinutes >= 1) {
            newMinutesUsed += diffMinutes;
          }
        }

        await prisma.liveSession.update({
          where: { id: params.sessionId },
          data: {
            lastPingAt: now,
            minutesUsed: newMinutesUsed
          }
        });

        return NextResponse.json({ minutesUsed: newMinutesUsed, timerStarted: true });
      }

      case 'start_timer': {
        // Only teller can start the timer
        if (!isTeller) {
          return NextResponse.json({ error: 'Only teller can start timer' }, { status: 403 });
        }

        const now = new Date();
        await prisma.liveSession.update({
          where: { id: params.sessionId },
          data: {
            timerStarted: true,
            timerStartedAt: now,
            lastPingAt: now
          }
        });

        return NextResponse.json({ timerStarted: true, timerStartedAt: now });
      }

      case 'teller_add_time': {
        // Teller adds time - deduct from user's jetons
        if (!isTeller) {
          return NextResponse.json({ error: 'Only teller can add time' }, { status: 403 });
        }

        const addMinutes = minutes || 5;
        
        // Get credits per minute (jeton cost per minute)
        const creditsPerMinuteSetting = await prisma.platformSettings.findUnique({
          where: { key: 'credits_per_minute' }
        });
        const creditsPerMinute = creditsPerMinuteSetting ? parseInt(creditsPerMinuteSetting.value) : 10;
        const jetonsNeeded = addMinutes * creditsPerMinute;

        // Check user jetons
        const currentUser = await prisma.user.findUnique({
          where: { id: liveSession.userId },
          select: { jetonBalance: true }
        });

        if (!currentUser || (currentUser.jetonBalance ?? 0) < jetonsNeeded) {
          return NextResponse.json({ error: 'Kullanıcının yeterli jetonu yok' }, { status: 400 });
        }

        // Deduct jetons and add time
        await prisma.$transaction([
          prisma.user.update({
            where: { id: liveSession.userId },
            data: { jetonBalance: { decrement: jetonsNeeded } }
          }),
          prisma.liveSession.update({
            where: { id: params.sessionId },
            data: {
              maxMinutes: { increment: addMinutes },
              creditsCharged: { increment: jetonsNeeded }
            }
          })
        ]);

        return NextResponse.json({ 
          added: addMinutes, 
          jetonsUsed: jetonsNeeded,
          newMaxMinutes: liveSession.maxMinutes + addMinutes,
          userJetonsRemaining: (currentUser.jetonBalance ?? 0) - jetonsNeeded
        });
      }

      case 'extend': {
        // Only user can extend the session
        if (!isUser) {
          return NextResponse.json({ error: 'Only user can extend session' }, { status: 403 });
        }

        const extendMinutes = minutes || 5;
        
        // Fixed pricing: 10 jetons per minute
        // 5dk=50, 10dk=100, 15dk=150, 20dk=200, 25dk=250, 30dk=300
        const PRICE_PER_MINUTE = 10;
        const jetonsNeeded = extendMinutes * PRICE_PER_MINUTE;

        // Get latest user jeton balance
        const currentUser = await prisma.user.findUnique({
          where: { id: liveSession.userId },
          select: { jetonBalance: true }
        });

        if (!currentUser || (currentUser.jetonBalance ?? 0) < jetonsNeeded) {
          return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 });
        }

        // Deduct jetons and extend time
        await prisma.$transaction([
          prisma.user.update({
            where: { id: liveSession.userId },
            data: { jetonBalance: { decrement: jetonsNeeded } }
          }),
          prisma.liveSession.update({
            where: { id: params.sessionId },
            data: {
              maxMinutes: { increment: extendMinutes },
              creditsCharged: { increment: jetonsNeeded }
            }
          })
        ]);

        return NextResponse.json({ 
          extended: extendMinutes, 
          jetonsUsed: jetonsNeeded,
          jetonsRemaining: (currentUser.jetonBalance ?? 0) - jetonsNeeded,
          newMaxMinutes: liveSession.maxMinutes + extendMinutes
        });
      }

      case 'end': {
        // End the session
        await prisma.liveSession.update({
          where: { id: params.sessionId },
          data: {
            status: 'completed',
            endedAt: new Date()
          }
        });

        // Close chat session
        await prisma.tellerChatSession.updateMany({
          where: { liveSessionId: params.sessionId },
          data: { status: 'closed', closedAt: new Date() }
        });

        // Get commission rate
        const commissionSetting = await prisma.platformSettings.findUnique({
          where: { key: 'commission_rate' }
        });
        const commissionRate = commissionSetting ? parseInt(commissionSetting.value) : 20;
        const commissionAmount = Math.floor(liveSession.creditsCharged * commissionRate / 100);
        const tellerEarnings = liveSession.creditsCharged - commissionAmount;

        // Update teller earnings
        await prisma.liveFortuneTeller.update({
          where: { id: liveSession.tellerId },
          data: {
            totalSessions: { increment: 1 },
            totalEarnings: { increment: tellerEarnings }
          }
        });

        // Send notification
        await prisma.notification.create({
          data: {
            userId: isUser ? liveSession.teller.userId : liveSession.userId,
            type: 'session_ended',
            title: 'Seans Sona Erdi',
            message: 'Canlı fal seansı tamamlandı.'
          }
        });

        return NextResponse.json({ ended: true });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Room action error:', error);
    return NextResponse.json({ error: 'Failed to update room' }, { status: 500 });
  }
}
