import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { generatePresignedUploadUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
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

    // Validate file type for images - accept all image formats
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'image/bmp', 'image/tiff', 'image/ico', 'image/x-icon',
      'image/avif', 'image/heic', 'image/heif', 'image/apng'
    ]
    if (!contentType.startsWith('image/') && !allowedTypes.includes(contentType)) {
      return NextResponse.json(
        { error: 'Sadece görsel dosyaları kabul edilir' },
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
