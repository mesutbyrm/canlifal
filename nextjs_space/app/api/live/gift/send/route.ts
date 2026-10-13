import { settleRoomGift } from '@/lib/gift-settlement'
import { GiftRecipientError, parseGiftQuantity } from '@/lib/gift-recipient'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { parseJetonSource, resolveJetonSpend } from '@/lib/jeton-source'
import { createNotificationWithPush } from '@/lib/notify'
import { processAgencyCommission, getPlatformSetting } from '@/lib/agency-commission'
import { calculateGiftDistribution, logRoomRevenue } from '@/lib/voice-room-revenue'
import { emitStreamEvent } from '@/lib/stream-events'
import { emitChatEvent } from '@/lib/chat-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { applyGiftPkScore } from '@/lib/gift-pk-score'
import { atomicDebitJeton, isInsufficientBalanceError } from '@/lib/balance-guard'
import { incrementLeaderboardScore } from '@/lib/leaderboard-engine'

export const dynamic = 'force-dynamic'

/**
 * POST /api/live/gift/send
 * Unified gift sending for Flutter — works for both stream and voice rooms.
 *
 * Body: {
 *   roomId: string,
 *   roomType: 'stream' | 'voice',
 *   giftTypeId: string,
 *   quantity?: number (default 1, max 100),
 *   recipientId?: string (voice room only, defaults to room owner)
 * }
 *
 * Returns: { success, data: { gift, newBalance, pkUpdate? } }
 */
