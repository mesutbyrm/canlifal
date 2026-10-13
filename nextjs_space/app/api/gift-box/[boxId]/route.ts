export const dynamic = 'force-dynamic'

/** GET /api/gift-box/:boxId — tek kutu durumu + kazananlar (§26 resync). */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { GiftBoxErrors, GIFT_BOX_ERROR_MESSAGES, serializeGiftBox, settleGiftBox } from '@/lib/gift-box'

export async function GET(_req: NextRequest, { params }: { params: { boxId: string } }) {
  try {
    let box = await prisma.giftBox.findUnique({ where: { id: params.boxId } })
    if (!box) {
      return NextResponse.json(
        { error: GIFT_BOX_ERROR_MESSAGES[GiftBoxErrors.GIFT_BOX_NOT_FOUND], code: GiftBoxErrors.GIFT_BOX_NOT_FOUND },
        { status: 404 },
      )
    }
    if (box.status === 'active' && box.endsAt.getTime() <= Date.now()) {
      await settleGiftBox(box.id, 'expired').catch(() => {})
      box = (await prisma.giftBox.findUnique({ where: { id: params.boxId } })) || box
    }

    const entries = await prisma.giftBoxEntry.findMany({
      where: { boxId: box.id, isWinner: true },
      orderBy: { rank: 'asc' },
      take: 200,
    })
    const ids = Array.from(new Set([box.creatorId, ...entries.map(e => e.userId), ...(box.taskTargetUserId ? [box.taskTargetUserId] : [])]))
    const users = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, username: true, image: true },
    })
    const map = new Map(users.map(u => [u.id, u]))

    return NextResponse.json({
      box: serializeGiftBox({
        ...box,
        creator: map.get(box.creatorId) || null,
        taskTarget: box.taskTargetUserId ? map.get(box.taskTargetUserId) || null : null,
      }),
      winners: entries.map(e => ({
        rank: e.rank, rewardAmount: e.rewardAmount, joinedAt: e.joinedAt.toISOString(),
        user: map.get(e.userId) || { id: e.userId, name: null, username: null, image: null },
      })),
    })
  } catch (err) {
    console.error('[gift-box][detail]', err)
    return NextResponse.json({ error: 'Beklenmeyen bir hata oluştu', code: 'VALIDATION_ERROR' }, { status: 500 })
  }
}
