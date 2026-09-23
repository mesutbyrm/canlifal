import { NextRequest } from 'next/server'
import {
  GET as listModerators,
  POST as addModerator,
  DELETE as removeModerator,
} from '../moderators/route'

export const dynamic = 'force-dynamic'

// Tekil ad alias'ı — mobil istemci /moderators başarısız olursa buraya düşüyor.
export async function GET(
  request: NextRequest,
  ctx: { params: { streamId: string } }
) {
  return listModerators(request, ctx)
}

export async function POST(
  request: NextRequest,
  ctx: { params: { streamId: string } }
) {
  return addModerator(request, ctx)
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: { streamId: string } }
) {
  const url = new URL(request.url)
  const queryUserId = url.searchParams.get('userId')
  let body: any = null
  try {
    body = await request.json()
  } catch {
    body = null
  }
  const userId = body?.userId ?? queryUserId
  const forwarded = new NextRequest(request.url, {
    method: 'DELETE',
    headers: request.headers,
    body: JSON.stringify({ userId }),
  })
  return removeModerator(forwarded, ctx)
}
