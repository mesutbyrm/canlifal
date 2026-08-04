import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/music/history?roomId={roomId}&limit={n}
// Bir odada daha önce çalınmış (oynatılmış) şarkıların geçmişini döndürür.
// roomId zorunludur. limit varsayılan 50, maksimum 100.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const limitParam = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(isNaN(limitParam) ? 50 : limitParam, 1), 100)

    if (!roomId) {
      return NextResponse.json({ error: 'roomId gerekli' }, { status: 400 })
    }

    // Çalınmış istek mesajlarını getir (en yeni önce)
    const played = await prisma.chatMessage.findMany({
      where: {
        roomId,
        content: { startsWith: '[SONG_REQUEST' },
        AND: { content: { contains: '[PLAYED]' } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, username: true, image: true } },
      },
    })

    const history = played.map(msg => {
      const isPaid = msg.content.startsWith('[SONG_REQUEST_PAID]')
      const prefix = isPaid ? '[SONG_REQUEST_PAID] ' : '[SONG_REQUEST_FREE] '
      const data = msg.content.replace(prefix, '').replace('[PLAYED]', '')
      const parts = data.split('|')
      // PAID format: videoId|title|dedication|note|duration|typeTag
      // FREE format: videoId|title|duration|typeTag
      const videoId = parts[0] || ''
      const title = parts[1] || ''
      const duration = isPaid ? (parts[4] || '') : (parts[2] || '')
      const typeTag = isPaid ? (parts[5] || '').trim() : (parts[3] || '').trim()
      const requestType = typeTag === 'VIDEO' ? 'video' : 'audio'
      return {
        id: msg.id,
        videoId,
        title,
        duration,
        requestType,
        isPaid,
        playedAt: msg.createdAt,
        requestedBy: msg.user
          ? { id: msg.user.id, name: msg.user.name || msg.user.username, image: msg.user.image }
          : null,
      }
    })

    return NextResponse.json({ history, count: history.length })
  } catch (error) {
    console.error('Music history error:', error)
    return NextResponse.json({ error: 'Geçmiş alınamadı' }, { status: 500 })
  }
}