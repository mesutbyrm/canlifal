/**
 * Cursor pagination yardımcı fonksiyonları.
 *
 * Mevcut offset/page tabanlı sayfalama korunur — bu dosya yalnızca
 * yeni uçlar ve kademeli geçiş için cursor tabanlı yardımcılar sağlar.
 *
 * Kullanım:
 *   const { cursor, limit } = parseCursorParams(request)
 *   const items = await prisma.model.findMany({
 *     ...cursorQuery(cursor, limit, { orderBy: { createdAt: 'desc' } })
 *   })
 *   return apiPaginated(items, buildCursorMeta(items, limit, 'id'))
 */

import { NextRequest } from 'next/server'

export interface CursorParams {
  cursor: string | null
  limit: number
}

/**
 * URL'den cursor ve limit parametrelerini çıkarır.
 * Varsayılan limit: 20, max: 100.
 */
export function parseCursorParams(
  req: NextRequest,
  defaultLimit = 20,
  maxLimit = 100
): CursorParams {
  const url = req.nextUrl
  const cursor = url.searchParams.get('cursor') || null
  let limit = parseInt(url.searchParams.get('limit') || String(defaultLimit), 10)
  if (isNaN(limit) || limit < 1) limit = defaultLimit
  if (limit > maxLimit) limit = maxLimit
  return { cursor, limit }
}

/**
 * Prisma findMany için cursor query parametreleri üretir.
 * Cursor varsa skip:1 + cursor, yoksa baştan.
 */
export function cursorQuery(
  cursor: string | null,
  limit: number,
  extra?: Record<string, any>
): Record<string, any> {
  const q: Record<string, any> = {
    take: limit + 1, // hasMore kontrolü için 1 fazla al
    ...(extra || {}),
  }
  if (cursor) {
    q.cursor = { id: cursor }
    q.skip = 1
  }
  return q
}

/**
 * Cursor meta bilgisi üretir. items fazla alınan +1 öğeyi içerebilir.
 * Fazla öğeyi keser ve hasMore hesaplar.
 */
export function buildCursorMeta<T extends Record<string, any>>(
  items: T[],
  limit: number,
  idField: keyof T = 'id' as keyof T
): { cursor: string | null; hasMore: boolean; limit: number } & { trimmedItems: T[] } {
  const hasMore = items.length > limit
  const trimmed = hasMore ? items.slice(0, limit) : items
  const nextCursor = trimmed.length > 0 ? String(trimmed[trimmed.length - 1][idField]) : null
  return {
    cursor: hasMore ? nextCursor : null,
    hasMore,
    limit,
    trimmedItems: trimmed,
  }
}

/**
 * Offset tabanlı sayfalama parametrelerini çıkarır (mevcut uçlarla uyumluluk).
 */
export function parseOffsetParams(
  req: NextRequest,
  defaultLimit = 20,
  maxLimit = 100
): { page: number; limit: number; skip: number } {
  const url = req.nextUrl
  let page = parseInt(url.searchParams.get('page') || '1', 10)
  let limit = parseInt(url.searchParams.get('limit') || String(defaultLimit), 10)
  if (isNaN(page) || page < 1) page = 1
  if (isNaN(limit) || limit < 1) limit = defaultLimit
  if (limit > maxLimit) limit = maxLimit
  return { page, limit, skip: (page - 1) * limit }
}

/**
 * İstek cursor (imleç) modunda mı?
 *
 * Geriye dönük uyumluluk: mevcut istemciler `cursor` / `paginate` göndermediği
 * için varsayılan davranış (offset/limitsiz) hiç değişmez. Yalnızca istemci
 * açıkça `?cursor=...` veya `?paginate=cursor` gönderdiğinde imleç modu açılır.
 */
export function isCursorMode(req: NextRequest): boolean {
  const sp = req.nextUrl ? req.nextUrl.searchParams : new URL(req.url).searchParams
  return sp.has('cursor') || sp.get('paginate') === 'cursor'
}

/**
 * Tek adımda imleçli sayfa çeker.
 * findMany fonksiyonuna hazır Prisma argümanları verilir; +1 kayıt alınıp
 * kırpılır ve { items, meta } döner.
 */
export async function fetchCursorPage<T extends Record<string, any>>(
  findMany: (args: any) => Promise<T[]>,
  cursor: string | null,
  limit: number,
  args: Record<string, any>,
  idField: keyof T = 'id' as keyof T
): Promise<{ items: T[]; meta: { cursor: string | null; hasMore: boolean; limit: number } }> {
  const rows = await findMany(cursorQuery(cursor, limit, args))
  const { trimmedItems, ...meta } = buildCursorMeta(rows, limit, idField)
  return { items: trimmedItems, meta }
}
