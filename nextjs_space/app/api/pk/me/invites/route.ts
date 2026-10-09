import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { serializePkMatches } from '@/lib/pk-match'
import { expireAllStalePKs, PK_TIMEOUT_MS } from '@/lib/pk-expiry'

export const dynamic = 'force-dynamic'

/**
 * GET /api/pk/me/invites
 * Oturum açan kullanıcının bekleyen PK davetleri.
 *
 * Query:
 *   ?direction=incoming (varsayılan) | outgoing | all
 *
 * Yanıt: { invites: PkMatch[], incoming: PkMatch[], outgoing: PkMatch[], count }
 * SSE karşılığı: room_event { event: 'pk_invite' | 'pk_requested', battleId, battle }
 */
export async function GET(req: NextRequest) {
  try {
    let userId: string | null = null
    // authenticateRequest kullanıcıyı doğrudan döndürür ({ id, ... }); önceki
    // `mobile.user.id` her zaman undefined olduğundan mobil JWT ile 401 dönüyordu.
    const mobile = await authenticateRequest(req).catch(() => null)
    if (mobile?.id) {
      userId = mobile.id
    } else {
      const session = await getServerSession(authOptions).catch(() => null)
      userId = (session?.user as any)?.id || null
    }
    if (!userId) {
      return NextResponse.json({ error: 'Giriş yapmalısınız' }, { status: 401 })
    }

    await expireAllStalePKs()

    const direction = (req.nextUrl.searchParams.get('direction') || 'incoming').toLowerCase()

    const battles = await prisma.pKBattle.findMany({
      where: {
        status: 'pending',
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const all = await serializePkMatches(battles)
    const withMeta = all.map((m: any) => {
      const raw = battles.find((b: any) => b.id === m.id)
      const createdAt = raw?.createdAt ? new Date(raw.createdAt) : null
      return {
        ...m,
        battleId: m.id,
        challengerId: raw?.user1Id ?? null,
        opponentId: raw?.user2Id ?? null,
        challengerRoomId: raw?.stream1Id ?? null,
        opponentRoomId: raw?.stream2Id ?? null,
        incoming: raw?.user2Id === userId,
        expiresAt: createdAt
          ? new Date(createdAt.getTime() + PK_TIMEOUT_MS).toISOString()
          : null,
      }
    })

    const incoming = withMeta.filter((m: any) => m.incoming)
    const outgoing = withMeta.filter((m: any) => !m.incoming)
    const invites =
      direction === 'outgoing' ? outgoing : direction === 'all' ? withMeta : incoming

    return NextResponse.json({
      invites,
      incoming,
      outgoing,
      count: invites.length,
    })
  } catch (e) {
    console.error('[pk/me/invites] error:', e)
    return NextResponse.json({ error: 'PK davetleri alınamadı' }, { status: 500 })
  }
}
