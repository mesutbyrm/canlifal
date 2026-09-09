import { NextRequest, NextResponse } from 'next/server';
import { getRecentOnlineEvents, cleanupOldOnlineEvents } from '@/lib/presence-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/presence/online-events?since=<ISO>
 * Global Gold online-entrance (USER_ONLINE) feed.
 * Tum site istemcileri buradan cekip id'ye gore dedup ederek karti TEK KEZ oynatir.
 * Auth gerektirmez (yalnizca herkese acik giris kartlari).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');
    const events = await getRecentOnlineEvents(since);

    // Fire-and-forget temizlik (feed sisme yapmasin) - ara sira calis.
    if (Math.random() < 0.1) {
      cleanupOldOnlineEvents().catch(() => {});
    }

    return NextResponse.json({
      events: events.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
      })),
      serverNow: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Online events feed error:', error);
    return NextResponse.json({ events: [], serverNow: new Date().toISOString() });
  }
}
