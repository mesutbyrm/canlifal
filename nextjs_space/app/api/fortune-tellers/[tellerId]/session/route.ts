import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

// Request a session with a fortune teller
export async function POST(
  request: NextRequest,
  { params }: { params: { tellerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Get credits per minute from platform settings
    const creditsPerMinuteSetting = await prisma.platformSettings.findUnique({
      where: { key: 'credits_per_minute' }
    });
    const creditsPerMinute = creditsPerMinuteSetting ? parseInt(creditsPerMinuteSetting.value) : 10;
    
    // Calculate total cost based on duration
    const totalCost = duration * creditsPerMinute;

    // Check user credits
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { credits: true }
    });

    if (!user || user.credits < totalCost) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
    }

    // Get user info for notification
    const fullUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true }
    });

    // Create session with duration and deduct credits
    const [liveSession] = await prisma.$transaction([
      prisma.liveSession.create({
        data: {
          tellerId: teller.id,
          userId: session.user.id,
          fortuneType: fortuneType || 'general',
          creditsCharged: totalCost,
          maxMinutes: duration,
          creditsPerMinute: creditsPerMinute,
          status: 'pending'
        }
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { credits: { decrement: totalCost } }
      })
    ]);

    // Send notification to the fortune teller
    const fortuneTypeNames: Record<string, { tr: string; en: string }> = {
      coffee: { tr: 'Kahve Falı', en: 'Coffee Reading' },
      tarot: { tr: 'Tarot', en: 'Tarot Reading' },
      astrology: { tr: 'Astroloji', en: 'Astrology' },
      palmistry: { tr: 'El Falı', en: 'Palm Reading' },
      numerology: { tr: 'Numeroloji', en: 'Numerology' },
      general: { tr: 'Genel Danışmanlık', en: 'General Consultation' }
    };

    const ftName = fortuneTypeNames[fortuneType || 'general'] || fortuneTypeNames.general;
    
    await prisma.notification.create({
      data: {
        userId: teller.userId,
        type: 'session_request',
        title: 'Yeni Randevu Talebi / New Session Request',
        message: `${fullUser?.name || 'Bir kullanıcı'} sizden ${ftName.tr} için ${duration} dakikalık randevu talep etti. / ${fullUser?.name || 'A user'} requested a ${duration} minute ${ftName.en} session with you.`,
        data: JSON.stringify({
          sessionId: liveSession.id,
          fortuneType: fortuneType || 'general',
          userName: fullUser?.name,
          creditsCharged: totalCost,
          duration: duration
        })
      }
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify ownership
    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: params.tellerId }
    });

    if (!teller || teller.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
