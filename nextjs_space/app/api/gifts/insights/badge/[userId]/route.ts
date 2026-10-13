import { NextRequest, NextResponse } from 'next/server'
import { buildSupporterBadge } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/insights/badge/{userId}
 * Public supporter badge (Yeni → Efsane) based on all-time jetons gifted.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId
    if (!userId) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 400 })
    }
    return NextResponse.json(await buildSupporterBadge(userId))
  } catch (error) {
    console.error('[gifts/insights/badge]', error)
    return NextResponse.json({ error: 'Rozet bilgisi alınamadı' }, { status: 500 })
  }
}
