import { NextRequest } from 'next/server'
import { GET as listMessages, POST as sendMessage } from '../../../[userId]/route'

export const dynamic = 'force-dynamic'

// Mobil alias: /api/messages/conversations/{peerId}/messages
// Kanonik uç: /api/messages/{userId}
export async function GET(
  request: NextRequest,
  { params }: { params: { peerId: string } }
) {
  return listMessages(request, { params: { userId: params.peerId } })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { peerId: string } }
) {
  let body: any = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const content = body?.content ?? body?.text ?? body?.message ?? ''
  const forwarded = new NextRequest(request.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify({ content, imageUrl: body?.imageUrl ?? null }),
  })
  return sendMessage(forwarded, { params: { userId: params.peerId } })
}
