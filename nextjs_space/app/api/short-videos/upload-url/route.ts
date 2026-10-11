export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/mobile-auth'
import { getPresignedUploadUrl } from '@/lib/r2-storage'

/**
 * POST /api/short-videos/upload-url
 * Auth: ZORUNLU
 * Body(JSON): { type: 'video' | 'thumbnail', contentType?: string, ext?: string }
 * Arka planda / büyük dosya yüklemeleri için doğrudan R2'ye presigned PUT URL üretir.
 * İstemci dönen uploadUrl'e ham baytları PUT eder (Content-Type başlığı ile),
 * ardından publicUrl'i /register'a gönderir.
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
      body = {}
    }

    const type = (body?.type || 'video').toString()

    let folder = 'shorts/videos'
    let ext = '.mp4'
    let contentType = 'video/mp4'

    if (type === 'thumbnail') {
      folder = 'shorts/thumbnails'
      const ct = (body?.contentType || 'image/jpeg').toString()
      contentType = ct.includes('png') ? 'image/png' : 'image/jpeg'
      ext = ct.includes('png') ? '.png' : '.jpg'
    } else {
      // video
      const ct = (body?.contentType || 'video/mp4').toString()
      if (ct.includes('quicktime') || ct.includes('mov')) {
        contentType = 'video/quicktime'
        ext = '.mov'
      } else {
        contentType = 'video/mp4'
        ext = '.mp4'
      }
    }

    const presigned = await getPresignedUploadUrl(folder, ext, contentType)

    return NextResponse.json({
      success: true,
      data: {
        key: presigned.key,
        uploadUrl: presigned.uploadUrl,
        publicUrl: presigned.publicUrl,
        contentType,
        expiresIn: presigned.expiresIn,
      },
    })
  } catch (error: any) {
    console.error('[short-videos] upload-url error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'PRESIGN_FAILED', message: 'Yükleme adresi oluşturulamadı' } },
      { status: 500 }
    )
  }
}
