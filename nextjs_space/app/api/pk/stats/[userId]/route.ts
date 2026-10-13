import { NextRequest, NextResponse } from 'next/server'
import { computePkStatsForUser } from '@/lib/pk-user-stats'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params
    if (!userId?.trim()) return NextResponse.json({ error: 'Kullanıcı gerekli' }, { status: 400 })
    const stats = await computePkStatsForUser(userId.trim())
    return NextResponse.json({ success: true, stats, data: stats })
  } catch (error) {
    console.error('[pk/stats]', error)
    return NextResponse.json({ error: 'PK istatistikleri alınamadı' }, { status: 500 })
  }
}
