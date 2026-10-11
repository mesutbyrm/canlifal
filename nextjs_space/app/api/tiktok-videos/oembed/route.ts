export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

// GET - fetch TikTok oEmbed data for a given URL
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = searchParams.get('url')

    if (!url) {
      return NextResponse.json({ error: 'URL gerekli' }, { status: 400 })
    }

    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    const res = await fetch(oembedUrl, { next: { revalidate: 3600 } })

    if (!res.ok) {
      return NextResponse.json({ error: 'TikTok oEmbed verisi alınamadı' }, { status: 400 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('TikTok oEmbed error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
