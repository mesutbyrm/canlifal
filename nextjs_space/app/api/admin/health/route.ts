/**
 * GET /api/admin/health
 * Sistem sağlık izleme: DB bağlantısı, tablo istatistikleri, SSE durumu,
 * başarısız webhook'lar, hata oranları.
 */
import { NextRequest, NextResponse } from 'next/server'
import { staffCan } from '@/lib/permissions'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (
      !session?.user?.id ||
      !(await staffCan(
        (session.user as any).role,
        (session.user as any).id,
        'system.audit.view',
        ['admin', 'yonetici']
      ))
    ) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // 1. DB connection check + latency
    const dbStart = Date.now()
    let dbOk = true
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch {
      dbOk = false
    }
    const dbLatencyMs = Date.now() - dbStart

    // 2. Core table stats (parallel)
    const [
      totalUsers,
      activeUsersLastHour,
      activeUsersLastDay,
      totalPayments,
      pendingPayments,
      failedPaymentsToday,
      totalSessions,
      activeSessions,
      activeStreams,
      activeRooms,
      pendingReports,
      pendingWithdrawals,
    ] = await Promise.all([
      prisma.user.count().catch(() => -1),
      prisma.user.count({ where: { lastActiveAt: { gte: oneHourAgo } } }).catch(() => -1),
      prisma.user.count({ where: { lastActiveAt: { gte: oneDayAgo } } }).catch(() => -1),
      prisma.payment.count().catch(() => -1),
      prisma.payment.count({ where: { status: 'pending' } }).catch(() => -1),
      prisma.payment.count({ where: { status: 'failed', createdAt: { gte: oneDayAgo } } }).catch(() => -1),
      prisma.liveSession.count().catch(() => -1),
      prisma.liveSession.count({ where: { status: 'active' } }).catch(() => -1),
      prisma.videoStream.count({ where: { status: 'live' } }).catch(() => -1),
      prisma.chatRoom.count({ where: { isActive: true } }).catch(() => -1),
      prisma.userReport.count({ where: { status: 'pending' } }).catch(() => -1),
      prisma.withdrawalRequest.count({ where: { status: 'pending' } }).catch(() => -1),
    ])

    // 3. Recent audit log activity
    let recentAuditCount = 0
    try {
      recentAuditCount = await prisma.auditLog.count({
        where: { createdAt: { gte: oneHourAgo } },
      })
    } catch { /* model might not exist */ }

    // 4. Webhook / notification failures
    let failedNotificationsToday = 0
    try {
      failedNotificationsToday = await (prisma as any).smsDeliveryLog.count({
        where: { status: 'failed', createdAt: { gte: oneDayAgo } },
      })
    } catch { /* model might not exist */ }

    // 5. Stale presence (users marked online but inactive)
    let stalePresence = 0
    try {
      const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000)
      stalePresence = await (prisma as any).sitePresence.count({
        where: { updatedAt: { lt: fiveMinAgo } },
      })
    } catch { /* model might not exist */ }

    const health = {
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: now.toISOString(),
      database: {
        connected: dbOk,
        latencyMs: dbLatencyMs,
      },
      users: {
        total: totalUsers,
        activeLastHour: activeUsersLastHour,
        activeLastDay: activeUsersLastDay,
      },
      payments: {
        total: totalPayments,
        pending: pendingPayments,
        failedToday: failedPaymentsToday,
      },
      live: {
        activeSessions,
        activeStreams,
        activeRooms,
      },
      moderation: {
        pendingReports,
        pendingWithdrawals,
      },
      operations: {
        recentAuditActions: recentAuditCount,
        failedNotificationsToday,
        stalePresence,
      },
      sessions: {
        total: totalSessions,
        active: activeSessions,
      },
    }

    return NextResponse.json({ success: true, data: health })
  } catch (error) {
    console.error('[admin/health] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Sistem sağlık bilgisi alınamadı' },
      { status: 500 }
    )
  }
}
