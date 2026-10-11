import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import {
  normaliseDuration,
  readContextPair,
  serializeBattle,
} from '@/lib/gift-battles'

export const dynamic = 'force-dynamic'

const BATTLE_INCLUDE = {
  participants: {
    select: { participantId: true, displayName: true, score: true },
  },
} as const

/**
 * GET /api/gifts/battles
 * List gift battles for a context. Public (no auth), mirroring the existing
 * contract: returns a JSON array, newest first, active battles only unless a
 * different `status` is requested.
 *
 * Query: context|contextType|roomType, contextId|roomId|voiceRoomId, status
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const q: Record<string, string> = {}
    sp.forEach((v, k) => { q[k] = v })
    const { context, contextId } = readContextPair(q)

    const statusRaw = (sp.get('status') || 'active').toLowerCase()
    const where: any = {}
    if (context) where.context = context
    if (contextId) where.contextId = contextId

    if (statusRaw === 'active') {
      // An expired row is no longer "active" even if never written back.
      where.status = 'active'
      where.endsAt = { gt: new Date() }
    } else if (statusRaw !== 'all') {
      where.status = statusRaw
    }

    const rows = await prisma.giftBattle.findMany({
      where,
      include: BATTLE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    const battles = await Promise.all(rows.map(r => serializeBattle(r as any)))
    return NextResponse.json(battles)
  } catch (error) {
    console.error('[gifts/battles GET]', error)
    return NextResponse.json({ error: 'Hediye savaşları alınamadı' }, { status: 500 })
  }
}

/**
 * POST /api/gifts/battles
 * Start a gift battle in a room. Auth required (mobile JWT or web session).
 *
 * Accepts both body shapes the client sends:
 *   { context, contextId|roomId|voiceRoomId, durationSec|duration, participants }
 *   { action: 'start', ... }
 * `participants`: [{ participantId|userId, displayName }]
 *
 * Idempotent: if an active battle already exists for the context it is
 * returned as-is instead of creating a duplicate.
 */
export async function POST(request: NextRequest) {
  try {
    const mobileUser = await authenticateRequest(request)
    const webSession = !mobileUser ? await getServerSession(authOptions) : null
    const userId = mobileUser?.id || (webSession?.user as any)?.id
    if (!userId) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { context, contextId } = readContextPair(body || {})
    if (!context || !contextId) {
      return NextResponse.json(
        { error: 'context ve contextId gereklidir' },
        { status: 400 }
      )
    }

    const rawParticipants = Array.isArray(body?.participants) ? body.participants : []
    const seen = new Set<string>()
    const participants: { participantId: string; displayName: string | null }[] = []
    for (const p of rawParticipants) {
      const id = String(p?.participantId || p?.userId || p?.id || '').trim()
      if (!id || seen.has(id)) continue
      seen.add(id)
      participants.push({
        participantId: id,
        displayName: (p?.displayName || p?.name || p?.username || null) as string | null,
      })
    }
    if (participants.length < 2) {
      return NextResponse.json(
        { error: 'En az iki yarışmacı gereklidir' },
        { status: 400 }
      )
    }

    // Idempotency: reuse an already running battle for this context.
    const existing = await prisma.giftBattle.findFirst({
      where: { context, contextId, status: 'active', endsAt: { gt: new Date() } },
      include: BATTLE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      return NextResponse.json(await serializeBattle(existing as any))
    }

    const durationSec = normaliseDuration(body?.durationSec ?? body?.duration)
    const startedAt = new Date()
    const endsAt = new Date(startedAt.getTime() + durationSec * 1000)

    const created = await prisma.$transaction(async (tx) => {
      const battle = await tx.giftBattle.create({
        data: {
          context,
          contextId,
          createdById: userId,
          status: 'active',
          durationSec,
          startedAt,
          endsAt,
          participants: {
            create: participants.map(p => ({
              participantId: p.participantId,
              displayName: p.displayName,
            })),
          },
        },
        include: BATTLE_INCLUDE,
      })
      return battle
    })

    return NextResponse.json(await serializeBattle(created as any), { status: 201 })
  } catch (error) {
    console.error('[gifts/battles POST]', error)
    return NextResponse.json({ error: 'Hediye savaşı başlatılamadı' }, { status: 500 })
  }
}
