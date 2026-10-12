import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

// GET /api/admin/health — yalnızca veritabanından ölçülebilen sistem özeti.
// API yanıt süresi, veritabanı yükü ve hata oranı bu uygulamada ölçülmediği için dönülmez
// (istemci bunları yokluğunda 0 gösterir); uydurma değer üretilmez.
// Yanıt: { totalUsers, activeUsers (son 24 saat), totalTransactions, pendingOperations, serverStatus, lastUpdated }
export async function GET(req: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(req)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId: string | undefined = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
    const allowed = await staffCan(me?.role, userId, 'analytics.dashboard.view', ['admin', 'yonetici', 'moderator'])
    if (!allowed) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const [totalUsers, activeUsers, totalTransactions, pendingWithdrawals, pendingNotifications, pendingCfc, pendingComplaints] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { lastActiveAt: { gte: since } } }),
        prisma.payment.count({ where: { status: 'completed' } }),
        prisma.withdrawalRequest.count({ where: { status: { in: ['pending', 'agency_approved'] } } }),
        prisma.paymentNotification.count({ where: { status: 'pending' } }),
        prisma.cfcPaymentRequest.count({ where: { status: 'pending' } }),
        prisma.userReport.count({ where: { status: 'pending' } }),
      ])

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalTransactions,
      pendingOperations: pendingWithdrawals + pendingNotifications + pendingCfc + pendingComplaints,
      serverStatus: 'ok',
      lastUpdated: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[Admin Health GET] Error:', error)
    return NextResponse.json({ error: 'Sistem durumu alınamadı' }, { status: 500 })
  }
}
