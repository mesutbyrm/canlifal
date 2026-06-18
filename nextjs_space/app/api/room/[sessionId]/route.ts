import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { authenticateRequest } from '@/lib/mobile-auth';
import prisma from '@/lib/db';
import { createNotificationWithPush } from '@/lib/notify';
import { getCachedPlatformSetting } from '@/lib/cache';
import { emitRoomEvent, clearRoomEvents } from '@/lib/room-events';

export const dynamic = 'force-dynamic';

// Get room/session info
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
    const isUser = liveSession.userId === userId;
    const isTeller = liveSession.teller.userId === userId;

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
    }

    // Get credits per minute setting (cached)
    const creditsPerMinuteStr = await getCachedPlatformSetting('credits_per_minute', '10');
    const creditsPerMinute = parseInt(creditsPerMinuteStr);

    // Use the actual DB maxMinutes (allocated time, incremented by extend actions)
    const maxMinutes = liveSession.maxMinutes;

    // Calculate actual elapsed seconds from timerStartedAt
    let elapsedSeconds = 0;
    if (liveSession.timerStarted && liveSession.timerStartedAt) {
      const now = new Date();
      elapsedSeconds = Math.floor((now.getTime() - new Date(liveSession.timerStartedAt).getTime()) / 1000);
    }

    return NextResponse.json({
      ...liveSession,
      maxMinutes,
      creditsPerMinute,
      elapsedSeconds,
      isUser,
      isTeller,
      peerId: isUser ? liveSession.teller.userId : liveSession.userId,
      timerStarted: liveSession.timerStarted,
      timerStartedAt: liveSession.timerStartedAt
    });
  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Oda bilgisi alınamadı' }, { status: 500 });
  }
}

