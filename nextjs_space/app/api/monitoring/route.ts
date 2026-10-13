import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { isAdminRole } from '@/lib/admin-utils'
import { getMonitoringSnapshot } from '@/lib/perf'

export const dynamic = 'force-dynamic'

/**
 * Admin-gated performance monitoring snapshot.
 *
 * Returns per-route response-time aggregates (avg/max/count), the routes that
 * are averaging over the slow threshold (500ms), a ring buffer of the most
 * recent slow requests, plus process memory/uptime — all collected in-memory
 * per running instance (no external APM required).
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  if (!session?.user || !isAdminRole(role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  return NextResponse.json(getMonitoringSnapshot(), {
    headers: { 'Cache-Control': 'no-store' },
  })
}
