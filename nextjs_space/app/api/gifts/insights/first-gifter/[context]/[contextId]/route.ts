import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { USER_SELECT, displayNameOf, serializeUser } from '@/lib/gift-insights'

export const dynamic = 'force-dynamic'

const FIRST_GIFTER_BADGE = {
  code: 'efsane_ilk_destekci',
  label: 'Efsane İlk Destekçi',
}

/**
 * GET /api/gifts/insights/first-gifter/{context}/{contextId}
 * The very first person who sent a gift in this stream / room / video.
 * Returns { firstGifter: null } when nobody has sent one yet.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { context: string; contextId: string } }
) {
  try {
    const { context, contextId } = params
    if (!context || !contextId) {
      return NextResponse.json({ firstGifter: null })
    }

    const first = await prisma.giftEvent.findFirst({
      where: { context, contextId, status: 'completed' },
      orderBy: { createdAt: 'asc' },
    })
    if (!first) return NextResponse.json({ firstGifter: null })

    const user = await prisma.user.findUnique({
      where: { id: first.senderId },
      select: USER_SELECT,
    })

    return NextResponse.json({
      firstGifter: {
        user: serializeUser(user, first.senderId),
        badge: FIRST_GIFTER_BADGE,
        at: first.createdAt.toISOString(),
        // flat aliases for the mobile client
        userId: first.senderId,
        displayName: displayNameOf(user),
        avatarUrl: user?.image ?? null,
        amount: first.grossAmount,
        createdAt: first.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('[gifts/insights/first-gifter]', error)
    return NextResponse.json({ firstGifter: null })
  }
}
