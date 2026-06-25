import { NextRequest, NextResponse } from 'next/server'
import { getFileUrl } from '@/lib/s3'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const authUser = await authenticateRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json()
    const { cloud_storage_path, isPublic = false } = body

    if (!cloud_storage_path) {
      return NextResponse.json(
        { error: 'cloud_storage_path is required' },
        { status: 400 }
      )
    }

    const url = await getFileUrl(cloud_storage_path, isPublic)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Get URL error:', error)
    return NextResponse.json(
      { error: 'Dosya bağlantısı alınamadı' },
      { status: 500 }
    )
  }
}
