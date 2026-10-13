import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { authenticateRequest } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

// GET /api/agency/periods — ajansın aylık dönem özeti (yalnızca owner/manager).
// Dönem = agency_earnings kayıtlarının takvim ayı (YYYY-MM). Geçmiş aylar 'closed',
// içinde bulunulan ay 'open'. totalJeton, o dönemdeki komisyon tutarlarının toplamıdır.
// Yanıt: { periods: [{ period, memberCount, totalJeton, closedAt, status }] }
export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const membership = await prisma.agencyUser.findUnique({
      where: { userId: authUser.id },
      select: { agencyId: true, role: true },
    })
    if (!membership || !['owner', 'manager'].includes(membership.role)) {
      return NextResponse.json({ error: 'Bu işlem için ajans sahibi veya yönetici olmalısınız' }, { status: 403 })
    }

    const rows = await prisma.$queryRaw<
      { period: string; member_count: number; total: number | null }[]
    >`
      SELECT to_char("createdAt", 'YYYY-MM') AS period,
             COUNT(DISTINCT "userId")::int AS member_count,
             COALESCE(SUM(amount), 0)::float AS total
      FROM agency_earnings
      WHERE "agencyId" = ${membership.agencyId}
      GROUP BY 1
      ORDER BY 1 DESC
      LIMIT 60
    `

    const now = new Date()
    const currentPeriod = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

    const periods = rows.map((r) => {
      const isOpen = r.period === currentPeriod
      const [y, m] = r.period.split('-').map(Number)
      // Dönem kapanışı: ayın son anı (bir sonraki ayın 1'i, UTC).
      const closedAt = isOpen ? null : new Date(Date.UTC(y, m, 1)).toISOString()
      return {
        period: r.period,
        memberCount: r.member_count,
        totalJeton: Math.round(Number(r.total ?? 0)),
        closedAt,
        status: isOpen ? 'open' : 'closed',
      }
    })

    return NextResponse.json({ periods })
  } catch (error: any) {
    console.error('[Agency Periods GET] Error:', error)
    return NextResponse.json({ error: 'Dönemler alınamadı' }, { status: 500 })
  }
}
