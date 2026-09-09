import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { authenticateRequest } from '@/lib/mobile-auth'
import prisma from '@/lib/db'
import { requireFeature } from '@/lib/check-feature'
import { guardRateLimit } from '@/lib/rate-limit-guard'
import { isExcludedFromFinance } from '@/lib/admin-check'
import { createNotificationWithPush } from '@/lib/notify'
import { processAgencyCommission, getPlatformSetting } from '@/lib/agency-commission'
import { calculateGiftDistribution, logRoomRevenue } from '@/lib/voice-room-revenue'
import { emitStreamEvent } from '@/lib/stream-events'
import { emitChatEvent } from '@/lib/chat-events'
import { buildGiftRenderMeta } from '@/lib/gift-render'
import { recordMultiLeg, type LedgerLeg } from '@/lib/ledger'
import { recordContribution } from '@/lib/supporter-level'
import { recordTeamPoints } from '@/lib/team-points'
import { beginIdempotent, completeIdempotent, releaseIdempotent } from '@/lib/idempotency'
import { applyGiftPkScore } from '@/lib/gift-pk-score'
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
    const replay = await beginIdempotent(request, 'live_gift_send', authUser.id)
    if (replay.response) return replay.response
    _idempotencyRecord = replay.record

    const body = await request.json()
    const { roomId, roomType, giftTypeId, recipientId: bodyRecipientId } = body
    const quantity = Math.max(1, Math.min(100, parseInt(body.quantity) || 1))

    if (!roomId || !roomType || !giftTypeId) {
      return fail(400, 'MISSING_PARAMS', 'roomId, roomType ve giftTypeId gereklidir')
    }

    // Get gift type
    const giftType = await prisma.giftType.findUnique({ where: { id: giftTypeId } })
    if (!giftType || !giftType.isActive) {
      return fail(400, 'INVALID_GIFT', 'Geçersiz hediye türü')
    }

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

    const isStaff = sender.role === 'yonetici'
    const senderExcluded = await isExcludedFromFinance(sender.id)

    // Check jeton balance (staff skip)
    if (!isStaff && (sender.jetonBalance ?? 0) < totalPrice) {
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

      if (stream.userId === authUser.id && !isStaff) {
        return fail(400, 'SELF_GIFT', 'Kendinize hediye gönderemezsiniz')
      }

      // Revenue split (recorded on the gift row even when the sender is
      // excluded from finance, so reporting always reflects the real value)
      const commissionStr = await getPlatformSetting('stream_gift_commission', '30')
      const commissionPercent = Math.min(100, Math.max(0, parseInt(commissionStr) || 30))
      const recipientAmount = Math.floor(totalPrice * (100 - commissionPercent) / 100)
      const siteAmount = totalPrice - recipientAmount

      const txOps: any[] = [
        prisma.streamGift.create({
          data: {
            streamId: stream.id,
            senderId: sender.id,
            giftTypeId,
            quantity,
            totalPrice,
            receiverAmount: senderExcluded ? 0 : recipientAmount,
            siteAmount: senderExcluded ? 0 : siteAmount
          },
          include: {
            sender: { select: { name: true, image: true } },
            giftType: true
          }
        })
      ]

      // Deduct jetons
      if (!senderExcluded) {
        txOps.push(
          prisma.user.update({
            where: { id: sender.id },
            data: { jetonBalance: { decrement: totalPrice } }
          })
        )

        // Credit broadcaster
        if (recipientAmount > 0) {
          txOps.push(
            prisma.user.update({
              where: { id: stream.userId },
              data: { jetonBalance: { increment: recipientAmount } }
            })
          )
        }

        // Agency commission (fire-and-forget)
        processAgencyCommission({
          userId: stream.userId,
          earnedAmount: recipientAmount,
          sourceType: 'stream_gift',
          sourceId: stream.id,
        }).catch(() => {})
      }

      // Update lastGiftAt
      txOps.push(
        prisma.videoStream.update({
          where: { id: stream.id },
          data: { lastGiftAt: new Date() }
        })
      )

      const [gift] = await prisma.$transaction(txOps)
      giftRecord = gift

      // ── Immutable ledger (fire-and-forget) ──
      if (!senderExcluded) {
        const legs: LedgerLeg[] = [
          {
            accountType: 'user_jeton',
            accountId: sender.id,
            direction: 'debit',
            amount: totalPrice,
            balanceBefore: sender.jetonBalance ?? 0,
            balanceAfter: (sender.jetonBalance ?? 0) - totalPrice,
          },
        ]
        if (recipientAmount > 0) {
          legs.push({ accountType: 'user_jeton', accountId: stream.userId, direction: 'credit', amount: recipientAmount })
        }
        if (siteAmount > 0) {
          legs.push({ accountType: 'platform_jeton', accountId: 'platform', direction: 'credit', amount: siteAmount })
        }
        recordMultiLeg({
          legs,
          category: 'gift_send',
          currency: 'jeton',
          description: `Canlı yayın hediyesi x${quantity}`,
          referenceType: 'StreamGift',
          referenceId: (gift as any)?.id,
          actorId: sender.id,
          metadata: { streamId: stream.id, giftTypeId, quantity, commissionPercent },
        }).catch((e) => console.error('[Ledger][stream-gift]', e))
        recordContribution(sender.id, stream.userId, totalPrice).catch(() => {})
        recordTeamPoints(sender.id, totalPrice).catch(() => {})
      }

      // PK skor atfı: tek kanonik yol (oda izolasyonu + süre + yarış kontrolü)
      pkUpdate = await applyGiftPkScore({
        sideIds: [stream.id, stream.roomId],
        amount: totalPrice,
      })

      // Leaderboard skor: hediye alıcısına (yayıncı) puan (canlı yayın)
      incrementLeaderboardScore('live_stream', stream.userId, totalPrice, 'gift_received', stream.id).catch(() => {})

      // Emit SSE
      emitStreamEvent(stream.id, 'gift', {
        type: 'gift',
        eventType: 'GIFT_SENT',
        streamId: stream.id,
        roomId: stream.roomId || stream.id,
        receiverId: stream.userId,
        gift: {
          id: gift.id,
          giftId: gift.id,
          senderId: sender.id,
          receiverId: stream.userId,
          streamId: stream.id,
          roomId: stream.roomId || stream.id,
          senderName: sender.name,
          senderImage: sender.image,
          giftName: giftType.name,
          giftIcon: giftType.icon,
          quantity,
          totalPrice,
          timestamp: Date.now(),
          ...(giftRenderMeta || {}),
        }
      })

      // Notification (fire-and-forget)
      createNotificationWithPush({
        userId: stream.userId,
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
        select: { id: true, ownerId: true, roomType: true, giftCommissionPercent: true, giftBeneficiaryId: true }
      })
      if (!room) {
        return fail(404, 'ROOM_NOT_FOUND', 'Oda bulunamadı')
      }

      let recipientId = bodyRecipientId || room.ownerId
      if (!recipientId) {
        return fail(400, 'NO_RECIPIENT', 'Alıcı bulunamadı')
      }

      if (recipientId === sender.id && !isStaff) {
        return fail(400, 'SELF_GIFT', 'Kendinize hediye gönderemezsiniz')
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
      const dist = await calculateGiftDistribution(totalPrice, roomType2)

      const txOps: any[] = [
        prisma.chatRoomGift.create({
          data: {
            roomId: room.id,
            senderId: sender.id,
            recipientId: recipient.id,
            giftTypeId,
            quantity,
            totalPrice,
            currencyType: 'jeton',
            commissionAmount: dist.siteAmount,
            beneficiaryId: room.giftBeneficiaryId || room.ownerId,
          }
        })
      ]

      // Deduct sender jetons
      if (!isStaff) {
        txOps.push(
          prisma.user.update({
            where: { id: sender.id },
            data: { jetonBalance: { decrement: totalPrice } }
          })
        )
      }

      // Credit recipient
      if (dist.receiverNet > 0 && !senderExcluded) {
        txOps.push(
          prisma.user.update({
            where: { id: recipient.id },
            data: { jetonBalance: { increment: dist.receiverNet } }
          })
        )
      }

      // Credit room owner commission
      if (dist.ownerNet > 0 && room.ownerId && room.ownerId !== recipient.id && !senderExcluded) {
        txOps.push(
          prisma.user.update({
            where: { id: room.ownerId },
            data: { jetonBalance: { increment: dist.ownerNet } }
          })
        )
      }

      const [gift] = await prisma.$transaction(txOps)
      giftRecord = gift

      // Log revenue
      logRoomRevenue({ roomId: room.id, eventType: 'gift', totalAmount: totalPrice, receiverAmount: dist.receiverNet, ownerAmount: dist.ownerNet, siteAmount: dist.siteAmount, senderId: sender.id, receiverId: recipientId, ownerId: room.ownerId || undefined }).catch(() => {})

      // ── Immutable ledger (fire-and-forget) ──
      if (!isStaff && !senderExcluded) {
        const legs: LedgerLeg[] = [
          {
            accountType: 'user_jeton',
            accountId: sender.id,
            direction: 'debit',
            amount: totalPrice,
            balanceBefore: sender.jetonBalance ?? 0,
            balanceAfter: (sender.jetonBalance ?? 0) - totalPrice,
          },
        ]
        if (dist.receiverNet > 0) {
          legs.push({ accountType: 'user_jeton', accountId: recipient.id, direction: 'credit', amount: dist.receiverNet })
        }
        if (dist.ownerNet > 0 && room.ownerId && room.ownerId !== recipient.id) {
          legs.push({ accountType: 'user_jeton', accountId: room.ownerId, direction: 'credit', amount: dist.ownerNet })
        }
        if (dist.siteAmount > 0) {
          legs.push({ accountType: 'platform_jeton', accountId: 'platform', direction: 'credit', amount: dist.siteAmount })
        }
        recordMultiLeg({
          legs,
          category: 'gift_send',
          currency: 'jeton',
          description: `Sesli oda hediyesi x${quantity}`,
          referenceType: 'ChatRoomGift',
          referenceId: (gift as any)?.id,
          actorId: sender.id,
          metadata: { roomId: room.id, roomType: roomType2, giftTypeId, quantity },
        }).catch((e) => console.error('[Ledger][live-room-gift]', e))
        recordContribution(sender.id, recipient.id, totalPrice).catch(() => {})
        recordTeamPoints(sender.id, totalPrice).catch(() => {})
      }

      // PK skor atfı: tek kanonik yol (oda izolasyonu + süre + yarış kontrolü)
      pkUpdate = await applyGiftPkScore({
        sideIds: [room.id, roomId],
        amount: totalPrice,
      })

      // Leaderboard skor: hediye alıcısına puan (sesli oda)
      incrementLeaderboardScore('voice_room', recipientId, totalPrice, 'gift_received', room.id).catch(() => {})

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
        gift: {
          id: giftRecord?.id || '',
          giftTypeId: giftType.id || '',
          giftName: giftType.name || '',
          giftIcon: giftType.icon || '',
          quantity: quantity || 1,
          totalPrice: totalPrice || 0,
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
    await releaseIdempotent(_idempotencyRecord)
    console.error('[LIVE/gift/send] Error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Hediye gönderilemedi' } },
      { status: 500 }
    )
  }
}
