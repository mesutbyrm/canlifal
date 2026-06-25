import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth';
import { createNotificationWithPush } from '@/lib/notify';
import { getCachedPlatformSetting } from '@/lib/cache';

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
    const { fortuneType, duration = 10 } = body; // Default 10 minutes

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

    const isStaff = user.role === 'admin' || user.role === 'yonetici';

    if (!isStaff && (user.jetonBalance ?? 0) < totalCost) {
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
          creditsCharged: isStaff ? 0 : totalCost,
          maxMinutes: duration,
          creditsPerMinute: creditsPerMinute,
          status: 'pending'
        }
      })
    ];
    if (!isStaff) {
      txOps.push(
        prisma.user.update({
          where: { id: authUser.id },
          data: { jetonBalance: { decrement: totalCost } }
        })
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
    
    await createNotificationWithPush({
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
    });

    return NextResponse.json({ 
      success: true, 
      sessionId: liveSession.id,
      session: liveSession 
    }, { status: 201 });
  } catch (error) {
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
    console.error('Get sessions error:', error);
    return NextResponse.json([]);
  }
}