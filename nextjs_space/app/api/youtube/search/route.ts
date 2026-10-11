import { NextRequest, NextResponse } from 'next/server'
import YouTube from 'youtube-sr'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const q = req.nextUrl.searchParams.get('q')
    if (!q || q.trim().length < 2) {
      return NextResponse.json({ error: 'Arama terimi gerekli' }, { status: 400 })
    }

    const results = await YouTube.search(q.trim(), { limit: 10, type: 'video' })

    const videos = results
      .filter((v: any) => v.id && v.title)
      .map((v: any) => ({
        id: v.id,
        title: v.title || '',
        thumbnail: v.thumbnail?.url || `https://i.ytimg.com/vi/2ybiC9EF-oc/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCDeH2BcYKRPKKt3YI9-qBecZmXnQ`,
        duration: v.durationFormatted || '',
        channel: v.channel?.name || '',
        views: v.views || 0,
      }))

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('YouTube search error:', error)
    return NextResponse.json({ error: 'Arama yapılamadı' }, { status: 500 })
  }
}
