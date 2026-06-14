export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { uploadToR2 } from '@/lib/r2-storage'
import { getMp4DurationSec } from '@/lib/mp4-duration'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_DURATION_SEC = 15

/**
 * POST /api/short-videos/upload
 * Auth: ZORUNLU
 * Content-Type: multipart/form-data
 * Fields: video (file, mp4), thumbnail (file, optional), description (string, optional)
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await authenticateRequest(req)
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Giriş yapmanız gerekiyor' } },
        { status: 401 }
      )
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FORM', message: 'multipart/form-data gerekli' } },
        { status: 400 }
      )
    }

    const videoFile = formData.get('video') as File | null
    const thumbnailFile = formData.get('thumbnail') as File | null
    const description = (formData.get('description') as string || '').slice(0, 500) || null

    if (!videoFile || !(videoFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_VIDEO', message: 'Video dosyası gerekli' } },
        { status: 400 }
      )
    }

    // Validate content type
    if (!videoFile.type.includes('mp4') && !videoFile.type.includes('video/mp4')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_FORMAT', message: 'Sadece MP4 formatı kabul edilir' } },
        { status: 400 }
      )
    }

    // Validate size
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'FILE_TOO_LARGE', message: 'Dosya boyutu en fazla 10MB olabilir' } },
        { status: 400 }
      )
    }

    // Read video buffer
    const videoArrayBuffer = await videoFile.arrayBuffer()
    const videoBuffer = Buffer.from(videoArrayBuffer)

    // Validate duration from MP4 mvhd atom
    const durationSec = getMp4DurationSec(videoBuffer)
    if (durationSec !== null && durationSec > MAX_DURATION_SEC) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DURATION_TOO_LONG',
            message: `Video süresi en fazla ${MAX_DURATION_SEC} saniye olabilir (${durationSec}s)`,
          },
        },
        { status: 400 }
      )
    }

    // Upload video to R2
    const videoResult = await uploadToR2(videoBuffer, 'shorts/videos', '.mp4', 'video/mp4')

    // Upload thumbnail if provided
    let thumbnailUrl: string | null = null
    if (thumbnailFile && thumbnailFile instanceof File && thumbnailFile.size > 0) {
      const thumbArrayBuffer = await thumbnailFile.arrayBuffer()
      const thumbBuffer = Buffer.from(thumbArrayBuffer)
      const ext = thumbnailFile.type.includes('png') ? '.png' : '.jpg'
      const contentType = thumbnailFile.type || 'image/jpeg'
      const thumbResult = await uploadToR2(thumbBuffer, 'shorts/thumbnails', ext, contentType)
      thumbnailUrl = thumbResult.url
    }

    // Create DB record
    const video = await prisma.shortVideo.create({
      data: {
        userId: authUser.id,
        videoUrl: videoResult.url,
        thumbnailUrl,
        description,
        durationSec,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          video: {
            id: video.id,
            userId: video.userId,
            videoUrl: video.videoUrl,
            thumbnailUrl: video.thumbnailUrl,
            description: video.description,
            viewsCount: video.viewsCount,
            likesCount: video.likesCount,
            commentsCount: video.commentsCount,
            durationSec: video.durationSec,
            createdAt: video.createdAt.toISOString(),
            author: {
              id: video.user.id,
              userId: video.user.id,
              username: video.user.username || video.user.name || 'user',
              displayName: video.user.name || video.user.username || 'Kullanıcı',
              avatarUrl: video.user.image,
            },
            likedByMe: false,
            viewedByMe: false,
          },
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[short-videos] Upload error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'UPLOAD_FAILED', message: 'Video yüklenemedi' } },
      { status: 500 }
    )
  }
}
