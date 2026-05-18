export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const ALLOWED_ROLES = ['admin', 'yonetici', 'moderator']

// GET - fetch all TikTok videos for admin (with optional category/search filters)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    const where: any = {}
    if (categoryId === 'uncategorized') {
      where.categoryId = null
    } else if (categoryId) {
      where.categoryId = categoryId
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { authorName: { contains: search, mode: 'insensitive' } },
        { tiktokUrl: { contains: search, mode: 'insensitive' } },
      ]
    }

    const videos = await prisma.tikTokVideo.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { category: { select: { id: true, title: true } } },
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Admin TikTok fetch error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - add new TikTok video(s) - supports single or bulk
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await req.json()
    const { tiktokUrl, tiktokUrls, categoryId } = body

    // Build list of URLs
    let urls: string[] = []
    if (tiktokUrls && Array.isArray(tiktokUrls)) {
      urls = tiktokUrls.filter((u: string) => u?.trim())
    } else if (tiktokUrl) {
      urls = [tiktokUrl.trim()]
    }

    if (urls.length === 0) {
      return NextResponse.json({ error: 'TikTok URL gerekli' }, { status: 400 })
    }

    const results: any[] = []
    const errors: string[] = []

    for (const url of urls) {
      try {
        // Extract video ID from URL
        const idMatch = url.match(/video\/(\d+)/)
        const tiktokId = idMatch ? idMatch[1] : null

        // Check for duplicate
        if (tiktokId) {
          const existing = await prisma.tikTokVideo.findFirst({ where: { tiktokId } })
          if (existing) {
            errors.push(`${url} - Bu video zaten ekli`)
            continue
          }
        }

        // Fetch oEmbed data
        let embedData: any = {}
        try {
          const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
          if (oembedRes.ok) {
            embedData = await oembedRes.json()
          }
        } catch {}

        const video = await prisma.tikTokVideo.create({
          data: {
            tiktokUrl: url,
            tiktokId,
            title: embedData.title || null,
            authorName: embedData.author_name || null,
            authorAvatar: embedData.thumbnail_url || null,
            thumbnailUrl: embedData.thumbnail_url || null,
            embedHtml: embedData.html || null,
            categoryId: categoryId || null,
          },
        })
        results.push(video)
      } catch (err: any) {
        errors.push(`${url} - ${err.message || 'Hata'}`)
      }
    }

    return NextResponse.json({
      videos: results,
      added: results.length,
      errors,
      total: urls.length,
    })
  } catch (error) {
    console.error('Admin TikTok create error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// PATCH - update a TikTok video
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await req.json()
    const { id, isActive, sortOrder, categoryId, title } = body

    if (!id) {
      return NextResponse.json({ error: 'Video ID gerekli' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder
    if (categoryId !== undefined) updateData.categoryId = categoryId || null
    if (title !== undefined) updateData.title = title

    const video = await prisma.tikTokVideo.update({
      where: { id },
      data: updateData,
      include: { category: { select: { id: true, title: true } } },
    })

    return NextResponse.json({ video })
  } catch (error) {
    console.error('Admin TikTok update error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// DELETE - remove a TikTok video
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Video ID gerekli' }, { status: 400 })
    }

    await prisma.tikTokVideo.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin TikTok delete error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}
