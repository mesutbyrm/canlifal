export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { createShortVideoRecord, mapVideo, safeFloat } from '@/lib/short-videos'

/**
 * POST /api/short-videos/register
 * Auth: ZORUNLU
 * Body(JSON): {
 *   videoUrl (string, ZORUNLU — presigned upload sonrası publicUrl),
 *   thumbnailUrl?, description?, durationSec?,
 *   visibility?, commentSetting?, allowDuet?,
 *   locationName?, locationLat?, locationLng?, musicId?, duetOfId?
 * }
 * Doğrudan R2 yüklemesinden sonra veritabanı kaydı oluşturur (stüdyo/arka plan yüklemeleri).
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

    let body: any = {}
    try {
      body = await req.json()
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_BODY', message: 'Geçersiz istek gövdesi' } },
        { status: 400 }
      )
    }

    const videoUrl = (body?.videoUrl || '').toString().trim()
    if (!videoUrl || !/^https?:\/\//.test(videoUrl)) {
      return NextResponse.json(
        { success: false, error: { code: 'MISSING_VIDEO_URL', message: 'Geçerli bir videoUrl gerekli' } },
        { status: 400 }
      )
    }

    const authorName = (authUser as any).name || (authUser as any).username || 'Bir kullanıcı'

    const video = await createShortVideoRecord({
      userId: authUser.id,
      authorName,
      videoUrl,
      thumbnailUrl: (body?.thumbnailUrl || '').toString().trim() || null,
      description: body?.description ?? null,
      durationSec: safeFloat(body?.durationSec),
      visibility: body?.visibility,
      commentSetting: body?.commentSetting,
      allowDuet: body?.allowDuet,
      locationName: (body?.locationName || '').toString().trim() || null,
      locationLat: safeFloat(body?.locationLat),
      locationLng: safeFloat(body?.locationLng),
      musicId: (body?.musicId || '').toString().trim() || null,
      duetOfId: (body?.duetOfId || '').toString().trim() || null,
    })

    return NextResponse.json(
      { success: true, data: { video: mapVideo(video, authUser.id) } },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[short-videos] register error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'REGISTER_FAILED', message: 'Video kaydı oluşturulamadı' } },
      { status: 500 }
    )
  }
}
