export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { requireAnimationAdmin } from '@/lib/animation-admin'

function db(): any { return prisma as any }

/**
 * GET /api/admin/site-animations/user/{userId}
 * Belirli kullanıcının animasyon atamalarını listeler.
 */
export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const auth = await requireAnimationAdmin()
  if (!auth.ok) return auth.response
  try {
    const items = await db().animationAssignment.findMany({
      where: { userId: params.userId },
      include: {
        animation: { select: { id: true, name: true, category: true, status: true, previewUrl: true, thumbnailUrl: true, assetUrl: true, durationMs: true, priority: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ items })
  } catch (e) {
    console.error('[site-animations user GET]', e)
    return NextResponse.json({ error: 'Kullanıcı animasyonları yüklenemedi' }, { status: 500 })
  }
}
