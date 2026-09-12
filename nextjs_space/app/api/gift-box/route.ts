export const dynamic = 'force-dynamic'

/**
 * /api/gift-box — Hediye Kutusu oluşturma / listeleme / iptal. BÖLÜM 22 / B4.
 *
 * Tüm doğrulamalar sunucuda yapılır (§1, §14). Süre, kazanan sayısı ve tutar
 * sınırları admin ayarlarından okunur (§9, §19) — istemci manipüle edemez.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { recordAudit, getAuditIp } from '@/lib/audit-log'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { recordLedger } from '@/lib/ledger'
import {
  GiftBoxErrors,
  GIFT_BOX_ERROR_MESSAGES,
  BUILTIN_TASK_TYPES,
  getGiftBoxLimits,
  computeSplits,
  serializeGiftBox,
  broadcastGiftBox,
  settleGiftBox,
  expireStaleBoxes,
  checkGiftBoxEligibility,
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

const USER_SELECT = { id: true, name: true, username: true, image: true }

/**
 * GET /api/gift-box?streamId=... | ?roomId=...
 * Aktif kutuları (ve isteğe bağlı olarak kullanıcının katılım durumunu) döner.
 */
export async function GET(req: NextRequest) {
  try {
    const streamId = req.nextUrl.searchParams.get('streamId')
    const roomId = req.nextUrl.searchParams.get('roomId')
    if (!streamId && !roomId) return fail(GiftBoxErrors.VALIDATION_ERROR, 400)

    await expireStaleBoxes({ streamId: streamId || undefined, roomId: roomId || undefined })

    const boxes = await prisma.giftBox.findMany({
      where: streamId ? { streamId, status: 'active' } : { roomId: roomId!, status: 'active' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const userId = await currentUserId(req)
    const ids = boxes.map(b => b.id)
    const myEntries = userId && ids.length
      ? await prisma.giftBoxEntry.findMany({ where: { boxId: { in: ids }, userId } })
      : []
    const entryMap = new Map(myEntries.map(e => [e.boxId, e]))

    const creatorIds = Array.from(new Set(boxes.flatMap(b => [b.creatorId, b.taskTargetUserId].filter(Boolean) as string[])))
    const users = creatorIds.length
      ? await prisma.user.findMany({ where: { id: { in: creatorIds } }, select: USER_SELECT })
      : []
    const userMap = new Map(users.map(u => [u.id, u]))

    const limits = await getGiftBoxLimits()

    return NextResponse.json({
      boxes: boxes.map(b => {
        const e = entryMap.get(b.id)
        return {
          ...serializeGiftBox({
            ...b,
            creator: userMap.get(b.creatorId) || null,
            taskTarget: b.taskTargetUserId ? userMap.get(b.taskTargetUserId) || null : null,
          }),
          me: e ? { joined: true, taskVerified: e.taskVerified, isWinner: e.isWinner, rewardAmount: e.rewardAmount } : { joined: false },
        }
      }),
      limits: {
        minAmount: limits.minAmount,
        maxAmount: limits.maxAmount,
        maxWinners: limits.maxWinners,
        allowedDurations: limits.allowedDurations,
        taskTypes: [...BUILTIN_TASK_TYPES, ...limits.extraTaskTypes],
      },
    })
  } catch (err) {
    console.error('[gift-box][GET]', err)
    return fail('VALIDATION_ERROR', 500)
  }
}

/**
 * POST /api/gift-box
 *   { action: 'create', streamId|roomId, totalAmount, winnerCount, durationSec, taskType, taskTargetUserId? }
 *   { action: 'cancel', boxId }
 */
export async function POST(req: NextRequest) {
  try {
    const userId = await currentUserId(req)
    if (!userId) return NextResponse.json({ error: 'Oturum açmanız gerekiyor', code: 'UNAUTHORIZED' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const action = String(body?.action || 'create')

    const limited = await guardRateLimit(req, action === 'create' ? 'gift_box_create' : 'gift_box_join', { userId })
    if (limited) return limited

    if (action === 'cancel') {
      const boxId = String(body?.boxId || '')
      if (!boxId) return fail(GiftBoxErrors.VALIDATION_ERROR, 400)
      const box = await prisma.giftBox.findUnique({ where: { id: boxId } })
      if (!box) return fail(GiftBoxErrors.GIFT_BOX_NOT_FOUND, 404)
      if (box.creatorId !== userId) return fail(GiftBoxErrors.GIFT_BOX_NOT_AUTHORIZED, 403)
      if (box.status !== 'active') return fail(GiftBoxErrors.GIFT_BOX_NOT_ACTIVE, 409)

      const res = await settleGiftBox(boxId, 'cancelled')
      if (!res.settled) return fail(GiftBoxErrors.GIFT_BOX_NOT_ACTIVE, 409)
      await recordAudit({
        actorId: userId, action: 'gift_box.cancel', targetType: 'GiftBox', targetId: boxId,
        description: `Hediye kutusu iptal edildi, ${res.refunded} jeton iade`, ip: getAuditIp(req),
      }).catch(() => {})
      return NextResponse.json({ success: true, refunded: res.refunded })
    }

    if (action !== 'create') return fail(GiftBoxErrors.VALIDATION_ERROR, 400)

    // ─── Oluşturma ───
    const eligible = await checkGiftBoxEligibility(userId)
    if (!eligible.ok) return fail(eligible.code!, eligible.status || 403)

    const streamId = body?.streamId ? String(body.streamId) : null
    const roomId = body?.roomId ? String(body.roomId) : null
    if (!streamId && !roomId) return fail(GiftBoxErrors.VALIDATION_ERROR, 400)
    const scope = streamId ? 'stream' : 'room'

    const totalAmount = Math.trunc(Number(body?.totalAmount))
    const winnerCount = Math.trunc(Number(body?.winnerCount))
    const durationSec = Math.trunc(Number(body?.durationSec))
    const taskType = String(body?.taskType || 'none')
    const taskTargetUserId = body?.taskTargetUserId ? String(body.taskTargetUserId) : null

    const limits = await getGiftBoxLimits()
    const allowedTaskTypes = [...BUILTIN_TASK_TYPES, ...limits.extraTaskTypes]

    if (!Number.isFinite(totalAmount) || totalAmount < limits.minAmount || totalAmount > limits.maxAmount) {
      return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: `Tutar ${limits.minAmount}-${limits.maxAmount} jeton arasında olmalı.` })
    }
    if (!Number.isFinite(winnerCount) || winnerCount < 1 || winnerCount > limits.maxWinners) {
      return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: `Kazanan sayısı 1-${limits.maxWinners} arasında olmalı.` })
    }
    if (winnerCount > totalAmount) {
      return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: 'Kazanan sayısı toplam jetondan fazla olamaz.' })
    }
    // §9 — süre yalnızca adminin izin verdiği değerlerden biri olabilir.
    if (
      !Number.isFinite(durationSec) ||
      durationSec < limits.minDurationSec ||
      durationSec > limits.maxDurationSec ||
      !limits.allowedDurations.includes(durationSec)
    ) {
      return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: `Süre şu değerlerden biri olmalı: ${limits.allowedDurations.join(', ')} saniye.` })
    }
    if (!allowedTaskTypes.includes(taskType)) {
      return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: 'Geçersiz görev tipi.' })
    }
    if (taskType === 'follow_user') {
      // §12 — yalnızca değişmez user_id'ye güvenilir.
      if (!taskTargetUserId) return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: 'Hedef kullanıcı seçilmedi.' })
      const target = await prisma.user.findUnique({ where: { id: taskTargetUserId }, select: { id: true } })
      if (!target) return fail(GiftBoxErrors.VALIDATION_ERROR, 400, { message: 'Hedef kullanıcı bulunamadı.' })
    }

    // Hedef yayın/oda geçerli mi?
    if (scope === 'stream') {
      const stream = await prisma.videoStream.findUnique({ where: { id: streamId! }, select: { id: true, status: true } })
      if (!stream) return fail(GiftBoxErrors.STREAM_NOT_FOUND, 404)
      if (stream.status !== 'live') return fail(GiftBoxErrors.STREAM_ENDED, 409)
    } else {
      const room = await prisma.chatRoom.findUnique({ where: { id: roomId! }, select: { id: true, isActive: true } })
      if (!room) return fail(GiftBoxErrors.ROOM_NOT_FOUND, 404)
      if (!room.isActive) return fail(GiftBoxErrors.ROOM_NOT_FOUND, 409)
    }

    // Aynı yayında/odada kullanıcının aynı anda birden fazla açık kutusu olmasın.
    await expireStaleBoxes({ streamId: streamId || undefined, roomId: roomId || undefined })
    const existing = await prisma.giftBox.findFirst({
      where: { creatorId: userId, status: 'active', ...(scope === 'stream' ? { streamId } : { roomId }) },
      select: { id: true },
    })
    if (existing) return fail(GiftBoxErrors.GIFT_BOX_ALREADY_OPEN, 409, { boxId: existing.id })

    const splits = computeSplits(totalAmount, winnerCount)
    const now = new Date()
    const endsAt = new Date(now.getTime() + durationSec * 1000)

    // §15 — escrow: tutar atomik olarak düşülür; yetersizse transaction tamamen geri alınır.
    let box
    try {
      box = await prisma.$transaction(async (tx) => {
        await atomicDebitJeton(tx, userId, totalAmount)
        return tx.giftBox.create({
          data: {
            scope, streamId, roomId, creatorId: userId,
            totalAmount, winnerCount, durationSec,
            splits: JSON.stringify(splits),
            taskType, taskTargetUserId,
            status: 'active', startsAt: now, endsAt,
          },
        })
      })
    } catch (e) {
      if (isInsufficientBalanceError(e)) return fail(GiftBoxErrors.INSUFFICIENT_BALANCE, 402)
      throw e
    }

    await recordLedger({
      debit: { accountType: 'user_jeton', accountId: userId },
      credit: { accountType: 'platform_jeton', accountId: 'gift_box_escrow' },
      amount: totalAmount,
      category: 'game',
      description: 'Hediye kutusu oluşturuldu (escrow)',
      referenceType: 'GiftBox',
      referenceId: box.id,
      metadata: { scope, winnerCount, durationSec, taskType },
      actorId: userId,
    }).catch(() => {})

    const creator = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT })
    const taskTarget = taskTargetUserId
      ? await prisma.user.findUnique({ where: { id: taskTargetUserId }, select: USER_SELECT })
      : null
    const view = serializeGiftBox({ ...box, creator, taskTarget })

    broadcastGiftBox(box, 'gift_box_created', { box: view })
    broadcastGiftBox(box, 'gift_box_started', { box: view })

    await recordAudit({
      actorId: userId, action: 'gift_box.create', targetType: 'GiftBox', targetId: box.id,
      description: `${totalAmount} jeton / ${winnerCount} kazanan / ${durationSec}sn / görev: ${taskType}`,
      ip: getAuditIp(req),
    }).catch(() => {})

    return NextResponse.json({ success: true, box: view })
  } catch (err) {
    console.error('[gift-box][POST]', err)
    return fail('VALIDATION_ERROR', 500)
  }
}
