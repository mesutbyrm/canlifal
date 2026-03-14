import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { sendNotificationEmail, getWelcomeEmailHtml, getNewUserSignupEmailHtml } from '@/lib/email-service'
import { randomBytes } from 'crypto'

const REFERRAL_BONUS = 50; // Credits for both referrer and referred

function generateReferralCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, preferredLanguage, referralCode, username, birthDate, birthTime } = body

    if (!email || !password || !name || !username || !birthDate || !birthTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Check if username is taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    })

    if (existingUsername) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      )
    }

    // Check referral code if provided
    let referrer = null;
    if (referralCode) {
      referrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.toUpperCase() }
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Generate unique referral code for new user
    let newUserReferralCode = generateReferralCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await prisma.user.findUnique({ where: { referralCode: newUserReferralCode } });
      if (!existing) break;
      newUserReferralCode = generateReferralCode();
      attempts++;
    }

    // Calculate initial credits (10 base + 50 if referred)
    const initialCredits = 10 + (referrer ? REFERRAL_BONUS : 0);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username,
        birthDate: new Date(birthDate),
        birthTime,
        preferredLanguage: preferredLanguage || 'tr',
        credits: initialCredits,
        role: 'user',
        referralCode: newUserReferralCode,
        referredById: referrer?.id || null,
      },
    })

    // If referred, create referral record and give referrer credits
    if (referrer) {
      await prisma.$transaction([
        // Create referral record
        prisma.referral.create({
          data: {
            referrerId: referrer.id,
            referredId: user.id,
            creditsAwarded: REFERRAL_BONUS
          }
        }),
        // Give referrer bonus credits
        prisma.user.update({
          where: { id: referrer.id },
          data: {
            credits: { increment: REFERRAL_BONUS },
            referralCreditsEarned: { increment: REFERRAL_BONUS }
          }
        })
      ]);

      // Check and award milestone bonuses
      const referralCount = await prisma.referral.count({
        where: { referrerId: referrer.id }
      });

      // Milestone: 5 referrals = 200 bonus credits
      if (referralCount === 5) {
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            credits: { increment: 200 },
            referralCreditsEarned: { increment: 200 }
          }
        });
      }
      // Milestone: 20 referrals = 500 bonus credits
      else if (referralCount === 20) {
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            credits: { increment: 500 },
            referralCreditsEarned: { increment: 500 }
          }
        });
      }
      // Milestone: 50 referrals = 1000 bonus credits
      else if (referralCount === 50) {
        await prisma.user.update({
          where: { id: referrer.id },
          data: {
            credits: { increment: 1000 },
            referralCreditsEarned: { increment: 1000 }
          }
        });
      }
    }

    // Send welcome email to user (non-blocking)
    const userLanguage = preferredLanguage || 'en'
    sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_WELCOME_EMAIL || '',
      recipientEmail: email,
      subject: userLanguage === 'tr' ? '✨ Falcı\'ya Hoş Geldiniz!' : '✨ Welcome to Falcı!',
      htmlBody: getWelcomeEmailHtml(name, userLanguage),
    }).catch(err => console.error('Welcome email error:', err))

    // Send notification to admin (non-blocking)
    sendNotificationEmail({
      notificationId: process.env.NOTIF_ID_YENI_KULLANC_KAYD || '',
      recipientEmail: 'mesutbyrm1@gmail.com',
      subject: `🎉 Yeni Kullanıcı: ${name}`,
      htmlBody: getNewUserSignupEmailHtml(name, email),
    }).catch(err => console.error('Admin notification error:', err))

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          credits: user.credits,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
