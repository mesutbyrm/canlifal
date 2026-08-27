export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { uploadToR2 } from '@/lib/r2-storage'
import { getMp4DurationSec } from '@/lib/mp4-duration'
import {
  normalizeVisibility,
  normalizeCommentSetting,
  safeFloat,
  mapVideo,
  createShortVideoRecord,
} from '@/lib/short-videos'

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

    // Rate limit: video yükleme
    const rateLimited = await guardRateLimit(req, 'upload', { userId: authUser.id })
    if (rateLimited) return rateLimited

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

    // Ek meta veriler (opsiyonel)
    const visibility = normalizeVisibility(formData.get('visibility') as string)
    const commentSetting = normalizeCommentSetting(formData.get('commentSetting') as string)
    const allowDuet = (formData.get('allowDuet') as string) !== 'false'
    const locationName = ((formData.get('locationName') as string) || '').trim() || null
    const locationLat = safeFloat(formData.get('locationLat'))
    const locationLng = safeFloat(formData.get('locationLng'))
    const musicId = ((formData.get('musicId') as string) || '').trim() || null
    const duetOfId = ((formData.get('duetOfId') as string) || '').trim() || null

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

    // Ortak oluşturma mantığı (müzik/duet doğrulama, kayıt, mention+hashtag, bildirim)
    const authorName = (authUser as any).name || (authUser as any).username || 'Bir kullanıcı'
    const video = await createShortVideoRecord({
      userId: authUser.id,
      authorName,
      videoUrl: videoResult.url,
      thumbnailUrl,
      description,
      durationSec,
      visibility,
      commentSetting,
      allowDuet,
      locationName,
      locationLat,
      locationLng,
      musicId,
      duetOfId,
    })

    return NextResponse.json(
      { success: true, data: { video: mapVideo(video, authUser.id) } },
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