// Update room state (ping, extend time, end session)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request);
    const webSession = !mobileUser ? await getServerSession(authOptions) : null;
    const currentUserId = mobileUser?.id || webSession?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 });
    }

    const body = await request.json();
    const { action, minutes } = body;

    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: { teller: true, user: { select: { id: true, name: true, email: true, image: true, role: true, jetonBalance: true, credits: true, membership: true } } }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const isUser = liveSession.userId === currentUserId;
    const isTeller = liveSession.teller.userId === currentUserId;
    const sessionUserIsStaff = liveSession.user.role === 'admin' || liveSession.user.role === 'yonetici';

    if (!isUser && !isTeller) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 });
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

        // Emit SSE event
        emitRoomEvent(params.sessionId, 'timer_started', { timerStartedAt: now.toISOString() });

        return NextResponse.json({ timerStarted: true, timerStartedAt: now });
      }

      case 'teller_add_time': {
        // Teller adds time - deduct from user's jetons
        if (!isTeller) {
          return NextResponse.json({ error: 'Only teller can add time' }, { status: 403 });
        }

        const addMinutes = minutes || 5;
        
        // Get credits per minute (cached)
        const cpmStr = await getCachedPlatformSetting('credits_per_minute', '10');
        const creditsPerMinute = parseInt(cpmStr);
        const jetonsNeeded = addMinutes * creditsPerMinute;

        // Check user jetons
        const currentUser = await prisma.user.findUnique({
          where: { id: liveSession.userId },
          select: { jetonBalance: true, role: true }
        });
        const addUserIsStaff = currentUser?.role === 'admin' || currentUser?.role === 'yonetici';

        if (!currentUser || (!addUserIsStaff && (currentUser.jetonBalance ?? 0) < jetonsNeeded)) {
          return NextResponse.json({ error: 'Kullanıcının yeterli jetonu yok' }, { status: 400 });
        }

        // Deduct jetons and add time (staff skip deduction)
        const addTimeTx: any[] = [
          prisma.liveSession.update({
            where: { id: params.sessionId },
            data: {
              maxMinutes: { increment: addMinutes },
              creditsCharged: addUserIsStaff ? undefined : { increment: jetonsNeeded }
            }
          })
        ];
        if (!addUserIsStaff) {
          addTimeTx.unshift(
            prisma.user.update({
              where: { id: liveSession.userId },
              data: { jetonBalance: { decrement: jetonsNeeded } }
            })
          );
        }
        await prisma.$transaction(addTimeTx);

        // Emit SSE event
        emitRoomEvent(params.sessionId, 'time_extended', {
          addedMinutes: addMinutes,
          newMaxMinutes: liveSession.maxMinutes + addMinutes,
          by: 'teller'
        });

        return NextResponse.json({ 
          added: addMinutes, 
          jetonsUsed: addUserIsStaff ? 0 : jetonsNeeded,
          newMaxMinutes: liveSession.maxMinutes + addMinutes,
          userJetonsRemaining: addUserIsStaff ? (currentUser.jetonBalance ?? 0) : (currentUser.jetonBalance ?? 0) - jetonsNeeded
        });
      }

      case 'extend': {
        // Only user can extend the session
        if (!isUser) {
          return NextResponse.json({ error: 'Only user can extend session' }, { status: 403 });
        }

        const extendMinutes = minutes || 5;
        
        // Use session's creditsPerMinute (jeton cost per minute)
        const sessionRate = liveSession.creditsPerMinute || 10;
        const jetonsNeeded = extendMinutes * sessionRate;

        // Get latest user jeton balance
        const extUser = await prisma.user.findUnique({
          where: { id: liveSession.userId },
          select: { jetonBalance: true, role: true }
        });
        const extUserIsStaff = extUser?.role === 'admin' || extUser?.role === 'yonetici';

        if (!extUser || (!extUserIsStaff && (extUser.jetonBalance ?? 0) < jetonsNeeded)) {
          return NextResponse.json({ error: 'Yetersiz jeton' }, { status: 400 });
        }

        // Deduct jetons and extend time (staff skip deduction)
        const extTx: any[] = [
          prisma.liveSession.update({
            where: { id: params.sessionId },
            data: {
              maxMinutes: { increment: extendMinutes },
              creditsCharged: extUserIsStaff ? undefined : { increment: jetonsNeeded }
            }
          })
        ];
        if (!extUserIsStaff) {
          extTx.unshift(
            prisma.user.update({
              where: { id: liveSession.userId },
              data: { jetonBalance: { decrement: jetonsNeeded } }
            })
          );
        }
        await prisma.$transaction(extTx);

        // Emit SSE event
        emitRoomEvent(params.sessionId, 'time_extended', {
          addedMinutes: extendMinutes,
          newMaxMinutes: liveSession.maxMinutes + extendMinutes,
          by: 'user'
        });

        return NextResponse.json({ 
          extended: extendMinutes, 
          jetonsUsed: extUserIsStaff ? 0 : jetonsNeeded,
          jetonsRemaining: extUserIsStaff ? (extUser.jetonBalance ?? 0) : (extUser.jetonBalance ?? 0) - jetonsNeeded,
          newMaxMinutes: liveSession.maxMinutes + extendMinutes
        });
      }

      case 'end': {
        const now = new Date();
        
        // Calculate actual minutes used
        let actualMinutesUsed = liveSession.minutesUsed;
        if (liveSession.timerStarted && liveSession.timerStartedAt) {
          const elapsedMs = now.getTime() - new Date(liveSession.timerStartedAt).getTime();
          actualMinutesUsed = Math.ceil(elapsedMs / 60000); // Round up to nearest minute
        }
        
        // Cap at maxMinutes
        actualMinutesUsed = Math.min(actualMinutesUsed, liveSession.maxMinutes);
        
        // Calculate actual cost based on minutes used
        const sessionRate = liveSession.creditsPerMinute || 10;
        const actualCost = actualMinutesUsed * sessionRate;
        const totalCharged = liveSession.creditsCharged;
        const refundAmount = Math.max(0, totalCharged - actualCost);

        // End the session with actual usage data
        await prisma.liveSession.update({
          where: { id: params.sessionId },
          data: {
            status: 'completed',
            endedAt: now,
            minutesUsed: actualMinutesUsed,
            creditsCharged: actualCost
          }
        });

        // Close chat session
        await prisma.tellerChatSession.updateMany({
          where: { liveSessionId: params.sessionId },
          data: { status: 'closed', closedAt: now }
        });

        // Refund unused jetons to user
        if (refundAmount > 0) {
          await prisma.user.update({
            where: { id: liveSession.userId },
            data: { jetonBalance: { increment: refundAmount } }
          });
        }

        // Get commission rate (cached)
        const commRateStr = await getCachedPlatformSetting('commission_rate', '20');
        const commissionRate = parseInt(commRateStr);
        const commissionAmount = Math.floor(actualCost * commissionRate / 100);
        const tellerEarnings = actualCost - commissionAmount;

        // Update teller earnings
        await prisma.liveFortuneTeller.update({
          where: { id: liveSession.tellerId },
          data: {
            totalSessions: { increment: 1 },
            totalEarnings: { increment: tellerEarnings }
          }
        });

        // Notification to the other party
        if (isTeller) {
          // Teller ended: notify user with refund info
          const refundMsg = refundAmount > 0
            ? `Görüşme ${actualMinutesUsed} dakika sürdü. ${refundAmount} jeton hesabınıza iade edildi.`
            : `Görüşme ${actualMinutesUsed} dakika sürdü. Toplam ${actualCost} jeton kullanıldı.`;
          
          await createNotificationWithPush({
            userId: liveSession.userId,
            type: 'session_ended',
            title: refundAmount > 0 ? '💰 Seans Sona Erdi - Jeton İadesi' : 'Seans Sona Erdi',
            message: refundMsg
          });
        } else {
          // User ended: notify teller
          await createNotificationWithPush({
            userId: liveSession.teller.userId,
            type: 'session_ended',
            title: 'Seans Sona Erdi',
            message: `Canlı fal seansı tamamlandı. ${actualMinutesUsed} dakika sürdü.`
          });
        }

        // Emit SSE event & cleanup
        emitRoomEvent(params.sessionId, 'session_ended', {
          actualMinutesUsed,
          actualCost,
          refundAmount,
          endedBy: isTeller ? 'teller' : 'user'
        });
        // Clear event buffer after a short delay to let SSE deliver
        setTimeout(() => clearRoomEvents(params.sessionId), 10000);

        return NextResponse.json({ 
          ended: true, 
          actualMinutesUsed, 
          actualCost, 
          refundAmount,
          endedBy: isTeller ? 'teller' : 'user'
        });
      }

      default:
        return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
    }
  } catch (error) {
    console.error('Room action error:', error);
    return NextResponse.json({ error: 'Oda güncellenemedi' }, { status: 500 });
  }
}
