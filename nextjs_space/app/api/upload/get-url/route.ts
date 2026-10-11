import { NextRequest, NextResponse } from 'next/server'
import { getFileUrl } from '@/lib/s3'
import { authenticateRequest } from '@/lib/mobile-auth';

export const dynamic = 'force-dynamic'

// GET handler: some legacy DB records store image URLs pointing directly at this
// endpoint (e.g. `/api/upload/get-url?path=<publicPath>`) and use them as <img> src.
// A GET request would otherwise 405 (POST-only) and render as a broken image.
// For PUBLIC assets we resolve the real file URL and redirect to it so those
// images load. Private assets are not served here (auth cannot be supplied via <img>).
export async function GET(request: NextRequest) {
  try {
    const path = request.nextUrl.searchParams.get('path')
    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Only public assets may be served via an unauthenticated GET.
    const isPublic = path.includes('/public/')
    if (!isPublic) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const url = await getFileUrl(path, true)
    if (!url) {
      return NextResponse.json({ error: 'Dosya bulunamadı' }, { status: 404 })
    }

    return NextResponse.redirect(url, 302)
  } catch (error) {
    console.error('Get URL (GET) error:', error)
    return NextResponse.json({ error: 'Dosya bağlantısı alınamadı' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
