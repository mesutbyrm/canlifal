export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateMobileTokens } from '@/lib/mobile-auth'
import { authLimiter } from '@/lib/rate-limiter'
import { randomBytes } from 'crypto'
import { logActivity } from '@/lib/activity-logger'
import { getCachedPlatformSetting } from '@/lib/cache'
import jwt from 'jsonwebtoken'
import jwksClient from 'jwks-rsa'

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys'
const appleClient = jwksClient({ jwksUri: APPLE_JWKS_URI, cache: true, cacheMaxAge: 86400000 })

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

async function getAppleSigningKey(kid: string): Promise<string> {
  const key = await appleClient.getSigningKey(kid)
  return key.getPublicKey()
}

interface AppleIdentityToken {
  iss: string
  aud: string
  exp: number
  sub: string // Apple user ID
  email?: string
  email_verified?: string | boolean
  is_private_email?: string | boolean
  nonce?: string
}

async function verifyAppleToken(identityToken: string): Promise<AppleIdentityToken | null> {
  try {
    const decoded = jwt.decode(identityToken, { complete: true })
    if (!decoded || !decoded.header?.kid) return null

    const publicKey = await getAppleSigningKey(decoded.header.kid)
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
    }) as AppleIdentityToken

    return payload
  } catch (e) {
    console.error('Apple token verification failed:', e)
    return null
  }
}

/**
 * POST /api/auth/mobile-apple
 * Body: { identityToken, fullName?, referralCode? }
 *
 * Flutter sends the Apple identity token from sign_in_with_apple plugin.
 * fullName is only available on first sign-in (Apple only sends it once).
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { success: rateLimitOk } = authLimiter.check(`mobile-apple:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })
    }

    const body = await req.json()
    const { identityToken, fullName, referralCode } = body

    if (!identityToken) {
      return NextResponse.json({ error: 'Apple identity token gerekli' }, { status: 400 })
    }

    // Verify the Apple identity token
    const applePayload = await verifyAppleToken(identityToken)
    if (!applePayload) {
      return NextResponse.json({ error: 'Geçersiz Apple token' }, { status: 401 })
    }

    const appleUserId = applePayload.sub
    const appleEmail = applePayload.email?.toLowerCase().trim()

    // Try to find user by Apple account link first
    let account = await prisma.account.findFirst({
      where: { provider: 'apple', providerAccountId: appleUserId },
      select: { userId: true },
    })

    let user: any = null
    let isNewUser = false

    if (account) {
      // Existing Apple-linked user
      user = await prisma.user.findUnique({
        where: { id: account.userId },
        select: {
          id: true, email: true, name: true, username: true, role: true, image: true,
          credits: true, jetonBalance: true, cfcBalance: true, membership: true,
          membershipExpiresAt: true, preferredLanguage: true, level: true,
          bio: true, phone: true, birthDate: true, zodiacSign: true, referralCode: true,
        },
      })
    } else if (appleEmail) {
      // Check if user exists with this email
      user = await prisma.user.findUnique({
        where: { email: appleEmail },
        select: {
          id: true, email: true, name: true, username: true, role: true, image: true,
          credits: true, jetonBalance: true, cfcBalance: true, membership: true,
          membershipExpiresAt: true, preferredLanguage: true, level: true,
          bio: true, phone: true, birthDate: true, zodiacSign: true, referralCode: true,
        },
      })

      if (user) {
        // Link Apple account to existing user
        await prisma.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: 'apple',
            providerAccountId: appleUserId,
          },
        })
      }
    }

    if (!user) {
      // Create new user
      isNewUser = true

      // Apple may hide the real email
      const emailToUse = appleEmail || `apple_${appleUserId.slice(0, 12)}@privaterelay.appleid.com`

      // Check if privaterelay email already exists (edge case)
      const existingPrivate = await prisma.user.findUnique({ where: { email: emailToUse } })
      if (existingPrivate) {
        // Link and return
        await prisma.account.create({
          data: {
            userId: existingPrivate.id,
            type: 'oauth',
            provider: 'apple',
            providerAccountId: appleUserId,
          },
        })
        user = await prisma.user.findUnique({
          where: { id: existingPrivate.id },
          select: {
            id: true, email: true, name: true, username: true, role: true, image: true,
            credits: true, jetonBalance: true, cfcBalance: true, membership: true,
            membershipExpiresAt: true, preferredLanguage: true, level: true,
            bio: true, phone: true, birthDate: true, zodiacSign: true, referralCode: true,
          },
        })
        isNewUser = false
      } else {
        let newReferralCode = generateReferralCode()
        let attempts = 0
        while (attempts < 10) {
          const existing = await prisma.user.findUnique({ where: { referralCode: newReferralCode } })
          if (!existing) break
          newReferralCode = generateReferralCode()
          attempts++
        }

        // Generate username
        let baseUsername = (appleEmail || appleUserId).split('@')[0].replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'apple_user'
        let finalUsername = baseUsername
        let usernameAttempt = 0
        while (usernameAttempt < 10) {
          const existingU = await prisma.user.findUnique({ where: { username: finalUsername } })
          if (!existingU) break
          finalUsername = `${baseUsername}${Math.floor(Math.random() * 9999)}`
          usernameAttempt++
        }

        // Name from Apple (only sent on first auth)
        const displayName = fullName
          ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
          : baseUsername

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
            email: emailToUse,
            name: displayName || 'Apple Kullanıcı',
            username: finalUsername,
            emailVerified: new Date(),
            credits: welcomeCredits + referralBonus,
            role: 'user',
            referralCode: newReferralCode,
            referredById: referrerId,
            preferredLanguage: 'tr',
          },
        })

        // Link Apple account
        await prisma.account.create({
          data: {
            userId: created.id,
            type: 'oauth',
            provider: 'apple',
            providerAccountId: appleUserId,
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

        logActivity({ userId: created.id, userName: created.name, activityType: 'signup', detail: 'Apple ile mobil uygulamadan katıldı 🍎' })

        user = await prisma.user.findUnique({
          where: { id: created.id },
          select: {
            id: true, email: true, name: true, username: true, role: true, image: true,
            credits: true, jetonBalance: true, cfcBalance: true, membership: true,
            membershipExpiresAt: true, preferredLanguage: true, level: true,
            bio: true, phone: true, birthDate: true, zodiacSign: true, referralCode: true,
          },
        })
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
    console.error('Mobile Apple auth error:', error)
    return NextResponse.json({ error: 'Apple giriş başarısız' }, { status: 500 })
  }
}
