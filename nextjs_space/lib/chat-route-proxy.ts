import { NextRequest } from 'next/server'
import { POST as moderationPOST } from '@/app/api/chat/rooms/[roomId]/moderation/route'
import { POST as djPOST } from '@/app/api/chat/rooms/[roomId]/dj/route'
import { PATCH as seatsPATCH } from '@/app/api/chat/rooms/[roomId]/seats/route'
import { DELETE as messagesDELETE } from '@/app/api/chat/rooms/[roomId]/messages/route'
import { POST as songRequestPOST } from '@/app/api/chat/rooms/[roomId]/song-request/route'
import { GET as musicSearchGET } from '@/app/api/music/search/route'

/**
 * Mobil istemcinin kullandığı kısa yol uçlarını mevcut kanonik rotalara yönlendirir.
 * Amaç: moderasyon / DJ / koltuk mantığının ikinci bir kopyasını oluşturmamak.
 */
function cloneRequest(
  request: NextRequest,
  path: string,
  init: { method: string; body?: unknown }
): NextRequest {
  const headers = new Headers(request.headers)
  headers.delete('content-length')
  if (init.body !== undefined) headers.set('content-type', 'application/json')
  const url = new URL(path, request.nextUrl.origin)
  return new NextRequest(url, {
    method: init.method,
    headers,
    ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  })
}

export function forwardToModeration(
  request: NextRequest,
  roomId: string,
  payload: Record<string, unknown>
) {
  const proxied = cloneRequest(request, `/api/chat/rooms/${roomId}/moderation`, {
    method: 'POST',
    body: payload,
  })
  return moderationPOST(proxied, { params: Promise.resolve({ roomId }) })
}

export function forwardToDj(
  request: NextRequest,
  roomId: string,
  payload: Record<string, unknown>
) {
  const proxied = cloneRequest(request, `/api/chat/rooms/${roomId}/dj`, {
    method: 'POST',
    body: payload,
  })
  return djPOST(proxied, { params: { roomId } })
}

export function forwardToSeats(
  request: NextRequest,
  roomId: string,
  payload: Record<string, unknown>
) {
  const proxied = cloneRequest(request, `/api/chat/rooms/${roomId}/seats`, {
    method: 'PATCH',
    body: payload,
  })
  return seatsPATCH(proxied, { params: Promise.resolve({ roomId }) })
}

export function forwardToMessagesDelete(
  request: NextRequest,
  roomId: string,
  messageId?: string
) {
  const qs = messageId ? `?messageId=${encodeURIComponent(messageId)}` : ''
  const proxied = cloneRequest(request, `/api/chat/rooms/${roomId}/messages${qs}`, {
    method: 'DELETE',
  })
  return messagesDELETE(proxied, { params: Promise.resolve({ roomId }) })
}

export function forwardToSongRequest(
  request: NextRequest,
  roomId: string,
  payload: Record<string, unknown>
) {
  const proxied = cloneRequest(request, `/api/chat/rooms/${roomId}/song-request`, {
    method: 'POST',
    body: payload,
  })
  return songRequestPOST(proxied, { params: { roomId } })
}

export function forwardToMusicSearch(request: NextRequest, query: string) {
  const proxied = cloneRequest(
    request,
    `/api/music/search?q=${encodeURIComponent(query)}`,
    { method: 'GET' }
  )
  return musicSearchGET(proxied)
}
