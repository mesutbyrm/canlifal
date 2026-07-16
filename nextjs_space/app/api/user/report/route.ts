export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'

/**
 * POST /api/user/report
 * Body: { userId: string, reason: string, details?: string }
 * 
 * Reasons: harassment, spam, inappropriate_content, fake_account, scam, other
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const { userId, reason, details } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'Şikayet nedeni gerekli' }, { status: 400 })
    }

    if (userId === auth.id) {
      return NextResponse.json({ error: 'Kendinizi şikayet edemezsiniz' }, { status: 400 })
    }

    const validReasons = ['harassment', 'spam', 'inappropriate_content', 'fake_account', 'scam', 'other']
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: 'Geçersiz şikayet nedeni' }, { status: 400 })
    }

    // Check target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (!targetUser) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    // Check for duplicate report (same reporter + reported + reason in last 24h)
    const recentReport = await prisma.userReport.findFirst({
      where: {
        reporterId: auth.id,
        reportedId: userId,
        reason,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    })

    if (recentReport) {
      return NextResponse.json({
        error: 'Bu kullanıcıyı aynı nedenle zaten şikayet ettiniz. 24 saat içinde tekrar şikayet edemezsiniz.',
      }, { status: 429 })
    }

    const report = await prisma.userReport.create({
      data: {
        reporterId: auth.id,
        reportedId: userId,
        reason,
        details: details?.slice(0, 1000) || null,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Şikayetiniz alındı. İncelendikten sonra gerekli işlem yapılacaktır.',
      reportId: report.id,
    })
  } catch (error) {
    console.error('User report error:', error)
    return NextResponse.json({ error: 'Şikayet gönderilemedi' }, { status: 500 })
  }
}
