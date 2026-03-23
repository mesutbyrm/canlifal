import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { getFileUrl } from '@/lib/s3'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
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
