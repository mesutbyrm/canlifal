export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { generateMobileTokens } from '@/lib/mobile-auth'
import { authLimiter } from '@/lib/rate-limiter'

/**
 * POST /api/auth/mobile-login
 * Body: { email, password }
 * Returns: { accessToken, refreshToken, user: { id, name, email, role, image, credits, jetonBalance, membership } }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { success: rateLimitOk } = authLimiter.check(`mobile-login:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })
    }

    const body = await req.json()
    const { email, username, password } = body
    const loginIdentifier = email || username

    if (!loginIdentifier || !password) {
      return NextResponse.json({ error: 'E-posta/kullanıcı adı ve şifre gereklidir' }, { status: 400 })
    }

    // Support login by email or username
    const user = await prisma.user.findFirst({
      where: loginIdentifier.includes('@')
        ? { email: loginIdentifier.toLowerCase().trim() }
        : { username: loginIdentifier.trim() },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        password: true,
        role: true,
        image: true,
        credits: true,
        jetonBalance: true,
        cfcBalance: true,
        membership: true,
        membershipExpiresAt: true,
        preferredLanguage: true,
        level: true,
        bio: true,
        phone: true,
        birthDate: true,
        zodiacSign: true,
        referralCode: true,
      },
    })

    if (!user || !user.password) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı' }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: 'E-posta veya şifre hatalı' }, { status: 401 })
    }

    // Generate JWT tokens
    const tokens = generateMobileTokens({ id: user.id, email: user.email, role: user.role })

    // Update last seen (fire and forget)
    prisma.sitePresence.upsert({
      where: { visitorId: user.id },
      update: { lastSeen: new Date() },
      create: { visitorId: user.id, lastSeen: new Date() },
    }).catch(() => {})

    return NextResponse.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        image: user.image,
        credits: user.credits,
        jetonBalance: user.jetonBalance,
        cfcBalance: user.cfcBalance ?? 0,
        membership: user.membership,
        membershipExpiresAt: user.membershipExpiresAt,
        preferredLanguage: user.preferredLanguage,
        level: user.level,
        bio: user.bio,
        phone: user.phone,
        birthDate: user.birthDate,
        zodiacSign: user.zodiacSign,
        referralCode: user.referralCode,
      },
    })
  } catch (error: any) {
    console.error('Mobile login error:', error)
    return NextResponse.json({ error: 'Giriş başarısız' }, { status: 500 })
  }
}
