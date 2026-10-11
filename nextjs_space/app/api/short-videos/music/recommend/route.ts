export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { safeInt, safeFloat, parseHashtags } from '@/lib/short-videos'

function mapMusic(m: any, score?: number) {
  return {
    id: m.id,
    title: m.title,
    artist: m.artist ?? null,
    audioUrl: m.audioUrl,
    coverUrl: m.coverUrl ?? null,
    durationSec: safeFloat(m.durationSec),
    usesCount: safeInt(m.usesCount),
    ...(score !== undefined ? { score } : {}),
  }
}

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[#@]/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 3)
}

/**
 * GET /api/short-videos/music/recommend
 * Auth: opsiyonel
 * Query: ?description=&hashtags=a,b&videoKey=&limit=
 *
 * Açıklama ve hashtag anahtar kelimelerini aktif müzik katıloğuyla eşleştirir.
 * Eşleşme yoksa popülerlik sırasıyla döner (istemci de aynı yedeği bekliyor).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12') || 12, 30)
    const description = (searchParams.get('description') || '').trim()
    const hashtagsParam = (searchParams.get('hashtags') || '').trim()

    const tags = [
      ...hashtagsParam.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
      ...parseHashtags(description),
    ]
    const keywords = Array.from(new Set([...tokenize(description), ...tags.flatMap(tokenize)]))

    const pool = await prisma.shortVideoMusic.findMany({
      where: { isActive: true },
      take: 200,
      orderBy: [{ usesCount: 'desc' }, { createdAt: 'desc' }],
    })

    if (keywords.length === 0 || pool.length === 0) {
      return NextResponse.json({
        success: true,
        data: { music: pool.slice(0, limit).map((m: any) => mapMusic(m)), matched: false, keywords },
      })
    }

    const scored = pool
      .map((m: any) => {
        const haystack = `${m.title} ${m.artist ?? ''}`.toLocaleLowerCase('tr-TR')
        let score = 0
        for (const k of keywords) if (haystack.includes(k)) score += 1
        return { m, score }
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || safeInt(b.m.usesCount) - safeInt(a.m.usesCount))

    const matched = scored.slice(0, limit).map((x) => mapMusic(x.m, x.score))
    // Yetersizse popüler parçalarla tamamla
    if (matched.length < limit) {
      const used = new Set(matched.map((m) => m.id))
      for (const m of pool) {
        if (matched.length >= limit) break
        if (!used.has(m.id)) matched.push(mapMusic(m))
      }
    }

    return NextResponse.json({
      success: true,
      data: { music: matched, matched: scored.length > 0, keywords },
    })
  } catch (error: any) {
    console.error('[short-videos] music/recommend error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Müzik önerisi alınamadı' } },
      { status: 500 }
    )
  }
}
