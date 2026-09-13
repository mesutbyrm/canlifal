import { NextRequest } from 'next/server'
import prisma from '@/lib/db'
import {
  GET as fortuneGET,
  POST as fortunePOST,
  PATCH as fortunePATCH,
} from '@/app/api/video-streams/[streamId]/fortune-requests/route'

/**
 * Mobil istemcinin kullandığı /api/live/fal-request* kısa yollarını
 * kanonik /api/video-streams/{streamId}/fortune-requests rotasına yönlendirir.
 * Fal isteği mantığının ikinci bir kopyası oluşturulmaz.
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

/** Mobil status adı → kanonik PATCH action'ı */
export function statusToFortuneAction(status: unknown): string | null {
  switch (String(status || '').toLowerCase()) {
    case 'reviewing':
    case 'selected':
    case 'select':
      return 'select'
    case 'answered':
    case 'completed':
    case 'complete':
      return 'complete'
    case 'cancelled':
    case 'canceled':
    case 'refunded':
    case 'refund':
      return 'refund'
    default:
      return null
  }
}

export async function resolveStreamIdForRequest(
  requestId: string,
  fallback?: unknown
): Promise<string | null> {
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim()
  }
  if (!requestId) return null
  const row = await prisma.streamFortuneRequest.findUnique({
    where: { id: requestId },
    select: { streamId: true },
  })
  return row?.streamId || null
}

export function forwardFortuneList(request: NextRequest, streamId: string) {
  const proxied = cloneRequest(
    request,
    `/api/video-streams/${streamId}/fortune-requests`,
    { method: 'GET' }
  )
  return fortuneGET(proxied, { params: { streamId } })
}

export function forwardFortuneCreate(
  request: NextRequest,
  streamId: string,
  payload: Record<string, unknown>
) {
  const proxied = cloneRequest(
    request,
    `/api/video-streams/${streamId}/fortune-requests`,
    { method: 'POST', body: payload }
  )
  return fortunePOST(proxied, { params: { streamId } })
}

export function forwardFortuneAction(
  request: NextRequest,
  streamId: string,
  payload: { requestId: string; action: string }
) {
  const proxied = cloneRequest(
    request,
    `/api/video-streams/${streamId}/fortune-requests`,
    { method: 'PATCH', body: payload }
  )
  return fortunePATCH(proxied, { params: { streamId } })
}
