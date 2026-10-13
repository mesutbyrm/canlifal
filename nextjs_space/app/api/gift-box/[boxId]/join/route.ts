export const dynamic = 'force-dynamic'

/**
 * POST /api/gift-box/:boxId/join — Hediye kutusuna katılım. BÖLÜM 22 / B4.
 *
 * §13'teki sekiz kontrol sırayla sunucuda yapılır. Kazanan seçimi tek bir
 * koşullu SQL UPDATE ile atomiktir: aynı anda 20 kişi katılsa bile kutu tam
 * olarak `winnerCount` kazanan üretir (§15).
 *
 * §17: kutu ödülü hiçbir hediye akışını tetiklemez, dolayısıyla PK skoru üretmez.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { recordLedger } from '@/lib/ledger'
import {
  GiftBoxErrors,
  GIFT_BOX_ERROR_MESSAGES,
  parseSplits,
  verifyGiftBoxTask,
  checkGiftBoxEligibility,
  isPresent,
  broadcastGiftBox,
  settleGiftBox,
} from '@/lib/gift-box'

function fail(code: string, status = 400, extra: Record<string, any> = {}) {
  return NextResponse.json(
    { error: GIFT_BOX_ERROR_MESSAGES[code] || 'Bir hata oluştu', code, ...extra },
    { status },
  )
}

async function currentUserId(req: NextRequest): Promise<string | null> {
  const mobileUser = await authenticateRequest(req)
  if (mobileUser?.id) return mobileUser.id
  const session = await getServerSession(authOptions)
  return session?.user?.id || null
}

const FULL = 'GIFT_BOX_FULL_SENTINEL'

export async function POST(req: NextRequest, { params }: { params: { boxId: string } }) {
  try {
    const userId = await currentUserId(req)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor', code: 'UNAUTHORIZED' }, { status: 401 })

    const limited = await guardRateLimit(req, 'gift_box_join', { userId })
    if (limited) return limited

    const boxId = params.boxId
    const box = await prisma.giftBox.findUnique({ where: { id: boxId } })
    if (!box) return fail(GiftBoxErrors.GIFT_BOX_NOT_FOUND, 404)

    // 4 — kutu hâlâ aktif mi?
    if (box.status !== 'active') return fail(GiftBoxErrors.GIFT_BOX_NOT_ACTIVE, 409)
    // 5 — süre doldu mu?
    if (box.endsAt.getTime() <= Date.now()) {
      await settleGiftBox(boxId, 'expired').catch(() => {})
      return fail(GiftBoxErrors.GIFT_BOX_EXPIRED, 409)
    }
    // 6 — kazanan sayısı doldu mu?
    if (box.paidCount >= box.winnerCount) return fail(GiftBoxErrors.GIFT_BOX_FULL, 409)
    // Kutu sahibi katılamaz
    if (box.creatorId === userId) return fail(GiftBoxErrors.GIFT_BOX_OWNER_CANNOT_JOIN, 403)
    // 7/8 — yasaklı / dondurulmuş hesap
    const eligible = await checkGiftBoxEligibility(userId)
    if (!eligible.ok) return fail(eligible.code!, eligible.status || 403)
    // 2 — zaten katıldı mı?
    const existing = await prisma.giftBoxEntry.findUnique({
      where: { boxId_userId: { boxId, userId } },
    })
    if (existing) {
      return fail(GiftBoxErrors.GIFT_BOX_ALREADY_JOINED, 409, {
        isWinner: existing.isWinner, rewardAmount: existing.rewardAmount,
      })
    }
    // 1 — kullanıcı gerçekten yayında/odada mı?
    if (!(await isPresent(box, userId))) return fail(GiftBoxErrors.GIFT_BOX_NOT_IN_ROOM, 403)

    // 3 — görev şartı (yalnızca sunucu kararı — §14)
    let broadcasterId: string | null = null
    if (box.scope === 'stream' && box.streamId) {
      const s = await prisma.videoStream.findUnique({ where: { id: box.streamId }, select: { userId: true } })
      broadcasterId = s?.userId || null
    } else if (box.scope === 'room' && box.roomId) {
      const r = await prisma.chatRoom.findUnique({ where: { id: box.roomId }, select: { ownerId: true } })
      broadcasterId = r?.ownerId || null
    }
    const task = await verifyGiftBoxTask(box, userId, { broadcasterId })
    if (!task.verified) {
      return fail(GiftBoxErrors.GIFT_BOX_TASK_INCOMPLETE, 403, { taskType: box.taskType, reason: task.reason })
    }

    const splits = parseSplits(box.splits)

    // ─── Atomik kazanan seçimi (§15) ───
    let rank = 0
    let reward = 0
    try {
      const out = await prisma.$transaction(async (tx) => {
        await tx.giftBoxEntry.create({
          data: { boxId, userId, taskVerified: true },
        })
        const rows = await tx.$queryRawUnsafe<Array<{ paidCount: number }>>(
          `UPDATE "gift_boxes"
             SET "paidCount" = "paidCount" + 1, "updatedAt" = now()
           WHERE "id" = $1
             AND "status" = 'active'
             AND "paidCount" < "winnerCount"
             AND "endsAt" > now()
           RETURNING "paidCount"`,
          boxId,
        )
        if (!rows || rows.length === 0) throw new Error(FULL)

        const newRank = Number(rows[0].paidCount)
        const amount = Math.trunc(splits[newRank - 1] ?? 0)

        await tx.giftBoxEntry.update({
          where: { boxId_userId: { boxId, userId } },
          data: { isWinner: true, rewardAmount: amount, rank: newRank },
        })
        await tx.giftBox.update({
          where: { id: boxId },
          data: { paidAmount: { increment: amount } },
        })
        if (amount > 0) {
          await tx.user.update({ where: { id: userId }, data: { jetonBalance: { increment: amount } } })
        }
        return { rank: newRank, amount }
      })
      rank = out.rank
      reward = out.amount
    } catch (e: any) {
      if (e?.message === FULL) return fail(GiftBoxErrors.GIFT_BOX_FULL, 409)
      if (e?.code === 'P2002') return fail(GiftBoxErrors.GIFT_BOX_ALREADY_JOINED, 409)
      throw e
    }

    // ─── Defter + olaylar ───
    if (reward > 0) {
      await recordLedger({
        debit: { accountType: 'platform_jeton', accountId: 'gift_box_escrow' },
        credit: { accountType: 'user_jeton', accountId: userId },
        amount: reward,
        category: 'task_reward',
        description: 'Hediye kutusu ödülü',
        referenceType: 'GiftBox',
        referenceId: boxId,
        metadata: { rank, taskType: box.taskType, scope: box.scope, excludeFromPkScore: true },
        actorId: box.creatorId,
      }).catch(() => {})
    }

    const winner = await prisma.user.findUnique({
      where: { id: userId }, select: { id: true, name: true, username: true, image: true },
    })
    const fresh = await prisma.giftBox.findUnique({ where: { id: boxId } })

    broadcastGiftBox(box, 'gift_box_joined', { userId, rank })
    broadcastGiftBox(box, 'gift_box_task_verified', { userId, taskType: box.taskType })
    broadcastGiftBox(box, 'gift_box_winner', { user: winner, rank, rewardAmount: reward })
    broadcastGiftBox(box, 'gift_box_reward_distributed', {
      userId, rank, rewardAmount: reward,
      paidCount: fresh?.paidCount ?? rank,
      remainingWinners: Math.max(0, box.winnerCount - (fresh?.paidCount ?? rank)),
      remainingAmount: Math.max(0, box.totalAmount - (fresh?.paidAmount ?? reward)),
    })

    // Kontenjan dolduysa kutuyu kapat (iade 0).
    if (fresh && fresh.paidCount >= fresh.winnerCount) {
      await settleGiftBox(boxId, 'finished').catch(() => {})
    }

    return NextResponse.json({
      success: true,
      isWinner: true,
      rank,
      rewardAmount: reward,
      remainingWinners: Math.max(0, box.winnerCount - (fresh?.paidCount ?? rank)),
    })
  } catch (err) {
    console.error('[gift-box][join]', err)
    return fail('VALIDATION_ERROR', 500)
  }
}
