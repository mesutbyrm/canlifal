import { NextRequest, NextResponse } from 'next/server'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { resolveMediaUrl } from '@/lib/media-url'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authUser = await authenticateRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, contentType, isPublic = false, folder } = body

    // Map an optional "folder"/"purpose" hint to an organized subfolder under
    // the R2 "gift/" root. Unknown/empty values fall back to gift/uploads.
    const ALLOWED_FOLDERS: Record<string, string> = {
      profile: 'gift/profiles',
      profiles: 'gift/profiles',
      social: 'gift/social',
      sosyal: 'gift/social',
      post: 'gift/social',
      gift: 'gift/gifts',
      gifts: 'gift/gifts',
      fortune: 'gift/fortunes',
      chat: 'gift/chat',
      uploads: 'gift/uploads',
    }
    const targetFolder =
      (typeof folder === 'string' && ALLOWED_FOLDERS[folder]) || 'gift/uploads'

    if (!fileName || !contentType) {
      return NextResponse.json(
        { error: 'fileName and contentType are required' },
        { status: 400 }
      )
    }

    // Validate file type - accept images and videos
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Sadece görsel ve video dosyaları kabul edilir' },
        { status: 400 }
      )
    }

    const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
      fileName,
      contentType,
      isPublic,
      targetFolder
    )

    // Also return the fully-qualified public CDN URL so clients (web + mobile)
    // can store/render the asset directly without needing to reconstruct it.
    const publicUrl = isPublic ? resolveMediaUrl(cloud_storage_path) : null

    return NextResponse.json({ uploadUrl, cloud_storage_path, publicUrl })
  } catch (error) {
    console.error('Presigned URL error:', error)
    return NextResponse.json(
      { error: 'Yükleme bağlantısı oluşturulamadı' },
      { status: 500 }
    )
  }
}
