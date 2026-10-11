/**
 * GET/PATCH /api/admin/complaints
 * Şikâyet (UserReport) yönetimi — listeleme, durum güncelleme, atama.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/admin-auth'
import prisma from '@/lib/db'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { staffCan } from '@/lib/permissions'
import { createNotificationWithPush } from '@/lib/notify'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (
      !session?.user?.id ||
      !(await staffCan(
        (session.user as any).role,
        (session.user as any).id,
        'moderation.report.handle',
        ['admin', 'yonetici', 'moderator']
      ))
    ) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (status !== 'all') where.status = status

    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { reporter: { name: { contains: search, mode: 'insensitive' } } },
        { reported: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [reports, total, statusCounts] = await Promise.all([
      prisma.userReport.findMany({
        where,
        include: {
          reporter: {
            select: { id: true, name: true, username: true, image: true, role: true },
          },
          reported: {
            select: { id: true, name: true, username: true, image: true, role: true, isBanned: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.userReport.count({ where }),
      prisma.userReport.groupBy({
        by: ['status'],
        _count: true,
      }),
    ])

    const counts: Record<string, number> = {}
    for (const sc of statusCounts as any[]) {
      counts[sc.status] = sc._count
    }

    return NextResponse.json({
      success: true,
      data: {
        reports,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        statusCounts: counts,
      },
    })
  } catch (error) {
    console.error('[admin/complaints] GET error:', error)
    return NextResponse.json({ error: 'Şikayetler yüklenemedi' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getStaffSession()
    if (
      !session?.user?.id ||
      !(await staffCan(
        (session.user as any).role,
        (session.user as any).id,
        'moderation.report.handle',
        ['admin', 'yonetici', 'moderator']
      ))
    ) {
      return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })
    }

    const body = await request.json()
    const { reportId, action, reason, assignedTo } = body

    if (!reportId || !action) {
      return NextResponse.json(
        { error: 'reportId ve action gerekli' },
        { status: 400 }
      )
    }

    const report = await prisma.userReport.findUnique({ where: { id: reportId } })
    if (!report) {
      return NextResponse.json({ error: 'Şikâyet bulunamadı' }, { status: 404 })
    }

    // Optimistic locking: prevent two mods from working the same report
    if (report.status !== 'pending' && action === 'review') {
      return NextResponse.json(
        { error: 'Bu şikâyet zaten inceleniyor', currentStatus: report.status },
        { status: 409 }
      )
    }

    let newStatus = report.status
    switch (action) {
      case 'review':
        newStatus = 'reviewing'
        break
      case 'resolve':
        newStatus = 'resolved'
        break
      case 'dismiss':
        newStatus = 'dismissed'
        break
      case 'escalate':
        newStatus = 'escalated'
        break
      default:
        return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
    }

    const updated = await prisma.userReport.update({
      where: { id: reportId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    })

    // Audit log
    try {
      await recordAudit({
        actorId: (session.user as any).id,
        action: `complaint_${action}`,
        targetType: 'UserReport',
        targetId: reportId,
        metadata: {
          reportedUserId: report.reportedId,
          reporterUserId: report.reporterId,
          previousStatus: report.status,
          newStatus,
          reason: reason || undefined,
        },
        ip: getAuditIp(request),
      })
    } catch { /* non-blocking */ }

    // Notify reporter when complaint is resolved or dismissed
    if (action === 'resolve' || action === 'dismiss') {
      try {
        await createNotificationWithPush({
          userId: report.reporterId,
          type: 'system',
          title: action === 'resolve' ? 'Şikâyetiniz incelendi' : 'Şikâyetiniz değerlendirildi',
          message:
            action === 'resolve'
              ? 'Şikâyetiniz incelendi ve gerekli işlem yapıldı.'
              : 'Şikâyetiniz incelendi. Mevcut bilgiler ışığında ek işlem gerekmediğine karar verildi.',
        })
      } catch { /* non-blocking */ }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('[admin/complaints] PATCH error:', error)
    return NextResponse.json({ error: 'Şikâyet güncellenemedi' }, { status: 500 })
  }
}
