export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { createNotificationWithPush } from '@/lib/notify'
import { getCachedPlatformSetting } from '@/lib/cache'

/**
 * Flutter-friendly session route without tellerId in URL.
 * POST /api/fortune-tellers/session  — body: { tellerId, fortuneType, duration }
 * GET  /api/fortune-tellers/session?sessionId=xxx — get session details
 */

export async function POST(request: NextRequest) {
  try {
    // Dual auth: mobile token or session
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || webSession?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { tellerId, fortuneType, duration = 10 } = body

    if (!tellerId) {
      return NextResponse.json({ error: 'tellerId gerekli' }, { status: 400 })
    }

    const teller = await prisma.liveFortuneTeller.findUnique({
      where: { id: tellerId }
    })

    if (!teller || !teller.isActive || !teller.isVerified) {
      return NextResponse.json({ error: 'Falcı müsait değil' }, { status: 400 })
    }

    const cpmStr = await getCachedPlatformSetting('credits_per_minute', '10')
    const creditsPerMinute = parseInt(cpmStr)
    const totalCost = duration * creditsPerMinute

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { jetonBalance: true, role: true, name: true, email: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const isStaff = user.role === 'admin' || user.role === 'yonetici'

    if (!isStaff && (user.jetonBalance ?? 0) < totalCost) {
      return NextResponse.json({ error: 'Yetersiz jeton bakiyesi' }, { status: 400 })
    }

    const txOps: any[] = [
      prisma.liveSession.create({
        data: {
          tellerId: teller.id,
          userId,
          fortuneType: fortuneType || 'general',
          creditsCharged: isStaff ? 0 : totalCost,
          maxMinutes: duration,
          creditsPerMinute,
          status: 'pending'
        }
      })
    ]
    if (!isStaff) {
      txOps.push(
        prisma.user.update({
          where: { id: userId },
          data: { jetonBalance: { decrement: totalCost } }
        })
      )
    }
    const [liveSession] = await prisma.$transaction(txOps)

    const fortuneTypeNames: Record<string, string> = {
      coffee: 'Kahve Falı',
      tarot: 'Tarot',
      astrology: 'Astroloji',
      palmistry: 'El Falı',
      numerology: 'Numeroloji',
      general: 'Genel Danışmanlık'
    }
    const ftName = fortuneTypeNames[fortuneType || 'general'] || fortuneTypeNames['general']

    await createNotificationWithPush({
      userId: teller.userId,
      type: 'session_request',
      title: 'Yeni Randevu Talebi',
      message: `${user.name || 'Bir kullanıcı'} sizden ${ftName} için ${duration} dakikalık randevu talep etti.`,
      fromUserId: userId,
      fromUserName: user.name || undefined,
      data: JSON.stringify({
        sessionId: liveSession.id,
        fortuneType: fortuneType || 'general',
        userName: user.name,
        creditsCharged: totalCost,
        duration
      })
    })

    return NextResponse.json({
      success: true,
      sessionId: liveSession.id,
      session: liveSession
    }, { status: 201 })
  } catch (error) {
    console.error('Fortune-tellers session POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || webSession?.user?.id

    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const sessionId = request.nextUrl.searchParams.get('sessionId')
    if (sessionId) {
      const liveSession = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: {
          teller: { select: { id: true, userId: true, displayName: true, specialties: true, avatar: true } },
          user: { select: { id: true, name: true, image: true } }
        }
      })
      if (!liveSession) return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 404 })
      if (liveSession.userId !== userId && liveSession.teller?.userId !== userId) {
        return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
      }
      return NextResponse.json(liveSession)
    }

    // Return user's sessions
    const sessions = await prisma.liveSession.findMany({
      where: { userId },
      include: {
        teller: { select: { id: true, displayName: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Fortune-tellers session GET error:', error)
    return NextResponse.json([])
  }
}
