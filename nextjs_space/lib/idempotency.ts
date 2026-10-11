/**
 * lib/idempotency.ts — Generic Idempotency-Key support for mutating endpoints.
 *
 * Financial operations (payment requests, withdrawals) must never be applied
 * twice when a client retries or a user double-taps. A client sends:
 *
 *   Idempotency-Key: <unique-string>
 *
 * and the first successful response for that key is replayed on every retry.
 *
 * Usage in a route handler:
 *
 *   const replay = await beginIdempotent(req, 'withdrawal', userId)
 *   if (replay.response) return replay.response          // cached or in-flight
 *   ... do the work ...
 *   await completeIdempotent(replay.record, 200, payload)
 *   return NextResponse.json(payload)
 *
 * The key is OPTIONAL: when the client sends no Idempotency-Key the guard is a
 * no-op, so existing clients are unaffected.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'

/** How long a completed key is replayable. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/** An in-flight request older than this is considered abandoned and retried. */
const IN_FLIGHT_STALE_MS = 60 * 1000 // 1 minute

export type IdempotencyOutcome = {
  /** Non-null when the caller should return this response immediately. */
  response: NextResponse | null
  /** The reserved record id; pass to completeIdempotent(). Null when no key was sent. */
  record: string | null
}

export function getIdempotencyKey(req: NextRequest): string | null {
  const key = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key')
  if (!key) return null
  const trimmed = key.trim()
  if (!trimmed || trimmed.length > 255) return null
  return trimmed
}

/**
 * Reserves the key for this request.
 *
 * - No Idempotency-Key header → `{ response: null, record: null }` (no-op).
 * - Key already completed     → `{ response: <replayed response> }`.
 * - Key currently in flight   → `{ response: <409 duplicate> }`.
 * - Key is new                → `{ response: null, record: <id> }`.
 *
 * Never throws: on any storage failure the request is allowed through
 * un-guarded rather than being rejected.
 */
export async function beginIdempotent(
  req: NextRequest,
  scope: string,
  userId?: string | null
): Promise<IdempotencyOutcome> {
  const key = getIdempotencyKey(req)
  if (!key) return { response: null, record: null }

  const compositeKey = `${scope}:${userId ?? 'anon'}:${key}`

  try {
    const existing = await prisma.idempotencyRecord.findUnique({
      where: { key: compositeKey },
    })

    if (existing) {
      // Completed → replay the stored response.
      if (existing.status === 'completed' && existing.responseBody !== null) {
        if (existing.expiresAt > new Date()) {
          return {
            response: NextResponse.json(existing.responseBody, {
              status: existing.responseStatus ?? 200,
              headers: { 'Idempotent-Replay': 'true' },
            }),
            record: null,
          }
        }
        // Expired → fall through and re-reserve below.
      } else if (existing.status === 'in_flight') {
        const age = Date.now() - existing.createdAt.getTime()
        if (age < IN_FLIGHT_STALE_MS) {
          return {
            response: NextResponse.json(
              {
                success: false,
                error: {
                  code: 'DUPLICATE_REQUEST',
                  message: 'Aynı istek halen işleniyor, lütfen bekleyin',
                },
              },
              { status: 409 }
            ),
            record: null,
          }
        }
        // Stale in-flight → treat as abandoned and re-reserve below.
      }

      // Re-reserve an expired / abandoned record.
      const refreshed = await prisma.idempotencyRecord.update({
        where: { key: compositeKey },
        data: {
          status: 'in_flight',
          responseBody: undefined,
          responseStatus: null,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
        },
      })
      return { response: null, record: refreshed.id }
    }

    const created = await prisma.idempotencyRecord.create({
      data: {
        key: compositeKey,
        scope,
        userId: userId ?? null,
        status: 'in_flight',
        expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
      },
    })
    return { response: null, record: created.id }
  } catch (error) {
    // A unique-constraint race means a concurrent identical request won.
    console.error('[idempotency] begin failed:', error)
    return { response: null, record: null }
  }
}

/**
 * Stores the final response so future retries with the same key replay it.
 * Silently ignored when `recordId` is null (no key was sent).
 */
export async function completeIdempotent(
  recordId: string | null,
  status: number,
  body: unknown
): Promise<void> {
  if (!recordId) return
  try {
    await prisma.idempotencyRecord.update({
      where: { id: recordId },
      data: {
        status: 'completed',
        responseStatus: status,
        responseBody: body as any,
      },
    })
  } catch (error) {
    console.error('[idempotency] complete failed:', error)
  }
}

/**
 * Releases a reservation after a failed request so the client can retry.
 * Silently ignored when `recordId` is null.
 */
export async function releaseIdempotent(recordId: string | null): Promise<void> {
  if (!recordId) return
  try {
    await prisma.idempotencyRecord.delete({ where: { id: recordId } })
  } catch (error) {
    console.error('[idempotency] release failed:', error)
  }
}
