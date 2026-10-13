export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

// GET - fetch a single TikTok video by ID with related videos
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const video = await prisma.tikTokVideo.findUnique({
      where: { id: params.id },
      include: { category: { select: { id: true, title: true, slug: true } } },
    })

    if (!video || !video.isActive) {
      return NextResponse.json({ error: 'Video bulunamadı' }, { status: 404 })
    }

    // If tiktokId is missing, try to extract from embedHtml or tiktokUrl
    if (!video.tiktokId) {
      let extractedId: string | null = null
      if (video.embedHtml) {
        const m = video.embedHtml.match(/video\/(\d+)/)
        if (m) extractedId = m[1]
      }
      if (!extractedId && video.tiktokUrl) {
        const m = video.tiktokUrl.match(/video\/(\d+)/)
        if (m) extractedId = m[1]
      }
      // Try oEmbed as last resort
      if (!extractedId) {
        try {
          const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(video.tiktokUrl)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          })
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json()
            if (oembedData.html) {
              const m2 = oembedData.html.match(/video\/(\d+)/)
              if (m2) extractedId = m2[1]
            }
          }
        } catch {}
      }
      if (extractedId) {
        // Update in DB for future use
        await prisma.tikTokVideo.update({ where: { id: video.id }, data: { tiktokId: extractedId } })
        ;(video as any).tiktokId = extractedId
      }
    }

    // Fetch related videos from same category or recent
    const relatedWhere: any = {
      isActive: true,
      id: { not: video.id },
    }
    if (video.categoryId) {
      relatedWhere.categoryId = video.categoryId
    }

    let related = await prisma.tikTokVideo.findMany({
      where: relatedWhere,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 12,
      include: { category: { select: { id: true, title: true } } },
    })

    // If not enough related from same category, fill with others
    if (related.length < 6) {
      const moreIds = related.map(r => r.id)
      const more = await prisma.tikTokVideo.findMany({
        where: {
          isActive: true,
          id: { notIn: [video.id, ...moreIds] },
        },
        orderBy: { createdAt: 'desc' },
        take: 12 - related.length,
        include: { category: { select: { id: true, title: true } } },
      })
      related = [...related, ...more]
    }

    return NextResponse.json({ video, related })
  } catch (error) {
    console.error('TikTok video detail error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
