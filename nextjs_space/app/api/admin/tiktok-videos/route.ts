export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

const ALLOWED_ROLES = ['admin', 'yonetici', 'moderator']

// GET - fetch all TikTok videos for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const videos = await prisma.tikTokVideo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ videos })
  } catch (error) {
    console.error('Admin TikTok fetch error:', error)
    return NextResponse.json({ error: 'Bir hata oluştu' }, { status: 500 })
  }
}

// POST - add a new TikTok video
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
    }

    const body = await req.json()
    const { tiktokUrl } = body

    if (!tiktokUrl) {
      return NextResponse.json({ error: 'TikTok URL gerekli' }, { status: 400 })
    }

    // Extract video ID from URL
    const idMatch = tiktokUrl.match(/video\/(\d+)/)
    const tiktokId = idMatch ? idMatch[1] : null

    // Fetch oEmbed data
    let embedData: any = {}
    try {
      const oembedRes = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`)
      if (oembedRes.ok) {
        embedData = await oembedRes.json()
      }
    } catch {}

    const video = await prisma.tikTokVideo.create({
      data: {
        tiktokUrl,
        tiktokId,
        title: embedData.title || null,
        authorName: embedData.author_name || null,
        authorAvatar: embedData.thumbnail_url || null,
        thumbnailUrl: embedData.thumbnail_url || null,
        embedHtml: embedData.html || null,
      },
    })

    return NextResponse.json({ video })
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
    const { id, isActive, sortOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'Video ID gerekli' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder

    const video = await prisma.tikTokVideo.update({
      where: { id },
      data: updateData,
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
