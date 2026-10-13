export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { generateMobileTokens } from '@/lib/mobile-auth'
import { authLimiter } from '@/lib/rate-limiter'
import { randomBytes } from 'crypto'
import { logActivity } from '@/lib/activity-logger'
import { sendNotificationEmail, getWelcomeEmailHtml, getNewUserSignupEmailHtml } from '@/lib/email-service'

import { getCachedPlatformSetting } from '@/lib/cache'

async function getNumericSetting(key: string, defaultVal: number): Promise<number> {
  const val = await getCachedPlatformSetting(key, String(defaultVal))
  return parseInt(val) || defaultVal
}

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase()
}

/**
 * POST /api/auth/mobile-register
 * Body: { email, password, name, username, birthDate, birthTime, referralCode?, preferredLanguage? }
 * Returns: { accessToken, refreshToken, user }
 */
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const { success: rateLimitOk } = authLimiter.check(`mobile-register:${ip}`)
    if (!rateLimitOk) {
      return NextResponse.json({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, { status: 429 })
    }

    const body = await req.json()
    const { email, password, name, username, birthDate, birthTime, referralCode, preferredLanguage } = body

    if (!email || !password || !name || !username || !birthDate || !birthTime) {
      return NextResponse.json(
        { error: 'Zorunlu alanlar: email, password, name, username, birthDate, birthTime' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Geçersiz e-posta adresi' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedUsername = username.toLowerCase().trim()

    // Check existing
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existingUser) {
      return NextResponse.json({ error: 'Bu e-posta adresi zaten kayıtlı' }, { status: 400 })
    }

    const existingUsername = await prisma.user.findUnique({ where: { username: normalizedUsername } })
    if (existingUsername) {
      return NextResponse.json({ error: 'Bu kullanıcı adı zaten alınmış' }, { status: 400 })
    }

    // Check referral code
    let referrer = null
    if (referralCode) {
      referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() } })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate unique referral code
    let newReferralCode = generateReferralCode()
    let attempts = 0
    while (attempts < 10) {
      const existing = await prisma.user.findUnique({ where: { referralCode: newReferralCode } })
      if (!existing) break
      newReferralCode = generateReferralCode()
      attempts++
    }

    const WELCOME_CFC = await getNumericSetting('welcome_credits', 50)
    const REFERRAL_BONUS = await getNumericSetting('referral_bonus', 50)
    const initialCredits = WELCOME_CFC + (referrer ? REFERRAL_BONUS : 0)

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name,
        username: normalizedUsername,
        birthDate: new Date(birthDate),
        birthTime,
        preferredLanguage: preferredLanguage || 'tr',
        credits: initialCredits,
        role: 'user',
        referralCode: newReferralCode,
        referredById: referrer?.id || null,
      },
    })

    // Log activity
    logActivity({ userId: user.id, userName: user.name, activityType: 'signup', detail: 'mobil uygulamadan katıldı 📱' })

    // Auto-follow staff
    try {
      const staffUsers = await prisma.user.findMany({
        where: { role: { in: ['admin', 'yonetici'] } },
        select: { id: true },
      })
      if (staffUsers.length > 0) {
        await prisma.follow.createMany({
          data: staffUsers.filter(s => s.id !== user.id).map(s => ({ followerId: user.id, followingId: s.id })),
          skipDuplicates: true,
        })
      }
    } catch (e) { console.error('Auto-follow error:', e) }

    // Handle referral bonus
    if (referrer) {
      await prisma.$transaction([
        prisma.referral.create({ data: { referrerId: referrer.id, referredId: user.id, creditsAwarded: REFERRAL_BONUS } }),
        prisma.user.update({ where: { id: referrer.id }, data: { credits: { increment: REFERRAL_BONUS }, referralCreditsEarned: { increment: REFERRAL_BONUS } } }),
      ])
    }

    // Hoş geldin e-postası (engellemez)
    const userLanguage = preferredLanguage || 'tr'
    sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_WELCOME_EMAIL || '',
      recipientEmail: normalizedEmail,
      subject: userLanguage === 'tr' ? '✨ Falcı\'ya Hoş Geldiniz!' : '✨ Welcome to Falcı!',
      htmlBody: getWelcomeEmailHtml(name, userLanguage),
    }).catch(err => console.error('Welcome email error:', err))

    // Yönetici bildirimi (engellemez)
    sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_YENI_KULLANC_KAYD || '',
      recipientEmail: 'mesutbyrm1@gmail.com',
      subject: `🎉 Yeni Kullanıcı (mobil): ${name}`,
      htmlBody: getNewUserSignupEmailHtml(name, normalizedEmail),
    }).catch(err => console.error('Admin notification error:', err))

    // Generate tokens
    const tokens = generateMobileTokens({ id: user.id, email: user.email, role: user.role })

    return NextResponse.json({
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        credits: user.credits,
        jetonBalance: user.jetonBalance,
        cfcBalance: user.cfcBalance ?? 0,
        membership: user.membership,
        referralCode: user.referralCode,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Mobile register error:', error)
    return NextResponse.json({ error: 'Kayıt başarısız' }, { status: 500 })
  }
}
