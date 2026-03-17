import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Update session status (accept, complete, cancel)
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
    const { action } = body;

    if (!['accept', 'complete', 'cancel', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the session
    const liveSession = await prisma.liveSession.findUnique({
      where: { id: params.sessionId },
      include: {
        teller: true,
        user: { select: { id: true, name: true, credits: true } }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify the current user owns this teller profile
    if (liveSession.teller.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let updateData: Record<string, unknown> = {};
    let notificationMessage = '';

    switch (action) {
      case 'accept':
        if (liveSession.status !== 'pending') {
          return NextResponse.json({ error: 'Session is not pending' }, { status: 400 });
        }
        
        // Get session duration settings
        const durationSetting = await prisma.platformSettings.findUnique({
          where: { key: 'session_duration_minutes' }
        });
        const defaultDuration = durationSetting ? parseInt(durationSetting.value) : 5;
        
        // Get credits per minute
        const creditsPerMinuteSetting = await prisma.platformSettings.findUnique({
          where: { key: 'credits_per_minute' }
        });
        const creditsPerMinute = creditsPerMinuteSetting ? parseInt(creditsPerMinuteSetting.value) : 10;
        
        // Generate unique room ID
        const roomId = `room_${liveSession.id}_${Date.now()}`;
        
        updateData = {
          status: 'active',
          startedAt: new Date(),
          roomId,
          maxMinutes: defaultDuration,
          creditsPerMinute,
          lastPingAt: new Date()
        };
        
        // Create chat session for this live session
        await prisma.tellerChatSession.create({
          data: {
            liveSessionId: liveSession.id,
            userId: liveSession.userId,
            tellerId: liveSession.tellerId,
            status: 'active'
          }
        });
        
        notificationMessage = `${liveSession.teller.displayName} randevu talebinizi kabul etti! Canlı sohbet odasına girin.`;
        break;

      case 'complete':
        if (liveSession.status !== 'active') {
          return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
        }
        updateData = {
          status: 'completed',
          endedAt: new Date()
        };
        
        // Get commission rate from settings
        const commissionSetting = await prisma.platformSettings.findUnique({
          where: { key: 'commission_rate' }
        });
        const commissionRate = commissionSetting ? parseInt(commissionSetting.value) : 20;
        const commissionAmount = Math.floor(liveSession.creditsCharged * commissionRate / 100);
        const tellerEarnings = liveSession.creditsCharged - commissionAmount;
        
        // Update teller's total sessions and earnings (after commission)
        await prisma.liveFortuneTeller.update({
          where: { id: liveSession.tellerId },
          data: {
            totalSessions: { increment: 1 },
            totalEarnings: { increment: tellerEarnings }
          }
        });
        
        // Close chat session
        await prisma.tellerChatSession.updateMany({
          where: { liveSessionId: liveSession.id },
          data: { status: 'closed', closedAt: new Date() }
        });
        
        notificationMessage = `${liveSession.teller.displayName} ile seansınız tamamlandı. Değerlendirmenizi bekliyoruz!`;
        break;

      case 'cancel':
      case 'reject':
        if (liveSession.status === 'completed') {
          return NextResponse.json({ error: 'Cannot cancel completed session' }, { status: 400 });
        }
        updateData = {
          status: 'cancelled',
          endedAt: new Date()
        };
        
        // Refund jetons to user
        await prisma.user.update({
          where: { id: liveSession.userId },
          data: { jetonBalance: { increment: liveSession.creditsCharged } }
        });
        
        notificationMessage = action === 'reject'
          ? `${liveSession.teller.displayName} randevu talebinizi reddetti. Jetonlarınız iade edildi.`
          : `${liveSession.teller.displayName} randevu talebinizi iptal etti. Jetonlarınız iade edildi.`;
        break;
    }

    // Update the session
    const updatedSession = await prisma.liveSession.update({
      where: { id: params.sessionId },
      data: updateData
    });

    // Send notification to the user
    await prisma.notification.create({
      data: {
        userId: liveSession.userId,
        type: 'session_update',
        title: action === 'accept' ? 'Randevu Kabul Edildi' 
             : action === 'complete' ? 'Seans Tamamlandı'
             : action === 'reject' ? 'Randevu Reddedildi'
             : 'Randevu İptal Edildi',
        message: notificationMessage,
        fromUserId: session.user.id,
        fromUserName: liveSession.teller.displayName,
        data: JSON.stringify({
          sessionId: liveSession.id,
          tellerId: liveSession.tellerId,
          action
        })
      }
    });

    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error('Session action error:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}
