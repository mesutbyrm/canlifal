import { NextRequest, NextResponse } from 'next/server'
import { generatePresignedUploadUrl } from '@/lib/s3'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const authUser = await authenticateRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { fileName, contentType, isPublic = false } = body

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
      isPublic
    )

    return NextResponse.json({ uploadUrl, cloud_storage_path })
  } catch (error) {
    console.error('Presigned URL error:', error)
    return NextResponse.json(
      { error: 'Yükleme bağlantısı oluşturulamadı' },
      { status: 500 }
    )
  }
}
