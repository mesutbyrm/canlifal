import { NextResponse } from 'next/server'
import { getCommunityLeaderboards } from '@/lib/services/leaderboard-service'

export const dynamic = 'force-dynamic'

/**
 * @deprecated GET /api/leaderboard
 *
 * Kanonik uç: GET /api/leaderboards (bu ucun döndürdüğü tüm alanları da içerir).
 * Bu uç yalnızca eski istemcilerin bozulmaması için tutuluyor ve aynı ortak
 * servis katmanını kullanır. Yeni geliştirmelerde /api/leaderboards kullanın.
 */
export async function GET() {
  console.warn('[DEPRECATED] GET /api/leaderboard → kanonik: /api/leaderboards')
  try {
    const data = await getCommunityLeaderboards()
    return NextResponse.json(data, {
      headers: {
        Deprecation: 'true',
        Link: '</api/leaderboards>; rel="successor-version"',
      },
    })
  } catch (error) {
    console.error('Leaderboard error:', error)
    return NextResponse.json({
      topReferrers: [],
      topFortuneUsers: [],
      topSharers: [],
    })
  }
}
