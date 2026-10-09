export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { isAdminRole } from '@/lib/admin-utils'
import { deleteFromR2, extractR2Key } from '@/lib/r2-storage'
import {
  mapVideo,
  normalizeCommentSetting,
  normalizeVisibility,
  parseHashtags,
  syncVideoHashtags,
  syncVideoMentions,
} from '@/lib/short-videos'

/**
 * GET /api/short-videos/:id
 * Auth: opsiyonel
 * Tek bir videoyu getirir (paylaşım/deep-link için). Gizlilik uygulanır.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authUser = await authenticateRequest(req).catch(() => null)

    const video = await prisma.shortVideo.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
        music: true,
        hashtags: { include: { hashtag: { select: { name: true } } } },
        ...(authUser
          ? {
              likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              views: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
              saves: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
            }
          : {}),
      },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Gizlilik: herkese açık değilse sadece sahibi görebilir
    if (video.visibility !== 'everyone' && video.userId !== authUser?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu videoya erişim izniniz yok' } },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: { video: mapVideo(video, authUser?.id) },
    })
  } catch (error: any) {
    console.error('[short-videos] Get single error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Video alınamadı' } },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/short-videos/:id
 * Auth: ZORUNLU — yalnızca video.userId === auth user
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id: videoId } = await params

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true, videoUrl: true, thumbnailUrl: true },
    })

    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    // Only owner or admin can delete
    if (video.userId !== authUser.id && authUser.role !== 'admin' && authUser.role !== 'yonetici') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu videoyu silme yetkiniz yok' } },
        { status: 403 }
      )
    }

    // Delete from R2 (fire and forget)
    try {
      const videoKey = extractR2Key(video.videoUrl)
      if (videoKey) await deleteFromR2(videoKey)
      if (video.thumbnailUrl) {
        const thumbKey = extractR2Key(video.thumbnailUrl)
        if (thumbKey) await deleteFromR2(thumbKey)
      }
    } catch (e) {
      console.error('[short-videos] R2 delete error (non-fatal):', e)
    }

    // Delete from DB (cascade deletes likes, comments, views)
    await prisma.shortVideo.delete({ where: { id: videoId } })

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    })
  } catch (error: any) {
    console.error('[short-videos] Delete error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Video silinemedi' } },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/short-videos/:id
 * Auth: ZORUNLU — video sahibi veya admin/yonetici
 * Body(JSON, hepsi opsiyonel): {
 *   description?, thumbnailUrl?, visibility?, commentSetting?,
 *   allowDuet?, locationName?
 * }
 * thumbnailUrl yalnız /api/short-videos/upload-url (type=thumbnail) ile
 * yüklenmiş R2 nesnesi olabilir. Mevcut GET/DELETE davranışı değişmez.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    const { id: videoId } = await params
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      body = {}
    }

    const video = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      select: { id: true, userId: true, thumbnailUrl: true },
    })
    if (!video) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Video bulunamadı' } },
        { status: 404 }
      )
    }

    const isAdmin = isAdminRole(authUser.role)
    if (video.userId !== authUser.id && !isAdmin) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Bu videoyu düzenleme yetkiniz yok' } },
        { status: 403 }
      )
    }

    const data: Record<string, any> = {}
    let descriptionChanged = false
    let newDescription: string | null = null

    if (body?.description !== undefined) {
      newDescription = (body.description ?? '').toString().slice(0, 500).trim() || null
      data.description = newDescription
      descriptionChanged = true
    }
    if (body?.thumbnailUrl !== undefined) {
      const url = (body.thumbnailUrl ?? '').toString().trim()
      if (url) {
        const key = extractR2Key(url)
        if (!url.startsWith('https://') || !key || !key.startsWith('shorts/thumbnails/')) {
          return NextResponse.json(
            { success: false, error: { code: 'INVALID_THUMBNAIL', message: 'Geçersiz kapak görseli' } },
            { status: 400 }
          )
        }
        data.thumbnailUrl = url
      }
    }
    if (body?.visibility !== undefined) data.visibility = normalizeVisibility(body.visibility)
    if (body?.commentSetting !== undefined) {
      data.commentSetting = normalizeCommentSetting(body.commentSetting)
    }
    if (body?.allowDuet !== undefined) data.allowDuet = body.allowDuet !== false
    if (body?.locationName !== undefined) {
      data.locationName = (body.locationName ?? '').toString().slice(0, 120).trim() || null
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NO_CHANGES', message: 'Değişiklik yok' } },
        { status: 400 }
      )
    }

    await prisma.shortVideo.update({ where: { id: videoId }, data })

    // Eski kapak R2'den silinir (hata ölümcül değil).
    if (data.thumbnailUrl && video.thumbnailUrl && video.thumbnailUrl !== data.thumbnailUrl) {
      try {
        const oldKey = extractR2Key(video.thumbnailUrl)
        if (oldKey && oldKey.startsWith('shorts/thumbnails/')) await deleteFromR2(oldKey)
      } catch (e) {
        console.error('[short-videos] old thumbnail delete error (non-fatal):', e)
      }
    }

    if (descriptionChanged) {
      try {
        const keep = parseHashtags(newDescription)
        const stale = await prisma.shortVideoHashtag.findMany({
          where: { videoId, hashtag: { name: { notIn: keep } } },
          select: { id: true, hashtagId: true },
        })
        for (const row of stale) {
          await prisma.shortVideoHashtag.delete({ where: { id: row.id } }).catch(() => {})
          await prisma.hashtag
            .update({ where: { id: row.hashtagId }, data: { videosCount: { decrement: 1 } } })
            .catch(() => {})
        }
        await syncVideoHashtags(videoId, newDescription)
        await syncVideoMentions(videoId, video.userId, '', newDescription)
      } catch (e) {
        console.error('[short-videos] hashtag/mention sync error (non-fatal):', e)
      }
    }

    const updated = await prisma.shortVideo.findUnique({
      where: { id: videoId },
      include: {
        user: { select: { id: true, username: true, name: true, image: true } },
        music: true,
        hashtags: { include: { hashtag: { select: { name: true } } } },
        likes: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
        views: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
        saves: { where: { userId: authUser.id }, select: { id: true }, take: 1 },
      },
    })

    return NextResponse.json({
      success: true,
      data: { video: mapVideo(updated, authUser.id) },
    })
  } catch (error: any) {
    console.error('[short-videos] Update error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Video güncellenemedi' } },
      { status: 500 }
    )
  }
}
