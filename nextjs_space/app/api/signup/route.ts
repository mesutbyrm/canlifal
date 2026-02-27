import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/db'
import { sendNotificationEmail, getWelcomeEmailHtml, getNewUserSignupEmailHtml } from '@/lib/email-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, preferredLanguage } = body

    if (!email || !password || !name) {
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with 10 free credits
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        preferredLanguage: preferredLanguage || 'en',
        credits: 10,
        role: 'user',
      },
    })

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
      notificationId: process.env.NOTIF_ID_NEW_USER_SIGNUP || '',
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
