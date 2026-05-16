import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import prisma from '@/lib/db'

export const dynamic = 'force-dynamic'

const ADMIN_ROLES = ['admin', 'yonetici', 'moderator']

// GET - list all videos with categories for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const categories = await prisma.trendVideoCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        videos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        }
      }
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Admin trend videos error:', error)
    return NextResponse.json({ error: 'Veriler yüklenemedi' }, { status: 500 })
  }
}

// POST - create/update category or video
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !ADMIN_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const body = await req.json()
    const { action } = body

    // ---- CATEGORY CRUD ----
    if (action === 'create_category') {
      const { title, description } = body
      if (!title?.trim()) return NextResponse.json({ error: 'Başlık gerekli' }, { status: 400 })
      const slug = title.trim().toLowerCase()
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
        .replace(/ş/g, 's').replace(/ç/g, 'c').replace(/ğ/g, 'g')
        .replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const maxOrder = await prisma.trendVideoCategory.aggregate({ _max: { sortOrder: true } })
      const category = await prisma.trendVideoCategory.create({
        data: { title: title.trim(), slug: slug || `cat-${Date.now()}`, description: description?.trim() || null, sortOrder: (maxOrder._max.sortOrder || 0) + 1 }
      })
      return NextResponse.json({ category })
    }

    if (action === 'update_category') {
      const { id, title, description, isActive } = body
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      const data: any = {}
      if (title !== undefined) data.title = title.trim()
      if (description !== undefined) data.description = description?.trim() || null
      if (isActive !== undefined) data.isActive = isActive
      const category = await prisma.trendVideoCategory.update({ where: { id }, data })
      return NextResponse.json({ category })
    }

    if (action === 'delete_category') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      await prisma.trendVideoCategory.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    // ---- VIDEO CRUD ----
    if (action === 'create_video') {
      const { categoryId, title, youtubeId, thumbnailUrl, channelName, duration } = body
      if (!categoryId || !title?.trim() || !youtubeId?.trim()) {
        return NextResponse.json({ error: 'Kategori, başlık ve YouTube ID gerekli' }, { status: 400 })
      }
      const maxOrder = await prisma.trendVideo.aggregate({
        where: { categoryId },
        _max: { sortOrder: true }
      })
      const video = await prisma.trendVideo.create({
        data: {
          categoryId,
          title: title.trim(),
          youtubeId: youtubeId.trim(),
          thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/vx5dSS3BBOk/maxresdefault.jpg`,
          channelName: channelName?.trim() || null,
          duration: duration?.trim() || null,
          sortOrder: (maxOrder._max.sortOrder || 0) + 1,
        }
      })
      return NextResponse.json({ video })
    }

    // Bulk create videos
    if (action === 'create_videos_bulk') {
      const { categoryId, videos } = body
      if (!categoryId || !Array.isArray(videos) || videos.length === 0) {
        return NextResponse.json({ error: 'Kategori ve video listesi gerekli' }, { status: 400 })
      }
      const maxOrder = await prisma.trendVideo.aggregate({
        where: { categoryId },
        _max: { sortOrder: true }
      })
      let order = (maxOrder._max.sortOrder || 0) + 1
      const created = []
      for (const v of videos) {
        if (!v.title?.trim() || !v.youtubeId?.trim()) continue
        const video = await prisma.trendVideo.create({
          data: {
            categoryId,
            title: v.title.trim(),
            youtubeId: v.youtubeId.trim(),
            thumbnailUrl: v.thumbnailUrl || `https://i.ytimg.com/vi/EP_lJSr90jE/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLCgy0LBXIoyjKH0PpOW-HGIBeOzGA`,
            channelName: v.channelName?.trim() || null,
            duration: v.duration?.trim() || null,
            sortOrder: order++,
          }
        })
        created.push(video)
      }
      return NextResponse.json({ videos: created, count: created.length })
    }

    if (action === 'update_video') {
      const { id, title, youtubeId, thumbnailUrl, channelName, duration, isActive, sortOrder, categoryId } = body
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      const data: any = {}
      if (title !== undefined) data.title = title.trim()
      if (youtubeId !== undefined) {
        data.youtubeId = youtubeId.trim()
        if (!thumbnailUrl) data.thumbnailUrl = `https://i.ytimg.com/vi/qod7eBE0mTk/maxresdefault.jpg`
      }
      if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl
      if (channelName !== undefined) data.channelName = channelName?.trim() || null
      if (duration !== undefined) data.duration = duration?.trim() || null
      if (isActive !== undefined) data.isActive = isActive
      if (sortOrder !== undefined) data.sortOrder = sortOrder
      if (categoryId !== undefined) data.categoryId = categoryId
      const video = await prisma.trendVideo.update({ where: { id }, data })
      return NextResponse.json({ video })
    }

    if (action === 'delete_video') {
      const { id } = body
      if (!id) return NextResponse.json({ error: 'ID gerekli' }, { status: 400 })
      await prisma.trendVideo.delete({ where: { id } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 })
  } catch (error) {
    console.error('Admin trend videos action error:', error)
    return NextResponse.json({ error: 'İşlem başarısız' }, { status: 500 })
  }
}
