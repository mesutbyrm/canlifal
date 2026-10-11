import { NextRequest, NextResponse } from 'next/server'
import { PATCH as patchStream } from '../route'

export const dynamic = 'force-dynamic'

// Mobil geri dönüş ucu: PATCH /api/video-streams/{id} ile aynı işi yapar.
export async function POST(
  request: NextRequest,
  { params }: { params: { streamId: string } }
) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const backgroundUrl = body?.backgroundUrl ?? body?.imageUrl ?? body?.url ?? null
  if (typeof backgroundUrl !== 'string' || !backgroundUrl.trim()) {
    return NextResponse.json({ error: 'backgroundUrl gerekli' }, { status: 400 })
  }
  const forwarded = new NextRequest(request.url, {
    method: 'PATCH',
    headers: request.headers,
    body: JSON.stringify({ backgroundUrl: backgroundUrl.trim() }),
  })
  return patchStream(forwarded, { params })
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: { streamId: string } }
) {
  return POST(request, ctx)
}
