import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import {
  getCachedGiftTypes,
  getCachedPaymentMethods,
  getCachedCreditPackages,
  getCachedAllPlatformSettings,
  getCachedHomepageButtons,
  getCachedHomepageFortuneCards,
  getCachedFortuneRequestTypes,
} from '@/lib/cache'

export const dynamic = 'force-dynamic'

/**
 * Warmup endpoint — reduces cold-start latency after a deploy / idle period.
 *
 * Call this once after deployment (or on a schedule) to:
 *  - open a DB connection from the pool (SELECT 1)
 *  - pre-populate the hot in-memory caches (gift list, platform settings,
 *    payment methods, credit packages, homepage content, fortune types)
 *
 * All work is best-effort: a failure in any single step does not fail the
 * whole request, so this is safe to hit right after a fresh boot.
 */
export async function GET() {
  const start = Date.now()
  const steps: Record<string, { ok: boolean; ms: number; error?: string }> = {}

  async function step(name: string, fn: () => Promise<any>) {
    const t = Date.now()
    try {
      await fn()
      steps[name] = { ok: true, ms: Date.now() - t }
    } catch (e: any) {
      steps[name] = { ok: false, ms: Date.now() - t, error: e?.message || 'error' }
    }
  }

  // DB connection warmup
  await step('db', () => prisma.$queryRaw`SELECT 1`)

  // Cache warmup (run in parallel — each is independently guarded)
  await Promise.all([
    step('giftTypes', () => getCachedGiftTypes()),
    step('paymentMethods', () => getCachedPaymentMethods()),
    step('creditPackages', () => getCachedCreditPackages()),
    step('platformSettings', () => getCachedAllPlatformSettings()),
    step('homepageButtons', () => getCachedHomepageButtons()),
    step('homepageFortuneCards', () => getCachedHomepageFortuneCards()),
    step('fortuneRequestTypes', () => getCachedFortuneRequestTypes()),
  ])

  const ms = Date.now() - start
  const ok = Object.values(steps).every((s) => s.ok)
  return NextResponse.json({ ok, ms, steps }, { headers: { 'Cache-Control': 'no-store' } })
}
