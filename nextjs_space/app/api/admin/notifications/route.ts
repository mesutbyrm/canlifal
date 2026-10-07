export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'
import { sendNotification, getAppStats, getNotificationDetails, cancelNotification } from '@/lib/onesignal-admin'
import { staffCan } from '@/lib/permissions'
import { getHybridSession } from '@/lib/hybrid-session'

// GET: Fetch notification history + dashboard stats
export async function GET(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    // Dashboard stats
    if (action === 'stats') {
      const [appStats, totalSent, logs] = await Promise.all([
        getAppStats(),
        prisma.pushNotificationLog.count(),
        prisma.pushNotificationLog.findMany({
          where: { status: { in: ['sent', 'scheduled'] }, onesignalId: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { deliveredCount: true, clickedCount: true },
        }),
      ])

      const totalDelivered = logs.reduce((s: any, l: any) => s + l.deliveredCount, 0)
      const totalClicked = logs.reduce((s: any, l: any) => s + l.clickedCount, 0)
      const ctr = totalDelivered > 0 ? ((totalClicked / totalDelivered) * 100).toFixed(1) : '0'

      return NextResponse.json({
        subscribers: appStats.subscribers,
        totalSent,
        totalDelivered,
        totalClicked,
        ctr,
      })
    }

    // Refresh stats for a specific notification from OneSignal
    if (action === 'refresh') {
      const id = searchParams.get('id')
      if (!id) return NextResponse.json({ error: 'ID eksik' }, { status: 400 })

      const log = await prisma.pushNotificationLog.findUnique({ where: { id } })
      if (!log?.onesignalId) return NextResponse.json({ error: 'OneSignal ID bulunamadı' }, { status: 404 })

      const details = await getNotificationDetails(log.onesignalId)
      if (details.error) return NextResponse.json({ error: details.error }, { status: 500 })

      const updated = await prisma.pushNotificationLog.update({
        where: { id },
        data: {
          deliveredCount: details.delivered || 0,
          clickedCount: details.clicked || 0,
        },
      })

      return NextResponse.json(updated)
    }

    // Notification history list
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      prisma.pushNotificationLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pushNotificationLog.count(),
    ])

    return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error: any) {
    console.error('Admin notifications GET error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// POST: Send a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await request.json()
    const { title, message, url, imageUrl, targetType, targetValue, scheduledAt } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Başlık ve mesaj zorunludur' }, { status: 400 })
    }

    // Determine status
    const status = scheduledAt ? 'scheduled' : 'sent'

    // Send via OneSignal
    const result = await sendNotification({
      title,
      message,
      url: url || undefined,
      imageUrl: imageUrl || undefined,
      targetType: targetType || 'all',
      targetValue: targetValue || undefined,
      scheduledAt: scheduledAt || undefined,
    })

    // Log to database
    const log = await prisma.pushNotificationLog.create({
      data: {
        onesignalId: result.onesignalId || null,
        title,
        message,
        url: url || null,
        imageUrl: imageUrl || null,
        targetType: targetType || 'all',
        targetValue: targetValue || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: result.success ? status : 'failed',
        recipientCount: result.recipientCount || 0,
        errorMessage: result.error || null,
        createdBy: (session.user as any).id,
      },
    })

    return NextResponse.json({
      success: result.success,
      log,
      error: result.error,
    })
  } catch (error: any) {
    console.error('Admin notifications POST error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}

// DELETE: Cancel a scheduled notification
export async function DELETE(request: NextRequest) {
  try {
    const session = await getHybridSession(request)
    if (!session?.user || !(await staffCan((session.user as any).role, (session.user as any).id, 'content.announcement.manage', ['admin', 'yonetici', 'moderator', 'finans']))) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID eksik' }, { status: 400 })

    const log = await prisma.pushNotificationLog.findUnique({ where: { id } })
    if (!log) return NextResponse.json({ error: 'Bildirim bulunamadı' }, { status: 404 })

    if (log.onesignalId && log.status === 'scheduled') {
      await cancelNotification(log.onesignalId)
    }

    await prisma.pushNotificationLog.update({
      where: { id },
      data: { status: 'cancelled' },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin notifications DELETE error:', error)
    return NextResponse.json({ error: 'Sunucu hatası' }, { status: 500 })
  }
}
