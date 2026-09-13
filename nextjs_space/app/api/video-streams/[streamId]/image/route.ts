import { NextRequest, NextResponse } from 'next/server'
import { PATCH as patchStream } from '../route'

export const dynamic = 'force-dynamic'

// Mobil geri dönüş ucu: yayın görseli / görsel modu.
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
  const imageUrl = body?.broadcastImage ?? body?.imageUrl ?? body?.url ?? null
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return NextResponse.json({ error: 'imageUrl gerekli' }, { status: 400 })
  }
  const payload: Record<string, unknown> = { broadcastImage: imageUrl.trim() }
  if (body?.isImageMode !== undefined) payload.isImageMode = !!body.isImageMode
  else payload.isImageMode = true

  const forwarded = new NextRequest(request.url, {
    method: 'PATCH',
    headers: request.headers,
    body: JSON.stringify(payload),
  })
  return patchStream(forwarded, { params })
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: { streamId: string } }
) {
  return POST(request, ctx)
}
