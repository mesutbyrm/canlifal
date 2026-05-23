export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { OAuth2Client } from 'google-auth-library'
import prisma from '@/lib/db'
import { generateMobileTokens } from '@/lib/mobile-auth'
import { authLimiter } from '@/lib/rate-limiter'
import { randomBytes } from 'crypto'
import { logActivity } from '@/lib/activity-logger'
import { getCachedPlatformSetting } from '@/lib/cache'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

/**
 * POST /api/auth/mobile-google
 * Body: { idToken, referralCode? }
 * 
 * Flutter sends the Google ID token obtained from google_sign_in plugin.
 * The server verifies it, creates or links the user, and returns JWT tokens.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { success: rateLimitOk } = authLimiter.check(`mobile-google:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })
    }

    const body = await req.json()
    const { idToken, referralCode } = body

    if (!idToken) {
      return NextResponse.json({ error: 'Google ID token gerekli' }, { status: 400 })
    }

    // Verify the Google ID token
    let ticket
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      })
    } catch (e) {
      console.error('Google ID token verification failed:', e)
      return NextResponse.json({ error: 'Geçersiz Google token' }, { status: 401 })
    }

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return NextResponse.json({ error: 'Google hesabından e-posta alınamadı' }, { status: 400 })
    }

    const { email, name, picture, sub: googleId } = payload
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user exists with this email
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
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

    let isNewUser = false

    if (!user) {
      // Create new user
      isNewUser = true

      let newReferralCode = generateReferralCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await prisma.user.findUnique({ where: { referralCode: newReferralCode } })
        if (!existing) break
        newReferralCode = generateReferralCode()
        attempts++
      }

      // Generate username from email
      let baseUsername = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20)
      let finalUsername = baseUsername
      let usernameAttempt = 0
      while (usernameAttempt < 10) {
        const existingU = await prisma.user.findUnique({ where: { username: finalUsername } })
        if (!existingU) break
        finalUsername = `${baseUsername}${Math.floor(Math.random() * 9999)}`
        usernameAttempt++
      }

      const welcomeCreditsStr = await getCachedPlatformSetting('welcome_credits', '50')
      const welcomeCredits = parseInt(welcomeCreditsStr) || 50

      // Handle referral
      let referrerId: string | null = null
      let referralBonus = 0
      if (referralCode) {
        const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } })
        if (referrer) {
          referrerId = referrer.id
          const bonusStr = await getCachedPlatformSetting('referral_bonus', '50')
          referralBonus = parseInt(bonusStr) || 50
        }
      }

      const created = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name || normalizedEmail.split('@')[0],
          username: finalUsername,
          image: picture || null,
          emailVerified: new Date(),
          credits: welcomeCredits + referralBonus,
          role: 'user',
          referralCode: newReferralCode,
          referredById: referrerId,
          preferredLanguage: 'tr',
        },
      })

      // Link Google account
      await prisma.account.create({
        data: {
          userId: created.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: googleId || normalizedEmail,
        },
      })

      // Handle referral bonus
      if (referrerId && referralBonus > 0) {
        await prisma.$transaction([
          prisma.referral.create({
            data: { referrerId, referredId: created.id, creditsAwarded: referralBonus },
          }),
          prisma.user.update({
            where: { id: referrerId },
            data: {
              credits: { increment: referralBonus },
              referralCreditsEarned: { increment: referralBonus },
            },
          }),
        ])
      }

      // Auto-follow staff
      try {
        const staffUsers = await prisma.user.findMany({
          where: { role: { in: ['admin', 'yonetici'] } },
          select: { id: true },
        })
        if (staffUsers.length > 0) {
          await prisma.follow.createMany({
            data: staffUsers.filter(s => s.id !== created.id).map(s => ({ followerId: created.id, followingId: s.id })),
            skipDuplicates: true,
          })
        }
      } catch (e) { console.error('Auto-follow error:', e) }

      logActivity({ userId: created.id, userName: created.name, activityType: 'signup', detail: 'Google ile mobil uygulamadan katıldı 📱' })

      user = await prisma.user.findUnique({
        where: { id: created.id },
        select: {
          id: true, email: true, name: true, username: true, role: true, image: true,
          credits: true, jetonBalance: true, cfcBalance: true, membership: true,
          membershipExpiresAt: true, preferredLanguage: true, level: true,
          bio: true, phone: true, birthDate: true, zodiacSign: true, referralCode: true,
        },
      })
    } else {
      // Existing user — ensure Google account is linked
      const existingAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          provider: 'google',
        },
      })
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'google',
            providerAccountId: googleId || normalizedEmail,
          },
        })
      }

      // Update image if not set
      if (!user.image && picture) {
        await prisma.user.update({ where: { id: user.id }, data: { image: picture } })
        user.image = picture
      }
    }

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı oluşturulamadı' }, { status: 500 })
    }

    // Generate tokens
    const tokens = generateMobileTokens({ id: user.id, email: user.email, role: user.role })

    // Update last seen
    prisma.sitePresence.upsert({
      where: { visitorId: user.id },
      update: { lastSeen: new Date() },
      create: { visitorId: user.id, lastSeen: new Date() },
    }).catch(() => {})

    return NextResponse.json({
      ...tokens,
      isNewUser,
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
    console.error('Mobile Google auth error:', error)
    return NextResponse.json({ error: 'Google giriş başarısız' }, { status: 500 })
  }
}
