import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { forwardToMusicSearch, forwardToSongRequest } from '@/lib/chat-route-proxy'

export const dynamic = 'force-dynamic'

/**
 * POST /api/chat/rooms/[roomId]/music-request-by-query
 * Body: { query: string, requestType?: 'audio' | 'video', dedication?, note? }
 * Arama + şarkı isteğini tek adımda yapar. Arama ve istek mantığı
 * kopyalanmaz; mevcut /api/music/search ve /song-request rotalarına yönlendirilir.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const mobileUser = await authenticateRequest(request)
    const session = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const query = typeof body?.query === 'string'
      ? body.query.trim()
      : (typeof body?.q === 'string' ? body.q.trim() : '')

    if (query.length < 2) {
      return NextResponse.json({ error: 'Arama terimi en az 2 karakter olmalı' }, { status: 400 })
    }

    const searchResponse = await forwardToMusicSearch(request, query)
    if (!searchResponse.ok) {
      return searchResponse
    }
    const searchData = await searchResponse.json().catch(() => ({ items: [] }))
    const first = (searchData?.items || [])[0]
    if (!first?.videoId) {
      return NextResponse.json({ error: 'Aramanıza uygun şarkı bulunamadı' }, { status: 404 })
    }

    return forwardToSongRequest(request, params.roomId, {
      videoId: first.videoId,
      title: first.title,
      duration: first.duration,
      requestType: body?.requestType === 'video' ? 'video' : 'audio',
      dedication: body?.dedication,
      note: body?.note,
    })
  } catch (error) {
    console.error('Music request by query error:', error)
    return NextResponse.json({ error: 'Şarkı isteği oluşturulamadı' }, { status: 500 })
  }
}
