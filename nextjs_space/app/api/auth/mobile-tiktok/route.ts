export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { generateMobileTokens } from '@/lib/mobile-auth'
import { authLimiter } from '@/lib/rate-limiter'
import { randomBytes } from 'crypto'
import { logActivity } from '@/lib/activity-logger'
import { getCachedPlatformSetting } from '@/lib/cache'

const TIKTOK_CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || ''
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || ''

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

/**
 * POST /api/auth/mobile-tiktok
 * Body: { code, redirectUri, referralCode? }
 * 
 * Flutter sends the TikTok authorization code from tiktok_sdk or webview OAuth flow.
 * Server exchanges it for access token, gets user info, creates/links user, returns JWT.
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { success: rateLimitOk } = authLimiter.check(`mobile-tiktok:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek.' }, { status: 429 })
    }

    const body = await req.json()
    const { code, redirectUri, referralCode } = body

    if (!code) {
      return NextResponse.json({ error: 'TikTok authorization code gerekli' }, { status: 400 })
    }

    if (!TIKTOK_CLIENT_KEY || !TIKTOK_CLIENT_SECRET) {
      return NextResponse.json({ error: 'TikTok yapılandırması eksik' }, { status: 503 })
    }

    // Exchange code for access token
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri || '',
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || tokenData.error) {
      console.error('TikTok token exchange failed:', tokenData)
      return NextResponse.json({ error: 'TikTok token alınamadı' }, { status: 401 })
    }

    const { access_token, open_id } = tokenData

    if (!access_token || !open_id) {
      return NextResponse.json({ error: 'TikTok yanıtı eksik' }, { status: 401 })
    }

    // Get user info from TikTok
    const userInfoRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url',
      {
        headers: { 'Authorization': `Bearer ${access_token}` },
      }
    )

    let tiktokName = 'TikTok Kullanıcı'
    let tiktokAvatar: string | null = null

    if (userInfoRes.ok) {
      const userInfoData = await userInfoRes.json()
      const userData = userInfoData?.data?.user
      if (userData) {
        tiktokName = userData.display_name || tiktokName
        tiktokAvatar = userData.avatar_url || null
      }
    }

    // Check if TikTok account is already linked
    const existingAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: 'tiktok',
          providerAccountId: open_id,
        },
      },
      include: {
        user: {
          select: {
            id: true, email: true, name: true, username: true, role: true, image: true,
            credits: true, jetonBalance: true, cfcBalance: true, membership: true,
            membershipExpiresAt: true, preferredLanguage: true, level: true,
            bio: true, phone: true, birthDate: true, zodiacSign: true, referralCode: true,
          },
        },
      },
    })

    let user = existingAccount?.user
    let isNewUser = false

    if (!user) {
      // Create new user for TikTok login
      isNewUser = true

      let newReferralCode = generateReferralCode()
      let attempts = 0
      while (attempts < 10) {
        const existing = await prisma.user.findUnique({ where: { referralCode: newReferralCode } })
        if (!existing) break
        newReferralCode = generateReferralCode()
        attempts++
      }

      // Generate unique username
      let baseUsername = tiktokName.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 15) || 'tiktok'
      let finalUsername = baseUsername
      let usernameAttempt = 0
      while (usernameAttempt < 10) {
        const existingU = await prisma.user.findUnique({ where: { username: finalUsername } })
        if (!existingU) break
        finalUsername = `${baseUsername}${Math.floor(Math.random() * 9999)}`
        usernameAttempt++
      }

      // Generate a placeholder email (TikTok doesn't always share email)
      const placeholderEmail = `tiktok_${open_id}@canlifal.app`

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
          email: placeholderEmail,
          name: tiktokName,
          username: finalUsername,
          image: tiktokAvatar,
          credits: welcomeCredits + referralBonus,
          role: 'user',
          referralCode: newReferralCode,
          referredById: referrerId,
          preferredLanguage: 'tr',
        },
      })

      // Link TikTok account
      await prisma.account.create({
        data: {
          userId: created.id,
          type: 'oauth',
          provider: 'tiktok',
          providerAccountId: open_id,
          access_token,
        },
      })

      // Handle referral bonus
      if (referrerId && referralBonus > 0) {
        await prisma.$transaction([
          prisma.referral.create({ data: { referrerId, referredId: created.id, creditsAwarded: referralBonus } }),
          prisma.user.update({
            where: { id: referrerId },
            data: { credits: { increment: referralBonus }, referralCreditsEarned: { increment: referralBonus } },
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

      logActivity({ userId: created.id, userName: created.name, activityType: 'signup', detail: 'TikTok ile mobil uygulamadan katıldı 🎵' })

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
      // Update TikTok token for existing user
      await prisma.account.updateMany({
        where: { userId: user.id, provider: 'tiktok' },
        data: { access_token },
      })

      // Update avatar if not set
      if (!user.image && tiktokAvatar) {
        await prisma.user.update({ where: { id: user.id }, data: { image: tiktokAvatar } })
        user.image = tiktokAvatar
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
        cfcBalance: (user as any).cfcBalance ?? 0,
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
    console.error('Mobile TikTok auth error:', error)
    return NextResponse.json({ error: 'TikTok giriş başarısız' }, { status: 500 })
  }
}
