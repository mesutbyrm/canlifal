export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveUser } from '@/lib/rbac'
import { isAdminRole } from '@/lib/admin-utils'

/**
 * GET /api/admin/users/{userId}/ads
 * Kullanıcının reklam etkileşim geçmişi.
 */
export async function GET(req: NextRequest, { params }: { params: { userId: string } }) {
  const actor = await resolveUser(req)
  if (!actor) return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
  if (!isAdminRole(actor.role)) return NextResponse.json({ error: 'Erişim reddedildi' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  try {
    // AdImpression tablosu varsa ondan çek, yoksa boş dön
    const db = prisma as any
    let impressions: any[] = []
    let clicks: any[] = []
    try {
      impressions = await db.adImpression.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { placement: { select: { id: true, placementKey: true, name: true, adType: true } } },
      })
    } catch { /* model may not exist */ }
    try {
      clicks = await db.adClick.findMany({
        where: { userId: params.userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { placement: { select: { id: true, placementKey: true, name: true, adType: true } } },
      })
    } catch { /* model may not exist */ }

    return NextResponse.json({
      impressions,
      clicks,
      summary: {
        total_impressions: impressions.length,
        total_clicks: clicks.length,
      },
    })
  } catch (e) {
    console.error('[admin user ads]', e)
    return NextResponse.json({ error: 'Reklam geçmişi yüklenemedi' }, { status: 500 })
  }
}
