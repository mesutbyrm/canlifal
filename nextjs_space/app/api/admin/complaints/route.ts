import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { staffCan } from '@/lib/permissions'

export const dynamic = 'force-dynamic'

const STATUSES = ['pending', 'reviewed', 'dismissed'] as const
const ACTION_TO_STATUS: Record<string, string> = {
  review: 'reviewed',
  resolve: 'reviewed',
  dismiss: 'dismissed',
}

const USER_SELECT = { id: true, name: true, username: true, image: true, role: true, isBanned: true } as const

// Şikayet (UserReport) yönetimi için ortak yetki kontrolü: mobil Bearer veya web oturumu.
async function requireModerator(req: NextRequest): Promise<{ id: string } | NextResponse> {
  const mobileUser = await authenticateRequest(req)
  const webSession = !mobileUser ? await getServerSession(authOptions) : null
  const userId: string | undefined = mobileUser?.id || (webSession?.user as any)?.id
  if (!userId) {
    return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  }
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  const allowed = await staffCan(me?.role, userId, 'moderation.report.handle', ['admin', 'yonetici', 'moderator'])
  if (!allowed) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
  }
  return { id: userId }
}

function shapeReport(r: any) {
  return {
    id: r.id,
    reason: r.reason,
    details: r.details ?? '',
    status: r.status,
    createdAt: r.createdAt,
    reporter: r.reporter ?? null,
    reported: r.reported ?? null,
  }
}

// GET /api/admin/complaints?status=pending|reviewed|dismissed|all&page=&limit=&search=
export async function GET(req: NextRequest) {
  try {
    const guard = await requireModerator(req)
    if (guard instanceof NextResponse) return guard

    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') || 'pending'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50))
    const search = (searchParams.get('search') || '').trim()

    const where: Record<string, any> = {}
    if (statusParam !== 'all') {
      if (!(STATUSES as readonly string[]).includes(statusParam)) {
        return NextResponse.json({ error: 'Geçersiz durum' }, { status: 400 })
      }
      where.status = statusParam
    }
    if (search) {
      where.OR = [
        { reason: { contains: search, mode: 'insensitive' } },
        { reporter: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { username: { contains: search, mode: 'insensitive' } }] } },
        { reported: { OR: [{ name: { contains: search, mode: 'insensitive' } }, { username: { contains: search, mode: 'insensitive' } }] } },
      ]
    }

    const [total, rows, grouped] = await Promise.all([
      prisma.userReport.count({ where }),
      prisma.userReport.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          reporter: { select: USER_SELECT },
          reported: { select: USER_SELECT },
        },
      }),
      prisma.userReport.groupBy({ by: ['status'], _count: { _all: true } }),
    ])

    const statusCounts: Record<string, number> = {}
    for (const g of grouped) statusCounts[g.status] = g._count._all

    return NextResponse.json({
      reports: rows.map(shapeReport),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      statusCounts,
    })
  } catch (error: any) {
    console.error('[Admin Complaints GET] Error:', error)
    return NextResponse.json({ error: 'Şikayetler alınamadı' }, { status: 500 })
  }
}

// PATCH /api/admin/complaints — { reportId, action: review|resolve|dismiss, reason? }
export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireModerator(req)
    if (guard instanceof NextResponse) return guard

    const body = await req.json().catch(() => ({}))
    const reportId = typeof body?.reportId === 'string' ? body.reportId.trim() : ''
    const action = typeof body?.action === 'string' ? body.action : ''
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''

    if (!reportId) {
      return NextResponse.json({ error: 'Şikayet kimliği gerekli' }, { status: 400 })
    }
    const nextStatus = ACTION_TO_STATUS[action]
    if (!nextStatus) {
      return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
    }

    const existing = await prisma.userReport.findUnique({ where: { id: reportId } })
    if (!existing) {
      return NextResponse.json({ error: 'Şikayet bulunamadı' }, { status: 404 })
    }

    const updated = await prisma.userReport.update({
      where: { id: reportId },
      data: { status: nextStatus },
      include: {
        reporter: { select: USER_SELECT },
        reported: { select: USER_SELECT },
      },
    })

    await prisma.auditLog.create({
      data: {
        actorId: guard.id,
        action: `complaint_${action}`,
        targetType: 'UserReport',
        targetId: reportId,
        before: { status: existing.status },
        after: { status: nextStatus },
        description: reason || null,
      },
    }).catch((e) => console.error('[Admin Complaints] audit log failed:', e))

    return NextResponse.json(shapeReport(updated))
  } catch (error: any) {
    console.error('[Admin Complaints PATCH] Error:', error)
    return NextResponse.json({ error: 'Şikayet güncellenemedi' }, { status: 500 })
  }
}
