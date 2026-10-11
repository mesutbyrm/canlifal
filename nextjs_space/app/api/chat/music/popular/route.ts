import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/music/popular
 * Son 30 günde odalarda en çok istenen şarkılar.
 * Ayrı bir "popüler şarkı" tablosu oluşturulmaz; mevcut şarkı isteği
 * mesajları (ChatMessage `[SONG_REQUEST...]`) gruplanarak hesaplanır.
 * Kayıt yoksa boş liste döner (istemci kendi yerel listesine düşer).
 */
export async function GET(_request: NextRequest) {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const rows = await prisma.chatMessage.findMany({
      where: {
        content: { startsWith: '[SONG_REQUEST' },
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { content: true },
    })

    const counts = new Map<string, { videoId: string; title: string; count: number }>()
    for (const row of rows) {
      // Format: [SONG_REQUEST_PAID]videoId|title|...
      const raw = row.content.replace(/^\[SONG_REQUEST[A-Z_]*\]/, '').replace(/\[PLAYED\]$/, '')
      const parts = raw.split('|')
      const videoId = (parts[0] || '').trim()
      const title = (parts[1] || '').trim()
      if (!videoId || !title) continue
      const existing = counts.get(videoId)
      if (existing) existing.count += 1
      else counts.set(videoId, { videoId, title, count: 1 })
    }

    const items = Array.from(counts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((entry) => {
        const [left, right] = entry.title.split(' - ')
        const artist = right ? left.trim() : ''
        const songTitle = right ? right.trim() : entry.title
        return {
          videoId: entry.videoId,
          title: songTitle,
          artist,
          query: entry.title,
          requestCount: entry.count,
          thumbnail: `https://i.ytimg.com/vi/${entry.videoId}/mqdefault.jpg`,
        }
      })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Popular music error:', error)
    return NextResponse.json({ items: [] })
  }
}
