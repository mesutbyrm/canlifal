import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { readContextPair, serializeGoal } from '@/lib/gift-battles'

export const dynamic = 'force-dynamic'

/**
 * GET /api/gifts/goals
 * List gift goals for a context. Public (no auth), returns a JSON array with
 * active goals first — matching the existing contract the client parses.
 *
 * Query: context|contextType|roomType, contextId|roomId|voiceRoomId, status
 */
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const q: Record<string, string> = {}
    sp.forEach((v, k) => { q[k] = v })
    const { context, contextId } = readContextPair(q)

    const status = (sp.get('status') || '').toLowerCase()
    const where: any = {}
    if (context) where.context = context
    if (contextId) where.contextId = contextId
    if (status && status !== 'all') where.status = status

    const rows = await prisma.giftGoal.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: 20,
    })

    const goals = await Promise.all(rows.map(r => serializeGoal(r as any)))
    // Active goals first, newest first inside each group.
    goals.sort((a, b) => {
      const aActive = a.status === 'active' ? 0 : 1
      const bActive = b.status === 'active' ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      return b.startedAt.localeCompare(a.startedAt)
    })
    return NextResponse.json(goals)
  } catch (error) {
    console.error('[gifts/goals GET]', error)
    return NextResponse.json({ error: 'Hediye hedefleri alınamadı' }, { status: 500 })
  }
}

/**
 * POST /api/gifts/goals
 * Create a gift goal for a room. Auth required (mobile JWT or web session);
 * the authenticated user becomes the goal owner.
 *
 * Body: { context, contextId|roomId, title, targetAmount }
 * Idempotent: an already active goal for the context is returned instead of
 * creating a second one.
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

    const targetAmount = Number(body?.targetAmount ?? body?.target ?? body?.amount)
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      return NextResponse.json(
        { error: 'Geçerli bir hedef tutarı gereklidir' },
        { status: 400 }
      )
    }

    const existing = await prisma.giftGoal.findFirst({
      where: { context, contextId, status: 'active' },
      orderBy: { startedAt: 'desc' },
    })
    if (existing) {
      return NextResponse.json(await serializeGoal(existing as any))
    }

    const title = String(body?.title || body?.name || '').trim() || 'Hedef'
    const created = await prisma.giftGoal.create({
      data: {
        context,
        contextId,
        ownerId: userId,
        title,
        targetAmount: Math.round(targetAmount),
        status: 'active',
      },
    })

    return NextResponse.json(await serializeGoal(created as any), { status: 201 })
  } catch (error) {
    console.error('[gifts/goals POST]', error)
    return NextResponse.json({ error: 'Hediye hedefi oluşturulamadı' }, { status: 500 })
  }
}