export async function POST(request: NextRequest) {
  let _idempotencyRecord: string | null = null
  let committedReceipt: any = null
  // Doğrulama hatalarında idempotency rezervasyonu serbest bırakılır; aksi
  // halde kullanıcı düzeltilmiş isteği aynı anahtarla 1 dk tekrar edemezdi.
  const fail = async (status: number, code: string, message: string) => {
    await releaseIdempotent(_idempotencyRecord)
    return NextResponse.json({ success: false, error: { code, message } }, { status })
  }
  try {
    // Feature flag kontrolü
    const featureBlocked = await requireFeature('GIFTS_ENABLED')
    if (featureBlocked) return featureBlocked

    const mobileUser = await authenticateRequest(request)
    let authUser: { id: string } | null = mobileUser as any
    if (!authUser) {
      // Web oturumu yedeği: bu uç önceden yalnızca mobil token kabul ediyordu.
      const session = await getServerSession(authOptions)
      if ((session as any)?.user?.id) authUser = { id: (session as any).user.id }
    }
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Oturum açmanız gerekiyor' } },
        { status: 401 }
      )
    }

    // Rate limit: hediye gönderme
    const rateLimited = await guardRateLimit(request, 'gift_send', { userId: authUser.id })
    if (rateLimited) return rateLimited

    // Idempotency: aynı Idempotency-Key ile gelen tekrar istekte hediye
    // ikinci kez düşülmez; ilk yanıt aynen tekrar oynatılır.
    const replay = await beginIdempotent(request, 'live_gift_send', authUser.id, { strict: true })
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const body = await request.json()
    const { roomId, roomType, giftTypeId, recipientId: bodyRecipientId } = body
    const quantity = parseGiftQuantity(body.quantity)

    if (!roomId || !roomType || !giftTypeId) {
      return fail(400, 'MISSING_PARAMS', 'roomId, roomType ve giftTypeId gereklidir')
    }

    // Get gift type
    const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
    if (!giftType || !giftType.isActive) {
      return fail(400, 'INVALID_GIFT', 'Geçersiz hediye türü')
    }

    if (typeof body.clientPrice === 'number' && body.clientPrice !== giftType.price) return fail(409, 'PRICE_MISMATCH', 'Hediye fiyatı değişti; katalog bilgisini güncelleyin')
    const totalPrice = giftType.price * quantity
    // Render metadata for identical display on every client (web + Flutter)
    const giftRenderMeta = buildGiftRenderMeta(giftType)

    // Get sender
    const sender = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { id: true, name: true, image: true, jetonBalance: true, role: true, username: true }
    })
    if (!sender) {
      return fail(404, 'USER_NOT_FOUND', 'Kullanıcı bulunamadı')
    }

    // Sahte/gerçek jeton seçimi (istemci `jetonSource` gönderir)
    const spendPlan = await resolveJetonSpend(sender.id, totalPrice, parseJetonSource(body.jetonSource))
    const isStaff = spendPlan.skipDeduction
    const senderExcluded = !spendPlan.countsAsFinance

    // Check jeton balance (staff skip)
    if (!isStaff && (spendPlan.source === 'fake' ? spendPlan.fakeBalance : (sender.jetonBalance ?? 0)) < totalPrice) {
      return fail(400, 'INSUFFICIENT_BALANCE', 'Yetersiz jeton bakiyesi')
    }

    let giftRecord: any = null
    let pkUpdate: any = null
    let newBalance = senderExcluded ? (sender.jetonBalance ?? 0) : (sender.jetonBalance ?? 0) - totalPrice

    if (roomType === 'stream') {
      // ─── Stream Gift ───
      const stream = await prisma.videoStream.findFirst({
        where: { OR: [{ id: roomId }, { roomId }], status: 'live' },
        select: { id: true, userId: true, roomId: true }
      })
      if (!stream) {
        return fail(404, 'STREAM_NOT_FOUND', 'Aktif yayın bulunamadı')
      }

      const recipientId = bodyRecipientId || stream.userId
      const baseDist = await calculateGiftDistribution(totalPrice, 'NORMAL', recipientId === stream.userId)
      const dist = recipientId === sender.id ? { ...baseDist, receiverNet: 0, ownerNet: 0, siteAmount: totalPrice } : baseDist
      const recipientAmount = dist.receiverNet + dist.ownerNet
      const siteAmount = dist.siteAmount
      const settlement = await settleRoomGift({
        scope: 'stream', contextId: stream.id, sideIds: [stream.id, stream.roomId], senderId: sender.id, recipientId, ownerId: stream.userId,
        giftTypeId, quantity, amount: totalPrice, source: spendPlan.source, skipDeduction: spendPlan.skipDeduction,
        dist, idempotencyRecord: _idempotencyRecord, responseStyle: 'unified', giftName: giftType.name, giftIcon: giftType.icon,
      })
      committedReceipt = settlement.receipt
      const gift = settlement.gift
      giftRecord = gift
      newBalance = settlement.newBalance
      sender.jetonBalance = settlement.senderBalanceBefore
      pkUpdate = settlement.pkUpdate

      // Emit SSE
      emitStreamEvent(stream.id, 'gift', {
        type: 'gift',
        eventType: 'GIFT_SENT',
        streamId: stream.id,
        roomId: stream.roomId || stream.id,
        receiverId: recipientId,
        gift: {
          id: gift.id,
          giftId: gift.id,
          senderId: sender.id,
          receiverId: recipientId,
          streamId: stream.id,
          roomId: stream.roomId || stream.id,
          senderName: sender.name,
          senderImage: sender.image,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          quantity,
          totalPrice,
          pointAmount: totalPrice,
          jetonSource: spendPlan.source,
          countsAsFinance: spendPlan.countsAsFinance,
          timestamp: Date.now(),
          ...(giftRenderMeta || {}),
        }
      })

      // Notification (fire-and-forget)
      createNotificationWithPush({
        userId: recipientId,
        type: 'stream_gift',
        title: 'Canlı Yayın Hediyesi! 🎁',
        message: `${sender.name} ${giftType.name} hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name || 'Kullanıcı',
        data: JSON.stringify({ streamId: stream.id, giftName: giftType.name, giftIcon: giftType.icon, amount: totalPrice })
      }).catch(() => {})

    } else if (roomType === 'voice') {
      // ─── Voice Room Gift ───
      const room = await prisma.chatRoom.findFirst({
        where: { OR: [{ id: roomId }, { slug: roomId }] },
        select: { id: true, ownerId: true, isActive: true, roomType: true, giftCommissionPercent: true, giftBeneficiaryId: true }
      })
      if (!room || !room.isActive) {
        return fail(404, 'ROOM_NOT_FOUND', 'Oda bulunamadı')
      }

      let recipientId = bodyRecipientId || room.ownerId
      if (!recipientId) {
        return fail(400, 'NO_RECIPIENT', 'Alıcı bulunamadı')
      }



      const recipient = await prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, name: true, jetonBalance: true }
      })
      if (!recipient) {
        return fail(404, 'RECIPIENT_NOT_FOUND', 'Alıcı bulunamadı')
      }

      // Calculate distribution
      const roomType2 = (room as any).roomType || 'FREE'
      const baseDist = await calculateGiftDistribution(totalPrice, roomType2, recipient.id === room.ownerId)
      const dist = recipient.id === sender.id ? { ...baseDist, receiverNet: 0, ownerNet: 0, siteAmount: totalPrice } : baseDist

      const settlement = await settleRoomGift({
        scope: 'voice', contextId: room.id, senderId: sender.id, recipientId: recipient.id, ownerId: room.ownerId,
        giftTypeId, quantity, amount: totalPrice, source: spendPlan.source, skipDeduction: spendPlan.skipDeduction,
        dist, idempotencyRecord: _idempotencyRecord, responseStyle: 'unified', giftName: giftType.name, giftIcon: giftType.icon,
      })
      committedReceipt = settlement.receipt
      const gift = settlement.gift
      giftRecord = gift
      newBalance = settlement.newBalance
      sender.jetonBalance = settlement.senderBalanceBefore
      pkUpdate = settlement.pkUpdate

      // Emit chat event
      emitChatEvent(room.id, 'gift', {
        type: 'gift',
        eventType: 'GIFT_SENT',
        roomId: room.id,
        gift: {
          id: gift.id,
          giftId: gift.id,
          senderId: sender.id,
          senderName: sender.name,
          senderImage: sender.image,
          recipientId: recipient.id,
          recipientName: recipient.name,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          quantity,
          totalPrice,
          pointAmount: totalPrice,
          jetonSource: spendPlan.source,
          countsAsFinance: spendPlan.countsAsFinance,
          timestamp: Date.now(),
          ...(giftRenderMeta || {}),
        }
      })

      // Notification
      createNotificationWithPush({
        userId: recipient.id,
        type: 'room_gift',
        title: 'Hediye Aldınız! 🎁',
        message: `${sender.name} size ${giftType.name} hediye gönderdi!`,
        fromUserId: sender.id,
        fromUserName: sender.name || 'Kullanıcı',
      }).catch(() => {})
    } else {
      return fail(400, 'INVALID_ROOM_TYPE', 'roomType "stream" veya "voice" olmalıdır')
    }

    const responsePayload = {
      success: true,
      data: {
        jetonSource: spendPlan.source,
        countsAsFinance: spendPlan.countsAsFinance,
        pointAmount: totalPrice,
        gift: {
          id: giftRecord?.id || '',
          giftTypeId: giftType.id || '',
          giftName: giftType.name || '',
          giftIcon: giftType.icon || '',
          quantity: quantity || 1,
          totalPrice: totalPrice || 0,
          recipientId: giftRecord?.recipientId,
          financialAmount: giftRecord?.totalPrice || 0,
        },
        newBalance: typeof newBalance === 'number' ? newBalance : 0,
        pkUpdate: pkUpdate ? {
          battleId: pkUpdate.battleId || '',
          score1: pkUpdate.score1 || 0,
          score2: pkUpdate.score2 || 0,
        } : null,
      }
    }
    await completeIdempotent(_idempotencyRecord, 200, responsePayload)
    return NextResponse.json(responsePayload)

  } catch (error) {
    if (committedReceipt) {
      console.error('[Gift] post-commit side effect failed:', error)
      return NextResponse.json(committedReceipt)
    }
    if (error instanceof GiftRecipientError) return fail(400, error.code, error.message)
    await releaseIdempotent(_idempotencyRecord)
    // Atomik düşüm yetersiz bakiye nedeniyle transaction'ı geri aldıysa 400 dön
    // (ağ kopması / eşzamanlı ödeme senaryolarında 500 yerine anlaşılır hata)
    if (isInsufficientBalanceError(error)) {
      return NextResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_BALANCE', message: 'Yetersiz jeton bakiyesi' } },
        { status: 400 }
      )
    }
    console.error('[LIVE/gift/send] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hediye gönderilemedi' } },
      { status: 500 }
    )
  } finally {
    if (!committedReceipt) await releaseIdempotent(_idempotencyRecord)
  }
}
