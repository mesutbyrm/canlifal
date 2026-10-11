export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { safeInt, safeFloat } from '@/lib/short-videos'

function mapMusic(m: any) {
  return {
    id: m.id,
    title: m.title,
    artist: m.artist ?? null,
    audioUrl: m.audioUrl,
    coverUrl: m.coverUrl ?? null,
    durationSec: safeFloat(m.durationSec),
    usesCount: safeInt(m.usesCount),
  }
}

/**
 * GET /api/short-videos/music
 * Auth: opsiyonel
 * Aktif müzik listesi (popülerlik sırası). ?q= ile arama.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '30') || 30, 50)
    const q = (searchParams.get('q') || '').trim()

    const where: any = { isActive: true }
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { artist: { contains: q, mode: 'insensitive' } },
      ]
    }

    const music = await prisma.shortVideoMusic.findMany({
      where,
      take: limit,
      orderBy: [{ usesCount: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      success: true,
      data: { music: music.map(mapMusic) },
    })
  } catch (error: any) {
    console.error('[short-videos] Music list error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Müzik listesi alınamadı' } },
      { status: 500 }
    )
  }
}
